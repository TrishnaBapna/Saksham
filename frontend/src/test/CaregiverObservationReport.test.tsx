/**
 * SAKSHAM NEURO-CARE — PHASE 6: CAREGIVER OBSERVATION REPORT TESTS
 * Verifies TASK-CARE-01 and TASK-CARE-02:
 * - Evidence-based longitudinal observation synthesis
 * - Strict separation of objective observed facts vs supportive suggestions
 * - Clinical medical disclaimer prominence
 * - Quantitative metrics cards (adherence, assisted recall index, reaction time)
 * - Integration within CaregiverDashboard
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import {
  CaregiverReportService,
  CLINICAL_MEDICAL_DISCLAIMER,
} from '../features/caregiver/services/caregiverReportService.js';
import { CaregiverObservationReport } from '../features/caregiver/components/CaregiverObservationReport.js';
import { CaregiverDashboard } from '../pages/caregiver/CaregiverDashboard.js';
import { CaregiverService } from '../features/caregiver/services/caregiverService.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { AuthProvider } from '../context/AuthContext.js';
import { RoutineItem, RoutineAttemptRecord } from '../types/index.js';

describe('Phase 6: Caregiver Intelligence & Longitudinal Observation', () => {
  const patientId = 'test-patient-sunita';
  const patientName = 'Sunita Sharma';

  const mockRoutines: RoutineItem[] = [
    {
      id: 'r1',
      title: 'Morning Cardamom Tea',
      description: 'Tea in veranda',
      scheduledTime: '08:00 AM',
      period: 'morning',
      category: 'hydration',
      isCompleted: true,
      streakCount: 3,
      enableAssistedRecall: true,
    },
    {
      id: 'r2',
      title: 'Afternoon Walking Stroll',
      description: 'Garden walk',
      scheduledTime: '04:00 PM',
      period: 'afternoon',
      category: 'exercise',
      isCompleted: false,
      streakCount: 0,
      enableAssistedRecall: true,
    },
    {
      id: 'r3',
      title: 'Evening Card Game',
      description: 'Pattern matching game',
      scheduledTime: '06:00 PM',
      period: 'evening',
      category: 'activity',
      isCompleted: true,
      streakCount: 2,
      enableAssistedRecall: false,
    },
  ];

  const mockHistory: RoutineAttemptRecord[] = [
    {
      id: 'hist-1',
      routineId: 'r1',
      date: new Date().toISOString().split('T')[0],
      attemptsUsed: 1,
      completedAt: '08:15 AM',
      isCompleted: true,
      skipped: false,
    },
    {
      id: 'hist-2',
      routineId: 'r2',
      date: new Date().toISOString().split('T')[0],
      attemptsUsed: 3,
      completedAt: '04:30 PM',
      isCompleted: true,
      skipped: false,
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Part A: Evidence-Based Report Service (TASK-CARE-01)', () => {
    it('synthesizes routine adherence and assisted recall cue distribution', () => {
      const report = CaregiverReportService.generateWeeklyReport(
        patientId,
        patientName,
        mockRoutines,
        mockHistory
      );

      expect(report.patientId).toBe(patientId);
      expect(report.patientName).toBe(patientName);
      expect(report.routineAdherence.totalScheduled).toBe(3);
      expect(report.routineAdherence.totalCompleted).toBe(2);
      expect(report.routineAdherence.adherencePercent).toBe(67);
      expect(report.routineAdherence.missedRoutines).toContain('Afternoon Walking Stroll');

      // Assisted recall cue metrics
      expect(report.assistedRecallSummary.totalCuedAttempts).toBe(2);
      expect(report.assistedRecallSummary.level1Count).toBe(1);
      expect(report.assistedRecallSummary.level3Count).toBe(1);
    });

    it('enforces mandatory clinical medical disclaimer', () => {
      const report = CaregiverReportService.generateWeeklyReport(
        patientId,
        patientName,
        mockRoutines,
        mockHistory
      );

      expect(report.medicalDisclaimer).toBe(CLINICAL_MEDICAL_DISCLAIMER);
      expect(report.medicalDisclaimer).toContain('observational activity log');
      expect(report.medicalDisclaimer).toContain('not a clinical diagnostic assessment');
    });

    it('strictly separates objective observed facts from supportive suggestions', () => {
      const report = CaregiverReportService.generateWeeklyReport(
        patientId,
        patientName,
        mockRoutines,
        mockHistory
      );

      expect(report.clinicalObservations.length).toBeGreaterThan(0);
      expect(report.caregiverSuggestions.length).toBeGreaterThan(0);

      // Objective observations contain concrete metrics
      const mentionsMetrics = report.clinicalObservations.some((o) =>
        o.includes('67% completion rate') || o.includes('Assisted recall was utilized')
      );
      expect(mentionsMetrics).toBe(true);

      // Caregiver suggestions offer environmental, pacing, or lifestyle scaffolding
      const mentionsPacing = report.caregiverSuggestions.some((s) =>
        s.includes('spacing routine activities') || s.includes('Asha companion')
      );
      expect(mentionsPacing).toBe(true);
    });
  });

  describe('Part B: Weekly Observation Report UI (TASK-CARE-02)', () => {
    it('renders CaregiverObservationReport component with disclaimer and 4 metric cards', () => {
      render(
        <CaregiverObservationReport
          patientId={patientId}
          patientName={patientName}
          routines={mockRoutines}
          history={mockHistory}
        />
      );

      expect(screen.getByTestId('caregiver-observation-report')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Weekly Observation Report/i })).toBeInTheDocument();
      expect(screen.getByTestId('clinical-medical-disclaimer')).toBeInTheDocument();
      expect(screen.getAllByText(/67%/i).length).toBeGreaterThanOrEqual(1); // Routine Adherence
      expect(screen.getByText(/Objective Observed Data/i)).toBeInTheDocument();
      expect(screen.getByText(/Supportive Caregiver Suggestions/i)).toBeInTheDocument();
    });

    it('triggers window.print when Print / Export button is clicked', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      render(
        <CaregiverObservationReport
          patientId={patientId}
          patientName={patientName}
          routines={mockRoutines}
          history={mockHistory}
        />
      );

      const printBtn = screen.getByRole('button', { name: /Print or export observation report/i });
      fireEvent.click(printBtn);

      expect(printSpy).toHaveBeenCalled();
    });

    it('renders observation report inside CaregiverDashboard for verified caregiver', async () => {
      vi.spyOn(CaregiverService, 'getConnectedPatient').mockResolvedValue({
        patientId,
        patientName,
        relationshipStatus: 'active',
        permissions: {
          canReadCalendar: true,
          canCreateCalendarEvents: true,
          canEditCalendarEvents: true,
          canDeleteCalendarEvents: true,
        },
      });

      vi.spyOn(RoutineService, 'syncRoutinesFromFirestore').mockResolvedValue(mockRoutines);
      vi.spyOn(RoutineService, 'syncHistoryFromFirestore').mockResolvedValue(mockHistory);

      render(
        <BrowserRouter>
          <AuthProvider>
            <CaregiverDashboard />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('caregiver-observation-report')).toBeInTheDocument();
        expect(screen.getByTestId('clinical-medical-disclaimer')).toBeInTheDocument();
      });
    });
  });
});
