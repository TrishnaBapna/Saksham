/**
 * SAKSHAM 2.0 — AGE-ADAPTIVE FRAMEWORK & PERSONALISATION SERVICE
 *
 * Implements central age-band configuration, DOB-driven identity resolution,
 * and user-controlled accessibility / interface personalisation.
 */

import type { DemographicTier } from '../../../../shared/types';

export const AGE_BAND_CONFIG = {
  MIN_SUPPORTED_AGE: 13,
  YOUTH: {
    key: 'youth' as const,
    label: 'Youth (13–24)',
    shortLabel: 'Youth',
    min: 13,
    max: 24,
    description: 'Vibrant, high-engagement, gamified, dopamine rewards, streak & XP tracking.',
    themeClass: 'tier-youth',
  },
  ADULT: {
    key: 'adult' as const,
    label: 'Adult (25–59)',
    shortLabel: 'Adult',
    min: 25,
    max: 59,
    description: 'Balanced, elegant, minimal distraction, calm mindful pacing, low cognitive load.',
    themeClass: 'tier-adult',
  },
  ELDERLY: {
    key: 'senior' as const,
    label: 'Elderly (60+)',
    shortLabel: 'Elderly',
    min: 60,
    max: 150,
    description: 'Large readable text, 56px+ touch targets, single-task hero focus, gentle voice guidance.',
    themeClass: 'tier-senior',
  },
} as const;

export interface AgeTierResolutionSuccess {
  supported: true;
  age: number;
  tier: DemographicTier;
  label: string;
}

export interface AgeTierResolutionError {
  supported: false;
  age: number | null;
  error: string;
}

export type AgeTierResolution = AgeTierResolutionSuccess | AgeTierResolutionError;

/**
 * Accurately calculate age in full years from date of birth against a reference date.
 */
export function calculateAgeFromDob(
  dob: string | Date | undefined | null,
  referenceDate: Date = new Date()
): number | null {
  if (!dob) return null;
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  if (!birthDate || isNaN(birthDate.getTime())) return null;

  const ref = new Date(referenceDate);
  let age = ref.getFullYear() - birthDate.getFullYear();
  const monthDiff = ref.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Resolve user's demographic age tier strictly from their Date of Birth.
 * Users under 13 are outside the supported range and cannot be silently assigned to Youth.
 */
export function resolveAgeTier(
  dob: string | Date | undefined | null,
  referenceDate: Date = new Date()
): AgeTierResolution {
  const age = calculateAgeFromDob(dob, referenceDate);
  if (age === null || age < 0) {
    return {
      supported: false,
      age: null,
      error: 'Please provide a valid date of birth.',
    };
  }

  if (age < AGE_BAND_CONFIG.MIN_SUPPORTED_AGE) {
    return {
      supported: false,
      age,
      error: `Saksham is designed for individuals aged 13 and older (entered age: ${age}). Users under 13 are outside the supported range.`,
    };
  }

  if (age <= AGE_BAND_CONFIG.YOUTH.max) {
    return {
      supported: true,
      age,
      tier: AGE_BAND_CONFIG.YOUTH.key,
      label: AGE_BAND_CONFIG.YOUTH.label,
    };
  }

  if (age <= AGE_BAND_CONFIG.ADULT.max) {
    return {
      supported: true,
      age,
      tier: AGE_BAND_CONFIG.ADULT.key,
      label: AGE_BAND_CONFIG.ADULT.label,
    };
  }

  return {
    supported: true,
    age,
    tier: AGE_BAND_CONFIG.ELDERLY.key,
    label: AGE_BAND_CONFIG.ELDERLY.label,
  };
}

// ─── Personalisation Settings Data Model ──────────────────────────────────────

export type WallpaperOption = 'default' | 'forest' | 'midnight' | 'dawn';
export type ColorThemeOption = 'emerald' | 'ocean' | 'amber' | 'slate';
export type ColorModeOption = 'light' | 'dark' | 'system';
export type NavModeOption = 'standard' | 'bottom' | 'simple';
export type CardDensityOption = 'spacious' | 'standard' | 'compact';
export type DashboardFocusOption = 'hero' | 'grid' | 'checklist';
export type TextSizeOption = 'standard' | 'large' | 'extra_large';
export type ButtonSizeOption = 'standard' | 'comfort' | 'extra_large';
export type AnimationSpeedOption = 'off' | 'low' | 'normal';
export type ReminderStyleOption = 'chime' | 'flash' | 'banner';

export interface PersonalisationSettings {
  wallpaper: WallpaperOption;
  colorTheme: ColorThemeOption;
  colorMode: ColorModeOption;
  navMode: NavModeOption;
  cardDensity: CardDensityOption;
  dashboardFocus: DashboardFocusOption;
  textSize: TextSizeOption;
  buttonSize: ButtonSizeOption;
  highContrast: boolean;
  animationSpeed: AnimationSpeedOption;
  soundEffects: boolean;
  voiceReadouts: boolean;
  gamification: boolean;
  reminderStyle: ReminderStyleOption;
  remindersEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  reminderSound?: 'chime' | 'bell' | 'gentle' | 'silent';
  voiceGuidance?: boolean;
  snoozeDuration?: number;
  companionVisibility?: 'show' | 'minimized' | 'hidden';
  reducedMotion?: 'system' | 'reduced' | 'normal';
  customPreset?: Partial<PersonalisationSettings> | null;
  updatedAt: string;
}

export type PresetKey = 'everyday' | 'simple' | 'reading' | 'night';

export const PERSONALISATION_PRESETS: Record<PresetKey, {
  name: string;
  description: string;
  settings: Partial<PersonalisationSettings>;
}> = {
  everyday: {
    name: 'Everyday',
    description: 'Balanced comfort layout with standard typography and smooth pacing.',
    settings: {
      wallpaper: 'default',
      colorTheme: 'emerald',
      colorMode: 'light',
      navMode: 'standard',
      cardDensity: 'standard',
      dashboardFocus: 'grid',
      textSize: 'standard',
      buttonSize: 'comfort',
      highContrast: false,
      animationSpeed: 'normal',
      soundEffects: true,
      voiceReadouts: false,
    },
  },
  simple: {
    name: 'Simple',
    description: 'Clean single-task hero focus, high contrast, extra-large touch buttons.',
    settings: {
      wallpaper: 'default',
      colorTheme: 'emerald',
      colorMode: 'light',
      navMode: 'simple',
      cardDensity: 'spacious',
      dashboardFocus: 'hero',
      textSize: 'large',
      buttonSize: 'extra_large',
      highContrast: true,
      animationSpeed: 'low',
      soundEffects: true,
      voiceReadouts: true,
      gamification: false,
    },
  },
  reading: {
    name: 'Reading',
    description: 'Maximum legibility, extra-large text, comfortable line-height, zero noise.',
    settings: {
      wallpaper: 'forest',
      colorTheme: 'slate',
      colorMode: 'light',
      navMode: 'standard',
      cardDensity: 'spacious',
      dashboardFocus: 'checklist',
      textSize: 'extra_large',
      buttonSize: 'comfort',
      highContrast: true,
      animationSpeed: 'low',
      soundEffects: false,
      voiceReadouts: true,
      gamification: false,
    },
  },
  night: {
    name: 'Night',
    description: 'Midnight dark calming background, muted chimes, zero bright flashes.',
    settings: {
      wallpaper: 'midnight',
      colorTheme: 'slate',
      colorMode: 'dark',
      navMode: 'standard',
      cardDensity: 'standard',
      dashboardFocus: 'hero',
      textSize: 'large',
      buttonSize: 'comfort',
      highContrast: false,
      animationSpeed: 'low',
      soundEffects: false,
      voiceReadouts: false,
      reminderStyle: 'banner',
    },
  },
};

/**
 * Returns tier-appropriate default personalisation settings.
 */
export function getDefaultSettingsForTier(tier: DemographicTier): PersonalisationSettings {
  const base: PersonalisationSettings = {
    wallpaper: 'default',
    colorTheme: 'emerald',
    colorMode: 'light',
    navMode: 'standard',
    cardDensity: 'standard',
    dashboardFocus: 'grid',
    textSize: 'standard',
    buttonSize: 'standard',
    highContrast: false,
    animationSpeed: 'normal',
    soundEffects: true,
    voiceReadouts: false,
    gamification: false,
    reminderStyle: 'chime',
    customPreset: null,
    updatedAt: new Date().toISOString(),
  };

  if (tier === 'youth') {
    return {
      ...base,
      wallpaper: 'midnight',
      colorTheme: 'ocean',
      gamification: true,
      dashboardFocus: 'grid',
      buttonSize: 'standard',
      textSize: 'standard',
    };
  }

  if (tier === 'adult') {
    return {
      ...base,
      wallpaper: 'default',
      colorTheme: 'slate',
      gamification: false,
      dashboardFocus: 'checklist',
      buttonSize: 'comfort',
      textSize: 'standard',
    };
  }

  // Elderly (Senior 60+)
  return {
    ...base,
    wallpaper: 'forest',
    colorTheme: 'emerald',
    cardDensity: 'spacious',
    dashboardFocus: 'hero',
    textSize: 'large',
    buttonSize: 'extra_large',
    highContrast: true,
    voiceReadouts: true,
    gamification: false,
  };
}

export const PERSONALISATION_STORAGE_KEY = 'saksham_personalisation_settings';

export function getPersonalisationStorageKey(userId?: string): string {
  return `${PERSONALISATION_STORAGE_KEY}_${userId || 'guest'}`;
}

export function loadPersonalisationSettings(
  tier: DemographicTier = 'senior',
  userId?: string
): PersonalisationSettings {
  const userKey = getPersonalisationStorageKey(userId);
  try {
    const raw = localStorage.getItem(userKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...getDefaultSettingsForTier(tier), ...parsed };
    }
    // Check legacy un-scoped key if user-specific key not found and user is authenticated
    if (userId && userId !== 'guest') {
      const legacyRaw = localStorage.getItem(PERSONALISATION_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        const migrated = { ...getDefaultSettingsForTier(tier), ...legacyParsed };
        localStorage.setItem(userKey, JSON.stringify(migrated));
        localStorage.removeItem(PERSONALISATION_STORAGE_KEY);
        return migrated;
      }
    }
  } catch {
    // fallback
  }
  return getDefaultSettingsForTier(tier);
}

export function savePersonalisationSettings(
  settings: PersonalisationSettings,
  userId?: string
): void {
  const userKey = getPersonalisationStorageKey(userId);
  try {
    localStorage.setItem(userKey, JSON.stringify(settings));
  } catch (err) {
    console.warn('[Personalisation] Failed to save settings to localStorage:', err);
  }
}

export function clearActivePersonalisationOnLogout(): void {
  try {
    localStorage.removeItem(PERSONALISATION_STORAGE_KEY);
    // Note: User-scoped keys (saksham_personalisation_settings_${uid}) are preserved so users do not lose their settings
  } catch (err) {
    console.warn('[Personalisation] Error clearing session on logout:', err);
  }
}
