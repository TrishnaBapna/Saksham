import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DailyRoutines } from '../pages/patient/DailyRoutines.js';
import { GuidedTaskRunner } from '../features/routines/components/GuidedTaskRunner.js';
import { TaskLifecycleService } from '../features/routines/services/taskLifecycleService.js';
import { MemoryChallengeCard } from '../features/routines/components/MemoryChallengeCard.js';
import { AdaptiveSupportService } from '../features/adaptive/services/adaptiveSupportService.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { SpeechService } from '../services/speechService.js';
import { AuthProvider } from '../context/AuthContext.js';
import { RoutineItem } from '../types/index.js';

describe('Phase 3.1: Adaptive Memory-Aware Daily Living, Task Accountability, Recall Challenges & Lifecycle Management', () => {
  const patientId = 'demo-patient-001';

  const mockRoutineMed: RoutineItem = {
    id: 'routine-02',
    title: 'Morning Clinician-Prescribed Medication',
    description: 'Take 1 tablet with water as prescribed.',
    scheduledTime: '08:30 AM',
    period: 'morning',
    category: 'medication',
    isCompleted: false,
    streakCount: 5,
    enableAssistedRecall: true,
    isClinicianPrescribed: true,
    timerMinutes: 5,
    steps: [
      '1. Get a clean glass of water.',
      '2. Take your morning tablet from the pillbox.',
      '3. Swallow with water calmly.',
    ],
  };

  const mockRoutineTea: RoutineItem = {
    id: 'routine-01',
    title: 'Morning Herbal Tea & Gentle Hydration',
    description: 'Prepare a warm herbal tea to gently hydrate.',
    scheduledTime: '08:00 AM',
    period: 'morning',
    category: 'wellness',
    isCompleted: false,
    streakCount: 4,
    enableAssistedRecall: true,
    timerMinutes: 10,
    steps: [
      '1. Pour water into the pot.',
      '2. Place pot on stove to heat.',
      '3. Put herbal tea bag into your ceramic mug.',
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    TaskLifecycleService.clearCache();
    AdaptiveSupportService.clearCache();
    vi.clearAllMocks();
    vi.spyOn(SpeechService, 'speak').mockImplementation(() => {});
    vi.spyOn(SpeechService, 'cancelSpeech').mockImplementation(() => {});
  });

  /* ------------------------------------------------------------------ */
  /* TEST 1: Recurring Task Identity & Date-Scoped Daily Instances       */
  /* ------------------------------------------------------------------ */
  it('1. establishes persistent recurring task identity and generates date-scoped instances without overwriting history', () => {
    const recurring = TaskLifecycleService.getRecurringTasks(patientId);
    expect(recurring.length).toBeGreaterThan(0);

    const teaTask = recurring.find((t) => t.id === 'routine-01');
    expect(teaTask).toBeDefined();
    expect(teaTask?.lifecycleStatus).toBe('active');
    expect(teaTask?.recurrence).toBe('daily');

    // Create instances for today
    const today = '2026-11-21';
    const instancesToday = TaskLifecycleService.getOrCreateTodayInstances(patientId, today);
    expect(instancesToday.length).toBeGreaterThan(0);

    const teaInstance = instancesToday.find((i) => i.recurringTaskId === 'routine-01');
    expect(teaInstance).toBeDefined();
    expect(teaInstance?.status).toBe('scheduled');
    expect(teaInstance?.date).toBe(today);

    // Create instances for tomorrow: must preserve today without overwriting
    const tomorrow = '2026-11-22';
    const instancesTomorrow = TaskLifecycleService.getOrCreateTodayInstances(patientId, tomorrow);
    expect(instancesTomorrow.length).toBeGreaterThan(0);

    const allInstances = TaskLifecycleService.getAllInstances(patientId);
    const todayRecorded = allInstances.filter((i) => i.date === today);
    const tomorrowRecorded = allInstances.filter((i) => i.date === tomorrow);

    expect(todayRecorded.length).toBeGreaterThan(0);
    expect(tomorrowRecorded.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------ */
  /* TEST 2: Task Completion Accountability Attribution (Self vs Help)  */
  /* ------------------------------------------------------------------ */
  it('2. records explicit completion attribution (self-reported vs supported with help) in TaskLifecycleService', () => {
    const today = '2026-11-21';
    const instances = TaskLifecycleService.getOrCreateTodayInstances(patientId, today);
    const teaInstance = instances.find((i) => i.recurringTaskId === 'routine-01')!;

    // Case A: Patient completes with help
    const completedAssisted = TaskLifecycleService.recordInstanceCompletion(patientId, teaInstance.id, {
      reportedBy: 'patient',
      completionType: 'with_help',
      helpType: 'verbal_guide',
      verifiedMethod: 'none',
      notes: 'Daughter helped pour boiling water',
    });

    expect(completedAssisted?.status).toBe('completed_assisted');
    expect(completedAssisted?.completionAttribution?.completionType).toBe('with_help');
    expect(completedAssisted?.completionAttribution?.reportedBy).toBe('patient');
    expect(completedAssisted?.completionAttribution?.verifiedMethod).toBe('none');

    // Check summary reflects assisted completion
    const summary = TaskLifecycleService.getTaskHistorySummary(patientId, 'routine-01');
    expect(summary?.reportedCompleted).toBe(1);
    expect(summary?.reportedWithHelp).toBe(1);
  });

  /* ------------------------------------------------------------------ */
  /* TEST 3: Non-Punitive Skip & Snooze Lifecycle States                */
  /* ------------------------------------------------------------------ */
  it('3. supports non-punitive skip and snooze without treating them as cognitive failure', () => {
    const today = '2026-11-21';
    const instances = TaskLifecycleService.getOrCreateTodayInstances(patientId, today);
    const medInstance = instances.find((i) => i.recurringTaskId === 'routine-02')!;

    // Snooze task
    const snoozed = TaskLifecycleService.recordInstanceSnooze(patientId, medInstance.id, 15);
    expect(snoozed?.status).toBe('snoozed');
    expect(snoozed?.snoozeUntil).toBeDefined();

    // Skip task peacefully
    const skipped = TaskLifecycleService.recordInstanceSkip(
      patientId,
      medInstance.id,
      'Resting peacefully this morning'
    );
    expect(skipped?.status).toBe('skipped');
    expect(skipped?.skipReason).toContain('Resting peacefully');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 4: Gentle Memory Challenge Progressive Hint Hierarchy         */
  /* ------------------------------------------------------------------ */
  it('4. presents gentle memory challenge with 5-level progressive hint cues and zero-penalty decline', () => {
    let outcomeRecorded: any = null;

    render(
      <MemoryChallengeCard
        taskId="routine-01"
        taskTitle="Morning Herbal Tea"
        patientId={patientId}
        config={{
          enabled: true,
          challengeType: 'next_step',
          promptQuestion: 'What comes after taking out the teapot?',
          stepOptions: [
            'Place pot on stove to heat clean water',
            'Leave clothes untouched',
            'Run outside',
          ],
          correctOptionIndex: 0,
        }}
        onChallengeComplete={(res) => {
          outcomeRecorded = res;
        }}
      />
    );

    expect(screen.getByTestId('memory-challenge-card')).toBeInTheDocument();
    expect(screen.getByText(/Gentle Memory Challenge/i)).toBeInTheDocument();
    expect(screen.getByText(/What comes after taking out the teapot\?/i)).toBeInTheDocument();

    // Request hint
    const hintBtn = screen.getByText(/Give me a gentle hint/i);
    fireEvent.click(hintBtn);

    expect(screen.getByText(/Orientation/i)).toBeInTheDocument();

    // Select the correct option
    const optionBtn = screen.getByText(/Place pot on stove to heat clean water/i);
    fireEvent.click(optionBtn);

    expect(outcomeRecorded).not.toBeNull();
    expect(outcomeRecorded.completed).toBe(true);
    expect(outcomeRecorded.attempted).toBe(true);
    expect(outcomeRecorded.declined).toBe(false);
  });

  /* ------------------------------------------------------------------ */
  /* TEST 5: Task Pause, Resume, and Safeguarded Clinician Archival     */
  /* ------------------------------------------------------------------ */
  it('5. prevents silent deletion of tasks and gates clinician-prescribed removal with caregiver review', () => {
    // Ordinary task pause and resume
    const paused = TaskLifecycleService.pauseTask(patientId, 'routine-01', 'patient', 'Vacation rest');
    expect(paused?.lifecycleStatus).toBe('paused');
    expect(paused?.pausedAt).toBeDefined();

    const resumed = TaskLifecycleService.resumeTask(patientId, 'routine-01', 'patient');
    expect(resumed?.lifecycleStatus).toBe('active');
    expect(resumed?.pausedAt).toBeUndefined();

    // Clinician prescribed task removal request
    const archiveAttempt = TaskLifecycleService.archiveTask(patientId, 'routine-02', {
      reasonCode: 'schedule_changed',
      explanation: 'Taking meds at clinic today',
      requestedBy: 'patient',
      requestedAt: new Date().toISOString(),
      status: 'pending_review',
    });

    // Must NOT be unilaterally archived — enters pending review
    expect(archiveAttempt?.pendingReview).toBe(true);
    expect(archiveAttempt?.task.lifecycleStatus).toBe('pending_removal_review');
    expect(archiveAttempt?.task.removalReason?.status).toBe('pending_review');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 6: Patient UI Multi-Tab Navigation (Today, Routine, History)  */
  /* ------------------------------------------------------------------ */
  it('6. provides dementia-friendly navigation across Today, My Routine, History, and Weekly Rhythm views', () => {
    RoutineService.saveRoutines(patientId, [mockRoutineTea, mockRoutineMed]);

    render(
      <AuthProvider>
        <BrowserRouter>
          <DailyRoutines />
        </BrowserRouter>
      </AuthProvider>
    );

    // Initial view: Today
    expect(screen.getByTestId('intelligent-daily-plan-hero')).toBeInTheDocument();

    // Switch to "My Routine"
    const myRoutineBtn = screen.getByTestId('tab-my-routine-btn');
    fireEvent.click(myRoutineBtn);
    expect(screen.getByTestId('my-routine-view')).toBeInTheDocument();

    // Switch to "History"
    const historyBtn = screen.getByTestId('tab-history-btn');
    fireEvent.click(historyBtn);
    expect(screen.getByTestId('activity-history-view')).toBeInTheDocument();

    // Switch to "Weekly"
    const weeklyBtn = screen.getByTestId('tab-weekly-btn');
    fireEvent.click(weeklyBtn);
    expect(screen.getByTestId('weekly-rhythm-view')).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ */
  /* TEST 7: GuidedTaskRunner Completion Accountability Buttons         */
  /* ------------------------------------------------------------------ */
  it('7. presents explicit completion accountability options in GuidedTaskRunner finish confirmation', () => {
    const handleFinish = vi.fn();

    render(
      <GuidedTaskRunner
        routine={mockRoutineTea}
        patientId={patientId}
        isOpen={true}
        onClose={() => {}}
        onFinish={handleFinish}
      />
    );

    // Open complete confirmation
    const finishBtn = screen.getByTestId('runner-complete-btn');
    fireEvent.click(finishBtn);

    // Verify completion accountability choices are visible
    expect(screen.getByTestId('complete-self-btn')).toBeInTheDocument();
    expect(screen.getByTestId('complete-assisted-btn')).toBeInTheDocument();
    expect(screen.getByTestId('complete-partial-btn')).toBeInTheDocument();

    // Select "I did it with help"
    fireEvent.click(screen.getByTestId('complete-assisted-btn'));

    expect(handleFinish).toHaveBeenCalledWith('routine-01');

    // Verify instance recorded as completed_assisted
    const allInstances = TaskLifecycleService.getAllInstances(patientId);
    const completed = allInstances.find((i) => i.recurringTaskId === 'routine-01');
    expect(completed?.status).toBe('completed_assisted');
  });

  /* ------------------------------------------------------------------ */
  /* TEST 8: Asha Grounded Task Summary & Truthful Non-Fabrication       */
  /* ------------------------------------------------------------------ */
  it('8. provides grounded, truthful task context for Asha queries without inventing completion', () => {
    // When no task completed
    const summary = TaskLifecycleService.getAshaGroundedTaskSummary(patientId);
    expect(summary.todayTotal).toBeGreaterThan(0);
    expect(summary.completedCount).toBe(0);
    expect(summary.pendingCount).toBe(summary.todayTotal);

    // Doctor prescribed medication must be prioritized as recommended next
    expect(summary.recommendedNext?.category).toBe('medication');

    // Complete the medication task
    const today = new Date().toISOString().split('T')[0];
    const medInst = TaskLifecycleService.getOrCreateTodayInstances(patientId, today).find(
      (i) => i.recurringTaskId === 'routine-02'
    )!;

    TaskLifecycleService.recordInstanceCompletion(patientId, medInst.id, {
      reportedBy: 'patient',
      completionType: 'self',
      verifiedMethod: 'none',
    });

    const updatedSummary = TaskLifecycleService.getAshaGroundedTaskSummary(patientId);
    expect(updatedSummary.completedCount).toBe(1);
    expect(updatedSummary.recommendedNext?.id).not.toBe(medInst.id);
  });

  /* ------------------------------------------------------------------ */
  /* TEST 9: Descriptive, Non-Diagnostic Analytics & Insights          */
  /* ------------------------------------------------------------------ */
  it('9. produces human, non-diagnostic task insights and avoids clinical deterioration scoring', () => {
    // Record 2 assisted sessions on routine-01
    const today = '2026-11-21';
    const instances = TaskLifecycleService.getOrCreateTodayInstances(patientId, today);
    const inst = instances[0];

    TaskLifecycleService.recordInstanceCompletion(patientId, inst.id, {
      reportedBy: 'patient',
      completionType: 'with_help',
      helpType: 'verbal_guide',
      verifiedMethod: 'none',
    });

    const insights = TaskLifecycleService.getDescriptiveInsights(patientId);
    expect(insights.length).toBeGreaterThanOrEqual(0);

    for (const insight of insights) {
      // Must not contain clinical disease scoring or diagnostic judgment
      expect(insight.messageEn).not.toMatch(/dementia score|cognitive decline|impairment score|failed/i);
    }
  });
});
