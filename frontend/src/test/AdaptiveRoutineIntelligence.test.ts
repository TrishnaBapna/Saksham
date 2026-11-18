import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveSupportService } from '../features/adaptive/services/adaptiveSupportService.js';
import { CalendarService } from '../features/calendar/services/calendarService.js';
import {
  RoutineExecutionRecord,
  StepExecutionRecord,
} from '../features/adaptive/types/adaptive.types.js';

describe('Priority 2: Intelligent Adaptive To-Do & Routine System', () => {
  const patientId = 'test-patient-pri2';
  const routineId = 'routine-morning-dressing-01';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    AdaptiveSupportService.clearCache();
    vi.clearAllMocks();
  });

  describe('1. Learning Step-Level Abilities Across 8 Execution States', () => {
    it('records step-level execution accurately across the 8 execution states', async () => {
      const stepRecords: StepExecutionRecord[] = [
        {
          stepIndex: 0,
          stepDescription: '1. Lay loose shirt flat and perform gentle finger stretches',
          state: 'COMPLETED_INDEPENDENTLY',
          assistanceLevel: 'none',
          durationSeconds: 45,
          timestamp: '2026-11-17T08:31:00Z',
        },
        {
          stepIndex: 1,
          stepDescription: '2. Fasten buttons starting from bottom upward',
          state: 'COMPLETED_WITH_VERBAL_GUIDE',
          assistanceLevel: 'verbal_guide',
          durationSeconds: 90,
          timestamp: '2026-11-17T08:32:30Z',
        },
        {
          stepIndex: 2,
          stepDescription: '3. Smooth sleeves comfortably and posture check',
          state: 'COMPLETED_INDEPENDENTLY',
          assistanceLevel: 'none',
          durationSeconds: 30,
          timestamp: '2026-11-17T08:33:00Z',
        },
      ];

      const execution: RoutineExecutionRecord = {
        id: 'exec-001',
        routineId,
        patientId,
        routineTitle: 'Morning Dressing & Shirt Fastening',
        scheduledTime: '08:30 AM',
        steps: stepRecords,
        overallState: 'COMPLETED_WITH_VERBAL_GUIDE',
        completedAt: '2026-11-17T08:33:00Z',
      };

      await AdaptiveSupportService.recordRoutineExecution(execution);

      const retrieved = AdaptiveSupportService.getRoutineExecutions(patientId, routineId);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].overallState).toBe('COMPLETED_WITH_VERBAL_GUIDE');
      expect(retrieved[0].steps).toHaveLength(3);
      expect(retrieved[0].steps[1].state).toBe('COMPLETED_WITH_VERBAL_GUIDE');
    });
  });

  describe('2. Distinguishing 3 Orthogonal Difficulty Dimensions', () => {
    it('evaluates remembering, initiating, and completing dimensions independently with non-diagnostic guarantee', async () => {
      // Session 1: Started on time, prompt start, completed independently
      await AdaptiveSupportService.recordRoutineExecution({
        id: 's1',
        routineId,
        patientId,
        routineTitle: 'Routine 1',
        scheduledTime: '08:00 AM',
        steps: [
          {
            stepIndex: 0,
            stepDescription: 'Step 1',
            state: 'COMPLETED_INDEPENDENTLY',
            assistanceLevel: 'none',
            durationSeconds: 30,
            timestamp: '2026-11-17T08:01:00Z',
          },
        ],
        overallState: 'COMPLETED_INDEPENDENTLY',
        completedAt: '2026-11-17T08:01:30Z',
      });

      // Session 2: Needed reminder, but completed steps once started
      await AdaptiveSupportService.recordRoutineExecution({
        id: 's2',
        routineId,
        patientId,
        routineTitle: 'Routine 2',
        scheduledTime: '12:00 PM',
        steps: [
          {
            stepIndex: 0,
            stepDescription: 'Step 1',
            state: 'COMPLETED_INDEPENDENTLY',
            assistanceLevel: 'none',
            durationSeconds: 25,
            timestamp: '2026-11-17T12:05:00Z',
          },
        ],
        overallState: 'COMPLETED_WITH_REMINDER',
        completedAt: '2026-11-17T12:05:30Z',
      });

      const dimensions = AdaptiveSupportService.evaluateAbilityDimensions(patientId);
      expect(dimensions.patientId).toBe(patientId);
      expect(dimensions.rememberingScore).toBeGreaterThan(0);
      expect(dimensions.initiatingScore).toBeGreaterThan(0);
      expect(dimensions.completingScore).toBe(1.0);
      expect(dimensions.nonDiagnosticDisclaimer).toContain(
        'Saksham does not compute clinical staging or medical diagnostic metrics'
      );
    });
  });

  describe('3. Adaptive Assistance Rules & Interruption Exclusions', () => {
    it('Rule 1: provides immediate temporary reassurance on single struggle without altering routine', async () => {
      const res = await AdaptiveSupportService.recordObservation({
        id: 'obs-01',
        patientId,
        activityId: routineId,
        activityTitle: 'Morning Dressing',
        activityType: 'routine',
        timestamp: new Date().toISOString(),
        sessionId: 'sess-01',
        assistanceRequested: true,
        hintsUsedCount: 2,
        repeatedInstructionCount: 1,
        completionStatus: 'completed',
        pauseCount: 0,
        durationSeconds: 120,
        isInterrupted: false,
        currentLevel: 'standard_steps',
      });

      expect(res.temporaryAssistance).toBeDefined();
      expect(res.temporaryAssistance?.supportOffered).toBe(true);
      expect(res.proposalGenerated).toBeUndefined(); // Does not generate proposal on single struggle
    });

    it('Rule 2: generates supportive micro-step split proposal on 2 struggles in 7-day window', async () => {
      // First struggle
      await AdaptiveSupportService.recordObservation({
        id: 'obs-struggle-1',
        patientId,
        activityId: routineId,
        activityTitle: 'Morning Dressing',
        activityType: 'routine',
        timestamp: new Date().toISOString(),
        sessionId: 'sess-struggle-1',
        assistanceRequested: true,
        hintsUsedCount: 2,
        repeatedInstructionCount: 2,
        completionStatus: 'abandoned',
        pauseCount: 1,
        durationSeconds: 90,
        isInterrupted: false,
        currentLevel: 'standard_steps',
      });

      // Second struggle
      const res2 = await AdaptiveSupportService.recordObservation({
        id: 'obs-struggle-2',
        patientId,
        activityId: routineId,
        activityTitle: 'Morning Dressing',
        activityType: 'routine',
        timestamp: new Date().toISOString(),
        sessionId: 'sess-struggle-2',
        assistanceRequested: true,
        hintsUsedCount: 2,
        repeatedInstructionCount: 2,
        completionStatus: 'abandoned',
        pauseCount: 1,
        durationSeconds: 110,
        isInterrupted: false,
        currentLevel: 'standard_steps',
      });

      expect(res2.proposalGenerated).toBeDefined();
      expect(res2.proposalGenerated?.domain).toBe('routine_step_split');
      expect(res2.proposalGenerated?.calmExplanation.en).toContain('smaller steps');
      expect(res2.proposalGenerated?.calmExplanation.hi).toContain('छोटे-छोटे चरणों');
      expect(res2.proposalGenerated?.calmExplanation.mr).toContain('लहान पायऱ्यांमध्ये');
    });

    it('Filter Rule: ignores sessions < 10 seconds or marked INTERRUPTED_EXTERNAL', async () => {
      const res = await AdaptiveSupportService.recordObservation({
        id: 'obs-short',
        patientId,
        activityId: routineId,
        activityTitle: 'Morning Dressing',
        activityType: 'routine',
        timestamp: new Date().toISOString(),
        sessionId: 'sess-short',
        assistanceRequested: true,
        hintsUsedCount: 3,
        repeatedInstructionCount: 2,
        completionStatus: 'abandoned',
        pauseCount: 0,
        durationSeconds: 5, // < 10s!
        isInterrupted: true,
        currentLevel: 'standard_steps',
      });

      expect(res.temporaryAssistance).toBeUndefined();
      expect(res.proposalGenerated).toBeUndefined();
    });
  });

  describe('4. Reversible Routine Challenges with 1-Tap Instant Restore', () => {
    it('creates reversible challenge and restores original familiar routine in 1 tap', async () => {
      const originalSteps = ['Step 1: Lay shirt', 'Step 2: Fasten buttons', 'Step 3: Check posture'];
      const challengedSteps = ['Step 1: Put on shirt and button completely'];

      const challenge = await AdaptiveSupportService.createReversibleChallenge(patientId, routineId, {
        originalSteps,
        challengedSteps,
        rationale: 'Exploring consolidated dressing sequence based on 3 comfortable sessions',
      });

      expect(challenge.isChallengeActive).toBe(true);
      expect(challenge.canInstantRestore).toBe(true);

      const active = AdaptiveSupportService.getReversibleChallenge(patientId, routineId);
      expect(active?.isChallengeActive).toBe(true);

      // Revert with 1 tap
      const restored = await AdaptiveSupportService.restoreOriginalRoutine(patientId, routineId);
      expect(restored).toBe(true);

      const postRevert = AdaptiveSupportService.getReversibleChallenge(patientId, routineId);
      expect(postRevert?.isChallengeActive).toBe(false);
      expect(postRevert?.originalSteps).toEqual(originalSteps);
    });
  });

  describe('5. Time-Based Gentle Checking with "No-Response-Is-Not-Failure"', () => {
    it('confirms completion when patient says yes', () => {
      const check = AdaptiveSupportService.checkNearTimeActivityStatus(
        'Dressing Routine',
        '08:30 AM',
        'yes',
        'en'
      );
      expect(check.status).toBe('COMPLETED_INDEPENDENTLY');
      expect(check.speech).toContain('finished');
      expect(check.requiresSupport).toBe(false);
    });

    it('offers gentle assistance when patient says no without rushing', () => {
      const check = AdaptiveSupportService.checkNearTimeActivityStatus(
        'Dressing Routine',
        '08:30 AM',
        'no',
        'en'
      );
      expect(check.status).toBe('COMPLETED_WITH_REMINDER');
      expect(check.speech).toContain('No hurry at all');
      expect(check.requiresSupport).toBe(true);
    });

    it('strictly enforces no-response-is-not-failure: silence/none is neutral and never penalized', () => {
      const check = AdaptiveSupportService.checkNearTimeActivityStatus(
        'Dressing Routine',
        '08:30 AM',
        'none',
        'en'
      );
      expect(check.status).toBe('COMPLETION_UNCERTAIN');
      expect(check.speech).toContain('gentle time you need');
      expect(check.requiresSupport).toBe(false); // Strictly NO penalty or struggle flag
    });

    it('CalendarService near-time check aligns with no-response-is-not-failure policy', () => {
      const check = CalendarService.checkNearTimeActivity(
        'Morning Medicine',
        '09:00 AM',
        'none',
        'en'
      );
      expect(check.isCompleted).toBe(false);
      expect(check.isStruggle).toBe(false); // NO struggle penalty!
      expect(check.completionState).toBe('COMPLETION_UNCERTAIN');
    });
  });
});
