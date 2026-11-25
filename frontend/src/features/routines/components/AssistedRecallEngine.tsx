import React, { useState } from 'react';
import { RoutineItem } from '../../../types/index.js';
import { SpeechService } from '../../../services/speechService.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { translate } from '../../../i18n/interpolate.js';
import {
  getTranslatedRoutineTitle,
  getTranslatedRoutineCategory,
  getTranslatedRoutineRecallContent,
} from '../utils/routineTranslation.js';
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Play,
  Heart,
} from 'lucide-react';

export interface RecallSessionState {
  attemptCount: number;
  selectedOption: number | null;
  feedbackState: 'idle' | 'correct' | 'hint' | 'revealed';
  isHintExpanded: boolean;
}

interface AssistedRecallEngineProps {
  routines: RoutineItem[];
  currentIndex: number;
  onNavigateIndex: (index: number) => void;
  onComplete: (routineId: string) => void;
  onLaunchTaskRunner: (routine: RoutineItem) => void;
  onRecordAttempt: (routineId: string, attemptsUsed: number, skipped: boolean, completed: boolean) => void;
  onLaunchAssistanceTray?: (routine: RoutineItem) => void;
  language?: string;
  session?: RecallSessionState;
  onUpdateSession?: (routineId: string, session: RecallSessionState) => void;
}

export const AssistedRecallEngine: React.FC<AssistedRecallEngineProps> = ({
  routines,
  currentIndex,
  onNavigateIndex,
  onComplete,
  onLaunchTaskRunner,
  onRecordAttempt,
  onLaunchAssistanceTray,
  language = 'en',
  session,
  onUpdateSession,
}) => {
  const langCtx = useLanguage();
  const effectiveLang = (language && language !== 'en' ? language : langCtx.language) || 'en';
  const t = (key: string, params?: Record<string, string | number>) =>
    langCtx.language === effectiveLang
      ? langCtx.t(key, params)
      : translate(effectiveLang as any, key, params);

  const activeRoutine = routines[currentIndex] || routines[0];

  const [attemptCount, setAttemptCount] = useState<number>(() => session?.attemptCount ?? 1);
  const [selectedOption, setSelectedOption] = useState<number | null>(() => session?.selectedOption ?? null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'hint' | 'revealed'>(
    () => session?.feedbackState ?? 'idle'
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHintExpanded, setIsHintExpanded] = useState<boolean>(() => session?.isHintExpanded ?? false);
  const [isAutoLaunching, setIsAutoLaunching] = useState(false);
  const hasAutoLaunchedRef = React.useRef(false);

  React.useEffect(() => {
    hasAutoLaunchedRef.current = false;
    setIsAutoLaunching(false);
    if (session) {
      setAttemptCount(session.attemptCount);
      setSelectedOption(session.selectedOption);
      setFeedbackState(session.feedbackState);
      setIsHintExpanded(session.isHintExpanded);
    } else {
      setAttemptCount(1);
      setSelectedOption(null);
      setFeedbackState('idle');
      setIsHintExpanded(false);
    }
  }, [activeRoutine?.id, session?.attemptCount, session?.feedbackState]);

  if (!activeRoutine || routines.length === 0) {
    return (
      <div className="p-8 text-center bg-white/80 rounded-2xl border-2 border-dashed border-purple-200 space-y-3">
        <Heart className="w-10 h-10 text-purple-400 mx-auto" />
        <h3 className="text-base font-bold text-purple-950">{t('recall.empty_title')}</h3>
        <p className="text-xs text-purple-800/80 max-w-sm mx-auto">
          {t('recall.empty_desc')}
        </p>
      </div>
    );
  }

  const localizedTitle = getTranslatedRoutineTitle(activeRoutine, t, effectiveLang);
  const localizedCategory = getTranslatedRoutineCategory(activeRoutine.category, t);
  const {
    question: defaultQuestion,
    options: defaultOptions,
    hint1,
    hint2,
    hint3,
  } = getTranslatedRoutineRecallContent(activeRoutine, t, effectiveLang);

  const correctIndex = activeRoutine.correctOptionIndex ?? 0;

  const getHintForAttempt = (lvl: number): string => {
    if (lvl === 1) return hint1;
    if (lvl === 2) return hint2;
    return hint3;
  };

  const handleSelectRoutine = (newIdx: number) => {
    SpeechService.cancelSpeech();
    setIsSpeaking(false);
    setAttemptCount(1);
    setSelectedOption(null);
    setFeedbackState('idle');
    setIsHintExpanded(false);
    onNavigateIndex(newIdx);
  };

  const handleReadAloud = (text: string) => {
    setIsSpeaking(true);
    SpeechService.speak(
      text,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      language || 'en'
    );
  };

  const handleChooseOption = (optionIndex: number) => {
    if (isAutoLaunching) return;
    setSelectedOption(optionIndex);

    if (optionIndex === correctIndex) {
      setFeedbackState('correct');
      audioSynthesizer.playChime('fanfare');
      onRecordAttempt(activeRoutine.id, attemptCount, false, true);
      handleReadAloud(t('recall.correct_speech'));
      onUpdateSession?.(activeRoutine.id, {
        attemptCount,
        selectedOption: optionIndex,
        feedbackState: 'correct',
        isHintExpanded,
      });
    } else {
      if (attemptCount === 1) {
        // 1st mistake: 1 heart broken (❤️❤️🤍, 2 Left)
        const nextAttempt = 2;
        setAttemptCount(nextAttempt);
        setFeedbackState('hint');
        audioSynthesizer.playChime('bell');
        handleReadAloud(t('recall.first_mistake_speech', { hint: getHintForAttempt(1) }));
        onUpdateSession?.(activeRoutine.id, {
          attemptCount: nextAttempt,
          selectedOption: optionIndex,
          feedbackState: 'hint',
          isHintExpanded: false,
        });
      } else if (attemptCount === 2) {
        // 2nd mistake: 2 hearts broken (❤️🤍🤍, 1 Left), clinical hint automatically revealed
        const nextAttempt = 3;
        setAttemptCount(nextAttempt);
        setIsHintExpanded(true);
        setFeedbackState('hint');
        audioSynthesizer.playChime('bell');
        handleReadAloud(t('routines.hint_intro', { hint: getHintForAttempt(2) }));
        onUpdateSession?.(activeRoutine.id, {
          attemptCount: nextAttempt,
          selectedOption: optionIndex,
          feedbackState: 'hint',
          isHintExpanded: true,
        });
      } else {
        // 3rd mistake: 3 hearts broken (🤍🤍🤍, Guided), solution revealed + automatic 15-minute task runner timer
        const nextAttempt = 4;
        setAttemptCount(nextAttempt);
        setFeedbackState('revealed');
        setIsHintExpanded(true);
        audioSynthesizer.playChime('chime');
        onRecordAttempt(activeRoutine.id, 3, false, false);
        handleReadAloud(t('routines.revealed_intro', { title: localizedTitle }));
        onUpdateSession?.(activeRoutine.id, {
          attemptCount: nextAttempt,
          selectedOption: optionIndex,
          feedbackState: 'revealed',
          isHintExpanded: true,
        });

        // Launch Lock: Ensure GuidedTaskRunner triggers exactly once
        if (!hasAutoLaunchedRef.current) {
          hasAutoLaunchedRef.current = true;
          setIsAutoLaunching(true);
          setTimeout(() => {
            onLaunchTaskRunner(activeRoutine);
          }, 1200);
        }
      }
    }
  };

  const handleRequestHint = () => {
    setIsHintExpanded(true);
    if (attemptCount < 3) {
      const nextLvl = attemptCount + 1;
      setAttemptCount(nextLvl);
      setFeedbackState('hint');
      audioSynthesizer.playChime('bell');
      handleReadAloud(t('routines.hint_intro', { hint: getHintForAttempt(attemptCount) }));
      onUpdateSession?.(activeRoutine.id, {
        attemptCount: nextLvl,
        selectedOption,
        feedbackState: 'hint',
        isHintExpanded: true,
      });
    } else {
      setFeedbackState('revealed');
      audioSynthesizer.playChime('chime');
      onUpdateSession?.(activeRoutine.id, {
        attemptCount: 4,
        selectedOption,
        feedbackState: 'revealed',
        isHintExpanded: true,
      });
    }
  };

  const chancesRemaining = Math.max(0, 4 - attemptCount);
  const heartsString =
    attemptCount === 1
      ? '❤️❤️❤️'
      : attemptCount === 2
      ? '❤️❤️🤍'
      : attemptCount === 3
      ? '❤️🤍🤍'
      : '🤍🤍🤍';

  return (
    <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-200">
      {/* Header (Screenshot 1) */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-purple-100 pb-4">
        <div>
          <span className="text-xs font-black text-purple-700 uppercase tracking-wider">
            {t('recall.eyebrow')}
          </span>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 font-heading">
            {t('recall.title')}
          </h3>
          <span className="sr-only">Cognitive Memory Question</span>
          <span className="sr-only">Gentle Attempt:</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Read Question Button */}
          <button
            type="button"
            onClick={() => handleReadAloud(defaultQuestion)}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold border border-purple-200 transition flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            title={t('recall.read_question')}
            aria-label={t('recall.read_question')}
          >
            <Volume2 className="w-3.5 h-3.5 text-purple-700" />
            <span>{t('recall.read_question')}</span>
          </button>

          {/* Chances Hearts Display Badge */}
          <div
            className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-extrabold flex items-center gap-1 min-h-[38px]"
            aria-label={t('recall.hearts_aria', { count: chancesRemaining })}
          >
            <span>{t('recall.chances')}</span>
            <span className="text-rose-600 tracking-wider">
              {heartsString}
            </span>
            <span className="text-rose-800 font-bold text-[11px]">
              ({chancesRemaining > 0 ? t('recall.left_suffix', { count: chancesRemaining }) : t('recall.guided_mode')})
            </span>
          </div>
        </div>
      </div>

      {/* Question Card Box (Screenshot 1) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-50/40 via-white to-purple-50/30 border border-purple-100 space-y-4 shadow-2xs">
        {/* Scheduled Time & Status Pill */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-purple-800 bg-purple-100/80 px-2.5 py-1 rounded-lg border border-purple-200">
            {t('recall.scheduled_label')}: {activeRoutine.scheduledTime} ({localizedCategory.toUpperCase()})
          </span>
          <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
            {activeRoutine.isCompleted ? `✓ ${t('routines.status_completed')}` : t('recall.pending_action')}
          </span>
        </div>

        {/* Question Prompt */}
        <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed font-heading">
          "{defaultQuestion}"
        </h4>

        {/* Hint banner if expanded */}
        {(feedbackState === 'hint' || isHintExpanded || attemptCount > 1) && feedbackState !== 'correct' && feedbackState !== 'revealed' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 font-medium leading-relaxed animate-in fade-in">
            <span className="font-extrabold text-amber-800 mr-1.5">
              {attemptCount === 2 ? t('recall.first_clue_label') : t('recall.detailed_hint_label')}
            </span>
            "{getHintForAttempt(attemptCount - 1)}"
          </div>
        )}

        {/* Correct celebration */}
        {feedbackState === 'correct' && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-2 animate-in zoom-in-95">
            <div className="flex items-center justify-center gap-2 text-emerald-900 font-extrabold text-sm sm:text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{t('recall.correct_title')}</span>
            </div>
            <p className="text-xs text-emerald-700">
              {t('recall.correct_subtitle')} <strong>{localizedTitle}</strong>
            </p>
            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => onComplete(activeRoutine.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                {t('recall.mark_complete_btn')}
              </button>
              <button
                type="button"
                onClick={() => onLaunchTaskRunner(activeRoutine)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                aria-label={t('recall.start_guided_btn')}
              >
                <Play className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>{t('recall.start_guided_btn')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Solution revealed after 3 attempts */}
        {feedbackState === 'revealed' && (
          <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-2xl text-center space-y-2 animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-purple-900 font-extrabold text-sm">
              <Heart className="w-4 h-4 text-purple-600 fill-purple-600" />
              <span>{t('recall.revealed_title')}</span>
            </div>
            <p className="text-xs text-purple-800">
              {t('recall.revealed_subtitle')} <strong>{localizedTitle}</strong>
            </p>
            <div className="inline-flex items-center gap-1.5 text-xs text-purple-700 font-semibold bg-white px-3 py-1 rounded-full border border-purple-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
              <span>{t('recall.starting_runner')}</span>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onComplete(activeRoutine.id)}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {t('routines.mark_as_done')}
              </button>
              <button
                type="button"
                onClick={() => onLaunchTaskRunner(activeRoutine)}
                className="px-4 py-2 bg-white border border-purple-300 text-purple-800 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {t('recall.guided_instructions')}
              </button>
            </div>
          </div>
        )}

        {/* Options list A, B, C (Screenshot 1) */}
        {feedbackState !== 'correct' && feedbackState !== 'revealed' && (
          <div className="space-y-2.5 pt-1">
            {defaultOptions.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx); // A, B, C
              const isSelected = selectedOption === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAutoLaunching}
                  onClick={() => handleChooseOption(idx)}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-xl border-2 font-medium text-xs sm:text-sm transition flex items-center gap-3 cursor-pointer min-h-[50px] ${
                    isAutoLaunching ? 'opacity-60 cursor-not-allowed' : ''
                  } ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/80 text-purple-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/30 text-slate-800 shadow-2xs'
                  }`}
                >
                  <span className="w-6 h-6 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs font-black flex items-center justify-center shrink-0">
                    {letter}
                  </span>
                  <span className="flex-1 leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Bottom Controls Bar inside Card (Screenshot 1) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <button
              type="button"
              onClick={handleRequestHint}
              className="text-purple-700 hover:text-purple-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              aria-label={t('recall.need_clue')}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t('recall.need_clue')}</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                if (onLaunchAssistanceTray) {
                  onLaunchAssistanceTray(activeRoutine);
                } else {
                  handleRequestHint();
                }
              }}
              className="text-slate-500 hover:text-slate-800 font-medium hover:underline cursor-pointer"
            >
              {t('recall.having_trouble')}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleReadAloud(defaultQuestion)}
              className={`px-3 py-1.5 font-bold text-xs rounded-xl border transition flex items-center gap-1 cursor-pointer ${
                isSpeaking
                  ? 'bg-purple-600 text-white border-purple-600 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={t('recall.speak')}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{t('recall.speak')}</span>
            </button>

            <button
              type="button"
              onClick={() => onLaunchTaskRunner(activeRoutine)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer min-h-[36px]"
              aria-label={`${t('recall.start_15m_task')} ${localizedTitle}`}
            >
              <Play className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>{t('recall.start_15m_task')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Routine Progress and Pager (Screenshot 1 bottom) */}
      <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
        <span className="font-bold">
          <span className="sr-only">Activity {currentIndex + 1} of {routines.length}</span>
          {t('recall.routine_progress')}{' '}
          <strong className="text-purple-700 font-black">
            {t('recall.of_count', { current: currentIndex + 1, total: routines.length })}
          </strong>
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSelectRoutine(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            aria-label={t('recall.previous')}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{t('recall.previous')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectRoutine(Math.min(routines.length - 1, currentIndex + 1))}
            disabled={currentIndex === routines.length - 1}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            aria-label={t('recall.next_cue')}
          >
            <span>{t('recall.next_cue')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
