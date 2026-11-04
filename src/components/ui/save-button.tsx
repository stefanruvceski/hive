import { GlassButton } from '@/components/ui/glass-button';

type Props = { onPress: () => void; disabled?: boolean; testID: string };

/** The round Save button for a screen header (checkmark in a glass circle). */
export function SaveButton({ onPress, disabled, testID }: Props) {
  return (
    <GlassButton
      icon={{ ios: 'checkmark', android: 'check', web: 'check' }}
      label="Save"
      onPress={onPress}
      disabled={disabled}
      testID={testID}
    />
  );
}
