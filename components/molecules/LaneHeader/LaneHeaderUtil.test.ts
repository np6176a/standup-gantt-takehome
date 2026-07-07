import {
  attentionDots,
  laneBadges,
  laneCountLabel,
  laneGlyph,
} from '@/components/molecules/LaneHeader/LaneHeaderUtil';
import type { LaneSummary } from '@/lib/gantt/rows';

const EMPTY: LaneSummary = { blocked: 0, overdue: 0, active: 0, inReview: 0, reviewsWaiting: 0 };

describe('laneCountLabel', () => {
  it('pluralizes and handles the empty case', () => {
    expect(laneCountLabel(0)).toBe('No issues');
    expect(laneCountLabel(1)).toBe('1 issue');
    expect(laneCountLabel(4)).toBe('4 issues');
  });
});

describe('laneGlyph', () => {
  it('abbreviates a lane title to distinguishable initials', () => {
    expect(laneGlyph('Atlas Export')).toBe('AE');
    expect(laneGlyph('No project')).toBe('NP');
    expect(laneGlyph('Unassigned')).toBe('U');
  });
});

describe('laneBadges', () => {
  it('omits zero-count badges and returns nothing for a quiet lane', () => {
    expect(laneBadges(EMPTY)).toEqual([]);
    const badges = laneBadges({ ...EMPTY, active: 2 });
    expect(badges.map((badge) => badge.key)).toEqual(['active']);
  });

  it('orders badges blocked → overdue → active → in review → reviews waiting', () => {
    const badges = laneBadges({ blocked: 1, overdue: 2, active: 3, inReview: 4, reviewsWaiting: 5 });
    expect(badges.map((badge) => badge.key)).toEqual([
      'blocked',
      'overdue',
      'active',
      'review',
      'reviews',
    ]);
  });

  it('marks only the reviews badge interactive and pluralizes its label', () => {
    expect(laneBadges({ ...EMPTY, reviewsWaiting: 1 })[0].label).toBe('1 review waiting');
    const badge = laneBadges({ ...EMPTY, reviewsWaiting: 3 })[0];
    expect(badge.label).toBe('3 reviews waiting');
    expect(badge.interactive).toBe(true);
    expect(laneBadges({ ...EMPTY, blocked: 1 })[0].interactive).toBe(false);
  });
});

describe('attentionDots', () => {
  it('keeps only the loud signals (blocked/overdue/reviews) in priority order', () => {
    const dots = attentionDots({ blocked: 1, overdue: 2, active: 3, inReview: 4, reviewsWaiting: 5 });
    expect(dots.map((dot) => dot.key)).toEqual(['blocked', 'overdue', 'reviews']);
  });

  it('drops the activity-only signals and stays empty for a quiet lane', () => {
    expect(attentionDots(EMPTY)).toEqual([]);
    expect(attentionDots({ ...EMPTY, active: 2, inReview: 1 })).toEqual([]);
  });
});
