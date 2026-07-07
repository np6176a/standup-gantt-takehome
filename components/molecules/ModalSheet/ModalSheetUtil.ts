/** Widths the modal panel can take, matched to its content density. */
export type ModalSheetWidth = 'sm' | 'md';

/** Max-width class per size preset (the panel is otherwise full-width on small screens). */
export const MODAL_WIDTH_CLASS: Record<ModalSheetWidth, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
};

/**
 * The backdrop overlay classes. Small screens dock the panel to the bottom (a bottom-sheet
 * feel); `sm+` centers it — the same component switched by breakpoint, per the responsive
 * plan.
 */
export const MODAL_OVERLAY_CLASSES =
  'fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4';

/** The panel shell classes, minus its width (added from {@link MODAL_WIDTH_CLASS}). */
export const MODAL_PANEL_CLASSES =
  'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-xl border border-border bg-surface shadow-xl sm:rounded-xl';

/** Compose the panel classes for a size preset, appending caller overrides last. */
export function getModalPanelClasses(width: ModalSheetWidth, className: string): string {
  return `${MODAL_PANEL_CLASSES} ${MODAL_WIDTH_CLASS[width]} ${className}`.trim();
}
