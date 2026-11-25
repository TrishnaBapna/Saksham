/**
 * SAKSHAM NEURO-CARE — PHASE 3.6
 * ROUTINE SESSION CONTINUITY & INTERRUPTED TASK RECOVERY SERVICE
 *
 * Implements Phase D: Interrupted Task Recovery:
 * 1. Preserves in-progress step index, confirmed completed steps, hint tiers, and timer.
 * 2. Survives page refresh, accidental closure, or temporary offline dropouts.
 * 3. Never falsely marks uncompleted steps as completed.
 * 4. Never penalizes interruptions as clinical decline.
 * 5. Provides patient-facing choice: Resume where left off OR Restart fresh.
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost).
 */

import { getEffectivePatientId } from '../../auth/services/identityService.js';

export interface ActiveRoutineSession {
  sessionId: string;
  patientId: string;
  routineId: string;
  routineTitle: string;
  currentStepIndex: number;
  completedStepIndices: number[];
  stepHintTiers: Record<number, 0 | 1 | 2 | 3>;
  stepAssistance: Record<number, boolean>;
  secondsRemaining: number;
  isResting?: boolean;
  restSecondsRemaining?: number;
  viewMode: 'single' | 'checklist';
  startedAt: string;
  lastUpdatedAt: string;
}

export class RoutineSessionService {
  private static readonly MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  private static getStorageKey(patientId: string, routineId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_active_routine_session_${effectiveId}_${routineId}`;
  }

  private static safeGet(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return null;
  }

  private static safeSet(key: string, val: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch {}
  }

  private static safeRemove(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
  }

  /**
   * Save an active in-progress routine session
   */
  public static saveActiveSession(session: ActiveRoutineSession): void {
    const key = this.getStorageKey(session.patientId, session.routineId);
    this.safeSet(key, JSON.stringify(session));
  }

  /**
   * Retrieve active session if present and unexpired
   */
  public static getActiveSession(patientId: string, routineId: string): ActiveRoutineSession | null {
    const key = this.getStorageKey(patientId, routineId);
    const raw = this.safeGet(key);
    if (!raw) return null;

    try {
      const parsed: ActiveRoutineSession = JSON.parse(raw);
      const ageMs = Date.now() - new Date(parsed.lastUpdatedAt).getTime();
      if (ageMs > this.MAX_SESSION_AGE_MS) {
        this.clearActiveSession(patientId, routineId);
        return null;
      }
      return parsed;
    } catch {
      this.clearActiveSession(patientId, routineId);
      return null;
    }
  }

  /**
   * Clear session on completion, explicit restart, or discard
   */
  public static clearActiveSession(patientId: string, routineId: string): void {
    const key = this.getStorageKey(patientId, routineId);
    this.safeRemove(key);
  }

  /**
   * Check if any active session exists for a routine
   */
  public static hasActiveSession(patientId: string, routineId: string): boolean {
    return this.getActiveSession(patientId, routineId) !== null;
  }

  /**
   * Retrieve all active sessions for a patient (e.g. for caregiver dashboard or Asha)
   */
  public static getAllActiveSessions(patientId: string): ActiveRoutineSession[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (typeof window === 'undefined' || !window.localStorage) return [];

    const prefix = `saksham_active_routine_session_${effectiveId}_`;
    const sessions: ActiveRoutineSession[] = [];

    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          const raw = window.localStorage.getItem(k);
          if (raw) {
            try {
              const sess: ActiveRoutineSession = JSON.parse(raw);
              sessions.push(sess);
            } catch {}
          }
        }
      }
    } catch {}

    return sessions;
  }

  /**
   * Clear all active sessions for a patient (e.g. on logout)
   */
  public static clearAllForPatient(patientId: string): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (typeof window === 'undefined' || !window.localStorage) return;

    const prefix = `saksham_active_routine_session_${effectiveId}_`;
    const keysToRemove: string[] = [];

    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {}
  }
}
