import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FamilyMember } from '../../types/index.js';
import { SpeechService } from '../../services/speechService.js';
import {
  Search,
  Plus,
  Volume2,
  Heart,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';

export const LovedOnes: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);

  // Verified family profiles
  const [familyMembers] = useState<FamilyMember[]>([
    {
      id: 'family-01',
      name: 'Ananya Sharma',
      relationship: 'Daughter & Primary Caregiver',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      description: 'Lives nearby in Indiranagar. Visits every Tuesday and Sunday afternoon with home-cooked cardamom kheer.',
      audioNote: 'Namaste Ma! It is Ananya. Remember, I am picking you up on Sunday for the temple visit. Love you always!',
      cues: [
        'Calls you every morning at 9:00 AM',
        'Loves listening to old ghazals with you',
        'Works as an architect in Bengaluru',
      ],
    },
    {
      id: 'family-02',
      name: 'Aarav Sharma',
      relationship: 'Grandson (Age 9)',
      photoUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&w=400&q=80',
      description: 'Ananya\'s son. Loves showing you his origami paper animals and playing carrom on the verandah.',
      audioNote: 'Dadi! It is Aarav. Look at the paper crane I folded for your bedside table!',
      cues: [
        'Loves your story about the tiger in Shimla',
        'Always asks for a warm hug',
        'Studies in 4th grade',
      ],
    },
    {
      id: 'family-03',
      name: 'Dr. Vikram Sharma',
      relationship: 'Son (Elder Brother to Ananya)',
      photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
      description: 'Cardiologist living in Delhi. Video-calls every Wednesday evening on WhatsApp.',
      audioNote: 'Maa, Vikram here. Hope you are doing your morning arm stretches and drinking enough water. Sending you so much love!',
      cues: [
        'Video calls every Wednesday at 7 PM',
        'Sends your favorite Lucknow sweets',
      ],
    },
  ]);

  const filteredMembers = familyMembers.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.relationship.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlayVoiceNote = (member: FamilyMember) => {
    if (!member.audioNote) return;

    if (activeAudioId === member.id) {
      SpeechService.cancelSpeech();
      setActiveAudioId(null);
      return;
    }

    setActiveAudioId(member.id);
    SpeechService.speak(
      member.audioNote,
      () => {},
      () => setActiveAudioId(null)
    );
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/patient')}
            className="p-2 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-saksham-darkText">Loved Ones</h1>
            <p className="text-xs text-gray-500 font-medium">Verified family memories and loving cues</p>
          </div>
        </div>

        <button
          onClick={() => alert('Caregiver permission: Adding new family members is managed by your verified caregiver or patient settings.')}
          className="p-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white transition shadow-sm"
          title="Add family member"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Verified Data Banner (Privacy & Safety Note) */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-start space-x-2.5">
        <ShieldCheck className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Verified Family Vault:</span> All photographs and relationship details are verified by you and your family. AI never guesses or invents family identities.
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or relationship (e.g., Daughter, Aarav)..."
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-inner"
        />
      </div>

      {/* Family Profiles Gallery */}
      <div className="space-y-4">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple hover:shadow-elevated transition-all"
          >
            <div className="flex items-start space-x-4">
              {/* Photo */}
              <div className="relative flex-shrink-0">
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-2 border-purple-200 shadow-sm"
                />
                <span className="absolute -bottom-2 -right-1 bg-rose-500 text-white p-1 rounded-full shadow-xs">
                  <Heart className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-bold text-saksham-darkText">
                    {member.name}
                  </h2>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    {member.relationship}
                  </span>
                </div>

                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {member.description}
                </p>

                {/* Voice Note Button */}
                {member.audioNote && (
                  <button
                    onClick={() => handlePlayVoiceNote(member)}
                    className={`mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                      activeAudioId === member.id
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-lavender-100 text-purple-800 hover:bg-lavender-200'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>
                      {activeAudioId === member.id ? 'Playing Voice Note...' : 'Listen to Voice Message'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Memory Cues List */}
            <div className="mt-4 pt-3 border-t border-purple-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center space-x-1 mb-2">
                <Sparkles className="w-3 h-3 text-purple-500" />
                <span>Memory Cues</span>
              </span>
              <ul className="space-y-1.5 text-xs text-gray-700">
                {member.cues.map((cue, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                    <span>{cue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-purple-200">
            <Info className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-600">No loved ones found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};
