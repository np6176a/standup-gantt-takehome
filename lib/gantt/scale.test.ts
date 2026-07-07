import {
  barMetrics,
  dateFromDayIndex,
  dayIndex,
  dayIndexFromDateString,
  dayIndexToPercent,
  defaultWindowStart,
  isWeekendIndex,
  monthTicks,
  shiftWindow,
  timelineTicks,
  weekTicks,
  windowDaysForZoom,
} from '@/lib/gantt/scale';

describe('UTC day index', () => {
  it('collapses a date-only dueDate and a same-day full timestamp to one index (off-by-one tripwire)', () => {
    const dateOnly = dayIndexFromDateString('2026-07-06');
    expect(dayIndexFromDateString('2026-07-06T00:00:00.000Z')).toBe(dateOnly);
    expect(dayIndexFromDateString('2026-07-06T12:00:00.000Z')).toBe(dateOnly);
    expect(dayIndexFromDateString('2026-07-06T23:59:59.000Z')).toBe(dateOnly);
  });

  it('advances by one across a UTC midnight boundary', () => {
    expect(dayIndexFromDateString('2026-07-07')).toBe(dayIndexFromDateString('2026-07-06') + 1);
  });

  it('round-trips index → UTC-midnight date → index', () => {
    const idx = dayIndexFromDateString('2026-01-15');
    const date = dateFromDayIndex(idx);
    expect(date.toISOString()).toBe('2026-01-15T00:00:00.000Z');
    expect(dayIndex(date)).toBe(idx);
  });

  it('flags weekends', () => {
    // 2026-07-04 is a Saturday, 2026-07-05 a Sunday, 2026-07-06 a Monday.
    expect(isWeekendIndex(dayIndexFromDateString('2026-07-04'))).toBe(true);
    expect(isWeekendIndex(dayIndexFromDateString('2026-07-05'))).toBe(true);
    expect(isWeekendIndex(dayIndexFromDateString('2026-07-06'))).toBe(false);
  });
});

describe('positioning', () => {
  it('maps day index to a percentage of the window', () => {
    expect(dayIndexToPercent(100, 100, 10)).toBe(0);
    expect(dayIndexToPercent(105, 100, 10)).toBe(50);
    expect(dayIndexToPercent(110, 100, 10)).toBe(100);
  });

  it('clamps a clipped-left span and flags it', () => {
    const metrics = barMetrics(95, 103, 100, 7);
    expect(metrics.clippedLeft).toBe(true);
    expect(metrics.clippedRight).toBe(false);
    expect(metrics.leftPct).toBe(0);
    expect(metrics.visible).toBe(true);
  });

  it('clamps a clipped-right span and flags it', () => {
    const metrics = barMetrics(104, 120, 100, 7);
    expect(metrics.clippedRight).toBe(true);
    expect(metrics.leftPct).toBeCloseTo((4 / 7) * 100);
    expect(metrics.widthPct).toBeCloseTo(100 - (4 / 7) * 100);
  });

  it('reports a span wholly outside the window as not visible', () => {
    expect(barMetrics(200, 210, 100, 7).visible).toBe(false);
  });

  it('renders a zero-length marker on the first visible day (leftPct 0)', () => {
    const marker = barMetrics(100, 100, 100, 7); // due-only span exactly at window start
    expect(marker.visible).toBe(true);
    expect(marker.leftPct).toBe(0);
    expect(marker.widthPct).toBe(0);
  });

  it('hides a marker just before the window and past its right edge', () => {
    expect(barMetrics(99, 99, 100, 7).visible).toBe(false); // day before window
    expect(barMetrics(107, 107, 100, 7).visible).toBe(false); // exclusive right edge
    expect(barMetrics(106, 106, 100, 7).visible).toBe(true); // last day inside window
  });
});

describe('zoom windows', () => {
  it('has the expected span per zoom', () => {
    expect(windowDaysForZoom('week')).toBe(7);
    expect(windowDaysForZoom('fortnight')).toBe(14);
    expect(windowDaysForZoom('month')).toBe(35);
    expect(windowDaysForZoom('quarter')).toBe(91);
    expect(windowDaysForZoom('year')).toBe(364);
  });

  it('starts the week on today (current day → next same weekday), and leads the coarser zooms', () => {
    const today = dayIndexFromDateString('2026-07-06');
    expect(defaultWindowStart(today, 'week')).toBe(today);
    expect(windowDaysForZoom('week')).toBe(7);
    expect(defaultWindowStart(today, 'month')).toBe(today - 7);
  });

  it('shifts by a zoom unit, and recenters on today for direction 0', () => {
    const today = dayIndexFromDateString('2026-07-06');
    const start = defaultWindowStart(today, 'week');
    expect(shiftWindow(start, 'week', 1, today)).toBe(start + 7);
    expect(shiftWindow(start, 'week', -1, today)).toBe(start - 7);
    expect(shiftWindow(start, 'fortnight', 1, today)).toBe(start + 14);
    expect(shiftWindow(start + 999, 'week', 0, today)).toBe(defaultWindowStart(today, 'week'));
  });
});

describe('ticks', () => {
  const start = dayIndexFromDateString('2026-07-06');

  it('produces one day column per day', () => {
    expect(timelineTicks('week', start, 7).days).toHaveLength(7);
    expect(timelineTicks('month', start, 35).days).toHaveLength(35);
  });

  it('places week ticks on Mondays', () => {
    for (const tick of weekTicks(start, 35)) {
      expect(dateFromDayIndex(tick.idx).getUTCDay()).toBe(1);
      expect(tick.label).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    }
  });

  it('anchors month ticks at the window start and each month boundary', () => {
    const months = monthTicks(start, 91);
    expect(months[0].idx).toBe(start);
    for (const tick of months.slice(1)) {
      expect(dateFromDayIndex(tick.idx).getUTCDate()).toBe(1);
    }
    // A ~13-week window spans at least three calendar months.
    expect(months.length).toBeGreaterThanOrEqual(3);
  });
});
