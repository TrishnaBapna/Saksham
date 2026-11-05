import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AICompanion } from '../features/ai-companion/AICompanion.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';

describe('AICompanion Component & Safe Navigation Dispatcher', () => {
  const renderCompanion = (onNavigateAction = vi.fn()) => {
    return render(
      <BrowserRouter>
        <LanguageProvider>
          <CharacterProvider>
            <AICompanion onNavigateAction={onNavigateAction} />
          </CharacterProvider>
        </LanguageProvider>
      </BrowserRouter>
    );
  };

  it('renders companion branding and initial welcoming greeting', () => {
    renderCompanion();
    expect(screen.getByText(/Saksham AI Companion/i)).toBeInTheDocument();
    expect(screen.getByText(/Namaste, Sunita! I'm Asha/i)).toBeInTheDocument();
  });

  it('allows user to switch between Asha and Kabir', () => {
    renderCompanion();
    const switchBtn = screen.getByTitle(/Switch companion character/i);
    expect(switchBtn).toHaveTextContent(/Switch to Kabir/i);

    fireEvent.click(switchBtn);
    expect(switchBtn).toHaveTextContent(/Switch to Asha/i);
  });

  it('dispatches safe whitelisted action for game queries', async () => {
    const handleAction = vi.fn();
    renderCompanion(handleAction);

    // Click quick chip "Play a memory game"
    const gameChip = screen.getByText(/Play a memory game/i);
    fireEvent.click(gameChip);

    await waitFor(() => {
      expect(handleAction).toHaveBeenCalledWith('NAVIGATE_MIND_GAMES', undefined);
    }, { timeout: 2500 });
  });
});
