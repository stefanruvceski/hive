import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionLabel } from '@/components/ui/section-label';
import { Layout, Spacing } from '@/constants/theme';

import {
  useMarkNotSame,
  useMergeProducts,
  usePriceBook,
  useRenameProduct,
  useUnmergeProduct,
} from '../../data/price-queries';
import { suggestions } from '../../domain/price-book';
import { slug } from '../../domain/price-chart';
import { formatAmount } from '../../domain/receipt-stats';
import { PriceChart } from '../components/price-chart';
import { TextButton } from '../components/text-button';
import { TextField } from '../components/text-field';
import { WalletScreen } from '../components/wallet-screen';

const money = (para: number, unit: string | null) =>
  `${formatAmount(para)} RSD${unit ? ` /${unit}` : ''}`;

/** One product: its price in each shop, the chart over time, its names and likely duplicates. */
export function WalletProduct({ productKey }: { productKey: string }) {
  const { data, error, isError, refetch } = usePriceBook();
  const rename = useRenameProduct();
  const unmerge = useUnmergeProduct();
  const merge = useMergeProducts();
  const notSame = useMarkNotSame();
  const product = data?.products.find((p) => p.key === productKey);
  const [name, setName] = useState<string | null>(null);

  let body;
  if (data && product) {
    const likely = suggestions(product, data.products, data.notSame);
    body = (
      <>
        {name === null ? (
          <View style={styles.actions}>
            <TextButton
              label="Rename"
              onPress={() => setName(product.name)}
              testID="wallet-product-rename-open"
            />
            {product.named ? (
              <TextButton
                label="Use the printed name"
                onPress={() => rename.mutate({ key: product.key, name: null })}
                testID="wallet-product-reset-name"
              />
            ) : null}
          </View>
        ) : (
          <>
            <TextField
              label="Product name"
              value={name}
              onChangeText={setName}
              testID="wallet-product-name"
            />
            <View style={styles.actions}>
              <TextButton
                label="Cancel"
                onPress={() => setName(null)}
                testID="wallet-product-rename-cancel"
              />
              <TextButton
                label="Save name"
                disabled={name.trim() === '' || name.trim() === product.name}
                onPress={() => {
                  rename.mutate({ key: product.key, name });
                  setName(null);
                }}
                testID="wallet-product-rename"
              />
            </View>
          </>
        )}

        <SectionLabel testID="wallet-product-shops-label">By shop</SectionLabel>
        {product.shops.map((s) => (
          <GlassSurface
            key={s.shopKey}
            kind="glass"
            radius={Layout.radius.row}
            style={styles.card}
            testID={`wallet-product-shop-${slug(s.shopKey)}`}>
            <ThemedText>{s.shop}</ThemedText>
            <ThemedText>
              {money(s.last, product.unit)} · {s.lastDate}
            </ThemedText>
            <ThemedText type="footnote">
              Lowest {formatAmount(s.min)} · average {formatAmount(s.avg)} · {s.count}×
            </ThemedText>
          </GlassSurface>
        ))}

        <SectionLabel testID="wallet-product-chart-label">Over time</SectionLabel>
        <PriceChart history={product.history} testID="wallet-product-chart" />

        <SectionLabel testID="wallet-product-names-label">Printed as</SectionLabel>
        {product.aliases.map((alias) => (
          <ThemedText key={alias} themeColor="textSecondary">
            {alias}
          </ThemedText>
        ))}
        {product.keys.length > 1 ? (
          <TextButton
            label="Unmerge"
            tone="danger"
            onPress={() => unmerge.mutate(product.key)}
            testID="wallet-product-unmerge"
          />
        ) : null}

        {likely.length > 0 ? (
          <>
            <SectionLabel testID="wallet-product-similar-label">
              Maybe the same product
            </SectionLabel>
            {likely.map((o) => (
              <GlassSurface
                key={o.key}
                kind="glass"
                radius={Layout.radius.row}
                style={styles.card}
                testID={`wallet-product-similar-${slug(o.key)}`}>
                <ThemedText>{o.name}</ThemedText>
                <View style={styles.actions}>
                  <TextButton
                    label="Merge"
                    onPress={() => merge.mutate({ a: product.key, b: o.key })}
                    testID={`wallet-product-merge-${slug(o.key)}`}
                  />
                  <TextButton
                    label="Not the same"
                    onPress={() => notSame.mutate({ a: product.key, b: o.key })}
                    testID={`wallet-product-not-same-${slug(o.key)}`}
                  />
                </View>
              </GlassSurface>
            ))}
          </>
        ) : null}
      </>
    );
  } else if (data) {
    body = (
      <EmptyState
        title="Product not found"
        description="It may have been merged into another one."
        testID="wallet-product-missing"
      />
    );
  } else if (isError) {
    body = (
      <ErrorState error={error} onRetry={() => void refetch()} testID="wallet-product-error" />
    );
  } else {
    body = <LoadingState testID="wallet-product-loading" />;
  }

  return (
    <WalletScreen id="wallet-product" title={product?.name ?? 'Product'}>
      {body}
    </WalletScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { padding: Layout.listRow.paddingHorizontal, gap: Spacing.one },
});
