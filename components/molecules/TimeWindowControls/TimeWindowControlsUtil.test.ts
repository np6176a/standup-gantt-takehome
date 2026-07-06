import { ZOOM_OPTIONS, isZoom } from '@/components/molecules/TimeWindowControls/TimeWindowControlsUtil';

describe('ZOOM_OPTIONS', () => {
  it('lists the four zooms in coarsening order', () => {
    expect(ZOOM_OPTIONS.map((option) => option.value)).toEqual([
      'week',
      'month',
      'quarter',
      'year',
    ]);
  });
});

describe('isZoom', () => {
  it('accepts valid zoom strings and rejects others', () => {
    expect(isZoom('week')).toBe(true);
    expect(isZoom('year')).toBe(true);
    expect(isZoom('decade')).toBe(false);
    expect(isZoom('')).toBe(false);
  });
});
