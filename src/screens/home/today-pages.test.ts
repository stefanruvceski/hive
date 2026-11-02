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
    // Wide windows are capped at MaxContentWidth (800): four group columns (712), 44 in from the edge.
    ['wide window', { width: 1200, fontScale: 1, count: 5 }, 169, 2, [0, 181]],
    ['wide window, largest text', { width: 1200, fontScale: 2, count: 2 }, 712, 2, [0, 724]],
  ])('%s', (_name, input, widgetWidth, positions, snapOffsets) => {
    const layout = todayLayout(input);
    expect(layout).toMatchObject({ widgetWidth, step: widgetWidth + 12, positions, snapOffsets });
  });

  // The strip starts where the group grid starts, so Today and the cards line up (#33 review).
  it.each([
    ['390 pt phone', 390, 20],
    ['412 dp Android phone', 412, 31],
    ['wide window', 1200, 44],
  ])('lines up with the group grid on a %s', (_name, width, inset) => {
    expect(todayLayout({ width, fontScale: 1, count: 1 }).inset).toBe(inset);
  });

  it('makes full-width widgets as wide as the group grid', () => {
    expect(todayLayout({ width: 412, fontScale: 2, count: 1 }).widgetWidth).toBe(350);
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
