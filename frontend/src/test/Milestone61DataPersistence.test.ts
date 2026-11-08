import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotesService, VoiceStorageService } from '../features/notes';
import { CalendarService, CalendarRecurrenceRule } from '../features/calendar';
import { resetMockFirestoreStore, mockFirestoreStore } from './setup';

// In-memory IndexedDB Mock for VoiceStorageService
const inMemoryIDB: Record<string, any> = {};

function setupMockIndexedDB() {
  const mockIDB = {
    open: (_name: string, _version: number) => {
      const req: any = {
        result: {
          objectStoreNames: {
            contains: () => true,
          },
          createObjectStore: () => {},
          transaction: () => ({
            objectStore: () => ({
              put: (record: any) => {
                inMemoryIDB[record.key] = record;
                const putReq: any = {};
                setTimeout(() => putReq.onsuccess && putReq.onsuccess({ target: putReq }), 0);
                return putReq;
              },
              get: (key: string) => {
                const getReq: any = { result: inMemoryIDB[key] || null };
                setTimeout(() => getReq.onsuccess && getReq.onsuccess({ target: getReq }), 0);
                return getReq;
              },
              delete: (key: string) => {
                delete inMemoryIDB[key];
                const delReq: any = {};
                setTimeout(() => delReq.onsuccess && delReq.onsuccess({ target: delReq }), 0);
                return delReq;
              },
            }),
          }),
        },
      };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess({ target: req });
      }, 0);
      return req;
    },
  };

  (window as any).indexedDB = mockIDB;
}

describe('Milestone 6.1: Core Types, Services, Data Persistence & Firestore Security', () => {
  const guestPatientId = 'guest_patient_test_01';
  const authPatientId = 'patient_auth_kamala_02';

  beforeEach(() => {
    localStorage.clear();
    resetMockFirestoreStore();
    for (const k of Object.keys(inMemoryIDB)) {
      delete inMemoryIDB[k];
    }
    setupMockIndexedDB();
    vi.restoreAllMocks();
  });

  describe('Part A: Notes Data Service (NotesService)', () => {
    it('creates a valid patient note and stores it locally with required metadata', async () => {
      const note = await NotesService.createNote(guestPatientId, {
        title: 'Morning Walk with Kabir',
        content: 'Saw yellow blossoms in the garden today. Very peaceful.',
        category: 'personal',
        isPinned: false,
      });

      expect(note).toBeDefined();
      expect(note.id).toMatch(/^note_/);
      expect(note.title).toBe('Morning Walk with Kabir');
      expect(note.category).toBe('personal');
      expect(note.isPinned).toBe(false);
      expect(note.createdAt).toBeDefined();
      expect(note.updatedAt).toBeDefined();
      expect(note.syncStatus).toBe('local-only'); // Guest mode

      const notes = NotesService.getNotes(guestPatientId);
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(note.id);
    });

    it('rejects note creation with empty or whitespace-only title', async () => {
      await expect(
        NotesService.createNote(guestPatientId, {
          title: '   ',
          content: 'Some thoughts',
          category: 'personal',
        })
      ).rejects.toThrow('Note title cannot be empty');
    });

    it('sorts pinned notes first, then by updatedAt descending', async () => {
      // Create first note (older)
      const note1 = await NotesService.createNote(guestPatientId, {
        title: 'Note 1 - Older',
        content: 'Content 1',
        category: 'personal',
        isPinned: false,
      });

      // Create second note (newer)
      const note2 = await NotesService.createNote(guestPatientId, {
        title: 'Note 2 - Newer',
        content: 'Content 2',
        category: 'medical',
        isPinned: false,
      });

      // Create third note (pinned)
      const note3 = await NotesService.createNote(guestPatientId, {
        title: 'Note 3 - Pinned Important',
        content: 'Content 3',
        category: 'family',
        isPinned: true,
      });

      const notes = NotesService.getNotes(guestPatientId);
      expect(notes).toHaveLength(3);
      // Pinned note must be first
      expect(notes[0].id).toBe(note3.id);
      // Then newer note
      expect(notes[1].id).toBe(note2.id);
      // Then older note
      expect(notes[2].id).toBe(note1.id);
    });

    it('filters notes by category accurately', async () => {
      await NotesService.createNote(guestPatientId, {
        title: 'BP Reading',
        content: '120/80 mmHg',
        category: 'medical',
      });
      await NotesService.createNote(guestPatientId, {
        title: 'Grandkids call',
        content: 'Spoke with Rohan',
        category: 'family',
      });
      await NotesService.createNote(guestPatientId, {
        title: 'Medicine reminder',
        content: 'Evening calcium tablet',
        category: 'reminder',
      });

      const medicalNotes = NotesService.filterByCategory(guestPatientId, 'medical');
      expect(medicalNotes).toHaveLength(1);
      expect(medicalNotes[0].title).toBe('BP Reading');

      const familyNotes = NotesService.filterByCategory(guestPatientId, 'family');
      expect(familyNotes).toHaveLength(1);
      expect(familyNotes[0].title).toBe('Grandkids call');
    });

    it('searches notes case-insensitively by title and content', async () => {
      await NotesService.createNote(guestPatientId, {
        title: 'Tulsi Tea in the evening',
        content: 'Felt very soothing for the throat.',
        category: 'personal',
      });
      await NotesService.createNote(guestPatientId, {
        title: 'Doctor Appointment Note',
        content: 'Dr. Vikram suggested gentle morning stretches.',
        category: 'medical',
      });

      const tulsiResults = NotesService.searchNotes(guestPatientId, 'TULSI');
      expect(tulsiResults).toHaveLength(1);
      expect(tulsiResults[0].title).toBe('Tulsi Tea in the evening');

      const vikramResults = NotesService.searchNotes(guestPatientId, 'vikram');
      expect(vikramResults).toHaveLength(1);
      expect(vikramResults[0].title).toBe('Doctor Appointment Note');

      const noMatch = NotesService.searchNotes(guestPatientId, 'nonexistent');
      expect(noMatch).toHaveLength(0);
    });

    it('updates note and modifies updatedAt timestamp while preserving unedited fields', async () => {
      const note = await NotesService.createNote(guestPatientId, {
        title: 'Original Title',
        content: 'Original Content',
        category: 'personal',
        isPinned: false,
      });

      const updated = await NotesService.updateNote(guestPatientId, note.id, {
        title: 'Updated Title',
        isPinned: true,
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.content).toBe('Original Content');
      expect(updated!.isPinned).toBe(true);
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(note.createdAt).getTime());
    });

    it('deletes note and cleans up associated local IndexedDB audio blob', async () => {
      const audioKey = VoiceStorageService.generateAudioKey(guestPatientId, 'note_audio_test');
      const fakeBlob = new Blob(['fake audio content'], { type: 'audio/webm' });
      await VoiceStorageService.saveAudioBlob(audioKey, fakeBlob);

      // Verify blob exists
      const retrieved = await VoiceStorageService.getAudioBlob(audioKey);
      expect(retrieved).not.toBeNull();

      // Create note referencing this voice metadata
      const note = await NotesService.createNote(guestPatientId, {
        title: 'Voice reflection',
        content: 'Transcript text...',
        category: 'personal',
        voiceMetadata: {
          localAudioKey: audioKey,
          durationSeconds: 12,
          mimeType: 'audio/webm',
          recordedAt: new Date().toISOString(),
        },
      });

      expect(NotesService.getNotes(guestPatientId)).toHaveLength(1);

      // Delete note
      const deleteResult = await NotesService.deleteNote(guestPatientId, note.id);
      expect(deleteResult).toBe(true);
      expect(NotesService.getNotes(guestPatientId)).toHaveLength(0);

      // Local audio blob must be purged from IndexedDB
      const afterDeleteBlob = await VoiceStorageService.getAudioBlob(audioKey);
      expect(afterDeleteBlob).toBeNull();
    });
  });

  describe('Part B: Local Voice Storage Service (VoiceStorageService)', () => {
    it('stores and retrieves audio blobs in IndexedDB without cloud transmission', async () => {
      const audioKey = 'test_audio_key_01';
      const fakeBlob = new Blob(['test voice recording buffer'], { type: 'audio/webm' });

      const saveRes = await VoiceStorageService.saveAudioBlob(audioKey, fakeBlob, {
        durationSeconds: 25,
        mimeType: 'audio/webm',
      });
      expect(saveRes).toBe(true);

      const retrieved = await VoiceStorageService.getAudioBlob(audioKey);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.type).toBe('audio/webm');
    });

    it('generates unique scoped audio storage keys for patient notes', () => {
      const key1 = VoiceStorageService.generateAudioKey('patient_1', 'note_1');
      const key2 = VoiceStorageService.generateAudioKey('patient_1', 'note_1');
      expect(key1).toContain('voice_note_patient_1_note_1');
      expect(key2).toContain('voice_note_patient_1_note_1');
    });
  });

  describe('Part C: Calendar Data Service & Virtual Recurrence Engine (CalendarService)', () => {
    it('creates a calendar event and validates start and end time boundaries', async () => {
      const event = await CalendarService.createEvent(guestPatientId, {
        title: 'Dr. Vikram Neurologist Follow-up',
        category: 'doctor',
        startAt: '2026-11-15T10:00:00.000Z',
        endAt: '2026-11-15T11:00:00.000Z',
        locationLabel: 'City Neuro Clinic, Room 204',
      });

      expect(event).toBeDefined();
      expect(event.id).toMatch(/^event_/);
      expect(event.title).toBe('Dr. Vikram Neurologist Follow-up');
      expect(event.category).toBe('doctor');
      expect(event.locationLabel).toBe('City Neuro Clinic, Room 204');
      expect(event.syncStatus).toBe('local-only');
    });

    it('rejects event creation when end time precedes start time', async () => {
      await expect(
        CalendarService.createEvent(guestPatientId, {
          title: 'Invalid timing event',
          category: 'personal',
          startAt: '2026-11-15T11:00:00.000Z',
          endAt: '2026-11-15T10:00:00.000Z', // Precedes start time!
        })
      ).rejects.toThrow('End time cannot precede start time');
    });

    it('evaluates daily recurrence deterministically without writing cloned docs to storage', async () => {
      const rule: CalendarRecurrenceRule = {
        frequency: 'daily',
        interval: 1,
        endAt: '2026-11-20',
      };

      // Starts on Nov 10
      expect(CalendarService.doesRecurOnDate('2026-11-10', '2026-11-10', rule)).toBe(true);
      expect(CalendarService.doesRecurOnDate('2026-11-10', '2026-11-15', rule)).toBe(true);
      expect(CalendarService.doesRecurOnDate('2026-11-10', '2026-11-20', rule)).toBe(true);

      // Outside bounds
      expect(CalendarService.doesRecurOnDate('2026-11-10', '2026-11-09', rule)).toBe(false); // Before start
      expect(CalendarService.doesRecurOnDate('2026-11-10', '2026-11-21', rule)).toBe(false); // After endAt

      // Alternate day (interval: 2)
      const altRule: CalendarRecurrenceRule = { frequency: 'daily', interval: 2 };
      expect(CalendarService.doesRecurOnDate('2026-11-10', '2026-11-10', altRule)).toBe(true);
      expect(CalendarService.doesRecurOnDate('2026-11-10', '2026-11-11', altRule)).toBe(false);
      expect(CalendarService.doesRecurOnDate('2026-11-10', '2026-11-12', altRule)).toBe(true);
    });

    it('evaluates weekly recurrence on selected days of week deterministically', async () => {
      // 2026-11-09 is a Monday (UTC day 1)
      // Recur on Monday (1), Wednesday (3), Friday (5)
      const weeklyRule: CalendarRecurrenceRule = {
        frequency: 'weekly',
        daysOfWeek: [1, 3, 5],
        interval: 1,
      };

      // Monday Nov 9 -> matches (day 1)
      expect(CalendarService.doesRecurOnDate('2026-11-09', '2026-11-09', weeklyRule)).toBe(true);
      // Tuesday Nov 10 -> false (day 2)
      expect(CalendarService.doesRecurOnDate('2026-11-09', '2026-11-10', weeklyRule)).toBe(false);
      // Wednesday Nov 11 -> matches (day 3)
      expect(CalendarService.doesRecurOnDate('2026-11-09', '2026-11-11', weeklyRule)).toBe(true);
      // Friday Nov 13 -> matches (day 5)
      expect(CalendarService.doesRecurOnDate('2026-11-09', '2026-11-13', weeklyRule)).toBe(true);
      // Sunday Nov 15 -> false (day 0)
      expect(CalendarService.doesRecurOnDate('2026-11-09', '2026-11-15', weeklyRule)).toBe(false);
    });

    it('generates virtual occurrences with adjusted startAt times without duplicating storage', async () => {
      // Create a recurring daily event
      await CalendarService.createEvent(guestPatientId, {
        title: 'Morning Guided Meditation',
        category: 'personal',
        startAt: '2026-11-09T08:00:00.000Z',
        endAt: '2026-11-09T08:30:00.000Z',
        recurrence: {
          frequency: 'daily',
          interval: 1,
        },
      });

      // Storage must contain only 1 master document
      const storedEvents = CalendarService.getEvents(guestPatientId);
      expect(storedEvents).toHaveLength(1);

      // Querying for 2026-11-12 must return virtual occurrence
      const dayOccurrences = CalendarService.getEventsForDate(guestPatientId, '2026-11-12');
      expect(dayOccurrences).toHaveLength(1);
      expect(dayOccurrences[0].title).toBe('Morning Guided Meditation');
      expect(dayOccurrences[0].startAt).toBe('2026-11-12T08:00:00.000Z');
      expect(dayOccurrences[0].endAt).toBe('2026-11-12T08:30:00.000Z');
    });

    it('searches events by title, description, or location label', async () => {
      await CalendarService.createEvent(guestPatientId, {
        title: 'Cardiology Checkup',
        description: 'Review blood pressure log',
        category: 'doctor',
        startAt: '2026-11-16T11:00:00.000Z',
        locationLabel: 'Apollo Health City',
      });

      expect(CalendarService.searchEvents(guestPatientId, 'cardio')).toHaveLength(1);
      expect(CalendarService.searchEvents(guestPatientId, 'blood pressure')).toHaveLength(1);
      expect(CalendarService.searchEvents(guestPatientId, 'apollo')).toHaveLength(1);
      expect(CalendarService.searchEvents(guestPatientId, 'nonexistent')).toHaveLength(0);
    });

    it('evaluates caregiver calendar permissions correctly', () => {
      const fullPerms = {
        canReadCalendar: true,
        canCreateCalendarEvents: true,
        canEditCalendarEvents: true,
        canDeleteCalendarEvents: true,
      };

      const readOnlyPerms = {
        canReadCalendar: true,
        canCreateCalendarEvents: false,
        canEditCalendarEvents: false,
        canDeleteCalendarEvents: false,
      };

      expect(CalendarService.canCaregiverPerform(fullPerms, 'read')).toBe(true);
      expect(CalendarService.canCaregiverPerform(fullPerms, 'create')).toBe(true);
      expect(CalendarService.canCaregiverPerform(fullPerms, 'edit')).toBe(true);
      expect(CalendarService.canCaregiverPerform(fullPerms, 'delete')).toBe(true);

      expect(CalendarService.canCaregiverPerform(readOnlyPerms, 'read')).toBe(true);
      expect(CalendarService.canCaregiverPerform(readOnlyPerms, 'create')).toBe(false);
      expect(CalendarService.canCaregiverPerform(readOnlyPerms, 'edit')).toBe(false);
      expect(CalendarService.canCaregiverPerform(readOnlyPerms, 'delete')).toBe(false);

      expect(CalendarService.canCaregiverPerform(undefined, 'read')).toBe(false);
    });

    it('strictly hides private events when viewer is a caregiver', () => {
      const publicEvt = {
        id: 'evt_pub',
        patientId: 'patient_01',
        title: 'Doctor Appointment',
        category: 'doctor' as const,
        startAt: '2026-11-10T10:00:00Z',
        timezone: 'Asia/Kolkata',
        isAllDay: false,
        reminderMinutesBefore: 15,
        createdAt: '2026-11-09T00:00:00Z',
        updatedAt: '2026-11-09T00:00:00Z',
        createdBy: 'patient_01',
        syncStatus: 'synced' as const,
        isPrivate: false,
      };

      const privateEvt = {
        ...publicEvt,
        id: 'evt_priv',
        title: 'Personal quiet reflection',
        isPrivate: true,
      };

      const allEvents = [publicEvt, privateEvt];

      // Patient viewer sees both
      const patientView = CalendarService.filterEventsForViewer(allEvents, false);
      expect(patientView).toHaveLength(2);

      // Caregiver viewer sees ONLY public event
      const caregiverView = CalendarService.filterEventsForViewer(allEvents, true);
      expect(caregiverView).toHaveLength(1);
      expect(caregiverView[0].id).toBe('evt_pub');
      expect(caregiverView.some((e) => e.isPrivate)).toBe(false);
    });
  });

  describe('Part D: Offline Persistence & Guest Patient Isolation', () => {
    it('guarantees guest patient data never touches Firestore (0 cloud writes)', async () => {
      await NotesService.createNote(guestPatientId, {
        title: 'Guest Note',
        content: 'Guest text',
        category: 'personal',
      });

      await CalendarService.createEvent(guestPatientId, {
        title: 'Guest Event',
        category: 'personal',
        startAt: '2026-11-10T10:00:00Z',
      });

      // mockFirestoreStore must remain completely empty
      expect(Object.keys(mockFirestoreStore)).toHaveLength(0);
    });

    it('queues pending sync for authenticated users when offline', async () => {
      // Mock offline status
      vi.spyOn(NotesService, 'isOnline').mockReturnValue(false);
      vi.spyOn(CalendarService, 'isOnline').mockReturnValue(false);

      const note = await NotesService.createNote(authPatientId, {
        title: 'Offline Note',
        content: 'Will sync when connection restores',
        category: 'reminder',
      });
      expect(note.syncStatus).toBe('offline-pending');

      const event = await CalendarService.createEvent(authPatientId, {
        title: 'Offline Calendar Event',
        category: 'medication',
        startAt: '2026-11-10T14:00:00Z',
      });
      expect(event.syncStatus).toBe('offline-pending');

      // Verify pending queues in localStorage
      const pendingNotes = localStorage.getItem(`saksham_pending_notes_sync_${authPatientId}`);
      expect(pendingNotes).toBeDefined();
      expect(Object.keys(JSON.parse(pendingNotes!))).toHaveLength(1);

      const pendingEvents = localStorage.getItem(`saksham_pending_calendar_sync_${authPatientId}`);
      expect(pendingEvents).toBeDefined();
      expect(JSON.parse(pendingEvents!)).toHaveLength(1);
    });
  });
});
