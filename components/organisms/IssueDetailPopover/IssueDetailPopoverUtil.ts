// Pure helpers for the issue detail popover: the option lists its selects render and the
// hint text for automation-locked status. All framework-free and unit-tested.

import type { Issue, Person } from '@/lib/domain/types';
import { ALL_STATES, isAutomationOwned } from '@/lib/domain/states';
import type { SelectOption } from '@/components/atoms/Select/SelectUtil';

/** The hint shown beside a status that GitHub automation owns (and the app can't write). */
export const AUTOMATION_STATUS_HINT = 'Set by GitHub automation';

/** Placeholder value for the "Unassigned" option (fake-Linear can't clear an assignee). */
export const UNASSIGNED_OPTION_VALUE = '';

/**
 * The status dropdown's options: all 12 raw states in ladder order, with the 5
 * automation-owned ones disabled ("locked"). So the full ladder stays legible while only
 * the 7 writable states can be picked.
 */
export function statusOptions(): SelectOption[] {
  return ALL_STATES.map((state) => ({
    value: state,
    label: isAutomationOwned(state) ? `${state} (automation)` : state,
    disabled: isAutomationOwned(state),
  }));
}

/**
 * The assignee dropdown's options: one per roster teammate (value = Linear user id). When
 * the issue is currently unassigned, a disabled "Unassigned" placeholder leads so the
 * select can show that state — fake-Linear has no way to clear an assignee back to null.
 */
export function assigneeOptions(people: readonly Person[], issue: Issue): SelectOption[] {
  const options = people.map((person) => ({ value: person.id, label: person.displayName }));
  if (!issue.assignee) {
    return [{ value: UNASSIGNED_OPTION_VALUE, label: 'Unassigned', disabled: true }, ...options];
  }
  return options;
}

/** The assignee select's current value: the issue's assignee id, or the unassigned placeholder. */
export function assigneeValue(issue: Issue): string {
  return issue.assignee?.id ?? UNASSIGNED_OPTION_VALUE;
}
