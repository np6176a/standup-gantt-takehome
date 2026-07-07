import { ATTENTION_KEY, bucketLegend } from '@/components/molecules/Legend/LegendUtil';
import { BUCKET_LABELS, STATES_BY_BUCKET } from '@/lib/domain/states';

describe('bucketLegend', () => {
  it('emits one entry per bucket, in declaration order, with a swatch', () => {
    const entries = bucketLegend();
    expect(entries.map((entry) => entry.bucket)).toEqual(Object.keys(BUCKET_LABELS));
    expect(entries.every((entry) => entry.swatchClass.length > 0)).toBe(true);
  });

  it('joins each bucket’s raw states so the granular states stay discoverable', () => {
    const active = bucketLegend().find((entry) => entry.bucket === 'active')!;
    expect(active.label).toBe('Active');
    expect(active.states).toBe(STATES_BY_BUCKET.active.join(', '));
  });

  it('omits the states string when the sole state matches the bucket label', () => {
    const triage = bucketLegend().find((entry) => entry.bucket === 'triage')!;
    expect(triage.states).toBe('');
    const done = bucketLegend().find((entry) => entry.bucket === 'done')!;
    expect(done.states).toBe('');
  });
});

describe('ATTENTION_KEY', () => {
  it('documents the overdue and blocked overlays with name + detail', () => {
    expect(ATTENTION_KEY.map((entry) => entry.key)).toEqual(['overdue', 'blocked']);
    expect(ATTENTION_KEY.every((entry) => entry.name.length > 0 && entry.detail.length > 0)).toBe(true);
  });
});
