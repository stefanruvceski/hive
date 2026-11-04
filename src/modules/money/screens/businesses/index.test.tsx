import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyBusinesses } from './index';
import { useArchiveBusiness, useBusinesses, useSaveBusiness } from '../../data/business-queries';
import { business, loaded, metrics } from '../test-data';

jest.mock('../../data/business-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const save = jest.fn();
const archive = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useBusinesses)
    .mockReturnValue(loaded([business('b1', { name: 'Shop', pib: '101134702' })]));
  jest.mocked(useSaveBusiness).mockReturnValue({ mutate: save } as never);
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

  it('adds a business with a valid PIB, ignoring spaces', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-businesses-name'), 'Garage');
    await user.type(screen.getByTestId('money-businesses-pib'), '100 002 887');
    await user.press(screen.getByTestId('money-businesses-save'));
    expect(save).toHaveBeenCalledWith(
      { id: undefined, name: 'Garage', pib: '100002887' },
      expect.anything(),
    );
  });

  it('checks the name and the PIB', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-businesses-save'));
    expect(screen.getByTestId('money-businesses-error')).toHaveTextContent(/name/);
    await user.type(screen.getByTestId('money-businesses-name'), 'Garage');
    await user.type(screen.getByTestId('money-businesses-pib'), '1234');
    await user.press(screen.getByTestId('money-businesses-save'));
    expect(screen.getByTestId('money-businesses-error')).toHaveTextContent(/nine digits/);
    await user.clear(screen.getByTestId('money-businesses-pib'));
    await user.type(screen.getByTestId('money-businesses-pib'), '101134703');
    await user.press(screen.getByTestId('money-businesses-save'));
    expect(screen.getByTestId('money-businesses-error')).toHaveTextContent(/not valid/);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not add the same PIB twice', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-businesses-name'), 'Copy');
    await user.type(screen.getByTestId('money-businesses-pib'), '101134702');
    await user.press(screen.getByTestId('money-businesses-save'));
    expect(screen.getByTestId('money-businesses-error')).toHaveTextContent(/already Shop/);
    expect(save).not.toHaveBeenCalled();
  });

  it('renames a business and archives it', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-business-edit-b1'));
    expect(screen.getByTestId('money-businesses-pib').props.value).toBe('101134702');
    await user.clear(screen.getByTestId('money-businesses-name'));
    await user.type(screen.getByTestId('money-businesses-name'), 'Big Shop');
    await user.press(screen.getByTestId('money-businesses-save'));
    expect(save).toHaveBeenCalledWith(
      { id: 'b1', name: 'Big Shop', pib: '101134702' },
      expect.anything(),
    );
    await user.press(screen.getByTestId('money-business-archive-b1'));
    expect(archive).toHaveBeenCalledWith({ id: 'b1', archived: true });
  });

  it('says there are none yet', async () => {
    jest.mocked(useBusinesses).mockReturnValue(loaded([]));
    await renderScreen();
    expect(screen.getByTestId('money-businesses-empty')).toBeOnTheScreen();
  });
});
