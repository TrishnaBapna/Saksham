import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AssistedRecallEngine, RecallSessionState } from '../features/routines/components/AssistedRecallEngine.js';
import { GuidedTaskRunner } from '../features/routines/components/GuidedTaskRunner.js';
import { CompanionReminderBanner } from '../features/routines/components/CompanionReminderBanner.js';
import { CompanionFollowerToast } from '../features/routines/components/CompanionFollowerToast.js';
import { RoutineItem } from '../types/index.js';

describe('Milestone 2 — Precision 3-Chance State Machine & Guided Task Runner', () => {
  const mockRoutine: RoutineItem = {
    id: 'routine-03',
    patientId: 'patient-test',
    title: 'Buttoning Shirt & Morning Dressing',
    category: 'motor',
    scheduledTime: '09:00 AM',
    isCompleted: false,
    enableAssistedRecall: true,
    timerMinutes: 15,
    streakCount: 3,
    steps: [
      '1. Prepare & Relax Fingers: Lay loose shirt flat and perform 3 gentle finger stretches',
      '2. Fasten Bottom-Up: Fasten buttons starting from bottom upward, resting hands between buttons',
      '3. Final Comfort & Posture Check: Smooth sleeves comfortably and breathe calmly',
    ],
    recallQuestion: 'It is 09:00 AM. What fine motor activity prepares you for a fresh day?',
    recallOptions: [
      'Buttoning your morning shirt slowly and steadily',
      'Running outdoors without shoes',
      'Leaving clothes untouched',
    ],
    correctOptionIndex: 0,
    recallCues: {
      hint1: 'Taking 15-20 calm minutes for buttoning keeps fine motor coordination sharp.',
      hint2: 'Look in your bedroom wardrobe or by the dressing mirror.',
      hint3: 'Buttoning your morning shirt slowly and steadily',
    },
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /* ------------------------------------------------------------- */
  /* 1. Exact 3-Heart Progression & Launch-Lock                     */
  /* ------------------------------------------------------------- */
  describe('1. Exact 3-Heart Progression & Auto-Launch', () => {
    it('progresses: ❤️❤️❤️ (3 Left) -> ❤️❤️🤍 (2 Left) -> ❤️🤍🤍 (1 Left) -> 🤍🤍🤍 (Guided) -> auto launches runner', () => {
      const handleLaunchRunner = vi.fn();
      const handleRecord = vi.fn();
      const handleComplete = vi.fn();
      const handleNav = vi.fn();

      render(
        <AssistedRecallEngine
          routines={[mockRoutine]}
          currentIndex={0}
          onNavigateIndex={handleNav}
          onComplete={handleComplete}
          onLaunchTaskRunner={handleLaunchRunner}
          onRecordAttempt={handleRecord}
        />
      );

      // State 0: Initial 3 full hearts
      expect(screen.getByText(/❤️❤️❤️/)).toBeInTheDocument();
      expect(screen.getByText(/\(3 Left\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/3 hearts attempt indicator: 3 hearts remaining/i)).toBeInTheDocument();

      // Mistake 1: Click Option B (Running outdoors without shoes)
      fireEvent.click(screen.getByText('Running outdoors without shoes'));
      expect(screen.getByText(/❤️❤️🤍/)).toBeInTheDocument();
      expect(screen.getByText(/\(2 Left\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/3 hearts attempt indicator: 2 hearts remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/First Gentle Clue:/i)).toBeInTheDocument();
      expect(handleLaunchRunner).not.toHaveBeenCalled();

      // Mistake 2: Click Option C (Leaving clothes untouched)
      fireEvent.click(screen.getByText('Leaving clothes untouched'));
      expect(screen.getByText(/❤️🤍🤍/)).toBeInTheDocument();
      expect(screen.getByText(/\(1 Left\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/3 hearts attempt indicator: 1 hearts remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/Detailed Helpful Hint:/i)).toBeInTheDocument();
      expect(handleLaunchRunner).not.toHaveBeenCalled();

      // Mistake 3: Click Option B again -> Solution revealed + auto-launch
      fireEvent.click(screen.getByText('Running outdoors without shoes'));
      expect(screen.getByText(/🤍🤍🤍/)).toBeInTheDocument();
      expect(screen.getByText(/\(Guided\)/)).toBeInTheDocument();
      expect(screen.getByText(/We Are Right Here With You/i)).toBeInTheDocument();
      expect(screen.getByText(/Starting 15-minute guided task runner/i)).toBeInTheDocument();

      // Auto-launch timer triggers after 1.2s timeout
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      expect(handleLaunchRunner).toHaveBeenCalledTimes(1);
      expect(handleLaunchRunner).toHaveBeenCalledWith(mockRoutine);
    });

    it('correct recall celebrates memory (+25 XP) without auto-completing physical routine', () => {
      const handleLaunchRunner = vi.fn();
      const handleRecord = vi.fn();
      const handleComplete = vi.fn();
      const handleNav = vi.fn();

      render(
        <AssistedRecallEngine
          routines={[mockRoutine]}
          currentIndex={0}
          onNavigateIndex={handleNav}
          onComplete={handleComplete}
          onLaunchTaskRunner={handleLaunchRunner}
          onRecordAttempt={handleRecord}
        />
      );

      // Select correct option A
      fireEvent.click(screen.getByText('Buttoning your morning shirt slowly and steadily'));

      // Celebration appears
      expect(screen.getByText(/Wonderful Memory Recall!/i)).toBeInTheDocument();
      expect(handleRecord).toHaveBeenCalledWith(mockRoutine.id, 1, false, true);

      // Physical task completion is NOT automatically fired
      expect(handleComplete).not.toHaveBeenCalled();

      // Offers button to start guided physical task
      const startGuidedBtn = screen.getByRole('button', { name: /Start Guided Task \(15m\)/i });
      expect(startGuidedBtn).toBeInTheDocument();

      fireEvent.click(startGuidedBtn);
      expect(handleLaunchRunner).toHaveBeenCalledWith(mockRoutine);
    });
  });

  /* ------------------------------------------------------------- */
  /* 2. Session Persistence Across Routine Subtabs                   */
  /* ------------------------------------------------------------- */
  describe('2. Multi-View Session Persistence', () => {
    it('restores broken hearts and attempt count from external session prop', () => {
      const handleLaunchRunner = vi.fn();
      const handleRecord = vi.fn();
      const handleComplete = vi.fn();
      const handleNav = vi.fn();

      // Simulated session where patient already made 1 mistake (2 hearts left)
      const existingSession: RecallSessionState = {
        attemptCount: 2,
        selectedOption: 1,
        feedbackState: 'hint',
        isHintExpanded: true,
      };

      render(
        <AssistedRecallEngine
          routines={[mockRoutine]}
          currentIndex={0}
          onNavigateIndex={handleNav}
          onComplete={handleComplete}
          onLaunchTaskRunner={handleLaunchRunner}
          onRecordAttempt={handleRecord}
          session={existingSession}
        />
      );

      // Must display 2 hearts remaining, NOT reset to 3 hearts!
      expect(screen.getByText(/❤️❤️🤍/)).toBeInTheDocument();
      expect(screen.getByText(/\(2 Left\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/3 hearts attempt indicator: 2 hearts remaining/i)).toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------- */
  /* 3. 15-Minute Guided Task Runner Timer Resilience               */
  /* ------------------------------------------------------------- */
  describe('3. 15-Minute Countdown Timer & Delta Tracking', () => {
    it('starts at strictly 15 minutes (900 seconds) and displays 15:00', () => {
      const handleClose = vi.fn();
      const handleFinish = vi.fn();

      render(
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={handleClose}
          onFinish={handleFinish}
        />
      );

      expect(screen.getByText(/15M ACTIVITY TIMER/i)).toBeInTheDocument();
      expect(screen.getByText('15:00')).toBeInTheDocument();
      expect(screen.getByText(/Remaining/i)).toBeInTheDocument();
    });

    it('supports pause/resume and +5m timer extension', () => {
      const handleClose = vi.fn();
      const handleFinish = vi.fn();

      render(
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={handleClose}
          onFinish={handleFinish}
        />
      );

      // Click +5m extension
      const extendBtn = screen.getByRole('button', { name: /\+5m/i });
      fireEvent.click(extendBtn);
      expect(screen.getByText('20:00')).toBeInTheDocument();

      // Pause activity
      const pauseBtn = screen.getByRole('button', { name: /^pause$/i });
      fireEvent.click(pauseBtn);
      expect(screen.getByText(/Activity paused. Rest your hands and mind/i)).toBeInTheDocument();

      // Resume activity
      const resumeBtn = screen.getByRole('button', { name: /^resume$/i });
      fireEvent.click(resumeBtn);
      expect(screen.getByText(/Remaining/i)).toBeInTheDocument();
    });

    it('timer zero expiration NEVER auto-completes task or checks steps', () => {
      const handleClose = vi.fn();
      const handleFinish = vi.fn();

      render(
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={handleClose}
          onFinish={handleFinish}
        />
      );

      // Fast forward past 15 minutes (905 seconds)
      act(() => {
        vi.advanceTimersByTime(905 * 1000);
      });

      // Timer reached 0:00 and shows expiration notice
      expect(screen.getByText('0:00')).toBeInTheDocument();
      expect(screen.getByText(/15-minute timer concluded/i)).toBeInTheDocument();

      // MUST NOT automatically finish the routine
      expect(handleFinish).not.toHaveBeenCalled();
    });
  });

  /* ------------------------------------------------------------- */
  /* 4. Checklist Steps & Confirmation Modal                        */
  /* ------------------------------------------------------------- */
  describe('4. Checklist Steps & Confirmation Modal', () => {
    it('toggles step checkboxes and requires explicit confirmation before completion', () => {
      const handleClose = vi.fn();
      const handleFinish = vi.fn();

      render(
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={handleClose}
          onFinish={handleFinish}
          defaultViewMode="checklist"
        />
      );

      // Checklist contains all 3 steps
      expect(screen.getByText(/Prepare & Relax Fingers/i)).toBeInTheDocument();
      expect(screen.getByText(/Fasten Bottom-Up/i)).toBeInTheDocument();
      expect(screen.getByText(/Final Comfort & Posture Check/i)).toBeInTheDocument();

      // Click "Complete Task & Auto-Tick" button
      const completeBtn = screen.getByRole('button', { name: /Complete Task & Auto-Tick/i });
      fireEvent.click(completeBtn);

      // Confirmation modal is displayed
      expect(screen.getByText(/Complete "Buttoning Shirt & Morning Dressing"\?/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Are you satisfied and ready to mark this routine activity completed for today\?/i)
      ).toBeInTheDocument();

      // Confirm completion
      const yesCompleteBtn = screen.getByRole('button', { name: /Yes, Complete!/i });
      fireEvent.click(yesCompleteBtn);

      expect(handleFinish).toHaveBeenCalledWith(mockRoutine.id);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  /* ------------------------------------------------------------- */
  /* 5. 4-Option Stuck? Assistance                                  */
  /* ------------------------------------------------------------- */
  describe('5. 4-Option Stuck? Assistance Flow', () => {
    it('presents all 4 assistance options: Break Down, Explain Again, Ask Asha, Caregiver', () => {
      const handleClose = vi.fn();
      const handleFinish = vi.fn();

      render(
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={handleClose}
          onFinish={handleFinish}
          patientId="patient-test"
        />
      );

      // Open Stuck modal
      const stuckBtn = screen.getByLabelText(/Stuck\? Or need assistance\?/i);
      fireEvent.click(stuckBtn);

      expect(screen.getByText(/Where are you right now\?/i)).toBeInTheDocument();
      expect(screen.getByText(/1. Break Down/i)).toBeInTheDocument();
      expect(screen.getByText(/2. Explain Again/i)).toBeInTheDocument();
      expect(screen.getByText(/3. Ask Asha/i)).toBeInTheDocument();
      expect(screen.getByText(/4. Caregiver/i)).toBeInTheDocument();

      // Test Option A: Break Down into micro-actions
      fireEvent.click(screen.getByText(/1. Break Down/i));
      expect(screen.getByText(/Micro-Actions for Step 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Spread your shirt flat across your lap/i)).toBeInTheDocument();

      // Back to task
      fireEvent.click(screen.getByRole('button', { name: /Back to Task/i }));
      expect(screen.queryByText(/Where are you right now\?/i)).not.toBeInTheDocument();

      // Re-open and test Option B: Explain Again
      fireEvent.click(screen.getByLabelText(/Stuck\? Or need assistance\?/i));
      fireEvent.click(screen.getByText(/2. Explain Again/i));
      expect(screen.getByText(/Simpler Words/i)).toBeInTheDocument();
      expect(screen.getByText(/In simple words: Take your time with this step/i)).toBeInTheDocument();

      // Back to task
      fireEvent.click(screen.getByRole('button', { name: /Back to Task/i }));

      // Re-open and test Option C: Ask Asha
      fireEvent.click(screen.getByLabelText(/Stuck\? Or need assistance\?/i));
      fireEvent.click(screen.getByText(/3. Ask Asha/i));
      expect(screen.getByText(/Asha's Encouragement/i)).toBeInTheDocument();
      expect(screen.getByText(/Namaste! Asha is here with you/i)).toBeInTheDocument();

      // Back to task
      fireEvent.click(screen.getByRole('button', { name: /Back to Task/i }));

      // Re-open and test Option D: Caregiver Support
      fireEvent.click(screen.getByLabelText(/Stuck\? Or need assistance\?/i));
      fireEvent.click(screen.getByText(/4. Caregiver/i));
      expect(screen.getByText(/Family Caregiver Support/i)).toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------- */
  /* 6. Companion Nudge Banner & Follower Toast                     */
  /* ------------------------------------------------------------- */
  describe('6. Companion Nudge Banner & Follower Toast Integration', () => {
    it('renders companion nudge banner with Let\'s Do It action', () => {
      const handleStart = vi.fn();
      const handleSnooze = vi.fn();
      const handleComplete = vi.fn();
      const handleDismiss = vi.fn();

      render(
        <CompanionReminderBanner
          task={mockRoutine}
          onStartActivity={handleStart}
          onSnooze={handleSnooze}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
          soundEnabled={false}
        />
      );

      expect(screen.getByText(/Companion Nudge/i)).toBeInTheDocument();
      expect(screen.getByText(/Friendly reminder: Buttoning Shirt & Morning Dressing/i)).toBeInTheDocument();

      const letDoItBtn = screen.getByRole('button', { name: /Start activity Buttoning Shirt & Morning Dressing/i });
      fireEvent.click(letDoItBtn);
      expect(handleStart).toHaveBeenCalledWith(mockRoutine);
    });

    it('renders floating companion toast with Go ★ button', () => {
      const handleStart = vi.fn();
      const handleSnooze = vi.fn();

      render(
        <CompanionFollowerToast
          task={mockRoutine}
          onStart={handleStart}
          onSnooze={handleSnooze}
        />
      );

      expect(screen.getByText(/MIKO ROBOT/i)).toBeInTheDocument();
      expect(screen.getByText(/Reminder alert! Your Buttoning Shirt & Morning Dressing is ready/i)).toBeInTheDocument();

      const goBtn = screen.getByTitle('Start Activity');
      fireEvent.click(goBtn);
      expect(handleStart).toHaveBeenCalledWith(mockRoutine);
    });
  });
});
