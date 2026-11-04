import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { dateToIso, isIsoDate, isoToDate } from '../../domain/dates';

/** A day shown as text; tapping it opens the calendar (inline on iOS, a dialog on Android). */
export function DateField({
  value,
  onChange,
  label,
  testID,
}: {
  value: string;
  onChange: (date: string) => void;
  label: string;
  testID: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        role="button"
        aria-label={`${label}, ${value}`}
        onPress={() => setOpen(!open)}
        testID={testID}
        style={styles.row}>
        <ThemedText>{value}</ThemedText>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={isIsoDate(value) ? isoToDate(value) : new Date()}
          mode="date"
          display="inline"
          presentation="dialog"
          accentColor={theme.accent}
          onValueChange={(_, date) => {
            onChange(dateToIso(date));
            setOpen(false);
          }}
          onDismiss={() => setOpen(false)}
          testID={`${testID}-picker`}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: Layout.minTouchAndroid, justifyContent: 'center' },
});
