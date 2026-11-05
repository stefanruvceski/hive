import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyBusiness } from './index';
import { useBusinesses, useSaveBusiness } from '../../data/business-queries';
import { business, loaded, metrics } from '../test-data';

jest.mock('../../data/business-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const save = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useBusinesses)
    .mockReturnValue(loaded([business('b1', { name: 'Shop', pib: '101134702' })]));
  jest.mocked(useSaveBusiness).mockReturnValue({ mutate: save } as never);
});

const renderScreen = (id?: string) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneyBusiness id={id} />
    </SafeAreaProvider>,
  );

describe('MoneyBusiness', () => {
  it('adds a business with a valid PIB, ignoring spaces, and goes back', async () => {
    save.mockImplementation((_b: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    await renderScreen();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-business-name'), 'Garage');
    await user.type(screen.getByTestId('money-business-pib'), '100 002 887');
    await user.press(screen.getByTestId('money-business-save'));
    expect(save).toHaveBeenCalledWith(
      { id: undefined, name: 'Garage', pib: '100002887' },
      expect.anything(),
    );
    expect(router.back).toHaveBeenCalled();
  });

  it('checks the name and the PIB', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-business-save'));
    expect(screen.getByTestId('money-business-error')).toHaveTextContent(/name/);
    await user.type(screen.getByTestId('money-business-name'), 'Garage');
    await user.type(screen.getByTestId('money-business-pib'), '1234');
    await user.press(screen.getByTestId('money-business-save'));
    expect(screen.getByTestId('money-business-error')).toHaveTextContent(/nine digits/);
    await user.clear(screen.getByTestId('money-business-pib'));
    await user.type(screen.getByTestId('money-business-pib'), '101134703');
    await user.press(screen.getByTestId('money-business-save'));
    expect(screen.getByTestId('money-business-error')).toHaveTextContent(/not valid/);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not add the same PIB twice', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-business-name'), 'Copy');
    await user.type(screen.getByTestId('money-business-pib'), '101134702');
    await user.press(screen.getByTestId('money-business-save'));
    expect(screen.getByTestId('money-business-error')).toHaveTextContent(/already Shop/);
    expect(save).not.toHaveBeenCalled();
  });

  it('opens a saved business with its name and PIB, and renames it', async () => {
    await renderScreen('b1');
    const user = userEvent.setup();

    expect(screen.getByTestId('money-business-pib').props.value).toBe('101134702');
    await user.clear(screen.getByTestId('money-business-name'));
    await user.type(screen.getByTestId('money-business-name'), 'Big Shop');
    await user.press(screen.getByTestId('money-business-save'));
    expect(save).toHaveBeenCalledWith(
      { id: 'b1', name: 'Big Shop', pib: '101134702' },
      expect.anything(),
    );
  });
});
