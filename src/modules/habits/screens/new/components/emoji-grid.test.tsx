import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { EmojiGrid } from './emoji-grid';

const emojis = ['🎯', '💧', '📚'];
const renderGrid = (value: string, onChange = jest.fn()) =>
  render(<EmojiGrid emojis={emojis} value={value} onChange={onChange} testID="habits-new-emoji" />);

describe('EmojiGrid', () => {
  it('marks the chosen emoji and reports a pick', async () => {
    const onChange = jest.fn();
    await renderGrid('💧', onChange);

    expect(screen.getByRole('radio', { name: '💧' })).toBeChecked();
    await userEvent.setup().press(screen.getByTestId('habits-new-emoji-2'));
    expect(onChange).toHaveBeenCalledWith('📚');
  });

  it('takes any emoji typed in the last cell, only the first one', async () => {
    const onChange = jest.fn();
    await renderGrid('🎯', onChange);

    // A keyboard sends the whole emoji at once.
    await fireEvent.changeText(screen.getByTestId('habits-new-emoji-custom'), '🚀🔥');
    expect(onChange).toHaveBeenLastCalledWith('🚀');
  });

  it('shows a chosen emoji from outside the list in the typing cell', async () => {
    await renderGrid('🚀');

    expect(screen.getByTestId('habits-new-emoji-custom').props.value).toBe('🚀');
    expect(screen.getByRole('radio', { name: '🎯' })).not.toBeChecked();
  });
});
