import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DailyRoutines } from '../pages/patient/DailyRoutines.js';
import { GuidedTaskRunner } from '../features/routines/components/GuidedTaskRunner.js';
import { AdaptiveSupportService } from '../features/adaptive/services/adaptiveSupportService.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { SpeechService } from '../services/speechService.js';
import { AuthProvider } from '../context/AuthContext.js';
import { RoutineItem } from '../types/index.js';

describe('Phase 2.9: Adaptive Daily Living Engine — Intelligent To-Do, Progressive Challenges & Personalized Routines', () => {
  const patientId = 'demo-patient-001';

  const mockRoutineMed: RoutineItem = {
    id: 'routine-morning-med',
    title: 'Morning Blood Pressure Medication',
    description: 'Take one prescribed blood pressure tablet with water.',
    scheduledTime: '08:00 AM',
    period: 'morning',
    category: 'medication',
    isCompleted: false,
    streakCount: 5,
    enableAssistedRecall: true,
    timerMinutes: 10,
    steps: [
      '1. Take out the labeled morning pill box and glass of water.',
      '2. Swallow tablet with a generous sip of water.',
      '3. Sit quietly for a minute and breathe peacefully.',
    ],
  };

  const mockRoutineTea: RoutineItem = {
    id: 'routine-morning-tea',
    title: 'Morning Cardamom Tea',
    description: 'Brew and enjoy a warm cup of cardamom tea peacefully.',
    scheduledTime: '08:30 AM',
    period: 'morning',
    category: 'activity',
    isCompleted: false,
    streakCount: 3,
    enableAssistedRecall: true,
    timerMinutes: 15,
    steps: [
      '1. Place tea cup and saucer steadily on the veranda table.',
      '2. Pour warm tea gently into the cup using both hands.',
      '3. Sit comfortably and sip slowly while looking at the garden.',
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    AdaptiveSupportService.clearCache();
    vi.clearAllMocks();
    vi.spyOn(SpeechService, 'speak').mockImplementation(() => {});
    vi.spyOn(SpeechService, 'cancelSpeech').mockImplementation(() => {});
  });

  /* ------------------------------------------------------------------ */
  /* TEST 1: Intelligent Daily Plan Hero Card Presentation & Priority    */
  /* ------------------------------------------------------------------ */
  it('1. renders Intelligent Daily Plan Hero Card prioritizing doctor-prescribed medication over general tasks', () => {
    // Setup routines: tea is at 08:30 AM, med is at 08:00 AM
    RoutineService.saveRoutines(patientId, [mockRoutineTea, mockRoutineMed]);

    render(
      <AuthProvider>
        <BrowserRouter>
          <DailyRoutines />
        </BrowserRouter>
      </AuthProvider>
    );

    const heroCard = screen.getByTestId('intelligent-daily-plan-hero');
    expect(heroCard).toBeInTheDocument();

    // Medication must be strictly prioritized
    expect(within(heroCard).getByText(/Morning Blood Pressure Medication/i)).toBeInTheDocument();
    expect(within(heroCard).getByText(/Doctor Prescribed/i)).toBeInTheDocument();
    expect(within(heroCard).getByTestId('hero-start-activity-btn')).toBeInTheDocument();
    expect(within(heroCard).getByTestId('hero-ask-asha-btn')).toBeInTheDocument();
    expect(within(heroCard).getByTestId('hero-pause-rest-btn')).toBeInTheDocument();
    expect(within(heroCard).getByTestId('hero-snooze-btn')).toBeInTheDocument();
    expect(within(heroCard).getByTestId('hero-skip-btn')).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ */
  /* TEST 2: Non-Punitive Skip / Decline Action                         */
  /* ------------------------------------------------------------------ */
  it('2. allows patient to skip task with zero penalty or streak loss', () => {
    RoutineService.saveRoutines(patientId, [mockRoutineTea]);

    render(
      <AuthProvider>
        <BrowserRouter>
          <DailyRoutines />
        </BrowserRouter>
      </AuthProvider>
    );

    const skipBtn = screen.getByTestId('hero-skip-btn');
    fireEvent.click(skipBtn);

    // Verifies Speech reassurance
    expect(SpeechService.speak).toHaveBeenCalledWith(
      expect.stringMatching(/No worries at all! We have skipped Morning Cardamom Tea for now with zero penalty/i),
      expect.any(Function),
      expect.any(Function),
      expect.any(String)
    );

    // All completed reflection hero appears
    expect(screen.getByTestId('daily-plan-all-completed-hero')).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ */
  /* TEST 3: Schedule View Toggle Accordion (Low Cognitive Load)        */
  /* ------------------------------------------------------------------ */
  it('3. allows toggling between focused hero card view and full schedule checklist', () => {
    RoutineService.saveRoutines(patientId, [mockRoutineTea, mockRoutineMed]);

    render(
      <AuthProvider>
        <BrowserRouter>
          <DailyRoutines />
        </BrowserRouter>
      </AuthProvider>
    );

    const toggleBtn = screen.getByTestId('toggle-full-schedule-btn');
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.getByText(/Hide Full Daily Schedule/i)).toBeInTheDocument();

    // Collapse schedule
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/View Full Daily Schedule/i)).toBeInTheDocument();

    // Checklist subtabs should be hidden to reduce cognitive overwhelm
    expect(screen.queryByRole('region', { name: /Direct Schedule Checklist/i })).not.toBeInTheDocument();

    // Re-expand schedule
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Hide Full Daily Schedule/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Direct Schedule Checklist/i })).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ */
  /* TEST 4: Progressive 3-Tier Hint System in GuidedTaskRunner         */
  /* ------------------------------------------------------------------ */
  it('4. escalates hints progressively through Tier 1 (Orientation) -> Tier 2 (Context) -> Tier 3 (Guided Action)', () => {
    render(
      <BrowserRouter>
        <GuidedTaskRunner
          routine={mockRoutineTea}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId={patientId}
        />
      </BrowserRouter>
    );

    // Initially no hint card is shown
    expect(screen.queryByTestId('progressive-hint-card')).not.toBeInTheDocument();

    // 1. First Hint Click -> Tier 1 Orientation
    const hintBtn = screen.getByTestId('progressive-hint-btn');
    fireEvent.click(hintBtn);

    const hintCard = screen.getByTestId('progressive-hint-card');
    expect(hintCard).toBeInTheDocument();
    expect(within(hintCard).getByTestId('progressive-hint-tier-badge')).toHaveTextContent(/Tier 1: Orientation Cue/i);
    expect(within(hintCard).getByText(/Orientation: Look at the table or counter/i)).toBeInTheDocument();

    // 2. Next Hint Tier Click -> Tier 2 Contextual Clue
    const nextTierBtn = within(hintCard).getByTestId('next-hint-tier-btn');
    fireEvent.click(nextTierBtn);

    expect(within(hintCard).getByTestId('progressive-hint-tier-badge')).toHaveTextContent(/Tier 2: Contextual Clue/i);
    expect(within(hintCard).getByText(/Context: Notice the warm thermos flask/i)).toBeInTheDocument();

    // 3. Next Hint Tier Click -> Tier 3 Guided Action
    const nextTierBtn2 = within(hintCard).getByTestId('next-hint-tier-btn');
    fireEvent.click(nextTierBtn2);

    expect(within(hintCard).getByTestId('progressive-hint-tier-badge')).toHaveTextContent(/Tier 3: Guided Action/i);
    expect(within(hintCard).getByText(/Action: Hold the flask with both hands/i)).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ */
  /* TEST 5: In-Session Adaptation on "Ask Asha for Help"                */
  /* ------------------------------------------------------------------ */
  it('5. tapping Ask Asha in task runner immediately adapts session to Supported mode with micro-step breakdown', () => {
    render(
      <BrowserRouter>
        <GuidedTaskRunner
          routine={mockRoutineTea}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId={patientId}
        />
      </BrowserRouter>
    );

    // Initial level is Guided
    const askAshaBtn = screen.getByTestId('ask-asha-help-runner-btn');
    fireEvent.click(askAshaBtn);

    // Switches to Supported mode with in-session adaptation badge
    expect(screen.getByTestId('supported-mode-active-banner')).toBeInTheDocument();
    expect(screen.getByText(/In-Session Adaptation/i)).toBeInTheDocument();
    expect(screen.getByText(/Detailed Step Breakdown:/i)).toBeInTheDocument();

    // Speaks reassurance
    expect(SpeechService.speak).toHaveBeenCalledWith(
      expect.stringMatching(/Asha is right here with you. I have opened the full micro-steps/i),
      expect.any(Function),
      expect.any(Function),
      expect.any(String)
    );
  });

  /* ------------------------------------------------------------------ */
  /* TEST 6: Safe Challenge Library with Instant 1-Tap Restore          */
  /* ------------------------------------------------------------------ */
  it('6. Flexible Challenge displays safe recall exercise and 1-tap restore to Guided baseline', () => {
    render(
      <BrowserRouter>
        <GuidedTaskRunner
          routine={mockRoutineTea}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId={patientId}
        />
      </BrowserRouter>
    );

    // Switch to Challenge level
    fireEvent.click(screen.getByTestId('ind-level-challenge'));

    expect(screen.getByTestId('safe-challenge-card')).toBeInTheDocument();
    expect(screen.getByText(/Challenge Exercise: Before looking at the instruction below/i)).toBeInTheDocument();

    // 1-Tap Restore Guided
    const restoreBtn = screen.getByTestId('restore-guided-btn');
    fireEvent.click(restoreBtn);

    // Verified: returns to Guided
    expect(screen.queryByTestId('safe-challenge-card')).not.toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ */
  /* TEST 7: Dynamic Adaptation: Repeated Struggle -> Step Split Proposal*/
  /* ------------------------------------------------------------------ */
  it('7. generates routine_step_split proposal after >=2 struggle sessions with strict hysteresis', async () => {
    // Session 1: struggle (assistance requested + hints)
    const res1 = await AdaptiveSupportService.recordObservation({
      id: 'obs_1',
      patientId,
      activityId: 'routine-morning-tea',
      activityTitle: 'Morning Cardamom Tea',
      activityType: 'routine',
      timestamp: new Date().toISOString(),
      sessionId: 'sess_1',
      assistanceRequested: true,
      hintsUsedCount: 2,
      repeatedInstructionCount: 1,
      completionStatus: 'completed',
      pauseCount: 1,
      durationSeconds: 120,
      isInterrupted: false,
      currentLevel: 'guided',
    });

    // Single struggle does NOT generate permanent proposal (hysteresis guard)
    expect(res1.proposalGenerated).toBeUndefined();
    expect(res1.temporaryAssistance).toBeDefined();

    // Session 2: struggle again
    const res2 = await AdaptiveSupportService.recordObservation({
      id: 'obs_2',
      patientId,
      activityId: 'routine-morning-tea',
      activityTitle: 'Morning Cardamom Tea',
      activityType: 'routine',
      timestamp: new Date().toISOString(),
      sessionId: 'sess_2',
      assistanceRequested: true,
      hintsUsedCount: 2,
      repeatedInstructionCount: 2,
      completionStatus: 'abandoned',
      pauseCount: 1,
      durationSeconds: 90,
      isInterrupted: false,
      currentLevel: 'guided',
    });

    // Evidence threshold met (>=2 struggle sessions)
    expect(res2.proposalGenerated).toBeDefined();
    expect(res2.proposalGenerated?.domain).toBe('routine_step_split');
    expect(res2.proposalGenerated?.requiresCaregiverApproval).toBe(true);

    const pending = AdaptiveSupportService.getPendingProposals(patientId);
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });

  /* ------------------------------------------------------------------ */
  /* TEST 8: Dynamic Adaptation: Comfortable Success -> Independence    */
  /* ------------------------------------------------------------------ */
  it('8. generates routine_independence progression proposal after >=3 comfortable sessions with 0 hints', async () => {
    // 3 Comfortable sessions
    for (let i = 1; i <= 3; i++) {
      await AdaptiveSupportService.recordObservation({
        id: `obs_comf_${i}`,
        patientId,
        activityId: 'routine-morning-walk',
        activityTitle: 'Morning Veranda Walk',
        activityType: 'routine',
        timestamp: new Date().toISOString(),
        sessionId: `sess_comf_${i}`,
        assistanceRequested: false,
        hintsUsedCount: 0,
        repeatedInstructionCount: 0,
        completionStatus: 'completed',
        pauseCount: 0,
        durationSeconds: 180,
        isInterrupted: false,
        currentLevel: 'guided',
      });
    }

    const pending = AdaptiveSupportService.getPendingProposals(patientId);
    const indProp = pending.find((p) => p.activityId === 'routine-morning-walk');
    expect(indProp).toBeDefined();
    expect(indProp?.domain).toBe('routine_independence');
    expect(indProp?.proposedConfig.independenceLevel).toBe('independent');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 9: Caregiver Review & Approval of Routine Adjustments         */
  /* ------------------------------------------------------------------ */
  it('9. allows caregiver to review and approve proposed routine adaptation with audit log', async () => {
    // Setup pending proposal
    const proposal = await AdaptiveSupportService.saveProposal({
      id: 'prop_test_01',
      patientId,
      activityId: 'routine-morning-tea',
      activityTitle: 'Morning Cardamom Tea',
      domain: 'routine_step_split',
      previousConfig: { mode: 'standard_steps' },
      proposedConfig: { mode: 'micro_step_split', singleStepFocus: true },
      rationale: 'Observed repeated requests for step help.',
      calmExplanation: {
        en: 'Would you like smaller micro-steps?',
        hi: 'क्या आप छोटे चरण चाहेंगे?',
        mr: 'आपण लहान पायऱ्या इच्छिता का?',
      },
      evidenceSummary: {
        windowDays: 7,
        totalSessionsObserved: 3,
        struggleCount: 2,
        comfortableCount: 1,
        assistanceRequestCount: 2,
        consecutiveCount: 2,
      },
      status: 'recommendation_generated',
      isClinicianPrescribed: false,
      requiresCaregiverApproval: true,
      createdAt: new Date().toISOString(),
    });

    expect(proposal.status).toBe('recommendation_generated');

    // Caregiver approves proposal
    const approved = await AdaptiveSupportService.approveProposal(
      patientId,
      proposal.id,
      'demo-caregiver-001',
      'caregiver'
    );

    expect(approved.status).toBe('activated');
    expect(approved.approvedBy).toBe('demo-caregiver-001');

    // Verified: No longer pending
    const remainingPending = AdaptiveSupportService.getPendingProposals(patientId);
    expect(remainingPending.some((p) => p.id === proposal.id)).toBe(false);
  });
});
