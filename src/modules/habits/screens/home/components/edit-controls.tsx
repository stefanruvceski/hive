import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { Habit } from '../../../data/queries';
import type { Direction } from '../../../domain/order';

type Props = {
  habit: Habit;
  canUp: boolean;
  canDown: boolean;
  onMove: (direction: Direction) => void;
  onEdit: () => void;
};

/** Edit mode of a habit row: move up, move down (within the part of the day) and edit. */
export function EditControls({ habit, canUp, canDown, onMove, onEdit }: Props) {
  return (
    <View style={styles.controls}>
      <IconButton
        icon={{ ios: 'chevron.up', android: 'keyboard_arrow_up', web: 'keyboard_arrow_up' }}
        label={`Move ${habit.name} up`}
        disabled={!canUp}
        onPress={() => onMove('up')}
        testID={`habits-up-${habit.id}`}
      />
      <IconButton
        icon={{ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }}
        label={`Move ${habit.name} down`}
        disabled={!canDown}
        onPress={() => onMove('down')}
        testID={`habits-down-${habit.id}`}
      />
      <IconButton
        icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
        label={`Edit ${habit.name}`}
        onPress={onEdit}
        testID={`habits-item-edit-${habit.id}`}
      />
    </View>
  );
}

type IconButtonProps = {
  icon: Exclude<SymbolViewProps['name'], string>;
  label: string;
  disabled?: boolean;
  onPress: () => void;
  testID: string;
};

function IconButton({ icon, label, disabled = false, onPress, testID }: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={styles.button}>
      <SymbolView
        name={icon}
        size={Layout.control.glyph}
        tintColor={disabled ? theme.textQuaternary : theme.accent}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row' },
  // 48 covers Android's minimum target, and iOS's 44.
  button: {
    width: Layout.minTouchAndroid,
    height: Layout.minTouchAndroid,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
