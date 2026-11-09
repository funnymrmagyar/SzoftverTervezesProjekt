import { create } from 'zustand';

import {
  addFriendId,
  compareFriends,
  removeFriendId,
  type AddFriendFailure,
  type FriendSummary,
} from '@/core/models/Friend';
import { authMode } from '@/services/firebase/config';
import { createLogger } from '@/services/logger';
import {
  loadFriendIds,
  loadFriendSummary,
  saveFriendIds,
} from '@/services/player/FirebaseFriendService';
import { useAuthStore } from '@/state/useAuthStore';

const log = createLogger('friends');

/** Ennyi ideig nem kérjük le újra a listát, ha nem kérték kifejezetten (pl. fülváltásnál). */
export const FRIENDS_REFRESH_INTERVAL_MS = 30_000;

export interface FriendEntry {
  uid: string;
  /** `null`, ha a barát adatai már nem érhetők el (törölt fiók). */
  summary: FriendSummary | null;
}

export type FriendsStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';

export const ADD_FRIEND_MESSAGES: Record<AddFriendFailure | 'notFound' | 'network', string> = {
  empty: 'Add meg a barátkódot.',
  self: 'Ez a te saját kódod.',
  duplicate: 'Ő már a barátaid között van.',
  full: 'Elérted a barátok maximális számát.',
  notFound: 'Nincs ilyen játékos. Ellenőrizd a kódot.',
  network: 'A művelet nem sikerült. Ellenőrizd a kapcsolatot, majd próbáld újra.',
};

interface FriendsState {
  ownerUid: string | null;
  friendIds: string[];
  entries: FriendEntry[];
  status: FriendsStatus;
  lastLoadedAt: number | null;
  /** Az utolsó barátfelvétel hibája, magyarul. */
  addError: string | null;

  refresh(options?: { force?: boolean }): Promise<void>;
  addFriend(code: string): Promise<boolean>;
  removeFriend(uid: string): Promise<void>;
  reset(): void;
}

const INITIAL = {
  ownerUid: null,
  friendIds: [] as string[],
  entries: [] as FriendEntry[],
  status: 'idle' as FriendsStatus,
  lastLoadedAt: null as number | null,
  addError: null as string | null,
};

function sortEntries(entries: FriendEntry[]): FriendEntry[] {
  return [...entries].sort((a, b) => {
    if (a.summary && b.summary) return compareFriends(a.summary, b.summary);
    if (a.summary) return -1;
    if (b.summary) return 1;
    return a.uid.localeCompare(b.uid);
  });
}

async function loadEntries(friendIds: string[]): Promise<FriendEntry[]> {
  const entries = await Promise.all(
    friendIds.map(async (uid) => ({ uid, summary: await loadFriendSummary(uid) })),
  );
  return sortEntries(entries);
}

export const useFriendsStore = create<FriendsState>((set, get) => {
  /** A bejelentkezett felhasználó azonosítója, vagy `null`, ha nincs fiók / nincs online mód. */
  function activeUid(): string | null {
    return authMode === 'local' ? null : (useAuthStore.getState().user?.uid ?? null);
  }

  /** Fiókváltás esetén eldobja az előző fiók barátlistáját. */
  function ensureOwner(uid: string) {
    if (get().ownerUid !== uid) set({ ...INITIAL, ownerUid: uid });
  }

  return {
    ...INITIAL,

    refresh: async ({ force = false } = {}) => {
      const uid = activeUid();
      if (!uid) {
        set({ ...INITIAL, status: authMode === 'local' ? 'unavailable' : 'idle' });
        return;
      }
      ensureOwner(uid);
      const { status, lastLoadedAt } = get();
      if (status === 'loading') return;
      if (
        !force &&
        status === 'ready' &&
        lastLoadedAt !== null &&
        Date.now() - lastLoadedAt < FRIENDS_REFRESH_INTERVAL_MS
      ) {
        return;
      }

      set({ status: 'loading' });
      try {
        const friendIds = await loadFriendIds(uid);
        const entries = await loadEntries(friendIds);
        if (get().ownerUid !== uid) return;
        set({ friendIds, entries, status: 'ready', lastLoadedAt: Date.now() });
      } catch (error) {
        log.warn('A barátlista betöltése nem sikerült', { error });
        if (get().ownerUid === uid) set({ status: 'error' });
      }
    },

    addFriend: async (code) => {
      const uid = activeUid();
      if (!uid) return false;
      ensureOwner(uid);
      set({ addError: null });

      const result = addFriendId(get().friendIds, code, uid);
      if (!result.ok) {
        set({ addError: ADD_FRIEND_MESSAGES[result.reason] });
        return false;
      }
      const friendId = code.trim();
      try {
        const summary = await loadFriendSummary(friendId);
        if (!summary) {
          set({ addError: ADD_FRIEND_MESSAGES.notFound });
          return false;
        }
        await saveFriendIds(uid, result.friendIds);
        if (get().ownerUid !== uid) return false;
        set((state) => ({
          friendIds: result.friendIds,
          entries: sortEntries([...state.entries, { uid: friendId, summary }]),
          status: 'ready',
          lastLoadedAt: state.lastLoadedAt ?? Date.now(),
        }));
        return true;
      } catch (error) {
        log.warn('A barát felvétele nem sikerült', { error });
        set({ addError: ADD_FRIEND_MESSAGES.network });
        return false;
      }
    },

    removeFriend: async (friendId) => {
      const uid = activeUid();
      if (!uid) return;
      ensureOwner(uid);
      const friendIds = removeFriendId(get().friendIds, friendId);
      try {
        await saveFriendIds(uid, friendIds);
        if (get().ownerUid !== uid) return;
        set((state) => ({
          friendIds,
          entries: state.entries.filter((entry) => entry.uid !== friendId),
        }));
      } catch (error) {
        log.warn('A barát eltávolítása nem sikerült', { error });
        set({ addError: ADD_FRIEND_MESSAGES.network });
      }
    },

    reset: () => set({ ...INITIAL }),
  };
});
