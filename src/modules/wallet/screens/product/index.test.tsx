import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WalletProduct } from './index';
import {
  useMarkNotSame,
  useMergeProducts,
  usePriceBook,
  useRenameProduct,
  useUnmergeProduct,
} from '../../data/price-queries';
import { loaded, samplePriceBook } from '../test-data';

jest.mock('../../data/price-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const fns = { rename: jest.fn(), unmerge: jest.fn(), merge: jest.fn(), notSame: jest.fn() };
const frame = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderScreen = (key = 'ZBREGOV MLEKO 1%') =>
  render(
    <SafeAreaProvider initialMetrics={frame}>
      <WalletProduct productKey={key} />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRenameProduct).mockReturnValue({ mutate: fns.rename } as never);
  jest.mocked(useUnmergeProduct).mockReturnValue({ mutate: fns.unmerge } as never);
  jest.mocked(useMergeProducts).mockReturnValue({ mutate: fns.merge } as never);
  jest.mocked(useMarkNotSame).mockReturnValue({ mutate: fns.notSame } as never);
  jest.mocked(usePriceBook).mockReturnValue(loaded(samplePriceBook()));
});

describe('WalletProduct', () => {
  it('shows last, lowest, average and count per shop and the chart', async () => {
    await renderScreen();

    expect(screen.getByTestId('wallet-product-shop-maxi')).toHaveTextContent(
      /169,00 RSD \/KOM · 2026-10-09/,
    );
    expect(screen.getByTestId('wallet-product-shop-maxi')).toHaveTextContent(
      /Lowest 159,00 · average 164,00 · 2×/,
    );
    expect(screen.queryByTestId('wallet-product-shop-idea')).toBeNull(); // Idea sells the other spelling
    expect(screen.getByTestId('wallet-product-chart')).toBeOnTheScreen();
  });

  it('only suggests; merging and "not the same" are the user\'s taps', async () => {
    await renderScreen();
    const user = userEvent.setup();

    expect(fns.merge).not.toHaveBeenCalled();
    await user.press(screen.getByTestId('wallet-product-merge-zbregov-1-mleko'));
    expect(fns.merge).toHaveBeenCalledWith({ a: 'ZBREGOV MLEKO 1%', b: 'ZBREGOV 1% MLEKO' });
    await user.press(screen.getByTestId('wallet-product-not-same-zbregov-1-mleko'));
    expect(fns.notSame).toHaveBeenCalledWith({ a: 'ZBREGOV MLEKO 1%', b: 'ZBREGOV 1% MLEKO' });
  });

  it('renames the product', async () => {
    await renderScreen();
    const user = userEvent.setup();

    expect(screen.getByTestId('wallet-product-rename')).toBeDisabled();
    await user.clear(screen.getByTestId('wallet-product-name'));
    await user.type(screen.getByTestId('wallet-product-name'), 'Mleko 1%');
    await user.press(screen.getByTestId('wallet-product-rename'));
    expect(fns.rename).toHaveBeenCalledWith({ key: 'ZBREGOV MLEKO 1%', name: 'Mleko 1%' });
  });

  it('unmerges a merged product and stops suggesting', async () => {
    const book = samplePriceBook();
    const [milk] = book.products;
    if (!milk) throw new Error('no product');
    jest
      .mocked(usePriceBook)
      .mockReturnValue(loaded({ ...book, notSame: ['ZBREGOV 1% MLEKO|ZBREGOV MLEKO 1%'] }));
    await renderScreen();
    expect(screen.queryByTestId('wallet-product-similar-label')).toBeNull();
    expect(screen.queryByTestId('wallet-product-unmerge')).toBeNull();

    jest.mocked(usePriceBook).mockReturnValue(
      loaded({
        ...book,
        products: [{ ...milk, keys: ['ZBREGOV MLEKO 1%', 'ZBREGOV 1% MLEKO'], named: true }],
      }),
    );
    await renderScreen(milk.key);
    await userEvent.setup().press(screen.getByTestId('wallet-product-unmerge'));
    expect(fns.unmerge).toHaveBeenCalledWith(milk.key);
  });

  it('says when the product is gone', async () => {
    await renderScreen('NOPE');
    expect(screen.getByTestId('wallet-product-missing')).toBeOnTheScreen();
  });
});
