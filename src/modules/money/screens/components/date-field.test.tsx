import { render, screen, userEvent } from '@testing-library/react-native';

import { DateField } from './date-field';

jest.mock('@expo/ui/community/datetime-picker', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    DateTimePicker: ({
      testID,
      onValueChange,
    }: {
      testID: string;
      onValueChange: (event: object, date: Date) => void;
    }) => (
      <Pressable testID={testID} onPress={() => onValueChange({}, new Date(2026, 9, 21, 12))} />
    ),
  };
});

describe('DateField', () => {
  it('shows the day and opens the calendar on tap', async () => {
    await render(<DateField label="Date" value="2026-11-04" onChange={jest.fn()} testID="day" />);
    const user = userEvent.setup();

    expect(screen.getByTestId('day')).toHaveTextContent('2026-11-04');
    expect(screen.queryByTestId('day-picker')).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('day'));
    expect(screen.getByTestId('day-picker')).toBeOnTheScreen();
  });

  it('reports the picked day and closes the calendar', async () => {
    const onChange = jest.fn();
    await render(<DateField label="Date" value="2026-11-04" onChange={onChange} testID="day" />);
    const user = userEvent.setup();

    await user.press(screen.getByTestId('day'));
    await user.press(screen.getByTestId('day-picker'));
    expect(onChange).toHaveBeenCalledWith('2026-10-21');
    expect(screen.queryByTestId('day-picker')).not.toBeOnTheScreen();
  });
});
