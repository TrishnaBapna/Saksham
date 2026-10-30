import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VoiceReadButton } from '@/components/voice/VoiceReadButton';
import { audioSynthesizer } from '@/services/audioService';

interface MindClinicProps {
  onScoreXp?: (points: number) => void;
}

export const MindClinicView: React.FC<MindClinicProps> = ({ onScoreXp }) => {
  const [activeGame, setActiveGame] = useState<'memory' | 'math' | 'word'>('memory');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  // ── Math Challenge State ──
  const [mathA] = useState(12);
  const [mathB] = useState(8);
  const [userMathAns, setUserMathAns] = useState('');

  // ── Word Recall State ──
  const [wordGuessed, setWordGuessed] = useState<string | null>(null);

  const handleMathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = mathA + mathB;
    if (parseInt(userMathAns, 10) === correct) {
      setFeedback('⭐ Excellent! 12 + 8 = 20. Correct!');
      audioSynthesizer.playTaskComplete();
      setScore((s) => s + 15);
      if (onScoreXp) onScoreXp(15);
    } else {
      setFeedback('Almost there! Try adding the numbers once more.');
      audioSynthesizer.playReminderCue();
    }
    setUserMathAns('');
  };

  const handleWordSelect = (word: string) => {
    setWordGuessed(word);
    if (word === 'Harmony') {
      setFeedback('⭐ Correct memory anchor! Harmony matched.');
      audioSynthesizer.playTaskComplete();
      setScore((s) => s + 20);
      if (onScoreXp) onScoreXp(20);
    } else {
      setFeedback('Listen to the auditory cue and try again.');
      audioSynthesizer.playReminderCue();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl shrink-0">
            🧩
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 font-heading">
                Mind Clinic Cognitive Studio
              </h2>
              <VoiceReadButton
                textToRead="Mind Clinic Cognitive Studio. Daily brain agility exercises designed for neurological neuroplasticity."
                ariaLabel="Read Mind Clinic description"
              />
            </div>
            <p className="text-xs text-gray-500">
              Pattern recall, arithmetic pacing, and verbal recall. No timer penalties.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-teal-50 px-3.5 py-1.5 rounded-2xl border border-teal-200">
          <span className="text-xs font-bold text-teal-800">Clinic Score:</span>
          <span className="text-sm font-extrabold text-teal-900">{score} XP</span>
        </div>
      </div>

      {/* Game Selector Tabs */}
      <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-2xl self-start">
        <button
          type="button"
          onClick={() => { setActiveGame('memory'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold min-h-[40px] transition-all ${
            activeGame === 'memory' ? 'bg-white text-teal-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          1. Memory Recall
        </button>
        <button
          type="button"
          onClick={() => { setActiveGame('math'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold min-h-[40px] transition-all ${
            activeGame === 'math' ? 'bg-white text-teal-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          2. Arithmetic Rhythm
        </button>
      </div>

      {/* Game Body */}
      {activeGame === 'memory' && (
        <Card className="p-6 bg-white border border-gray-100">
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Word Anchor Association
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Select the anchor word associated with <strong>Peace & Cognitive Rest</strong>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['Turbulence', 'Harmony', 'Velocity'].map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => handleWordSelect(word)}
                className={`p-4 rounded-2xl border-2 font-bold text-sm min-h-touch text-center transition-all ${
                  wordGuessed === word
                    ? word === 'Harmony'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-white border-gray-200 hover:border-teal-400 text-gray-800'
                }`}
              >
                {word}
              </button>
            ))}
          </div>
        </Card>
      )}

      {activeGame === 'math' && (
        <Card className="p-6 bg-white border border-gray-100">
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Gentle Mental Arithmetic
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Solve this calculation at your own pace without pressure:
          </p>

          <form onSubmit={handleMathSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="text-2xl font-black text-gray-900 bg-gray-50 px-5 py-2.5 rounded-2xl border border-gray-200">
              {mathA} + {mathB} = ?
            </div>

            <input
              type="number"
              value={userMathAns}
              onChange={(e) => setUserMathAns(e.target.value)}
              placeholder="Your answer"
              className="input w-36 text-center text-lg font-bold"
            />

            <Button type="submit" variant="primary" className="bg-teal-700 min-h-touch px-6">
              Check Answer
            </Button>
          </form>
        </Card>
      )}

      {/* Accessible Non-Modal Feedback Banner */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-sm font-semibold text-teal-900 animate-slide-up flex items-center justify-between"
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs text-teal-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
