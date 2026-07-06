import {
  HEADER_LAYERS,
  tickSegments,
  weekendBands,
} from '@/components/molecules/GanttHeader/GanttHeaderUtil';
import { dayColumns, weekTicks, dayIndex } from '@/lib/gantt/scale';

const start = dayIndex(new Date('2026-07-06T00:00:00.000Z')); // a Monday
const DAYS = 14;

describe('HEADER_LAYERS', () => {
  it('shows day cells only at week, and month bands at the coarse zooms', () => {
    expect(HEADER_LAYERS.week.showDayCells).toBe(true);
    expect(HEADER_LAYERS.month.showDayCells).toBe(false);
    expect(HEADER_LAYERS.year.showMonthBands).toBe(true);
    expect(HEADER_LAYERS.year.showWeekendShading).toBe(false);
  });
});

describe('weekendBands', () => {
  it('emits one band per weekend day, positioned within the window', () => {
    const bands = weekendBands(dayColumns(start, DAYS), start, DAYS);
    // Two weekends (Sat+Sun) in a 14-day window starting Monday → 4 weekend days.
    expect(bands).toHaveLength(4);
    expect(bands.every((band) => band.widthPct > 0)).toBe(true);
    expect(bands[0].leftPct).toBeGreaterThanOrEqual(0);
  });
});

describe('tickSegments', () => {
  it('spans each tick to the next, and the last tick to the window edge', () => {
    const segments = tickSegments(weekTicks(start, DAYS), start, DAYS);
    expect(segments).toHaveLength(2); // two Mondays in the window
    expect(segments[0].widthPct).toBeCloseTo((7 / DAYS) * 100);
    // Last segment runs from its Monday to the window's right edge.
    const last = segments[segments.length - 1];
    expect(last.leftPct + last.widthPct).toBeCloseTo(100);
  });
});
