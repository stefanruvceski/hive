import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyCategory } from './index';
import { useCategories, useSaveCategory } from '../../data/queries';
import { category, loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const save = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useCategories)
    .mockReturnValue(
      loaded([
        category('food', { name: 'Food' }),
        category('fuel', { name: 'Fuel', space: 'business' }),
      ]),
    );
  jest.mocked(useSaveCategory).mockReturnValue({ mutate: save } as never);
});

const renderScreen = (props: { id?: string; space?: 'private' | 'business' } = {}) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneyCategory space={props.space ?? 'private'} id={props.id} />
    </SafeAreaProvider>,
  );

describe('MoneyCategory', () => {
  it('adds a category to the list it was opened from, then goes back', async () => {
    save.mockImplementation((_c: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    await renderScreen({ space: 'business' });
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-category-name'), 'Parking');
    await user.press(screen.getByTestId('money-category-save'));
    expect(save).toHaveBeenCalledWith(
      { id: undefined, space: 'business', kind: 'expense', name: 'Parking', emoji: '🏷️' },
      expect.anything(),
    );
    expect(router.back).toHaveBeenCalled();
  });

  it('refuses an empty or taken name', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-category-save'));
    expect(screen.getByTestId('money-category-error')).toBeOnTheScreen();
    await user.type(screen.getByTestId('money-category-name'), 'food');
    await user.press(screen.getByTestId('money-category-save'));
    expect(screen.getByTestId('money-category-error')).toHaveTextContent(/already used/);
    expect(save).not.toHaveBeenCalled();
  });

  it('opens a saved category, renames it, and cannot move it to another list or kind', async () => {
    await renderScreen({ id: 'food' });
    const user = userEvent.setup();

    expect(screen.queryByTestId('money-category-space')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('money-category-kind')).not.toBeOnTheScreen();
    expect(screen.getByTestId('money-category-name').props.value).toBe('Food');
    await user.clear(screen.getByTestId('money-category-name'));
    await user.type(screen.getByTestId('money-category-name'), 'Groceries');
    await user.press(screen.getByTestId('money-category-save'));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'food', name: 'Groceries', space: 'private' }),
      expect.anything(),
    );
  });
});
