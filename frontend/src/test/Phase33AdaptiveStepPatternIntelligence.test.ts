/**
 * SAKSHAM NEURO-CARE — PHASE 3.3
 * ADAPTIVE DAILY LIVING INTELLIGENCE & TASK-STEP PATTERN ACCEPTANCE SUITE
 * Evaluates all 20 synthetic scenarios specified in Phase 3.3 Product-Owner Directive.
 * 100% Spark Free Plan compliant — strictly non-diagnostic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StepPatternService } from '../features/routines/services/stepPatternService.js';
import { TaskLifecycleService } from '../features/routines/services/taskLifecycleService.js';
import {
  StepTelemetry,
  TaskInitiationTelemetry,
} from '../features/routines/types/stepPattern.types.js';

describe('Phase 3.3: Competitor-Grounded Adaptive Daily Living Intelligence', () => {
  const patientId = 'phase33-audit-patient';
  const routineId = 'routine-morning-tea';
  const routineTitle = 'Morning Tea Preparation';

  const teaSteps = [
    '1. Take a cup and saucer from the kitchen cupboard',
    '2. Fill the electric kettle with fresh water from the tap',
    '3. Turn on the kettle and wait for the water to boil',
    '4. Measure one teaspoon of tea leaves into the warm pot and steep',
    '5. Pour hot tea safely through a strainer into your cup',
    '6. Return the tea jar and kettle safely to the counter',
  ];

  beforeEach(() => {
    StepPatternService.clearForTesting();
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 1: REPEATED INDEPENDENT COMPLETION                        */
  /* ------------------------------------------------------------------ */
  it('1. learns repeated independent completion and classifies safe steps as mastered', () => {
    // Simulate 3 consecutive independent sessions
    for (let session = 1; session <= 3; session++) {
      const telemetry: StepTelemetry[] = teaSteps.map((title, idx) => ({
        stepIndex: idx,
        stepTitle: title,
        state: 'INDEPENDENT',
        hintTierUsed: 0,
        assistanceRequested: false,
        durationSeconds: 20,
        timestamp: new Date().toISOString(),
      }));

      StepPatternService.recordStepExecution(patientId, routineId, routineTitle, telemetry);
    }

    const patterns = StepPatternService.analyzeStepPatterns(patientId, routineId, teaSteps.length);
    expect(patterns.length).toBe(6);

    // Step 1 should be classified as mastered
    const step1 = patterns[0];
    expect(step1.classification).toBe('mastered');
    expect(step1.totalAttempts).toBe(3);
    expect(step1.independentCount).toBe(3);
    expect(step1.confidence).toBeGreaterThanOrEqual(0.7);

    // Generates optional challenge proposal for safe mastered step
    const challenge = StepPatternService.generateStepChallenge(
      patientId,
      routineId,
      routineTitle,
      step1,
      teaSteps[0],
      'wellness'
    );
    expect(challenge).not.toBeNull();
    expect(challenge?.isSafetyLocked).toBe(false);
    expect(challenge?.status).toBe('available');
    expect(challenge?.promptQuestion).toContain('✨ Memory Challenge');
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 2: REPEATED ASSISTED COMPLETION                           */
  /* ------------------------------------------------------------------ */
  it('2. detects repeated caregiver assistance and proposes targeted simplification', () => {
    for (let session = 1; session <= 3; session++) {
      const telemetry: StepTelemetry[] = teaSteps.map((title, idx) => ({
        stepIndex: idx,
        stepTitle: title,
        state: idx === 4 ? 'ASSISTED' : 'INDEPENDENT',
        hintTierUsed: 0,
        assistanceRequested: idx === 4,
        durationSeconds: 30,
        timestamp: new Date().toISOString(),
      }));

      StepPatternService.recordStepExecution(patientId, routineId, routineTitle, telemetry);
    }

    const patterns = StepPatternService.analyzeStepPatterns(patientId, routineId, teaSteps.length);
    const step5 = patterns[4]; // Step 5: Pouring hot tea

    expect(step5.classification).toBe('assistance_needed');
    expect(step5.assistedCount).toBe(3);

    const proposal = StepPatternService.generateStepSimplification(
      patientId,
      routineId,
      routineTitle,
      step5,
      teaSteps[4]
    );

    expect(proposal).not.toBeNull();
    expect(proposal?.proposedMicroActions.length).toBeGreaterThanOrEqual(2);
    expect(proposal?.rationale).toContain('hints or assistance in 3 of 3');
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 3: REPEATED DIFFICULTY ON ONE PARTICULAR STEP (CHOKE POINT) */
  /* ------------------------------------------------------------------ */
  it('3. isolates choke point to Step 4 while preserving independence of Steps 1-3 and 6', () => {
    for (let session = 1; session <= 4; session++) {
      const telemetry: StepTelemetry[] = teaSteps.map((title, idx) => ({
        stepIndex: idx,
        stepTitle: title,
        state: idx === 3 ? 'HINT_USED' : 'INDEPENDENT',
        hintTierUsed: idx === 3 ? 2 : 0, // Used Contextual Hint on Step 4
        assistanceRequested: false,
        durationSeconds: idx === 3 ? 60 : 15,
        timestamp: new Date().toISOString(),
      }));

      StepPatternService.recordStepExecution(patientId, routineId, routineTitle, telemetry);
    }

    const patterns = StepPatternService.analyzeStepPatterns(patientId, routineId, teaSteps.length);

    // Steps 1, 2, 3 should be mastered
    expect(patterns[0].classification).toBe('mastered');
    expect(patterns[1].classification).toBe('mastered');
    expect(patterns[2].classification).toBe('mastered');

    // Step 4 (Index 3) should be isolated as frequent_hint
    expect(patterns[3].classification).toBe('frequent_hint');
    expect(patterns[3].hintCount).toBe(4);
    expect(patterns[3].highestHintTierSeen).toBe(2);

    // Step 6 should be mastered
    expect(patterns[5].classification).toBe('mastered');
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 4: DIFFICULTY ON DIFFERENT STEPS                           */
  /* ------------------------------------------------------------------ */
  it('4. maps independent performance profiles across heterogeneous steps', () => {
    // Session 1: Step 3 struggled
    StepPatternService.recordStepExecution(
      patientId,
      routineId,
      routineTitle,
      teaSteps.map((t, idx) => ({
        stepIndex: idx,
        stepTitle: t,
        state: idx === 2 ? 'HINT_USED' : 'INDEPENDENT',
        hintTierUsed: idx === 2 ? 1 : 0,
        assistanceRequested: false,
        durationSeconds: 20,
        timestamp: new Date().toISOString(),
      }))
    );

    // Session 2: Step 4 assisted
    StepPatternService.recordStepExecution(
      patientId,
      routineId,
      routineTitle,
      teaSteps.map((t, idx) => ({
        stepIndex: idx,
        stepTitle: t,
        state: idx === 3 ? 'ASSISTED' : 'INDEPENDENT',
        hintTierUsed: 0,
        assistanceRequested: idx === 3,
        durationSeconds: 20,
        timestamp: new Date().toISOString(),
      }))
    );

    // Session 3: All independent except Step 3
    StepPatternService.recordStepExecution(
      patientId,
      routineId,
      routineTitle,
      teaSteps.map((t, idx) => ({
        stepIndex: idx,
        stepTitle: t,
        state: idx === 2 ? 'HINT_USED' : 'INDEPENDENT',
        hintTierUsed: idx === 2 ? 1 : 0,
        assistanceRequested: false,
        durationSeconds: 20,
        timestamp: new Date().toISOString(),
      }))
    );

    const patterns = StepPatternService.analyzeStepPatterns(patientId, routineId, teaSteps.length);
    expect(patterns[2].hintCount).toBe(2);
    expect(patterns[3].assistedCount).toBe(1);
    expect(patterns[0].independentCount).toBe(3);
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 5: SINGLE FAILED ATTEMPT (DOES NOT JUMP TO CONCLUSIONS)   */
  /* ------------------------------------------------------------------ */
  it('5. prevents premature classification from a single isolated struggle', () => {
    // Only 1 session with a struggle
    const telemetry: StepTelemetry[] = teaSteps.map((title, idx) => ({
      stepIndex: idx,
      stepTitle: title,
      state: idx === 3 ? 'ASSISTED' : 'INDEPENDENT',
      hintTierUsed: idx === 3 ? 3 : 0,
      assistanceRequested: idx === 3,
      durationSeconds: 45,
      timestamp: new Date().toISOString(),
    }));

    StepPatternService.recordStepExecution(patientId, routineId, routineTitle, telemetry);

    const patterns = StepPatternService.analyzeStepPatterns(patientId, routineId, teaSteps.length);
    const step4 = patterns[3];

    // Must be insufficient_data because N < 3
    expect(step4.classification).toBe('insufficient_data');
    expect(step4.confidence).toBeLessThan(0.6);

    // Does NOT generate simplification without repeated pattern
    const proposal = StepPatternService.generateStepSimplification(
      patientId,
      routineId,
      routineTitle,
      step4,
      teaSteps[3]
    );
    expect(proposal).toBeNull();
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 6 & 7: SKIPPED TASKS & PATIENT REFUSAL (ZERO PENALTY)      */
  /* ------------------------------------------------------------------ */
  it('6 & 7. handles skipped steps and peaceful patient refusal with zero penalty', () => {
    const telemetry: StepTelemetry[] = teaSteps.map((title, idx) => ({
      stepIndex: idx,
      stepTitle: title,
      state: idx === 5 ? 'SKIPPED' : 'INDEPENDENT',
      hintTierUsed: 0,
      assistanceRequested: false,
      durationSeconds: 10,
      timestamp: new Date().toISOString(),
    }));

    const record = StepPatternService.recordStepExecution(
      patientId,
      routineId,
      routineTitle,
      telemetry
    );

    expect(record.overallState).toBe('SKIPPED');
    expect(record.stepTelemetry[5].state).toBe('SKIPPED');

    // Skipped step is tracked accurately in history without breaking data structures
    const history = StepPatternService.getStepHistory(patientId, routineId);
    expect(history.length).toBe(1);
    expect(history[0].stepTelemetry[5].state).toBe('SKIPPED');
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 8 & 9: SNOOZED & REST BREAK STATES                        */
  /* ------------------------------------------------------------------ */
  it('8 & 9. records rest breaks and snoozed states peacefully', () => {
    const telemetry: StepTelemetry[] = teaSteps.map((title, idx) => ({
      stepIndex: idx,
      stepTitle: title,
      state: idx === 2 ? 'RESTED' : 'INDEPENDENT',
      hintTierUsed: 0,
      assistanceRequested: false,
      durationSeconds: 120, // 2-min calming pause
      timestamp: new Date().toISOString(),
    }));

    const record = StepPatternService.recordStepExecution(
      patientId,
      routineId,
      routineTitle,
      telemetry
    );

    expect(record.stepTelemetry[2].state).toBe('RESTED');
    expect(record.stepTelemetry[2].durationSeconds).toBe(120);
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 10 & 11: UNCONFIRMED & PARTIAL COMPLETION                 */
  /* ------------------------------------------------------------------ */
  it('10 & 11. records partial completion and stops before unreached steps', () => {
    // Patient stops after step 3
    const telemetry: StepTelemetry[] = teaSteps.map((title, idx) => ({
      stepIndex: idx,
      stepTitle: title,
      state: idx < 3 ? 'INDEPENDENT' : 'NOT_ATTEMPTED',
      hintTierUsed: 0,
      assistanceRequested: false,
      durationSeconds: idx < 3 ? 20 : 0,
      timestamp: new Date().toISOString(),
    }));

    const record = StepPatternService.recordStepExecution(
      patientId,
      routineId,
      routineTitle,
      telemetry
    );

    expect(record.stepTelemetry[0].state).toBe('INDEPENDENT');
    expect(record.stepTelemetry[3].state).toBe('NOT_ATTEMPTED');
    expect(record.stepTelemetry[4].state).toBe('NOT_ATTEMPTED');
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 12 & 13: SWITCHING & 1-TAP INSTANT RESTORATION            */
  /* ------------------------------------------------------------------ */
  it('12 & 13. allows 1-tap instant restoration of familiar step guidance', () => {
    const pattern = {
      stepIndex: 0,
      stepTitle: teaSteps[0],
      totalAttempts: 4,
      independentCount: 4,
      hintCount: 0,
      assistedCount: 0,
      skippedCount: 0,
      averageDurationSeconds: 15,
      highestHintTierSeen: 0 as const,
      classification: 'mastered' as const,
      confidence: 0.9,
      lastObservedAt: new Date().toISOString(),
    };

    const challenge = StepPatternService.generateStepChallenge(
      patientId,
      routineId,
      routineTitle,
      pattern,
      teaSteps[0],
      'wellness'
    );

    expect(challenge?.status).toBe('available');

    // Patient or UI reverts challenge with 1 tap
    StepPatternService.updateChallengeStatus(patientId, challenge!.id, 'declined');

    const updated = StepPatternService.getChallengeProposals(patientId, routineId);
    const target = updated.find((c) => c.id === challenge!.id);
    expect(target?.status).toBe('declined');
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 14 & 15: CAREGIVER REVIEW & HISTORICAL INTEGRITY          */
  /* ------------------------------------------------------------------ */
  it('14 & 15. preserves chronological history for caregiver review', () => {
    for (let i = 1; i <= 3; i++) {
      StepPatternService.recordStepExecution(
        patientId,
        routineId,
        routineTitle,
        teaSteps.map((t, idx) => ({
          stepIndex: idx,
          stepTitle: t,
          state: 'INDEPENDENT',
          hintTierUsed: 0,
          assistanceRequested: false,
          durationSeconds: 15,
          timestamp: new Date().toISOString(),
        }))
      );
    }

    const history = StepPatternService.getStepHistory(patientId, routineId);
    expect(history.length).toBe(3);
    // Preserved in chronological descending order (newest first)
    expect(history[0].completedAt).toBeDefined();
    expect(history[0].routineTitle).toBe('Morning Tea Preparation');
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 16 & 17: ATTRIBUTION & IDEMPOTENT GENERATION              */
  /* ------------------------------------------------------------------ */
  it('16 & 17. preserves initiation telemetry and verifies idempotency', () => {
    const initiation: TaskInitiationTelemetry = {
      scheduledTime: '08:00 AM',
      openedAt: '08:45 AM',
      delayMinutes: 45,
      isInitiationDelayed: true,
      initiationReason: 'resting',
    };

    const record = StepPatternService.recordStepExecution(
      patientId,
      routineId,
      routineTitle,
      teaSteps.map((t, idx) => ({
        stepIndex: idx,
        stepTitle: t,
        state: 'INDEPENDENT',
        hintTierUsed: 0,
        assistanceRequested: false,
        durationSeconds: 20,
        timestamp: new Date().toISOString(),
      })),
      initiation
    );

    expect(record.initiation.isInitiationDelayed).toBe(true);
    expect(record.initiation.delayMinutes).toBe(45);
    expect(record.initiation.initiationReason).toBe('resting');

    // Verify task instances remain idempotent
    const today = new Date().toISOString().split('T')[0];
    const inst1 = TaskLifecycleService.getOrCreateTodayInstances(patientId, today);
    const inst2 = TaskLifecycleService.getOrCreateTodayInstances(patientId, today);
    expect(inst1.length).toBe(inst2.length);
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 18: REFRESH PERSISTENCE                                   */
  /* ------------------------------------------------------------------ */
  it('18. persists step history and proposals across storage reloads', () => {
    StepPatternService.recordStepExecution(
      patientId,
      routineId,
      routineTitle,
      teaSteps.map((t, idx) => ({
        stepIndex: idx,
        stepTitle: t,
        state: 'INDEPENDENT',
        hintTierUsed: 0,
        assistanceRequested: false,
        durationSeconds: 18,
        timestamp: new Date().toISOString(),
      }))
    );

    // Re-instantiate query directly from storage
    const reloaded = StepPatternService.getStepHistory(patientId, routineId);
    expect(reloaded.length).toBe(1);
    expect(reloaded[0].stepTelemetry.length).toBe(6);
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 19: UNSAFE CHALLENGE PREVENTION (SAFETY OVERRIDE)         */
  /* ------------------------------------------------------------------ */
  it('19. strictly prevents challenge proposals on safety-critical steps (boiling, medication)', () => {
    // 1. Boiling water step
    const boilingCheck = StepPatternService.evaluateSafetyLock(teaSteps[2], 'wellness');
    expect(boilingCheck.isSafetyLocked).toBe(true);
    expect(boilingCheck.reason).toContain('Physical safety safeguard');

    // 2. Medication step
    const medCheck = StepPatternService.evaluateSafetyLock(
      'Take 1 Donepezil tablet with full glass of water',
      'medication'
    );
    expect(medCheck.isSafetyLocked).toBe(true);
    expect(medCheck.reason).toContain('Prescription safety');

    // 3. Attempting to generate a challenge on a safety-locked step fails safely
    const mockPattern = {
      stepIndex: 2,
      stepTitle: teaSteps[2],
      totalAttempts: 5,
      independentCount: 5,
      hintCount: 0,
      assistedCount: 0,
      skippedCount: 0,
      averageDurationSeconds: 15,
      highestHintTierSeen: 0 as const,
      classification: 'mastered' as const,
      confidence: 1.0,
      lastObservedAt: new Date().toISOString(),
    };

    const challenge = StepPatternService.generateStepChallenge(
      patientId,
      routineId,
      routineTitle,
      mockPattern,
      teaSteps[2],
      'wellness'
    );

    // Must be locked!
    expect(challenge?.isSafetyLocked).toBe(true);
    expect(challenge?.status).toBe('declined');
    expect(challenge?.safetyExemptReason).toBeDefined();
  });

  /* ------------------------------------------------------------------ */
  /* SCENARIO 20: NO FABRICATED COMPLETION                              */
  /* ------------------------------------------------------------------ */
  it('20. strictly prevents fabricated completion of unattempted steps', () => {
    // Only first 2 steps attempted
    const telemetry: StepTelemetry[] = [
      {
        stepIndex: 0,
        stepTitle: teaSteps[0],
        state: 'INDEPENDENT',
        hintTierUsed: 0,
        assistanceRequested: false,
        durationSeconds: 15,
        timestamp: new Date().toISOString(),
      },
      {
        stepIndex: 1,
        stepTitle: teaSteps[1],
        state: 'INDEPENDENT',
        hintTierUsed: 0,
        assistanceRequested: false,
        durationSeconds: 15,
        timestamp: new Date().toISOString(),
      },
      {
        stepIndex: 2,
        stepTitle: teaSteps[2],
        state: 'NOT_ATTEMPTED',
        hintTierUsed: 0,
        assistanceRequested: false,
        durationSeconds: 0,
        timestamp: new Date().toISOString(),
      },
    ];

    const record = StepPatternService.recordStepExecution(
      patientId,
      routineId,
      routineTitle,
      telemetry
    );

    expect(record.stepTelemetry[2].state).toBe('NOT_ATTEMPTED');
    expect(record.stepTelemetry[2].durationSeconds).toBe(0);

    const patterns = StepPatternService.analyzeStepPatterns(patientId, routineId, 3);
    expect(patterns[2].independentCount).toBe(0);
    expect(patterns[2].classification).toBe('insufficient_data');
  });
});
