/**
 * Saksham Doctor Analytics Service
 * Milestone 7.4.3: Doctor Longitudinal Behavioral Activity & Adherence Portal
 */

import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import { RoutineService } from '../../routines/services/routineService.js';
import { GamesService } from '../../games/services/gamesService.js';
import { AdaptiveDifficultyService } from '../../games/services/adaptiveDifficultyService.js';
import { GameDifficulty, GamePacing } from '../../../types/index.js';
import { getEffectivePatientId } from '../../auth/services/identityService.js';

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
  adherencePercentage: number;
  recordedDaysCount: number;
  dailyTrend: DayAdherenceEntry[];
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
  /**
   * Helper to format Date into YYYY-MM-DD
   */
  public static toDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calculate 30-day date boundary [today - 29 days, today]
   */
  public static get30DayRange(): { startDate: string; endDate: string; dates: string[] } {
    const today = new Date();
    const dates: string[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(this.toDateString(d));
    }

    return {
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      dates,
    };
  }

  /**
   * Verifies active doctor-patient assignment from Firestore or verified demo setup
   */
  public static async getDoctorAssignment(
    doctorId: string,
    targetPatientId: string = 'demo-patient-001'
  ): Promise<DoctorAssignmentInfo> {
    const effectivePatientId = getEffectivePatientId({ uid: targetPatientId });

    // Prototype / Demo role mapping
    if (doctorId === 'demo-doctor-001') {
      return {
        isAssigned: true,
        status: 'active',
        doctorId,
        patientId: effectivePatientId,
        patientName: 'Sunita Sharma',
        assignedAt: '2026-10-01T00:00:00.000Z',
        notes: 'Primary cognitive neurology oversight',
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
        return {
          isAssigned: status === 'active',
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
   * Computes 30-day routine adherence metrics from authentic recorded data.
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
        adherencePercentage: 0,
        recordedDaysCount: 0,
        dailyTrend: [],
        message: 'Doctor is not actively assigned to this patient in doctorAssignments.',
      };
    }

    const effectiveId = getEffectivePatientId({ uid: patientId });

    // Pull authentic history records (cloud sync with local fallback)
    let history = await RoutineService.syncHistoryFromFirestore(effectiveId);
    if (!history || history.length === 0) {
      history = RoutineService.getHistory(effectiveId);
    }

    // Filter to last 30 days
    const windowRecords = history.filter((r) => r.date >= startDate && r.date <= endDate);

    if (windowRecords.length === 0) {
      return {
        isAuthorized: true,
        status: 'no-records',
        startDate,
        endDate,
        totalRecordedTasks: 0,
        completedTasks: 0,
        adherencePercentage: 0,
        recordedDaysCount: 0,
        dailyTrend: dates.map((d) => ({
          date: d,
          dayLabel: new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          completedCount: 0,
          totalCount: 0,
          status: 'no-data',
        })),
        message: 'No routine activity records found in the last 30 days.',
      };
    }

    // De-duplicate multiple attempts on same day for same routine:
    // key: `${date}_${routineId}`
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
    const adherencePercentage =
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
      adherencePercentage,
      recordedDaysCount,
      dailyTrend,
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
