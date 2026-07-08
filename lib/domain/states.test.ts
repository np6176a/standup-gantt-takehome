import {
  ALL_STATES,
  AUTOMATION_OWNED_STATES,
  BUCKET_ORDER,
  WRITABLE_STATES,
  bucketForState,
  bucketRank,
  isAutomationOwned,
} from '@/lib/domain/states';

describe('bucketForState', () => {
  const cases: Array<[string, ReturnType<typeof bucketForState>]> = [
    ['In Progress', 'active'],
    ['Design Exploration', 'active'],
    ['In Review', 'review'],
    ['On Develop', 'active'],
    ['On Staging', 'shipping'],
    ['On Prod', 'done'],
    ['Todo', 'planned'],
    ['Selected For Development', 'planned'],
    ['Backlog', 'planned'],
    ['Triage', 'triage'],
    ['Done', 'done'],
    ['Canceled', 'dropped'],
  ];

  it.each(cases)('maps %s → %s', (state, bucket) => {
    expect(bucketForState(state)).toBe(bucket);
  });

  it('covers all 12 raw states', () => {
    expect(ALL_STATES).toHaveLength(12);
    expect(new Set(ALL_STATES).size).toBe(12);
  });

  it('falls back to planned for an unknown/custom state name', () => {
    expect(bucketForState('Some Custom Workspace State')).toBe('planned');
  });
});

describe('automation-owned vs writable states', () => {
  it('has the five automation-owned states', () => {
    expect([...AUTOMATION_OWNED_STATES].sort()).toEqual(
      ['In Progress', 'In Review', 'On Develop', 'On Prod', 'On Staging'].sort(),
    );
  });

  it('isAutomationOwned reflects the set', () => {
    expect(isAutomationOwned('On Prod')).toBe(true);
    expect(isAutomationOwned('Design Exploration')).toBe(false);
  });

  it('writable states are exactly the non-automation states (7)', () => {
    expect(WRITABLE_STATES).toHaveLength(7);
    expect(WRITABLE_STATES.some((state) => AUTOMATION_OWNED_STATES.has(state))).toBe(false);
    expect(WRITABLE_STATES).toContain('Selected For Development');
    expect(WRITABLE_STATES).toContain('Design Exploration');
  });
});

describe('bucketRank', () => {
  it('orders active → review → shipping → planned → triage → done → dropped', () => {
    expect(bucketRank('active')).toBeLessThan(bucketRank('review'));
    expect(bucketRank('review')).toBeLessThan(bucketRank('shipping'));
    expect(bucketRank('shipping')).toBeLessThan(bucketRank('planned'));
    expect(bucketRank('planned')).toBeLessThan(bucketRank('triage'));
    expect(bucketRank('triage')).toBeLessThan(bucketRank('done'));
    expect(bucketRank('done')).toBeLessThan(bucketRank('dropped'));
    expect(BUCKET_ORDER.active).toBe(0);
  });
});
