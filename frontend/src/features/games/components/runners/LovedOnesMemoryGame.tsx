import React, { useState, useEffect, useRef } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GameRunMetrics, LovedOne } from '../../../../types/index.js';
import { LovedOnesService } from '../../../lovedOnes/services/lovedOnesService.js';
import { SpeechService } from '../../../../services/speechService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { getTranslatedRelationship } from '../../../lovedOnes/utils/relationshipTranslation.js';
import { getLocalizedLovedOneFields } from '../../../lovedOnes/utils/lovedOneTranslation.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { Heart, Volume2, Sparkles, CheckCircle, HelpCircle, Info } from 'lucide-react';

interface LovedOnesMemoryGameProps {
  difficulty: GameDifficulty;
  adaptiveParams?: GameAdaptiveParameters;
  patientId: string;
  onComplete: (metrics?: GameRunMetrics) => void;
  onRequestHint?: () => void;
}

export const LovedOnesMemoryGame: React.FC<LovedOnesMemoryGameProps> = ({
  difficulty,
  adaptiveParams,
  patientId,
  onComplete,
  onRequestHint
}) => {
  const { t, language } = useLanguage();
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [targetMember, setTargetMember] = useState<LovedOne | null>(null);
  const [displayedChoices, setDisplayedChoices] = useState<LovedOne[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHint, setShowHint] = useState<boolean>(difficulty === 'Gentle');
  const mistakesRef = useRef(0);
  const hintsRef = useRef(0);
  const startRef = useRef(Date.now());

  const getMaxChoices = (diff: GameDifficulty) => {
    if (adaptiveParams?.choiceCount) {
      return Math.max(2, Math.min(4, adaptiveParams.choiceCount));
    }
    switch (diff) {
      case 'Gentle':
        return 2; // Direct binary comfort
      case 'Moderate':
        return 3;
      case 'Stimulating':
        return 4;
      default:
        return 2;
    }
  };

  useEffect(() => {
    const list = LovedOnesService.getLovedOnes(patientId);
    setLovedOnes(list);
    if (list.length > 0) {
      const target = list[0];
      setTargetMember(target);

      const maxChoices = getMaxChoices(difficulty);
      const otherMembers = list.filter((m) => m.id !== target.id);
      const distractors = otherMembers.slice(0, maxChoices - 1);
      const combined = [target, ...distractors].sort(() => Math.random() - 0.5);
      setDisplayedChoices(combined);
    }
    setShowHint(difficulty === 'Gentle');
    setSelectedId(null);
    setIsAnswered(false);
    setFeedback(null);
    mistakesRef.current = 0;
    hintsRef.current = 0;
    startRef.current = Date.now();
  }, [patientId, difficulty, adaptiveParams?.choiceCount, adaptiveParams?.tier]);

  if (!targetMember || lovedOnes.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-gray-500">
        {t('loved_ones.loading') !== 'loved_ones.loading' ? t('loved_ones.loading') : 'Loading verified loved ones records...'}
      </div>
    );
  }

  const localizedTarget = getLocalizedLovedOneFields(targetMember, t);
  const cuePrompt =
    localizedTarget.familiarPhrase ||
    (localizedTarget.cues && localizedTarget.cues[0]) ||
    localizedTarget.description;

  const translatedTargetRel = getTranslatedRelationship(targetMember.relationship, t);

  const handleSelectMember = (member: LovedOne) => {
    setSelectedId(member.id);
    if (member.id === targetMember.id) {
      setIsAnswered(true);
      setFeedback(t('loved_ones.quiz_correct_feedback', { name: targetMember.name, relationship: translatedTargetRel }) || `Wonderful! That is ${targetMember.name}, your ${translatedTargetRel}! ❤️`);
      const metrics = buildGameRunMetrics({
        correctAnswers: 1,
        incorrectAnswers: mistakesRef.current,
        hintsUsed: hintsRef.current,
        reactionTimesMs: [Date.now() - startRef.current],
        completionStatus: 'completed',
      });
      setTimeout(() => onComplete(metrics), 1500);
    } else {
      mistakesRef.current += 1;
      setFeedback(
        t('games.loved_ones_hint_prompt', { phrase: cuePrompt }) || `A loving family member! Think about who often says: "${cuePrompt}".`
      );
    }
  };

  const handleListenCue = () => {
    const speakText =
      language === 'hi'
        ? `यह अक्सर कौन कहता है: ${cuePrompt}?`
        : language === 'mr'
        ? `हे नेहमी कोण म्हणते: ${cuePrompt}?`
        : language === 'bn'
        ? `কে প্রায়ই এটি বলেন: ${cuePrompt}?`
        : language === 'ta'
        ? `இதை அடிக்கடி யார் சொல்வார்கள்: ${cuePrompt}?`
        : language === 'te'
        ? `ఈ మాట తరచుగా ఎవరు అంటారు: ${cuePrompt}?`
        : language === 'kn'
        ? `ಇದನ್ನು ಸಾಮಾನ್ಯವಾಗಿ ಯಾರು ಹೇಳುತ್ತಾರೆ: ${cuePrompt}?`
        : `Who often says: ${cuePrompt}?`;
    SpeechService.speak(speakText, () => {}, () => {}, SpeechService.getBCP47(language));
  };

  const localizedDiff =
    t(`games.difficulty_${difficulty.toLowerCase()}`) !== `games.difficulty_${difficulty.toLowerCase()}`
      ? t(`games.difficulty_${difficulty.toLowerCase()}`)
      : difficulty;
  const adaptiveBadgeText =
    language === 'hi'
      ? `संकेत • ${localizedDiff} (${displayedChoices.length})`
      : language === 'mr'
      ? `संकेत • ${localizedDiff} (${displayedChoices.length})`
      : language === 'bn'
      ? `সহায়ক সংকেত • ${localizedDiff} (${displayedChoices.length})`
      : language === 'ta'
      ? `குறிப்புகள் • ${localizedDiff} (${displayedChoices.length})`
      : language === 'te'
      ? `సూచనలు • ${localizedDiff} (${displayedChoices.length})`
      : language === 'kn'
      ? `ಸುಳಿವುಗಳು • ${localizedDiff} (${displayedChoices.length})`
      : `Adaptive Cues • ${difficulty} (${displayedChoices.length} Family Choices)`;

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-5">
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between text-xs text-purple-900 font-semibold">
        <span className="flex items-center space-x-1.5">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>{t('games.loved_ones_cue_header') || 'Familiar Loved Ones Memory Cue'}</span>
        </span>
        <span className="text-gray-500 font-medium">
          {adaptiveBadgeText}
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start space-x-2 animate-fadeIn ${
            isAnswered
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
              : 'bg-lavender-50 border-purple-200 text-purple-900'
          }`}
        >
          {isAnswered ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <HelpCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedback}</span>
        </div>
      )}

      {/* Memory Cue Card */}
      <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-lavender-50 p-5 rounded-3xl border border-purple-200 text-center space-y-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-white/80 px-2.5 py-1 rounded-full border border-purple-200 shadow-2xs">
          💬 {t('loved_ones.gentle_memory_clue') || 'Familiar Phrase & Cue'}
        </span>

        <p className="text-sm sm:text-base font-extrabold text-saksham-darkText italic">
          "{cuePrompt}"
        </p>

        {showHint && (
          <div className="text-xs text-purple-800 bg-white/90 p-2.5 rounded-2xl border border-purple-100 max-w-sm mx-auto flex items-center justify-center space-x-1.5 animate-fadeIn">
            <Info className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
            <span>{t('games.loved_ones_hint_text') || 'Gentle Hint: Someone you have saved as your'} <strong>{translatedTargetRel}</strong></span>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleListenCue}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-purple-200 text-xs font-bold text-purple-700 hover:bg-purple-50 transition shadow-2xs cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{t('loved_ones.quiz_listen_clue') || 'Listen to Cue'}</span>
          </button>

          {!showHint && (
            <button
              type="button"
              onClick={() => {
                setShowHint(true);
                hintsRef.current += 1;
                onRequestHint?.();
              }}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold text-purple-800 hover:bg-purple-100 transition cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
              <span>{t('loved_ones.gentle_memory_clue') || 'Relationship Clue'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Choices: Family Members */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-700 text-center">
          {t('loved_ones.quiz_options_prompt') || 'Who brings you this warm memory?'}
        </p>

        <div className={`grid gap-3 ${displayedChoices.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
          {displayedChoices.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => handleSelectMember(member)}
              disabled={isAnswered}
              className={`p-3.5 rounded-2xl border text-left transition-all transform active:scale-98 flex items-center space-x-3.5 shadow-2xs ${
                selectedId === member.id
                  ? member.id === targetMember.id
                    ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-200'
                    : 'bg-purple-50 border-purple-300'
                  : 'bg-white border-purple-100 hover:border-purple-300 hover:bg-lavender-50/50'
              }`}
            >
              <img
                src={member.photoUrl}
                alt={member.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-purple-200"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-saksham-darkText truncate">
                  {member.name}
                </h4>
                <p className="text-[11px] text-purple-700 font-semibold truncate">
                  {getTranslatedRelationship(member.relationship, t)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 flex items-center justify-center space-x-1">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span>{t('games.loved_ones_verified_note') || 'Family memories are verified by you and your loved ones'}</span>
      </div>
    </div>
  );
};
