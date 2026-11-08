import { reportRenderError } from '@/ui/AppErrorBoundary';

import { configureLogger, createLogger, type LogEntry, type LoggerConfig } from '..';
import {
  installNativeHandlers,
  installWebHandlers,
  type ErrorUtilsLike,
  type HermesLike,
} from '../globalErrorHandlers';

let entries: LogEntry[];
let previous: LoggerConfig;

beforeEach(() => {
  entries = [];
  previous = configureLogger({ level: 'debug', transports: [(entry) => entries.push(entry)] });
});

afterEach(() => configureLogger(previous));

function errorEvent(error: unknown) {
  return Object.assign(new Event('error'), { error, filename: 'app.js', lineno: 3, colno: 7 });
}

function rejectionEvent(reason: unknown) {
  return Object.assign(new Event('unhandledrejection'), { reason });
}

describe('globális hibák: böngésző', () => {
  it('a kezeletlen hibát és Promise-elutasítást naplózza, leiratkozás után már nem', () => {
    const target = new EventTarget();
    const uninstall = installWebHandlers(target);

    target.dispatchEvent(errorEvent(new Error('elszállt')));
    target.dispatchEvent(rejectionEvent(new Error('elutasítva')));
    expect(entries).toEqual([
      expect.objectContaining({
        level: 'error',
        source: 'global',
        message: 'Kezeletlen hiba',
        data: { file: 'app.js', line: 3, column: 7 },
        error: expect.objectContaining({ message: 'elszállt' }),
      }),
      expect.objectContaining({
        message: 'Kezeletlen Promise-elutasítás',
        error: expect.objectContaining({ message: 'elutasítva' }),
      }),
    ]);

    uninstall();
    target.dispatchEvent(errorEvent(new Error('később')));
    expect(entries).toHaveLength(2);
  });

  it('a máshol már naplózott hibát nem írja ki újra', () => {
    const target = new EventTarget();
    const uninstall = installWebHandlers(target);
    const error = new Error('egyszer');
    createLogger('player').error('A szinkronizálás nem sikerült', { error });
    target.dispatchEvent(rejectionEvent(error));
    expect(entries.map((e) => e.message)).toEqual(['A szinkronizálás nem sikerült']);
    uninstall();
  });
});

describe('globális hibák: Android/iOS', () => {
  function fakeErrorUtils(original: jest.Mock): ErrorUtilsLike & { current: jest.Mock | unknown } {
    const utils = {
      current: original as unknown,
      getGlobalHandler: () => utils.current as never,
      setGlobalHandler: (handler: unknown) => {
        utils.current = handler;
      },
    };
    return utils;
  }

  it('a React Native hibakezelőjét kiegészíti: naplóz, majd az eredetit is meghívja', () => {
    const original = jest.fn();
    const errorUtils = fakeErrorUtils(original);
    const uninstall = installNativeHandlers(errorUtils);
    const error = new Error('végzetes');

    (errorUtils.current as (error: unknown, fatal?: boolean) => void)(error, true);
    expect(entries[0]).toMatchObject({
      message: 'Végzetes kezeletlen hiba',
      data: { fatal: true },
      error: { message: 'végzetes' },
    });
    expect(original).toHaveBeenCalledWith(error, true);

    uninstall();
    expect(errorUtils.current).toBe(original);
  });

  it('a Hermes kezeletlen Promise-elutasításait naplózza', () => {
    let options:
      Parameters<NonNullable<HermesLike['enablePromiseRejectionTracker']>>[0] | undefined;
    installNativeHandlers(undefined, { enablePromiseRejectionTracker: (o) => (options = o) });
    expect(options?.allRejections).toBe(true);
    options?.onUnhandled(1, new Error('elutasítva'));
    expect(entries[0]).toMatchObject({
      message: 'Kezeletlen Promise-elutasítás',
      error: { message: 'elutasítva' },
    });
  });

  it('akkor sem dob, ha a logger kimenete hibás', () => {
    configureLogger({
      transports: [
        () => {
          throw new Error('kimenet');
        },
      ],
    });
    const original = jest.fn();
    const errorUtils = fakeErrorUtils(original);
    installNativeHandlers(errorUtils);
    expect(() => (errorUtils.current as (e: unknown) => void)(new Error('x'))).not.toThrow();
    expect(original).toHaveBeenCalled();
  });
});

describe('renderelési hibák (ErrorBoundary)', () => {
  it('egy hibát csak egyszer naplóz, akkor is, ha többször renderelődik', () => {
    const error = new Error('render');
    reportRenderError(error);
    reportRenderError(error);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: 'error',
      message: 'Hiba a képernyő megjelenítésekor',
      error: { message: 'render' },
    });
  });
});
