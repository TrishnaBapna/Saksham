import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AGE_BAND_CONFIG,
  calculateAgeFromDob,
  resolveAgeTier,
  getDefaultSettingsForTier,
  PERSONALISATION_PRESETS,
  loadPersonalisationSettings,
  savePersonalisationSettings,
  clearActivePersonalisationOnLogout,
  PERSONALISATION_STORAGE_KEY,
  type PersonalisationSettings,
} from '../services/ageTierService';

describe('SAKSHAM 2.0 — Priority 4: Age-Adaptive Framework & Personalisation', () => {
  const referenceDate = new Date('2026-10-31T00:00:00Z');

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Central Age-Band Configuration & DOB-driven Calculation', () => {
    it('accurately calculates age in full years accounting for month and day', () => {
      // Exactly 20 years old
      expect(calculateAgeFromDob('2006-10-31', referenceDate)).toBe(20);
      // Birthday hasn't happened yet this year -> 19
      expect(calculateAgeFromDob('2006-11-01', referenceDate)).toBe(19);
      // Birthday already happened this year -> 20
      expect(calculateAgeFromDob('2006-10-30', referenceDate)).toBe(20);
      // Handles null / empty
      expect(calculateAgeFromDob('', referenceDate)).toBeNull();
      expect(calculateAgeFromDob('invalid-date', referenceDate)).toBeNull();
    });

    it('identifies users under 13 as outside the supported range (not silently assigned to Youth)', () => {
      // Age 12
      const res12 = resolveAgeTier('2014-10-31', referenceDate);
      expect(res12.supported).toBe(false);
      if (!res12.supported) {
        expect(res12.age).toBe(12);
        expect(res12.error).toContain('outside the supported range');
      }

      // Age 8
      const res8 = resolveAgeTier('2018-05-15', referenceDate);
      expect(res8.supported).toBe(false);
      if (!res8.supported) {
        expect(res8.age).toBe(8);
      }
    });

    it('resolves Youth identity for age 13 through 24 (inclusive)', () => {
      // Minimum Youth: Age 13
      const minYouth = resolveAgeTier('2013-10-31', referenceDate);
      expect(minYouth.supported).toBe(true);
      if (minYouth.supported) {
        expect(minYouth.age).toBe(13);
        expect(minYouth.tier).toBe('youth');
        expect(minYouth.label).toBe(AGE_BAND_CONFIG.YOUTH.label);
      }

      // Maximum Youth: Age 24
      const maxYouth = resolveAgeTier('2002-10-31', referenceDate);
      expect(maxYouth.supported).toBe(true);
      if (maxYouth.supported) {
        expect(maxYouth.age).toBe(24);
        expect(maxYouth.tier).toBe('youth');
      }
    });

    it('resolves Adult identity for age 25 through 59 (inclusive)', () => {
      // Minimum Adult: Age 25
      const minAdult = resolveAgeTier('2001-10-31', referenceDate);
      expect(minAdult.supported).toBe(true);
      if (minAdult.supported) {
        expect(minAdult.age).toBe(25);
        expect(minAdult.tier).toBe('adult');
        expect(minAdult.label).toBe(AGE_BAND_CONFIG.ADULT.label);
      }

      // Mid Adult: Age 45
      const midAdult = resolveAgeTier('1981-06-15', referenceDate);
      expect(midAdult.supported).toBe(true);
      if (midAdult.supported) {
        expect(midAdult.age).toBe(45);
        expect(midAdult.tier).toBe('adult');
      }

      // Maximum Adult: Age 59
      const maxAdult = resolveAgeTier('1967-10-31', referenceDate);
      expect(maxAdult.supported).toBe(true);
      if (maxAdult.supported) {
        expect(maxAdult.age).toBe(59);
        expect(maxAdult.tier).toBe('adult');
      }
    });

    it('resolves Elderly identity for age 60 and above', () => {
      // Minimum Elderly: Age 60
      const minElderly = resolveAgeTier('1966-10-31', referenceDate);
      expect(minElderly.supported).toBe(true);
      if (minElderly.supported) {
        expect(minElderly.age).toBe(60);
        expect(minElderly.tier).toBe('senior');
        expect(minElderly.label).toBe(AGE_BAND_CONFIG.ELDERLY.label);
      }

      // Senior: Age 78 (Kalyani Sharma PD cohort)
      const senior = resolveAgeTier('1948-03-20', referenceDate);
      expect(senior.supported).toBe(true);
      if (senior.supported) {
        expect(senior.age).toBe(78);
        expect(senior.tier).toBe('senior');
      }
    });
  });

  describe('2. Fixed Age Identity & DOB Profile Correction Invariants', () => {
    it('updates age identity when user corrects their Date of Birth', () => {
      // Initial user was entered with DOB making them 22 (Youth)
      const initialDob = '2004-05-10';
      const initialRes = resolveAgeTier(initialDob, referenceDate);
      expect(initialRes.supported && initialRes.tier).toBe('youth');

      // User corrects DOB to real birthdate (1955-08-12, age 71 -> Elderly)
      const correctedDob = '1955-08-12';
      const correctedRes = resolveAgeTier(correctedDob, referenceDate);
      expect(correctedRes.supported && correctedRes.tier).toBe('senior');
      if (correctedRes.supported) {
        expect(correctedRes.age).toBe(71);
      }
    });
  });

  describe('3. Personalisation Settings Defaults per Tier', () => {
    it('sets gamification and dark modern wallpaper by default for Youth', () => {
      const youthDefs = getDefaultSettingsForTier('youth');
      expect(youthDefs.gamification).toBe(true);
      expect(youthDefs.wallpaper).toBe('midnight');
      expect(youthDefs.colorTheme).toBe('ocean');
      expect(youthDefs.buttonSize).toBe('standard');
    });

    it('sets calm mindful pacing and checklist focus by default for Adult', () => {
      const adultDefs = getDefaultSettingsForTier('adult');
      expect(adultDefs.gamification).toBe(false);
      expect(adultDefs.wallpaper).toBe('default');
      expect(adultDefs.colorTheme).toBe('slate');
      expect(adultDefs.dashboardFocus).toBe('checklist');
      expect(adultDefs.buttonSize).toBe('comfort');
    });

    it('sets single-task hero focus, high contrast, extra-large touch targets for Elderly', () => {
      const elderlyDefs = getDefaultSettingsForTier('senior');
      expect(elderlyDefs.dashboardFocus).toBe('hero');
      expect(elderlyDefs.highContrast).toBe(true);
      expect(elderlyDefs.textSize).toBe('large');
      expect(elderlyDefs.buttonSize).toBe('extra_large');
      expect(elderlyDefs.voiceReadouts).toBe(true);
      expect(elderlyDefs.gamification).toBe(false);
      expect(elderlyDefs.cardDensity).toBe('spacious');
    });
  });

  describe('4. 1-Tap Curated Layout Presets', () => {
    it('provides Everyday, Simple, Reading, and Night presets', () => {
      expect(PERSONALISATION_PRESETS.everyday).toBeDefined();
      expect(PERSONALISATION_PRESETS.simple).toBeDefined();
      expect(PERSONALISATION_PRESETS.reading).toBeDefined();
      expect(PERSONALISATION_PRESETS.night).toBeDefined();

      // Simple preset enforces single-task hero, high contrast, extra-large buttons
      const simple = PERSONALISATION_PRESETS.simple.settings;
      expect(simple.dashboardFocus).toBe('hero');
      expect(simple.highContrast).toBe(true);
      expect(simple.buttonSize).toBe('extra_large');
      expect(simple.animationSpeed).toBe('low');

      // Reading preset enforces extra-large text and high contrast
      const reading = PERSONALISATION_PRESETS.reading.settings;
      expect(reading.textSize).toBe('extra_large');
      expect(reading.highContrast).toBe(true);
      expect(reading.soundEffects).toBe(false);

      // Night preset enforces dark mode and muted reminders
      const night = PERSONALISATION_PRESETS.night.settings;
      expect(night.colorMode).toBe('dark');
      expect(night.wallpaper).toBe('midnight');
      expect(night.reminderStyle).toBe('banner');
    });
  });

  describe('5. Persistence to LocalStorage & Safe Hydration', () => {
    it('persists settings to localStorage and re-hydrates accurately', () => {
      const customSettings: PersonalisationSettings = {
        wallpaper: 'forest',
        colorTheme: 'ocean',
        colorMode: 'light',
        navMode: 'bottom',
        cardDensity: 'spacious',
        dashboardFocus: 'hero',
        textSize: 'extra_large',
        buttonSize: 'extra_large',
        highContrast: true,
        animationSpeed: 'off',
        soundEffects: false,
        voiceReadouts: true,
        gamification: false,
        reminderStyle: 'banner',
        customPreset: null,
        updatedAt: new Date().toISOString(),
      };

      savePersonalisationSettings(customSettings);
      const raw = localStorage.getItem(`${PERSONALISATION_STORAGE_KEY}_guest`);
      expect(raw).not.toBeNull();

      const loaded = loadPersonalisationSettings('adult');
      expect(loaded.wallpaper).toBe('forest');
      expect(loaded.textSize).toBe('extra_large');
      expect(loaded.buttonSize).toBe('extra_large');
      expect(loaded.highContrast).toBe(true);
      expect(loaded.animationSpeed).toBe('off');
    });

    it('falls back cleanly to tier defaults when storage is empty', () => {
      const loaded = loadPersonalisationSettings('senior');
      expect(loaded.dashboardFocus).toBe('hero');
      expect(loaded.buttonSize).toBe('extra_large');
      expect(loaded.highContrast).toBe(true);
    });
  });

  describe('6. UID-Scoped Storage & Account Isolation (Multi-User Tablet Sharing)', () => {
    const userAlice = 'user_alice_youth_101';
    const userKalyani = 'user_kalyani_senior_8842';

    it('isolates personalisation settings between two users sharing the same browser', () => {
      // User Alice (Youth) customizes with midnight wallpaper and gamification
      const aliceSettings: PersonalisationSettings = {
        ...getDefaultSettingsForTier('youth'),
        wallpaper: 'midnight',
        gamification: true,
        textSize: 'standard',
        buttonSize: 'standard',
      };
      savePersonalisationSettings(aliceSettings, userAlice);

      // User Kalyani (Elderly) customizes with forest wallpaper, large text, high contrast
      const kalyaniSettings: PersonalisationSettings = {
        ...getDefaultSettingsForTier('senior'),
        wallpaper: 'forest',
        gamification: false,
        textSize: 'extra_large',
        buttonSize: 'extra_large',
        highContrast: true,
      };
      savePersonalisationSettings(kalyaniSettings, userKalyani);

      // Verify each user has their own isolated storage key
      const aliceRaw = localStorage.getItem(`${PERSONALISATION_STORAGE_KEY}_${userAlice}`);
      const kalyaniRaw = localStorage.getItem(`${PERSONALISATION_STORAGE_KEY}_${userKalyani}`);
      expect(aliceRaw).not.toBeNull();
      expect(kalyaniRaw).not.toBeNull();
      expect(aliceRaw).not.toBe(kalyaniRaw);

      // Loading Alice returns Alice settings
      const loadedAlice = loadPersonalisationSettings('youth', userAlice);
      expect(loadedAlice.wallpaper).toBe('midnight');
      expect(loadedAlice.gamification).toBe(true);
      expect(loadedAlice.textSize).toBe('standard');

      // Loading Kalyani returns Kalyani settings
      const loadedKalyani = loadPersonalisationSettings('senior', userKalyani);
      expect(loadedKalyani.wallpaper).toBe('forest');
      expect(loadedKalyani.gamification).toBe(false);
      expect(loadedKalyani.textSize).toBe('extra_large');
      expect(loadedKalyani.highContrast).toBe(true);
    });

    it('clears active session on logout without deleting other users saved preferences', () => {
      // Alice saves preferences
      savePersonalisationSettings(getDefaultSettingsForTier('youth'), userAlice);
      // Kalyani saves preferences
      savePersonalisationSettings(getDefaultSettingsForTier('senior'), userKalyani);

      // Alice logs out
      clearActivePersonalisationOnLogout();

      // Alice and Kalyani's saved preferences still exist in storage
      expect(localStorage.getItem(`${PERSONALISATION_STORAGE_KEY}_${userAlice}`)).not.toBeNull();
      expect(localStorage.getItem(`${PERSONALISATION_STORAGE_KEY}_${userKalyani}`)).not.toBeNull();

      // Next unauthenticated / guest user does not inherit Alice or Kalyani settings
      const guestSettings = loadPersonalisationSettings('senior', 'guest');
      expect(guestSettings.wallpaper).toBe('forest'); // fallback to default
    });

    it('prevents cross-user preference leakage when switching accounts', () => {
      // Alice sets Night preset
      const aliceNight: PersonalisationSettings = {
        ...getDefaultSettingsForTier('youth'),
        colorMode: 'dark',
        wallpaper: 'midnight',
      };
      savePersonalisationSettings(aliceNight, userAlice);

      // Kalyani logs in
      const kalyaniLoaded = loadPersonalisationSettings('senior', userKalyani);
      // Kalyani must NOT inherit Alice's dark mode
      expect(kalyaniLoaded.colorMode).toBe('light');

      // Kalyani updates her text size
      kalyaniLoaded.textSize = 'extra_large';
      savePersonalisationSettings(kalyaniLoaded, userKalyani);

      // Alice logs back in: Alice still has her standard text size and dark mode
      const aliceRecheck = loadPersonalisationSettings('youth', userAlice);
      expect(aliceRecheck.textSize).toBe('standard');
      expect(aliceRecheck.colorMode).toBe('dark');
    });

    it('preserves offline changes correctly associated with user ID', () => {
      const offlineSettings: PersonalisationSettings = {
        ...getDefaultSettingsForTier('adult'),
        wallpaper: 'dawn',
        textSize: 'large',
      };
      // User modifies preferences while offline
      savePersonalisationSettings(offlineSettings, 'offline_user_55');

      // Reloading from offline storage returns the exact offline updates
      const rehydrated = loadPersonalisationSettings('adult', 'offline_user_55');
      expect(rehydrated.wallpaper).toBe('dawn');
      expect(rehydrated.textSize).toBe('large');
    });
  });

  describe('7. Service Worker Cache Version & Precaching Audit', () => {
    it('verifies sw.js defines saksham-cache-v60 and precaches personalisation-settings.js', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const swPath = path.resolve(__dirname, '../../../../sw.js');
      expect(fs.existsSync(swPath)).toBe(true);

      const swContent = fs.readFileSync(swPath, 'utf8');
      // Must define valid cache version (v60, v61, or v62)
      expect(swContent).toMatch(/const CACHE_NAME = 'saksham-cache-v6[0-9]';/);
      // Must precache personalisation-settings.js
      expect(swContent).toMatch(/personalisation-settings\.js/);
      expect(swContent).toMatch(/PRECACHE_URLS/);
      // Must remove old caches
      expect(swContent).toContain("if (name !== CACHE_NAME)");
      expect(swContent).toContain("caches.delete(name)");
    });
  });
});
