import { StyleSheet, type ViewProps } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout } from '@/constants/theme';

type Props = ViewProps & {
  /** `card` (radius 30) for cards and widgets, `sheet` (radius 38) for sheets. */
  variant?: 'card' | 'sheet';
  testID: string;
};

/** Frosted surface for cards and sheets. To dim or press-highlight it, fade its content, never the card. */
export function GlassCard({ variant = 'card', style, ...rest }: Props) {
  return (
    <GlassSurface
      kind="glass"
      radius={Layout.radius[variant]}
      style={[styles.card, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Layout.cardPadding,
  },
});
