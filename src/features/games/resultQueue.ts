import AsyncStorage from '@react-native-async-storage/async-storage';

import { createPlayerProfile } from '@/core/models/PlayerProfile';
import { loadBestScores, saveBestScores } from './scoreStorage';
import type { GameId } from './gameOptions';
import { syncPlayerProfile } from '@/services/player/FirebasePlayerDataService';
import { loadTrophyIds } from '@/services/player/localPlayerData';

const QUEUE_KEY = 'csillagnezo.gameResults.pending.v1';

export type ResultMeta = Record<string, string | number | boolean | null | undefined>;

export interface QueuedGameResult {
  id: string;
  uid: string;
  game: GameId;
  score: number;
  meta: ResultMeta;
  createdAt: number;
}

export interface FlushResult {
  sent: number;
  dropped: number;
  pending: number;
}

let writeTail: Promise<void> = Promise.resolve();
const inFlight = new Map<string, Promise<FlushResult>>();

async function withQueueLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = writeTail;
  let release!: () => void;
  writeTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

function parseQueue(raw: string | null): QueuedGameResult[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is QueuedGameResult => {
    if (!item || typeof item !== 'object') return false;
    const record = item as Partial<QueuedGameResult>;
    return (
      typeof record.id === 'string' &&
      typeof record.uid === 'string' &&
      (record.game === 'constellation-finder' || record.game === 'star-connection') &&
      typeof record.score === 'number' &&
      Number.isSafeInteger(record.score) &&
      record.score >= 0 &&
      typeof record.createdAt === 'number'
    );
  });
}

async function readQueue(): Promise<QueuedGameResult[]> {
  try {
    return parseQueue(await AsyncStorage.getItem(QUEUE_KEY));
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedGameResult[]): Promise<void> {
  if (queue.length === 0) await AsyncStorage.removeItem(QUEUE_KEY);
  else await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function resultQueueId(uid: string, game: GameId, score: number): string {
  return `${encodeURIComponent(uid)}:${game}:${score}`;
}

export async function enqueueGameResult(
  uid: string,
  game: GameId,
  score: number,
  meta: ResultMeta = {},
): Promise<QueuedGameResult> {
  const result: QueuedGameResult = {
    id: resultQueueId(uid, game, score),
    uid,
    game,
    score,
    meta,
    createdAt: Date.now(),
  };
  await withQueueLock(async () => {
    const queue = await readQueue();
    if (!queue.some((item) => item.id === result.id)) await writeQueue([...queue, result]);
  });
  return result;
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

export function flushQueuedResults(
  uid: string,
  isCurrentUser: () => boolean = () => true,
): Promise<FlushResult> {
  const current = inFlight.get(uid);
  if (current) return current;

  const flush = flushUserQueue(uid, isCurrentUser).finally(() => {
    if (inFlight.get(uid) === flush) inFlight.delete(uid);
  });
  inFlight.set(uid, flush);
  return flush;
}

async function flushUserQueue(
  uid: string,
  isCurrentUser: () => boolean,
): Promise<FlushResult> {
  let sent = 0;
  let dropped = 0;

  while (true) {
    if (!isCurrentUser()) break;
    const next = (await readQueue()).find((item) => item.uid === uid);
    if (!next) break;

    try {
      const localScores = await loadBestScores(uid);
      const score = Math.max(localScores[next.game] ?? 0, next.score);
      const profile = createPlayerProfile(
        uid,
        typeof next.meta.displayName === 'string' ? next.meta.displayName : 'Csillagnéző',
        { ...localScores, [next.game]: score },
        await loadTrophyIds(uid),
      );
      if (!isCurrentUser()) break;
      const synced = await syncPlayerProfile(profile);
      await saveBestScores(synced.scores, uid);
      await withQueueLock(async () => {
        const queue = await readQueue();
        await writeQueue(queue.filter((item) => item.id !== next.id));
      });
      sent += 1;
    } catch (error) {
      if (errorCode(error) === 'permission-denied') {
        await withQueueLock(async () => {
          const queue = await readQueue();
          await writeQueue(queue.filter((item) => item.id !== next.id));
        });
        dropped += 1;
        continue;
      }
      break;
    }
  }

  const pending = (await readQueue()).filter((item) => item.uid === uid).length;
  return { sent, dropped, pending };
}

export async function removeQueuedResults(uid: string): Promise<void> {
  await withQueueLock(async () => {
    const queue = await readQueue();
    await writeQueue(queue.filter((item) => item.uid !== uid));
  });
}

export async function loadQueuedResults(uid?: string): Promise<QueuedGameResult[]> {
  const queue = await readQueue();
  return uid ? queue.filter((item) => item.uid === uid) : queue;
}