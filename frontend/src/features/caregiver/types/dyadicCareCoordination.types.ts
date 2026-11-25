/**
 * SAKSHAM NEURO-CARE — PHASE 3.11
 * Dyadic Care Coordination, Shared Support, Patient Autonomy & Caregiver Collaboration Types
 *
 * Core Principles:
 * 1. Two Distinct Perspectives: Patient perspective vs. Caregiver perspective are strictly partitioned.
 * 2. Immutable Provenance: Every record preserves patientId, authorId, authorRole, timestamp, originalSource,
 *    consentState, syncState, isPatientReported, isCaregiverReported, and isIndependentlyVerified.
 * 3. Never Silently Merged: Patient reports and caregiver observations never overwrite each other into a single "fact".
 * 4. Patient Autonomy: Caregivers can propose, but only the patient can accept, decline, or defer proposals.
 * 5. Strictly Non-Diagnostic: Discrepancies are never interpreted as decline, dishonesty, or dementia worsening.
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, resident local processing).
 */

export type DyadicAuthorRole = 'patient' | 'caregiver' | 'clinician' | 'system';

export type DyadicConsentState =
  | 'private'
  | 'shared_with_caregiver'
  | 'shared_with_doctor'
  | 'revoked';

export type DyadicSyncState = 'synced' | 'pending' | 'failed';

export interface DyadicProvenanceMetadata {
  patientId: string;
  authorId: string;
  authorName: string;
  authorRole: DyadicAuthorRole;
  timestamp: string; // ISO 8601
  originalSource: string; // e.g., 'PatientSupportTray', 'CaregiverProposalModal', 'GuidedTaskRunner'
  consentState: DyadicConsentState;
  syncState: DyadicSyncState;
  isPatientReported: boolean;
  isCaregiverReported: boolean;
  isIndependentlyVerified: boolean;
}

// -----------------------------------------------------------------------------
// 1. PATIENT SUPPORT REQUESTS (Patient-Initiated Help Requests)
// -----------------------------------------------------------------------------

export type SupportRequestType =
  | 'routine_help'       // Help with steps or executing a routine
  | 'find_item'          // Help locating misplaced item
  | 'appointment_prep'   // Help formulating questions for doctor
  | 'instruction_help'   // Help clarifying a confusing instruction
  | 'household_task'     // Help with a home task
  | 'general_support';   // Reassurance or check-in request

export type SupportRequestStatus =
  | 'pending'              // Created by patient, awaiting caregiver acknowledgement
  | 'acknowledged'         // Caregiver viewed/acknowledged in-app
  | 'assistance_provided'  // Caregiver provided help and added response notes
  | 'resolved'             // Patient marked resolved/closed
  | 'cancelled';           // Patient cancelled request

export interface SupportRequest extends DyadicProvenanceMetadata {
  id: string; // req_${Date.now()}_...
  requestType: SupportRequestType;
  title: string;
  message: string;
  targetCaregiverId: string; // Authorized caregiver ID or 'any_authorized'
  targetCaregiverName: string;
  status: SupportRequestStatus;
  acknowledgedAt?: string;
  acknowledgedBy?: { caregiverId: string; caregiverName: string };
  responseMessage?: string;
  resolvedAt?: string;
  resolvedBy?: 'patient' | 'caregiver';
  cancellationReason?: string;
  relatedActivityId?: string;
  relatedActivityTitle?: string;
}

// -----------------------------------------------------------------------------
// 2. CAREGIVER PROPOSALS & PATIENT REVIEW
// -----------------------------------------------------------------------------

export type CaregiverProposalType =
  | 'routine_adjustment'     // Time adjustment, re-ordering
  | 'additional_cues'        // Adding visual cues or photo hints
  | 'step_simplification'    // Decomposing step into smaller micro-actions
  | 'reminder_timing'        // Earlier reminder, modified snooze
  | 'assistance_preference'  // Co-completion or physical guide preference
  | 'household_support';     // Environment arrangement, keeping items ready

export type CaregiverProposalStatus =
  | 'pending'    // Awaiting patient review
  | 'accepted'   // Patient explicitly accepted
  | 'declined'   // Patient declined
  | 'deferred'   // Patient chose "Review Later"
  | 'withdrawn'; // Caregiver withdrew proposal before decision

export type ProposalSafetyStatus =
  | 'safe'
  | 'safety_locked_flame'
  | 'safety_locked_medication'
  | 'clinician_prescribed_locked';

export interface CaregiverProposalDetails {
  routineId?: string;
  routineTitle?: string;
  stepIndex?: number;
  originalValue?: string;
  proposedValue?: string;
  proposedMicroActions?: string[];
  contextualCue?: string;
  timingAdjustmentMinutes?: number;
}

export interface PatientProposalDecision {
  decision: 'accepted' | 'declined' | 'deferred';
  decidedAt: string; // ISO 8601
  patientNote?: string;
}

export interface CaregiverProposal extends DyadicProvenanceMetadata {
  id: string; // prop_cg_${Date.now()}_...
  proposalType: CaregiverProposalType;
  title: string;
  summary: string;
  details: CaregiverProposalDetails;
  safetyStatus: ProposalSafetyStatus;
  status: CaregiverProposalStatus;
  patientDecision?: PatientProposalDecision;
  reviewedByPatient: boolean;
  isReversible: boolean;
  revertedAt?: string;
  revertedBy?: 'patient' | 'caregiver';
}

// -----------------------------------------------------------------------------
// 3. CAREGIVER SHIFT HANDOFF & CONTINUITY
// -----------------------------------------------------------------------------

export type HandoffShiftPeriod = 'morning' | 'afternoon' | 'evening' | 'full_day';

export interface AssistedActivityRecord {
  activityId: string;
  activityTitle: string;
  assistanceType: 'verbal_cue' | 'physical_guide' | 'co_completion' | 'setup_only';
  note?: string;
}

export interface CaregiverHandoffEditRecord {
  editedAt: string;
  editorId: string;
  changesSummary: string;
}

export interface CaregiverHandoff extends DyadicProvenanceMetadata {
  id: string; // handoff_${Date.now()}_...
  caregiverId: string;
  caregiverName: string;
  shiftPeriod: HandoffShiftPeriod;
  shiftDate: string; // YYYY-MM-DD
  assistedActivities: AssistedActivityRecord[];
  patientRequestsHandled: string[];
  patientPreferencesNoted: string[];
  pendingItemsForNextHelper: string[];
  isPatientVisible: boolean; // Patient-visible by default unless explicitly internal
  createdAt: string;
  lastEditedAt?: string;
  editHistory?: CaregiverHandoffEditRecord[];
  isArchived: boolean;
}

// -----------------------------------------------------------------------------
// 4. DYADIC DISCREPANCIES (Preserving Divergent Perspectives Neutrally)
// -----------------------------------------------------------------------------

export type DiscrepancyDomain =
  | 'task_completion'        // Patient: self-completed vs Caregiver: assisted
  | 'comfort_level'           // Patient: comfortable vs Caregiver: observed struggle
  | 'adaptation_preference'  // Patient: keep original vs Caregiver: prefers simplified
  | 'object_location'        // Patient recall differs from Caregiver recorded location
  | 'cognitive_concern';     // Divergent concern ratings

export type DiscrepancyResolutionStatus =
  | 'open'
  | 'patient_reviewed'
  | 'caregiver_reviewed'
  | 'clarified'
  | 'preserved_divergent'; // Healthy acknowledgment that dual views coexist

export interface PerspectiveReport {
  status: string;
  reportedAt: string;
  notes?: string;
}

export interface DyadicDiscrepancy extends DyadicProvenanceMetadata {
  id: string; // disc_${Date.now()}_...
  domain: DiscrepancyDomain;
  title: string;
  patientReport: PerspectiveReport;
  caregiverReport: PerspectiveReport;
  neutralExplanation: string;
  resolutionStatus: DiscrepancyResolutionStatus;
  clarificationNotes?: string;
  provenanceTrail: string[];
}

// -----------------------------------------------------------------------------
// 5. SHARED APPOINTMENT PREPARATION SELECTION
// -----------------------------------------------------------------------------

export interface AppointmentPreparationItem {
  id: string;
  sourceType: 'patient_concern' | 'caregiver_concern' | 'routine_observation' | 'patient_question';
  authorId: string;
  authorName: string;
  authorRole: DyadicAuthorRole;
  title: string;
  details: string;
  timestamp: string;
  isSelectedForDoctor: boolean;
}

export interface SharedAppointmentPreparationSummary {
  patientId: string;
  patientName: string;
  compiledAt: string;
  items: AppointmentPreparationItem[];
  patientQuestions: string[];
  doctorDisclaimer: string;
}
