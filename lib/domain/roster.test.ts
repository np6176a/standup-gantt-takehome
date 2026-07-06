import {
  ROSTER,
  isRosterLogin,
  personByEmail,
  personByLogin,
} from '@/lib/domain/roster';
import { BOT_REVIEWER_LOGIN, OUTSIDE_AUTHOR_LOGIN, TEAM } from '@/lib/fake-source/seed';

describe('roster', () => {
  it('has the six teammates', () => {
    expect(ROSTER).toHaveLength(6);
  });

  it('mirrors the seeded cast (email ⇄ githubLogin joins actually line up)', () => {
    // Guards the hand-transcribed roster against drift from the Fake source's TEAM.
    for (const member of Object.values(TEAM)) {
      const person = personByEmail(member.email);
      expect(person).not.toBeNull();
      expect(person?.githubLogin).toBe(member.githubLogin);
      expect(person?.id).toBe(member.id);
    }
  });

  it('resolves email case-insensitively and returns null for unknowns', () => {
    expect(personByEmail('PRIYA@ORBITAL.DEV')?.displayName).toBe('priya');
    expect(personByEmail('nobody@orbital.dev')).toBeNull();
    expect(personByEmail(null)).toBeNull();
  });

  it('resolves login case-insensitively and returns null for unknowns', () => {
    expect(personByLogin('DCHO')?.displayName).toBe('dana');
    expect(personByLogin(undefined)).toBeNull();
  });

  it('filters the bot and outside contributor (not on the roster)', () => {
    expect(personByLogin(BOT_REVIEWER_LOGIN)).toBeNull();
    expect(personByLogin(OUTSIDE_AUTHOR_LOGIN)).toBeNull();
    expect(isRosterLogin(BOT_REVIEWER_LOGIN)).toBe(false);
    expect(isRosterLogin('theoramos')).toBe(true);
  });
});
