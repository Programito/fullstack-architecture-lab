import { describe, expect, it } from 'vitest';

import { FakeReservationPaymentGateway } from './fake-reservation-payment.gateway';

describe('FakeReservationPaymentGateway', () => {
  it('approves any payment method, mirroring the mock order checkout', async () => {
    const gateway = new FakeReservationPaymentGateway();

    for (const method of ['card', 'cash', 'bizum', 'other'] as const) {
      const result = await gateway.charge({ amountCents: 1000, method });
      expect(result.approved).toBe(true);
      expect(result.paymentReference).toEqual(expect.any(String));
    }
  });

  it('returns a different payment reference for each approved charge', async () => {
    const gateway = new FakeReservationPaymentGateway();

    const first = await gateway.charge({ amountCents: 500, method: 'card' });
    const second = await gateway.charge({ amountCents: 500, method: 'card' });

    expect(first.paymentReference).not.toBe(second.paymentReference);
  });
});
