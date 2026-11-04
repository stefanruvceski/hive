import { Chips } from './fields';
import type { Business, View } from '../../domain/owners';

/**
 * All · Private · one chip per business. With no business there is nothing to choose between, so
 * nothing is shown.
 */
export function ViewChips({
  view,
  businesses,
  onChange,
}: {
  view: View;
  businesses: readonly Business[];
  onChange: (view: View) => void;
}) {
  if (businesses.length === 0) return null;
  return (
    <Chips
      options={[
        { value: 'all', label: 'All' },
        { value: 'private', label: 'Private' },
        ...businesses.map((business) => ({ value: business.id, label: business.name })),
      ]}
      value={view}
      onChange={onChange}
      idPrefix="money-view"
    />
  );
}
