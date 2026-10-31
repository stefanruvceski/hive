import { ThemedText } from '@/components/themed-text';

type Props = {
  children: string;
  /** `section` — a section title ("Today"); `group` — the small name under a group card. */
  variant?: 'section' | 'group';
  testID: string;
};

/** Section title or group name. Wraps at large text sizes instead of truncating. */
export function SectionLabel({ children, variant = 'section', testID }: Props) {
  return (
    <ThemedText
      role={variant === 'section' ? 'heading' : undefined}
      type={variant === 'section' ? 'section' : 'groupLabel'}
      testID={testID}>
      {children}
    </ThemedText>
  );
}
