/**
 * SAKSHAM NEURO-CARE — PHASE 3.3
 * FAMILIARITY-PRESERVING ADAPTIVE DAILY LIVING INTELLIGENCE
 * Task-Step Pattern Learning, Repeated Difficulty Detection & Reversible Challenges
 * 100% Spark Free Plan compliant — strictly non-diagnostic.
 */

export type StepInteractionState =
  | 'INDEPENDENT'
  | 'HINT_USED'
  | 'ASSISTED'
  | 'PARTIAL'
  | 'SKIPPED'
  | 'UNCERTAIN'
  | 'RESTED'
  | 'NOT_ATTEMPTED';

export interface StepTelemetry {
  stepIndex: number;
  stepTitle: string;
  state: StepInteractionState;
  hintTierUsed: 0 | 1 | 2 | 3; // 0: none, 1: orientation, 2: context, 3: action
  assistanceRequested: boolean;
  durationSeconds: number;
  timestamp: string;
}

export interface TaskInitiationTelemetry {
  scheduledTime: string;
  openedAt: string;
  delayMinutes: number;
  isInitiationDelayed: boolean; // true if opened > 30 mins after scheduled
  initiationReason?: 'forgot' | 'resting' | 'busy' | 'needed_caregiver' | 'on_time';
}

export type StepPatternClassification =
  | 'mastered'          // Consistently independent (>= 80% independent, 0 hints across >= 3 attempts)
  | 'familiar'          // Comfortable, occasional hint
  | 'frequent_hint'     // Repeatedly needs hints on this specific step (>= 50% hint usage)
  | 'assistance_needed' // Repeatedly needs caregiver assistance (>= 50% assisted)
  | 'variable'          // Mixed performance
  | 'insufficient_data'; // < 3 attempts recorded

export interface StepPerformancePattern {
  stepIndex: number;
  stepTitle: string;
  totalAttempts: number;
  independentCount: number;
  hintCount: number;
  assistedCount: number;
  skippedCount: number;
  averageDurationSeconds: number;
  highestHintTierSeen: 0 | 1 | 2 | 3;
  classification: StepPatternClassification;
  confidence: number; // 0.0 to 1.0 (scales with attempt count)
  lastObservedAt: string;
}

export interface StepSimplificationProposal {
  id: string;
  routineId: string;
  routineTitle: string;
  stepIndex: number;
  originalStepText: string;
  proposedMicroActions: string[];
  contextualCue: string;
  rationale: string;
  status: 'proposed' | 'accepted' | 'declined' | 'reverted';
  createdAt: string;
  reviewedBy?: 'caregiver' | 'clinician';
  reviewedAt?: string;
  reviewNotes?: string;
  nonDiagnosticDisclaimer: string;
}

export interface FamiliarityPreservingChallengeProposal {
  id: string;
  routineId: string;
  routineTitle: string;
  stepIndex: number;
  stepTitle: string;
  challengeType: 'recall_next_step' | 'recall_item_location' | 'reduced_prompt';
  promptQuestion: string;
  revealedStepText: string;
  safetyExemptReason?: string;
  isSafetyLocked: boolean; // If true, challenge is blocked because step is safety-critical
  status: 'available' | 'in_progress' | 'completed' | 'declined' | 'reverted';
  createdAt: string;
  reviewedBy?: 'patient' | 'caregiver';
  reviewedAt?: string;
  nonDiagnosticDisclaimer: string;
}

export interface RoutineStepHistoryRecord {
  id: string;
  patientId: string;
  routineId: string;
  routineTitle: string;
  date: string;
  initiation: TaskInitiationTelemetry;
  stepTelemetry: StepTelemetry[];
  overallState: StepInteractionState;
  completedAt: string;
}

export interface DyadicModificationRecord {
  id: string;
  patientId: string;
  actor: 'patient' | 'caregiver' | 'clinician';
  timestamp: string;
  modificationType:
    | 'proposal_accepted'
    | 'proposal_declined'
    | 'proposal_reverted'
    | 'challenge_allowed'
    | 'challenge_declined'
    | 'challenge_restored_by_patient';
  targetId: string;
  routineId: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
}

