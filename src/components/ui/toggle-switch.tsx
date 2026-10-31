import { Pressable, StyleSheet, View } from 'react-native';

import { Layout } from '@/constants/theme';
import { useTheme, useThemeEffects } from '@/hooks/use-theme';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Accessible name; the row shows the visible label. */
  label: string;
  testID: string;
};

// The track is 31 high; the slop brings the touch target to 49 (agent-rules/12).
const hitSlop = { top: 9, bottom: 9, left: 4, right: 4 };

/**
 * On/off switch drawn from the design (docs/design/canvas/Settings.dc.html): teal track when on,
 * white knob. Drawn, not `@expo/ui`, so it looks the same on iOS and Android (agent-rules/03 §4).
 */
export function ToggleSwitch({ value, onValueChange, label, testID }: Props) {
  const theme = useTheme();
  const effects = useThemeEffects();

  return (
    <Pressable
      role="switch"
      aria-checked={value}
      aria-label={label}
      hitSlop={hitSlop}
      onPress={() => onValueChange(!value)}
      testID={testID}
      style={[
        styles.track,
        value ? styles.on : styles.off,
        { backgroundColor: value ? theme.accent : theme.switchOff },
      ]}>
      <View
        style={[
          styles.knob,
          { backgroundColor: theme.switchKnob, boxShadow: effects.switchKnobShadow },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: Layout.switch.width,
    height: Layout.switch.height,
    borderRadius: Layout.switch.height / 2,
    padding: Layout.switch.padding,
    flexDirection: 'row',
  },
  on: {
    justifyContent: 'flex-end',
  },
  off: {
    justifyContent: 'flex-start',
  },
  knob: {
    width: Layout.switch.knob,
    height: Layout.switch.knob,
    borderRadius: Layout.switch.knob / 2,
  },
});
