import { buildStateFilterGroups } from '@/components/molecules/StateFilterPopover/StateFilterPopoverUtil';
import { ALL_STATES, STATES_BY_BUCKET } from '@/lib/domain/states';

describe('buildStateFilterGroups', () => {
  it('emits one group per bucket, covering all 12 raw states', () => {
    const groups = buildStateFilterGroups({}, {});
    expect(groups).toHaveLength(Object.keys(STATES_BY_BUCKET).length);
    const emitted = groups.flatMap((group) => group.rows.map((row) => row.name));
    expect(emitted.sort()).toEqual([...ALL_STATES].sort());
  });

  it('joins each state with its live count, defaulting missing states to 0', () => {
    const groups = buildStateFilterGroups({ 'In Progress': 5 }, {});
    const active = groups.find((group) => group.bucket === 'active')!;
    const inProgress = active.rows.find((row) => row.name === 'In Progress')!;
    const designExploration = active.rows.find((row) => row.name === 'Design Exploration')!;
    expect(inProgress.count).toBe(5);
    expect(designExploration.count).toBe(0);
  });

  it('rolls up the per-bucket total across its states', () => {
    const groups = buildStateFilterGroups({ 'In Progress': 5, 'On Develop': 2 }, {});
    const active = groups.find((group) => group.bucket === 'active')!;
    expect(active.count).toBe(7);
  });

  it('treats a missing or true visibility entry as visible, only false hides', () => {
    const groups = buildStateFilterGroups({}, { 'In Progress': false, 'On Develop': true });
    const active = groups.find((group) => group.bucket === 'active')!;
    expect(active.rows.find((row) => row.name === 'In Progress')!.visible).toBe(false);
    expect(active.rows.find((row) => row.name === 'On Develop')!.visible).toBe(true);
    // Design Exploration has no entry — visible by default.
    expect(active.rows.find((row) => row.name === 'Design Exploration')!.visible).toBe(true);
  });

  it('marks a group allVisible only when every one of its states is shown', () => {
    const allOn = buildStateFilterGroups({}, {});
    expect(allOn.find((group) => group.bucket === 'active')!.allVisible).toBe(true);

    const oneOff = buildStateFilterGroups({}, { 'In Progress': false });
    expect(oneOff.find((group) => group.bucket === 'active')!.allVisible).toBe(false);
  });
});
