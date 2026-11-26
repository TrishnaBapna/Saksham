import React, { useState } from 'react';
import { RoutineItem } from '../../../types/index.js';
import { MikoRobotSvg } from '../../ai-companion/MikoRobotSvg.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getTranslatedRoutineTitle } from '../utils/routineTranslation.js';
import { getSmallRoutineModalsUi } from '../utils/routineModalsTranslation.js';
import { Mic, Sparkles, X, Clock } from 'lucide-react';

interface CompanionFollowerToastProps {
  task: RoutineItem | null;
  onOpenRunner?: (task: RoutineItem) => void;
  onStart?: (task: RoutineItem) => void;
  onSnooze: (task: RoutineItem, minutes: number) => void;
  onOpenReminder?: (task: RoutineItem) => void;
  onOpenVoiceNote?: () => void;
  onOpenAICompanion?: () => void;
}

export const CompanionFollowerToast: React.FC<CompanionFollowerToastProps> = ({
  task,
  onOpenRunner,
  onStart,
  onSnooze,
  onOpenReminder,
  onOpenVoiceNote,
  onOpenAICompanion,
}) => {
  const { t, language } = useLanguage();
  const modalUi = getSmallRoutineModalsUi(language);
  const [isToastVisible, setIsToastVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleStartActivity = (t: RoutineItem) => {
    if (onStart) onStart(t);
    else if (onOpenRunner) onOpenRunner(t);
  };

  if (!task && isMinimized) return null;

  const localizedTaskTitle = task ? getTranslatedRoutineTitle(task, t, language) : '';
  const truncatedTitle = task
    ? localizedTaskTitle.length > 22
      ? `${localizedTaskTitle.substring(0, 20)}...`
      : localizedTaskTitle
    : modalUi.toastReadyFallback;

  return (
    <aside
      aria-label={modalUi.toastAria}
      className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2.5 pointer-events-auto select-none"
    >
      {/* Speech Bubble Toast (Screenshots 1, 3, 4) */}
      {isToastVisible && task && (
        <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border-2 border-emerald-600/30 shadow-xl max-w-xs w-72 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-[#1B4225] uppercase tracking-wide">
              <span>{modalUi.toastMikoTitle}</span>
              <span className="text-amber-500">⏰</span>
            </div>
            <button
              type="button"
              onClick={() => setIsToastVisible(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition"
              aria-label={modalUi.toastDismissAria}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] font-bold text-slate-800 leading-snug">
            {localizedTaskTitle}
          </p>

          <div className="flex items-center gap-1.5 mt-2 pt-1 border-t border-slate-100">
            <span
              className="flex-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg truncate"
              title={localizedTaskTitle}
            >
              {truncatedTitle}
            </span>

            <button
              type="button"
              onClick={() => {
                onSnooze(task, 3);
                setIsToastVisible(false);
              }}
              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 shrink-0"
              title={modalUi.toast3mTitle}
            >
              <Clock className="w-2.5 h-2.5" />
              <span>{modalUi.toast3mText}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStartActivity(task)}
              className="px-2.5 py-1 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 text-white rounded-lg text-[10px] font-black transition flex items-center gap-1 shrink-0 shadow-xs"
              title={modalUi.toastStartTitle}
            >
              <span>{modalUi.toastStartText}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Floating Bar: Voice Note + Ask AI + Robot Avatar Button */}
      <div className="flex items-center gap-2">
        {onOpenVoiceNote && (
          <button
            type="button"
            onClick={onOpenVoiceNote}
            className="px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 text-white font-extrabold text-xs rounded-2xl shadow-lg transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title={modalUi.toastVoiceTitle}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{t('routines.toast_voice_note')}</span>
          </button>
        )}

        {onOpenAICompanion && (
          <button
            type="button"
            onClick={onOpenAICompanion}
            className="px-3.5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 text-white font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title={t('routines.toast_ask_ai')}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{t('routines.toast_ask_ai')}</span>
          </button>
        )}

        {/* Floating Robot Avatar */}
        <button
          type="button"
          onClick={() => {
            if (task && onOpenReminder) {
              onOpenReminder(task);
            } else {
              setIsToastVisible((prev) => !prev);
              setIsMinimized((prev) => !prev);
            }
          }}
          className="w-12 h-12 rounded-2xl bg-white border-2 border-emerald-500/40 shadow-xl flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer p-0.5 overflow-hidden"
          title={modalUi.toastToggleTitle}
          aria-label={modalUi.toastToggleAria}
        >
          <MikoRobotSvg size={42} animated={true} />
        </button>
      </div>
    </aside>
  );
};
