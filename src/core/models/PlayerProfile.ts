import { GAME_OPTIONS, type GameId } from '@/features/games/gameOptions';

export type PlayerScores = Partial<Record<GameId, number>>;

export interface PlayerProfile {
  uid: string;
  displayName: string;
  scores: PlayerScores;
  trophyIds: string[];
}

export interface LeaderboardPlayer {
  uid: string;
  displayName: string;
  points: number;
  scores: PlayerScores;
  trophyCount: number;
}

export function createPlayerProfile(
  uid: string,
  displayName: string,
  scores: PlayerScores = {},
  trophyIds: string[] = [],
): PlayerProfile {
  return { uid, displayName, scores, trophyIds };
}

export function parsePlayerProfile(value: unknown, uid: string): PlayerProfile {
  if (!value || typeof value !== 'object') return createPlayerProfile(uid, '', {});

  const data = value as Record<string, unknown>;
  const rawScores =
    data.scores && typeof data.scores === 'object' ? (data.scores as Record<string, unknown>) : {};
  const scores: PlayerScores = {};
  for (const { id } of GAME_OPTIONS) {
    const score = rawScores[id];
    if (typeof score === 'number' && Number.isSafeInteger(score) && score >= 0) {
      scores[id] = score;
    }
  }

  return {
    uid,
    displayName: typeof data.displayName === 'string' ? data.displayName.slice(0, 24) : '',
    scores,
    trophyIds: Array.isArray(data.trophyIds)
      ? data.trophyIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export function mergePlayerProfiles(
  local: PlayerProfile,
  remote: PlayerProfile | null,
): PlayerProfile {
  if (!remote) return local;
  const scores: PlayerScores = {};
  for (const { id } of GAME_OPTIONS) {
    const localScore = local.scores[id] ?? 0;
    const remoteScore = remote.scores[id] ?? 0;
    const best = Math.max(localScore, remoteScore);
    if (best > 0) scores[id] = best;
  }

  return {
    uid: local.uid,
    displayName: remote.displayName || local.displayName,
    scores,
    trophyIds: [...new Set([...remote.trophyIds, ...local.trophyIds])],
  };
}

export function totalPlayerPoints(scores: PlayerScores): number {
  return Object.values(scores).reduce((total, score) => total + (score ?? 0), 0);
}
