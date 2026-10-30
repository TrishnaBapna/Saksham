import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VoiceReadButton } from '@/components/voice/VoiceReadButton';
import { voiceService } from '@/services/voiceService';
import { audioSynthesizer } from '@/services/audioService';
import type { LovedOne } from '@/types/firestore';

interface LovedPerson {
  id: number;
  name: string;
  role: string;
  phone: string;
  clue: string;
  avatar: string;
}

const DEFAULT_LOVED_ONES: LovedPerson[] = [
  {
    id: 1,
    name: 'Ananya Verma',
    role: 'Daughter',
    phone: '+91 98201 12345',
    clue: 'She calls you every evening at 6 PM from Bengaluru.',
    avatar: '👩',
  },
  {
    id: 2,
    name: 'Dr. Sameer Joshi',
    role: 'Attending Neurologist',
    phone: '+91 98202 54321',
    clue: 'Helps with your morning medication timing and speech check-ins.',
    avatar: '👨‍⚕️',
  },
];

interface LovedOnesViewProps {
  lovedOnes?: LovedOne[];
}

export const LovedOnesView: React.FC<LovedOnesViewProps> = ({ lovedOnes = [] }) => {
  const people: LovedPerson[] = lovedOnes.length > 0
    ? lovedOnes.map((l) => ({
        id: l.id,
        name: l.name,
        role: l.role,
        phone: l.phone,
        clue: l.clue || 'A valued member of your care circle.',
        avatar: l.img || '👤',
      }))
    : DEFAULT_LOVED_ONES;
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  const currentPerson = people[quizIdx] || people[0]!;

  const handleGuess = (name: string) => {
    setSelectedGuess(name);
    if (name === currentPerson.name) {
      audioSynthesizer.playTaskComplete();
      voiceService.speak(`Yes! That is ${currentPerson.name}, your ${currentPerson.role}.`);
    } else {
      audioSynthesizer.playReminderCue();
      voiceService.speak(`Not quite. Listen to the clue.`);
    }
  };

  const nextQuiz = () => {
    setQuizIdx((prev) => (prev + 1) % people.length);
    setSelectedGuess(null);
    setReveal(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-2xl shrink-0">
            ❤️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 font-heading">
                Loved Ones & Familiar Faces
              </h2>
              <VoiceReadButton
                textToRead="Loved Ones and Familiar Faces. Face recall and calming memory anchors for family and care partners."
                ariaLabel="Read Loved Ones description"
              />
            </div>
            <p className="text-xs text-gray-500">
              Visual orientation and gentle memory recall to reduce disorientation and foster emotional connection.
            </p>
          </div>
        </div>
      </div>

      {/* Face Recall Quiz Card */}
      <Card className="p-6 bg-gradient-to-br from-rose-50/50 to-white border border-rose-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
            Gentle Face Recall Quiz
          </span>
          <Button variant="ghost" size="sm" onClick={nextQuiz} className="text-xs">
            Next Person →
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5 my-2">
          <div className="w-24 h-24 rounded-full bg-rose-100 border-4 border-white shadow-md flex items-center justify-center text-5xl">
            {currentPerson.avatar}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Memory Anchor Clue
            </p>
            <p className="text-sm font-semibold text-gray-800 italic mt-0.5">
              "{currentPerson.clue}"
            </p>

            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => voiceService.speak(currentPerson.clue)}
                className="text-xs"
              >
                🔊 Listen to Clue
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReveal(!reveal)}
                className="text-xs text-rose-700 hover:bg-rose-100/60"
              >
                {reveal ? 'Hide Relation' : 'Reveal Relation'}
              </Button>
            </div>
          </div>
        </div>

        {reveal && (
          <div className="mt-4 p-3 bg-rose-100/80 rounded-2xl text-center text-xs font-bold text-rose-950 animate-fade-in">
            This is {currentPerson.name}, your {currentPerson.role}!
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 mt-5">
          {[currentPerson.name, 'Neighbor Ramesh', 'Care Nurse Sunita', 'Dr. Verma'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleGuess(opt)}
              className={`p-3.5 rounded-2xl border-2 text-xs font-bold transition-all min-h-touch ${
                selectedGuess === opt
                  ? opt === currentPerson.name
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-white border-gray-200 hover:border-rose-300 text-gray-800'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </Card>

      {/* Directory of Family & Care Contacts */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-800">
          Your Immediate Care Circle
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {people.map((p) => (
            <Card key={p.id} className="p-4 bg-white border border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{p.avatar}</span>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{p.name}</h4>
                  <p className="text-xs text-gray-500 font-medium">{p.role}</p>
                </div>
              </div>

              <a
                href={`tel:${p.phone.replace(/[^0-9+]/g, '')}`}
                className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100"
              >
                📞 Call
              </a>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
