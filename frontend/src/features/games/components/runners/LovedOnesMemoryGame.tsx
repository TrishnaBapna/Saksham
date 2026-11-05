import React, { useState, useEffect } from 'react';
import { GameDifficulty, LovedOne } from '../../../../types/index.js';
import { LovedOnesService } from '../../../lovedOnes/services/lovedOnesService.js';
import { SpeechService } from '../../../../services/speechService.js';
import { Heart, Volume2, Sparkles, CheckCircle, HelpCircle } from 'lucide-react';

interface LovedOnesMemoryGameProps {
  difficulty: GameDifficulty;
  patientId: string;
  onComplete: () => void;
}

export const LovedOnesMemoryGame: React.FC<LovedOnesMemoryGameProps> = ({
  difficulty: _difficulty,
  patientId,
  onComplete
}) => {
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [targetMember, setTargetMember] = useState<LovedOne | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const list = LovedOnesService.getLovedOnes(patientId);
    setLovedOnes(list);
    if (list.length > 0) {
      setTargetMember(list[0]);
    }
  }, [patientId]);

  if (!targetMember || lovedOnes.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-gray-500">
        Loading verified loved ones records...
      </div>
    );
  }

  const cuePrompt =
    targetMember.familiarPhrase ||
    (targetMember.cues && targetMember.cues[0]) ||
    targetMember.description;

  const handleSelectMember = (member: LovedOne) => {
    setSelectedId(member.id);
    if (member.id === targetMember.id) {
      setIsAnswered(true);
      setFeedback(`Wonderful! That is ${targetMember.name}, your ${targetMember.relationship}! ❤️`);
      setTimeout(onComplete, 1500);
    } else {
      setFeedback(
        `A loving family member! Think about who often says: "${cuePrompt}".`
      );
    }
  };

  const handleListenCue = () => {
    SpeechService.speak(`Who often says: ${cuePrompt}?`, () => {}, () => {});
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-5">
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between text-xs text-purple-900 font-semibold">
        <span className="flex items-center space-x-1.5">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>Familiar Loved Ones Memory Cue</span>
        </span>
        <span className="text-gray-500">Family Memory Anchor</span>
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
          💬 Familiar Phrase & Cue
        </span>

        <p className="text-sm sm:text-base font-extrabold text-saksham-darkText italic">
          "{cuePrompt}"
        </p>

        <button
          type="button"
          onClick={handleListenCue}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-purple-200 text-xs font-bold text-purple-700 hover:bg-purple-50 transition shadow-2xs"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Listen to Cue</span>
        </button>
      </div>

      {/* Choices: Family Members */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-700 text-center">
          Who brings you this warm memory?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lovedOnes.slice(0, 4).map((member) => (
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
                  {member.relationship}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 flex items-center justify-center space-x-1">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span>Family memories are verified by you and your loved ones</span>
      </div>
    </div>
  );
};
