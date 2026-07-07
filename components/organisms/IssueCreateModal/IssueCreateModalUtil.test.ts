import type { Person } from '@/lib/domain/types';
import { DEFAULT_CREATE_STATE } from '@/lib/domain/states';
import {
  assigneeCreateOptions,
  buildCreateInput,
  createStateOptions,
  emptyCreateForm,
  isCreateSubmittable,
  UNASSIGNED_OPTION_VALUE,
} from '@/components/organisms/IssueCreateModal/IssueCreateModalUtil';

const PEOPLE: Person[] = [
  { id: 'usr_a', name: 'Ada Lovelace', displayName: 'ada', email: 'ada@x.dev', githubLogin: 'ada' },
];

describe('emptyCreateForm', () => {
  it('defaults to the create state and no assignee', () => {
    const form = emptyCreateForm(null);
    expect(form.stateId).toBe(DEFAULT_CREATE_STATE);
    expect(form.assigneeId).toBe(UNASSIGNED_OPTION_VALUE);
    expect(form.title).toBe('');
    expect(form.dueDate).toBeNull();
  });

  it('pre-fills the assignee when given', () => {
    expect(emptyCreateForm('usr_a').assigneeId).toBe('usr_a');
  });
});

describe('createStateOptions', () => {
  it('offers only writable states (never an automation-owned one)', () => {
    const values = createStateOptions().map((option) => option.value);
    expect(values).toContain(DEFAULT_CREATE_STATE);
    expect(values).not.toContain('In Progress');
  });
});

describe('assigneeCreateOptions', () => {
  it('leads with a selectable Unassigned option, then each teammate', () => {
    const options = assigneeCreateOptions(PEOPLE);
    expect(options[0]).toEqual({ value: UNASSIGNED_OPTION_VALUE, label: 'Unassigned' });
    expect(options[1]).toEqual({ value: 'usr_a', label: 'ada' });
  });
});

describe('isCreateSubmittable', () => {
  it('requires a non-blank title', () => {
    expect(isCreateSubmittable(emptyCreateForm(null))).toBe(false);
    expect(isCreateSubmittable({ ...emptyCreateForm(null), title: '  ' })).toBe(false);
    expect(isCreateSubmittable({ ...emptyCreateForm(null), title: 'Ship it' })).toBe(true);
  });
});

describe('buildCreateInput', () => {
  it('trims the title and includes the state', () => {
    const input = buildCreateInput({ ...emptyCreateForm(null), title: '  Ship it  ' });
    expect(input).toEqual({ title: 'Ship it', stateId: DEFAULT_CREATE_STATE });
  });

  it('omits an unset assignee and a null due date', () => {
    const input = buildCreateInput({ ...emptyCreateForm(null), title: 'x' });
    expect(input).not.toHaveProperty('assigneeId');
    expect(input).not.toHaveProperty('dueDate');
  });

  it('includes a chosen assignee and due date', () => {
    const input = buildCreateInput({
      ...emptyCreateForm('usr_a'),
      title: 'x',
      dueDate: '2026-07-10',
    });
    expect(input.assigneeId).toBe('usr_a');
    expect(input.dueDate).toBe('2026-07-10');
  });
});
