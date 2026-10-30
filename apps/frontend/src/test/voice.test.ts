import { describe, it, expect } from 'vitest';
import { voiceService } from '@/services/voiceService';
import { audioSynthesizer } from '@/services/audioService';

describe('Voice & Audio Services', () => {
  it('parses natural language voice command for drinking water', () => {
    const match = voiceService.parseVoiceCommand('Please drink water now');
    expect(match.action).toBe('log_water');
  });

  it('parses natural language voice command for completing tasks', () => {
    const match = voiceService.parseVoiceCommand('I have completed my task');
    expect(match.action).toBe('complete_first_task');
  });

  it('parses natural language voice command for reading the routine', () => {
    const match = voiceService.parseVoiceCommand('Read routine aloud');
    expect(match.action).toBe('read_routine');
  });

  it('parses emergency sos command', () => {
    const match = voiceService.parseVoiceCommand('Help me emergency');
    expect(match.action).toBe('trigger_sos');
  });

  it('audio synthesizer muting toggles correctly', () => {
    audioSynthesizer.setMuted(true);
    expect(audioSynthesizer.getIsMuted()).toBe(true);
    audioSynthesizer.setMuted(false);
    expect(audioSynthesizer.getIsMuted()).toBe(false);
  });
});
