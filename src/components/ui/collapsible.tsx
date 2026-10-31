import { SymbolView } from 'expo-symbols';
import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Collapsible({
  children,
  title,
  testID,
}: PropsWithChildren & { title: string; testID: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  return (
    <View>
      <Pressable
        role="button"
        aria-expanded={isOpen}
        testID={testID}
        hitSlop={8}
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}>
        {({ pressed }) => (
          <>
            <GlassSurface kind="control" radius={Spacing.four / 2} style={styles.button}>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={14}
                weight="bold"
                tintColor={theme.text}
                style={[
                  { transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] },
                  pressed && styles.pressed,
                ]}
              />
            </GlassSurface>

            {/* Fade the content on press, never the glass: iOS can't blur under a faded view. */}
            <ThemedText type="body" style={pressed && styles.pressed}>
              {title}
            </ThemedText>
          </>
        )}
      </Pressable>
      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <GlassCard style={styles.content} testID={`${testID}-content`}>
            {children}
          </GlassCard>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  button: {
    width: Spacing.four,
    height: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginTop: Spacing.three,
    marginLeft: Spacing.four,
    padding: Spacing.four,
  },
});
