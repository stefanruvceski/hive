import { render, screen, userEvent } from '@testing-library/react-native';

import { HabitColors } from '@/constants/theme';
import { tapHaptic } from '@/lib/haptics';

import { HabitCheck } from './habit-check';

jest.mock('@/lib/haptics', () => ({ tapHaptic: jest.fn(), liftHaptic: jest.fn() }));

const color = HabitColors[3].dark;

const style = () => {
  const raw = screen.getByTestId('check').props.style;
  return Object.assign({}, ...[raw].flat(Infinity).filter(Boolean));
};

const renderCheck = (props: { checked: boolean; color?: string; onPress?: () => void }) =>
  render(
    <HabitCheck
      label="Done today: Run"
      onPress={props.onPress ?? jest.fn()}
      testID="check"
      {...props}
    />,
  );

describe('HabitCheck', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is filled with the habit color when done', async () => {
    await renderCheck({ checked: true, color });

    expect(style().backgroundColor).toBe(color);
    expect(style().borderColor).toBe(color);
  });

  it('has an outline in the habit color when not done, and no fill', async () => {
    await renderCheck({ checked: false, color });

    expect(style().borderColor).toBe(color);
    expect(style().backgroundColor).not.toBe(color);
  });

  it('keeps the accent look without a color, and still toggles', async () => {
    const onPress = jest.fn();
    await renderCheck({ checked: true, onPress });

    expect(screen.getByRole('checkbox', { name: 'Done today: Run' })).toBeChecked();
    await userEvent.setup().press(screen.getByTestId('check'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('taps with a haptic when pressed', async () => {
    await renderCheck({ checked: false });
    await userEvent.setup().press(screen.getByTestId('check'));

    expect(tapHaptic).toHaveBeenCalledTimes(1);
  });
});
