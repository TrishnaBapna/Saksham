import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PatientDashboard } from '../pages/patient/PatientDashboard.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';

describe('PatientDashboard Component & Asha AI Companion Integration', () => {
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

  it('renders compassionate welcome message and current date banner', () => {
    renderDashboard();
    // Verify welcome heading
    expect(screen.getByRole('heading', { name: /Namaste/i })).toBeInTheDocument();
    expect(screen.getByText(/Today is peaceful and full of gentle moments/i)).toBeInTheDocument();
    expect(screen.getByText(/Saksham Neuro-Care/i)).toBeInTheDocument();
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

  it('renders Today\'s Care Journey milestones (8:30 AM, 11:00 AM, 6:00 PM)', () => {
    renderDashboard();
    expect(screen.getByText(/Today's Care Journey/i)).toBeInTheDocument();
    expect(screen.getByText(/8:30 AM/i)).toBeInTheDocument();
    expect(screen.getAllByText(/11:00 AM/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/6:00 PM/i)).toBeInTheDocument();
  });

  it('renders the upcoming 11:00 AM activity with Assisted Recall and Mark Done actions', () => {
    renderDashboard();
    expect(screen.getByText(/Next Activity: 11:00 AM/i)).toBeInTheDocument();
    expect(screen.getByText(/Morning Hydration & Gentle Arm Stretches/i)).toBeInTheDocument();

    const recallBtn = screen.getByLabelText(/Open 3-chance assisted recall helper/i);
    expect(recallBtn).toBeInTheDocument();

    const markDoneBtn = screen.getByLabelText(/Mark routine completed/i);
    expect(markDoneBtn).toBeInTheDocument();

    // Toggle completion
    fireEvent.click(markDoneBtn);
    expect(markDoneBtn).toHaveTextContent(/Completed/i);
  });

  it('renders the three core care modules with accessible button navigation', () => {
    renderDashboard();
    // Daily Routines & Care
    expect(screen.getByLabelText(/Go to Daily Routines and Care/i)).toBeInTheDocument();
    // Loved Ones
    expect(screen.getByLabelText(/Go to Loved Ones Family Memories/i)).toBeInTheDocument();
    // Mind Games
    expect(screen.getByLabelText(/Go to Mind Games Cognitive Activities/i)).toBeInTheDocument();
  });
});
