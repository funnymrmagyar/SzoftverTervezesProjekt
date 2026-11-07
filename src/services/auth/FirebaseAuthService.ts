import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
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

  async reauthenticate(password: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user?.email) throw toAuthError({ code: 'auth/user-not-found' });
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async deleteAccount(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw toAuthError({ code: 'auth/user-not-found' });
    try {
      await deleteUser(user);
    } catch (error) {
      throw toAuthError(error);
    }
  }

  onAuthChanged(listener: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => listener(user ? toAuthUser(user) : null));
  }
}
