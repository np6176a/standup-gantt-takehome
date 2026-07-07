import {
  attentionChipModel,
  attentionChipTitle,
  canToggleAttention,
} from '@/components/molecules/AttentionChip/AttentionChipUtil';

describe('attentionChipModel', () => {
  it('sums blocked + overdue into the total and flags attention', () => {
    const model = attentionChipModel(2, 1);
    expect(model.total).toBe(3);
    expect(model.hasAttention).toBe(true);
  });

  it('reads as clear when there is nothing blocked or overdue', () => {
    const model = attentionChipModel(0, 0);
    expect(model.hasAttention).toBe(false);
    expect(model.label).toBe('No blocked or overdue issues');
  });

  it('spells out both counts in the accessible label', () => {
    expect(attentionChipModel(2, 1).label).toBe('2 blocked, 1 overdue');
  });
});

describe('attentionChipTitle', () => {
  it('offers to focus when there is attention and the filter is off', () => {
    expect(attentionChipTitle(true, false)).toBe('Focus on blocked and overdue issues');
  });

  it('offers to clear the filter when it is on', () => {
    expect(attentionChipTitle(true, true)).toBe('Show all issues');
  });

  it('says there is nothing to focus when the board is clear', () => {
    expect(attentionChipTitle(false, false)).toBe('No blocked or overdue issues to focus');
  });
});

describe('canToggleAttention', () => {
  it('is actionable when there is something to focus', () => {
    expect(canToggleAttention(true, false)).toBe(true);
    expect(canToggleAttention(true, true)).toBe(true);
  });

  it('blocks turning the filter on when the board is clear (no empty focus)', () => {
    expect(canToggleAttention(false, false)).toBe(false);
  });

  it('stays actionable while active so an already-on filter can always be cleared', () => {
    expect(canToggleAttention(false, true)).toBe(true);
  });
});
