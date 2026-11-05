import '@testing-library/jest-dom';

// Mock Web Speech API SpeechSynthesis and SpeechSynthesisUtterance
if (typeof window !== 'undefined') {
  window.speechSynthesis = {
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    getVoices: () => [],
    onvoiceschanged: null,
    pending: false,
    speaking: false,
    paused: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as any;

  (window as any).SpeechSynthesisUtterance = function (text: string) {
    return {
      text,
      lang: 'en-IN',
      pitch: 1,
      rate: 1,
      volume: 1,
      onstart: null,
      onend: null,
      onerror: null,
    };
  };
}
