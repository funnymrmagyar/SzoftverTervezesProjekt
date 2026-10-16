import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';

import type { AuthService, AuthUser } from './AuthService';
import { toAuthError } from './authErrors';

function toAuthUser(user: User): AuthUser {
  return { uid: user.uid, email: user.email };
}

/** Az AuthService Firebase Authentication alapú megvalósítása (email + jelszó). */
export class FirebaseAuthService implements AuthService {
  constructor(private readonly auth: Auth) {}

  async signIn(email: string, password: string): Promise<AuthUser> {
    try {
      const { user } = await signInWithEmailAndPassword(this.auth, email.trim(), password);
      return toAuthUser(user);
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async register(email: string, password: string): Promise<AuthUser> {
    try {
      const { user } = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
      return toAuthUser(user);
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  onAuthChanged(listener: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => listener(user ? toAuthUser(user) : null));
  }
}
