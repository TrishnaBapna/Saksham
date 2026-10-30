import React, { useState, useEffect, useRef } from 'react';
import { voiceService, type VoiceCommandMatch } from '@/services/voiceService';
import { audioSynthesizer } from '@/services/audioService';

interface VoiceAssistantBarProps {
  onCommand: (match: VoiceCommandMatch) => void;
  onReadRoutine: () => void;
}

export const VoiceAssistantBar: React.FC<VoiceAssistantBarProps> = ({
  onCommand,
  onReadRoutine,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setFeedback('Listening... Speak a command');
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);

          if (event.results[0]?.isFinal) {
            handleFinalTranscript(currentTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          setFeedback('Tap microphone to speak');
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleFinalTranscript = (text: string) => {
    audioSynthesizer.playReminderCue();
    const match = voiceService.parseVoiceCommand(text);

    if (match.action === 'read_routine') {
      setFeedback('Reading your routine aloud...');
      onReadRoutine();
    } else if (match.action !== 'unknown') {
      setFeedback(`Recognized: "${text}"`);
      onCommand(match);
    } else {
      setFeedback(`Heard: "${text}" (Try "Drink water" or "Read routine")`);
    }

    setTimeout(() => {
      setFeedback(null);
      setTranscript('');
    }, 4500);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      // Fallback if browser doesn't support Web Speech API
      voiceService.speak('Voice assistant ready. Try saying read routine or drink water.');
      setFeedback('Web Speech API not supported on this browser. Voice guidance active.');
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setFeedback('Listening... Speak your command');
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  return (
    <div
      role="region"
      aria-label="Voice accessibility assistant"
      className="bg-gradient-to-r from-teal-800 to-teal-900 text-white rounded-3xl p-4 sm:p-5 shadow-sm border border-teal-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={toggleListening}
          aria-label={isListening ? 'Stop listening' : 'Start voice recognition'}
          aria-pressed={isListening}
          className={`w-13 h-13 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 min-h-touch min-w-touch p-3 focus-visible:ring-4 focus-visible:ring-teal-300 ${
            isListening
              ? 'bg-rose-500 scale-105 animate-pulse shadow-lg shadow-rose-900/40'
              : 'bg-teal-600/90 hover:bg-teal-500 text-white shadow-sm'
          }`}
        >
          {isListening ? '🛑' : '🎙️'}
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-heading text-white">
              Voice Assistant & Dictation
            </h3>
            {isListening && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                Listening
              </span>
            )}
          </div>
          <p className="text-xs text-teal-200 mt-0.5 max-w-md">
            {feedback || transcript || 'Tap mic and speak: "Read routine", "Drink water", "Complete task", or "Emergency".'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
        <button
          type="button"
          onClick={onReadRoutine}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-teal-100 transition-colors min-h-[38px]"
        >
          <span>🔊</span>
          <span>Read Daily Routine</span>
        </button>
      </div>
    </div>
  );
};
