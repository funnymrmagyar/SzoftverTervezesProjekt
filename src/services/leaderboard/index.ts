import type { LeaderboardService } from './LeaderboardService';

export type { LeaderboardService, Unsubscribe } from './LeaderboardService';

/*
 * Ugyanaz a minta, mint az AuthService-nél: a konkrét megvalósítást az app indulásakor
 * a services/bootstrap.ts adja meg (composition root), a tesztek sajátot állíthatnak be.
 */
let service: LeaderboardService | undefined;

export function setLeaderboardService(next: LeaderboardService): void {
  service = next;
}

export function getLeaderboardService(): LeaderboardService {
  if (!service) {
    throw new Error(
      'Nincs beállítva LeaderboardService — hívd meg a configureServices()-t az app indulásakor.',
    );
  }
  return service;
}
