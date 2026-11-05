import { RoutineItem, RoutineAttemptRecord } from '../../../types/index.js';

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

  private static getStorageKey(patientId: string): string {
    return `saksham_routines_${patientId || 'default'}`;
  }

  private static getHistoryKey(patientId: string): string {
    return `saksham_routine_history_${patientId || 'default'}`;
  }

  /**
   * Load routines for a specific patient UID
   */
  public static getRoutines(patientId: string): RoutineItem[] {
    try {
      const key = this.getStorageKey(patientId);
      const data = this.safeGetItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Ignore parse/storage errors
    }
    return DEFAULT_PATIENT_ROUTINES;
  }

  /**
   * Save routines for a specific patient UID
   */
  public static saveRoutines(patientId: string, routines: RoutineItem[]): void {
    try {
      const key = this.getStorageKey(patientId);
      this.safeSetItem(key, JSON.stringify(routines));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Load completion history for dynamic streak calculation
   */
  public static getHistory(patientId: string): RoutineAttemptRecord[] {
    try {
      const key = this.getHistoryKey(patientId);
      const data = this.safeGetItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Ignore storage errors
    }
    // Default pre-seeded history spanning previous days for streak calculation
    return [
      { id: 'hist-01', routineId: 'routine-01', patientId, date: '2026-11-04', attemptsUsed: 1, skipped: false, isCompleted: true },
      { id: 'hist-02', routineId: 'routine-02', patientId, date: '2026-11-04', attemptsUsed: 2, skipped: false, isCompleted: true },
      { id: 'hist-03', routineId: 'routine-01', patientId, date: '2026-11-03', attemptsUsed: 1, skipped: false, isCompleted: true },
      { id: 'hist-04', routineId: 'routine-02', patientId, date: '2026-11-03', attemptsUsed: 1, skipped: false, isCompleted: true },
      { id: 'hist-05', routineId: 'routine-01', patientId, date: '2026-11-02', attemptsUsed: 1, skipped: false, isCompleted: true },
      { id: 'hist-06', routineId: 'routine-01', patientId, date: '2026-11-01', attemptsUsed: 1, skipped: false, isCompleted: true }
    ];
  }

  /**
   * Save an attempt or completion record to history
   */
  public static recordAttempt(
    patientId: string,
    routineId: string,
    attemptsUsed: number,
    skipped: boolean,
    isCompleted: boolean
  ): void {
    const history = this.getHistory(patientId);
    const today = new Date().toISOString().split('T')[0];

    const newRecord: RoutineAttemptRecord = {
      id: `att_${Date.now()}`,
      routineId,
      patientId,
      date: today,
      attemptsUsed,
      skipped,
      isCompleted,
      completedAt: isCompleted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
    };

    const updated = [newRecord, ...history];
    try {
      this.safeSetItem(this.getHistoryKey(patientId), JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Dynamic progress calculation from actual tasks
   */
  public static calculateProgress(routines: RoutineItem[]): {
    completed: number;
    total: number;
    percentage: number;
  } {
    if (!routines || routines.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    const completed = routines.filter((r) => r.isCompleted).length;
    const total = routines.length;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
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
}
