import {
  MODAL_PANEL_CLASSES,
  MODAL_WIDTH_CLASS,
  getModalPanelClasses,
} from '@/components/molecules/ModalSheet/ModalSheetUtil';

describe('getModalPanelClasses', () => {
  it('includes the placement panel classes and the size max-width', () => {
    const result = getModalPanelClasses('center', 'sm', '');
    expect(result).toContain(MODAL_PANEL_CLASSES.center);
    expect(result).toContain(MODAL_WIDTH_CLASS.sm);
  });

  it('uses the right-drawer classes for the right placement', () => {
    expect(getModalPanelClasses('right', 'md', '')).toContain(MODAL_PANEL_CLASSES.right);
  });

  it('appends caller overrides last', () => {
    expect(getModalPanelClasses('center', 'md', 'text-lg').endsWith('text-lg')).toBe(true);
  });
});
