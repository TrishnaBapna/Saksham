// Web Speech API interface definitions for TypeScript
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export const LANGUAGE_BCP47_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  or: 'or-IN',
  as: 'as-IN',
  ur: 'ur-IN',
  ks: 'ks-IN',
  sd: 'sd-IN',
  sa: 'sa-IN',
  ne: 'ne-IN',
  kok: 'kok-IN',
  mai: 'mai-IN',
  doi: 'doi-IN',
  brx: 'brx-IN',
  sat: 'sat-IN',
  mni: 'mni-IN',
};

export class SpeechService {
  private static recognitionInstance: any = null;
  private static isSpeaking = false;

  public static getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public static isSTTSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as IWindow;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  public static isTTSSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  }

  public static getBCP47(langOrCode: string): string {
    return LANGUAGE_BCP47_MAP[langOrCode] || (langOrCode && langOrCode.includes('-') ? langOrCode : 'en-IN');
  }

  /**
   * Find matching browser speech synthesis voice for a given language.
   * Prevents phonetic distortions from using mismatched voices (e.g. English voice for Hindi/Tamil).
   */
  public static findBestVoice(langOrCode: string): SpeechSynthesisVoice | null {
    if (!this.isTTSSupported()) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const bcp47 = this.getBCP47(langOrCode).toLowerCase();
    const primaryCode = langOrCode.split('-')[0].toLowerCase();

    // 1. Exact match e.g. hi-IN
    const exact = voices.find((v) => v.lang.toLowerCase() === bcp47);
    if (exact) return exact;

    // 2. Primary language match e.g. hi
    const primary = voices.find((v) => v.lang.toLowerCase().startsWith(primaryCode));
    if (primary) return primary;

    // 3. If target language is English, return default English voice
    if (primaryCode === 'en') {
      return voices.find((v) => v.lang.toLowerCase().startsWith('en')) || null;
    }

    // For non-English languages with no installed voice, return null to avoid distorted playback
    return null;
  }

  public static isVoiceAvailable(langOrCode: string): boolean {
    return Boolean(this.findBestVoice(langOrCode));
  }

  public static isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as any;
    return Boolean(win && (win.SpeechRecognition || win.webkitSpeechRecognition));
  }

  public static startListening(
    onResult: (text: string) => void,
    onError: (error: string) => void,
    onEnd: () => void,
    langOrCode: string = 'en-IN'
  ): () => void {
    const win = window as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      onError('Speech recognition is not supported in this browser. Please type your message.');
      onEnd();
      return () => {};
    }

    try {
      if (this.recognitionInstance) {
        this.recognitionInstance.abort();
      }

      const recognition = new SpeechRec();
      this.recognitionInstance = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = this.getBCP47(langOrCode);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onResult(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
        onError(`Voice input error: ${event.error || 'could not capture speech'}`);
      };

      recognition.onend = () => {
        this.recognitionInstance = null;
        onEnd();
      };

      recognition.start();

      return () => {
        if (recognition) {
          try {
            recognition.abort();
          } catch {
            // Ignore abort error
          }
        }
      };
    } catch (err) {
      onError((err as Error).message || 'Unable to access microphone.');
      onEnd();
      return () => {};
    }
  }

  public static stopListening(): void {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch {
        // Ignore
      }
      this.recognitionInstance = null;
    }
  }

  public static speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    langOrCode: string = 'en-IN'
  ): void {
    if (!this.isTTSSupported()) {
      onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const bcp47 = this.getBCP47(langOrCode);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = bcp47;
      utterance.rate = 0.95; // Slightly slower, calm cadence for neuro-care
      utterance.pitch = 1.05;

      const matchingVoice = this.findBestVoice(langOrCode);
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        onStart?.();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        onEnd?.();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking = false;
      onEnd?.();
    }
  }

  public static cancelSpeech(): void {
    if (this.isTTSSupported()) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  public static stopSpeaking(): void {
    this.cancelSpeech();
  }
}
