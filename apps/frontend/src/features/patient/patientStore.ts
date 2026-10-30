/**
 * Zustand store for patient portal state.
 * Keeps tasks, progression, messages, and water tracker in sync.
 */
import { create } from 'zustand';
import type {
  Task,
  TaskStatus,
  UserProgression,
  ClinicalNote,
  DoctorDirective,
  CaregiverAlert,
} from '@/types/firestore';
import {
  subscribeToTasks,
  subscribeToProgression,
  subscribeToMessages,
  subscribeToAlerts,
  updateTaskStatus,
  updateProgression,
  seedDefaultTasks,
} from './patientService';

// ─── State shape ──────────────────────────────────────────────────────────────

interface PatientState {
  // Data
  tasks:        Task[];
  progression:  UserProgression | null;
  notes:        ClinicalNote[];
  directives:   DoctorDirective[];
  alerts:       CaregiverAlert[];

  // UI state
  tasksLoading:    boolean;
  messagesLoading: boolean;

  // Active subscriptions (stored so they can be cleaned up)
  _unsubs: Array<() => void>;

  // Actions
  init:           (uid: string) => Promise<void>;
  cleanup:        () => void;
  completeTask:   (uid: string, taskId: number) => Promise<void>;
  snoozeTask:     (uid: string, taskId: number) => Promise<void>;
  logWater:       (uid: string) => Promise<void>;
  resetDailyTasks:(uid: string) => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePatientStore = create<PatientState>((set, get) => ({
  tasks:           [],
  progression:     null,
  notes:           [],
  directives:      [],
  alerts:          [],
  tasksLoading:    true,
  messagesLoading: true,
  _unsubs:         [],

  // ── init: subscribe to all real-time data for this patient ────────────────
  async init(uid: string) {
    // First seed default tasks if user has none yet
    await seedDefaultTasks(uid);

    const unsub1 = subscribeToTasks(uid, (tasks) => {
      set({ tasks, tasksLoading: false });
    });

    const unsub2 = subscribeToProgression(uid, (progression) => {
      set({ progression });
    });

    const unsub3 = subscribeToMessages(uid, (notes, directives) => {
      set({ notes, directives, messagesLoading: false });
    });

    const unsub4 = subscribeToAlerts(uid, (alerts) => {
      set({ alerts });
    });

    set({ _unsubs: [unsub1, unsub2, unsub3, unsub4] });
  },

  // ── cleanup: unsubscribe all listeners on sign-out / unmount ──────────────
  cleanup() {
    get()._unsubs.forEach((fn) => fn());
    set({
      tasks: [], progression: null, notes: [], directives: [],
      alerts: [], tasksLoading: true, messagesLoading: true, _unsubs: [],
    });
  },

  // ── completeTask ──────────────────────────────────────────────────────────
  async completeTask(uid, taskId) {
    // Optimistic update
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: 'done' as TaskStatus, completedAt: new Date().toISOString() }
          : t
      ),
    }));
    try {
      await updateTaskStatus(uid, taskId, 'done', {
        completedAt: new Date().toISOString(),
      });
      // Award XP
      const prog = get().progression;
      await updateProgression(uid, {
        xp:     (prog?.xp ?? 0) + 10,
        streak: prog?.streak ?? 0,
      });
    } catch (err) {
      console.warn('[patientStore] completeTask error:', err);
      // Rollback optimistic update
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'pending' as TaskStatus } : t
        ),
      }));
    }
  },

  // ── snoozeTask ────────────────────────────────────────────────────────────
  async snoozeTask(uid, taskId) {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'snoozed' as TaskStatus, snoozed: true } : t
      ),
    }));
    try {
      await updateTaskStatus(uid, taskId, 'snoozed', { snoozed: true });
    } catch (err) {
      console.warn('[patientStore] snoozeTask error:', err);
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'pending' as TaskStatus } : t
        ),
      }));
    }
  },

  // ── logWater ──────────────────────────────────────────────────────────────
  async logWater(uid) {
    const prog = get().progression;
    const current = prog?.waterLogged ?? 0;
    const target  = prog?.waterTargetGlasses ?? 8;
    if (current >= target) return;

    // Optimistic
    set((s) => ({
      progression: s.progression
        ? { ...s.progression, waterLogged: current + 1 }
        : null,
    }));

    try {
      await updateProgression(uid, { waterLogged: current + 1 });
    } catch (err) {
      console.warn('[patientStore] logWater error:', err);
      set((s) => ({
        progression: s.progression
          ? { ...s.progression, waterLogged: current }
          : null,
      }));
    }
  },

  // ── resetDailyTasks (called at midnight by a timer) ───────────────────────
  async resetDailyTasks(uid) {
    const tasks = get().tasks;
    await Promise.all(
      tasks
        .filter((t) => t.status !== 'pending')
        .map((t) => updateTaskStatus(uid, t.id, 'pending'))
    );
  },
}));
