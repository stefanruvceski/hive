import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { GoalField } from './goal-field';
import type { Goal } from '../../../domain/goal';

const renderField = (value: Goal | undefined, onChange = jest.fn()) =>
  render(<GoalField value={value} onChange={onChange} testID="f-goal" />);

describe('GoalField', () => {
  it('is off for a yes/no habit and turns on with an empty goal', async () => {
    const onChange = jest.fn();
    await renderField(undefined, onChange);

    expect(screen.queryByTestId('f-goal-target')).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('switch', { name: 'Measure an amount' }));
    expect(onChange).toHaveBeenCalledWith({ unit: '', target: 0, aggregation: 'sum' });
  });

  it('turns off by clearing the goal', async () => {
    const onChange = jest.fn();
    await renderField({ unit: 'glasses', target: 8, aggregation: 'sum' }, onChange);

    expect(screen.getByRole('switch', { name: 'Measure an amount' })).toBeChecked();
    await userEvent.setup().press(screen.getByRole('switch', { name: 'Measure an amount' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('reports the unit, the target (with a comma as decimal) and the aggregation', async () => {
    const onChange = jest.fn();
    await renderField({ unit: '', target: 0, aggregation: 'sum' }, onChange);

    await fireEvent.changeText(screen.getByTestId('f-goal-unit'), 'L');
    expect(onChange).toHaveBeenLastCalledWith({ unit: 'L', target: 0, aggregation: 'sum' });
    await fireEvent.changeText(screen.getByTestId('f-goal-target'), '2,5');
    expect(onChange).toHaveBeenLastCalledWith({ unit: '', target: 2.5, aggregation: 'sum' });
    await userEvent.setup().press(screen.getByTestId('f-goal-aggregation-avg'));
    expect(onChange).toHaveBeenLastCalledWith({ unit: '', target: 0, aggregation: 'avg' });
  });

  it('keeps what was typed while the number is incomplete', async () => {
    await renderField({ unit: '', target: 0, aggregation: 'sum' });

    await fireEvent.changeText(screen.getByTestId('f-goal-target'), '2.');
    expect(screen.getByTestId('f-goal-target').props.value).toBe('2.');
  });
});
