import {
  Host as ComposeHost,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text as ComposeText,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth, testID as composeTestID } from '@expo/ui/jetpack-compose/modifiers';
import { Host as SwiftHost, Picker, Text as SwiftText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { Platform, StyleSheet } from 'react-native';

import { useTheme, useThemeName } from '@/hooks/use-theme';

export type SegmentedOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the whole control ("Appearance"). */
  label: string;
  testID: string;
};

/**
 * Native single-choice segmented control: SwiftUI segmented `Picker` on iOS, Material 3 segmented
 * buttons on Android (`@expo/ui`, agent-rules/03 §4). Fills the width it is given. The host gets
 * the app's scheme: without it, native views follow the phone even when Settings forces one.
 */
export function SegmentedControl<T extends string>(props: Props<T>) {
  return Platform.OS === 'android' ? <ComposeSegments {...props} /> : <SwiftSegments {...props} />;
}

function SwiftSegments<T extends string>({ options, value, onChange, label, testID }: Props<T>) {
  const theme = useTheme();
  return (
    <SwiftHost
      matchContents={{ vertical: true }}
      colorScheme={useThemeName()}
      seedColor={theme.accent}
      style={styles.host}>
      <Picker
        label={label}
        selection={value}
        onSelectionChange={(next: T) => onChange(next)}
        modifiers={[pickerStyle('segmented')]}
        testID={testID}>
        {options.map((option) => (
          <SwiftText key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </SwiftText>
        ))}
      </Picker>
    </SwiftHost>
  );
}

function ComposeSegments<T extends string>({ options, value, onChange, testID }: Props<T>) {
  const theme = useTheme();
  return (
    <ComposeHost
      matchContents={{ vertical: true }}
      colorScheme={useThemeName()}
      seedColor={theme.accent}
      style={styles.host}>
      <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth(), composeTestID(testID)]}>
        {options.map((option) => (
          <SegmentedButton
            key={option.value}
            selected={option.value === value}
            onClick={() => onChange(option.value)}>
            <SegmentedButton.Label>
              <ComposeText>{option.label}</ComposeText>
            </SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </ComposeHost>
  );
}

const styles = StyleSheet.create({
  host: {
    alignSelf: 'stretch',
  },
});
