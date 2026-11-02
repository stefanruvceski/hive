import { pageAt, todayLayout } from './today-pages';

describe('todayLayout', () => {
  it.each([
    // A 390 pt phone at default text: 169 pt widgets, two in view.
    ['phone, one widget', { width: 390, fontScale: 1, count: 1 }, 169, 1, [0]],
    ['phone, two widgets fit', { width: 390, fontScale: 1, count: 2 }, 169, 1, [0]],
    ['phone, three widgets (design)', { width: 390, fontScale: 1, count: 3 }, 169, 2, [0, 181]],
    ['phone, five widgets', { width: 390, fontScale: 1, count: 5 }, 169, 4, [0, 181, 362, 543]],
    ['larger text stays square', { width: 390, fontScale: 1.24, count: 3 }, 169, 2, [0, 181]],
    // Largest text sizes: full width, one per page (LargeText.dc.html).
    ['largest text (design)', { width: 390, fontScale: 1.3, count: 3 }, 350, 3, [0, 362, 724]],
    ['largest text, one widget', { width: 390, fontScale: 2, count: 1 }, 350, 1, [0]],
    // Wide windows are capped at MaxContentWidth (800): four widgets in view.
    // The strip can only scroll 5 × 181 + 48 − 800 = 153: the last snap point is the strip's end.
    ['wide window', { width: 1200, fontScale: 1, count: 5 }, 169, 2, [0, 153]],
    ['wide window, largest text', { width: 1200, fontScale: 2, count: 2 }, 760, 2, [0, 772]],
  ])('%s', (_name, input, widgetWidth, positions, snapOffsets) => {
    const layout = todayLayout(input);
    expect(layout).toEqual({ widgetWidth, step: widgetWidth + 12, positions, snapOffsets });
  });
});

describe('pageAt', () => {
  const layout = todayLayout({ width: 390, fontScale: 1, count: 3 });

  it.each([
    [0, 0],
    [80, 0],
    [100, 1],
    [181, 1],
    // Past the last snap point (the end of the strip) and overscroll stay on the last page.
    [201, 1],
    [900, 1],
    [-40, 0],
  ])('offset %d is page %d', (offset, page) => {
    expect(pageAt(offset, layout)).toBe(page);
  });
});
