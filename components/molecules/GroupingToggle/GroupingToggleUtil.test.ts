import { GROUPING_OPTIONS } from '@/components/molecules/GroupingToggle/GroupingToggleUtil';

describe('GROUPING_OPTIONS', () => {
  it('offers person and project, with person first (the standup default)', () => {
    expect(GROUPING_OPTIONS.map((option) => option.value)).toEqual(['person', 'project']);
  });

  it('gives every option a non-empty label', () => {
    expect(GROUPING_OPTIONS.every((option) => option.label.length > 0)).toBe(true);
  });
});
