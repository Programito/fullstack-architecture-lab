import { fromZonedTime } from 'date-fns-tz';

/**
 * Single adapter around the date/timezone library used for restaurant-local
 * day boundaries. Keep all `date-fns-tz` imports confined to this file so a
 * future library swap only touches this module.
 */

export function zonedDayRangeUtc(dateIso: string, timeZone: string): { from: string; to: string } {
  return {
    from: fromZonedTime(`${dateIso}T00:00:00.000`, timeZone).toISOString(),
    to: fromZonedTime(`${dateIso}T23:59:59.999`, timeZone).toISOString(),
  };
}

export function currentZonedDateIso(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function addDaysToIsoDate(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetweenIsoDates(fromIso: string, toIso: string): number {
  const [fromYear, fromMonth, fromDay] = fromIso.split('-').map(Number);
  const [toYear, toMonth, toDay] = toIso.split('-').map(Number);
  const from = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const to = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}
