import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HiveModule } from '@/modules/registry';

import { SelectableApp } from './selectable-app';
import { TileGrid } from './tile-grid';

type Props = {
  hidden: readonly HiveModule[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** Apps hidden from Home, faded; select one and move it to a group to bring it back. */
export function HiddenSection({ hidden, selectedId, onSelect }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.section, { borderColor: theme.dashedSlot }]} testID="customize-hidden">
      <ThemedText type="listHeader" role="heading" style={styles.inset}>
        Hidden from Home
      </ThemedText>
      {hidden.length > 0 ? (
        <TileGrid>
          {hidden.map((app) => (
            <SelectableApp
              key={app.id}
              app={app}
              label={`${app.title}, hidden`}
              faded
              selected={selectedId === app.id}
              onPress={() => onSelect(app.id)}
              testID={`customize-hidden-${app.id}`}
            />
          ))}
        </TileGrid>
      ) : (
        <ThemedText type="footnote" style={styles.inset} testID="customize-hidden-empty">
          Nothing hidden. Hidden apps keep their data.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Layout.customize.section.gap,
    paddingTop: Layout.customize.section.paddingTop,
    paddingHorizontal: Layout.customize.section.paddingHorizontal,
    paddingBottom: Layout.customize.section.paddingBottom,
    borderRadius: Layout.radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  inset: {
    paddingHorizontal: Layout.customize.section.titleInset,
  },
});
