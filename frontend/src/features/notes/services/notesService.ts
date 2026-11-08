/**
 * Saksham Notes Data Service
 * Milestone 6.1: Core Types, Services, Data Persistence & Firestore Security
 */

import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { getEffectivePatientId, isGuestPatient, notifyDataChange } from '../../auth/services/identityService.js';
import { PatientNote, CreateNoteInput, UpdateNoteInput, NoteCategory } from '../types/notes.types.js';
import { VoiceStorageService } from './voiceStorageService.js';

export class NotesService {
  private static isOnlineListenerRegistered = false;

  private static getStorageKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_notes_${effectiveId}`;
  }

  private static getPendingSyncKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_pending_notes_sync_${effectiveId}`;
  }

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage unavailable or headless error
    }
    return null;
  }

  private static safeSetItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage unavailable
    }
  }

  public static isOnline(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Register automatic reconnection sync listener
   */
  public static ensureReconnectionListener(): void {
    if (this.isOnlineListenerRegistered || typeof window === 'undefined') return;
    this.isOnlineListenerRegistered = true;
    window.addEventListener('online', () => {
      // Find all patient keys in localStorage with pending notes
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('saksham_pending_notes_sync_')) {
            const patientId = key.replace('saksham_pending_notes_sync_', '');
            if (patientId && !isGuestPatient(patientId)) {
              this.syncPendingNotes(patientId).catch((err) =>
                console.warn('[NotesService] Auto-sync on reconnection failed:', err)
              );
            }
          }
        }
      } catch (err) {
        console.warn('[NotesService] Reconnection listener error:', err);
      }
    });
  }

  /**
   * Get all active notes for a patient.
   * Sorted: Pinned notes first, then by updatedAt descending.
   */
  public static getNotes(patientId: string): PatientNote[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getStorageKey(effectiveId));
    if (!raw) return [];

    try {
      const notes: PatientNote[] = JSON.parse(raw);
      return notes
        .filter((n) => !n.deletedAt)
        .sort((a, b) => {
          if (a.isPinned !== b.isPinned) {
            return a.isPinned ? -1 : 1;
          }
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    } catch {
      return [];
    }
  }

  /**
   * Get a single note by ID
   */
  public static getNoteById(patientId: string, noteId: string): PatientNote | null {
    const notes = this.getNotes(patientId);
    return notes.find((n) => n.id === noteId && !n.deletedAt) || null;
  }

  /**
   * Create a new personal patient note
   */
  public static async createNote(
    patientId: string,
    input: CreateNoteInput
  ): Promise<PatientNote> {
    const effectiveId = getEffectivePatientId({ uid: patientId });

    // Validation
    const cleanTitle = (input.title || '').trim();
    if (!cleanTitle) {
      throw new Error('Note title cannot be empty');
    }
    if (cleanTitle.length > 120) {
      throw new Error('Note title exceeds maximum length of 120 characters.');
    }
    const cleanContent = input.content ?? '';
    if (cleanContent.length > 5000) {
      throw new Error('Note content exceeds maximum length of 5000 characters.');
    }

    const voiceNoteData = input.voiceNote || input.voiceMetadata;
    const nowIso = new Date().toISOString();
    const newNote: PatientNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      patientId: effectiveId,
      title: cleanTitle,
      content: cleanContent,
      category: input.category || 'general',
      isPinned: Boolean(input.isPinned),
      linkedRoutineId: input.linkedRoutineId,
      linkedEventId: input.linkedEventId,
      createdAt: nowIso,
      updatedAt: nowIso,
      syncStatus: isGuestPatient(effectiveId) ? 'local-only' : this.isOnline() ? 'synced' : 'offline-pending',
      version: 1,
      voiceNote: voiceNoteData,
      voiceMetadata: voiceNoteData,
    };

    // 1. Save locally
    const existing = this.getNotes(effectiveId);
    const updated = [newNote, ...existing];
    this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(updated));

    // 2. Queue or sync to Firestore
    if (!isGuestPatient(effectiveId)) {
      if (this.isOnline()) {
        try {
          await this.writeToFirestore(effectiveId, newNote);
        } catch (err) {
          console.warn('[NotesService] Cloud write failed, queuing offline:', err);
          newNote.syncStatus = 'offline-pending';
          this.queuePendingSync(effectiveId, newNote.id, 'upsert');
        }
      } else {
        this.queuePendingSync(effectiveId, newNote.id, 'upsert');
      }
    }

    notifyDataChange('notes', effectiveId);
    return newNote;
  }

  /**
   * Update an existing note
   */
  public static async updateNote(
    patientId: string,
    noteId: string,
    input: UpdateNoteInput
  ): Promise<PatientNote> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const existing = this.getNotes(effectiveId);
    const targetIdx = existing.findIndex((n) => n.id === noteId);

    if (targetIdx === -1) {
      throw new Error(`Note with id ${noteId} not found.`);
    }

    const oldNote = existing[targetIdx];
    const cleanTitle = input.title !== undefined ? input.title.trim() : oldNote.title;
    if (!cleanTitle) {
      throw new Error('Note title cannot be empty.');
    }
    if (cleanTitle.length > 120) {
      throw new Error('Note title exceeds maximum length of 120 characters.');
    }

    const cleanContent = input.content !== undefined ? input.content : oldNote.content;
    if (cleanContent.length > 5000) {
      throw new Error('Note content exceeds maximum length of 5000 characters.');
    }

    const updatedVoice =
      input.voiceNote !== undefined
        ? input.voiceNote
        : input.voiceMetadata !== undefined
        ? input.voiceMetadata
        : oldNote.voiceNote || oldNote.voiceMetadata;

    const updatedNote: PatientNote = {
      ...oldNote,
      title: cleanTitle,
      content: cleanContent,
      category: input.category !== undefined ? input.category : oldNote.category,
      isPinned: input.isPinned !== undefined ? input.isPinned : oldNote.isPinned,
      linkedRoutineId: input.linkedRoutineId !== undefined ? input.linkedRoutineId : oldNote.linkedRoutineId,
      linkedEventId: input.linkedEventId !== undefined ? input.linkedEventId : oldNote.linkedEventId,
      voiceNote: updatedVoice,
      voiceMetadata: updatedVoice,
      updatedAt: new Date().toISOString(),
      version: oldNote.version + 1,
      syncStatus: isGuestPatient(effectiveId) ? 'local-only' : this.isOnline() ? 'synced' : 'offline-pending',
    };

    existing[targetIdx] = updatedNote;
    this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(existing));

    if (!isGuestPatient(effectiveId)) {
      if (this.isOnline()) {
        try {
          await this.writeToFirestore(effectiveId, updatedNote);
        } catch {
          updatedNote.syncStatus = 'offline-pending';
          this.queuePendingSync(effectiveId, updatedNote.id, 'upsert');
        }
      } else {
        this.queuePendingSync(effectiveId, updatedNote.id, 'upsert');
      }
    }

    notifyDataChange('notes', effectiveId);
    return updatedNote;
  }

  /**
   * Delete a note (soft-deletes locally, removes from Firestore, cleans up local audio blob)
   */
  public static async deleteNote(patientId: string, noteId: string): Promise<boolean> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const existing = this.getNotes(effectiveId);
    const target = existing.find((n) => n.id === noteId);

    if (!target) return false;

    // Clean up local audio blob in IndexedDB if attached
    const audioKey = target.voiceNote?.localAudioKey || target.voiceMetadata?.localAudioKey;
    if (audioKey) {
      await VoiceStorageService.deleteAudioBlob(audioKey).catch(() => {});
    }

    // Remove from local active list
    const updated = existing.filter((n) => n.id !== noteId);
    this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(updated));

    if (!isGuestPatient(effectiveId)) {
      if (this.isOnline()) {
        try {
          const noteRef = doc(db, 'users', effectiveId, 'notes', noteId);
          await deleteDoc(noteRef);
        } catch {
          this.queuePendingSync(effectiveId, noteId, 'delete');
        }
      } else {
        this.queuePendingSync(effectiveId, noteId, 'delete');
      }
    }

    notifyDataChange('notes', effectiveId);
    return true;
  }

  /**
   * Toggle pinned status of a note
   */
  public static async togglePinNote(patientId: string, noteId: string): Promise<PatientNote> {
    const note = this.getNoteById(patientId, noteId);
    if (!note) {
      throw new Error(`Note ${noteId} not found.`);
    }
    return this.updateNote(patientId, noteId, { isPinned: !note.isPinned });
  }

  /**
   * Search notes by keyword in title or content
   */
  public static searchNotes(patientId: string, query: string): PatientNote[] {
    const q = (query || '').trim().toLowerCase();
    const notes = this.getNotes(patientId);
    if (!q) return notes;

    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }

  /**
   * Filter notes by category
   */
  public static filterByCategory(patientId: string, category: NoteCategory | 'all'): PatientNote[] {
    const notes = this.getNotes(patientId);
    if (!category || category === 'all') return notes;
    return notes.filter((n) => n.category === category);
  }

  // --- Offline Sync & Queue Utilities ---

  private static queuePendingSync(patientId: string, noteId: string, op: 'upsert' | 'delete'): void {
    const key = this.getPendingSyncKey(patientId);
    const raw = this.safeGetItem(key);
    let queue: Record<string, 'upsert' | 'delete'> = {};
    if (raw) {
      try {
        queue = JSON.parse(raw);
      } catch {}
    }
    queue[noteId] = op;
    this.safeSetItem(key, JSON.stringify(queue));
  }

  public static async syncPendingNotes(patientId: string): Promise<{ synced: number; failed: number }> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (isGuestPatient(effectiveId) || !this.isOnline()) {
      return { synced: 0, failed: 0 };
    }

    const key = this.getPendingSyncKey(effectiveId);
    const raw = this.safeGetItem(key);
    if (!raw) return { synced: 0, failed: 0 };

    let queue: Record<string, 'upsert' | 'delete'> = {};
    try {
      queue = JSON.parse(raw);
    } catch {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;
    const remainingQueue = { ...queue };
    const allNotes = this.getNotes(effectiveId);

    for (const [noteId, op] of Object.entries(queue)) {
      try {
        const noteRef = doc(db, 'users', effectiveId, 'notes', noteId);
        if (op === 'delete') {
          await deleteDoc(noteRef);
        } else {
          const note = allNotes.find((n) => n.id === noteId);
          if (note) {
            await this.writeToFirestore(effectiveId, note);
            note.syncStatus = 'synced';
          }
        }
        delete remainingQueue[noteId];
        synced++;
      } catch (err) {
        console.warn(`[NotesService] Failed to sync note ${noteId}:`, err);
        failed++;
      }
    }

    if (Object.keys(remainingQueue).length > 0) {
      this.safeSetItem(key, JSON.stringify(remainingQueue));
    } else {
      this.safeRemoveItem(key);
    }

    this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(allNotes));
    notifyDataChange('notes', effectiveId);
    return { synced, failed };
  }

  private static safeRemoveItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
  }

  private static async writeToFirestore(patientId: string, note: PatientNote): Promise<void> {
    const noteRef = doc(db, 'users', patientId, 'notes', note.id);
    // Sanitize payload ensuring fields conform strictly to security rules
    const payload: any = {
      id: note.id,
      patientId: note.patientId,
      title: note.title,
      content: note.content,
      category: note.category,
      isPinned: note.isPinned,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      syncStatus: 'synced',
      version: note.version,
    };

    if (note.deletedAt) payload.deletedAt = note.deletedAt;
    if (note.linkedRoutineId) payload.linkedRoutineId = note.linkedRoutineId;
    if (note.linkedEventId) payload.linkedEventId = note.linkedEventId;
    if (note.voiceNote) {
      payload.voiceNote = {
        isRecorded: note.voiceNote.isRecorded,
        durationSeconds: note.voiceNote.durationSeconds,
        transcript: note.voiceNote.transcript || '',
        localAudioKey: note.voiceNote.localAudioKey || '',
        recordedAt: note.voiceNote.recordedAt,
      };
    }

    await setDoc(noteRef, payload, { merge: true });
  }
}
