import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CharacterVisualizer } from '../features/ai-companion/CharacterVisualizer.js';
import { CharacterState } from '../types/index.js';

describe('CharacterVisualizer Component', () => {
  const allStates: CharacterState[] = [
    'idle',
    'greeting',
    'listening',
    'speaking',
    'thinking',
    'happy',
    'reminder',
    'encouraging',
  ];

  it('renders Asha avatar in idle state with correct aria label', () => {
    render(<CharacterVisualizer characterId="asha" state="idle" size={140} />);
    const avatar = screen.getByLabelText(/Asha character is currently idle/i);
    expect(avatar).toBeInTheDocument();
  });

  it('renders Kabir avatar in greeting state with correct aria label', () => {
    render(<CharacterVisualizer characterId="kabir" state="greeting" size={140} />);
    const avatar = screen.getByLabelText(/Kabir character is currently greeting/i);
    expect(avatar).toBeInTheDocument();
  });

  it('renders all 8 emotional/interactive states correctly for Asha', () => {
    allStates.forEach((st) => {
      const { unmount } = render(<CharacterVisualizer characterId="asha" state={st} size={140} />);
      expect(screen.getByLabelText(new RegExp(`Asha character is currently ${st}`, 'i'))).toBeInTheDocument();
      unmount();
    });
  });
});
