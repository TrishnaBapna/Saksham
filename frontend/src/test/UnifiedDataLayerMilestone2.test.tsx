import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getEffectivePatientId,
  isGuestPatient,
  GUEST_PATIENT_ID,
  subscribeToDataChanges,
  notifyDataChange,
  sanitizeForFirestore,
} from '../features/auth/services/identityService.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { LovedOnesService } from '../features/lovedOnes/services/lovedOnesService.js';
import { GamesService } from '../features/games/services/gamesService.js';
import { MigrationService } from '../features/auth/services/migrationService.js';
import { AuthService } from '../features/auth/services/authService.js';
import { mockFirestoreStore, resetMockFirestoreStore } from './setup.js';
import { RoutineItem } from '../types/index.js';

describe('Phase 3 Milestone 2: Unified Identity & Data Layer Migration', () => {
  beforeEach(() => {
    resetMockFirestoreStore();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe('1. Unified Patient Identity & Guest Mode Isolation', () => {
    it('uses authenticated Firebase UID as the authoritative patient identifier', () => {
      const authUser = { uid: 'auth_patient_123', email: 'patient@saksham.care' };
      const effectiveId = getEffectivePatientId(authUser as any);
      expect(effectiveId).toBe('auth_patient_123');
      expect(isGuestPatient(effectiveId)).toBe(false);
    });

    it('falls back to standardized guest identity when unauthenticated', () => {
      expect(getEffectivePatientId(null)).toBe(GUEST_PATIENT_ID);
      expect(getEffectivePatientId(undefined)).toBe(GUEST_PATIENT_ID);
      expect(getEffectivePatientId({ uid: '' })).toBe(GUEST_PATIENT_ID);
      expect(isGuestPatient(GUEST_PATIENT_ID)).toBe(true);
    });

    it('strictly isolates guest records from authenticated user data stores', () => {
      const guestKey = RoutineService.getStorageKey(GUEST_PATIENT_ID);
      const authKey = RoutineService.getStorageKey('auth_patient_999');

      expect(guestKey).toContain(GUEST_PATIENT_ID);
      expect(authKey).toContain('auth_patient_999');
      expect(guestKey).not.toEqual(authKey);
    });
  });

  describe('2. Firestore CRUD Operations & Dual-Store Synchronization', () => {
    it('saves and reads routines to and from Firestore for authenticated patients', async () => {
      const patientId = 'patient_sarah_01';
      const routines: RoutineItem[] = [
        {
          id: 'routine-01',
          patientId,
          title: 'Morning Medication',
          scheduledTime: '08:30 AM',
          category: 'medication',
          streakCount: 5,
          isCompleted: false,
          enableAssistedRecall: true,
        },
      ];

      RoutineService.saveRoutines(patientId, routines, true);
      const docId = `${patientId}_routine-01`;

      // Verify written to Firestore mock store
      expect(mockFirestoreStore['routines']?.[docId]).toBeDefined();
      expect(mockFirestoreStore['routines'][docId].title).toBe('Morning Medication');
      expect(mockFirestoreStore['routines'][docId].patientId).toBe(patientId);

      // Verify Firestore fetch
      const fetched = await RoutineService.syncRoutinesFromFirestore(patientId);
      expect(fetched.length).toBeGreaterThanOrEqual(1);
      expect(fetched[0].patientId).toBe(patientId);
    });

    it('prevents unauthenticated guest data from being written to Cloud Firestore', async () => {
      const guestRoutines: RoutineItem[] = [
        {
          id: 'guest-routine-01',
          title: 'Guest Walk',
          scheduledTime: '09:00 AM',
          category: 'wellness',
          streakCount: 1,
          isCompleted: false,
          enableAssistedRecall: false,
        },
      ];

      RoutineService.saveRoutines(GUEST_PATIENT_ID, guestRoutines, true);
      // Mock store should NOT contain any guest routines
      expect(mockFirestoreStore['routines']?.[`${GUEST_PATIENT_ID}_guest-routine-01`]).toBeUndefined();
    });

    it('sanitizes undefined values to conform strictly with Cloud Firestore SDK specs', () => {
      const payloadWithUndefined = {
        id: 'loved-test-01',
        name: 'Granddaughter Meera',
        relationship: 'Granddaughter',
        nickname: undefined, // Must be stripped
        cues: ['Loves drawing'],
        patientNotes: undefined, // Must be stripped
      };

      const sanitized = sanitizeForFirestore(payloadWithUndefined);
      expect(sanitized.name).toBe('Granddaughter Meera');
      expect('nickname' in sanitized).toBe(false);
      expect('patientNotes' in sanitized).toBe(false);
    });

    it('performs CRUD operations for loved ones with Firestore persistence', async () => {
      const patientId = 'patient_ramesh_02';

      // 1. Add
      const added = await LovedOnesService.addLovedOne(patientId, {
        name: 'Rohan Ramesh',
        relationship: 'Son',
        photoUrl: 'https://example.com/photo.jpg',
        description: 'Visits on weekends with fruit',
        cues: ['Brings oranges'],
      });
      expect(added.id).toBeDefined();
      expect(added.patientId).toBe(patientId);

      // 2. Read
      const retrieved = LovedOnesService.getLovedOneById(patientId, added.id);
      expect(retrieved?.name).toBe('Rohan Ramesh');

      // 3. Update
      const updated = await LovedOnesService.updateLovedOne(patientId, added.id, {
        description: 'Visits on Sundays with sweets',
      });
      expect(updated?.description).toBe('Visits on Sundays with sweets');
      expect(updated?.patientId).toBe(patientId); // Ownership preserved

      // 4. Delete
      const deleted = await LovedOnesService.deleteLovedOne(patientId, added.id);
      expect(deleted).toBe(true);
      expect(LovedOnesService.getLovedOneById(patientId, added.id)).toBeUndefined();
    });

    it('records cognitive game sessions in an append-only collection', async () => {
      const patientId = 'patient_priya_03';
      const session = await GamesService.recordSession(patientId, {
        gameId: 'game-matching',
        gameTitle: 'Peaceful Nature Card Matching',
        category: 'memory',
        difficulty: 'Gentle',
        date: '2026-11-06',
        durationSeconds: 120,
        completed: true,
        patientFeedback: 'Loved it',
      });

      expect(session.id).toBeDefined();
      expect(session.patientId).toBe(patientId);
      expect(mockFirestoreStore['gameSessions']?.[session.id]).toBeDefined();
    });
  });

  describe('3. Legacy LocalStorage Data Migration', () => {
    it('migrates legacy local records into Firestore safely', async () => {
      const patientId = 'legacy_patient_456';

      // Seed legacy records in localStorage
      const legacyRoutines = [
        { id: 'leg-r1', title: 'Hydration', scheduledTime: '10:00 AM', category: 'hydration', streakCount: 2, isCompleted: true },
      ];
      const legacyLovedOnes = [
        { id: 'leg-lo1', name: 'Kabir', relationship: 'Nephew', photoUrl: '', description: 'Calls often', cues: [] },
      ];
      const legacyGames = [
        { id: 'leg-g1', gameId: 'game-matching', gameTitle: 'Match', category: 'memory', difficulty: 'Gentle', date: '2026-11-05', durationSeconds: 60, completed: true },
      ];

      window.localStorage.setItem(`saksham_routines_${patientId}`, JSON.stringify(legacyRoutines));
      window.localStorage.setItem(`saksham_loved_ones_${patientId}`, JSON.stringify(legacyLovedOnes));
      window.localStorage.setItem(`saksham_game_sessions_${patientId}`, JSON.stringify(legacyGames));

      const report = await MigrationService.migrateUserData(patientId);
      expect(report.success).toBe(true);
      expect(report.modules.length).toBe(3);

      const routinesMod = report.modules.find((m) => m.module === 'routines');
      expect(routinesMod?.migrated).toBe(1);

      const lovedOnesMod = report.modules.find((m) => m.module === 'lovedOnes');
      expect(lovedOnesMod?.migrated).toBe(1);

      const gamesMod = report.modules.find((m) => m.module === 'games');
      expect(gamesMod?.migrated).toBe(1);

      // Verify records are present in Firestore
      expect(mockFirestoreStore['routines']?.[`${patientId}_leg-r1`]).toBeDefined();
      expect(mockFirestoreStore['lovedOnes']?.[`${patientId}_leg-lo1`]).toBeDefined();
      expect(mockFirestoreStore['gameSessions']?.['leg-g1']).toBeDefined();
    });

    it('prevents duplicate migration and preserves newer Firestore records', async () => {
      const patientId = 'legacy_patient_456';

      // First migration run
      await MigrationService.migrateUserData(patientId);

      // Re-running migration should short-circuit and not overwrite
      const repeatReport = await MigrationService.migrateUserData(patientId);
      expect(repeatReport.success).toBe(true);
      expect(repeatReport.modules.length).toBe(0); // Short-circuited via migration key
    });

    it('refuses to migrate guest accounts into Cloud Firestore', async () => {
      const report = await MigrationService.migrateUserData(GUEST_PATIENT_ID);
      expect(report.success).toBe(false);
      expect(report.errors[0]).toContain('Guest accounts cannot be migrated');
    });
  });

  describe('4. Dynamic Patient Dashboard Calculations & Reactive Updates', () => {
    it('calculates total, completed, remaining, and percentage dynamically', () => {
      const mockList: RoutineItem[] = [
        { id: 'r1', title: 'T1', scheduledTime: '08:00 AM', category: 'medication', streakCount: 1, isCompleted: true, enableAssistedRecall: false },
        { id: 'r2', title: 'T2', scheduledTime: '11:00 AM', category: 'exercise', streakCount: 1, isCompleted: true, enableAssistedRecall: false },
        { id: 'r3', title: 'T3', scheduledTime: '02:00 PM', category: 'cognitive', streakCount: 1, isCompleted: false, enableAssistedRecall: false },
        { id: 'r4', title: 'T4', scheduledTime: '06:00 PM', category: 'wellness', streakCount: 1, isCompleted: false, enableAssistedRecall: false },
      ];

      const progress = RoutineService.calculateProgress(mockList);
      expect(progress.total).toBe(4);
      expect(progress.completed).toBe(2);
      expect(progress.remaining).toBe(2);
      expect(progress.percentage).toBe(50);
    });

    it('dispatches cross-module data change notifications to subscribers', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToDataChanges(callback);

      notifyDataChange('routines', 'patient_reactive_01');
      expect(callback).toHaveBeenCalledWith({
        module: 'routines',
        patientId: 'patient_reactive_01',
      });

      unsubscribe();
      notifyDataChange('routines', 'patient_reactive_01');
      expect(callback).toHaveBeenCalledTimes(1); // No second call after unsubscribe
    });
  });

  describe('5. Sign-out Patient Private Data Cleanup (AUD-MED-02)', () => {
    it('purges patient cached data on sign out to prevent cross-account leaks', async () => {
      const patientId = 'demo-patient-001';

      // Seed local storage with private data
      window.localStorage.setItem('saksham_auth_user', JSON.stringify({ uid: patientId, role: 'patient' }));
      window.localStorage.setItem(`saksham_routines_${patientId}`, JSON.stringify([{ id: 'r1' }]));
      window.localStorage.setItem(`saksham_loved_ones_${patientId}`, JSON.stringify([{ id: 'l1' }]));
      window.localStorage.setItem(`saksham_game_sessions_${patientId}`, JSON.stringify([{ id: 'g1' }]));

      // Execute sign out
      await AuthService.signOut();

      // Verify all patient private cached keys are purged
      expect(window.localStorage.getItem('saksham_auth_user')).toBeNull();
      expect(window.localStorage.getItem(`saksham_routines_${patientId}`)).toBeNull();
      expect(window.localStorage.getItem(`saksham_loved_ones_${patientId}`)).toBeNull();
      expect(window.localStorage.getItem(`saksham_game_sessions_${patientId}`)).toBeNull();
    });

    it('ensures Account A cannot view Account B cached records during account switching', async () => {
      const patientA = 'account_user_A';
      const patientB = 'account_user_B';

      // Account A creates private routine
      RoutineService.saveRoutines(patientA, [
        { id: 'rA', title: 'User A Secret Routine', scheduledTime: '09:00 AM', category: 'wellness', streakCount: 1, isCompleted: false, enableAssistedRecall: false },
      ]);

      // Account B reads their routines
      const bRoutines = RoutineService.getRoutines(patientB);
      const containsARoutine = bRoutines.some((r) => r.id === 'rA' || r.title === 'User A Secret Routine');
      expect(containsARoutine).toBe(false);
    });
  });
});
