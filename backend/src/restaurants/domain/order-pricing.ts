import type { OrderLineStatus } from './restaurant-order.models';

export function includedTaxCents(grossCents: number, ratePercent: number): number {
  if (ratePercent <= 0) return 0;
  return Math.round((grossCents * ratePercent) / (100 + ratePercent));
}

export function calculateOrderTotals(
  lines: Array<{ subtotalCents: number; taxCents: number; status: OrderLineStatus }>,
  discountTotalCents: number,
): { subtotalCents: number; taxCents: number; totalCents: number } {
  const active = lines.filter((line) => line.status !== 'cancelled');
  const subtotalCents = active.reduce((sum, line) => sum + line.subtotalCents, 0);
  const taxCents = active.reduce((sum, line) => sum + line.taxCents, 0);
  return {
    subtotalCents,
    taxCents,
    totalCents: Math.max(0, subtotalCents - discountTotalCents),
  };
}

export function calculatePaymentSummary(
  totalCents: number,
  payments: Array<{ amountCents: number; status: string }>,
): { paidCents: number; balanceCents: number } {
  const paidCents = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amountCents, 0);
  return { paidCents, balanceCents: Math.max(0, totalCents - paidCents) };
}
