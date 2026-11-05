import React, { useState } from 'react';
import { GameDifficulty, RoomRecord } from '../../../../types/index.js';
import { Camera, ShieldCheck, CheckCircle, HelpCircle, Eye, AlertCircle } from 'lucide-react';

interface RoomMemoryActivityProps {
  difficulty: GameDifficulty;
  onComplete: () => void;
}

const DEFAULT_ROOM: RoomRecord = {
  id: 'room-bedroom-ref-01',
  roomName: 'Master Bedroom',
  photoUrl: 'https://images.unsplash.com/photo-1540518614846-7ede433c4550?auto=format&fit=crop&w=800&q=80',
  capturedDate: 'Nov 4, 2026 at 10:15 AM',
  lastCheckedTime: 'Today at 09:30 AM',
  detectedObjects: [
    {
      name: 'Reading Glasses (Black Rimmed)',
      locationHint: 'Resting on the wooden bedside table next to the reading lamp',
      verifiedTime: 'Nov 4, 10:15 AM'
    },
    {
      name: 'Home Keys (Brass Ring)',
      locationHint: 'Hanging on the small wall hook right beside the bedroom door',
      verifiedTime: 'Nov 4, 10:15 AM'
    },
    {
      name: 'Blue Water Flask',
      locationHint: 'On the chest of drawers next to the window',
      verifiedTime: 'Nov 4, 10:15 AM'
    }
  ]
};

const ROOM_QUESTIONS = [
  {
    id: 'q-1',
    question: 'Where are the reading glasses resting in this reference photograph?',
    options: [
      'Resting on the wooden bedside table next to the reading lamp',
      'Inside the closed wardrobe drawer',
      'On the floor under the bed'
    ],
    correctIndex: 0,
    hint: 'Look closely at the bedside table beside the warm lamp.'
  },
  {
    id: 'q-2',
    question: 'What color is the water flask visible on the chest of drawers?',
    options: [
      'Blue water flask',
      'Bright orange thermos',
      'Silver metallic bottle'
    ],
    correctIndex: 0,
    hint: 'Check the surface of the chest of drawers near the curtain.'
  },
  {
    id: 'q-3',
    question: 'Where are the home keys kept in this reference photograph?',
    options: [
      'Hanging on the small wall hook beside the bedroom door',
      'Hidden under the bed pillows',
      'Inside the bathroom cabinet'
    ],
    correctIndex: 0,
    hint: 'Notice the wooden hook beside the door frame.'
  }
];

export const RoomMemoryActivity: React.FC<RoomMemoryActivityProps> = ({
  difficulty: _difficulty,
  onComplete
}) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentQ = ROOM_QUESTIONS[currentQIndex];

  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
    if (index === currentQ.correctIndex) {
      setIsAnswered(true);
      setFeedback('Spot on! You remembered exactly where it is in the reference photo! 🌸');

      setTimeout(() => {
        if (currentQIndex < ROOM_QUESTIONS.length - 1) {
          setCurrentQIndex((prev) => prev + 1);
          setSelectedOption(null);
          setIsAnswered(false);
          setFeedback(null);
        } else {
          onComplete();
        }
      }, 1400);
    } else {
      setFeedback(`Gentle Clue: ${currentQ.hint}`);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-5">
      {/* Header and Mandatory Clinical Safeguards */}
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between text-xs text-purple-900 font-semibold">
        <div className="flex items-center space-x-1.5">
          <Camera className="w-4 h-4 text-purple-600" />
          <span>Reference Room Memory & Observation</span>
        </div>
        <span className="text-gray-500">Question {currentQIndex + 1} of {ROOM_QUESTIONS.length}</span>
      </div>

      {/* Crucial Safeguard Warning Banner */}
      <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-xs text-amber-950 flex items-start space-x-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Observation Safeguard Note:</span> This is an archived reference photograph taken on {DEFAULT_ROOM.capturedDate}. It does not represent real-time room status, and questions pertain only to what is visible in this reference image.
        </div>
      </div>

      {/* Reference Photograph */}
      <div className="rounded-3xl overflow-hidden border border-purple-200 shadow-sm relative">
        <div className="relative h-48 sm:h-64 w-full">
          <img
            src={DEFAULT_ROOM.photoUrl}
            alt="Reference Master Bedroom Photograph"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold text-saksham-darkText shadow-sm flex items-center space-x-1">
            <Eye className="w-3.5 h-3.5 text-purple-600" />
            <span>Reference Photo • {DEFAULT_ROOM.roomName}</span>
          </div>

          <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-xs px-3 py-1.5 rounded-xl text-[11px] text-white flex items-center justify-between">
            <span>Archived: {DEFAULT_ROOM.capturedDate}</span>
            <span className="text-emerald-300 font-bold flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>3 Verified Reference Items</span>
            </span>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-lavender-50/70 p-5 rounded-3xl border border-purple-200 space-y-4">
        <h3 className="text-sm sm:text-base font-bold text-saksham-darkText">
          {currentQ.question}
        </h3>

        {feedback && (
          <div
            className={`p-3 rounded-2xl border text-xs leading-relaxed flex items-start space-x-2 animate-fadeIn ${
              isAnswered
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                : 'bg-white border-purple-200 text-purple-900'
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

        <div className="space-y-2">
          {currentQ.options.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectOption(idx)}
              disabled={isAnswered}
              className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition-all transform active:scale-98 flex items-center justify-between ${
                selectedOption === idx
                  ? idx === currentQ.correctIndex
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-2 ring-emerald-200'
                    : 'bg-purple-100 border-purple-300 text-purple-950'
                  : 'bg-white border-purple-100 text-gray-800 hover:border-purple-300 hover:bg-white'
              }`}
            >
              <span>{option}</span>
              {selectedOption === idx && idx === currentQ.correctIndex && (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
