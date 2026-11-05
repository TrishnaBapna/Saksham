// Web Speech API interface definitions for TypeScript
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

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

  public static startListening(
    onResult: (text: string) => void,
    onError: (error: string) => void,
    onEnd: () => void,
    lang = 'en-IN'
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
      recognition.lang = lang;

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
    lang = 'en-IN'
  ): void {
    if (!this.isTTSSupported()) {
      onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.95; // Slightly slower, calm cadence for neuro-care
      utterance.pitch = 1.05;

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
      onEnd?.();
    }
  }

  public static cancelSpeech(): void {
    if (this.isTTSSupported()) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }
}
