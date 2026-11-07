import { mergePlayerProfiles, createPlayerProfile, type PlayerScores } from '@/core/models/PlayerProfile';
import { useAuthStore } from '@/state/useAuthStore';
import { authMode } from '@/services/firebase/config';
import { loadPlayerProfile } from '@/services/player/FirebasePlayerDataService';
import { enqueueGameResult, flushQueuedResults, type ResultMeta } from './resultQueue';
import { loadBestScores, saveBestScores, type BestScores } from './scoreStorage';
import type { GameId } from './gameOptions';

export interface GameResultMeta extends ResultMeta {
  difficulty?: 'easy' | 'hard';
  durationMs?: number;
  correctCount?: number;
  rounds?: number;
  mistakes?: number;
  hints?: number;
  displayName?: string;
}

function mergeScores(local: BestScores, remote: PlayerScores): BestScores {
  return mergePlayerProfiles(
    createPlayerProfile('merge', '', local),
    createPlayerProfile('merge', '', remote),
  ).scores;
}

export async function loadMergedBestScores(uid?: string): Promise<BestScores> {
  const local = await loadBestScores(uid);
  if (!uid || authMode === 'local') return local;
  try {
    const remote = await loadPlayerProfile(uid);
    return remote ? mergeScores(local, remote.scores) : local;
  } catch {
    return local;
  }
}

export async function recordGameResult(
  game: GameId,
  score: number,
  meta: GameResultMeta = {},
): Promise<{ best: number; isNewBest: boolean }> {
  const normalizedScore = Number.isSafeInteger(score) ? Math.max(0, score) : 0;
  const authUser = useAuthStore.getState().user;
  const uid = authUser?.uid;
  const local = await loadBestScores(uid);
  const merged = uid ? await loadMergedBestScores(uid) : local;
  const previous = merged[game] ?? 0;
  const best = Math.max(previous, normalizedScore);
  const isNewBest = normalizedScore > previous;

  if (best > (local[game] ?? 0)) {
    await saveBestScores({ ...local, [game]: best }, uid);
  }

  if (uid && authMode !== 'local') {
    if (isNewBest) {
      const emailName = authUser.email?.split('@')[0]?.slice(0, 24) || 'Csillagnéző';
      await enqueueGameResult(uid, game, normalizedScore, {
        ...meta,
        displayName: meta.displayName ?? emailName,
      });
    }
    void flushQueuedResults(uid, () => useAuthStore.getState().user?.uid === uid);
  }

  return { best, isNewBest };
}