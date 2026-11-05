import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyCategories } from './index';
import { useBusinesses } from '../../data/business-queries';
import { useActiveView, useSetView, useArchiveCategory, useCategories } from '../../data/queries';
import { category, loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
jest.mock('../../data/business-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

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
  jest.mocked(useActiveView).mockReturnValue(loaded('private'));
  jest.mocked(useBusinesses).mockReturnValue(loaded([]));
  jest.mocked(useSetView).mockReturnValue({ mutate: jest.fn() } as never);
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
    expect(screen.getByTestId('money-category-edit-food')).toBeOnTheScreen();
    expect(screen.queryByTestId('money-category-edit-fuel')).not.toBeOnTheScreen();
    expect(screen.getByTestId('money-category-edit-old')).toHaveTextContent(/archived/);
  });

  it('has no form of its own: the + opens a new category in the shown list, a row opens it', async () => {
    await renderScreen();
    const user = userEvent.setup();

    expect(screen.queryByTestId('money-categories-name')).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('money-categories-add'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/money/category',
      params: { space: 'private' },
    });
    await user.press(screen.getByTestId('money-category-edit-food'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/money/category',
      params: { id: 'food' },
    });
  });

  it('adds to the Business list when that list is shown', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-categories-space-business'));
    await user.press(screen.getByTestId('money-categories-add'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/money/category',
      params: { space: 'business' },
    });
  });

  it('archives and restores', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(
      screen.getByTestId('money-category-food-archive', { includeHiddenElements: true }),
    );
    expect(archive).toHaveBeenCalledWith({ id: 'food', archived: true });
    await user.press(
      screen.getByTestId('money-category-old-archive', { includeHiddenElements: true }),
    );
    expect(archive).toHaveBeenCalledWith({ id: 'old', archived: false });
  });
});
