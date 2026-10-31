import { render, screen } from '@testing-library/react-native';

import { SegmentedControl } from './segmented-control';

const options = [
  { value: 'a', label: 'One' },
  { value: 'b', label: 'Two' },
] as const;

describe('SegmentedControl', () => {
  // Jest runs the iOS (SwiftUI) branch; the Compose branch needs the native module
  // (Material colors) and is checked on a device. Selection is covered by the Settings tests.
  it('renders the native control with its testID', async () => {
    await render(
      <SegmentedControl
        label="Choice"
        options={options}
        value="a"
        onChange={() => {}}
        testID="choice"
      />,
    );

    expect(screen.getByTestId('choice')).toBeOnTheScreen();
  });
});
