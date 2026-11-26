import React, { useEffect } from 'react';
import { RoutineItem } from '../../../types/index.js';
import { MikoRobotSvg } from '../../ai-companion/MikoRobotSvg.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getTranslatedRoutineTitle, getTranslatedScheduleTime } from '../utils/routineTranslation.js';
import { getSmallRoutineModalsUi } from '../utils/routineModalsTranslation.js';
import { Play, Clock, Check, X, Bell } from 'lucide-react';

interface CompanionReminderBannerProps {
  task: RoutineItem;
  onStartActivity: (task: RoutineItem) => void;
  onSnooze: (task: RoutineItem, minutes: number) => void;
  onComplete: (taskId: string) => void;
  onDismiss: () => void;
  soundEnabled?: boolean;
  className?: string;
}

export const CompanionReminderBanner: React.FC<CompanionReminderBannerProps> = ({
  task,
  onStartActivity,
  onSnooze,
  onComplete,
  onDismiss,
  soundEnabled = true,
  className = '',
}) => {
  const { t, language } = useLanguage();
  const modalUi = getSmallRoutineModalsUi(language);
  const localizedTitle = getTranslatedRoutineTitle(task, t, language);
  useEffect(() => {
    if (soundEnabled) {
      audioSynthesizer.playChime('reminder');
    }
  }, [task.id, soundEnabled]);

  return (
    <div
      role="region"
      aria-label={`${modalUi.bannerAriaPrefix} ${localizedTitle}`}
      className={`bg-[#FAF9F5] p-4 sm:p-5 rounded-3xl border-2 border-[#234E35] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300 ${className}`}
    >
      <div className="flex items-center gap-3.5 max-w-xl">
        <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-white rounded-2xl border border-[#D7E6D9] p-1 shadow-xs">
          <MikoRobotSvg size={68} animated={true} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#234E35] bg-[#EBF3EC] px-2.5 py-0.5 rounded-full border border-[#D7E6D9] flex items-center gap-1">
              <Bell className="w-3 h-3 text-amber-500" />
              <span>{t('routines.banner_nudge')}</span>
            </span>
            <span className="text-xs font-bold text-[#5B665E]">
              {task.snoozedUntil
                ? `${modalUi.bannerSnoozedTo} ${getTranslatedScheduleTime(task.snoozedUntil, language)}`
                : `${modalUi.bannerDuePrefix} ${getTranslatedScheduleTime(task.scheduledTime, language)}`}
            </span>
          </div>

          <h4 className="text-sm sm:text-base font-extrabold text-[#1C2C22] leading-snug">
            <span className="sr-only">{modalUi.bannerSrReminder} {localizedTitle}</span>
            {localizedTitle}
          </h4>
          <p className="text-xs text-[#334155] leading-relaxed">
            {modalUi.bannerReadyText}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-1 sm:pt-0">
        <button
          type="button"
          onClick={() => onStartActivity(task)}
          className="flex-1 sm:flex-none px-4 py-2.5 bg-[#234E35] hover:bg-[#1B3F2B] active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
          aria-label={`${modalUi.bannerStartAriaPrefix} ${localizedTitle}`}
        >
          <Play className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
          <span>{t('routines.banner_lets_do')}</span>
        </button>

        <button
          type="button"
          onClick={() => onSnooze(task, 3)}
          className="flex-1 sm:flex-none px-3.5 py-2.5 bg-[#FAF7F0] hover:bg-[#F0EBE1] active:scale-95 text-[#1C2C22] font-bold text-xs rounded-xl border border-[#234E35] transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
          title={modalUi.bannerSnooze3Title}
          aria-label={modalUi.bannerSnooze3Aria}
        >
          <Clock className="w-3.5 h-3.5 text-[#234E35]" />
          <span>{modalUi.bannerSnooze3Text}</span>
        </button>

        <button
          type="button"
          onClick={() => onComplete(task.id)}
          className="p-2.5 bg-[#EBF3EC] hover:bg-[#D7E6D9] text-[#234E35] font-bold text-xs rounded-xl border border-[#D7E6D9] transition cursor-pointer flex items-center justify-center min-h-[44px] min-w-[44px]"
          title={modalUi.bannerDoneTitle}
          aria-label={`${modalUi.bannerDoneAriaPrefix} ${localizedTitle}`}
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-base font-bold flex items-center justify-center transition cursor-pointer"
          title={modalUi.bannerDismissTitle}
          aria-label={modalUi.bannerDismissAria}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
