import { render, screen, userEvent } from '@testing-library/react-native';

import { ScheduleField } from './schedule-field';
import type { Schedule } from '../../../domain/schedule';

const daily: Schedule = { type: 'daily', days: [], times: 3 };
const renderField = (value: Schedule, onChange = jest.fn()) =>
  render(<ScheduleField value={value} onChange={onChange} testID="f-schedule" />);

describe('ScheduleField', () => {
  it('shows only the choice for a daily habit', async () => {
    await renderField(daily);

    expect(screen.getByTestId('f-schedule-type-daily')).toBeOnTheScreen();
    expect(screen.queryByTestId('f-schedule-day-1')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('f-schedule-times')).not.toBeOnTheScreen();
  });

  it('starts weekdays on Monday to Friday and weekly with the kept count', async () => {
    const onChange = jest.fn();
    await renderField(daily, onChange);
    const user = userEvent.setup();

    await user.press(screen.getByTestId('f-schedule-type-weekdays'));
    expect(onChange).toHaveBeenLastCalledWith({
      type: 'weekdays',
      days: [1, 2, 3, 4, 5],
      times: 3,
    });
    await user.press(screen.getByTestId('f-schedule-type-weekly'));
    expect(onChange).toHaveBeenLastCalledWith({ type: 'weekly', days: [], times: 3 });
  });

  it('toggles weekdays with their full names', async () => {
    const onChange = jest.fn();
    await renderField({ type: 'weekdays', days: [1, 3], times: 3 }, onChange);
    const user = userEvent.setup();

    expect(screen.getByRole('checkbox', { name: 'Monday' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Tuesday' })).not.toBeChecked();
    await user.press(screen.getByRole('checkbox', { name: 'Tuesday' }));
    expect(onChange).toHaveBeenLastCalledWith({ type: 'weekdays', days: [1, 2, 3], times: 3 });
    await user.press(screen.getByRole('checkbox', { name: 'Monday' }));
    expect(onChange).toHaveBeenLastCalledWith({ type: 'weekdays', days: [3], times: 3 });
  });

  it('steps the weekly count between 1 and 7', async () => {
    const onChange = jest.fn();
    await renderField({ type: 'weekly', days: [], times: 3 }, onChange);
    const user = userEvent.setup();

    expect(screen.getByTestId('f-schedule-times')).toHaveTextContent('3 times a week');
    await user.press(screen.getByRole('button', { name: 'More times' }));
    expect(onChange).toHaveBeenLastCalledWith({ type: 'weekly', days: [], times: 4 });
    await user.press(screen.getByRole('button', { name: 'Fewer times' }));
    expect(onChange).toHaveBeenLastCalledWith({ type: 'weekly', days: [], times: 2 });
  });

  it('cannot go below once or above seven times a week', async () => {
    await renderField({ type: 'weekly', days: [], times: 1 });
    expect(screen.getByRole('button', { name: 'Fewer times' })).toBeDisabled();
    expect(screen.getByTestId('f-schedule-times')).toHaveTextContent('1 time a week');
  });
});
