'use client';

import React, { useContext, useId, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { StoreContext } from '@/stores/StoreProvider';
import { Button } from '@/components/atoms/Button/Button';
import { Select } from '@/components/atoms/Select/Select';
import { DateInput } from '@/components/atoms/DateInput/DateInput';
import { ModalSheet } from '@/components/molecules/ModalSheet/ModalSheet';
import {
  assigneeCreateOptions,
  buildCreateInput,
  createStateOptions,
  emptyCreateForm,
  isCreateSubmittable,
} from '@/components/organisms/IssueCreateModal/IssueCreateModalUtil';

/** A labelled field row: a caption above its control. */
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[0.6875rem] font-[var(--font-weight-semibold)] uppercase tracking-[0.03em] text-content-muted">
      {label}
    </span>
    {children}
  </label>
);

export interface IssueCreateModalProps {
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * The "New issue" modal: title (required), assignee, writable state (default "Selected For
 * Development"), due date, and an optional local planned start. On submit it creates the
 * issue through fake-Linear (apply-the-response — the returned node joins the board),
 * records it as app-created in the planning store (so its detail panel can later offer to
 * delete it), and, when a planned start was given, records that too keyed by the new issue
 * id. On success it selects the new issue (opening its detail panel) so the user
 * gets immediate confirmation even when the issue packs somewhere easy to miss — a due-only
 * marker, the unscheduled shelf, or the Unassigned lane. Rendered only while open, so its
 * form state is fresh on each open.
 */
export const IssueCreateModal = observer(function IssueCreateModal({
  className = '',
}: IssueCreateModalProps) {
  const store = useContext(StoreContext);
  const formId = useId();
  const [form, setForm] = useState(() => emptyCreateForm(store?.ui.createAssigneeId ?? null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!store) return null;

  const { data, planning, ui } = store;
  const submittable = isCreateSubmittable(form);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!submittable || saving) return;
    setSaving(true);
    setError(null);
    try {
      const node = await data.createNewIssue(buildCreateInput(form));
      planning.markCreated(node.id);
      if (form.plannedStart) planning.setPlannedStart(node.id, form.plannedStart);
      ui.closeCreateModal();
      ui.selectIssue(node.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      title="New issue"
      onClose={() => ui.closeCreateModal()}
      width="md"
      className={className}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => ui.closeCreateModal()}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" form={formId} disabled={!submittable || saving}>
            {saving ? 'Creating…' : 'Create issue'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Title">
          <input
            type="text"
            value={form.title}
            autoFocus
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="What needs doing?"
            className="w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-[0.8125rem] text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </Field>

        <Field label="Assignee">
          <Select
            value={form.assigneeId}
            onChange={(assigneeId) => setForm((prev) => ({ ...prev, assigneeId }))}
            options={assigneeCreateOptions(data.people)}
            aria-label="Assignee"
          />
        </Field>

        <Field label="Status">
          <Select
            value={form.stateId}
            onChange={(stateId) => setForm((prev) => ({ ...prev, stateId }))}
            options={createStateOptions()}
            aria-label="Status"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date">
            <DateInput
              value={form.dueDate}
              onChange={(dueDate) => setForm((prev) => ({ ...prev, dueDate }))}
              aria-label="Due date"
            />
          </Field>

          <Field label="Planned start (local only)">
            <DateInput
              value={form.plannedStart}
              onChange={(plannedStart) => setForm((prev) => ({ ...prev, plannedStart }))}
              aria-label="Planned start"
            />
          </Field>
        </div>

        {error && <p className="text-[0.6875rem] text-attention-overdue">{error}</p>}
      </form>
    </ModalSheet>
  );
});
