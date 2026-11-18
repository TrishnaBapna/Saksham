import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarService } from '../features/calendar/services/calendarService.js';
import * as firestoreModule from 'firebase/firestore';

describe('CalendarService Snapshot Contract & Resilience (BUG-H2)', () => {
  const patientId = 'contract-patient-001';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    // Pre-populate local cache with a known local event
    localStorage.setItem(
      `saksham_calendar_${patientId}`,
      JSON.stringify([
        {
          id: 'local-evt-1',
          patientId,
          title: 'Morning Herbal Tea',
          startAt: '2026-11-17T08:00:00.000Z',
          category: 'routine',
          isPrivate: false,
          syncStatus: 'synced',
          createdAt: '2026-11-17T07:30:00.000Z',
          updatedAt: '2026-11-17T07:30:00.000Z',
        },
      ])
    );
  });

  it('handles standard Firestore QuerySnapshot with forEach method', async () => {
    const mockDoc = {
      id: 'cloud-evt-1',
      data: () => ({
        title: 'Doctor Appointment',
        startAt: '2026-11-17T11:00:00.000Z',
        category: 'medical',
        isPrivate: false,
      }),
    };

    const mockSnapshot = {
      empty: false,
      docs: [mockDoc],
      size: 1,
      forEach: vi.fn((callback: any) => {
        [mockDoc].forEach(callback);
      }),
    };

    vi.spyOn(firestoreModule, 'getDocs').mockResolvedValueOnce(mockSnapshot as any);

    const events = await CalendarService.syncEventsFromFirestore(patientId, { isCaregiver: false });
    expect(mockSnapshot.forEach).toHaveBeenCalled();
    expect(events.some((e) => e.id === 'cloud-evt-1')).toBe(true);
    expect(events.some((e) => e.id === 'local-evt-1')).toBe(true);
  });

  it('handles snapshot objects providing only docs array without forEach', async () => {
    const mockDoc = {
      id: 'cloud-evt-2',
      data: () => ({
        title: 'Evening Walk in Park',
        startAt: '2026-11-17T17:00:00.000Z',
        category: 'personal',
        isPrivate: false,
      }),
    };

    // Simulated incomplete/legacy snapshot without .forEach
    const mockSnapshotWithoutForEach: any = {
      empty: false,
      docs: [mockDoc],
      size: 1,
    };

    vi.spyOn(firestoreModule, 'getDocs').mockResolvedValueOnce(mockSnapshotWithoutForEach);

    const events = await CalendarService.syncEventsFromFirestore(patientId, { isCaregiver: false });
    expect(events.some((e) => e.id === 'cloud-evt-2')).toBe(true);
    expect(events.some((e) => e.id === 'local-evt-1')).toBe(true);
  });

  it('handles empty snapshot without errors', async () => {
    const emptySnapshot = {
      empty: true,
      docs: [],
      size: 0,
      forEach: (cb: any) => [].forEach(cb),
    };

    vi.spyOn(firestoreModule, 'getDocs').mockResolvedValueOnce(emptySnapshot as any);

    const events = await CalendarService.syncEventsFromFirestore(patientId, { isCaregiver: false });
    expect(events.length).toBe(1);
    expect(events[0].id).toBe('local-evt-1');
  });

  it('falls back gracefully to local cache when getDocs throws network error', async () => {
    vi.spyOn(firestoreModule, 'getDocs').mockRejectedValueOnce(
      new Error('Firestore unavailable: UNAVAILABLE')
    );

    const events = await CalendarService.syncEventsFromFirestore(patientId, { isCaregiver: false });
    expect(events.length).toBe(1);
    expect(events[0].id).toBe('local-evt-1');
  });

  it('filters private events for caregiver viewers', async () => {
    const mockPrivateDoc = {
      id: 'cloud-private-1',
      data: () => ({
        title: 'Private Journaling Moment',
        startAt: '2026-11-17T19:00:00.000Z',
        category: 'personal',
        isPrivate: true,
      }),
    };

    const mockPublicDoc = {
      id: 'cloud-public-1',
      data: () => ({
        title: 'Medication Dose',
        startAt: '2026-11-17T20:00:00.000Z',
        category: 'medication',
        isPrivate: false,
      }),
    };

    const mockSnapshot = {
      empty: false,
      docs: [mockPrivateDoc, mockPublicDoc],
      size: 2,
      forEach: vi.fn((callback: any) => {
        [mockPrivateDoc, mockPublicDoc].forEach(callback);
      }),
    };

    vi.spyOn(firestoreModule, 'getDocs').mockResolvedValueOnce(mockSnapshot as any);

    const caregiverEvents = await CalendarService.syncEventsFromFirestore(patientId, {
      isCaregiver: true,
      caregiverPermissions: { canReadCalendar: true },
    });
    expect(caregiverEvents.some((e) => e.id === 'cloud-private-1')).toBe(false);
    expect(caregiverEvents.some((e) => e.id === 'cloud-public-1')).toBe(true);
  });
});
