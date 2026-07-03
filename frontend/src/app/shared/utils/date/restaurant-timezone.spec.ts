import { addDaysToIsoDate, currentZonedDateIso, daysBetweenIsoDates, zonedDayRangeUtc } from './restaurant-timezone';

describe('restaurant-timezone', () => {
  describe('zonedDayRangeUtc', () => {
    it('converts a winter day (CET, UTC+1) in Europe/Madrid to UTC bounds', () => {
      expect(zonedDayRangeUtc('2026-01-15', 'Europe/Madrid')).toEqual({
        from: '2026-01-14T23:00:00.000Z',
        to: '2026-01-15T22:59:59.999Z',
      });
    });

    it('converts a summer day (CEST, UTC+2) in Europe/Madrid to UTC bounds', () => {
      expect(zonedDayRangeUtc('2026-07-15', 'Europe/Madrid')).toEqual({
        from: '2026-07-14T22:00:00.000Z',
        to: '2026-07-15T21:59:59.999Z',
      });
    });

    it('keeps the calendar day as-is for UTC', () => {
      expect(zonedDayRangeUtc('2026-03-01', 'UTC')).toEqual({
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-01T23:59:59.999Z',
      });
    });
  });

  describe('currentZonedDateIso', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns the next calendar day for a timezone ahead of UTC near midnight', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-24T23:30:00.000Z'));

      expect(currentZonedDateIso('Europe/Madrid')).toBe('2026-06-25');
      expect(currentZonedDateIso('UTC')).toBe('2026-06-24');
    });
  });

  describe('addDaysToIsoDate', () => {
    it('adds days within the same month', () => {
      expect(addDaysToIsoDate('2026-01-15', 7)).toBe('2026-01-22');
    });

    it('crosses a year boundary', () => {
      expect(addDaysToIsoDate('2026-12-28', 5)).toBe('2027-01-02');
    });

    it('supports negative offsets', () => {
      expect(addDaysToIsoDate('2026-03-01', -1)).toBe('2026-02-28');
    });
  });

  describe('daysBetweenIsoDates', () => {
    it('counts whole days between two dates', () => {
      expect(daysBetweenIsoDates('2026-01-01', '2026-01-08')).toBe(7);
    });

    it('crosses a year boundary', () => {
      expect(daysBetweenIsoDates('2026-12-28', '2027-01-02')).toBe(5);
    });

    it('returns 0 for the same date', () => {
      expect(daysBetweenIsoDates('2026-01-01', '2026-01-01')).toBe(0);
    });
  });
});
