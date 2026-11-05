import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../../../services/firebase.js';
import { UserRole, AuthUser } from '../types/auth.types.js';
import { getUserRoleRecord, verifyRoleMatch, DEMO_USERS } from './roleService.js';

export class AuthService {
  /**
   * Unified Sign-in with Strict RBAC & Portal Matching Verification
   */
  public static async signIn(
    email: string,
    pass: string,
    selectedPortal: UserRole
  ): Promise<AuthUser> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Production / Live Firebase Auth attempt
    if (isFirebaseConfigured) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        const authUser = await getUserRoleRecord(userCredential.user);

        // Strict RBAC Verification 1: Role Mismatch Check
        const roleCheck = verifyRoleMatch(authUser.role, selectedPortal);
        if (!roleCheck.matches) {
          // Sign out immediately so unprivileged session is not persisted
          await firebaseSignOut(auth);
          throw new Error(roleCheck.mismatchMessage);
        }

        // Strict RBAC Verification 2: Account Status Check
        if (authUser.status === 'pending') {
          await firebaseSignOut(auth);
          throw new Error(
            'Your account is currently PENDING administrative credential verification. Please wait for an administrator to approve your medical license and hospital credentials.'
          );
        }

        if (authUser.status === 'suspended') {
          await firebaseSignOut(auth);
          throw new Error('This account has been suspended. Please contact platform support.');
        }

        return authUser;
      } catch (err: any) {
        // If it's an explicit RBAC mismatch or status error, rethrow it directly
        if (
          err.message.includes('Account Role Mismatch') ||
          err.message.includes('PENDING') ||
          err.message.includes('suspended')
        ) {
          throw err;
        }

        // If Firebase network fails or user is testing with pre-seeded demo credentials in local environment
        if (DEMO_USERS[cleanEmail]) {
          console.info('[AuthService] Falling back to pre-seeded local demo credentials for:', cleanEmail);
          return this.simulateDemoSignIn(cleanEmail, pass, selectedPortal);
        }

        // Translate Firebase error codes to user-friendly messages
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          throw new Error('Invalid email address or password. Please verify and try again.');
        }
        if (err.code === 'auth/too-many-requests') {
          throw new Error('Too many failed sign-in attempts. Please try again in a few minutes or reset your password.');
        }
        throw new Error(err.message || 'Authentication failed. Please check your credentials.');
      }
    }

    // 2. Offline / Local Demo Mode
    return this.simulateDemoSignIn(cleanEmail, pass, selectedPortal);
  }

  /**
   * Safe Simulated Demo Sign-in for Local Development without active Firebase billing
   */
  private static simulateDemoSignIn(
    email: string,
    pass: string,
    selectedPortal: UserRole
  ): AuthUser {
    if (!pass || pass.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const demoUser = DEMO_USERS[email];
    if (!demoUser) {
      throw new Error(
        `User "${email}" not found. For testing, you can use: patient@saksham.care, caregiver@saksham.care, doctor@saksham.care, doctor.pending@saksham.care, or admin@saksham.care (Password: password123)`
      );
    }

    // Check Role Mismatch
    const roleCheck = verifyRoleMatch(demoUser.role, selectedPortal);
    if (!roleCheck.matches) {
      throw new Error(roleCheck.mismatchMessage);
    }

    // Check Status
    if (demoUser.status === 'pending') {
      throw new Error(
        'Your doctor account is currently PENDING administrative approval. Administrators must verify your medical registration number before access is granted.'
      );
    }

    if (demoUser.status === 'suspended') {
      throw new Error('This account has been suspended.');
    }

    // Store in local storage for session simulation
    localStorage.setItem('saksham_auth_user', JSON.stringify(demoUser));
    return demoUser;
  }

  /**
   * Unified Sign-out
   */
  public static async signOut(): Promise<void> {
    try {
      if (isFirebaseConfigured) {
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.warn('Firebase signOut error:', err);
    } finally {
      localStorage.removeItem('saksham_auth_user');
    }
  }

  /**
   * Password Recovery
   */
  public static async sendPasswordReset(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Please enter your email address to receive password reset instructions.');
    }

    if (isFirebaseConfigured) {
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        return;
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          throw new Error('No registered account was found with this email address.');
        }
        throw new Error(err.message || 'Could not send password reset email.');
      }
    }

    // Fallback simulation
    console.log(`[AuthService] Password reset link simulated for: ${cleanEmail}`);
  }

  /**
   * Auth State Observer
   */
  public static onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    if (isFirebaseConfigured) {
      return firebaseOnAuthStateChanged(auth, async (firebaseUser: User | null) => {
        if (!firebaseUser) {
          const cached = localStorage.getItem('saksham_auth_user');
          if (cached) {
            try {
              callback(JSON.parse(cached));
              return;
            } catch {
              localStorage.removeItem('saksham_auth_user');
            }
          }
          callback(null);
          return;
        }

        try {
          const authUser = await getUserRoleRecord(firebaseUser);
          callback(authUser);
        } catch {
          callback(null);
        }
      });
    }

    // Offline simulation listener
    const cached = localStorage.getItem('saksham_auth_user');
    if (cached) {
      try {
        callback(JSON.parse(cached));
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }

    return () => {};
  }
}
