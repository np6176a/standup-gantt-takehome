'use client';

import React, { useContext, useState } from 'react';
import { observer } from 'mobx-react-lite';

import type { Issue } from '@/lib/domain/types';
import type { PullRequest } from '@/lib/normalize/pullRequests';
import type { ReviewDotState } from '@/components/molecules/PrChip/PrChipUtil';
import { StoreContext } from '@/stores/StoreProvider';
import { BUCKET_LABELS } from '@/lib/domain/states';
import { dateFromDayIndex } from '@/lib/gantt/scale';
import { deriveAttention } from '@/lib/normalize/attention';
import {
  REVIEW_DOT,
  prChipLabel,
  reviewDotState,
} from '@/components/molecules/PrChip/PrChipUtil';
import { BlockedIcon, XmarkIcon, ClockIcon, CheckIcon, MinusIcon } from '@/components/icons';
import { Select } from '@/components/atoms/Select/Select';
import { DateInput } from '@/components/atoms/DateInput/DateInput';
import { ModalSheet } from '@/components/molecules/ModalSheet/ModalSheet';
import {
  AUTOMATION_STATUS_HINT,
  assigneeOptions,
  assigneeValue,
  statusOptions,
} from '@/components/organisms/IssueDetailPopover/IssueDetailPopoverUtil';

const REVIEW_ICON: Record<ReviewDotState, React.ReactNode> = {
  changes: <XmarkIcon size={12} />,
  pending: <ClockIcon size={12} />,
  approved: <CheckIcon size={12} />,
  none: <MinusIcon size={12} />,
};

/** A labelled field row: a caption above its control. */
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[0.6875rem] font-[var(--font-weight-semibold)] uppercase tracking-[0.03em] text-content-muted">
      {label}
    </span>
    {children}
  </label>
);

export interface IssueDetailPopoverProps {
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * The issue detail popover: edit an issue without leaving the board. Status (writable
 * states only; automation-owned ones locked with a hint), due date, assignee, and title
 * write through to fake-Linear via the data store (apply-the-response — the returned node
 * re-derives the board). Planned start and the manual "mark blocked" flag are app-owned
 * and write to the planning store. Linked PRs deep-link out to GitHub. Reads the selected
 * issue straight off the store; render it keyed by issue id so its drafts reset per issue.
 */
export const IssueDetailPopover = observer(function IssueDetailPopover({
  className = '',
}: IssueDetailPopoverProps) {
  const store = useContext(StoreContext);
  const [titleDraft, setTitleDraft] = useState(store?.selectedIssue?.title ?? '');
  const [blockedReasonDraft, setBlockedReasonDraft] = useState(
    store?.selectedIssue ? (store.planning.blockedReason(store.selectedIssue.id) ?? '') : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!store || !store.selectedIssue) return null;

  const { data, planning, ui } = store;
  const issue: Issue = store.selectedIssue;
  const prs = data.prsByIssueId.get(issue.id) ?? [];
  const now = dateFromDayIndex(ui.todayIdx);
  const derived = deriveAttention(issue, prs, now);
  const manuallyBlocked = planning.isBlocked(issue.id);

  /** Run a write, surfacing a saving indicator and any rejection inline. */
  const save = async (input: Parameters<typeof data.saveIssue>[1]) => {
    setSaving(true);
    setError(null);
    try {
      await data.saveIssue(issue.id, input);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== issue.title) save({ title: trimmed });
    else setTitleDraft(issue.title);
  };

  const toggleBlocked = (next: boolean) => {
    if (next) planning.setBlocked(issue.id, blockedReasonDraft);
    else planning.clearBlocked(issue.id);
  };

  const changeBlockedReason = (value: string) => {
    setBlockedReasonDraft(value);
    if (manuallyBlocked) planning.setBlocked(issue.id, value);
  };

  return (
    <ModalSheet
      title={issue.identifier}
      onClose={() => ui.clearSelectedIssue()}
      width="md"
      className={className}
    >
      <div className="flex flex-col gap-3">
        <Field label="Title">
          <input
            type="text"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitTitle}
            className="w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-[0.8125rem] text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </Field>

        <Field label="Status">
          {issue.automationOwned ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5">
              <span className="text-[0.8125rem] text-content">{issue.stateName}</span>
              <span className="ml-auto text-[0.6875rem] text-content-muted">
                {AUTOMATION_STATUS_HINT}
              </span>
            </div>
          ) : (
            <Select
              value={issue.stateName}
              onChange={(stateId) => save({ stateId })}
              options={statusOptions()}
              disabled={saving}
              aria-label="Status"
            />
          )}
          <span className="text-[0.6875rem] text-content-muted">
            {BUCKET_LABELS[issue.bucket]}
          </span>
        </Field>

        <Field label="Assignee">
          <Select
            value={assigneeValue(issue)}
            onChange={(assigneeId) => save({ assigneeId })}
            options={assigneeOptions(data.people, issue)}
            disabled={saving}
            aria-label="Assignee"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date">
            <DateInput
              value={issue.dueDate}
              onChange={(dueDate) => save({ dueDate })}
              disabled={saving}
              aria-label="Due date"
            />
          </Field>

          <Field label="Planned start (local only)">
            <DateInput
              value={planning.plannedStart(issue.id)}
              onChange={(date) => planning.setPlannedStart(issue.id, date)}
              aria-label="Planned start"
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2 rounded-md border border-border p-2.5">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={manuallyBlocked}
              onChange={(event) => toggleBlocked(event.target.checked)}
              className="h-4 w-4 accent-attention-blocked"
            />
            <span className="flex items-center gap-1 text-[0.8125rem] font-[var(--font-weight-semibold)] text-content">
              <span aria-hidden className="text-attention-blocked">
                <BlockedIcon size={14} />
              </span>
              Mark blocked
            </span>
          </label>

          {manuallyBlocked && (
            <input
              type="text"
              value={blockedReasonDraft}
              onChange={(event) => changeBlockedReason(event.target.value)}
              placeholder="Reason (optional)"
              className="w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-[0.8125rem] text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          )}

          {derived.blockedDerived && (
            <p className="text-[0.6875rem] text-attention-blocked">
              Auto-flagged: {derived.blockedReason}
            </p>
          )}
        </div>

        {prs.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-[var(--font-weight-semibold)] uppercase tracking-[0.03em] text-content-muted">
              Linked PRs
            </span>
            <ul className="flex flex-col gap-1">
              {prs.map((pr: PullRequest) => {
                const state = reviewDotState(pr);
                const dot = REVIEW_DOT[state];
                return (
                  <li key={`${pr.repo.owner}/${pr.repo.name}#${pr.number}`}>
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 transition-colors hover:bg-neutral-light"
                    >
                      <span aria-hidden className={`flex shrink-0 items-center ${dot.className}`}>
                        {REVIEW_ICON[state]}
                      </span>
                      <span className="shrink-0 text-[0.75rem] font-[var(--font-weight-semibold)] text-content-secondary">
                        {prChipLabel(pr)}
                      </span>
                      <span className="min-w-0 grow truncate text-[0.75rem] text-content-secondary">
                        {pr.title}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="min-h-[1rem] text-[0.6875rem]">
          {saving && <span className="text-content-muted">Saving…</span>}
          {error && <span className="text-attention-overdue">{error}</span>}
        </div>
      </div>
    </ModalSheet>
  );
});
