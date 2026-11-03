import { render, screen, userEvent } from '@testing-library/react-native';

import { StarterSuggestions } from './starter-suggestions';

jest.mock('@/lib/haptics', () => ({ tapHaptic: jest.fn(), liftHaptic: jest.fn() }));

describe('StarterSuggestions', () => {
  it('cannot add until something is picked', async () => {
    await render(<StarterSuggestions onAdd={jest.fn()} />);

    expect(screen.getByTestId('habits-suggestions-add')).toBeDisabled();
  });

  it('adds the picked suggestions, and an unpicked one is left out', async () => {
    const onAdd = jest.fn();
    await render(<StarterSuggestions onAdd={onAdd} />);
    const user = userEvent.setup();

    await user.press(screen.getByTestId('habits-suggestion-water'));
    await user.press(screen.getByTestId('habits-suggestion-read'));
    await user.press(screen.getByTestId('habits-suggestion-read'));
    await user.press(screen.getByTestId('habits-suggestion-walk'));
    await user.press(screen.getByTestId('habits-suggestions-add'));

    expect(onAdd).toHaveBeenCalledWith(new Set(['water', 'walk']));
  });
});
