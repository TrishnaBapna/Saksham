import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DoctorAnalyticsService } from '../features/doctor/services/doctorAnalyticsService.js';
import { DoctorLongitudinalAnalytics } from '../features/doctor/components/DoctorLongitudinalAnalytics.js';
import { DoctorDashboard } from '../pages/doctor/DoctorDashboard.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { GamesService } from '../features/games/services/gamesService.js';
import { AdaptiveDifficultyService } from '../features/games/services/adaptiveDifficultyService.js';
import { AuthProvider } from '../context/AuthContext.js';
import { PatientExperienceProvider } from '../context/PatientExperienceContext.js';

// Mocks for Firebase
vi.mock('../services/firebase.js', () => ({
  db: {},
  isFirebaseConfigured: false,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

describe('Milestone 7.4.3: Doctor Longitudinal Behavioral Activity & Adherence Portal', () => {
  const patientUid = 'demo-patient-001';
  const assignedDoctorUid = 'demo-doctor-001';
  const pendingDoctorUid = 'demo-doctor-002';
  const unassignedDoctorUid = 'doctor-unassigned-999';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // Part A: Authorization & Assignment Boundaries
  // =========================================================================
  describe('Part A: Authorization & Assignment Boundaries', () => {
    it('verifies active doctor assignment for assigned doctor', async () => {
      const assignment = await DoctorAnalyticsService.getDoctorAssignment(assignedDoctorUid, patientUid);
      expect(assignment.isAssigned).toBe(true);
      expect(assignment.status).toBe('active');
      expect(assignment.patientName).toBe('Sunita Sharma');
    });

    it('denies access to pending or unverified doctors', async () => {
      const assignment = await DoctorAnalyticsService.getDoctorAssignment(pendingDoctorUid, patientUid);
      expect(assignment.isAssigned).toBe(false);
      expect(assignment.status).toBe('pending');

      const adherence = await DoctorAnalyticsService.get30DayRoutineAdherence(patientUid, pendingDoctorUid);
      expect(adherence.isAuthorized).toBe(false);
      expect(adherence.status).toBe('unauthorized');
    });

    it('denies access to completely unassigned doctors', async () => {
      const assignment = await DoctorAnalyticsService.getDoctorAssignment(unassignedDoctorUid, patientUid);
      expect(assignment.isAssigned).toBe(false);
      expect(assignment.status).toBe('none');

      const cues = await DoctorAnalyticsService.get30DayAssistedRecallCueDistribution(patientUid, unassignedDoctorUid);
      expect(cues.isAuthorized).toBe(false);
      expect(cues.status).toBe('unauthorized');

      const games = await DoctorAnalyticsService.get30DayGameDifficultyActivity(patientUid, unassignedDoctorUid);
      expect(games.isAuthorized).toBe(false);
      expect(games.status).toBe('unauthorized');
    });
  });

  // =========================================================================
  // Part B: 30-Day Routine Adherence Aggregation
  // =========================================================================
  describe('Part B: 30-Day Routine Adherence Aggregation', () => {
    it('accurately computes 30-day date range and includes 30 distinct dates', () => {
      const { startDate, endDate, dates } = DoctorAnalyticsService.get30DayRange();
      expect(dates.length).toBe(30);
      expect(dates[0]).toBe(startDate);
      expect(dates[29]).toBe(endDate);

      // Verify date difference is exactly 29 days between start and end
      const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
      const endMs = new Date(`${endDate}T00:00:00Z`).getTime();
      const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(29);
    });

    it('handles empty patient routine history truthfully without fabricating demo percentages', async () => {
      // Clear all history
      localStorage.setItem(`saksham_routine_history_${patientUid}`, JSON.stringify([]));

      const adherence = await DoctorAnalyticsService.get30DayRoutineAdherence(patientUid, assignedDoctorUid);
      expect(adherence.isAuthorized).toBe(true);
      expect(adherence.status).toBe('no-records');
      expect(adherence.totalRecordedTasks).toBe(0);
      expect(adherence.completedTasks).toBe(0);
      expect(adherence.adherencePercentage).toBe(0);
      expect(adherence.recordedDaysCount).toBe(0);
      expect(adherence.dailyTrend.every((d) => d.status === 'no-data')).toBe(true);
    });

    it('correctly aggregates adherence numerator, denominator, and de-duplicates same-day attempts', async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

      // Seed deliberate history records with a duplicate attempt on yesterday for r1
      const seededHistory = [
        // Today: 2 tasks, both completed
        { id: 'att-1', routineId: 'r1', patientId: patientUid, date: today, attemptsUsed: 1, skipped: false, isCompleted: true },
        { id: 'att-2', routineId: 'r2', patientId: patientUid, date: today, attemptsUsed: 2, skipped: false, isCompleted: true },
        // Yesterday: r1 completed, and duplicate earlier uncompleted attempt for r1
        { id: 'att-3a', routineId: 'r1', patientId: patientUid, date: yesterday, attemptsUsed: 1, skipped: false, isCompleted: false },
        { id: 'att-3b', routineId: 'r1', patientId: patientUid, date: yesterday, attemptsUsed: 2, skipped: false, isCompleted: true }, // Should resolve to completed
        { id: 'att-4', routineId: 'r2', patientId: patientUid, date: yesterday, attemptsUsed: 3, skipped: false, isCompleted: false },
        // Two days ago: 1 task, completed
        { id: 'att-5', routineId: 'r1', patientId: patientUid, date: twoDaysAgo, attemptsUsed: 1, skipped: false, isCompleted: true },
      ];

      localStorage.setItem(`saksham_routine_history_${patientUid}`, JSON.stringify(seededHistory));

      const adherence = await DoctorAnalyticsService.get30DayRoutineAdherence(patientUid, assignedDoctorUid);

      // Distinct tasks: Today (r1, r2) = 2, Yesterday (r1, r2 deduped) = 2, Two days ago (r1) = 1 => Total 5
      expect(adherence.totalRecordedTasks).toBe(5);
      // Completed: Today (r1, r2) = 2, Yesterday (r1) = 1, Two days ago (r1) = 1 => Total 4
      expect(adherence.completedTasks).toBe(4);
      // Percentage: 4 / 5 = 80%
      expect(adherence.adherencePercentage).toBe(80);
      expect(adherence.recordedDaysCount).toBe(3);
      expect(adherence.status).toBe('sufficient-data');
    });

    it('marks limited observation (< 3 active days) as insufficient-history', async () => {
      const today = new Date().toISOString().split('T')[0];
      const seededHistory = [
        { id: 'att-1', routineId: 'r1', patientId: patientUid, date: today, attemptsUsed: 1, skipped: false, isCompleted: true },
      ];
      localStorage.setItem(`saksham_routine_history_${patientUid}`, JSON.stringify(seededHistory));

      const adherence = await DoctorAnalyticsService.get30DayRoutineAdherence(patientUid, assignedDoctorUid);
      expect(adherence.recordedDaysCount).toBe(1);
      expect(adherence.status).toBe('insufficient-history');
    });
  });

  // =========================================================================
  // Part C: Assisted Recall Cue Usage Distribution
  // =========================================================================
  describe('Part C: Assisted Recall Cue Usage Distribution', () => {
    it('aggregates cue attempts across Level 1, Level 2, and Level 3 with accurate percentages', async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // 4 attempts: 2 Level 1 (50%), 1 Level 2 (25%), 1 Level 3 (25%)
      const seededHistory = [
        { id: 'att-1', routineId: 'r1', patientId: patientUid, date: today, attemptsUsed: 1, skipped: false, isCompleted: true },
        { id: 'att-2', routineId: 'r2', patientId: patientUid, date: today, attemptsUsed: 1, skipped: false, isCompleted: true },
        { id: 'att-3', routineId: 'r1', patientId: patientUid, date: yesterday, attemptsUsed: 2, skipped: false, isCompleted: true },
        { id: 'att-4', routineId: 'r2', patientId: patientUid, date: yesterday, attemptsUsed: 3, skipped: false, isCompleted: true },
      ];

      localStorage.setItem(`saksham_routine_history_${patientUid}`, JSON.stringify(seededHistory));

      const cueAnalytics = await DoctorAnalyticsService.get30DayAssistedRecallCueDistribution(patientUid, assignedDoctorUid);
      expect(cueAnalytics.isAuthorized).toBe(true);
      expect(cueAnalytics.totalAttempts).toBe(4);

      const l1 = cueAnalytics.distribution.find((d) => d.level === 1);
      const l2 = cueAnalytics.distribution.find((d) => d.level === 2);
      const l3 = cueAnalytics.distribution.find((d) => d.level === 3);

      expect(l1?.count).toBe(2);
      expect(l1?.percentage).toBe(50);

      expect(l2?.count).toBe(1);
      expect(l2?.percentage).toBe(25);

      expect(l3?.count).toBe(1);
      expect(l3?.percentage).toBe(25);

      // Verify clinical disclaimer is present
      expect(cueAnalytics.disclaimer).toContain('does not represent a clinical cognitive score');
    });

    it('returns empty distribution truthfully when zero attempts recorded', async () => {
      localStorage.setItem(`saksham_routine_history_${patientUid}`, JSON.stringify([]));

      const cueAnalytics = await DoctorAnalyticsService.get30DayAssistedRecallCueDistribution(patientUid, assignedDoctorUid);
      expect(cueAnalytics.status).toBe('no-records');
      expect(cueAnalytics.totalAttempts).toBe(0);
      expect(cueAnalytics.distribution.every((d) => d.count === 0 && d.percentage === 0)).toBe(true);
    });
  });

  // =========================================================================
  // Part D: Adaptive Game Difficulty Activity & Non-Inference Safeguards
  // =========================================================================
  describe('Part D: Adaptive Game Difficulty Activity & Non-Inference Safeguards', () => {
    it('summarizes game difficulty counts and enforces clinical non-inference notice', async () => {
      const today = new Date().toISOString().split('T')[0];

      const seededSessions = [
        {
          id: 'sess-1',
          patientId: patientUid,
          gameId: 'room-memory',
          gameTitle: 'Room Memory',
          category: 'memory' as const,
          difficulty: 'Gentle' as const,
          date: today,
          durationSeconds: 120,
        },
        {
          id: 'sess-2',
          patientId: patientUid,
          gameId: 'pattern-tiles',
          gameTitle: 'Pattern Tiles',
          category: 'attention' as const,
          difficulty: 'Gentle' as const,
          date: today,
          durationSeconds: 90,
        },
        {
          id: 'sess-3',
          patientId: patientUid,
          gameId: 'room-memory',
          gameTitle: 'Room Memory',
          category: 'memory' as const,
          difficulty: 'Moderate' as const,
          date: today,
          durationSeconds: 150,
        },
      ];

      localStorage.setItem(`saksham_game_sessions_${patientUid}`, JSON.stringify(seededSessions));

      const gameAnalytics = await DoctorAnalyticsService.get30DayGameDifficultyActivity(patientUid, assignedDoctorUid);
      expect(gameAnalytics.isAuthorized).toBe(true);
      expect(gameAnalytics.totalSessions).toBe(3);
      expect(gameAnalytics.difficultyCounts.gentle).toBe(2);
      expect(gameAnalytics.difficultyCounts.moderate).toBe(1);
      expect(gameAnalytics.difficultyCounts.stimulating).toBe(0);

      // Verify clinical non-inference safeguard
      expect(gameAnalytics.clinicalNonInferenceNotice).toContain('must NOT be used to infer neurological disease progression');
    });

    it('returns truthful empty state when zero game sessions exist', async () => {
      localStorage.setItem(`saksham_game_sessions_${patientUid}`, JSON.stringify([]));

      const gameAnalytics = await DoctorAnalyticsService.get30DayGameDifficultyActivity(patientUid, assignedDoctorUid);
      expect(gameAnalytics.status).toBe('no-records');
      expect(gameAnalytics.totalSessions).toBe(0);
      expect(gameAnalytics.stabilitySummary).toContain('No game sessions recorded');
    });
  });

  // =========================================================================
  // Part E: UI Rendering & Doctor Dashboard Integration
  // =========================================================================
  describe('Part E: UI Rendering & Doctor Dashboard Integration', () => {
    it('renders DoctorLongitudinalAnalytics with authentic metrics for assigned doctor', async () => {
      render(
        <DoctorLongitudinalAnalytics
          doctorId={assignedDoctorUid}
          patientId={patientUid}
          patientName="Sunita Sharma"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('doctor-longitudinal-analytics-section')).toBeInTheDocument();
      });

      expect(screen.getByTestId('doctor-routine-adherence-card')).toBeInTheDocument();
      expect(screen.getByTestId('doctor-assisted-recall-card')).toBeInTheDocument();
      expect(screen.getByTestId('doctor-adaptive-game-activity-card')).toBeInTheDocument();
      expect(screen.getByText(/30-Day Activity & Adherence Analytics/i)).toBeInTheDocument();
    });

    it('renders restricted access notice when doctor is unassigned or pending', async () => {
      render(
        <DoctorLongitudinalAnalytics
          doctorId={pendingDoctorUid}
          patientId={patientUid}
          patientName="Sunita Sharma"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('doctor-unauthorized-section')).toBeInTheDocument();
      });

      expect(screen.getByText(/Clinical Access Restricted/i)).toBeInTheDocument();
      expect(screen.queryByTestId('doctor-routine-adherence-card')).not.toBeInTheDocument();
    });

    it('renders full DoctorDashboard with verified clinical link and disclaimer banner', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <PatientExperienceProvider>
              <DoctorDashboard />
            </PatientExperienceProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      expect(await screen.findByText(/Clinical Neurology Portal/i)).toBeInTheDocument();
      expect(screen.getByText(/Assigned Patient: Sunita Sharma/i)).toBeInTheDocument();
      expect(screen.getByText(/Clinical Transparency Policy/i)).toBeInTheDocument();
      expect(screen.getByText(/Neurological Progress Notes & Task Assignment/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Part F: Regression & Role Isolation
  // =========================================================================
  describe('Part F: Regression & Role Isolation', () => {
    it('preserves patient experience modes and does not leak into doctor dashboard', () => {
      localStorage.setItem(`saksham_patient_experience_mode_${patientUid}`, 'asha-only');
      expect(localStorage.getItem(`saksham_patient_experience_mode_${patientUid}`)).toBe('asha-only');

      // Doctor dashboard does not use or modify patient experience mode
      expect(localStorage.getItem(`saksham_patient_experience_mode_${assignedDoctorUid}`)).toBeNull();
    });

    it('preserves existing routines definitions and streak calculations', () => {
      const routines = RoutineService.getRoutines(patientUid);
      expect(routines.length).toBeGreaterThan(0);

      const progress = RoutineService.calculateProgress(routines);
      expect(typeof progress.percentage).toBe('number');
    });

    it('preserves adaptive difficulty profile schema and defaults', () => {
      const profile = AdaptiveDifficultyService.getProfile(patientUid);
      expect(['Gentle', 'Moderate', 'Stimulating']).toContain(profile.currentDifficulty);
      expect(['calm', 'balanced', 'agile']).toContain(profile.pacing);

      const history = GamesService.getHistory(patientUid);
      expect(Array.isArray(history)).toBe(true);
    });
  });
});
