import { type ComponentRef, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { buildYearGrid, heatLevel, weekColumn } from '../../domain/year';
import { withAlpha } from '../../habit-color';

/** A day's fill in one habit's color: full when done, fainter the less of the target it got. */
function habitFill(color: string, empty: string, value = 0): string {
  if (value <= 0) return empty;
  return value >= 1 ? color : withAlpha(color, 0.25 + 0.5 * value);
}

const CELL = 14;
const GAP = 3;
const LABEL_HEIGHT = 20;

type Props = {
  year: number;
  habitCount: number;
  perDay: ReadonlyMap<string, number>;
  summary: string;
  /** For one measurable habit: how far each logged day got to the target, 0–1. */
  fractions?: ReadonlyMap<string, number>;
  /** One habit's color: a done day is filled with it. Without it the days shade by how many habits were done. */
  color?: string;
  /** Today, when the year is the current one: the heatmap opens on its week, not on January. */
  focusDate?: string;
};

/** One cell per day, Mon-first week columns; one accessible element, cells are not focusable. */
export function YearHeatmap({
  year,
  habitCount,
  perDay,
  summary,
  color,
  fractions,
  focusDate,
}: Props) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const viewportWidth = useRef(0);
  const theme = useTheme();
  const { weeks, months } = buildYearGrid(year);
  const fills = [theme.segmentTrack, theme.heat1, theme.heat2, theme.heat3, theme.heat4];

  return (
    <View accessible role="img" aria-label={summary} testID="habits-year-heatmap">
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        aria-hidden
        onLayout={(event) => {
          viewportWidth.current = event.nativeEvent.layout.width;
        }}
        onContentSizeChange={() => {
          const column = focusDate ? weekColumn(year, focusDate) : null;
          if (column === null) return;
          const centered = column * (CELL + GAP) + CELL / 2 - viewportWidth.current / 2;
          scroll.current?.scrollTo({ x: Math.max(0, centered), animated: false });
        }}>
        <View>
          <View style={styles.months}>
            {months.map(({ label, column }) => (
              <ThemedText
                key={label}
                type="footnote"
                themeColor="textQuaternary"
                style={[styles.month, { start: column * (CELL + GAP) }]}>
                {label}
              </ThemedText>
            ))}
          </View>
          <View style={styles.weeks}>
            {weeks.map((week, column) => (
              <View key={column} style={styles.week}>
                {week.map((date, row) => (
                  <View
                    key={row}
                    style={[
                      styles.cell,
                      date === null
                        ? null
                        : {
                            backgroundColor: color
                              ? habitFill(
                                  color,
                                  theme.segmentTrack,
                                  fractions?.get(date) ?? perDay.get(date),
                                )
                              : fills[heatLevel(perDay.get(date) ?? 0, habitCount)],
                          },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  months: {
    height: LABEL_HEIGHT,
    marginBottom: Spacing.one,
  },
  month: {
    position: 'absolute',
    top: 0,
  },
  weeks: {
    flexDirection: 'row',
    gap: GAP,
  },
  week: {
    gap: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
  },
});
