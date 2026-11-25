/**
 * SAKSHAM NEURO-CARE — PHASE 3.9
 * UNIFIED PATIENT CONTEXT & ASHA INTELLIGENCE TYPES
 *
 * Implements:
 * 1. Typed provenance tracking for every piece of patient context (source, author, timestamp, sharing status, freshness, permission decision).
 * 2. Complete integration across TaskLifecycle, StepPatterns, RoutineSessions, CognitiveConcerns, LovedOnes, and ItemMemory.
 * 3. Explicit communication personalisation dimensions (dementia-safe, reversible, non-diagnostic).
 * 4. Runtime offline and local inference availability flags.
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, resident local processing).
 */

import { DailyTaskInstance } from '../../routines/types/taskLifecycle.types.js';
import { StepInteractionState, StepPatternClassification, StepSimplificationProposal } from '../../routines/types/stepPattern.types.js';
import { CognitiveConcern } from '../../clinical/types/concern.types.js';
import { LovedOne } from '../../../types/index.js';

export type ContextSharingStatus =
  | 'patient_private'     // Confidential to the patient only
  | 'caregiver_shared'    // Visible to patient & authorized connected caregiver
  | 'doctor_consented'    // Consented for clinician appointment sharing
  | 'clinical_only'       // Doctor-recorded formal clinical assessment (NEVER in patient chat)
  | 'system_internal';    // Runtime diagnostics & telemetry

export type ContextFreshness =
  | 'live_active'         // Immediate in-progress session / live sensor
  | 'today'               // Recorded on today's calendar date
  | 'recent_14d'          // Rolling 14-day analytical window
  | 'historical'          // Archived or past records
  | 'stale';              // Expired or invalidated

export type PermissionDecision =
  | 'authorized_for_asha' // Permitted to ground Asha conversational responses
  | 'redacted_phi'        // De-identified / anonymized before processing
  | 'blocked_privacy'     // Excluded by patient privacy / consent policy
  | 'blocked_unassigned'; // Excluded because no verified doctor/caregiver relationship exists

export interface ContextProvenanceRecord<T> {
  data: T;
  sourceService: string;
  patientId: string;
  authorOrReporter: 'patient' | 'caregiver' | 'doctor' | 'system';
  timestamp: string; // ISO 8601
  sharingStatus: ContextSharingStatus;
  freshness: ContextFreshness;
  permissionDecision: PermissionDecision;
}

// -----------------------------------------------------------------------------
// 1. PATIENT IDENTITY & PREFERENCES
// -----------------------------------------------------------------------------
export interface AshaPersonalizationPreferences {
  // Communication Dimensions (Phase 3.9)
  responseLength: 'concise' | 'standard' | 'detailed'; // concise = 1-2 sentences
  sentenceComplexity: 'simple' | 'standard';           // simple = short clauses, plain words
  maxInstructionsPerTurn: 1 | 2;                       // default 1 for cognitive ease
  assistanceStyle: 'gentle_encouraging' | 'direct_practical' | 'calm_reassuring';
  honorificAddress?: string;                          // e.g. "Sunita Ji", "Aap" (आप)
  preferredVoice?: string;
  preferredTerminology?: 'simplified' | 'standard';

  // Reading & Visual Presentation (Phase 3.10)
  textSize: 'standard' | 'large' | 'extra-large';      // Standard 16px, Large 18.5px, XL 21px
  lineSpacing: 'standard' | 'comfortable';             // Comfortable line spacing (1.8)
  highContrast: boolean;                               // High contrast theme
  reducedVisualClutter: boolean;                       // Reduced visual clutter
  clearSectionSeparation: boolean;                     // High visibility section borders
  showIconLabels: boolean;                             // Always display text labels next to icons
  reducedAnimation: boolean;                           // Minimal UI animation
  reducedMotion: boolean;                              // WCAG reduced motion

  // Interaction (Phase 3.10)
  largeTouchTargets: boolean;                          // Minimum 48-56px interactive touch targets
  requireActionConfirmations: boolean;                 // Confirms exits and non-trivial actions
  simplifiedNavigation: boolean;                       // Simplified one-step navigation
  voiceInteractionEnabled: boolean;                    // Voice prompts enabled
  alwaysShowBackAndCancel: boolean;                    // Prominent back and cancel controls
}

export interface AshaPatientIdentityContext {
  patientId: string;
  displayName: string;
  isGuest: boolean;
  preferredLanguage: string; // 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'kn' | 'ml'
  personalization: AshaPersonalizationPreferences;
}

// -----------------------------------------------------------------------------
// 2. DAILY ROUTINES & TASK LIFECYCLE CONTEXT
// -----------------------------------------------------------------------------
export interface AshaRoutinesContext {
  todayTotal: number;
  completedCount: number;
  assistedCount: number;
  skippedCount: number;
  snoozedCount: number;
  inProgressCount: number;
  pendingCount: number;
  progressPercentage: number;
  streakCount: number;
  todayInstances: ContextProvenanceRecord<DailyTaskInstance>[];
  completedInstances: DailyTaskInstance[];
  pendingInstances: DailyTaskInstance[];
  nextScheduledTask: DailyTaskInstance | null;
  activeTask: DailyTaskInstance | null;
}

// -----------------------------------------------------------------------------
// 3. STEP-LEVEL ASSISTANCE & PATTERN INTELLIGENCE CONTEXT
// -----------------------------------------------------------------------------
export interface StepPatternObservationSummary {
  stepIndex: number;
  stepText: string;
  classification: StepPatternClassification | StepInteractionState;
  independentCount: number;
  hintCount: number;
  assistedCount: number;
  isSafetyLocked: boolean;
  hasSimplificationProposal: boolean;
  simplifiedInstruction?: string;
  isPatientRestored: boolean;
}

export interface AshaStepAssistanceContext {
  routineId?: string;
  routineTitle?: string;
  stepObservations: ContextProvenanceRecord<StepPatternObservationSummary>[];
  activeProposals: StepSimplificationProposal[];
  safetyLockedStepIndices: number[];
}

// -----------------------------------------------------------------------------
// 4. MEMORY & LOVED ONES CONTEXT
// -----------------------------------------------------------------------------
export interface AshaGroundedItemLocation {
  itemName: string;
  locationRecorded: string;
  room: string;
  recordedAt: string;
  notes?: string;
  isReliable: boolean;
}

export interface AshaMemoryContext {
  lovedOnes: ContextProvenanceRecord<LovedOne>[];
  lovedOnesCount: number;
  objectLocations: ContextProvenanceRecord<AshaGroundedItemLocation>[];
}

// -----------------------------------------------------------------------------
// 5. COGNITIVE CONCERN JOURNAL CONTEXT
// -----------------------------------------------------------------------------
export interface AshaCognitiveJournalContext {
  patientConcernsCount: number;
  caregiverConcernsCount: number;
  patientConcerns: ContextProvenanceRecord<CognitiveConcern>[];
  caregiverConcerns: ContextProvenanceRecord<CognitiveConcern>[];
  consentedDoctorConcernsCount: number;
  appointmentFlaggedCount: number;
}

// -----------------------------------------------------------------------------
// 6. ACTIVE INTERRUPTED SESSION CONTEXT
// -----------------------------------------------------------------------------
export interface AshaActiveSessionContext {
  hasActiveSession: boolean;
  sessionId?: string;
  routineId?: string;
  routineTitle?: string;
  currentStepIndex: number;
  currentStepText?: string;
  totalSteps: number;
  elapsedSeconds: number;
  isPaused: boolean;
  assistanceLevel: number;
  startedAt?: string;
  interruptedAt?: string;
}

// -----------------------------------------------------------------------------
// 7. ACTIVE RUNTIME & INFERENCE CONTEXT
// -----------------------------------------------------------------------------
export interface AshaRuntimeContext {
  isOnline: boolean;
  pendingOfflineCount: number;
  isLocalSLMAvailable: boolean;
  activeModelName: string;
  inferenceLatencyMs?: number;
  timestamp: string;
}

// -----------------------------------------------------------------------------
// 8. DYADIC CARE COORDINATION CONTEXT (Phase 3.11)
// -----------------------------------------------------------------------------
export interface AshaDyadicCoordinationContext {
  activeSupportRequestsCount: number;
  pendingProposalsCount: number;
  hasPatientVisibleHandoffs: boolean;
  discrepanciesCount: number;
  latestSupportRequest?: {
    id: string;
    requestType: string;
    title: string;
    status: string;
    responseMessage?: string;
  };
  pendingProposals: {
    id: string;
    title: string;
    proposalType: string;
    safetyStatus: string;
    authorName: string;
  }[];
  recentHandoffsSummary?: {
    shiftPeriod: string;
    shiftDate: string;
    caregiverName: string;
    assistedActivitiesCount: number;
  };
  discrepancies: {
    id: string;
    title: string;
    neutralExplanation: string;
    resolutionStatus: string;
  }[];
}

// -----------------------------------------------------------------------------
// MASTER UNIFIED PATIENT CONTEXT
// -----------------------------------------------------------------------------
export interface AshaUnifiedPatientContext {
  patientId: string;
  assembledAt: string;
  identity: AshaPatientIdentityContext;
  routines: AshaRoutinesContext;
  stepAssistance: AshaStepAssistanceContext;
  memory: AshaMemoryContext;
  journal: AshaCognitiveJournalContext;
  activeSession: AshaActiveSessionContext;
  runtime: AshaRuntimeContext;
  dyadicCoordination: AshaDyadicCoordinationContext;
  provenanceLog: ContextProvenanceRecord<any>[];
}
