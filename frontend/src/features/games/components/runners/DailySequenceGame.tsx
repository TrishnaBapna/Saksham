import React, { useState, useEffect, useRef } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GameRunMetrics } from '../../../../types/index.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { ArrowUp, ArrowDown, CheckCircle, Sparkles, HelpCircle, Sun } from 'lucide-react';

interface SequenceItem {
  id: string;
  order: number;
  title: string;
  timeContext: string;
  icon: string;
}

interface DailySequenceGameProps {
  difficulty: GameDifficulty;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
}

const ALL_ROUTINE_STEPS: SequenceItem[] = [
  {
    id: 'seq-1',
    order: 1,
    title: 'Wake up & do gentle bed stretches',
    timeContext: 'Early Morning (07:00 AM)',
    icon: '🌅'
  },
  {
    id: 'seq-2',
    order: 2,
    title: 'Sip warm herbal tea & breakfast',
    timeContext: 'Morning (08:30 AM)',
    icon: '☕'
  },
  {
    id: 'seq-3',
    order: 3,
    title: 'Enjoy a peaceful courtyard walk',
    timeContext: 'Afternoon (01:00 PM)',
    icon: '🌿'
  },
  {
    id: 'seq-4',
    order: 4,
    title: 'Browse family photos in Loved Ones',
    timeContext: 'Late Afternoon (04:00 PM)',
    icon: '📖'
  },
  {
    id: 'seq-5',
    order: 5,
    title: 'Quiet evening rest & peaceful sleep',
    timeContext: 'Night (09:00 PM)',
    icon: '🌙'
  }
];

export const DailySequenceGame: React.FC<DailySequenceGameProps> = ({
  difficulty,
  adaptiveParams,
  onComplete
}) => {
  const { t, language } = useLanguage();
  const preferences = useOptionalAccessibility()?.preferences;
  const resolvedGameplay = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);
  const showTimelineDefault = resolvedGameplay.mechanics.showFirstAnchor;
  const hideClockTimes = resolvedGameplay.mechanics.requiresRecallWithoutRef;

  const seqUi = (
    {
      hi: {
        headerTitle: (n: number) => `दैनिक कहानी क्रम (${n} चरण)`,
        headerSub: 'सुबह से शाम के क्रम में लगाएं',
      },
      mr: {
        headerTitle: (n: number) => `दैनिक दिनचर्या क्रम (${n} पायऱ्या)`,
        headerSub: 'सकाळपासून संध्याकाळच्या क्रमाने लावा',
      },
      bn: {
        headerTitle: (n: number) => `দৈনন্দিন কাজের ক্রম (${n}টি ধাপ)`,
        headerSub: 'সকাল থেকে রাত পর্যন্ত সাজান',
      },
      ta: {
        headerTitle: (n: number) => `தினசரி நிகழ்வு வரிசை (${n} படிகள்)`,
        headerSub: 'காலையிலிருந்து மாலை வரை வரிசைப்படுத்தவும்',
      },
      te: {
        headerTitle: (n: number) => `దినచర్య క్రమం (${n} దశలు)`,
        headerSub: 'ఉదయం నుండి సాయంత్రం వరకు అమర్చండి',
      },
      kn: {
        headerTitle: (n: number) => `ದೈನಂದಿನ ದಿನಚರಿ ಕ್ರಮ (${n} ಹಂತಗಳು)`,
        headerSub: 'ಬೆಳಗ್ಗೆಯಿಂದ ಸಂಜೆಯವರೆಗೆ ಜೋಡಿಸಿ',
      },
    } as Record<string, any>
  )[language] || {
    headerTitle: (n: number) => `Daily Story Sequence (${n} steps)`,
    headerSub: 'Arrange from morning to evening',
  };
  const getItemCount = (diff: GameDifficulty) => {
    if (adaptiveParams?.sequenceLength) {
      return Math.max(3, Math.min(ALL_ROUTINE_STEPS.length, adaptiveParams.sequenceLength));
    }
    switch (diff) {
      case 'Gentle':
        return 3;
      case 'Moderate':
        return 4;
      case 'Stimulating':
        return 5;
      default:
        return 3;
    }
  };

  const [items, setItems] = useState<SequenceItem[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showTimelineGuide, setShowTimelineGuide] = useState<boolean>(showTimelineDefault);
  const incorrectChecksRef = useRef(0);
  const hintsRef = useRef(0);
  const startRef = useRef(Date.now());

  const initialize = () => {
    const count = getItemCount(difficulty);
    const subset = ALL_ROUTINE_STEPS.slice(0, count);

    // Shuffle deliberately out of order
    const shuffled = [...subset];
    shuffled.sort(() => Math.random() - 0.5);

    // If accidentally in exact order, swap first two
    if (shuffled.every((item, idx) => item.order === idx + 1)) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }

    setItems(shuffled);
    setFeedbackMessage(null);
    setIsCorrect(false);
    setShowTimelineGuide(showTimelineDefault);
    incorrectChecksRef.current = 0;
    hintsRef.current = 0;
    startRef.current = Date.now();
  };

  useEffect(() => {
    initialize();
  }, [difficulty, adaptiveParams?.sequenceLength, adaptiveParams?.tier]);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setItems(updated);
    setFeedbackMessage(null);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setItems(updated);
    setFeedbackMessage(null);
  };

  const handleCheckOrder = () => {
    const correctlySorted = items.every((item, idx) => item.order === idx + 1);

    if (correctlySorted) {
      setIsCorrect(true);
      setFeedbackMessage(t('games.seq_perfect') || 'Wonderful! Every activity is in perfect chronological order! 🌸');
      const metrics = buildGameRunMetrics({
        correctAnswers: items.length,
        incorrectAnswers: incorrectChecksRef.current,
        hintsUsed: hintsRef.current,
        reactionTimesMs: [Date.now() - startRef.current],
        completionStatus: 'completed',
        mechanicMode: resolvedGameplay.mode,
        appliedMechanics: resolvedGameplay.mechanics.appliedMechanicsSummary,
      });
      setTimeout(() => onComplete(metrics), 1200);
    } else {
      incorrectChecksRef.current += 1;
      setFeedbackMessage(
        t('games.seq_hint') || 'Almost there! Think about what you usually do first when the morning begins. You can swap any cards!'
      );
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-5">
      <div className="border-b border-purple-100 pb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-purple-900 font-semibold">
        <span className="flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>{seqUi.headerTitle(items.length)}</span>
        </span>
        <div className="flex items-center gap-2">
          {!showTimelineDefault && !hideClockTimes && !showTimelineGuide && (
            <button
              type="button"
              onClick={() => {
                hintsRef.current += 1;
                setShowTimelineGuide(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition cursor-pointer"
            >
              🌅 Show Time Guide
            </button>
          )}
          <span className="text-gray-500">{seqUi.headerSub}</span>
        </div>
      </div>

      {showTimelineGuide && !hideClockTimes && (
        <div
          data-testid="daily-sequence-timeline-guide"
          className="px-3.5 py-2.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2"
        >
          <span className="font-bold flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-600" />
            Day Timeline Guide: 🌅 Sunrise → ☀️ Midday → 🌙 Evening
          </span>
          {items[0]?.order === 1 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px] border border-emerald-200">
              Morning Anchor Ready
            </span>
          )}
        </div>
      )}

      {hideClockTimes && (
        <div
          data-testid="daily-sequence-clock-veiled"
          className="px-3.5 py-2 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-[11px] font-semibold text-indigo-900 flex items-center justify-between gap-2"
        >
          <span>Independent Routine Flow: Clock timestamps hidden — order by natural daily habit</span>
        </div>
      )}

      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start space-x-2 animate-fadeIn ${
            isCorrect
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {isCorrect ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Cards List with Up/Down buttons */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="p-3.5 rounded-2xl bg-lavender-50 border border-purple-200 flex items-center justify-between shadow-2xs hover:border-purple-300 transition"
          >
            <div className="flex items-center space-x-3">
              <span className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                {index + 1}
              </span>
              <span className="text-2xl">{item.icon}</span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-saksham-darkText">
                  {t(`games.seq_${item.order}_title`) || item.title}
                </h4>
                <p className="text-[11px] text-gray-500">
                  {hideClockTimes
                    ? 'Routine event (recall sequence without clock cue)'
                    : t(`games.seq_${item.order}_time`) || item.timeContext}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className={`p-2 rounded-xl transition ${
                  index === 0
                    ? 'opacity-30 cursor-not-allowed text-gray-400'
                    : 'bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 shadow-2xs'
                }`}
                aria-label={`${t('games.seq_move_up') || 'Move up'}: ${t(`games.seq_${item.order}_title`) || item.title}`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === items.length - 1}
                className={`p-2 rounded-xl transition ${
                  index === items.length - 1
                    ? 'opacity-30 cursor-not-allowed text-gray-400'
                    : 'bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 shadow-2xs'
                }`}
                aria-label={`${t('games.seq_move_down') || 'Move down'}: ${t(`games.seq_${item.order}_title`) || item.title}`}
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Check Order Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleCheckOrder}
          className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-sm transition cursor-pointer"
        >
          <CheckCircle className="w-4 h-4" />
          <span>{t('games.seq_check_order') || 'Check My Daily Routine Order'}</span>
        </button>
      </div>
    </div>
  );
};
