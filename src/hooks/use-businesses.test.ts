import { businessByPib } from './use-businesses';

const rows = [
  { id: 'a', name: 'Moja firma', pib: '104052135' },
  { id: 'b', name: 'Druga', pib: '100002557' },
];

describe('businessByPib', () => {
  it('finds a business by its PIB, ignoring spaces and dashes', () => {
    expect(businessByPib(rows, '104052135')?.name).toBe('Moja firma');
    expect(businessByPib(rows, '100-002 557')?.id).toBe('b');
  });

  it('finds nothing for an unknown, malformed or missing PIB', () => {
    expect(businessByPib(rows, '111111111')).toBeNull();
    expect(businessByPib(rows, '1234')).toBeNull();
    expect(businessByPib(rows, null)).toBeNull();
    expect(businessByPib(undefined, '104052135')).toBeNull();
  });
});
