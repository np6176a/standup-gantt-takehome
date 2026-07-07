import type { Issue, Person } from '@/lib/domain/types';
import {
  assigneeOptions,
  assigneeValue,
  statusOptions,
  UNASSIGNED_OPTION_VALUE,
} from '@/components/organisms/IssueDetailPopover/IssueDetailPopoverUtil';

const PEOPLE: Person[] = [
  { id: 'usr_a', name: 'Ada Lovelace', displayName: 'ada', email: 'ada@x.dev', githubLogin: 'ada' },
  { id: 'usr_b', name: 'Bev Cole', displayName: 'bev', email: 'bev@x.dev', githubLogin: 'bev' },
];

const baseIssue = (overrides: Partial<Issue>): Issue => ({
  id: 'iss_1',
  identifier: 'ORB-1',
  title: 'Do the thing',
  url: 'https://linear.app/ORB-1',
  stateName: 'Selected For Development',
  bucket: 'planned',
  automationOwned: false,
  startedAt: null,
  dueDate: null,
  assignee: null,
  project: null,
  projectMilestone: null,
  ...overrides,
});

describe('statusOptions', () => {
  const options = statusOptions();

  it('lists all 12 raw states', () => {
    expect(options).toHaveLength(12);
  });

  it('disables exactly the 5 automation-owned states', () => {
    expect(options.filter((option) => option.disabled)).toHaveLength(5);
    const inProgress = options.find((option) => option.value === 'In Progress');
    expect(inProgress?.disabled).toBe(true);
  });

  it('leaves writable states selectable', () => {
    expect(options.find((option) => option.value === 'Todo')?.disabled).toBeFalsy();
  });
});

describe('assigneeOptions', () => {
  it('is one option per teammate when the issue is already assigned', () => {
    const options = assigneeOptions(PEOPLE, baseIssue({ assignee: PEOPLE[0] }));
    expect(options.map((option) => option.value)).toEqual(['usr_a', 'usr_b']);
  });

  it('prepends a disabled Unassigned placeholder when unassigned', () => {
    const options = assigneeOptions(PEOPLE, baseIssue({ assignee: null }));
    expect(options[0]).toEqual({ value: UNASSIGNED_OPTION_VALUE, label: 'Unassigned', disabled: true });
    expect(options).toHaveLength(3);
  });
});

describe('assigneeValue', () => {
  it('is the assignee id when assigned', () => {
    expect(assigneeValue(baseIssue({ assignee: PEOPLE[1] }))).toBe('usr_b');
  });

  it('is the unassigned placeholder when unassigned', () => {
    expect(assigneeValue(baseIssue({ assignee: null }))).toBe(UNASSIGNED_OPTION_VALUE);
  });
});
