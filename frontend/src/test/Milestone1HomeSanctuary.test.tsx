import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { BottomNav } from '../components/layout/BottomNav.js';
import { AppContent } from '../App.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AuthProvider } from '../context/AuthContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { RoutineService } from '../features/routines/services/routineService.js';

describe('Milestone 1 — Patient Home Sanctuary & Navigation Consolidation', () => {
  it('renders bottom navigation with exactly 4 consolidated items without duplicate routines tab', () => {
    render(
      <BrowserRouter>
        <LanguageProvider>
          <BottomNav />
        </LanguageProvider>
      </BrowserRouter>
    );

    // 4 primary destinations
    expect(screen.getByRole('button', { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Family/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Games/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Profile/i })).toBeInTheDocument();

    // Duplicate Routines button must NOT exist in bottom navigation
    expect(screen.queryByRole('button', { name: /^Routines$/i })).not.toBeInTheDocument();
  });

  it('provides a safe redirect from legacy /patient/routines to the Home workspace /patient', () => {
    render(
      <MemoryRouter initialEntries={['/patient/routines']}>
        <AuthProvider>
          <CharacterProvider>
            <AccessibilityProvider>
              <LanguageProvider>
                <AppContent />
              </LanguageProvider>
            </AccessibilityProvider>
          </CharacterProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should safely redirect to /patient and render the Patient Home Sanctuary
    expect(screen.getByText(/Saksham Neuro-Care/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Namaste/i })).toBeInTheDocument();
    expect(screen.getByText(/Today's Completion Progress/i)).toBeInTheDocument();
  });

  it('guarantees progress calculation is derived dynamically from real routine records', () => {
    const routines = RoutineService.getRoutines('test-patient-001');
    const progress = RoutineService.calculateProgress(routines);

    expect(progress.total).toBe(routines.length);
    expect(progress.completed).toBe(routines.filter((r) => r.isCompleted).length);
    if (routines.length > 0) {
      expect(progress.percentage).toBe(
        Math.round((progress.completed / progress.total) * 100)
      );
    } else {
      expect(progress.percentage).toBe(0);
    }
  });

  it('handles empty routine state cleanly without crashing or NaN', () => {
    const emptyProgress = RoutineService.calculateProgress([]);
    expect(emptyProgress.total).toBe(0);
    expect(emptyProgress.completed).toBe(0);
    expect(emptyProgress.percentage).toBe(0);
  });
});
