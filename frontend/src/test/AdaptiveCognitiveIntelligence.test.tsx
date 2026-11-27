import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as firestoreModule from 'firebase/firestore';
import { resetMockFirestoreStore } from './setup.js';
import {
  AdaptiveDifficultyService,
  DEFAULT_ADAPTIVE_CONFIG,
} from '../features/games/services/adaptiveDifficultyService.js';
import { GAME_CATALOGUE, GamesService } from '../features/games/services/gamesService.js';
import { CaregiverReportService } from '../features/caregiver/services/caregiverReportService.js';
import { CaregiverObservationReport } from '../features/caregiver/components/CaregiverObservationReport.js';
import { DoctorAnalyticsService } from '../features/doctor/services/doctorAnalyticsService.js';
import { DoctorLongitudinalAnalytics } from '../features/doctor/components/DoctorLongitudinalAnalytics.js';
import { NotificationService } from '../features/notifications/services/notificationService.js';
import { CardMatchingGame } from '../features/games/components/runners/CardMatchingGame.js';
import { VisualSearchGame } from '../features/games/components/runners/VisualSearchGame.js';
import { MathSprintGame } from '../features/games/components/runners/MathSprintGame.js';
import { GameRunMetrics } from '../types/index.js';

describe('Patient-Progress-Based Adaptive Cognitive Game Intelligence', () => {
  const patientA = 'patient-adaptive-alpha-01';
  const patientB = 'patient-adaptive-beta-02';
  const assignedDoctor = 'doctor-verified-01';
  const unassignedDoctor = 'doctor-unassigned-99';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetMockFirestoreStore();
    AdaptiveDifficultyService.clearAll();
    NotificationService.clearCache();
    DoctorAnalyticsService.clearSimulatedAssignments();
    DoctorAnalyticsService.setSimulatedAssignment(assignedDoctor, patientA, 'active', 'Meera Rao');
    DoctorAnalyticsService.setSimulatedAssignment(unassignedDoctor, patientA, 'none');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. safe default: initializes every game independently at Gentle / Calm', () => {
    const matching = AdaptiveDifficultyService.getGameProfile(patientA, 'game-matching');
    const wordGarden = AdaptiveDifficultyService.getGameProfile(patientA, 'game-word-garden');
    expect(matching.currentDifficulty).toBe('Gentle');
    expect(matching.pacing).toBe('calm');
    expect(wordGarden.currentDifficulty).toBe('Gentle');
    expect(wordGarden.pacing).toBe('calm');
  });

  it('2. gradual step-up: steps Gentle -> Moderate -> Stimulating only after consecutive comfortable sessions', async () => {
    // 1st high accuracy session: stays Gentle
    const r1 = await GamesService.recordSession(patientA, {
      id: 'prog-s1',
      gameId: 'game-matching',
      gameTitle: 'Peaceful Nature Card Matching',
      category: 'memory',
      difficulty: 'Gentle',
      date: '2026-11-20',
      durationSeconds: 70,
      completed: true,
      accuracy: 0.95,
      score: 95,
      mistakesCount: 0,
      hintsUsed: 0,
    });
    expect(r1.difficultyAfter).toBe('Gentle');
    expect(r1.difficultyAdjustment).toBe('unchanged');

    // 2nd strong session: still Gentle (no premature skip!)
    const r2 = await GamesService.recordSession(patientA, {
      id: 'prog-s2',
      gameId: 'game-matching',
      gameTitle: 'Peaceful Nature Card Matching',
      category: 'memory',
      difficulty: 'Gentle',
      date: '2026-11-21',
      durationSeconds: 65,
      completed: true,
      accuracy: 0.92,
      score: 92,
      mistakesCount: 0,
      hintsUsed: 1,
    });
    expect(r2.difficultyAfter).toBe('Gentle');

    // 3rd consecutive comfortable session: steps cleanly to Moderate (never straight to Stimulating!)
    const r3 = await GamesService.recordSession(patientA, {
      id: 'prog-s3',
      gameId: 'game-matching',
      gameTitle: 'Peaceful Nature Card Matching',
      category: 'memory',
      difficulty: 'Gentle',
      date: '2026-11-22',
      durationSeconds: 60,
      completed: true,
      accuracy: 1.0,
      score: 100,
      mistakesCount: 0,
      hintsUsed: 0,
    });
    expect(r3.difficultyBefore).toBe('Gentle');
    expect(r3.difficultyAfter).toBe('Moderate');
    expect(r3.difficultyAdjustment).toBe('increased');

    // 3 more strong sessions at Moderate -> Stimulating
    for (let i = 4; i <= 6; i++) {
      await GamesService.recordSession(patientA, {
        id: `prog-s${i}`,
        gameId: 'game-matching',
        gameTitle: 'Peaceful Nature Card Matching',
        category: 'memory',
        difficulty: 'Moderate',
        date: `2026-11-2${i}`,
        durationSeconds: 75,
        completed: true,
        accuracy: 0.9,
        score: 90,
        mistakesCount: 1,
        hintsUsed: 1,
      });
    }
    const profileAfterSix = AdaptiveDifficultyService.getGameProfile(patientA, 'game-matching');
    expect(profileAfterSix.currentDifficulty).toBe('Stimulating');
    expect(profileAfterSix.pacing).toBe('agile');
  });

  it('3. gradual step-down on repeated struggle (2 consecutive struggling sessions)', async () => {
    await AdaptiveDifficultyService.saveGameProfile(
      {
        ...AdaptiveDifficultyService.getDefaultProfile(patientA),
        currentDifficulty: 'Stimulating',
        pacing: 'agile',
      },
      'game-pattern-completion'
    );

    // 1st struggling session holds steady & enables extra support
    const s1 = await GamesService.recordSession(patientA, {
      id: 'str-1',
      gameId: 'game-pattern-completion',
      gameTitle: 'Pattern Recognition',
      category: 'pattern',
      difficulty: 'Stimulating',
      date: '2026-11-22',
      durationSeconds: 120,
      completed: true,
      accuracy: 0.35,
      score: 40,
      mistakesCount: 4,
      hintsUsed: 1,
    });
    expect(s1.difficultyAfter).toBe('Stimulating');
    expect(
      AdaptiveDifficultyService.getAdaptedGameParameters(patientA, 'game-pattern-completion')
        .assistiveHintsEnabled
    ).toBe(true);

    // 2nd consecutive struggling session gently steps down 1 level to Moderate
    const s2 = await GamesService.recordSession(patientA, {
      id: 'str-2',
      gameId: 'game-pattern-completion',
      gameTitle: 'Pattern Recognition',
      category: 'pattern',
      difficulty: 'Stimulating',
      date: '2026-11-23',
      durationSeconds: 130,
      completed: true,
      accuracy: 0.4,
      score: 40,
      mistakesCount: 3,
      hintsUsed: 2,
    });
    expect(s2.difficultyBefore).toBe('Stimulating');
    expect(s2.difficultyAfter).toBe('Moderate');
    expect(s2.difficultyAdjustment).toBe('decreased');
  });

  it('4. single poor session protection: does NOT harshly downgrade or notify caregiver after 1 tough round', async () => {
    await AdaptiveDifficultyService.saveGameProfile(
      {
        ...AdaptiveDifficultyService.getDefaultProfile(patientA),
        currentDifficulty: 'Moderate',
        pacing: 'balanced',
      },
      'game-math-sprint'
    );

    const outcome = await GamesService.recordSession(patientA, {
      id: 'single-bad-01',
      gameId: 'game-math-sprint',
      gameTitle: 'Continuous Math Sprint',
      category: 'sequence',
      difficulty: 'Moderate',
      date: '2026-11-24',
      durationSeconds: 95,
      completed: true,
      accuracy: 0.33,
      score: 40,
      mistakesCount: 4,
      hintsUsed: 1,
    });

    expect(outcome.difficultyAfter).toBe('Moderate');
    expect(outcome.difficultyAdjustment).toBe('unchanged');
    const meta = AdaptiveDifficultyService.getGameMetadata(patientA, 'game-math-sprint');
    expect(meta.assistiveHintsEnabled).toBe(true);
    expect(meta.highClarityMode).toBe(true);

    // Must never alarm caregiver after a single poor session
    const caregiverNotifs = NotificationService.getNotifications(patientA, 'caregiver');
    expect(caregiverNotifs.length).toBe(0);
  });

  it('5. mixed performance stability: alternating high and low sessions remain steady at Moderate', () => {
    AdaptiveDifficultyService.saveGameProfile(
      {
        ...AdaptiveDifficultyService.getDefaultProfile(patientA),
        currentDifficulty: 'Moderate',
        pacing: 'balanced',
      },
      'game-shape-match'
    );

    const a1 = AdaptiveDifficultyService.evaluateGameSession(patientA, {
      sessionId: 'mix-1',
      gameId: 'game-shape-match',
      durationSeconds: 60,
      completed: true,
      accuracy: 0.4,
      mistakesCount: 3,
    });
    const a2 = AdaptiveDifficultyService.evaluateGameSession(patientA, {
      sessionId: 'mix-2',
      gameId: 'game-shape-match',
      durationSeconds: 55,
      completed: true,
      accuracy: 0.9,
      mistakesCount: 0,
    });
    const a3 = AdaptiveDifficultyService.evaluateGameSession(patientA, {
      sessionId: 'mix-3',
      gameId: 'game-shape-match',
      durationSeconds: 65,
      completed: true,
      accuracy: 0.65,
      mistakesCount: 2,
    });

    expect(a1.difficultyAfter).toBe('Moderate');
    expect(a2.difficultyAfter).toBe('Moderate');
    expect(a3.difficultyAfter).toBe('Moderate');
  });

  it('6. incomplete / interrupted session rule: never penalizes or counts as cognitive struggle', () => {
    AdaptiveDifficultyService.saveGameProfile(
      {
        ...AdaptiveDifficultyService.getDefaultProfile(patientA),
        currentDifficulty: 'Moderate',
        pacing: 'balanced',
        consecutiveComfortableSessions: 2,
        consecutiveStruggleSessions: 0,
      },
      'game-visual-search'
    );

    const interrupted = AdaptiveDifficultyService.evaluateGameSession(patientA, {
      sessionId: 'int-1',
      gameId: 'game-visual-search',
      durationSeconds: 45,
      completed: false,
      isInterrupted: true,
      accuracy: 0.0,
    });

    expect(interrupted.difficultyAfter).toBe('Moderate');
    expect(interrupted.difficultyAdjustment).toBe('unchanged');
    expect(interrupted.completionStatus).toBe('interrupted');
    expect(interrupted.profile.consecutiveStruggleSessions).toBe(0);
    expect(interrupted.profile.consecutiveComfortableSessions).toBe(2);
  });

  it('7. frequent hint use factor: heavy hint reliance prevents premature step-up without penalty', () => {
    for (let i = 1; i <= 4; i++) {
      const res = AdaptiveDifficultyService.evaluateGameSession(patientA, {
        sessionId: `hint-heavy-${i}`,
        gameId: 'game-word-unscramble',
        durationSeconds: 90,
        completed: true,
        accuracy: 1.0,
        mistakesCount: 0,
        hintsUsedCount: DEFAULT_ADAPTIVE_CONFIG.maxComfortHints + 2,
      });
      expect(res.difficultyAfter).toBe('Gentle');
      expect(res.profile.consecutiveStruggleSessions).toBe(0);
      expect(res.metadata.assistiveHintsEnabled).toBe(true);
    }
  });

  it('8. min and max difficulty bounds are strictly enforced', () => {
    // At Gentle floor: explicit easier requests keep Gentle (tier >= 0)
    const minRes = AdaptiveDifficultyService.evaluateGameSession(patientA, {
      sessionId: 'bound-min',
      gameId: 'game-matching',
      durationSeconds: 50,
      completed: true,
      patientFeedback: 'Too difficult',
    });
    expect(minRes.difficultyAfter).toBe('Gentle');
    expect(minRes.metadata.tier).toBeGreaterThanOrEqual(0);

    // At Stimulating cap: comfortable streak stays Stimulating (tier <= 4)
    AdaptiveDifficultyService.saveGameProfile(
      {
        ...AdaptiveDifficultyService.getDefaultProfile(patientA),
        currentDifficulty: 'Stimulating',
        pacing: 'agile',
      },
      'game-alternating-taps'
    );
    for (let i = 1; i <= 5; i++) {
      const capRes = AdaptiveDifficultyService.evaluateGameSession(patientA, {
        sessionId: `bound-max-${i}`,
        gameId: 'game-alternating-taps',
        durationSeconds: 40,
        completed: true,
        accuracy: 1.0,
        mistakesCount: 0,
      });
      expect(capRes.difficultyAfter).toBe('Stimulating');
      expect(capRes.metadata.tier).toBeLessThanOrEqual(4);
    }
  });

  it('9. oscillation prevention: reversal cooldown absorbs immediate rebound after a downgrade', () => {
    AdaptiveDifficultyService.saveGameProfile(
      {
        ...AdaptiveDifficultyService.getDefaultProfile(patientA),
        currentDifficulty: 'Moderate',
        pacing: 'balanced',
      },
      'game-daily-sequence'
    );

    // Step down via explicit comfort request
    const down = AdaptiveDifficultyService.evaluateGameSession(patientA, {
      sessionId: 'osc-down',
      gameId: 'game-daily-sequence',
      durationSeconds: 60,
      completed: true,
      patientFeedback: 'Too difficult',
    });
    expect(down.difficultyAfter).toBe('Gentle');
    expect(down.metadata.reversalCooldownRemaining).toBe(1);

    // Next 3 comfortable sessions cannot rebound in 3 because session 1 settles cooldown cleanly
    const c1 = AdaptiveDifficultyService.evaluateGameSession(patientA, {
      sessionId: 'osc-c1',
      gameId: 'game-daily-sequence',
      durationSeconds: 55,
      completed: true,
      accuracy: 1.0,
      mistakesCount: 0,
    });
    expect(c1.profile.consecutiveComfortableSessions).toBe(0);
    expect(c1.difficultyAfter).toBe('Gentle');
  });

  it('10. game-specific independence & full 21-game adapted parameter coverage', () => {
    for (let i = 1; i <= 3; i++) {
      AdaptiveDifficultyService.evaluateGameSession(patientA, {
        sessionId: `ind-match-${i}`,
        gameId: 'game-matching',
        durationSeconds: 50,
        completed: true,
        accuracy: 1.0,
        mistakesCount: 0,
      });
    }

    // Matching stepped up, while untouched games stay Gentle
    expect(AdaptiveDifficultyService.getGameProfile(patientA, 'game-matching').currentDifficulty).toBe('Moderate');
    expect(AdaptiveDifficultyService.getGameProfile(patientA, 'game-word-garden').currentDifficulty).toBe('Gentle');
    expect(AdaptiveDifficultyService.getGameProfile(patientA, 'game-color-sequence').currentDifficulty).toBe('Gentle');

    // Every catalogue game produces valid numeric parameters
    for (const g of GAME_CATALOGUE) {
      const params = AdaptiveDifficultyService.getAdaptedGameParameters(patientA, g.id);
      expect(params.gameId).toBe(g.id);
      expect(params.itemCount).toBeGreaterThan(0);
      expect(params.sequenceLength).toBeGreaterThan(0);
      expect(params.choiceCount).toBeGreaterThanOrEqual(2);
      expect(params.memorizationDelayMs).toBeGreaterThan(0);
    }
  });

  it('11. persistence across reload & strict Firestore 11-key allowlist compliance', async () => {
    const setDocSpy = vi.spyOn(firestoreModule, 'setDoc');

    await GamesService.recordSession(patientA, {
      id: 'persist-01',
      gameId: 'game-color-sequence',
      gameTitle: 'Color Sequence Memory',
      category: 'memory',
      difficulty: 'Gentle',
      date: '2026-11-25',
      durationSeconds: 60,
      completed: true,
      accuracy: 1.0,
      score: 100,
    });

    // Verify all Firestore writes into adaptiveProfiles adhere strictly to the 11-key rule
    const allowedKeys = new Set([
      'patientId',
      'currentDifficulty',
      'pacing',
      'consecutiveComfortableSessions',
      'consecutiveStruggleSessions',
      'lastSessionEvaluated',
      'lastEvaluatedSessionId',
      'evaluatedSessionIds',
      'syncStatus',
      'adaptationRationale',
      'updatedAt',
    ]);
    for (const call of setDocSpy.mock.calls) {
      const refArg = call[0] as { path?: string };
      const payloadArg = call[1] as Record<string, unknown>;
      if (refArg?.path && refArg.path.includes('adaptiveProfiles')) {
        for (const key of Object.keys(payloadArg)) {
          expect(allowedKeys.has(key)).toBe(true);
        }
      }
    }

    // Simulate browser tab reload by clearing in-memory cache only
    AdaptiveDifficultyService.clearAll();

    const reloadedGameProfile = AdaptiveDifficultyService.getGameProfile(patientA, 'game-color-sequence');
    expect(reloadedGameProfile.consecutiveComfortableSessions).toBe(1);
    expect(reloadedGameProfile.evaluatedSessionIds).toContain('persist-01');
  });

  it('12. patient isolation & strict unassigned doctor access denial', async () => {
    await GamesService.recordSession(patientA, {
      id: 'iso-a1',
      gameId: 'game-matching',
      gameTitle: 'Peaceful Nature Card Matching',
      category: 'memory',
      difficulty: 'Gentle',
      date: new Date().toISOString().split('T')[0],
      durationSeconds: 70,
      completed: true,
      accuracy: 0.9,
      score: 90,
    });

    expect(AdaptiveDifficultyService.getGameProfile(patientB, 'game-matching').evaluatedSessionIds).toEqual([]);
    expect(GamesService.getHistory(patientB).length).toBe(0);

    const unauthReport = await DoctorAnalyticsService.get30DayGameDifficultyActivity(patientA, unassignedDoctor);
    expect(unauthReport.isAuthorized).toBe(false);
    expect(unauthReport.status).toBe('unauthorized');
    expect(unauthReport.perGameProgress).toEqual([]);
    expect(unauthReport.totalSessions).toBe(0);
  });

  it('13. caregiver and doctor views surface factual per-game progress without synthetic fallback numbers', async () => {
    // Empty history reports null averages rather than fake 78/850ms
    const emptyCaregiverReport = CaregiverReportService.generateWeeklyReport(patientB, 'Rohan Verma', [], []);
    expect(emptyCaregiverReport.cognitiveEngagement.gamesPlayedCount).toBe(0);
    expect(emptyCaregiverReport.cognitiveEngagement.averageScore).toBeNull();
    expect(emptyCaregiverReport.cognitiveEngagement.perGameProgress).toEqual([]);

    const today = new Date().toISOString().split('T')[0];
    await GamesService.recordSession(patientA, {
      id: 'vis-1',
      gameId: 'game-matching',
      gameTitle: 'Peaceful Nature Card Matching',
      category: 'memory',
      difficulty: 'Gentle',
      date: today,
      durationSeconds: 85,
      completed: true,
      accuracy: 0.85,
      score: 85,
      hintsUsed: 1,
    });

    const caregiverReport = CaregiverReportService.generateWeeklyReport(patientA, 'Meera Rao', [], []);
    expect(caregiverReport.cognitiveEngagement.completedGamesCount).toBe(1);
    expect(caregiverReport.cognitiveEngagement.totalHintsUsed).toBe(1);
    expect(caregiverReport.cognitiveEngagement.perGameProgress[0].gameId).toBe('game-matching');

    render(
      <CaregiverObservationReport
        patientId={patientA}
        patientName="Meera Rao"
        routines={[]}
        history={[]}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('caregiver-adaptive-game-progress')).toHaveTextContent(
        'Peaceful Nature Card Matching'
      );
    });
    cleanup();

    const docMetrics = await DoctorAnalyticsService.get30DayGameDifficultyActivity(patientA, assignedDoctor);
    expect(docMetrics.isAuthorized).toBe(true);
    expect(docMetrics.completedSessions).toBe(1);
    expect(docMetrics.averageAccuracyPercent).toBe(85);
    expect(docMetrics.perGameProgress.length).toBe(1);

    vi.spyOn(DoctorAnalyticsService, 'subscribeToDoctorAssignment').mockImplementation(
      (_docId, _patId, callback) => {
        callback({
          isAssigned: true,
          status: 'active',
          doctorId: assignedDoctor,
          patientId: patientA,
          patientName: 'Meera Rao',
        });
        return () => {};
      }
    );

    render(
      <BrowserRouter>
        <DoctorLongitudinalAnalytics
          doctorId={assignedDoctor}
          patientId={patientA}
          patientName="Meera Rao"
        />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('doctor-per-game-progression')).toBeInTheDocument();
    });
    expect(screen.getByTestId('doctor-per-game-progression')).toHaveTextContent('Peaceful Nature Card Matching');
  });

  it('14. runners emit genuine GameRunMetrics and respect per-game AdaptiveParameters', () => {
    vi.useFakeTimers();

    // Test VisualSearchGame gridSize scaling from adaptiveParams
    const searchComplete = vi.fn();
    render(
      <VisualSearchGame
        difficulty="Gentle"
        adaptiveParams={{
          ...AdaptiveDifficultyService.getAdaptedGameParameters(patientA, 'game-visual-search', 'Gentle'),
          gridSize: 6,
        }}
        onComplete={searchComplete}
      />
    );
    const searchButtons = screen.getAllByRole('button', { name: /Item:/i });
    expect(searchButtons.length).toBe(6);

    // Test MathSprintGame metrics calculation on completion
    const mathComplete = vi.fn<(metrics?: GameRunMetrics) => void>();
    const mathParams = AdaptiveDifficultyService.getAdaptedGameParameters(patientA, 'game-math-sprint', 'Gentle');
    render(
      <MathSprintGame
        difficulty="Gentle"
        adaptiveParams={{ ...mathParams, itemCount: 3 }}
        onComplete={mathComplete}
      />
    );
    for (let r = 0; r < 3; r++) {
      act(() => {
        const optionBtns = screen.getAllByRole('button', { name: /^Option \d+/i });
        fireEvent.click(optionBtns[0]);
      });
      act(() => {
        vi.advanceTimersByTime(1400);
      });
    }
    expect(mathComplete).toHaveBeenCalled();
    const emittedMetrics = mathComplete.mock.calls[0][0];
    expect(emittedMetrics).toBeDefined();
    expect(emittedMetrics?.attempts).toBeGreaterThanOrEqual(3);
    expect(typeof emittedMetrics?.score).toBe('number');
    expect(emittedMetrics?.completionStatus).toBe('completed');

    // Test CardMatchingGame hint counting via onRequestHint
    const hintSpy = vi.fn();
    render(
      <CardMatchingGame
        difficulty="Gentle"
        adaptiveParams={AdaptiveDifficultyService.getAdaptedGameParameters(patientA, 'game-matching', 'Gentle')}
        onComplete={vi.fn()}
        onRequestHint={hintSpy}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Asha's Gentle Hint/i }));
    expect(hintSpy).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('15. non-diagnostic & supportive rationale boundary never contains stigmatizing clinical claims', () => {
    const res = AdaptiveDifficultyService.evaluateGameSession(patientA, {
      sessionId: 'safe-text-1',
      gameId: 'game-word-garden',
      durationSeconds: 110,
      completed: true,
      accuracy: 0.4,
      mistakesCount: 3,
    });
    expect(res.adjustmentReason).not.toMatch(/dementia|alzheimer|impairment|deficit|failed|decline|iq/i);
  });

  it('16. duplicate session IDs never double-record or double-count adaptive progression', async () => {
    const payload = {
      id: 'dedup-sess-99',
      gameId: 'game-loved-ones-cues',
      gameTitle: 'Familiar Family Voices & Cues',
      category: 'memory' as const,
      difficulty: 'Gentle' as const,
      date: '2026-11-26',
      durationSeconds: 65,
      completed: true,
      accuracy: 1.0,
      score: 100,
    };

    await GamesService.recordSession(patientA, payload);
    await GamesService.recordSession(patientA, payload);

    const history = GamesService.getHistory(patientA);
    expect(history.filter((h) => h.id === 'dedup-sess-99').length).toBe(1);
    expect(
      AdaptiveDifficultyService.getGameProfile(patientA, 'game-loved-ones-cues')
        .consecutiveComfortableSessions
    ).toBe(1);
  });
});
