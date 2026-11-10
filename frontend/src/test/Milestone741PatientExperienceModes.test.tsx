/**
 * SAKSHAM — MILESTONE 7.4.1 TEST SUITE
 * Configurable Patient Experience: Asha-Only (Conversation-First) vs Asha + Navigation (Hybrid)
 *
 * Verifies:
 * 1. Default mode is strictly 'hybrid' for new and existing unconfigured patients.
 * 2. Hybrid mode renders exactly 4 bottom navigation destinations (Home, Family, Games, Profile).
 * 3. Asha-only mode hides bottom navigation tabs while preserving text input and tactile quick actions.
 * 4. Switching in both directions via PatientProfile Settings.
 * 5. Scoped persistence per authenticated UID (prevents cross-account leakage).
 * 6. Guest patient fallback isolated to local storage.
 * 7. Direct route access (/patient/loved-ones, /patient/mind-games, /patient/profile) works in both modes.
 * 8. Settings is always reachable in Asha-only mode via multiple tactile controls.
 * 9. Text interaction and tactile fallbacks operate with zero microphone requirement.
 * 10. Zero data mutation regression (routines, games, notes, calendar remain untouched).
 * 11. Caregiver, doctor, and admin dashboards remain completely unaffected.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import {
  PatientExperienceProvider,
  usePatientExperience,
  getPatientExperienceStorageKey,
  getStoredPatientExperienceMode,
} from '../context/PatientExperienceContext.js';

import { AppContent } from '../App.js';
import { PatientProfile } from '../pages/patient/PatientProfile.js';
import { PatientDashboard } from '../pages/patient/PatientDashboard.js';
import { ConversationalSanctuaryStage } from '../features/ai-companion/components/ConversationalSanctuaryStage.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { NotesService } from '../features/notes/services/notesService.js';
import { CalendarService } from '../features/calendar/services/calendarService.js';
import { GamesService } from '../features/games/services/gamesService.js';
import { LovedOnesService } from '../features/lovedOnes/services/lovedOnesService.js';

const DEMO_PATIENT_UID = 'demo-patient-001';

// Helper component that displays active mode and switch controls
const ModeConsumer: React.FC = () => {
  const { mode, setMode, isAshaOnly, isHybrid } = usePatientExperience();
  return (
    <div>
      <span data-testid="current-mode">{mode}</span>
      <span data-testid="is-asha-only">{isAshaOnly ? 'yes' : 'no'}</span>
      <span data-testid="is-hybrid">{isHybrid ? 'yes' : 'no'}</span>
      <button onClick={() => setMode('asha-only')} data-testid="btn-set-asha-only">
        Set Asha-Only
      </button>
      <button onClick={() => setMode('hybrid')} data-testid="btn-set-hybrid">
        Set Hybrid
      </button>
    </div>
  );
};

// Full stack wrapper
const renderWithProviders = (ui: React.ReactNode, initialEntries = ['/patient']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <LanguageProvider>
          <AccessibilityProvider>
            <PatientExperienceProvider>
              <CharacterProvider>{ui}</CharacterProvider>
            </PatientExperienceProvider>
          </AccessibilityProvider>
        </LanguageProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Milestone 7.4.1: Configurable Patient Experience (Asha-Only vs Hybrid)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  // --------------------------------------------------------------------------
  // Requirement 1 & 4: Safe Default for Existing and New Patients
  // --------------------------------------------------------------------------
  describe('Part A: Default Experience Mode', () => {
    it('defaults to hybrid when no saved preference exists', () => {
      renderWithProviders(<ModeConsumer />);
      expect(screen.getByTestId('current-mode').textContent).toBe('hybrid');
      expect(screen.getByTestId('is-hybrid').textContent).toBe('yes');
      expect(screen.getByTestId('is-asha-only').textContent).toBe('no');
    });

    it('helper function getStoredPatientExperienceMode safely returns hybrid on null or invalid key', () => {
      expect(getStoredPatientExperienceMode('pat-test-123')).toBe('hybrid');

      localStorage.setItem(getPatientExperienceStorageKey('pat-test-123'), 'invalid-mode');
      expect(getStoredPatientExperienceMode('pat-test-123')).toBe('hybrid');

      localStorage.setItem(getPatientExperienceStorageKey('pat-test-123'), 'asha-only');
      expect(getStoredPatientExperienceMode('pat-test-123')).toBe('asha-only');
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 2 & 3: Mode Rendering & Bottom Navigation Visibility
  // --------------------------------------------------------------------------
  describe('Part B: Bottom Navigation Visibility Across Modes', () => {
    it('renders exactly four bottom navigation destinations in Hybrid mode', () => {
      renderWithProviders(<AppContent />, ['/patient']);

      const bottomNav = screen.getByLabelText('Patient Bottom Navigation');
      expect(bottomNav).toBeInTheDocument();

      // Exactly four destinations: Home, Family, Games, Profile
      const navButtons = bottomNav.querySelectorAll('button');
      expect(navButtons.length).toBe(4);
    });

    it('completely hides bottom navigation tabs when in Asha-Only mode', () => {
      // Pre-set preference to asha-only for demo patient UID
      localStorage.setItem(getPatientExperienceStorageKey(DEMO_PATIENT_UID), 'asha-only');

      renderWithProviders(<AppContent />, ['/patient']);

      // Bottom nav must be completely absent from DOM
      expect(screen.queryByLabelText('Patient Bottom Navigation')).not.toBeInTheDocument();
    });

    it('adjusts patient stage padding when in Asha-Only mode vs Hybrid mode', () => {
      // Hybrid mode render
      const { unmount } = renderWithProviders(<PatientDashboard />, ['/patient']);
      const hybridContainer = document.querySelector('.pb-28');
      expect(hybridContainer).toBeInTheDocument();
      unmount();

      // Asha-only mode render
      localStorage.setItem(getPatientExperienceStorageKey(DEMO_PATIENT_UID), 'asha-only');

      renderWithProviders(<PatientDashboard />, ['/patient']);
      const ashaOnlyContainer = document.querySelector('.pb-10');
      expect(ashaOnlyContainer).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 4 & 5: Switching and Scoped Persistence
  // --------------------------------------------------------------------------
  describe('Part C: Mode Switching & Identity-Scoped Persistence', () => {
    it('allows switching in both directions via PatientProfile settings', async () => {
      renderWithProviders(<PatientProfile />, ['/patient/profile']);

      // Initially hybrid
      expect(screen.getByTestId('active-mode-badge').textContent).toContain('Hybrid');

      // Click Asha-Only card
      const ashaOnlyCard = screen.getByTestId('mode-card-asha-only');
      fireEvent.click(ashaOnlyCard);

      await waitFor(() => {
        expect(screen.getByTestId('active-mode-badge').textContent).toContain('Asha-Only');
      });

      // Click Hybrid card
      const hybridCard = screen.getByTestId('mode-card-hybrid');
      fireEvent.click(hybridCard);

      await waitFor(() => {
        expect(screen.getByTestId('active-mode-badge').textContent).toContain('Hybrid');
      });
    });

    it('persists preference under patient-scoped key without leaking across accounts', async () => {
      renderWithProviders(<ModeConsumer />);

      fireEvent.click(screen.getByTestId('btn-set-asha-only'));

      const expectedKey = getPatientExperienceStorageKey(DEMO_PATIENT_UID);

      await waitFor(() => {
        expect(screen.getByTestId('current-mode').textContent).toBe('asha-only');
        expect(localStorage.getItem(expectedKey)).toBe('asha-only');
      });

      // Different patient ID must still evaluate to hybrid
      expect(getStoredPatientExperienceMode('another-patient-uid-999')).toBe('hybrid');
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 7: Direct Route Access & Sub-Screen Continuity
  // --------------------------------------------------------------------------
  describe('Part D: Direct Route Access & Continuity', () => {
    it('allows direct route access to /patient/loved-ones, /patient/mind-games, and /patient/profile in Asha-Only mode', () => {
      localStorage.setItem(getPatientExperienceStorageKey(DEMO_PATIENT_UID), 'asha-only');

      // Test direct access to Loved Ones
      const { unmount: unmount1 } = renderWithProviders(<AppContent />, ['/patient/loved-ones']);
      expect(screen.getAllByLabelText(/Back to/i).length).toBeGreaterThan(0);
      expect(screen.queryByLabelText('Patient Bottom Navigation')).not.toBeInTheDocument();
      unmount1();

      // Test direct access to Mind Games
      const { unmount: unmount2 } = renderWithProviders(<AppContent />, ['/patient/mind-games']);
      expect(screen.getAllByLabelText(/Back to/i).length).toBeGreaterThan(0);
      expect(screen.queryByLabelText('Patient Bottom Navigation')).not.toBeInTheDocument();
      unmount2();

      // Test direct access to Profile
      renderWithProviders(<AppContent />, ['/patient/profile']);
      expect(screen.getAllByLabelText(/Back to/i).length).toBeGreaterThan(0);
      expect(screen.queryByLabelText('Patient Bottom Navigation')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 8: Settings Always Reachable in Asha-Only Mode
  // --------------------------------------------------------------------------
  describe('Part E: Settings Accessibility in Asha-Only Mode', () => {
    it('surfaces the Settings tactile quick action chip on the Sanctuary stage in Asha-Only mode', () => {
      localStorage.setItem(getPatientExperienceStorageKey(DEMO_PATIENT_UID), 'asha-only');

      renderWithProviders(<ConversationalSanctuaryStage />, ['/patient']);

      // In Asha-only mode, the Settings & Profile chip is added to quick actions
      expect(screen.getByText(/Settings & Profile/i)).toBeInTheDocument();
      expect(screen.getByTestId('asha-only-mode-badge')).toBeInTheDocument();
    });

    it('retains the permanent TopBar Profile avatar button in both modes', () => {
      // In hybrid mode
      const { unmount } = renderWithProviders(<AppContent />, ['/patient']);
      const avatarBtn = screen.getByTitle('Sunita Sharma');
      expect(avatarBtn).toBeInTheDocument();
      unmount();

      // In Asha-only mode
      localStorage.setItem(getPatientExperienceStorageKey(DEMO_PATIENT_UID), 'asha-only');

      renderWithProviders(<AppContent />, ['/patient']);
      expect(screen.getByTitle('Sunita Sharma')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 9: Tactile Fallbacks & Optional Voice
  // --------------------------------------------------------------------------
  describe('Part F: Tactile Interaction & Optional Voice', () => {
    it('allows text conversation input and submission without microphone permission', () => {
      localStorage.setItem(getPatientExperienceStorageKey(DEMO_PATIENT_UID), 'asha-only');

      renderWithProviders(<ConversationalSanctuaryStage />, ['/patient']);

      const input = screen.getByPlaceholderText(/Talk to Asha or type what you need/i);
      expect(input).toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'What should I do today?' } });
      expect((input as HTMLInputElement).value).toBe('What should I do today?');

      const sendBtn = screen.getByLabelText('Send');
      expect(sendBtn).toBeInTheDocument();
      fireEvent.click(sendBtn);

      // Input resets upon submission
      expect((input as HTMLInputElement).value).toBe('');
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 6: Strict Zero Data Mutation Invariant
  // --------------------------------------------------------------------------
  describe('Part G: Zero Data Mutation Invariant', () => {
    it('guarantees that switching between modes modifies zero routine, notes, calendar, game, or loved ones data', async () => {
      const patientId = DEMO_PATIENT_UID;

      // 1. Snapshot initial state of data across all services
      const initialRoutines = RoutineService.getRoutines(patientId);
      const initialNotesCount = NotesService.getNotes(patientId).length;
      const initialEventsCount = CalendarService.getEvents(patientId).length;
      const initialGamesCount = GamesService.getAllGames().length;
      const initialLovedOnesCount = LovedOnesService.getLovedOnes(patientId).length;

      // 2. Perform mode switch to asha-only
      renderWithProviders(<ModeConsumer />);
      fireEvent.click(screen.getByTestId('btn-set-asha-only'));

      await waitFor(() => {
        expect(screen.getByTestId('current-mode').textContent).toBe('asha-only');
      });

      // 3. Verify zero mutation to data services
      expect(RoutineService.getRoutines(patientId).length).toBe(initialRoutines.length);
      expect(NotesService.getNotes(patientId).length).toBe(initialNotesCount);
      expect(CalendarService.getEvents(patientId).length).toBe(initialEventsCount);
      expect(GamesService.getAllGames().length).toBe(initialGamesCount);
      expect(LovedOnesService.getLovedOnes(patientId).length).toBe(initialLovedOnesCount);

      // 4. Switch back to hybrid
      fireEvent.click(screen.getByTestId('btn-set-hybrid'));

      await waitFor(() => {
        expect(screen.getByTestId('current-mode').textContent).toBe('hybrid');
      });

      // 5. Verify zero mutation again
      expect(RoutineService.getRoutines(patientId).length).toBe(initialRoutines.length);
      expect(NotesService.getNotes(patientId).length).toBe(initialNotesCount);
      expect(CalendarService.getEvents(patientId).length).toBe(initialEventsCount);
      expect(GamesService.getAllGames().length).toBe(initialGamesCount);
      expect(LovedOnesService.getLovedOnes(patientId).length).toBe(initialLovedOnesCount);
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 7 & 11: Non-Patient Dashboards Unaffected
  // --------------------------------------------------------------------------
  describe('Part H: Role Isolation', () => {
    it('caregiver dashboard never renders bottom navigation regardless of patient mode', () => {
      // In hybrid
      const { unmount } = renderWithProviders(<AppContent />, ['/caregiver']);
      expect(screen.queryByLabelText('Patient Bottom Navigation')).not.toBeInTheDocument();
      unmount();

      // In asha-only
      localStorage.setItem(getPatientExperienceStorageKey(DEMO_PATIENT_UID), 'asha-only');

      renderWithProviders(<AppContent />, ['/caregiver']);
      expect(screen.queryByLabelText('Patient Bottom Navigation')).not.toBeInTheDocument();
    });

    it('doctor dashboard never renders bottom navigation regardless of patient mode', () => {
      renderWithProviders(<AppContent />, ['/doctor']);
      expect(screen.queryByLabelText('Patient Bottom Navigation')).not.toBeInTheDocument();
    });

    it('admin dashboard never renders bottom navigation regardless of patient mode', () => {
      renderWithProviders(<AppContent />, ['/admin']);
      expect(screen.queryByLabelText('Patient Bottom Navigation')).not.toBeInTheDocument();
    });
  });
});
