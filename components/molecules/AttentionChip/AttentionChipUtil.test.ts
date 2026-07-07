import { attentionChipModel } from '@/components/molecules/AttentionChip/AttentionChipUtil';

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
