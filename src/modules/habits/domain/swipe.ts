// Pure release rules for a swipeable habit row (iOS list behaviour): drag a little and let go to
// open the buttons, drag all the way to run the outer one. No React. Tested in swipe.test.ts.

export type SwipeSide = 'leading' | 'trailing';
export type SwipeOutcome = { kind: 'close' } | { kind: 'open' | 'full'; side: SwipeSide };

type Release = {
  /** Where the row is when the finger lifts: negative = dragged towards the trailing edge. */
  offset: number;
  /** Points per second, same sign convention as `offset`. */
  velocity: number;
  width: number;
  leadingPanel: number;
  trailingPanel: number;
};

/** Past this share of the row's width, letting go runs the action instead of showing buttons. */
const fullShare = 0.55;
/** A flick faster than this opens (or closes) the buttons whatever the distance. */
const flick = 500;

export function swipeOutcome({
  offset,
  velocity,
  width,
  leadingPanel,
  trailingPanel,
}: Release): SwipeOutcome {
  if (offset === 0) return { kind: 'close' };
  const side: SwipeSide = offset < 0 ? 'trailing' : 'leading';
  const distance = Math.abs(offset);
  const panel = side === 'trailing' ? trailingPanel : leadingPanel;
  // Positive while the finger is still pulling the row further open.
  const opening = side === 'trailing' ? -velocity : velocity;

  if (distance >= width * fullShare) return { kind: 'full', side };
  if (opening > flick) return { kind: 'open', side };
  if (opening < -flick) return { kind: 'close' };
  return distance >= panel / 2 ? { kind: 'open', side } : { kind: 'close' };
}
