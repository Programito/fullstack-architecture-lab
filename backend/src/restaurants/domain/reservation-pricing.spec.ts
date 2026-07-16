import { describe, expect, it } from 'vitest';

import { calculateReservationDepositCents, RESERVATION_DEPOSIT_PER_PERSON_CENTS } from './reservation-pricing';

describe('calculateReservationDepositCents', () => {
  it('multiplies the per-person deposit by the party size', () => {
    expect(calculateReservationDepositCents(1)).toBe(RESERVATION_DEPOSIT_PER_PERSON_CENTS);
    expect(calculateReservationDepositCents(4)).toBe(4 * RESERVATION_DEPOSIT_PER_PERSON_CENTS);
  });

  it('returns zero for a party size of zero', () => {
    expect(calculateReservationDepositCents(0)).toBe(0);
  });
});
