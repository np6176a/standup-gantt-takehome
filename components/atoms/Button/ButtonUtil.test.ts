import { getButtonClasses } from '@/components/atoms/Button/ButtonUtil';

describe('getButtonClasses', () => {
  it('returns primary md classes', () => {
    const result = getButtonClasses('primary', 'md', '');
    expect(result).toContain('bg-primary');
    expect(result).toContain('px-4');
  });

  it('returns ghost sm classes', () => {
    const result = getButtonClasses('ghost', 'sm', '');
    expect(result).toContain('bg-transparent');
    expect(result).toContain('px-3');
  });

  it('returns outlined classes with border', () => {
    const result = getButtonClasses('outlined', 'sm', '');
    expect(result).toContain('border');
    expect(result).toContain('bg-surface-raised');
  });

  it('returns icon size classes', () => {
    const result = getButtonClasses('outlined', 'icon', '');
    expect(result).toContain('h-8');
    expect(result).toContain('w-8');
  });

  it('appends custom className', () => {
    const result = getButtonClasses('primary', 'md', 'custom-class');
    expect(result).toContain('custom-class');
  });
});
