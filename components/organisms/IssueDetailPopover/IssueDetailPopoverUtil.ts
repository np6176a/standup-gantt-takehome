// Pure helpers for the issue detail popover: the option lists its selects render and the
// hint text for automation-locked status. All framework-free and unit-tested.

import type { Issue, Person } from '@/lib/domain/types';
import { ALL_STATES, CANCELED_STATE, isAutomationOwned } from '@/lib/domain/states';
import type { SelectOption } from '@/components/atoms/Select/SelectUtil';

/** The hint shown beside a status that GitHub automation owns (and the app can't write). */
export const AUTOMATION_STATUS_HINT = 'Set by GitHub automation';

/** Placeholder value for the "Unassigned" option (fake-Linear can't clear an assignee). */
export const UNASSIGNED_OPTION_VALUE = '';

/**
 * The status dropdown's options for a given issue: all 12 raw states in ladder order,
 * with each automation-owned state labelled "(Set by GitHub automation)". Selectability:
 * - Automation states are never a writable *target* — always disabled.
 * - Cancel is always allowed (a human decision), even out of an automation-owned state.
 * - Every other writable state is enabled only while the issue is NOT in an automation
 *   state; once automation owns it, Cancel is the sole reachable target.
 */
export function statusOptions(issue: Issue): SelectOption[] {
  return ALL_STATES.map((state) => {
    const automation = isAutomationOwned(state);
    const disabled = state === CANCELED_STATE ? false : automation || issue.automationOwned;
    return {
      value: state,
      label: automation ? `${state} (${AUTOMATION_STATUS_HINT})` : state,
      disabled,
    };
  });
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
