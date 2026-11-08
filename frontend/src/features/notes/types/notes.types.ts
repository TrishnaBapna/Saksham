/**
 * Saksham Patient Notes Data Types
 * Milestone 6.1: Core Types, Services, Data Persistence & Firestore Security
 */

export type NoteCategory =
  | 'personal'
  | 'family'
  | 'health'
  | 'appointments'
  | 'general'
  | 'medical'
  | 'reminder'
  | 'other';

export type NoteSyncStatus =
  | 'synced'
  | 'offline-pending'
  | 'local-only'
  | 'sync-paused'
  | 'sync-error';

export interface LocalVoiceNoteMetadata {
  isRecorded?: boolean;
  durationSeconds: number;
  transcript?: string;
  localAudioKey?: string; // Key in client-side IndexedDB store (never in Cloud Storage)
  recordedAt: string;
  mimeType?: string;
}

export interface PatientNote {
  id: string;
  patientId: string;
  title: string;
  content: string;
  category: NoteCategory;
  isPinned: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  deletedAt?: string; // Soft deletion marker
  linkedRoutineId?: string; // Optional link to an existing Daily Routine
  linkedEventId?: string; // Optional link to a Calendar Event
  syncStatus: NoteSyncStatus;
  version: number;
  voiceNote?: LocalVoiceNoteMetadata;
  voiceMetadata?: LocalVoiceNoteMetadata;
}

export interface CreateNoteInput {
  title: string;
  content: string;
  category?: NoteCategory;
  isPinned?: boolean;
  linkedRoutineId?: string;
  linkedEventId?: string;
  voiceNote?: LocalVoiceNoteMetadata;
  voiceMetadata?: LocalVoiceNoteMetadata;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  category?: NoteCategory;
  isPinned?: boolean;
  linkedRoutineId?: string;
  linkedEventId?: string;
  voiceNote?: LocalVoiceNoteMetadata;
  voiceMetadata?: LocalVoiceNoteMetadata;
}
