import { act, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UndoBar, undoMs } from './undo-bar';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderBar = (props: React.ComponentProps<typeof UndoBar>) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <UndoBar {...props} />
    </SafeAreaProvider>,
  );

describe('UndoBar', () => {
  it('shows the message and undoes on tap', async () => {
    const onUndo = jest.fn();
    await renderBar({ message: 'Habit archived', onUndo, onDismiss: jest.fn() });

    expect(screen.getByText('Habit archived')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('habits-undo'));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('dismisses itself after a few seconds', async () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();
    await renderBar({ message: 'Habit archived', onUndo: jest.fn(), onDismiss });

    await act(() => jest.advanceTimersByTime(undoMs - 1));
    expect(onDismiss).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
