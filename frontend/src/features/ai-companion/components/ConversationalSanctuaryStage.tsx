/**
 * SAKSHAM — MILESTONE 7.2: CONVERSATIONAL SANCTUARY STAGE
 * Prominent character-led sanctuary with accessible conversation input,
 * honest microphone availability detection, and tactile quick actions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacter } from '../../../context/CharacterContext.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { useAccessibility } from '../../../context/AccessibilityContext.js';
import { useAuthSafe } from '../../../context/AuthContext.js';
import { CharacterVisualizer } from '../CharacterVisualizer.js';
import { SpeechService } from '../../../services/speechService.js';
import { queryAICompanion } from '../../../services/aiService.js';
import { PatientContextService, PatientContext } from '../../../services/patientContextService.js';
import { getEffectivePatientId, subscribeToDataChanges } from '../../auth/services/identityService.js';
import { RoutineService } from '../../routines/services/routineService.js';
import { ChatMessage, WhitelistedAction } from '../../../types/index.js';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  CalendarCheck,
  Gamepad2,
  Users,
  FileText,
  Calendar,
  Volume2,
  VolumeX,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  UserCheck,
} from 'lucide-react';

interface ConversationalSanctuaryStageProps {
  patientName?: string;
  onNavigateRoutines?: () => void;
  className?: string;
}

export const ConversationalSanctuaryStage: React.FC<ConversationalSanctuaryStageProps> = ({
  patientName = 'Sunita',
  onNavigateRoutines,
  className = '',
}) => {
  const navigate = useNavigate();
  const auth = useAuthSafe();
  const currentUser = auth?.currentUser ?? null;
  const effectiveName =
    patientName && patientName !== 'Sunita'
      ? patientName
      : currentUser?.displayName || patientName || 'Sunita';

  const {
    activeCharacter,
    setActiveCharacter,
    characterState,
    expression,
    triggerEmotion,
    autoSpeak,
    setAutoSpeak,
  } = useCharacter();

  const { t, language, isRTL } = useLanguage();
  const { highContrast, simpleMode } = useAccessibility();
  const reducedMotion = simpleMode;

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Honest speech recognition capability detection
  const isSpeechSupported = SpeechService.isSpeechRecognitionSupported();

  const stopListeningRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reactive Patient Context & Suggestions
  const [patientContext, setPatientContext] = useState<PatientContext>(() =>
    PatientContextService.getPatientContext(currentUser)
  );

  useEffect(() => {
    setPatientContext(PatientContextService.getPatientContext(currentUser));
    const unsubscribe = subscribeToDataChanges(({ patientId }) => {
      const effectiveId = getEffectivePatientId(currentUser);
      if (!patientId || patientId === effectiveId || !currentUser) {
        setPatientContext(PatientContextService.getPatientContext(currentUser));
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Quick suggestion chips customized with patient data
  const firstLovedOne = patientContext?.lovedOnes?.sampleMembers?.[0]?.name;
  const suggestions = [
    { label: t('ai.suggestion_what_can_i_do'), query: 'Explain what I can do here' },
    { label: t('ai.suggestion_schedule'), query: 'What should I do at 11 AM?' },
    { label: t('ai.suggestion_play_game'), query: 'I want to play a game' },
    {
      label: firstLovedOne
        ? t('ai.suggestion_who_is', { name: firstLovedOne })
        : t('ai.suggestion_see_family'),
      query: firstLovedOne ? `Who is ${firstLovedOne}?` : 'I want to see my family',
    },
  ];

  // Initial welcome message from Asha
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'sanctuary-welcome-01',
      sender: 'ai',
      text:
        activeCharacter === 'asha'
          ? t('sanctuary.greeting_intro')
          : t('ai.greeting_kabir', { name: effectiveName }),
      timestamp: 'Just now',
    },
  ]);

  // Update initial message on language or companion switch
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'sanctuary-welcome-01') {
        return [
          {
            id: 'sanctuary-welcome-01',
            sender: 'ai',
            text:
              activeCharacter === 'asha'
                ? t('sanctuary.greeting_intro')
                : t('ai.greeting_kabir', { name: effectiveName }),
            timestamp: 'Just now',
          },
        ];
      }
      return prev;
    });
  }, [language, activeCharacter, effectiveName, t]);

  // Clean up listening on unmount
  useEffect(() => {
    return () => {
      if (stopListeningRef.current) {
        stopListeningRef.current();
      }
      SpeechService.cancelSpeech();
    };
  }, []);

  // Dispatch safe action
  const handleActionDispatch = (action: WhitelistedAction, _targetId?: string) => {
    switch (action) {
      case 'NAVIGATE_MIND_GAMES':
      case 'NAVIGATE_ROOM_MEMORY':
        navigate('/patient/mind-games');
        break;
      case 'NAVIGATE_ROUTINES':
      case 'TRIGGER_ROUTINE_REMINDER':
      case 'TRIGGER_ASSISTANCE_TRAY':
        if (onNavigateRoutines) {
          onNavigateRoutines();
        } else {
          const el = document.getElementById('daily-routines-workspace');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      case 'NAVIGATE_LOVED_ONES':
      case 'SHOW_FAMILY_MEMBER':
        navigate('/patient/loved-ones');
        break;
      case 'NAVIGATE_HOME':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'OPEN_NOTES':
        window.dispatchEvent(new CustomEvent('saksham:open-notes'));
        break;
      case 'OPEN_CALENDAR':
        window.dispatchEvent(new CustomEvent('saksham:open-calendar'));
        break;
      case 'OPEN_UTILITIES':
        window.dispatchEvent(new CustomEvent('saksham:open-utility'));
        break;
      default:
        console.warn('Unhandled sanctuary action:', action);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    setMicNotice(null);
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
      const currentContext = PatientContextService.getPatientContext(currentUser);
      const response = await queryAICompanion(query, 'home', language, currentContext);

      // Check if response matches known intents or needs honest unsupported fallback
      const isKnown =
        response.suggestedAction ||
        (response.speech &&
          !response.speech.includes('ai.fallback_understanding') &&
          !response.speech.includes('Would you like to check your next scheduled routine'));

      const responseSpeech = isKnown
        ? response.speech
        : t('sanctuary.unsupported_fallback');

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: responseSpeech,
        timestamp: 'Just now',
        suggestedAction: response.suggestedAction,
      };

      setMessages((prev) => [...prev, aiMsg]);
      triggerEmotion(response.characterState || 'explaining', 4000);

      if (autoSpeak) {
        SpeechService.speak(
          responseSpeech,
          () => triggerEmotion('explaining', 0),
          () => triggerEmotion('neutral', 1000),
          language === 'hi' ? 'hi-IN' : 'en-IN'
        );
      }

      // Execute routine creation if requested
      if (response.newRoutine) {
        const effectiveId = getEffectivePatientId(currentUser);
        RoutineService.addRoutine(effectiveId, {
          id: `routine-${Date.now()}`,
          title: response.newRoutine.title,
          scheduledTime: response.newRoutine.scheduledTime,
          category: (response.newRoutine.category as any) || 'wellness',
          period: 'afternoon',
          isCompleted: false,
          enableAssistedRecall: true,
          streakCount: 0,
        });
      }

      if (response.suggestedAction) {
        setTimeout(() => {
          handleActionDispatch(response.suggestedAction!.action, response.suggestedAction!.targetId);
        }, 1200);
      }
    } catch {
      triggerEmotion('reassuring', 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    // Honest detection: if browser doesn't support Web Speech API, explain clearly
    if (!isSpeechSupported) {
      setMicNotice(t('sanctuary.mic_unsupported'));
      setTimeout(() => setMicNotice(null), 6000);
      return;
    }

    if (isListening) {
      if (stopListeningRef.current) {
        stopListeningRef.current();
        stopListeningRef.current = null;
      }
      setIsListening(false);
      triggerEmotion('neutral');
    } else {
      setMicNotice(null);
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
          console.warn('Voice input error:', error);
          setIsListening(false);
          triggerEmotion('neutral');
        },
        () => {
          setIsListening(false);
        },
        language === 'hi' ? 'hi-IN' : 'en-IN'
      );
    }
  };

  // 5 Contextual Tactile Quick Actions
  const quickActions = [
    {
      id: 'quick-routines',
      icon: CalendarCheck,
      title: t('sanctuary.action_routines'),
      desc: t('sanctuary.action_routines_desc'),
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      badgeColor: 'bg-purple-600 text-white',
      onClick: () => {
        triggerEmotion('guiding', 3000);
        if (onNavigateRoutines) {
          onNavigateRoutines();
        } else {
          const el = document.getElementById('daily-routines-workspace');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      },
    },
    {
      id: 'quick-games',
      icon: Gamepad2,
      title: t('sanctuary.action_games'),
      desc: t('sanctuary.action_games_desc'),
      color: 'bg-amber-100 text-amber-900 border-amber-200',
      badgeColor: 'bg-amber-600 text-white',
      onClick: () => {
        triggerEmotion('happy', 3000);
        navigate('/patient/mind-games');
      },
    },
    {
      id: 'quick-family',
      icon: Users,
      title: t('sanctuary.action_family'),
      desc: t('sanctuary.action_family_desc'),
      color: 'bg-rose-100 text-rose-900 border-rose-200',
      badgeColor: 'bg-rose-600 text-white',
      onClick: () => {
        triggerEmotion('referring_past', 3000);
        navigate('/patient/loved-ones');
      },
    },
    {
      id: 'quick-notes',
      icon: FileText,
      title: t('sanctuary.action_notes'),
      desc: t('sanctuary.action_notes_desc'),
      color: 'bg-indigo-100 text-indigo-900 border-indigo-200',
      badgeColor: 'bg-indigo-600 text-white',
      onClick: () => {
        triggerEmotion('noting_saving', 3000);
        window.dispatchEvent(new CustomEvent('saksham:open-notes'));
      },
    },
    {
      id: 'quick-calendar',
      icon: Calendar,
      title: t('sanctuary.action_calendar'),
      desc: t('sanctuary.action_calendar_desc'),
      color: 'bg-teal-100 text-teal-900 border-teal-200',
      badgeColor: 'bg-teal-600 text-white',
      onClick: () => {
        triggerEmotion('reminder', 3000);
        window.dispatchEvent(new CustomEvent('saksham:open-calendar'));
      },
    },
  ];

  return (
    <div
      className={`rounded-3xl p-5 md:p-7 transition-all duration-300 shadow-soft-purple border ${
        highContrast
          ? 'bg-neutral-950 text-white border-4 border-amber-400'
          : 'bg-gradient-to-br from-lavender-100 via-purple-50 to-pink-50/40 text-slate-900 border-purple-200/90'
      } ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label="Saksham Conversational Sanctuary"
    >
      {/* Sanctuary Top Bar: Branding & Ambient Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-200/60 mb-5">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base md:text-lg text-slate-900 font-heading">
                Saksham AI Companion
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full border border-purple-200">
                {activeCharacter === 'asha' ? 'Asha' : 'Kabir'}
              </span>
            </div>
          </div>
        </div>

        {/* Companion Customization & Audio Toggle */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveCharacter(activeCharacter === 'asha' ? 'kabir' : 'asha')}
            className="flex items-center space-x-1 text-xs font-bold px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-800 rounded-full border border-purple-200 transition cursor-pointer shadow-2xs min-h-[38px]"
            title="Switch companion character"
            aria-label={`Switch companion character to ${activeCharacter === 'asha' ? 'Kabir' : 'Asha'}`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              Switch to {activeCharacter === 'asha' ? 'Kabir' : 'Asha'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAutoSpeak(!autoSpeak);
              if (autoSpeak) SpeechService.cancelSpeech();
            }}
            className={`p-2 rounded-full border transition cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center ${
              autoSpeak
                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                : 'bg-white text-slate-500 border-slate-300'
            }`}
            title={autoSpeak ? 'Voice output enabled (tap to mute)' : 'Voice output muted (tap to enable)'}
            aria-label={autoSpeak ? 'Mute voice output' : 'Enable voice output'}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 rounded-full bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 transition cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
            title={isMinimized ? 'Expand Companion' : 'Minimize Companion'}
            aria-label={isMinimized ? 'Expand Companion' : 'Minimize Companion'}
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* When Minimized: Calm fallback bar */}
      {isMinimized ? (
        <div
          onClick={() => setIsMinimized(false)}
          className="flex items-center justify-between bg-white/95 p-3.5 rounded-2xl border border-purple-200 cursor-pointer hover:bg-white transition shadow-sm"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setIsMinimized(false)}
          aria-label="Expand Asha Conversational Sanctuary"
        >
          <div className="flex items-center space-x-3">
            <CharacterVisualizer
              characterId={activeCharacter}
              state={characterState}
              expression={expression}
              mode="compact"
              size={48}
            />
            <div>
              <p className="text-sm font-bold text-purple-950">
                {activeCharacter === 'asha'
                  ? 'Asha is right here with you'
                  : 'Kabir is right here with you'}
              </p>
              <p className="text-xs text-slate-500">
                Tap to expand conversation or ask a question
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
            Open Chat
          </span>
        </div>
      ) : (
        /* BALANCED SANCTUARY LAYOUT: Side-by-Side on Desktop/Tablet, Vertical on Mobile */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* LEFT / TOP STAGE: Prominent Asha Character (md:col-span-5) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center p-3">
            <div
              className="cursor-pointer transition-transform hover:scale-102 active:scale-98"
              onClick={() => triggerEmotion('greeting', 3500)}
              title="Tap Asha to say hello"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && triggerEmotion('greeting', 3500)}
              aria-label="Interactive Asha character. Tap to interact."
            >
              <CharacterVisualizer
                characterId={activeCharacter}
                state={characterState}
                expression={expression}
                mode="primary"
                size={180}
                showBadge={true}
                showLabel={true}
                showAura={true}
                highContrast={highContrast}
                reducedMotion={reducedMotion}
              />
            </div>
            <p className="text-xs text-purple-700 font-semibold mt-2 opacity-90">
              Tap Asha to interact gently
            </p>
          </div>

          {/* RIGHT / MAIN AREA: Conversation Area & Quick Actions (md:col-span-7) */}
          <div className="md:col-span-7 space-y-4">
            {/* Conversation Messages Balloon */}
            <div
              className={`rounded-2xl p-4 border max-h-48 overflow-y-auto space-y-2.5 transition shadow-xs ${
                highContrast
                  ? 'bg-neutral-900 border-neutral-700 text-white'
                  : 'bg-white/95 border-purple-100 text-slate-800'
              }`}
              role="region"
              aria-label="Conversation with Asha"
            >
              {messages.slice(-3).map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl transition ${
                    msg.sender === 'user'
                      ? 'bg-purple-100/90 text-purple-950 border border-purple-200 ml-auto max-w-[90%] font-semibold'
                      : highContrast
                      ? 'bg-neutral-800 text-white border border-neutral-700 font-medium'
                      : 'bg-lavender-50/80 text-purple-950 font-medium'
                  }`}
                >
                  <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                  {msg.suggestedAction && (
                    <button
                      type="button"
                      onClick={() =>
                        handleActionDispatch(
                          msg.suggestedAction!.action,
                          msg.suggestedAction!.targetId
                        )
                      }
                      className="mt-2.5 inline-flex items-center space-x-1.5 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <span>👉 {msg.suggestedAction.description}</span>
                    </button>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center space-x-2 text-xs text-purple-600 py-1 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
                  <span>Thinking gently...</span>
                </div>
              )}
            </div>

            {/* Conversation Input Area: Accessible Text & Real Speech Detection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={isListening ? t('ai.voice_start') : t('sanctuary.input_placeholder')}
                    aria-label={t('sanctuary.input_placeholder')}
                    className={`w-full py-3.5 pl-4 pr-11 rounded-2xl border text-sm md:text-base font-medium focus:outline-none transition shadow-inner ${
                      highContrast
                        ? 'bg-black text-white border-2 border-amber-400 focus:ring-2 focus:ring-amber-300'
                        : isListening
                        ? 'bg-white border-purple-500 ring-2 ring-purple-300 placeholder-purple-700 font-bold'
                        : 'bg-white border-purple-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-200'
                    }`}
                  />
                  {inputText && (
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-purple-600 hover:text-purple-800 transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title={t('sanctuary.send')}
                      aria-label={t('sanctuary.send')}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Microphone Button with Honest Capability Feedback */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`flex-shrink-0 flex items-center justify-center p-3.5 rounded-2xl transition-all cursor-pointer min-w-[50px] min-h-[50px] shadow-sm ${
                    !isSpeechSupported
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : isListening
                      ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-200'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                  title={
                    !isSpeechSupported
                      ? t('sanctuary.mic_unsupported')
                      : isListening
                      ? t('ai.voice_start')
                      : t('ai.voice_stop')
                  }
                  aria-label={
                    !isSpeechSupported
                      ? t('sanctuary.mic_unsupported')
                      : isListening
                      ? t('ai.voice_start')
                      : t('ai.voice_stop')
                  }
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>

              {/* Honest Microphone Unsupported Notice Toast */}
              {micNotice && (
                <div
                  className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center space-x-2 animate-in fade-in"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{micNotice}</span>
                </div>
              )}

              {/* Helpful Suggestion Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-500 font-semibold flex-shrink-0">Try asking:</span>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(s.query)}
                    className="flex-shrink-0 bg-white/90 hover:bg-white text-purple-700 px-3 py-1 rounded-full border border-purple-200 font-semibold transition-colors shadow-2xs cursor-pointer min-h-[30px]"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tactile Quick-Action Alternative Cards (5 Destinations) */}
            <div className="pt-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Tactile Quick Actions (1-Tap Alternatives)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickActions.map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <button
                      key={qa.id}
                      type="button"
                      onClick={qa.onClick}
                      className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between min-h-[72px] cursor-pointer group shadow-2xs hover:shadow-sm ${
                        highContrast
                          ? 'bg-neutral-900 border-2 border-neutral-700 hover:border-amber-400 text-white'
                          : `bg-white/95 hover:bg-white border-purple-200/80 hover:border-purple-300 text-slate-800`
                      }`}
                      aria-label={`${qa.title} - ${qa.desc}`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div
                          className={`p-2 rounded-xl transition-transform group-hover:scale-105 ${qa.color}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          Open
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1">
                          {qa.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1">
                          {qa.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
