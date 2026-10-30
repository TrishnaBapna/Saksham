/**
 * Voice & Speech Service (TTS & STT).
 * Supports English, Hindi, and Marathi voice commands, duplicate debouncing,
 * and spoken voiceover feedback for neurological accessibility.
 */

export type VoiceNavigationTarget =
  | 'routine'
  | 'mindClinic'
  | 'movement'
  | 'speech'
  | 'lovedOnes'
  | 'articles'
  | 'calendar'
  | 'safepath'
  | 'back'
  | 'home';

export interface VoiceCommandMatch {
  action:
    | 'navigate'
    | 'complete_first_task'
    | 'log_water'
    | 'trigger_sos'
    | 'read_routine'
    | 'unknown';
  target?: VoiceNavigationTarget;
  language?: 'en' | 'hi' | 'mr';
  raw: string;
}

class VoiceService {
  private isSpeaking: boolean = false;
  private voiceRate: number = 0.92;
  private lastExecutedCommand: string = '';
  private lastExecutedTime: number = 0;
  private preferredLanguage: 'en' | 'hi' | 'mr' = 'en';

  public setLanguage(lang: 'en' | 'hi' | 'mr') {
    this.preferredLanguage = lang;
  }

  public getLanguage(): 'en' | 'hi' | 'mr' {
    return this.preferredLanguage;
  }

  /**
   * Accessible Text-to-Speech (TTS) with language selection:
   * English (en-IN / en-US), Hindi (hi-IN), Marathi (mr-IN / hi-IN fallback)
   */
  public speak(text: string, onEnd?: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.voiceRate;
      utterance.pitch = 1.0;

      const langCode =
        this.preferredLanguage === 'hi'
          ? 'hi-IN'
          : this.preferredLanguage === 'mr'
          ? 'mr-IN'
          : 'en-US';

      utterance.lang = langCode;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice =
        voices.find((v) => v.lang === langCode || v.lang.startsWith(this.preferredLanguage)) ||
        voices.find((v) => v.lang.startsWith('en'));

      if (matchedVoice) {
        utterance.voice = matchedVoice;
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

  /**
   * Multilingual voice command parser with duplicate debouncing (2-second window).
   * Supports: English, Hindi, and Marathi commands.
   */
  public parseVoiceCommand(transcript: string): VoiceCommandMatch {
    const now = Date.now();
    const clean = transcript.toLowerCase().trim();

    // Duplicate command suppression (prevents double triggers within 2s)
    if (clean === this.lastExecutedCommand && now - this.lastExecutedTime < 2000) {
      return { action: 'unknown', raw: transcript };
    }

    this.lastExecutedCommand = clean;
    this.lastExecutedTime = now;

    // ── 1. Navigation Commands (English, Hindi, Marathi) ──

    // Mind Clinic
    if (
      clean.includes('mind clinic') ||
      clean.includes('games') ||
      clean.includes('दिमाग') ||
      clean.includes('खेळ') ||
      clean.includes('क्लीनिक')
    ) {
      return { action: 'navigate', target: 'mindClinic', raw: transcript };
    }

    // Movement
    if (
      clean.includes('movement') ||
      clean.includes('exercise') ||
      clean.includes('walking') ||
      clean.includes('व्यायाम') ||
      clean.includes('हालचाल')
    ) {
      return { action: 'navigate', target: 'movement', raw: transcript };
    }

    // Speech
    if (
      clean.includes('speech') ||
      clean.includes('voice practice') ||
      clean.includes('vocal') ||
      clean.includes('आवाज') ||
      clean.includes('भाषण')
    ) {
      return { action: 'navigate', target: 'speech', raw: transcript };
    }

    // Calendar
    if (
      clean.includes('calendar') ||
      clean.includes('schedule') ||
      clean.includes('कैलेंडर') ||
      clean.includes('दिनदर्शिका')
    ) {
      return { action: 'navigate', target: 'calendar', raw: transcript };
    }

    // Loved Ones & Care / Vault
    if (
      clean.includes('loved ones') ||
      clean.includes('family') ||
      clean.includes('care circle') ||
      clean.includes('vault') ||
      clean.includes('परिवार') ||
      clean.includes('नातेवाईक')
    ) {
      return { action: 'navigate', target: 'lovedOnes', raw: transcript };
    }

    // Articles & Guides
    if (
      clean.includes('article') ||
      clean.includes('guides') ||
      clean.includes('लेख') ||
      clean.includes('माहिती')
    ) {
      return { action: 'navigate', target: 'articles', raw: transcript };
    }

    // SafePath
    if (
      clean.includes('safepath') ||
      clean.includes('location') ||
      clean.includes('सुरक्षा') ||
      clean.includes('नकाशा')
    ) {
      return { action: 'navigate', target: 'safepath', raw: transcript };
    }

    // Go Back / Go to Home
    if (clean.includes('go back') || clean.includes('back') || clean.includes('मागे') || clean.includes('पीछे')) {
      return { action: 'navigate', target: 'back', raw: transcript };
    }
    if (clean.includes('go to home') || clean.includes('home') || clean.includes('routine') || clean.includes('घर') || clean.includes('मुख्यपृष्ठ')) {
      return { action: 'navigate', target: 'home', raw: transcript };
    }

    // ── 2. Functional Care Commands ──
    if (clean.includes('water') || clean.includes('drink') || clean.includes('hydrate') || clean.includes('पाणी') || clean.includes('पानी')) {
      return { action: 'log_water', raw: transcript };
    }
    if (clean.includes('complete') || clean.includes('finish') || clean.includes('done') || clean.includes('पूर्ण')) {
      return { action: 'complete_first_task', raw: transcript };
    }
    if (clean.includes('emergency') || clean.includes('help') || clean.includes('sos') || clean.includes('मदत') || clean.includes('मदद')) {
      return { action: 'trigger_sos', raw: transcript };
    }
    if (clean.includes('read') || clean.includes('सांगा') || clean.includes('पढ़ो')) {
      return { action: 'read_routine', raw: transcript };
    }

    return { action: 'unknown', raw: transcript };
  }
}

export const voiceService = new VoiceService();
