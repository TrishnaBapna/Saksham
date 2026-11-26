import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext.js';

interface DailyProgressRingProps {
  completed: number;
  total: number;
  percentage?: number;
  size?: number; // Size in pixels, defaults to 160
  strokeWidth?: number; // Defaults to 10
  className?: string;
}

export const DailyProgressRing: React.FC<DailyProgressRingProps> = ({
  completed,
  total,
  percentage: explicitPercentage,
  size = 160,
  strokeWidth = 10,
  className = '',
}) => {
  const { t, language } = useLanguage();
  // Safe dynamic percentage calculation: completed / total * 100
  const calculatedPercentage =
    total > 0 ? Math.round((Math.min(completed, total) / total) * 100) : 0;

  const percentage =
    typeof explicitPercentage === 'number'
      ? Math.max(0, Math.min(100, Math.round(explicitPercentage)))
      : calculatedPercentage;

  const isAllComplete = total > 0 && completed >= total;
  const isEmpty = total === 0;

  // SVG parameters
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  // Offset formula: circumference - (percentage / 100) * circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const ringAria =
    ({
      hi: `दैनिक दिनचर्या प्रगति: ${total} में से ${completed} पूर्ण (${percentage}%)`,
      mr: `दैनिक दिनचर्या प्रगती: ${total} पैकी ${completed} पूर्ण (${percentage}%)`,
      bn: `দৈনন্দিন কাজের অগ্রগতি: ${total}টির মধ্যে ${completed}টি সম্পন্ন (${percentage}%)`,
      ta: `தினசரி வழக்க முன்னேற்றம்: ${total} இல் ${completed} முடிந்தது (${percentage}%)`,
      te: `రోజువారీ ప్రగతి: ${total} లో ${completed} పూర్తయ్యాయి (${percentage}%)`,
      kn: `ದೈನಂದಿನ ದಿನಚರಿ ಪ್ರಗತಿ: ${total} ರಲ್ಲಿ ${completed} ಪೂರ್ಣಗೊಂಡಿದೆ (${percentage}%)`,
    } as Record<string, string>)[language] ||
    `Daily routine progress: ${completed} of ${total} completed (${percentage}%)`;

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center ${className}`}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ringAria}
    >
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 drop-shadow-xs"
        >
          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth={strokeWidth}
            className="transition-colors duration-300"
          />

          {/* Animated Progress Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isAllComplete ? '#34d399' : '#a855f7'} // emerald-400 when complete, purple-500
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{
              filter: isAllComplete
                ? 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.5))'
                : 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.4))',
            }}
          />
        </svg>

        {/* Center Content Inside the Ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 select-none">
          {isEmpty ? (
            <div className="space-y-0.5">
              <Sparkles className="w-6 h-6 text-lavender-200 mx-auto" />
              <span className="text-xs font-semibold text-white/90">{t('routines.ring_no_tasks')}</span>
            </div>
          ) : (
            <>
              {isAllComplete ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mb-0.5 animate-bounce" />
              ) : null}
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none font-sans">
                {percentage}%
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-lavender-100 mt-1">
                {t('routines.ring_completed_ratio', { completed, total })}
              </span>
              <span className="text-[10px] text-white/75 font-medium tracking-wide mt-0.5">
                {isAllComplete ? t('routines.ring_all_done') : t('routines.ring_peaceful')}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
