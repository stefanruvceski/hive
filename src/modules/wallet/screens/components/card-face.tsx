import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';

import { cardLogos } from './card-logos';
import { rowLines, useStackedRow } from './use-stacked-row';
import {
  type CardLook,
  type CardStyle,
  hex,
  initialsOf,
  shortName,
} from '../../domain/card-brands';

/** The shape of a bank card; the scanner window uses it too. */
export const CARD_ASPECT = 1.586;
const W = 160;
const H = W / CARD_ASPECT;

/** A faint repeating motif over the gradient, in the card's ink color. */
function Motif({ style, ink }: { style: CardStyle; ink: string }) {
  const stroke = { stroke: ink, strokeOpacity: 0.16, strokeWidth: 3, fill: 'none' } as const;
  const fill = { fill: ink, fillOpacity: 0.14 } as const;
  const range = (n: number) => Array.from({ length: n }, (_, i) => i);
  switch (style) {
    case 'dots':
      return (
        <G>
          {range(30).map((i) => (
            <Circle
              key={i}
              cx={10 + (i % 6) * 28}
              cy={10 + Math.floor(i / 6) * 22}
              r={3}
              {...fill}
            />
          ))}
        </G>
      );
    case 'stripes':
      return (
        <G>
          {range(8).map((i) => (
            <Path key={i} d={`M${i * 30 - 40} ${H} L${i * 30 + 20} 0`} {...stroke} />
          ))}
        </G>
      );
    case 'cross':
      return (
        <G>
          <Rect x={W - 62} y={H / 2 - 28} width={18} height={56} rx={4} {...fill} />
          <Rect x={W - 81} y={H / 2 - 9} width={56} height={18} rx={4} {...fill} />
        </G>
      );
    case 'x':
      return (
        <G>
          <Path d={`M${W - 70} 14 L${W - 14} 70 M${W - 14} 14 L${W - 70} 70`} {...stroke} />
        </G>
      );
    case 'waves':
      return (
        <G>
          {range(5).map((i) => (
            <Path
              key={i}
              d={`M-10 ${24 + i * 18} Q ${W / 4} ${8 + i * 18} ${W / 2} ${24 + i * 18} T ${W + 10} ${24 + i * 18}`}
              {...stroke}
            />
          ))}
        </G>
      );
    case 'rings':
      return (
        <G>
          {range(4).map((i) => (
            <Circle key={i} cx={W - 24} cy={H - 10} r={20 + i * 18} {...stroke} />
          ))}
        </G>
      );
    case 'grid':
      return (
        <G>
          {range(7).map((i) => (
            <Path key={`v${i}`} d={`M${i * 26} 0 V${H}`} {...stroke} strokeWidth={1.5} />
          ))}
          {range(5).map((i) => (
            <Path key={`h${i}`} d={`M0 ${i * 26} H${W}`} {...stroke} strokeWidth={1.5} />
          ))}
        </G>
      );
    case 'shine':
      return (
        <Path
          d={`M${W * 0.45} 0 H${W * 0.7} L${W * 0.35} ${H} H${W * 0.1} Z`}
          fill={ink}
          fillOpacity={0.1}
        />
      );
    case 'plain':
      return null;
  }
}

type Props = {
  look: CardLook;
  name: string;
  /** The last digits of the card number. */
  detail?: string;
  testID?: string;
};

/**
 * A loyalty card drawn from a program's colors: a gradient, a motif and a top-left highlight,
 * with a badge of the name's initials, the name and the last digits of the number.
 */
export function CardFace({ look, name, detail, testID }: Props) {
  const { from, to, ink } = look;
  const stacked = useStackedRow();
  const logo = look.brand ? cardLogos[look.brand] : undefined;
  return (
    <View style={styles.face} testID={testID}>
      <Svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width={W} height={H} fill="url(#bg)" />
        <Motif style={look.style} ink={ink} />
        <Circle cx={0} cy={0} r={70} fill={hex(0xffffff)} fillOpacity={0.12} />
      </Svg>
      <View style={styles.top}>
        <View style={styles.badge}>
          {logo ? (
            <Image source={logo} contentFit="contain" style={styles.logo} accessibilityLabel="" />
          ) : (
            <ThemedText style={[styles.initials, { color: from }]} maxFontSizeMultiplier={1}>
              {initialsOf(name)}
            </ThemedText>
          )}
        </View>
        <ThemedText style={[styles.name, { color: ink }]} numberOfLines={rowLines(stacked) && 2}>
          {stacked ? name : shortName(name)}
        </ThemedText>
      </View>
      {detail ? (
        <ThemedText type="footnote" style={[styles.detail, { color: ink }]}>
          {detail}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
    borderRadius: Layout.radius.row,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  badge: {
    width: Spacing.five,
    height: Spacing.five,
    borderRadius: Spacing.two,
    backgroundColor: hex(0xffffff),
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: '75%', height: '75%' },
  initials: { fontSize: 12, fontWeight: '700' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: { flex: 1, fontWeight: '700', textAlign: 'right' },
  detail: { textAlign: 'right' },
});
