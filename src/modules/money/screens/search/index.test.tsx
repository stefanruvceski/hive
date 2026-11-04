import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneySearch } from './index';
import { shareCsv } from '../../data/csv-file';
import { useActiveSpace, useCategories, useEntries, useItems } from '../../data/queries';
import { category, entry, loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
jest.mock('../../data/csv-file', () => ({ shareCsv: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-02' }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(shareCsv).mockResolvedValue(undefined);
  jest
    .mocked(useEntries)
    .mockReturnValue(
      loaded([
        entry('a', { note: 'Lunch with Ana' }),
        entry('b', { categoryId: 'fun', note: 'Cinema', date: '2026-10-05' }),
        entry('c', { kind: 'income', categoryId: 'food', note: 'Refund' }),
        entry('x', { space: 'business', note: 'Lunch for the firm' }),
      ]),
    );
  jest.mocked(useItems).mockReturnValue(loaded([]));
  jest
    .mocked(useCategories)
    .mockReturnValue(
      loaded([category('food', { name: 'Food' }), category('fun', { name: 'Fun' })]),
    );
  jest.mocked(useActiveSpace).mockReturnValue(loaded('private'));
});

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneySearch />
    </SafeAreaProvider>,
  );

describe('MoneySearch', () => {
  it('lists everything of the open space at first', async () => {
    await renderScreen();
    expect(screen.getByTestId('money-search-count')).toHaveTextContent('3 entries');
    expect(screen.queryByTestId('money-search-result-x')).not.toBeOnTheScreen();
  });

  it('filters by text, type, category and dates', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-search-query'), 'lunch');
    expect(screen.getByTestId('money-search-count')).toHaveTextContent('1 entry');
    await user.clear(screen.getByTestId('money-search-query'));
    await user.press(screen.getByTestId('money-search-kind-income'));
    expect(screen.getByTestId('money-search-count')).toHaveTextContent('1 entry');
    await user.press(screen.getByTestId('money-search-clear'));
    await user.press(screen.getByTestId('money-search-category-fun'));
    expect(screen.getByTestId('money-search-result-b')).toBeOnTheScreen();
    await user.press(screen.getByTestId('money-search-clear'));
    await user.type(screen.getByTestId('money-search-from'), '2026-11-01');
    expect(screen.queryByTestId('money-search-result-b')).not.toBeOnTheScreen();
  });

  it('says when nothing matches and disables the export', async () => {
    await renderScreen();
    await userEvent.setup().type(screen.getByTestId('money-search-query'), 'zzz');
    expect(screen.getByTestId('money-search-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('money-search-export')).toBeDisabled();
  });

  it('exports what is found as CSV', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-search-query'), 'cinema');
    await user.press(screen.getByTestId('money-search-export'));
    await waitFor(() => expect(shareCsv).toHaveBeenCalled());
    const [csv, today] = jest.mocked(shareCsv).mock.calls[0] ?? [];
    expect(today).toBe('2026-11-02');
    expect(csv).toContain('Cinema');
    expect(csv).not.toContain('Lunch');
  });

  it('reports an export that fails', async () => {
    jest.mocked(shareCsv).mockRejectedValue(new Error('no'));
    await renderScreen();
    await userEvent.setup().press(screen.getByTestId('money-search-export'));
    expect(await screen.findByTestId('money-search-error')).toBeOnTheScreen();
  });
});
