/**
 * SAKSHAM NEURO-CARE — PHASE 3: DAILY ROUTINE ASHA GUIDANCE TESTS
 * Verifies TASK-ROUTINE-01 through TASK-ROUTINE-03:
 * - Embedded Asha visual guidance in active routine step runner
 * - Voice instruction repeat and progressive step hints
 * - Strict physical completion rule (never auto-ticked on timer expiry)
 * - Caregiver routine review & adherence pattern summary in CaregiverDashboard
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import { GuidedTaskRunner } from '../features/routines/components/GuidedTaskRunner.js';
import { CaregiverDashboard } from '../pages/caregiver/CaregiverDashboard.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { CaregiverService } from '../features/caregiver/services/caregiverService.js';
import { SpeechService } from '../services/speechService.js';
import { AuthProvider } from '../context/AuthContext.js';
import { RoutineItem } from '../types/index.js';

describe('Phase 3: Daily Routine Guidance & Assisted Recall', () => {
  const patientId = 'test-patient-sunita';
  const mockRoutine: RoutineItem = {
    id: 'routine-morning-tea',
    title: 'Morning Cardamom Tea',
    description: 'Brew and enjoy a warm cup of cardamom tea peacefully.',
    scheduledTime: '08:30 AM',
    period: 'morning',
    category: 'activity',
    isCompleted: false,
    streakCount: 3,
    enableAssistedRecall: true,
    steps: [
      '1. Place tea cup and saucer steadily on the veranda table.',
      '2. Pour warm tea gently into the cup using both hands.',
      '3. Sit comfortably and sip slowly while looking at the garden.',
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(SpeechService, 'speak').mockImplementation(() => {});
    vi.spyOn(SpeechService, 'cancelSpeech').mockImplementation(() => {});
  });

  describe('Part A: Embedded Asha In-Task Guidance (TASK-ROUTINE-01)', () => {
    it('renders Asha companion guidance banner inside the active step card', () => {
      render(
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId={patientId}
        />
      );

      expect(screen.getByTestId('asha-in-task-guidance')).toBeInTheDocument();
      expect(screen.getByText(/^Asha(?:(?: AI)? Companion)?$/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 1 Guidance/i)).toBeInTheDocument();
      expect(screen.getByText(/Take all the comfortable time you need/i)).toBeInTheDocument();
    });

    it('updates Asha guidance subtitle as patient advances through steps', () => {
      render(
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId={patientId}
        />
      );

      expect(screen.getByText(/Step 1 Guidance/i)).toBeInTheDocument();

      const nextButton = screen.getByRole('button', { name: /Next Step/i });
      fireEvent.click(nextButton);

      expect(screen.getByText(/Step 2 Guidance/i)).toBeInTheDocument();
    });
  });

  describe('Part B: Repeat Instruction & Progressive Hints (TASK-ROUTINE-02)', () => {
    it('provides Repeat Instruction button that speaks the active step instruction', () => {
      render(
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId={patientId}
        />
      );

      const repeatBtn = screen.getByRole('button', { name: /Repeat Instruction/i });
      expect(repeatBtn).toBeInTheDocument();

      fireEvent.click(repeatBtn);
      expect(SpeechService.speak).toHaveBeenCalledWith(
        expect.stringContaining('Place tea cup and saucer'),
        expect.any(Function),
        expect.any(Function),
        expect.any(String)
      );
    });

    it('provides Give Hint button that speaks a gentle micro-action breakdown', () => {
      render(
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId={patientId}
        />
      );

      const hintBtn = screen.getByRole('button', { name: /Give Hint/i });
      expect(hintBtn).toBeInTheDocument();

      fireEvent.click(hintBtn);
      expect(SpeechService.speak).toHaveBeenCalled();
    });

    it('enforces strict physical completion: requires explicit confirmation and never auto-ticks', () => {
      const onFinishMock = vi.fn();
      render(
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={onFinishMock}
          defaultViewMode="single"
          patientId={patientId}
        />
      );

      // Finish button on final step
      const nextBtn = screen.getByRole('button', { name: /Next Step/i });
      fireEvent.click(nextBtn); // step 2
      fireEvent.click(nextBtn); // step 3

      const finishBtn = screen.getByRole('button', { name: /Finish Activity/i });
      fireEvent.click(finishBtn);

      // Does not immediately finish; requires confirmation modal physical press
      expect(screen.getByText(/Are you satisfied and ready to mark this routine activity completed/i)).toBeInTheDocument();
      expect(onFinishMock).not.toHaveBeenCalled();

      // Explicit physical confirmation button
      const confirmBtn = screen.getByRole('button', { name: /Yes, Complete!/i });
      fireEvent.click(confirmBtn);

      expect(onFinishMock).toHaveBeenCalledWith('routine-morning-tea');
    });

    it('supports 2-minute calming rest pause with gentle guidance to prevent fatigue', () => {
      render(
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId={patientId}
        />
      );

      const restBtn = screen.getByRole('button', { name: /Take a 2-Minute Rest/i });
      expect(restBtn).toBeInTheDocument();

      fireEvent.click(restBtn);

      expect(screen.getByTestId('calming-rest-banner')).toBeInTheDocument();
      expect(screen.getByText(/2-Minute Calming Rest/i)).toBeInTheDocument();
      expect(SpeechService.speak).toHaveBeenCalledWith(
        expect.stringContaining('peaceful two-minute rest'),
        expect.any(Function),
        expect.any(Function),
        expect.any(String)
      );

      const resumeBtn = screen.getByRole('button', { name: /Resume Now/i });
      fireEvent.click(resumeBtn);
      expect(screen.queryByTestId('calming-rest-banner')).not.toBeInTheDocument();
    });
  });

  describe('Part C: Caregiver Routine Review & Adherence Pattern (TASK-ROUTINE-03)', () => {
    it('renders routine adherence summary and period breakdown in CaregiverDashboard', async () => {
      // Seed routines
      vi.spyOn(CaregiverService, 'getConnectedPatient').mockResolvedValue({
        patientId,
        patientName: 'Sunita Sharma',
        relationshipStatus: 'active',
        permissions: {
          canReadCalendar: true,
          canCreateCalendarEvents: true,
          canEditCalendarEvents: true,
          canDeleteCalendarEvents: true,
        },
      });

      vi.spyOn(RoutineService, 'syncRoutinesFromFirestore').mockResolvedValue([
        {
          id: 'r1',
          title: 'Morning Cardamom Tea',
          description: 'Tea in veranda',
          scheduledTime: '08:00 AM',
          period: 'morning',
          category: 'hydration',
          isCompleted: true,
          completedAt: '08:15 AM',
          streakCount: 2,
          enableAssistedRecall: true,
        },
        {
          id: 'r2',
          title: 'Afternoon Walking Routine',
          description: 'Short garden stroll',
          scheduledTime: '04:00 PM',
          period: 'afternoon',
          category: 'exercise',
          isCompleted: false,
          streakCount: 0,
          enableAssistedRecall: false,
        },
      ]);

      vi.spyOn(RoutineService, 'syncHistoryFromFirestore').mockResolvedValue([]);

      render(
        <BrowserRouter>
          <AuthProvider>
            <CaregiverDashboard />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        const el = screen.getByTestId('caregiver-routine-adherence-summary');
        expect(el).toBeInTheDocument();
        expect(screen.getAllByText(/Routine Adherence & Review Summary/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/50% Completion Rate/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/1 of 2 Completed Today/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
