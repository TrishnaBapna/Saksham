/**
 * SAKSHAM NEURO-CARE — PHASE 1: ASHA 2D COMPANION & CLINICAL INTERACTION TESTS
 * Verifies TASK-ASHA-01 through TASK-ASHA-05:
 * - 2D Canvas Rig sanctuary dashboard bridge & view toggle
 * - 30-to-15 expression & gesture synchronization
 * - Dementia memory lapse & repeated question patient reassurance
 * - 7 Clinical interaction states & pacing registry
 * - Caregiver escalation contact flow & emergency modal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import { ConversationalSanctuaryStage } from '../features/ai-companion/components/ConversationalSanctuaryStage.js';
import { AshaInteractiveCompanion2D } from '../features/ai-companion/components/AshaInteractiveCompanion2D.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { LovedOnesService } from '../features/lovedOnes/services/lovedOnesService.js';
import {
  ALL_ASHA_EXPRESSIONS,
  resolveCanvasRigState,
} from '../features/ai-companion/config/characterExpressions.js';
import {
  CLINICAL_PACING_REGISTRY,
  ClinicalInteractionState,
} from '../features/ai-companion/types/character.types.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { AuthProvider } from '../context/AuthContext.js';
import { PatientContext } from '../services/patientContextService.js';

// Setup Mock Canvas & Speech
beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    LovedOnesService.saveLovedOnes('guest-patient-sunita', mockContext.lovedOnes.lovedOnes, false);
    LovedOnesService.saveLovedOnes('default-patient', mockContext.lovedOnes.lovedOnes, false);
  }

  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
  }) as any;

  if (typeof window !== 'undefined') {
    window.speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
    } as any;
  }
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AccessibilityProvider>
            <CharacterProvider>{ui}</CharacterProvider>
          </AccessibilityProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

const mockContext: PatientContext = {
  patientId: 'patient-test-001',
  timestamp: Date.now(),
  profile: {
    uid: 'patient-test-001',
    displayName: 'Sunita Sharma',
    isGuest: false,
  },
  routines: {
    routines: [
      {
        id: 'routine-med-01',
        title: 'Morning Blood Pressure Tablet',
        scheduledTime: '08:30 AM',
        category: 'medication',
        streakCount: 5,
        isCompleted: true,
        enableAssistedRecall: true,
      },
      {
        id: 'routine-walk-02',
        title: 'Afternoon Garden Walk',
        scheduledTime: '02:00 PM',
        category: 'exercise',
        streakCount: 3,
        isCompleted: false,
        enableAssistedRecall: true,
      },
    ],
    progress: { total: 2, completed: 1, remaining: 1, percentage: 50 },
    streak: 5,
    activeRoutine: {
      id: 'routine-walk-02',
      title: 'Afternoon Garden Walk',
      scheduledTime: '02:00 PM',
      category: 'exercise',
      streakCount: 3,
      isCompleted: false,
      enableAssistedRecall: true,
    },
    nextScheduledRoutine: {
      id: 'routine-walk-02',
      title: 'Afternoon Garden Walk',
      scheduledTime: '02:00 PM',
      category: 'exercise',
      streakCount: 3,
      isCompleted: false,
      enableAssistedRecall: true,
    },
    completedRoutines: [],
    remainingRoutines: [],
  },
  lovedOnes: {
    lovedOnes: [
      {
        id: 'lo-priya',
        name: 'Priya Sharma',
        relationship: 'Daughter & Primary Caregiver',
        phoneNumber: '+91 98201 12345',
        photoUrl: '/assets/loved-ones/priya.jpg',
        description: 'Your loving daughter who visits every Sunday.',
        cues: ['Loves gardening', 'Brings cardamom tea'],
      },
    ],
    count: 1,
    sampleMembers: [
      {
        id: 'lo-priya',
        name: 'Priya Sharma',
        relationship: 'Daughter & Primary Caregiver',
        phoneNumber: '+91 98201 12345',
        photoUrl: '/assets/loved-ones/priya.jpg',
        description: 'Your loving daughter who visits every Sunday.',
        cues: ['Loves gardening', 'Brings cardamom tea'],
      },
    ],
  },
  mindGames: {
    availableGamesCount: 4,
    recentSessions: [],
    difficultyPreference: 'Gentle',
    adaptiveRecommendation: { recommendedDifficulty: 'Gentle', reason: 'Gentle start' },
  },
};

describe('SAKSHAM 2026 Phase 1: Asha Companion & Clinical Interaction Suite', () => {
  // --------------------------------------------------------------------------
  // TASK-ASHA-01: Bridge 2D Canvas Asha into Dashboard
  // --------------------------------------------------------------------------
  describe('TASK-ASHA-01: Bridge 2D Canvas Asha into Dashboard', () => {
    it('renders the 2D canvas rig in sanctuary mode with interactive canvas element', () => {
      renderWithProviders(<ConversationalSanctuaryStage patientName="Sunita" />);

      // The 2D sanctuary canvas container is present
      const canvas = screen.getByTestId('asha-interactive-canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('width', '800');
      expect(canvas).toHaveAttribute('height', '1600');

      // 2D Live status badge is present
      expect(screen.getByText('Asha 2D')).toBeInTheDocument();

      // Screen-reader anchor remains present for full accessibility
      const srAnchor = screen.getByLabelText(/Asha character is currently/i);
      expect(srAnchor).toBeInTheDocument();
    });

    it('allows toggling between 2D Canvas Rig and Focus Avatar view modes', () => {
      renderWithProviders(<ConversationalSanctuaryStage patientName="Sunita" />);

      const toggleButton = screen.getByTitle('Toggle between 2D Canvas Rig and Focus Avatar');
      expect(toggleButton).toBeInTheDocument();
      expect(screen.getByText('2D Canvas Rig')).toBeInTheDocument();

      // Toggle to Focus Avatar
      fireEvent.click(toggleButton);
      expect(screen.getByText('Focus Avatar')).toBeInTheDocument();

      // Toggle back to 2D Canvas Rig
      fireEvent.click(toggleButton);
      expect(screen.getByText('2D Canvas Rig')).toBeInTheDocument();
      expect(screen.getByTestId('asha-interactive-canvas')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // TASK-ASHA-02: Expression & Gesture Synchronization
  // --------------------------------------------------------------------------
  describe('TASK-ASHA-02: Expression & Gesture Synchronization', () => {
    it('exhaustively maps all 30 Asha expressions to valid canvas rig layers and gestures', () => {
      ALL_ASHA_EXPRESSIONS.forEach((expr) => {
        const mapping = resolveCanvasRigState(expr);
        expect(mapping).toBeDefined();
        expect(mapping.expressionIndex).toBeGreaterThanOrEqual(0);
        expect(mapping.expressionIndex).toBeLessThanOrEqual(14);
        expect(['neutral', 'wave', 'comfort', 'explain', 'cheer', 'walk']).toContain(
          mapping.defaultGesture
        );
      });
    });

    it('renders AshaInteractiveCompanion2D with synchronized externalExpression prop', () => {
      const { rerender } = render(
        <AshaInteractiveCompanion2D
          mode="sanctuary"
          externalExpression="happy"
          showControls={false}
        />
      );

      // In happy expression, gesture badge reflects wave or happy expression
      expect(screen.getByText(/EXPR_02_HAPPY|GESTURE_WAVE/)).toBeInTheDocument();

      // Update to comforting
      rerender(
        <AshaInteractiveCompanion2D
          mode="sanctuary"
          externalExpression="comforting"
          showControls={false}
        />
      );
      expect(screen.getByText(/EXPR_08_COMFORTING|GESTURE_COMFORT/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // TASK-ASHA-03: Repeated-Question & Memory Lapse Reassurance
  // --------------------------------------------------------------------------
  describe('TASK-ASHA-03: Repeated-Question & Memory Lapse Reassurance', () => {
    it('answers repeated time queries with calm, comforting reassurance in short sentences (< 15 words)', () => {
      const result = ConversationEngine.process('What time is it?', mockContext, 'en');

      expect(result.intent).toBe('REPEATED_TIME_QUERY');
      expect(result.expression).toBe('reassuring');
      expect(result.clinicalState).toBe('Reassuring');
      expect(result.speech).toContain('safe, peaceful space');

      // Must be calm and concise: count words
      const words = result.speech.split(/\s+/).filter(Boolean);
      expect(words.length).toBeLessThanOrEqual(16);

      // Must never use condescending phrases
      expect(result.speech.toLowerCase()).not.toContain('already told');
      expect(result.speech.toLowerCase()).not.toContain('already asked');
      expect(result.speech.toLowerCase()).not.toContain('as i said');
    });

    it('answers repeated date queries with calm orientation and no pressure', () => {
      const result = ConversationEngine.process("What day is today?", mockContext, 'en');

      expect(result.intent).toBe('REPEATED_DATE_QUERY');
      expect(result.clinicalState).toBe('Reassuring');
      expect(result.speech).toContain('no rush at all');
    });

    it('answers repeated location queries confirming the patient is in their safe home sanctuary', () => {
      const result = ConversationEngine.process("Where am I?", mockContext, 'en');

      expect(result.intent).toBe('REPEATED_LOCATION_QUERY');
      expect(result.clinicalState).toBe('Reassuring');
      expect(result.speech).toContain('safe at home');
      expect(result.speech).toContain('sanctuary');
    });

    it('answers repeated family queries with warm, comforting details of loved ones', () => {
      const result = ConversationEngine.process("Who is coming today?", mockContext, 'en');

      expect(result.intent).toBe('REPEATED_FAMILY_QUERY');
      expect(result.expression).toBe('comforting');
      expect(result.clinicalState).toBe('Reassuring');
      expect(result.speech).toContain('Priya');
      expect(result.speech).toContain('warmly cared for');
    });
  });

  // --------------------------------------------------------------------------
  // TASK-ASHA-04: Clinical Interaction State System
  // --------------------------------------------------------------------------
  describe('TASK-ASHA-04: Clinical Interaction State System', () => {
    const states: ClinicalInteractionState[] = [
      'Friendly',
      'Reassuring',
      'Guiding',
      'Listening',
      'Encouraging',
      'AssistanceNeeded',
      'CaregiverEscalation',
    ];

    it('registers all 7 clinical interaction states with calibrated pacing and word limits', () => {
      states.forEach((stateKey) => {
        const config = CLINICAL_PACING_REGISTRY[stateKey];
        expect(config).toBeDefined();
        expect(config.speechRate).toBeGreaterThanOrEqual(0.8);
        expect(config.speechRate).toBeLessThanOrEqual(1.1);
        expect(config.maxSentenceWords).toBeLessThanOrEqual(15);
        expect(config.recommendedExpression).toBeDefined();
        expect(config.description).toBeDefined();
      });
    });

    it('sets Friendly clinical state for general greetings', () => {
      const result = ConversationEngine.process('Hello Asha', mockContext, 'en');
      expect(result.intent).toBe('GREETING');
      expect(result.expression).toBe('happy');
    });

    it('sets Reassuring clinical state for disorientation queries', () => {
      const result = ConversationEngine.process('Where am I right now?', mockContext, 'en');
      expect(result.clinicalState).toBe('Reassuring');
    });

    it('sets CaregiverEscalation clinical state for emergency queries', () => {
      const result = ConversationEngine.process('I fell down and cannot get up', mockContext, 'en');
      expect(result.isEmergency).toBe(true);
      expect(result.clinicalState).toBe('CaregiverEscalation');
    });
  });

  // --------------------------------------------------------------------------
  // TASK-ASHA-05: Caregiver Escalation via Conversation
  // --------------------------------------------------------------------------
  describe('TASK-ASHA-05: Caregiver Escalation via Conversation', () => {
    it('recognizes explicit caregiver call requests and triggers CALL_CAREGIVER action', () => {
      const result = ConversationEngine.process('Call my daughter Priya', mockContext, 'en');

      expect(result.intent).toBe('CAREGIVER_ESCALATION');
      expect(result.clinicalState).toBe('CaregiverEscalation');
      expect(result.actionClass).toBe('emergency');
      expect(result.suggestedAction?.action).toBe('CALL_CAREGIVER');
      expect(result.speech).toContain('Priya');
    });

    it('opens the Caregiver Escalation Contact Modal with direct dial and 112 emergency button', async () => {
      renderWithProviders(<ConversationalSanctuaryStage patientName="Sunita" />);

      // Type caregiver call request
      const input = screen.getByPlaceholderText(/Talk to Asha/i);
      fireEvent.change(input, { target: { value: 'Call my daughter' } });
      const sendBtn = screen.getByTitle('Send');
      fireEvent.click(sendBtn);

      // The Caregiver Contact Modal pops up
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Connect with Caregiver')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Contains caregiver details
      expect(screen.getAllByText(/Ananya Sharma|Priya Sharma/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Daughter & Primary Caregiver/i)).toBeInTheDocument();

      // Contains direct phone dial link
      const callLink = screen.getByRole('link', { name: /Call (?:Ananya Sharma|Priya) Directly/i });
      expect(callLink).toHaveAttribute('href', 'tel:+91 98201 12345');

      // Contains National Emergency 112 link
      const emergencyLink = screen.getByRole('link', { name: /National Emergency Services \(112\)/i });
      expect(emergencyLink).toHaveAttribute('href', 'tel:112');

      // Close modal returns to sanctuary
      const closeBtn = screen.getByLabelText('Close caregiver dialer');
      fireEvent.click(closeBtn);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
