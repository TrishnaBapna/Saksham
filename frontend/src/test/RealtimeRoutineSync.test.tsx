/**
 * SAKSHAM NEURO-CARE — PART A TEST SUITE
 * Real-Time Caregiver Routine Synchronization (10 Scenarios from §18)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Deterministic in-memory Firestore mock for unit/integration scenarios
const memFirestore: Record<string, Record<string, any>> = {};
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    doc: vi.fn((_db: any, ...segments: string[]) => ({
      path: segments.join('/'),
      id: segments[segments.length - 1],
      col: segments.slice(0, -1).join('/'),
    })),
    collection: vi.fn((_db: any, ...segments: string[]) => ({
      path: segments.join('/'),
    })),
    query: vi.fn((colRef: any) => colRef),
    where: vi.fn(() => ({})),
    getDoc: vi.fn(async (docRef: any) => {
      const store = memFirestore[docRef.col] || {};
      const data = store[docRef.id];
      return {
        exists: () => Boolean(data),
        id: docRef.id,
        data: () => data,
      };
    }),
    getDocs: vi.fn(async (qRef: any) => {
      const store = memFirestore[qRef?.path || ''] || {};
      const docs = Object.entries(store).map(([id, data]) => ({
        id,
        data: () => data,
      }));
      return {
        empty: docs.length === 0,
        docs,
        forEach: (cb: (d: any) => void) => docs.forEach(cb),
      };
    }),
    setDoc: vi.fn(async (docRef: any, payload: any, opts?: any) => {
      if (!memFirestore[docRef.col]) memFirestore[docRef.col] = {};
      const existing = opts?.merge ? memFirestore[docRef.col][docRef.id] || {} : {};
      memFirestore[docRef.col][docRef.id] = { ...existing, ...payload };
    }),
    deleteDoc: vi.fn(async (docRef: any) => {
      if (memFirestore[docRef.col]) {
        delete memFirestore[docRef.col][docRef.id];
      }
    }),
    writeBatch: vi.fn(() => {
      const ops: Array<() => void> = [];
      return {
        set: (docRef: any, payload: any, opts?: any) => {
          ops.push(() => {
            if (!memFirestore[docRef.col]) memFirestore[docRef.col] = {};
            const existing = opts?.merge ? memFirestore[docRef.col][docRef.id] || {} : {};
            memFirestore[docRef.col][docRef.id] = { ...existing, ...payload };
          });
        },
        commit: async () => {
          ops.forEach((fn) => fn());
        },
      };
    }),
    onSnapshot: vi.fn(() => () => {}),
  };
});

import { CaregiverDashboard } from '../pages/caregiver/CaregiverDashboard.js';
import { PatientDashboard } from '../pages/patient/PatientDashboard.js';
import { NotificationBell } from '../features/notifications/components/NotificationBell.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { NotificationService } from '../features/notifications/services/notificationService.js';
import { CaregiverService } from '../features/caregiver/services/caregiverService.js';
import { getRoutineSyncUi } from '../features/routines/utils/caregiverRoutineSyncTranslation.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { RoutineItem } from '../types/index.js';

describe('Part A: Real-Time Caregiver Routine Synchronization (10 Scenarios)', () => {
  const patientId = 'sync-patient-01';
  const caregiverId = 'sync-caregiver-01';

  const baseRoutines: RoutineItem[] = [
    {
      id: 'sync_r1',
      patientId,
      title: 'Morning Herbal Tea',
      description: 'Warm soothing tea',
      scheduledTime: '08:00 AM',
      category: 'hydration',
      period: 'morning',
      streakCount: 4,
      isCompleted: true,
      completedAt: '08:10 AM',
      enableAssistedRecall: true,
      sortOrder: 0,
    },
    {
      id: 'sync_r2',
      patientId,
      title: 'Evening Walk',
      description: 'Gentle walk in courtyard',
      scheduledTime: '05:30 PM',
      category: 'exercise',
      period: 'evening',
      streakCount: 2,
      isCompleted: false,
      enableAssistedRecall: true,
      sortOrder: 1,
    },
    {
      id: 'sync_rx',
      patientId,
      title: 'Donepezil 5mg Evening Dose',
      scheduledTime: '08:00 PM',
      category: 'medication',
      period: 'evening',
      streakCount: 5,
      isCompleted: false,
      enableAssistedRecall: false,
      isClinicianPrescribed: true,
      isSafetyLocked: true,
      sortOrder: 2,
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    Object.keys(memFirestore).forEach((k) => delete memFirestore[k]);
    NotificationService.clearCache();
    CaregiverService.clearSimulatedRelationships();
    RoutineService.saveRoutines(patientId, baseRoutines, false);
    CaregiverService.setSimulatedRelationship(caregiverId, patientId, 'active', {
      canReadCalendar: true,
      canCreateCalendarEvents: true,
      canEditCalendarEvents: true,
      canDeleteCalendarEvents: true,
      canManageRoutines: true,
      canReceiveAlerts: true,
    } as any);
  });

  afterEach(() => {
    // Keep vi.mock module factories intact
  });

  it('Scenario 1 & 6: Caregiver adds a task -> shared RoutineService updates + Patient receives in-app notification & bell badge', async () => {
    const saveResult = await RoutineService.caregiverSaveRoutine({
      patientId,
      caregiverUid: caregiverId,
      caregiverName: 'Priya',
      routineDraft: {
        title: 'Afternoon Blood Pressure Check',
        scheduledTime: '03:00 PM',
        category: 'wellness',
        description: 'Check sitting calmly for 2 minutes',
        notes: 'Use left arm cuff',
        recurrence: 'daily',
        isImportant: true,
        enableAssistedRecall: true,
      },
      patientLanguage: 'en',
    });

    expect(saveResult.ok).toBe(true);
    expect(saveResult.syncStatus).toBe('synced');

    // Shared patient list reflects new task directly (no separate caregiver copy)
    const sharedList = RoutineService.getRoutines(patientId);
    const added = sharedList.find((r) => r.title === 'Afternoon Blood Pressure Check');
    expect(added).toBeDefined();
    expect(added?.notes).toBe('Use left arm cuff');
    expect(added?.isImportant).toBe(true);
    expect(added?.recurrence).toBe('daily');
    expect(added?.updatedByName).toBe('Priya');

    // Notification created for patient + change history recorded
    const notifs = NotificationService.getNotifications(patientId, 'patient');
    expect(notifs.some((n) => n.type === 'ROUTINE_ADDED' && n.message.includes('Afternoon Blood Pressure Check'))).toBe(true);
    const history = RoutineService.getRoutineChangeHistory(patientId);
    expect(history[0].action).toBe('created');

    // Patient NotificationBell displays badge immediately
    render(
      <AuthProvider>
        <LanguageProvider>
          <NotificationBell patientId={patientId} />
        </LanguageProvider>
      </AuthProvider>
    );
    expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('1');
  });

  it('Scenario 2 & 3 & 7: Caregiver edits title/notes/time while preserving patient completion state & attempts history', async () => {
    await RoutineService.recordAttempt(patientId, 'sync_r1', 1, false, true);

    const existingCompleted = RoutineService.getRoutines(patientId).find((r) => r.id === 'sync_r1')!;
    expect(existingCompleted.isCompleted).toBe(true);
    expect(existingCompleted.streakCount).toBe(4);

    const editRes = await RoutineService.caregiverSaveRoutine({
      patientId,
      caregiverUid: caregiverId,
      caregiverName: 'Priya',
      existingRoutine: existingCompleted,
      routineDraft: {
        id: 'sync_r1',
        title: 'Morning Chamomile Tea & Water',
        scheduledTime: '08:30 AM',
        category: 'hydration',
        description: 'Updated gentle hydration reminder',
        notes: 'Sip slowly after waking',
        recurrence: 'weekdays',
        isImportant: true,
      },
      patientLanguage: 'en',
    });

    expect(editRes.ok).toBe(true);
    const updated = RoutineService.getRoutines(patientId).find((r) => r.id === 'sync_r1')!;
    expect(updated.title).toBe('Morning Chamomile Tea & Water');
    expect(updated.scheduledTime).toBe('08:30 AM');
    expect(updated.notes).toBe('Sip slowly after waking');
    expect(updated.recurrence).toBe('weekdays');
    // Crucial: completion state & streak preserved!
    expect(updated.isCompleted).toBe(true);
    expect(updated.completedAt).toBe('08:10 AM');
    expect(updated.streakCount).toBe(4);
    expect(RoutineService.getHistory(patientId).length).toBeGreaterThanOrEqual(1);

    const notifs = NotificationService.getNotifications(patientId, 'patient');
    expect(notifs[0].type).toBe('ROUTINE_UPDATED');
    expect(notifs[0].message).toContain('08:30 AM');
  });

  it('Scenario 4: Caregiver reorders tasks -> order updates in shared list & notifies patient', async () => {
    const initial = RoutineService.getRoutines(patientId);
    const swapped = [initial[1], initial[0], initial[2]];

    const reorderRes = await RoutineService.caregiverReorderRoutines({
      patientId,
      caregiverUid: caregiverId,
      caregiverName: 'Priya',
      reorderedRoutines: swapped,
      movedRoutine: swapped[0],
    });

    expect(reorderRes.ok).toBe(true);
    const reloaded = RoutineService.sortRoutines(RoutineService.getRoutines(patientId));
    expect(reloaded[0].id).toBe('sync_r2');
    expect(reloaded[0].sortOrder).toBe(0);
    expect(reloaded[1].id).toBe('sync_r1');
    expect(reloaded[1].sortOrder).toBe(1);

    const notifs = NotificationService.getNotifications(patientId, 'patient');
    expect(notifs[0].type).toBe('ROUTINE_REORDERED');
  });

  it('Scenario 5: Caregiver deletes non-locked task -> removed from shared list & notifies patient', async () => {
    const delRes = await RoutineService.caregiverDeleteRoutine({
      patientId,
      caregiverUid: caregiverId,
      caregiverName: 'Priya',
      routineId: 'sync_r2',
    });

    expect(delRes.ok).toBe(true);
    const list = RoutineService.getRoutines(patientId);
    expect(list.some((r) => r.id === 'sync_r2')).toBe(false);
    expect(NotificationService.getNotifications(patientId, 'patient')[0].type).toBe('ROUTINE_DELETED');
  });

  it('Scenario 8: Blocks caregiver from modifying clinician-prescribed/safety-locked tasks and hides controls when Admin revokes canManageRoutines', async () => {
    const rxTask = RoutineService.getRoutines(patientId).find((r) => r.id === 'sync_rx')!;
    const blockedEdit = await RoutineService.caregiverSaveRoutine({
      patientId,
      caregiverUid: caregiverId,
      caregiverName: 'Priya',
      existingRoutine: rxTask,
      routineDraft: {
        id: 'sync_rx',
        title: 'Changed Medication',
        scheduledTime: '09:00 PM',
        category: 'medication',
      },
    });
    expect(blockedEdit.ok).toBe(false);
    expect(blockedEdit.error).toContain('Clinician-prescribed');

    const blockedDel = await RoutineService.caregiverDeleteRoutine({
      patientId,
      caregiverUid: caregiverId,
      caregiverName: 'Priya',
      routineId: 'sync_rx',
    });
    expect(blockedDel.ok).toBe(false);

    // Now test Admin restricting canManageRoutines on active CaregiverDashboard
    vi.spyOn(CaregiverService, 'getConnectedPatients').mockResolvedValue([
      {
        patientId,
        patientName: 'Sunita Sharma',
        relationshipStatus: 'active',
        permissions: {
          canReadCalendar: true,
          canCreateCalendarEvents: false,
          canEditCalendarEvents: false,
          canDeleteCalendarEvents: false,
          canManageRoutines: false,
          canReceiveAlerts: true,
        },
      },
    ]);
    vi.spyOn(CaregiverService, 'getConnectedPatient').mockResolvedValue({
      patientId,
      patientName: 'Sunita Sharma',
      relationshipStatus: 'active',
      permissions: {
        canReadCalendar: true,
        canCreateCalendarEvents: false,
        canEditCalendarEvents: false,
        canDeleteCalendarEvents: false,
        canManageRoutines: false,
        canReceiveAlerts: true,
      },
    });
    vi.spyOn(RoutineService, 'syncRoutinesFromFirestore').mockResolvedValue(baseRoutines);

    render(
      <MemoryRouter>
        <AuthProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <CaregiverDashboard />
            </AccessibilityProvider>
          </LanguageProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('caregiver-routine-restricted-notice')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('caregiver-add-routine-btn')).not.toBeInTheDocument();
  });

  it('Scenario 6b (UI Live Sync): CaregiverDashboard adds task via UI Modal and triggers real-time update on PatientDashboard banner & checklist', async () => {
    vi.spyOn(CaregiverService, 'getConnectedPatients').mockResolvedValue([
      {
        patientId,
        patientName: 'Sunita Sharma',
        relationshipStatus: 'active',
        permissions: {
          canReadCalendar: true,
          canCreateCalendarEvents: true,
          canEditCalendarEvents: true,
          canDeleteCalendarEvents: true,
          canManageRoutines: true,
          canReceiveAlerts: true,
        },
      },
    ]);
    vi.spyOn(CaregiverService, 'getConnectedPatient').mockResolvedValue({
      patientId,
      patientName: 'Sunita Sharma',
      relationshipStatus: 'active',
      permissions: {
        canReadCalendar: true,
        canCreateCalendarEvents: true,
        canEditCalendarEvents: true,
        canDeleteCalendarEvents: true,
        canManageRoutines: true,
        canReceiveAlerts: true,
      },
    });
    vi.spyOn(RoutineService, 'syncRoutinesFromFirestore').mockImplementation(async (pid) =>
      RoutineService.getRoutines(pid)
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <CaregiverDashboard />
            </AccessibilityProvider>
          </LanguageProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const addBtn = await screen.findByTestId('caregiver-add-routine-btn');
    fireEvent.click(addBtn);

    fireEvent.change(screen.getByTestId('caregiver-routine-title-input'), {
      target: { value: 'Calm Breathing at 4 PM' },
    });
    fireEvent.change(screen.getByTestId('caregiver-routine-time-input'), {
      target: { value: '04:00 PM' },
    });
    fireEvent.change(screen.getByTestId('caregiver-routine-notes-input'), {
      target: { value: 'Sit by the sunny window' },
    });
    fireEvent.click(screen.getByTestId('caregiver-routine-important-checkbox'));
    fireEvent.click(screen.getByTestId('caregiver-routine-save-btn'));

    await waitFor(() => {
      expect(screen.getAllByText(/Calm Breathing at 4 PM/i).length).toBeGreaterThanOrEqual(1);
    });
    cleanup();

    // Verify change propagates directly when PatientDashboard reads shared patientId (simulating demo/guest local uid)
    localStorage.setItem(
      'saksham_routines_demo-patient-001',
      JSON.stringify(RoutineService.getRoutines(patientId))
    );
    await RoutineService.caregiverSaveRoutine({
      patientId: 'demo-patient-001',
      caregiverUid: caregiverId,
      caregiverName: 'Priya',
      routineDraft: {
        title: 'Live Patient Banner Verification Task',
        scheduledTime: '04:15 PM',
        category: 'wellness',
        notes: 'Check blood pressure calm seated',
        isImportant: true,
      },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <CharacterProvider>
                <PatientDashboard />
              </CharacterProvider>
            </AccessibilityProvider>
          </LanguageProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('patient-routine-update-banner')).toBeInTheDocument();
    });
    expect(screen.getByText(/Live Patient Banner Verification Task/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('patient-routine-banner-view-btn'));
    await waitFor(() => {
      expect(screen.getByText(/Check blood pressure calm seated/i)).toBeInTheDocument();
    });
  });

  it('Scenario 9: Multi-language routine sync bundles & notifications support all 7 languages', async () => {
    const langs = ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn'] as const;
    for (const lang of langs) {
      const ui = getRoutineSyncUi(lang);
      expect(ui.addTaskBtn.trim().length).toBeGreaterThan(0);
      expect(ui.patientBannerTitle.trim().length).toBeGreaterThan(0);
      expect(ui.notifAddedTitle.trim().length).toBeGreaterThan(0);
      expect(ui.importantBadge.trim().length).toBeGreaterThan(0);
    }

    const hiRes = await RoutineService.caregiverSaveRoutine({
      patientId,
      caregiverUid: caregiverId,
      caregiverName: 'प्रिया',
      routineDraft: {
        title: 'दोपहर की चाय',
        scheduledTime: '03:30 PM',
        category: 'hydration',
      },
      patientLanguage: 'hi',
    });
    expect(hiRes.ok).toBe(true);
    const latestNotif = NotificationService.getNotifications(patientId, 'patient')[0];
    expect(latestNotif.title).toBe('नया कार्य जोड़ा गया');
    expect(latestNotif.message).toContain('प्रिया');
  });

  it('Scenario 10: Handles offline mutation cleanly without losing local updates or throwing unhandled errors', async () => {
    vi.spyOn(RoutineService, 'isOnline').mockReturnValue(false);

    const res = await RoutineService.caregiverSaveRoutine({
      patientId,
      caregiverUid: caregiverId,
      caregiverName: 'Priya',
      routineDraft: {
        title: 'Offline Queued Stretch',
        scheduledTime: '11:00 AM',
        category: 'exercise',
      },
    });

    expect(res.ok).toBe(true);
    expect(RoutineService.getRoutines(patientId).some((r) => r.title === 'Offline Queued Stretch')).toBe(true);
  });
});
