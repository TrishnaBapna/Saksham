import React, { useState, useEffect, useRef } from 'react';
import { GameDifficulty, GamePacing } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { Music, RotateCcw, Volume2, VolumeX, SkipForward } from 'lucide-react';

interface MelodyRecallGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  onComplete: () => void;
}

interface NotePad {
  id: string;
  name: string;
  pitch: number;
  color: string;
  activeColor: string;
}

const NOTES: NotePad[] = [
  { id: 'C', name: 'Low C', pitch: 261.63, color: 'bg-indigo-600', activeColor: 'bg-indigo-400 ring-4 ring-indigo-200 scale-105' },
  { id: 'E', name: 'Note E', pitch: 329.63, color: 'bg-purple-600', activeColor: 'bg-purple-400 ring-4 ring-purple-200 scale-105' },
  { id: 'G', name: 'Note G', pitch: 392.00, color: 'bg-pink-600', activeColor: 'bg-pink-400 ring-4 ring-pink-200 scale-105' },
  { id: 'C2', name: 'High C', pitch: 523.25, color: 'bg-teal-600', activeColor: 'bg-teal-400 ring-4 ring-teal-200 scale-105' },
];

export const MelodyRecallGame: React.FC<MelodyRecallGameProps> = ({
  difficulty,
  pacing = 'balanced',
  onComplete,
}) => {
  const { t, language } = useLanguage();
  const melodyUi = (
    {
      hi: {
        matched: '⭐ बहुत सुंदर! सुर बिल्कुल सही मिले!',
        gentleRetry: 'कोई बात नहीं! आइए आपके लिए यह धुन फिर से बजाते हैं।',
        stepCounter: (cur: number, total: number) => `सुर ${cur} / ${total}`,
        notePadAria: (name: string) => `संगीत सुर ${name}`,
        muteAria: 'आवाज़ बंद करें',
        enableAria: 'आवाज़ चालू करें',
        notes: { C: 'निम्न सा', E: 'सुर ग', G: 'सुर प', C2: 'उच्च सां' } as Record<string, string>,
      },
      mr: {
        matched: '⭐ खूप सुंदर! सूर अचूक जुळले!',
        gentleRetry: 'छान प्रयत्न! ही धून आपण पुन्हा एकदा ऐकूया.',
        stepCounter: (cur: number, total: number) => `सूर ${cur} / ${total}`,
        notePadAria: (name: string) => `संगीत सूर ${name}`,
        muteAria: 'आवाज बंद करा',
        enableAria: 'आवाज सुरू करा',
        notes: { C: 'खर्जाचा सा', E: 'सूर ग', G: 'सूर प', C2: 'तार सां' } as Record<string, string>,
      },
      bn: {
        matched: '⭐ চমৎকার! সুরটি দারুণ মিলেছে!',
        gentleRetry: 'চিন্তা নেই! চলুন সুরটি আবার শুনি।',
        stepCounter: (cur: number, total: number) => `সুর ${cur} / ${total}`,
        notePadAria: (name: string) => `সুরের বোতাম ${name}`,
        muteAria: 'শব্দ বন্ধ করুন',
        enableAria: 'শব্দ চালু করুন',
        notes: { C: 'নিচু সা', E: 'সুর গা', G: 'সুর পা', C2: 'উঁচু সা' } as Record<string, string>,
      },
      ta: {
        matched: '⭐ அருமை! இசைச் சுரங்கள் சரியாகப் பொருந்தின!',
        gentleRetry: 'பரவாயில்லை! உங்களுக்காக மீண்டும் இசையை வாசிக்கிறேன்.',
        stepCounter: (cur: number, total: number) => `சுரம் ${cur} / ${total}`,
        notePadAria: (name: string) => `இசைப் பொத்தான் ${name}`,
        muteAria: 'ஒலியை நிறுத்து',
        enableAria: 'ஒலியை இயக்கு',
        notes: { C: 'கீழ் ச', E: 'சுரம் க', G: 'சுரம் ப', C2: 'மேல் ச' } as Record<string, string>,
      },
      te: {
        matched: '⭐ అద్భుతం! రాగం చక్కగా సరిపోయింది!',
        gentleRetry: 'మంచి ప్రయత్నం! మీ కోసం ఆ రాగాన్ని మళ్లీ వినిపిస్తాను.',
        stepCounter: (cur: number, total: number) => `స్వరం ${cur} / ${total}`,
        notePadAria: (name: string) => `సంగీత స్వరం ${name}`,
        muteAria: 'శబ్దం ఆపండి',
        enableAria: 'శబ్దం ఆన్ చేయండి',
        notes: { C: 'లో సి (స)', E: 'స్వరం ఇ (గ)', G: 'స్వరం జి (ప)', C2: 'హై సి (స)' } as Record<string, string>,
      },
      kn: {
        matched: '⭐ ಅದ್ಭುತ! ರಾಗವು ಸರಿಯಾಗಿ ಹೊಂದಿಕೆಯಾಗಿದೆ!',
        gentleRetry: 'ಪರವಾಗಿಲ್ಲ! ನಿಮಗಾಗಿ ರಾಗವನ್ನು ಮತ್ತೊಮ್ಮೆ ನುಡಿಸುತ್ತೇವೆ.',
        stepCounter: (cur: number, total: number) => `ಸ್ವರ ${cur} / ${total}`,
        notePadAria: (name: string) => `ಸಂಗೀತ ಸ್ವರ ${name}`,
        muteAria: 'ಧ್ವನಿ ನಿಲ್ಲಿಸಿ',
        enableAria: 'ಧ್ವನಿ ಆನ್ ಮಾಡಿ',
        notes: { C: 'ಕೆಳ ಸ', E: 'ಸ್ವರ ಗ', G: 'ಸ್ವರ ಪ', C2: 'ಮೇಲ್ ಸ' } as Record<string, string>,
      },
    } as Record<string, any>
  )[language] || {
    matched: '⭐ Beautiful melody matched!',
    gentleRetry: 'Gentle try! Let us play the melody again for you.',
    stepCounter: (cur: number, total: number) => `Note ${cur} of ${total}`,
    notePadAria: (name: string) => `Musical note pad ${name}`,
    muteAria: 'Mute sound',
    enableAria: 'Enable sound',
    notes: { C: 'Low C', E: 'Note E', G: 'Note G', C2: 'High C' } as Record<string, string>,
  };
  const [targetMelody, setTargetMelody] = useState<string[]>([]);
  const [userStep, setUserStep] = useState<number>(0);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'playingMelody' | 'userTurn' | 'success'>('playingMelody');
  const [feedbackOverride, setFeedbackOverride] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  const getMelodyLength = () => {
    if (pacing === 'calm' || difficulty === 'Gentle') return 2;
    if (pacing === 'agile' || difficulty === 'Stimulating') return 4;
    return 3;
  };

  const clearTimeouts = () => {
    timeoutRefs.current.forEach((t) => clearTimeout(t));
    timeoutRefs.current = [];
  };

  const playMelody = (notes: string[]) => {
    clearTimeouts();
    setGameState('playingMelody');
    setFeedbackOverride(null);

    const intervalMs = pacing === 'calm' || difficulty === 'Gentle' ? 800 : 600;

    notes.forEach((noteId, i) => {
      const pad = NOTES.find((n) => n.id === noteId);
      const startT = setTimeout(() => {
        setActiveNote(noteId);
        if (soundEnabled && pad) {
          audioSynthesizer.playTone(pad.pitch, 0.35);
        }
      }, (i + 1) * intervalMs);

      const endT = setTimeout(() => {
        setActiveNote(null);
        if (i === notes.length - 1) {
          setGameState('userTurn');
          setFeedbackOverride(null);
        }
      }, (i + 1) * intervalMs + 350);

      timeoutRefs.current.push(startT, endT);
    });
  };

  const startNewMelody = () => {
    const len = getMelodyLength();
    const melody: string[] = [];
    for (let i = 0; i < len; i++) {
      melody.push(NOTES[Math.floor(Math.random() * NOTES.length)].id);
    }
    setTargetMelody(melody);
    setUserStep(0);
    playMelody(melody);
  };

  useEffect(() => {
    startNewMelody();
    return () => clearTimeouts();
  }, [difficulty, pacing]);

  const handleNoteTap = (note: NotePad) => {
    if (gameState !== 'userTurn') return;

    if (soundEnabled) {
      audioSynthesizer.playTone(note.pitch, 0.3);
    }

    if (targetMelody[userStep] === note.id) {
      const nextStep = userStep + 1;
      setUserStep(nextStep);

      if (nextStep === targetMelody.length) {
        setGameState('success');
        setFeedbackOverride(melodyUi.matched);
        if (soundEnabled) audioSynthesizer.playChime('fanfare');
        setTimeout(() => {
          onComplete();
        }, 1200);
      }
    } else {
      setFeedbackOverride(melodyUi.gentleRetry);
      setTimeout(() => {
        playMelody(targetMelody);
        setUserStep(0);
      }, 1000);
    }
  };

  const handleSkip = () => {
    clearTimeouts();
    onComplete();
  };

  const feedbackText =
    feedbackOverride ||
    (gameState === 'userTurn'
      ? t('games_runner.melody_turn')
      : t('games_runner.melody_listen', { len: targetMelody.length }));

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-5 text-center animate-fadeIn">
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <Music className="w-3.5 h-3.5 text-pink-600" />
          <span>{t('games_runner.melody_title')}</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {feedbackText}
        </h3>
        <p className="text-xs text-gray-500 font-semibold">
          {melodyUi.stepCounter(Math.min(userStep + 1, targetMelody.length), targetMelody.length)}
        </p>
      </div>

      {/* 4 Musical Note Bells */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md mx-auto p-2">
        {NOTES.map((note) => {
          const isGlowing = activeNote === note.id;
          const localizedNoteName = melodyUi.notes[note.id] || note.name;
          return (
            <button
              key={note.id}
              type="button"
              onClick={() => handleNoteTap(note)}
              disabled={gameState === 'playingMelody'}
              className={`py-6 rounded-2xl font-black text-white text-xs sm:text-sm transition-all duration-200 shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                note.color
              } ${isGlowing ? note.activeColor : 'opacity-90 hover:opacity-100 hover:scale-103'}`}
              aria-label={melodyUi.notePadAria(localizedNoteName)}
            >
              <span className="text-xl">🔔</span>
              <span>{localizedNoteName}</span>
            </button>
          );
        })}
      </div>

      {/* Controls: Replay, Mute, Skip */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-purple-100">
        <button
          type="button"
          onClick={() => playMelody(targetMelody)}
          disabled={gameState === 'playingMelody'}
          className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition flex items-center space-x-1 min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('games_runner.melody_replay')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center space-x-1 min-h-[44px] ${
            soundEnabled
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-gray-100 text-gray-600 border-gray-200'
          }`}
          aria-label={soundEnabled ? melodyUi.muteAria : melodyUi.enableAria}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{soundEnabled ? t('games_runner.sound_on') : t('games_runner.muted')}</span>
        </button>

        <button
          type="button"
          onClick={handleSkip}
          className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition flex items-center space-x-1 min-h-[44px]"
        >
          <SkipForward className="w-3.5 h-3.5" />
          <span>{t('games_runner.melody_skip')}</span>
        </button>
      </div>
    </div>
  );
};
