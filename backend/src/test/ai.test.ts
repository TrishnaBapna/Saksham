import { describe, it, expect } from 'vitest';
import { processAIConversation, isActionWhitelisted } from '../services/aiService.js';

describe('Backend AI Service & Intent Whitelist', () => {
  it('correctly maps "I want to play a game" to NAVIGATE_MIND_GAMES', async () => {
    const response = await processAIConversation({
      patientId: 'patient-123',
      transcript: 'I want to play a game'
    });

    expect(response.suggestedAction?.action).toBe('NAVIGATE_MIND_GAMES');
    expect(response.characterState).toBe('happy');
    expect(response.speech).toContain('memory game');
  });

  it('correctly maps 11 AM query to NAVIGATE_ROUTINES', async () => {
    const response = await processAIConversation({
      patientId: 'patient-123',
      transcript: 'What should I do at 11 AM?'
    });

    expect(response.suggestedAction?.action).toBe('NAVIGATE_ROUTINES');
    expect(response.characterState).toBe('reminder');
    expect(response.speech).toContain('11:00 AM');
  });

  it('correctly maps family query to NAVIGATE_LOVED_ONES', async () => {
    const response = await processAIConversation({
      patientId: 'patient-123',
      transcript: 'I want to see my daughter'
    });

    expect(response.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
    expect(response.characterState).toBe('encouraging');
  });

  it('correctly maps missing item query to NAVIGATE_ROOM_MEMORY', async () => {
    const response = await processAIConversation({
      patientId: 'patient-123',
      transcript: 'Where did I keep my glasses?'
    });

    expect(response.suggestedAction?.action).toBe('NAVIGATE_ROOM_MEMORY');
    expect(response.characterState).toBe('thinking');
  });

  it('validates whitelisted actions and rejects arbitrary injection', () => {
    expect(isActionWhitelisted('NAVIGATE_MIND_GAMES')).toBe(true);
    expect(isActionWhitelisted('NAVIGATE_ROUTINES')).toBe(true);
    expect(isActionWhitelisted('DROP_DATABASE')).toBe(false);
    expect(isActionWhitelisted('RUN_SYSTEM_SHELL')).toBe(false);
  });
});
