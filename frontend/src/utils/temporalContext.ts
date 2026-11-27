/**
 * Centralized Runtime Temporal Context Utility
 *
 * Single source of truth for live device/browser wall-clock date, time,
 * timezone, time-of-day classification, localized greetings, and prompt
 * injection across all 7 Saksham voice/UI languages.
 *
 * Never caches wall-clock values across turns: every call reads the current
 * runtime Date (unless an explicit date override is supplied for testing).
 */

export type TimeOfDayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export type SupportedTemporalLanguage =
  | 'en'
  | 'hi'
  | 'mr'
  | 'bn'
  | 'ta'
  | 'te'
  | 'kn';

export interface LiveTemporalContext {
  /** Human-readable localized date, e.g. "Friday, November 27, 2026" */
  currentDate: string;
  /** ISO calendar date YYYY-MM-DD in the resolved runtime timezone */
  currentDateISO: string;
  /** Human-readable localized clock time, e.g. "1:30 PM" */
  currentTime: string;
  /** 24-hour clock string HH:mm in the resolved runtime timezone */
  currentTime24: string;
  /** Localized weekday name, e.g. "Friday" */
  currentWeekday: string;
  /** Localized month name, e.g. "November" */
  currentMonth: string;
  /** Full 4-digit calendar year */
  currentYear: number;
  /** Hour in 24-hour clock (0-23) */
  hour24: number;
  /** Minute (0-59) */
  minute: number;
  /** Resolved runtime IANA timezone identifier */
  timezone: string;
  /** Formatted UTC offset such as "UTC+05:30" */
  timezoneOffset: string;
  /** Non-overlapping period of the day */
  timeOfDay: TimeOfDayPeriod;
  /** Localized period label in the active language */
  timeOfDayLabel: string;
  /** Natural localized greeting matched to current timeOfDay */
  appropriateGreeting: string;
  /** Normalized 2-letter language code */
  language: SupportedTemporalLanguage;
  /** BCP-47 locale tag used for formatting */
  locale: string;
  /** Exact ISO-8601 UTC timestamp of when this snapshot was read */
  isoTimestamp: string;
}

const LANGUAGE_TO_LOCALE: Record<SupportedTemporalLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
};

const TIME_OF_DAY_GREETINGS: Record<
  SupportedTemporalLanguage,
  Record<TimeOfDayPeriod, string>
> = {
  en: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    night: 'Hello, wishing you a peaceful night',
  },
  hi: {
    morning: 'सुप्रभात',
    afternoon: 'शुभ दोपहर',
    evening: 'शुभ संध्या',
    night: 'शुभ रात्रि, आशा है आपकी रात शांतिपूर्ण हो',
  },
  mr: {
    morning: 'सुप्रभात',
    afternoon: 'शुभ दुपार',
    evening: 'शुभ संध्याकाळ',
    night: 'शुभ रात्री, तुमची रात्र शांत जावो',
  },
  bn: {
    morning: 'সুপ্রভাত',
    afternoon: 'শুভ অপরাহ্ণ',
    evening: 'শুভ সন্ধ্যা',
    night: 'শুভ রাত্রি, আপনার রাত শান্তিময় হোক',
  },
  ta: {
    morning: 'காலை வணக்கம்',
    afternoon: 'மதிய வணக்கம்',
    evening: 'மாலை வணக்கம்',
    night: 'இரவு வணக்கம், அமைதியான இரவாக இருக்கட்டும்',
  },
  te: {
    morning: 'శుభోదయం',
    afternoon: 'శుభ మధ్యాహ్నం',
    evening: 'శుభ సాయంత్రం',
    night: 'శుభ రాత్రి, మీ రాత్రి ప్రశాంతంగా ఉండాలని కోరుకుంటున్నాను',
  },
  kn: {
    morning: 'ಶುಭೋದಯ',
    afternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ',
    evening: 'ಶುಭ ಸಂಜೆ',
    night: 'ಶುಭ ರಾತ್ರಿ, ನಿಮ್ಮ ರಾತ್ರಿ ಶಾಂತಿಯುತವಾಗಿರಲಿ',
  },
};

const TIME_OF_DAY_LABELS: Record<
  SupportedTemporalLanguage,
  Record<TimeOfDayPeriod, string>
> = {
  en: {
    morning: 'morning',
    afternoon: 'afternoon',
    evening: 'evening',
    night: 'night',
  },
  hi: {
    morning: 'सुबह',
    afternoon: 'दोपहर',
    evening: 'शाम',
    night: 'रात',
  },
  mr: {
    morning: 'सकाळ',
    afternoon: 'दुपार',
    evening: 'संध्याकाळ',
    night: 'रात्र',
  },
  bn: {
    morning: 'সকাল',
    afternoon: 'দুপুর',
    evening: 'সন্ধ্যা',
    night: 'রাত',
  },
  ta: {
    morning: 'காலை',
    afternoon: 'மதியம்',
    evening: 'மாலை',
    night: 'இரவு',
  },
  te: {
    morning: 'ఉదయం',
    afternoon: 'మధ్యాహ్నం',
    evening: 'సాయంత్రం',
    night: 'రాత్రి',
  },
  kn: {
    morning: 'ಬೆಳಿಗ್ಗೆ',
    afternoon: 'ಮಧ್ಯಾಹ್ನ',
    evening: 'ಸಂಜೆ',
    night: 'ರಾತ್ರಿ',
  },
};

/**
 * Normalize an incoming language string or BCP-47 locale tag to one of the
 * 7 supported Saksham languages (fallback 'en').
 */
export function normalizeTemporalLanguage(
  lang?: string
): SupportedTemporalLanguage {
  const base = (lang || 'en').trim().toLowerCase().split(/[-_]/)[0];
  if (
    base === 'en' ||
    base === 'hi' ||
    base === 'mr' ||
    base === 'bn' ||
    base === 'ta' ||
    base === 'te' ||
    base === 'kn'
  ) {
    return base;
  }
  return 'en';
}

/**
 * Deterministic, non-overlapping time-of-day windows:
 * - 05:00 – 11:59 => 'morning'
 * - 12:00 – 16:59 => 'afternoon'
 * - 17:00 – 20:59 => 'evening'
 * - 21:00 – 04:59 => 'night'
 */
export function classifyTimeOfDay(hour24: number): TimeOfDayPeriod {
  const normalizedHour = ((Math.floor(hour24) % 24) + 24) % 24;
  if (normalizedHour >= 5 && normalizedHour < 12) return 'morning';
  if (normalizedHour >= 12 && normalizedHour < 17) return 'afternoon';
  if (normalizedHour >= 17 && normalizedHour < 21) return 'evening';
  return 'night';
}

/**
 * Resolve the user's current runtime IANA timezone safely without hardcoding.
 */
export function resolveRuntimeTimezone(timeZoneOverride?: string): string {
  if (timeZoneOverride && timeZoneOverride.trim()) {
    try {
      // Validate timezone string against runtime Intl support
      new Intl.DateTimeFormat('en-US', { timeZone: timeZoneOverride.trim() });
      return timeZoneOverride.trim();
    } catch {
      // Fall through to actual runtime timezone
    }
  }
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolved && typeof resolved === 'string') {
      return resolved;
    }
  } catch {
    // Ignore Intl lookup errors
  }
  return 'UTC';
}

function getTimeZoneOffsetLabel(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (tzPart) {
      if (tzPart === 'GMT') return 'UTC+00:00';
      return tzPart.replace(/^GMT/, 'UTC');
    }
  } catch {
    // Fallback below using local Date offset when timezone matches runtime
  }
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hh}:${mm}`;
}

export function getTimeOfDayGreeting(
  timeOfDay: TimeOfDayPeriod,
  language?: string
): string {
  const norm = normalizeTemporalLanguage(language);
  return TIME_OF_DAY_GREETINGS[norm][timeOfDay];
}

export function getTimeOfDayLabel(
  timeOfDay: TimeOfDayPeriod,
  language?: string
): string {
  const norm = normalizeTemporalLanguage(language);
  return TIME_OF_DAY_LABELS[norm][timeOfDay];
}

/**
 * Read live date/time/timezone directly from runtime Date & Intl APIs.
 * Every invocation evaluates a fresh timestamp unless nowOverride is provided.
 */
export function getLiveTemporalContext(
  language?: string,
  nowOverride?: Date,
  timeZoneOverride?: string
): LiveTemporalContext {
  const now = nowOverride ? new Date(nowOverride.getTime()) : new Date();
  const normLang = normalizeTemporalLanguage(language);
  const locale = LANGUAGE_TO_LOCALE[normLang];
  const timezone = resolveRuntimeTimezone(timeZoneOverride);

  // Extract numeric date/time components deterministically in the target timezone
  const numericParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const lookup = (type: Intl.DateTimeFormatPartTypes, fallback: string) =>
    numericParts.find((p) => p.type === type)?.value ?? fallback;

  const yearStr = lookup('year', String(now.getFullYear()));
  const monthNumStr = lookup(
    'month',
    String(now.getMonth() + 1).padStart(2, '0')
  );
  const dayNumStr = lookup('day', String(now.getDate()).padStart(2, '0'));
  const rawHour = Number(lookup('hour', String(now.getHours()))) % 24;
  const rawMinute = Number(lookup('minute', String(now.getMinutes()))) % 60;
  const hour24 = Number.isNaN(rawHour) ? now.getHours() : rawHour;
  const minute = Number.isNaN(rawMinute) ? now.getMinutes() : rawMinute;

  const currentYear = Number(yearStr) || now.getFullYear();
  const currentDateISO = `${yearStr}-${monthNumStr}-${dayNumStr}`;
  const currentTime24 = `${String(hour24).padStart(2, '0')}:${String(
    minute
  ).padStart(2, '0')}`;

  const currentTime = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);

  const currentDate = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  const currentWeekday = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: 'long',
  }).format(now);

  const currentMonth = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    month: 'long',
  }).format(now);

  const timeOfDay = classifyTimeOfDay(hour24);
  const timeOfDayLabel = getTimeOfDayLabel(timeOfDay, normLang);
  const appropriateGreeting = getTimeOfDayGreeting(timeOfDay, normLang);
  const timezoneOffset = getTimeZoneOffsetLabel(now, timezone);

  return {
    currentDate,
    currentDateISO,
    currentTime,
    currentTime24,
    currentWeekday,
    currentMonth,
    currentYear,
    hour24,
    minute,
    timezone,
    timezoneOffset,
    timeOfDay,
    timeOfDayLabel,
    appropriateGreeting,
    language: normLang,
    locale,
    isoTimestamp: now.toISOString(),
  };
}

/**
 * Format a compact, authoritative temporal block injected on every LLM / Gemini
 * / local-SLM request so responses are strictly anchored to runtime reality.
 */
export function formatTemporalPromptBlock(
  temporal: LiveTemporalContext
): string {
  return [
    'LIVE RUNTIME TEMPORAL CONTEXT (AUTHORITATIVE DEVICE CLOCK — USE THIS FOR ALL TIME/DATE ANSWERS AND GREETINGS):',
    `- Current Local Time: ${temporal.currentTime} (${temporal.currentTime24} 24h)`,
    `- Current Time of Day Period: ${temporal.timeOfDay} (${temporal.timeOfDayLabel})`,
    `- Current Date: ${temporal.currentDate} (ISO: ${temporal.currentDateISO})`,
    `- Current Weekday: ${temporal.currentWeekday}`,
    `- Current Month & Year: ${temporal.currentMonth} ${temporal.currentYear}`,
    `- Device Timezone: ${temporal.timezone} (${temporal.timezoneOffset})`,
    `- Appropriate Greeting Right Now (${temporal.language}): "${temporal.appropriateGreeting}"`,
    'TEMPORAL GROUNDING RULES:',
    '- Always use this exact live date, weekday, time, timezone, and time-of-day period.',
    '- NEVER hardcode or hallucinate a different date/time, and NEVER say "Good morning" during afternoon, evening, or night.',
    '- If the user greets with the wrong time of day (e.g., saying "Good morning" at night), gently orient them with the real time and period without scolding.',
  ].join('\n');
}

/**
 * Detect whether the user greeted Asha with a specific time-of-day phrase and
 * whether it mismatches the actual runtime time-of-day window.
 */
export function detectGreetingTimeMismatch(
  userInput: string,
  temporal: LiveTemporalContext
): { claimedPeriod: TimeOfDayPeriod; mismatch: boolean } | null {
  const lower = userInput.toLowerCase();

  const patterns: Array<{ period: TimeOfDayPeriod; regex: RegExp }> = [
    {
      period: 'morning',
      regex:
        /(good\s*morning|सुप्रभात|शुभ\s*प्रभात|सुबह\s*हो\s*गई|সুপ্রভাত|காலை\s*வணக்கம்|శుభోదయం|ಶುಭೋದಯ)/i,
    },
    {
      period: 'afternoon',
      regex:
        /(good\s*afternoon|शुभ\s*दोपहर|शुभ\s*दुपार|শুভ\s*অপরাহ্ণ|மதிய\s*வணக்கம்|శుభ\s*మధ్యాహ్నం|ಶುಭ\s*ಮಧ್ಯಾಹ್ನ)/i,
    },
    {
      period: 'evening',
      regex:
        /(good\s*evening|शुभ\s*संध्या|शुभ\s*संध्याकाळ|শুভ\s*সন্ধ্যা|மாலை\s*வணக்கம்|శుభ\s*సాయంత్రం|ಶುಭ\s*ಸಂಜೆ)/i,
    },
    {
      period: 'night',
      regex:
        /(good\s*night|शुभ\s*रात्रि|शुभ\s*रात्री|শুভ\s*রাত্রি|இரவு\s*வணக்கம்|శుభ\s*రాత్రి|ಶುಭ\s*ರಾತ್ರಿ)/i,
    },
  ];

  for (const entry of patterns) {
    if (entry.regex.test(lower)) {
      const claimed = entry.period;
      // Evening greeting at night (e.g., "good evening" at 9 PM) or "good night" at evening are mild/adjacent;
      // treat cross-boundary mismatches as true when opposite half or clearly mismatched.
      const mismatch =
        claimed !== temporal.timeOfDay &&
        !(claimed === 'evening' && temporal.timeOfDay === 'night');
      return { claimedPeriod: claimed, mismatch };
    }
  }

  return null;
}

export function formatTimeOfDayClarification(
  claimedPeriod: TimeOfDayPeriod,
  temporal: LiveTemporalContext
): string {
  const g = temporal.appropriateGreeting;
  const t = temporal.currentTime;
  const label = temporal.timeOfDayLabel;

  switch (temporal.language) {
    case 'hi':
      return `${g}! अभी ${label} के ${t} बज रहे हैं। बताइए, मैं आपकी क्या मदद करूँ?`;
    case 'mr':
      return `${g}! आता ${label}चे ${t} वाजले आहेत. सांगा, मी तुम्हाला कशी मदत करू?`;
    case 'bn':
      return `${g}! এখন ${label} ${t} বাজে। বলুন, আমি আপনাকে কীভাবে সাহায্য করতে পারি?`;
    case 'ta':
      return `${g}! இப்போது ${label} மணி ${t} ஆகிறது. நான் உங்களுக்கு எப்படி உதவலாம்?`;
    case 'te':
      return `${g}! ఇప్పుడు ${label} ${t} అవుతోంది. నేను మీకు ఎలా సహాయం చేయగలను?`;
    case 'kn':
      return `${g}! ಈಗ ${label} ${t} ಆಗಿದೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?`;
    default:
      if (claimedPeriod === 'morning' && (temporal.timeOfDay === 'evening' || temporal.timeOfDay === 'night')) {
        return `${g}! It's actually ${label} right now — around ${t} on ${temporal.currentWeekday}. How are you feeling?`;
      }
      return `${g}! Right now it's ${label}, ${t} on ${temporal.currentWeekday}. How can I help you today?`;
  }
}

export function formatLocalizedTimeResponse(
  temporal: LiveTemporalContext
): string {
  const t = temporal.currentTime;
  const period = temporal.timeOfDayLabel;
  switch (temporal.language) {
    case 'hi':
      return `अभी ${period} के ${t} बजे हैं (${temporal.currentWeekday})। सब ठीक है, आराम से रहिए।`;
    case 'mr':
      return `आता ${period}चे ${t} वाजले आहेत (${temporal.currentWeekday}). तुम्ही सुरक्षित आहात, काही घाई नाही.`;
    case 'bn':
      return `এখন ${period} ${t} বাজে (${temporal.currentWeekday})। সব ঠিক আছে, তাড়াহুড়ো নেই।`;
    case 'ta':
      return `இப்போது ${period} ${t} மணி (${temporal.currentWeekday}). எல்லாம் நன்றாக இருக்கிறது, அவசரமில்லை.`;
    case 'te':
      return `ఇప్పుడు ${period} ${t} గంటలు అయింది (${temporal.currentWeekday}). అంతా బాగానే ఉంది, కంగారు పడకండి.`;
    case 'kn':
      return `ಈಗ ${period} ${t} ಗಂಟೆ ಆಗಿದೆ (${temporal.currentWeekday}). ಎಲ್ಲವೂ ಸರಿಯಾಗಿದೆ, ಅವಸರವಿಲ್ಲ.`;
    default:
      // Concise (<= 16 words) and includes 'safe, peaceful space' for calm reassurance
      return `It is ${t} this ${period}. You are in a safe, peaceful space.`;
  }
}

export function formatLocalizedDateResponse(
  temporal: LiveTemporalContext
): string {
  const d = temporal.currentDate;
  switch (temporal.language) {
    case 'hi':
      return `आज ${d} है। अभी ${temporal.timeOfDayLabel} के ${temporal.currentTime} बजे हैं — कोई जल्दबाज़ी नहीं है।`;
    case 'mr':
      return `आज ${d} आहे. आता ${temporal.currentTime} वाजले आहेत — काही घाई नाही.`;
    case 'bn':
      return `আজ ${d}। এখন ${temporal.currentTime} বাজে — কোনো তাড়াহুড়ো নেই।`;
    case 'ta':
      return `இன்று ${d}. இப்போது நேரம் ${temporal.currentTime} — எந்த அவசரமும் இல்லை.`;
    case 'te':
      return `ఈ రోజు ${d}. ఇప్పుడు సమయం ${temporal.currentTime} — ఎలాంటి కంగారు లేదు.`;
    case 'kn':
      return `ಇಂದು ${d}. ಈಗ ಸಮಯ ${temporal.currentTime} — ಯಾವುದೇ ಅವಸರವಿಲ್ಲ.`;
    default:
      return `Today is ${d} (${temporal.currentTime}). Take a relaxed breath, no rush at all.`;
  }
}
