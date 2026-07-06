import type { Grouping } from '@/stores/uiStore';

/** A selectable grouping mode with its button label. */
export interface GroupingOption {
  value: Grouping;
  label: string;
}

/** The two swimlane groupings, in display order (Person is the standup default). */
export const GROUPING_OPTIONS: readonly GroupingOption[] = [
  { value: 'person', label: 'People' },
  { value: 'project', label: 'Projects' },
] as const;
