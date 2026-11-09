import { create } from 'zustand';

import { createPlayerProfile } from '@/core/models/PlayerProfile';
import {
  migrateLegacyBestScores,
  removeBestScores,
  saveBestScores,
} from '@/features/games/scoreStorage';
import { flushQueuedResults, removeQueuedResults } from '@/features/games/resultQueue';
import {
  getAuthService,
  isKnownAuthErrorCode,
  toAuthError,
  type AuthUser,
} from '@/services/auth';
import { authMode } from '@/services/firebase/config';
import { createLogger } from '@/services/logger';
import {
  deletePlayerProfile,
  syncPlayerProfile,
} from '@/services/player/FirebasePlayerDataService';
import {
  loadTrophyIds,
  removeTrophyIds,
  saveTrophyIds as saveLocalTrophyIds,
} from '@/services/player/localPlayerData';
import {
  deleteLocalPlayerProfile,
  syncLocalPlayerProfile,
} from '@/services/player/localPlayerProfiles';
import { useSkyStore } from './useSkyStore';
import { useViewStore } from './useViewStore';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

const PLAYER_SYNC_ERROR =
  'A felhasználói adatok szinkronizálása nem sikerült. Ellenőrizd a kapcsolatot, majd próbáld újra.';

const log = createLogger('auth');

/**
 * Sikertelen fiókművelet naplózása. A felhasználói hibák (rossz jelszó, foglalt e-mail)
 * a normál működés részei, ezért csak „info”; a hálózati gond „warn”; a váratlan hiba „error”,
 * a teljes hibával együtt. E-mail-címet és jelszót soha nem naplózunk.
 */
function logAuthFailure(action: string, error: unknown) {
  const { code } = toAuthError(error);
  if (!isKnownAuthErrorCode(code)) {
    log.error(`${action}: váratlan hiba`, { error });
  } else if (code === 'auth/network-request-failed' || code === 'auth/too-many-requests') {
    log.warn(`${action} sikertelen`, { code });
  } else {
    log.info(`${action} sikertelen`, { code });
  }
}

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
    // Helyi módban a profil az eszközön marad (ebből készül a helyi ranglista is).
    const synced =
      authMode === 'local'
        ? await syncLocalPlayerProfile(profile)
        : await syncPlayerProfile(profile);
    await Promise.all([
      saveBestScores(synced.scores, user.uid),
      saveLocalTrophyIds(user.uid, synced.trophyIds),
    ]);
    return synced;
  }

  /** A szinkronizálási hibák egy helyen: naplózzuk, a felület pedig a syncError-t mutatja. */
  function reportSyncError(error: unknown) {
    log.error('A játékosadatok szinkronizálása nem sikerült', { error });
  }

  /** Közös hibakezelés a fiókműveletekhez (bejelentkezés, regisztráció, fióktörlés). */
  async function run(actionName: string, action: () => Promise<unknown>): Promise<boolean> {
    set({ busy: true, error: null });
    try {
      await action();
      return true;
    } catch (error) {
      logAuthFailure(actionName, error);
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
        if (accountChanged) {
          resetAccountStores();
          if (user) log.info('Bejelentkezett felhasználó', { uid: user.uid });
          else log.info('Nincs bejelentkezett felhasználó');
        }
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
          .catch((error: unknown) => {
            reportSyncError(error);
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
      } catch (error) {
        reportSyncError(error);
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
      } catch (error) {
        log.error('A trófeák mentése nem sikerült', { error });
        set({ syncError: PLAYER_SYNC_ERROR });
        return false;
      }
    },

    signIn: (email, password) =>
      run('Bejelentkezés', () => getAuthService().signIn(email, password)),
    register: (email, password) =>
      run('Regisztráció', () => getAuthService().register(email, password)),
    signOut: async () => {
      const user = get().user;
      if (!user) return;
      if (authMode !== 'local') {
        try {
          await flushQueuedResults(user.uid, () => get().user?.uid === user.uid);
        } catch (error) {
          // A failed send remains queued for the next sign-in of this UID.
          log.warn('Kijelentkezés előtt nem sikerült elküldeni az eredményeket', { error });
        }
      }
      await getAuthService().signOut();
      try {
        await clearLocalAccountData(user.uid);
      } catch (error) {
        // The UID-scoped cache cannot be observed by another account.
        log.warn('A helyi fiókadatok törlése nem sikerült', { error });
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
      return run('Fióktörlés', async () => {
        await getAuthService().reauthenticate(password);
        if (authMode !== 'local') {
          await flushQueuedResults(user.uid, () => get().user?.uid === user.uid);
          await deletePlayerProfile(user.uid);
        } else {
          await deleteLocalPlayerProfile(user.uid);
        }
        await getAuthService().deleteAccount();
        await Promise.all([
          clearLocalAccountData(user.uid),
          removeQueuedResults(user.uid),
        ]);
        log.info('A fiók törölve', { uid: user.uid });
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
