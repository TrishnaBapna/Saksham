import {
  RoutineItem,
  RoutineAttemptRecord,
  ReminderSettings,
  RoutineChangeHistoryRecord,
} from '../../../types/index.js';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  getEffectivePatientId,
  isGuestPatient,
  isDemoModeEnabled,
  notifyDataChange,
  shouldUseLocalDemoSandboxOnly,
} from '../../auth/services/identityService.js';
import { getPatientCalendarDate, DEFAULT_PATIENT_TIMEZONE } from '../../../utils/dateUtils.js';
import { getTranslatedRoutineTitle } from '../utils/routineTranslation.js';
import { NotificationService } from '../../notifications/services/notificationService.js';
import {
  getRoutineSyncUi,
  formatSyncMessage,
} from '../utils/caregiverRoutineSyncTranslation.js';

// Pre-seeded comprehensive patient routines (8 Clinical Care Routines)
// Note: Medication tasks are strictly linked to clinician prescriptions rather than globally hardcoded drug names.
export const DEFAULT_PATIENT_ROUTINES: RoutineItem[] = [
  {
    id: 'routine-01',
    title: 'Morning Herbal Tea & Gentle Hydration',
    description: 'Taking warm herbal tea gently hydrates your stomach and prepares for your morning activities.',
    scheduledTime: '08:00 AM',
    category: 'wellness',
    period: 'morning',
    streakCount: 6,
    isCompleted: true,
    completedAt: '08:12 AM',
    enableAssistedRecall: true,
    timerMinutes: 5,
    recallQuestion: 'You woke up at 08:00 AM. What warm drink gently hydrates your body before your morning activities?',
    recallOptions: [
      'Prepare a warm herbal tea with water in the pot',
      'Immediately eat heavy scrambled eggs',
      'Start a fast 5 km walk'
    ],
    correctOptionIndex: 0,
    recallCues: {
      hint1: 'Taking warm herbal tea hydrates your stomach and aids morning vitality.',
      hint2: 'Look in the kitchen for your favorite ceramic mug and herbal tea bag.',
      hint3: 'Prepare a warm herbal tea with clean water in the teapot.'
    },
    steps: [
      '1. Take out the tea pot and pour fresh clean water into it',
      '2. Place the pot on the stove and turn on the flame to heat',
      '3. Put your herbal tea bag into your favorite mug',
      '4. Pour the warm water into the mug and let it steep for 2 minutes'
    ]
  },
  {
    id: 'routine-02',
    title: 'Morning Clinician-Prescribed Medication',
    description: 'Authorized morning medication taken on an empty stomach 30-45 minutes before food as directed by your clinician.',
    scheduledTime: '08:30 AM',
    category: 'medication',
    period: 'morning',
    isClinicianPrescribed: true,
    isEssential: true,
    isDemoPlaceholder: true,
    prescriptionRef: 'demo-unverified-placeholder',
    prescribedDosage: '1 tablet with water as prescribed',
    streakCount: 6,
    isCompleted: false,
    enableAssistedRecall: true,
    timerMinutes: 5,
    recallQuestion: 'It is 08:30 AM before breakfast. What authorized medicine needs to be taken now with a sip of water?',
    recallOptions: [
      'Afternoon Vitamin D supplement',
      'Morning clinician-prescribed medication dose',
      'Bedtime sleep tea'
    ],
    correctOptionIndex: 1,
    recallCues: {
      hint1: 'Clinician-prescribed medications work best when taken on schedule as instructed by your doctor.',
      hint2: 'Check the labeled morning compartment of your pillbox on the bedside table.',
      hint3: 'Take your clinician-prescribed morning tablet with a clean glass of drinking water.'
    },
    steps: [
      '1. Get a clean glass of room-temperature drinking water',
      '2. Open the labeled morning compartment of your pillbox',
      '3. Take out your prescribed morning dose',
      '4. Swallow tablet with water and wait 30-45 mins before breakfast'
    ]
  },
  {
    id: 'routine-03',
    title: 'Buttoning Shirt & Morning Dressing',
    description: 'Taking 15-20 calm minutes for buttoning keeps finger coordination sharp.',
    scheduledTime: '09:00 AM',
    category: 'motor',
    period: 'morning',
    streakCount: 4,
    isCompleted: false,
    enableAssistedRecall: true,
    timerMinutes: 15,
    recallQuestion: 'It is 09:00 AM. What fine motor activity prepares you for a fresh day?',
    recallOptions: [
      'Buttoning your morning shirt slowly and steadily',
      'Running outdoors without shoes',
      'Leaving clothes untouched'
    ],
    correctOptionIndex: 0,
    recallCues: {
      hint1: 'Taking 15-20 calm minutes for buttoning keeps finger coordination sharp.',
      hint2: 'Lay your loose shirt flat and take gentle finger stretches before fastening.',
      hint3: 'Fasten buttons starting from the bottom upward, resting hands between buttons.'
    },
    steps: [
      '1. Prepare & Relax Fingers: Lay loose shirt flat and perform 3 gentle finger stretches',
      '2. Fasten Bottom-Up: Fasten buttons starting from bottom upward, resting hands between buttons (or use adaptive button aid)',
      '3. Final Comfort & Posture Check: Smooth sleeves comfortably and breathe calmly (Caregiver co-assistance welcome if tremors are present)'
    ]
  },
  {
    id: 'routine-04',
    title: 'Antioxidant Breakfast (Berries & Oatmeal)',
    description: 'Berries provide neural antioxidants while keeping heavy protein for dinner.',
    scheduledTime: '09:30 AM',
    category: 'food',
    period: 'morning',
    streakCount: 3,
    isCompleted: false,
    snoozedUntil: '09:45 AM',
    enableAssistedRecall: true,
    timerMinutes: 15,
    recallQuestion: 'It is 09:30 AM. What breakfast supports dopamine cells without blocking medication?',
    recallOptions: [
      'Heavy pork sausage and melted cheese',
      'Wild berries, oatmeal & chamomile tea',
      'Three cups of strong black espresso'
    ],
    correctOptionIndex: 1,
    recallCues: {
      hint1: 'Berries provide neural antioxidants while keeping heavy protein for dinner.',
      hint2: 'A warm bowl of whole grain porridge topped with blueberries and walnuts.',
      hint3: 'Enjoy a warm bowl of oatmeal with antioxidant berries and chamomile tea.'
    },
    steps: [
      '1. Prepare a warm bowl of oatmeal or whole grain porridge',
      '2. Add a handful of raw walnuts for omega-3 brain nourishment',
      '3. Top with wild antioxidant blueberries or fresh fruit',
      '4. Enjoy calmly, keeping heavy meats and dairy for dinner'
    ]
  },
  {
    id: 'routine-05',
    title: '15-Min Speech Loudness Drill (AHHH)',
    description: 'Loud, clear vowel sounds strengthen vocal cords against Parkinsonian vocal fade.',
    scheduledTime: '11:00 AM',
    category: 'speech',
    period: 'morning',
    streakCount: 3,
    isCompleted: false,
    enableAssistedRecall: true,
    timerMinutes: 15,
    recallQuestion: "It's 11:00 AM mid-morning. What vocal exercise helps maintain clear speech volume?",
    recallOptions: [
      'Speaking in a very soft whisper',
      'Sustained vocalization (AHHH) with full breath',
      'Complete silence for 3 hours'
    ],
    correctOptionIndex: 1,
    recallCues: {
      hint1: 'Loud, clear vowel sounds strengthen vocal cords against Parkinsonian vocal fade.',
      hint2: 'Sit tall, inhale through your nose, and project your voice forward.',
      hint3: 'Sustain a loud, clear vowel sound for 10 seconds with good posture.'
    },
    steps: [
      '1. Sit tall with your shoulders back and open chest',
      '2. Inhale a deep diaphragmatic breath through your nose',
      '3. Project your voice forward with a sustained AHHH for 10 seconds',
      '4. Repeat 3 times aiming for clear resonance and comfortable volume'
    ]
  },
  {
    id: 'routine-06',
    title: 'Nutritious Lunch & Fiber Salad',
    description: 'Fiber and hydration optimize digestive motility and dopamine medication absorption.',
    scheduledTime: '01:00 PM',
    category: 'food',
    period: 'afternoon',
    streakCount: 5,
    isCompleted: false,
    enableAssistedRecall: true,
    timerMinutes: 20,
    recallQuestion: 'It is 01:00 PM. What nutritious lunch keeps your energy and digestive motility smooth?',
    recallOptions: [
      'Fiber-rich vegetable bowl and lentil soup',
      'High sugar deep fried snack',
      'Skip lunch entirely'
    ],
    correctOptionIndex: 0,
    recallCues: {
      hint1: 'Fiber and hydration prevent constipation and optimize medication motility.',
      hint2: 'Sit upright in a supportive chair with a colorful salad and lentil soup.',
      hint3: 'Enjoy a fiber-rich vegetable bowl, chewing thoroughly with water.'
    },
    steps: [
      '1. Sit upright in a supportive comfortable dining chair',
      '2. Take small mindful bites and chew thoroughly',
      '3. Sip fresh water between spoonfuls to aid hydration'
    ]
  },
  {
    id: 'routine-07',
    title: 'Assisted Garden Walk & Motor Steps',
    description: 'Taking conscious big steps and swinging arms counteracts festination and stiffness.',
    scheduledTime: '04:30 PM',
    category: 'exercise',
    period: 'afternoon',
    streakCount: 4,
    isCompleted: false,
    enableAssistedRecall: true,
    timerMinutes: 15,
    recallQuestion: 'It is 04:30 PM. What outdoor exercise promotes motor rhythm and balance?',
    recallOptions: [
      'Assisted 15-minute garden stroll with large strides',
      'Sitting completely motionless',
      'Heavy weightlifting'
    ],
    correctOptionIndex: 0,
    recallCues: {
      hint1: 'Taking conscious big steps and swinging arms counteracts motor freezing.',
      hint2: 'Wear supportive comfortable walking shoes and step into the fresh garden air.',
      hint3: 'Stroll for 15 minutes with wide rhythmic strides and gentle arm swings.'
    },
    steps: [
      '1. Wear supportive comfortable walking shoes with non-slip soles',
      '2. Stand tall and take wide rhythmic strides along the path',
      '3. Consciously swing arms with heel-to-toe foot placement'
    ]
  },
  {
    id: 'routine-08',
    title: 'Mind Clinic Cognitive Game Practice',
    description: 'Daily 10-minute cognitive games strengthen working memory pathways.',
    scheduledTime: '06:00 PM',
    category: 'cognitive',
    period: 'evening',
    streakCount: 5,
    isCompleted: false,
    enableAssistedRecall: true,
    timerMinutes: 10,
    recallQuestion: 'It is 06:00 PM. What cognitive exercise stimulates synaptic recall?',
    recallOptions: [
      'Brain clinic card matching or math sprint',
      'Watching television in total darkness',
      'Sleeping immediately'
    ],
    correctOptionIndex: 0,
    recallCues: {
      hint1: 'Daily 10-minute cognitive games strengthen working memory pathways.',
      hint2: 'Open the Mind Games tab in Saksham for a gentle cognitive exercise.',
      hint3: 'Spend 10 minutes enjoying a peaceful memory match or color sequence game.'
    },
    steps: [
      '1. Open the Mind Games tab in Saksham',
      '2. Choose a comfortable game such as Card Matching or Color Sequence',
      '3. Complete 1 to 2 gentle rounds at your own comfortable pace'
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

  public static isOnline(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
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
    if (isDemoModeEnabled(effectiveId)) {
      return DEFAULT_PATIENT_ROUTINES.map((r) => ({ ...r, patientId: effectiveId }));
    }
    return [];
  }

  /**
   * Returns localized routine title for pre-seeded templates while preserving user-created titles verbatim.
   */
  public static getLocalizedTitle(
    routine: { id?: string; title?: string } | string | undefined | null,
    t: (key: string, params?: Record<string, any>) => string,
    language?: string
  ): string {
    return getTranslatedRoutineTitle(routine, t, language);
  }

  /**
   * Synchronize routines from Cloud Firestore.
   * On failure or for guest accounts, gracefully uses local cache.
   */
  public static async syncRoutinesFromFirestore(patientId: string): Promise<RoutineItem[]> {
    const effectiveId = getEffectivePatientId({ uid: patientId });

    // Guest / unauthenticated local demo sessions do not access Firestore
    if (shouldUseLocalDemoSandboxOnly(effectiveId) || !isFirebaseConfigured) {
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

        const sorted = this.sortRoutines(cloudRoutines);
        // Update local cache
        this.saveRoutines(effectiveId, sorted, false);
        return sorted;
      } else {
        // Patient has no routines in cloud: do not invent records
        return [];
      }
    } catch (err) {
      console.warn('[RoutineService] Firestore sync error, falling back to local cache:', err);
      return this.getRoutines(effectiveId);
    }
  }

  /**
   * Save routines for a specific patient UID (local + Firestore)
   */
  public static addRoutine(patientId: string, routine: RoutineItem): RoutineItem[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getRoutines(effectiveId);
    const updated = [routine, ...current];
    this.saveRoutines(effectiveId, updated, true);
    return updated;
  }

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

    if (syncToCloud && !shouldUseLocalDemoSandboxOnly(effectiveId) && isFirebaseConfigured) {
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

    const wasAlreadyCompleted = Boolean(list[index].isCompleted);

    const completedAt = isCompleted
      ? (wasAlreadyCompleted ? list[index].completedAt : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      : undefined;

    const updatedItem: RoutineItem = {
      ...list[index],
      isCompleted,
      completedAt,
      streakCount: isCompleted
        ? (wasAlreadyCompleted ? (list[index].streakCount || 1) : (list[index].streakCount || 0) + 1)
        : Math.max((list[index].streakCount || 1) - 1, 0),
    };

    list[index] = updatedItem;
    this.saveRoutines(effectiveId, list, true);

    // If marked completed and not previously completed, record an attempt to history (prevent duplicates)
    if (isCompleted && !wasAlreadyCompleted) {
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

    if (!shouldUseLocalDemoSandboxOnly(effectiveId) && isFirebaseConfigured) {
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
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }

    if (isDemoModeEnabled(effectiveId)) {
      // Default pre-seeded dynamic relative dates for demo mode only
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

    return [];
  }

  /**
   * Synchronize routine attempt history from Cloud Firestore.
   * Pulls verified attempts, merges with local history, and avoids duplicates.
   * Truthfully handles empty, missing, or offline history without fabricating records.
   */
  public static async syncHistoryFromFirestore(patientId: string): Promise<RoutineAttemptRecord[]> {
    const effectiveId = getEffectivePatientId({ uid: patientId });

    if (isGuestPatient(effectiveId) || !isFirebaseConfigured || !this.isOnline()) {
      return this.getHistory(effectiveId);
    }

    try {
      const q = query(
        collection(db, 'routineAttempts'),
        where('patientId', '==', effectiveId)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const cloudAttempts: RoutineAttemptRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            routineId: data.routineId,
            patientId: data.patientId || effectiveId,
            date: data.date,
            attemptsUsed: data.attemptsUsed || 1,
            skipped: !!data.skipped,
            isCompleted: !!data.isCompleted,
            completedAt: data.completedAt,
            timeZone: data.timeZone,
            createdAt: data.createdAt,
          };
        });

        // Merge with local history without duplicates
        const localHistory = this.getHistory(effectiveId);
        const historyMap = new Map<string, RoutineAttemptRecord>();

        for (const loc of localHistory) {
          historyMap.set(loc.id, loc);
        }

        for (const cloud of cloudAttempts) {
          historyMap.set(cloud.id, cloud);
        }

        const mergedHistory = Array.from(historyMap.values()).sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        this.safeSetItem(this.getHistoryKey(effectiveId), JSON.stringify(mergedHistory));
        notifyDataChange('routines', effectiveId);
        return mergedHistory;
      } else {
        // No cloud attempts: return local history (do not invent missing history)
        return this.getHistory(effectiveId);
      }
    } catch (err) {
      console.warn('[RoutineService] Firestore history sync error, using local history:', err);
      return this.getHistory(effectiveId);
    }
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
    const timeZone = DEFAULT_PATIENT_TIMEZONE;
    const today = getPatientCalendarDate(new Date(), timeZone);

    const newRecord: RoutineAttemptRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      routineId,
      patientId: effectiveId,
      date: today,
      attemptsUsed,
      skipped,
      isCompleted,
      completedAt: isCompleted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      timeZone,
      createdAt: new Date().toISOString()
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

  /**
   * Deterministically sorts routines when explicit caregiver sortOrder exists.
   */
  public static sortRoutines(routines: RoutineItem[]): RoutineItem[] {
    const hasExplicitOrder = routines.some((r) => typeof r.sortOrder === 'number');
    if (!hasExplicitOrder) return routines;
    return [...routines].sort((a, b) => {
      const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
      const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return this.parseTimeToMinutes(a.scheduledTime) - this.parseTimeToMinutes(b.scheduledTime);
    });
  }

  private static getChangeHistoryKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_routine_change_history_${effectiveId}`;
  }

  private static getSyncQueueKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_routine_sync_queue_${effectiveId}`;
  }

  public static getRoutineChangeHistory(patientId: string): RoutineChangeHistoryRecord[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getChangeHistoryKey(effectiveId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private static recordLocalChangeHistory(
    patientId: string,
    record: RoutineChangeHistoryRecord
  ): RoutineChangeHistoryRecord[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getRoutineChangeHistory(effectiveId);
    const updated = [record, ...current.filter((r) => r.id !== record.id)].slice(0, 40);
    this.safeSetItem(this.getChangeHistoryKey(effectiveId), JSON.stringify(updated));
    notifyDataChange('routineChangeHistory', effectiveId);
    return updated;
  }

  public static subscribeToRoutinesFromFirestore(
    patientId: string,
    onRoutinesChanged: (routines: RoutineItem[]) => void,
    onSyncStatus?: (status: 'synced' | 'offline' | 'error', errorMessage?: string) => void
  ): () => void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (shouldUseLocalDemoSandboxOnly(effectiveId) || !isFirebaseConfigured) {
      onSyncStatus?.('synced');
      return () => {};
    }

    try {
      const q = query(collection(db, 'routines'), where('patientId', '==', effectiveId));
      return onSnapshot(
        q,
        (snapshot) => {
          const cloudRoutines: RoutineItem[] = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as RoutineItem),
            id: docSnap.id,
            patientId: effectiveId,
          }));
          const sorted = this.sortRoutines(cloudRoutines);
          this.saveRoutines(effectiveId, sorted, false);
          onRoutinesChanged(sorted);
          onSyncStatus?.(this.isOnline() ? 'synced' : 'offline');
        },
        (err) => {
          console.warn('[RoutineService] Realtime routines listener warning:', err);
          onSyncStatus?.('error', err?.message || 'Unable to listen for routine updates.');
        }
      );
    } catch (err: any) {
      onSyncStatus?.('error', err?.message || 'Listener setup failed.');
      return () => {};
    }
  }

  public static subscribeToRoutineChangeHistory(
    patientId: string,
    onHistoryChanged: (records: RoutineChangeHistoryRecord[]) => void
  ): () => void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (shouldUseLocalDemoSandboxOnly(effectiveId) || !isFirebaseConfigured) {
      onHistoryChanged(this.getRoutineChangeHistory(effectiveId));
      return () => {};
    }
    try {
      const q = query(collection(db, 'routineChangeHistory'), where('patientId', '==', effectiveId));
      return onSnapshot(
        q,
        (snapshot) => {
          const cloudList: RoutineChangeHistoryRecord[] = snapshot.docs
            .map((d) => ({
              ...(d.data() as RoutineChangeHistoryRecord),
              id: d.id,
            }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          this.safeSetItem(this.getChangeHistoryKey(effectiveId), JSON.stringify(cloudList));
          onHistoryChanged(cloudList);
        },
        () => {
          onHistoryChanged(this.getRoutineChangeHistory(effectiveId));
        }
      );
    } catch {
      onHistoryChanged(this.getRoutineChangeHistory(effectiveId));
      return () => {};
    }
  }

  private static enqueueOfflineRoutineOp(
    patientId: string,
    op: { kind: 'upsert' | 'delete'; docId: string; payload?: RoutineItem }
  ): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getSyncQueueKey(effectiveId));
    let queue: Array<{ kind: 'upsert' | 'delete'; docId: string; payload?: RoutineItem }> = [];
    if (raw) {
      try {
        queue = JSON.parse(raw);
      } catch {
        queue = [];
      }
    }
    const filtered = queue.filter((q) => q.docId !== op.docId);
    filtered.push(op);
    this.safeSetItem(this.getSyncQueueKey(effectiveId), JSON.stringify(filtered));
  }

  public static async flushPendingRoutineSyncQueue(patientId: string): Promise<number> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (shouldUseLocalDemoSandboxOnly(effectiveId) || !isFirebaseConfigured || !this.isOnline()) return 0;
    const raw = this.safeGetItem(this.getSyncQueueKey(effectiveId));
    if (!raw) return 0;
    let queue: Array<{ kind: 'upsert' | 'delete'; docId: string; payload?: RoutineItem }> = [];
    try {
      queue = JSON.parse(raw);
    } catch {
      return 0;
    }
    if (!Array.isArray(queue) || queue.length === 0) return 0;

    let flushed = 0;
    const remaining: typeof queue = [];
    for (const item of queue) {
      try {
        if (item.kind === 'upsert' && item.payload) {
          await setDoc(doc(db, 'routines', item.docId), item.payload, { merge: true });
        } else if (item.kind === 'delete') {
          await deleteDoc(doc(db, 'routines', item.docId));
        }
        flushed += 1;
      } catch {
        remaining.push(item);
      }
    }
    this.safeSetItem(this.getSyncQueueKey(effectiveId), JSON.stringify(remaining));
    return flushed;
  }

  /**
   * Persist a caregiver-initiated task add or edit to shared Firestore routines,
   * preserving live patient completion status/streak, logging immutable audit history,
   * and creating a real persisted in-app patient notification.
   */
  public static async caregiverSaveRoutine(params: {
    patientId: string;
    caregiverUid: string;
    caregiverName: string;
    routineDraft: {
      id?: string;
      title: string;
      scheduledTime: string;
      category: RoutineItem['category'];
      description?: string;
      notes?: string;
      recurrence?: RoutineItem['recurrence'];
      recurrenceDays?: string[];
      isImportant?: boolean;
      enableAssistedRecall?: boolean;
    };
    existingRoutine?: RoutineItem | null;
    patientLanguage?: string;
  }): Promise<{
    ok: boolean;
    syncStatus: 'synced' | 'offline_queued' | 'error';
    routine?: RoutineItem;
    error?: string;
  }> {
    const effectiveId = getEffectivePatientId({ uid: params.patientId });
    const existing = params.existingRoutine || null;

    if (existing && (existing.isClinicianPrescribed || existing.isSafetyLocked)) {
      return {
        ok: false,
        syncStatus: 'error',
        error: 'Clinician-prescribed or safety-locked routines cannot be altered by caregivers.',
      };
    }

    const currentList = this.getRoutines(effectiveId);
    const rawId = existing?.id || params.routineDraft.id || `cg_routine_${Date.now()}`;
    const docId = rawId.startsWith(effectiveId) ? rawId : `${effectiveId}_${rawId}`;

    // Preserve latest patient completion state during edits (conflict-safe merge)
    let latestExisting: RoutineItem | undefined =
      currentList.find((r) => r.id === rawId || r.id === docId) || existing || undefined;
    if (!shouldUseLocalDemoSandboxOnly(effectiveId) && isFirebaseConfigured && this.isOnline() && existing) {
      try {
        const snap = await getDoc(doc(db, 'routines', docId));
        if (snap.exists()) {
          latestExisting = { ...(snap.data() as RoutineItem), id: snap.id };
        }
      } catch {
        // Fallback cleanly to current local state
      }
    }

    const nowIso = new Date().toISOString();
    const isEdit = Boolean(latestExisting);
    const maxSort = currentList.reduce(
      (max, r, idx) => Math.max(max, typeof r.sortOrder === 'number' ? r.sortOrder : idx),
      -1
    );

    const nextRoutine: RoutineItem = {
      ...(latestExisting || {}),
      id: latestExisting ? latestExisting.id : docId,
      patientId: effectiveId,
      title: params.routineDraft.title.trim(),
      scheduledTime: params.routineDraft.scheduledTime.trim(),
      category: params.routineDraft.category,
      period: this.getPeriodFromTime(params.routineDraft.scheduledTime),
      description: params.routineDraft.description?.trim() || '',
      notes: params.routineDraft.notes?.trim() || '',
      recurrence: params.routineDraft.recurrence || 'daily',
      recurrenceDays:
        params.routineDraft.recurrence === 'custom'
          ? params.routineDraft.recurrenceDays || []
          : [],
      isImportant: Boolean(params.routineDraft.isImportant),
      isEssential: Boolean(
        params.routineDraft.isImportant ?? latestExisting?.isEssential
      ),
      enableAssistedRecall:
        params.routineDraft.enableAssistedRecall ??
        latestExisting?.enableAssistedRecall ??
        true,
      streakCount: latestExisting?.streakCount ?? 0,
      isCompleted: Boolean(latestExisting?.isCompleted),
      completedAt: latestExisting?.completedAt,
      status: latestExisting?.status || (latestExisting?.isCompleted ? 'completed' : 'pending'),
      sortOrder:
        typeof latestExisting?.sortOrder === 'number'
          ? latestExisting.sortOrder
          : maxSort + 1,
      updatedAt: nowIso,
      updatedByUid: params.caregiverUid,
      updatedByName: params.caregiverName,
      updatedByRole: 'caregiver',
      version: (latestExisting?.version || 0) + 1,
    };

    const previousList = [...currentList];
    const nextList = isEdit
      ? currentList.map((r) => (r.id === latestExisting!.id || r.id === docId ? nextRoutine : r))
      : [...currentList, nextRoutine];
    const sortedNext = this.sortRoutines(nextList);

    this.saveRoutines(effectiveId, sortedNext, false);

    const timeChanged =
      Boolean(latestExisting) &&
      latestExisting!.scheduledTime !== nextRoutine.scheduledTime;

    const historyRecord: RoutineChangeHistoryRecord = {
      id: `rch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      patientId: effectiveId,
      routineId: docId,
      routineTitle: nextRoutine.title,
      action: isEdit ? 'updated' : 'created',
      summary: timeChanged
        ? `${params.caregiverName} changed "${nextRoutine.title}" time from ${latestExisting!.scheduledTime} to ${nextRoutine.scheduledTime}`
        : isEdit
        ? `${params.caregiverName} updated "${nextRoutine.title}"`
        : `${params.caregiverName} added "${nextRoutine.title}" at ${nextRoutine.scheduledTime}`,
      actorUid: params.caregiverUid,
      actorName: params.caregiverName,
      actorRole: 'caregiver',
      createdAt: nowIso,
    };
    this.recordLocalChangeHistory(effectiveId, historyRecord);

    const syncUi = getRoutineSyncUi(params.patientLanguage || 'en');
    const notifTitle = isEdit ? syncUi.notifUpdatedTitle : syncUi.notifAddedTitle;
    const notifTemplate = !isEdit
      ? syncUi.notifAddedMsg
      : timeChanged
      ? syncUi.notifTimeChangedMsg
      : syncUi.notifUpdatedMsg;
    const notifMessage = formatSyncMessage(notifTemplate, {
      actor: params.caregiverName,
      title: nextRoutine.title,
      time: nextRoutine.scheduledTime,
    });

    if (shouldUseLocalDemoSandboxOnly(effectiveId) || !isFirebaseConfigured) {
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: 'patient',
        type: isEdit ? 'ROUTINE_UPDATED' : 'ROUTINE_ADDED',
        title: notifTitle,
        message: notifMessage,
        activityId: docId,
        activityTitle: nextRoutine.title,
        senderUid: params.caregiverUid,
        senderName: params.caregiverName,
        senderRole: 'caregiver',
        actionUrl: '/patient#daily-routines-workspace',
        bypassDedup: true,
      });
      return { ok: true, syncStatus: 'synced', routine: nextRoutine };
    }

    if (!this.isOnline()) {
      this.enqueueOfflineRoutineOp(effectiveId, { kind: 'upsert', docId, payload: nextRoutine });
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: 'patient',
        type: isEdit ? 'ROUTINE_UPDATED' : 'ROUTINE_ADDED',
        title: notifTitle,
        message: notifMessage,
        activityId: docId,
        activityTitle: nextRoutine.title,
        senderUid: params.caregiverUid,
        senderName: params.caregiverName,
        senderRole: 'caregiver',
        actionUrl: '/patient#daily-routines-workspace',
        bypassDedup: true,
      });
      return { ok: true, syncStatus: 'offline_queued', routine: nextRoutine };
    }

    try {
      await setDoc(doc(db, 'routines', docId), nextRoutine, { merge: true });
      await setDoc(doc(db, 'routineChangeHistory', historyRecord.id), historyRecord);
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: 'patient',
        type: isEdit ? 'ROUTINE_UPDATED' : 'ROUTINE_ADDED',
        title: notifTitle,
        message: notifMessage,
        activityId: docId,
        activityTitle: nextRoutine.title,
        senderUid: params.caregiverUid,
        senderName: params.caregiverName,
        senderRole: 'caregiver',
        actionUrl: '/patient#daily-routines-workspace',
        bypassDedup: true,
      });
      return { ok: true, syncStatus: 'synced', routine: nextRoutine };
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'permission-denied') {
        this.saveRoutines(effectiveId, previousList, false);
        return {
          ok: false,
          syncStatus: 'error',
          error: 'Permission denied: only authorised connected caregivers can modify patient routines.',
        };
      }
      this.enqueueOfflineRoutineOp(effectiveId, { kind: 'upsert', docId, payload: nextRoutine });
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: 'patient',
        type: isEdit ? 'ROUTINE_UPDATED' : 'ROUTINE_ADDED',
        title: notifTitle,
        message: notifMessage,
        activityId: docId,
        activityTitle: nextRoutine.title,
        senderUid: params.caregiverUid,
        senderName: params.caregiverName,
        senderRole: 'caregiver',
        actionUrl: '/patient#daily-routines-workspace',
        bypassDedup: true,
      });
      return {
        ok: true,
        syncStatus: 'offline_queued',
        routine: nextRoutine,
        error: err?.message,
      };
    }
  }

  public static async caregiverDeleteRoutine(params: {
    patientId: string;
    caregiverUid: string;
    caregiverName: string;
    routineId: string;
    patientLanguage?: string;
  }): Promise<{ ok: boolean; syncStatus: 'synced' | 'offline_queued' | 'error'; error?: string }> {
    const effectiveId = getEffectivePatientId({ uid: params.patientId });
    const currentList = this.getRoutines(effectiveId);
    const docId = params.routineId.startsWith(effectiveId)
      ? params.routineId
      : `${effectiveId}_${params.routineId}`;
    const target = currentList.find((r) => r.id === params.routineId || r.id === docId);
    if (!target) return { ok: false, syncStatus: 'error', error: 'Task not found.' };
    if (target.isClinicianPrescribed || target.isSafetyLocked) {
      return { ok: false, syncStatus: 'error', error: 'Clinician-prescribed tasks cannot be deleted.' };
    }

    const previousList = [...currentList];
    const filtered = currentList.filter((r) => r.id !== target.id && r.id !== docId);
    this.saveRoutines(effectiveId, filtered, false);

    const nowIso = new Date().toISOString();
    const historyRecord: RoutineChangeHistoryRecord = {
      id: `rch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      patientId: effectiveId,
      routineId: target.id,
      routineTitle: target.title,
      action: 'deleted',
      summary: `${params.caregiverName} removed "${target.title}" from the daily routine`,
      actorUid: params.caregiverUid,
      actorName: params.caregiverName,
      actorRole: 'caregiver',
      createdAt: nowIso,
    };
    this.recordLocalChangeHistory(effectiveId, historyRecord);

    const syncUi = getRoutineSyncUi(params.patientLanguage || 'en');
    const notifMessage = formatSyncMessage(syncUi.notifDeletedMsg, {
      actor: params.caregiverName,
      title: target.title,
    });

    if (shouldUseLocalDemoSandboxOnly(effectiveId) || !isFirebaseConfigured) {
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: 'patient',
        type: 'ROUTINE_DELETED',
        title: syncUi.notifDeletedTitle,
        message: notifMessage,
        activityId: target.id,
        activityTitle: target.title,
        senderUid: params.caregiverUid,
        senderName: params.caregiverName,
        senderRole: 'caregiver',
        actionUrl: '/patient#daily-routines-workspace',
        bypassDedup: true,
      });
      return { ok: true, syncStatus: 'synced' };
    }

    if (!this.isOnline()) {
      this.enqueueOfflineRoutineOp(effectiveId, { kind: 'delete', docId });
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: 'patient',
        type: 'ROUTINE_DELETED',
        title: syncUi.notifDeletedTitle,
        message: notifMessage,
        activityId: target.id,
        activityTitle: target.title,
        senderUid: params.caregiverUid,
        senderName: params.caregiverName,
        senderRole: 'caregiver',
        actionUrl: '/patient#daily-routines-workspace',
        bypassDedup: true,
      });
      return { ok: true, syncStatus: 'offline_queued' };
    }

    try {
      await deleteDoc(doc(db, 'routines', target.id.startsWith(effectiveId) ? target.id : docId));
      await setDoc(doc(db, 'routineChangeHistory', historyRecord.id), historyRecord);
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: 'patient',
        type: 'ROUTINE_DELETED',
        title: syncUi.notifDeletedTitle,
        message: notifMessage,
        activityId: target.id,
        activityTitle: target.title,
        senderUid: params.caregiverUid,
        senderName: params.caregiverName,
        senderRole: 'caregiver',
        actionUrl: '/patient#daily-routines-workspace',
        bypassDedup: true,
      });
      return { ok: true, syncStatus: 'synced' };
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        this.saveRoutines(effectiveId, previousList, false);
        return { ok: false, syncStatus: 'error', error: 'Permission denied while deleting task.' };
      }
      this.enqueueOfflineRoutineOp(effectiveId, { kind: 'delete', docId });
      return { ok: true, syncStatus: 'offline_queued', error: err?.message };
    }
  }

  public static async caregiverReorderRoutines(params: {
    patientId: string;
    caregiverUid: string;
    caregiverName: string;
    reorderedRoutines: RoutineItem[];
    movedRoutine: RoutineItem;
    patientLanguage?: string;
  }): Promise<{ ok: boolean; syncStatus: 'synced' | 'offline_queued' | 'error'; error?: string }> {
    const effectiveId = getEffectivePatientId({ uid: params.patientId });
    const nowIso = new Date().toISOString();
    const withSort = params.reorderedRoutines.map((r, index) => ({
      ...r,
      patientId: effectiveId,
      sortOrder: index,
      updatedAt: nowIso,
      updatedByUid: params.caregiverUid,
      updatedByName: params.caregiverName,
      updatedByRole: 'caregiver' as const,
    }));

    this.saveRoutines(effectiveId, withSort, false);

    const historyRecord: RoutineChangeHistoryRecord = {
      id: `rch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      patientId: effectiveId,
      routineId: params.movedRoutine.id,
      routineTitle: params.movedRoutine.title,
      action: 'reordered',
      summary: `${params.caregiverName} reordered routine tasks (moved "${params.movedRoutine.title}")`,
      actorUid: params.caregiverUid,
      actorName: params.caregiverName,
      actorRole: 'caregiver',
      createdAt: nowIso,
    };
    this.recordLocalChangeHistory(effectiveId, historyRecord);

    const syncUi = getRoutineSyncUi(params.patientLanguage || 'en');
    const notifMessage = formatSyncMessage(syncUi.notifReorderedMsg, {
      actor: params.caregiverName,
      title: params.movedRoutine.title,
    });

    if (shouldUseLocalDemoSandboxOnly(effectiveId) || !isFirebaseConfigured || !this.isOnline()) {
      if (!shouldUseLocalDemoSandboxOnly(effectiveId) && isFirebaseConfigured && !this.isOnline()) {
        withSort
          .filter((r) => !r.isClinicianPrescribed && !r.isSafetyLocked)
          .forEach((r) => {
            const docId = r.id.startsWith(effectiveId) ? r.id : `${effectiveId}_${r.id}`;
            this.enqueueOfflineRoutineOp(effectiveId, { kind: 'upsert', docId, payload: r });
          });
      }
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: 'patient',
        type: 'ROUTINE_REORDERED',
        title: syncUi.notifReorderedTitle,
        message: notifMessage,
        activityId: params.movedRoutine.id,
        activityTitle: params.movedRoutine.title,
        senderUid: params.caregiverUid,
        senderName: params.caregiverName,
        senderRole: 'caregiver',
        actionUrl: '/patient#daily-routines-workspace',
        bypassDedup: true,
      });
      return {
        ok: true,
        syncStatus: this.isOnline() ? 'synced' : 'offline_queued',
      };
    }

    try {
      const batch = writeBatch(db);
      withSort
        .filter((r) => !r.isClinicianPrescribed && !r.isSafetyLocked)
        .forEach((r) => {
          const docId = r.id.startsWith(effectiveId) ? r.id : `${effectiveId}_${r.id}`;
          batch.set(doc(db, 'routines', docId), { ...r, id: docId, patientId: effectiveId }, { merge: true });
        });
      await batch.commit();
      await setDoc(doc(db, 'routineChangeHistory', historyRecord.id), historyRecord);
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: 'patient',
        type: 'ROUTINE_REORDERED',
        title: syncUi.notifReorderedTitle,
        message: notifMessage,
        activityId: params.movedRoutine.id,
        activityTitle: params.movedRoutine.title,
        senderUid: params.caregiverUid,
        senderName: params.caregiverName,
        senderRole: 'caregiver',
        actionUrl: '/patient#daily-routines-workspace',
        bypassDedup: true,
      });
      return { ok: true, syncStatus: 'synced' };
    } catch (err: any) {
      return { ok: false, syncStatus: 'error', error: err?.message || 'Reorder sync failed.' };
    }
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
