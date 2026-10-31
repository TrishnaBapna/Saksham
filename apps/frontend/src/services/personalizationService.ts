/**
 * SAKSHAM 2.0 — Personalisation & Seven-Day Trial Service
 *
 * Implements Module 2: Seven-Day Personalisation Trial
 * - Deterministic, explainable trial workflow
 * - Distinct handling for user stated preferences vs caregiver observations vs technical events
 * - Persists locally (LocalStorage/IndexedDB) and syncs to Firestore when online
 * - Supports paused sessions, resumed sessions, and demo data loading
 */

import type {
  PersonalisationTrialState,
  ReportedDifficultyRecord,
  DifficultyCategory,
  AssistanceCategory,
  HelpfulRating,
  EntrySource,
  TrialDayNumber,
  UserSupportProfile,
} from '@/types/firestore';
import { offlineSyncService } from '@/services/offlineSyncService';

const STORAGE_PREFIX = 'saksham_trial_';

const memoryFallback: Record<string, string> = {};

function getSafeStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
      return (globalThis as unknown as { localStorage: Storage }).localStorage;
    }
  } catch (e) {}
  return null;
}

export function getTrialStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId || 'default'}`;
}

export const INITIAL_TRIAL_STATE: PersonalisationTrialState = {
  userId: 'default',
  status: 'not_started',
  currentDay: 1,
  startDate: new Date().toISOString(),
  completedDays: [],
  baselinePreferences: {},
  difficultiesRecorded: [],
  helpfulAssistanceOptions: [],
  unhelpfulAssistanceOptions: [],
  humanAssistanceRequestedTasks: [],
  summaryApprovedByUser: false,
  updatedAt: new Date().toISOString(),
};

/**
 * Loads current trial state from local persistence
 */
export function getPersonalisationTrialState(userId: string): PersonalisationTrialState {
  const storage = getSafeStorage();
  const key = getTrialStorageKey(userId);
  let raw: string | null = null;
  if (storage) {
    try { raw = storage.getItem(key); } catch (e) {}
  } else {
    raw = memoryFallback[key] || null;
  }
  if (!raw) return { ...INITIAL_TRIAL_STATE, userId };
  try {
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_TRIAL_STATE,
      ...parsed,
      userId,
    };
  } catch (err) {
    console.warn('[Personalisation Service] Failed to read trial state:', err);
    return { ...INITIAL_TRIAL_STATE, userId };
  }
}

/**
 * Saves current trial state to local persistence
 */
export function savePersonalisationTrialState(state: PersonalisationTrialState): void {
  const storage = getSafeStorage();
  const key = getTrialStorageKey(state.userId);
  const updated = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(updated);
  if (storage) {
    try { storage.setItem(key, serialized); } catch (e) {}
  } else {
    memoryFallback[key] = serialized;
  }
}

/**
 * Day 1: Establish baseline preferences
 */
export function startPersonalisationTrial(
  userId: string,
  baseline: Partial<UserSupportProfile>
): PersonalisationTrialState {
  const current = getPersonalisationTrialState(userId);
  const now = new Date().toISOString();

  const nextState: PersonalisationTrialState = {
    ...current,
    userId,
    status: 'active',
    currentDay: 1,
    startDate: now,
    lastActivityDate: now,
    completedDays: [1],
    baselinePreferences: { ...baseline },
    updatedAt: now,
  };

  savePersonalisationTrialState(nextState);

  try {
    offlineSyncService.enqueueOperation(userId, 'profile', 'update', nextState, `trial_${userId}_${Date.now()}`);
  } catch (e) {}

  return nextState;
}

/**
 * Days 2–3 & 4–5: Record an activity difficulty
 */
export function recordActivityDifficulty(
  userId: string,
  params: {
    taskId?: string | number;
    activityId?: string | number;
    taskTitle?: string;
    difficultyCategory?: DifficultyCategory | string;
    difficultyType?: DifficultyCategory | string;
    assistanceOffered?: AssistanceCategory[];
    assistanceSelected?: AssistanceCategory;
    assistanceOption?: AssistanceCategory;
    helpfulRating?: HelpfulRating;
    notes?: string;
    enteredBy?: EntrySource;
  }
): ReportedDifficultyRecord {
  const state = getPersonalisationTrialState(userId);
  const now = new Date().toISOString();

  let diffCat: DifficultyCategory = 'other';
  const rawCat = params.difficultyCategory || params.difficultyType;
  if (rawCat === 'memory') diffCat = 'instructions_complicated';
  else if (rawCat === 'motor') diffCat = 'buttons_hard_to_tap';
  else if (rawCat === 'sequence') diffCat = 'sequence_hard_to_remember';
  else if (rawCat === 'sensory') diffCat = 'text_too_small';
  else if (rawCat) diffCat = rawCat as DifficultyCategory;

  const selectedAssistance = params.assistanceSelected || params.assistanceOption;
  const taskId = params.taskId ?? params.activityId;

  const record: ReportedDifficultyRecord = {
    id: `diff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    taskId,
    taskTitle: params.taskTitle || 'Daily Activity',
    timestamp: now,
    difficultyCategory: diffCat,
    assistanceOffered: params.assistanceOffered || (selectedAssistance ? [selectedAssistance] : []),
    assistanceSelected: selectedAssistance,
    helpfulRating: params.helpfulRating || 'unrated',
    notes: params.notes || '',
    enteredBy: params.enteredBy || 'user',
    synced: false,
  };

  const updatedDifficulties = [record, ...state.difficultiesRecorded];

  // Track caregiver requests
  const humanRequests = [...state.humanAssistanceRequestedTasks];
  if (
    (diffCat === 'caregiver_requested' ||
      selectedAssistance === 'caregiver_assistance') &&
    params.taskTitle &&
    !humanRequests.includes(params.taskTitle)
  ) {
    humanRequests.push(params.taskTitle);
  }

  // Calculate completed trial days based on interaction history
  const completed = new Set(state.completedDays);
  if (state.currentDay >= 2 && state.currentDay <= 3) completed.add(2);
  if (state.currentDay >= 4 && state.currentDay <= 5) completed.add(4);

  const helpful = new Set(state.helpfulAssistanceOptions);
  const unhelpful = new Set(state.unhelpfulAssistanceOptions);
  if (selectedAssistance) {
    if (params.helpfulRating === 'helpful') {
      helpful.add(selectedAssistance);
      unhelpful.delete(selectedAssistance);
    } else if (params.helpfulRating === 'unhelpful') {
      unhelpful.add(selectedAssistance);
      helpful.delete(selectedAssistance);
    }
  }

  const nextState: PersonalisationTrialState = {
    ...state,
    lastActivityDate: now,
    completedDays: Array.from(completed).sort(),
    difficultiesRecorded: updatedDifficulties,
    humanAssistanceRequestedTasks: humanRequests,
    helpfulAssistanceOptions: Array.from(helpful),
    unhelpfulAssistanceOptions: Array.from(unhelpful),
    updatedAt: now,
  };

  savePersonalisationTrialState(nextState);

  try {
    offlineSyncService.enqueueOperation(userId, 'difficulty', 'create', record, record.id);
  } catch (e) {}

  return record;
}

/**
 * Record user or caregiver rating on whether offered assistance was helpful
 */
export function recordAssistanceFeedback(
  userId: string,
  difficultyIdOrParams:
    | string
    | {
        activityId?: string | number;
        assistanceCategory: AssistanceCategory;
        helpfulRating: HelpfulRating;
        taskLabel?: string;
        notes?: string;
      },
  rating?: HelpfulRating,
  notes?: string
): PersonalisationTrialState {
  const state = getPersonalisationTrialState(userId);
  const now = new Date().toISOString();

  let targetCategory: AssistanceCategory | undefined;
  let effectiveRating: HelpfulRating = 'unrated';
  let updatedDifficulties = [...state.difficultiesRecorded];

  if (typeof difficultyIdOrParams === 'string') {
    const difficultyId = difficultyIdOrParams;
    effectiveRating = rating || 'unrated';
    updatedDifficulties = state.difficultiesRecorded.map((d) => {
      if (d.id === difficultyId) {
        targetCategory = d.assistanceSelected;
        return {
          ...d,
          helpfulRating: effectiveRating,
          notes: notes !== undefined ? notes : d.notes,
          updatedAt: now,
        };
      }
      return d;
    });
  } else {
    targetCategory = difficultyIdOrParams.assistanceCategory;
    effectiveRating = difficultyIdOrParams.helpfulRating;
    const actId = difficultyIdOrParams.activityId?.toString();
    const existingIndex = updatedDifficulties.findIndex(
      (d) => d.taskId?.toString() === actId && d.assistanceSelected === targetCategory
    );

    if (existingIndex >= 0) {
      updatedDifficulties[existingIndex] = {
        ...updatedDifficulties[existingIndex],
        helpfulRating: effectiveRating,
        notes: difficultyIdOrParams.notes || updatedDifficulties[existingIndex].notes,
      };
    } else {
      const newRecord: ReportedDifficultyRecord = {
        id: `diff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        taskId: actId,
        taskTitle: difficultyIdOrParams.taskLabel || 'Daily Activity',
        timestamp: now,
        difficultyCategory: 'other',
        assistanceOffered: [targetCategory],
        assistanceSelected: targetCategory,
        helpfulRating: effectiveRating,
        notes: difficultyIdOrParams.notes || '',
        enteredBy: 'user',
        synced: false,
      };
      updatedDifficulties = [newRecord, ...updatedDifficulties];
    }
  }

  const helpful = new Set(state.helpfulAssistanceOptions);
  const unhelpful = new Set(state.unhelpfulAssistanceOptions);

  if (targetCategory) {
    if (effectiveRating === 'helpful') {
      helpful.add(targetCategory);
      unhelpful.delete(targetCategory);
    } else if (effectiveRating === 'unhelpful') {
      unhelpful.add(targetCategory);
      helpful.delete(targetCategory);
    }
  }

  const nextState: PersonalisationTrialState = {
    ...state,
    lastActivityDate: now,
    difficultiesRecorded: updatedDifficulties,
    helpfulAssistanceOptions: Array.from(helpful),
    unhelpfulAssistanceOptions: Array.from(unhelpful),
    updatedAt: now,
  };

  savePersonalisationTrialState(nextState);

  try {
    offlineSyncService.enqueueOperation(userId, 'feedback', 'update', {
      targetCategory,
      rating: effectiveRating,
      timestamp: now,
    });
  } catch (e) {}

  return nextState;
}

/**
 * Move or resume trial day
 */
export function setTrialDay(userId: string, day: TrialDayNumber): PersonalisationTrialState {
  const state = getPersonalisationTrialState(userId);
  const now = new Date().toISOString();

  const completed = new Set(state.completedDays);
  completed.add(day);

  const nextState: PersonalisationTrialState = {
    ...state,
    currentDay: day,
    lastActivityDate: now,
    completedDays: Array.from(completed).sort(),
    status: day === 7 ? 'completed' : 'active',
    updatedAt: now,
  };

  savePersonalisationTrialState(nextState);

  try {
    offlineSyncService.enqueueOperation(userId, 'profile', 'update', nextState, `trial_${userId}_${Date.now()}`);
  } catch (e) {}

  return nextState;
}

/**
 * Days 6–7: Get review summary
 */
export function getTrialReviewSummary(userId: string): {
  totalDifficulties: number;
  byCategory: Record<string, number>;
  helpfulCount: number;
  unhelpfulCount: number;
  helpfulOptions: AssistanceCategory[];
  unhelpfulOptions: AssistanceCategory[];
  humanAssistanceRequests: string[];
  daysRecorded: number;
  isReadyForProfileCreation: boolean;
  recommendationsPreview: string[];
} {
  const state = getPersonalisationTrialState(userId);
  const byCategory: Record<string, number> = {};

  let helpfulCount = 0;
  let unhelpfulCount = 0;

  state.difficultiesRecorded.forEach((d) => {
    byCategory[d.difficultyCategory] = (byCategory[d.difficultyCategory] || 0) + 1;
    if (d.helpfulRating === 'helpful') helpfulCount++;
    if (d.helpfulRating === 'unhelpful') unhelpfulCount++;
  });

  const recommendationsPreview: string[] = [];
  if (state.helpfulAssistanceOptions.includes('step_by_step')) {
    recommendationsPreview.push('Deliver morning medication and dressing routines in single, calm micro-steps.');
  }
  if (state.helpfulAssistanceOptions.includes('voice_guidance')) {
    recommendationsPreview.push('Enable automatic audio read-aloud prompts for scheduled activities.');
  }
  if (state.helpfulAssistanceOptions.includes('larger_controls')) {
    recommendationsPreview.push('Keep high-target touch padding and tremor-friendly tap spacing enabled.');
  }
  if (state.helpfulAssistanceOptions.includes('text_simplification')) {
    recommendationsPreview.push('Shorten reminder descriptions to essential 1-line instructions.');
  }
  if (recommendationsPreview.length === 0) {
    recommendationsPreview.push('Standard calm assistance with optional voice-notes and visual flashcards.');
  }

  return {
    totalDifficulties: state.difficultiesRecorded.length,
    byCategory,
    helpfulCount,
    unhelpfulCount,
    helpfulOptions: state.helpfulAssistanceOptions,
    unhelpfulOptions: state.unhelpfulAssistanceOptions,
    humanAssistanceRequests: state.humanAssistanceRequestedTasks,
    daysRecorded: state.completedDays.length,
    isReadyForProfileCreation: state.difficultiesRecorded.length >= 2 || state.completedDays.length >= 4,
    recommendationsPreview,
  };
}

/**
 * Load realistic demonstration data for immediate clinical or educational testing
 */
export function loadDemoTrialData(userId: string): PersonalisationTrialState {
  const now = new Date();
  const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

  const demoDifficulties: ReportedDifficultyRecord[] = [
    {
      id: 'demo_diff_1',
      userId,
      taskId: 1,
      taskTitle: 'Morning Herbal Tea & Hydration',
      timestamp: d(5),
      difficultyCategory: 'instructions_complicated',
      assistanceOffered: ['step_by_step', 'text_simplification'],
      assistanceSelected: 'step_by_step',
      helpfulRating: 'helpful',
      notes: '4-step checklist made it very easy to follow without feeling rushed.',
      enteredBy: 'user',
      synced: true,
    },
    {
      id: 'demo_diff_2',
      userId,
      taskId: 2,
      taskTitle: 'Buttoning Shirt & Morning Dressing',
      timestamp: d(4),
      difficultyCategory: 'motor_tremor_difficulty',
      assistanceOffered: ['larger_controls', 'caregiver_assistance'],
      assistanceSelected: 'larger_controls',
      helpfulRating: 'helpful',
      notes: 'Larger touch targets and +5m calm timer extension prevented panic.',
      enteredBy: 'user',
      synced: true,
    },
    {
      id: 'demo_diff_3',
      userId,
      taskId: 3,
      taskTitle: 'Afternoon Memory Exercise',
      timestamp: d(3),
      difficultyCategory: 'sequence_hard_to_remember',
      assistanceOffered: ['voice_guidance', 'visual_cues'],
      assistanceSelected: 'voice_guidance',
      helpfulRating: 'helpful',
      notes: 'Spoken clue helped recall daughter photo immediately.',
      enteredBy: 'caregiver',
      synced: true,
    },
    {
      id: 'demo_diff_4',
      userId,
      taskId: 4,
      taskTitle: 'Evening Walk & Posture Drill',
      timestamp: d(2),
      difficultyCategory: 'other',
      assistanceOffered: ['repeated_instructions', 'text_simplification'],
      assistanceSelected: 'repeated_instructions',
      helpfulRating: 'unhelpful',
      notes: 'Repeating text was unnecessary; steady metronome sound in Tab 4 worked much better.',
      enteredBy: 'user',
      synced: true,
    },
  ];

  const demoState: PersonalisationTrialState = {
    userId,
    status: 'completed',
    currentDay: 7,
    startDate: d(7),
    lastActivityDate: d(0),
    completedDays: [1, 2, 3, 4, 5, 6, 7],
    baselinePreferences: {
      displayName: 'Kalyani Sharma',
      preferredLanguage: 'en',
      textSizePreference: 'large',
      contrastPreference: 'standard',
      voiceAssistanceEnabled: true,
      guidanceStyle: 'step_by_step',
      pathway: 'parkinsons',
      adaptiveAssistanceEnabled: true,
    },
    difficultiesRecorded: demoDifficulties,
    helpfulAssistanceOptions: ['step_by_step', 'larger_controls', 'voice_guidance'],
    unhelpfulAssistanceOptions: ['repeated_instructions'],
    humanAssistanceRequestedTasks: ['Buttoning Shirt & Morning Dressing'],
    summaryApprovedByUser: true,
    updatedAt: new Date().toISOString(),
  };

  savePersonalisationTrialState(demoState);
  return demoState;
}

/**
 * Reset trial state
 */
export function resetTrialState(userId: string): PersonalisationTrialState {
  const storage = getSafeStorage();
  const key = getTrialStorageKey(userId);
  if (storage) {
    try { storage.removeItem(key); } catch (e) {}
  }
  delete memoryFallback[key];
  return { ...INITIAL_TRIAL_STATE, userId };
}
