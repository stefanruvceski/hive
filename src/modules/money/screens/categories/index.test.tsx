import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyCategories } from './index';
import {
  useActiveSpace,
  useArchiveCategory,
  useCategories,
  useSaveCategory,
} from '../../data/queries';
import { category, loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const save = jest.fn();
const archive = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useCategories)
    .mockReturnValue(
      loaded([
        category('food', { name: 'Food' }),
        category('salary', { name: 'Salary', kind: 'income' }),
        category('old', { name: 'Old', archivedAt: '2026-10-01' }),
        category('fuel', { name: 'Fuel', space: 'business' }),
      ]),
    );
  jest.mocked(useActiveSpace).mockReturnValue(loaded('private'));
  jest.mocked(useSaveCategory).mockReturnValue({ mutate: save } as never);
  jest.mocked(useArchiveCategory).mockReturnValue({ mutate: archive } as never);
});

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneyCategories />
    </SafeAreaProvider>,
  );

describe('MoneyCategories', () => {
  it('lists the open space only, archived ones marked', async () => {
    await renderScreen();
    expect(screen.getByTestId('money-category-food')).toBeOnTheScreen();
    expect(screen.queryByTestId('money-category-fuel')).not.toBeOnTheScreen();
    expect(screen.getByTestId('money-category-old')).toHaveTextContent(/archived/);
  });

  it('adds a category to the open space', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-categories-name'), 'Pets');
    await user.press(screen.getByTestId('money-categories-save'));
    expect(save).toHaveBeenCalledWith(
      { id: undefined, space: 'private', kind: 'expense', name: 'Pets', emoji: '🏷️' },
      expect.anything(),
    );
  });

  it('refuses an empty or taken name', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-categories-save'));
    expect(screen.getByTestId('money-categories-error')).toBeOnTheScreen();
    await user.type(screen.getByTestId('money-categories-name'), 'food');
    await user.press(screen.getByTestId('money-categories-save'));
    expect(screen.getByTestId('money-categories-error')).toHaveTextContent(/already used/);
    expect(save).not.toHaveBeenCalled();
  });

  it('renames a category', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-category-edit-food'));
    expect(screen.getByTestId('money-categories-name').props.value).toBe('Food');
    await user.clear(screen.getByTestId('money-categories-name'));
    await user.type(screen.getByTestId('money-categories-name'), 'Groceries');
    await user.press(screen.getByTestId('money-categories-save'));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'food', name: 'Groceries' }),
      expect.anything(),
    );
  });

  it('archives and restores', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-category-archive-food'));
    expect(archive).toHaveBeenCalledWith({ id: 'food', archived: true });
    await user.press(screen.getByTestId('money-category-archive-old'));
    expect(archive).toHaveBeenCalledWith({ id: 'old', archived: false });
  });
});
