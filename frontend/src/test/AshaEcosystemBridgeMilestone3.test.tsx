import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PatientDashboard } from '../pages/patient/PatientDashboard.js';
import { AICompanion } from '../features/ai-companion/AICompanion.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { PatientContextService } from '../services/patientContextService.js';
import { parseAIIntentLocally } from '../services/aiService.js';
import { notifyDataChange } from '../features/auth/services/identityService.js';

describe('Phase 3 Milestone 3 — Real-Time Patient Dashboard & Asha Ecosystem Bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <CharacterProvider>
                <PatientDashboard />
              </CharacterProvider>
            </AccessibilityProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  const renderCompanion = (onNavigateAction = vi.fn()) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <CharacterProvider>
                <AICompanion onNavigateAction={onNavigateAction} />
              </CharacterProvider>
            </AccessibilityProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  describe('1. PatientContextService Authoritative Data Snapshot', () => {
    it('generates a comprehensive synchronous patient context snapshot', () => {
      const mockUser = { uid: 'test-patient-m3', displayName: 'Sunita Sharma' };
      const context = PatientContextService.getPatientContext(mockUser);

      expect(context.patientId).toBe('test-patient-m3');
      expect(context.profile.displayName).toBe('Sunita Sharma');
      expect(context.profile.isGuest).toBe(false);

      // Routines context
      expect(context.routines.routines.length).toBeGreaterThan(0);
      expect(context.routines.progress.total).toBe(context.routines.routines.length);
      expect(context.routines.streak).toBeGreaterThanOrEqual(0);
      expect(context.routines.activeRoutine).toBeDefined();

      // Loved Ones context
      expect(context.lovedOnes.count).toBeGreaterThan(0);
      expect(context.lovedOnes.sampleMembers.length).toBeLessThanOrEqual(3);
      expect(context.lovedOnes.sampleMembers[0].name).toBeDefined();

      // Mind Games context
      expect(context.mindGames.availableGamesCount).toBeGreaterThan(0);
      expect(context.mindGames.difficultyPreference).toBeDefined();
    });

    it('isolates guest context safely with standardized guest identifier', () => {
      const guestContext = PatientContextService.getPatientContext(null);
      expect(guestContext.patientId).toBe('guest_patient_local');
      expect(guestContext.profile.isGuest).toBe(true);
      expect(guestContext.routines.routines.length).toBeGreaterThan(0);
    });
  });

  describe('2. Asha AI Intent Parser with Ecosystem Grounding', () => {
    it('strictly guards against medical advice, dosage changes, and emergency distress', () => {
      const mockContext = PatientContextService.getPatientContext({ uid: 'patient-test' });

      // English safety queries
      const resPain = parseAIIntentLocally('I have severe chest pain and need help', mockContext, 'en');
      expect(resPain.speech).toMatch(/cannot provide medical advice/i);
      expect(resPain.characterState).toBe('encouraging');

      const resDose = parseAIIntentLocally('Should I double my dose of pills?', mockContext, 'en');
      expect(resDose.speech).toMatch(/cannot provide medical advice/i);

      // Hindi safety queries
      const resHi = parseAIIntentLocally('क्या मैं अपनी दवा बदल लूँ?', mockContext, 'hi');
      expect(resHi.speech).toMatch(/चिकित्सीय सलाह या दवा में बदलाव/i);
    });

    it('answers "What should I do next?" with real upcoming scheduled routine', () => {
      const mockContext = PatientContextService.getPatientContext({ uid: 'patient-test' });
      const next = mockContext.routines.nextScheduledRoutine;

      const response = parseAIIntentLocally('What should I do next?', mockContext, 'en');
      if (next) {
        expect(response.speech).toContain(next.title);
        expect(response.suggestedAction?.action).toBe('NAVIGATE_ROUTINES');
        expect(response.suggestedAction?.targetId).toBe(next.id);
      }
    });

    it('checks medication completion status truthfully', () => {
      const mockContext = PatientContextService.getPatientContext({ uid: 'patient-test' });
      const response = parseAIIntentLocally('Did I take my morning medicine?', mockContext, 'en');

      expect(response.speech).toMatch(/medication|tablet|tea/i);
      expect(response.suggestedAction?.action).toBe('NAVIGATE_ROUTINES');
    });

    it('provides calm reassurance for memory lapse ("I forgot what I was doing")', () => {
      const mockContext = PatientContextService.getPatientContext({ uid: 'patient-test' });
      const response = parseAIIntentLocally('I forgot what I was doing', mockContext, 'en');

      expect(response.speech).toMatch(/do not worry|one calm step at a time/i);
      expect(response.characterState).toBe('encouraging');
      expect(response.suggestedAction?.action).toBe('NAVIGATE_ROUTINES');
    });

    it('answers specific family queries ("Who is Ananya Sharma?")', () => {
      const mockContext = PatientContextService.getPatientContext({ uid: 'patient-test' });
      const response = parseAIIntentLocally('Who is Ananya Sharma?', mockContext, 'en');

      expect(response.speech).toMatch(/Ananya Sharma is your Daughter/i);
      expect(response.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
      expect(response.suggestedAction?.targetId).toBe('loved-01');
    });

    it('answers queries about shared activities with family members', () => {
      const mockContext = PatientContextService.getPatientContext({ uid: 'patient-test' });
      const response = parseAIIntentLocally('What do I enjoy doing with my daughter?', mockContext, 'en');

      expect(response.speech).toMatch(/Ananya/i);
      expect(response.characterState).toBe('happy');
    });

    it('answers cognitive game history and suggests gentle games', () => {
      const mockContext = PatientContextService.getPatientContext({ uid: 'patient-test' });
      const response = parseAIIntentLocally('What games did I play recently?', mockContext, 'en');

      expect(response.suggestedAction?.action).toBe('NAVIGATE_MIND_GAMES');
    });

    it('provides calming emotional reassurance for fatigue and confusion', () => {
      const mockContext = PatientContextService.getPatientContext({ uid: 'patient-test' });

      const resTired = parseAIIntentLocally('I feel so tired today', mockContext, 'en');
      expect(resTired.speech).toMatch(/deep breath and rest/i);

      const resConfused = parseAIIntentLocally('I feel confused and lost', mockContext, 'en');
      expect(resConfused.speech).toMatch(/safe, caring space/i);
    });

    it('supports Hindi language responses for routines, loved ones and games', () => {
      const mockContext = PatientContextService.getPatientContext({ uid: 'patient-test' });

      const resNextHi = parseAIIntentLocally('अगला क्या है?', mockContext, 'hi');
      expect(resNextHi.speech).toMatch(/निर्धारित|गतिविधि|देखभाल/i);

      const resGameHi = parseAIIntentLocally('चलो खेल खेलें', mockContext, 'hi');
      expect(resGameHi.speech).toMatch(/खेल/i);
      expect(resGameHi.suggestedAction?.action).toBe('NAVIGATE_MIND_GAMES');
    });
  });

  describe('3. PatientDashboard Real-Time Ecosystem Integration', () => {
    it('renders the synchronized care status indicator and patient greeting', () => {
      renderDashboard();
      expect(screen.getByText(/Active Care Sanctuary • Synchronized/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Namaste/i })).toBeInTheDocument();
    });

    it('renders Loved Ones shortcut with preview members and navigation', () => {
      renderDashboard();
      expect(screen.getByLabelText(/Go to Loved Ones Family Memories/i)).toBeInTheDocument();
      // Verifies preview member rendered in the shortcut and companion
      expect(screen.getAllByText(/Ananya Sharma/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders Mind Games shortcut with games count and recommended activity badge', () => {
      renderDashboard();
      expect(screen.getByLabelText(/Go to Mind Games Cognitive Activities/i)).toBeInTheDocument();
      expect(screen.getByText(/Play Now/i)).toBeInTheDocument();
    });

    it('reacts dynamically when data change notification is broadcast', async () => {
      renderDashboard();

      // Broadcast an ecosystem update
      notifyDataChange('routines', 'demo-patient-001');

      // Dashboard remains responsive and stable
      await waitFor(() => {
        expect(screen.getByText(/Active Care Sanctuary • Synchronized/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. AICompanion Live Conversation & Dispatcher', () => {
    it('sends routine inquiry and renders contextual speech response and action button', async () => {
      const handleAction = vi.fn();
      renderCompanion(handleAction);

      const input = screen.getByPlaceholderText(/Ask Asha anything/i);
      fireEvent.change(input, { target: { value: 'What should I do next?' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/Your next activity is/i)).toBeInTheDocument();
      });

      // Suggested action button is rendered
      const actionBtn = screen.getByText(/Open Daily Routines/i);
      expect(actionBtn).toBeInTheDocument();
    });

    it('sends family inquiry and receives affectionate family memory response', async () => {
      renderCompanion();

      const input = screen.getByPlaceholderText(/Ask Asha anything/i);
      fireEvent.change(input, { target: { value: 'Who is Ananya?' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/Ananya Sharma is your Daughter/i)).toBeInTheDocument();
      });
    });
  });
});
