import { avatarColors, avatarHue, initials } from '@/components/atoms/Avatar/AvatarUtil';

describe('initials', () => {
  it('takes first + last word initials, upper-cased', () => {
    expect(initials('Priya Nadkarni')).toBe('PN');
    expect(initials('marcus webb')).toBe('MW');
  });

  it('uses a single initial for a one-word name', () => {
    expect(initials('dana')).toBe('D');
  });

  it('falls back to "?" for an empty or whitespace name', () => {
    expect(initials('')).toBe('?');
    expect(initials('   ')).toBe('?');
  });
});

describe('avatarHue / avatarColors', () => {
  it('is deterministic for a given name', () => {
    expect(avatarHue('Priya')).toBe(avatarHue('Priya'));
    expect(avatarColors('Priya').background).toBe(avatarColors('Priya').background);
  });

  it('stays within the 0–359 hue range', () => {
    for (const name of ['Priya', 'Marcus', 'Dana', 'Theo', 'Ingrid', 'Sam']) {
      const hue = avatarHue(name);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });
});
