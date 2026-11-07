import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyProgressRing } from '../features/routines/components/DailyProgressRing.js';
import { CompanionReminderBanner } from '../features/routines/components/CompanionReminderBanner.js';
import { ReminderSettingsModal } from '../features/routines/components/ReminderSettingsModal.js';
import { GuidedTaskRunner } from '../features/routines/components/GuidedTaskRunner.js';
import { AssistedRecallEngine } from '../features/routines/components/AssistedRecallEngine.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { audioSynthesizer } from '../services/audioSynthesizerService.js';
import { RoutineItem, ReminderSettings } from '../types/index.js';

describe('Stage 1: Complete Patient Routine System Restoration', () => {
  const mockTask: RoutineItem = {
    id: 'test-routine-1',
    title: 'Morning Medication & Warm Tea',
    scheduledTime: '08:30 AM',
    category: 'medication',
    streakCount: 4,
    isCompleted: false,
    enableAssistedRecall: true,
    steps: [
      'Pour a fresh glass of warm water or tea.',
      'Take the blue morning blood pressure capsule from the pillbox.',
      'Drink warm water and sit comfortably for a moment.',
    ],
    recallQuestion: 'Which healthy morning routine helps balance your blood pressure at 08:30 AM?',
    recallOptions: [
      'Morning Medication & Warm Tea',
      'Go for an evening walk in the park',
      'Read tomorrow morning newspaper',
    ],
    correctOptionIndex: 0,
    recallCues: {
      hint1: 'Look at your bedside table where the pillbox and tea cup are placed.',
      hint2: 'Think of the small blue capsule you take with breakfast.',
      hint3: 'Morning Medication & Warm Tea',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  /* ------------------------------------------------------------- */
  /* 1. Daily Progress Ring Tests                                   */
  /* ------------------------------------------------------------- */
  describe('1. DailyProgressRing Component', () => {
    it('calculates completion percentage precisely using completed / total * 100', () => {
      // 3 of 8 completed -> 38%
      const { rerender } = render(<DailyProgressRing completed={3} total={8} />);
      expect(screen.getByText('38%')).toBeInTheDocument();
      expect(screen.getByText(/3 \/ 8 completed/i)).toBeInTheDocument();

      // 0 of 5 completed -> 0%
      rerender(<DailyProgressRing completed={0} total={5} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText(/0 \/ 5 completed/i)).toBeInTheDocument();

      // 5 of 5 completed -> 100%
      rerender(<DailyProgressRing completed={5} total={5} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText(/5 \/ 5 completed/i)).toBeInTheDocument();
      expect(screen.getByText(/All Steps Done/i)).toBeInTheDocument();
    });

    it('handles zero total items gracefully without NaN errors', () => {
      render(<DailyProgressRing completed={0} total={0} />);
      expect(screen.getByText(/No tasks/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    it('provides accessible role and aria attributes for screen readers', () => {
      render(<DailyProgressRing completed={2} total={4} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
      expect(progressbar).toHaveAttribute(
        'aria-label',
        'Daily routine progress: 2 of 4 completed (50%)'
      );
    });
  });

  /* ------------------------------------------------------------- */
  /* 2. Active Clock-Window & Time Slot Calculation                */
  /* ------------------------------------------------------------- */
  describe('2. Active Clock-Window [-45m, +30m] Detection', () => {
    it('detects a routine due now within the [-45 mins, +30 mins] window', () => {
      const routines: RoutineItem[] = [
        {
          id: 'task-morning',
          title: 'Morning Yoga',
          scheduledTime: '10:00 AM', // 600 mins from midnight
          category: 'exercise',
          streakCount: 2,
          isCompleted: false,
          enableAssistedRecall: true,
        },
      ];

      // Current time is 10:15 AM (615 mins) -> within 600 + 30 = 630 window
      const resultDueNow = RoutineService.getActiveTimeWindowTask(routines, 615);
      expect(resultDueNow.activeTask).not.toBeNull();
      expect(resultDueNow.activeTask?.id).toBe('task-morning');
      expect(resultDueNow.isDueNow).toBe(true);

      // Current time is 9:20 AM (560 mins) -> within 600 - 45 = 555 window
      const resultEarlyWindow = RoutineService.getActiveTimeWindowTask(routines, 560);
      expect(resultEarlyWindow.isDueNow).toBe(true);

      // Current time is 8:30 AM (510 mins) -> before 555, but next upcoming pending today
      const resultUpcoming = RoutineService.getActiveTimeWindowTask(routines, 510);
      expect(resultUpcoming.activeTask?.id).toBe('task-morning');
      expect(resultUpcoming.isDueNow).toBe(false);

      // Current time is 11:30 AM (690 mins) -> after 630 window and no upcoming
      const resultPast = RoutineService.getActiveTimeWindowTask(routines, 690);
      expect(resultPast.activeTask).toBeNull();
      expect(resultPast.isDueNow).toBe(false);
    });
  });

  /* ------------------------------------------------------------- */
  /* 3. Audio Synthesizer Safety                                    */
  /* ------------------------------------------------------------- */
  describe('3. Web Audio API Synthesizer', () => {
    it('executes chimes safely without crashing in browser and test environments', () => {
      expect(() => {
        audioSynthesizer.playChime('chime');
        audioSynthesizer.playChime('bell');
        audioSynthesizer.playChime('fanfare');
        audioSynthesizer.playChime('reminder');
      }).not.toThrow();
    });

    it('respects soundEnabled flag toggle', () => {
      audioSynthesizer.setSoundEnabled(false);
      expect(() => audioSynthesizer.playChime('fanfare')).not.toThrow();
      audioSynthesizer.setSoundEnabled(true);
    });
  });

  /* ------------------------------------------------------------- */
  /* 4. Companion Reminder Banner                                   */
  /* ------------------------------------------------------------- */
  describe('4. CompanionReminderBanner Component', () => {
    it('renders task reminder with Asha avatar, 3-minute snooze and actions', () => {
      const handleStart = vi.fn();
      const handleSnooze = vi.fn();
      const handleComplete = vi.fn();
      const handleDismiss = vi.fn();

      render(
        <CompanionReminderBanner
          task={mockTask}
          onStartActivity={handleStart}
          onSnooze={handleSnooze}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
          soundEnabled={false}
        />
      );

      expect(screen.getByText(/Companion Nudge/i)).toBeInTheDocument();
      expect(screen.getByText(/Gentle reminder: Morning Medication & Warm Tea/i)).toBeInTheDocument();

      // Test "Let's Do It! 🌟" button
      const startBtn = screen.getByRole('button', { name: /Start activity Morning Medication & Warm Tea/i });
      fireEvent.click(startBtn);
      expect(handleStart).toHaveBeenCalledWith(mockTask);

      // Test 3 mins snooze button
      const snoozeBtn = screen.getByRole('button', { name: /Snooze for 3 minutes/i });
      fireEvent.click(snoozeBtn);
      expect(handleSnooze).toHaveBeenCalledWith(mockTask, 3);

      // Test complete button
      const completeBtn = screen.getByRole('button', { name: /Mark Morning Medication & Warm Tea completed/i });
      fireEvent.click(completeBtn);
      expect(handleComplete).toHaveBeenCalledWith(mockTask.id);

      // Test dismiss button
      const dismissBtn = screen.getByRole('button', { name: /Dismiss companion reminder/i });
      fireEvent.click(dismissBtn);
      expect(handleDismiss).toHaveBeenCalled();
    });
  });

  /* ------------------------------------------------------------- */
  /* 5. Reminder Settings Modal & Quiet Hours                       */
  /* ------------------------------------------------------------- */
  describe('5. ReminderSettingsModal & Quiet Hours Detection', () => {
    it('accurately identifies quiet sleep hours (e.g. 22:00 to 07:00)', () => {
      const settings: ReminderSettings = {
        enabled: true,
        soundEnabled: true,
        voiceEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        snoozeDurationMinutes: 5,
      };

      // 23:30 (1410 mins) -> inside overnight quiet window
      expect(RoutineService.isQuietHoursActive(settings, 1410)).toBe(true);

      // 03:00 (180 mins) -> inside overnight quiet window
      expect(RoutineService.isQuietHoursActive(settings, 180)).toBe(true);

      // 14:00 (840 mins) -> daytime outside quiet window
      expect(RoutineService.isQuietHoursActive(settings, 840)).toBe(false);

      // When quiet hours disabled
      const disabledQuiet = { ...settings, quietHoursEnabled: false };
      expect(RoutineService.isQuietHoursActive(disabledQuiet, 1410)).toBe(false);
    });

    it('saves reminder preferences scoped to patient UID', () => {
      const patientId = 'test-patient-preferences';
      const handleClose = vi.fn();

      render(
        <ReminderSettingsModal
          isOpen={true}
          onClose={handleClose}
          patientId={patientId}
        />
      );

      expect(screen.getByText(/Reminders & Notification Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Care Reminders/i)).toBeInTheDocument();
      expect(screen.getByText(/Quiet Hours \(Rest Window\)/i)).toBeInTheDocument();

      const saveBtn = screen.getByRole('button', { name: /Save Reminder Preferences/i });
      fireEvent.click(saveBtn);

      const saved = RoutineService.getReminderSettings(patientId);
      expect(saved.enabled).toBe(true);
    });
  });

  /* ------------------------------------------------------------- */
  /* 6. 3-Chance Assisted Recall with 3 Hearts Progression          */
  /* ------------------------------------------------------------- */
  describe('6. 3-Chance Assisted Recall & 3 Hearts Indicator', () => {
    it('shows 3 hearts initially, decrementing on incorrect answers without penalty', () => {
      const handleComplete = vi.fn();
      const handleLaunchRunner = vi.fn();
      const handleRecord = vi.fn();
      const handleNav = vi.fn();

      render(
        <AssistedRecallEngine
          routines={[mockTask]}
          currentIndex={0}
          onNavigateIndex={handleNav}
          onComplete={handleComplete}
          onLaunchTaskRunner={handleLaunchRunner}
          onRecordAttempt={handleRecord}
        />
      );

      // Initial state: 3 hearts remaining
      expect(screen.getByLabelText(/3 hearts attempt indicator: 3 hearts remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/Which healthy morning routine helps balance your blood pressure/i)).toBeInTheDocument();

      // Click wrong option (Index 1: "Go for an evening walk in the park")
      const wrongOptionBtn = screen.getByText('Go for an evening walk in the park');
      fireEvent.click(wrongOptionBtn);

      // Attempt 2: 2 hearts remaining, gentle hint 1 displayed
      expect(screen.getByLabelText(/3 hearts attempt indicator: 2 hearts remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/First Gentle Clue/i)).toBeInTheDocument();

      // Click wrong option again
      const wrongOptionBtn2 = screen.getByText('Read tomorrow morning newspaper');
      fireEvent.click(wrongOptionBtn2);

      // Attempt 3: 1 heart remaining, detailed hint displayed
      expect(screen.getByLabelText(/3 hearts attempt indicator: 1 hearts remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/Detailed Helpful Hint/i)).toBeInTheDocument();

      // Click wrong option third time: reveal with warmth
      fireEvent.click(wrongOptionBtn2);
      expect(screen.getByText(/We Are Right Here With You/i)).toBeInTheDocument();
      expect(screen.getByText(/Morning Medication & Warm Tea/i)).toBeInTheDocument();
    });

    it('celebrates correct answer with positive feedback and completion button', () => {
      const handleComplete = vi.fn();
      const handleLaunchRunner = vi.fn();
      const handleRecord = vi.fn();
      const handleNav = vi.fn();

      render(
        <AssistedRecallEngine
          routines={[mockTask]}
          currentIndex={0}
          onNavigateIndex={handleNav}
          onComplete={handleComplete}
          onLaunchTaskRunner={handleLaunchRunner}
          onRecordAttempt={handleRecord}
        />
      );

      // Click correct option (Index 0: "Morning Medication & Warm Tea")
      const correctOption = screen.getByText('Morning Medication & Warm Tea');
      fireEvent.click(correctOption);

      expect(screen.getByText(/Wonderful Memory Recall!/i)).toBeInTheDocument();
      expect(handleRecord).toHaveBeenCalledWith(mockTask.id, 1, false, true);

      // Complete button marks activity complete
      const finishBtn = screen.getByRole('button', { name: /Mark Activity Complete/i });
      fireEvent.click(finishBtn);
      expect(handleComplete).toHaveBeenCalledWith(mockTask.id);
    });
  });

  /* ------------------------------------------------------------- */
  /* 7. Guided Task Runner Dual Modes & Checkpoints                */
  /* ------------------------------------------------------------- */
  describe('7. GuidedTaskRunner Dual Modes, Presets & Confirmations', () => {
    it('switches between Step-by-Step and Checklist overview modes', () => {
      const handleClose = vi.fn();
      const handleFinish = vi.fn();

      render(
        <GuidedTaskRunner
          routine={mockTask}
          isOpen={true}
          onClose={handleClose}
          onFinish={handleFinish}
        />
      );

      // Default is Step-by-Step single task view
      expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
      expect(screen.getByText(/Pour a fresh glass of warm water or tea/i)).toBeInTheDocument();

      // Switch to Checklist view mode
      const checklistModeBtn = screen.getByRole('button', { name: /Full Checklist/i });
      fireEvent.click(checklistModeBtn);

      // Both steps should now be visible simultaneously
      expect(screen.getByText(/Tick each step as you complete it/i)).toBeInTheDocument();
      expect(screen.getByText(/Take the blue morning blood pressure capsule from the pillbox/i)).toBeInTheDocument();

      // Switch back to Single Step mode
      const singleStepBtn = screen.getByRole('button', { name: /Step-by-Step Card/i });
      fireEvent.click(singleStepBtn);
      expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
    });

    it('supports timer extension by +5m and never auto-completes on timer zero', () => {
      const handleClose = vi.fn();
      const handleFinish = vi.fn();

      render(
        <GuidedTaskRunner
          routine={mockTask}
          isOpen={true}
          onClose={handleClose}
          onFinish={handleFinish}
        />
      );

      // Select 10m preset
      const preset10 = screen.getByRole('button', { name: '10m' });
      fireEvent.click(preset10);
      expect(screen.getByText('10:00')).toBeInTheDocument();

      // Extend by +5m
      const extendBtn = screen.getByRole('button', { name: /\+5m/i });
      fireEvent.click(extendBtn);
      expect(screen.getByText('15:00')).toBeInTheDocument();

      // Does NOT auto-finish without explicit patient confirmation
      expect(handleFinish).not.toHaveBeenCalled();
    });

    it('requires explicit confirmation before completing task via modal', () => {
      const handleClose = vi.fn();
      const handleFinish = vi.fn();

      render(
        <GuidedTaskRunner
          routine={mockTask}
          isOpen={true}
          onClose={handleClose}
          onFinish={handleFinish}
        />
      );

      // Advance to final step
      fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
      fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument();

      // Click "Finish Activity"
      const finishBtn = screen.getByRole('button', { name: /Finish Activity/i });
      fireEvent.click(finishBtn);

      // Confirmation modal appears asking for explicit confirmation
      expect(screen.getByText(/Complete "Morning Medication & Warm Tea"\?/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Are you satisfied and ready to mark this routine activity completed for today\?/i)
      ).toBeInTheDocument();

      // Click "Yes, Complete!"
      const confirmBtn = screen.getByRole('button', { name: /Yes, Complete!/i });
      fireEvent.click(confirmBtn);

      expect(handleFinish).toHaveBeenCalledWith(mockTask.id);
    });

    it('logs difficulty feedback through the "Stuck?" checkpoint', () => {
      const handleClose = vi.fn();
      const handleFinish = vi.fn();

      render(
        <GuidedTaskRunner
          routine={mockTask}
          isOpen={true}
          onClose={handleClose}
          onFinish={handleFinish}
        />
      );

      // Click Stuck?
      const stuckBtn = screen.getByText(/Stuck\? Or need assistance\?/i);
      fireEvent.click(stuckBtn);

      expect(screen.getByText(/Where are you right now\?/i)).toBeInTheDocument();
      const feedbackOption = screen.getByText(/I forgot what I was doing/i);
      fireEvent.click(feedbackOption);

      expect(screen.getByText(/Right now, all you need to do is/i)).toBeInTheDocument();
    });
  });
});
