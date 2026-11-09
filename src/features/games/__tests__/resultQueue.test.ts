import AsyncStorage from '@react-native-async-storage/async-storage';

import { syncPlayerProfile } from '@/services/player/FirebasePlayerDataService';
import {
  enqueueGameResult,
  flushQueuedResults,
  loadQueuedResults,
} from '../resultQueue';

jest.mock('@/services/player/FirebasePlayerDataService', () => ({
  syncPlayerProfile: jest.fn(),
}));

const syncMock = jest.mocked(syncPlayerProfile);

describe('offline game result queue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    syncMock.mockReset();
  });

  it('keeps network failures queued and retries them successfully later', async () => {
    const unavailable = Object.assign(new Error('offline'), { code: 'unavailable' });
    syncMock.mockRejectedValueOnce(unavailable).mockImplementation(async (profile) => profile);
    await enqueueGameResult('user-1', 'star-connection', 320, { rounds: 5 });

    expect(await flushQueuedResults('user-1')).toEqual({ sent: 0, dropped: 0, pending: 1 });
    expect(await loadQueuedResults('user-1')).toHaveLength(1);
    expect(await flushQueuedResults('user-1')).toEqual({ sent: 1, dropped: 0, pending: 0 });
    expect(await loadQueuedResults('user-1')).toEqual([]);
  });

  it('drops permission-denied results instead of retrying them forever', async () => {
    syncMock.mockRejectedValue(Object.assign(new Error('denied'), { code: 'permission-denied' }));
    await enqueueGameResult('user-1', 'constellation-finder', 100);

    expect(await flushQueuedResults('user-1')).toEqual({ sent: 0, dropped: 1, pending: 0 });
    expect(await loadQueuedResults('user-1')).toEqual([]);
  });

  it('deduplicates identical result IDs and prevents parallel sends for one UID', async () => {
    let resolveSend!: (value: Awaited<ReturnType<typeof syncPlayerProfile>>) => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => (markStarted = resolve));
    syncMock.mockImplementation(() => {
      markStarted();
      return new Promise((resolve) => (resolveSend = resolve));
    });
    await enqueueGameResult('user-1', 'constellation-finder', 450);
    await enqueueGameResult('user-1', 'constellation-finder', 450);
    expect(await loadQueuedResults('user-1')).toHaveLength(1);

    const first = flushQueuedResults('user-1');
    const second = flushQueuedResults('user-1');
    expect(second).toBe(first);
    await started;
    expect(syncMock).toHaveBeenCalledTimes(1);
    resolveSend({
      uid: 'user-1',
      displayName: 'Player',
      scores: { 'constellation-finder': 450 },
      trophyIds: [],
    });
    await expect(first).resolves.toEqual({ sent: 1, dropped: 0, pending: 0 });
  });

  it('flushes only the requested account queue', async () => {
    syncMock.mockImplementation(async (profile) => profile);
    await enqueueGameResult('user-1', 'star-connection', 200);
    await enqueueGameResult('user-2', 'star-connection', 500);

    await flushQueuedResults('user-1');

    expect(syncMock).toHaveBeenCalledTimes(1);
    expect(syncMock.mock.calls[0][0].uid).toBe('user-1');
    expect(await loadQueuedResults('user-1')).toEqual([]);
    expect(await loadQueuedResults('user-2')).toHaveLength(1);
  });

  it('accepts and syncs results of the belief game', async () => {
    syncMock.mockImplementation(async (profile) => profile);
    await enqueueGameResult('user-1', 'belief-guess', 410, { rounds: 8 });

    expect(await loadQueuedResults('user-1')).toHaveLength(1);
    expect(await flushQueuedResults('user-1')).toEqual({ sent: 1, dropped: 0, pending: 0 });
    expect(syncMock).toHaveBeenCalledWith(
      expect.objectContaining({ scores: { 'belief-guess': 410 } }),
    );
  });
});