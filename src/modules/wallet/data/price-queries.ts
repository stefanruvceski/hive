import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { asc } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';

import { receiptKeys } from './receipt-queries';
import {
  walletNotSame,
  walletProductAliases,
  walletReceiptItems,
  walletReceipts,
  walletShopAliases,
} from './schema';
import {
  type AliasGroup,
  groupsFromRows,
  merge,
  pair,
  rename,
  rowsFromGroups,
  unmerge,
} from '../domain/aliases';
import { newId } from '../domain/ids';
import { type PriceReceipt, pricePoints, type Product, products } from '../domain/price-book';

// Prices by shop and product. Everything is derived from the receipts and the hand merges; only
// the merges are stored (wallet_product_aliases, wallet_shop_aliases, wallet_not_same).

export type PriceBook = {
  products: Product[];
  productGroups: AliasGroup[];
  shopGroups: AliasGroup[];
  /** Every shop on the receipts, as filed (merges applied), the most receipts first. */
  shops: { key: string; name: string; count: number }[];
  notSame: string[];
};

export const priceKeys = {
  // Under the receipts key, so changing a receipt refreshes the prices too.
  all: () => [...receiptKeys.all(), 'prices'] as const,
};

const readGroups = (table: typeof walletProductAliases | typeof walletShopAliases) =>
  groupsFromRows(getDb().select().from(table).orderBy(asc(table.position)).all());

export const priceBookQuery = () =>
  queryOptions({
    queryKey: priceKeys.all(),
    queryFn: async (): Promise<PriceBook> => {
      const db = getDb();
      const rows = db.select().from(walletReceipts).all();
      const items = db
        .select()
        .from(walletReceiptItems)
        .orderBy(asc(walletReceiptItems.position))
        .all();
      const receipts: PriceReceipt[] = rows.map((r) => ({
        ...r,
        items: items.filter((i) => i.receiptId === r.id),
      }));
      const productGroups = readGroups(walletProductAliases);
      const shopGroups = readGroups(walletShopAliases);
      const points = pricePoints(receipts, shopGroups);
      const shopCounts = new Map<string, { name: string; receipts: Set<string> }>();
      for (const p of points) {
        const entry = shopCounts.get(p.shopKey) ?? { name: p.shop, receipts: new Set<string>() };
        entry.receipts.add(p.receiptId);
        shopCounts.set(p.shopKey, entry);
      }
      return {
        products: products(points, productGroups),
        productGroups,
        shopGroups,
        shops: [...shopCounts.entries()]
          .map(([key, v]) => ({ key, name: v.name, count: v.receipts.size }))
          .sort((a, b) => b.count - a.count),
        notSame: db
          .select()
          .from(walletNotSame)
          .all()
          .map((r) => r.pair),
      };
    },
  });

export const usePriceBook = () => useQuery(priceBookQuery());

/** The names and merges the user gave shops; the receipts list and screen use them (one name per company). */
export const shopGroupsQuery = () =>
  queryOptions({
    queryKey: [...priceKeys.all(), 'shop-groups'] as const,
    queryFn: async (): Promise<AliasGroup[]> => readGroups(walletShopAliases),
  });
export const useShopGroups = () => useQuery(shopGroupsQuery());

type Table = typeof walletProductAliases | typeof walletShopAliases;

function save(table: Table, groups: readonly AliasGroup[]) {
  getDb().transaction((tx) => {
    tx.delete(table).run();
    for (const row of rowsFromGroups(groups, newId)) tx.insert(table).values(row).run();
  });
}

function useAliasMutation<V>(table: Table, change: (groups: AliasGroup[], v: V) => AliasGroup[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: V) => save(table, change(readGroups(table), v)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: priceKeys.all() }),
  });
}

type Pair = { a: string; b: string };

/** `b` joins `a`: both are one product everywhere, including after new receipts. */
export const useMergeProducts = () =>
  useAliasMutation(walletProductAliases, (g, v: Pair) => merge(g, v.a, v.b));
export const useRenameProduct = () =>
  useAliasMutation(walletProductAliases, (g, v: { key: string; name: string | null }) =>
    rename(g, v.key, v.name),
  );
export const useUnmergeProduct = () =>
  useAliasMutation(walletProductAliases, (g, key: string) => unmerge(g, key));

export const useMergeShops = () =>
  useAliasMutation(walletShopAliases, (g, v: Pair) => merge(g, v.a, v.b));
export const useRenameShop = () =>
  useAliasMutation(walletShopAliases, (g, v: { key: string; name: string | null }) =>
    rename(g, v.key, v.name),
  );
export const useUnmergeShop = () =>
  useAliasMutation(walletShopAliases, (g, key: string) => unmerge(g, key));

/** "These are not the same product": the pair is not suggested again. */
export function useMarkNotSame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ a, b }: Pair) => {
      getDb()
        .insert(walletNotSame)
        .values({ pair: pair(a, b) })
        .onConflictDoNothing()
        .run();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: priceKeys.all() }),
  });
}
