import { create } from 'zustand';

import { createPlayerProfile } from '@/core/models/PlayerProfile';
import {
  migrateLegacyBestScores,
  removeBestScores,
  saveBestScores,
} from '@/features/games/scoreStorage';
import { flushQueuedResults, removeQueuedResults } from '@/features/games/resultQueue';
import { getAuthService, toAuthError, type AuthUser } from '@/services/auth';
import { authMode } from '@/services/firebase/config';
import {
  deletePlayerProfile,
  syncPlayerProfile,
} from '@/services/player/FirebasePlayerDataService';
import {
  loadTrophyIds,
  removeTrophyIds,
  saveTrophyIds as saveLocalTrophyIds,
} from '@/services/player/localPlayerData';
import { useSkyStore } from './useSkyStore';
import { useViewStore } from './useViewStore';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

const PLAYER_SYNC_ERROR =
  'A felhasználói adatok szinkronizálása nem sikerült. Ellenőrizd a kapcsolatot, majd próbáld újra.';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** Folyamatban lévő bejelentkezés/regisztráció (gomb tiltásához). */
  busy: boolean;
  /** Az utolsó művelet hibája, magyarul. */
  error: string | null;
  syncError: string | null;
  profileRevision: number;
  trophyIds: string[];

  /** Feliratkozik a Firebase állapotváltozásaira; az app indulásakor egyszer hívjuk. */
  startListening(): () => void;
  syncPlayerData(): Promise<boolean>;
  saveTrophyIds(trophyIds: string[]): Promise<boolean>;
  signIn(email: string, password: string): Promise<boolean>;
  register(email: string, password: string): Promise<boolean>;
  signOut(): Promise<void>;
  deleteAccount(password: string): Promise<boolean>;
  clearError(): void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  let authRevision = 0;

  function resetAccountStores() {
    useSkyStore.setState({ manualTime: null, selectedConstellationId: null });
    useViewStore.getState().reset();
  }

  async function clearLocalAccountData(uid: string) {
    await Promise.all([removeBestScores(uid), removeTrophyIds(uid)]);
  }

  async function synchronizePlayerData(user: AuthUser) {
    if (authMode !== 'local') {
      await flushQueuedResults(user.uid, () => get().user?.uid === user.uid);
    }
    const scores = await migrateLegacyBestScores(user.uid);
    const displayName = user.email?.split('@')[0]?.slice(0, 24) || 'Csillagnéző';
    const trophyIds = await loadTrophyIds(user.uid);
    const profile = createPlayerProfile(user.uid, displayName, scores, trophyIds);
    const synced = authMode === 'local' ? profile : await syncPlayerProfile(profile);
    await Promise.all([
      saveBestScores(synced.scores, user.uid),
      saveLocalTrophyIds(user.uid, synced.trophyIds),
    ]);
    return synced;
  }

  /** Közös hibakezelés a bejelentkezéshez és a regisztrációhoz. */
  async function run(action: () => Promise<unknown>): Promise<boolean> {
    set({ busy: true, error: null });
    try {
      await action();
      return true;
    } catch (error) {
      set({ error: toAuthError(error).message });
      return false;
    } finally {
      set({ busy: false });
    }
  }

  return {
    status: 'loading',
    user: null,
    busy: false,
    error: null,
    syncError: null,
    profileRevision: 0,
    trophyIds: [],

    startListening: () =>
      getAuthService().onAuthChanged((user) => {
        const revision = ++authRevision;
        const accountChanged = get().user?.uid !== user?.uid;
        set({
          user,
          status: user ? 'signedIn' : 'signedOut',
          syncError: null,
          trophyIds: [],
          profileRevision: accountChanged ? get().profileRevision + 1 : get().profileRevision,
        });
        if (accountChanged) resetAccountStores();
        if (!user) return;

        void synchronizePlayerData(user)
          .then((profile) => {
            if (revision === authRevision) {
              set((state) => ({
                trophyIds: profile.trophyIds,
                profileRevision: state.profileRevision + 1,
              }));
            }
          })
          .catch(() => {
            if (revision === authRevision) {
              set((state) => ({
                syncError: PLAYER_SYNC_ERROR,
                trophyIds: [],
                profileRevision: state.profileRevision + 1,
              }));
            }
          });
      }),

    syncPlayerData: async () => {
      const user = get().user;
      if (!user) return true;
      set({ syncError: null });
      try {
        const profile = await synchronizePlayerData(user);
        set((state) => ({
          trophyIds: profile.trophyIds,
          profileRevision: state.profileRevision + 1,
        }));
        return true;
      } catch {
        set({ syncError: PLAYER_SYNC_ERROR });
        return false;
      }
    },

    saveTrophyIds: async (trophyIds) => {
      const user = get().user;
      if (!user) return false;
      const uniqueTrophyIds = [...new Set(trophyIds.filter((id) => typeof id === 'string'))];
      try {
        await saveLocalTrophyIds(user.uid, uniqueTrophyIds);
        set({ trophyIds: uniqueTrophyIds });
        return await get().syncPlayerData();
      } catch {
        set({ syncError: PLAYER_SYNC_ERROR });
        return false;
      }
    },

    signIn: (email, password) => run(() => getAuthService().signIn(email, password)),
    register: (email, password) => run(() => getAuthService().register(email, password)),
    signOut: async () => {
      const user = get().user;
      if (!user) return;
      if (authMode !== 'local') {
        try {
          await flushQueuedResults(user.uid, () => get().user?.uid === user.uid);
        } catch {
          // A failed send remains queued for the next sign-in of this UID.
        }
      }
      await getAuthService().signOut();
      try {
        await clearLocalAccountData(user.uid);
      } catch {
        // The UID-scoped cache cannot be observed by another account.
      }
      resetAccountStores();
      set((state) => ({
        user: null,
        status: 'signedOut',
        trophyIds: [],
        syncError: null,
        profileRevision: state.profileRevision + 1,
      }));
    },
    deleteAccount: async (password) => {
      const user = get().user;
      if (!user) return false;
      return run(async () => {
        await getAuthService().reauthenticate(password);
        if (authMode !== 'local') {
          await flushQueuedResults(user.uid, () => get().user?.uid === user.uid);
          await deletePlayerProfile(user.uid);
        }
        await getAuthService().deleteAccount();
        await Promise.all([
          clearLocalAccountData(user.uid),
          removeQueuedResults(user.uid),
        ]);
        resetAccountStores();
        set((state) => ({
          user: null,
          status: 'signedOut',
          trophyIds: [],
          syncError: null,
          profileRevision: state.profileRevision + 1,
        }));
      });
    },
    clearError: () => set({ error: null }),
  };
});
