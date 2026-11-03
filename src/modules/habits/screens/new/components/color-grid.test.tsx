import { render, screen, userEvent } from '@testing-library/react-native';

import { ColorGrid } from './color-grid';
import { habitColorOptions } from '../../../habit-color';

const renderGrid = (value: string | undefined, onChange = jest.fn()) =>
  render(<ColorGrid value={value} onChange={onChange} testID="habits-new-color" />);

describe('ColorGrid', () => {
  it('offers Automatic and every color, each a radio with a name', async () => {
    await renderGrid(undefined);

    expect(screen.getAllByRole('radio')).toHaveLength(habitColorOptions.length + 1);
    expect(screen.getByRole('radio', { name: 'Automatic color' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Teal' })).not.toBeChecked();
  });

  it('marks the chosen color and reports a pick', async () => {
    const onChange = jest.fn();
    await renderGrid('pink', onChange);
    const user = userEvent.setup();

    expect(screen.getByRole('radio', { name: 'Pink' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Automatic color' })).not.toBeChecked();
    await user.press(screen.getByTestId('habits-new-color-blue'));
    expect(onChange).toHaveBeenCalledWith('blue');
    await user.press(screen.getByTestId('habits-new-color-auto'));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
});
