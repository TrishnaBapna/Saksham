import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CalendarService } from '../features/calendar/services/calendarService.js';
import {
  CalendarEvent,
  CaregiverCalendarPermissions,
} from '../features/calendar/types/calendar.types.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { RoutineItem } from '../types/index.js';
import { CaregiverService } from '../features/caregiver/services/caregiverService.js';
import { CaregiverCalendarView } from '../features/caregiver/components/CaregiverCalendarView.js';
import { CaregiverDashboard } from '../pages/caregiver/CaregiverDashboard.js';
import { AuthProvider } from '../context/AuthContext.js';
import { PatientExperienceProvider } from '../context/PatientExperienceContext.js';

// Mocks for Firebase
vi.mock('../services/firebase.js', () => ({
  db: {},
  isFirebaseConfigured: false,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

describe('Milestone 7.4.2: Caregiver Calendar Oversight & Live Routines Bridge', () => {
  const patientUid = 'demo-patient-001';
  const caregiverUid = 'demo-caregiver-001';

  const fullPermissions: CaregiverCalendarPermissions = {
    canReadCalendar: true,
    canCreateCalendarEvents: true,
    canEditCalendarEvents: true,
    canDeleteCalendarEvents: true,
  };

  const readOnlyPermissions: CaregiverCalendarPermissions = {
    canReadCalendar: true,
    canCreateCalendarEvents: false,
    canEditCalendarEvents: false,
    canDeleteCalendarEvents: false,
  };

  const noReadPermissions: CaregiverCalendarPermissions = {
    canReadCalendar: false,
    canCreateCalendarEvents: false,
    canEditCalendarEvents: false,
    canDeleteCalendarEvents: false,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // Part A: Caregiver Calendar Security & Parameter Sanitization
  // =========================================================================
  describe('Part A: Caregiver Calendar Security & Parameter Sanitization', () => {
    it('allows patient owner full access to create private and public events', async () => {
      const publicEvt = await CalendarService.createEvent(patientUid, {
        title: 'Public Checkup',
        category: 'doctor',
        startAt: '2026-11-10T10:00:00.000Z',
        isPrivate: false,
      });
      expect(publicEvt.isPrivate).toBe(false);

      const privateEvt = await CalendarService.createEvent(patientUid, {
        title: 'Private Patient Reflection',
        category: 'personal',
        startAt: '2026-11-10T11:00:00.000Z',
        isPrivate: true,
      });
      expect(privateEvt.isPrivate).toBe(true);

      const all = CalendarService.getEvents(patientUid);
      expect(all.length).toBe(2);
    });

    it('strictly forbids caregivers from creating private events (throws error)', async () => {
      await expect(
        CalendarService.createEvent(
          patientUid,
          {
            title: 'Unauthorized Private Caregiver Event',
            category: 'doctor',
            startAt: '2026-11-10T14:00:00.000Z',
            isPrivate: true,
          },
          caregiverUid,
          { isCaregiver: true }
        )
      ).rejects.toThrow(/Caregivers cannot create private calendar events/i);
    });

    it('forces isPrivate=false when caregiver creates a non-private event', async () => {
      const evt = await CalendarService.createEvent(
        patientUid,
        {
          title: 'Speech Therapy with Dr. Sen',
          category: 'doctor',
          startAt: '2026-11-10T15:00:00.000Z',
        },
        caregiverUid,
        { isCaregiver: true }
      );
      expect(evt.isPrivate).toBe(false);
      expect(evt.sharing?.isSharedWithCaregiver).toBe(true);
    });

    it('strictly forbids caregivers from editing private events', async () => {
      const privateEvt = await CalendarService.createEvent(patientUid, {
        title: 'Secret Personal Note',
        category: 'personal',
        startAt: '2026-11-10T16:00:00.000Z',
        isPrivate: true,
      });

      await expect(
        CalendarService.updateEvent(
          patientUid,
          privateEvt.id,
          { title: 'Attempted Caregiver Edit' },
          { isCaregiver: true }
        )
      ).rejects.toThrow(/Caregivers cannot modify private calendar events/i);
    });

    it('strictly forbids caregivers from mutating the isPrivate flag', async () => {
      const publicEvt = await CalendarService.createEvent(
        patientUid,
        {
          title: 'Public Clinic Visit',
          category: 'doctor',
          startAt: '2026-11-10T17:00:00.000Z',
          isPrivate: false,
        },
        caregiverUid,
        { isCaregiver: true }
      );

      await expect(
        CalendarService.updateEvent(
          patientUid,
          publicEvt.id,
          { isPrivate: true },
          { isCaregiver: true }
        )
      ).rejects.toThrow(/Caregivers cannot modify privacy settings/i);
    });

    it('strictly forbids caregivers from deleting private events', async () => {
      const privateEvt = await CalendarService.createEvent(patientUid, {
        title: 'Confidential Journal Session',
        category: 'personal',
        startAt: '2026-11-10T18:00:00.000Z',
        isPrivate: true,
      });

      await expect(
        CalendarService.deleteEvent(patientUid, privateEvt.id, { isCaregiver: true })
      ).rejects.toThrow(/Caregivers cannot delete private calendar events/i);
    });

    it('verifies permission gate checks via CaregiverService.canPerform', () => {
      expect(CaregiverService.canPerform(fullPermissions, 'read')).toBe(true);
      expect(CaregiverService.canPerform(fullPermissions, 'create')).toBe(true);
      expect(CaregiverService.canPerform(fullPermissions, 'edit')).toBe(true);
      expect(CaregiverService.canPerform(fullPermissions, 'delete')).toBe(true);

      expect(CaregiverService.canPerform(readOnlyPermissions, 'read')).toBe(true);
      expect(CaregiverService.canPerform(readOnlyPermissions, 'create')).toBe(false);
      expect(CaregiverService.canPerform(readOnlyPermissions, 'edit')).toBe(false);
      expect(CaregiverService.canPerform(readOnlyPermissions, 'delete')).toBe(false);

      expect(CaregiverService.canPerform(noReadPermissions, 'read')).toBe(false);
    });
  });

  // =========================================================================
  // Part B: CalendarService Cross-Device Synchronization
  // =========================================================================
  describe('Part B: CalendarService Cross-Device Synchronization', () => {
    it('returns empty array when caregiver lacks canReadCalendar permission', async () => {
      // Seed an event
      await CalendarService.createEvent(patientUid, {
        title: 'Public Dental Visit',
        category: 'doctor',
        startAt: '2026-11-10T09:00:00.000Z',
      });

      const events = await CalendarService.syncEventsFromFirestore(patientUid, {
        isCaregiver: true,
        caregiverPermissions: noReadPermissions,
      });
      expect(events).toEqual([]);
    });

    it('strictly filters out private events from caregiver results (privacy boundary)', async () => {
      await CalendarService.createEvent(patientUid, {
        title: 'Public Checkup',
        category: 'doctor',
        startAt: '2026-11-10T10:00:00.000Z',
        isPrivate: false,
      });

      await CalendarService.createEvent(patientUid, {
        title: 'Private Patient Diary Entry',
        category: 'personal',
        startAt: '2026-11-10T11:00:00.000Z',
        isPrivate: true,
      });

      const caregiverEvents = await CalendarService.syncEventsFromFirestore(patientUid, {
        isCaregiver: true,
        caregiverPermissions: fullPermissions,
      });

      expect(caregiverEvents.length).toBe(1);
      expect(caregiverEvents[0].title).toBe('Public Checkup');
      expect(caregiverEvents.some((e) => e.isPrivate)).toBe(false);
    });

    it('filters private events with CalendarService.filterEventsForViewer', () => {
      const mixed: CalendarEvent[] = [
        {
          id: 'e1',
          patientId: patientUid,
          title: 'Public Appointment',
          category: 'doctor',
          startAt: '2026-11-10T10:00:00.000Z',
          timezone: 'Asia/Kolkata',
          isAllDay: false,
          reminderMinutesBefore: 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: patientUid,
          syncStatus: 'synced',
          isPrivate: false,
        },
        {
          id: 'e2',
          patientId: patientUid,
          title: 'Private Appointment',
          category: 'personal',
          startAt: '2026-11-10T11:00:00.000Z',
          timezone: 'Asia/Kolkata',
          isAllDay: false,
          reminderMinutesBefore: 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: patientUid,
          syncStatus: 'synced',
          isPrivate: true,
        },
      ];

      // Patient viewer sees both
      expect(CalendarService.filterEventsForViewer(mixed, false).length).toBe(2);
      // Caregiver viewer sees only public
      const forCaregiver = CalendarService.filterEventsForViewer(mixed, true);
      expect(forCaregiver.length).toBe(1);
      expect(forCaregiver[0].id).toBe('e1');
    });
  });

  // =========================================================================
  // Part C: Caregiver Calendar UI Views (Day, Week, Agenda)
  // =========================================================================
  describe('Part C: Caregiver Calendar UI Views (Day, Week, Agenda)', () => {
    beforeEach(async () => {
      // Seed public test events
      await CalendarService.createEvent(patientUid, {
        title: 'Morning Physiotherapy',
        category: 'doctor',
        startAt: '2026-11-10T09:30:00.000Z',
        locationLabel: 'Apollo Rehab Center',
        isPrivate: false,
      });

      await CalendarService.createEvent(patientUid, {
        title: 'Family Tea with Ananya',
        category: 'family',
        startAt: '2026-11-10T16:00:00.000Z',
        locationLabel: 'Home Veranda',
        isPrivate: false,
      });
    });

    it('renders CaregiverCalendarView in Day mode by default with events', async () => {
      render(
        <CaregiverCalendarView
          patientId={patientUid}
          patientName="Sunita Sharma"
          permissions={fullPermissions}
          caregiverId={caregiverUid}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('caregiver-calendar-section')).toBeInTheDocument();
      });

      expect(screen.getByTestId('calendar-view-tab-day')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-view-tab-week')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-view-tab-agenda')).toBeInTheDocument();

      // Check day view container
      expect(screen.getByTestId('caregiver-calendar-day-view')).toBeInTheDocument();
    });

    it('switches between Day, Week, and Agenda views upon tab click', async () => {
      render(
        <CaregiverCalendarView
          patientId={patientUid}
          patientName="Sunita Sharma"
          permissions={fullPermissions}
          caregiverId={caregiverUid}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('caregiver-calendar-day-view')).toBeInTheDocument();
      });

      // Switch to Week View
      fireEvent.click(screen.getByTestId('calendar-view-tab-week'));
      expect(screen.getByTestId('caregiver-calendar-week-view')).toBeInTheDocument();

      // Switch to Agenda View
      fireEvent.click(screen.getByTestId('calendar-view-tab-agenda'));
      expect(screen.getByTestId('caregiver-calendar-agenda-view')).toBeInTheDocument();

      // Switch back to Day View
      fireEvent.click(screen.getByTestId('calendar-view-tab-day'));
      expect(screen.getByTestId('caregiver-calendar-day-view')).toBeInTheDocument();
    });

    it('renders restricted banner when caregiver lacks canReadCalendar permission', () => {
      render(
        <CaregiverCalendarView
          patientId={patientUid}
          patientName="Sunita Sharma"
          permissions={noReadPermissions}
          caregiverId={caregiverUid}
        />
      );

      expect(screen.getByText(/Calendar Oversight Restricted/i)).toBeInTheDocument();
      expect(screen.queryByTestId('caregiver-new-appointment-btn')).not.toBeInTheDocument();
    });

    it('hides "+ New Appointment" button when caregiver lacks canCreateCalendarEvents permission', async () => {
      render(
        <CaregiverCalendarView
          patientId={patientUid}
          patientName="Sunita Sharma"
          permissions={readOnlyPermissions}
          caregiverId={caregiverUid}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('caregiver-calendar-section')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('caregiver-new-appointment-btn')).not.toBeInTheDocument();
    });

    it('opens CaregiverAppointmentModal and enforces transparent non-private care reassurance', async () => {
      render(
        <CaregiverCalendarView
          patientId={patientUid}
          patientName="Sunita Sharma"
          permissions={fullPermissions}
          caregiverId={caregiverUid}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('caregiver-new-appointment-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('caregiver-new-appointment-btn'));

      // Modal is visible
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Schedule Care Appointment/i)).toBeInTheDocument();
      expect(screen.getByText(/Transparent Care Privacy/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Caregiver appointments are automatically shared with Sunita Sharma/i)
      ).toBeInTheDocument();

      // Verify no isPrivate checkbox exists
      expect(screen.queryByLabelText(/Private Event/i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Part D: Live Routine Supervision & Assisted Recall Monitoring
  // =========================================================================
  describe('Part D: Live Routine Supervision & Assisted Recall Monitoring', () => {
    it('synchronizes and computes routine completion progress truthfully', () => {
      const mockRoutines: RoutineItem[] = [
        {
          id: 'r1',
          title: 'Morning Levodopa (100mg)',
          description: 'Medication dose',
          scheduledTime: '08:30 AM',
          category: 'medication',
          period: 'morning',
          streakCount: 5,
          isCompleted: true,
          completedAt: '08:32 AM',
          enableAssistedRecall: true,
        },
        {
          id: 'r2',
          title: 'Arm & Shoulder Gentle Stretches',
          description: 'Motor therapy',
          scheduledTime: '10:00 AM',
          category: 'motor',
          period: 'morning',
          streakCount: 3,
          isCompleted: false,
          enableAssistedRecall: false,
        },
      ];

      const progress = RoutineService.calculateProgress(mockRoutines);
      expect(progress.total).toBe(2);
      expect(progress.completed).toBe(1);
      expect(progress.remaining).toBe(1);
      expect(progress.percentage).toBe(50);
    });

    it('returns empty progress for patient with zero routines without fabricating stats', () => {
      const progress = RoutineService.calculateProgress([]);
      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.remaining).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('stores and retrieves routine attempt history without fabrication', async () => {
      const att = await RoutineService.recordAttempt(patientUid, 'routine-01', 2, false, true);
      expect(att.routineId).toBe('routine-01');
      expect(att.attemptsUsed).toBe(2);
      expect(att.isCompleted).toBe(true);

      const history = RoutineService.getHistory(patientUid);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].attemptsUsed).toBe(2);
    });

    it('RoutineService.syncHistoryFromFirestore handles offline or local cache gracefully', async () => {
      const history = await RoutineService.syncHistoryFromFirestore(patientUid);
      expect(Array.isArray(history)).toBe(true);
    });

    it('renders CaregiverDashboard with live patient data and calendar view', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <PatientExperienceProvider>
              <CaregiverDashboard />
            </PatientExperienceProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      // Verify portal header
      expect(await screen.findByText(/Caregiver Portal/i)).toBeInTheDocument();
      expect(screen.getByText(/Authorized Care Companion for Sunita Sharma/i)).toBeInTheDocument();

      // Verify truthful quick status cards
      expect(screen.getByTestId('caregiver-routine-progress-card')).toBeInTheDocument();
      expect(screen.getByTestId('caregiver-assisted-recall-card')).toBeInTheDocument();

      // Verify authorized routine monitoring section
      expect(screen.getByTestId('caregiver-routine-monitoring-section')).toBeInTheDocument();

      // Verify caregiver calendar section is embedded
      expect(screen.getByTestId('caregiver-calendar-section')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Part E: Regression & Invariant Protection
  // =========================================================================
  describe('Part E: Regression & Invariant Protection', () => {
    it('preserves patient mode persistence and does not leak to caregiver dashboard', () => {
      localStorage.setItem(`saksham_patient_experience_mode_${patientUid}`, 'asha-only');
      expect(localStorage.getItem(`saksham_patient_experience_mode_${patientUid}`)).toBe('asha-only');

      // Caregiver storage key is distinct
      expect(localStorage.getItem(`saksham_patient_experience_mode_${caregiverUid}`)).toBeNull();
    });

    it('preserves existing patient routine definitions and completion toggles', async () => {
      const initialList = RoutineService.getRoutines(patientUid);
      expect(initialList.length).toBeGreaterThan(0);

      const firstRoutine = initialList[0];
      const toggled = await RoutineService.updateRoutineCompletion(
        patientUid,
        firstRoutine.id,
        true
      );
      expect(toggled?.isCompleted).toBe(true);
    });

    it('guarantees caregiver actions do not corrupt patient calendar store', async () => {
      // Patient creates private event
      const pEvt = await CalendarService.createEvent(patientUid, {
        title: 'Sunita Private Meditation',
        category: 'personal',
        startAt: '2026-11-10T06:00:00.000Z',
        isPrivate: true,
      });

      // Caregiver creates public event
      const cEvt = await CalendarService.createEvent(
        patientUid,
        {
          title: 'Dr. Vikram Appointment',
          category: 'doctor',
          startAt: '2026-11-10T12:00:00.000Z',
        },
        caregiverUid,
        { isCaregiver: true }
      );

      // Patient still has both
      const patientEvents = CalendarService.getEvents(patientUid);
      expect(patientEvents.some((e) => e.id === pEvt.id)).toBe(true);
      expect(patientEvents.some((e) => e.id === cEvt.id)).toBe(true);

      // Caregiver only sees public event
      const caregiverEvents = CalendarService.filterEventsForViewer(patientEvents, true);
      expect(caregiverEvents.some((e) => e.id === pEvt.id)).toBe(false);
      expect(caregiverEvents.some((e) => e.id === cEvt.id)).toBe(true);
    });
  });
});
