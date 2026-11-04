import { useWindowDimensions } from 'react-native';

/** From ~1.5× text (iOS accessibility sizes) a value beside a name is too narrow: stack it below. */
const STACK_FONT_SCALE = 1.5;

export function useStackedRow(): boolean {
  return useWindowDimensions().fontScale >= STACK_FONT_SCALE;
}

/** One line with an ellipsis beside a value; every line at accessibility sizes, where nothing may be cut. */
export const rowLines = (stacked: boolean) => (stacked ? undefined : 1);
