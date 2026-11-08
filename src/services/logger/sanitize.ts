/*
 * A naplóba kerülő adatok tisztítása. Két célja van:
 *  1. Biztonság: jelszó, token, kulcs és hasonló soha ne kerüljön a naplóba, az e-mail-címek
 *     pedig csak maszkolva (pl. „k***@pelda.hu”).
 *  2. Robusztusság: bármilyen értéket (körkörös hivatkozás, hatalmas tömb, kivételt dobó getter)
 *     biztonságosan, JSON-ként kiírható formára hozzon, és közben soha ne dobjon kivételt.
 */

/** Az ilyen nevű kulcsok értéke helyett „[REDACTED]” kerül a naplóba (kis- és nagybetűtől függetlenül). */
const SENSITIVE_KEY =
  /pass(word|wd)?|pwd|secret|token|authorization|cookie|api[-_]?key|credential|session|private[-_]?key/i;

const EMAIL = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;

export const REDACTED = '[REDACTED]';
const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 50;
const MAX_STRING_LENGTH = 1000;
const MAX_CAUSE_DEPTH = 3;

/** Egy hiba naplózható formája. */
export interface SerializedError {
  name: string;
  message: string;
  code?: string;
  stack?: string;
  cause?: SerializedError;
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

/** „kovacs.janos@pelda.hu” → „k***@pelda.hu”. */
export function maskEmails(text: string): string {
  return text.replace(EMAIL, '$1***@$2');
}

function cleanString(text: string): string {
  const masked = maskEmails(text);
  return masked.length > MAX_STRING_LENGTH
    ? `${masked.slice(0, MAX_STRING_LENGTH)}… (+${masked.length - MAX_STRING_LENGTH} karakter)`
    : masked;
}

/** Bármilyen elkapott értékből (Error, szöveg, objektum) naplózható hibaleírás. */
export function serializeError(error: unknown, depth = 0): SerializedError {
  try {
    if (error instanceof Error) {
      const result: SerializedError = {
        name: error.name || 'Error',
        message: cleanString(error.message ?? ''),
      };
      const code = (error as { code?: unknown }).code;
      if (typeof code === 'string' || typeof code === 'number') result.code = String(code);
      if (typeof error.stack === 'string') result.stack = maskEmails(error.stack);
      const cause = (error as { cause?: unknown }).cause;
      if (cause !== undefined && depth < MAX_CAUSE_DEPTH) {
        result.cause = serializeError(cause, depth + 1);
      }
      return result;
    }
    if (typeof error === 'string') return { name: 'Error', message: cleanString(error) };
    return { name: 'NonError', message: cleanString(safeJson(error)) };
  } catch {
    return { name: 'Error', message: '[a hiba nem olvasható]' };
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(sanitizeValue(value)) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Egy tetszőleges érték biztonságos, JSON-ként kiírható másolata. */
export function sanitizeValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  switch (typeof value) {
    case 'string':
      return cleanString(value);
    case 'number':
    case 'boolean':
      return value;
    case 'bigint':
      return value.toString();
    case 'symbol':
      return value.toString();
    case 'function':
      return '[Function]';
  }

  const object = value as object;
  if (object instanceof Error) return serializeError(object);
  if (object instanceof Date) {
    return Number.isNaN(object.getTime()) ? 'Invalid Date' : object.toISOString();
  }
  if (seen.has(object)) return '[Circular]';
  if (depth >= MAX_DEPTH) return Array.isArray(object) ? '[Array]' : '[Object]';
  seen.add(object);

  if (Array.isArray(object)) {
    const items = object
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1, seen));
    if (object.length > MAX_ARRAY_ITEMS) items.push(`… (+${object.length - MAX_ARRAY_ITEMS} elem)`);
    return items;
  }
  return sanitizeRecord(object as Record<string, unknown>, depth, seen);
}

/** Objektum kulcsonkénti tisztítása; a kényes kulcsokat kitakarja, az undefined értékeket elhagyja. */
export function sanitizeRecord(
  record: Record<string, unknown>,
  depth = 0,
  seen = new WeakSet<object>(),
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let keys: string[];
  try {
    keys = Object.keys(record);
  } catch {
    return { value: '[nem olvasható]' };
  }
  for (const key of keys.slice(0, MAX_OBJECT_KEYS)) {
    if (isSensitiveKey(key)) {
      result[key] = REDACTED;
      continue;
    }
    try {
      const item = record[key];
      if (item !== undefined) result[key] = sanitizeValue(item, depth + 1, seen);
    } catch {
      result[key] = '[nem olvasható]';
    }
  }
  if (keys.length > MAX_OBJECT_KEYS) result['…'] = `+${keys.length - MAX_OBJECT_KEYS} kulcs`;
  return result;
}
