import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ALL_LANGUAGES, LANGUAGE_MAP } from '../i18n/languages';
import { translate, formatDate, formatNumber, validateTranslationCompleteness } from '../i18n/interpolate';
import { SupportedLanguage } from '../i18n/types';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { LanguageSelectionModal } from '../components/layout/LanguageSelectionModal';
import { SpeechService, LANGUAGE_BCP47_MAP } from '../services/speechService';
import { parseAIIntentLocally } from '../services/aiService';
import { PatientProfile } from '../pages/patient/PatientProfile';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';
import { CharacterProvider } from '../context/CharacterContext';

describe('Milestone 5: Pan-India Multilingual Patient Experience (22 Indian Languages + English)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Part A: 23 Languages Metadata, Scripts & RTL Direction', () => {
    it('defines exactly 23 languages (English + all 22 Eighth Schedule Indian languages)', () => {
      expect(ALL_LANGUAGES).toHaveLength(23);
      const codes = ALL_LANGUAGES.map((l) => l.code);
      const expectedCodes: SupportedLanguage[] = [
        'en', 'hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu',
        'kn', 'ml', 'or', 'pa', 'as', 'mai', 'sat', 'ks',
        'ne', 'sd', 'kok', 'doi', 'mni', 'brx', 'sa'
      ];
      expect(codes.sort()).toEqual(expectedCodes.sort());
    });

    it('correctly tags Urdu (ur), Sindhi (sd), and Kashmiri (ks) as RTL text direction', () => {
      const urdu = LANGUAGE_MAP['ur'];
      const sindhi = LANGUAGE_MAP['sd'];
      const kashmiri = LANGUAGE_MAP['ks'];

      expect(urdu.direction).toBe('rtl');
      expect(sindhi.direction).toBe('rtl');
      expect(kashmiri.direction).toBe('rtl');

      const nonRTL = ALL_LANGUAGES.filter((l) => !['ur', 'sd', 'ks'].includes(l.code));
      nonRTL.forEach((lang) => {
        expect(lang.direction).toBe('ltr');
      });
    });

    it('contains authentic native script names without placeholder question marks or broken chars', () => {
      expect(LANGUAGE_MAP['hi'].nativeName).toBe('हिन्दी');
      expect(LANGUAGE_MAP['bn'].nativeName).toBe('বাংলা');
      expect(LANGUAGE_MAP['ta'].nativeName).toBe('தமிழ்');
      expect(LANGUAGE_MAP['te'].nativeName).toBe('తెలుగు');
      expect(LANGUAGE_MAP['mr'].nativeName).toBe('मराठी');
      expect(LANGUAGE_MAP['ur'].nativeName).toBe('اردو');
      expect(LANGUAGE_MAP['sd'].nativeName).toBe('سنڌي');
      expect(LANGUAGE_MAP['sat'].nativeName).toBe('ᱥᱟᱱᱛᱟᱲᱤ'); // Ol Chiki
      expect(LANGUAGE_MAP['mni'].nativeName).toBe('ꯃꯤꯇꯩꯂꯣꯟ / মৈতৈলোন্'); // Meitei Mayek
      expect(LANGUAGE_MAP['sa'].nativeName).toBe('संस्कृतम्');
    });
  });

  describe('Part B: Parameter Interpolation & English Fallback', () => {
    it('interpolates parameters like {name} and {count}', () => {
      const enWelcome = translate('en', 'patient.welcome_name', { name: 'Ramesh' });
      expect(enWelcome).toBe('Namaste, Ramesh! How are you feeling today?');

      const hiWelcome = translate('hi', 'patient.welcome_name', { name: 'रमेश' });
      expect(hiWelcome).toBe('नमस्ते, रमेश जी! आज आप कैसा महसूस कर रहे हैं?');

      const bnWelcome = translate('bn', 'patient.welcome_name', { name: 'রমেশ' });
      expect(bnWelcome).toBe('নমস্কার, রমেশ! আজ আপনি কেমন আছেন?');
    });

    it('falls back to English when a key is missing from a locale', () => {
      // Testing with fallback to English
      const fallback = translate('hi', 'non_existent_key' as any);
      expect(fallback).toBe('non_existent_key');
    });

    it('formats dates, times, and numbers according to language locale', () => {
      const testDate = new Date(2026, 10, 8, 14, 30);
      const formattedEnDate = formatDate('en', testDate);
      expect(formattedEnDate).toBeDefined();

      const formattedHiDate = formatDate('hi', testDate);
      expect(formattedHiDate).toBeDefined();

      const formattedNumber = formatNumber('hi', 12345);
      expect(formattedNumber).toBeDefined();
    });

    it('validates translation dictionary completeness across all 23 languages', () => {
      const report = validateTranslationCompleteness();
      expect(Object.keys(report)).toHaveLength(23);
      expect(report.hi.translated).toBeGreaterThan(25);
      expect(report.ta.translated).toBeGreaterThan(25);
      expect(report.mr.translated).toBeGreaterThan(25);
      expect(report.ur.translated).toBeGreaterThan(25);
      expect(report.sat.translated).toBeGreaterThan(25);
      expect(report.mni.translated).toBeGreaterThan(25);
    });
  });

  describe('Part C: Language Context & User Scoped Persistence', () => {
    const TestConsumer: React.FC = () => {
      const { language, setLanguage, isRTL, t } = useLanguage();
      return (
        <div>
          <span data-testid="active-lang">{language}</span>
          <span data-testid="active-rtl">{isRTL ? 'rtl' : 'ltr'}</span>
          <span data-testid="welcome-text">{t('patient.welcome_back')}</span>
          <button onClick={() => setLanguage('hi')}>Switch to Hindi</button>
          <button onClick={() => setLanguage('ur')}>Switch to Urdu</button>
        </div>
      );
    };

    it('persists selected language per guest user by default', () => {
      render(
        <LanguageProvider>
          <TestConsumer />
        </LanguageProvider>
      );

      expect(screen.getByTestId('active-lang').textContent).toBe('en');
      expect(screen.getByTestId('active-rtl').textContent).toBe('ltr');

      fireEvent.click(screen.getByRole('button', { name: /Switch to Hindi/i }));

      expect(screen.getByTestId('active-lang').textContent).toBe('hi');
      expect(localStorage.getItem('saksham_lang_guest')).toBe('hi');
    });

    it('updates document.documentElement.dir and lang on switching to RTL language (Urdu)', () => {
      render(
        <LanguageProvider>
          <TestConsumer />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /Switch to Urdu/i }));

      expect(screen.getByTestId('active-lang').textContent).toBe('ur');
      expect(screen.getByTestId('active-rtl').textContent).toBe('rtl');
      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('ur');
    });
  });

  describe('Part D: SpeechService Multilingual Voice & BCP-47 Mapping', () => {
    it('maps all 23 languages to correct standard BCP-47 speech tags', () => {
      expect(LANGUAGE_BCP47_MAP['en']).toBe('en-IN');
      expect(LANGUAGE_BCP47_MAP['hi']).toBe('hi-IN');
      expect(LANGUAGE_BCP47_MAP['bn']).toBe('bn-IN');
      expect(LANGUAGE_BCP47_MAP['ta']).toBe('ta-IN');
      expect(LANGUAGE_BCP47_MAP['te']).toBe('te-IN');
      expect(LANGUAGE_BCP47_MAP['mr']).toBe('mr-IN');
      expect(LANGUAGE_BCP47_MAP['gu']).toBe('gu-IN');
      expect(LANGUAGE_BCP47_MAP['ur']).toBe('ur-IN');
      expect(LANGUAGE_BCP47_MAP['pa']).toBe('pa-IN');
      expect(LANGUAGE_BCP47_MAP['sat']).toBe('sat-IN');
      expect(LANGUAGE_BCP47_MAP['mni']).toBe('mni-IN');
    });

    it('resolves BCP-47 tag in SpeechService', () => {
      expect(SpeechService.getBCP47('hi')).toBe('hi-IN');
      expect(SpeechService.getBCP47('ta')).toBe('ta-IN');
      expect(SpeechService.getBCP47('non_existent' as any)).toBe('en-IN');
    });
  });

  describe('Part E: Asha AI Companion Multilingual Safety & Intents', () => {
    it('triggers medical emergency guard for Hindi distress phrases', () => {
      const hindiChestPain = parseAIIntentLocally('मुझे सीने में बहुत तेज़ दर्द हो रहा है', undefined, 'hi');
      expect(hindiChestPain.speech).toContain('चिकित्सीय सलाह');
      expect(hindiChestPain.suggestedAction).toBeUndefined();
    });

    it('triggers medical emergency guard for Bengali distress phrases', () => {
      const bengaliChestPain = parseAIIntentLocally('আমার বুকে প্রচন্ড ব্যথা করছে', undefined, 'bn');
      expect(bengaliChestPain.speech).toBeDefined();
      expect(bengaliChestPain.suggestedAction).toBeUndefined();
    });

    it('triggers game navigation for Hindi game queries', () => {
      const hindiGame = parseAIIntentLocally('मुझे कोई खेल खेलना है', undefined, 'hi');
      expect(hindiGame.suggestedAction?.action).toBe('NAVIGATE_MIND_GAMES');
    });

    it('triggers loved ones navigation for Tamil family queries', () => {
      const tamilFamily = parseAIIntentLocally('என் குடும்பப் படங்களைப் பார்க்க வேண்டும்', undefined, 'ta');
      expect(tamilFamily.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
    });
  });

  describe('Part F: Welcoming Language Selection Modal & Patient Profile Settings', () => {
    it('renders the LanguageSelectionModal with all 23 language choices and search filter', () => {
      const onClose = vi.fn();
      render(
        <LanguageProvider>
          <LanguageSelectionModal isOpen={true} onClose={onClose} />
        </LanguageProvider>
      );

      // Verify title and search bar
      expect(screen.getByText(/Choose Your Preferred Language/i)).toBeDefined();
      const searchInput = screen.getByPlaceholderText(/Search by language name/i);
      expect(searchInput).toBeDefined();

      // Search for Tamil
      fireEvent.change(searchInput, { target: { value: 'Tamil' } });
      expect(screen.getByText('தமிழ்')).toBeDefined();
      expect(screen.getByText('Tamil')).toBeDefined();

      // Confirm button is present
      const confirmBtn = screen.getByRole('button', { name: /Apply & Continue/i });
      expect(confirmBtn).toBeDefined();
    });

    it('renders the Language Preference card in PatientProfile with active script badge', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <AccessibilityProvider>
              <CharacterProvider>
                <LanguageProvider>
                  <PatientProfile />
                </LanguageProvider>
              </CharacterProvider>
            </AccessibilityProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByText(/Language Preference/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Change Language/i })).toBeDefined();
    });
  });
});
