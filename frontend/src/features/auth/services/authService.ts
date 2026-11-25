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
import { TaskLifecycleService } from '../../routines/services/taskLifecycleService.js';
import { StepPatternService } from '../../routines/services/stepPatternService.js';
import { RoutineSessionService } from '../../routines/services/routineSessionService.js';
import { SyncQueueService } from '../../../services/syncQueueService.js';
import { AshaContextService } from '../../ai-companion/services/ashaContextService.js';
import { ConversationalAIService } from '../../ai-companion/services/conversationalAIService.js';
import { notifyDataChange, isLocalDemoEnvironment } from './identityService.js';

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

    // 1. In Local Demonstration / Development mode: explicit pre-seeded demo accounts for prototyping/tests
    const isDemoAllowed = isLocalDemoEnvironment();
    if (isDemoAllowed && cleanEmail in DEMO_USERS) {
      console.info('[AuthService] Demonstration environment detected: Using local demo credentials for:', cleanEmail);
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

        // SEC-06.2: Clear any prior user's ephemeral AI credentials upon sign-in
        ConversationalAIService.clearApiKey();

        // Resume sync queue for authenticated patient
        SyncQueueService.resumeQueue(authUser.uid);
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
    // Hard boundary: Never allow demo authentication in remote production environments
    if (!isLocalDemoEnvironment()) {
      throw new Error('Demo authentication is strictly disabled in production environments.');
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

    // SEC-06.2: Clear any prior user's ephemeral AI credentials upon demo sign-in
    ConversationalAIService.clearApiKey();

    // Store in local storage for session simulation
    safeStorage.setItem('saksham_auth_user', JSON.stringify(demoUser));
    SyncQueueService.resumeQueue(demoUser.uid);
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

      // 3. Purge sensitive patient data cached on the device to prevent cross-account leaks (SEC-01)
      if (currentUid && typeof currentUid === 'string' && currentUid.trim() !== '') {
        const cleanUid = currentUid.trim();

        RoutineService.clearPatientCache(cleanUid);
        LovedOnesService.clearPatientCache(cleanUid);
        GamesService.clearPatientCache(cleanUid);
        TaskLifecycleService.clearCache();
        StepPatternService.clearPatientCache(cleanUid);
        RoutineSessionService.clearAllForPatient(cleanUid);
        SyncQueueService.suspendQueue(cleanUid);
        AshaContextService.clearAllContextCaches();

        // Explicit inventory of patient-scoped sensitive localStorage keys
        const SENSITIVE_PATIENT_PREFIXES = [
          'saksham_routines_',
          'saksham_routine_history_',
          'saksham_loved_ones_',
          'saksham_game_sessions_',
          'saksham_game_difficulty_pref_',
          'saksham_notes_',
          'saksham_pending_notes_sync_',
          'saksham_clinical_diagnosis_',
          'saksham_diagnosis_history_',
          'saksham_prescriptions_',
          'saksham_clinical_rx_',
          'saksham_cognitive_concerns_',
          'saksham_clinical_assessments_',
          'saksham_item_locations_',
          'saksham_longitudinal_reports_',
          'saksham_caregiver_notes_',
          'saksham_appointment_summaries_',
          'saksham_dyadic_care_',
          'saksham_support_requests_',
          'saksham_caregiver_proposals_',
          'saksham_caregiver_handoffs_',
          'saksham_dyadic_discrepancies_',
          'saksham_calendar_',
          'saksham_pending_calendar_sync_',
          'saksham_memory_graph_',
          'saksham_notifications_',
          'saksham_timeline_',
          'saksham_step_patterns_',
          'saksham_adaptive_support_',
          'saksham_adaptive_proposals_',
          'saksham_adaptive_observations_',
          'saksham_routine_executions_',
          'saksham_daily_wellbeing_',
          'saksham_asha_personalization_',
          'saksham_patient_experience_',
          'saksham_location_consent_',
          'saksham_assigned_activities_',
        ];

        for (const prefix of SENSITIVE_PATIENT_PREFIXES) {
          safeStorage.removeItem(`${prefix}${cleanUid}`);
        }

        // Purge any compound challenge keys scoped to this cleanUid
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const challengePrefix = `saksham_routine_challenge_${cleanUid}_`;
            const keysToRemove: string[] = [];
            for (let i = 0; i < window.localStorage.length; i++) {
              const k = window.localStorage.key(i);
              if (k && k.startsWith(challengePrefix)) {
                keysToRemove.push(k);
              }
            }
            keysToRemove.forEach((k) => safeStorage.removeItem(k));
          }
        } catch {
          // Graceful handling of storage enumeration issues
        }

        notifyDataChange('all', cleanUid);
      }

      // 4. Purge any patient telemetry viewed during a clinician/doctor session (Priority 1)
      DoctorAnalyticsService.clearClinicalSession();
    } catch (err) {
      console.warn('Firebase signOut error:', err);
    } finally {
      // SEC-06.2: Guarantee local AI credential and user session cleanup even if Firebase signOut threw
      try {
        ConversationalAIService.clearApiKey();
        safeStorage.removeItem('saksham_gemini_api_key');
      } catch {
        // Storage unavailable
      }
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
    const isExplicitDemo = typeof window !== 'undefined' && window.localStorage?.getItem('saksham_demo_scenario') === 'true';
    const isDemoAllowed = (import.meta.env.DEV || isExplicitDemo) && isLocalDemoEnvironment();

    if (isFirebaseConfigured) {
      return firebaseOnAuthStateChanged(auth, async (firebaseUser: User | null) => {
        if (!firebaseUser) {
          if (isDemoAllowed) {
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
    if (isDemoAllowed) {
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
