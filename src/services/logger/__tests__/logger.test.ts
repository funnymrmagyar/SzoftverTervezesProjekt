import { resolveLogConfig } from '@/config/env';

import {
  configureLogger,
  createConsoleTransport,
  createLogger,
  logger,
  wasLogged,
  type LogEntry,
  type LoggerConfig,
} from '..';

let entries: LogEntry[];
let previous: LoggerConfig;

beforeEach(() => {
  entries = [];
  previous = configureLogger({ level: 'debug', transports: [(entry) => entries.push(entry)] });
});

afterEach(() => {
  configureLogger(previous);
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('logger: metódusok és formátum', () => {
  it('mind a négy metódus a saját szintjével, időbélyeggel és forrással ír', () => {
    jest.useFakeTimers({ now: new Date('2026-11-08T15:04:05.123Z') });
    const log = createLogger('auth');
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(entries.map((e) => e.level)).toEqual(['debug', 'info', 'warn', 'error']);
    expect(entries[1]).toEqual({
      timestamp: '2026-11-08T15:04:05.123Z',
      level: 'info',
      message: 'i',
      source: 'auth',
    });
  });

  it('a közös logger forrás nélkül ír', () => {
    logger.info('Indulás');
    expect(entries[0].source).toBeUndefined();
  });

  it('a kiegészítő adatok strukturáltan, a data mezőbe kerülnek', () => {
    const when = new Date('2026-01-02T03:04:05Z');
    logger.info('Eredmény elküldve', {
      game: 'star-connection',
      score: 42,
      when,
      nothing: undefined,
    });
    expect(entries[0].data).toEqual({
      game: 'star-connection',
      score: 42,
      when: '2026-01-02T03:04:05.000Z',
    });
  });

  it('adat nélkül nincs data mező', () => {
    logger.warn('Csak üzenet', {});
    expect(entries[0]).not.toHaveProperty('data');
  });
});

describe('logger: szintek szerinti szűrés', () => {
  it('a beállított szint alatti bejegyzések nem jelennek meg', () => {
    configureLogger({ level: 'warn' });
    logger.debug('nem');
    logger.info('nem');
    logger.warn('igen');
    logger.error('igen');
    expect(entries.map((e) => e.level)).toEqual(['warn', 'error']);
  });

  it('„silent” szinten semmi nem jelenik meg', () => {
    configureLogger({ level: 'silent' });
    logger.error('nem');
    expect(entries).toHaveLength(0);
  });
});

describe('logger: környezetfüggő beállítás', () => {
  it('fejlesztésben minden szint, olvasható formában', () => {
    expect(resolveLogConfig('development', undefined)).toEqual({
      level: 'debug',
      format: 'pretty',
    });
  });

  it('éles buildben csak warn és error, JSON-ban', () => {
    expect(resolveLogConfig('production', undefined)).toEqual({ level: 'warn', format: 'json' });
  });

  it('tesztben csend', () => {
    expect(resolveLogConfig('test', undefined).level).toBe('silent');
  });

  it('az EXPO_PUBLIC_LOG_LEVEL felülírja a szintet, a formátumot nem', () => {
    expect(resolveLogConfig('production', ' Debug ')).toEqual({ level: 'debug', format: 'json' });
  });

  it('érvénytelen szintnél az alapérték marad, és figyelmeztetés készül', () => {
    jest.isolateModules(() => {
      const env = jest.requireActual<typeof import('@/config/env')>('@/config/env');
      const before = env.configWarnings.length;
      expect(env.resolveLogConfig('development', 'hangos').level).toBe('debug');
      expect(env.configWarnings.slice(before)).toEqual([
        expect.objectContaining({ message: 'Érvénytelen naplózási szint a .env-ben' }),
      ]);
    });
  });
});

describe('logger: hibák', () => {
  it('a hibát a nevével, üzenetével, kódjával és stack trace-ével együtt bontja ki', () => {
    const error = Object.assign(new TypeError('nem jó'), { code: 'auth/network-request-failed' });
    logger.error('Bejelentkezés: váratlan hiba', { error, attempt: 2 });
    const [entry] = entries;
    expect(entry.data).toEqual({ attempt: 2 });
    expect(entry.error).toMatchObject({
      name: 'TypeError',
      message: 'nem jó',
      code: 'auth/network-request-failed',
    });
    expect(entry.error?.stack).toContain('TypeError: nem jó');
  });

  it('a hiba okát (cause) is kibontja', () => {
    const error = new Error('külső', { cause: new Error('belső') });
    logger.error('x', { error });
    expect(entries[0].error?.cause).toMatchObject({ name: 'Error', message: 'belső' });
  });

  it('nem Error típusú dobott értéket is kezel', () => {
    logger.error('szöveg', { error: 'valami elromlott' });
    logger.error('objektum', { error: { status: 500 } });
    expect(entries[0].error).toEqual({ name: 'Error', message: 'valami elromlott' });
    expect(entries[1].error).toEqual({ name: 'NonError', message: '{"status":500}' });
  });

  it('megjegyzi a már naplózott hibát, hogy a globális kezelők ne írják ki újra', () => {
    const error = new Error('egyszer');
    expect(wasLogged(error)).toBe(false);
    logger.warn('x', { error });
    expect(wasLogged(error)).toBe(true);
  });
});

describe('logger: kényes adatok', () => {
  it('jelszót, tokent és kulcsot soha nem ír ki, az e-mail-címet maszkolja', () => {
    logger.info('Bejelentkezés', {
      email: 'kovacs.janos@pelda.hu',
      password: 'titkos123',
      nested: { idToken: 'abc', apiKey: 'xyz', uid: 'u1' },
    });
    expect(entries[0].data).toEqual({
      email: 'k***@pelda.hu',
      password: '[REDACTED]',
      nested: { idToken: '[REDACTED]', apiKey: '[REDACTED]', uid: 'u1' },
    });
  });

  it('az üzenetben és a hibaüzenetben lévő e-mail-címet is maszkolja', () => {
    logger.error('Hiba: kovacs@pelda.hu', { error: new Error('foglalt: kovacs@pelda.hu') });
    expect(entries[0].message).toBe('Hiba: k***@pelda.hu');
    expect(entries[0].error?.message).toBe('foglalt: k***@pelda.hu');
  });
});

describe('logger: a naplózás hibája nem állítja meg az appot', () => {
  it('ha egy kimenet hibát dob, a logger nem dob, és a többi kimenet megkapja a bejegyzést', () => {
    const received: LogEntry[] = [];
    configureLogger({
      transports: [
        () => {
          throw new Error('a kimenet elszállt');
        },
        (entry) => received.push(entry),
      ],
    });
    expect(() => logger.error('x')).not.toThrow();
    expect(received).toHaveLength(1);
  });

  it('kivételt dobó adatokkal sem dob', () => {
    const tricky = Object.defineProperty({}, 'boom', {
      enumerable: true,
      get() {
        throw new Error('getter');
      },
    });
    expect(() => logger.info('x', { tricky })).not.toThrow();
    expect(entries[0].data).toEqual({ tricky: { boom: '[nem olvasható]' } });
  });

  it('ha maga a konzol dob, a konzolos kimenet sem állítja meg a loggert', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('nincs konzol');
    });
    configureLogger({ transports: [createConsoleTransport('pretty')] });
    expect(() => logger.error('x')).not.toThrow();
  });
});

describe('konzolos kimenet', () => {
  const entry: LogEntry = {
    timestamp: '2026-11-08T15:04:05.123Z',
    level: 'warn',
    message: 'Lassú válasz',
    source: 'player',
    data: { ms: 3500 },
  };

  it('fejlesztésben olvasható sort ír, az adatokat objektumként mellé', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    createConsoleTransport('pretty')(entry);
    expect(warn).toHaveBeenCalledWith('15:04:05.123 WARN [player] Lassú válasz', { ms: 3500 });
  });

  it('élesben a teljes bejegyzést egy JSON-sorként írja', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    createConsoleTransport('json')(entry);
    expect(JSON.parse(warn.mock.calls[0][0] as string)).toEqual(entry);
  });
});
