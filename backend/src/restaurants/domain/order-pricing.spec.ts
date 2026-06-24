import { describe, expect, it } from 'vitest';

import { calculateOrderTotals, calculatePaymentSummary, includedTaxCents } from './order-pricing';

describe('order pricing', () => {
  it('extracts included tax using integer cents', () => {
    expect(includedTaxCents(1350, 21)).toBe(234);
    expect(includedTaxCents(980, 10)).toBe(89);
    expect(includedTaxCents(250, 0)).toBe(0);
  });

  it('excludes cancelled lines from totals', () => {
    expect(
      calculateOrderTotals(
        [
          { subtotalCents: 1350, taxCents: 234, status: 'pending' },
          { subtotalCents: 980, taxCents: 89, status: 'cancelled' },
        ],
        0,
      ),
    ).toEqual({
      subtotalCents: 1350,
      taxCents: 234,
      totalCents: 1350,
    });
  });

  it('subtracts discount from total but not subtotal', () => {
    expect(
      calculateOrderTotals(
        [{ subtotalCents: 1000, taxCents: 174, status: 'served' }],
        100,
      ),
    ).toEqual({
      subtotalCents: 1000,
      taxCents: 174,
      totalCents: 900,
    });
  });

  it('clamps totalCents to zero when discount exceeds subtotal', () => {
    expect(
      calculateOrderTotals([{ subtotalCents: 500, taxCents: 87, status: 'pending' }], 600),
    ).toEqual({ subtotalCents: 500, taxCents: 87, totalCents: 0 });
  });

  it('calculates paid amount and remaining balance from completed payments only', () => {
    expect(
      calculatePaymentSummary(2750, [
        { amountCents: 1000, status: 'completed' },
        { amountCents: 500, status: 'failed' },
      ]),
    ).toEqual({ paidCents: 1000, balanceCents: 1750 });
  });

  it('returns zero balance when fully paid', () => {
    expect(
      calculatePaymentSummary(500, [{ amountCents: 500, status: 'completed' }]),
    ).toEqual({ paidCents: 500, balanceCents: 0 });
  });
});
