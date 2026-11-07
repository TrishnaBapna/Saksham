import { RoutineItem, RoutineAttemptRecord, ReminderSettings } from '../../../types/index.js';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  getEffectivePatientId,
  isGuestPatient,
  notifyDataChange,
} from '../../auth/services/identityService.js';

// Pre-seeded comprehensive patient routines
export const DEFAULT_PATIENT_ROUTINES: RoutineItem[] = [
  {
    id: 'routine-01',
    title: 'Morning Blood Pressure Medication & Warm Tea',
    description: 'Take your prescribed morning blood pressure tablet with warm herbal tea after breakfast.',
    scheduledTime: '08:30 AM',
    category: 'medication',
    period: 'morning',
    streakCount: 6,
    isCompleted: true,
    completedAt: '08:42 AM',
    enableAssistedRecall: true,
    timerMinutes: 5,
    recallQuestion: 'What comforting morning habit do you usually do right after breakfast?',
    recallOptions: [
      'Take morning blood pressure medication & warm tea',
      'Go to the market for evening groceries',
      'Water the outdoor garden plants'
    ],
    correctOptionIndex: 0,
    recallCues: {
      hint1: 'A warm ceramic cup right after eating breakfast in the kitchen.',
      hint2: 'Check the blue pill organizer beside the kettle on the counter.',
      hint3: 'Take the morning blood pressure tablet with half a glass of warm water.',
    },
    steps: [
      'Pour a cup of warm water or herbal tea into your favorite ceramic mug.',
      'Open the blue morning compartment of your pill organizer on the kitchen counter.',
      'Take the single blood pressure tablet with two sips of warm water.',
      'Sit comfortably by the window and enjoy the rest of your tea peacefully.'
    ]
  },
  {
    id: 'routine-02',
    title: 'Morning Hydration & Gentle Arm Stretches',
    description: 'A 5-minute restorative stretch to energize muscles and loosen shoulders before lunch.',
    scheduledTime: '11:00 AM',
    category: 'exercise',
    period: 'morning',
    streakCount: 4,
    isCompleted: false,
    enableAssistedRecall: true,
    timerMinutes: 5,
    recallQuestion: 'What gentle activity keeps your body refreshed and flexible before lunchtime?',
    recallOptions: [
      'Drink fresh water and do 5 slow shoulder stretches',
      'Watch a 2-hour movie in the living room',
      'Eat a heavy afternoon dessert'
    ],
    correctOptionIndex: 0,
    recallCues: {
      hint1: 'Think about what keeps your posture tall and shoulders relaxed before noon.',
      hint2: 'A tall glass of lemon water on your desk and rolling shoulders back.',
      hint3: 'Drink one tall glass of fresh water and gently roll your shoulders back 5 times.',
    },
    steps: [
      'Fill a tall glass with fresh room-temperature water and drink it slowly.',
      'Stand or sit tall with your feet flat on the floor.',
      'Slowly roll your shoulders backwards in big circles 5 times.',
      'Gently raise both arms overhead, take a deep breath, and lower them slowly.'
    ]
  },
  {
    id: 'routine-03',
    title: 'Afternoon Photo Album Walk with Ananya',
    description: 'Spend peaceful time browsing family memories in the Loved Ones album.',
    scheduledTime: '02:30 PM',
    category: 'cognitive',
    period: 'afternoon',
    streakCount: 3,
    isCompleted: false,
    enableAssistedRecall: true,
    timerMinutes: 10,
    recallQuestion: 'What comforting afternoon activity connects you with smiling family faces?',
    recallOptions: [
      'Looking at family memories in the Loved Ones album',
      'Organizing winter clothes in the attic',
      'Writing an email to the bank manager'
    ],
    correctOptionIndex: 0,
    recallCues: {
      hint1: 'Looking at pictures of smiling faces from your family album.',
      hint2: 'Open the Loved Ones tab to see pictures of daughter Ananya and grandson Aarav.',
      hint3: 'Spend 5 to 10 minutes enjoying family memories in the Loved Ones album.',
    },
    steps: [
      'Sit in your favorite armchair with good lighting.',
      'Open the Loved Ones tab in Saksham on your screen.',
      'Listen to the short voice message from your daughter Ananya.',
      'Take a peaceful moment to remember your family holiday in Shimla.'
    ]
  },
  {
    id: 'routine-04',
    title: 'Evening Deep Breathing & Calming Walk',
    description: 'A gentle 10-minute courtyard walk followed by slow diaphragmatic breathing.',
    scheduledTime: '06:00 PM',
    category: 'wellness',
    period: 'evening',
    streakCount: 5,
    isCompleted: false,
    enableAssistedRecall: true,
    timerMinutes: 10,
    recallQuestion: 'What peaceful evening routine helps calm your mind before dinner?',
    recallOptions: [
      'Gentle courtyard stroll & 5 deep breaths',
      'High intensity cardio exercise',
      'Checking office paperwork'
    ],
    correctOptionIndex: 0,
    recallCues: {
      hint1: 'Stepping into the fresh evening air and taking slow, deep breaths.',
      hint2: 'Put on your soft walking shoes and step out into the courtyard garden.',
      hint3: 'Walk gently for 5 minutes and take 5 slow breaths with hands resting on your chest.',
    },
    steps: [
      'Slip on your comfortable walking shoes with non-slip soles.',
      'Stroll slowly along the garden path or living room for 5 minutes.',
      'Return to a comfortable chair and rest both hands on your belly.',
      'Inhale slowly for 4 seconds, exhale gently for 4 seconds. Repeat 5 times.'
    ]
  }
];

export class RoutineService {
  private static inMemoryStore: Record<string, string> = {};

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch {
      // Storage unavailable or threw warning in headless node
    }
    return this.inMemoryStore[key] || null;
  }

  private static safeSetItem(key: string, val: string): void {
    this.inMemoryStore[key] = val;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch {
      // Storage unavailable
    }
  }

  private static safeRemoveItem(key: string): void {
    delete this.inMemoryStore[key];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage unavailable
    }
  }

  public static getStorageKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_routines_${effectiveId}`;
  }

  public static getHistoryKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_routine_history_${effectiveId}`;
  }

  /**
   * Load routines for a specific patient UID from local cache
   */
  public static getRoutines(patientId: string): RoutineItem[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    try {
      const key = this.getStorageKey(effectiveId);
      const data = this.safeGetItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse/storage errors
    }
    return DEFAULT_PATIENT_ROUTINES.map((r) => ({ ...r, patientId: effectiveId }));
  }

  /**
   * Synchronize routines from Cloud Firestore.
   * On failure or for guest accounts, gracefully uses local cache.
   */
  public static async syncRoutinesFromFirestore(patientId: string): Promise<RoutineItem[]> {
    const effectiveId = getEffectivePatientId({ uid: patientId });

    // Guest users do not access Firestore
    if (isGuestPatient(effectiveId) || !isFirebaseConfigured) {
      return this.getRoutines(effectiveId);
    }

    try {
      const q = query(
        collection(db, 'routines'),
        where('patientId', '==', effectiveId)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const cloudRoutines: RoutineItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            ...(data as RoutineItem),
            id: docSnap.id,
            patientId: effectiveId,
          };
        });

        // Update local cache
        this.saveRoutines(effectiveId, cloudRoutines, false);
        return cloudRoutines;
      } else {
        // First cloud sync: Seed default routines to Firestore
        const defaults = DEFAULT_PATIENT_ROUTINES.map((r) => ({
          ...r,
          id: `${effectiveId}_${r.id}`,
          patientId: effectiveId,
        }));

        for (const item of defaults) {
          try {
            await setDoc(doc(db, 'routines', item.id), {
              ...item,
              patientId: effectiveId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } catch (writeErr) {
            console.warn('[RoutineService] Cloud seed error for routine:', item.id, writeErr);
          }
        }

        this.saveRoutines(effectiveId, defaults, false);
        return defaults;
      }
    } catch (err) {
      console.warn('[RoutineService] Firestore sync error, falling back to local cache:', err);
      return this.getRoutines(effectiveId);
    }
  }

  /**
   * Save routines for a specific patient UID (local + Firestore)
   */
  public static saveRoutines(
    patientId: string,
    routines: RoutineItem[],
    syncToCloud: boolean = true
  ): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    try {
      const key = this.getStorageKey(effectiveId);
      const prev = this.safeGetItem(key);
      const next = JSON.stringify(routines);
      if (prev === next) {
        return;
      }
      this.safeSetItem(key, next);
    } catch {
      // Ignore storage errors
    }

    notifyDataChange('routines', effectiveId);

    if (syncToCloud && !isGuestPatient(effectiveId) && isFirebaseConfigured) {
      // Background async update to Firestore
      routines.forEach(async (routine) => {
        try {
          const docId = routine.id.startsWith(effectiveId) ? routine.id : `${effectiveId}_${routine.id}`;
          await setDoc(
            doc(db, 'routines', docId),
            {
              ...routine,
              id: docId,
              patientId: effectiveId,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn('[RoutineService] Background sync failed for routine:', routine.id, e);
        }
      });
    }
  }

  /**
   * Toggle completion state of a specific routine
   */
  public static async updateRoutineCompletion(
    patientId: string,
    routineId: string,
    isCompleted: boolean
  ): Promise<RoutineItem | null> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const list = this.getRoutines(effectiveId);
    const index = list.findIndex(
      (r) => r.id === routineId || r.id === `${effectiveId}_${routineId}`
    );

    if (index === -1) return null;

    const completedAt = isCompleted
      ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : undefined;

    const updatedItem: RoutineItem = {
      ...list[index],
      isCompleted,
      completedAt,
      streakCount: isCompleted
        ? (list[index].streakCount || 0) + 1
        : Math.max((list[index].streakCount || 1) - 1, 0),
    };

    list[index] = updatedItem;
    this.saveRoutines(effectiveId, list, true);

    // If marked completed, record an attempt to history
    if (isCompleted) {
      await this.recordAttempt(effectiveId, updatedItem.id, 1, false, true);
    }

    return updatedItem;
  }

  /**
   * Delete a single routine
   */
  public static async deleteRoutine(patientId: string, routineId: string): Promise<boolean> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const list = this.getRoutines(effectiveId);
    const filtered = list.filter((r) => r.id !== routineId && r.id !== `${effectiveId}_${routineId}`);

    if (filtered.length === list.length) return false;

    this.saveRoutines(effectiveId, filtered, false);

    if (!isGuestPatient(effectiveId) && isFirebaseConfigured) {
      try {
        const docId = routineId.startsWith(effectiveId) ? routineId : `${effectiveId}_${routineId}`;
        await deleteDoc(doc(db, 'routines', docId));
      } catch (err) {
        console.warn('[RoutineService] Cloud routine delete failed:', err);
      }
    }

    notifyDataChange('routines', effectiveId);
    return true;
  }

  /**
   * Load completion history for dynamic streak calculation
   */
  public static getHistory(patientId: string): RoutineAttemptRecord[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    try {
      const key = this.getHistoryKey(effectiveId);
      const data = this.safeGetItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }

    // Default pre-seeded dynamic relative dates
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

    return [
      { id: 'hist-01', routineId: 'routine-01', patientId: effectiveId, date: yesterday, attemptsUsed: 1, skipped: false, isCompleted: true },
      { id: 'hist-02', routineId: 'routine-02', patientId: effectiveId, date: yesterday, attemptsUsed: 2, skipped: false, isCompleted: true },
      { id: 'hist-03', routineId: 'routine-01', patientId: effectiveId, date: twoDaysAgo, attemptsUsed: 1, skipped: false, isCompleted: true },
      { id: 'hist-04', routineId: 'routine-02', patientId: effectiveId, date: twoDaysAgo, attemptsUsed: 1, skipped: false, isCompleted: true },
      { id: 'hist-05', routineId: 'routine-01', patientId: effectiveId, date: threeDaysAgo, attemptsUsed: 1, skipped: false, isCompleted: true },
    ];
  }

  /**
   * Save an attempt or completion record to history
   */
  public static async recordAttempt(
    patientId: string,
    routineId: string,
    attemptsUsed: number,
    skipped: boolean,
    isCompleted: boolean
  ): Promise<RoutineAttemptRecord> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const history = this.getHistory(effectiveId);
    const today = new Date().toISOString().split('T')[0];

    const newRecord: RoutineAttemptRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      routineId,
      patientId: effectiveId,
      date: today,
      attemptsUsed,
      skipped,
      isCompleted,
      completedAt: isCompleted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
    };

    const updated = [newRecord, ...history];
    try {
      this.safeSetItem(this.getHistoryKey(effectiveId), JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }

    notifyDataChange('routines', effectiveId);

    if (!isGuestPatient(effectiveId) && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'routineAttempts', newRecord.id), {
          ...newRecord,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[RoutineService] Cloud save failed for routineAttempt:', e);
      }
    }

    return newRecord;
  }

  /**
   * Dynamic progress calculation from actual tasks
   */
  public static calculateProgress(routines: RoutineItem[]): {
    completed: number;
    total: number;
    percentage: number;
    remaining: number;
  } {
    if (!routines || routines.length === 0) {
      return { completed: 0, total: 0, percentage: 0, remaining: 0 };
    }
    const completed = routines.filter((r) => r.isCompleted).length;
    const total = routines.length;
    const remaining = total - completed;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage, remaining };
  }

  /**
   * Dynamic streak calculation from consecutive completed days
   */
  public static calculateStreak(history: RoutineAttemptRecord[]): number {
    if (!history || history.length === 0) return 0;

    // Get unique dates where at least one task was completed
    const completedDates = new Set(
      history.filter((h) => h.isCompleted).map((h) => h.date)
    );

    if (completedDates.size === 0) return 0;

    let streak = 0;
    const dateCursor = new Date();

    // Check today or yesterday as start
    const todayStr = dateCursor.toISOString().split('T')[0];
    if (completedDates.has(todayStr)) {
      streak++;
      dateCursor.setDate(dateCursor.getDate() - 1);
    } else {
      // Check if streak was active up to yesterday
      dateCursor.setDate(dateCursor.getDate() - 1);
      const yesterdayStr = dateCursor.toISOString().split('T')[0];
      if (!completedDates.has(yesterdayStr)) {
        return 0;
      }
    }

    // Traverse consecutive previous days
    while (true) {
      const dStr = dateCursor.toISOString().split('T')[0];
      if (completedDates.has(dStr)) {
        streak++;
        dateCursor.setDate(dateCursor.getDate() - 1);
      } else {
        break;
      }
    }

    return Math.max(streak, 1);
  }

  /**
   * Snooze a routine by a specified number of minutes (5 or 15)
   */
  public static snoozeRoutine(routine: RoutineItem, minutes: number): RoutineItem {
    const parseTime = (tStr: string) => {
      const match = tStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return new Date();
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };

    const targetDate = parseTime(routine.scheduledTime);
    targetDate.setMinutes(targetDate.getMinutes() + minutes);

    let newHours = targetDate.getHours();
    const newMins = targetDate.getMinutes();
    const newAmPm = newHours >= 12 ? 'PM' : 'AM';
    newHours = newHours % 12 || 12;

    const formattedTime = `${newHours < 10 ? '0' : ''}${newHours}:${newMins < 10 ? '0' : ''}${newMins} ${newAmPm}`;

    return {
      ...routine,
      scheduledTime: formattedTime,
      snoozedUntil: formattedTime
    };
  }

  /**
   * Determine period of day for categorisation
   */
  public static getPeriodFromTime(timeStr: string): 'morning' | 'afternoon' | 'evening' {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 'morning';
    let h = parseInt(match[1], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  /**
   * Purge local storage cache for a given patient (used during logout/switch)
   */
  public static clearPatientCache(patientId: string): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    this.safeRemoveItem(this.getStorageKey(effectiveId));
    this.safeRemoveItem(this.getHistoryKey(effectiveId));
  }

  /**
   * Parse 12-hour time string (e.g. "08:30 AM", "11:00 AM", "06:00 PM") into minutes from midnight
   */
  public static parseTimeToMinutes(timeStr: string): number {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  /**
   * Determine current active task based on clock time:
   * 1. Task within active time slot window [-45m, +30m]
   * 2. Next upcoming pending task today
   * 3. First pending task overall
   */
  public static getActiveTimeWindowTask(
    routines: RoutineItem[],
    nowMinutes?: number
  ): { activeTask: RoutineItem | null; isDueNow: boolean } {
    if (!routines || routines.length === 0) {
      return { activeTask: null, isDueNow: false };
    }

    const now = new Date();
    const currentMins =
      typeof nowMinutes === 'number' ? nowMinutes : now.getHours() * 60 + now.getMinutes();

    // 1. Task within [-45 mins, +30 mins] active slot that is not yet completed
    for (const r of routines) {
      if (!r.isCompleted) {
        const tm = this.parseTimeToMinutes(r.scheduledTime);
        if (currentMins >= tm - 45 && currentMins <= tm + 30) {
          return { activeTask: r, isDueNow: true };
        }
      }
    }

    // 2. Next upcoming pending task today (scheduled after current time)
    for (const r of routines) {
      if (!r.isCompleted) {
        const tm = this.parseTimeToMinutes(r.scheduledTime);
        if (tm >= currentMins) {
          return { activeTask: r, isDueNow: false };
        }
      }
    }

    return { activeTask: null, isDueNow: false };
  }

  public static getReminderSettingsKey(patientId: string): string {
    return `saksham_reminder_settings_${patientId}`;
  }

  public static getReminderSettings(patientId: string): ReminderSettings {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getReminderSettingsKey(effectiveId));
    if (raw) {
      try {
        return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
      } catch {
        // Fall back to default
      }
    }
    return { ...DEFAULT_REMINDER_SETTINGS };
  }

  public static saveReminderSettings(patientId: string, settings: ReminderSettings): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    this.safeSetItem(this.getReminderSettingsKey(effectiveId), JSON.stringify(settings));
    notifyDataChange('reminders', effectiveId);
  }

  public static isQuietHoursActive(settings: ReminderSettings, nowMinutes?: number): boolean {
    if (!settings.quietHoursEnabled) return false;
    const now = new Date();
    const currentMins =
      typeof nowMinutes === 'number' ? nowMinutes : now.getHours() * 60 + now.getMinutes();

    const [sh, sm] = (settings.quietHoursStart || '22:00').split(':').map(Number);
    const [eh, em] = (settings.quietHoursEnd || '07:00').split(':').map(Number);
    const s = sh * 60 + sm;
    const e = eh * 60 + em;

    if (s <= e) {
      return currentMins >= s && currentMins < e;
    } else {
      return currentMins >= s || currentMins < e;
    }
  }

  public static getAlertedKey(patientId: string): string {
    return `saksham_alerted_reminders_${patientId}`;
  }

  public static hasTaskBeenAlerted(patientId: string, taskId: string, minuteKey: string): boolean {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getAlertedKey(effectiveId));
    if (!raw) return false;
    try {
      const records = JSON.parse(raw);
      return records[taskId] === minuteKey;
    } catch {
      return false;
    }
  }

  public static markTaskAlerted(patientId: string, taskId: string, minuteKey: string): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    let records: Record<string, string> = {};
    const raw = this.safeGetItem(this.getAlertedKey(effectiveId));
    if (raw) {
      try {
        records = JSON.parse(raw);
      } catch {
        records = {};
      }
    }
    records[taskId] = minuteKey;
    this.safeSetItem(this.getAlertedKey(effectiveId), JSON.stringify(records));
  }

  public static recordDifficultyFeedback(
    patientId: string,
    routineId: string,
    difficultyType: string,
    note?: string
  ): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const key = `saksham_difficulty_feedback_${effectiveId}`;
    let list: Array<{ routineId: string; difficultyType: string; note?: string; timestamp: number }> = [];
    const raw = this.safeGetItem(key);
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }
    list.push({ routineId, difficultyType, note, timestamp: Date.now() });
    this.safeSetItem(key, JSON.stringify(list));
  }
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  snoozeDurationMinutes: 5,
  soundEnabled: true,
  voiceEnabled: true,
};
