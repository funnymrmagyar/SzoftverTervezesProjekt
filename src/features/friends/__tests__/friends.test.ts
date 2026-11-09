import {
  MAX_FRIENDS,
  addFriendId,
  compareFriends,
  parseFriendIds,
  removeFriendId,
  summarizeFriend,
} from '@/core/models/Friend';
import {
  loadFriendIds,
  loadFriendSummary,
  saveFriendIds,
} from '@/services/player/FirebaseFriendService';
import { useAuthStore } from '@/state/useAuthStore';
import { FRIENDS_REFRESH_INTERVAL_MS, useFriendsStore } from '../useFriendsStore';

jest.mock('@/services/firebase/config', () => ({ authMode: 'firebase' }));
jest.mock('@/state/useAuthStore', () => ({ useAuthStore: { getState: jest.fn() } }));
jest.mock('@/services/player/FirebaseFriendService', () => ({
  loadFriendIds: jest.fn(),
  saveFriendIds: jest.fn(),
  loadFriendSummary: jest.fn(),
}));

describe('barát-modell', () => {
  it('a barátkód hozzáadása ellenőrzi a bemenetet', () => {
    expect(addFriendId(['a'], '  b ', 'me')).toEqual({ ok: true, friendIds: ['a', 'b'] });
    expect(addFriendId([], '   ', 'me')).toEqual({ ok: false, reason: 'empty' });
    expect(addFriendId([], 'me', 'me')).toEqual({ ok: false, reason: 'self' });
    expect(addFriendId(['a'], 'a', 'me')).toEqual({ ok: false, reason: 'duplicate' });
    const full = Array.from({ length: MAX_FRIENDS }, (_, i) => `u${i}`);
    expect(addFriendId(full, 'új', 'me')).toEqual({ ok: false, reason: 'full' });
  });

  it('eltávolítás és beolvasás hibatűrő', () => {
    expect(removeFriendId(['a', 'b'], 'a')).toEqual(['b']);
    expect(parseFriendIds({ friendIds: ['a', 'a', 5, '', 'b'] })).toEqual(['a', 'b']);
    expect(parseFriendIds(null)).toEqual([]);
    expect(parseFriendIds({ friendIds: 'nem lista' })).toEqual([]);
  });

  it('az összpont a pontszámokból számolódik, a hibás mezők kimaradnak', () => {
    const summary = summarizeFriend(
      {
        displayName: 'Anna',
        scores: { 'belief-guess': 100, 'star-connection': 50, ismeretlen: 9 },
        points: 99999,
        trophyCount: 3,
      },
      'u1',
    );
    expect(summary).toEqual({
      uid: 'u1',
      displayName: 'Anna',
      points: 150,
      scores: { 'belief-guess': 100, 'star-connection': 50 },
      trophyCount: 3,
    });
    expect(summarizeFriend({ trophyCount: -2 }, 'u2')).toMatchObject({
      displayName: 'Csillagnéző',
      trophyCount: 0,
      points: 0,
    });
  });

  it('pont szerint csökkenő, azonos pontnál név szerinti sorrend', () => {
    const make = (displayName: string, points: number) => ({
      uid: displayName,
      displayName,
      points,
      scores: {},
      trophyCount: 0,
    });
    const sorted = [make('Béla', 10), make('Anna', 10), make('Cili', 50)].sort(compareFriends);
    expect(sorted.map((f) => f.displayName)).toEqual(['Cili', 'Anna', 'Béla']);
  });
});

describe('useFriendsStore', () => {
  const getState = jest.mocked(useAuthStore.getState);
  const loadIds = jest.mocked(loadFriendIds);
  const saveIds = jest.mocked(saveFriendIds);
  const loadSummary = jest.mocked(loadFriendSummary);
  const summary = (uid: string, points: number) => ({
    uid,
    displayName: uid.toUpperCase(),
    points,
    scores: {},
    trophyCount: 0,
  });

  function signIn(uid: string) {
    getState.mockReturnValue({ user: { uid } } as ReturnType<typeof useAuthStore.getState>);
  }

  beforeEach(() => {
    jest.useRealTimers();
    useFriendsStore.getState().reset();
    loadIds.mockReset();
    saveIds.mockReset().mockResolvedValue();
    loadSummary.mockReset();
    signIn('me');
  });

  it('betölti és rendezi a barátokat, a törölt fiókot jelzi', async () => {
    loadIds.mockResolvedValue(['a', 'b', 'gone']);
    loadSummary.mockImplementation(async (uid) =>
      uid === 'a' ? summary('a', 10) : uid === 'b' ? summary('b', 90) : null,
    );

    await useFriendsStore.getState().refresh();

    const { entries, status } = useFriendsStore.getState();
    expect(status).toBe('ready');
    expect(entries.map((e) => e.uid)).toEqual(['b', 'a', 'gone']);
    expect(entries[2].summary).toBeNull();
  });

  it('rövid időn belül nem kér le újra, kényszerítve igen', async () => {
    jest.useFakeTimers();
    loadIds.mockResolvedValue([]);

    await useFriendsStore.getState().refresh();
    await useFriendsStore.getState().refresh();
    expect(loadIds).toHaveBeenCalledTimes(1);

    await useFriendsStore.getState().refresh({ force: true });
    expect(loadIds).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(FRIENDS_REFRESH_INTERVAL_MS + 1);
    await useFriendsStore.getState().refresh();
    expect(loadIds).toHaveBeenCalledTimes(3);
  });

  it('hálózati hibánál error állapotba kerül', async () => {
    loadIds.mockRejectedValue(new Error('offline'));
    await useFriendsStore.getState().refresh();
    expect(useFriendsStore.getState().status).toBe('error');
  });

  it('barát felvétele: létező kódra ment, ismeretlenre hibát jelez', async () => {
    loadIds.mockResolvedValue([]);
    await useFriendsStore.getState().refresh();

    loadSummary.mockResolvedValueOnce(null);
    expect(await useFriendsStore.getState().addFriend('nincs')).toBe(false);
    expect(useFriendsStore.getState().addError).toContain('Nincs ilyen játékos');
    expect(saveIds).not.toHaveBeenCalled();

    loadSummary.mockResolvedValueOnce(summary('x', 40));
    expect(await useFriendsStore.getState().addFriend(' x ')).toBe(true);
    expect(saveIds).toHaveBeenCalledWith('me', ['x']);
    expect(useFriendsStore.getState().entries.map((e) => e.uid)).toEqual(['x']);
    expect(useFriendsStore.getState().addError).toBeNull();
  });

  it('saját kódot és duplikátumot elutasít mentés nélkül', async () => {
    loadIds.mockResolvedValue(['x']);
    loadSummary.mockResolvedValue(summary('x', 1));
    await useFriendsStore.getState().refresh();

    expect(await useFriendsStore.getState().addFriend('me')).toBe(false);
    expect(await useFriendsStore.getState().addFriend('x')).toBe(false);
    expect(saveIds).not.toHaveBeenCalled();
  });

  it('eltávolításkor menti a listát', async () => {
    loadIds.mockResolvedValue(['a', 'b']);
    loadSummary.mockImplementation(async (uid) => summary(uid, 1));
    await useFriendsStore.getState().refresh();

    await useFriendsStore.getState().removeFriend('a');
    expect(saveIds).toHaveBeenCalledWith('me', ['b']);
    expect(useFriendsStore.getState().entries.map((e) => e.uid)).toEqual(['b']);
  });

  it('fiókváltáskor nem marad meg az előző fiók listája', async () => {
    loadIds.mockResolvedValueOnce(['a']);
    loadSummary.mockResolvedValue(summary('a', 1));
    await useFriendsStore.getState().refresh();

    signIn('other');
    loadIds.mockResolvedValueOnce([]);
    await useFriendsStore.getState().refresh();

    expect(useFriendsStore.getState().entries).toEqual([]);
    expect(useFriendsStore.getState().ownerUid).toBe('other');
  });
});
