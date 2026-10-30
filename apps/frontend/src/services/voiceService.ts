/**
 * Voice & Speech Service (TTS & STT).
 * Provides accessible hands-free navigation and text-to-speech reading for patients.
 */

export interface VoiceCommandMatch {
  action: 'complete_first_task' | 'log_water' | 'trigger_sos' | 'read_routine' | 'unknown';
  raw: string;
}

// ─── Speech Synthesis (TTS) ──────────────────────────────────────────────────

class VoiceService {
  private isSpeaking: boolean = false;
  private voiceRate: number = 0.92; // Slightly paced for neurological comprehension

  public speak(text: string, onEnd?: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Cancel any lingering speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.voiceRate;
      utterance.pitch = 1.0;

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      if (onEnd) onEnd();
    }
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  // ─── Command Parser ────────────────────────────────────────────────────────

  public parseVoiceCommand(transcript: string): VoiceCommandMatch {
    const clean = transcript.toLowerCase().trim();

    if (clean.includes('water') || clean.includes('drink') || clean.includes('hydrate')) {
      return { action: 'log_water', raw: transcript };
    }
    if (clean.includes('complete') || clean.includes('finish') || clean.includes('done') || clean.includes('task')) {
      return { action: 'complete_first_task', raw: transcript };
    }
    if (clean.includes('emergency') || clean.includes('help') || clean.includes('sos') || clean.includes('doctor')) {
      return { action: 'trigger_sos', raw: transcript };
    }
    if (clean.includes('read') || clean.includes('routine') || clean.includes('tasks')) {
      return { action: 'read_routine', raw: transcript };
    }

    return { action: 'unknown', raw: transcript };
  }
}

export const voiceService = new VoiceService();
