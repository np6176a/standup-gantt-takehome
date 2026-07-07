import { SELECT_BASE_CLASSES, getSelectClasses } from '@/components/atoms/Select/SelectUtil';

describe('getSelectClasses', () => {
  it('includes the base classes', () => {
    expect(getSelectClasses('')).toBe(SELECT_BASE_CLASSES);
  });

  it('appends caller overrides after the base classes so they win', () => {
    const result = getSelectClasses('pr-8 w-40');
    expect(result.startsWith(SELECT_BASE_CLASSES)).toBe(true);
    expect(result.endsWith('pr-8 w-40')).toBe(true);
  });

  it('does not leave a trailing space when no override is given', () => {
    expect(getSelectClasses('')).not.toMatch(/\s$/);
  });
});
