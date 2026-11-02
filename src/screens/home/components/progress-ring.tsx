import { StyleSheet, View } from 'react-native';

import { AppTints, type AppTint, Layout } from '@/constants/theme';
import { useThemeEffects, useThemeName } from '@/hooks/use-theme';

type Props = { done: number; total: number; tint: AppTint };

const { size, stroke } = Layout.today.ring;
const half = size / 2;
/** Distance from the center to the middle of the stroke, where the round caps sit. */
const radius = (size - stroke) / 2;

/**
 * A Today widget's progress ring (Main.dc.html): an app-tinted arc over a faint track, clockwise
 * from the top, with round caps. Built from plain Views (no SVG dependency): a half ring rotates
 * into each half of the circle, clipped to it. Decorative: the number beside it carries the
 * information, so it is hidden from screen readers. Positions are physical (`left`/`top`): a clock
 * face doesn't mirror in right-to-left languages.
 */
export function ProgressRing({ done, total, tint }: Props) {
  const scheme = useThemeName();
  const effects = useThemeEffects();
  const color = AppTints[tint][scheme];
  const share = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  const angle = share * 360;
  const end = (angle * Math.PI) / 180;

  return (
    <View aria-hidden style={styles.ring}>
      <View style={[styles.track, { borderColor: color + effects.ringTrackAlpha }]} />
      {angle > 0 && (
        <>
          {/* 0–180°: the left half ring turns into the right half. */}
          <View style={[styles.clip, styles.rightClip]}>
            <View
              style={[
                styles.halfRing,
                styles.leftHalf,
                { borderColor: color, transform: [{ rotate: `${Math.min(angle, 180)}deg` }] },
              ]}
            />
          </View>
          {/* 180–360°: the right half ring turns into the left half. */}
          {angle > 180 && (
            <View style={[styles.clip, styles.leftClip]}>
              <View
                style={[
                  styles.halfRing,
                  styles.rightHalf,
                  { borderColor: color, transform: [{ rotate: `${angle - 180}deg` }] },
                ]}
              />
            </View>
          )}
          <View style={[styles.cap, { backgroundColor: color, left: half - stroke / 2, top: 0 }]} />
          <View
            style={[
              styles.cap,
              {
                backgroundColor: color,
                left: half + radius * Math.sin(end) - stroke / 2,
                top: half - radius * Math.cos(end) - stroke / 2,
              },
            ]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: size,
    height: size,
  },
  track: {
    ...StyleSheet.absoluteFill,
    borderRadius: half,
    borderWidth: stroke,
  },
  clip: {
    position: 'absolute',
    top: 0,
    width: half,
    height: size,
    overflow: 'hidden',
  },
  rightClip: {
    left: half,
  },
  leftClip: {
    left: 0,
  },
  halfRing: {
    position: 'absolute',
    top: 0,
    width: half,
    height: size,
    borderWidth: stroke,
  },
  // Sits outside its clip (in the left half) and turns about the circle's center: its right edge.
  leftHalf: {
    left: -half,
    borderRightWidth: 0,
    borderTopLeftRadius: half,
    borderBottomLeftRadius: half,
    transformOrigin: 'right center',
  },
  rightHalf: {
    left: half,
    borderLeftWidth: 0,
    borderTopRightRadius: half,
    borderBottomRightRadius: half,
    transformOrigin: 'left center',
  },
  cap: {
    position: 'absolute',
    width: stroke,
    height: stroke,
    borderRadius: stroke / 2,
  },
});
