import { render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '@/lib/api';

import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('maps statuses to friendly copy and retries on press', async () => {
    const onRetry = jest.fn();
    const { rerender } = await render(
      <ErrorState error={new ApiError(500, 'GET /x failed')} onRetry={onRetry} testID="x-error" />,
    );

    expect(screen.getByText('Something went wrong. Please try again.')).toBeOnTheScreen();
    // Raw server message must never reach the user.
    expect(screen.queryByText(/GET \/x failed/)).not.toBeOnTheScreen();

    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await rerender(
      <ErrorState error={new ApiError(404, 'missing')} onRetry={onRetry} testID="x-error" />,
    );
    expect(screen.getByText("We couldn't find what you were looking for.")).toBeOnTheScreen();

    await rerender(
      <ErrorState error={new ApiError(401, 'nope')} onRetry={onRetry} testID="x-error" />,
    );
    expect(screen.getByText('You need to sign in to see this.')).toBeOnTheScreen();
  });
});
