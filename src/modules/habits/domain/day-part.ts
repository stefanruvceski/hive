// Where the clock is among the parts of the day. Pure: the hour is passed in. Tested in day-part.test.ts.

import type { TimeOfDay } from '../data/schema';

/** The part of the day an hour (0-23) falls in: morning to 12h, afternoon to 17h, then evening. */
export function currentPart(hour: number): Exclude<TimeOfDay, 'anytime'> {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const order = ['morning', 'afternoon', 'evening'] as const;

/** A part of the day against the clock: now, already over, or still to come. "Anytime" is never over. */
export function partState(part: TimeOfDay, hour: number): 'now' | 'earlier' | 'later' {
  if (part === 'anytime') return 'later';
  const current = order.indexOf(currentPart(hour));
  const index = order.indexOf(part);
  return index === current ? 'now' : index < current ? 'earlier' : 'later';
}
