import {
  MODAL_PANEL_CLASSES,
  MODAL_WIDTH_CLASS,
  getModalPanelClasses,
} from '@/components/molecules/ModalSheet/ModalSheetUtil';

describe('getModalPanelClasses', () => {
  it('includes the shared panel classes and the size max-width', () => {
    const result = getModalPanelClasses('sm', '');
    expect(result).toContain(MODAL_PANEL_CLASSES);
    expect(result).toContain(MODAL_WIDTH_CLASS.sm);
  });

  it('appends caller overrides last', () => {
    expect(getModalPanelClasses('md', 'text-lg').endsWith('text-lg')).toBe(true);
  });
});
