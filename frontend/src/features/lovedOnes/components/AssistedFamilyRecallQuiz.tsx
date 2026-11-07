import React, { useState, useMemo } from 'react';
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
  CheckCircle2
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
  const [feedback, setFeedback] = useState<{ text: string; isCorrect: boolean } | null>(null);

  const people = lovedOnes.length > 0 ? lovedOnes : [];
  const currentPerson = people[currentIndex] || people[0];

  // Derive anchor clue
  const memoryClue = useMemo(() => {
    if (!currentPerson) return 'A cherished member of your family.';
    return (
      currentPerson.familiarPhrase ||
      (currentPerson.cues && currentPerson.cues[0]) ||
      currentPerson.description ||
      'A valued and loved person in your life.'
    );
  }, [currentPerson]);

  // Generate 4 randomized options for the quiz
  const options = useMemo(() => {
    if (!currentPerson) return [];
    const correct = currentPerson.name;
    const pool = people
      .filter((p) => p.name !== correct)
      .map((p) => p.name)
      .concat(FRIENDLY_DISTRACTORS);

    // Pick 3 unique distractors
    const chosen: string[] = [];
    for (const name of pool) {
      if (!chosen.includes(name) && name !== correct) {
        chosen.push(name);
      }
      if (chosen.length === 3) break;
    }

    // Combine and shuffle
    const combined = [correct, ...chosen];
    return combined.sort(() => (currentIndex % 2 === 0 ? 0.5 - Math.random() : Math.random() - 0.5));
  }, [currentPerson, currentIndex, people]);

  if (!currentPerson) {
    return null;
  }

  const handleGuess = (guessName: string) => {
    setSelectedGuess(guessName);
    if (guessName === currentPerson.name) {
      audioSynthesizer.playChime('chime');
      setFeedback({
        text: `Wonderful! That is ${currentPerson.name}, your ${currentPerson.relationship}! ❤️`,
        isCorrect: true
      });
      SpeechService.speak(`Yes! That is ${currentPerson.name}, your ${currentPerson.relationship}.`);
    } else {
      audioSynthesizer.playChime('reminder');
      setFeedback({
        text: `A warm and loving face! Listen to the clue or tap Reveal Relationship to help remember.`,
        isCorrect: false
      });
      SpeechService.speak('Take your time. Listen to the memory clue.');
    }
  };

  const handleNext = () => {
    SpeechService.cancelSpeech();
    setCurrentIndex((prev) => (prev + 1) % people.length);
    setSelectedGuess(null);
    setIsRevealed(false);
    setFeedback(null);
  };

  const handlePrevious = () => {
    SpeechService.cancelSpeech();
    setCurrentIndex((prev) => (prev - 1 + people.length) % people.length);
    setSelectedGuess(null);
    setIsRevealed(false);
    setFeedback(null);
  };

  const handleListenClue = () => {
    SpeechService.speak(
      `Memory clue: ${memoryClue}`,
      () => {},
      () => {}
    );
  };

  const handleToggleReveal = () => {
    const nextState = !isRevealed;
    setIsRevealed(nextState);
    if (nextState) {
      SpeechService.speak(
        `This is ${currentPerson.name}, your ${currentPerson.relationship}.`
      );
    }
  };

  return (
    <section
      aria-label="Gentle Face Recall Quiz"
      className="bg-gradient-to-br from-rose-50/70 via-purple-50/50 to-white rounded-3xl p-5 sm:p-6 border-2 border-rose-200 shadow-soft-purple relative overflow-hidden transition-all duration-300"
    >
      {/* Top Bar with Quiz Tag & Exit */}
      <div className="flex items-center justify-between pb-3 border-b border-rose-100">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-xl bg-rose-500 text-white shadow-2xs">
            <Heart className="w-4 h-4 fill-white" />
          </span>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-rose-950 uppercase tracking-wider">
              Gentle Face Recall Quiz
            </h2>
            <p className="text-[11px] text-gray-500">
              Person {currentIndex + 1} of {people.length} • Relaxed & non-timed
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            type="button"
            onClick={handlePrevious}
            className="p-2 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition shadow-2xs"
            aria-label="Previous Person"
            title="Previous Person"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
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
              className="p-2 rounded-xl bg-white/80 hover:bg-rose-100 text-gray-500 hover:text-gray-800 transition ml-1"
              aria-label="Close Quiz"
              title="Close Quiz"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Card: Photo + Memory Anchor Clue */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 my-4">
        {/* Photo Container with Accessible Avatar Fallback */}
        <div className="relative flex-shrink-0">
          {currentPerson.photoUrl ? (
            <img
              src={currentPerson.photoUrl}
              alt={currentPerson.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white shadow-elevated"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  currentPerson.name
                )}&background=f43f5e&color=ffffff&size=240`;
              }}
            />
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center border-4 border-white shadow-elevated">
              <User className="w-12 h-12" />
            </div>
          )}

          <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white p-1.5 rounded-full shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Anchor Clue and Action Buttons */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 text-[11px] font-bold">
            <Sparkles className="w-3 h-3 text-rose-600" />
            <span>Memory Anchor Clue</span>
          </div>

          <p className="text-sm sm:text-base font-semibold text-gray-800 italic leading-snug">
            "{memoryClue}"
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <button
              type="button"
              onClick={handleListenClue}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-800 hover:bg-rose-50 text-xs font-bold transition shadow-2xs min-h-[36px]"
              aria-label="Listen to Clue"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>🔊 Listen to Clue</span>
            </button>

            <button
              type="button"
              onClick={handleToggleReveal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-bold transition shadow-2xs min-h-[36px]"
              aria-label={isRevealed ? 'Hide Relationship' : 'Reveal Relationship'}
            >
              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isRevealed ? 'Hide Relation' : 'Reveal Relation'}</span>
            </button>

            {onOpenProfile && (
              <button
                type="button"
                onClick={() => onOpenProfile(currentPerson)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-lavender-100 text-purple-900 hover:bg-lavender-200 text-xs font-bold transition min-h-[36px]"
              >
                <span>View Full Profile</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Revealed Hint Banner */}
      {isRevealed && (
        <div className="my-3 p-3.5 bg-gradient-to-r from-rose-100 via-pink-100 to-purple-100 rounded-2xl border border-rose-200 text-center text-xs sm:text-sm font-bold text-rose-950 animate-fadeIn flex items-center justify-center space-x-2">
          <span>❤️</span>
          <span>
            This is <strong className="text-purple-900 font-extrabold">{currentPerson.name}</strong>, your{' '}
            <strong className="text-rose-800">{currentPerson.relationship}</strong>!
          </span>
        </div>
      )}

      {/* Gentle Feedback Message */}
      {feedback && (
        <div
          className={`my-3 p-3 rounded-2xl border text-xs sm:text-sm leading-relaxed flex items-start space-x-2.5 animate-fadeIn ${
            feedback.isCorrect
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
              : 'bg-lavender-50 border-purple-200 text-purple-950'
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

      {/* Multiple-Choice Name Options */}
      <div className="space-y-2 mt-4">
        <p className="text-xs font-bold text-gray-700 text-center sm:text-left">
          Who brings you this warm memory?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {options.map((opt) => {
            const isSelected = selectedGuess === opt;
            const isCorrect = opt === currentPerson.name;

            let buttonStyle = 'bg-white border-gray-200 hover:border-rose-300 text-gray-800';

            if (isSelected) {
              if (isCorrect) {
                buttonStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-300';
              } else {
                buttonStyle = 'bg-rose-50 border-rose-300 text-rose-950 ring-1 ring-rose-200';
              }
            }

            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleGuess(opt)}
                className={`p-3.5 rounded-2xl border-2 text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center min-h-[48px] shadow-2xs active:scale-98 ${buttonStyle}`}
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
