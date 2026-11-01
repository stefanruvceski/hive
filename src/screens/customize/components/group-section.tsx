import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { Fonts, Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HiveModule } from '@/modules/registry';
import { type CustomizeGroup, type HomeEdit, MAX_GROUP_NAME } from '@/utils/home-edits';

import { SelectableApp } from './selectable-app';
import { TileGrid } from './tile-grid';

type Props = {
  group: CustomizeGroup<HiveModule>;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** An empty group that isn't the last one. */
  canDelete: boolean;
  selectedId: string | null;
  /** The selected app's name when this group offers "Move <app> here"; null otherwise. */
  moveHereName: string | null;
  onSelect: (id: string) => void;
  onEdit: (edit: HomeEdit) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

/** One group in Customize: its name (editable), up / down / delete, its apps and "Move here". */
export function GroupSection({
  group,
  canMoveUp,
  canMoveDown,
  canDelete,
  selectedId,
  moveHereName,
  onSelect,
  onEdit,
  onLayout,
}: Props) {
  const theme = useTheme();
  const testID = `customize-group-${group.id}`;

  return (
    <GlassCard
      edgeColor={moveHereName !== null ? theme.accentTarget : undefined}
      style={styles.section}
      onLayout={onLayout}
      testID={testID}>
      <View style={styles.header}>
        <NameField group={group} onEdit={onEdit} testID={`${testID}-name`} />
        <IconButton
          icon={{ ios: 'chevron.up', android: 'keyboard_arrow_up', web: 'keyboard_arrow_up' }}
          label={`Move group ${group.name} up`}
          disabled={!canMoveUp}
          onPress={() => onEdit({ kind: 'move-group', groupId: group.id, by: -1 })}
          testID={`${testID}-up`}
        />
        <IconButton
          icon={{ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }}
          label={`Move group ${group.name} down`}
          disabled={!canMoveDown}
          onPress={() => onEdit({ kind: 'move-group', groupId: group.id, by: 1 })}
          testID={`${testID}-down`}
        />
        {canDelete && (
          <IconButton
            icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
            label={`Delete group ${group.name}`}
            danger
            onPress={() => onEdit({ kind: 'delete-group', groupId: group.id })}
            testID={`${testID}-delete`}
          />
        )}
      </View>
      {group.apps.length > 0 && (
        <TileGrid>
          {group.apps.map(({ app, pinned }) => (
            <SelectableApp
              key={app.id}
              app={app}
              label={pinned ? `${app.title}, pinned` : app.title}
              pinned={pinned}
              selected={selectedId === app.id}
              onPress={() => onSelect(app.id)}
              testID={`customize-app-${app.id}`}
            />
          ))}
        </TileGrid>
      )}
      {group.apps.length === 0 && (
        <ThemedText type="footnote" style={styles.note} testID={`${testID}-empty`}>
          No apps in this group
        </ThemedText>
      )}
      {moveHereName !== null && (
        <Pressable
          role="button"
          onPress={() => {
            if (selectedId) onEdit({ kind: 'move-app', moduleId: selectedId, groupId: group.id });
          }}
          style={({ pressed }) => [
            styles.moveHere,
            { borderColor: theme.accentText },
            pressed && styles.pressed,
          ]}
          testID={`${testID}-move-here`}>
          <ThemedText type="action" themeColor="accentText" style={styles.center}>
            {`Move ${moveHereName} here`}
          </ThemedText>
        </Pressable>
      )}
    </GlassCard>
  );
}

/**
 * The group's name, edited in place. Saved when the field is left (return or tapping elsewhere);
 * an emptied name puts the old one back. Plain RN TextInput: @expo/ui's has no Jest
 * implementation (as in the Habits form; #31 checkpoint A).
 */
function NameField({
  group,
  onEdit,
  testID,
}: {
  group: CustomizeGroup<HiveModule>;
  onEdit: (edit: HomeEdit) => void;
  testID: string;
}) {
  const theme = useTheme();
  // Null while not editing, so the field follows the saved name (and a rolled-back save).
  const [draft, setDraft] = useState<string | null>(null);

  const save = () => {
    const name = (draft ?? group.name).trim();
    setDraft(null);
    if (name && name !== group.name) {
      onEdit({ kind: 'rename-group', groupId: group.id, name });
    }
  };

  return (
    <TextInput
      value={draft ?? group.name}
      onChangeText={setDraft}
      onEndEditing={save}
      maxLength={MAX_GROUP_NAME}
      aria-label="Group name"
      autoCapitalize="sentences"
      returnKeyType="done"
      selectionColor={theme.accent}
      cursorColor={theme.accent}
      style={[
        styles.field,
        { backgroundColor: theme.field, borderColor: theme.fieldBorder, color: theme.text },
      ]}
      testID={testID}
    />
  );
}

function IconButton({
  icon,
  label,
  disabled = false,
  danger = false,
  onPress,
  testID,
}: {
  icon: Exclude<SymbolViewProps['name'], string>;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      role="button"
      aria-label={label}
      disabled={disabled}
      aria-disabled={disabled}
      onPress={onPress}
      style={styles.control}
      testID={testID}>
      {({ pressed }) => (
        <View style={(pressed || disabled) && styles.pressed}>
          <SymbolView
            name={icon}
            size={Layout.customize.controlGlyph}
            tintColor={danger ? theme.danger : theme.iconMuted}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Layout.customize.section.gap,
    paddingTop: Layout.customize.section.paddingTop,
    paddingHorizontal: Layout.customize.section.paddingHorizontal,
    paddingBottom: Layout.customize.section.paddingBottom,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.customize.rowGap,
  },
  // Text style for the field: Text types don't apply to TextInput (the `field` type's values).
  field: {
    flex: 1,
    minWidth: 0,
    minHeight: Layout.minTouchAndroid,
    paddingHorizontal: Layout.customize.field.paddingHorizontal,
    borderRadius: Layout.customize.field.radius,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: 600,
  },
  control: {
    width: Layout.minTouchAndroid,
    height: Layout.minTouchAndroid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    paddingHorizontal: Layout.customize.section.titleInset,
  },
  moveHere: {
    minHeight: Layout.minTouchAndroid,
    justifyContent: 'center',
    paddingHorizontal: Layout.customize.section.paddingHorizontal,
    borderRadius: Layout.customize.moveHere.radius,
    borderWidth: Layout.customize.moveHere.border,
    borderStyle: 'dashed',
  },
  center: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.45,
  },
});
