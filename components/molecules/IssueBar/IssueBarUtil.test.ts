import {
  BUCKET_TREATMENT,
  barAriaLabel,
  barLabelText,
  labelVisible,
} from '@/components/molecules/IssueBar/IssueBarUtil';
import type { Bucket } from '@/lib/domain/states';
import type { Issue } from '@/lib/domain/types';

const issue: Issue = {
  id: 'i1',
  identifier: 'ORB-104',
  title: 'Wire telemetry',
  url: 'https://linear.app/i1',
  stateName: 'On Staging',
  bucket: 'shipping',
  automationOwned: true,
  startedAt: null,
  dueDate: null,
  assignee: null,
  project: null,
  projectMilestone: null,
};

describe('BUCKET_TREATMENT', () => {
  it('covers every bucket', () => {
    const buckets: Bucket[] = ['active', 'review', 'shipping', 'planned', 'done', 'dropped'];
    for (const bucket of buckets) expect(BUCKET_TREATMENT[bucket]).toBeDefined();
  });

  it('marks planned and dropped as ghost outlines, the rest as solid fills', () => {
    expect(BUCKET_TREATMENT.planned.ghost).toBe(true);
    expect(BUCKET_TREATMENT.dropped.ghost).toBe(true);
    expect(BUCKET_TREATMENT.active.ghost).toBe(false);
  });
});

describe('barLabelText / barAriaLabel', () => {
  it('leads with the identifier and keeps the raw state legible', () => {
    expect(barLabelText(issue)).toBe('ORB-104 Wire telemetry');
    expect(barAriaLabel(issue)).toContain('On Staging');
  });
});

describe('labelVisible', () => {
  it('follows the zoom density thresholds', () => {
    expect(labelVisible('week', 0)).toBe(true);
    expect(labelVisible('year', 500)).toBe(false);
  });
});
