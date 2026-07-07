import {
  DATE_INPUT_BASE_CLASSES,
  getDateInputClasses,
  normalizeDateValue,
} from '@/components/atoms/DateInput/DateInputUtil';

describe('getDateInputClasses', () => {
  it('returns the base classes when no override is given', () => {
    expect(getDateInputClasses('')).toBe(DATE_INPUT_BASE_CLASSES);
  });

  it('appends caller overrides after the base classes', () => {
    expect(getDateInputClasses('w-40').endsWith('w-40')).toBe(true);
  });
});

describe('normalizeDateValue', () => {
  it('returns a non-empty date string unchanged', () => {
    expect(normalizeDateValue('2026-07-06')).toBe('2026-07-06');
  });

  it('maps an empty or whitespace value to null (a cleared field)', () => {
    expect(normalizeDateValue('')).toBeNull();
    expect(normalizeDateValue('   ')).toBeNull();
  });
});
