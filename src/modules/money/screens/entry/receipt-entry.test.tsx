import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReceiptEntry } from './receipt-entry';
import { entry, metrics } from '../test-data';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

describe('ReceiptEntry', () => {
  it('is read-only and opens the receipt it came from', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ReceiptEntry
          entry={entry('e1', {
            amountMinor: 20000,
            note: 'Maxi 12',
            source: 'wallet',
            sourceRef: 'wallet:r1-a:0',
          })}
          category="Food"
        />
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('money-entry-readonly')).toBeOnTheScreen();
    expect(screen.queryByText('Save')).toBeNull();
    expect(screen.getByText('Maxi 12')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('money-entry-open-receipt'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/wallet/receipt/[id]',
      params: { id: 'r1-a' },
    });
  });
});
