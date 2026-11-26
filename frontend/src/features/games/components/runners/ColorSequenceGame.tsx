import React, { useState, useEffect, useRef } from 'react';
import { GameDifficulty, GamePacing } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { SpeechService } from '../../../../services/speechService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
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
  const { t, language } = useLanguage();
  const [sequence, setSequence] = useState<number[]>([]);
  const [userStep, setUserStep] = useState<number>(0);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [gameState, setGameState] = useState<'intro' | 'playingSequence' | 'userTurn' | 'success'>('intro');
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
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
    setStatusOverride(null);
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
          setStatusOverride(null);
        }
      }, (i + 1) * intervalMs + Math.min(350, intervalMs - 150));

      timeoutRefs.current.push(startT, endT);
    });
  };

  useEffect(() => {
    startNewRound();
    return () => clearAllTimeouts();
  }, [difficulty, pacing]);

  const COLOR_NAMES: Record<string, Record<string, string>> = {
    en: { 'Rose Red': 'Rose Red', 'Sky Blue': 'Sky Blue', 'Emerald Green': 'Emerald Green', 'Amber Yellow': 'Amber Yellow' },
    hi: { 'Rose Red': 'गुलाबी लाल', 'Sky Blue': 'आसमानी नीला', 'Emerald Green': 'हरा', 'Amber Yellow': 'पीला' },
    mr: { 'Rose Red': 'गुलाबी लाल', 'Sky Blue': 'निळा', 'Emerald Green': 'हिरवा', 'Amber Yellow': 'पिवळा' },
    bn: { 'Rose Red': 'লাল', 'Sky Blue': 'আকাশি নীল', 'Emerald Green': 'সবুজ', 'Amber Yellow': 'হলুদ' },
    ta: { 'Rose Red': 'சிவப்பு', 'Sky Blue': 'நீலம்', 'Emerald Green': 'பச்சை', 'Amber Yellow': 'மஞ்சள்' },
    te: { 'Rose Red': 'ఎరుపు', 'Sky Blue': 'నీలం', 'Emerald Green': 'ఆకుపచ్చ', 'Amber Yellow': 'పసుపు' },
    kn: { 'Rose Red': 'ಕೆಂಪು', 'Sky Blue': 'ನೀಲಿ', 'Emerald Green': 'ಹಸಿರು', 'Amber Yellow': 'ಹಳದಿ' },
  };
  const colorUi = (
    {
      en: {
        won: '🎉 Beautiful! You remembered the whole sequence!',
        retry: 'Gentle try! Let us replay the sequence for you.',
        clue: (c: string) => `Gentle Clue: Next color is ${c}.`,
        speak: (c: string) => `The next color to tap is ${c}.`,
        stepOf: (s: number, tot: number) => `Step ${s} of ${tot}`,
        padAria: (c: string) => `Color Pad ${c}`,
        mute: 'Mute sound',
        unmute: 'Enable sound',
      },
      hi: {
        won: '🎉 बहुत बढ़िया! आपने पूरा क्रम याद रखा!',
        retry: 'अच्छा प्रयास! आइए क्रम को फिर से देखें।',
        clue: (c: string) => `संकेत: अगला रंग ${c} है।`,
        speak: (c: string) => `दबाने के लिए अगला रंग ${c} है।`,
        stepOf: (s: number, tot: number) => `चरण ${s} / ${tot}`,
        padAria: (c: string) => `रंग पैड ${c}`,
        mute: 'आवाज़ बंद करें',
        unmute: 'आवाज़ चालू करें',
      },
      mr: {
        won: '🎉 खूप छान! तुम्ही संपूर्ण क्रम लक्षात ठेवला!',
        retry: 'छान प्रयत्न! चला क्रम पुन्हा पाहूया.',
        clue: (c: string) => `संकेत: पुढचा रंग ${c} आहे.`,
        speak: (c: string) => `दाबण्यासाठी पुढचा रंग ${c} आहे.`,
        stepOf: (s: number, tot: number) => `टप्पा ${s} / ${tot}`,
        padAria: (c: string) => `रंग पॅड ${c}`,
        mute: 'आवाज बंद करा',
        unmute: 'आवाज सुरू करा',
      },
      bn: {
        won: '🎉 চমৎকার! আপনি পুরো ক্রমটি মনে রেখেছেন!',
        retry: 'ভালো চেষ্টা! চলুন ক্রমটি আবার দেখি।',
        clue: (c: string) => `ইঙ্গিত: পরের রঙ হলো ${c}।`,
        speak: (c: string) => `ট্যাপ করার পরের রঙ হলো ${c}।`,
        stepOf: (s: number, tot: number) => `ধাপ ${s} / ${tot}`,
        padAria: (c: string) => `রঙের প্যাড ${c}`,
        mute: 'শব্দ বন্ধ করুন',
        unmute: 'শব্দ চালু করুন',
      },
      ta: {
        won: '🎉 அருமை! முழு வரிசையையும் நினைவுகூர்ந்தீர்கள்!',
        retry: 'நல்ல முயற்சி! வரிசையை மீண்டும் பார்ப்போம்.',
        clue: (c: string) => `குறிப்பு: அடுத்த நிறம் ${c}.`,
        speak: (c: string) => `அடுத்துத் தட்ட வேண்டிய நிறம் ${c}.`,
        stepOf: (s: number, tot: number) => `படி ${s} / ${tot}`,
        padAria: (c: string) => `நிறப் பொத்தான் ${c}`,
        mute: 'ஒலியை அணை',
        unmute: 'ஒலியை இயக்கு',
      },
      te: {
        won: '🎉 అద్భుతం! మీరు మొత్తం క్రమాన్ని గుర్తుంచుకున్నారు!',
        retry: 'మంచి ప్రయత్నం! క్రమాన్ని మళ్ళీ చూద్దాం.',
        clue: (c: string) => `సూచన: తదుపరి రంగు ${c}.`,
        speak: (c: string) => `తదుపరి నొక్కాల్సిన రంగు ${c}.`,
        stepOf: (s: number, tot: number) => `దశ ${s} / ${tot}`,
        padAria: (c: string) => `రంగు ప్యాడ్ ${c}`,
        mute: 'శబ్దం ఆపు',
        unmute: 'శబ్దం ఆన్ చేయి',
      },
      kn: {
        won: '🎉 ಅದ್ಭುತ! ನೀವು ಸಂಪೂರ್ಣ ಕ್ರಮವನ್ನು ನೆನಪಿಟ್ಟುಕೊಂಡಿದ್ದೀರಿ!',
        retry: 'ಒಳ್ಳೆಯ ಪ್ರಯತ್ನ! ಕ್ರಮವನ್ನು ಮತ್ತೆ ನೋಡೋಣ.',
        clue: (c: string) => `ಸುಳಿವು: ಮುಂದಿನ ಬಣ್ಣ ${c}.`,
        speak: (c: string) => `ಒತ್ತಬೇಕಾದ ಮುಂದಿನ ಬಣ್ಣ ${c}.`,
        stepOf: (s: number, tot: number) => `ಹಂತ ${s} / ${tot}`,
        padAria: (c: string) => `ಬಣ್ಣದ ಪ್ಯಾಡ್ ${c}`,
        mute: 'ಧ್ವನಿ ನಿಲ್ಲಿಸಿ',
        unmute: 'ಧ್ವನಿ ಆನ್ ಮಾಡಿ',
      },
    } as Record<string, any>
  )[language] || {
    won: '🎉 Beautiful! You remembered the whole sequence!',
    retry: 'Gentle try! Let us replay the sequence for you.',
    clue: (c: string) => `Gentle Clue: Next color is ${c}.`,
    speak: (c: string) => `The next color to tap is ${c}.`,
    stepOf: (s: number, tot: number) => `Step ${s} of ${tot}`,
    padAria: (c: string) => `Color Pad ${c}`,
    mute: 'Mute sound',
    unmute: 'Enable sound',
  };
  const padColorLabel = (name: string) => COLOR_NAMES[language]?.[name] || name;

  const handlePadClick = (padId: number) => {
    if (gameState !== 'userTurn') return;

    if (soundEnabled) audioSynthesizer.playTone(PADS[padId].freq, 0.2);

    if (sequence[userStep] === padId) {
      const nextStep = userStep + 1;
      setUserStep(nextStep);

      if (nextStep === sequence.length) {
        setGameState('success');
        setStatusOverride(colorUi.won);
        if (soundEnabled) audioSynthesizer.playChime('fanfare');
        setTimeout(() => {
          onComplete();
        }, 1200);
      }
    } else {
      setStatusOverride(colorUi.retry);
      setTimeout(() => {
        playSequence(sequence);
        setUserStep(0);
      }, 1000);
    }
  };

  const handleHint = () => {
    if (sequence.length > 0) {
      const rawName = PADS[sequence[userStep]]?.name || 'Rose Red';
      const nextColor = padColorLabel(rawName);
      setStatusOverride(colorUi.clue(nextColor));
      SpeechService.speak(colorUi.speak(nextColor), undefined, undefined, SpeechService.getBCP47(language));
    }
  };

  const displayStatus =
    statusOverride ||
    (gameState === 'userTurn'
      ? t('games_runner.color_turn')
      : t('games_runner.color_watch', { len: sequence.length }));

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-5 text-center animate-fadeIn">
      {/* Title & Status */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{t('games_runner.color_title')}</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {displayStatus}
        </h3>
        <p className="text-xs text-gray-500">
          {colorUi.stepOf(Math.min(userStep + 1, sequence.length), sequence.length)}
        </p>
      </div>

      {/* 4 Colored Interactive Pads */}
      <div className="grid grid-cols-2 gap-3.5 max-w-xs mx-auto p-2">
        {PADS.map((pad) => {
          const isGlowing = activePad === pad.id;
          const localizedColor = padColorLabel(pad.name);
          return (
            <button
              key={pad.id}
              onClick={() => handlePadClick(pad.id)}
              disabled={gameState === 'playingSequence'}
              className={`h-24 sm:h-28 rounded-2xl font-black text-white text-xs sm:text-sm transition-all duration-200 shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                pad.color
              } ${isGlowing ? pad.activeColor : 'opacity-90 hover:opacity-100 hover:scale-102'}`}
              aria-label={colorUi.padAria(localizedColor)}
            >
              <span className="text-lg">●</span>
              <span>{localizedColor}</span>
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
          <span>{t('games_runner.color_replay')}</span>
        </button>

        <button
          type="button"
          onClick={handleHint}
          className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition flex items-center space-x-1 min-h-[44px]"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{t('games_runner.need_hint')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center space-x-1 min-h-[44px] ${
            soundEnabled
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-gray-100 text-gray-600 border-gray-200'
          }`}
          aria-label={soundEnabled ? colorUi.mute : colorUi.unmute}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>{soundEnabled ? t('games_runner.sound_on') : t('games_runner.muted')}</span>
        </button>
      </div>
    </div>
  );
};
