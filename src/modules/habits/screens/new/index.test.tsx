import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsNew } from './index';
import { useCreateHabit } from '../../data/queries';

// The database boundary: the module's query hooks (09 §5).
jest.mock('../../data/queries');
jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn() } }));

const mutate = jest.fn();
function mockCreate(state: object = {}) {
  jest
    .mocked(useCreateHabit)
    .mockReturnValue({ mutate, isPending: false, isError: false, ...state } as never);
}

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderForm = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HabitsNew />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mutate.mockReset();
  mockCreate();
});

describe('HabitsNew', () => {
  // dismissTo, not back: under a deep link Home, not the list, is below the form (#42 review).
  it('saves the name, emoji and part of the day, then goes back to the list', async () => {
    mutate.mockImplementation((_input, options) => options?.onSuccess?.());
    await renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('habits-new-name'), 'Read 10 pages');
    await user.press(screen.getByRole('radio', { name: '📚' }));
    await user.press(screen.getByRole('radio', { name: 'Evening' }));
    await user.press(screen.getByTestId('habits-new-save'));

    expect(mutate).toHaveBeenCalledWith(
      { name: 'Read 10 pages', emoji: '📚', timeOfDay: 'evening' },
      expect.anything(),
    );
    expect(router.dismissTo).toHaveBeenCalledWith('/habits');
  });

  // isPending only disables Save after a re-render, and a SQLite write settles at once, before the
  // form has animated out. Two quick taps must still save once (#42 review).
  it('saves once when Save is tapped twice quickly', async () => {
    mutate.mockImplementation((_input, options) => {
      options?.onSuccess?.();
      options?.onSettled?.();
    });
    await renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('habits-new-name'), 'Run');
    await user.press(screen.getByTestId('habits-new-save'));
    await user.press(screen.getByTestId('habits-new-save'));

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('goes back to the list, like Save', async () => {
    await renderForm();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Back' }));
    expect(router.dismissTo).toHaveBeenCalledWith('/habits');
  });

  it('starts with 🎯 and Anytime chosen', async () => {
    await renderForm();

    expect(screen.getByRole('radio', { name: '🎯' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Anytime' })).toBeChecked();
  });

  it('disables Save while the name is empty or only spaces', async () => {
    await renderForm();
    const user = userEvent.setup();

    expect(screen.getByTestId('habits-new-save')).toBeDisabled();
    await user.type(screen.getByTestId('habits-new-name'), '   ');
    expect(screen.getByTestId('habits-new-save')).toBeDisabled();
    await user.press(screen.getByTestId('habits-new-save'));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('disables Save while the habit is being saved', async () => {
    mockCreate({ isPending: true });
    await renderForm();

    await userEvent.setup().type(screen.getByTestId('habits-new-name'), 'Run');
    expect(screen.getByTestId('habits-new-save')).toBeDisabled();
  });

  it('stays on the form with the input kept and a retryable error when saving fails', async () => {
    mockCreate({ isError: true });
    mutate.mockImplementation((_input, options) => {
      options?.onError?.(new Error('disk full'));
      options?.onSettled?.();
    });
    await renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('habits-new-name'), 'Run');
    await user.press(screen.getByTestId('habits-new-save'));

    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(screen.getByTestId('habits-new-error')).toHaveTextContent(
      "Couldn't save the habit. Try again.",
    );
    expect(screen.getByTestId('habits-new-name')).toHaveDisplayValue('Run');
    expect(screen.getByTestId('habits-new-save')).toBeEnabled();
    // Retryable: the double-save guard is released after an error.
    await user.press(screen.getByTestId('habits-new-save'));
    expect(mutate).toHaveBeenCalledTimes(2);
  });
});
