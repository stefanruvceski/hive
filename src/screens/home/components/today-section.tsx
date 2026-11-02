import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { SectionLabel } from '@/components/ui/section-label';
import { Layout, MaxContentWidth } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';

import { pageAt, todayLayout } from '../today-pages';
import { type TodayModule, TodayWidget } from './today-widget';

type Props = {
  modules: readonly TodayModule[];
  onOpen: (module: TodayModule) => void;
};

/**
 * Home's Today section (Main.dc.html, #33): one square widget per module, swiped sideways and
 * snapping per card, with page dots that follow the strip and move it when tapped. At the largest
 * text sizes each widget is full width, one per page (LargeText.dc.html).
 */
export function TodaySection({ modules, onOpen }: Props) {
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const layout = todayLayout({ width, fontScale, count: modules.length });
  const [page, setPage] = useState(0);
  const current = Math.min(page, layout.positions - 1);
  const strip = useRef<ScrollViewInstance>(null);
  const reduceMotion = useReduceMotion();

  const goTo = (index: number) => {
    setPage(index);
    strip.current?.scrollTo({ x: layout.snapOffsets[index] ?? 0, animated: !reduceMotion });
  };

  return (
    <View
      aria-label="Today"
      style={[styles.section, { width: Math.min(width, MaxContentWidth) }]}
      testID="home-today">
      <View style={styles.heading}>
        <SectionLabel testID="home-today-title">Today</SectionLabel>
      </View>
      <ScrollView
        ref={strip}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={layout.snapOffsets}
        decelerationRate="fast"
        disableIntervalMomentum
        scrollEventThrottle={16}
        onScroll={(event) => {
          const next = pageAt(event.nativeEvent.contentOffset.x, layout);
          if (next !== current) setPage(next);
        }}
        contentContainerStyle={styles.strip}
        testID="home-today-scroll">
        {modules.map((module) => (
          <TodayWidget key={module.id} module={module} width={layout.widgetWidth} onOpen={onOpen} />
        ))}
      </ScrollView>
      {layout.positions > 1 && (
        <View style={styles.dots} testID="home-today-dots">
          {Array.from({ length: layout.positions }, (_, index) => (
            <Pressable
              key={index}
              role="button"
              aria-label={`Today, page ${index + 1} of ${layout.positions}`}
              aria-selected={index === current}
              hitSlop={{ top: Layout.today.dot.slop, bottom: Layout.today.dot.slop }}
              onPress={() => goTo(index)}
              style={styles.dotTarget}
              testID={`home-today-dot-${index}`}>
              <View
                style={[
                  styles.dot,
                  index === current
                    ? { width: Layout.today.dot.activeWidth, backgroundColor: theme.accent }
                    : { backgroundColor: theme.dotOff },
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Layout.today.gap,
  },
  heading: {
    paddingHorizontal: Layout.screenMargin + Layout.today.headingInset,
  },
  // Padding at both ends; after the last widget also the design's spacer (gap + 8).
  strip: {
    columnGap: Layout.gridGapAcross,
    paddingStart: Layout.screenMargin,
    paddingEnd: Layout.gridGapAcross + Layout.today.endSpacer + Layout.screenMargin,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Layout.today.dot.gap,
  },
  // 28 × 20 as drawn; hitSlop makes it 48 high (D5 in the #33 plan).
  dotTarget: {
    width: Layout.today.dot.target.width,
    height: Layout.today.dot.target.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: Layout.today.dot.size,
    height: Layout.today.dot.size,
    borderRadius: Layout.today.dot.size / 2,
  },
});
