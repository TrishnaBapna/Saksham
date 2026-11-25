import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { AuthProvider } from '../context/AuthContext.js';
import { ConversationalAIService } from '../features/ai-companion/services/conversationalAIService.js';
import { FirebaseAILogicService } from '../features/ai-companion/services/firebaseAILogicService.js';
import { AshaRemoteAdapter } from '../features/ai-companion/services/ashaRemoteAdapter.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { ConversationActionRegistry } from '../features/ai-companion/services/conversationActionRegistry.js';
import { AdaptiveDifficultyService } from '../features/games/services/adaptiveDifficultyService.js';
import { GamesService } from '../features/games/services/gamesService.js';
import { GameSessionFeedbackModal } from '../features/games/components/GameSessionFeedbackModal.js';
import { AshaGameCompanion } from '../features/games/components/AshaGameCompanion.js';
import { AshaHomeGuidePage } from '../pages/patient/AshaHomeGuidePage.js';
import { CaregiverSafeZoneMap } from '../features/safety/components/CaregiverSafeZoneMap.js';
import { GPSService } from '../services/gpsService.js';
import { SpeechService } from '../services/speechService.js';
import { SupportedLanguage } from '../i18n/types.js';

const LanguageInitializer: React.FC<{ lang: SupportedLanguage }> = ({ lang }) => {
  const { language, setLanguage } = useLanguage();
  React.useEffect(() => {
    if (language !== lang) {
      setLanguage(lang);
    }
  }, [lang, language, setLanguage]);
  return null;
};

const SevenLangTester: React.FC<{ targetLang: SupportedLanguage; children: React.ReactNode }> = ({
  targetLang,
  children,
}) => {
  localStorage.setItem('saksham_lang_guest', targetLang);
  localStorage.setItem('saksham_lang_user_demo-patient-001', targetLang);
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <LanguageInitializer lang={targetLang} />
          <AccessibilityProvider>{children}</AccessibilityProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Phase 3.23: Engine C Cloud Firebase AI Logic & Connected Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    ConversationalAIService.clearApiKey();
    AshaRemoteAdapter.resetHealthCacheForTesting();
    FirebaseAILogicService.resetRuntimeStateForTesting();
    ConversationEngine.clearTurnContext();
    ConversationActionRegistry.clearAll();
    GPSService.resetState();
    vi.spyOn(SpeechService, 'speak').mockImplementation(() => {});
    vi.spyOn(SpeechService, 'cancelSpeech').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Firebase AI Logic, App Check Gate, No Production Localhost, & Purpose-Scoped Context', () => {
    it('blocks remote cloud dispatch when running on non-localhost host without App Check configured', async () => {
      vi.spyOn(FirebaseAILogicService, 'isProductionHost').mockReturnValue(true);
      vi.spyOn(AshaRemoteAdapter, 'shouldUseLocalGateway').mockReturnValue(false);

      const status = FirebaseAILogicService.getStatus();
      expect(status.canDispatchCloudGemini).toBe(false);
      expect(status.blockedReason).toBe('APP_CHECK_NOT_CONFIGURED');

      const aiStatus = ConversationalAIService.getStatus();
      expect(aiStatus.isConfigured).toBe(false);
      expect(aiStatus.mode).toBe('LOCAL_SIMULATION_FALLBACK');

      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const res = await ConversationalAIService.generateConversationalResponse('Hello Asha');
      expect(res.isRealAI).toBe(false);
      expect(res.runtimeState).toBe('LOCAL_SLM_UNAVAILABLE');
      // Critical security check: remote production path NEVER calls 127.0.0.1:8096
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('surfaces truthful SERVICE_DISABLED state when Firebase AI Logic API is disabled on Spark project', () => {
      FirebaseAILogicService.setRuntimeBlockedForTesting(
        'SERVICE_DISABLED',
        'Firebase AI Logic API is disabled on project saksham-d3b71.'
      );
      const status = FirebaseAILogicService.getStatus();
      expect(status.canDispatchCloudGemini).toBe(false);
      expect(status.blockedReason).toBe('SERVICE_DISABLED');
      expect(status.statusMessage).toContain('disabled');
    });

    it('never leaks GPS coordinates or bulk family data in purpose-scoped cloud context', () => {
      const mockCtx: any = {
        patientId: 'patient-sunita-01',
        profile: { uid: 'patient-sunita-01', displayName: 'Sunita Sharma', isGuest: false },
        routines: {
          routines: [{ id: 'r1', title: 'Donepezil 5mg Morning', category: 'medication', scheduledTime: '08:30 AM', isCompleted: false }],
          remainingRoutines: [{ id: 'r1', title: 'Donepezil 5mg Morning', category: 'medication', scheduledTime: '08:30 AM', isCompleted: false }],
          completedRoutines: [],
          nextScheduledRoutine: { id: 'r1', title: 'Donepezil 5mg Morning', category: 'medication', scheduledTime: '08:30 AM' },
        },
        lovedOnes: {
          count: 4,
          sampleMembers: [{ name: 'Ananya Sharma', relationship: 'Daughter', phoneNumber: '+91 98201 12345' }],
          lovedOnes: [{ name: 'Ananya Sharma', relationship: 'Daughter', photoUrl: 'https://example.com/a.jpg' }],
        },
        mindGames: {
          difficultyPreference: 'Gentle',
          recentSessions: [{ patientFeedback: 'Relaxing' }],
        },
      };

      const generalScoped = ConversationalAIService.buildPurposeScopedContext('How is the weather?', mockCtx, 'en', 'patient-sunita-01');
      expect(generalScoped.familyContextSummary).toBeUndefined();
      expect(generalScoped.locationSharingStatus).toBeUndefined();
      expect(generalScoped.nextRoutineSummary).not.toContain('Donepezil');
      expect(JSON.stringify(generalScoped)).not.toContain('98201');
      expect(JSON.stringify(generalScoped)).not.toContain('12.97');

      const locScoped = ConversationalAIService.buildPurposeScopedContext('Is my GPS location sharing on?', mockCtx, 'en', 'patient-sunita-01');
      expect(locScoped.locationSharingStatus).toBe('not_requested');
      expect(JSON.stringify(locScoped)).not.toContain('12.97');

      const famScoped = ConversationalAIService.buildPurposeScopedContext('Tell me about my family', mockCtx, 'en', 'patient-sunita-01');
      expect(famScoped.familyContextSummary).toContain('4 authorized loved ones');
      expect(famScoped.familyContextSummary).not.toContain('Ananya Sharma');
      expect(famScoped.familyContextSummary).not.toContain('example.com/a.jpg');
    });
  });

  describe('2. All 7 Official Languages Rendered Coverage (en, hi, mr, bn, ta, te, kn)', () => {
    const langs: { code: SupportedLanguage; expectedGuideTitle: string; expectedBreakLabel: string }[] = [
      { code: 'en', expectedGuideTitle: 'Asha Home Guide', expectedBreakLabel: 'Take a Break' },
      { code: 'hi', expectedGuideTitle: 'आशा होम गाइड', expectedBreakLabel: 'थोड़ा विश्राम करें' },
      { code: 'mr', expectedGuideTitle: 'आशा होम गाईड', expectedBreakLabel: 'थोडी विश्रांती घ्या' },
      { code: 'bn', expectedGuideTitle: 'আশা হোম গাইড', expectedBreakLabel: 'একটু বিরতি নিন' },
      { code: 'ta', expectedGuideTitle: 'ஆஷா வீட்டு வழிகாட்டி', expectedBreakLabel: 'சிறிது ஓய்வு எடு' },
      { code: 'te', expectedGuideTitle: 'ఆశా హోమ్ గైడ్', expectedBreakLabel: 'విరామం తీసుకోండి' },
      { code: 'kn', expectedGuideTitle: 'ಆಶಾ ಹೋಮ್ ಗೈಡ್', expectedBreakLabel: 'ವಿರಾಮ ತೆಗೆದುಕೊಳ್ಳಿ' },
    ];

    it.each(langs)(
      'renders localized Home Guide and Game Companion cleanly in $code without English leakage',
      ({ code, expectedGuideTitle, expectedBreakLabel }) => {
        render(
          <SevenLangTester targetLang={code}>
            <AshaHomeGuidePage
              initialPatientLocation={{ latitude: 12.9735, longitude: 77.596, accuracyMeters: 10 }}
              initialHomeLocation={{ latitude: 12.9716, longitude: 77.5946, addressLabel: 'Home' }}
            />
            <AshaGameCompanion instructions="Match pairs" />
          </SevenLangTester>
        );

        expect(screen.getByRole('heading', { name: expectedGuideTitle })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: expectedBreakLabel })).toBeInTheDocument();
      }
    );
  });

  describe('3. Accessible Game Feedback Options & Bounded Difficulty Policy', () => {
    it('renders all 6 quick comfort feedback choices and updates AdaptiveDifficultyService respectfully', () => {
      const mockGame = GamesService.getGameById('game-matching')!;
      const onFinish = vi.fn();

      render(
        <SevenLangTester targetLang="en">
          <GameSessionFeedbackModal
            game={mockGame}
            difficulty="Gentle"
            elapsedSeconds={75}
            onPlayAgain={vi.fn()}
            onFinish={onFinish}
          />
        </SevenLangTester>
      );

      for (const label of ['Too easy', 'Too difficult', 'I enjoyed this', "I don't like this", 'I need help', 'I want a break']) {
        expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument();
      }

      fireEvent.click(screen.getByRole('button', { name: /Too difficult/i }));
      fireEvent.click(screen.getByRole('button', { name: /Go home/i }));
      expect(onFinish).toHaveBeenCalledWith('Too difficult');

      // "Too easy" once still respects 3-session safeguard
      const pid = 'feedback-policy-patient';
      const step1 = AdaptiveDifficultyService.evaluateSession(pid, {
        sessionId: 's1',
        gameId: 'game-matching',
        durationSeconds: 60,
        completed: true,
        patientFeedback: 'Too easy',
      });
      expect(step1.currentDifficulty).toBe('Gentle');

      // "I need help" relaxes difficulty back down from Moderate -> Gentle
      AdaptiveDifficultyService.saveProfile({
        ...step1,
        currentDifficulty: 'Moderate',
        pacing: 'balanced',
      });
      const stepHelp = AdaptiveDifficultyService.evaluateSession(pid, {
        sessionId: 's2',
        gameId: 'game-matching',
        durationSeconds: 80,
        completed: true,
        patientFeedback: 'I need help',
      });
      expect(stepHelp.currentDifficulty).toBe('Gentle');
    });
  });

  describe('4. Consent-Gated GPS & CaregiverSafeZoneMap Synchronization', () => {
    it('stores consented location and immediately hides coordinates when patient revokes consent', () => {
      const pid = 'gps-consent-test-patient';
      GPSService.setConsentEnabled(pid, true);
      void GPSService.saveLocationUpdate({
        patientId: pid,
        latitude: 12.972,
        longitude: 77.595,
        accuracyMeters: 12,
        timestamp: new Date().toISOString(),
        isSharedWithCaregiver: true,
      });

      const { rerender } = render(
        <CaregiverSafeZoneMap patientId={pid} patientName="Sunita" initialRadiusMeters={500} />
      );
      expect(screen.getByTestId('safe-zone-source-badge')).toHaveTextContent('Consented GPS Fix');
      expect(screen.getByTestId('geofence-status-inside')).toBeInTheDocument();

      // Revoke consent
      GPSService.setConsentEnabled(pid, false);
      rerender(<CaregiverSafeZoneMap patientId={pid} patientName="Sunita" initialRadiusMeters={500} />);
      expect(screen.getByTestId('geofence-status-consent-withdrawn')).toBeInTheDocument();
    });

    it('handles Asha GPS privacy check safely in multiple languages without leaking coordinates', async () => {
      const pid = 'gps-asha-patient';
      GPSService.setConsentEnabled(pid, false);
      const res = await ConversationEngine.process('Is my GPS location sharing on?', undefined, 'hi', pid);
      expect(res.intent).toBe('LOCATION_STATUS_CHECK');
      expect(res.speech).toContain('रुका');
      expect(res.speech).not.toContain('12.97');
    });
  });
});
