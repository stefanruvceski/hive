import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LoadingState } from '@/components/ui/loading-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Layout, Spacing } from '@/constants/theme';

import {
  type PriceBook,
  useMergeProducts,
  useMergeShops,
  usePriceBook,
  useRenameShop,
  useUnmergeShop,
} from '../../data/price-queries';
import { groupOf } from '../../domain/aliases';
import { searchProducts } from '../../domain/price-book';
import { slug } from '../../domain/price-chart';
import { formatAmount } from '../../domain/receipt-stats';
import { TextButton } from '../components/text-button';
import { TextField } from '../components/text-field';
import { rowLines, useStackedRow } from '../components/use-stacked-row';
import { WalletScreen } from '../components/wallet-screen';

type View_ = 'products' | 'shops';
const views = [
  { value: 'products', label: 'Products' },
  { value: 'shops', label: 'Shops' },
] as const;

/** Prices: what each product cost in each shop, and the shops and names merged by hand. */
export function WalletPrices() {
  const { data, error, isError, refetch } = usePriceBook();
  const [view, setView] = useState<View_>('products');
  return (
    <WalletScreen id="wallet-prices" title="Prices">
      {data ? (
        data.products.length === 0 ? (
          <EmptyState
            title="No prices yet"
            description="Scan receipts with items and the prices of every product show up here, shop by shop."
            testID="wallet-prices-empty"
          />
        ) : (
          <>
            <SegmentedControl
              label="Prices view"
              options={views}
              value={view}
              onChange={setView}
              testID="wallet-prices-view"
            />
            {view === 'products' ? <Products book={data} /> : <Shops book={data} />}
          </>
        )
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} testID="wallet-prices-error" />
      ) : (
        <LoadingState testID="wallet-prices-loading" />
      )}
    </WalletScreen>
  );
}

/** The two rows picked for a merge, in the order they were tapped. */
function usePicks() {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (key: string) =>
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key].slice(-2)));
  return { picked, toggle, clear: () => setPicked([]) };
}

function Products({ book }: { book: PriceBook }) {
  const stacked = useStackedRow();
  const lines = rowLines(stacked);
  const [query, setQuery] = useState('');
  const [merging, setMerging] = useState(false);
  const { picked, toggle, clear } = usePicks();
  const merge = useMergeProducts();
  const shown = searchProducts(book.products, query);
  const [a, b] = picked;
  return (
    <View style={styles.list}>
      <TextField
        label="Search products"
        placeholder="Search products"
        value={query}
        onChangeText={setQuery}
        testID="wallet-prices-search"
      />
      <View style={styles.actions}>
        <TextButton
          label={merging ? 'Cancel' : 'Merge two names'}
          onPress={() => {
            setMerging((on) => !on);
            clear();
          }}
          testID="wallet-prices-merge-mode"
        />
        {merging ? (
          <TextButton
            label="Merge"
            disabled={picked.length !== 2}
            onPress={() => {
              if (!a || !b) return;
              merge.mutate({ a, b });
              setMerging(false);
              clear();
            }}
            testID="wallet-prices-merge"
          />
        ) : null}
      </View>
      {shown.length === 0 ? (
        <ThemedText themeColor="textSecondary" testID="wallet-prices-no-match">
          No product matches &ldquo;{query}&rdquo;.
        </ThemedText>
      ) : null}
      {shown.map((p) => {
        const cheapest = p.shops[0];
        const chosen = picked.includes(p.key);
        return (
          <Pressable
            key={p.key}
            role="button"
            aria-label={p.name}
            aria-selected={merging ? chosen : undefined}
            testID={`wallet-prices-product-${slug(p.key)}`}
            onPress={() =>
              merging
                ? toggle(p.key)
                : router.push({ pathname: '/wallet/prices/[product]', params: { product: p.key } })
            }>
            <GlassSurface
              kind="glass"
              radius={Layout.radius.row}
              style={[styles.row, stacked && styles.stacked]}>
              <View style={stacked ? undefined : styles.texts}>
                <ThemedText numberOfLines={lines}>
                  {merging ? (chosen ? '☑ ' : '☐ ') : ''}
                  {p.name}
                </ThemedText>
                <ThemedText type="footnote" numberOfLines={lines}>
                  {p.count}× · {p.shops.length} {p.shops.length === 1 ? 'shop' : 'shops'}
                  {cheapest ? ` · cheapest ${cheapest.shop}` : ''}
                </ThemedText>
              </View>
              {cheapest ? (
                <ThemedText>
                  {formatAmount(cheapest.last)}
                  {p.unit ? ` /${p.unit}` : ''}
                </ThemedText>
              ) : null}
            </GlassSurface>
          </Pressable>
        );
      })}
    </View>
  );
}

function Shops({ book }: { book: PriceBook }) {
  const lines = rowLines(useStackedRow());
  const [merging, setMerging] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const { picked, toggle, clear } = usePicks();
  const merge = useMergeShops();
  const rename = useRenameShop();
  const unmerge = useUnmergeShop();
  const [a, b] = picked;
  return (
    <View style={styles.list}>
      <View style={styles.actions}>
        <TextButton
          label={merging ? 'Cancel' : 'Merge two shops'}
          onPress={() => {
            setMerging((on) => !on);
            setEditing(null);
            clear();
          }}
          testID="wallet-shops-merge-mode"
        />
        {merging ? (
          <TextButton
            label="Merge"
            disabled={picked.length !== 2}
            onPress={() => {
              if (!a || !b) return;
              merge.mutate({ a, b });
              setMerging(false);
              clear();
            }}
            testID="wallet-shops-merge"
          />
        ) : null}
      </View>
      {book.shops.map((s) => {
        const chosen = picked.includes(s.key);
        const open = editing === s.key;
        const merged = (groupOf(book.shopGroups, s.key)?.keys.length ?? 0) > 1;
        return (
          <View key={s.key} style={styles.list}>
            <Pressable
              role="button"
              aria-label={s.name}
              testID={`wallet-shop-${slug(s.key)}`}
              onPress={() => {
                if (merging) return toggle(s.key);
                setName(s.name);
                setEditing(open ? null : s.key);
              }}>
              <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.row}>
                <View style={styles.texts}>
                  <ThemedText numberOfLines={lines}>
                    {merging ? (chosen ? '☑ ' : '☐ ') : ''}
                    {s.name}
                  </ThemedText>
                  <ThemedText type="footnote" numberOfLines={lines}>
                    {s.count} {s.count === 1 ? 'receipt' : 'receipts'}
                    {merged ? ' · merged' : ''}
                  </ThemedText>
                </View>
              </GlassSurface>
            </Pressable>
            {open ? (
              <View style={styles.list}>
                <TextField
                  label="Shop name"
                  value={name}
                  onChangeText={setName}
                  testID="wallet-shop-name"
                />
                <View style={styles.actions}>
                  <TextButton
                    label="Save name"
                    disabled={name.trim() === ''}
                    onPress={() => {
                      rename.mutate({ key: s.key, name });
                      setEditing(null);
                    }}
                    testID="wallet-shop-rename"
                  />
                  {merged ? (
                    <TextButton
                      label="Unmerge"
                      tone="danger"
                      onPress={() => {
                        unmerge.mutate(s.key);
                        setEditing(null);
                      }}
                      testID="wallet-shop-unmerge"
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.listRow.gap,
    minHeight: Layout.listRow.minHeight,
    paddingHorizontal: Layout.listRow.paddingHorizontal,
  },
  stacked: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: Spacing.two },
  texts: { flex: 1 },
});
