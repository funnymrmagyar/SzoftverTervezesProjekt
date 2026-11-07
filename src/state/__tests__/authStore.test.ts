import AsyncStorage from '@react-native-async-storage/async-storage';

import { saveBestScores, loadBestScores } from '@/features/games/scoreStorage';
import { enqueueGameResult, loadQueuedResults } from '@/features/games/resultQueue';
import { InMemoryAuthService } from '@/services/auth/InMemoryAuthService';
import { setAuthService } from '@/services/auth';
import { syncPlayerProfile, deletePlayerProfile } from '@/services/player/FirebasePlayerDataService';
import { loadTrophyIds, saveTrophyIds } from '@/services/player/localPlayerData';
import { useSkyStore } from '@/state/useSkyStore';
import { useViewStore } from '@/state/useViewStore';

import { useAuthStore } from '../useAuthStore';

jest.mock('@/services/firebase/config', () => ({ authMode: 'firebase' }));
jest.mock('@/services/player/FirebasePlayerDataService', () => ({
  syncPlayerProfile: jest.fn(),
  deletePlayerProfile: jest.fn(),
}));

const syncMock = jest.mocked(syncPlayerProfile);
const deleteProfileMock = jest.mocked(deletePlayerProfile);

describe('useAuthStore account lifecycle', () => {
  let unsubscribe: (() => void) | undefined;

  beforeEach(async () => {
    await AsyncStorage.clear();
    syncMock.mockReset();
    syncMock.mockImplementation(async (profile) => profile);
    deleteProfileMock.mockReset();
    deleteProfileMock.mockResolvedValue(undefined);
    useAuthStore.setState({
      status: 'signedOut',
      user: null,
      busy: false,
      error: null,
      syncError: null,
      profileRevision: 0,
      trophyIds: [],
    });
    useSkyStore.setState({ manualTime: null, selectedConstellationId: null });
    useViewStore.getState().reset();
    unsubscribe?.();
    const auth = new InMemoryAuthService();
    setAuthService(auth);
    unsubscribe = useAuthStore.getState().startListening();
    await auth.register('player@example.com', 'correct-password');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => unsubscribe?.());

  it('flushes a pending result before logout and clears the old UID caches and stores', async () => {
    const uid = useAuthStore.getState().user!.uid;
    await saveBestScores({ 'star-connection': 240 }, uid);
    await saveTrophyIds(uid, ['first-light']);
    await enqueueGameResult(uid, 'star-connection', 240);
    useSkyStore.setState({ manualTime: 1234, selectedConstellationId: 'gonc' });

    await useAuthStore.getState().signOut();

    expect(syncMock).toHaveBeenCalledWith(expect.objectContaining({ uid, scores: { 'star-connection': 240 } }));
    expect(await loadQueuedResults(uid)).toEqual([]);
    expect(await loadBestScores(uid)).toEqual({});
    expect(await loadTrophyIds(uid)).toEqual([]);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedOut', user: null, trophyIds: [] });
    expect(useSkyStore.getState()).toMatchObject({ manualTime: null, selectedConstellationId: null });
  });

  it('requires the current password and removes cloud, local, queue, and Auth data on deletion', async () => {
    const uid = useAuthStore.getState().user!.uid;
    await saveBestScores({ 'constellation-finder': 500 }, uid);
    await saveTrophyIds(uid, ['explorer']);
    await enqueueGameResult(uid, 'constellation-finder', 500);

    expect(await useAuthStore.getState().deleteAccount('wrong-password')).toBe(false);
    expect(deleteProfileMock).not.toHaveBeenCalled();
    expect(await loadBestScores(uid)).toEqual({ 'constellation-finder': 500 });

    expect(await useAuthStore.getState().deleteAccount('correct-password')).toBe(true);
    expect(deleteProfileMock).toHaveBeenCalledWith(uid);
    expect(await loadBestScores(uid)).toEqual({});
    expect(await loadTrophyIds(uid)).toEqual([]);
    expect(await loadQueuedResults(uid)).toEqual([]);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedOut', user: null, trophyIds: [] });
  });
});