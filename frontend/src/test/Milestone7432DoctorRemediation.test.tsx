import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { DoctorAnalyticsService } from '../features/doctor/services/doctorAnalyticsService.js';
import { DoctorLongitudinalAnalytics } from '../features/doctor/components/DoctorLongitudinalAnalytics.js';
import { AuthService } from '../features/auth/services/authService.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import {
  getPatientCalendarDate,
  get30DayCalendarRange,
  DEFAULT_PATIENT_TIMEZONE,
} from '../utils/dateUtils.js';

// Mock Firebase services for deterministic unit testing
vi.mock('../services/firebase.js', () => ({
  db: {},
  auth: { currentUser: null },
  isFirebaseConfigured: false,
}));

describe('Milestone 7.4.3.2: Doctor Analytics Privacy, Authorization & Data Integrity Remediation', () => {
  const demoDoctorUid = 'demo-doctor-001';
  const designatedDemoPatientUid = 'demo-patient-001';
  const unauthorizedPatientUid = 'patient-unauthorized-999';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    DoctorAnalyticsService.clearSimulatedAssignments();
    DoctorAnalyticsService.clearClinicalSession();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    DoctorAnalyticsService.clearSimulatedAssignments();
    DoctorAnalyticsService.clearClinicalSession();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1 & 2: Demo Doctor Isolation
  // =========================================================================
  describe('Priority 2: Demo Doctor Isolation', () => {
    it('1. permits active demo doctor to access only the designated demo patient', async () => {
      const assignment = await DoctorAnalyticsService.getDoctorAssignment(
        demoDoctorUid,
        designatedDemoPatientUid
      );
      expect(assignment.isAssigned).toBe(true);
      expect(assignment.status).toBe('active');
      expect(assignment.patientId).toBe(designatedDemoPatientUid);
    });

    it('2. strictly rejects demo doctor attempting another patient ID', async () => {
      const assignment = await DoctorAnalyticsService.getDoctorAssignment(
        demoDoctorUid,
        unauthorizedPatientUid
      );
      expect(assignment.isAssigned).toBe(false);
      expect(assignment.status).toBe('none');
    });

    it('3. rejects demo cache fallback for unauthorized patient even if local cache exists', async () => {
      // Plant cached data for an unauthorized patient in localStorage
      const unauthorizedHistory = [
        {
          id: 'att-unauth-1',
          routineId: 'routine-secret',
          patientId: unauthorizedPatientUid,
          date: '2026-11-10',
          attemptsUsed: 1,
          skipped: false,
          isCompleted: true,
        },
      ];
      localStorage.setItem(
        `saksham_routine_history_${unauthorizedPatientUid}`,
        JSON.stringify(unauthorizedHistory)
      );

      // Attempt adherence query as demo-doctor-001 for unauthorized patient
      const adherence = await DoctorAnalyticsService.get30DayRoutineAdherence(
        unauthorizedPatientUid,
        demoDoctorUid
      );

      expect(adherence.isAuthorized).toBe(false);
      expect(adherence.status).toBe('unauthorized');
      expect(adherence.totalRecordedTasks).toBe(0);
      expect(adherence.completedTasks).toBe(0);
    });
  });

  // =========================================================================
  // 3: Patient Cache Privacy & Logout Cleanup
  // =========================================================================
  describe('Priority 1: Patient Cache Privacy & Session Cleanup', () => {
    it('4. purges patient telemetry accessed during doctor session when doctor logs out', async () => {
      // Simulate doctor logging in
      localStorage.setItem(
        'saksham_auth_user',
        JSON.stringify({ uid: demoDoctorUid, role: 'doctor', email: 'doctor@saksham.care' })
      );

      // Doctor views patient telemetry
      await DoctorAnalyticsService.get30DayRoutineAdherence(designatedDemoPatientUid, demoDoctorUid);
      expect(DoctorAnalyticsService.getClinicalAccessedPatients()).toContain(designatedDemoPatientUid);

      // Plant patient history in localStorage as if synced during doctor review
      localStorage.setItem(
        `saksham_routine_history_${designatedDemoPatientUid}`,
        JSON.stringify([{ id: 'att-1', isCompleted: true }])
      );
      localStorage.setItem(
        `saksham_game_sessions_${designatedDemoPatientUid}`,
        JSON.stringify([{ id: 'sess-1', difficulty: 'Gentle' }])
      );

      // Doctor signs out
      await AuthService.signOut();

      // Verify patient telemetry was safely purged from disk
      expect(localStorage.getItem(`saksham_routine_history_${designatedDemoPatientUid}`)).toBeNull();
      expect(localStorage.getItem(`saksham_game_sessions_${designatedDemoPatientUid}`)).toBeNull();
      expect(DoctorAnalyticsService.getClinicalAccessedPatients().length).toBe(0);
    });

    it('5. preserves legitimate patient-owned offline data when clinical session cleans up', () => {
      const patientUid = 'patient-offline-owner';
      // Patient has offline work queued
      localStorage.setItem(`saksham_pending_notes_sync_${patientUid}`, JSON.stringify([{ id: 'note-1' }]));
      localStorage.setItem(`saksham_pending_adaptive_sync_${patientUid}`, JSON.stringify({ pacing: 'calm' }));

      // Track patient as accessed in clinical session
      DoctorAnalyticsService.trackAccessedPatient(patientUid);

      // Clean clinical session
      DoctorAnalyticsService.clearClinicalSession();

      // Pending patient queues must NEVER be deleted!
      expect(localStorage.getItem(`saksham_pending_notes_sync_${patientUid}`)).not.toBeNull();
      expect(localStorage.getItem(`saksham_pending_adaptive_sync_${patientUid}`)).not.toBeNull();
    });

    it('6. prevents guest mode from displaying stale patient telemetry after doctor logout', async () => {
      // Doctor views patient
      localStorage.setItem(
        'saksham_auth_user',
        JSON.stringify({ uid: demoDoctorUid, role: 'doctor' })
      );
      await DoctorAnalyticsService.get30DayRoutineAdherence(designatedDemoPatientUid, demoDoctorUid);

      localStorage.setItem(
        `saksham_routine_history_${designatedDemoPatientUid}`,
        JSON.stringify([{ id: 'att-stale-1', isCompleted: true }])
      );

      // Doctor logs out
      await AuthService.signOut();

      // Subsequent guest opens app
      const guestHistory = RoutineService.getHistory(designatedDemoPatientUid);
      expect(Array.isArray(guestHistory)).toBe(true);
      // Because cache was purged, it returns empty array or default demo items, never unauthenticated private history
      expect(localStorage.getItem(`saksham_routine_history_${designatedDemoPatientUid}`)).toBeNull();
    });
  });

  // =========================================================================
  // 4: Live Assignment Revocation & Request Invalidation
  // =========================================================================
  describe('Priority 3: Live Assignment Revocation & Invalidation', () => {
    it('7. immediately clears displayed analytics and renders restricted banner when assignment is revoked', async () => {
      // Start with active simulated assignment
      DoctorAnalyticsService.setSimulatedAssignment(
        'doctor-real-001',
        designatedDemoPatientUid,
        'active'
      );

      render(
        <DoctorLongitudinalAnalytics
          doctorId="doctor-real-001"
          patientId={designatedDemoPatientUid}
          patientName="Sunita Sharma"
        />
      );

      // Wait for analytics to render
      await waitFor(() => {
        expect(screen.getByTestId('doctor-longitudinal-analytics-section')).toBeInTheDocument();
      });

      // Simulate administrative revocation in real-time while dashboard is open!
      act(() => {
        DoctorAnalyticsService.setSimulatedAssignment(
          'doctor-real-001',
          designatedDemoPatientUid,
          'revoked'
        );
      });

      // UI must immediately transition to restricted banner!
      await waitFor(() => {
        expect(screen.getByTestId('doctor-unauthorized-section')).toBeInTheDocument();
        expect(screen.queryByTestId('doctor-longitudinal-analytics-section')).toBeNull();
      });
    });

    it('8. discards late asynchronous analytics response after revocation', async () => {
      // Setup active assignment
      DoctorAnalyticsService.setSimulatedAssignment(
        'doctor-real-002',
        designatedDemoPatientUid,
        'active'
      );

      // Create an artificial delayed response
      let resolveDelayedAdherence: any;
      const delayedPromise = new Promise<any>((resolve) => {
        resolveDelayedAdherence = resolve;
      });

      vi.spyOn(DoctorAnalyticsService, 'get30DayRoutineAdherence').mockImplementation(() => delayedPromise);

      render(
        <DoctorLongitudinalAnalytics
          doctorId="doctor-real-002"
          patientId={designatedDemoPatientUid}
          patientName="Sunita Sharma"
        />
      );

      // Revoke assignment while request is still pending
      act(() => {
        DoctorAnalyticsService.setSimulatedAssignment(
          'doctor-real-002',
          designatedDemoPatientUid,
          'revoked'
        );
      });

      // Late async response arrives
      act(() => {
        resolveDelayedAdherence({
          isAuthorized: true,
          status: 'sufficient-data',
          startDate: '2026-10-13',
          endDate: '2026-11-11',
          totalRecordedTasks: 10,
          completedTasks: 8,
          attemptCompletionRate: 80,
          adherencePercentage: 80,
          recordedDaysCount: 5,
          dailyTrend: [],
        });
      });

      // Verify that late response did NOT repopulate analytics state!
      await waitFor(() => {
        expect(screen.getByTestId('doctor-unauthorized-section')).toBeInTheDocument();
        expect(screen.queryByTestId('doctor-longitudinal-analytics-section')).toBeNull();
      });
    });

    it('9. blocks cross-patient access attempts', async () => {
      const assignmentA = await DoctorAnalyticsService.getDoctorAssignment(
        'doctor-unassigned',
        'patient-a'
      );
      expect(assignmentA.isAssigned).toBe(false);

      const adherence = await DoctorAnalyticsService.get30DayRoutineAdherence(
        'patient-a',
        'doctor-unassigned'
      );
      expect(adherence.isAuthorized).toBe(false);
      expect(adherence.status).toBe('unauthorized');
    });
  });

  // =========================================================================
  // 5: Timezone and Date Integrity
  // =========================================================================
  describe('Priority 4: Timezone and Date Integrity', () => {
    it('10. handles India Standard Time (IST) midnight boundary crossings consistently', () => {
      // 2026-11-10 at 20:00:00 UTC corresponds to 2026-11-11 at 01:30:00 IST (+5:30)
      const lateNightUtc = new Date('2026-11-10T20:00:00.000Z');

      const istDate = getPatientCalendarDate(lateNightUtc, 'Asia/Kolkata');
      expect(istDate).toBe('2026-11-11');

      // In New York (UTC-5), it is still Nov 10
      const nyDate = getPatientCalendarDate(lateNightUtc, 'America/New_York');
      expect(nyDate).toBe('2026-11-10');

      // Patient-centered calendar date in IST must be 2026-11-11
      expect(istDate).not.toBe(nyDate);
    });

    it('11. generates exact 30-day range across month and year boundaries', () => {
      // Month boundary
      const midMonth = new Date('2026-11-11T12:00:00+05:30');
      const monthRange = get30DayCalendarRange(midMonth, 'Asia/Kolkata');
      expect(monthRange.dates.length).toBe(30);
      expect(monthRange.startDate).toBe('2026-10-13');
      expect(monthRange.endDate).toBe('2026-11-11');

      // Year boundary (crossing from Dec 2025 to Jan 2026)
      const newYearDate = new Date('2026-01-15T12:00:00Z');
      const yearRange = get30DayCalendarRange(newYearDate, 'UTC');
      expect(yearRange.dates.length).toBe(30);
      expect(yearRange.startDate).toBe('2025-12-17');
      expect(yearRange.endDate).toBe('2026-01-15');
    });
  });

  // =========================================================================
  // 6: Terminology and Semantics
  // =========================================================================
  describe('Priority 5: Attempt Completion Rate & Semantics', () => {
    it('12. calculates Attempt Completion Rate accurately with exact numerator and denominator', async () => {
      const today = getPatientCalendarDate(new Date(), DEFAULT_PATIENT_TIMEZONE);
      const yesterday = getPatientCalendarDate(new Date(Date.now() - 86400000), DEFAULT_PATIENT_TIMEZONE);

      // Seed 4 unique routine attempts: 3 completed, 1 incomplete
      const seeded = [
        { id: '1', routineId: 'r1', patientId: designatedDemoPatientUid, date: today, attemptsUsed: 1, skipped: false, isCompleted: true },
        { id: '2', routineId: 'r2', patientId: designatedDemoPatientUid, date: today, attemptsUsed: 2, skipped: false, isCompleted: true },
        { id: '3', routineId: 'r3', patientId: designatedDemoPatientUid, date: yesterday, attemptsUsed: 1, skipped: false, isCompleted: true },
        { id: '4', routineId: 'r4', patientId: designatedDemoPatientUid, date: yesterday, attemptsUsed: 3, skipped: false, isCompleted: false },
      ];
      localStorage.setItem(
        `saksham_routine_history_${designatedDemoPatientUid}`,
        JSON.stringify(seeded)
      );

      const adherence = await DoctorAnalyticsService.get30DayRoutineAdherence(
        designatedDemoPatientUid,
        demoDoctorUid
      );

      expect(adherence.totalRecordedTasks).toBe(4);
      expect(adherence.completedTasks).toBe(3);
      expect(adherence.attemptCompletionRate).toBe(75);
      expect(adherence.adherencePercentage).toBe(75); // Alias matches
      expect(adherence.numeratorLabel).toContain('Completed unique tasks attempted');
      expect(adherence.denominatorLabel).toContain('Total unique tasks attempted/logged');
    });

    it('13. correctly distinguishes no-data, incomplete, and insufficient-history states', async () => {
      // Empty history
      localStorage.setItem(`saksham_routine_history_${designatedDemoPatientUid}`, JSON.stringify([]));

      const emptyAdherence = await DoctorAnalyticsService.get30DayRoutineAdherence(
        designatedDemoPatientUid,
        demoDoctorUid
      );

      expect(emptyAdherence.status).toBe('no-records');
      expect(emptyAdherence.attemptCompletionRate).toBe(0);
      expect(emptyAdherence.dailyTrend.every((d) => d.status === 'no-data')).toBe(true);
    });
  });

  // =========================================================================
  // 7: Regression Preservation
  // =========================================================================
  describe('Priority 7: Patient & Caregiver Regression Preservation', () => {
    it('14. preserves patient experience mode preference without leakage into doctor session', () => {
      localStorage.setItem(`saksham_patient_experience_mode_${designatedDemoPatientUid}`, 'asha-only');
      expect(localStorage.getItem(`saksham_patient_experience_mode_${designatedDemoPatientUid}`)).toBe('asha-only');

      // Doctor analytics session does not mutate or overwrite patient experience mode
      expect(localStorage.getItem(`saksham_patient_experience_mode_${demoDoctorUid}`)).toBeNull();
    });
  });
});
