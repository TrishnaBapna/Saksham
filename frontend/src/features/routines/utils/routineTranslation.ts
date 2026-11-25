/**
 * SAKSHAM — Phase 3.21 Remediation: Routine Translation Helper
 * Preserves Category C user-created routine titles & custom recall cues verbatim while
 * translating system-provided routine templates into the active selected language.
 */

import { RoutineItem } from '../../../types/index.js';

export const ROUTINE_TITLE_MAP: Record<string, string> = {
  'routine-01': 'routines.title_routine_01',
  'routine-02': 'routines.title_routine_02',
  'routine-03': 'routines.title_routine_03',
  'routine-04': 'routines.title_routine_04',
  'routine-05': 'routines.title_routine_05',
  'routine-06': 'routines.title_routine_06',
  'routine-07': 'routines.title_routine_07',
  'routine-08': 'routines.title_routine_08',
};

// Title match lookup for instances or cloned tasks that may have custom/generated IDs
export const ROUTINE_DEFAULT_TITLES_TO_KEY: Record<string, string> = {
  'morning herbal tea & gentle hydration': 'routines.title_routine_01',
  'morning clinician-prescribed medication': 'routines.title_routine_02',
  'buttoning shirt & morning dressing': 'routines.title_routine_03',
  'antioxidant breakfast (berries & oatmeal)': 'routines.title_routine_04',
  '15-min speech loudness drill (ahhh)': 'routines.title_routine_05',
  'nutritious lunch & fiber salad': 'routines.title_routine_06',
  'assisted garden walk & motor steps': 'routines.title_routine_07',
  'mind clinic cognitive game practice': 'routines.title_routine_08',
};

const SEEDED_RECALL_PREFIX_BY_ID: Record<string, { prefix: string; seededQuestion: string }> = {
  'routine-01': {
    prefix: 'routines.r01',
    seededQuestion: 'You woke up at 08:00 AM. What warm drink gently hydrates your body before your morning activities?',
  },
  'routine-02': {
    prefix: 'routines.r02',
    seededQuestion: 'It is 08:30 AM before breakfast. What authorized medicine needs to be taken now with a sip of water?',
  },
  'routine-03': {
    prefix: 'routines.r03',
    seededQuestion: 'It is 09:00 AM. What fine motor activity prepares you for a fresh day?',
  },
  'routine-04': {
    prefix: 'routines.r04',
    seededQuestion: 'It is 09:30 AM. What breakfast supports dopamine cells without blocking medication?',
  },
  'routine-05': {
    prefix: 'routines.r05',
    seededQuestion: "It's 11:00 AM mid-morning. What vocal exercise helps maintain clear speech volume?",
  },
  'routine-06': {
    prefix: 'routines.r06',
    seededQuestion: 'It is 01:00 PM. What nutritious lunch keeps your energy and digestive motility smooth?',
  },
  'routine-07': {
    prefix: 'routines.r07',
    seededQuestion: 'It is 04:30 PM. What outdoor exercise promotes motor rhythm and balance?',
  },
  'routine-08': {
    prefix: 'routines.r08',
    seededQuestion: 'It is 06:00 PM. What cognitive exercise stimulates synaptic recall?',
  },
};

function safeTranslate(
  t: (key: string, params?: Record<string, any>) => string,
  key: string,
  fallback: string,
  params?: Record<string, any>
): string {
  const translated = t(key, params);
  return translated && translated !== key ? translated : fallback;
}

/**
 * Returns the localized routine title for system templates, or preserves user-created titles verbatim.
 */
export function getTranslatedRoutineTitle(
  routine: { id?: string; title?: string } | string | undefined | null,
  t: (key: string, params?: Record<string, any>) => string,
  _language?: string
): string {
  if (!routine) return '';
  const title = typeof routine === 'string' ? routine : routine.title || '';
  const id = typeof routine === 'object' && routine ? routine.id : undefined;

  // 1. Direct ID lookup in pre-seeded routine templates
  if (id && ROUTINE_TITLE_MAP[id]) {
    const translated = t(ROUTINE_TITLE_MAP[id]);
    if (translated && translated !== ROUTINE_TITLE_MAP[id]) {
      return translated;
    }
  }

  // 2. Direct title match in default routine templates (case-insensitive)
  const lowerTitle = title.trim().toLowerCase();
  if (ROUTINE_DEFAULT_TITLES_TO_KEY[lowerTitle]) {
    const key = ROUTINE_DEFAULT_TITLES_TO_KEY[lowerTitle];
    const translated = t(key);
    if (translated && translated !== key) {
      return translated;
    }
  }

  // 3. Category C user preservation: if user created a custom routine, preserve exactly as entered
  return title;
}

/**
 * Translates standard routine categories (wellness, medication, etc.) into the active language.
 */
export function getTranslatedRoutineCategory(
  category: string | undefined | null,
  t: (key: string, params?: Record<string, any>) => string
): string {
  if (!category) return '';
  const norm = category.trim().toLowerCase();
  const key = `routines.cat_${norm}`;
  return safeTranslate(t, key, category);
}

/**
 * Translates seeded recall questions, options, and 3-tier hints when matching system defaults,
 * while preserving user-entered or test-mocked custom text verbatim.
 */
export function getTranslatedRoutineRecallContent(
  routine: RoutineItem,
  t: (key: string, params?: Record<string, any>) => string,
  language?: string
): {
  question: string;
  options: string[];
  hint1: string;
  hint2: string;
  hint3: string;
} {
  const localizedTitle = getTranslatedRoutineTitle(routine, t, language);
  const localizedCat = getTranslatedRoutineCategory(routine.category, t);
  const seeded = routine.id ? SEEDED_RECALL_PREFIX_BY_ID[routine.id] : undefined;
  const isUntouchedSeededRecall =
    Boolean(seeded) && routine.recallQuestion?.trim() === seeded!.seededQuestion.trim();

  if (isUntouchedSeededRecall && seeded) {
    const p = seeded.prefix;
    return {
      question: safeTranslate(t, `${p}_question`, routine.recallQuestion || ''),
      options: (routine.recallOptions || []).map((opt, idx) =>
        safeTranslate(t, `${p}_opt_${idx}`, opt)
      ),
      hint1: safeTranslate(t, `${p}_hint_1`, routine.recallCues?.hint1 || ''),
      hint2: safeTranslate(t, `${p}_hint_2`, routine.recallCues?.hint2 || ''),
      hint3: safeTranslate(t, `${p}_hint_3`, routine.recallCues?.hint3 || localizedTitle),
    };
  }

  const question =
    routine.recallQuestion ||
    safeTranslate(
      t,
      'recall.fallback_question',
      `It is ${routine.scheduledTime}. What ${routine.category} activity prepares you for a fresh day?`,
      { time: routine.scheduledTime, category: localizedCat.toLowerCase() }
    );

  const options = routine.recallOptions || [
    localizedTitle,
    safeTranslate(t, 'recall.fallback_opt_1', 'Running outdoors without shoes'),
    safeTranslate(t, 'recall.fallback_opt_2', 'Leaving clothes untouched'),
  ];

  const hint1 =
    routine.recallCues?.hint1 ||
    safeTranslate(
      t,
      'recall.fallback_hint_1',
      `Taking 15-20 calm minutes for ${routine.title.toLowerCase()} keeps coordination sharp.`,
      { title: localizedTitle }
    );

  const hint2 =
    routine.recallCues?.hint2 ||
    safeTranslate(
      t,
      'recall.fallback_hint_2',
      'Look around your home or bedside table for the related items.'
    );

  const hint3 = routine.recallCues?.hint3 || localizedTitle;

  return { question, options, hint1, hint2, hint3 };
}
