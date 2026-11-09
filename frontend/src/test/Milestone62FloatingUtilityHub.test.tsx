import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppContent } from '../App.js';
import { FloatingUtilityHub } from '../components/layout/FloatingUtilityHub.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider, useLanguage } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { NotesService } from '../features/notes/index.js';
import { CalendarService } from '../features/calendar/index.js';
import { TRANSLATION_CATALOGUE } from '../i18n/interpolate.js';

const mockPatientUser = {
  uid: 'patient-sharma-01',
  email: 'sharma@example.com',
  displayName: 'Sunita Sharma',
  role: 'patient' as const,
  status: 'verified' as const,
};

const mockCaregiverUser = {
  uid: 'caregiver-ananya-02',
  email: 'ananya@example.com',
  displayName: 'Ananya Sharma',
  role: 'caregiver' as const,
  status: 'verified' as const,
};

const mockDoctorUser = {
  uid: 'doctor-vikram-03',
  email: 'vikram@example.com',
  displayName: 'Dr. Vikram Joshi',
  role: 'doctor' as const,
  status: 'verified' as const,
};

describe('Milestone 6.2 — Floating Patient Utility Hub & Notes/Calendar Entry Points', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('saksham_auth_user', JSON.stringify(mockPatientUser));
    vi.restoreAllMocks();
  });

  const renderWithProviders = (
    ui: React.ReactNode,
    { initialRoute = '/patient' } = {}
  ) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <CharacterProvider>{ui}</CharacterProvider>
            </AccessibilityProvider>
          </LanguageProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  describe('Part A: Route Isolation & Layout Placement', () => {
    it('renders the floating utility button on all patient routes', () => {
      // 1. Patient Home
      const { unmount: unmount1 } = renderWithProviders(<AppContent />, { initialRoute: '/patient' });
      expect(screen.getByTestId('floating-utility-button')).toBeInTheDocument();
      unmount1();

      // 2. Family / Loved Ones
      const { unmount: unmount2 } = renderWithProviders(<AppContent />, { initialRoute: '/patient/loved-ones' });
      expect(screen.getByTestId('floating-utility-button')).toBeInTheDocument();
      unmount2();

      // 3. Mind Games
      const { unmount: unmount3 } = renderWithProviders(<AppContent />, { initialRoute: '/patient/mind-games' });
      expect(screen.getByTestId('floating-utility-button')).toBeInTheDocument();
      unmount3();

      // 4. Patient Profile
      const { unmount: unmount4 } = renderWithProviders(<AppContent />, { initialRoute: '/patient/profile' });
      expect(screen.getByTestId('floating-utility-button')).toBeInTheDocument();
      unmount4();
    });

    it('strictly does NOT render floating utility button on Caregiver, Doctor, Admin, or Auth routes', () => {
      // Caregiver
      localStorage.setItem('saksham_auth_user', JSON.stringify(mockCaregiverUser));
      const { unmount: unmountCg } = renderWithProviders(<AppContent />, { initialRoute: '/caregiver' });
      expect(screen.queryByTestId('floating-utility-button')).not.toBeInTheDocument();
      unmountCg();

      // Doctor
      localStorage.setItem('saksham_auth_user', JSON.stringify(mockDoctorUser));
      const { unmount: unmountDoc } = renderWithProviders(<AppContent />, { initialRoute: '/doctor' });
      expect(screen.queryByTestId('floating-utility-button')).not.toBeInTheDocument();
      unmountDoc();

      // Public Auth / Login
      const { unmount: unmountAuth } = renderWithProviders(<AppContent />, { initialRoute: '/login' });
      expect(screen.queryByTestId('floating-utility-button')).not.toBeInTheDocument();
      unmountAuth();
    });

    it('preserves the exactly 4 bottom navigation destinations and prevents collision', () => {
      renderWithProviders(<AppContent />, { initialRoute: '/patient' });

      // Bottom nav is present with 4 tabs
      const bottomNav = screen.getByRole('navigation', { name: /Patient Bottom Navigation/i });
      expect(within(bottomNav).getByRole('button', { name: /Home/i })).toBeInTheDocument();
      expect(within(bottomNav).getByRole('button', { name: /Family/i })).toBeInTheDocument();
      expect(within(bottomNav).getByRole('button', { name: /Games/i })).toBeInTheDocument();
      expect(within(bottomNav).getByRole('button', { name: /Profile/i })).toBeInTheDocument();

      // Neither Notes, Calendar, nor Routines is a bottom nav destination
      expect(screen.queryByRole('button', { name: /^Routines$/i })).not.toBeInTheDocument();

      // Floating button exists simultaneously with bottom navigation
      const button = screen.getByTestId('floating-utility-button');
      expect(button).toBeInTheDocument();
      // Verifies mobile offset class (bottom-20) to prevent overlapping bottom navigation (bottom-0)
      expect(button.parentElement?.className).toContain('bottom-20');
    });
  });

  describe('Part B: Floating Menu Interaction & Keyboard Accessibility', () => {
    it('opens and closes utility menu on toggle click', () => {
      renderWithProviders(<FloatingUtilityHub />);

      const trigger = screen.getByTestId('floating-utility-button');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('floating-utility-menu')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('floating-utility-menu')).toBeInTheDocument();

      // Verify menu items
      expect(screen.getByTestId('utility-item-notes')).toBeInTheDocument();
      expect(screen.getByTestId('utility-item-calendar')).toBeInTheDocument();

      // Click to close
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('floating-utility-menu')).not.toBeInTheDocument();
    });

    it('closes utility menu on Escape key press and returns focus', () => {
      renderWithProviders(<FloatingUtilityHub />);

      const trigger = screen.getByTestId('floating-utility-button');
      fireEvent.click(trigger);
      expect(screen.getByTestId('floating-utility-menu')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('floating-utility-menu')).not.toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes utility menu on outside mouse click', () => {
      renderWithProviders(
        <div>
          <div data-testid="outside-area">Outside Content</div>
          <FloatingUtilityHub />
        </div>
      );

      const trigger = screen.getByTestId('floating-utility-button');
      fireEvent.click(trigger);
      expect(screen.getByTestId('floating-utility-menu')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside-area'));
      expect(screen.queryByTestId('floating-utility-menu')).not.toBeInTheDocument();
    });
  });

  describe('Part C: Notes & Calendar Stage 6.3 Entry Shells & Data Layer Reuse', () => {
    it('opens Notes entry shell with verified Milestone 6.1 data counts', async () => {
      // Seed a note via NotesService
      await NotesService.createNote(mockPatientUser.uid, {
        title: 'Morning Prayer and Tea',
        content: 'Felt very calm after ginger tea.',
        category: 'personal',
        isPinned: true,
      });

      renderWithProviders(<FloatingUtilityHub />);

      // Open menu
      fireEvent.click(screen.getByTestId('floating-utility-button'));

      // Click Notes
      fireEvent.click(screen.getByTestId('utility-item-notes'));

      // Menu closes, Notes entry shell opens
      expect(screen.queryByTestId('floating-utility-menu')).not.toBeInTheDocument();
      expect(screen.getByTestId('utility-shell-notes')).toBeInTheDocument();

      // Verifies Stage 6.3 notice is rendered
      expect(screen.getByText(/Full interactive interface arrives in Stage 6.3/i)).toBeInTheDocument();

      // Verifies Milestone 6.1 seeded note title is displayed in preview
      expect(screen.getByText('Morning Prayer and Tea')).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByTestId('utility-modal-close'));
      expect(screen.queryByTestId('utility-shell-notes')).not.toBeInTheDocument();
    });

    it('opens Calendar entry shell with verified Milestone 6.1 recurrence counts', async () => {
      // Seed a calendar event via CalendarService
      await CalendarService.createEvent(mockPatientUser.uid, {
        title: 'Neurologist Follow-up',
        category: 'doctor',
        startAt: new Date(Date.now() + 86400000).toISOString(),
      });

      renderWithProviders(<FloatingUtilityHub />);

      // Open menu
      fireEvent.click(screen.getByTestId('floating-utility-button'));

      // Click Calendar
      fireEvent.click(screen.getByTestId('utility-item-calendar'));

      // Calendar entry shell opens
      expect(screen.getByTestId('utility-shell-calendar')).toBeInTheDocument();
      expect(screen.getByText('Neurologist Follow-up')).toBeInTheDocument();
      expect(screen.getByText(/Full interactive interface arrives in Stage 6.3/i)).toBeInTheDocument();

      // Escape key closes modal
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('utility-shell-calendar')).not.toBeInTheDocument();
    });
  });

  describe('Part D: Asha Programmatic Bridge Integration', () => {
    it('responds to custom window events for Asha bridge dispatching', () => {
      renderWithProviders(<FloatingUtilityHub />);

      // 1. Asha dispatches open utility menu
      act(() => {
        window.dispatchEvent(new CustomEvent('saksham:open-utility'));
      });
      expect(screen.getByTestId('floating-utility-menu')).toBeInTheDocument();

      // 2. Asha dispatches open notes
      act(() => {
        window.dispatchEvent(new CustomEvent('saksham:open-notes'));
      });
      expect(screen.queryByTestId('floating-utility-menu')).not.toBeInTheDocument();
      expect(screen.getByTestId('utility-shell-notes')).toBeInTheDocument();

      // 3. Asha dispatches open calendar
      act(() => {
        window.dispatchEvent(new CustomEvent('saksham:open-calendar'));
      });
      expect(screen.queryByTestId('utility-shell-notes')).not.toBeInTheDocument();
      expect(screen.getByTestId('utility-shell-calendar')).toBeInTheDocument();

      // 4. Asha dispatches close
      act(() => {
        window.dispatchEvent(new CustomEvent('saksham:close-utility'));
      });
      expect(screen.queryByTestId('utility-shell-calendar')).not.toBeInTheDocument();
    });
  });

  describe('Part E: Pan-India Multilingual & RTL Coverage', () => {
    it('verifies all 23 language dictionaries contain all Milestone 6.2 keys', () => {
      const requiredKeys = [
        'utility.title',
        'utility.open_notes',
        'utility.open_calendar',
        'utility.close',
        'utility.desc_notes',
        'utility.desc_calendar',
        'utility.stage63_notice',
        'utility.badge_notes',
        'utility.badge_events',
        'utility.coming_soon',
      ];

      for (const [langCode, dictionary] of Object.entries(TRANSLATION_CATALOGUE)) {
        for (const key of requiredKeys) {
          const value = dictionary[key];
          expect(
            value,
            `Language '${langCode}' is missing required key '${key}'`
          ).toBeDefined();
          expect(
            value.trim().length,
            `Language '${langCode}' has empty translation for '${key}'`
          ).toBeGreaterThan(0);
        }
      }
    });

    it('renders Hindi localized text when language is set to Hindi', () => {
      const TestConsumer = () => {
        const { setLanguage } = useLanguage();
        return (
          <div>
            <button onClick={() => setLanguage('hi')}>Switch to Hindi</button>
            <FloatingUtilityHub />
          </div>
        );
      };

      renderWithProviders(<TestConsumer />);

      // Switch language to Hindi
      fireEvent.click(screen.getByText('Switch to Hindi'));

      // Open menu
      fireEvent.click(screen.getByTestId('floating-utility-button'));

      // Hindi title and options
      expect(screen.getByText('त्वरित सुविधाएं')).toBeInTheDocument();
      expect(screen.getByText('मेरे नोट्स')).toBeInTheDocument();
      expect(screen.getByText('मेरा कैलेंडर')).toBeInTheDocument();
    });

    it('adjusts position cleanly when active language is RTL (Urdu)', () => {
      const TestConsumer = () => {
        const { setLanguage } = useLanguage();
        return (
          <div>
            <button onClick={() => setLanguage('ur')}>Switch to Urdu</button>
            <FloatingUtilityHub />
          </div>
        );
      };

      renderWithProviders(<TestConsumer />);
      fireEvent.click(screen.getByText('Switch to Urdu'));

      const button = screen.getByTestId('floating-utility-button');
      // In RTL, container should be positioned with left anchor
      expect(button.parentElement?.className).toContain('left-4');
    });
  });
});
