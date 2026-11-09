import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from '@/state/useAuthStore';
import { loadPlayerProfile, syncPlayerProfile } from '@/services/player/FirebasePlayerDataService';
import { loadBestScores } from '../scoreStorage';
import { loadMergedBestScores, recordGameResult } from '../results';
import { flushQueuedResults } from '../resultQueue';
import { loadPlayerStats, loadTrophyIds } from '@/services/player/localPlayerData';

jest.mock('@/services/firebase/config', () => ({ authMode: 'firebase' }));
jest.mock('@/state/useAuthStore', () => ({ useAuthStore: { getState: jest.fn() } }));
jest.mock('@/services/player/FirebasePlayerDataService', () => ({
  loadPlayerProfile: jest.fn(),
  syncPlayerProfile: jest.fn(),
}));

const getStateMock = jest.mocked(useAuthStore.getState);
const loadProfileMock = jest.mocked(loadPlayerProfile);
const syncProfileMock = jest.mocked(syncPlayerProfile);
const saveTrophyIdsMock = jest.fn().mockResolvedValue(true);

function signedIn(uid: string, email: string, trophyIds: string[] = []) {
  getStateMock.mockReturnValue({
    user: { uid, email },
    trophyIds,
    saveTrophyIds: saveTrophyIdsMock,
  } as unknown as ReturnType<typeof useAuthStore.getState>);
}

describe('game results service', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    loadProfileMock.mockReset();
    syncProfileMock.mockReset();
    saveTrophyIdsMock.mockClear();
    signedIn('user-1', 'one@example.com');
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

    expect(result).toMatchObject({ best: 300, isNewBest: true });
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
    expect(await recordGameResult('star-connection', 600)).toMatchObject({
      best: 700,
      isNewBest: false,
    });
    expect(syncProfileMock).not.toHaveBeenCalled();
  });

  it('keeps results isolated when the active account changes', async () => {
    await recordGameResult('constellation-finder', 350, {});
    await flushQueuedResults('user-1');
    signedIn('user-2', 'two@example.com');
    await recordGameResult('constellation-finder', 90, {});
    await flushQueuedResults('user-2');

    expect(await loadBestScores('user-1')).toEqual({ 'constellation-finder': 350 });
    expect(await loadBestScores('user-2')).toEqual({ 'constellation-finder': 90 });
    expect(syncProfileMock.mock.calls.map(([profile]) => profile.uid)).toEqual([
      'user-1',
      'user-2',
    ]);
  });

  it('az első játék után megadja és elmenti az Első fény trófeát', async () => {
    const result = await recordGameResult('belief-guess', 120, {
      difficulty: 'easy',
      correctCount: 6,
      rounds: 8,
    });

    expect(result.newTrophies.map((trophy) => trophy.id)).toEqual(['first-light', 'sharp-eye']);
    expect(await loadTrophyIds('user-1')).toEqual(['first-light', 'sharp-eye']);
    expect(saveTrophyIdsMock).toHaveBeenCalledWith(['first-light', 'sharp-eye']);
  });

  it('a már megszerzett trófeát nem jelzi újra a következő körben', async () => {
    await recordGameResult('belief-guess', 120, { correctCount: 6, rounds: 8 });
    signedIn('user-1', 'one@example.com', ['first-light', 'sharp-eye']);
    const second = await recordGameResult('belief-guess', 130, { correctCount: 6, rounds: 8 });

    expect(second.newTrophies).toEqual([]);
    expect(await loadPlayerStats('user-1')).toMatchObject({
      gamesPlayed: 2,
      plays: { 'belief-guess': 2 },
    });
  });

  it('a trófeák kiértékelése a fiókhoz kötött, vendégnél nem fut', async () => {
    getStateMock.mockReturnValue({ user: null } as unknown as ReturnType<
      typeof useAuthStore.getState
    >);
    const result = await recordGameResult('belief-guess', 120);

    expect(result.newTrophies).toEqual([]);
    expect(saveTrophyIdsMock).not.toHaveBeenCalled();
  });
});
