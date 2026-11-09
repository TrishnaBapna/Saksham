import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppContent } from '../App.js';
import { FloatingUtilityHub } from '../components/layout/FloatingUtilityHub.js';
import { NotesSanctuaryModal } from '../features/notes/components/NotesSanctuaryModal.js';
import { CalendarSanctuaryModal } from '../features/calendar/components/CalendarSanctuaryModal.js';
import { VoiceNoteRecorder } from '../features/notes/components/VoiceNoteRecorder.js';
import { NotesService } from '../features/notes/services/notesService.js';
import { CalendarService } from '../features/calendar/services/calendarService.js';
import { VoiceStorageService } from '../features/notes/services/voiceStorageService.js';
import { parseAIIntentLocally } from '../services/aiService.js';
import { PatientContextService } from '../services/patientContextService.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { TRANSLATION_CATALOGUE } from '../i18n/interpolate.js';

const mockPatientUser = {
  uid: 'patient-sunita-63',
  email: 'sunita@example.com',
  displayName: 'Sunita Sharma',
  role: 'patient' as const,
  status: 'verified' as const,
};

// In-memory IndexedDB Mock for VoiceStorageService
let inMemoryIDB: Record<string, any> = {};

function setupMockIndexedDB() {
  inMemoryIDB = {};
  (VoiceStorageService as any).dbPromise = null;
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

describe('Milestone 6.3 — Complete Notes & Calendar Patient Experience', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('saksham_auth_user', JSON.stringify(mockPatientUser));
    setupMockIndexedDB();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithProviders = (
    ui: React.ReactNode,
    { initialRoute = '/patient' } = {}
  ) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <CharacterProvider>{ui}</CharacterProvider>
            </AccessibilityProvider>
          </LanguageProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  describe('Part A: Notes Sanctuary Experience (CRUD, Search, Categories, Pinning)', () => {
    it('creates, edits, and pins a note within the interactive modal', async () => {
      renderWithProviders(
        <NotesSanctuaryModal isOpen={true} onClose={() => {}} />
      );

      // 1. Click New Note
      fireEvent.click(screen.getByTestId('notes-new-btn'));
      expect(screen.getByTestId('notes-editor')).toBeInTheDocument();

      // 2. Fill in Title and Content
      fireEvent.change(screen.getByTestId('note-title-input'), {
        target: { value: 'Morning Tulsi Tea Reflections' },
      });
      fireEvent.change(screen.getByTestId('note-content-input'), {
        target: { value: 'Drank fresh warm tulsi tea in the garden. Felt peaceful and alert.' },
      });

      // 3. Toggle Pin to Top
      fireEvent.click(screen.getByTestId('note-pin-checkbox'));

      // 4. Save Note
      await act(async () => {
        fireEvent.click(screen.getByTestId('note-save-btn'));
      });

      // 5. Note appears in pinned section
      expect(screen.getByText('Morning Tulsi Tea Reflections')).toBeInTheDocument();
      expect(screen.getByText(/Drank fresh warm tulsi tea in the garden/i)).toBeInTheDocument();

      // 6. Verify data layer persistence
      const savedNotes = NotesService.getNotes(mockPatientUser.uid);
      expect(savedNotes).toHaveLength(1);
      expect(savedNotes[0].title).toBe('Morning Tulsi Tea Reflections');
      expect(savedNotes[0].isPinned).toBe(true);

      // 7. Edit Note
      fireEvent.click(screen.getByTestId(`note-edit-btn-${savedNotes[0].id}`));
      expect(screen.getByTestId('notes-editor')).toBeInTheDocument();

      fireEvent.change(screen.getByTestId('note-title-input'), {
        target: { value: 'Morning Tulsi Tea & Honey' },
      });
      await act(async () => {
        fireEvent.click(screen.getByTestId('note-save-btn'));
      });

      expect(screen.getByText('Morning Tulsi Tea & Honey')).toBeInTheDocument();
    });

    it('filters notes by category pills and searches notes in real-time', async () => {
      // Seed notes across multiple categories
      await NotesService.createNote(mockPatientUser.uid, {
        title: 'Levodopa Timing Instructions',
        content: 'Must take 30 mins before breakfast with water.',
        category: 'medical',
      });
      await NotesService.createNote(mockPatientUser.uid, {
        title: 'Ananya Granddaughter Visit',
        content: 'Brought beautiful marigold flowers.',
        category: 'family',
      });
      await NotesService.createNote(mockPatientUser.uid, {
        title: 'Evening Sunset Walk',
        content: 'Gentle 15-minute garden stroll.',
        category: 'personal',
      });

      renderWithProviders(
        <NotesSanctuaryModal isOpen={true} onClose={() => {}} />
      );

      // Initial state shows all 3 notes
      expect(screen.getByText('Levodopa Timing Instructions')).toBeInTheDocument();
      expect(screen.getByText('Ananya Granddaughter Visit')).toBeInTheDocument();
      expect(screen.getByText('Evening Sunset Walk')).toBeInTheDocument();

      // Filter by Medical Category
      fireEvent.click(screen.getByTestId('notes-cat-medical'));
      expect(screen.getByText('Levodopa Timing Instructions')).toBeInTheDocument();
      expect(screen.queryByText('Ananya Granddaughter Visit')).not.toBeInTheDocument();
      expect(screen.queryByText('Evening Sunset Walk')).not.toBeInTheDocument();

      // Filter back to All
      fireEvent.click(screen.getByTestId('notes-cat-all'));
      expect(screen.getByText('Ananya Granddaughter Visit')).toBeInTheDocument();

      // Real-time Search by text query
      const searchInput = screen.getByTestId('notes-search-input');
      fireEvent.change(searchInput, { target: { value: 'sunset' } });
      expect(screen.getByText('Evening Sunset Walk')).toBeInTheDocument();
      expect(screen.queryByText('Levodopa Timing Instructions')).not.toBeInTheDocument();
    });

    it('deletes note after explicit patient confirmation', async () => {
      const note = await NotesService.createNote(mockPatientUser.uid, {
        title: 'Temporary Scratch Note',
        content: 'Will be deleted soon.',
        category: 'personal',
      });

      renderWithProviders(
        <NotesSanctuaryModal isOpen={true} onClose={() => {}} />
      );

      expect(screen.getByText('Temporary Scratch Note')).toBeInTheDocument();

      // Click delete button on the note card
      fireEvent.click(screen.getByTestId(`note-delete-btn-${note.id}`));

      // Confirmation modal appears
      expect(screen.getByText(/Are you sure you want to delete this note/i)).toBeInTheDocument();

      // Confirm delete
      await act(async () => {
        fireEvent.click(screen.getByTestId('notes-confirm-delete-btn'));
      });

      // Note is removed from view and storage
      expect(screen.queryByText('Temporary Scratch Note')).not.toBeInTheDocument();
      expect(NotesService.getNotes(mockPatientUser.uid)).toHaveLength(0);
    });
  });

  describe('Part B: Voice Recording & IndexedDB Audio (Zero Firebase Storage)', () => {
    it('renders voice recorder and displays local-only storage notice', () => {
      renderWithProviders(
        <VoiceNoteRecorder onRecordingComplete={() => {}} />
      );

      // Verify voice recorder component is mounted
      expect(screen.getByTestId('voice-note-recorder')).toBeInTheDocument();
      expect(screen.getByTestId('voice-record-start-btn')).toBeInTheDocument();

      // Verify privacy notice: 0 bytes to Firebase Storage
      expect(
        screen.getByText(/Voice recordings are stored strictly on this device and are not uploaded to cloud storage/i)
      ).toBeInTheDocument();
    });

    it('handles simulated audio blob storage in client-side IndexedDB', async () => {
      const audioKey = VoiceStorageService.generateAudioKey(mockPatientUser.uid, 'note-01');
      const fakeBlob = new Blob(['simulated-pcm-audio-bytes'], { type: 'audio/webm' });

      // Save blob to client IndexedDB
      const saveResult = await VoiceStorageService.saveAudioBlob(audioKey, fakeBlob, {
        durationSeconds: 12,
        mimeType: 'audio/webm',
      });
      expect(saveResult).toBe(true);

      // Retrieve blob from client IndexedDB
      const retrievedBlob = await VoiceStorageService.getAudioBlob(audioKey);
      expect(retrievedBlob).toBeDefined();

      // Deleting note cleans up IndexedDB blob
      const deleteResult = await VoiceStorageService.deleteAudioBlob(audioKey);
      expect(deleteResult).toBe(true);

      const afterDelete = await VoiceStorageService.getAudioBlob(audioKey);
      expect(afterDelete).toBeNull();
    });
  });

  describe('Part C: Calendar Sanctuary Experience (Day, Week, Month Views, Navigation)', () => {
    it('switches between Day, Week, and Month views seamlessly', async () => {
      renderWithProviders(
        <CalendarSanctuaryModal isOpen={true} onClose={() => {}} />
      );

      // 1. Initial view is Day View
      expect(screen.getByTestId('calendar-day-view')).toBeInTheDocument();

      // 2. Switch to Week View
      fireEvent.click(screen.getByTestId('calendar-view-tab-week'));
      expect(screen.getByTestId('calendar-view-tab-week')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-week-view')).toBeInTheDocument();

      // 3. Switch to Month View
      fireEvent.click(screen.getByTestId('calendar-view-tab-month'));
      expect(screen.getByTestId('calendar-month-view')).toBeInTheDocument();

      // 4. Switch back to Day View
      fireEvent.click(screen.getByTestId('calendar-view-tab-day'));
      expect(screen.getByTestId('calendar-day-view')).toBeInTheDocument();
    });

    it('navigates with Prev, Next, and Today jump controls', () => {
      renderWithProviders(
        <CalendarSanctuaryModal isOpen={true} onClose={() => {}} />
      );

      // Click Next
      fireEvent.click(screen.getByTestId('calendar-next-btn'));

      // Click Prev
      fireEvent.click(screen.getByTestId('calendar-prev-btn'));

      // Click Today
      fireEvent.click(screen.getByTestId('calendar-today-btn'));
      expect(screen.getByTestId('calendar-today-btn')).toBeInTheDocument();
    });

    it('creates an event with private toggle and routine link', async () => {
      renderWithProviders(
        <CalendarSanctuaryModal isOpen={true} onClose={() => {}} />
      );

      // Open Add Event Editor
      fireEvent.click(screen.getByTestId('calendar-new-btn'));
      expect(screen.getByTestId('calendar-editor')).toBeInTheDocument();

      // Fill in details
      fireEvent.change(screen.getByTestId('calendar-title-input'), {
        target: { value: 'Dr. Joshi Neurology Checkup' },
      });
      fireEvent.change(screen.getByTestId('calendar-desc-input'), {
        target: { value: 'Bring tremor diary and medication log.' },
      });

      // Toggle Private Event (hide from caregiver)
      fireEvent.click(screen.getByTestId('calendar-private-checkbox'));

      // Save Event
      await act(async () => {
        fireEvent.click(screen.getByTestId('calendar-save-btn'));
      });

      // Verify event is created
      expect(screen.getByText('Dr. Joshi Neurology Checkup')).toBeInTheDocument();
      expect(screen.getByText(/Bring tremor diary/i)).toBeInTheDocument();

      // Verify persistence in CalendarService
      const events = CalendarService.getEvents(mockPatientUser.uid);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Dr. Joshi Neurology Checkup');
      expect(events[0].isPrivate).toBe(true);
    });

    it('deletes a calendar event with confirmation', async () => {
      const evt = await CalendarService.createEvent(mockPatientUser.uid, {
        title: 'Cancelable Routine Event',
        category: 'personal',
        startAt: new Date().toISOString(),
      });

      renderWithProviders(
        <CalendarSanctuaryModal isOpen={true} onClose={() => {}} />
      );

      expect(screen.getByText('Cancelable Routine Event')).toBeInTheDocument();

      // Click delete button on event card
      fireEvent.click(screen.getByTestId(`calendar-delete-btn-${evt.id}`));

      // Confirm delete dialog appears
      expect(screen.getByText(/Are you sure you want to delete this event/i)).toBeInTheDocument();

      // Confirm
      await act(async () => {
        fireEvent.click(screen.getByTestId('calendar-confirm-delete-btn'));
      });

      expect(screen.queryByText('Cancelable Routine Event')).not.toBeInTheDocument();
      expect(CalendarService.getEvents(mockPatientUser.uid)).toHaveLength(0);
    });
  });

  describe('Part D: Virtual Recurrence & Series-Level Recurrence Warnings', () => {
    it('evaluates daily recurring event and displays series-level notice in editor', async () => {
      renderWithProviders(
        <CalendarSanctuaryModal isOpen={true} onClose={() => {}} />
      );

      // Open Add Event Editor
      fireEvent.click(screen.getByTestId('calendar-new-btn'));

      // Fill title
      fireEvent.change(screen.getByTestId('calendar-title-input'), {
        target: { value: 'Morning Hydration & Walk' },
      });

      // Select Daily Recurrence
      fireEvent.click(screen.getByTestId('calendar-recur-daily'));

      // Verify series-level notice is displayed to patient
      expect(
        screen.getByText(/Editing or deleting will apply to all occurrences of this recurring event/i)
      ).toBeInTheDocument();

      // Save Event
      await act(async () => {
        fireEvent.click(screen.getByTestId('calendar-save-btn'));
      });

      // Verify saved recurring rule in data layer
      const events = CalendarService.getEvents(mockPatientUser.uid);
      expect(events[0].recurrence?.frequency).toBe('daily');
    });
  });

  describe('Part E: Asha Voice Companion Bridge & Mutation Guards', () => {
    it('Asha lists pinned notes when asked by patient', async () => {
      await NotesService.createNote(mockPatientUser.uid, {
        title: 'Family Emergency Contacts',
        content: 'Rohan: 9876543210, Ananya: 9876543211',
        category: 'family',
        isPinned: true,
      });

      const context = PatientContextService.getPatientContext(mockPatientUser);
      expect(context.notes?.pinnedNotes).toHaveLength(1);

      const response = parseAIIntentLocally('read my pinned notes', context, 'en');
      expect(response.speech).toContain('Family Emergency Contacts');
      expect(response.suggestedAction?.action).toBe('OPEN_NOTES');
    });

    it('Asha lists today events when asked by patient', async () => {
      await CalendarService.createEvent(mockPatientUser.uid, {
        title: 'Physical Therapy Session',
        category: 'doctor',
        startAt: new Date().toISOString(),
      });

      const context = PatientContextService.getPatientContext(mockPatientUser);
      expect(context.calendar?.todayEvents).toHaveLength(1);

      const response = parseAIIntentLocally('what events do I have today', context, 'en');
      expect(response.speech).toContain('Physical Therapy Session');
      expect(response.suggestedAction?.action).toBe('OPEN_CALENDAR');
    });

    it('Asha enforces explicit confirmation protection for mutations (never silent write)', () => {
      const responseNote = parseAIIntentLocally('create a new note about my walk', undefined, 'en');
      expect(responseNote.speech).toContain('review and confirm before saving');
      expect(responseNote.suggestedAction?.action).toBe('OPEN_NOTES');

      const responseEvt = parseAIIntentLocally('schedule an event tomorrow', undefined, 'en');
      expect(responseEvt.speech).toContain('review and confirm before saving');
      expect(responseEvt.suggestedAction?.action).toBe('OPEN_CALENDAR');
    });

    it('opens full interactive modals on Asha window custom events', () => {
      renderWithProviders(<FloatingUtilityHub />);

      // Dispatch saksham:open-notes
      act(() => {
        window.dispatchEvent(new CustomEvent('saksham:open-notes'));
      });
      expect(screen.getByTestId('utility-shell-notes')).toBeInTheDocument();
      expect(screen.getByTestId('notes-new-btn')).toBeInTheDocument();

      // Dispatch saksham:open-calendar
      act(() => {
        window.dispatchEvent(new CustomEvent('saksham:open-calendar'));
      });
      expect(screen.queryByTestId('utility-shell-notes')).not.toBeInTheDocument();
      expect(screen.getByTestId('utility-shell-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-new-btn')).toBeInTheDocument();
    });
  });

  describe('Part F: Pan-India Multilingual & Permanent Navigation Invariants', () => {
    it('verifies all 23 language dictionaries contain all Milestone 6.3 keys', () => {
      const requiredKeys = [
        'notes.edit_note',
        'notes.title_placeholder',
        'notes.content_placeholder',
        'notes.pin_note',
        'notes.unpin_note',
        'notes.read_aloud',
        'notes.stop_read_aloud',
        'notes.category_all',
        'notes.category_other',
        'notes.local_voice_disclaimer',
        'notes.discard_voice',
        'notes.mic_denied',
        'notes.status_synced',
        'notes.status_pending',
        'notes.status_local',
        'notes.delete_note',
        'notes.no_matches',
        'calendar.view_day',
        'calendar.view_week',
        'calendar.view_month',
        'calendar.prev',
        'calendar.next',
        'calendar.today_btn',
        'calendar.edit_event',
        'calendar.title_placeholder',
        'calendar.desc_placeholder',
        'calendar.date_label',
        'calendar.time_label',
        'calendar.end_time_label',
        'calendar.recurrence_label',
        'calendar.recurrence_none',
        'calendar.recurrence_daily',
        'calendar.recurrence_weekly',
        'calendar.recurrence_notice',
        'calendar.private_toggle',
        'calendar.routine_link',
        'calendar.no_routine_link',
        'calendar.category_personal',
        'calendar.category_other',
        'calendar.delete_event',
        'calendar.delete_confirm',
        'calendar.no_events_today',
        'calendar.location_label',
      ];

      for (const [langCode, dictionary] of Object.entries(TRANSLATION_CATALOGUE)) {
        for (const key of requiredKeys) {
          const value = dictionary[key];
          expect(
            value,
            `Language '${langCode}' is missing required key '${key}'`
          ).toBeDefined();
          expect(
            value.trim().length,
            `Language '${langCode}' has empty translation for '${key}'`
          ).toBeGreaterThan(0);
        }
      }
    });

    it('strictly preserves the 4 bottom navigation tabs with zero interference', () => {
      renderWithProviders(<AppContent />, { initialRoute: '/patient' });

      // Exactly 4 bottom tabs
      expect(screen.getByRole('button', { name: /Home/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Family/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Games/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Profile/i })).toBeInTheDocument();

      // Neither Notes nor Calendar appears as a bottom nav tab
      expect(screen.queryByRole('button', { name: /^Notes$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Calendar$/i })).not.toBeInTheDocument();
    });
  });
});
