import React, { useState, useEffect } from 'react';
import { SpeechService } from '../../../services/speechService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { FirebaseAILogicService } from '../../ai-companion/services/firebaseAILogicService.js';
import { CharacterVisualizer } from '../../ai-companion/CharacterVisualizer.js';
import { Volume2, VolumeX, Lightbulb, Heart, Coffee, Sparkles } from 'lucide-react';

interface AshaGameCompanionProps {
  instructions: string;
  gameTitle?: string;
  difficulty?: string;
  hint?: string;
  onTakeBreak?: () => void;
  onNeedHelp?: () => void;
  onFeedback?: (feedback: 'I need help' | 'I want a break') => void;
}

export const AshaGameCompanion: React.FC<AshaGameCompanionProps> = ({
  instructions,
  gameTitle = 'Activity',
  difficulty = 'Gentle',
  hint,
  onTakeBreak,
  onNeedHelp,
  onFeedback,
}) => {
  const { t, language } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeMessage, setActiveMessage] = useState<string>(instructions);
  const [showHint, setShowHint] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState(false);

  useEffect(() => {
    setActiveMessage(instructions);
    setShowHint(false);
  }, [instructions]);

  useEffect(() => {
    return () => {
      SpeechService.cancelSpeech();
    };
  }, []);

  const handleReadAloud = (textToSpeak: string) => {
    if (isSpeaking) {
      SpeechService.cancelSpeech();
      setIsSpeaking(false);
      return;
    }

    SpeechService.speak(
      textToSpeak,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      SpeechService.getBCP47(language)
    );
  };

  const handleOfferHint = () => {
    const hintText = hint || t('games.default_hint');
    setActiveMessage(`${t('games.hint_prefix')} ${hintText}`);
    setShowHint(true);
    handleReadAloud(`${t('games.spoken_hint_prefix')} ${hintText}`);
    onNeedHelp?.();
  };

  const handleExplainSimply = async () => {
    setIsSimplifying(true);
    try {
      const cloudSimplified = await FirebaseAILogicService.generateSimplifiedGameInstruction(
        gameTitle,
        instructions,
        difficulty,
        language
      );
      const simplified = cloudSimplified || `${t('games.hint_prefix')} ${instructions} ${t('games.praise_0')}`;
      setActiveMessage(simplified);
      setShowHint(true);
      onFeedback?.('I need help');
    } finally {
      setIsSimplifying(false);
    }
  };

  const handleEncourage = () => {
    const praises = [
      t('games.praise_0'),
      t('games.praise_1'),
      t('games.praise_2'),
    ];
    const picked = praises[Math.floor(Math.random() * praises.length)];
    setActiveMessage(picked);
    handleReadAloud(picked);
  };

  const handleBreak = () => {
    const breakMsg = t('games.break_message');
    setActiveMessage(breakMsg);
    handleReadAloud(breakMsg);
    onFeedback?.('I want a break');
    if (onTakeBreak) onTakeBreak();
  };

  return (
    <div className="bg-gradient-to-r from-lavender-100 via-purple-50 to-pink-50 p-4 rounded-3xl border border-purple-200 shadow-soft-purple space-y-3">
      {/* Top Banner */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <CharacterVisualizer
              characterId="asha"
              mode="compact"
              size={48}
              expression={isSpeaking ? 'explaining' : showHint ? 'thinking' : 'guiding'}
            />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-purple-950">{t('games.companion_title')}</span>
              <span className="text-[10px] font-bold text-purple-700 bg-white/80 px-2 py-0.5 rounded-full border border-purple-200">
                {t('games.supportive_guide')}
              </span>
            </div>
            <p className="text-xs text-purple-900 mt-1 leading-relaxed font-medium">
              "{activeMessage}"
            </p>
          </div>
        </div>

        {/* Read Aloud Button */}
        <button
          type="button"
          onClick={() => handleReadAloud(activeMessage)}
          className={`p-2.5 rounded-2xl transition flex-shrink-0 cursor-pointer ${
            isSpeaking
              ? 'bg-purple-600 text-white animate-pulse'
              : 'bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 shadow-2xs'
          }`}
          title={isSpeaking ? t('games.stop_voice_aria') : t('games.listen_instructions_aria')}
          aria-label={isSpeaking ? t('games.stop_voice_aria') : t('games.listen_instructions_aria')}
        >
          {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Action Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-purple-200/60">
        <button
          type="button"
          onClick={handleOfferHint}
          className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
            showHint
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-white text-purple-800 border border-purple-200 hover:bg-lavender-100'
          }`}
          aria-label={t('games.need_hint')}
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
          <span>{t('games.need_hint')}</span>
        </button>

        <button
          type="button"
          onClick={handleExplainSimply}
          disabled={isSimplifying}
          data-testid="game-explain-simply-btn"
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-purple-800 border border-purple-200 hover:bg-lavender-100 transition shadow-2xs cursor-pointer disabled:opacity-60"
          aria-label={t('games.explain_simply')}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>{isSimplifying ? t('games.explaining_simply') : t('games.explain_simply')}</span>
        </button>

        <button
          type="button"
          onClick={handleEncourage}
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-purple-800 border border-purple-200 hover:bg-lavender-100 transition shadow-2xs cursor-pointer"
          aria-label={t('games.encourage_me')}
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>{t('games.encourage_me')}</span>
        </button>

        <button
          type="button"
          onClick={handleBreak}
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-purple-800 border border-purple-200 hover:bg-lavender-100 transition shadow-2xs cursor-pointer"
          aria-label={t('games.take_break')}
        >
          <Coffee className="w-3.5 h-3.5 text-purple-600" />
          <span>{t('games.take_break')}</span>
        </button>
      </div>
    </div>
  );
};
