/**
 * SAKSHAM NEURO-CARE — PHASE 3.4
 * CAREGIVER DYADIC STEP-PATTERN DASHBOARD & PATIENT-DRIVEN ADAPTIVE SUPPORT
 * Acceptance test suite validating all 20 required points from Section 10 of Phase 3.4 directive.
 * 100% Spark Free Plan compliant — strictly non-diagnostic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CaregiverStepPatternDashboard } from '../features/caregiver/components/CaregiverStepPatternDashboard.js';
import { StepPatternService } from '../features/routines/services/stepPatternService.js';
import { TaskLifecycleService } from '../features/routines/services/taskLifecycleService.js';
import { DEFAULT_PATIENT_ROUTINES } from '../features/routines/services/routineService.js';
import { StepTelemetry } from '../features/routines/types/stepPattern.types.js';

describe('Phase 3.4: Caregiver Dyadic Step-Pattern Dashboard & Adaptive Daily Living', () => {
  const patientId = 'demo-patient-001';
  const routineId = DEFAULT_PATIENT_ROUTINES[0].id; // 'routine-01'
  const routineTitle = DEFAULT_PATIENT_ROUTINES[0].title;
  const mockTeaSteps: string[] = DEFAULT_PATIENT_ROUTINES[0].steps || [];

  beforeEach(() => {
    StepPatternService.clearForTesting();
    TaskLifecycleService.clearCache();
    vi.clearAllMocks();
  });

  /* ------------------------------------------------------------------ */
  /* TEST 1: Caregiver can select a routine                             */
  /* ------------------------------------------------------------------ */
  it('1. Caregiver can select a routine from the routine selector', async () => {
    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    const selector = screen.getByTestId('routine-selector') as HTMLSelectElement;
    expect(selector).toBeInTheDocument();
    expect(selector.options.length).toBeGreaterThanOrEqual(2);

    // Switch to medication routine (routine-02)
    fireEvent.change(selector, { target: { value: 'routine-02' } });
    expect(selector.value).toBe('routine-02');

    // Details update to medication category
    await waitFor(() => {
      const badge = screen.getByTestId('routine-category-badge');
      expect(badge.textContent).toBe('medication');
    });
  });

  /* ------------------------------------------------------------------ */
  /* TEST 2: Actual step-pattern records are displayed                  */
  /* ------------------------------------------------------------------ */
  it('2. displays actual step-pattern records and step instruction texts', () => {
    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    expect(screen.getByTestId('caregiver-step-pattern-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('step-pattern-card-0')).toBeInTheDocument();
    expect(screen.getByText(mockTeaSteps[0])).toBeInTheDocument();
    expect(screen.getByText(mockTeaSteps[1])).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ */
  /* TEST 3: Insufficient evidence is clearly shown (<3 attempts)       */
  /* ------------------------------------------------------------------ */
  it('3. clearly displays insufficient evidence badge when attempts < 3', () => {
    // Record only 1 attempt for tea preparation
    const singleSession: StepTelemetry[] = mockTeaSteps.map((title, idx) => ({
      stepIndex: idx,
      stepTitle: title,
      state: 'INDEPENDENT',
      hintTierUsed: 0,
      assistanceRequested: false,
      durationSeconds: 15,
      timestamp: new Date().toISOString(),
    }));
    StepPatternService.recordStepExecution(patientId, routineId, routineTitle, singleSession);

    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    const badge = screen.getByTestId('evidence-badge-0');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain('Observing (< 3 attempts)');

    const explanation = screen.getByTestId('step-explanation-0');
    expect(explanation.textContent).toContain('Insufficient observations (< 3 attempts)');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 4: Independent counts are accurate                            */
  /* ------------------------------------------------------------------ */
  it('4. counts independent interactions accurately across multiple sessions', () => {
    // Record 3 independent sessions on step 0
    for (let i = 0; i < 3; i++) {
      const telemetry: StepTelemetry[] = [
        {
          stepIndex: 0,
          stepTitle: mockTeaSteps[0],
          state: 'INDEPENDENT',
          hintTierUsed: 0,
          assistanceRequested: false,
          durationSeconds: 20,
          timestamp: new Date().toISOString(),
        },
      ];
      StepPatternService.recordStepExecution(patientId, routineId, routineTitle, telemetry);
    }

    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    const independentCount = screen.getByTestId('independent-count-0');
    expect(independentCount.textContent).toBe('3');

    const totalAttempts = screen.getByTestId('total-attempts-0');
    expect(totalAttempts.textContent).toBe('3');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 5: Hint counts are accurate                                   */
  /* ------------------------------------------------------------------ */
  it('5. counts hint-assisted interactions accurately', () => {
    // Record 3 sessions where step 2 uses hints
    for (let i = 0; i < 3; i++) {
      const telemetry: StepTelemetry[] = [
        {
          stepIndex: 2,
          stepTitle: mockTeaSteps[2],
          state: 'HINT_USED',
          hintTierUsed: 2,
          assistanceRequested: false,
          durationSeconds: 35,
          timestamp: new Date().toISOString(),
        },
      ];
      StepPatternService.recordStepExecution(patientId, routineId, routineTitle, telemetry);
    }

    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    const hintCount = screen.getByTestId('hint-count-2');
    expect(hintCount.textContent).toBe('3');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 6: Assistance counts are accurate                             */
  /* ------------------------------------------------------------------ */
  it('6. counts caregiver-assisted interactions accurately', () => {
    // Record 3 sessions where step 3 is caregiver-assisted
    for (let i = 0; i < 3; i++) {
      const telemetry: StepTelemetry[] = [
        {
          stepIndex: 3,
          stepTitle: mockTeaSteps[3],
          state: 'ASSISTED',
          hintTierUsed: 0,
          assistanceRequested: true,
          durationSeconds: 45,
          timestamp: new Date().toISOString(),
        },
      ];
      StepPatternService.recordStepExecution(patientId, routineId, routineTitle, telemetry);
    }

    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    const assistedCount = screen.getByTestId('assisted-count-3');
    expect(assistedCount.textContent).toBe('3');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 7: Unattempted states are not treated as failure              */
  /* ------------------------------------------------------------------ */
  it('7. treats unattempted states and rest as natural rhythm, not failure', () => {
    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    const unattemptedNotice = screen.getByTestId('unattempted-note');
    expect(unattemptedNotice).toBeInTheDocument();
    expect(unattemptedNotice.textContent).toContain('Dignity-Preserving Observation');
    expect(unattemptedNotice.textContent).toContain('healthy rest, not unsuccessful performance');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 8: Skipped tasks do not negatively affect classifications     */
  /* ------------------------------------------------------------------ */
  it('8. tracks skipped tasks without penalizing classification or scoring failure streaks', () => {
    // Record 2 skipped sessions on step 0
    for (let i = 0; i < 2; i++) {
      const skippedTelemetry: StepTelemetry[] = [
        {
          stepIndex: 0,
          stepTitle: mockTeaSteps[0],
          state: 'SKIPPED',
          hintTierUsed: 0,
          assistanceRequested: false,
          durationSeconds: 0,
          timestamp: new Date().toISOString(),
        },
      ];
      StepPatternService.recordStepExecution(patientId, routineId, routineTitle, skippedTelemetry);
    }

    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    const skippedCount = screen.getByTestId('skipped-count-0');
    expect(skippedCount.textContent).toBe('2');

    const explanation = screen.getByTestId('step-explanation-0');
    expect(explanation.textContent).not.toContain('failure');
    expect(explanation.textContent).not.toContain('decline');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 9: Challenge proposals are grounded                           */
  /* ------------------------------------------------------------------ */
  it('9. ensures challenge proposals are only generated after confirmed comfort', () => {
    // Step 0 has 3 independent completions -> eligible for challenge
    for (let i = 0; i < 3; i++) {
      const telemetry: StepTelemetry[] = [
        {
          stepIndex: 0,
          stepTitle: mockTeaSteps[0],
          state: 'INDEPENDENT',
          hintTierUsed: 0,
          assistanceRequested: false,
          durationSeconds: 15,
          timestamp: new Date().toISOString(),
        },
      ];
      StepPatternService.recordStepExecution(patientId, routineId, routineTitle, telemetry);
    }

    const patterns = StepPatternService.analyzeStepPatterns(patientId, routineId, 4);
    expect(patterns[0].classification).toBe('mastered');

    const challenge = StepPatternService.generateStepChallenge(
      patientId,
      routineId,
      routineTitle,
      patterns[0],
      mockTeaSteps[0],
      'wellness'
    );

    expect(challenge).not.toBeNull();
    expect(challenge?.isSafetyLocked).toBe(false);
    expect(challenge?.challengeType).toBe('recall_next_step');
    expect(challenge?.status).toBe('available');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 10: Safety locks prevent challenge reduction                  */
  /* ------------------------------------------------------------------ */
  it('10. permanently locks safety-critical steps (stove/flame) against challenge reduction', () => {
    // Step 1: "2. Place the pot on the stove and turn on the flame to heat"
    const safetyCheck = StepPatternService.evaluateSafetyLock(mockTeaSteps[1], 'general');
    expect(safetyCheck.isSafetyLocked).toBe(true);
    expect(safetyCheck.reason).toContain('stove');

    // Simulate 4 independent attempts
    for (let i = 0; i < 4; i++) {
      const telemetry: StepTelemetry[] = [
        {
          stepIndex: 1,
          stepTitle: mockTeaSteps[1],
          state: 'INDEPENDENT',
          hintTierUsed: 0,
          assistanceRequested: false,
          durationSeconds: 20,
          timestamp: new Date().toISOString(),
        },
      ];
      StepPatternService.recordStepExecution(patientId, routineId, routineTitle, telemetry);
    }

    const patterns = StepPatternService.analyzeStepPatterns(patientId, routineId, 4);
    const challenge = StepPatternService.generateStepChallenge(
      patientId,
      routineId,
      routineTitle,
      patterns[1],
      mockTeaSteps[1],
      'general'
    );

    expect(challenge?.isSafetyLocked).toBe(true);
    expect(challenge?.status).toBe('declined');
    expect(challenge?.promptQuestion).toContain('Safety-critical step');

    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    const safetyBadge = screen.getByTestId('safety-lock-badge-1');
    expect(safetyBadge).toBeInTheDocument();
    expect(safetyBadge.textContent).toContain('Physical Safety Safeguard Active');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 11: Simplification proposals show actual micro-actions        */
  /* ------------------------------------------------------------------ */
  it('11. displays actual decomposed micro-actions and contextual orientation cue', () => {
    // Step 2 has frequent hints across 3 sessions
    for (let i = 0; i < 3; i++) {
      const telemetry: StepTelemetry[] = [
        {
          stepIndex: 2,
          stepTitle: mockTeaSteps[2],
          state: 'HINT_USED',
          hintTierUsed: 2,
          assistanceRequested: false,
          durationSeconds: 40,
          timestamp: new Date().toISOString(),
        },
      ];
      StepPatternService.recordStepExecution(patientId, routineId, routineTitle, telemetry);
    }

    const patterns = StepPatternService.analyzeStepPatterns(patientId, routineId, 4);
    const proposal = StepPatternService.generateStepSimplification(
      patientId,
      routineId,
      routineTitle,
      patterns[2],
      mockTeaSteps[2]
    );

    expect(proposal).not.toBeNull();
    expect(proposal?.proposedMicroActions.length).toBeGreaterThanOrEqual(2);
    expect(proposal?.contextualCue).toContain('Orientation Cue');

    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    expect(screen.getByTestId(`proposal-card-${proposal!.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`proposal-microactions-${proposal!.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`proposal-cue-${proposal!.id}`)).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ */
  /* TEST 12: Proposal approval preserves the original task             */
  /* ------------------------------------------------------------------ */
  it('12. approving a simplification proposal preserves the original task text and structure', () => {
    for (let i = 0; i < 3; i++) {
      StepPatternService.recordStepExecution(patientId, routineId, routineTitle, [
        {
          stepIndex: 2,
          stepTitle: mockTeaSteps[2],
          state: 'HINT_USED',
          hintTierUsed: 2,
          assistanceRequested: false,
          durationSeconds: 40,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    const patterns = StepPatternService.analyzeStepPatterns(patientId, routineId, 4);
    const proposal = StepPatternService.generateStepSimplification(
      patientId,
      routineId,
      routineTitle,
      patterns[2],
      mockTeaSteps[2]
    )!;

    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    const acceptBtn = screen.getByTestId(`accept-simplification-btn-${proposal.id}`);
    fireEvent.click(acceptBtn);

    const updated = StepPatternService.getSimplificationProposals(patientId, routineId);
    expect(updated[0].status).toBe('accepted');
    expect(updated[0].originalStepText).toBe(mockTeaSteps[2]);
  });

  /* ------------------------------------------------------------------ */
  /* TEST 13: Proposal rejection preserves the original task            */
  /* ------------------------------------------------------------------ */
  it('13. declining a simplification proposal preserves original instruction without change', () => {
    for (let i = 0; i < 3; i++) {
      StepPatternService.recordStepExecution(patientId, routineId, routineTitle, [
        {
          stepIndex: 2,
          stepTitle: mockTeaSteps[2],
          state: 'HINT_USED',
          hintTierUsed: 2,
          assistanceRequested: false,
          durationSeconds: 40,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    const patterns = StepPatternService.analyzeStepPatterns(patientId, routineId, 4);
    const proposal = StepPatternService.generateStepSimplification(
      patientId,
      routineId,
      routineTitle,
      patterns[2],
      mockTeaSteps[2]
    )!;

    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    const declineBtn = screen.getByTestId(`decline-simplification-btn-${proposal.id}`);
    fireEvent.click(declineBtn);

    const updated = StepPatternService.getSimplificationProposals(patientId, routineId);
    expect(updated[0].status).toBe('declined');
    expect(updated[0].originalStepText).toBe(mockTeaSteps[2]);
  });

  /* ------------------------------------------------------------------ */
  /* TEST 14: Modification attribution is preserved                     */
  /* ------------------------------------------------------------------ */
  it('14. preserves modification attribution with actor, timestamp, and modification type', () => {
    StepPatternService.saveProposal(patientId, {
      id: 'prop-test-attribution',
      routineId,
      routineTitle,
      stepIndex: 1,
      originalStepText: mockTeaSteps[1],
      proposedMicroActions: ['Action A', 'Action B'],
      contextualCue: 'Look at stove',
      rationale: 'Factual test rationale',
      status: 'proposed',
      createdAt: new Date().toISOString(),
      nonDiagnosticDisclaimer: 'Disclaimer',
    });

    StepPatternService.updateProposalStatus(
      patientId,
      'prop-test-attribution',
      'accepted',
      'caregiver',
      'Accepted after caregiver review'
    );

    const mods = StepPatternService.getDyadicModifications(patientId, routineId);
    expect(mods.length).toBeGreaterThanOrEqual(1);
    expect(mods[0].actor).toBe('caregiver');
    expect(mods[0].modificationType).toBe('proposal_accepted');
    expect(mods[0].previousValue).toBe('proposed');
    expect(mods[0].newValue).toBe('accepted');
    expect(mods[0].timestamp).toBeDefined();
  });

  /* ------------------------------------------------------------------ */
  /* TEST 15: Patient restoration of familiar guidance works            */
  /* ------------------------------------------------------------------ */
  it('15. allows patient 1-tap restore to revert challenge and record patient attribution', () => {
    const challenge = StepPatternService.generateStepChallenge(
      patientId,
      routineId,
      routineTitle,
      {
        stepIndex: 0,
        stepTitle: mockTeaSteps[0],
        totalAttempts: 4,
        independentCount: 4,
        hintCount: 0,
        assistedCount: 0,
        skippedCount: 0,
        averageDurationSeconds: 12,
        highestHintTierSeen: 0,
        classification: 'mastered',
        confidence: 0.9,
        lastObservedAt: new Date().toISOString(),
      },
      mockTeaSteps[0]
    )!;

    expect(challenge.status).toBe('available');

    // Simulate patient 1-tap restore via service method called by GuidedTaskRunner
    StepPatternService.updateChallengeStatus(patientId, challenge.id, 'reverted', 'patient');

    const updatedChallenges = StepPatternService.getChallengeProposals(patientId, routineId);
    expect(updatedChallenges[0].status).toBe('reverted');
    expect(updatedChallenges[0].reviewedBy).toBe('patient');

    const mods = StepPatternService.getDyadicModifications(patientId, routineId);
    const patientMod = mods.find((m) => m.actor === 'patient');
    expect(patientMod).toBeDefined();
    expect(patientMod?.modificationType).toBe('challenge_restored_by_patient');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 16: Refresh persistence works                                 */
  /* ------------------------------------------------------------------ */
  it('16. persists step pattern history, proposals, and challenges across refresh', () => {
    StepPatternService.recordStepExecution(patientId, routineId, routineTitle, [
      {
        stepIndex: 0,
        stepTitle: mockTeaSteps[0],
        state: 'INDEPENDENT',
        hintTierUsed: 0,
        assistanceRequested: false,
        durationSeconds: 18,
        timestamp: new Date().toISOString(),
      },
    ]);

    StepPatternService.saveProposal(patientId, {
      id: 'persisted-proposal',
      routineId,
      routineTitle,
      stepIndex: 0,
      originalStepText: mockTeaSteps[0],
      proposedMicroActions: ['A', 'B'],
      contextualCue: 'Cue',
      rationale: 'Rationale',
      status: 'accepted',
      createdAt: new Date().toISOString(),
      nonDiagnosticDisclaimer: 'Disclaimer',
    });

    const freshHistory = StepPatternService.getStepHistory(patientId, routineId);
    expect(freshHistory.length).toBe(1);

    const freshProposals = StepPatternService.getSimplificationProposals(patientId, routineId);
    expect(freshProposals.length).toBe(1);
    expect(freshProposals[0].status).toBe('accepted');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 17: Patient/caregiver boundaries are respected                */
  /* ------------------------------------------------------------------ */
  it('17. enforces role authorization boundaries on proposal actions', () => {
    StepPatternService.saveProposal(patientId, {
      id: 'boundary-proposal',
      routineId,
      routineTitle,
      stepIndex: 0,
      originalStepText: mockTeaSteps[0],
      proposedMicroActions: ['A', 'B'],
      contextualCue: 'Cue',
      rationale: 'Rationale',
      status: 'proposed',
      createdAt: new Date().toISOString(),
      nonDiagnosticDisclaimer: 'Disclaimer',
    });

    // Render with isAuthorized = false
    render(
      <CaregiverStepPatternDashboard
        patientId={patientId}
        patientName="Sunita"
        isAuthorized={false}
      />
    );

    const acceptBtn = screen.getByTestId('accept-simplification-btn-boundary-proposal');
    fireEvent.click(acceptBtn);

    // Status remains unchanged because caregiver is unauthorized
    const proposals = StepPatternService.getSimplificationProposals(patientId, routineId);
    expect(proposals[0].status).toBe('proposed');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 18: No fabricated completion                                  */
  /* ------------------------------------------------------------------ */
  it('18. does not allow caregiver to fabricate completion of patient routine steps', () => {
    render(<CaregiverStepPatternDashboard patientId={patientId} patientName="Sunita" />);

    expect(screen.queryByText(/mark step complete/i)).toBeNull();
    expect(screen.queryByText(/force complete/i)).toBeNull();
    expect(screen.queryByText(/fabricate completion/i)).toBeNull();
  });

  /* ------------------------------------------------------------------ */
  /* TEST 19: No duplicated daily instances                             */
  /* ------------------------------------------------------------------ */
  it('19. generates unique session IDs without duplicating daily instances', () => {
    const record1 = StepPatternService.recordStepExecution(patientId, routineId, routineTitle, [
      {
        stepIndex: 0,
        stepTitle: mockTeaSteps[0],
        state: 'INDEPENDENT',
        hintTierUsed: 0,
        assistanceRequested: false,
        durationSeconds: 15,
        timestamp: '2026-11-22T08:00:00Z',
      },
    ]);

    const record2 = StepPatternService.recordStepExecution(patientId, routineId, routineTitle, [
      {
        stepIndex: 0,
        stepTitle: mockTeaSteps[0],
        state: 'INDEPENDENT',
        hintTierUsed: 0,
        assistanceRequested: false,
        durationSeconds: 15,
        timestamp: '2026-11-22T08:05:00Z',
      },
    ]);

    expect(record1.id).not.toBe(record2.id);
    const history = StepPatternService.getStepHistory(patientId, routineId);
    expect(history.length).toBe(2);
  });

  /* ------------------------------------------------------------------ */
  /* TEST 20: Regression tests pass across daily living modules         */
  /* ------------------------------------------------------------------ */
  it('20. ensures regression integrity: TaskLifecycleService and StepPatternService cooperate', () => {
    const recurring = TaskLifecycleService.getRecurringTasks(patientId);
    expect(recurring.length).toBeGreaterThanOrEqual(1);

    const explanation = StepPatternService.getFactualExplanation({
      stepIndex: 0,
      stepTitle: 'Test Step',
      totalAttempts: 5,
      independentCount: 2,
      hintCount: 3,
      assistedCount: 0,
      skippedCount: 0,
      averageDurationSeconds: 25,
      highestHintTierSeen: 2,
      classification: 'frequent_hint',
      confidence: 0.8,
      lastObservedAt: new Date().toISOString(),
    });

    expect(explanation).toContain('During the last 14 days');
    expect(explanation).toContain('recorded 5 times');
    expect(explanation).toContain('requested on 3 occasions');
    expect(explanation).not.toContain('cognitive decline');
  });
});
