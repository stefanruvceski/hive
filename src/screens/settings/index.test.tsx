import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';

import { Settings } from './index';

// Mock at the network boundary — the api client, never component internals (agent-rules/09 §5).
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: jest.fn().mockResolvedValue({ status: 'ok', time: '2026-01-01T00:00:00Z' }),
}));

function renderSettings() {
  // Fresh client per test; retries off so failures surface immediately.
  // gcTime: Infinity — no GC timers left running after the test (Jest teardown warning).
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Settings />
    </QueryClientProvider>,
  );
}

describe('Settings', () => {
  it('renders the build info and server status', async () => {
    await renderSettings();

    expect(screen.getByTestId('settings-about')).toBeOnTheScreen();
    expect(screen.getByTestId('app-info-card')).toBeOnTheScreen();
    // The row renders immediately as 'checking…'; wait for the query result, not the element.
    await waitFor(() => expect(screen.getByTestId('app-info-server')).toHaveTextContent('ok'));
  });
});
