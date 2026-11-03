// The only place that talks to expo-haptics. Feedback is a nicety: it never throws and never waits.
import { ImpactFeedbackStyle, impactAsync, selectionAsync } from 'expo-haptics';

/** A light tap, e.g. when something is ticked off. */
export function tapHaptic() {
  impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
}

/** The small tick of picking something up. */
export function liftHaptic() {
  selectionAsync().catch(() => {});
}
