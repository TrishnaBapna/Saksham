/**
 * Saksham Doctor Analytics Service
 * Milestone 7.4.3: Doctor Longitudinal Behavioral Activity & Adherence Portal
 * Milestone 7.4.3.2: Privacy, Authorization & Data Integrity Remediation
 */

import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import { RoutineService } from '../../routines/services/routineService.js';
import { GamesService } from '../../games/services/gamesService.js';
import { AdaptiveDifficultyService } from '../../games/services/adaptiveDifficultyService.js';
import { GameDifficulty, GamePacing } from '../../../types/index.js';
import { getEffectivePatientId, isGuestPatient } from '../../auth/services/identityService.js';
import {
  getPatientCalendarDate,
  get30DayCalendarRange,
  DEFAULT_PATIENT_TIMEZONE,
} from '../../../utils/dateUtils.js';

export interface DoctorAssignmentInfo {
  isAssigned: boolean;
  status: 'active' | 'revoked' | 'pending' | 'none';
  doctorId: string;
  patientId: string;
  patientName: string;
  assignedAt?: string;
  notes?: string;
}

export interface DayAdherenceEntry {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Nov 10"
  completedCount: number;
  totalCount: number;
  status: 'completed' | 'partial' | 'incomplete' | 'no-data';
}

export interface RoutineAdherenceAnalytics {
  isAuthorized: boolean;
  status: 'sufficient-data' | 'insufficient-history' | 'no-records' | 'unauthorized';
  startDate: string;
  endDate: string;
  totalRecordedTasks: number;
  completedTasks: number;
  attemptCompletionRate: number; // Formerly adherencePercentage; reflects actual calculation numerator/denominator
  adherencePercentage: number; // Preserved as alias for backward compatibility
  recordedDaysCount: number;
  dailyTrend: DayAdherenceEntry[];
  numeratorLabel?: string;
  denominatorLabel?: string;
  metricNotice?: string;
  message?: string;
}

export interface CueDistributionEntry {
  level: 1 | 2 | 3;
  label: string;
  description: string;
  count: number;
  percentage: number;
}

export interface AssistedRecallCueAnalytics {
  isAuthorized: boolean;
  status: 'sufficient-data' | 'insufficient-history' | 'no-records' | 'unauthorized';
  totalAttempts: number;
  distribution: CueDistributionEntry[];
  disclaimer: string;
}

export interface GameDifficultyAnalytics {
  isAuthorized: boolean;
  status: 'sufficient-data' | 'insufficient-history' | 'no-records' | 'unauthorized';
  totalSessions: number;
  currentDifficulty: GameDifficulty;
  pacing: GamePacing;
  adaptationRationale: string;
  difficultyCounts: {
    gentle: number;
    moderate: number;
    stimulating: number;
  };
  stabilitySummary: string;
  clinicalNonInferenceNotice: string;
}

export class DoctorAnalyticsService {
  // Track patient IDs accessed during a clinician session for secure logout cleanup
  private static accessedPatientIds: Set<string> = new Set();
  private static readonly SESSION_STORAGE_KEY = 'saksham_clinical_accessed_patients';

  // In-memory simulation registry for real-time revocation testing & non-Firebase environments
  private static simulatedAssignments: Map<string, DoctorAssignmentInfo> = new Map();
  private static assignmentSubscribers: Map<string, Set<(info: DoctorAssignmentInfo) => void>> = new Map();

  /**
   * Tracks patient ID accessed during an active doctor session.
   * Stored in-memory and synchronized to sessionStorage so page refreshes in the same session retain the list.
   */
  public static trackAccessedPatient(patientId: string): void {
    if (!patientId || isGuestPatient(patientId)) return;
    this.accessedPatientIds.add(patientId);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = window.sessionStorage.getItem(this.SESSION_STORAGE_KEY);
        const list: string[] = raw ? JSON.parse(raw) : [];
        if (!list.includes(patientId)) {
          list.push(patientId);
          window.sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(list));
        }
      }
    } catch {
      // Ignore session storage errors
    }
  }

  /**
   * Returns list of patient IDs accessed during the current clinical session.
   */
  public static getClinicalAccessedPatients(): string[] {
    const combined = new Set<string>(this.accessedPatientIds);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = window.sessionStorage.getItem(this.SESSION_STORAGE_KEY);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach((id: string) => combined.add(id));
          }
        }
      }
    } catch {
      // Ignore session storage errors
    }
    return Array.from(combined);
  }

  /**
   * Purges all patient telemetry accessed during a clinical session upon doctor logout or session termination.
   * Preserves legitimate patient-owned offline pending work (does not delete saksham_pending_* queues).
   */
  public static clearClinicalSession(): void {
    const patientIds = this.getClinicalAccessedPatients();
    for (const patientId of patientIds) {
      RoutineService.clearPatientCache(patientId);
      GamesService.clearPatientCache(patientId);
      AdaptiveDifficultyService.clearMemoryCache(patientId);
    }

    this.accessedPatientIds.clear();
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore session storage errors
    }
  }

  /**
   * Sets or overrides simulated assignment status (for unit tests and prototype environments).
   * Immediately notifies all active subscribers.
   */
  public static setSimulatedAssignment(
    doctorId: string,
    targetPatientId: string,
    status: 'active' | 'revoked' | 'pending' | 'none'
  ): void {
    const effectivePatientId = getEffectivePatientId({ uid: targetPatientId });
    const key = `${doctorId}_${effectivePatientId}`;
    const info: DoctorAssignmentInfo = {
      isAssigned: status === 'active',
      status,
      doctorId,
      patientId: effectivePatientId,
      patientName: 'Sunita Sharma',
    };
    this.simulatedAssignments.set(key, info);

    const subscribers = this.assignmentSubscribers.get(key);
    if (subscribers) {
      subscribers.forEach((cb) => cb(info));
    }
  }

  /**
   * Clears simulated assignments and subscriber registries.
   */
  public static clearSimulatedAssignments(): void {
    this.simulatedAssignments.clear();
    this.assignmentSubscribers.clear();
  }

  /**
   * Helper to format Date into YYYY-MM-DD in patient's calendar timezone (default IST).
   */
  public static toDateString(d: Date, timeZone: string = DEFAULT_PATIENT_TIMEZONE): string {
    return getPatientCalendarDate(d, timeZone);
  }

  /**
   * Calculate exact 30-day continuous calendar range [today - 29 days, today]
   * evaluated strictly in the patient's timezone.
   */
  public static get30DayRange(
    referenceDate: Date = new Date(),
    timeZone: string = DEFAULT_PATIENT_TIMEZONE
  ): { startDate: string; endDate: string; dates: string[] } {
    return get30DayCalendarRange(referenceDate, timeZone);
  }

  /**
   * Verifies active doctor-patient assignment from Firestore or verified demo setup.
   * STRICT DEMO DOCTOR ISOLATION (Priority 2):
   * demo-doctor-001 can ONLY access demo-patient-001. Any other patient ID is strictly rejected.
   */
  public static async getDoctorAssignment(
    doctorId: string,
    targetPatientId: string = 'demo-patient-001'
  ): Promise<DoctorAssignmentInfo> {
    const effectivePatientId = getEffectivePatientId({ uid: targetPatientId });
    const key = `${doctorId}_${effectivePatientId}`;

    // Check simulated assignment registry first (e.g. for revocation tests)
    if (this.simulatedAssignments.has(key)) {
      const simulated = this.simulatedAssignments.get(key)!;
      if (simulated.isAssigned) {
        this.trackAccessedPatient(effectivePatientId);
      }
      return simulated;
    }

    // STRICT DEMO ISOLATION:
    // demo-doctor-001 is authorized ONLY for demo-patient-001
    if (doctorId === 'demo-doctor-001') {
      if (effectivePatientId === 'demo-patient-001') {
        const info: DoctorAssignmentInfo = {
          isAssigned: true,
          status: 'active',
          doctorId,
          patientId: effectivePatientId,
          patientName: 'Sunita Sharma',
          assignedAt: '2026-10-01T00:00:00.000Z',
          notes: 'Primary cognitive neurology oversight',
        };
        this.trackAccessedPatient(effectivePatientId);
        return info;
      }

      // Any other patient requested by demo-doctor-001 MUST be rejected!
      return {
        isAssigned: false,
        status: 'none',
        doctorId,
        patientId: effectivePatientId,
        patientName: 'Unauthorized Patient',
      };
    }

    // Pending demo doctor
    if (doctorId === 'demo-doctor-002') {
      return {
        isAssigned: false,
        status: 'pending',
        doctorId,
        patientId: effectivePatientId,
        patientName: 'Sunita Sharma',
      };
    }

    if (!isFirebaseConfigured) {
      return {
        isAssigned: false,
        status: 'none',
        doctorId,
        patientId: effectivePatientId,
        patientName: 'Sunita Sharma',
      };
    }

    try {
      const assignmentDocId = `${doctorId}_${effectivePatientId}`;
      const docRef = doc(db, 'doctorAssignments', assignmentDocId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        const status = data.status as 'active' | 'revoked' | 'pending';
        const isAssigned = status === 'active';
        if (isAssigned) {
          this.trackAccessedPatient(effectivePatientId);
        }
        return {
          isAssigned,
          status,
          doctorId,
          patientId: effectivePatientId,
          patientName: data.patientName || 'Sunita Sharma',
          assignedAt: data.assignedAt,
          notes: data.notes,
        };
      }

      // Check query in doctorAssignments
      const q = query(
        collection(db, 'doctorAssignments'),
        where('doctorId', '==', doctorId),
        where('patientId', '==', effectivePatientId),
        where('status', '==', 'active')
      );
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        const data = querySnap.docs[0].data();
        this.trackAccessedPatient(effectivePatientId);
        return {
          isAssigned: true,
          status: 'active',
          doctorId,
          patientId: effectivePatientId,
          patientName: data.patientName || 'Sunita Sharma',
          assignedAt: data.assignedAt,
          notes: data.notes,
        };
      }

      return {
        isAssigned: false,
        status: 'none',
        doctorId,
        patientId: effectivePatientId,
        patientName: 'Sunita Sharma',
      };
    } catch (err) {
      console.warn('[DoctorAnalyticsService] Failed to check doctor assignment:', err);
      return {
        isAssigned: false,
        status: 'none',
        doctorId,
        patientId: effectivePatientId,
        patientName: 'Sunita Sharma',
      };
    }
  }

  /**
   * Subscribes to live doctor assignment updates.
   * If assignment status becomes revoked, inactive, or pending, fires callback immediately.
   * Returns an unsubscribe function.
   */
  public static subscribeToDoctorAssignment(
    doctorId: string,
    targetPatientId: string,
    callback: (info: DoctorAssignmentInfo) => void
  ): () => void {
    const effectivePatientId = getEffectivePatientId({ uid: targetPatientId });
    const key = `${doctorId}_${effectivePatientId}`;

    if (!this.assignmentSubscribers.has(key)) {
      this.assignmentSubscribers.set(key, new Set());
    }
    this.assignmentSubscribers.get(key)!.add(callback);

    let unsubscribeFirestore: (() => void) | null = null;

    if (isFirebaseConfigured && !doctorId.startsWith('demo-')) {
      try {
        const docRef = doc(db, 'doctorAssignments', key);
        unsubscribeFirestore = onSnapshot(
          docRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              const status = data.status as 'active' | 'revoked' | 'pending';
              const isAssigned = status === 'active';
              if (isAssigned) {
                this.trackAccessedPatient(effectivePatientId);
              }
              callback({
                isAssigned,
                status,
                doctorId,
                patientId: effectivePatientId,
                patientName: data.patientName || 'Sunita Sharma',
                assignedAt: data.assignedAt,
                notes: data.notes,
              });
            } else {
              callback({
                isAssigned: false,
                status: 'none',
                doctorId,
                patientId: effectivePatientId,
                patientName: 'Sunita Sharma',
              });
            }
          },
          (err) => {
            console.warn('[DoctorAnalyticsService] Snapshot listener error:', err);
            callback({
              isAssigned: false,
              status: 'none',
              doctorId,
              patientId: effectivePatientId,
              patientName: 'Sunita Sharma',
            });
          }
        );
      } catch (err) {
        console.warn('[DoctorAnalyticsService] Failed to establish onSnapshot listener:', err);
      }
    } else {
      // Demo / simulated mode: fire current assignment resolution immediately
      this.getDoctorAssignment(doctorId, targetPatientId).then((initial) => {
        callback(initial);
      });
    }

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      const subs = this.assignmentSubscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.assignmentSubscribers.delete(key);
        }
      }
    };
  }

  /**
   * Computes 30-day routine attempt completion rate from authentic recorded data.
   * Strictly separates missing records from non-compliance.
   */
  public static async get30DayRoutineAdherence(
    patientId: string,
    doctorId: string
  ): Promise<RoutineAdherenceAnalytics> {
    const assignment = await this.getDoctorAssignment(doctorId, patientId);
    const { startDate, endDate, dates } = this.get30DayRange();

    if (!assignment.isAssigned) {
      return {
        isAuthorized: false,
        status: 'unauthorized',
        startDate,
        endDate,
        totalRecordedTasks: 0,
        completedTasks: 0,
        attemptCompletionRate: 0,
        adherencePercentage: 0,
        recordedDaysCount: 0,
        dailyTrend: [],
        numeratorLabel: 'Completed unique tasks attempted',
        denominatorLabel: 'Total unique tasks attempted/logged',
        metricNotice:
          'Attempt Completion Rate reflects consistency for recorded daily tasks. Unrecorded tasks denote absence of logged telemetry, not non-compliance or failure.',
        message: 'Doctor is not actively assigned to this patient in doctorAssignments.',
      };
    }

    const effectiveId = getEffectivePatientId({ uid: patientId });

    // Pull authentic history records (cloud sync with local fallback)
    let history = await RoutineService.syncHistoryFromFirestore(effectiveId);
    if (!history || history.length === 0) {
      history = RoutineService.getHistory(effectiveId);
    }

    // Filter to last 30 calendar days [startDate, endDate]
    const windowRecords = history.filter((r) => r.date >= startDate && r.date <= endDate);

    if (windowRecords.length === 0) {
      return {
        isAuthorized: true,
        status: 'no-records',
        startDate,
        endDate,
        totalRecordedTasks: 0,
        completedTasks: 0,
        attemptCompletionRate: 0,
        adherencePercentage: 0,
        recordedDaysCount: 0,
        dailyTrend: dates.map((d) => ({
          date: d,
          dayLabel: new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          completedCount: 0,
          totalCount: 0,
          status: 'no-data',
        })),
        numeratorLabel: 'Completed unique tasks attempted',
        denominatorLabel: 'Total unique tasks attempted/logged',
        metricNotice:
          'Attempt Completion Rate reflects consistency for recorded daily tasks. Unrecorded tasks denote absence of logged telemetry, not non-compliance or failure.',
        message: 'No routine activity records found in the last 30 days.',
      };
    }

    // De-duplicate multiple attempts on same day for same routine: key `${date}_${routineId}`
    const dedupedMap = new Map<string, typeof windowRecords[0]>();
    for (const record of windowRecords) {
      const key = `${record.date}_${record.routineId}`;
      const existing = dedupedMap.get(key);
      if (!existing) {
        dedupedMap.set(key, record);
      } else if (record.isCompleted && !existing.isCompleted) {
        dedupedMap.set(key, record);
      }
    }

    const uniqueAttempts = Array.from(dedupedMap.values());
    const totalRecordedTasks = uniqueAttempts.length;
    const completedTasks = uniqueAttempts.filter((a) => a.isCompleted).length;
    const attemptCompletionRate =
      totalRecordedTasks > 0 ? Math.round((completedTasks / totalRecordedTasks) * 100) : 0;

    // Distinct recorded days
    const recordedDates = new Set(uniqueAttempts.map((a) => a.date));
    const recordedDaysCount = recordedDates.size;

    // Build 30-day timeline entries
    const dailyTrend: DayAdherenceEntry[] = dates.map((d) => {
      const dayAttempts = uniqueAttempts.filter((a) => a.date === d);
      const dayLabel = new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      if (dayAttempts.length === 0) {
        return {
          date: d,
          dayLabel,
          completedCount: 0,
          totalCount: 0,
          status: 'no-data',
        };
      }

      const completed = dayAttempts.filter((a) => a.isCompleted).length;
      const total = dayAttempts.length;

      let status: DayAdherenceEntry['status'] = 'incomplete';
      if (completed === total) {
        status = 'completed';
      } else if (completed > 0) {
        status = 'partial';
      }

      return {
        date: d,
        dayLabel,
        completedCount: completed,
        totalCount: total,
        status,
      };
    });

    return {
      isAuthorized: true,
      status: recordedDaysCount < 3 ? 'insufficient-history' : 'sufficient-data',
      startDate,
      endDate,
      totalRecordedTasks,
      completedTasks,
      attemptCompletionRate,
      adherencePercentage: attemptCompletionRate, // Backward compatibility alias
      recordedDaysCount,
      dailyTrend,
      numeratorLabel: 'Completed unique tasks attempted',
      denominatorLabel: 'Total unique tasks attempted/logged',
      metricNotice:
        'Attempt Completion Rate reflects consistency for recorded daily tasks. Unrecorded tasks denote absence of logged telemetry, not non-compliance or failure.',
    };
  }

  /**
   * Computes 30-day 3-chance assisted recall cue usage distribution.
   * Explains cue meanings without diagnostic labeling.
   */
  public static async get30DayAssistedRecallCueDistribution(
    patientId: string,
    doctorId: string
  ): Promise<AssistedRecallCueAnalytics> {
    const assignment = await this.getDoctorAssignment(doctorId, patientId);
    const disclaimer =
      'Assisted recall reflects task-prompt engagement during daily routines. This distribution does not represent a clinical cognitive score, MMSE/MoCA equivalent, or diagnostic assessment.';

    if (!assignment.isAssigned) {
      return {
        isAuthorized: false,
        status: 'unauthorized',
        totalAttempts: 0,
        distribution: [],
        disclaimer,
      };
    }

    const effectiveId = getEffectivePatientId({ uid: patientId });
    const { startDate, endDate } = this.get30DayRange();

    let history = await RoutineService.syncHistoryFromFirestore(effectiveId);
    if (!history || history.length === 0) {
      history = RoutineService.getHistory(effectiveId);
    }

    const windowRecords = history.filter((r) => r.date >= startDate && r.date <= endDate);

    if (windowRecords.length === 0) {
      return {
        isAuthorized: true,
        status: 'no-records',
        totalAttempts: 0,
        distribution: [
          {
            level: 1,
            label: 'Level 1: Direct Recall',
            description: 'Patient recalled routine task on 1st prompt without hints.',
            count: 0,
            percentage: 0,
          },
          {
            level: 2,
            label: 'Level 2: Hint-Assisted',
            description: 'Patient recalled task following subtle environmental or contextual hint.',
            count: 0,
            percentage: 0,
          },
          {
            level: 3,
            label: 'Level 3: Guided Assistance',
            description: 'Patient required direct guidance or explicit answer reveal.',
            count: 0,
            percentage: 0,
          },
        ],
        disclaimer,
      };
    }

    let level1Count = 0;
    let level2Count = 0;
    let level3Count = 0;

    for (const record of windowRecords) {
      const attempts = record.attemptsUsed || 1;
      if (attempts === 1) {
        level1Count++;
      } else if (attempts === 2) {
        level2Count++;
      } else {
        level3Count++;
      }
    }

    const totalAttempts = level1Count + level2Count + level3Count;
    const level1Percent = totalAttempts > 0 ? Math.round((level1Count / totalAttempts) * 100) : 0;
    const level2Percent = totalAttempts > 0 ? Math.round((level2Count / totalAttempts) * 100) : 0;
    const level3Percent = totalAttempts > 0 ? Math.round((level3Count / totalAttempts) * 100) : 0;

    const distribution: CueDistributionEntry[] = [
      {
        level: 1,
        label: 'Level 1: Direct Recall',
        description: 'Patient recalled routine task on 1st prompt without hints.',
        count: level1Count,
        percentage: level1Percent,
      },
      {
        level: 2,
        label: 'Level 2: Hint-Assisted',
        description: 'Patient recalled task following subtle environmental or contextual hint.',
        count: level2Count,
        percentage: level2Percent,
      },
      {
        level: 3,
        label: 'Level 3: Guided Assistance',
        description: 'Patient required direct guidance or explicit answer reveal.',
        count: level3Count,
        percentage: level3Percent,
      },
    ];

    return {
      isAuthorized: true,
      status: totalAttempts < 3 ? 'insufficient-history' : 'sufficient-data',
      totalAttempts,
      distribution,
      disclaimer,
    };
  }

  /**
   * Computes 30-day adaptive cognitive game difficulty metrics and stability trends.
   * Strictly includes clinical non-inference notice.
   */
  public static async get30DayGameDifficultyActivity(
    patientId: string,
    doctorId: string
  ): Promise<GameDifficultyAnalytics> {
    const assignment = await this.getDoctorAssignment(doctorId, patientId);
    const clinicalNonInferenceNotice =
      'Game difficulty adjustments reflect patient comfort and pacing preferences in voluntary recreational games. They must NOT be used to infer neurological disease progression, treatment efficacy, or clinical cognitive decline.';

    if (!assignment.isAssigned) {
      return {
        isAuthorized: false,
        status: 'unauthorized',
        totalSessions: 0,
        currentDifficulty: 'Gentle',
        pacing: 'calm',
        adaptationRationale: '',
        difficultyCounts: { gentle: 0, moderate: 0, stimulating: 0 },
        stabilitySummary: 'Unauthorized: Doctor is not assigned to this patient.',
        clinicalNonInferenceNotice,
      };
    }

    const effectiveId = getEffectivePatientId({ uid: patientId });
    const { startDate, endDate } = this.get30DayRange();

    // Pull game sessions (authorized via /gameSessions collection)
    let sessions = await GamesService.syncHistoryFromFirestore(effectiveId);
    if (!sessions || sessions.length === 0) {
      sessions = GamesService.getHistory(effectiveId);
    }

    const profile = AdaptiveDifficultyService.getProfile(effectiveId);
    const windowSessions = sessions.filter((s) => s.date >= startDate && s.date <= endDate);

    let gentleCount = 0;
    let moderateCount = 0;
    let stimulatingCount = 0;

    for (const s of windowSessions) {
      if (s.difficulty === 'Gentle') gentleCount++;
      else if (s.difficulty === 'Moderate') moderateCount++;
      else if (s.difficulty === 'Stimulating') stimulatingCount++;
    }

    const totalSessions = windowSessions.length;

    let stabilitySummary = 'No game sessions recorded in the last 30 days.';
    if (totalSessions > 0) {
      if (gentleCount === totalSessions) {
        stabilitySummary = 'Stable Engagement: All recorded sessions played at Gentle difficulty.';
      } else if (moderateCount === totalSessions) {
        stabilitySummary = 'Stable Engagement: All recorded sessions played at Moderate difficulty.';
      } else if (stimulatingCount === totalSessions) {
        stabilitySummary = 'Stable Engagement: All recorded sessions played at Stimulating difficulty.';
      } else {
        const topDiff =
          gentleCount >= moderateCount && gentleCount >= stimulatingCount
            ? 'Gentle'
            : moderateCount >= stimulatingCount
            ? 'Moderate'
            : 'Stimulating';
        stabilitySummary = `Varied Activity: Engaged across multiple difficulty levels, primarily ${topDiff} (${gentleCount} Gentle, ${moderateCount} Moderate, ${stimulatingCount} Stimulating).`;
      }
    }

    return {
      isAuthorized: true,
      status: totalSessions === 0 ? 'no-records' : totalSessions < 3 ? 'insufficient-history' : 'sufficient-data',
      totalSessions,
      currentDifficulty: profile.currentDifficulty,
      pacing: profile.pacing,
      adaptationRationale: profile.adaptationRationale || 'Comfort-first pacing in recreational games.',
      difficultyCounts: {
        gentle: gentleCount,
        moderate: moderateCount,
        stimulating: stimulatingCount,
      },
      stabilitySummary,
      clinicalNonInferenceNotice,
    };
  }
}
