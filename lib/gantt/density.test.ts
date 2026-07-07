import {
  BAR_LABEL_MIN_PX,
  BAR_HEIGHT_PX,
  PR_LINE_PX,
  PX_PER_DAY,
  ROW_HEIGHT_PX,
  laneHeightPx,
  pctToPx,
  prChipMode,
  rowHeightPx,
  shouldShowBarLabel,
  trackWidthPx,
} from '@/lib/gantt/density';

describe('trackWidthPx', () => {
  it('scales the track by px-per-day for the window span', () => {
    expect(trackWidthPx('week', 7)).toBe(Math.round(7 * PX_PER_DAY.week));
    expect(trackWidthPx('month', 35)).toBe(Math.round(35 * PX_PER_DAY.month));
  });

  it('gives tighter zooms a smaller day width', () => {
    expect(PX_PER_DAY.week).toBeGreaterThan(PX_PER_DAY.fortnight);
    expect(PX_PER_DAY.fortnight).toBeGreaterThan(PX_PER_DAY.month);
    expect(PX_PER_DAY.month).toBeGreaterThan(PX_PER_DAY.quarter);
    expect(PX_PER_DAY.quarter).toBeGreaterThan(PX_PER_DAY.year);
  });
});

describe('shouldShowBarLabel', () => {
  it('always labels at week and month', () => {
    expect(shouldShowBarLabel('week', 0)).toBe(true);
    expect(shouldShowBarLabel('month', 4)).toBe(true);
  });

  it('labels a quarter bar only when it is wide enough', () => {
    const threshold = BAR_LABEL_MIN_PX.quarter;
    expect(shouldShowBarLabel('quarter', threshold - 1)).toBe(false);
    expect(shouldShowBarLabel('quarter', threshold)).toBe(true);
  });

  it('never labels inline at year zoom', () => {
    expect(shouldShowBarLabel('year', 1000)).toBe(false);
  });
});

describe('prChipMode', () => {
  it('shows full chips at week/fortnight/month, dots at quarter, nothing at year', () => {
    expect(prChipMode('week')).toBe('full');
    expect(prChipMode('fortnight')).toBe('full');
    expect(prChipMode('month')).toBe('full');
    expect(prChipMode('quarter')).toBe('dot');
    expect(prChipMode('year')).toBe('hidden');
  });
});

describe('pctToPx', () => {
  it('converts a within-window percentage to track pixels', () => {
    expect(pctToPx(50, 400)).toBe(200);
    expect(pctToPx(0, 400)).toBe(0);
  });
});

describe('rowHeightPx', () => {
  it('is just the bar height when no PRs are visible', () => {
    expect(rowHeightPx(0, 'full')).toBe(BAR_HEIGHT_PX);
    expect(rowHeightPx(3, 'hidden')).toBe(BAR_HEIGHT_PX);
  });

  it('grows by one PR line per chip', () => {
    expect(rowHeightPx(2, 'full')).toBe(BAR_HEIGHT_PX + 2 * PR_LINE_PX);
    expect(rowHeightPx(1, 'dot')).toBe(BAR_HEIGHT_PX + PR_LINE_PX);
  });
});

describe('laneHeightPx', () => {
  it('grows with row count and never collapses below one row', () => {
    expect(laneHeightPx(0)).toBe(laneHeightPx(1));
    expect(laneHeightPx(3)).toBe(laneHeightPx(1) + 2 * ROW_HEIGHT_PX);
  });
});
