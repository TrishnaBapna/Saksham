/**
 * Saksham Patient Calendar Data Types
 * Milestone 6.1: Core Types, Services, Data Persistence & Firestore Security
 */

export type CalendarCategory =
  | 'doctor'
  | 'family'
  | 'personal'
  | 'medication'
  | 'other';

export type CalendarSyncStatus =
  | 'synced'
  | 'offline-pending'
  | 'local-only'
  | 'sync-paused'
  | 'sync-error';

export interface CalendarRecurrenceRule {
  frequency: 'none' | 'daily' | 'weekly';
  interval?: number; // e.g. every 1 week, every 2 days (default 1)
  endAt?: string; // YYYY-MM-DD
  daysOfWeek?: number[]; // [0 = Sun, 1 = Mon, ..., 6 = Sat] for weekly
}

export interface CaregiverCalendarPermissions {
  canReadCalendar: boolean;
  canCreateCalendarEvents: boolean;
  canEditCalendarEvents: boolean;
  canDeleteCalendarEvents: boolean;
}

export interface CalendarEvent {
  id: string;
  patientId: string;
  title: string;
  description?: string;
  category: CalendarCategory;
  startAt: string; // ISO 8601 string (e.g. "2026-11-09T10:00:00.000Z")
  endAt?: string; // ISO 8601 string
  timezone: string; // e.g. "Asia/Kolkata" or Intl default
  isAllDay: boolean;
  reminderMinutesBefore: number; // 0, 15, 30, 60 (-1 for none)
  recurrence?: CalendarRecurrenceRule;
  linkedRoutineId?: string; // Optional anchor to a Daily Routine
  locationLabel?: string; // Plain text location label only (e.g. "Dr. Vikram Clinic, Room 102")
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  deletedAt?: string;
  createdBy: string; // Patient UID or Caregiver UID
  syncStatus: CalendarSyncStatus;
  isPrivate?: boolean; // When true, strictly hidden from caregivers
  sharing?: {
    isSharedWithCaregiver: boolean;
  };
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  category: CalendarCategory;
  startAt: string;
  endAt?: string;
  timezone?: string;
  isAllDay?: boolean;
  reminderMinutesBefore?: number;
  recurrence?: CalendarRecurrenceRule;
  linkedRoutineId?: string;
  locationLabel?: string;
  isPrivate?: boolean;
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string;
  category?: CalendarCategory;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  isAllDay?: boolean;
  reminderMinutesBefore?: number;
  recurrence?: CalendarRecurrenceRule;
  linkedRoutineId?: string;
  locationLabel?: string;
  isPrivate?: boolean;
}
