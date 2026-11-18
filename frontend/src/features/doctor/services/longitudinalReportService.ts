/**
 * SAKSHAM NEURO-CARE — STAGE 3 PHASE D
 * Longitudinal Doctor Analytics & Clinical Appointment Summary Service
 * Aggregates multi-source longitudinal activity with strict source attribution,
 * zero diagnostic inference, and 100% Firebase Spark Free Tier compliance.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import { RoutineService } from '../../routines/services/routineService.js';
import { GamesService } from '../../games/services/gamesService.js';
import { AdaptiveSupportService } from '../../adaptive/services/adaptiveSupportService.js';
import { DoctorAnalyticsService } from './doctorAnalyticsService.js';
import { CaregiverService } from '../../caregiver/services/caregiverService.js';
import { CognitiveConcernService } from '../../clinical/services/cognitiveConcernService.js';
import {
  TimelineEvent,
  LongitudinalMetrics,
  AppointmentSummary,
  GenerateSummaryOptions,
  SummaryCategory,
} from '../types/longitudinal.types.js';
import { getEffectivePatientId, isGuestPatient } from '../../auth/services/identityService.js';

export const MANDATORY_CLINICAL_DISCLAIMER =
  'CLINICAL TRANSPARENCY NOTICE: This summary compiles objective observational and functional activity records (routine completions, assisted recall cues, game attempts, and caregiver observations). It does NOT constitute a clinical diagnosis of Alzheimer\'s disease or dementia stages, does not make claims of medical improvement or deterioration, and must not replace professional medical judgment.';

export const PRIVACY_EXCLUSION_NOTICE =
  'Privacy Notice: Personal photographs, Loved Ones contact information, Personal Memory Graph nodes, GPS locations, and conversational chat transcripts are excluded from this clinical summary.';

export interface CaregiverNote {
  id: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO 8601
  authorName: string;
  authorId: string;
  category: 'routine' | 'behavior' | 'sleep' | 'communication' | 'general';
  content: string;
}

export class LongitudinalReportService {
  private static getNotesKey(patientId: string): string {
    return `saksham_caregiver_notes_${patientId}`;
  }

  private static getReportsKey(patientId: string): string {
    return `saksham_appointment_summaries_${patientId}`;
  }

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // storage disabled
    }
    return null;
  }

  private static safeSetItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // storage disabled
    }
  }

  /**
   * Save a caregiver observation note (local cache + optional Firestore sync)
   */
  public static async recordCaregiverNote(
    patientId: string,
    note: Omit<CaregiverNote, 'id' | 'timestamp'>
  ): Promise<CaregiverNote> {
    const effectivePatientId = getEffectivePatientId({ uid: patientId });
    const fullNote: CaregiverNote = {
      ...note,
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patientId: effectivePatientId,
      timestamp: new Date().toISOString(),
    };

    const existing = this.getCaregiverNotes(effectivePatientId);
    existing.unshift(fullNote);
    this.safeSetItem(this.getNotesKey(effectivePatientId), JSON.stringify(existing));

    if (isFirebaseConfigured && !isGuestPatient(effectivePatientId)) {
      try {
        const docRef = doc(db, 'users', effectivePatientId, 'caregiverNotes', fullNote.id);
        await setDoc(docRef, fullNote);
      } catch (err) {
        console.warn('[LongitudinalReportService] Failed to save note to Firestore:', err);
      }
    }

    return fullNote;
  }

  /**
   * Get recorded caregiver notes for a patient
   */
  public static getCaregiverNotes(patientId: string): CaregiverNote[] {
    const effectivePatientId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getNotesKey(effectivePatientId));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Verifies authorization before fetching data or compiling report.
   * - Doctors must be actively assigned.
   * - Caregivers must have an active care relationship.
   * - Patients access their own data.
   */
  public static async verifyAccess(
    patientId: string,
    accessorId: string,
    accessorRole: 'doctor' | 'caregiver' | 'patient'
  ): Promise<{ isAuthorized: boolean; message?: string }> {
    const effectivePatientId = getEffectivePatientId({ uid: patientId });

    if (accessorRole === 'patient') {
      const isOwner = accessorId === effectivePatientId;
      return {
        isAuthorized: isOwner,
        message: isOwner ? undefined : 'Patients can only access their own clinical records.',
      };
    }

    if (accessorRole === 'doctor') {
      const assignment = await DoctorAnalyticsService.getDoctorAssignment(
        accessorId,
        effectivePatientId
      );
      return {
        isAuthorized: assignment.isAssigned,
        message: assignment.isAssigned
          ? undefined
          : 'Clinical access denied: Doctor is not actively assigned to this patient.',
      };
    }

    if (accessorRole === 'caregiver') {
      const conn = await CaregiverService.getConnectedPatient(accessorId);
      const isConnected =
        conn.relationshipStatus === 'active' && conn.patientId === effectivePatientId;
      return {
        isAuthorized: isConnected,
        message: isConnected
          ? undefined
          : 'Caregiver access denied: No active care link established for this patient.',
      };
    }

    return { isAuthorized: false, message: 'Unauthorized role.' };
  }

  /**
   * Collects and sorts chronological events between startDate and endDate (inclusive, YYYY-MM-DD).
   * Strict source attribution applied to each event.
   */
  public static async getTimelineEvents(
    patientId: string,
    startDate: string,
    endDate: string,
    options?: { includedCategories?: SummaryCategory[] }
  ): Promise<TimelineEvent[]> {
    const effectivePatientId = getEffectivePatientId({ uid: patientId });
    const included = options?.includedCategories || [
      'routines',
      'games',
      'adaptive',
      'caregiver_notes',
      'concerns',
      'clinical_assessments',
    ];

    const events: TimelineEvent[] = [];

    // Helper: is in range
    const inRange = (dateStr?: string) => {
      if (!dateStr || typeof dateStr !== 'string') return false;
      const d = dateStr.substring(0, 10);
      return d >= startDate && d <= endDate;
    };

    // 1. Daily Routines & Attempts
    if (included.includes('routines')) {
      const routineHistory = RoutineService.getHistory(effectivePatientId);
      const routines = RoutineService.getRoutines(effectivePatientId);
      const routineMap = new Map(routines.map((r) => [r.id, r]));

      for (const record of routineHistory) {
        if (!inRange(record.date)) continue;
        const routine = routineMap.get(record.routineId);
        const title = routine?.title || `Routine (${record.routineId})`;
        const attemptsUsed = record.attemptsUsed || 1;
        const isCompleted = record.isCompleted !== false && (record as any).completed !== false;

        events.push({
          id: `timeline-routine-${record.routineId}-${record.date}-${attemptsUsed}`,
          date: record.date,
          timestamp: record.createdAt || (record as any).timestamp || `${record.date}T12:00:00Z`,
          category: 'routine',
          title,
          description: isCompleted
            ? `Completed successfully using ${attemptsUsed} assisted recall ${
                attemptsUsed === 1 ? 'cue' : 'cues'
              }.`
            : `Attempt recorded without full task completion.`,
          source: 'patient-reported',
          status: isCompleted ? 'completed' : 'incomplete',
          isInterrupted: !isCompleted,
          assistanceRequested: attemptsUsed > 1,
          metadata: {
            attemptsUsed,
            scheduledTime: routine?.scheduledTime,
            category: routine?.category,
          },
        });
      }
    }

    // 2. Cognitive Games & Activities
    if (included.includes('games')) {
      const gameSessions = GamesService.getHistory(effectivePatientId);
      for (const session of gameSessions) {
        if (!inRange(session.date)) continue;
        const hints = session.hintsUsed || 0;
        const pauses = session.pauseCount || 0;
        const isInterrupted = session.isInterrupted === true || !session.completed;

        events.push({
          id: `timeline-game-${session.id}`,
          date: session.date,
          timestamp: session.completedAt || `${session.date}T12:00:00Z`,
          category: 'game',
          title: session.gameTitle,
          description: isInterrupted
            ? `Session paused or incomplete after ${Math.round(session.durationSeconds)}s (${pauses} ${
                pauses === 1 ? 'pause' : 'pauses'
              }, ${hints} ${hints === 1 ? 'hint' : 'hints'} used).`
            : `Completed in ${Math.round(session.durationSeconds)}s on ${session.difficulty} difficulty${
                session.patientFeedback ? ` (Patient noted: "${session.patientFeedback}")` : ''
              }.`,
          source: session.patientFeedback ? 'patient-reported' : 'system-recorded',
          status: isInterrupted ? 'interrupted' : 'completed',
          isInterrupted,
          assistanceRequested: hints > 0,
          metadata: {
            durationSeconds: session.durationSeconds,
            hintsUsed: hints,
            pauseCount: pauses,
            difficulty: session.difficulty,
            pacing: session.pacing,
            patientFeedback: session.patientFeedback,
          },
        });
      }
    }

    // 3. Adaptive Adjustments & Support History
    if (included.includes('adaptive')) {
      const proposals = AdaptiveSupportService.getProposals(effectivePatientId);
      for (const p of proposals) {
        const createdDate = p.createdAt.substring(0, 10);
        if (!inRange(createdDate)) continue;

        let desc = p.rationale;
        let source: 'patient-reported' | 'caregiver-reported' | 'system-recorded' =
          'system-recorded';

        if (p.patientConsent === 'keep_familiar') {
          desc = `Patient requested to keep familiar setting. Rationale: ${p.rationale}`;
          source = 'patient-reported';
        } else if (p.patientConsent === 'accepted') {
          desc = `Patient accepted calmer pacing. Rationale: ${p.rationale}`;
          source = 'patient-reported';
        } else if (p.revertedBy) {
          desc = `Caregiver reverted adjustment (${p.reversalReason || 'Preference'}). Rationale: ${p.rationale}`;
          source = 'caregiver-reported';
        }

        events.push({
          id: `timeline-adaptive-${p.id}`,
          date: createdDate,
          timestamp: p.createdAt,
          category: 'adaptive',
          title: `Support Adjustment: ${p.activityTitle}`,
          description: desc,
          source,
          status: p.status,
          metadata: {
            domain: p.domain,
            patientConsent: p.patientConsent,
            status: p.status,
            reversalReason: p.reversalReason,
          },
        });
      }
    }

    // 4. Caregiver Notes & Observations
    if (included.includes('caregiver_notes')) {
      const notes = this.getCaregiverNotes(effectivePatientId);
      for (const note of notes) {
        if (!inRange(note.date)) continue;
        events.push({
          id: `timeline-note-${note.id}`,
          date: note.date,
          timestamp: note.timestamp,
          category: 'caregiver_note',
          title: `Caregiver Note: ${note.category.toUpperCase()}`,
          description: note.content,
          source: 'caregiver-reported',
          metadata: {
            authorName: note.authorName,
            authorId: note.authorId,
          },
        });
      }
    }

    // 5. Shared Cognitive & Functional Concerns
    // Product Owner Decision 3: Strictly include concerns where sharedWithDoctor === true
    if (included.includes('concerns')) {
      const concerns = await CognitiveConcernService.getConcerns(effectivePatientId);
      for (const c of concerns) {
        if (!inRange(c.recordedAt)) continue;
        if (!c.sharedWithDoctor) continue; // Respect privacy consent boundary

        events.push({
          id: `timeline-concern-${c.id}`,
          date: c.recordedAt.substring(0, 10),
          timestamp: c.recordedAt,
          category: 'cognitive_concern',
          title: `Reported Concern: ${c.category.replace('_', ' ').toUpperCase()}`,
          description: `${c.description}${c.contextNotes ? ` (Context: ${c.contextNotes})` : ''}`,
          source: c.perspective === 'patient' ? 'patient-reported' : 'caregiver-reported',
          status: c.status,
          assistanceRequested: c.hasAcuteIndicators,
          metadata: {
            category: c.category,
            perspective: c.perspective,
            status: c.status,
            sharedWithDoctor: c.sharedWithDoctor,
            hasAcuteIndicators: c.hasAcuteIndicators,
            authorName: c.recordedByName,
          },
        });
      }
    }

    // 6. Clinician-Administered Formal Assessment Records
    // Product Owner Decision 2: Strictly external clinical assessments recorded by authorized doctor
    if (included.includes('clinical_assessments')) {
      const assessments = await CognitiveConcernService.getClinicalAssessments(effectivePatientId);
      for (const a of assessments) {
        if (!inRange(a.administrationDate)) continue;

        events.push({
          id: `timeline-assessment-${a.id}`,
          date: a.administrationDate,
          timestamp: a.recordedAt,
          category: 'clinical_assessment',
          title: `Clinical Assessment: ${a.assessmentName}${
            a.totalScore !== undefined ? ` (Score: ${a.totalScore}${a.maxScore ? `/${a.maxScore}` : ''})` : ''
          }`,
          description: `Administered externally by ${a.doctorName}. ${
            a.scoreClassification ? `Classification: ${a.scoreClassification}. ` : ''
          }${a.qualitativeSummary}`,
          source: 'doctor-recorded',
          status: 'completed',
          metadata: {
            assessmentName: a.assessmentName,
            doctorName: a.doctorName,
            language: a.language,
            totalScore: a.totalScore,
            maxScore: a.maxScore,
            scoreClassification: a.scoreClassification,
            qualitativeSummary: a.qualitativeSummary,
            administeredExternally: true,
          },
        });
      }
    }

    // Sort chronologically (newest first)
    events.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    return events;
  }

  /**
   * Computes longitudinal metrics across the specified window.
   * Strict adherence to objective observations; zero clinical diagnostic conclusions.
   */
  public static async calculateMetrics(
    patientId: string,
    startDate: string,
    endDate: string,
    label: string = 'Custom Period'
  ): Promise<LongitudinalMetrics> {
    const effectivePatientId = getEffectivePatientId({ uid: patientId });

    const timeline = await this.getTimelineEvents(effectivePatientId, startDate, endDate);

    // 1. Routine Participation
    const routineEvents = timeline.filter((e) => e.category === 'routine');
    const recordedDaysSet = new Set(routineEvents.map((e) => e.date));
    const completedRoutines = routineEvents.filter((e) => e.status === 'completed');
    const incompleteRoutines = routineEvents.filter((e) => e.status !== 'completed');
    const totalScheduled = routineEvents.length;
    const completionRatePercent =
      totalScheduled > 0 ? Math.round((completedRoutines.length / totalScheduled) * 100) : 0;

    // 2. Cognitive Activities
    const gameEvents = timeline.filter((e) => e.category === 'game');
    const completedGames = gameEvents.filter((e) => !e.isInterrupted && e.status === 'completed');
    const interruptedGames = gameEvents.filter((e) => e.isInterrupted || e.status !== 'completed');
    const totalHints = gameEvents.reduce((acc, e) => acc + (e.metadata?.hintsUsed || 0), 0);
    const totalPauses = gameEvents.reduce((acc, e) => acc + (e.metadata?.pauseCount || 0), 0);
    const totalDuration = gameEvents.reduce(
      (acc, e) => acc + (e.metadata?.durationSeconds || 0),
      0
    );
    const avgDuration = gameEvents.length > 0 ? Math.round(totalDuration / gameEvents.length) : 0;

    // 3. Adaptive History
    const adaptiveEvents = timeline.filter((e) => e.category === 'adaptive');
    const acceptedAdaptive = adaptiveEvents.filter(
      (e) =>
        e.status === 'accepted' ||
        e.status === 'approved' ||
        e.status === 'activated' ||
        e.metadata?.patientConsent === 'accepted'
    );
    const declinedAdaptive = adaptiveEvents.filter(
      (e) =>
        e.status === 'declined' ||
        e.metadata?.patientConsent === 'declined' ||
        e.metadata?.patientConsent === 'keep_familiar'
    );
    const revertedAdaptive = adaptiveEvents.filter((e) => e.status === 'reverted');
    const activeChangesCount = acceptedAdaptive.length - revertedAdaptive.length;

    // 4. Assistance Patterns
    const routineCues = routineEvents.filter((e) => (e.metadata?.attemptsUsed || 0) > 1).length;
    const gameAssists = gameEvents.filter((e) => (e.metadata?.hintsUsed || 0) > 0).length;
    const totalAssistedEvents = routineCues + gameAssists;

    // 5. Data Limitations & Sufficient Data Check
    const totalEventsCount = timeline.length;
    const hasSufficientData = totalEventsCount >= 2;
    const dataLimitations: string[] = [];

    if (!hasSufficientData) {
      dataLimitations.push(
        'Not enough recorded information to show a reliable pattern across the selected timeframe (fewer than 2 records found).'
      );
    }
    dataLimitations.push(
      'Missing activity records on any calendar day are treated as unrecorded, not task failures.'
    );
    dataLimitations.push(
      'Patient assistance metrics reflect interface scaffolding requests and do not constitute cognitive impairment markers.'
    );

    return {
      reportingPeriod: {
        startDate,
        endDate,
        label,
      },
      routineParticipation: {
        totalScheduled,
        completedCount: completedRoutines.length,
        incompleteCount: incompleteRoutines.length,
        recordedDaysCount: recordedDaysSet.size,
        completionRatePercent,
      },
      cognitiveActivities: {
        totalSessions: gameEvents.length,
        completedSessions: completedGames.length,
        interruptedSessions: interruptedGames.length,
        totalHintsUsed: totalHints,
        totalPauses: totalPauses,
        averageDurationSeconds: avgDuration,
      },
      adaptiveHistory: {
        totalProposals: adaptiveEvents.length,
        acceptedCount: acceptedAdaptive.length,
        declinedCount: declinedAdaptive.length,
        revertedCount: revertedAdaptive.length,
        activeChangesCount: Math.max(0, activeChangesCount),
      },
      assistancePatterns: {
        totalAssistedEvents,
        routineCueEscalations: routineCues,
        gameAssistanceRequests: gameAssists,
      },
      dataLimitations,
      hasSufficientData,
    };
  }

  /**
   * Generates a complete clinical appointment summary brief.
   */
  public static async generateAppointmentSummary(
    patientId: string,
    patientName: string,
    options: GenerateSummaryOptions
  ): Promise<AppointmentSummary> {
    const effectivePatientId = getEffectivePatientId({ uid: patientId });
    const includedCategories = options.includedCategories || [
      'routines',
      'games',
      'adaptive',
      'caregiver_notes',
      'concerns',
      'clinical_assessments',
    ];

    const timeline = await this.getTimelineEvents(
      effectivePatientId,
      options.startDate,
      options.endDate,
      { includedCategories }
    );

    const metrics = await this.calculateMetrics(
      effectivePatientId,
      options.startDate,
      options.endDate,
      options.label || 'Custom Period'
    );

    // Fetch shared cognitive concerns (strictly sharedWithDoctor === true)
    let sharedConcerns = undefined;
    let acuteConcernsFlag = false;
    if (includedCategories.includes('concerns')) {
      const allConcerns = await CognitiveConcernService.getConcerns(effectivePatientId);
      const inRangeConcerns = allConcerns.filter((c) => {
        const d = c.recordedAt.substring(0, 10);
        return d >= options.startDate && d <= options.endDate && c.sharedWithDoctor === true;
      });
      sharedConcerns = inRangeConcerns;
      acuteConcernsFlag = inRangeConcerns.some((c) => c.hasAcuteIndicators === true);
    }

    // Fetch clinician assessment records
    let clinicalAssessments = undefined;
    if (includedCategories.includes('clinical_assessments')) {
      const allAssessments = await CognitiveConcernService.getClinicalAssessments(effectivePatientId);
      clinicalAssessments = allAssessments.filter((a) => {
        return a.administrationDate >= options.startDate && a.administrationDate <= options.endDate;
      });
    }

    // Patient preferences summary from adaptive state
    const adaptiveProposals = AdaptiveSupportService.getProposals(effectivePatientId);
    const familiarCount = adaptiveProposals.filter(
      (p) => p.patientConsent === 'keep_familiar'
    ).length;
    const acceptedCount = adaptiveProposals.filter((p) => p.patientConsent === 'accepted').length;

    let preferenceNotes = 'Patient has not stated specific pacing preferences.';
    if (familiarCount > acceptedCount) {
      preferenceNotes =
        'Patient consistently expressed a preference to maintain familiar routine patterns rather than introducing changes.';
    } else if (acceptedCount > 0) {
      preferenceNotes =
        'Patient expressed comfort with calmer step pacing and gentle visual cues.';
    }

    const summary: AppointmentSummary = {
      id: `summary-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patientId: effectivePatientId,
      patientName,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        id: options.authorId,
        name: options.authorName,
        role: options.authorRole,
      },
      reportingPeriod: {
        startDate: options.startDate,
        endDate: options.endDate,
        label: options.label || 'Reporting Period',
      },
      includedCategories,
      caregiverQuestions: options.caregiverQuestions || [],
      metrics,
      timeline,
      disclaimer: MANDATORY_CLINICAL_DISCLAIMER,
      sharedConcerns,
      clinicalAssessments,
      acuteConcernsFlag,
      patientPreferencesSummary: {
        preferredPacing: familiarCount > acceptedCount ? 'Familiar baseline' : 'Gentle / Calmer',
        preferenceNotes,
      },
    };

    return summary;
  }

  /**
   * Saves a generated appointment summary to localStorage and Firestore.
   */
  public static async saveAppointmentSummary(summary: AppointmentSummary): Promise<void> {
    const effectivePatientId = getEffectivePatientId({ uid: summary.patientId });
    const summaries = this.getStoredAppointmentSummaries(effectivePatientId);
    summaries.unshift(summary);
    this.safeSetItem(this.getReportsKey(effectivePatientId), JSON.stringify(summaries));

    if (isFirebaseConfigured && !isGuestPatient(effectivePatientId)) {
      try {
        const docRef = doc(
          db,
          'users',
          effectivePatientId,
          'longitudinalReports',
          summary.id
        );
        await setDoc(docRef, summary);
      } catch (err) {
        console.warn('[LongitudinalReportService] Failed to save report to Firestore:', err);
      }
    }
  }

  /**
   * Retrieves previously saved appointment summaries.
   */
  public static getStoredAppointmentSummaries(patientId: string): AppointmentSummary[] {
    const effectivePatientId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getReportsKey(effectivePatientId));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
}
