import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PatientDashboard } from '../pages/patient/PatientDashboard.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';

describe('PatientDashboard — Milestone 1 Central Daily Care Sanctuary', () => {
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

  it('renders compassionate welcome message, personalized greeting and Saksham Neuro-Care header', () => {
    renderDashboard();
    // Verify welcome heading
    expect(screen.getByRole('heading', { name: /Namaste/i })).toBeInTheDocument();
    expect(screen.getByText(/Today is peaceful and full of gentle moments/i)).toBeInTheDocument();
    expect(screen.getByText(/Saksham Neuro-Care/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Care Sanctuary • Synchronized/i)).toBeInTheDocument();
  });

  it('renders Asha AI Companion with interactive avatar and greeting', () => {
    renderDashboard();
    expect(screen.getByText(/Saksham AI Companion/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Asha character is currently/i)).toBeInTheDocument();
  });

  it('allows minimizing and expanding AI companion for pure button-driven navigation', () => {
    renderDashboard();
    // Locate the minimize toggle button
    const minimizeBtn = screen.getByLabelText(/Minimize Companion/i);
    expect(minimizeBtn).toBeInTheDocument();

    // Click minimize
    fireEvent.click(minimizeBtn);

    // Expect compact bar to be displayed
    expect(screen.getByText(/Asha is right here with you/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Chat/i)).toBeInTheDocument();

    // Click expand
    fireEvent.click(screen.getByText(/Open Chat/i));
    expect(screen.getByLabelText(/Minimize Companion/i)).toBeInTheDocument();
  });

  it('renders dynamic Daily Progress Ring calculated from actual patient routine records', () => {
    renderDashboard();
    // Progress card elements
    expect(screen.getByText(/Today's Completion Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/days gentle streak/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getAllByText(/completed/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the central Daily Routine workspace directly on the Home page with two views', () => {
    renderDashboard();
    // Two subtab switcher buttons directly on Home
    const assistedRecallTab = screen.getByRole('button', {
      name: /View Step-by-Step 3-Chance Assisted Recall/i,
    });
    const checklistTab = screen.getByRole('button', {
      name: /View Direct Schedule Checklist/i,
    });

    expect(assistedRecallTab).toBeInTheDocument();
    expect(checklistTab).toBeInTheDocument();

    // Default view is Assisted Recall
    expect(
      screen.getByText(/Interactive Activity Cues \(3-Chance Assisted Recall\)/i)
    ).toBeInTheDocument();

    // Switch to Direct Schedule Checklist
    fireEvent.click(checklistTab);
    expect(screen.getByText(/Direct Routine Schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/Mark completed, delay by minutes, or read aloud/i)).toBeInTheDocument();

    // Switch back to Assisted Recall
    fireEvent.click(assistedRecallTab);
    expect(
      screen.getByText(/Interactive Activity Cues \(3-Chance Assisted Recall\)/i)
    ).toBeInTheDocument();
  });

  it('confirms obsolete and duplicate cards are completely removed from Home page', () => {
    renderDashboard();
    // Obsolete Today's Care Journey
    expect(screen.queryByText(/Today's Care Journey/i)).not.toBeInTheDocument();

    // Obsolete standalone Next Activity 11:00 AM card
    expect(screen.queryByText(/Next Activity: 11:00 AM/i)).not.toBeInTheDocument();

    // Obsolete Explore Your Care Sanctuary shortcut cards
    expect(screen.queryByLabelText(/Go to Daily Routines and Care/i)).not.toBeInTheDocument();
  });
});
