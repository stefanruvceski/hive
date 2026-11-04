import { render, screen, userEvent } from '@testing-library/react-native';

import { ReceiptImport } from './receipt-import';
import { useReceiptSync } from '../../data/receipt-import';

jest.mock('../../data/receipt-import');

const importNow = jest.fn();
const sync = (waiting: number, importing = false) =>
  jest.mocked(useReceiptSync).mockReturnValue({ waiting, importNow, importing });

beforeEach(() => jest.clearAllMocks());

describe('ReceiptImport', () => {
  it('shows nothing when no receipt is waiting', async () => {
    sync(0);
    await render(<ReceiptImport />);
    expect(screen.queryByTestId('money-import')).toBeNull();
  });

  it('offers "Import N receipts" and imports on the tap', async () => {
    sync(3);
    await render(<ReceiptImport />);

    expect(screen.getByText('Import 3 receipts')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('money-import-receipts'));
    expect(importNow).toHaveBeenCalledTimes(1);
  });

  it('says "receipt" for one and holds the button while importing', async () => {
    sync(1, true);
    await render(<ReceiptImport />);

    expect(screen.getByText('Import 1 receipt')).toBeOnTheScreen();
    expect(screen.getByTestId('money-import-receipts')).toBeDisabled();
  });
});
