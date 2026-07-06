import { type Interval, packLanes } from '@/lib/gantt/layout';

const interval = (item: Interval): Interval => item;

describe('packLanes', () => {
  it('keeps non-overlapping spans on one row', () => {
    const rows = packLanes<Interval>(
      [{ start: 0, end: 5 }, { start: 6, end: 10 }],
      interval,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(2);
  });

  it('treats touching spans (a.end === b.start) as non-overlapping', () => {
    const rows = packLanes<Interval>(
      [{ start: 0, end: 5 }, { start: 5, end: 9 }],
      interval,
    );
    expect(rows).toHaveLength(1);
  });

  it('splits overlapping spans onto separate rows', () => {
    const rows = packLanes<Interval>(
      [{ start: 0, end: 5 }, { start: 3, end: 8 }],
      interval,
    );
    expect(rows).toHaveLength(2);
  });

  it('preserves caller order — the first (highest-priority) item lands in row 0', () => {
    const wide = { start: 0, end: 10 };
    const early = { start: 2, end: 4 };
    const late = { start: 6, end: 8 };
    const rows = packLanes<Interval>([wide, early, late], interval);
    expect(rows[0][0]).toBe(wide);
    // `early` can't share row 0 (overlaps `wide`) → row 1; `late` fits row 1 after `early`.
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual([early, late]);
  });

  it('returns no rows for no items', () => {
    expect(packLanes<Interval>([], interval)).toEqual([]);
  });
});
