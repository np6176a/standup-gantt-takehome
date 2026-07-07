import { ZOOM_OPTIONS, isZoom } from '@/components/molecules/TimeWindowControls/TimeWindowControlsUtil';

describe('ZOOM_OPTIONS', () => {
  it('lists the zooms in coarsening order', () => {
    expect(ZOOM_OPTIONS.map((option) => option.value)).toEqual([
      'week',
      'fortnight',
      'month',
      'quarter',
      'year',
    ]);
  });

  it('exposes the 2-week window as an option', () => {
    const fortnight = ZOOM_OPTIONS.find((option) => option.value === 'fortnight');
    expect(fortnight?.label).toBe('2 Weeks');
    expect(isZoom('fortnight')).toBe(true);
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
