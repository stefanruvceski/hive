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

describe('GoalField quit switch', () => {
  it('has a Quit habit switch when it is given a handler, and reports it', async () => {
    const onQuitChange = jest.fn();
    await render(
      <GoalField
        value={undefined}
        onChange={jest.fn()}
        quit={false}
        onQuitChange={onQuitChange}
        testID="f-goal"
      />,
    );

    expect(screen.getByRole('switch', { name: 'Quit habit' })).not.toBeChecked();
    await userEvent.setup().press(screen.getByRole('switch', { name: 'Quit habit' }));
    expect(onQuitChange).toHaveBeenCalledWith(true);
  });

  it('calls the target a limit for a quit habit', async () => {
    await render(
      <GoalField
        value={{ unit: 'cups', target: 2, aggregation: 'sum' }}
        onChange={jest.fn()}
        quit
        onQuitChange={jest.fn()}
        testID="f-goal"
      />,
    );

    expect(screen.getByRole('switch', { name: 'Quit habit' })).toBeChecked();
    expect(screen.getByLabelText('Daily limit')).toBeOnTheScreen();
  });

  it('has no quit switch without a handler', async () => {
    await renderField(undefined);
    expect(screen.queryByRole('switch', { name: 'Quit habit' })).not.toBeOnTheScreen();
  });
});
