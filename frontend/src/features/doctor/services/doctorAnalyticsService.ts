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
import { getEffectivePatientId, isGuestPatient, isExplicitLocalDemo } from '../../auth/services/identityService.js';
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
  error?: string | null;
}

export interface DoctorAssignedActivity {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  gameId: string;
  gameTitle: string;
  frequency: 'daily' | 'alternate_days' | 'weekly';
  clinicalGoal?: string;
  instructions: string;
  assignedAt: string;
  status: 'active' | 'completed' | 'paused';
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
    status: 'active' | 'revoked' | 'pending' | 'none',
    patientName: string = 'Sunita Sharma'
  ): void {
    const effectivePatientId = getEffectivePatientId({ uid: targetPatientId });
    const key = `${doctorId}_${effectivePatientId}`;
    const info: DoctorAssignmentInfo = {
      isAssigned: status === 'active',
      status,
      doctorId,
      patientId: effectivePatientId,
      patientName,
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
   * STRICT PRODUCTION DEMO ISOLATION (SEC-03):
   * 1. In production, demo accounts (demo-doctor-001, demo-patient-001) NEVER receive automatic authorization.
   * 2. When targetPatientId is not specified, queries active doctorAssignments in Firestore.
   * 3. Non-assigned, missing, or errored assignments never fabricate Sunita Sharma or demo patient.
   * 4. In local demo mode (localhost/127.0.0.1 and not PROD), demo-doctor-001 is isolated to demo-patient-001.
   */
  public static async getDoctorAssignment(
    doctorId: string,
    targetPatientId?: string
  ): Promise<DoctorAssignmentInfo> {
    const cleanDoctorId = doctorId ? doctorId.trim() : '';
    if (!cleanDoctorId) {
      return {
        isAssigned: false,
        status: 'none',
        doctorId: '',
        patientId: '',
        patientName: 'No Patient Assigned',
      };
    }

    const effectivePatientId = targetPatientId ? getEffectivePatientId({ uid: targetPatientId }) : '';
    const key = effectivePatientId ? `${cleanDoctorId}_${effectivePatientId}` : undefined;

    // Check simulated assignment registry first (e.g. for revocation tests)
    if (key && this.simulatedAssignments.has(key)) {
      const simulated = this.simulatedAssignments.get(key)!;
      if (simulated.isAssigned && effectivePatientId) {
        this.trackAccessedPatient(effectivePatientId);
      }
      return simulated;
    }
    if (!targetPatientId) {
      for (const [sKey, sim] of this.simulatedAssignments.entries()) {
        if (sKey.startsWith(`${cleanDoctorId}_`)) {
          if (sim.isAssigned && sim.patientId) {
            this.trackAccessedPatient(sim.patientId);
          }
          return sim;
        }
      }
    }

    const isDemoAllowed = isExplicitLocalDemo();

    // STRICT DEMO ISOLATION:
    // Only in non-production local demo environments may demo-doctor-001 access demo-patient-001
    if (isDemoAllowed && cleanDoctorId === 'demo-doctor-001') {
      if (!targetPatientId || effectivePatientId === 'demo-patient-001') {
        const info: DoctorAssignmentInfo = {
          isAssigned: true,
          status: 'active',
          doctorId: cleanDoctorId,
          patientId: 'demo-patient-001',
          patientName: 'Sunita Sharma',
          assignedAt: '2026-10-01T00:00:00.000Z',
          notes: 'Primary cognitive neurology oversight',
        };
        this.trackAccessedPatient('demo-patient-001');
        return info;
      }

      // Any other patient requested by demo-doctor-001 MUST be rejected!
      return {
        isAssigned: false,
        status: 'none',
        doctorId: cleanDoctorId,
        patientId: effectivePatientId,
        patientName: 'Unauthorized Patient',
      };
    }

    // Pending demo doctor (only in local demo mode)
    if (isDemoAllowed && cleanDoctorId === 'demo-doctor-002') {
      return {
        isAssigned: false,
        status: 'pending',
        doctorId: cleanDoctorId,
        patientId: effectivePatientId || 'demo-patient-001',
        patientName: 'Sunita Sharma',
      };
    }

    if (!isFirebaseConfigured) {
      return {
        isAssigned: false,
        status: 'none',
        doctorId: cleanDoctorId,
        patientId: effectivePatientId || '',
        patientName: 'No Patient Assigned',
      };
    }

    try {
      if (effectivePatientId) {
        const assignmentDocId = `${cleanDoctorId}_${effectivePatientId}`;
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
            doctorId: cleanDoctorId,
            patientId: effectivePatientId,
            patientName: data.patientName || (isAssigned ? 'Assigned Patient' : 'Unconfirmed Patient'),
            assignedAt: data.assignedAt,
            notes: data.notes,
          };
        }

        // Check query in doctorAssignments
        const q = query(
          collection(db, 'doctorAssignments'),
          where('doctorId', '==', cleanDoctorId),
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
            doctorId: cleanDoctorId,
            patientId: effectivePatientId,
            patientName: data.patientName || 'Assigned Patient',
            assignedAt: data.assignedAt,
            notes: data.notes,
          };
        }
      } else {
        // No targetPatientId specified: query active assignments for this doctor in Firestore
        const q = query(
          collection(db, 'doctorAssignments'),
          where('doctorId', '==', cleanDoctorId),
          where('status', '==', 'active')
        );
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          const data = querySnap.docs[0].data();
          const resolvedPatientId = data.patientId || '';
          if (resolvedPatientId) {
            this.trackAccessedPatient(resolvedPatientId);
            return {
              isAssigned: true,
              status: 'active',
              doctorId: cleanDoctorId,
              patientId: resolvedPatientId,
              patientName: data.patientName || 'Assigned Patient',
              assignedAt: data.assignedAt,
              notes: data.notes,
            };
          }
        }
      }

      return {
        isAssigned: false,
        status: 'none',
        doctorId: cleanDoctorId,
        patientId: effectivePatientId || '',
        patientName: 'No Patient Assigned',
      };
    } catch (err) {
      console.warn('[DoctorAnalyticsService] Failed to check doctor assignment:', err);
      return {
        isAssigned: false,
        status: 'none',
        doctorId: cleanDoctorId,
        patientId: effectivePatientId || '',
        patientName: 'Unable to Load Patient Assignment',
        error: err instanceof Error ? err.message : 'Failed to retrieve doctor assignment',
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
    const effectivePatientId = targetPatientId ? getEffectivePatientId({ uid: targetPatientId }) : '';
    const key = `${doctorId}_${effectivePatientId}`;

    if (!this.assignmentSubscribers.has(key)) {
      this.assignmentSubscribers.set(key, new Set());
    }
    this.assignmentSubscribers.get(key)!.add(callback);

    let unsubscribeFirestore: (() => void) | null = null;
    const isDemoAllowed = isExplicitLocalDemo();

    if (isFirebaseConfigured && (!isDemoAllowed || !doctorId.startsWith('demo-'))) {
      try {
        if (effectivePatientId) {
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
                  patientName: data.patientName || (isAssigned ? 'Assigned Patient' : 'Unconfirmed Patient'),
                  assignedAt: data.assignedAt,
                  notes: data.notes,
                });
              } else {
                callback({
                  isAssigned: false,
                  status: 'none',
                  doctorId,
                  patientId: effectivePatientId,
                  patientName: 'No Patient Assigned',
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
                patientName: 'Unable to Load Patient Assignment',
                error: err instanceof Error ? err.message : 'Snapshot listener error',
              });
            }
          );
        } else {
          this.getDoctorAssignment(doctorId).then(callback);
        }
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

  /**
   * Assigns a cognitive activity to a patient by an authorized doctor.
   * Enforces doctor-to-patient assignment validation.
   */
  public static async assignCognitiveActivity(
    doctorId: string,
    doctorName: string,
    patientId: string,
    payload: {
      gameId: string;
      gameTitle: string;
      frequency: 'daily' | 'alternate_days' | 'weekly';
      clinicalGoal?: string;
      instructions: string;
    }
  ): Promise<DoctorAssignedActivity> {
    const effectivePatientId = getEffectivePatientId({ uid: patientId });
    const assignment = await this.getDoctorAssignment(doctorId, effectivePatientId);

    if (!assignment.isAssigned) {
      throw new Error('Unauthorized: Doctor is not authorized to assign activities to this patient.');
    }

    if (!payload.gameId || !payload.gameId.trim()) {
      throw new Error('Validation Error: A supported cognitive activity must be selected.');
    }

    if (!payload.instructions || !payload.instructions.trim()) {
      throw new Error('Validation Error: Clinical instructions for the patient are required.');
    }

    const assignedActivity: DoctorAssignedActivity = {
      id: `assign_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId: effectivePatientId,
      doctorId,
      doctorName: doctorName || 'Attending Physician',
      gameId: payload.gameId,
      gameTitle: payload.gameTitle || 'Cognitive Activity',
      frequency: payload.frequency || 'daily',
      clinicalGoal: payload.clinicalGoal?.trim() || 'General cognitive stimulation',
      instructions: payload.instructions.trim(),
      assignedAt: new Date().toISOString(),
      status: 'active',
    };

    // Store in localStorage cache
    const key = `saksham_assigned_activities_${effectivePatientId}`;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key);
        const list: DoctorAssignedActivity[] = raw ? JSON.parse(raw) : [];
        list.unshift(assignedActivity);
        window.localStorage.setItem(key, JSON.stringify(list));
      }
    } catch {
      // Storage unavailable
    }

    // Persist to Firestore if configured
    if (isFirebaseConfigured && !isGuestPatient(effectivePatientId)) {
      try {
        const { setDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'users', effectivePatientId, 'assignedCognitiveActivities', assignedActivity.id);
        await setDoc(docRef, assignedActivity, { merge: true });
      } catch (err) {
        console.warn('[DoctorAnalyticsService] Cloud save failed for assigned activity, preserved locally:', err);
      }
    }

    return assignedActivity;
  }

  /**
   * Retrieves all cognitive activities assigned by doctors to this patient.
   */
  public static async getAssignedCognitiveActivities(
    doctorId: string,
    patientId: string
  ): Promise<DoctorAssignedActivity[]> {
    const effectivePatientId = getEffectivePatientId({ uid: patientId });
    const assignment = await this.getDoctorAssignment(doctorId, effectivePatientId);

    if (!assignment.isAssigned) {
      return [];
    }

    const key = `saksham_assigned_activities_${effectivePatientId}`;
    let activities: DoctorAssignedActivity[] = [];

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          activities = JSON.parse(raw);
        }
      }
    } catch {
      // Fallback
    }

    // Fallback seed for demo if empty and demo allowed
    const isDemoAllowed = isExplicitLocalDemo();
    if (isDemoAllowed && activities.length === 0 && effectivePatientId === 'demo-patient-001') {
      activities = [
        {
          id: 'demo-assign-001',
          patientId: 'demo-patient-001',
          doctorId: 'demo-doctor-001',
          doctorName: 'Dr. Raman Verma',
          gameId: 'game-matching',
          gameTitle: 'Card Matching Game',
          frequency: 'daily',
          clinicalGoal: 'Visual-spatial working memory retention',
          instructions: 'Practice finding matching pairs peacefully each morning after tea.',
          assignedAt: '2026-10-28T09:30:00.000Z',
          status: 'active',
        },
      ];
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, JSON.stringify(activities));
        }
      } catch {
        // Storage unavailable
      }
    }

    return activities;
  }
}
