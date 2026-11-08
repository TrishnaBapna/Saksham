import { GameDifficulty, GamePacing, GameSessionRecord } from '../../../types/index.js';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getEffectivePatientId, isGuestPatient } from '../../auth/services/identityService.js';

export interface AdaptiveProfile {
  patientId: string;
  currentDifficulty: GameDifficulty;
  pacing: GamePacing;
  consecutiveComfortableSessions: number;
  consecutiveStruggleSessions: number;
  lastSessionEvaluated?: string;
  adaptationRationale: string;
  updatedAt: string;
}

export interface SessionEvaluationMetrics {
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

  private static getProfileKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_adaptive_profile_${effectiveId}`;
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
    return {
      patientId: effectiveId,
      currentDifficulty: 'Gentle',
      pacing: 'calm',
      consecutiveComfortableSessions: 0,
      consecutiveStruggleSessions: 0,
      adaptationRationale: 'Starting at Gentle pace for soothing, pressure-free engagement.',
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieve the active adaptive difficulty profile for a patient
   */
  public static getProfile(patientId: string): AdaptiveProfile {
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
   * Save the updated adaptive difficulty profile
   */
  public static async saveProfile(profile: AdaptiveProfile): Promise<void> {
    const effectiveId = getEffectivePatientId({ uid: profile.patientId });
    const profileToSave: AdaptiveProfile = {
      ...profile,
      patientId: effectiveId,
      updatedAt: new Date().toISOString()
    };

    this.inMemoryProfiles[effectiveId] = profileToSave;
    const key = this.getProfileKey(effectiveId);
    this.safeSetItem(key, JSON.stringify(profileToSave));

    // Also persist legacy preference keys for full backward compatibility
    this.safeSetItem(`saksham_game_difficulty_pref_${effectiveId}`, profileToSave.currentDifficulty);
    this.safeSetItem(`saksham_game_pacing_${effectiveId}`, profileToSave.pacing);

    if (!isGuestPatient(effectiveId) && isFirebaseConfigured) {
      try {
        const profileRef = doc(db, 'users', effectiveId, 'adaptiveProfiles', 'mindGames');
        await setDoc(profileRef, profileToSave, { merge: true });
      } catch (err) {
        console.warn('[AdaptiveDifficultyService] Cloud save failed:', err);
      }
    }
  }

  /**
   * Load profile from Firestore if available
   */
  public static async syncProfileFromFirestore(patientId: string): Promise<AdaptiveProfile> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (isGuestPatient(effectiveId) || !isFirebaseConfigured) {
      return this.getProfile(effectiveId);
    }

    try {
      const profileRef = doc(db, 'users', effectiveId, 'adaptiveProfiles', 'mindGames');
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        const cloudData = snap.data() as AdaptiveProfile;
        await this.saveProfile(cloudData);
        return cloudData;
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
   * 2. A single session NEVER jumps difficulty.
   * 3. Requires >= 3 consecutive comfortable sessions across rolling history before stepping up.
   * 4. Any struggle signal (or explicit feedback asking for easier pace) immediately relaxes difficulty.
   * 5. Pauses, taking extra time, and hints are supportive and NOT penalized.
   */
  public static evaluateSession(
    patientId: string,
    metrics: SessionEvaluationMetrics,
    rollingHistory: GameSessionRecord[] = []
  ): AdaptiveProfile {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getProfile(effectiveId);

    // Identify feedback sentiment
    const feedback = (metrics.patientFeedback || '').toLowerCase();
    const wantsEasier =
      feedback.includes('easier') ||
      feedback.includes('tricky') ||
      feedback.includes('difficult') ||
      feedback.includes('too hard');

    const wantsChallenge =
      feedback.includes('more challenge') ||
      feedback.includes('too easy');

    const feltComfortable =
      metrics.completed &&
      !wantsEasier &&
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

    const updatedProfile: AdaptiveProfile = {
      patientId: effectiveId,
      currentDifficulty: nextDifficulty,
      pacing: nextPacing,
      consecutiveComfortableSessions: nextComfortableCount,
      consecutiveStruggleSessions: nextStruggleCount,
      lastSessionEvaluated: new Date().toISOString(),
      adaptationRationale: rationale,
      updatedAt: new Date().toISOString()
    };

    // Save synchronously
    this.inMemoryProfiles[effectiveId] = updatedProfile;
    this.safeSetItem(this.getProfileKey(effectiveId), JSON.stringify(updatedProfile));
    this.safeSetItem(`saksham_game_difficulty_pref_${effectiveId}`, nextDifficulty);
    this.safeSetItem(`saksham_game_pacing_${effectiveId}`, nextPacing);

    // Save to Firestore asynchronously
    if (!isGuestPatient(effectiveId) && isFirebaseConfigured) {
      const profileRef = doc(db, 'users', effectiveId, 'adaptiveProfiles', 'mindGames');
      setDoc(profileRef, updatedProfile, { merge: true }).catch((err) => {
        console.warn('[AdaptiveDifficultyService] Async cloud save failed:', err);
      });
    }

    return updatedProfile;
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
    return def;
  }
}
