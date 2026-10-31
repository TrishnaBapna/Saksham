/**
 * Shared TypeScript interfaces for Saksham 2.0
 * These mirror the Firestore document schemas exactly.
 * Used by both apps/frontend and apps/backend.
 */

// ─── User Roles ──────────────────────────────────────────────────────────────

export type UserRole =
  | 'patient'
  | 'caregiver'
  | 'doctor'
  | 'senior_clinician'
  | 'hospital_admin'
  | 'administrator'
  | 'system_admin';

export type CareCondition =
  | 'parkinsons'
  | 'alzheimers'
  | 'both'
  | 'dementia'
  | 'other';

export type DiseaseModule =
  | 'routine'
  | 'mindClinic'
  | 'movement'
  | 'speech'
  | 'lovedOnes'
  | 'articles'
  | 'calendar'
  | 'safepath';

/**
 * Returns the exact accessible modules based on clinical disease profile:
 * - Parkinson's: Mind Clinic, Movement, Speech, Articles, Calendar, Safety (Routine/SafePath)
 * - Alzheimer's: Mind Clinic, Loved Ones & Care, Articles, Calendar, Safety (Routine/SafePath)
 * - Both: Mind Clinic, Movement, Speech, Loved Ones & Care, Articles, Calendar, Safety (Routine/SafePath)
 */
export function getAccessibleModulesForCondition(condition?: CareCondition | string): DiseaseModule[] {
  switch (condition) {
    case 'parkinsons':
      return ['routine', 'mindClinic', 'movement', 'speech', 'articles', 'calendar', 'safepath'];
    case 'alzheimers':
      return ['routine', 'mindClinic', 'lovedOnes', 'articles', 'calendar', 'safepath'];
    case 'both':
    case 'parkinsons_alzheimers':
    case 'dementia':
      return ['routine', 'mindClinic', 'movement', 'speech', 'lovedOnes', 'articles', 'calendar', 'safepath'];
    default:
      // When not yet selected or other: provide baseline routine, mind clinic, articles, calendar, safety
      return ['routine', 'mindClinic', 'articles', 'calendar', 'safepath'];
  }
}

export type InterfaceProfile =
  | 'youth'          // Under 35
  | 'adult'          // 35–54
  | 'mature'         // 55–64
  | 'senior';        // 65+

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: UserRole;
  condition?: CareCondition;
  dateOfBirth?: string;         // ISO date string
  phone?: string;
  lang?: string;                // BCP-47 language tag e.g. 'en', 'hi', 'mr'
  interfaceProfile?: InterfaceProfile;
  onboardingComplete?: boolean;
  emailVerified?: boolean;
  createdAt: string;            // ISO datetime
  updatedAt?: string;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'done' | 'snoozed' | 'missed';

export interface Task {
  id: number;
  uid: string;
  label: string;
  icon: string;
  time: string;                 // "08:30 AM"
  status: TaskStatus;
  snoozed?: boolean;
  extraTime?: boolean;
  completedAt?: string;         // ISO datetime
  durationMinutes?: number;
  notes?: string;
  updatedAt?: string;
}

// ─── Loved One (Vault) ────────────────────────────────────────────────────────

export interface LovedOne {
  id: number;
  uid: string;
  name: string;
  role: string;                 // "Daughter", "Doctor", "Friend" etc.
  phone: string;
  whatsapp: string;
  email?: string;
  clue: string;
  img: string;
  options: string[];            // For face quiz multiple-choice
  createdAt?: string;
}

// ─── Caregiver Alert ──────────────────────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface CaregiverAlert {
  id: number;
  uid: string;
  time: string;
  text: string;
  severity: AlertSeverity;
  acknowledged?: boolean;
  createdAt: string;
}

// ─── Clinical Note ────────────────────────────────────────────────────────────

export type NoteAuthorRole = 'caregiver' | 'doctor';

export interface ClinicalNote {
  id: number;
  uid: string;
  authorRole: NoteAuthorRole;
  authorName: string;
  authorUid?: string;
  title: string;
  body: string;
  createdAt: string;
}

// ─── Doctor Directive ─────────────────────────────────────────────────────────

export interface DoctorDirective {
  id: number;
  uid: string;
  doctorName: string;
  doctorUid?: string;
  title: string;
  body: string;
  createdAt: string;
}

// ─── Telemetry Record ─────────────────────────────────────────────────────────

export type DayStatus = 'all_done' | 'delayed' | 'missed' | 'pending';

export interface TelemetryRecord {
  id?: string;
  uid: string;
  day: number;                  // Day number in month
  recordDate: string;           // ISO date
  status: DayStatus;
  tasksCompleted: number;
  tasksTotal: number;
  latencyMinutes?: number;
  speechDb?: number;
  tremorAmplitudeCm?: number;
  notes?: string;
  updatedAt?: string;
}

// ─── ANBESHAN 2026 Research Telemetry & Biometrics ────────────────────────────

export type DemographicTier = 'youth' | 'adult' | 'senior';

export interface AnbeshanBiometricTelemetry {
  id?: string;
  patientUid: string;
  timestamp: string;
  ageTier: DemographicTier;
  tremorStabilityIndex: number;    // 0 - 100% (higher = stable motor control)
  speechVocalDb: number;            // Vocal amplitude sustained dB
  gaitCadenceBpm: number;           // Steps per minute auditory metronome sync
  cognitiveAccuracyPercent: number; // 0 - 100% score across Mind Clinic tests
  sessionDurationSeconds?: number;
  condition?: CareCondition | string;
  notes?: string;
}

export interface TelemetrySummaryStats {
  patientUid: string;
  recordsCount: number;
  avgTremorStability: number;
  avgSpeechDb: number;
  avgGaitCadenceBpm: number;
  avgCognitiveScore: number;
  progressionTrend: 'improving' | 'stable' | 'needs_attention';
  lastRecordedAt: string;
}

// ─── User Progression ─────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  label: string;
  icon: string;
  description: string;
  earnedAt: string;
}

export interface UserProgression {
  uid: string;
  xp: number;
  level: number;
  streak: number;
  waterLogged: number;
  waterTargetGlasses: number;
  badges: Badge[];
  updatedAt?: string;
}

// ─── Caregiver Authorization ──────────────────────────────────────────────────

export interface CaregiverAuthorization {
  caregiverUid: string;
  caregiverEmail: string;
  caregiverName: string;
  patientUid: string;
  grantedAt: string;
  grantedBy: string;            // uid of admin who granted access
  revokedAt?: string;
}

// ─── Doctor Assignment ────────────────────────────────────────────────────────

export interface DoctorAssignment {
  doctorUid: string;
  doctorName: string;
  patientUid: string;
  assignedAt: string;
  assignedBy: string;
  revokedAt?: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'login'
  | 'logout'
  | 'profile_read'
  | 'profile_update'
  | 'role_granted'
  | 'role_revoked'
  | 'caregiver_assigned'
  | 'caregiver_revoked'
  | 'doctor_assigned'
  | 'doctor_revoked'
  | 'account_suspended'
  | 'account_restored'
  | 'note_created'
  | 'directive_created'
  | 'data_exported';

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorRole: UserRole;
  action: AuditAction;
  targetUid?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Module 1: Support Profile ────────────────────────────────────────────────

export type GuidanceStyle = 'written' | 'visual' | 'step_by_step';
export type TextSizePreference = 'normal' | 'large' | 'extra_large';
export type ContrastPreference = 'standard' | 'high_contrast';
export type InteractionMethod = 'touch' | 'keyboard' | 'voice' | 'switch';
export type SupportPathway = CareCondition | 'general_accessibility';

export interface UserSupportProfile {
  uid: string;
  displayName: string;
  preferredLanguage: string;
  ageRange?: string;
  demographicTier?: DemographicTier;
  interactionMethods: InteractionMethod[];
  textSizePreference: TextSizePreference;
  contrastPreference: ContrastPreference;
  voiceAssistanceEnabled: boolean;
  guidanceStyle: GuidanceStyle;
  dailyRoutinePreferences?: {
    wakeTime?: string;
    quietHoursStart?: string;
  };
  pathway: SupportPathway;
  reportedAccessibilityDifficulties?: string[];
  preferredAssistanceMethod?: string;
  adaptiveAssistanceEnabled: boolean;
  simpleModeEnabled?: boolean;
  updatedAt: string;
}

// ─── Module 2 & 3: Seven-Day Personalisation Trial & Adaptive Assistance ────

export type TrialDayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type TrialStatus = 'not_started' | 'active' | 'paused' | 'completed';

export type DifficultyCategory =
  | 'instructions_complicated'
  | 'text_too_small'
  | 'buttons_hard_to_tap'
  | 'sequence_hard_to_remember'
  | 'voice_preferred'
  | 'caregiver_requested'
  | 'motor_tremor_difficulty'
  | 'other';

export type AssistanceCategory =
  | 'text_simplification'
  | 'larger_controls'
  | 'voice_guidance'
  | 'step_by_step'
  | 'repeated_instructions'
  | 'visual_cues'
  | 'alternative_communication'
  | 'caregiver_assistance';

export type HelpfulRating = 'helpful' | 'unhelpful' | 'unrated';
export type EntrySource = 'user' | 'caregiver' | 'system';

export interface ReportedDifficultyRecord {
  id: string;
  userId: string;
  taskId?: string | number;
  taskTitle?: string;
  timestamp: string;
  difficultyCategory: DifficultyCategory;
  assistanceOffered?: AssistanceCategory[];
  assistanceSelected?: AssistanceCategory;
  helpfulRating: HelpfulRating;
  notes?: string;
  enteredBy: EntrySource;
  synced?: boolean;
}

export interface PersonalisationTrialState {
  userId: string;
  status: TrialStatus;
  currentDay: TrialDayNumber;
  startDate: string;
  lastActivityDate?: string;
  completedDays: number[];
  baselinePreferences: Partial<UserSupportProfile>;
  difficultiesRecorded: ReportedDifficultyRecord[];
  helpfulAssistanceOptions: AssistanceCategory[];
  unhelpfulAssistanceOptions: AssistanceCategory[];
  humanAssistanceRequestedTasks: string[];
  summaryApprovedByUser?: boolean;
  updatedAt: string;
}

export interface AssistanceOption {
  category: AssistanceCategory;
  label: string;
  description: string;
  actionType: string;
  confidence: number;
  explanation: string;
}

export interface AssistanceRecommendationResult {
  recommendedOptions: AssistanceOption[];
  primaryRecommendation?: AssistanceOption;
  explanation: string;
  basedOnPriorHelpfulCount: number;
  adaptiveEnabled: boolean;
}

// ─── Module 5: Offline Operation Queue ───────────────────────────────────────

export type SyncOperationType = 'create' | 'update' | 'delete';
export type SyncRecordType =
  | 'task'
  | 'routine'
  | 'difficulty'
  | 'feedback'
  | 'note'
  | 'location'
  | 'sos'
  | 'profile'
  | 'telemetry';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface QueuedSyncOperation {
  operationId: string;
  userId: string;
  recordType: SyncRecordType;
  operationType: SyncOperationType;
  data: unknown;
  timestamp: string;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  version?: number;
}

