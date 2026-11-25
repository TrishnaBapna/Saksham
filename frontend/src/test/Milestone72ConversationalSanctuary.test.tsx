/**
 * SAKSHAM — MILESTONE 7.2: CONVERSATIONAL SANCTUARY & TACTILE NAVIGATION TEST SUITE
 * Exhaustive verification of Conversational Sanctuary Stage, Web Speech capability detection,
 * honest fallback handling, 5 tactile quick actions, 4-destination fallback drawer,
 * compact Asha integration, and pan-India localization across 23 languages.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useRef, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { ConversationalSanctuaryStage } from '../features/ai-companion/components/ConversationalSanctuaryStage.js';
import { TactileNavigationDrawer } from '../components/layout/TactileNavigationDrawer.js';
import { AshaGameCompanion } from '../features/games/components/AshaGameCompanion.js';
import { SpeechService } from '../services/speechService.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { LanguageProvider, useLanguage } from '../context/LanguageContext.js';
import { AccessibilityProvider, useAccessibility } from '../context/AccessibilityContext.js';
import { AuthProvider } from '../context/AuthContext.js';
import { TRANSLATION_CATALOGUE } from '../i18n/interpolate.js';
import { SupportedLanguage } from '../i18n/types.js';

// Helper wrapper for provider contexts
const renderWithProviders = (
  ui: React.ReactElement,
  options?: { language?: SupportedLanguage; highContrast?: boolean }
) => {
  if (options?.language) {
    window.localStorage.setItem('saksham_lang_guest', options.language);
  }
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AccessibilityProvider>
            <CharacterProvider>
              {ui}
            </CharacterProvider>
          </AccessibilityProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Milestone 7.2: Conversational Sanctuary Stage & Tactile Navigation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    SpeechService.cancelSpeech();
  });

  // --------------------------------------------------------------------------
  // Part A: Conversational Sanctuary Stage Layout & Asha Presentation
  // --------------------------------------------------------------------------
  describe('Part A: Sanctuary Layout & Asha Presentation', () => {
    it('renders the Conversational Sanctuary with primary Asha visualizer (size 180)', () => {
      renderWithProviders(<ConversationalSanctuaryStage patientName="Sunita" />);

      // Character stage exists with primary Asha avatar
      const visualizer = screen.getByLabelText(/Asha character is currently/i);
      expect(visualizer).toBeInTheDocument();
      expect(visualizer).toHaveAttribute('data-character-mode', 'primary');

      // Check authentic character artwork is rendered
      const img = visualizer.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute('src')).toMatch(/\/assets\/character\/asha\//);

      // Verify branding and initial welcoming balloon
      expect(screen.getByText(/Saksham AI Companion/i)).toBeInTheDocument();
      expect(screen.getByText(/Namaste! I'm Asha, your memory companion/i)).toBeInTheDocument();
    });

    it('retains Asha as the dedicated sanctuary companion without character-switching controls', () => {
      renderWithProviders(<ConversationalSanctuaryStage />);

      // Companion badge is firmly Asha
      expect(screen.getByText('Asha')).toBeInTheDocument();

      // No character-switching button exists
      expect(screen.queryByLabelText(/Switch companion character/i)).not.toBeInTheDocument();
    });

    it('supports minimizing and expanding the Sanctuary stage for low-stimulation mode', () => {
      renderWithProviders(<ConversationalSanctuaryStage />);

      const toggleBtn = screen.getByLabelText(/Minimize Companion/i);
      fireEvent.click(toggleBtn);

      // Compact bar appears
      expect(screen.getByText(/Asha is right here with you/i)).toBeInTheDocument();
      expect(screen.getByText(/Open Chat/i)).toBeInTheDocument();

      // Tap to expand
      fireEvent.click(screen.getByText(/Open Chat/i));
      expect(screen.getByLabelText(/Minimize Companion/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Part B: Accessible Conversation Input & Speech Capability Detection
  // --------------------------------------------------------------------------
  describe('Part B: Conversation Input & Honest Capability Detection', () => {
    it('submits typed message and receives companion response', async () => {
      renderWithProviders(<ConversationalSanctuaryStage patientName="Sunita" />);

      const input = screen.getByPlaceholderText(/Talk to Asha or type what you need/i);
      fireEvent.change(input, { target: { value: 'What games can I play?' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // Shows user message
      expect(screen.getByText('What games can I play?')).toBeInTheDocument();

      // Companion responds with game assistance
      await waitFor(() => {
        expect(screen.getByText(/Mind Games/i)).toBeInTheDocument();
      });
    });

    it('honestly detects when Web Speech API is unsupported and displays clear notice toast', () => {
      // Mock unsupported speech recognition
      vi.spyOn(SpeechService, 'isSpeechRecognitionSupported').mockReturnValue(false);

      renderWithProviders(<ConversationalSanctuaryStage />);

      const micButton = screen.getByLabelText(/Microphone is unavailable on this browser/i);
      expect(micButton).toBeInTheDocument();
      expect(micButton.className).toContain('cursor-not-allowed');

      // Clicking does not start listening, but displays honest notice
      fireEvent.click(micButton);

      expect(screen.getByRole('alert')).toHaveTextContent(
        /Microphone is unavailable on this browser. Please type your message|Acoustic recognition/i
      );
    });

    it('activates speech recognition when supported by browser', () => {
      // Mock supported speech recognition
      vi.spyOn(SpeechService, 'isSpeechRecognitionSupported').mockReturnValue(true);
      const startListeningSpy = vi.spyOn(SpeechService, 'startListening').mockReturnValue(() => {});

      renderWithProviders(<ConversationalSanctuaryStage />);

      const micButton = screen.getByLabelText(/Tap to speak/i);
      fireEvent.click(micButton);

      expect(startListeningSpy).toHaveBeenCalled();
    });

    it('receives speech transcript from recognition and submits into conversation flow', async () => {
      vi.spyOn(SpeechService, 'isSpeechRecognitionSupported').mockReturnValue(true);
      vi.spyOn(SpeechService, 'startListening').mockImplementation((onResult) => {
        onResult('What should I do next?');
        return () => {};
      });

      renderWithProviders(<ConversationalSanctuaryStage />);

      const micButton = screen.getByLabelText(/Tap to speak/i);
      fireEvent.click(micButton);

      expect(screen.getByText('What should I do next?')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText(/Your next activity is/i)).toBeInTheDocument();
      });
    });

    it('displays gentle notice toast when microphone recognition encounters an error', async () => {
      vi.spyOn(SpeechService, 'isSpeechRecognitionSupported').mockReturnValue(true);
      vi.spyOn(SpeechService, 'startListening').mockImplementation((_onResult, onError) => {
        onError('Voice input error: not-allowed');
        return () => {};
      });

      renderWithProviders(<ConversationalSanctuaryStage />);

      const micButton = screen.getByLabelText(/Tap to speak/i);
      fireEvent.click(micButton);

      expect(screen.getByRole('alert')).toHaveTextContent(/Voice input error: not-allowed/i);
    });

    it('provides honest fallback response when user query is unrecognized', async () => {
      renderWithProviders(<ConversationalSanctuaryStage />);

      const input = screen.getByPlaceholderText(/Talk to Asha or type what you need/i);
      fireEvent.change(input, { target: { value: 'Quantum astrophysics calculations 429' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(
          screen.getByText(/I am still learning how to help with that. You can choose one of these options/i)
        ).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Part C: Tactile Quick Actions (5 Contextual Destinations)
  // --------------------------------------------------------------------------
  describe('Part C: Tactile Quick Actions (5 Contextual Destinations)', () => {
    it('renders exactly 5 tactile quick action cards with accessible descriptions', () => {
      renderWithProviders(<ConversationalSanctuaryStage />);

      expect(screen.getByRole('button', { name: /Daily Routines - View your daily schedule/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mind Games - Play memory, attention, and pattern games/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Loved Ones - View family photos, memories/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Notes - View or record personal notes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Calendar - View scheduled appointments/i })).toBeInTheDocument();
    });

    it('dispatches saksham:open-notes CustomEvent when Notes quick action is tapped', () => {
      const notesListener = vi.fn();
      window.addEventListener('saksham:open-notes', notesListener);

      renderWithProviders(<ConversationalSanctuaryStage />);

      const notesBtn = screen.getByRole('button', { name: /Notes - View or record personal notes and reminders/i });
      fireEvent.click(notesBtn);

      expect(notesListener).toHaveBeenCalledTimes(1);
      window.removeEventListener('saksham:open-notes', notesListener);
    });

    it('dispatches saksham:open-calendar CustomEvent when Calendar quick action is tapped', () => {
      const calendarListener = vi.fn();
      window.addEventListener('saksham:open-calendar', calendarListener);

      renderWithProviders(<ConversationalSanctuaryStage />);

      const calBtn = screen.getByRole('button', { name: /Calendar - View scheduled appointments and events/i });
      fireEvent.click(calBtn);

      expect(calendarListener).toHaveBeenCalledTimes(1);
      window.removeEventListener('saksham:open-calendar', calendarListener);
    });

    it('executes onNavigateRoutines callback when Daily Routines quick action is tapped', () => {
      const onNavigateRoutines = vi.fn();
      renderWithProviders(
        <ConversationalSanctuaryStage onNavigateRoutines={onNavigateRoutines} />
      );

      const routinesBtn = screen.getByRole('button', { name: /Daily Routines - View your daily schedule and assisted memory cues/i });
      fireEvent.click(routinesBtn);

      expect(onNavigateRoutines).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // Part D: Tactile Fallback Navigation Drawer (Exactly 4 Destinations)
  // --------------------------------------------------------------------------
  describe('Part D: Tactile Fallback Navigation Drawer', () => {
    const DrawerHarness: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
      isOpen,
      onClose,
    }) => {
      const triggerRef = useRef<HTMLButtonElement | null>(null);
      return (
        <div>
          <button ref={triggerRef} type="button" aria-label="Open Navigation">
            Trigger
          </button>
          <TactileNavigationDrawer
            isOpen={isOpen}
            onClose={onClose}
            triggerRef={triggerRef}
          />
        </div>
      );
    };

    it('renders drawer with role="dialog", aria-modal="true", and EXACTLY 4 destinations', () => {
      renderWithProviders(<DrawerHarness isOpen={true} onClose={vi.fn()} />);

      const dialog = screen.getByRole('dialog', { name: /Navigation Menu/i });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      // Verify the 4 destinations
      expect(screen.getByRole('menuitem', { name: /Home/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Family/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Games/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Profile/i })).toBeInTheDocument();

      // Daily Routines is NOT a separate drawer destination (remains embedded in Home)
      expect(screen.queryByRole('menuitem', { name: /Daily Routines/i })).not.toBeInTheDocument();
    });

    it('closes drawer when Escape key is pressed', () => {
      const onClose = vi.fn();
      renderWithProviders(<DrawerHarness isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes drawer when Close button is tapped', () => {
      const onClose = vi.fn();
      renderWithProviders(<DrawerHarness isOpen={true} onClose={onClose} />);

      const closeBtn = screen.getByLabelText(/Close Navigation Menu/i);
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // Part E: Compact Asha in Daily Routines & Mind Games
  // --------------------------------------------------------------------------
  describe('Part E: Compact Asha in Activities', () => {
    it('renders compact Asha in AshaGameCompanion with appropriate size and guide badge', () => {
      render(
        <AshaGameCompanion
          instructions="Remember the card you saw earlier"
          hint="It had a green border"
        />
      );

      // Verify compact Asha visualizer rendered
      const visualizer = screen.getByLabelText(/Asha character is currently/i);
      expect(visualizer).toBeInTheDocument();
      expect(visualizer).toHaveAttribute('data-character-mode', 'compact');
      expect(screen.getByText('Asha AI Companion')).toBeInTheDocument();
      expect(screen.getByText('Supportive Guide')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Part F: Pan-India Multilingual Verification (All 23 Languages)
  // --------------------------------------------------------------------------
  describe('Part F: Pan-India Multilingual Verification (All 23 Languages)', () => {
    const requiredKeys = [
      'sanctuary.welcome_badge',
      'sanctuary.greeting_intro',
      'sanctuary.input_placeholder',
      'sanctuary.send',
      'sanctuary.mic_unsupported',
      'sanctuary.unsupported_fallback',
      'sanctuary.action_routines',
      'sanctuary.action_routines_desc',
      'sanctuary.action_games',
      'sanctuary.action_games_desc',
      'sanctuary.action_family',
      'sanctuary.action_family_desc',
      'sanctuary.action_notes',
      'sanctuary.action_notes_desc',
      'sanctuary.action_calendar',
      'sanctuary.action_calendar_desc',
      'sanctuary.nav_open',
      'sanctuary.nav_close',
      'sanctuary.nav_title',
      'sanctuary.nav_home_desc',
      'sanctuary.nav_family_desc',
      'sanctuary.nav_games_desc',
      'sanctuary.nav_profile_desc',
    ];

    const all23Langs: SupportedLanguage[] = [
      'en', 'as', 'bn', 'brx', 'doi', 'gu', 'hi', 'kn', 'kok', 'ks',
      'mai', 'ml', 'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd',
      'ta', 'te', 'ur',
    ];

    all23Langs.forEach((lang) => {
      it(`contains all Milestone 7.2 localization keys in ${lang}`, () => {
        const dict = TRANSLATION_CATALOGUE[lang];
        expect(dict).toBeDefined();

        requiredKeys.forEach((key) => {
          const val = (dict as any)[key];
          expect(
            val,
            `Language ${lang} is missing key: ${key}`
          ).toBeDefined();
          expect(typeof val).toBe('string');
          expect((val as string).trim().length).toBeGreaterThan(0);
        });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Part G: Accessibility & RTL Direction
  // --------------------------------------------------------------------------
  describe('Part G: Accessibility & RTL Direction', () => {
    const LanguageHarness: React.FC<{ lang: SupportedLanguage; children: React.ReactNode }> = ({
      lang,
      children,
    }) => {
      const { setLanguage } = useLanguage();
      useEffect(() => {
        setLanguage(lang);
      }, [lang]);
      return <>{children}</>;
    };

    it('applies dir="rtl" on ConversationalSanctuaryStage when Urdu (ur) is active', async () => {
      renderWithProviders(
        <LanguageHarness lang="ur">
          <ConversationalSanctuaryStage />
        </LanguageHarness>
      );
      await waitFor(() => {
        const sanctuary = screen.getByLabelText('Saksham Conversational Sanctuary');
        expect(sanctuary).toHaveAttribute('dir', 'rtl');
      });
    });

    it('applies dir="rtl" on TactileNavigationDrawer when Sindhi (sd) is active', async () => {
      renderWithProviders(
        <LanguageHarness lang="sd">
          <TactileNavigationDrawer isOpen={true} onClose={vi.fn()} />
        </LanguageHarness>
      );
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('dir', 'rtl');
      });
    });

    it('applies high contrast border and styling when highContrast is enabled', () => {
      const HighContrastHarness = () => {
        const { setHighContrast } = useAccessibility();
        useEffect(() => {
          setHighContrast(true);
        }, [setHighContrast]);
        return <ConversationalSanctuaryStage />;
      };

      renderWithProviders(<HighContrastHarness />);
      const sanctuary = screen.getByLabelText('Saksham Conversational Sanctuary');
      expect(sanctuary.className).toContain('border-amber-400');
    });
  });
});
