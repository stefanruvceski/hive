import { StyleSheet, TextInput } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID: string;
};

/** A single-line text field on a glass row. */
export function TextField({ label, value, onChangeText, placeholder, testID }: Props) {
  const theme = useTheme();
  return (
    <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.field}>
      <TextInput
        aria-label={label}
        placeholder={placeholder ?? label}
        placeholderTextColor={theme.textQuaternary}
        selectionColor={theme.accent}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        testID={testID}
        style={[styles.input, { color: theme.text }]}
      />
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  field: { paddingHorizontal: Layout.listRow.paddingHorizontal },
  input: { minHeight: Layout.listRow.minHeight, fontSize: 17 },
});
