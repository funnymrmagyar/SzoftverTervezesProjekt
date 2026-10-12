/**
 * Integrációs teszt a valódi Firebase Auth emulátor ellen.
 * Futtatás:  npm run test:auth   (elindítja az emulátort, lefuttatja, leállítja)
 */
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

import { FirebaseAuthService } from '../FirebaseAuthService';

const EMULATOR = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';

describe('FirebaseAuthService (Auth emulátor)', () => {
  let app: FirebaseApp;
  let service: FirebaseAuthService;
  const email = `teszt-${Date.now()}@example.com`;

  beforeAll(() => {
    app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-csillagnezo' }, 'integration');
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${EMULATOR}`, { disableWarnings: true });
    service = new FirebaseAuthService(auth);
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  it('regisztrál, kijelentkezik, majd újra bejelentkezik', async () => {
    const changes: (string | null)[] = [];
    const unsubscribe = service.onAuthChanged((u) => changes.push(u?.email ?? null));

    const created = await service.register(email, 'titok123');
    expect(created.email).toBe(email);

    await service.signOut();
    const signedIn = await service.signIn(email, 'titok123');
    expect(signedIn.uid).toBe(created.uid);

    unsubscribe();
    expect(changes).toContain(email);
    expect(changes).toContain(null);
  });

  it('hibás jelszóra magyar hibaüzenetet dob', async () => {
    // Az emulátor „wrong-password”, az éles Firebase „invalid-credential” kódot ad
    // (e-mail-felderítés elleni védelem) — az üzenet mindkettőnél ugyanaz.
    await expect(service.signIn(email, 'rossz-jelszo')).rejects.toMatchObject({
      message: 'Hibás e-mail-cím vagy jelszó.',
    });
  });

  it('foglalt e-mail-címre nem enged regisztrálni', async () => {
    await expect(service.register(email, 'masik123')).rejects.toMatchObject({
      code: 'auth/email-already-in-use',
    });
  });
});
