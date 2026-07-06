import {
  BUCKET_TREATMENT,
  attentionAriaSuffix,
  attentionRingClass,
  barAriaLabel,
  barLabelText,
  daysOverdue,
  hasAttention,
  labelVisible,
  markerAttentionFill,
  overdueBadgeText,
} from '@/components/molecules/IssueBar/IssueBarUtil';
import type { Bucket } from '@/lib/domain/states';
import type { Issue } from '@/lib/domain/types';
import type { DerivedAttention } from '@/lib/normalize/attention';
import { dayIndex } from '@/lib/gantt/scale';

const NONE: DerivedAttention = { overdue: false, blockedDerived: false, blockedReason: null };
const OVERDUE: DerivedAttention = { overdue: true, blockedDerived: false, blockedReason: null };
const BLOCKED: DerivedAttention = {
  overdue: false,
  blockedDerived: true,
  blockedReason: 'changes requested on #503',
};
const BOTH: DerivedAttention = { overdue: true, blockedDerived: true, blockedReason: 'stuck' };

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

describe('attention overlays', () => {
  it('rings blocked red (outranking overdue), overdue thinner red, nothing otherwise', () => {
    expect(attentionRingClass(BLOCKED)).toContain('ring-attention-blocked');
    expect(attentionRingClass(BOTH)).toContain('ring-attention-blocked');
    expect(attentionRingClass(OVERDUE)).toContain('ring-attention-overdue');
    expect(attentionRingClass(NONE)).toBe('');
  });

  it('hasAttention is true for either signal', () => {
    expect(hasAttention(NONE)).toBe(false);
    expect(hasAttention(OVERDUE)).toBe(true);
    expect(hasAttention(BLOCKED)).toBe(true);
  });

  it('recolors the marker red under attention, else keeps the bucket fill', () => {
    expect(markerAttentionFill(BLOCKED, 'bg-status-active')).toBe('bg-attention-blocked');
    expect(markerAttentionFill(OVERDUE, 'bg-status-active')).toBe('bg-attention-overdue');
    expect(markerAttentionFill(NONE, 'bg-status-active')).toBe('bg-status-active');
  });

  it('counts whole UTC days overdue, clamped at zero', () => {
    const today = dayIndex(new Date('2026-07-06T00:00:00.000Z'));
    expect(daysOverdue('2026-07-01', today)).toBe(5);
    expect(daysOverdue('2026-07-10', today)).toBe(0);
    expect(daysOverdue(null, today)).toBe(0);
    expect(overdueBadgeText(5)).toBe('5d');
  });

  it('describes attention in the accessible suffix (both signals, correct pluralization)', () => {
    expect(attentionAriaSuffix(NONE, 0)).toBe('');
    expect(attentionAriaSuffix(OVERDUE, 1)).toBe(' (overdue by 1 day)');
    expect(attentionAriaSuffix(BLOCKED, 0)).toBe(' (blocked — changes requested on #503)');
    expect(attentionAriaSuffix(BOTH, 3)).toBe(' (blocked — stuck; overdue by 3 days)');
  });
});
