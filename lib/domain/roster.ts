// The app-owned team roster: the email→githubLogin identity map.
//
// Boundary decision (see NOTES.md): this is transcribed by hand, NOT imported from
// `lib/fake-source/seed.ts`'s TEAM. The Fake source impersonates an external system
// (Linear + GitHub); app code owning its own roster models the real situation, where
// the login⇄email join is app-maintained config rather than a field either API hands
// you. The six entries mirror the seeded cast so identity resolution actually joins.

import type { Person } from '@/lib/domain/types';

/** The fictional six-person team. The single source of identity truth for app code. */
export const ROSTER: readonly Person[] = [
  { id: 'usr_priya', name: 'Priya Nadkarni', displayName: 'priya', email: 'priya@orbital.dev', githubLogin: 'pnadkarni' },
  { id: 'usr_marcus', name: 'Marcus Webb', displayName: 'marcus', email: 'marcus@orbital.dev', githubLogin: 'mwebb-dev' },
  { id: 'usr_dana', name: 'Dana Cho', displayName: 'dana', email: 'dana@orbital.dev', githubLogin: 'dcho' },
  { id: 'usr_theo', name: 'Theo Ramos', displayName: 'theo', email: 'theo@orbital.dev', githubLogin: 'theoramos' },
  { id: 'usr_ingrid', name: 'Ingrid Olsen', displayName: 'ingrid', email: 'ingrid@orbital.dev', githubLogin: 'iolsen' },
  { id: 'usr_sam', name: 'Sam Okafor', displayName: 'sam', email: 'sam@orbital.dev', githubLogin: 'sokafor' },
];

/** Lower-cased lookup indexes so joins are case-insensitive and O(1). */
const byEmail = new Map(ROSTER.map((person) => [person.email.toLowerCase(), person]));
const byLogin = new Map(ROSTER.map((person) => [person.githubLogin.toLowerCase(), person]));

/** Resolve a teammate by Linear email, or null if not on the roster. */
export function personByEmail(email: string | null | undefined): Person | null {
  if (!email) return null;
  return byEmail.get(email.toLowerCase()) ?? null;
}

/**
 * Resolve a teammate by GitHub login, or null if not on the roster. Returning null
 * is the bot/outside-contributor filter: `orbit-ci-bot` and `octo-intern` are not
 * on the roster, so PR reviewers/authors with those logins resolve to no person.
 */
export function personByLogin(login: string | null | undefined): Person | null {
  if (!login) return null;
  return byLogin.get(login.toLowerCase()) ?? null;
}

/** True when a GitHub login belongs to a roster teammate (not a bot/outsider). */
export function isRosterLogin(login: string | null | undefined): boolean {
  return personByLogin(login) !== null;
}
