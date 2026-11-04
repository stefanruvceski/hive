import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { BarcodeColors, Spacing } from '@/constants/theme';

import { type BarcodeModules, encode } from '../../domain/barcodes';
import type { CardFormat } from '../../domain/card-format';

type Props = { number: string; format: CardFormat; testID: string };

const QUIET = 10;
const BAR_HEIGHT = 60;

/** Runs of dark modules as [start, length] pairs. */
function runs(cells: readonly boolean[]): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  cells.forEach((dark, i) => {
    if (dark && start < 0) start = i;
    if (!dark && start >= 0) {
      out.push([start, i - start]);
      start = -1;
    }
  });
  if (start >= 0) out.push([start, cells.length - start]);
  return out;
}

function Drawing({ code }: { code: BarcodeModules }) {
  if (code.kind === 'bars') {
    const width = code.modules.length + 2 * QUIET;
    const bars = runs([...code.modules].map((m) => m === '1'));
    return (
      <Svg viewBox={`0 0 ${width} ${BAR_HEIGHT}`} style={styles.bars} preserveAspectRatio="none">
        {bars.map(([x, w]) => (
          <Rect
            key={x}
            x={x + QUIET}
            y={0}
            width={w}
            height={BAR_HEIGHT}
            fill={BarcodeColors.ink}
          />
        ))}
      </Svg>
    );
  }
  const side = code.size + 2 * 4;
  const rects: { key: string; x: number; y: number; w: number }[] = [];
  for (let row = 0; row < code.size; row += 1) {
    const line = code.cells.slice(row * code.size, (row + 1) * code.size);
    for (const [x, w] of runs(line)) rects.push({ key: `${row}-${x}`, x: x + 4, y: row + 4, w });
  }
  return (
    <Svg viewBox={`0 0 ${side} ${side}`} style={styles.grid}>
      {rects.map((r) => (
        <Rect key={r.key} x={r.x} y={r.y} width={r.w} height={1} fill={BarcodeColors.ink} />
      ))}
    </Svg>
  );
}

/** The code drawn large on white (a scanner needs black on white in both color schemes). */
export function BarcodeView({ number, format, testID }: Props) {
  const code = encode(number, format);
  return (
    <View style={styles.white} testID={testID}>
      {code ? (
        <Drawing code={code} />
      ) : (
        <ThemedText style={styles.error}>This number can&apos;t be drawn.</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  white: {
    backgroundColor: BarcodeColors.paper,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    alignItems: 'center',
  },
  bars: { width: '100%', height: 140 },
  grid: { width: '100%', aspectRatio: 1 },
  // On the fixed white card, whatever the scheme.
  error: { textAlign: 'center', color: BarcodeColors.ink },
});
