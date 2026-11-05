import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyBusinesses } from './index';
import { useArchiveBusiness, useBusinesses } from '../../data/business-queries';
import { business, loaded, metrics } from '../test-data';

jest.mock('../../data/business-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const archive = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useBusinesses)
    .mockReturnValue(loaded([business('b1', { name: 'Shop', pib: '101134702' })]));
  jest.mocked(useArchiveBusiness).mockReturnValue({ mutate: archive } as never);
});

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneyBusinesses />
    </SafeAreaProvider>,
  );

describe('MoneyBusinesses', () => {
  it('lists the businesses with their PIB', async () => {
    await renderScreen();
    expect(screen.getByTestId('money-business-edit-b1')).toHaveTextContent(/Shop.*PIB 101134702/);
  });

  it('has no form of its own: the + opens a new business, a row opens that business', async () => {
    await renderScreen();
    const user = userEvent.setup();

    expect(screen.queryByTestId('money-business-name')).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('money-businesses-add'));
    expect(router.push).toHaveBeenCalledWith('/money/business');
    await user.press(screen.getByTestId('money-business-edit-b1'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/money/business',
      params: { id: 'b1' },
    });
  });

  it('archives a business', async () => {
    await renderScreen();
    await userEvent
      .setup()
      .press(screen.getByTestId('money-business-b1-archive', { includeHiddenElements: true }));
    expect(archive).toHaveBeenCalledWith({ id: 'b1', archived: true });
  });

  it('says there are none yet', async () => {
    jest.mocked(useBusinesses).mockReturnValue(loaded([]));
    await renderScreen();
    expect(screen.getByTestId('money-businesses-empty')).toBeOnTheScreen();
  });
});
