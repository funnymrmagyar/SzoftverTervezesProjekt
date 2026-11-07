import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from '@/state/useAuthStore';
import { loadPlayerProfile, syncPlayerProfile } from '@/services/player/FirebasePlayerDataService';
import { loadBestScores } from '../scoreStorage';
import { loadMergedBestScores, recordGameResult } from '../results';
import { flushQueuedResults } from '../resultQueue';

jest.mock('@/services/firebase/config', () => ({ authMode: 'firebase' }));
jest.mock('@/state/useAuthStore', () => ({ useAuthStore: { getState: jest.fn() } }));
jest.mock('@/services/player/FirebasePlayerDataService', () => ({
  loadPlayerProfile: jest.fn(),
  syncPlayerProfile: jest.fn(),
}));

const getStateMock = jest.mocked(useAuthStore.getState);
const loadProfileMock = jest.mocked(loadPlayerProfile);
const syncProfileMock = jest.mocked(syncPlayerProfile);

describe('game results service', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    loadProfileMock.mockReset();
    syncProfileMock.mockReset();
    getStateMock.mockReturnValue({
      user: { uid: 'user-1', email: 'one@example.com' },
    } as ReturnType<typeof useAuthStore.getState>);
    loadProfileMock.mockResolvedValue(null);
    syncProfileMock.mockImplementation(async (profile) => profile);
  });

  it('saves a per-user best locally and submits the result once', async () => {
    const result = await recordGameResult('constellation-finder', 300, {
      difficulty: 'easy',
      correctCount: 8,
      rounds: 10,
    });
    await flushQueuedResults('user-1');

    expect(result).toEqual({ best: 300, isNewBest: true });
    expect(await loadBestScores('user-1')).toEqual({ 'constellation-finder': 300 });
    expect(syncProfileMock).toHaveBeenCalledTimes(1);
    expect(syncProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'user-1',
        displayName: 'one',
        scores: { 'constellation-finder': 300 },
      }),
    );
  });

  it('merges local and cloud scores by maximum and does not resend a non-record', async () => {
    await AsyncStorage.setItem(
      'csillagnezo.gameBest.v1.user.user-1',
      JSON.stringify({ 'star-connection': 700 }),
    );
    loadProfileMock.mockResolvedValue({
      uid: 'user-1',
      displayName: 'One',
      scores: { 'star-connection': 500 },
      trophyIds: [],
    });

    expect(await loadMergedBestScores('user-1')).toEqual({ 'star-connection': 700 });
    expect(await recordGameResult('star-connection', 600)).toEqual({
      best: 700,
      isNewBest: false,
    });
    expect(syncProfileMock).not.toHaveBeenCalled();
  });

  it('keeps results isolated when the active account changes', async () => {
    await recordGameResult('constellation-finder', 350, {});
    await flushQueuedResults('user-1');
    getStateMock.mockReturnValue({
      user: { uid: 'user-2', email: 'two@example.com' },
    } as ReturnType<typeof useAuthStore.getState>);
    await recordGameResult('constellation-finder', 90, {});
    await flushQueuedResults('user-2');

    expect(await loadBestScores('user-1')).toEqual({ 'constellation-finder': 350 });
    expect(await loadBestScores('user-2')).toEqual({ 'constellation-finder': 90 });
    expect(syncProfileMock.mock.calls.map(([profile]) => profile.uid)).toEqual(['user-1', 'user-2']);
  });
});