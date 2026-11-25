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
   * Universal Multilingual Listening: Evaluates all 23 official Indian languages plus English,
   * detects code-switching pairs, and preserves verbatim transcript.
   */
  public static detectLanguageWithConfidence(
    transcript: string,
    candidateLanguages?: string[]
  ): {
    detectedLanguage: string;
    secondaryLanguage?: string;
    confidence: number;
    script: string;
    isCodeSwitched: boolean;
    codeSwitchedPair?: string;
    isAmbiguous: boolean;
    suggestedAction: 'ACCEPT' | 'CLARIFY';
    originalTranscript: string;
  } {
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return {
        detectedLanguage: 'en',
        confidence: 0.1,
        script: 'Latin',
        isCodeSwitched: false,
        isAmbiguous: true,
        suggestedAction: 'CLARIFY',
        originalTranscript: transcript || '',
      };
    }

    const text = transcript.trim();
    const hasEnglishWords = /\b(?:the|is|are|please|show|call|water|family|walk|medicine|medication|morning|routine|task|time|pills|tired|help|photos?|schedule|today|doctor|tablets?|confirm)\b/i.test(text);

    // 1. Script checks
    // Devanagari script: Sanskrit, Nepali, Marathi, Maithili, Konkani, Dogri, Bodo, Hindi
    if (/[\u0900-\u097F]/.test(text)) {
      const hasDevEnglish = hasEnglishWords || /[a-zA-Z]/.test(text);
      if (/(?:अस्ति|नास्ति|करोति|औषधम्|जलम्|स्मरामि|भवति|शान्तिः|नमः)/.test(text)) {
        return { detectedLanguage: 'sa', confidence: 0.94, script: 'Devanagari', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'sa+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }
      if (/(?:छैन|गर्नुहोस्|दबाई|गर्छु|कस्तो|भयो|मलाई)/.test(text)) {
        return { detectedLanguage: 'ne', confidence: 0.94, script: 'Devanagari', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'ne+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }
      if (/(?:आहे|नाही|नाहीत|करतो|करते|करावे|करायचं|औषध|पाणी|घरी|विसरलो|विसरले|द्या|हवे|कोणतं|कुठे|आठवत|माझं|मला|ळ)/.test(text)) {
        const hasDevHindi = /(?:दवा|दवाई|चाहिए|करना|है|मुझे|कहाँ|क्या|था|थे)/.test(text);
        const codeSwitched = hasDevEnglish || hasDevHindi;
        const pair = hasDevHindi ? 'mr+hi' : hasDevEnglish ? 'mr+en' : undefined;
        return { detectedLanguage: 'mr', secondaryLanguage: hasDevHindi ? 'hi' : hasDevEnglish ? 'en' : undefined, confidence: 0.95, script: 'Devanagari', isCodeSwitched: codeSwitched, codeSwitchedPair: pair, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }
      if (/(?:अछि|नहि|करैत|दबा|पानि|कहल|कतय|अहाँ)/.test(text)) {
        return { detectedLanguage: 'mai', confidence: 0.92, script: 'Devanagari', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'mai+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }
      if (/(?:आसा|ना|करता|वकत|उदक|कशे)/.test(text)) {
        return { detectedLanguage: 'kok', confidence: 0.92, script: 'Devanagari', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'kok+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }
      if (/(?:ऐ|नेईं|किश|कदां|डोगरी)/.test(text)) {
        return { detectedLanguage: 'doi', confidence: 0.92, script: 'Devanagari', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'doi+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }
      if (/(?:दों|गैया|दै|मा|बड़ो)/.test(text)) {
        return { detectedLanguage: 'brx', confidence: 0.92, script: 'Devanagari', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'brx+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }

      // Hindi distinctive lexical markers
      const hasDistinctHindi = /(?:है|नहीं|क्या|कैसे|चाहिए|मुझे|करना|था|थे|दवा|दवाई|कहाँ|बताओ|रहा|रही|रहे|होगा|होगी|दिखाओ|खुराक|सुप्रभात|नमस्ते|दिनचर्या|याद|थकान|महसूस|बात)/.test(text);
      if (hasDistinctHindi) {
        const isHindiCodeSwitched = hasDevEnglish;
        return {
          detectedLanguage: 'hi',
          secondaryLanguage: isHindiCodeSwitched ? 'en' : undefined,
          confidence: 0.92,
          script: 'Devanagari',
          isCodeSwitched: isHindiCodeSwitched,
          codeSwitchedPair: isHindiCodeSwitched ? 'hi+en' : undefined,
          isAmbiguous: false,
          suggestedAction: 'ACCEPT',
          originalTranscript: text,
        };
      }

      // Shared Devanagari script without distinctive grammatical inflection
      return {
        detectedLanguage: candidateLanguages?.[0] || 'hi',
        confidence: 0.50,
        script: 'Devanagari',
        isCodeSwitched: hasDevEnglish,
        codeSwitchedPair: hasDevEnglish ? 'hi+en' : undefined,
        isAmbiguous: true,
        suggestedAction: 'CLARIFY',
        originalTranscript: text,
      };
    }

    // Bengali / Assamese
    if (/[\u0980-\u09FF]/.test(text)) {
      const hasDevEnglish = hasEnglishWords || /[a-zA-Z]/.test(text);
      if (/[\u09F0\u09F1]|(?:অসমীয়া|হৈছে|কৰক|নাপালো|দৰব|পানী|কৰিম|বিচাৰো|খাইছো)/.test(text)) {
        return { detectedLanguage: 'as', confidence: 0.94, script: 'Bengali-Assamese', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'as+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }
      const hasDistinctBengali = /(?:আমি|তুমি|ওষুধ|খেয়েছি|আছে|নেই|চাই|ভালো|করব|কি না|দেখাও|খাব|বলুন|নমস্কার|মনে নেই|খাইছি)/.test(text);
      if (hasDistinctBengali) {
        return { detectedLanguage: 'bn', confidence: 0.94, script: 'Bengali', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'bn+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }
      return {
        detectedLanguage: candidateLanguages?.[0] || 'bn',
        confidence: 0.50,
        script: 'Bengali-Assamese',
        isCodeSwitched: hasDevEnglish,
        isAmbiguous: true,
        suggestedAction: 'CLARIFY',
        originalTranscript: text,
      };
    }

    // Gurmukhi (Punjabi)
    if (/[\u0A00-\u0A7F]/.test(text)) {
      const hasDevEnglish = hasEnglishWords || /[a-zA-Z]/.test(text);
      return { detectedLanguage: 'pa', confidence: 0.98, script: 'Gurmukhi', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'pa+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }

    // Gujarati
    if (/[\u0A80-\u0AFF]/.test(text)) {
      const hasDevEnglish = hasEnglishWords || /[a-zA-Z]/.test(text);
      return { detectedLanguage: 'gu', confidence: 0.98, script: 'Gujarati', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'gu+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }

    // Odia
    if (/[\u0B00-\u0B7F]/.test(text)) {
      const hasDevEnglish = hasEnglishWords || /[a-zA-Z]/.test(text);
      return { detectedLanguage: 'or', confidence: 0.98, script: 'Odia', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'or+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }

    // Tamil
    if (/[\u0B80-\u0BFF]/.test(text)) {
      const hasDevEnglish = hasEnglishWords || /[a-zA-Z]/.test(text);
      return { detectedLanguage: 'ta', confidence: 0.98, script: 'Tamil', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'ta+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }

    // Telugu
    if (/[\u0C00-\u0C7F]/.test(text)) {
      const hasDevEnglish = hasEnglishWords || /[a-zA-Z]/.test(text);
      return { detectedLanguage: 'te', confidence: 0.98, script: 'Telugu', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'te+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }

    // Kannada
    if (/[\u0C80-\u0CFF]/.test(text)) {
      const hasDevEnglish = hasEnglishWords || /[a-zA-Z]/.test(text);
      return { detectedLanguage: 'kn', confidence: 0.98, script: 'Kannada', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'kn+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }

    // Malayalam
    if (/[\u0D00-\u0D7F]/.test(text)) {
      const hasDevEnglish = hasEnglishWords || /[a-zA-Z]/.test(text);
      return { detectedLanguage: 'ml', confidence: 0.98, script: 'Malayalam', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'ml+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }

    // Ol Chiki (Santali)
    if (/[\u1C50-\u1C7F]/.test(text)) {
      return { detectedLanguage: 'sat', confidence: 0.98, script: 'Ol Chiki', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }

    // Meetei Mayek (Manipuri)
    if (/[\uAAE0-\uAAFF\uABC0-\uABFF]/.test(text)) {
      return { detectedLanguage: 'mni', confidence: 0.98, script: 'Meetei Mayek', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }

    // Perso-Arabic (Urdu / Kashmiri / Sindhi)
    if (/[\u0600-\u06FF]/.test(text)) {
      const hasDevEnglish = hasEnglishWords || /[a-zA-Z]/.test(text);
      if (/[\u0684\u0683\u067F\u067D\u067B]|(?:ڄ|ڃ|ڳ|ڱ|پاڻي)/.test(text)) {
        return { detectedLanguage: 'sd', confidence: 0.92, script: 'Perso-Arabic', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'sd+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }
      if (/(?:کٲشُر|دَواہ|آب|چُھ|چِھ|یَژھان|گَژھان)/.test(text)) {
        return { detectedLanguage: 'ks', confidence: 0.92, script: 'Perso-Arabic', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'ks+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }
      const hasDistinctUrdu = /(?:کیا|ہے|نہیں|मुझे|دوا|وقت|شکریہ|فرمائیں|کیجیے|ہم|آپ|کیسے|خیال|لے لی|سلام)/.test(text);
      if (hasDistinctUrdu) {
        return { detectedLanguage: 'ur', confidence: 0.94, script: 'Perso-Arabic', isCodeSwitched: hasDevEnglish, codeSwitchedPair: hasDevEnglish ? 'ur+en' : undefined, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }
      return {
        detectedLanguage: candidateLanguages?.[0] || 'ur',
        confidence: 0.50,
        script: 'Perso-Arabic',
        isCodeSwitched: hasDevEnglish,
        isAmbiguous: true,
        suggestedAction: 'CLARIFY',
        originalTranscript: text,
      };
    }

    // 2. Romanized Indic & Multilingual Code-Switching Detection
    const hasHindiMarkers = /\b(?:karo|chahiye|nahi|hai|kya|mujhe|pani|paani|dawa|dawai|aaj|kahan|kaise|batao|lena|khayi|liya|rehta|aa raha|de do)\b/i.test(text);
    const hasMarathiMarkers = /\b(?:mala|aushadh|aathvat|nako|aahe|ahet|kara|vishranti|majha|majhe|dakhva|dakhwa|kiti|sakalche|ghyaycha|ghyaychi)\b/i.test(text);
    const hasTamilMarkers = /\b(?:enoda|ennoda|marundhu|thanni|venum|illai|nalla|enna|eppadi|vanthuducha)\b/i.test(text);
    const hasTeluguMarkers = /\b(?:naa|meeru|mandulu|vesukunna|enti|undi|ledu|kavali|ela)\b/i.test(text);
    const hasKannadaMarkers = /\b(?:nanna|neevu|aushadhi|thagondidde|yenu|ide|illa|beku|hege)\b/i.test(text);
    const hasGujaratiMarkers = /\b(?:mane|tame|che|nathi|aapo|levi|khavu|dava|kem|shun)\b/i.test(text);
    const hasBengaliMarkers = /\b(?:ami|tumi|oshudh|khayechi|ache|nei|chahta|bhalo|korbo|ki na)\b/i.test(text);
    const hasPunjabiMarkers = /\b(?:dasso|tussi|leni si|kiven|chahida|hai si|kardi)\b/i.test(text);
    const hasUrduMarkers = /\b(?:waqt|tashreef|shukriya|khauf|khayal|khidmat|farmayein)\b/i.test(text);

    // Code-switching checks across 10 requested language combinations:
    // 1. Marathi + Hindi
    if (hasMarathiMarkers && hasHindiMarkers) {
      return {
        detectedLanguage: 'mr',
        secondaryLanguage: 'hi',
        confidence: 0.92,
        script: 'Latin',
        isCodeSwitched: true,
        codeSwitchedPair: 'mr+hi',
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
        originalTranscript: text,
      };
    }

    // 2. Marathi + English
    if (hasMarathiMarkers && hasEnglishWords) {
      return {
        detectedLanguage: 'mr',
        secondaryLanguage: 'en',
        confidence: 0.90,
        script: 'Latin',
        isCodeSwitched: true,
        codeSwitchedPair: 'mr+en',
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
        originalTranscript: text,
      };
    }

    // Monolingual Romanized Marathi
    if (hasMarathiMarkers) {
      return {
        detectedLanguage: 'mr',
        confidence: 0.92,
        script: 'Latin',
        isCodeSwitched: false,
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
        originalTranscript: text,
      };
    }

    // 4. Gujarati + Hindi
    if (hasGujaratiMarkers && hasHindiMarkers) {
      return {
        detectedLanguage: 'gu',
        secondaryLanguage: 'hi',
        confidence: 0.90,
        script: 'Latin',
        isCodeSwitched: true,
        codeSwitchedPair: 'gu+hi',
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
        originalTranscript: text,
      };
    }

    // 5. Bengali + Hindi
    if (hasBengaliMarkers && hasHindiMarkers) {
      return {
        detectedLanguage: 'bn',
        secondaryLanguage: 'hi',
        confidence: 0.90,
        script: 'Latin',
        isCodeSwitched: true,
        codeSwitchedPair: 'bn+hi',
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
        originalTranscript: text,
      };
    }

    // 6. Tamil + English
    if (hasTamilMarkers && hasEnglishWords) {
      return {
        detectedLanguage: 'ta',
        secondaryLanguage: 'en',
        confidence: 0.90,
        script: 'Latin',
        isCodeSwitched: true,
        codeSwitchedPair: 'ta+en',
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
        originalTranscript: text,
      };
    }

    // 7. Telugu + English
    if (hasTeluguMarkers && hasEnglishWords) {
      return {
        detectedLanguage: 'te',
        secondaryLanguage: 'en',
        confidence: 0.90,
        script: 'Latin',
        isCodeSwitched: true,
        codeSwitchedPair: 'te+en',
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
        originalTranscript: text,
      };
    }

    // 8. Kannada + English
    if (hasKannadaMarkers && hasEnglishWords) {
      return {
        detectedLanguage: 'kn',
        secondaryLanguage: 'en',
        confidence: 0.90,
        script: 'Latin',
        isCodeSwitched: true,
        codeSwitchedPair: 'kn+en',
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
        originalTranscript: text,
      };
    }

    // 9. Punjabi + Hindi
    if (hasPunjabiMarkers && hasHindiMarkers) {
      return {
        detectedLanguage: 'pa',
        secondaryLanguage: 'hi',
        confidence: 0.90,
        script: 'Latin',
        isCodeSwitched: true,
        codeSwitchedPair: 'pa+hi',
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
        originalTranscript: text,
      };
    }

    // 10. Urdu + Hindi
    if (hasUrduMarkers && hasHindiMarkers) {
      return {
        detectedLanguage: 'ur',
        secondaryLanguage: 'hi',
        confidence: 0.90,
        script: 'Latin',
        isCodeSwitched: true,
        codeSwitchedPair: 'ur+hi',
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
        originalTranscript: text,
      };
    }

    // Monolingual Romanized Dravidian / Indic languages
    if (hasTamilMarkers) {
      return { detectedLanguage: 'ta', confidence: 0.90, script: 'Latin', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }
    if (hasTeluguMarkers) {
      return { detectedLanguage: 'te', confidence: 0.90, script: 'Latin', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }
    if (hasKannadaMarkers) {
      return { detectedLanguage: 'kn', confidence: 0.90, script: 'Latin', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }
    if (hasGujaratiMarkers) {
      return { detectedLanguage: 'gu', confidence: 0.90, script: 'Latin', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }
    if (hasBengaliMarkers) {
      return { detectedLanguage: 'bn', confidence: 0.90, script: 'Latin', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }
    if (hasPunjabiMarkers) {
      return { detectedLanguage: 'pa', confidence: 0.90, script: 'Latin', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }
    if (hasUrduMarkers) {
      return { detectedLanguage: 'ur', confidence: 0.90, script: 'Latin', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
    }

    // 3. Hindi + English (Hinglish)
    if (hasHindiMarkers) {
      return {
        detectedLanguage: 'hi',
        secondaryLanguage: hasEnglishWords ? 'en' : undefined,
        confidence: hasEnglishWords ? 0.90 : 0.92,
        script: 'Latin',
        isCodeSwitched: hasEnglishWords,
        codeSwitchedPair: hasEnglishWords ? 'hi+en' : undefined,
        isAmbiguous: false,
        suggestedAction: 'ACCEPT',
        originalTranscript: text,
      };
    }

    // 4. Candidate Languages prioritizing
    if (candidateLanguages && candidateLanguages.length > 0) {
      if (candidateLanguages.includes('en')) {
        return { detectedLanguage: 'en', confidence: 0.90, script: 'Latin', isCodeSwitched: false, isAmbiguous: false, suggestedAction: 'ACCEPT', originalTranscript: text };
      }
    }

    // 5. Default Latin English with ambiguity check for very short / noisy input
    const isVeryShort = (text.split(/\s+/).length <= 1 && text.length < 4) || text.length < 3;
    return {
      detectedLanguage: 'en',
      confidence: isVeryShort ? 0.40 : 0.92,
      script: 'Latin',
      isCodeSwitched: false,
      isAmbiguous: isVeryShort,
      suggestedAction: isVeryShort ? 'CLARIFY' : 'ACCEPT',
      originalTranscript: text,
    };
  }

  /**
   * Detects spoken language from transcript text using script analysis and Indic token matching.
   * 100% on-device ($0.00 cloud cost, no external API calls).
   */
  public static detectSpokenLanguage(transcript: string, candidateLanguages?: string[]): string {
    return this.detectLanguageWithConfidence(transcript, candidateLanguages).detectedLanguage;
  }

  /**
   * Dementia-friendly, calm translation of technical Web Speech API errors.
   * Prevents patient alarm from raw browser strings ("not-allowed", "no-speech", "audio-capture", etc.).
   */
  public static getCalmVoiceErrorMessage(errorCodeOrError: string, language: string = 'en'): string {
    const raw = String(errorCodeOrError || '').toLowerCase();
    const lang = (language || 'en').toLowerCase().split('-')[0];

    const isNotAllowed = raw.includes('not-allowed') || raw.includes('permission');
    const isNoSpeech = raw.includes('no-speech') || raw.includes('silence');
    const isAudioCapture = raw.includes('audio-capture') || raw.includes('microphone') || raw.includes('device');
    const isNetwork = raw.includes('network') || raw.includes('offline');

    if (isNotAllowed) {
      const messages: Record<string, string> = {
        hi: 'माइक्रोफ़ोन की अनुमति रुकी हुई है। आप स्क्रीन पर दिए गए बटनों का आराम से उपयोग कर सकते हैं।',
        mr: 'मायक्रोफोनची परवानगी थांबली आहे. आपण स्क्रीनवरील बटणे शांतपणे वापरू शकता.',
        ta: 'மைக்ரோஃபோன் அணுகல் இடைநிறுத்தப்பட்டுள்ளது. நீங்கள் திரையில் உள்ள பொத்தான்களை எளிதாகப் பயன்படுத்தலாம்.',
        te: 'మైక్రోఫోన్ అనుమతి ఆపబడింది. మీరు స్క్రీన్‌పై ఉన్న బటన్లను సులభంగా ఉపయోగించవచ్చు.',
        kn: 'ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ಸ್ಥಗಿತಗೊಂಡಿದೆ. ನೀವು ಪರದೆಯ ಮೇಲಿನ ಗುಂಡಿಗಳನ್ನು ಸುಲಭವಾಗಿ ಬಳಸಬಹುದು.',
        bn: 'মাইক্রোফোনের অনুমতি স্থগিত রয়েছে। আপনি অন-স্ক্রিন বোতামগুলি স্বাচ্ছন্দ্যে ব্যবহার করতে পারেন।',
      };
      return messages[lang] || 'Microphone access is paused. You can comfortably use on-screen buttons or tap to allow audio.';
    }

    if (isNoSpeech) {
      const messages: Record<string, string> = {
        hi: 'आराम से समय लें। जब भी आप बोलने के लिए तैयार हों, आशा आपकी बात सुनने के लिए तैयार है।',
        mr: 'शांतपणे वेळ घ्या. जेव्हा आपण बोलायला तयार असाल, तेव्हा आशा आपले ऐकण्यास तयार आहे.',
        ta: 'நிதானமாக நேரம் எடுத்துக் கொள்ளுங்கள். நீங்கள் பேசத் தயாராக இருக்கும்போது ஆஷா கேட்கக் காத்திருக்கிறார்.',
        te: 'ప్రశాంతంగా సమయం తీసుకోండి. మీరు మాట్లాడటానికి సిద్ధంగా ఉన్నప్పుడు ఆశా వినడానికి సిద్ధంగా ఉన్నారు.',
        kn: 'ಶಾಂತವಾಗಿ ಸಮಯ ತೆಗೆದುಕೊಳ್ಳಿ. ನೀವು ಮಾತನಾಡಲು ಸಿದ್ಧರಾದಾಗ ಆಶಾ ಕೇಳಲು ಸಿದ್ಧರಿದ್ದಾರೆ.',
        bn: 'ধীরে ধীরে সময় নিন। আপনি যখনই কথা বলতে প্রস্তুত হবেন, আশা আপনার কথা শোনার জন্য প্রস্তুত রয়েছে।',
      };
      return messages[lang] || 'Take your time. Whenever you are ready to speak, Asha is listening.';
    }

    if (isAudioCapture) {
      const messages: Record<string, string> = {
        hi: 'माइक से आवाज़ नहीं आ रही है। आप नीचे दिए गए बटनों से आसानी से आगे बढ़ सकते हैं।',
        mr: 'मायक्रोफोनमधून आवाज येत नाही आहे. आपण खालील बटणांचा वापर करून पुढे जाऊ शकता.',
        ta: 'மைக்ரோஃபோனிலிருந்து ஒலி கேட்கவில்லை. நீங்கள் திரைப் பொத்தான்களைப் பயன்படுத்தலாம்.',
        te: 'మైక్రోఫోన్ నుండి ఆడియో రాలేదు. మీరు స్క్రీన్ బటన్లను ఉపయోగించవచ్చు.',
        kn: 'ಮೈಕ್ರೊಫೋನ್‌ನಿಂದ ಧ್ವನಿ ಕೇಳುತ್ತಿಲ್ಲ. ನೀವು ಪರದೆಯ ಬಟನ್‌ಗಳನ್ನು ಬಳಸಬಹುದು.',
        bn: 'মাইক্রোফোন থেকে শব্দ পাওয়া যায়নি। আপনি অন-স্ক্রিন বোতাম ব্যবহার করতে পারেন।',
      };
      return messages[lang] || 'We could not hear audio from the microphone. You can comfortably use on-screen buttons.';
    }

    if (isNetwork) {
      const messages: Record<string, string> = {
        hi: 'आशा ऑफ़लाइन मोड में सुरक्षित है। आप स्क्रीन के विकल्पों को आराम से छू सकते हैं।',
        mr: 'आशा ऑफलाइन मोडमध्ये सुरक्षित आहे. आपण स्क्रीनवरील पर्याय शांतपणे निवडू शकता.',
        ta: 'ஆஷா ஆஃப்லைனில் பாதுகாப்பாக உள்ளார். நீங்கள் திரையில் உள்ள தேர்வுகளைத் தொடலாம்.',
        te: 'ఆశా ఆఫ్‌లైన్‌లో సురక్షితంగా ఉన్నారు. మీరు స్క్రీన్ ఎంపికలను ప్రశాంతంగా ఎంచుకోవచ్చు.',
        kn: 'ಆಶಾ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿದ್ದಾರೆ. ನೀವು ಪರದೆಯ ಆಯ್ಕೆಗಳನ್ನು ಸ್ಪರ್ಶಿಸಬಹುದು.',
        bn: 'আশা অফলাইনে সুরক্ষিত রয়েছে। আপনি অন-স্ক্রিন বিকল্পগুলি স্পর্শ করতে পারেন।',
      };
      return messages[lang] || 'Asha is operating locally on this device. You can comfortably tap options on the screen.';
    }

    // Default gentle guidance
    const defaultMessages: Record<string, string> = {
      hi: 'आवाज़ की सुविधा विश्राम ले रही है। आप अपनी गति से स्क्रीन पर दिए गए बटनों को छू सकते हैं।',
      mr: 'आवाजाची सुविधा विश्रांती घेत आहे. आपण आपल्या गतीने स्क्रीनवरील बटणे निवडू शकता.',
      ta: 'குரல் உள்ளீடு ஓய்வெடுக்கிறது. உங்கள் சொந்த வேகத்தில் திரையில் உள்ள பொத்தான்களைத் தொடலாம்.',
      te: 'వాయిస్ ఇన్‌పుట్ విశ్రాంతి తీసుకుంటోంది. మీ స్వంత వేగంతో స్క్రీన్ బటన్లను తాకవచ్చు.',
      kn: 'ಧ್ವನಿ ಇನ್‌ಪುಟ್ ವಿಶ್ರಾಂತಿ ಪಡೆಯುತ್ತಿದೆ. ನಿಮ್ಮ ಸ್ವಂತ ವೇಗದಲ್ಲಿ ಪರದೆಯ ಬಟನ್‌ಗಳನ್ನು ಸ್ಪರ್ಶಿಸಬಹುದು.',
      bn: 'ভয়েস ইনপুট বিশ্রাম নিচ্ছে। আপনার নিজস্ব গতিতে অন-স্ক্রিন বোতাম স্পর্শ করতে পারেন।',
    };
    return defaultMessages[lang] || 'Voice input is resting. You can tap buttons on screen at your own pace.';
  }

  public static startListening(
    onResult: (text: string) => void,
    onError: (error: string) => void,
    onEnd: () => void,
    langOrCode: string = 'en-IN',
    onInterim?: (text: string) => void
  ): () => void {
    const win = window as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      const fallbackMsg = this.getCalmVoiceErrorMessage('not-supported', langOrCode);
      onError(fallbackMsg);
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
      recognition.interimResults = true;
      recognition.lang = this.getBCP47(langOrCode);

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalText += item[0].transcript;
          } else {
            interimText += item[0].transcript;
          }
        }

        if (interimText && onInterim) {
          onInterim(interimText);
        }
        if (finalText) {
          onResult(finalText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
        const friendlyMessage = this.getCalmVoiceErrorMessage(event.error, langOrCode);
        onError(friendlyMessage);
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

  public static abortListening(): void {
    if (this.recognitionInstance) {
      try {
        if (typeof this.recognitionInstance.abort === 'function') {
          this.recognitionInstance.abort();
        } else {
          this.recognitionInstance.stop();
        }
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
