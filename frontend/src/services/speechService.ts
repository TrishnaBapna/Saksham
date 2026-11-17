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

  /**
   * Transparent Privacy Disclosure for Web Speech API.
   * Explains how speech recognition is routed to vendor servers.
   */
  public static getPrivacyDisclosure(): {
    title: string;
    body: string;
    vendorServers: string[];
    offlineProcessingAvailable: boolean;
    dataTransmitted: string;
  } {
    return {
      title: 'Speech Recognition & Audio Privacy Notice',
      body: 'Saksham uses your browser\'s native Web Speech API for voice interactions with Asha. In Google Chrome and modern browsers, speech audio is streamed to vendor cloud servers (e.g., Google Speech Processing Servers) for real-time acoustic decoding unless your operating system has offline language models installed. No audio files are recorded or stored on Saksham\'s servers.',
      vendorServers: ['Google Speech Processing Network (for Chrome/Chromium browsers)'],
      offlineProcessingAvailable: false,
      dataTransmitted: 'Transient live audio stream for transcription; zero permanent cloud audio storage on Saksham.',
    };
  }

  /**
   * Structured language detection result with uncertainty and code-switching metrics.
   */
  public static detectLanguageWithConfidence(
    transcript: string,
    candidateLanguages?: string[]
  ): {
    detectedLanguage: string;
    confidence: number;
    script: string;
    isCodeSwitched: boolean;
    isAmbiguous: boolean;
    suggestedAction: 'ACCEPT' | 'CLARIFY';
  } {
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return {
        detectedLanguage: 'en',
        confidence: 0.1,
        script: 'Latin',
        isCodeSwitched: false,
        isAmbiguous: true,
        suggestedAction: 'CLARIFY',
      };
    }

    const text = transcript.trim();

    // 1. Script checks
    // Devanagari script: Sanskrit, Nepali, Marathi, Maithili, Konkani, Hindi
    if (/[\u0900-\u097F]/.test(text)) {
      if (/(?:अस्ति|नास्ति|करोति|औषधम्|जलम्|स्मरामि|भवति)/.test(text)) {
        return { detectedLanguage: 'sa', confidence: 0.92, script: 'Devanagari', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
      }
      if (/(?:छैन|गर्नुहोस्|दबाई|गर्छु)/.test(text)) {
        return { detectedLanguage: 'ne', confidence: 0.92, script: 'Devanagari', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
      }
      if (/(?:आहे|नाही|नाहीत|करतो|करते|करावे|करायचं|औषध|पाणी|घरी|विसरलो|विसरले|द्या|हवे|कोणतं|कुठे|आठवत|ळ)/.test(text)) {
        return { detectedLanguage: 'mr', confidence: 0.95, script: 'Devanagari', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
      }
      if (/(?:अछि|नहि|करैत|दबा|पानि)/.test(text)) {
        return { detectedLanguage: 'mai', confidence: 0.90, script: 'Devanagari', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
      }
      if (/(?:आसा|ना|करता|वकत|उदक)/.test(text)) {
        return { detectedLanguage: 'kok', confidence: 0.90, script: 'Devanagari', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
      }
      return { detectedLanguage: 'hi', confidence: 0.95, script: 'Devanagari', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
    }

    // Bengali / Assamese
    if (/[\u0980-\u09FF]/.test(text)) {
      if (/[\u09F0\u09F1]|(?:অসমীয়া|হৈছে|কৰক|নাপালো)/.test(text)) {
        return { detectedLanguage: 'as', confidence: 0.94, script: 'Bengali-Assamese', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
      }
      return { detectedLanguage: 'bn', confidence: 0.95, script: 'Bengali', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
    }

    // Gurmukhi (Punjabi)
    if (/[\u0A00-\u0A7F]/.test(text)) {
      return { detectedLanguage: 'pa', confidence: 0.98, script: 'Gurmukhi', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
    }

    // Gujarati
    if (/[\u0A80-\u0AFF]/.test(text)) {
      return { detectedLanguage: 'gu', confidence: 0.98, script: 'Gujarati', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
    }

    // Odia
    if (/[\u0B00-\u0B7F]/.test(text)) {
      return { detectedLanguage: 'or', confidence: 0.98, script: 'Odia', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
    }

    // Tamil
    if (/[\u0B80-\u0BFF]/.test(text)) {
      return { detectedLanguage: 'ta', confidence: 0.98, script: 'Tamil', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
    }

    // Telugu
    if (/[\u0C00-\u0C7F]/.test(text)) {
      return { detectedLanguage: 'te', confidence: 0.98, script: 'Telugu', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
    }

    // Kannada
    if (/[\u0C80-\u0CFF]/.test(text)) {
      return { detectedLanguage: 'kn', confidence: 0.98, script: 'Kannada', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
    }

    // Malayalam
    if (/[\u0D00-\u0D7F]/.test(text)) {
      return { detectedLanguage: 'ml', confidence: 0.98, script: 'Malayalam', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
    }

    // Ol Chiki (Santali)
    if (/[\u1C50-\u1C7F]/.test(text)) {
      return { detectedLanguage: 'sat', confidence: 0.98, script: 'Ol Chiki', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
    }

    // Meetei Mayek (Manipuri)
    if (/[\uAAE0-\uAAFF\uABC0-\uABFF]/.test(text)) {
      return { detectedLanguage: 'mni', confidence: 0.98, script: 'Meetei Mayek', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
    }

    // Perso-Arabic (Urdu / Kashmiri / Sindhi)
    if (/[\u0600-\u06FF]/.test(text)) {
      if (/[\u0684\u0683\u067F\u067D\u067B]|(?:ڄ|ڃ|ڳ|ڱ|پاڻي)/.test(text)) {
        return { detectedLanguage: 'sd', confidence: 0.92, script: 'Perso-Arabic', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
      }
      if (/(?:کٲشُر|دَواہ|آب|چُھ|چِھ)/.test(text)) {
        return { detectedLanguage: 'ks', confidence: 0.92, script: 'Perso-Arabic', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
      }
      return { detectedLanguage: 'ur', confidence: 0.95, script: 'Perso-Arabic', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
    }

    // 2. Romanized Indic / Code-switching check (Hinglish, Tanglish, Marathish)
    const hasEnglishWords = /\b(?:the|is|are|please|show|call|water|family|walk|medicine|medication|morning|routine|task|time|pills|tired|help)\b/i.test(text);
    const hasHindiMarkers = /\b(?:karo|chahiye|nahi|hai|kya|mujhe|pani|paani|dawa|aaj)\b/i.test(text);
    const hasMarathiMarkers = /\b(?:aushadh|aathvat|nako|aahe|kara|vishranti|majha|majhe|dakhva|dakhwa|kiti)\b/i.test(text);
    const hasTamilMarkers = /\b(?:marundhu|thanni|venum|illai|nalla|enoda|ennoda|enna|eppadi)\b/i.test(text);

    if (hasMarathiMarkers) {
      return {
        detectedLanguage: 'mr',
        confidence: hasEnglishWords ? 0.85 : 0.90,
        script: 'Latin',
        isCodeSwitched: hasEnglishWords,
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
      };
    }

    if (hasTamilMarkers) {
      return {
        detectedLanguage: 'ta',
        confidence: hasEnglishWords ? 0.85 : 0.90,
        script: 'Latin',
        isCodeSwitched: hasEnglishWords,
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
      };
    }

    if (hasHindiMarkers) {
      return {
        detectedLanguage: 'hi',
        confidence: hasEnglishWords ? 0.85 : 0.90,
        script: 'Latin',
        isCodeSwitched: hasEnglishWords,
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
      };
    }

    // 3. Candidate Languages prioritizing
    if (candidateLanguages && candidateLanguages.length > 0) {
      if (candidateLanguages.includes('en')) {
        return { detectedLanguage: 'en', confidence: 0.90, script: 'Latin', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT' };
      }
    }

    // 4. Default Latin English with ambiguity check for very short / noisy input
    const isVeryShort = text.split(/\s+/).length <= 1 && text.length < 3;
    return {
      detectedLanguage: 'en',
      confidence: isVeryShort ? 0.40 : 0.92,
      script: 'Latin',
      isCodeSwitched: false,
      isAmbiguous: isVeryShort,
      suggestedAction: isVeryShort ? 'CLARIFY' : 'ACCEPT',
    };
  }

  /**
   * Detects spoken language from transcript text using script analysis and Indic token matching.
   * 100% on-device ($0.00 cloud cost, no external API calls).
   */
  public static detectSpokenLanguage(transcript: string, candidateLanguages?: string[]): string {
    return this.detectLanguageWithConfidence(transcript, candidateLanguages).detectedLanguage;
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
      utterance.rate = 0.85; // Calming 0.85x cadence optimized for dementia cognitive reassurance
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

  public static stop(): void {
    this.cancelSpeech();
  }
}
