import {
  mergePlayerProfiles,
  createPlayerProfile,
  type PlayerScores,
} from '@/core/models/PlayerProfile';
import { isValidUsernameFormat } from '@/core/username';
import { useAuthStore } from '@/state/useAuthStore';
import { authMode } from '@/services/firebase/config';
import { loadPlayerProfile } from '@/services/player/FirebasePlayerDataService';
import {
  loadPlayerStats,
  loadTrophyIds,
  savePlayerStats,
  saveTrophyIds,
} from '@/services/player/localPlayerData';
import { dayKey, recordRunInStats } from '@/features/trophies/playerStats';
import { evaluateNewTrophies, type TrophyDefinition } from '@/features/trophies/trophies';
import { createLogger } from '@/services/logger';

import { useUsernamePromptStore } from './usernamePromptStore';
import { enqueueGameResult, flushQueuedResults, type ResultMeta } from './resultQueue';
import { loadBestScores, saveBestScores, type BestScores } from './scoreStorage';
import type { GameId } from './gameOptions';

const log = createLogger('games');

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

export interface RecordedGameResult {
  best: number;
  isNewBest: boolean;
  newTrophies: TrophyDefinition[];
}

async function ensureUsernameForSave(): Promise<string | null> {
  const store = useAuthStore.getState();
  if (!store.user) return null;
  if (store.displayName && isValidUsernameFormat(store.displayName)) {
    return store.displayName;
  }
  return useUsernamePromptStore.getState().requestUsername();
}

async function awardTrophies(
  uid: string,
  game: GameId,
  score: number,
  scores: BestScores,
  meta: GameResultMeta,
): Promise<TrophyDefinition[]> {
  try {
    const today = dayKey(new Date());
    const stats = recordRunInStats(await loadPlayerStats(uid), game, today);
    await savePlayerStats(uid, stats);

    const authStore = useAuthStore.getState();
    const earned = [...new Set([...(await loadTrophyIds(uid)), ...authStore.trophyIds])];
    const newTrophies = evaluateNewTrophies(
      {
        stats,
        scores,
        today,
        run: {
          game,
          score,
          difficulty: meta.difficulty,
          correctCount: meta.correctCount,
          rounds: meta.rounds,
        },
      },
      earned,
    );
    if (newTrophies.length === 0) return [];

    const all = [...earned, ...newTrophies.map((trophy) => trophy.id)];
    await saveTrophyIds(uid, all);
    void authStore.saveTrophyIds(all);
    return newTrophies;
  } catch (error) {
    log.warn('A trófeák kiértékelése nem sikerült', { error });
    return [];
  }
}

export async function recordGameResult(
  game: GameId,
  score: number,
  meta: GameResultMeta = {},
): Promise<RecordedGameResult> {
  const normalizedScore = Number.isSafeInteger(score) ? Math.max(0, score) : 0;
  const authUser = useAuthStore.getState().user;
  const uid = authUser?.uid;

  let displayName: string | undefined = meta.displayName;
  if (uid) {
    const ensured = await ensureUsernameForSave();
    if (!ensured) {
      return { best: normalizedScore, isNewBest: false, newTrophies: [] };
    }
    displayName = ensured;
  }

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
      await enqueueGameResult(uid, game, normalizedScore, {
        ...meta,
        displayName: displayName ?? 'Csillagnéző',
      });
    }
    void flushQueuedResults(uid, () => useAuthStore.getState().user?.uid === uid);
  } else if (uid && isNewBest) {
    await useAuthStore.getState().syncPlayerData();
  }

  const newTrophies = uid
    ? await awardTrophies(uid, game, normalizedScore, { ...merged, [game]: best }, meta)
    : [];

  return { best, isNewBest, newTrophies };
}