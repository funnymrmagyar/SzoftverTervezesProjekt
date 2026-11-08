import { maskEmails, REDACTED, sanitizeRecord, sanitizeValue } from '../sanitize';

describe('adattisztítás', () => {
  it('a kényes kulcsokat kis- és nagybetűtől függetlenül kitakarja', () => {
    expect(
      sanitizeRecord({
        Password: 'x',
        newPassword: 'x',
        refresh_token: 'x',
        Authorization: 'Bearer x',
        sessionId: 'x',
        clientSecret: 'x',
        displayName: 'Csillagnéző',
      }),
    ).toEqual({
      Password: REDACTED,
      newPassword: REDACTED,
      refresh_token: REDACTED,
      Authorization: REDACTED,
      sessionId: REDACTED,
      clientSecret: REDACTED,
      displayName: 'Csillagnéző',
    });
  });

  it('az e-mail-címeket bárhol a szövegben maszkolja', () => {
    expect(maskEmails('a@b.hu és kovacs.janos+x@mail.example.com')).toBe(
      'a***@b.hu és k***@mail.example.com',
    );
    expect(maskEmails('nincs benne cím @ itt')).toBe('nincs benne cím @ itt');
  });

  it('a körkörös hivatkozást és a túl mély szerkezetet biztonságosan kezeli', () => {
    const loop: Record<string, unknown> = { name: 'hurok' };
    loop.self = loop;
    expect(sanitizeValue(loop)).toEqual({ name: 'hurok', self: '[Circular]' });
    const deep = { a: { b: { c: { d: { e: { f: 1 } } } } } };
    expect(sanitizeValue(deep)).toEqual({ a: { b: { c: { d: { e: '[Object]' } } } } });
  });

  it('a hosszú tömböket és szövegeket rövidíti', () => {
    const list = sanitizeValue(Array.from({ length: 25 }, (_, i) => i)) as unknown[];
    expect(list).toHaveLength(21);
    expect(list[20]).toBe('… (+5 elem)');
    const text = sanitizeValue('x'.repeat(1500)) as string;
    expect(text.startsWith('x'.repeat(1000))).toBe(true);
    expect(text.endsWith('(+500 karakter)')).toBe(true);
  });

  it('a nem JSON-képes értékeket olvasható formára hozza', () => {
    expect(sanitizeValue(() => 1)).toBe('[Function]');
    expect(sanitizeValue(BigInt(5))).toBe('5');
    expect(sanitizeValue(new Date(Number.NaN))).toBe('Invalid Date');
    expect(sanitizeValue(new Error('belső'))).toMatchObject({ name: 'Error', message: 'belső' });
  });
});
