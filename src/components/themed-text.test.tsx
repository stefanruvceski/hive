import { render, screen } from '@testing-library/react-native';

import { ThemedText } from './themed-text';

describe('ThemedText', () => {
  // RN Text defaults to flexShrink: 0, so text in a row overflows its parent (#22).
  it('shrinks by default so text stays inside a row', async () => {
    await render(<ThemedText testID="text">{'a'.repeat(40)}</ThemedText>);

    expect(screen.getByTestId('text')).toHaveStyle({ flexShrink: 1 });
  });

  it('lets the caller override the shrink default', async () => {
    await render(
      <ThemedText testID="text" style={{ flexShrink: 0 }}>
        Label
      </ThemedText>,
    );

    expect(screen.getByTestId('text')).toHaveStyle({ flexShrink: 0 });
  });
});
