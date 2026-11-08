import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as firestoreModule from 'firebase/firestore';
import {
  AdaptiveDifficultyService,
  SessionEvaluationMetrics
} from '../features/games/services/adaptiveDifficultyService.js';
import { GamesService } from '../features/games/services/gamesService.js';

describe('Milestone 4.2: Session Deduplication, Offline Persistence & UID Isolation', () => {
  const patientAlpha = 'test-patient-alpha-42';
  const patientBeta = 'test-patient-beta-42';
  const guestPatient = 'guest_temp_patient_42';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    AdaptiveDifficultyService.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ========================================================================= */
  /* PART 1: Unique Session ID & Duplicate Evaluation Prevention               */
  /* ========================================================================= */
  describe('Part 1: Unique Session ID & Duplicate Prevention', () => {
    it('1. ignores duplicate evaluation of the exact same session ID', () => {
      const sessionId = 'sess_unique_test_001';
      const metrics: SessionEvaluationMetrics = {
        sessionId,
        gameId: 'game-matching',
        durationSeconds: 70,
        completed: true,
        accuracy: 1.0,
        mistakesCount: 0
      };

      // First evaluation: increments count from 0 to 1
      const firstEval = AdaptiveDifficultyService.evaluateSession(patientAlpha, metrics);
      expect(firstEval.consecutiveComfortableSessions).toBe(1);
      expect(firstEval.lastEvaluatedSessionId).toBe(sessionId);
      expect(firstEval.evaluatedSessionIds).toContain(sessionId);

      // Duplicate evaluation with the exact same sessionId: MUST NOT increment!
      const duplicateEval = AdaptiveDifficultyService.evaluateSession(patientAlpha, metrics);
      expect(duplicateEval.consecutiveComfortableSessions).toBe(1);
      expect(duplicateEval.currentDifficulty).toBe('Gentle');
    });

    it('2. repeated callbacks or remounts with the same session ID do not duplicate progression', () => {
      const sessionId = 'sess_remount_test_002';
      const metrics: SessionEvaluationMetrics = {
        sessionId,
        gameId: 'game-word-garden',
        durationSeconds: 85,
        completed: true,
        accuracy: 0.95,
        mistakesCount: 0
      };

      // Evaluate 5 times (simulating duplicate component remounts or re-renders)
      for (let i = 0; i < 5; i++) {
        AdaptiveDifficultyService.evaluateSession(patientAlpha, metrics);
      }

      const profile = AdaptiveDifficultyService.getProfile(patientAlpha);
      expect(profile.consecutiveComfortableSessions).toBe(1);
      expect(profile.currentDifficulty).toBe('Gentle');
    });

    it('3. page reload simulation: persists evaluated session IDs in localStorage across restarts', () => {
      const sessionId = 'sess_reload_test_003';
      const metrics: SessionEvaluationMetrics = {
        sessionId,
        gameId: 'game-mini-maze',
        durationSeconds: 65,
        completed: true,
        accuracy: 1.0
      };

      // Record first session
      AdaptiveDifficultyService.evaluateSession(patientAlpha, metrics);

      // Simulate browser tab reload by clearing in-memory cache
      AdaptiveDifficultyService.clearAll();

      // Ensure profile loaded from localStorage retains evaluatedSessionIds
      const reloadedProfile = AdaptiveDifficultyService.getProfile(patientAlpha);
      expect(reloadedProfile.consecutiveComfortableSessions).toBe(1);
      expect(reloadedProfile.evaluatedSessionIds).toContain(sessionId);

      // Attempting to evaluate the same session after reload is safely blocked
      const blockedEval = AdaptiveDifficultyService.evaluateSession(patientAlpha, metrics);
      expect(blockedEval.consecutiveComfortableSessions).toBe(1);
    });

    it('4. three distinct session IDs are strictly required to advance difficulty', () => {
      // Session 1
      const s1 = AdaptiveDifficultyService.evaluateSession(patientAlpha, {
        sessionId: 'sess_distinct_01',
        gameId: 'g1',
        durationSeconds: 60,
        completed: true,
        accuracy: 1.0
      });
      expect(s1.consecutiveComfortableSessions).toBe(1);
      expect(s1.currentDifficulty).toBe('Gentle');

      // Session 2
      const s2 = AdaptiveDifficultyService.evaluateSession(patientAlpha, {
        sessionId: 'sess_distinct_02',
        gameId: 'g2',
        durationSeconds: 70,
        completed: true,
        accuracy: 1.0
      });
      expect(s2.consecutiveComfortableSessions).toBe(2);
      expect(s2.currentDifficulty).toBe('Gentle');

      // Session 3: Triggers step to Moderate
      const s3 = AdaptiveDifficultyService.evaluateSession(patientAlpha, {
        sessionId: 'sess_distinct_03',
        gameId: 'g3',
        durationSeconds: 75,
        completed: true,
        accuracy: 1.0
      });
      expect(s3.consecutiveComfortableSessions).toBe(0); // Resets after level transition
      expect(s3.currentDifficulty).toBe('Moderate');
      expect(s3.pacing).toBe('balanced');
      expect(s3.evaluatedSessionIds?.length).toBe(3);
    });

    it('5. incomplete or abandoned sessions record session ID but never increment progression', () => {
      const abandonedSessionId = 'sess_abandoned_004';
      const result = AdaptiveDifficultyService.evaluateSession(patientAlpha, {
        sessionId: abandonedSessionId,
        gameId: 'game-matching',
        durationSeconds: 75,
        completed: false, // Abandoned / incomplete
        pauseCount: 0,
        accuracy: 0.3
      });

      expect(result.consecutiveComfortableSessions).toBe(0);
      expect(result.consecutiveStruggleSessions).toBe(1);
      expect(result.evaluatedSessionIds).toContain(abandonedSessionId);

      // Re-evaluating the abandoned session does not increment struggle or comfortable counters
      const reEval = AdaptiveDifficultyService.evaluateSession(patientAlpha, {
        sessionId: abandonedSessionId,
        gameId: 'game-matching',
        durationSeconds: 75,
        completed: false
      });
      expect(reEval.consecutiveStruggleSessions).toBe(1);
    });

    it('6. gamesService.recordSession automatically assigns unique session ID and passes it to adaptive evaluation', async () => {
      const evalSpy = vi.spyOn(AdaptiveDifficultyService, 'evaluateSession');

      const record1 = await GamesService.recordSession(patientAlpha, {
        gameId: 'game-matching',
        gameTitle: 'Peaceful Nature Card Matching',
        category: 'memory',
        difficulty: 'Gentle',
        date: '2026-11-08',
        durationSeconds: 65,
        completed: true
      });

      expect(record1.id).toBeDefined();
      expect(record1.id).toMatch(/^sess_/);
      expect(evalSpy).toHaveBeenCalledWith(
        patientAlpha,
        expect.objectContaining({ sessionId: record1.id }),
        expect.any(Array)
      );

      evalSpy.mockRestore();
    });
  });

  /* ========================================================================= */
  /* PART 2: Offline Persistence & Observable Sync Status                      */
  /* ========================================================================= */
  describe('Part 2: Offline Persistence & Sync Status Lifecycle', () => {
    it('7. marks guest patients strictly as local-only and avoids cloud writes', () => {
      const guestProfile = AdaptiveDifficultyService.getProfile(guestPatient);
      expect(guestProfile.syncStatus).toBe('local-only');

      const evaluated = AdaptiveDifficultyService.evaluateSession(guestPatient, {
        sessionId: 'sess_guest_01',
        gameId: 'game-matching',
        durationSeconds: 60,
        completed: true,
        accuracy: 1.0
      });
      expect(evaluated.syncStatus).toBe('local-only');
    });

    it('8. marks profile as offline-pending and buffers in pending queue when offline', async () => {
      // Simulate browser offline
      vi.spyOn(AdaptiveDifficultyService, 'isOnline').mockReturnValue(false);

      const profile = AdaptiveDifficultyService.getProfile(patientAlpha);
      const updated = await AdaptiveDifficultyService.saveProfile({
        ...profile,
        currentDifficulty: 'Moderate'
      });

      expect(updated.syncStatus).toBe('offline-pending');

      // Check that it was placed in UID-scoped pending sync queue
      const pendingRaw = localStorage.getItem(`saksham_pending_adaptive_sync_${patientAlpha}`);
      expect(pendingRaw).not.toBeNull();
      const parsedPending = JSON.parse(pendingRaw!);
      expect(parsedPending.currentDifficulty).toBe('Moderate');
    });

    it('9. stale remote profile CANNOT overwrite a newer local profile', async () => {
      // Pre-seed local profile with recent timestamp
      const localProfile = AdaptiveDifficultyService.getProfile(patientAlpha);
      const localTime = new Date('2026-11-08T12:00:00Z').toISOString();
      AdaptiveDifficultyService.saveProfile({
        ...localProfile,
        currentDifficulty: 'Moderate',
        consecutiveComfortableSessions: 2,
        updatedAt: localTime
      });

      // Stale remote profile with older timestamp
      const staleRemoteProfile = {
        patientId: patientAlpha,
        currentDifficulty: 'Gentle',
        pacing: 'calm',
        consecutiveComfortableSessions: 0,
        consecutiveStruggleSessions: 0,
        adaptationRationale: 'Old snapshot',
        updatedAt: new Date('2026-11-08T10:00:00Z').toISOString() // 2 hours older
      };

      // Mock getDoc to return stale remote snapshot
      const mockSnap = {
        exists: () => true,
        data: () => staleRemoteProfile
      };
      vi.spyOn(firestoreModule, 'getDoc').mockResolvedValue(mockSnap as any);

      vi.spyOn(AdaptiveDifficultyService, 'isOnline').mockReturnValue(true);

      // Simulate remote sync
      const result = await AdaptiveDifficultyService.syncProfileFromFirestore(patientAlpha);

      // Local profile MUST prevail because it is newer!
      expect(result.currentDifficulty).toBe('Moderate');
      expect(result.consecutiveComfortableSessions).toBe(2);
    });
  });

  /* ========================================================================= */
  /* PART 3: Account Switching & Patient UID Isolation                         */
  /* ========================================================================= */
  describe('Part 3: Account Switching & Patient UID Isolation', () => {
    it('10. strictly isolates evaluated session IDs and profiles between different patients', () => {
      // Patient Alpha plays session 1
      AdaptiveDifficultyService.evaluateSession(patientAlpha, {
        sessionId: 'sess_alpha_101',
        gameId: 'game-matching',
        durationSeconds: 70,
        completed: true,
        accuracy: 1.0
      });

      // Patient Beta plays session 2
      AdaptiveDifficultyService.evaluateSession(patientBeta, {
        sessionId: 'sess_beta_201',
        gameId: 'game-word-garden',
        durationSeconds: 80,
        completed: true,
        accuracy: 1.0
      });

      const profileAlpha = AdaptiveDifficultyService.getProfile(patientAlpha);
      const profileBeta = AdaptiveDifficultyService.getProfile(patientBeta);

      expect(profileAlpha.evaluatedSessionIds).toContain('sess_alpha_101');
      expect(profileAlpha.evaluatedSessionIds).not.toContain('sess_beta_201');

      expect(profileBeta.evaluatedSessionIds).toContain('sess_beta_201');
      expect(profileBeta.evaluatedSessionIds).not.toContain('sess_alpha_101');
    });

    it('11. switching accounts does not leak pending sync queue data', async () => {
      vi.spyOn(AdaptiveDifficultyService, 'isOnline').mockReturnValue(false);

      // Patient Alpha has pending offline changes
      await AdaptiveDifficultyService.saveProfile({
        ...AdaptiveDifficultyService.getProfile(patientAlpha),
        currentDifficulty: 'Stimulating'
      });

      // Switch to Patient Beta
      const profileBeta = AdaptiveDifficultyService.getProfile(patientBeta);
      expect(profileBeta.currentDifficulty).toBe('Gentle');

      // Alpha has pending sync, Beta has none
      expect(localStorage.getItem(`saksham_pending_adaptive_sync_${patientAlpha}`)).not.toBeNull();
      expect(localStorage.getItem(`saksham_pending_adaptive_sync_${patientBeta}`)).toBeNull();
    });
  });
});
