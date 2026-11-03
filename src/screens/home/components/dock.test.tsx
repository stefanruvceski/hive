import { render, screen } from '@testing-library/react-native';

import { Layout } from '@/constants/theme';
import { hiveModules } from '@/modules/registry';

import { Dock } from './dock';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const flat = (testID: string) => {
  const style = screen.getByTestId(testID).props.style;
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
};

describe('Dock', () => {
  it('has the same space on every side around the Customize button when nothing is pinned', async () => {
    await render(<Dock pinned={[]} bottom={28} onOpen={jest.fn()} />);

    const dock = flat('home-dock');
    expect(dock.paddingStart).toBe(Layout.dock.padding.end);
    expect(dock.paddingEnd).toBe(Layout.dock.padding.end);
    expect(dock.paddingVertical).toBe(Layout.dock.padding.vertical);
    expect(Layout.dock.padding.vertical).toBe(Layout.dock.padding.end);
  });

  it('keeps the wider start padding when apps are pinned', async () => {
    const [app] = hiveModules;
    if (!app) throw new Error('no module registered');
    await render(<Dock pinned={[app]} bottom={28} onOpen={jest.fn()} />);

    expect(flat('home-dock').paddingStart).toBe(Layout.dock.padding.start);
  });
});
