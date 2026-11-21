import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

import { normalizeUsernameKey, sanitizeUsername } from '@/core/username';
import { authMode } from '@/services/firebase/config';
import { getFirebaseFirestore } from '@/services/firebase/firestore';
import { createLogger } from '@/services/logger';
import { t } from '@/ui/i18n';

const log = createLogger('username');
const LOCAL_KEY = 'csillagnezo.usernames.v1';

export class UsernameTakenError extends Error {
  constructor() {
    super(t('username.error.taken'));
    this.name = 'UsernameTakenError';
  }
}

export class UsernameInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsernameInvalidError';
  }
}

type LocalRegistry = Record<string, string>; // normalized -> uid

async function readLocalRegistry(): Promise<LocalRegistry> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: LocalRegistry = {};
    for (const [key, uid] of Object.entries(parsed)) {
      if (typeof uid === 'string') out[key] = uid;
    }
    return out;
  } catch {
    return {};
  }
}

async function writeLocalRegistry(registry: LocalRegistry): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(registry));
}

/** Lefoglalja a nevet az adott uid-nak. Siker esetén a megjelenítendő nevet adja vissza. */
export async function claimUsername(uid: string, rawName: string): Promise<string> {
  const displayName = sanitizeUsername(rawName);
  if (!displayName) {
    throw new UsernameInvalidError(t('username.error.invalid'));
  }
  const key = normalizeUsernameKey(displayName);

  if (authMode === 'local') {
    const registry = await readLocalRegistry();
    const owner = registry[key];
    if (owner && owner !== uid) throw new UsernameTakenError();
    // Régi név felszabadítása ugyanazon uid-nál
    for (const [k, ownerUid] of Object.entries(registry)) {
      if (ownerUid === uid && k !== key) delete registry[k];
    }
    registry[key] = uid;
    await writeLocalRegistry(registry);
    return displayName;
  }

  const db = getFirebaseFirestore();
  const nameRef = doc(db, 'usernames', key);
  const userRef = doc(db, 'users', uid);

  try {
    await runTransaction(db, async (transaction) => {
      const nameSnap = await transaction.get(nameRef);
      if (nameSnap.exists()) {
        const data = nameSnap.data() as { uid?: string };
        if (data.uid && data.uid !== uid) throw new UsernameTakenError();
      }

      const userSnap = await transaction.get(userRef);
      const prevKey =
        userSnap.exists() && typeof userSnap.data()?.usernameKey === 'string'
          ? (userSnap.data()!.usernameKey as string)
          : null;

      if (prevKey && prevKey !== key) {
        const prevRef = doc(db, 'usernames', prevKey);
        const prevSnap = await transaction.get(prevRef);
        if (prevSnap.exists() && (prevSnap.data() as { uid?: string }).uid === uid) {
          transaction.delete(prevRef);
        }
      }

      transaction.set(nameRef, {
        uid,
        displayName,
        createdAt: serverTimestamp(),
      });
      transaction.set(
        userRef,
        {
          displayName,
          usernameKey: key,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
  } catch (error) {
    if (error instanceof UsernameTakenError) throw error;
    log.warn('Felhasználónév foglalása sikertelen', { error });
    throw error;
  }

  return displayName;
}

export async function releaseUsernameForUser(uid: string): Promise<void> {
  if (authMode === 'local') {
    const registry = await readLocalRegistry();
    let changed = false;
    for (const [key, owner] of Object.entries(registry)) {
      if (owner === uid) {
        delete registry[key];
        changed = true;
      }
    }
    if (changed) await writeLocalRegistry(registry);
    return;
  }

  try {
    const db = getFirebaseFirestore();
    const userRef = doc(db, 'users', uid);
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) return;
      const key =
        typeof userSnap.data()?.usernameKey === 'string'
          ? (userSnap.data()!.usernameKey as string)
          : null;
      if (!key) return;
      const nameRef = doc(db, 'usernames', key);
      const nameSnap = await transaction.get(nameRef);
      if (nameSnap.exists() && (nameSnap.data() as { uid?: string }).uid === uid) {
        transaction.delete(nameRef);
      }
    });
  } catch (error) {
    log.warn('Felhasználónév felszabadítása sikertelen', { error });
  }
}