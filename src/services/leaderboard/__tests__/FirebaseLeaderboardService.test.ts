import * as firestore from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

import { FirebaseLeaderboardService } from '../FirebaseLeaderboardService';

/*
 * Gyors egységteszt a Firestore-hívások felépítésére (mező, irány, korlát, számlálás).
 * A valódi működést a szabályokkal együtt az emulátoros integrációs teszt ellenőrzi
 * (FirebaseLeaderboardService.integration.test.ts, npm run test:auth).
 */
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, name: string) => ({ collection: name })),
  doc: jest.fn((_db: unknown, name: string, id: string) => ({ doc: `${name}/${id}` })),
  orderBy: jest.fn((field: string, direction: string) => ({ orderBy: [field, direction] })),
  limit: jest.fn((count: number) => ({ limit: count })),
  where: jest.fn((field: string, op: string, value: number) => ({ where: [field, op, value] })),
  query: jest.fn((...parts: unknown[]) => parts),
  onSnapshot: jest.fn(() => jest.fn()),
  getCountFromServer: jest.fn(async () => ({ data: () => ({ count: 7 }) })),
}));

const mocked = jest.mocked(firestore);
const service = new FirebaseLeaderboardService({} as Firestore);

beforeEach(() => jest.clearAllMocks());

describe('FirebaseLeaderboardService: lekérdezések', () => {
  it('összesítve a „points”, játékonként a „scores.<játék>” mező szerint, csökkenően, korláttal', () => {
    service.watchTop('all', 50, jest.fn(), jest.fn());
    expect(mocked.orderBy).toHaveBeenLastCalledWith('points', 'desc');
    expect(mocked.limit).toHaveBeenLastCalledWith(50);

    service.watchTop('star-connection', 10, jest.fn(), jest.fn());
    expect(mocked.orderBy).toHaveBeenLastCalledWith('scores.star-connection', 'desc');
    expect(mocked.collection).toHaveBeenLastCalledWith(expect.anything(), 'leaderboard');
  });

  it('a snapshot dokumentumait ellenőrzött ranglista-bejegyzésekké alakítja', () => {
    const onChange = jest.fn();
    service.watchTop('all', 50, onChange, jest.fn());
    const listener = mocked.onSnapshot.mock.calls[0][1] as unknown as (snapshot: unknown) => void;
    listener({
      docs: [
        {
          id: 'u1',
          data: () => ({ displayName: 'Anna', scores: { 'star-connection': 30 }, trophyCount: 2 }),
        },
        { id: 'u2', data: () => ({ displayName: '', scores: 'hibás', trophyCount: -1 }) },
      ],
    });
    expect(onChange).toHaveBeenCalledWith([
      {
        uid: 'u1',
        displayName: 'Anna',
        scores: { 'star-connection': 30 },
        points: 30,
        trophyCount: 2,
      },
      { uid: 'u2', displayName: 'Csillagnéző', scores: {}, points: 0, trophyCount: 0 },
    ]);
  });

  it('a saját helyezéshez a nála több pontot elérőket számolja meg', async () => {
    expect(await service.countPlayersAhead('belief-guess', 120)).toBe(7);
    expect(mocked.where).toHaveBeenLastCalledWith('scores.belief-guess', '>', 120);
  });

  it('a saját bejegyzést dokumentumként figyeli', () => {
    const onChange = jest.fn();
    service.watchPlayer('u1', onChange, jest.fn());
    expect(mocked.doc).toHaveBeenLastCalledWith(expect.anything(), 'leaderboard', 'u1');
    const listener = mocked.onSnapshot.mock.calls[0][1] as unknown as (snapshot: unknown) => void;
    listener({ exists: () => false });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
