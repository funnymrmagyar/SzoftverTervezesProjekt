import { LocalAuthService, type KeyValueStorage } from '../LocalAuthService';

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => void map.set(k, v),
  };
}

describe('LocalAuthService (Firebase nélküli mód)', () => {
  it('regisztrál, kijelentkezik, majd újra bejelentkezik', async () => {
    const service = new LocalAuthService(memoryStorage());
    const user = await service.register('Anna@Example.com ', 'titok123');
    expect(user.email).toBe('anna@example.com');
    await service.signOut();
    const again = await service.signIn('anna@example.com', 'titok123');
    expect(again.uid).toBe(user.uid);
  });

  it('az első értéket a betöltés után adja a feliratkozónak', async () => {
    const service = new LocalAuthService(memoryStorage());
    const seen: (string | null)[] = [];
    service.onAuthChanged((u) => seen.push(u?.email ?? null));
    await service.register('b@example.com', 'titok123');
    await service.signOut();
    expect(seen).toEqual([null, 'b@example.com', null]);
  });

  it('újraindítás után (új példány, ugyanaz a tároló) emlékszik a bejelentkezésre', async () => {
    const storage = memoryStorage();
    await new LocalAuthService(storage).register('c@example.com', 'titok123');
    const restarted = new LocalAuthService(storage);
    const seen: (string | null)[] = [];
    restarted.onAuthChanged((u) => seen.push(u?.email ?? null));
    await new Promise((r) => setTimeout(r, 0));
    expect(seen).toEqual(['c@example.com']);
  });

  it('ugyanazokat a magyar hibákat adja, mint a Firebase', async () => {
    const service = new LocalAuthService(memoryStorage());
    await service.register('d@example.com', 'titok123');
    await expect(service.register('d@example.com', 'másik123')).rejects.toMatchObject({
      code: 'auth/email-already-in-use',
    });
    await expect(service.register('e@example.com', '123')).rejects.toMatchObject({
      code: 'auth/weak-password',
    });
    await expect(service.signIn('d@example.com', 'rossz')).rejects.toMatchObject({
      code: 'auth/invalid-credential',
    });
  });

  it('sérült tárolóval is elindul', async () => {
    const storage = memoryStorage();
    await storage.setItem('csillagnezo.local-auth.v1', '{nem json');
    const service = new LocalAuthService(storage);
    await expect(service.register('f@example.com', 'titok123')).resolves.toBeDefined();
  });
});
