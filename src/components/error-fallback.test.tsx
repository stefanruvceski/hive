import { render, screen, userEvent } from '@testing-library/react-native';

import { ErrorFallback } from './error-fallback';

describe('ErrorFallback', () => {
  it('shows friendly copy and retries on press', async () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    await render(<ErrorFallback error={new Error('boom')} retry={retry} />);

    expect(screen.getByText('Something went wrong.')).toBeOnTheScreen();
    // Raw error details must never reach the user.
    expect(screen.queryByText(/boom/)).not.toBeOnTheScreen();

    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
