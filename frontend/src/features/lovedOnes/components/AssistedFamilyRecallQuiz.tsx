import React, { useState, useMemo, useEffect } from 'react';
import { LovedOne } from '../../../types/index.js';
import { SpeechService } from '../../../services/speechService.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import {
  Heart,
  Volume2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  HelpCircle,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
  FileText,
  Play,
  Pause
} from 'lucide-react';

interface AssistedFamilyRecallQuizProps {
  lovedOnes: LovedOne[];
  onClose?: () => void;
  onOpenProfile?: (member: LovedOne) => void;
}

const FRIENDLY_DISTRACTORS = [
  'Neighbor Ramesh',
  'Care Nurse Sunita',
  'Dr. Sameer Joshi',
  'Aunt Shanti',
  'Teacher Meera',
  'Gardener Ramu'
];

export const AssistedFamilyRecallQuiz: React.FC<AssistedFamilyRecallQuizProps> = ({
  lovedOnes,
  onClose,
  onOpenProfile
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hintLevel, setHintLevel] = useState<number>(0); // 0 = none, 1 = Hint 1, 2 = Hint 2, 3 = Answer
  const [feedback, setFeedback] = useState<{ text: string; isCorrect: boolean } | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);

  const people = lovedOnes && lovedOnes.length > 0 ? lovedOnes : [];
  const currentPerson = people[currentIndex] || people[0];

  // Reset state when current person changes
  useEffect(() => {
    setSelectedGuess(null);
    setIsRevealed(false);
    setHintLevel(0);
    setFeedback(null);
    setIsPlayingVoice(false);
    setIsSpeakingQuestion(false);
    SpeechService.cancelSpeech();
  }, [currentIndex, currentPerson?.id]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      SpeechService.cancelSpeech();
    };
  }, []);

  // Derive memory clues from real saved records (never invented)
  const memoryClue = useMemo(() => {
    if (!currentPerson) return 'A cherished member of your family.';
    return (
      currentPerson.familiarPhrase ||
      (currentPerson.cues && currentPerson.cues[0]) ||
      currentPerson.description ||
      'A valued and loved person in your life.'
    );
  }, [currentPerson]);

  // Progressive Hint 1: Broad family connection
  const hint1Text = useMemo(() => {
    if (!currentPerson) return 'This person is part of your family.';
    return 'This person is part of your family and loves you dearly.';
  }, [currentPerson]);

  // Progressive Hint 2: Specific relationship anchor from record
  const hint2Text = useMemo(() => {
    if (!currentPerson) return '';
    const rel = currentPerson.relationship;
    const phrase = currentPerson.familiarPhrase ? ` They often greet you saying: "${currentPerson.familiarPhrase}"` : '';
    const cue = (!currentPerson.familiarPhrase && currentPerson.cues && currentPerson.cues[0])
      ? ` Memory clue: ${currentPerson.cues[0]}`
      : '';
    return `This is someone you have saved as your ${rel}.${phrase || cue}`;
  }, [currentPerson]);

  // Answer reveal text
  const answerText = useMemo(() => {
    if (!currentPerson) return '';
    return `This is your ${currentPerson.relationship}, ${currentPerson.name}.`;
  }, [currentPerson]);

  // 4 randomized options (correct + 3 friendly unique distractors)
  const options = useMemo(() => {
    if (!currentPerson) return [];
    const correct = currentPerson.name;
    const pool = people
      .filter((p) => p.name !== correct)
      .map((p) => p.name)
      .concat(FRIENDLY_DISTRACTORS);

    const chosen: string[] = [];
    for (const name of pool) {
      if (!chosen.includes(name) && name !== correct) {
        chosen.push(name);
      }
      if (chosen.length === 3) break;
    }

    const combined = [correct, ...chosen];
    return combined.sort(() => (currentIndex % 2 === 0 ? 0.5 - Math.random() : Math.random() - 0.5));
  }, [currentPerson, currentIndex, people]);

  if (!currentPerson) {
    return null;
  }

  const handleSpeakQuestion = () => {
    if (isSpeakingQuestion) {
      SpeechService.cancelSpeech();
      setIsSpeakingQuestion(false);
      return;
    }
    SpeechService.speak(
      `Do you remember who this is? Take your time and look at the photograph.`,
      () => setIsSpeakingQuestion(true),
      () => setIsSpeakingQuestion(false)
    );
  };

  const handleGuess = (guessName: string) => {
    setSelectedGuess(guessName);
    if (guessName === currentPerson.name) {
      audioSynthesizer.playChime('chime');
      setHintLevel(3);
      setIsRevealed(true);
      setFeedback({
        text: `Wonderful! That is ${currentPerson.name}, your ${currentPerson.relationship}! ❤️`,
        isCorrect: true
      });
      SpeechService.speak(`Wonderful! That is ${currentPerson.name}, your ${currentPerson.relationship}.`);
    } else {
      audioSynthesizer.playChime('reminder');
      // Non-punitive: advance hint to help patient immediately
      const nextLvl = Math.max(1, hintLevel + 1);
      setHintLevel(nextLvl);
      setFeedback({
        text: `A warm and loving face! Listen to the clue or tap Reveal Relationship to help remember.`,
        isCorrect: false
      });
      const clueSpeech = nextLvl === 1 ? hint1Text : nextLvl === 2 ? hint2Text : answerText;
      SpeechService.speak(`A warm and loving face! Here is a gentle clue: ${clueSpeech}`);
    }
  };

  const handleRevealHint = () => {
    const nextLevel = Math.min(3, hintLevel + 1);
    setHintLevel(nextLevel);
    if (nextLevel === 1) {
      SpeechService.speak(`Here is a gentle clue: ${hint1Text}`);
    } else if (nextLevel === 2) {
      SpeechService.speak(`Here is another clue: ${hint2Text}`);
    } else {
      setIsRevealed(true);
      SpeechService.speak(answerText);
    }
  };

  const handleToggleReveal = () => {
    const nextState = !isRevealed;
    setIsRevealed(nextState);
    if (nextState) {
      setHintLevel(3);
      SpeechService.speak(answerText);
    } else {
      setHintLevel(0);
    }
  };

  const handleListenClue = () => {
    SpeechService.speak(`Memory clue: ${memoryClue}`);
  };

  const handlePlayVoiceNote = () => {
    const noteText =
      currentPerson.voiceRecording?.transcript ||
      currentPerson.audioNote ||
      `Voice message from ${currentPerson.name}`;

    if (isPlayingVoice) {
      SpeechService.cancelSpeech();
      setIsPlayingVoice(false);
      return;
    }

    setIsPlayingVoice(true);
    SpeechService.speak(
      noteText,
      () => setIsPlayingVoice(true),
      () => setIsPlayingVoice(false)
    );
  };

  const handleNext = () => {
    SpeechService.cancelSpeech();
    setCurrentIndex((prev) => (prev + 1) % people.length);
  };

  const handlePrevious = () => {
    SpeechService.cancelSpeech();
    setCurrentIndex((prev) => (prev - 1 + people.length) % people.length);
  };

  const hasVoice = Boolean(currentPerson.voiceRecording || currentPerson.audioNote);

  return (
    <section
      id="family-memory-recall"
      aria-label="Gentle Face Recall Quiz"
      className="bg-gradient-to-br from-rose-50/70 via-purple-50/40 to-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200/90 shadow-soft-purple relative overflow-hidden transition-all duration-300"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-purple-100/90 gap-2">
        <div className="flex items-center space-x-2.5">
          <span className="p-2 rounded-2xl bg-purple-600 text-white shadow-2xs flex-shrink-0">
            <Heart className="w-4 h-4 fill-white" />
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-extrabold text-saksham-darkText tracking-tight">
                Family Memory Recall
              </h2>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2.5 py-0.5 rounded-full border border-purple-200 hidden xs:inline-block">
                Gentle & Non-Timed
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              Person {currentIndex + 1} of {people.length} • Connect with cherished smiling faces
            </p>
          </div>
        </div>

        {/* Pager controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          <button
            type="button"
            onClick={handlePrevious}
            className="p-2 rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-bold transition shadow-2xs min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            aria-label="Previous Person"
            title="Previous Person"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold transition shadow-xs min-h-[40px] cursor-pointer"
            aria-label="Next Person"
            title="Next Person"
          >
            <span>Next Person</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/80 hover:bg-rose-100 text-gray-500 hover:text-gray-800 transition ml-1 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              aria-label="Close Quiz"
              title="Close Quiz"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Encounter Area: Photograph + Gentle Memory Prompts */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 my-4">
        {/* Photograph Container */}
        <div className="relative flex-shrink-0">
          {currentPerson.photoUrl ? (
            <img
              src={currentPerson.photoUrl}
              alt={currentPerson.name}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white shadow-elevated"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  currentPerson.name
                )}&background=9333ea&color=ffffff&size=240`;
              }}
            />
          ) : (
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-purple-100 text-purple-600 flex items-center justify-center border-4 border-white shadow-elevated">
              <User className="w-14 h-14" />
            </div>
          )}

          <span className="absolute -bottom-1 -right-1 bg-rose-500 text-white p-1.5 rounded-full shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Question & Memory Anchor */}
        <div className="flex-1 text-center sm:text-left space-y-2.5 w-full">
          {/* Gentle Question with Read-Aloud */}
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
              "Do you remember who this is?"
            </h3>
            <button
              type="button"
              onClick={handleSpeakQuestion}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                isSpeakingQuestion
                  ? 'bg-purple-600 text-white border-purple-600 animate-pulse'
                  : 'bg-white border-purple-200 text-purple-700 hover:bg-purple-50'
              }`}
              title="Read Question Aloud"
              aria-label="Read Question Aloud"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Anchor Memory Clue (from actual records) */}
          <div className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">
            <span className="font-bold text-purple-900 mr-1">Memory Anchor Clue:</span>
            <span className="italic">"{memoryClue}"</span>
          </div>

          {/* Progressive Hint Banners (Requirement 5) */}
          <div className="space-y-2 pt-1">
            {hintLevel >= 1 && (
              <div className="p-3 bg-purple-50/90 border border-purple-200 rounded-2xl text-xs text-purple-950 font-medium leading-relaxed animate-in fade-in flex items-start gap-2">
                <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-black shrink-0 mt-0.5">
                  Hint 1
                </span>
                <span>{hint1Text}</span>
              </div>
            )}

            {hintLevel >= 2 && (
              <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-2xl text-xs text-rose-950 font-medium leading-relaxed animate-in fade-in flex items-start gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black shrink-0 mt-0.5">
                  Hint 2
                </span>
                <span>{hint2Text}</span>
              </div>
            )}

            {(hintLevel >= 3 || isRevealed) && (
              <div className="p-3.5 bg-gradient-to-r from-rose-100 via-pink-100 to-purple-100 rounded-2xl border-2 border-rose-300 text-center text-xs sm:text-sm font-bold text-rose-950 animate-in zoom-in-95 flex items-center justify-center space-x-2 shadow-2xs">
                <Heart className="w-4 h-4 text-rose-600 fill-rose-600 shrink-0" />
                <span>
                  This is your <strong className="text-rose-900">{currentPerson.relationship}</strong>,{' '}
                  <strong className="text-purple-950 font-extrabold">{currentPerson.name}</strong>!
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
            {/* Progressive Hint Action */}
            <button
              type="button"
              onClick={handleRevealHint}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition shadow-2xs min-h-[40px] cursor-pointer"
              aria-label="Reveal Hint"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>
                {hintLevel === 0 ? '💡 Reveal a Hint' : hintLevel === 1 ? '💡 Reveal Next Hint' : '💡 Final Hint'}
              </span>
            </button>

            {/* Answer / Relation Reveal Action */}
            <button
              type="button"
              onClick={handleToggleReveal}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-800 hover:bg-rose-50 text-xs font-bold transition shadow-2xs min-h-[40px] cursor-pointer"
              aria-label={isRevealed ? 'Hide Answer' : 'Reveal Relation / Answer'}
            >
              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isRevealed ? 'Hide Answer' : 'Reveal Answer'}</span>
            </button>

            {/* Listen to Anchor Clue Action */}
            <button
              type="button"
              onClick={handleListenClue}
              className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-2xs min-h-[40px] cursor-pointer"
              aria-label="Listen to Clue"
            >
              <Volume2 className="w-3.5 h-3.5 text-purple-600" />
              <span>Listen to Clue</span>
            </button>

            {/* Genuine Voice Memory Action (Requirement 7) */}
            {hasVoice && (
              <button
                type="button"
                onClick={handlePlayVoiceNote}
                className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-2xs min-h-[40px] cursor-pointer ${
                  isPlayingVoice
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200'
                }`}
                title={`Listen to voice message from ${currentPerson.name}`}
                aria-label={isPlayingVoice ? `Pause voice note from ${currentPerson.name}` : `Play voice note from ${currentPerson.name}`}
              >
                {isPlayingVoice ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlayingVoice ? 'Playing Voice...' : 'Voice Memory'}</span>
                {currentPerson.voiceRecording?.durationSeconds && (
                  <span className="text-[10px] opacity-80">({currentPerson.voiceRecording.durationSeconds}s)</span>
                )}
              </button>
            )}

            {/* View Full Profile Action */}
            {onOpenProfile && (
              <button
                type="button"
                onClick={() => onOpenProfile(currentPerson)}
                className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-2xs min-h-[40px] cursor-pointer"
                aria-label={`View Full Profile for ${currentPerson.name}`}
              >
                <span>View Full Profile</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Voice Transcript Display if Playing */}
      {isPlayingVoice && currentPerson.voiceRecording?.transcript && (
        <div className="my-3 p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200 text-xs text-rose-950 font-medium leading-relaxed animate-in fade-in">
          <div className="flex items-center gap-1.5 font-bold text-rose-900 text-[11px] mb-1">
            <FileText className="w-3.5 h-3.5 text-rose-700" />
            <span>Spoken Words from {currentPerson.name}:</span>
          </div>
          <p className="italic font-medium">"{currentPerson.voiceRecording.transcript}"</p>
        </div>
      )}

      {/* Gentle Feedback Message */}
      {feedback && (
        <div
          className={`my-3 p-3.5 rounded-2xl border text-xs sm:text-sm leading-relaxed flex items-start space-x-2.5 animate-in fade-in ${
            feedback.isCorrect
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
              : 'bg-purple-50 border-purple-200 text-purple-950'
          }`}
        >
          {feedback.isCorrect ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <HelpCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Multiple-Choice Name Options (Gentle & Non-Punitive) */}
      <div className="space-y-2 mt-4 pt-3 border-t border-purple-100">
        <p className="text-xs font-bold text-slate-700 text-center sm:text-left">
          Who brings you this warm memory?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {options.map((opt) => {
            const isSelected = selectedGuess === opt;
            const isCorrect = opt === currentPerson.name;

            let buttonStyle = 'bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 text-slate-800';

            if (isSelected) {
              if (isCorrect) {
                buttonStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-300';
              } else {
                buttonStyle = 'bg-purple-50 border-purple-300 text-purple-950 ring-1 ring-purple-200';
              }
            }

            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleGuess(opt)}
                className={`p-3.5 rounded-2xl border-2 text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center min-h-[48px] shadow-2xs active:scale-98 cursor-pointer ${buttonStyle}`}
              >
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
