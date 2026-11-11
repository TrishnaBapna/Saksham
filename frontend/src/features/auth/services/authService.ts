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
import { RoutineService } from '../../routines/services/routineService.js';
import { LovedOnesService } from '../../lovedOnes/services/lovedOnesService.js';
import { GamesService } from '../../games/services/gamesService.js';
import { DoctorAnalyticsService } from '../../doctor/services/doctorAnalyticsService.js';
import { notifyDataChange } from './identityService.js';

// Safe localStorage wrapper for headless / test environments
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return null;
  },
  setItem: (key: string, val: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
  },
};

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

    // 1. In Development mode ONLY: explicit pre-seeded demo accounts for prototyping/tests
    if (import.meta.env.DEV && cleanEmail in DEMO_USERS) {
      console.info('[AuthService] Development environment detected: Using local demo credentials for:', cleanEmail);
      return this.simulateDemoSignIn(cleanEmail, pass, selectedPortal);
    }

    // 2. Production / Live Firebase Auth path
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
        // If it's an explicit RBAC mismatch or status error, rethrow directly
        if (
          err.message.includes('Account Role Mismatch') ||
          err.message.includes('PENDING') ||
          err.message.includes('suspended')
        ) {
          throw err;
        }

        // NEVER silently fall back to mock authentication when real Firebase authentication fails!
        // Format Firebase error codes to friendly messages
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          throw new Error('Invalid email address or password. Please verify and try again.');
        }
        if (err.code === 'auth/too-many-requests') {
          throw new Error('Too many failed sign-in attempts. Please try again in a few minutes or reset your password.');
        }
        throw new Error(err.message || 'Authentication failed. Please check your credentials.');
      }
    }

    // If Firebase is not configured and not in dev demo users
    if (!import.meta.env.DEV) {
      throw new Error('Authentication service is unavailable. Please check system configuration.');
    }

    throw new Error('Invalid credentials or unconfigured authentication provider.');
  }

  /**
   * Simulated Demo Sign-in
   * Strictly disallowed in production builds!
   */
  public static simulateDemoSignIn(
    email: string,
    pass: string,
    selectedPortal: UserRole
  ): AuthUser {
    // Hard boundary: Never allow demo authentication in production
    if (!import.meta.env.DEV) {
      throw new Error('Demo authentication is strictly disabled in production builds.');
    }

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
    safeStorage.setItem('saksham_auth_user', JSON.stringify(demoUser));
    return demoUser;
  }

  /**
   * Unified Sign-out & Safe Patient Data Purge (AUD-MED-02)
   */
  public static async signOut(): Promise<void> {
    try {
      // 1. Identify current user to clean up sensitive patient caches
      let currentUid: string | null = null;
      const cached = safeStorage.getItem('saksham_auth_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          currentUid = parsed.uid || null;
        } catch {}
      }
      if (!currentUid && auth.currentUser) {
        currentUid = auth.currentUser.uid;
      }

      // 2. Sign out of Firebase Auth
      if (isFirebaseConfigured) {
        await firebaseSignOut(auth);
      }

      // 3. Purge sensitive patient data cached on the device to prevent cross-account leaks
      if (currentUid) {
        RoutineService.clearPatientCache(currentUid);
        LovedOnesService.clearPatientCache(currentUid);
        GamesService.clearPatientCache(currentUid);
        safeStorage.removeItem(`saksham_routines_${currentUid}`);
        safeStorage.removeItem(`saksham_routine_history_${currentUid}`);
        safeStorage.removeItem(`saksham_loved_ones_${currentUid}`);
        safeStorage.removeItem(`saksham_game_sessions_${currentUid}`);
        safeStorage.removeItem(`saksham_game_difficulty_pref_${currentUid}`);
        notifyDataChange('all', currentUid);
      }

      // 4. Purge any patient telemetry viewed during a clinician/doctor session (Priority 1)
      DoctorAnalyticsService.clearClinicalSession();
    } catch (err) {
      console.warn('Firebase signOut error:', err);
    } finally {
      safeStorage.removeItem('saksham_auth_user');
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

    if (import.meta.env.DEV) {
      console.log(`[AuthService] Password reset link simulated for: ${cleanEmail}`);
      return;
    }

    throw new Error('Password recovery service is unavailable.');
  }

  /**
   * Auth State Observer
   */
  public static onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    if (isFirebaseConfigured) {
      return firebaseOnAuthStateChanged(auth, async (firebaseUser: User | null) => {
        if (!firebaseUser) {
          if (import.meta.env.DEV) {
            const cached = safeStorage.getItem('saksham_auth_user');
            if (cached) {
              try {
                callback(JSON.parse(cached));
                return;
              } catch {
                safeStorage.removeItem('saksham_auth_user');
              }
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

    // Offline development listener
    if (import.meta.env.DEV) {
      const cached = safeStorage.getItem('saksham_auth_user');
      if (cached) {
        try {
          callback(JSON.parse(cached));
        } catch {
          callback(null);
        }
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }

    return () => {};
  }
}
