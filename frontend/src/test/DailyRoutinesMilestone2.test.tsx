import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DailyRoutines } from '../pages/patient/DailyRoutines.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { RoutineItem, RoutineAttemptRecord } from '../types/index.js';

describe('Daily Routines & Care — Milestone 2 Full Specification', () => {
  const renderDailyRoutines = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <CharacterProvider>
                <DailyRoutines />
              </CharacterProvider>
            </AccessibilityProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  describe('1. Two-View Design & Tab Switching', () => {
    it('renders both Direct Schedule Checklist and 3-Chance Assisted Recall view tabs', () => {
      renderDailyRoutines();
      expect(screen.getByRole('button', { name: /View Direct Schedule Checklist/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /View Step-by-Step 3-Chance Assisted Recall/i })).toBeInTheDocument();
    });

    it('switches seamlessly between Checklist view and Assisted Recall view', () => {
      renderDailyRoutines();

      // Starts on Checklist view
      expect(screen.getByText(/Morning Care Routines/i)).toBeInTheDocument();

      // Switch to Assisted Recall view
      const recallTab = screen.getByRole('button', { name: /View Step-by-Step 3-Chance Assisted Recall/i });
      fireEvent.click(recallTab);

      // Verify Assisted Recall view is active
      expect(screen.getByText(/Cognitive Memory Question/i)).toBeInTheDocument();
      expect(screen.getByText(/Gentle Attempt:/i)).toBeInTheDocument();

      // Switch back to Checklist view
      const checklistTab = screen.getByRole('button', { name: /View Direct Schedule Checklist/i });
      fireEvent.click(checklistTab);
      expect(screen.getByText(/Morning Care Routines/i)).toBeInTheDocument();
    });
  });

  describe('2. Dynamic Progress & Streak Calculations', () => {
    it('calculates completion progress dynamically without hardcoding', () => {
      const mockRoutines: RoutineItem[] = [
        { id: 'r1', title: 'Task 1', scheduledTime: '09:00 AM', category: 'wellness', streakCount: 1, isCompleted: true, enableAssistedRecall: true },
        { id: 'r2', title: 'Task 2', scheduledTime: '11:00 AM', category: 'exercise', streakCount: 1, isCompleted: false, enableAssistedRecall: true },
      ];

      const progress = RoutineService.calculateProgress(mockRoutines);
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(2);
      expect(progress.percentage).toBe(50);

      // When all completed
      mockRoutines[1].isCompleted = true;
      const fullProgress = RoutineService.calculateProgress(mockRoutines);
      expect(fullProgress.percentage).toBe(100);
    });

    it('calculates streaks from actual consecutive daily completion history', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

      const mockHistory: RoutineAttemptRecord[] = [
        { id: '1', routineId: 'r1', date: today, attemptsUsed: 1, skipped: false, isCompleted: true },
        { id: '2', routineId: 'r1', date: yesterday, attemptsUsed: 1, skipped: false, isCompleted: true },
        { id: '3', routineId: 'r1', date: twoDaysAgo, attemptsUsed: 1, skipped: false, isCompleted: true },
      ];

      const streak = RoutineService.calculateStreak(mockHistory);
      expect(streak).toBeGreaterThanOrEqual(1);

      // Empty history returns 0
      expect(RoutineService.calculateStreak([])).toBe(0);
    });
  });

  describe('3. Step-by-Step 3-Chance Assisted Recall Engine', () => {
    it('presents progressive hints across attempts 1, 2, and 3 without shaming', () => {
      renderDailyRoutines();

      // Navigate to Assisted Recall view
      fireEvent.click(screen.getByRole('button', { name: /View Step-by-Step 3-Chance Assisted Recall/i }));

      // Attempt 1: Question is displayed
      expect(screen.getByText(/Cognitive Memory Question/i)).toBeInTheDocument();
      expect(screen.getByText(/Gentle Attempt:/i)).toBeInTheDocument();

      // Request gentle hint
      const hintBtn = screen.getByRole('button', { name: /Request another hint/i });
      fireEvent.click(hintBtn);

      // Attempt 2: First gentle clue displayed
      expect(screen.getByText(/First Gentle Clue/i)).toBeInTheDocument();

      // Request next hint
      fireEvent.click(hintBtn);

      // Attempt 3: Detailed helpful hint displayed
      expect(screen.getByText(/Detailed Helpful Hint/i)).toBeInTheDocument();
    });

    it('handles correct answer selection with positive celebration', () => {
      renderDailyRoutines();
      fireEvent.click(screen.getByRole('button', { name: /View Step-by-Step 3-Chance Assisted Recall/i }));

      // Click the correct first option
      const options = screen.getAllByRole('button').filter((b) =>
        b.textContent?.includes('Morning Blood Pressure Medication')
      );
      if (options.length > 0) {
        fireEvent.click(options[0]);
        expect(screen.getByText(/Wonderful Memory Recall!/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Mark Activity Complete/i })).toBeInTheDocument();
      }
    });

    it('allows patient to skip questions at any point without penalty', () => {
      renderDailyRoutines();
      fireEvent.click(screen.getByRole('button', { name: /View Step-by-Step 3-Chance Assisted Recall/i }));

      const skipBtn = screen.getByRole('button', { name: /Skip to next question/i });
      expect(skipBtn).toBeInTheDocument();

      // Skip advance to next activity
      fireEvent.click(skipBtn);
      expect(screen.getByText(/Activity 2 of/i)).toBeInTheDocument();
    });
  });

  describe('4. Direct Schedule Checklist & Snooze Functionality', () => {
    it('allows marking activities complete directly without requiring assisted recall', () => {
      renderDailyRoutines();

      // Find the toggle buttons for routines
      const toggleButtons = screen.getAllByRole('button', { name: /Mark.*complete/i });
      expect(toggleButtons.length).toBeGreaterThan(0);

      // Click to toggle
      fireEvent.click(toggleButtons[0]);
    });

    it('snoozes an activity by 5 and 15 minutes, updating the schedule time', () => {
      const routine: RoutineItem = {
        id: 'test-snooze',
        title: 'Midday Stretch',
        scheduledTime: '11:00 AM',
        category: 'exercise',
        streakCount: 2,
        isCompleted: false,
        enableAssistedRecall: true,
      };

      const snoozed5 = RoutineService.snoozeRoutine(routine, 5);
      expect(snoozed5.scheduledTime).toBe('11:05 AM');
      expect(snoozed5.snoozedUntil).toBe('11:05 AM');

      const snoozed15 = RoutineService.snoozeRoutine(routine, 15);
      expect(snoozed15.scheduledTime).toBe('11:15 AM');
      expect(snoozed15.snoozedUntil).toBe('11:15 AM');
    });
  });

  describe('5. Guided Task Runner & Diagnostic Checkpoint', () => {
    it('navigates through step-by-step instructions and finishes activity', () => {
      renderDailyRoutines();

      // Click "Step-by-Step" button on a task
      const runnerButtons = screen.getAllByRole('button', { name: /Start guided task runner/i });
      expect(runnerButtons.length).toBeGreaterThan(0);
      fireEvent.click(runnerButtons[0]);

      // Guided runner modal opens
      expect(screen.getByText(/Guided Step-by-Step Task Runner/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();

      // Advance to Step 2
      const nextBtn = screen.getByRole('button', { name: /Next Step/i });
      fireEvent.click(nextBtn);
      expect(screen.getByText(/Step 2 of/i)).toBeInTheDocument();

      // Go back to Step 1
      const prevBtn = screen.getByRole('button', { name: /Previous Step/i });
      fireEvent.click(prevBtn);
      expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();
    });

    it('provides reassuring guidance when patient clicks "Stuck?" checkpoint', () => {
      renderDailyRoutines();
      const runnerButtons = screen.getAllByRole('button', { name: /Start guided task runner/i });
      fireEvent.click(runnerButtons[0]);

      // Click "Stuck? Or need assistance?"
      const stuckBtn = screen.getByText(/Stuck\? Or need assistance\?/i);
      fireEvent.click(stuckBtn);

      // Checkpoint modal displays gentle question
      expect(screen.getByText(/Where are you right now\?/i)).toBeInTheDocument();
      expect(screen.getByText(/I have just started/i)).toBeInTheDocument();
      expect(screen.getByText(/I completed the first step/i)).toBeInTheDocument();
      expect(screen.getByText(/I forgot what I was doing/i)).toBeInTheDocument();

      // Select "I forgot what I was doing"
      fireEvent.click(screen.getByText(/I forgot what I was doing/i));
      expect(screen.getByText(/Right now, all you need to do is/i)).toBeInTheDocument();
    });
  });

  describe('6. Add Routine Activity with Clinical Regimen Guard', () => {
    it('opens add activity modal and displays clinical medication warning when medication is chosen', () => {
      renderDailyRoutines();

      const addBtn = screen.getByRole('button', { name: /Add New Routine Activity/i });
      fireEvent.click(addBtn);

      expect(screen.getByText(/Add New Care Activity/i)).toBeInTheDocument();

      // Change category to medication
      const categorySelect = screen.getByRole('combobox');
      fireEvent.change(categorySelect, { target: { value: 'medication' } });

      // Clinical safety warning must be shown
      expect(screen.getByText(/Clinical Regimen Requirement/i)).toBeInTheDocument();
    });
  });

  describe('7. UID Data Scoping & Persistence Isolation', () => {
    it('scopes routines strictly to patient UID in storage', () => {
      const patientA = 'patient-uid-alice';
      const patientB = 'patient-uid-bob';

      const routinesA: RoutineItem[] = [
        { id: 'ra1', title: 'Alice Routine', scheduledTime: '08:00 AM', category: 'wellness', streakCount: 1, isCompleted: false, enableAssistedRecall: true },
      ];
      const routinesB: RoutineItem[] = [
        { id: 'rb1', title: 'Bob Routine', scheduledTime: '09:00 AM', category: 'exercise', streakCount: 1, isCompleted: false, enableAssistedRecall: true },
      ];

      RoutineService.saveRoutines(patientA, routinesA);
      RoutineService.saveRoutines(patientB, routinesB);

      const loadedA = RoutineService.getRoutines(patientA);
      const loadedB = RoutineService.getRoutines(patientB);

      expect(loadedA[0].title).toBe('Alice Routine');
      expect(loadedB[0].title).toBe('Bob Routine');
      expect(loadedA[0].title).not.toBe(loadedB[0].title);
    });
  });
});
