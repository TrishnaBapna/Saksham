/**
 * Re-exports shared Firestore document interfaces for use throughout the frontend.
 * The canonical source is shared/types/index.ts — do not duplicate definitions here.
 */
export type {
  UserRole,
  CareCondition,
  InterfaceProfile,
  UserProfile,
  Task,
  TaskStatus,
  LovedOne,
  CaregiverAlert,
  AlertSeverity,
  ClinicalNote,
  NoteAuthorRole,
  DoctorDirective,
  TelemetryRecord,
  DayStatus,
  UserProgression,
  Badge,
  CaregiverAuthorization,
  DoctorAssignment,
  AuditLogEntry,
  AuditAction,
  ApiResponse,
  PaginatedResponse,
  DiseaseModule,
} from '@shared/types';
export { getAccessibleModulesForCondition } from '@shared/types';
