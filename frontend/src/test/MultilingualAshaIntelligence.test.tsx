import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { IntentRegistry } from '../features/ai-companion/services/intentRegistry.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { SpeechService } from '../services/speechService.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { PatientProfile } from '../pages/patient/PatientProfile.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { PatientExperienceProvider } from '../context/PatientExperienceContext.js';

vi.mock('../context/AuthContext.js', () => ({
  useAuth: () => ({
    currentUser: {
      uid: 'multilingual-patient-001',
      displayName: 'Sunita Sharma',
      role: 'patient',
      status: 'verified',
    },
    role: 'patient',
    logout: vi.fn(),
  }),
}));

describe('Priority 1: True Multilingual ASHA Intelligence & Decoupled Preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('Semantic Understanding Beyond Keywords & Negative Handling', () => {
    it('1. recognizes Marathi medication lapse: "मला औषध घ्यायचं आठवत नाही"', () => {
      const match = IntentRegistry.match('मला औषध घ्यायचं आठवत नाही');
      expect(match.intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(match.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('2. recognizes Hindi negative preference: "मुझे आज बाहर नहीं जाना है"', () => {
      const match = IntentRegistry.match('मुझे आज बाहर नहीं जाना है');
      expect(match.intent).toBe('WELLBEING_REST_BREAK');
      expect(match.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('3. recognizes Hinglish code-switching: "ASHA, mujhe water chahiye, please"', () => {
      const match = IntentRegistry.match('ASHA, mujhe water chahiye, please');
      expect(match.intent).toBe('ROUTINES_START_NEXT');
      expect(match.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('4. recognizes Bengali and Tamil medication queries with regional syntax', () => {
      const bnMatch = IntentRegistry.match('আমার ওষুধ খেতে মনে নেই');
      expect(bnMatch.intent).toBe('ROUTINES_MEDICATION_STATUS');

      const taMatch = IntentRegistry.match('மருந்து சாப்பிட்டேனா என்று நினைவில்லை');
      expect(taMatch.intent).toBe('ROUTINES_MEDICATION_STATUS');
    });
  });

  describe('SpeechService Language Detection & Privacy Disclosure', () => {
    it('5. detects spoken language from Indic scripts and distinctive tokens', () => {
      expect(SpeechService.detectSpokenLanguage('मला औषध घ्यायचे आहे')).toBe('mr');
      expect(SpeechService.detectSpokenLanguage('मुझे आज दवा लेनी है')).toBe('hi');
      expect(SpeechService.detectSpokenLanguage('আমার ওষুধ খেতে মনে নেই')).toBe('bn');
      expect(SpeechService.detectSpokenLanguage('மருந்து சாப்பிட வேண்டும்')).toBe('ta');
      expect(SpeechService.detectSpokenLanguage('Today is Tuesday')).toBe('en');
    });

    it('6. provides transparent Web Speech API privacy disclosure explaining vendor server routing', () => {
      const disclosure = SpeechService.getPrivacyDisclosure();
      expect(disclosure.title).toContain('Speech Recognition & Audio Privacy Notice');
      expect(disclosure.body).toContain('Google Speech Processing Servers');
      expect(disclosure.dataTransmitted).toContain('zero permanent cloud audio storage');
    });
  });

  describe('Decoupled Response Language in ConversationEngine', () => {
    it('7. returns Marathi response when responseLanguage is "mr", regardless of input query language', () => {
      const context: any = {
        patientId: 'patient-test-01',
        routines: {
          routines: [
            {
              id: 'med-01',
              title: 'सकाळचे औषध',
              scheduledTime: '09:00 AM',
              category: 'medication',
              isCompleted: false,
            },
          ],
        },
      };

      const result = ConversationEngine.processSync(
        'did i take my medicine',
        context,
        'en', // displayLanguage
        'mr'  // responseLanguage
      );

      expect(result.intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(result.speech).toContain('अजून नाही');
      expect(result.speech).toContain('सकाळचे औषध');
    });

    it('8. returns Hindi response when responseLanguage is "hi"', () => {
      const context: any = {
        patientId: 'patient-test-01',
        routines: {
          routines: [
            {
              id: 'med-01',
              title: 'Morning Medicine',
              scheduledTime: '09:00 AM',
              category: 'medication',
              isCompleted: true,
              completedAt: '8:45 AM',
            },
          ],
        },
      };

      const result = ConversationEngine.processSync(
        'have i taken my pills',
        context,
        'en',
        'hi'
      );

      expect(result.intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(result.speech).toContain('हाँ!');
      expect(result.speech).toContain('Morning Medicine');
    });
  });

  describe('PatientProfile Multilingual & Audio-First Settings', () => {
    it('9. renders decoupled language settings card and updates reading preference', () => {
      render(
        <BrowserRouter>
          <AccessibilityProvider>
            <LanguageProvider>
              <PatientExperienceProvider>
                <PatientProfile />
              </PatientExperienceProvider>
            </LanguageProvider>
          </AccessibilityProvider>
        </BrowserRouter>
      );

      expect(screen.getByTestId('multilingual-settings-card')).toBeInTheDocument();
      expect(screen.getByTestId('change-reading-lang-btn')).toBeInTheDocument();
      expect(screen.getByTestId('response-language-select')).toBeInTheDocument();

      // Click Audio Only button
      const audioPrefBtn = screen.getByTestId('reading-pref-audio');
      fireEvent.click(audioPrefBtn);

      // Verify speech privacy disclosure button opens modal
      const privacyBtn = screen.getByTestId('open-speech-privacy-btn');
      fireEvent.click(privacyBtn);

      expect(screen.getByTestId('speech-privacy-modal')).toBeInTheDocument();
      expect(screen.getByText(/Speech Recognition & Audio Privacy Notice/i)).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByTestId('close-speech-privacy-modal-btn');
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('speech-privacy-modal')).not.toBeInTheDocument();
    });
  });
});
