import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneySettings } from './index';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const frame = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('MoneySettings', () => {
  it('opens each of the places that manage Money', async () => {
    await render(
      <SafeAreaProvider initialMetrics={frame}>
        <MoneySettings />
      </SafeAreaProvider>,
    );
    const user = userEvent.setup();

    for (const [id, href] of [
      ['budgets', '/money/budgets'],
      ['recurring', '/money/recurring'],
      ['businesses', '/money/businesses'],
      ['categories', '/money/categories'],
      ['rates', '/money/rates'],
    ] as const) {
      await user.press(screen.getByTestId(`money-${id}-open`));
      expect(router.push).toHaveBeenCalledWith(href);
    }
  });
});
