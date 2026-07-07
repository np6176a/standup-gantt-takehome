import {
  SPINNER_BORDER_PX,
  SPINNER_SIZE_PX,
  spinnerDimensions,
} from '@/components/atoms/Spinner/SpinnerUtil';

describe('spinnerDimensions', () => {
  it('returns the diameter and ring thickness for each size', () => {
    expect(spinnerDimensions('sm')).toEqual({ diameter: 16, borderWidth: 2 });
    expect(spinnerDimensions('md')).toEqual({ diameter: 24, borderWidth: 3 });
    expect(spinnerDimensions('lg')).toEqual({ diameter: 36, borderWidth: 4 });
  });

  it('grows the ring thickness as the diameter grows', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    const diameters = sizes.map((size) => SPINNER_SIZE_PX[size]);
    const borders = sizes.map((size) => SPINNER_BORDER_PX[size]);
    expect(diameters).toEqual([...diameters].sort((a, b) => a - b));
    expect(borders).toEqual([...borders].sort((a, b) => a - b));
  });
});
