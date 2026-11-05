import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacter } from '../../context/CharacterContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { CharacterVisualizer } from './CharacterVisualizer.js';
import { SpeechService } from '../../services/speechService.js';
import { queryAICompanion } from '../../services/aiService.js';
import { ChatMessage, WhitelistedAction } from '../../types/index.js';
import { Mic, MicOff, Send, Volume2, VolumeX, Sparkles, UserCheck } from 'lucide-react';

interface AICompanionProps {
  onNavigateAction?: (action: WhitelistedAction, targetId?: string) => void;
  className?: string;
}

export const AICompanion: React.FC<AICompanionProps> = ({ onNavigateAction, className = '' }) => {
  const navigate = useNavigate();
  const { activeCharacter, setActiveCharacter, characterState, triggerEmotion, autoSpeak, setAutoSpeak } = useCharacter();
  const { t, language } = useLanguage();

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-01',
      sender: 'ai',
      text: activeCharacter === 'asha'
        ? "Namaste, Sunita! I'm Asha, your gentle care companion. How can I help you today?"
        : "Namaste, Sunita! I'm Kabir, your memory buddy. I'm right here with you.",
      timestamp: 'Just now',
    },
  ]);

  const stopListeningRef = useRef<(() => void) | null>(null);

  // Quick suggestion chips
  const suggestions = [
    { label: '🎮 Play a memory game', query: 'I want to play a game' },
    { label: '⏰ What should I do at 11 AM?', query: 'What should I do at 11 AM?' },
    { label: '👨‍👩‍👧 See my daughter', query: 'I want to see my daughter' },
    { label: '👓 Where are my glasses?', query: 'Where did I keep my glasses?' },
  ];

  // Dispatch safe whitelisted action
  const handleActionDispatch = (action: WhitelistedAction, targetId?: string) => {
    if (onNavigateAction) {
      onNavigateAction(action, targetId);
      return;
    }

    switch (action) {
      case 'NAVIGATE_MIND_GAMES':
      case 'NAVIGATE_ROOM_MEMORY':
        navigate('/patient/mind-games');
        break;
      case 'NAVIGATE_ROUTINES':
      case 'TRIGGER_ROUTINE_REMINDER':
      case 'TRIGGER_ASSISTANCE_TRAY':
        navigate('/patient/routines');
        break;
      case 'NAVIGATE_LOVED_ONES':
      case 'SHOW_FAMILY_MEMBER':
        navigate('/patient/loved-ones');
        break;
      case 'NAVIGATE_HOME':
        navigate('/patient');
        break;
      default:
        console.warn('Unhandled safe action:', action);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    // Append user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    triggerEmotion('thinking', 0);

    try {
      const response = await queryAICompanion(query, 'home', language);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.speech,
        timestamp: 'Just now',
        suggestedAction: response.suggestedAction,
      };

      setMessages((prev) => [...prev, aiMsg]);
      triggerEmotion(response.characterState || 'speaking', 4000);

      // Voice output if enabled
      if (autoSpeak) {
        SpeechService.speak(
          response.speech,
          () => triggerEmotion('speaking', 0),
          () => triggerEmotion('idle', 1000),
          language === 'hi' ? 'hi-IN' : 'en-IN'
        );
      }

      // Execute safe navigation if suggested
      if (response.suggestedAction) {
        setTimeout(() => {
          handleActionDispatch(response.suggestedAction!.action, response.suggestedAction!.targetId);
        }, 1200);
      }
    } catch {
      triggerEmotion('encouraging', 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      if (stopListeningRef.current) {
        stopListeningRef.current();
        stopListeningRef.current = null;
      }
      setIsListening(false);
      triggerEmotion('idle');
    } else {
      setIsListening(true);
      triggerEmotion('listening', 0);
      SpeechService.cancelSpeech();

      stopListeningRef.current = SpeechService.startListening(
        (transcript) => {
          setIsListening(false);
          setInputText(transcript);
          handleSendMessage(transcript);
        },
        (error) => {
          console.warn('Voice recognition note:', error);
          setIsListening(false);
          triggerEmotion('idle');
        },
        () => {
          setIsListening(false);
        },
        language === 'hi' ? 'hi-IN' : 'en-IN'
      );
    }
  };

  useEffect(() => {
    return () => {
      if (stopListeningRef.current) {
        stopListeningRef.current();
      }
      SpeechService.cancelSpeech();
    };
  }, []);

  return (
    <div className={`bg-gradient-to-br from-lavender-100 via-purple-50 to-saksham-rose/30 rounded-3xl p-5 md:p-6 shadow-soft-purple border border-purple-200/80 ${className}`}>
      {/* Companion Header */}
      <div className="flex items-center justify-between pb-3 border-b border-purple-200/50 mb-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span className="font-bold text-saksham-darkText text-base md:text-lg">
            Saksham AI Companion
          </span>
          <span className="text-xs px-2.5 py-0.5 bg-purple-100 text-purple-700 font-medium rounded-full border border-purple-200">
            {activeCharacter === 'asha' ? 'Asha' : 'Kabir'}
          </span>
        </div>

        {/* Companion Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveCharacter(activeCharacter === 'asha' ? 'kabir' : 'asha')}
            className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 rounded-full border border-purple-200 transition-colors shadow-sm"
            title="Switch companion character"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Switch to {activeCharacter === 'asha' ? 'Kabir' : 'Asha'}</span>
          </button>

          <button
            onClick={() => {
              setAutoSpeak(!autoSpeak);
              if (autoSpeak) SpeechService.cancelSpeech();
            }}
            className={`p-1.5 rounded-full border transition-colors ${
              autoSpeak ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-200'
            }`}
            title={autoSpeak ? 'Voice output enabled (tap to mute)' : 'Voice output muted (tap to enable)'}
            aria-label="Toggle voice output"
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Avatar & Speaking Balloon */}
      <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 mb-5">
        <div className="flex-shrink-0 cursor-pointer" onClick={() => triggerEmotion('greeting', 3000)}>
          <CharacterVisualizer characterId={activeCharacter} state={characterState} size={130} />
          <p className="text-center text-xs text-purple-600 font-medium mt-1">Tap to say hi!</p>
        </div>

        {/* Conversational Balloon */}
        <div className="flex-1 w-full bg-white/95 rounded-2xl p-4 shadow-sm border border-purple-100 relative">
          <div className="absolute top-4 -left-2 hidden sm:block w-3 h-3 bg-white transform rotate-45 border-l border-b border-purple-100" />
          <div className="max-h-36 overflow-y-auto space-y-2.5 pr-1 text-sm md:text-base">
            {messages.slice(-3).map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 rounded-xl ${
                  msg.sender === 'user'
                    ? 'bg-purple-50 text-purple-900 border border-purple-100 ml-auto max-w-[85%]'
                    : 'bg-lavender-50/70 text-saksham-darkText font-medium'
                }`}
              >
                <p>{msg.text}</p>
                {msg.suggestedAction && (
                  <button
                    onClick={() => handleActionDispatch(msg.suggestedAction!.action, msg.suggestedAction!.targetId)}
                    className="mt-2 inline-flex items-center space-x-1.5 text-xs font-bold bg-purple-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-purple-700 transition"
                  >
                    <span>👉 {msg.suggestedAction.description}</span>
                  </button>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 text-xs text-purple-600 py-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                <span>Thinking gently...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Bar: Text & Voice */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isListening ? t('ai.voice_start') : t('ai.input_placeholder')}
            className={`w-full py-3 pl-4 pr-10 rounded-2xl border text-sm md:text-base bg-white focus:outline-none transition-all shadow-inner ${
              isListening
                ? 'border-purple-500 ring-2 ring-purple-300 placeholder-purple-700 font-semibold'
                : 'border-purple-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-200'
            }`}
          />
          {inputText && (
            <button
              onClick={() => handleSendMessage()}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-purple-600 hover:text-purple-800 transition"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Voice Input Button */}
        <button
          onClick={toggleVoiceInput}
          className={`flex-shrink-0 flex items-center justify-center p-3.5 rounded-2xl shadow-md transition-all duration-200 ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-200'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
          title={isListening ? 'Listening... Tap to stop' : 'Tap to speak'}
          aria-label="Voice input"
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>

      {/* Helpful Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-gray-500 font-medium flex-shrink-0">Try asking:</span>
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(s.query)}
            className="flex-shrink-0 bg-white/90 hover:bg-white text-purple-700 px-3 py-1 rounded-full border border-purple-200 font-medium transition-colors shadow-xs"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
};
