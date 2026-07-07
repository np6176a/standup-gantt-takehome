import { SEARCH_PLACEHOLDER, showClearButton } from '@/components/molecules/SearchBar/SearchBarUtil';

describe('showClearButton', () => {
  it('shows the clear affordance only when the field has content', () => {
    expect(showClearButton('')).toBe(false);
    expect(showClearButton('ORB-104')).toBe(true);
    expect(showClearButton('#528')).toBe(true);
  });
});

describe('SEARCH_PLACEHOLDER', () => {
  it('hints at both search dimensions (issue id and PR number)', () => {
    expect(SEARCH_PLACEHOLDER.toLowerCase()).toContain('issue');
    expect(SEARCH_PLACEHOLDER).toContain('PR');
  });
});
