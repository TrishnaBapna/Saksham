/**
 * SAKSHAM — STAGE 3 PHASE B: ADAPTIVE PERSONALIZED SUPPORT ENGINE
 * Domain types, observation schemas, proposals, and lifecycle states.
 * 100% Spark Free Plan compliant — strictly non-diagnostic.
 */

export type AdaptationDomain =
  | 'game_difficulty'
  | 'game_pacing'
  | 'routine_step_split'
  | 'routine_visual_aid'
  | 'routine_single_step_focus'
  | 'routine_rest_break';

export type AdaptationStatus =
  | 'observation_recorded'
  | 'recommendation_generated'
  | 'awaiting_approval'
  | 'accepted'
  | 'activated'
  | 'declined'
  | 'reverted';

export interface AdaptationObservation {
  id: string;
  patientId: string;
  activityId: string;
  activityTitle: string;
  activityType: 'game' | 'routine';
  timestamp: string; // ISO 8601
  sessionId: string;
  assistanceRequested: boolean;
  hintsUsedCount: number;
  repeatedInstructionCount: number;
  completionStatus: 'completed' | 'abandoned' | 'paused' | 'incomplete';
  pauseCount: number;
  durationSeconds: number;
  isInterrupted: boolean;
  currentLevel: string | Record<string, any>;
  notes?: string;
  patientFeedback?: string;
}

export interface CareAdaptationProposal {
  id: string;
  patientId: string;
  activityId: string;
  activityTitle: string;
  domain: AdaptationDomain;
  previousConfig: Record<string, any>;
  proposedConfig: Record<string, any>;
  rationale: string;
  calmExplanation: {
    en: string;
    hi: string;
    mr: string;
  };
  evidenceSummary: {
    windowDays: number;
    totalSessionsObserved: number;
    struggleCount: number;
    comfortableCount: number;
    assistanceRequestCount: number;
    consecutiveCount: number;
  };
  status: AdaptationStatus;
  isClinicianPrescribed: boolean;
  prescribingDoctorId?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  activatedAt?: string;
  declinedBy?: string;
  declinedAt?: string;
  revertedBy?: string;
  revertedAt?: string;
  reversalReason?: string;
  isTemporary?: boolean;
  // Stage 3 Phase C: Patient & Caregiver Transparency Lifecycle Fields
  patientConsent?: 'accepted' | 'keep_familiar' | 'declined' | 'pending';
  patientChoiceExplanation?: string;
  explanationDisplayedAt?: string;
  patientRespondedAt?: string;
  requiresCaregiverApproval?: boolean;
  syncStatus?: 'synced' | 'local-only' | 'sync-error';
}

export interface TemporarySupportResponse {
  supportOffered: boolean;
  supportType?: 'extra_hint' | 'rest_break' | 'repeat_instruction' | 'encouragement';
  messageEn: string;
  messageHi: string;
  messageMr: string;
}

/**
 * SAKSHAM NEURO-CARE — PRIORITY 2
 * Intelligent Adaptive Routine & Ability Tracking Types
 */

export type StepExecutionState =
  | 'COMPLETED_INDEPENDENTLY'
  | 'COMPLETED_WITH_REMINDER'
  | 'COMPLETED_WITH_VERBAL_GUIDE'
  | 'COMPLETED_WITH_CAREGIVER'
  | 'SKIPPED_INTENTIONALLY'
  | 'INTERRUPTED_EXTERNAL'
  | 'NOT_ATTEMPTED'
  | 'COMPLETION_UNCERTAIN';

export type DifficultyDimension = 'remembering' | 'initiating' | 'completing';

export interface StepExecutionRecord {
  stepIndex: number;
  stepDescription: string;
  state: StepExecutionState;
  assistanceLevel: 'none' | 'visual_hint' | 'verbal_guide' | 'caregiver_prompt';
  durationSeconds: number;
  timestamp: string;
}

export interface RoutineExecutionRecord {
  id: string;
  routineId: string;
  patientId: string;
  routineTitle: string;
  scheduledTime: string;
  steps: StepExecutionRecord[];
  overallState: StepExecutionState;
  primaryDifficulty?: DifficultyDimension;
  completedAt?: string;
}

export interface AbilityDimensionScores {
  patientId: string;
  rememberingScore: number; // 0.0 to 1.0 (prospective recall of time/due)
  initiatingScore: number;  // 0.0 to 1.0 (prompt start without stalling)
  completingScore: number;  // 0.0 to 1.0 (sequence completion)
  evaluatedSessionsCount: number;
  nonDiagnosticDisclaimer: string;
  evaluatedAt: string;
}

export interface ReversibleRoutineChallenge {
  routineId: string;
  patientId: string;
  originalSteps: string[];
  challengedSteps: string[];
  isChallengeActive: boolean;
  canInstantRestore: true;
  rationale: string;
  appliedAt: string;
}
