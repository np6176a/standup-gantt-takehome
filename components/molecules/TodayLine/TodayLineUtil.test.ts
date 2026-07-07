import { formatDayLabel } from '@/components/molecules/TodayLine/TodayLineUtil';
import { dayIndexFromDateString } from '@/lib/gantt/scale';

describe('formatDayLabel', () => {
  it('formats a day index as a short "Mon Day" label', () => {
    expect(formatDayLabel(dayIndexFromDateString('2026-07-06'))).toBe('Jul 6');
  });

  it('uses the UTC calendar day, matching the header ticks', () => {
    expect(formatDayLabel(dayIndexFromDateString('2026-01-01'))).toBe('Jan 1');
    expect(formatDayLabel(dayIndexFromDateString('2026-12-31'))).toBe('Dec 31');
  });
});
