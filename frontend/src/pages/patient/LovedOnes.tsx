import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { LovedOne } from '../../types/index.js';
import { LovedOnesService } from '../../features/lovedOnes/services/lovedOnesService.js';
import { SpeechService } from '../../services/speechService.js';
import { FamilyMemberCard } from '../../features/lovedOnes/components/FamilyMemberCard.js';
import { LovedOneProfileModal } from '../../features/lovedOnes/components/LovedOneProfileModal.js';
import { AssistedMemoryCueModal } from '../../features/lovedOnes/components/AssistedMemoryCueModal.js';
import { AddEditLovedOneModal } from '../../features/lovedOnes/components/AddEditLovedOneModal.js';
import {
  Search,
  Plus,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Info,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';

export const LovedOnes: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const patientUid = currentUser?.uid || 'default_patient';

  const [searchQuery, setSearchQuery] = useState('');
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isAshaSpeaking, setIsAshaSpeaking] = useState(false);

  // Modals state
  const [selectedLovedOne, setSelectedLovedOne] = useState<LovedOne | null>(null);
  const [cuesLovedOne, setCuesLovedOne] = useState<LovedOne | null>(null);
  const [editingLovedOne, setEditingLovedOne] = useState<LovedOne | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load loved ones on mount or patient UID change
  useEffect(() => {
    const list = LovedOnesService.getLovedOnes(patientUid);
    setLovedOnes(list);
  }, [patientUid]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      SpeechService.cancelSpeech();
    };
  }, []);

  const filteredMembers = lovedOnes.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      m.name.toLowerCase().includes(q) ||
      m.relationship.toLowerCase().includes(q) ||
      (m.nickname && m.nickname.toLowerCase().includes(q)) ||
      m.description.toLowerCase().includes(q) ||
      m.cues.some((c) => c.toLowerCase().includes(q))
    );
  });

  const handlePlayVoiceNote = (member: LovedOne, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const noteToSpeak =
      member.voiceRecording?.transcript || member.audioNote || `Voice note from ${member.name}`;

    if (activeAudioId === member.id) {
      SpeechService.cancelSpeech();
      setActiveAudioId(null);
      return;
    }

    setActiveAudioId(member.id);
    SpeechService.speak(
      noteToSpeak,
      () => {},
      () => setActiveAudioId(null)
    );
  };

  const handleAshaGreeting = () => {
    if (isAshaSpeaking) {
      SpeechService.cancelSpeech();
      setIsAshaSpeaking(false);
      return;
    }

    const welcomeText =
      "Welcome to your Loved Ones memory album! Here are the smiling faces and warm voices of people who cherish you. Take your time browsing and exploring.";

    SpeechService.speak(
      welcomeText,
      () => setIsAshaSpeaking(true),
      () => setIsAshaSpeaking(false)
    );
  };

  const handleOpenCues = (member: LovedOne, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCuesLovedOne(member);
  };

  const handleSaveLovedOne = (data: Omit<LovedOne, 'id'>) => {
    if (editingLovedOne) {
      // Update existing
      const updated = LovedOnesService.updateLovedOne(patientUid, editingLovedOne.id, data);
      if (updated) {
        setLovedOnes(LovedOnesService.getLovedOnes(patientUid));
        if (selectedLovedOne?.id === updated.id) {
          setSelectedLovedOne(updated);
        }
      }
      setEditingLovedOne(null);
    } else {
      // Add new
      const created = LovedOnesService.addLovedOne(patientUid, data);
      setLovedOnes(LovedOnesService.getLovedOnes(patientUid));
      setIsAddModalOpen(false);
      // Auto open profile of newly created loved one
      setSelectedLovedOne(created);
    }
  };

  const handleDeleteLovedOne = (id: string) => {
    LovedOnesService.deleteLovedOne(patientUid, id);
    setLovedOnes(LovedOnesService.getLovedOnes(patientUid));
    setSelectedLovedOne(null);
  };

  const handleSaveNotes = (id: string, newNotes: string) => {
    const updated = LovedOnesService.updatePatientNotes(patientUid, id, newNotes);
    if (updated) {
      setLovedOnes(LovedOnesService.getLovedOnes(patientUid));
      if (selectedLovedOne?.id === id) {
        setSelectedLovedOne(updated);
      }
    }
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-2xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/patient')}
            className="p-2.5 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs"
            aria-label="Back to Patient Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-saksham-darkText">
              Loved Ones
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Family & Identity Anchor • Verified loving memories
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingLovedOne(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-sm"
          title="Add family member"
          aria-label="Add family member"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Loved One</span>
        </button>
      </div>

      {/* Asha Companion Warm Banner */}
      <div className="bg-gradient-to-r from-lavender-100 via-purple-50 to-pink-50 p-4 rounded-3xl border border-purple-200 shadow-soft-purple flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-2xl shadow-xs flex-shrink-0">
            🌸
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-purple-950">Asha AI Companion</span>
              <span className="text-[10px] font-bold text-purple-700 bg-white/80 px-2 py-0.5 rounded-full border border-purple-200">
                Memory Guide
              </span>
            </div>
            <p className="text-xs text-purple-900 mt-0.5 leading-relaxed">
              "Here are the smiling faces and warm voices of people who cherish you. Take your time browsing."
            </p>
          </div>
        </div>

        <button
          onClick={handleAshaGreeting}
          className={`p-2.5 rounded-2xl transition ml-2 flex-shrink-0 ${
            isAshaSpeaking
              ? 'bg-purple-600 text-white animate-pulse'
              : 'bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 shadow-2xs'
          }`}
          title="Listen to Asha"
          aria-label={isAshaSpeaking ? 'Stop Asha voice' : 'Listen to Asha welcome'}
        >
          {isAshaSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Verified Data Banner (Privacy & Safety Note) */}
      <div className="bg-white p-3.5 rounded-2xl border border-purple-100 text-xs text-purple-900 flex items-start space-x-2.5 shadow-2xs">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed text-[11px] text-gray-700">
          <span className="font-bold text-purple-900">Verified Family Memory Vault:</span> All photographs, names, and voice recordings are explicitly entered and verified by you and your family. AI companion never guesses identities, invents memories, or uses facial recognition.
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, relationship, or nickname (e.g., Daughter, Aarav, Anu)..."
          className="w-full pl-10 pr-10 py-3 bg-white rounded-2xl border border-purple-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-inner"
          aria-label="Search loved ones by name or relationship"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Family Profiles Gallery */}
      <div className="space-y-4">
        {filteredMembers.map((member) => (
          <FamilyMemberCard
            key={member.id}
            member={member}
            isPlayingVoice={activeAudioId === member.id}
            onSelect={() => setSelectedLovedOne(member)}
            onPlayVoice={(e) => handlePlayVoiceNote(member, e)}
            onOpenCues={(e) => handleOpenCues(member, e)}
          />
        ))}

        {filteredMembers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-purple-200 p-6 space-y-3">
            <Info className="w-10 h-10 text-purple-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-700">No loved ones found matching "{searchQuery}"</p>
              <p className="text-xs text-gray-500">
                Try searching by a different name, relationship (like "Daughter" or "Son"), or clear the search.
              </p>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition"
            >
              Clear Search Query
            </button>
          </div>
        )}
      </div>

      {/* Memory Album Stats & Encouragement */}
      {lovedOnes.length > 0 && (
        <div className="bg-lavender-50/70 p-4 rounded-2xl border border-purple-100 flex items-center justify-between text-xs text-purple-900">
          <span className="flex items-center space-x-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>{lovedOnes.length} family memory {lovedOnes.length === 1 ? 'profile' : 'profiles'} safely stored</span>
          </span>
          <span className="font-bold text-purple-700">Always with you ❤️</span>
        </div>
      )}

      {/* Modals */}
      {selectedLovedOne && (
        <LovedOneProfileModal
          lovedOne={selectedLovedOne}
          onClose={() => setSelectedLovedOne(null)}
          onEdit={() => {
            setEditingLovedOne(selectedLovedOne);
            setIsAddModalOpen(true);
          }}
          onDelete={() => handleDeleteLovedOne(selectedLovedOne.id)}
          onOpenCues={() => {
            setCuesLovedOne(selectedLovedOne);
          }}
          onSaveNotes={(notes) => handleSaveNotes(selectedLovedOne.id, notes)}
        />
      )}

      {cuesLovedOne && (
        <AssistedMemoryCueModal
          lovedOne={cuesLovedOne}
          onClose={() => setCuesLovedOne(null)}
          onPlayVoiceNote={() => handlePlayVoiceNote(cuesLovedOne)}
        />
      )}

      {isAddModalOpen && (
        <AddEditLovedOneModal
          lovedOneToEdit={editingLovedOne}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingLovedOne(null);
          }}
          onSave={handleSaveLovedOne}
        />
      )}
    </div>
  );
};
