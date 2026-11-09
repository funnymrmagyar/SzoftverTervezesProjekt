/**
 * Integrációs teszt a valódi Firestore emulátor és a valódi firestore.rules ellen.
 * Futtatás:  npm run test:auth   (elindítja az Auth és a Firestore emulátort, lefuttatja, leállítja)
 */
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
  terminate,
  type Firestore,
} from 'firebase/firestore';

import { authEmulatorUrl, DEMO_API_KEY, DEMO_PROJECT_ID, env } from '@/config/env';
import {
  totalPlayerPoints,
  type LeaderboardPlayer,
  type PlayerScores,
} from '@/core/models/PlayerProfile';

import { FirebaseLeaderboardService } from '../FirebaseLeaderboardService';

const AUTH_URL = process.env.FIREBASE_AUTH_EMULATOR_HOST
  ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`
  : authEmulatorUrl();
const [FIRESTORE_HOST, FIRESTORE_PORT] = (
  process.env.FIRESTORE_EMULATOR_HOST ?? `127.0.0.1:${env.emulator.firestorePort}`
).split(':');

describe('FirebaseLeaderboardService (Firestore emulátor)', () => {
  let app: FirebaseApp;
  let auth: Auth;
  let db: Firestore;
  let service: FirebaseLeaderboardService;
  const run = Date.now();
  const uids: Record<string, string> = {};

  /** Bejelentkezik a játékos nevében, és a szabályok szerint a saját bejegyzését írja. */
  async function publish(name: string, scores: PlayerScores) {
    if (!uids[name]) {
      const credential = await createUserWithEmailAndPassword(
        auth,
        `${name}-${run}@example.com`,
        'titkos123',
      );
      uids[name] = credential.user.uid;
    } else {
      await signInWithEmailAndPassword(auth, `${name}-${run}@example.com`, 'titkos123');
    }
    await setDoc(doc(db, 'leaderboard', uids[name]), {
      uid: uids[name],
      displayName: name,
      scores,
      points: totalPlayerPoints(scores),
      trophyCount: 0,
      updatedAt: serverTimestamp(),
    });
    await signOut(auth);
  }

  /** Feliratkozik, és megvárja az első olyan listát, amelyre a feltétel teljesül. */
  function waitForTop(
    scope: Parameters<FirebaseLeaderboardService['watchTop']>[0],
    predicate: (players: LeaderboardPlayer[]) => boolean,
  ): Promise<LeaderboardPlayer[]> {
    return new Promise((resolve, reject) => {
      const stop = service.watchTop(
        scope,
        50,
        (players) => {
          if (predicate(players)) {
            stop();
            resolve(players);
          }
        },
        reject,
      );
    });
  }

  beforeAll(async () => {
    app = initializeApp({ apiKey: DEMO_API_KEY, projectId: DEMO_PROJECT_ID }, 'leaderboard');
    auth = getAuth(app);
    connectAuthEmulator(auth, AUTH_URL, { disableWarnings: true });
    db = getFirestore(app);
    connectFirestoreEmulator(db, FIRESTORE_HOST, Number(FIRESTORE_PORT));
    service = new FirebaseLeaderboardService(db);

    await publish('anna', { 'constellation-finder': 300, 'star-connection': 100 });
    await publish('bela', { 'star-connection': 500 });
    await publish('cili', { 'belief-guess': 150 });
  });

  afterAll(async () => {
    await terminate(db);
    await deleteApp(app);
  });

  it('a ranglista bejelentkezés nélkül is olvasható, pontszám szerint csökkenő sorrendben', async () => {
    const top = await waitForTop('all', (players) => players.length >= 3);
    expect(top.map((p) => [p.displayName, p.points])).toEqual([
      ['bela', 500],
      ['anna', 400],
      ['cili', 150],
    ]);
  });

  it('játékonként a „scores.<játék>” mező szerint rendez, és csak az abban játszókat adja', async () => {
    const top = await waitForTop('constellation-finder', (players) => players.length >= 1);
    expect(top.map((p) => p.displayName)).toEqual(['anna']);
  });

  it('megszámolja, hányan vannak előttünk (a listán kívüli saját helyezéshez)', async () => {
    expect(await service.countPlayersAhead('all', 150)).toBe(2);
    expect(await service.countPlayersAhead('all', 500)).toBe(0);
    expect(await service.countPlayersAhead('star-connection', 100)).toBe(1);
  });

  it('élő: ha valaki új pontot szerez, a lista magától frissül', async () => {
    const updated = waitForTop('all', (players) => players[0]?.displayName === 'cili');
    await publish('cili', { 'belief-guess': 900 });
    const top = await updated;
    expect(top.map((p) => p.displayName)).toEqual(['cili', 'bela', 'anna']);

    const mine = await new Promise<LeaderboardPlayer | null>((resolve, reject) => {
      const stop = service.watchPlayer(
        uids.cili,
        (player) => {
          stop();
          resolve(player);
        },
        reject,
      );
    });
    expect(mine?.points).toBe(900);
  });

  it('más játékos bejegyzését a szabályok nem engedik írni', async () => {
    await signInWithEmailAndPassword(auth, `anna-${run}@example.com`, 'titkos123');
    await expect(
      setDoc(doc(db, 'leaderboard', uids.bela), {
        uid: uids.bela,
        displayName: 'bela',
        scores: { 'star-connection': 1 },
        points: 1,
        trophyCount: 0,
        updatedAt: serverTimestamp(),
      }),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    await signOut(auth);
  });
});
