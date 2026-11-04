import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WalletPrices } from './index';
import {
  useMergeProducts,
  useMergeShops,
  usePriceBook,
  useRenameShop,
  useUnmergeShop,
} from '../../data/price-queries';
import { loaded, samplePriceBook } from '../test-data';

jest.mock('../../data/price-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const fns = {
  mergeProducts: jest.fn(),
  mergeShops: jest.fn(),
  rename: jest.fn(),
  unmerge: jest.fn(),
};
const frame = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={frame}>
      <WalletPrices />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useMergeProducts).mockReturnValue({ mutate: fns.mergeProducts } as never);
  jest.mocked(useMergeShops).mockReturnValue({ mutate: fns.mergeShops } as never);
  jest.mocked(useRenameShop).mockReturnValue({ mutate: fns.rename } as never);
  jest.mocked(useUnmergeShop).mockReturnValue({ mutate: fns.unmerge } as never);
});

describe('WalletPrices', () => {
  it('lists products with the cheapest shop and opens one', async () => {
    jest.mocked(usePriceBook).mockReturnValue(loaded(samplePriceBook()));
    await renderScreen();
    const user = userEvent.setup();

    expect(screen.getByText(/cheapest Idea/)).toBeOnTheScreen();
    await user.press(screen.getByTestId('wallet-prices-product-zbregov-mleko-1'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/wallet/prices/[product]',
      params: { product: 'ZBREGOV MLEKO 1%' },
    });
  });

  it('searches and says when nothing matches', async () => {
    jest.mocked(usePriceBook).mockReturnValue(loaded(samplePriceBook()));
    await renderScreen();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('wallet-prices-search'), 'hleb');
    expect(screen.queryByTestId('wallet-prices-product-zbregov-mleko-1')).toBeNull();
    expect(screen.getByTestId('wallet-prices-product-hleb')).toBeOnTheScreen();
    await user.clear(screen.getByTestId('wallet-prices-search'));
    await user.type(screen.getByTestId('wallet-prices-search'), 'banane');
    expect(screen.getByTestId('wallet-prices-no-match')).toBeOnTheScreen();
  });

  it('merges two picked names, first picked stays', async () => {
    jest.mocked(usePriceBook).mockReturnValue(loaded(samplePriceBook()));
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('wallet-prices-merge-mode'));
    expect(screen.getByTestId('wallet-prices-merge')).toBeDisabled();
    await user.press(screen.getByTestId('wallet-prices-product-zbregov-mleko-1'));
    await user.press(screen.getByTestId('wallet-prices-product-zbregov-1-mleko'));
    await user.press(screen.getByTestId('wallet-prices-merge'));
    expect(fns.mergeProducts).toHaveBeenCalledWith({
      a: 'ZBREGOV MLEKO 1%',
      b: 'ZBREGOV 1% MLEKO',
    });
  });

  it('renames, merges and unmerges shops', async () => {
    jest
      .mocked(usePriceBook)
      .mockReturnValue(
        loaded({ ...samplePriceBook(), shopGroups: [{ keys: ['Maxi', 'Idea'], name: null }] }),
      );
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('wallet-prices-view-shops'));
    await user.press(screen.getByTestId('wallet-shop-maxi'));
    await user.clear(screen.getByTestId('wallet-shop-name'));
    await user.type(screen.getByTestId('wallet-shop-name'), 'Chain');
    await user.press(screen.getByTestId('wallet-shop-rename'));
    expect(fns.rename).toHaveBeenCalledWith({ key: 'Maxi', name: 'Chain' });

    await user.press(screen.getByTestId('wallet-shop-maxi'));
    await user.press(screen.getByTestId('wallet-shop-unmerge'));
    expect(fns.unmerge).toHaveBeenCalledWith('Maxi');

    await user.press(screen.getByTestId('wallet-shops-merge-mode'));
    await user.press(screen.getByTestId('wallet-shop-maxi'));
    await user.press(screen.getByTestId('wallet-shop-idea'));
    await user.press(screen.getByTestId('wallet-shops-merge'));
    expect(fns.mergeShops).toHaveBeenCalledWith({ a: 'Maxi', b: 'Idea' });
  });

  it('shows the empty state', async () => {
    jest.mocked(usePriceBook).mockReturnValue(loaded({ ...samplePriceBook(), products: [] }));
    await renderScreen();
    expect(screen.getByTestId('wallet-prices-empty')).toBeOnTheScreen();
  });

  it('shows the loading state', async () => {
    jest.mocked(usePriceBook).mockReturnValue({ data: undefined, isError: false } as never);
    await renderScreen();
    expect(screen.getByTestId('wallet-prices-loading')).toBeOnTheScreen();
  });

  it('offers a retry when loading fails', async () => {
    const refetch = jest.fn();
    jest
      .mocked(usePriceBook)
      .mockReturnValue({ data: undefined, isError: true, error: new Error('x'), refetch } as never);
    await renderScreen();
    await userEvent.setup().press(screen.getByTestId('wallet-prices-error-retry'));
    expect(refetch).toHaveBeenCalled();
  });
});
