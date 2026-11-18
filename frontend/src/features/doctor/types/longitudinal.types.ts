/**
 * SAKSHAM NEURO-CARE — STAGE 3 PHASE D
 * Longitudinal Doctor Analytics & Clinical Appointment Summary Types
 * 100% Firebase Spark Free Tier compliant — strictly non-diagnostic.
 */

import type { CognitiveConcern, ClinicalAssessmentRecord } from '../../clinical/types/concern.types';

export type TimelineEventCategory =
  | 'routine'
  | 'game'
  | 'adaptive'
  | 'caregiver_note'
  | 'cognitive_concern'
  | 'clinical_assessment';

export type EventSource =
  | 'patient-reported'
  | 'caregiver-reported'
  | 'system-recorded'
  | 'doctor-recorded';

export interface TimelineEvent {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO 8601
  category: TimelineEventCategory;
  title: string;
  description: string;
  source: EventSource;
  status?: string;
  isInterrupted?: boolean;
  assistanceRequested?: boolean;
  metadata?: {
    durationSeconds?: number;
    hintsUsed?: number;
    pauseCount?: number;
    attemptsUsed?: number;
    difficulty?: string;
    pacing?: string;
    domain?: string;
    patientFeedback?: string;
    patientConsent?: string;
    authorName?: string;
    scheduledTime?: string;
    [key: string]: any;
  };
}

export interface LongitudinalMetrics {
  reportingPeriod: {
    startDate: string;
    endDate: string;
    label: string;
  };
  routineParticipation: {
    totalScheduled: number;
    completedCount: number;
    incompleteCount: number;
    recordedDaysCount: number;
    completionRatePercent: number;
  };
  cognitiveActivities: {
    totalSessions: number;
    completedSessions: number;
    interruptedSessions: number;
    totalHintsUsed: number;
    totalPauses: number;
    averageDurationSeconds: number;
  };
  adaptiveHistory: {
    totalProposals: number;
    acceptedCount: number;
    declinedCount: number;
    revertedCount: number;
    activeChangesCount: number;
  };
  assistancePatterns: {
    totalAssistedEvents: number;
    routineCueEscalations: number;
    gameAssistanceRequests: number;
  };
  dataLimitations: string[];
  hasSufficientData: boolean;
}

export type SummaryCategory =
  | 'routines'
  | 'games'
  | 'adaptive'
  | 'caregiver_notes'
  | 'concerns'
  | 'clinical_assessments';

export interface AppointmentSummary {
  id: string;
  patientId: string;
  patientName: string;
  generatedAt: string; // ISO 8601
  generatedBy: {
    id: string;
    name: string;
    role: 'doctor' | 'caregiver' | 'patient';
  };
  reportingPeriod: {
    startDate: string;
    endDate: string;
    label: string;
  };
  includedCategories: SummaryCategory[];
  caregiverQuestions: string[];
  metrics: LongitudinalMetrics;
  timeline: TimelineEvent[];
  disclaimer: string;
  sharedConcerns?: CognitiveConcern[];
  clinicalAssessments?: ClinicalAssessmentRecord[];
  acuteConcernsFlag?: boolean;
  patientPreferencesSummary?: {
    preferredPacing?: string;
    preferenceNotes?: string;
  };
}

export interface GenerateSummaryOptions {
  startDate: string;
  endDate: string;
  label?: string;
  authorId: string;
  authorName: string;
  authorRole: 'doctor' | 'caregiver' | 'patient';
  includedCategories?: SummaryCategory[];
  caregiverQuestions?: string[];
}
