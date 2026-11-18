import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AshaDemoPage } from '../pages/demo/AshaDemoPage.js';
import { AshaInteractiveCompanion2D } from '../features/ai-companion/components/AshaInteractiveCompanion2D.js';

// Mock Canvas getContext
beforeEach(() => {
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

  // Mock SpeechSynthesis
  if (typeof window !== 'undefined') {
    window.speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
    } as any;
  }
});

describe('Asha 2D Live Interactive Companion Demo', () => {
  it('renders AshaDemoPage with live demo badges and header links', () => {
    render(
      <BrowserRouter>
        <AshaDemoPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Asha 2D Companion')).toBeInTheDocument();
    expect(screen.getByText('Live Demo')).toBeInTheDocument();
    expect(screen.getByText('Patient Sanctuary')).toBeInTheDocument();
    expect(screen.getByText('Caregiver Hub')).toBeInTheDocument();
    expect(screen.getByText('Back to Saksham')).toBeInTheDocument();
  });

  it('renders AshaInteractiveCompanion2D canvas and diagnostic controls', () => {
    render(
      <BrowserRouter>
        <AshaInteractiveCompanion2D showControls={true} />
      </BrowserRouter>
    );

    expect(screen.getByText('Asha 2D Live')).toBeInTheDocument();
    expect(screen.getByText('Companion Studio')).toBeInTheDocument();
    expect(screen.getByText('Facial Expression (15 Approved)')).toBeInTheDocument();
    expect(screen.getByText('Gestures & Locomotion')).toBeInTheDocument();
    expect(screen.getByText('Mouth Visemes (Lip-Sync Shapes)')).toBeInTheDocument();
  });

  it('allows selecting expressions across all 15 approved expressions', () => {
    render(
      <BrowserRouter>
        <AshaInteractiveCompanion2D showControls={true} />
      </BrowserRouter>
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Change to Happy (id 1)
    fireEvent.change(select, { target: { value: '1' } });
    expect(screen.getByText('EXPR_02_HAPPY')).toBeInTheDocument();

    // Change to Explaining (id 9)
    fireEvent.change(select, { target: { value: '9' } });
    expect(screen.getByText('EXPR_10_EXPLAINING')).toBeInTheDocument();
  });

  it('triggers gestures and resets to neutral state', () => {
    render(
      <BrowserRouter>
        <AshaInteractiveCompanion2D showControls={true} />
      </BrowserRouter>
    );

    const waveBtn = screen.getByRole('button', { name: /👋 Wave/i });
    fireEvent.click(waveBtn);
    expect(screen.getByText('GESTURE_WAVE')).toBeInTheDocument();

    const comfortBtn = screen.getByRole('button', { name: /💖 Comfort/i });
    fireEvent.click(comfortBtn);
    expect(screen.getByText('GESTURE_COMFORT')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /Reset to Clean Neutral Companion/i });
    fireEvent.click(resetBtn);
    expect(screen.getByText('IDLE_BREATHING')).toBeInTheDocument();
  });

  it('triggers speech synthesis presets with lip-sync modulation', () => {
    render(
      <BrowserRouter>
        <AshaInteractiveCompanion2D showControls={true} />
      </BrowserRouter>
    );

    const greetingBtn = screen.getByText('Warm Greeting');
    fireEvent.click(greetingBtn);

    expect(screen.getByText('SPEECH_ACTIVE')).toBeInTheDocument();
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });
});
