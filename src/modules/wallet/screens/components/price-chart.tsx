import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { HabitColors, Spacing } from '@/constants/theme';
import { useTheme, useThemeName } from '@/hooks/use-theme';

import { curvePath } from '../../domain/curve';
import type { PricePoint } from '../../domain/price-book';
import { chartSeries } from '../../domain/price-chart';
import { formatAmount } from '../../domain/receipt-stats';

const HEIGHT = 140;
const PAD = 8;
/** Room on the left for the price labels. */
const GUTTER = 52;
const LABEL_SIZE = 11;

/** Price over time: one line per shop (a legend names them), highest price at the top. */
export function PriceChart({
  history,
  testID,
}: {
  history: readonly PricePoint[];
  testID: string;
}) {
  const [width, setWidth] = useState(0);
  const mode = useThemeName();
  const theme = useTheme();
  const plotWidth = Math.max(width - GUTTER - PAD, 0);
  const { series, min, max } = chartSeries(history, plotWidth, HEIGHT - PAD * 2);
  const ticks = min === max ? [max] : [max, Math.round((max + min) / 2), min];
  const tickY = (price: number) =>
    PAD +
    (max === min ? (HEIGHT - PAD * 2) / 2 : ((max - price) / (max - min)) * (HEIGHT - PAD * 2));
  const color = (i: number) => {
    const c = HabitColors[(i * 3) % HabitColors.length] ?? HabitColors[0];
    return c[mode === 'dark' ? 'dark' : 'light'];
  };
  const first = history.reduce((a, p) => (p.date < a ? p.date : a), history[0]?.date ?? '');
  const last = history.reduce((a, p) => (p.date > a ? p.date : a), first);
  return (
    <View
      style={styles.box}
      testID={testID}
      accessible
      accessibilityLabel={`Price chart, ${series.length} shops, from ${formatAmount(min)} to ${formatAmount(max)}`}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.plot}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {ticks.map((price) => (
              <G key={price}>
                <Line
                  x1={GUTTER}
                  x2={width}
                  y1={tickY(price)}
                  y2={tickY(price)}
                  stroke={theme.separator}
                  strokeWidth={1}
                />
                <SvgText
                  x={GUTTER - PAD}
                  y={tickY(price) + LABEL_SIZE / 3}
                  fill={theme.textTertiary}
                  fontSize={LABEL_SIZE}
                  textAnchor="end">
                  {formatAmount(price)}
                </SvgText>
              </G>
            ))}
            {series.map((s, i) => {
              const line = curvePath(s.points.map((p) => ({ x: p.x + GUTTER, y: p.y + PAD })));
              return (
                <G key={s.shopKey}>
                  {s.points.length > 1 ? (
                    <Path d={line} fill="none" stroke={color(i)} strokeWidth={2} />
                  ) : null}
                  {s.points.map((p) => (
                    <Circle key={p.date} cx={p.x + GUTTER} cy={p.y + PAD} r={3.5} fill={color(i)} />
                  ))}
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
      <View style={styles.axis}>
        <ThemedText type="footnote">{first}</ThemedText>
        <ThemedText type="footnote">{last}</ThemedText>
      </View>
      <View style={styles.legend}>
        {series.map((s, i) => (
          <ThemedText key={s.shopKey} type="footnote" style={{ color: color(i) }}>
            ● {s.shop}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.one },
  plot: { height: HEIGHT },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: GUTTER },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
});
