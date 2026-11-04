// Smooth chart lines (pure, tested in curve.test.ts): monotone cubic (Fritsch–Carlson) Bézier
// segments through the points, so the curve never overshoots above a peak or below a dip.

export type Point = { x: number; y: number };

/** The SVG path of a smooth line through `points` (x ascending); a lone point has no line. */
export function curvePath(points: readonly Point[]): string {
  const first = points[0];
  if (!first || points.length < 2) return '';
  const n = points.length;
  const slope = Array.from({ length: n - 1 }, (_, k) => {
    const dx = points[k + 1]!.x - points[k]!.x;
    return (points[k + 1]!.y - points[k]!.y) / (dx === 0 ? 1 : dx);
  });
  const tangent = Array.from({ length: n }, (_, k) => {
    if (k === 0) return slope[0]!;
    if (k === n - 1) return slope[n - 2]!;
    return slope[k - 1]! * slope[k]! <= 0 ? 0 : (slope[k - 1]! + slope[k]!) / 2;
  });
  for (let k = 0; k < n - 1; k++) {
    if (slope[k] === 0) {
      tangent[k] = 0;
      tangent[k + 1] = 0;
      continue;
    }
    const a = tangent[k]! / slope[k]!;
    const b = tangent[k + 1]! / slope[k]!;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      tangent[k] = t * a * slope[k]!;
      tangent[k + 1] = t * b * slope[k]!;
    }
  }
  const round = (value: number) => Math.round(value * 100) / 100;
  const segments = Array.from({ length: n - 1 }, (_, k) => {
    const from = points[k]!;
    const to = points[k + 1]!;
    const h = (to.x - from.x) / 3;
    return `C${round(from.x + h)},${round(from.y + tangent[k]! * h)} ${round(to.x - h)},${round(
      to.y - tangent[k + 1]! * h,
    )} ${round(to.x)},${round(to.y)}`;
  });
  return `M${round(first.x)},${round(first.y)} ${segments.join(' ')}`;
}
