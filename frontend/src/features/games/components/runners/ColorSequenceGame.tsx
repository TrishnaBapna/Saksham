import React, { useState, useEffect, useRef } from 'react';
import { GameDifficulty, GamePacing } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { SpeechService } from '../../../../services/speechService.js';
import { Sparkles, RotateCcw, Volume2, HelpCircle } from 'lucide-react';

interface ColorSequenceGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  onComplete: () => void;
}

interface Pad {
  id: number;
  name: string;
  color: string;
  activeColor: string;
  freq: number;
}

const PADS: Pad[] = [
  { id: 0, name: 'Rose Red', color: 'bg-rose-500', activeColor: 'bg-rose-300 ring-4 ring-rose-200 scale-105', freq: 261.63 },
  { id: 1, name: 'Sky Blue', color: 'bg-sky-500', activeColor: 'bg-sky-300 ring-4 ring-sky-200 scale-105', freq: 329.63 },
  { id: 2, name: 'Emerald Green', color: 'bg-emerald-500', activeColor: 'bg-emerald-300 ring-4 ring-emerald-200 scale-105', freq: 392.00 },
  { id: 3, name: 'Amber Yellow', color: 'bg-amber-500', activeColor: 'bg-amber-300 ring-4 ring-amber-200 scale-105', freq: 523.25 },
];

export const ColorSequenceGame: React.FC<ColorSequenceGameProps> = ({
  difficulty,
  pacing = 'balanced',
  onComplete,
}) => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userStep, setUserStep] = useState<number>(0);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [gameState, setGameState] = useState<'intro' | 'playingSequence' | 'userTurn' | 'success'>('intro');
  const [statusMessage, setStatusMessage] = useState<string>('Watch the calm sequence...');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  const getSeqLength = () => {
    if (pacing === 'calm' || difficulty === 'Gentle') return 2;
    if (pacing === 'agile' || difficulty === 'Stimulating') return 4;
    return 3;
  };

  const getIntervalMs = () => {
    if (pacing === 'calm' || difficulty === 'Gentle') return 900;
    if (pacing === 'agile' || difficulty === 'Stimulating') return 550;
    return 700;
  };

  const clearAllTimeouts = () => {
    timeoutRefs.current.forEach((t) => clearTimeout(t));
    timeoutRefs.current = [];
  };

  const startNewRound = () => {
    clearAllTimeouts();
    const len = getSeqLength();
    const newSeq: number[] = [];
    for (let i = 0; i < len; i++) {
      newSeq.push(Math.floor(Math.random() * PADS.length));
    }
    setSequence(newSeq);
    setUserStep(0);
    playSequence(newSeq);
  };

  const playSequence = (seq: number[]) => {
    setGameState('playingSequence');
    setStatusMessage(`Watch ${seq.length} gentle pulses...`);
    const intervalMs = getIntervalMs();

    seq.forEach((padIdx, i) => {
      const startT = setTimeout(() => {
        setActivePad(padIdx);
        if (soundEnabled) audioSynthesizer.playTone(PADS[padIdx].freq, 0.25);
      }, (i + 1) * intervalMs);

      const endT = setTimeout(() => {
        setActivePad(null);
        if (i === seq.length - 1) {
          setGameState('userTurn');
          setStatusMessage('Your turn! Tap the pads in the same order.');
        }
      }, (i + 1) * intervalMs + Math.min(350, intervalMs - 150));

      timeoutRefs.current.push(startT, endT);
    });
  };

  useEffect(() => {
    startNewRound();
    return () => clearAllTimeouts();
  }, [difficulty, pacing]);

  const handlePadClick = (padId: number) => {
    if (gameState !== 'userTurn') return;

    if (soundEnabled) audioSynthesizer.playTone(PADS[padId].freq, 0.2);

    if (sequence[userStep] === padId) {
      const nextStep = userStep + 1;
      setUserStep(nextStep);

      if (nextStep === sequence.length) {
        setGameState('success');
        setStatusMessage('🎉 Beautiful! You remembered the whole sequence!');
        if (soundEnabled) audioSynthesizer.playChime('fanfare');
        setTimeout(() => {
          onComplete();
        }, 1200);
      }
    } else {
      setStatusMessage('Gentle try! Let us replay the sequence for you.');
      setTimeout(() => {
        playSequence(sequence);
        setUserStep(0);
      }, 1000);
    }
  };

  const handleHint = () => {
    if (sequence.length > 0) {
      const nextColor = PADS[sequence[userStep]]?.name || 'first';
      setStatusMessage(`Gentle Clue: Next color is ${nextColor}.`);
      SpeechService.speak(`The next color to tap is ${nextColor}.`);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-5 text-center animate-fadeIn">
      {/* Title & Status */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Color Sequence Memory</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {statusMessage}
        </h3>
        <p className="text-xs text-gray-500">
          Step {Math.min(userStep + 1, sequence.length)} of {sequence.length}
        </p>
      </div>

      {/* 4 Colored Interactive Pads */}
      <div className="grid grid-cols-2 gap-3.5 max-w-xs mx-auto p-2">
        {PADS.map((pad) => {
          const isGlowing = activePad === pad.id;
          return (
            <button
              key={pad.id}
              onClick={() => handlePadClick(pad.id)}
              disabled={gameState === 'playingSequence'}
              className={`h-24 sm:h-28 rounded-2xl font-black text-white text-xs sm:text-sm transition-all duration-200 shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                pad.color
              } ${isGlowing ? pad.activeColor : 'opacity-90 hover:opacity-100 hover:scale-102'}`}
              aria-label={`Color Pad ${pad.name}`}
            >
              <span className="text-lg">●</span>
              <span>{pad.name}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-purple-100">
        <button
          type="button"
          onClick={() => playSequence(sequence)}
          disabled={gameState === 'playingSequence'}
          className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition flex items-center space-x-1 min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Replay Pulses</span>
        </button>

        <button
          type="button"
          onClick={handleHint}
          className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition flex items-center space-x-1 min-h-[44px]"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Need a Hint?</span>
        </button>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center space-x-1 min-h-[44px] ${
            soundEnabled
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-gray-100 text-gray-600 border-gray-200'
          }`}
          aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
        </button>
      </div>
    </div>
  );
};
