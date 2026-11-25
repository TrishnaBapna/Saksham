import { GameDifficulty, GamePacing, GameSessionRecord } from '../../../types/index.js';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getEffectivePatientId, isGuestPatient } from '../../auth/services/identityService.js';

export type AdaptiveSyncStatus =
  | 'local-only'
  | 'offline-pending'
  | 'syncing'
  | 'synced'
  | 'sync-failed';

export interface AdaptiveProfile {
  patientId: string;
  currentDifficulty: GameDifficulty;
  pacing: GamePacing;
  consecutiveComfortableSessions: number;
  consecutiveStruggleSessions: number;
  lastSessionEvaluated?: string;
  lastEvaluatedSessionId?: string;
  evaluatedSessionIds?: string[];
  syncStatus?: AdaptiveSyncStatus;
  adaptationRationale: string;
  updatedAt: string;
}

export interface SessionEvaluationMetrics {
  sessionId?: string;
  gameId: string;
  gameTitle?: string;
  durationSeconds: number;
  completed: boolean;
  accuracy?: number; // 0 to 1
  mistakesCount?: number;
  hintsUsedCount?: number;
  pauseCount?: number;
  patientFeedback?: string;
  difficultyAtPlay?: GameDifficulty;
}

export class AdaptiveDifficultyService {
  private static inMemoryProfiles: Record<string, AdaptiveProfile> = {};
  private static isOnlineListenerRegistered = false;

  private static getProfileKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_adaptive_profile_${effectiveId}`;
  }

  private static getPendingSyncKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_pending_adaptive_sync_${effectiveId}`;
  }

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage unavailable or headless error
    }
    return null;
  }

  private static safeSetItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage unavailable
    }
  }

  private static safeRemoveItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage unavailable
    }
  }

  public static isOnline(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Register automatic reconnection sync listener
   */
  public static ensureReconnectionListener(): void {
    if (this.isOnlineListenerRegistered || typeof window === 'undefined') return;
    this.isOnlineListenerRegistered = true;
    window.addEventListener('online', () => {
      // Find all active patient keys in localStorage with pending changes
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('saksham_pending_adaptive_sync_')) {
            const patientId = key.replace('saksham_pending_adaptive_sync_', '');
            this.syncPendingProfile(patientId).catch((err) => {
              console.warn('[AdaptiveDifficultyService] Reconnection sync error:', err);
            });
          }
        }
      } catch {
        // Storage access error
      }
    });
  }

  /**
   * Reset all in-memory profiles (used for test teardown)
   */
  public static clearAll(): void {
    this.inMemoryProfiles = {};
  }

  /**
   * Safe default profile: always starts at Gentle & Calm
   */
  public static getDefaultProfile(patientId: string): AdaptiveProfile {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const isGuest = isGuestPatient(effectiveId);
    return {
      patientId: effectiveId,
      currentDifficulty: 'Gentle',
      pacing: 'calm',
      consecutiveComfortableSessions: 0,
      consecutiveStruggleSessions: 0,
      evaluatedSessionIds: [],
      syncStatus: isGuest ? 'local-only' : 'synced',
      adaptationRationale: 'Starting at Gentle pace for soothing, pressure-free engagement.',
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieve the active adaptive difficulty profile for a patient
   */
  public static getProfile(patientId: string): AdaptiveProfile {
    this.ensureReconnectionListener();
    const effectiveId = getEffectivePatientId({ uid: patientId });

    // Check in-memory first
    if (this.inMemoryProfiles[effectiveId]) {
      return this.inMemoryProfiles[effectiveId];
    }

    // Check localStorage
    const key = this.getProfileKey(effectiveId);
    const stored = this.safeGetItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AdaptiveProfile;
        if (parsed && parsed.currentDifficulty) {
          this.inMemoryProfiles[effectiveId] = parsed;
          return parsed;
        }
      } catch {
        // Fall through to default
      }
    }

    const defaultProfile = this.getDefaultProfile(effectiveId);
    this.inMemoryProfiles[effectiveId] = defaultProfile;
    return defaultProfile;
  }

  /**
   * Filter payload strictly to schema allowed in Firestore security rules
   */
  private static sanitizeForFirestore(profile: AdaptiveProfile): Record<string, any> {
    const allowed = [
      'patientId', 'currentDifficulty', 'pacing',
      'consecutiveComfortableSessions', 'consecutiveStruggleSessions',
      'lastSessionEvaluated', 'lastEvaluatedSessionId', 'evaluatedSessionIds',
      'syncStatus', 'adaptationRationale', 'updatedAt'
    ];
    const payload: Record<string, any> = {};
    for (const key of allowed) {
      if ((profile as any)[key] !== undefined) {
        payload[key] = (profile as any)[key];
      }
    }
    return payload;
  }

  /**
   * Save the updated adaptive difficulty profile with robust offline handling
   */
  public static async saveProfile(profile: AdaptiveProfile): Promise<AdaptiveProfile> {
    const effectiveId = getEffectivePatientId({ uid: profile.patientId });
    const isGuest = isGuestPatient(effectiveId);
    const online = this.isOnline();

    let resolvedSyncStatus: AdaptiveSyncStatus = profile.syncStatus || 'synced';
    if (isGuest) {
      resolvedSyncStatus = 'local-only';
    } else if (!online) {
      resolvedSyncStatus = 'offline-pending';
    }

    const profileToSave: AdaptiveProfile = {
      ...profile,
      patientId: effectiveId,
      syncStatus: resolvedSyncStatus,
      updatedAt: profile.updatedAt || new Date().toISOString()
    };

    // Save locally immediately
    this.inMemoryProfiles[effectiveId] = profileToSave;
    const key = this.getProfileKey(effectiveId);
    this.safeSetItem(key, JSON.stringify(profileToSave));

    // Also persist legacy preference keys for backward compatibility
    this.safeSetItem(`saksham_game_difficulty_pref_${effectiveId}`, profileToSave.currentDifficulty);
    this.safeSetItem(`saksham_game_pacing_${effectiveId}`, profileToSave.pacing);

    if (isGuest) {
      return profileToSave;
    }

    if (!online) {
      // Offline: store in UID-scoped pending queue
      this.safeSetItem(this.getPendingSyncKey(effectiveId), JSON.stringify(profileToSave));
      return profileToSave;
    }

    // Online: initiate cloud write
    if (isFirebaseConfigured) {
      try {
        const profileRef = doc(db, 'users', effectiveId, 'adaptiveProfiles', 'mindGames');
        const sanitized = this.sanitizeForFirestore({ ...profileToSave, syncStatus: 'synced' });
        await setDoc(profileRef, sanitized, { merge: true });

        // On successful cloud save, mark synced and clear pending queue
        this.safeRemoveItem(this.getPendingSyncKey(effectiveId));
        const syncedProfile: AdaptiveProfile = {
          ...profileToSave,
          syncStatus: 'synced'
        };
        this.inMemoryProfiles[effectiveId] = syncedProfile;
        this.safeSetItem(key, JSON.stringify(syncedProfile));
        return syncedProfile;
      } catch (err) {
        console.warn('[AdaptiveDifficultyService] Cloud save failed:', err);
        // Mark sync failed and preserve in pending queue
        const failedProfile: AdaptiveProfile = {
          ...profileToSave,
          syncStatus: 'sync-failed'
        };
        this.inMemoryProfiles[effectiveId] = failedProfile;
        this.safeSetItem(key, JSON.stringify(failedProfile));
        this.safeSetItem(this.getPendingSyncKey(effectiveId), JSON.stringify(failedProfile));
        return failedProfile;
      }
    }

    return profileToSave;
  }

  /**
   * Sync pending changes for a patient when network connectivity returns
   */
  public static async syncPendingProfile(patientId: string): Promise<AdaptiveProfile> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (isGuestPatient(effectiveId) || !isFirebaseConfigured || !this.isOnline()) {
      return this.getProfile(effectiveId);
    }

    const pendingRaw = this.safeGetItem(this.getPendingSyncKey(effectiveId));
    if (!pendingRaw) {
      return this.getProfile(effectiveId);
    }

    try {
      const pending = JSON.parse(pendingRaw) as AdaptiveProfile;
      const profileRef = doc(db, 'users', effectiveId, 'adaptiveProfiles', 'mindGames');
      const sanitized = this.sanitizeForFirestore({ ...pending, syncStatus: 'synced' });
      await setDoc(profileRef, sanitized, { merge: true });

      // Clear pending queue and update local
      this.safeRemoveItem(this.getPendingSyncKey(effectiveId));
      const syncedProfile: AdaptiveProfile = {
        ...pending,
        syncStatus: 'synced'
      };
      this.inMemoryProfiles[effectiveId] = syncedProfile;
      this.safeSetItem(this.getProfileKey(effectiveId), JSON.stringify(syncedProfile));
      return syncedProfile;
    } catch (err) {
      console.warn('[AdaptiveDifficultyService] syncPendingProfile error:', err);
      return this.getProfile(effectiveId);
    }
  }

  /**
   * Load profile from Firestore with strict timestamp conflict protection:
   * A stale remote profile CANNOT silently overwrite a newer local profile!
   */
  public static async syncProfileFromFirestore(patientId: string): Promise<AdaptiveProfile> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (isGuestPatient(effectiveId) || !isFirebaseConfigured || !this.isOnline()) {
      return this.getProfile(effectiveId);
    }

    try {
      const profileRef = doc(db, 'users', effectiveId, 'adaptiveProfiles', 'mindGames');
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        const cloudData = snap.data() as AdaptiveProfile;
        const localProfile = this.getProfile(effectiveId);

        const localTime = new Date(localProfile.updatedAt || 0).getTime();
        const cloudTime = new Date(cloudData.updatedAt || 0).getTime();

        // Merge evaluatedSessionIds so historical session tracking is never lost
        const mergedSessionIds = Array.from(
          new Set([...(localProfile.evaluatedSessionIds || []), ...(cloudData.evaluatedSessionIds || [])])
        ).slice(0, 30);

        if (cloudTime > localTime) {
          // Cloud has a newer profile: adopt it
          const mergedCloudProfile: AdaptiveProfile = {
            ...cloudData,
            evaluatedSessionIds: mergedSessionIds,
            syncStatus: 'synced'
          };
          this.inMemoryProfiles[effectiveId] = mergedCloudProfile;
          this.safeSetItem(this.getProfileKey(effectiveId), JSON.stringify(mergedCloudProfile));
          this.safeSetItem(`saksham_game_difficulty_pref_${effectiveId}`, mergedCloudProfile.currentDifficulty);
          this.safeSetItem(`saksham_game_pacing_${effectiveId}`, mergedCloudProfile.pacing);
          return mergedCloudProfile;
        } else if (localTime > cloudTime) {
          // Local profile is newer! Push local to cloud instead of overwriting local!
          await this.saveProfile({
            ...localProfile,
            evaluatedSessionIds: mergedSessionIds
          });
          return localProfile;
        } else {
          // Identical timestamps
          return localProfile;
        }
      }
    } catch (err) {
      console.warn('[AdaptiveDifficultyService] Cloud sync error:', err);
    }

    return this.getProfile(effectiveId);
  }

  /**
   * Core multi-session rolling evaluation algorithm.
   *
   * Rules:
   * 1. Safe default is Gentle / Calm.
   * 2. Every session has a unique session ID. Repeated evaluation NEVER counts twice.
   * 3. Requires >= 3 consecutive comfortable sessions across rolling history before stepping up.
   * 4. Incomplete or abandoned sessions never count as comfortable.
   * 5. Any struggle signal (or explicit feedback asking for easier pace) immediately relaxes difficulty.
   * 6. Pauses, taking extra time, and hints are supportive and NOT penalized.
   */
  public static evaluateSession(
    patientId: string,
    metrics: SessionEvaluationMetrics,
    rollingHistory: GameSessionRecord[] = []
  ): AdaptiveProfile {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getProfile(effectiveId);

    // 1. UNIQUE SESSION DEDUPLICATION GUARD:
    // Repeated evaluation of the exact same session ID must NEVER count twice!
    if (metrics.sessionId) {
      const alreadyEvaluated =
        current.lastEvaluatedSessionId === metrics.sessionId ||
        (current.evaluatedSessionIds && current.evaluatedSessionIds.includes(metrics.sessionId));

      if (alreadyEvaluated) {
        return current;
      }
    }

    // Generate or track session ID
    const sessionId = metrics.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nextEvaluatedSessionIds = Array.from(
      new Set([sessionId, ...(current.evaluatedSessionIds || [])])
    ).slice(0, 30);

    // Identify feedback sentiment
    const feedback = (metrics.patientFeedback || '').toLowerCase();
    const wantsEasier =
      feedback.includes('easier') ||
      feedback.includes('tricky') ||
      feedback.includes('difficult') ||
      feedback.includes('too hard') ||
      feedback.includes('need help') ||
      feedback.includes("don't like");

    const wantsChallenge =
      feedback.includes('more challenge') ||
      feedback.includes('too easy');

    const wantsBreak =
      feedback.includes('want a break') ||
      feedback.includes('pause') ||
      feedback.includes("don't like");

    // Incomplete or abandoned sessions can NEVER count as comfortable
    const feltComfortable =
      metrics.completed &&
      !wantsEasier &&
      !wantsBreak &&
      (metrics.mistakesCount === undefined || metrics.mistakesCount <= 1) &&
      (metrics.accuracy === undefined || metrics.accuracy >= 0.75);

    const isStruggling =
      wantsEasier ||
      (!metrics.completed && metrics.durationSeconds > 60 && (metrics.pauseCount || 0) === 0) ||
      (metrics.mistakesCount !== undefined && metrics.mistakesCount >= 3) ||
      (metrics.accuracy !== undefined && metrics.accuracy < 0.5);

    let nextDifficulty: GameDifficulty = current.currentDifficulty;
    let nextPacing: GamePacing = current.pacing;
    let nextComfortableCount = current.consecutiveComfortableSessions;
    let nextStruggleCount = current.consecutiveStruggleSessions;
    let rationale = current.adaptationRationale;

    if (isStruggling) {
      nextStruggleCount += 1;
      nextComfortableCount = 0;

      // Relax difficulty immediately to Gentle
      if (current.currentDifficulty === 'Stimulating') {
        nextDifficulty = 'Moderate';
        nextPacing = 'balanced';
        rationale = 'Adjusted to Moderate to keep activities comfortable and peaceful.';
      } else {
        nextDifficulty = 'Gentle';
        nextPacing = 'calm';
        rationale = 'Reset to Gentle pace to provide ample time and reassuring ease.';
      }
    } else if (feltComfortable) {
      nextComfortableCount += 1;
      nextStruggleCount = 0;

      // Check rolling history (last 3-5 sessions)
      const recentSessions = rollingHistory.slice(0, 4);
      const allRecentCompleted = recentSessions.length === 0 || recentSessions.every((s) => s.completed);

      // Require at least 3 distinct consecutive completed comfortable sessions across rolling history.
      // Patient feedback ("too easy" / "more challenge") informs rationale but NEVER bypasses the 3-session safeguard.
      if (nextComfortableCount >= 3 && allRecentCompleted) {
        if (current.currentDifficulty === 'Gentle') {
          nextDifficulty = 'Moderate';
          nextPacing = 'balanced';
          rationale = wantsChallenge
            ? 'Patient feedback and 3 comfortable sessions observed. Stepping gently to Moderate.'
            : 'You have enjoyed 3 peaceful sessions comfortably! Stepping gently to Moderate.';
          nextComfortableCount = 0; // Reset progression counter after transition
        } else if (current.currentDifficulty === 'Moderate') {
          nextDifficulty = 'Stimulating';
          nextPacing = 'agile';
          rationale = wantsChallenge
            ? 'Patient feedback and 3 comfortable sessions observed. Gently offering Stimulating exploration.'
            : 'Consistently comfortable sessions observed across 3 activities. Gently offering Stimulating exploration.';
          nextComfortableCount = 0; // Reset progression counter after transition
        } else {
          rationale = 'Maintaining comfortable rhythm at your current level.';
        }
      } else {
        rationale = wantsChallenge
          ? `Comfortable session recorded (${nextComfortableCount}/3 toward gradual progression). Marked desire for challenge.`
          : `Comfortable session recorded (${nextComfortableCount}/3 toward gradual progression).`;
      }
    } else {
      // Neutral session (e.g. paused or exploring)
      rationale = 'Maintained current soothing pace.';
    }

    const isGuest = isGuestPatient(effectiveId);
    const online = this.isOnline();
    const initialSyncStatus: AdaptiveSyncStatus = isGuest
      ? 'local-only'
      : !online
      ? 'offline-pending'
      : 'syncing';

    const updatedProfile: AdaptiveProfile = {
      patientId: effectiveId,
      currentDifficulty: nextDifficulty,
      pacing: nextPacing,
      consecutiveComfortableSessions: nextComfortableCount,
      consecutiveStruggleSessions: nextStruggleCount,
      lastSessionEvaluated: new Date().toISOString(),
      lastEvaluatedSessionId: sessionId,
      evaluatedSessionIds: nextEvaluatedSessionIds,
      syncStatus: initialSyncStatus,
      adaptationRationale: rationale,
      updatedAt: new Date().toISOString()
    };

    // Save synchronously locally
    this.inMemoryProfiles[effectiveId] = updatedProfile;
    this.safeSetItem(this.getProfileKey(effectiveId), JSON.stringify(updatedProfile));
    this.safeSetItem(`saksham_game_difficulty_pref_${effectiveId}`, nextDifficulty);
    this.safeSetItem(`saksham_game_pacing_${effectiveId}`, nextPacing);

    if (isGuest) {
      return updatedProfile;
    }

    if (!online) {
      this.safeSetItem(this.getPendingSyncKey(effectiveId), JSON.stringify(updatedProfile));
      return updatedProfile;
    }

    // Save to Firestore asynchronously
    if (isFirebaseConfigured) {
      const profileRef = doc(db, 'users', effectiveId, 'adaptiveProfiles', 'mindGames');
      const sanitized = this.sanitizeForFirestore({ ...updatedProfile, syncStatus: 'synced' });
      setDoc(profileRef, sanitized, { merge: true })
        .then(() => {
          this.safeRemoveItem(this.getPendingSyncKey(effectiveId));
          const syncedProfile: AdaptiveProfile = {
            ...updatedProfile,
            syncStatus: 'synced'
          };
          this.inMemoryProfiles[effectiveId] = syncedProfile;
          this.safeSetItem(this.getProfileKey(effectiveId), JSON.stringify(syncedProfile));
        })
        .catch((err) => {
          console.warn('[AdaptiveDifficultyService] Async cloud save failed:', err);
          const failedProfile: AdaptiveProfile = {
            ...updatedProfile,
            syncStatus: 'sync-failed'
          };
          this.inMemoryProfiles[effectiveId] = failedProfile;
          this.safeSetItem(this.getProfileKey(effectiveId), JSON.stringify(failedProfile));
          this.safeSetItem(this.getPendingSyncKey(effectiveId), JSON.stringify(failedProfile));
        });
    }

    return updatedProfile;
  }

  /**
   * Purge in-memory cached profile without wiping patient's offline sync queues.
   */
  public static clearMemoryCache(patientId: string): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    delete this.inMemoryProfiles[effectiveId];
  }

  /**
   * Reset profile (used for patient testing or preference reset)
   */
  public static resetProfile(patientId: string): AdaptiveProfile {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const def = this.getDefaultProfile(effectiveId);
    this.inMemoryProfiles[effectiveId] = def;
    const key = this.getProfileKey(effectiveId);
    this.safeSetItem(key, JSON.stringify(def));
    this.safeSetItem(`saksham_game_difficulty_pref_${effectiveId}`, def.currentDifficulty);
    this.safeSetItem(`saksham_game_pacing_${effectiveId}`, def.pacing);
    this.safeRemoveItem(this.getPendingSyncKey(effectiveId));
    return def;
  }
}
