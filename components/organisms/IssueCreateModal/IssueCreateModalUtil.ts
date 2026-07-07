// Pure helpers for the create-issue modal: the form shape, its option lists, and the
// mapping from form to a fake-Linear IssueCreateInput. Framework-free and unit-tested.

import type { Person } from '@/lib/domain/types';
import { DEFAULT_CREATE_STATE, WRITABLE_STATES } from '@/lib/domain/states';
import type { IssueCreateInput } from '@/lib/api/linear';
import type { SelectOption } from '@/components/atoms/Select/SelectUtil';

/** Value of the "Unassigned" option (create simply omits assigneeId when chosen). */
export const UNASSIGNED_OPTION_VALUE = '';

/** The create modal's local form state. Dates are "YYYY-MM-DD" or null; ids are strings. */
export interface CreateForm {
  title: string;
  assigneeId: string;
  stateId: string;
  dueDate: string | null;
  /** App-owned planned start (localStorage), applied after the issue is created. */
  plannedStart: string | null;
}

/** A blank form, optionally pre-filled with an assignee (a lane's "+" prefill). */
export function emptyCreateForm(assigneeId: string | null): CreateForm {
  return {
    title: '',
    assigneeId: assigneeId ?? UNASSIGNED_OPTION_VALUE,
    stateId: DEFAULT_CREATE_STATE,
    dueDate: null,
    plannedStart: null,
  };
}

/** State options for the create form: only the 7 writable states (create can't set locked ones). */
export function createStateOptions(): SelectOption[] {
  return WRITABLE_STATES.map((state) => ({ value: state, label: state }));
}

/** Assignee options for the create form: a real "Unassigned" choice, then each teammate. */
export function assigneeCreateOptions(people: readonly Person[]): SelectOption[] {
  return [
    { value: UNASSIGNED_OPTION_VALUE, label: 'Unassigned' },
    ...people.map((person) => ({ value: person.id, label: person.displayName })),
  ];
}

/** Whether the form can be submitted — a non-empty title is the only requirement. */
export function isCreateSubmittable(form: CreateForm): boolean {
  return form.title.trim() !== '';
}

/**
 * Map the form to a fake-Linear `IssueCreateInput`: trim the title, omit an unset
 * assignee (so `assigneeId` is absent rather than an empty string), and drop a null due
 * date. The planned start is NOT part of this input — it's app-owned and applied to the
 * planning store after the issue exists.
 */
export function buildCreateInput(form: CreateForm): IssueCreateInput {
  const input: IssueCreateInput = { title: form.title.trim(), stateId: form.stateId };
  if (form.assigneeId !== UNASSIGNED_OPTION_VALUE) input.assigneeId = form.assigneeId;
  if (form.dueDate) input.dueDate = form.dueDate;
  return input;
}
