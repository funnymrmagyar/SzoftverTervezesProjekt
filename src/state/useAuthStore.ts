import { create } from 'zustand';

import { createPlayerProfile } from '@/core/models/PlayerProfile';
import { isValidUsernameFormat } from '@/core/username';
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
  loadPlayerProfile,
  syncPlayerProfile,
} from '@/services/player/FirebasePlayerDataService';
import {
  loadTrophyIds,
  removePlayerStats,
  removeTrophyIds,
  saveTrophyIds as saveLocalTrophyIds,
} from '@/services/player/localPlayerData';
import {
  deleteLocalPlayerProfile,
  loadLocalLeaderboard,
  syncLocalPlayerProfile,
} from '@/services/player/localPlayerProfiles';
import { t } from '@/ui/i18n';
import { useLocaleStore } from '@/ui/locale';
import {
  claimUsername as claimUsernameService,
  releaseUsernameForUser,
} from '@/services/player/usernameService';
import { useSkyStore } from './useSkyStore';
import { useViewStore } from './useViewStore';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

/** A szinkronhiba üzenete az aktuális nyelven. */
function playerSyncError(): string {
  return t('sync.error');
}

const log = createLogger('auth');

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
  /** Ranglista megjelenő név; null, ha még nem választott. */
  displayName: string | null;
  busy: boolean;
  error: string | null;
  syncError: string | null;
  profileRevision: number;
  trophyIds: string[];

  startListening(): () => void;
  syncPlayerData(): Promise<boolean>;
  saveTrophyIds(trophyIds: string[]): Promise<boolean>;
  claimUsername(raw: string): Promise<string | null>;
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
    await Promise.all([removeBestScores(uid), removeTrophyIds(uid), removePlayerStats(uid)]);
  }

  async function synchronizePlayerData(user: AuthUser) {
    if (authMode !== 'local') {
      await flushQueuedResults(user.uid, () => get().user?.uid === user.uid);
    }
    const scores = await migrateLegacyBestScores(user.uid);
    const trophyIds = await loadTrophyIds(user.uid);

    // Meglévő profil neve, ha érvényes felhasználónév; NEM az email eleje
    let displayName = '';
    if (authMode === 'local') {
      const local = (await loadLocalLeaderboard()).find((entry) => entry.uid === user.uid);
      displayName =
        local?.displayName && isValidUsernameFormat(local.displayName) ? local.displayName : '';
    } else {
      const remote = await loadPlayerProfile(user.uid);
      displayName =
        remote?.displayName && isValidUsernameFormat(remote.displayName) ? remote.displayName : '';
    }

    // Ha a store-ban már van claimelt név (éppen most állította be), azt részesítjük előnyben
    const fromStore = get().displayName;
    if (fromStore && isValidUsernameFormat(fromStore)) {
      displayName = fromStore;
    }

    const profile = createPlayerProfile(user.uid, displayName, scores, trophyIds);
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

  function reportSyncError(error: unknown) {
    log.error('A játékosadatok szinkronizálása nem sikerült', { error });
  }

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
    displayName: null,
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
          displayName: accountChanged ? null : get().displayName,
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
                displayName:
                  profile.displayName && isValidUsernameFormat(profile.displayName)
                    ? profile.displayName
                    : null,
                profileRevision: state.profileRevision + 1,
              }));
            }
          })
          .catch((error: unknown) => {
            reportSyncError(error);
            if (revision === authRevision) {
              set((state) => ({
                syncError: playerSyncError(),
                trophyIds: [],
                displayName: null,
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
          displayName:
            profile.displayName && isValidUsernameFormat(profile.displayName)
              ? profile.displayName
              : state.displayName,
          profileRevision: state.profileRevision + 1,
        }));
        return true;
      } catch (error) {
        reportSyncError(error);
        set({ syncError: playerSyncError() });
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
        set({ syncError: playerSyncError() });
        return false;
      }
    },

    claimUsername: async (raw) => {
      const user = get().user;
      if (!user) return null;
      set({ busy: true, error: null });
      try {
        const name = await claimUsernameService(user.uid, raw);
        set({ displayName: name });
        await get().syncPlayerData();
        return name;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('username.error.saveFailed');
        set({ error: message });
        throw error;
      } finally {
        set({ busy: false });
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
          log.warn('Kijelentkezés előtt nem sikerült elküldeni az eredményeket', { error });
        }
      }
      await getAuthService().signOut();
      try {
        await clearLocalAccountData(user.uid);
      } catch (error) {
        log.warn('A helyi fiókadatok törlése nem sikerült', { error });
      }
      resetAccountStores();
      set((state) => ({
        user: null,
        status: 'signedOut',
        trophyIds: [],
        displayName: null,
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
          await releaseUsernameForUser(user.uid);
          await deletePlayerProfile(user.uid);
        } else {
          await releaseUsernameForUser(user.uid);
          await deleteLocalPlayerProfile(user.uid);
        }
        await getAuthService().deleteAccount();
        await Promise.all([clearLocalAccountData(user.uid), removeQueuedResults(user.uid)]);
        log.info('A fiók törölve', { uid: user.uid });
        resetAccountStores();
        set((state) => ({
          user: null,
          status: 'signedOut',
          trophyIds: [],
          displayName: null,
          syncError: null,
          profileRevision: state.profileRevision + 1,
        }));
      });
    },

    clearError: () => set({ error: null }),
  };
});

// Nyelvváltáskor a már megjelenített hibaüzenet ne maradjon a régi nyelven.
useLocaleStore.subscribe((state, previous) => {
  if (state.locale === previous.locale) return;
  const { error, syncError } = useAuthStore.getState();
  if (error) useAuthStore.setState({ error: null });
  if (syncError) useAuthStore.setState({ syncError: playerSyncError() });
});
