/**
 * SAKSHAM NEURO-CARE — STAGE 3 PHASE D AUTOMATED TEST SUITE
 * Longitudinal Doctor Analytics & Clinical Appointment Summary Export
 * 100% Firebase Spark Free Plan compliant — strictly non-diagnostic.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LongitudinalReportService,
  MANDATORY_CLINICAL_DISCLAIMER,
} from '../features/doctor/services/longitudinalReportService.js';
import { PatientTimelineView } from '../features/doctor/components/PatientTimelineView.js';
import { AppointmentSummaryModal } from '../features/doctor/components/AppointmentSummaryModal.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { GamesService } from '../features/games/services/gamesService.js';
import { AdaptiveSupportService } from '../features/adaptive/services/adaptiveSupportService.js';
import { DoctorAnalyticsService } from '../features/doctor/services/doctorAnalyticsService.js';
import { CaregiverService } from '../features/caregiver/services/caregiverService.js';

describe('Stage 3 Phase D: Longitudinal Doctor Analytics & Appointment Summary', () => {
  const patientId = 'demo-patient-001';
  const patientName = 'Sunita Sharma';
  const doctorId = 'demo-doctor-001';
  const caregiverId = 'demo-caregiver-001';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    DoctorAnalyticsService.clearSimulatedAssignments();
    AdaptiveSupportService.clearCache();

    // Setup active assignments
    DoctorAnalyticsService.setSimulatedAssignment(doctorId, patientId, 'active');

    // Mock date to 2026-11-17
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-11-17T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    CaregiverService.clearSimulatedRelationships();
  });

  describe('Part 1: Longitudinal Event Aggregation & Source Attribution', () => {
    it('aggregates routines, games, adaptive events, and caregiver notes with accurate source attribution', async () => {
      // 1. Seed routine history
      const routineRecord = {
        date: '2026-11-15',
        routineId: 'routine-morning-tea',
        attemptsUsed: 2,
        completed: true,
        timestamp: '2026-11-15T08:30:00Z',
      };
      localStorage.setItem(`saksham_routine_history_${patientId}`, JSON.stringify([routineRecord]));
      localStorage.setItem(
        `saksham_routines_${patientId}`,
        JSON.stringify([
          {
            id: 'routine-morning-tea',
            title: 'Morning Cardamom Tea & Biscuits',
            scheduledTime: '08:30 AM',
            period: 'morning',
            category: 'nutrition',
            isCompleted: true,
          },
        ])
      );

      // 2. Seed cognitive game session
      const gameSession = {
        id: 'session-game-001',
        patientId,
        gameId: 'game-matching',
        gameTitle: 'Peaceful Nature Card Matching',
        category: 'memory' as const,
        difficulty: 'Gentle' as const,
        date: '2026-11-16',
        durationSeconds: 145,
        completed: true,
        patientFeedback: 'Relaxing' as const,
        hintsUsed: 1,
        pauseCount: 0,
        completedAt: '2026-11-16T11:00:00Z',
      };
      localStorage.setItem(GamesService.getHistoryKey(patientId), JSON.stringify([gameSession]));

      // 3. Seed adaptive proposal with patient choice
      const proposal = {
        id: 'prop-001',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        domain: 'game_pacing' as const,
        previousConfig: { pacing: 'balanced' },
        proposedConfig: { pacing: 'calm' },
        rationale: 'Patient showed signs of visual fatigue during faster pacing.',
        calmExplanation: { en: 'Calmer pace', hi: 'धीमी गति', mr: 'शांत गती' },
        evidenceSummary: {
          windowDays: 7,
          totalSessionsObserved: 3,
          struggleCount: 2,
          comfortableCount: 1,
          assistanceRequestCount: 2,
          consecutiveCount: 2,
        },
        status: 'accepted' as const,
        isClinicianPrescribed: false,
        createdAt: '2026-11-14T10:00:00Z',
        patientConsent: 'accepted' as const,
      };
      localStorage.setItem(`saksham_adaptive_proposals_${patientId}`, JSON.stringify([proposal]));

      // 4. Seed caregiver observation note
      await LongitudinalReportService.recordCaregiverNote(patientId, {
        patientId,
        authorName: 'Aarav Sharma',
        authorId: caregiverId,
        date: '2026-11-15',
        category: 'routine',
        content: 'Sunita was very cheerful during afternoon routine after a brief garden walk.',
      });

      // Fetch aggregated timeline events for past 7 days
      const events = await LongitudinalReportService.getTimelineEvents(
        patientId,
        '2026-11-10',
        '2026-11-17'
      );

      expect(events.length).toBeGreaterThanOrEqual(4);

      // Verify Routine Attribution
      const routineEvent = events.find((e) => e.category === 'routine');
      expect(routineEvent).toBeDefined();
      expect(routineEvent?.source).toBe('patient-reported');
      expect(routineEvent?.metadata?.attemptsUsed).toBe(2);

      // Verify Game Attribution
      const gameEvent = events.find((e) => e.category === 'game');
      expect(gameEvent).toBeDefined();
      expect(gameEvent?.source).toBe('patient-reported'); // Because patient feedback was provided
      expect(gameEvent?.metadata?.hintsUsed).toBe(1);

      // Verify Adaptive Attribution
      const adaptiveEvent = events.find((e) => e.category === 'adaptive');
      expect(adaptiveEvent).toBeDefined();
      expect(adaptiveEvent?.source).toBe('patient-reported'); // Patient accepted
      expect(adaptiveEvent?.metadata?.patientConsent).toBe('accepted');

      // Verify Caregiver Note Attribution
      const noteEvent = events.find((e) => e.category === 'caregiver_note');
      expect(noteEvent).toBeDefined();
      expect(noteEvent?.source).toBe('caregiver-reported');
      expect(noteEvent?.description).toContain('cheerful during afternoon routine');
    });

    it('differentiates completed vs interrupted sessions and records hint/pause counts', async () => {
      const interruptedSession = {
        id: 'session-interrupted-002',
        patientId,
        gameId: 'game-objects-recall',
        gameTitle: 'Warm Object Recall',
        category: 'memory' as const,
        difficulty: 'Moderate' as const,
        date: '2026-11-16',
        durationSeconds: 70,
        completed: false,
        isInterrupted: true,
        hintsUsed: 3,
        pauseCount: 2,
        completedAt: '2026-11-16T15:00:00Z',
      };
      localStorage.setItem(GamesService.getHistoryKey(patientId), JSON.stringify([interruptedSession]));

      const events = await LongitudinalReportService.getTimelineEvents(
        patientId,
        '2026-11-10',
        '2026-11-17'
      );

      const gameEvent = events.find((e) => e.id.includes('session-interrupted-002'));
      expect(gameEvent).toBeDefined();
      expect(gameEvent?.status).toBe('interrupted');
      expect(gameEvent?.isInterrupted).toBe(true);
      expect(gameEvent?.source).toBe('system-recorded');
      expect(gameEvent?.metadata?.hintsUsed).toBe(3);
      expect(gameEvent?.metadata?.pauseCount).toBe(2);
      expect(gameEvent?.description).toContain('paused or incomplete');
    });
  });

  describe('Part 2: Metrics Calculation, Missing Data & Insufficient Data Handling', () => {
    it('accurately computes metrics without interpreting missing days as task failure', async () => {
      // Clear routine cache and games cache
      localStorage.setItem(RoutineService.getStorageKey(patientId), JSON.stringify([]));
      localStorage.setItem(GamesService.getHistoryKey(patientId), JSON.stringify([]));

      // Seed 2 routine records on 2 days, leaving other 5 days empty
      const history = [
        { date: '2026-11-14', routineId: 'r1', attemptsUsed: 1, completed: true },
        { date: '2026-11-16', routineId: 'r2', attemptsUsed: 2, completed: true },
      ];
      localStorage.setItem(RoutineService.getHistoryKey(patientId), JSON.stringify(history));

      const metrics = await LongitudinalReportService.calculateMetrics(
        patientId,
        '2026-11-10',
        '2026-11-17',
        'Past 7 Days'
      );

      // Completed is 2 of 2 recorded tasks -> 100% completion rate for recorded tasks
      expect(metrics.routineParticipation.totalScheduled).toBe(2);
      expect(metrics.routineParticipation.completedCount).toBe(2);
      expect(metrics.routineParticipation.completionRatePercent).toBe(100);
      expect(metrics.routineParticipation.incompleteCount).toBe(0);

      // Verify explicit data limitations note
      expect(metrics.dataLimitations.some((d) => d.includes('treated as unrecorded, not task failures'))).toBe(true);
      expect(metrics.hasSufficientData).toBe(true); // Total events >= 2
    });

    it('flags insufficient data when fewer than 2 data points exist in window', async () => {
      // Clear routine cache and games cache
      localStorage.setItem(RoutineService.getStorageKey(patientId), JSON.stringify([]));
      localStorage.setItem(GamesService.getHistoryKey(patientId), JSON.stringify([]));

      // 1 single record in entire period
      const history = [
        { date: '2026-11-16', routineId: 'r1', attemptsUsed: 1, completed: true },
      ];
      localStorage.setItem(RoutineService.getHistoryKey(patientId), JSON.stringify(history));

      const metrics = await LongitudinalReportService.calculateMetrics(
        patientId,
        '2026-11-10',
        '2026-11-17',
        'Past 7 Days'
      );

      expect(metrics.hasSufficientData).toBe(false);
      expect(metrics.dataLimitations.some((d) => d.includes('fewer than 2 records found'))).toBe(true);
    });
  });

  describe('Part 3: Clinical Appointment Summary Generation & Guardrails', () => {
    it('generates an appointment summary with caregiver questions and mandatory non-diagnostic disclaimer', async () => {
      const history = [
        { date: '2026-11-14', routineId: 'r1', attemptsUsed: 1, completed: true },
        { date: '2026-11-16', routineId: 'r2', attemptsUsed: 2, completed: true },
      ];
      localStorage.setItem(`saksham_routine_history_${patientId}`, JSON.stringify(history));

      const caregiverQuestions = [
        'Does the patient seem more comfortable with smaller steps or familiar routines?',
        'Should routine timing be adjusted for afternoon fatigue?',
      ];

      const summary = await LongitudinalReportService.generateAppointmentSummary(
        patientId,
        patientName,
        {
          startDate: '2026-11-10',
          endDate: '2026-11-17',
          label: 'Past 7 Days',
          authorId: caregiverId,
          authorName: 'Aarav Sharma',
          authorRole: 'caregiver',
          caregiverQuestions,
        }
      );

      expect(summary.patientId).toBe(patientId);
      expect(summary.patientName).toBe(patientName);
      expect(summary.caregiverQuestions).toEqual(caregiverQuestions);

      // Verify mandatory disclaimer
      expect(summary.disclaimer).toBe(MANDATORY_CLINICAL_DISCLAIMER);
      expect(summary.disclaimer).toContain('NOT constitute a clinical diagnosis');
      expect(summary.disclaimer).toContain('not replace professional medical judgment');

      // Strictly verify absence of diagnostic claims or staging
      const summaryString = JSON.stringify(summary).toLowerCase();
      expect(summaryString).not.toContain('stage 1');
      expect(summaryString).not.toContain('stage 2');
      expect(summaryString).not.toContain('stage 3');
      expect(summaryString).not.toContain('mild cognitive impairment diagnosis');
      expect(summaryString).not.toContain('disease deterioration');
      expect(summaryString).not.toContain('dementia progression');

      // Save and retrieve
      await LongitudinalReportService.saveAppointmentSummary(summary);
      const stored = LongitudinalReportService.getStoredAppointmentSummaries(patientId);
      expect(stored.length).toBeGreaterThanOrEqual(1);
      expect(stored[0].id).toBe(summary.id);
    });

    it('respects category exclusion when specified', async () => {
      // Seed routine and game
      localStorage.setItem(
        `saksham_routine_history_${patientId}`,
        JSON.stringify([{ date: '2026-11-15', routineId: 'r1', attemptsUsed: 1, completed: true }])
      );
      localStorage.setItem(
        `saksham_game_history_${patientId}`,
        JSON.stringify([
          {
            id: 'g1',
            patientId,
            gameId: 'game-matching',
            gameTitle: 'Card Matching',
            category: 'memory',
            difficulty: 'Gentle',
            date: '2026-11-15',
            durationSeconds: 120,
            completed: true,
          },
        ])
      );

      // Request with ONLY 'routines' category
      const summary = await LongitudinalReportService.generateAppointmentSummary(
        patientId,
        patientName,
        {
          startDate: '2026-11-10',
          endDate: '2026-11-17',
          authorId: doctorId,
          authorName: 'Dr. Raman Verma',
          authorRole: 'doctor',
          includedCategories: ['routines'],
        }
      );

      expect(summary.includedCategories).toEqual(['routines']);
      expect(summary.timeline.every((e) => e.category === 'routine')).toBe(true);
      expect(summary.timeline.some((e) => e.category === 'game')).toBe(false);
    });
  });

  describe('Part 4: UI Component Verification — PatientTimelineView', () => {
    it('renders timeline events and displays source pills and filter buttons', async () => {
      const routineRecord = {
        date: '2026-11-16',
        routineId: 'routine-morning-tea',
        attemptsUsed: 1,
        completed: true,
      };
      localStorage.setItem(`saksham_routine_history_${patientId}`, JSON.stringify([routineRecord]));

      render(
        <PatientTimelineView
          patientId={patientId}
          patientName={patientName}
          isAuthorized={true}
        />
      );

      // Header
      expect(await screen.findByText('Longitudinal Activity & Support Timeline')).toBeInTheDocument();

      // Check period buttons
      expect(screen.getByTestId('timeline-period-7d')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-period-30d')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-period-custom')).toBeInTheDocument();

      // Filter buttons
      expect(screen.getByTestId('filter-routines')).toBeInTheDocument();
      expect(screen.getByTestId('filter-games')).toBeInTheDocument();
      expect(screen.getByTestId('filter-adaptive')).toBeInTheDocument();
      expect(screen.getByTestId('filter-notes')).toBeInTheDocument();
    });

    it('displays unauthorized notice when not authorized', () => {
      render(
        <PatientTimelineView
          patientId={patientId}
          patientName={patientName}
          isAuthorized={false}
        />
      );

      expect(screen.getByTestId('timeline-unauthorized-banner')).toBeInTheDocument();
    });
  });

  describe('Part 5: UI Component Verification — AppointmentSummaryModal', () => {
    it('renders preview with non-diagnostic disclaimer and privacy exclusion notice', async () => {
      const history = [
        { date: '2026-11-14', routineId: 'r1', attemptsUsed: 1, completed: true },
        { date: '2026-11-16', routineId: 'r2', attemptsUsed: 2, completed: true },
      ];
      localStorage.setItem(`saksham_routine_history_${patientId}`, JSON.stringify(history));

      render(
        <AppointmentSummaryModal
          isOpen={true}
          onClose={vi.fn()}
          patientId={patientId}
          patientName={patientName}
          authorId={doctorId}
          authorName="Dr. Raman Verma"
          authorRole="doctor"
        />
      );

      // Document title
      expect(await screen.findByText(/Clinical Appointment Brief & Longitudinal Summary/i)).toBeInTheDocument();

      // Check printable preview sheet
      expect(screen.getByTestId('printable-appointment-brief')).toBeInTheDocument();

      // Check disclaimer box
      const disclaimerBox = screen.getByTestId('clinical-disclaimer-box');
      expect(disclaimerBox).toBeInTheDocument();
      expect(disclaimerBox).toHaveTextContent(/Mandatory Non-Diagnostic Disclaimer/i);
      expect(disclaimerBox).toHaveTextContent(/NOT constitute a clinical diagnosis/i);

      // Check privacy guardrail notice
      const privacyBox = screen.getByTestId('privacy-guardrail-notice');
      expect(privacyBox).toBeInTheDocument();
      expect(privacyBox).toHaveTextContent(/Personal photographs, Loved Ones contact information.*excluded/i);
    });

    it('allows caregivers to customize questions and add discussion prompts', async () => {
      render(
        <AppointmentSummaryModal
          isOpen={true}
          onClose={vi.fn()}
          patientId={patientId}
          patientName={patientName}
          authorId={caregiverId}
          authorName="Aarav Sharma"
          authorRole="caregiver"
        />
      );

      // Switch to customize tab
      const customizeTab = await screen.findByTestId('tab-customize-brief');
      fireEvent.click(customizeTab);

      // Add a custom question
      const input = screen.getByTestId('input-appointment-question');
      const addBtn = screen.getByTestId('btn-add-question');

      fireEvent.change(input, {
        target: { value: 'Is the afternoon restlessness related to tea timing?' },
      });
      fireEvent.click(addBtn);

      expect(screen.getByText(/Is the afternoon restlessness related to tea timing\?/i)).toBeInTheDocument();
    });

    it('invokes window.print upon clicking print button', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      render(
        <AppointmentSummaryModal
          isOpen={true}
          onClose={vi.fn()}
          patientId={patientId}
          patientName={patientName}
          authorId={doctorId}
          authorName="Dr. Raman Verma"
          authorRole="doctor"
        />
      );

      const printBtn = await screen.findByTestId('print-brief-action');
      await waitFor(() => expect(printBtn).not.toBeDisabled());
      fireEvent.click(printBtn);

      await waitFor(() => expect(printSpy).toHaveBeenCalled());
      printSpy.mockRestore();
    });
  });

  describe('Part 6: Privacy & Authorization Guard Verification', () => {
    it('verifies access: authorized doctor accepted, unassigned doctor rejected', async () => {
      // 1. Assigned doctor
      const authorizedRes = await LongitudinalReportService.verifyAccess(
        patientId,
        doctorId,
        'doctor'
      );
      expect(authorizedRes.isAuthorized).toBe(true);

      // 2. Unassigned doctor
      const unassignedRes = await LongitudinalReportService.verifyAccess(
        patientId,
        'doctor-unassigned-999',
        'doctor'
      );
      expect(unassignedRes.isAuthorized).toBe(false);
      expect(unassignedRes.message).toContain('Doctor is not actively assigned');
    });

    it('verifies access: connected caregiver accepted, unlinked caregiver rejected', async () => {
      // Setup caregiver relationship
      CaregiverService.setSimulatedRelationship(caregiverId, patientId, 'active');

      const connectedRes = await LongitudinalReportService.verifyAccess(
        patientId,
        caregiverId,
        'caregiver'
      );
      expect(connectedRes.isAuthorized).toBe(true);

      // Unlinked caregiver
      CaregiverService.setSimulatedRelationship('caregiver-stranger-999', patientId, 'none');
      const unlinkedRes = await LongitudinalReportService.verifyAccess(
        patientId,
        'caregiver-stranger-999',
        'caregiver'
      );
      expect(unlinkedRes.isAuthorized).toBe(false);
      expect(unlinkedRes.message).toContain('No active care link established');
    });
  });
});
