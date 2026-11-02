import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

import { type SwipeSide, swipeOutcome } from '../../../domain/swipe';

/** One button's width; the trailing panel holds two (Edit, Archive), the leading one holds Edit. */
const buttonWidth = 80;
const leadingPanel = buttonWidth;
const trailingPanel = buttonWidth * 2;
const settleMs = 200;

type Props = {
  /** Which buttons are showing; the list keeps one row open at a time, as iOS lists do. */
  open: SwipeSide | null;
  onOpenChange: (side: SwipeSide | null) => void;
  onEdit: () => void;
  onArchive: () => void;
  /** Off in reorder mode. */
  enabled: boolean;
  /** The habit's name, for the buttons' accessible names. */
  name: string;
  /** Prefix of the buttons' testIDs, e.g. `habits-swipe-<id>`. */
  testID: string;
  children: ReactNode;
};

const restingOffset = (side: SwipeSide | null) =>
  side === 'leading' ? leadingPanel : side === 'trailing' ? -trailingPanel : 0;

/**
 * Swipe a row like an iOS list: drag towards the start for Edit and Archive, towards the end for
 * Edit. Let go early and the buttons stay; drag all the way and the outer action runs (Archive for
 * the trailing side, Edit for the leading side). Tap the row to close it.
 */
export function SwipeRow({
  open,
  onOpenChange,
  onEdit,
  onArchive,
  enabled,
  name,
  testID,
  children,
}: Props) {
  const [width, setWidth] = useState(useWindowDimensions().width);
  const x = useSharedValue(restingOffset(open));
  const startX = useRef(0);

  // The list closes this row when another one opens.
  useEffect(() => {
    x.set(withTiming(restingOffset(open), { duration: settleMs }));
  }, [open, x]);

  const pan = usePanGesture({
    runOnJS: true,
    enabled,
    activeOffsetX: [-12, 12],
    failOffsetY: [-12, 12],
    onActivate: () => {
      startX.current = x.get();
    },
    onUpdate: (event) => {
      x.set(Math.max(-width, Math.min(width, startX.current + event.translationX)));
    },
    onDeactivate: (event) => {
      const outcome = swipeOutcome({
        offset: x.get(),
        velocity: event.velocityX,
        width,
        leadingPanel,
        trailingPanel,
      });
      if (outcome.kind === 'full') {
        x.set(withTiming(0, { duration: settleMs }));
        onOpenChange(null);
        if (outcome.side === 'trailing') onArchive();
        else onEdit();
      } else if (outcome.kind === 'open') {
        x.set(withTiming(restingOffset(outcome.side), { duration: settleMs }));
        onOpenChange(outcome.side);
      } else {
        x.set(withTiming(0, { duration: settleMs }));
        onOpenChange(null);
      }
    },
  });

  const content = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  // The panels sit off-screen behind the row's edge and slide in with it. The outer button grows
  // with a long drag, so a full swipe shows the action it is about to run.
  const trailing = useAnimatedStyle(() => {
    const panel = Math.max(trailingPanel, -x.get());
    return { width: panel, transform: [{ translateX: panel + x.get() }] };
  });
  const leading = useAnimatedStyle(() => {
    const panel = Math.max(leadingPanel, x.get());
    return { width: panel, transform: [{ translateX: -panel + x.get() }] };
  });

  const close = () => onOpenChange(null);
  const run = (action: () => void) => () => {
    close();
    action();
  };

  return (
    <View style={styles.clip} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Animated.View
        style={[styles.panel, styles.leading, leading]}
        aria-hidden={open !== 'leading'}>
        <ActionButton
          icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
          label="Edit"
          accessibilityLabel={`Edit ${name}`}
          tone="accent"
          onPress={run(onEdit)}
          testID={`${testID}-edit-leading`}
        />
      </Animated.View>
      <Animated.View
        style={[styles.panel, styles.trailing, trailing]}
        aria-hidden={open !== 'trailing'}>
        <ActionButton
          icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
          label="Edit"
          accessibilityLabel={`Edit ${name}`}
          tone="accent"
          fixed
          onPress={run(onEdit)}
          testID={`${testID}-edit`}
        />
        <ActionButton
          icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
          label="Archive"
          accessibilityLabel={`Archive ${name}`}
          tone="danger"
          onPress={run(onArchive)}
          testID={`${testID}-archive`}
        />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={content}>
          {children}
          {open !== null && (
            <Pressable
              role="button"
              aria-label="Close"
              onPress={close}
              style={StyleSheet.absoluteFill}
              testID={`${testID}-close`}
            />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

type ActionProps = {
  icon: Exclude<SymbolViewProps['name'], string>;
  label: string;
  accessibilityLabel: string;
  tone: 'accent' | 'danger';
  /** Keeps its width while the neighbour stretches. */
  fixed?: boolean;
  onPress: () => void;
  testID: string;
};

function ActionButton({
  icon,
  label,
  accessibilityLabel,
  tone,
  fixed,
  onPress,
  testID,
}: ActionProps) {
  const theme = useTheme();
  // Dark text on the light dark-mode red, white on the strong light-mode red (contrast >= 4.5).
  const scheme = useColorScheme();
  const ink = tone === 'danger' && scheme !== 'dark' ? theme.switchKnob : theme.onAccent;
  return (
    <Pressable
      role="button"
      aria-label={accessibilityLabel}
      onPress={onPress}
      testID={testID}
      style={[
        styles.action,
        fixed ? { width: buttonWidth } : styles.grow,
        { backgroundColor: tone === 'danger' ? theme.danger : theme.accent },
      ]}>
      <SymbolView name={icon} size={Layout.control.glyph} tintColor={ink} />
      <ThemedText type="footnote" style={{ color: ink }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  panel: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row' },
  leading: { start: 0 },
  trailing: { end: 0 },
  action: {
    minWidth: buttonWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  grow: { flex: 1 },
});
