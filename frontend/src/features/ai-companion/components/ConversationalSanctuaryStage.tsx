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
import { usePatientExperienceSafe } from '../../../context/PatientExperienceContext.js';
import { CharacterVisualizer } from '../CharacterVisualizer.js';
import { AshaInteractiveCompanion2D } from './AshaInteractiveCompanion2D.js';
import { SpeechService } from '../../../services/speechService.js';
import { MultilingualVoicePipeline, TIER_1_WEB_SPEECH_LANGUAGES } from '../../../services/multilingualVoicePipeline.js';
import { queryAICompanion } from '../../../services/aiService.js';
import { PatientContextService, PatientContext } from '../../../services/patientContextService.js';
import { getEffectivePatientId, subscribeToDataChanges } from '../../auth/services/identityService.js';
import { RoutineService } from '../../routines/services/routineService.js';
import { ConversationActionRegistry } from '../services/conversationActionRegistry.js';
import { ConversationalAIService, AIConfigurationStatus } from '../services/conversationalAIService.js';
import { ChatMessage, WhitelistedAction, RoutineItem } from '../../../types/index.js';
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
  CheckCircle2,
  Settings,
  Phone,
  PhoneCall,
  X,
  Layers,
  Cpu,
  ShieldCheck,
} from 'lucide-react';

interface ConversationalSanctuaryStageProps {
  patientName?: string;
  onNavigateRoutines?: () => void;
  onLaunchRoutineRunner?: (routine: RoutineItem) => void;
  className?: string;
}

export const ConversationalSanctuaryStage: React.FC<ConversationalSanctuaryStageProps> = ({
  patientName = 'Sunita',
  onNavigateRoutines,
  onLaunchRoutineRunner,
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
    characterState,
    expression,
    triggerEmotion,
    autoSpeak,
    setAutoSpeak,
  } = useCharacter();

  const { t, language, isRTL, responseLanguage, spokenInputLanguages, readingPreference } = useLanguage();
  const effectiveSpeakLang = responseLanguage || language;
  const shouldAutoSpeak = autoSpeak || readingPreference === 'audio' || readingPreference === 'both';
  const { highContrast, simpleMode } = useAccessibility();
  const { isAshaOnly } = usePatientExperienceSafe();
  const reducedMotion = simpleMode;

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'avatar'>('canvas');
  const [showCaregiverModal, setShowCaregiverModal] = useState<boolean>(false);
  const [lastSpokenSpeech, setLastSpokenSpeech] = useState<string>('');
  const [isSpeakingActive, setIsSpeakingActive] = useState<boolean>(false);

  // AI Configuration & Transparency Status
  const [aiStatus, setAiStatus] = useState<AIConfigurationStatus>(() =>
    ConversationalAIService.getStatus()
  );
  const [showAIModal, setShowAIModal] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(() => ConversationalAIService.getModel());
  const [keyFeedback, setKeyFeedback] = useState<string | null>(null);

  const [localBridgeActive, setLocalBridgeActive] = useState<boolean>(() =>
    MultilingualVoicePipeline.isLocalBridgeOnline()
  );

  useEffect(() => {
    MultilingualVoicePipeline.checkLocalBridgeHealth().then((isOnline) => {
      setLocalBridgeActive(isOnline);
    });
  }, []);

  const refreshAiStatus = () => {
    setAiStatus(ConversationalAIService.getStatus());
    setSelectedModel(ConversationalAIService.getModel());
  };

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
      text: t('sanctuary.greeting_intro'),
      timestamp: 'Just now',
    },
  ]);

  // Update initial message on language switch
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'sanctuary-welcome-01') {
        return [
          {
            id: 'sanctuary-welcome-01',
            sender: 'ai',
            text: t('sanctuary.greeting_intro'),
            timestamp: 'Just now',
          },
        ];
      }
      return prev;
    });
  }, [language, effectiveName, t]);

  // Optional demo scenario hook for visual verification & documentation captures
  useEffect(() => {
    try {
      const demoData = localStorage.getItem('saksham_demo_scenario');
      if (demoData) {
        const parsed = JSON.parse(demoData);
        if (parsed.messages && Array.isArray(parsed.messages)) {
          setMessages(parsed.messages);
        }
        if (parsed.expression) {
          triggerEmotion(parsed.expression);
        }
        if (parsed.isListening) {
          setIsListening(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

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
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          } else {
            navigate('/patient/daily-routines');
          }
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
      case 'LAUNCH_ROUTINE_RUNNER': {
        const effectiveId = getEffectivePatientId(currentUser);
        const routines = RoutineService.getRoutines(effectiveId);
        const targetRoutine = routines.find((r) => r.id === _targetId) || routines[0];
        if (targetRoutine && onLaunchRoutineRunner) {
          onLaunchRoutineRunner(targetRoutine);
        }
        window.dispatchEvent(
          new CustomEvent('saksham:launch-routine-runner', { detail: { routineId: _targetId } })
        );
        break;
      }
      case 'CALL_CAREGIVER':
        setShowCaregiverModal(true);
        break;
      case 'NAVIGATE_HOME_GUIDE':
        navigate('/patient/home-guide');
        break;
      case 'OPEN_CAMERA':
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((stream) => {
              stream.getTracks().forEach((t) => t.stop());
              navigate('/patient/mind-games?game=game-room-memory');
            })
            .catch(() => {
              navigate('/patient/mind-games?game=game-room-memory');
            });
        } else {
          navigate('/patient/mind-games?game=game-room-memory');
        }
        break;
      case 'OPEN_TODO':
        navigate('/patient/daily-routines');
        break;
      case 'NAVIGATE_PROFILE':
        navigate('/patient/profile');
        break;
      default:
        console.warn('Unhandled sanctuary action:', action);
    }
  };

  const handleConfirmPending = async (pendingId: string) => {
    const effectiveId = getEffectivePatientId(currentUser);
    const execRes = await ConversationActionRegistry.executePendingConfirmation(
      effectiveId,
      pendingId,
      currentUser?.uid
    );
    triggerEmotion(execRes.success ? 'done_completed' : 'reassuring', 3000);
    const speech = language === 'hi' ? execRes.speechHi : execRes.speechEn;
    const confirmMsg: ChatMessage = {
      id: `ai-confirm-${Date.now()}`,
      sender: 'ai',
      text: speech,
      timestamp: 'Just now',
    };
    setMessages((prev) => [...prev, confirmMsg]);
    if (shouldAutoSpeak) {
      SpeechService.speak(speech, undefined, undefined, effectiveSpeakLang);
    }
  };

  const handleCancelPending = (_pendingId: string) => {
    const effectiveId = getEffectivePatientId(currentUser);
    ConversationActionRegistry.cancelPendingConfirmation(effectiveId);
    triggerEmotion('reassuring', 2500);
    const speech =
      effectiveSpeakLang === 'hi'
        ? 'मैंने आपका वह अनुरोध रद्द कर दिया है। आपकी कोई भी जानकारी नहीं बदली गई है।'
        : 'I have cancelled that request. No changes were made to your care sanctuary.';
    const cancelMsg: ChatMessage = {
      id: `ai-cancel-${Date.now()}`,
      sender: 'ai',
      text: speech,
      timestamp: 'Just now',
    };
    setMessages((prev) => [...prev, cancelMsg]);
    if (shouldAutoSpeak) {
      SpeechService.speak(speech, undefined, undefined, effectiveSpeakLang);
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
      const response = await queryAICompanion(
        query,
        'home',
        language,
        currentContext,
        currentUser?.uid,
        responseLanguage
      );

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
        pendingConfirmation: response.pendingConfirmation,
        clarificationOptions: response.clarificationOptions,
        isEmergency: response.isEmergency,
        isRealAI: response.isRealAI,
        executionMode: response.executionMode,
        modelUsed: response.modelUsed,
        configNotice: response.configNotice,
      };

      setMessages((prev) => [...prev, aiMsg]);
      triggerEmotion(response.characterState || 'explaining', 4000);
      setLastSpokenSpeech(responseSpeech);
      setIsSpeakingActive(true);

      if (shouldAutoSpeak) {
        SpeechService.speak(
          responseSpeech,
          () => {
            triggerEmotion('explaining', 0);
            setIsSpeakingActive(true);
          },
          () => {
            triggerEmotion('neutral', 1000);
            setIsSpeakingActive(false);
          },
          effectiveSpeakLang
        );
      } else {
        setTimeout(() => setIsSpeakingActive(false), Math.min(4500, responseSpeech.length * 80));
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
        if (response.suggestedAction.action === 'CALL_CAREGIVER') {
          handleActionDispatch('CALL_CAREGIVER', response.suggestedAction.targetId);
        } else {
          setTimeout(() => {
            handleActionDispatch(response.suggestedAction!.action, response.suggestedAction!.targetId);
          }, 1200);
        }
      }
    } catch {
      triggerEmotion('reassuring', 3000);
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
      MultilingualVoicePipeline.stopMicrophone();
      setIsListening(false);
      triggerEmotion('neutral');
    } else {
      setMicNotice(null);
      setIsListening(true);
      triggerEmotion('listening', 0);
      SpeechService.cancelSpeech();

      const targetLang = spokenInputLanguages?.[0] || language;
      stopListeningRef.current = MultilingualVoicePipeline.startListening(
        targetLang,
        (result) => {
          setIsListening(false);
          if (result.success && result.transcript) {
            setInputText(result.transcript);
            handleSendMessage(result.transcript);
          } else if (result.error) {
            triggerEmotion('neutral');
            setMicNotice(result.error);
            setTimeout(() => setMicNotice(null), 6000);
          }
        },
        (error) => {
          console.warn('Voice input error:', error);
          setIsListening(false);
          triggerEmotion('neutral');
          setMicNotice(error);
          setTimeout(() => setMicNotice(null), 6000);
        },
        () => {
          setIsListening(false);
        }
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
    ...(isAshaOnly
      ? [
          {
            id: 'quick-settings',
            icon: Settings,
            title: t('sanctuary.action_settings') || 'Settings & Profile',
            desc: t('sanctuary.action_settings_desc') || 'Care preferences and navigation mode',
            color: 'bg-slate-100 text-slate-900 border-slate-300',
            badgeColor: 'bg-slate-700 text-white',
            onClick: () => {
              triggerEmotion('explaining', 2000);
              navigate('/patient/profile');
            },
          },
        ]
      : []),
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
                Asha
              </span>
              <button
                type="button"
                onClick={() => {
                  refreshAiStatus();
                  setShowAIModal(true);
                }}
                className={`text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-full border transition flex items-center gap-1 cursor-pointer shadow-2xs ${
                  aiStatus.isConfigured
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
                title={`${aiStatus.statusMessage} (Tap to configure API / Privacy)`}
                aria-label={`AI Status: ${aiStatus.statusMessage}. Tap to configure.`}
                data-testid="ai-status-pill"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${aiStatus.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{aiStatus.isConfigured ? `Gemini Live (${aiStatus.modelIdentifier})` : 'Dev Fallback (Configure AI)'}</span>
              </button>

              <span
                data-testid="voice-pipeline-badge"
                className={`text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shadow-2xs ${
                  localBridgeActive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : TIER_1_WEB_SPEECH_LANGUAGES.includes(language)
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
                title={
                  localBridgeActive
                    ? 'Local Neural ASR Bridge (M1) Online - Real Acoustic Recognition for 23 Languages'
                    : TIER_1_WEB_SPEECH_LANGUAGES.includes(language)
                    ? `Browser Web Speech Engine (${language.toUpperCase()})`
                    : `Engine-Limited: Local Bridge recommended for ${language.toUpperCase()}`
                }
              >
                <span className={`w-1.5 h-1.5 rounded-full ${localBridgeActive ? 'bg-emerald-500 animate-pulse' : TIER_1_WEB_SPEECH_LANGUAGES.includes(language) ? 'bg-blue-500' : 'bg-slate-400'}`} />
                <span>{localBridgeActive ? 'M1 Bridge (23)' : TIER_1_WEB_SPEECH_LANGUAGES.includes(language) ? `Web Speech (${language.toUpperCase()})` : `Text/Touch (${language.toUpperCase()})`}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Companion Audio Toggle & Minimize */}
        <div className="flex items-center space-x-2">
          {isAshaOnly && (
            <button
              type="button"
              onClick={() => navigate('/patient/profile')}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-100/90 hover:bg-purple-200 text-purple-900 border border-purple-300 transition cursor-pointer flex items-center space-x-1 shadow-2xs"
              title="Asha-Only Mode active (tap to change in Settings)"
              aria-label="Asha-Only Mode active. Tap to change in Settings"
              data-testid="asha-only-mode-badge"
            >
              <span>Asha-Only</span>
              <Settings className="w-3 h-3 ml-0.5 text-purple-700" />
            </button>
          )}
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
              characterId="asha"
              state={characterState}
              expression={expression}
              mode="compact"
              size={48}
            />
            <div>
              <p className="text-sm font-bold text-purple-950">
                Asha is right here with you
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
            {viewMode === 'canvas' ? (
              <div className="flex flex-col items-center w-full">
                <AshaInteractiveCompanion2D
                  mode="sanctuary"
                  externalExpression={expression}
                  speechText={lastSpokenSpeech}
                  isSpeaking={isSpeakingActive}
                  reducedMotion={reducedMotion}
                  highContrast={highContrast}
                  onTap={() => triggerEmotion('greeting', 3500)}
                />
                {/* Accessible Screen-Reader Anchor & Test Compatibility */}
                <div className="sr-only" aria-hidden="false">
                  <CharacterVisualizer
                    characterId="asha"
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
              </div>
            ) : (
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
                  characterId="asha"
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
            )}

            {/* View Mode Toggle Pill & Tap Prompt */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setViewMode((prev) => (prev === 'canvas' ? 'avatar' : 'canvas'))}
                className="text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1 rounded-full transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Toggle between 2D Canvas Rig and Focus Avatar"
                aria-label={viewMode === 'canvas' ? 'Switch to Focus Avatar' : 'Switch to 2D Canvas Rig'}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{viewMode === 'canvas' ? '2D Canvas Rig' : 'Focus Avatar'}</span>
              </button>
              <span className="text-[11px] text-purple-700 font-medium opacity-90">
                Tap Asha to interact gently
              </span>
            </div>
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

                  {/* Explicit AI Engine / Simulation Disclosure Badge */}
                  {msg.sender === 'ai' && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]" data-testid="ai-execution-badge">
                      {msg.isRealAI ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                          Gemini Live AI ({msg.modelUsed || aiStatus.modelIdentifier})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-100/80 text-purple-800 border border-purple-200 font-medium">
                          <Cpu className="w-2.5 h-2.5 text-purple-600" />
                          Local Simulation Fallback
                        </span>
                      )}
                      {msg.configNotice && (
                        <span className="text-[10px] text-amber-700 italic font-medium">
                          • {msg.configNotice}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Immediate Emergency Care Support Banner */}
                  {msg.isEmergency && (
                    <div className="mt-2.5 p-3 rounded-xl border border-rose-300 bg-rose-50/95 text-rose-950 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-900">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Immediate Care Support</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleActionDispatch('CALL_CAREGIVER')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0 shadow-xs"
                      >
                        📞 Contact Caregiver
                      </button>
                    </div>
                  )}

                  {/* Class 3 Action Confirmation Guard */}
                  {msg.pendingConfirmation && (
                    <div className="mt-2.5 p-3.5 rounded-xl border-2 border-amber-300 bg-amber-50/95 text-amber-950 space-y-2 shadow-2xs">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                        <span>Action Confirmation Required</span>
                      </div>
                      <p className="text-xs font-medium text-amber-900 leading-relaxed">
                        {msg.pendingConfirmation.proposalText}
                      </p>
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmPending(msg.pendingConfirmation!.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition"
                        >
                          ✓ Confirm & Save
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelPending(msg.pendingConfirmation!.id)}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold cursor-pointer transition"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Clarification Options / Ambiguity Resolution */}
                  {msg.clarificationOptions && msg.clarificationOptions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.clarificationOptions.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendMessage(opt.query)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200 transition cursor-pointer"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.suggestedAction && !msg.pendingConfirmation && (
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
      {/* Caregiver Escalation Contact Modal (TASK-ASHA-05) */}
      {showCaregiverModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="caregiver-modal-title"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-purple-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="caregiver-modal-title" className="text-base font-bold text-gray-900">
                    Connect with Caregiver
                  </h3>
                  <p className="text-xs text-purple-700">Asha is right here with you</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCaregiverModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition cursor-pointer"
                aria-label="Close caregiver dialer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-purple-50/80 rounded-2xl p-4 border border-purple-100 flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-purple-200 border-2 border-white shadow-xs overflow-hidden flex items-center justify-center text-purple-800 font-bold text-lg shrink-0">
                {patientContext?.lovedOnes?.sampleMembers?.[0]?.photoUrl ? (
                  <img
                    src={patientContext.lovedOnes.sampleMembers[0].photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{patientContext?.lovedOnes?.sampleMembers?.[0]?.name?.[0] || 'P'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-purple-950 truncate">
                  {patientContext?.lovedOnes?.sampleMembers?.[0]?.name || 'Priya Sharma'}
                </p>
                <p className="text-xs text-purple-700 truncate">
                  {patientContext?.lovedOnes?.sampleMembers?.[0]?.relationship || 'Daughter & Primary Caregiver'}
                </p>
                <p className="text-xs font-mono text-gray-600 mt-0.5">
                  {patientContext?.lovedOnes?.sampleMembers?.[0]?.phoneNumber || '+91 98201 12345'}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Take a slow, gentle breath. Your caregiver is just one tap away.
            </p>

            <div className="space-y-2 pt-2">
              <a
                href={`tel:${patientContext?.lovedOnes?.sampleMembers?.[0]?.phoneNumber || '+919820112345'}`}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
              >
                <Phone className="w-5 h-5" />
                <span>Call {patientContext?.lovedOnes?.sampleMembers?.[0]?.name || 'Priya'} Directly</span>
              </a>

              <a
                href="tel:112"
                className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>National Emergency Services (112)</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setShowCaregiverModal(false);
                  navigate('/patient/loved-ones');
                }}
                className="w-full py-2 text-center text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
              >
                Open Family & Loved Ones Sanctuary →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Engine & Privacy Configuration Modal */}
      {showAIModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-modal-title"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-purple-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="ai-modal-title" className="text-base font-bold text-gray-900">
                    Conversational AI Engine & Privacy
                  </h3>
                  <p className="text-xs text-purple-700">Google Gemini Developer API (Free Tier $0.00)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAIModal(false);
                  setKeyFeedback(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition cursor-pointer"
                aria-label="Close AI configuration modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Engine Status */}
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                aiStatus.isConfigured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      aiStatus.isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  {aiStatus.isConfigured ? 'Live AI Active' : 'Offline Development Mode'}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/80 border">
                  {aiStatus.mode}
                </span>
              </div>
              <p className="font-medium">{aiStatus.statusMessage}</p>
              <p className="text-[11px] opacity-80">{aiStatus.quotaInfo}</p>
            </div>

            {/* API Key Configuration */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Gemini Free-Tier API Key (Google AI Studio)</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-800 text-[11px] underline"
                  >
                    Get Free Key ↗
                  </a>
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder={
                      aiStatus.isConfigured
                        ? '•••••••••••••••••••••••• (Configured)'
                        : 'Paste AIzaSy... key'
                    }
                    className="flex-1 px-3 py-2 text-xs font-mono border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (keyInput.trim().length > 10) {
                        ConversationalAIService.setApiKey(keyInput.trim());
                        setKeyInput('');
                        refreshAiStatus();
                        setKeyFeedback('✓ API Key saved to browser storage! Live Gemini AI is active.');
                      } else {
                        setKeyFeedback('Please enter a valid Gemini API key.');
                      }
                    }}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Save Key
                  </button>
                  {aiStatus.isConfigured && (
                    <button
                      type="button"
                      onClick={() => {
                        ConversationalAIService.clearApiKey();
                        refreshAiStatus();
                        setKeyFeedback('API Key removed. Reverted to local simulation fallback.');
                      }}
                      className="px-2.5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                      title="Clear configured key"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {keyFeedback && (
                  <p className="text-xs font-semibold text-purple-700 mt-1">{keyFeedback}</p>
                )}
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Active Free-Tier Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    ConversationalAIService.setModel(newModel);
                    setSelectedModel(newModel);
                    refreshAiStatus();
                  }}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {ConversationalAIService.SUPPORTED_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m} {m === 'gemini-1.5-flash' ? '(Recommended — 15 RPM / 1M TPM)' : m === 'gemini-2.0-flash' ? '(Fast & Experimental)' : '(Ultra-light)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Privacy and De-Identification Statement */}
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-xs space-y-1.5 text-purple-950">
                <div className="flex items-center gap-1.5 font-bold text-purple-900">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>On-Device Privacy & De-Identification Boundary</span>
                </div>
                <p className="text-[11px] leading-relaxed text-purple-900">
                  Saksham never transmits Protected Health Information (PHI) to external LLMs. Before sending requests to Google Gemini:
                </p>
                <ul className="text-[11px] list-disc list-inside space-y-0.5 text-purple-800">
                  <li>Patient and loved ones names are redacted and anonymized.</li>
                  <li>Phone numbers, emails, and personal identifiers are scrubbed.</li>
                  <li>Clinical diagnoses (Alzheimer's, Dementia, MCI, GDS stage) are blocked.</li>
                  <li>Prescription drugs (Donepezil, Memantine, etc.) are strictly shielded.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAIModal(false);
                  setKeyFeedback(null);
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
