/** Widths the modal panel can take, matched to its content density. */
export type ModalSheetWidth = 'sm' | 'md';

/** Where the panel sits: a centered dialog, or a full-height right-side drawer. */
export type ModalSheetPlacement = 'center' | 'right';

/** Max-width class per size preset (the panel is otherwise full-width on small screens). */
export const MODAL_WIDTH_CLASS: Record<ModalSheetWidth, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
};

/**
 * The backdrop overlay classes per placement. `center` docks the panel to the bottom on
 * small screens (a bottom-sheet feel) and centers it on `sm+`; `right` stretches it
 * full-height against the right edge (a side drawer) at every width.
 */
export const MODAL_OVERLAY_CLASSES: Record<ModalSheetPlacement, string> = {
  center: 'fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4',
  right: 'fixed inset-0 z-50 flex items-stretch justify-end bg-black/40',
};

/** The panel shell classes per placement, minus width (added from {@link MODAL_WIDTH_CLASS}). */
export const MODAL_PANEL_CLASSES: Record<ModalSheetPlacement, string> = {
  center:
    'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-xl border border-border bg-surface shadow-xl sm:rounded-xl',
  right: 'flex h-full max-h-full w-full flex-col overflow-hidden border-l border-border bg-surface shadow-xl',
};

/** Compose the panel classes for a placement + size, appending caller overrides last. */
export function getModalPanelClasses(
  placement: ModalSheetPlacement,
  width: ModalSheetWidth,
  className: string,
): string {
  return `${MODAL_PANEL_CLASSES[placement]} ${MODAL_WIDTH_CLASS[width]} ${className}`.trim();
}
