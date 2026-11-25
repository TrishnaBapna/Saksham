/**
 * SAKSHAM NEURO-CARE — PHASE 3.1
 * ADAPTIVE MEMORY-AWARE DAILY LIVING, TASK ACCOUNTABILITY & LIFECYCLE MANAGEMENT TYPES
 * 100% Spark Free Plan compliant — strictly non-diagnostic.
 */

import { RoutineCategory } from '../../../types/index.js';

export type RecurrencePattern = 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';

export type TaskSupportLevel = 'independent' | 'supported' | 'guided';

export type TaskAuthor = 'patient' | 'caregiver' | 'clinician' | 'system';

export type TaskLifecycleStatus =
  | 'active'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'completed_assisted'
  | 'snoozed'
  | 'skipped'
  | 'unconfirmed'
  | 'paused'
  | 'archived'
  | 'pending_removal_review';

export type RemovalReasonCode =
  | 'no_longer_needed'
  | 'schedule_changed'
  | 'incorrect_task'
  | 'replace_task'
  | 'pause_instead'
  | 'other';

export interface TaskRemovalReason {
  reasonCode: RemovalReasonCode;
  explanation?: string;
  requestedBy: 'patient' | 'caregiver';
  requestedAt: string;
  status: 'archived' | 'pending_review' | 'restored';
}

export interface TaskModificationRecord {
  id: string;
  modifiedBy: 'patient' | 'caregiver' | 'clinician' | 'system';
  modifiedAt: string;
  changeType:
    | 'created'
    | 'paused'
    | 'resumed'
    | 'edited'
    | 'archived'
    | 'restored'
    | 'removal_requested';
  details: string;
}

export type MemoryChallengeType =
  | 'next_step'
  | 'delayed_recall'
  | 'location_recall'
  | 'sequence_recall'
  | 'patient_selected';

export interface MemoryChallengeConfig {
  enabled: boolean;
  challengeType: MemoryChallengeType;
  promptQuestion?: string;
  groundedItemKey?: string; // e.g. "reading_glasses" referencing item location memory
  groundedLocationHint?: string; // e.g. "Brown bedside table, top drawer"
  stepOptions?: string[];
  correctOptionIndex?: number;
  delayedRecallMinutes?: number;
}

export interface MemoryChallengeResult {
  challengeType: MemoryChallengeType;
  attempted: boolean;
  declined: boolean;
  cueLevelUsed: 0 | 1 | 2 | 3 | 4; // 0: Independent, 1: Orientation, 2: Context, 3: Guided, 4: Supported
  hintsRequested: number;
  completed: boolean;
  caregiverSupported: boolean;
  recordedAt: string;
  nonDiagnosticNotice: string;
}

export interface TaskCompletionAttribution {
  reportedBy: 'patient' | 'caregiver' | 'system';
  completionType: 'self' | 'with_help' | 'partial' | 'uncertain' | 'need_help';
  helpType?: 'verbal_guide' | 'physical_assistance' | 'hint' | 'asha_guidance';
  notes?: string;
  verifiedMethod: 'none' | 'caregiver_confirmed'; // Explicitly "none" unless a real caregiver confirms
}

export interface ReminderConfig {
  enabled: boolean;
  leadTimeMinutes: number;
  followUpMinutes: number;
  maxFollowUps: number;
}

export interface RecurringTask {
  id: string;
  patientId: string;
  title: string;
  description: string;
  category: RoutineCategory;
  period: 'morning' | 'afternoon' | 'evening';
  scheduledTime: string; // "08:00 AM"
  durationMinutes: number;
  recurrence: RecurrencePattern;
  supportLevel: TaskSupportLevel;
  createdBy: TaskAuthor;
  lifecycleStatus: TaskLifecycleStatus;
  reminderConfig: ReminderConfig;
  memoryChallengeConfig?: MemoryChallengeConfig;
  steps: string[];
  isClinicianPrescribed?: boolean;
  prescribingDoctorId?: string;
  prescriptionRef?: string;
  pausedAt?: string;
  archivedAt?: string;
  removalReason?: TaskRemovalReason;
  modificationHistory: TaskModificationRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyTaskInstance {
  id: string; // e.g. "inst_routine-01_2026-11-21"
  recurringTaskId: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  scheduledTime: string;
  title: string;
  description?: string;
  category: RoutineCategory;
  period: 'morning' | 'afternoon' | 'evening';
  status: TaskLifecycleStatus;
  completionAttribution?: TaskCompletionAttribution;
  completedAt?: string;
  snoozeUntil?: string;
  skipReason?: string;
  hintsUsedCount: number;
  challengeResult?: MemoryChallengeResult;
  isClinicianPrescribed?: boolean;
  syncStatus?: 'synced' | 'local_only' | 'pending_sync' | 'sync_error';
  createdAt: string;
  updatedAt: string;
}

export interface ReminderEvent {
  id: string;
  instanceId: string;
  taskId: string;
  scheduledTime: string;
  reminderType: 'first_reminder' | 'gentle_followup';
  status: 'delivered' | 'snoozed' | 'resolved' | 'unconfirmed';
  timestamp: string;
}

export interface TaskLifecycleHistorySummary {
  taskId: string;
  taskTitle: string;
  totalScheduled: number;
  reportedCompleted: number;
  reportedWithHelp: number;
  snoozedCount: number;
  skippedCount: number;
  unconfirmedCount: number;
  recentInstances: DailyTaskInstance[];
}

export interface DescriptiveTaskInsight {
  type: 'frequent_completion' | 'assistance_preferred' | 'postponement_pattern' | 'hint_frequency' | 'paused_notice';
  messageEn: string;
  messageHi: string;
  messageMr: string;
  taskId?: string;
}
