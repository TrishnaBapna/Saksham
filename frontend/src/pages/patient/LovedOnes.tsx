import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { LovedOne } from '../../types/index.js';
import { LovedOnesService } from '../../features/lovedOnes/services/lovedOnesService.js';
import {
  getEffectivePatientId,
  subscribeToDataChanges,
} from '../../features/auth/services/identityService.js';
import { SpeechService } from '../../services/speechService.js';
import { FamilyMemberCard } from '../../features/lovedOnes/components/FamilyMemberCard.js';
import { LovedOneProfileModal } from '../../features/lovedOnes/components/LovedOneProfileModal.js';
import { AssistedMemoryCueModal } from '../../features/lovedOnes/components/AssistedMemoryCueModal.js';
import { AddEditLovedOneModal } from '../../features/lovedOnes/components/AddEditLovedOneModal.js';
import { AssistedFamilyRecallQuiz } from '../../features/lovedOnes/components/AssistedFamilyRecallQuiz.js';
import {
  Search,
  Plus,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Info,
  Volume2,
  VolumeX,
  X,
  Heart,
  Brain,
  ShieldAlert
} from 'lucide-react';

export const LovedOnes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, role } = useAuth();
  const patientUid = getEffectivePatientId(currentUser);
  const isDoctor = role === 'doctor';

  const [searchQuery, setSearchQuery] = useState('');
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isAshaSpeaking, setIsAshaSpeaking] = useState(false);
  const [showRecallQuiz, setShowRecallQuiz] = useState(false);

  // Modals state
  const [selectedLovedOne, setSelectedLovedOne] = useState<LovedOne | null>(null);
  const [cuesLovedOne, setCuesLovedOne] = useState<LovedOne | null>(null);
  const [editingLovedOne, setEditingLovedOne] = useState<LovedOne | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load loved ones on mount or patient UID change, and sync from Firestore
  useEffect(() => {
    const list = LovedOnesService.getLovedOnes(patientUid);
    setLovedOnes(list);

    LovedOnesService.syncLovedOnesFromFirestore(patientUid).then((cloudList) => {
      if (cloudList && cloudList.length > 0) {
        setLovedOnes(cloudList);
      }
    });

    const unsubscribe = subscribeToDataChanges(({ module, patientId: changedId }) => {
      if (changedId === patientUid && (module === 'lovedOnes' || module === 'all')) {
        setLovedOnes(LovedOnesService.getLovedOnes(patientUid));
      }
    });

    return () => unsubscribe();
  }, [patientUid]);

  // Check URL or location state for auto-selected member
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const targetId = queryParams.get('memberId') || (location.state as { selectedMemberId?: string })?.selectedMemberId;
    if (targetId && lovedOnes.length > 0) {
      const match = lovedOnes.find((m) => m.id === targetId || m.id.endsWith(targetId));
      if (match) {
        setSelectedLovedOne(match);
      }
    }
  }, [location, lovedOnes]);

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
            className="p-2.5 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs min-h-[44px]"
            aria-label="Back to Patient Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1
              className="text-xl md:text-2xl font-extrabold text-saksham-darkText"
              aria-label="Loved Ones"
            >
              Loved Ones
            </h1>
            <p className="text-xs text-rose-800 font-bold">
              Familiar Faces & Family Memory Anchor
            </p>
            <p className="text-[11px] text-gray-500 font-medium">
              Familiar faces, personal memories and gentle recall activities to support everyday connection.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Toggle Quiz Button */}
          {lovedOnes.length > 0 && (
            <button
              onClick={() => setShowRecallQuiz((prev) => !prev)}
              className={`inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition shadow-xs min-h-[44px] ${
                showRecallQuiz
                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
              title="Toggle Face Recall Quiz"
              aria-label={showRecallQuiz ? 'Hide Recall Quiz' : 'Open Face Recall Quiz'}
            >
              <Brain className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">{showRecallQuiz ? 'Hide Quiz' : 'Recall Quiz'}</span>
            </button>
          )}

          {/* Add Loved One Action (restricted for doctor role) */}
          {!isDoctor && (
            <button
              onClick={() => {
                setEditingLovedOne(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-sm min-h-[44px]"
              title="Add family member"
              aria-label="Add family member"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Loved One</span>
            </button>
          )}
        </div>
      </div>

      {/* Doctor Permission Guard Banner */}
      {isDoctor && (
        <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2.5 shadow-2xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Clinical Review Mode:</span> Direct phone calls, WhatsApp messages, and album editing are strictly reserved for the patient and authorized caregivers.
          </div>
        </div>
      )}

      {/* Asha Companion Warm Banner */}
      <div className="bg-gradient-to-r from-rose-50 via-lavender-50 to-pink-50 p-4 rounded-3xl border border-purple-200 shadow-soft-purple flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-2xl shadow-xs flex-shrink-0">
            🌸
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-purple-950">Asha AI Companion</span>
              <span className="text-[10px] font-bold text-rose-700 bg-white/80 px-2 py-0.5 rounded-full border border-rose-200">
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
          className={`p-2.5 rounded-2xl transition ml-2 flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center ${
            isAshaSpeaking
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 shadow-2xs'
          }`}
          title="Listen to Asha"
          aria-label={isAshaSpeaking ? 'Stop Asha voice' : 'Listen to Asha welcome'}
        >
          {isAshaSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Family Memory Recall Section */}
      {lovedOnes.length > 0 && !showRecallQuiz && (
        <div className="bg-gradient-to-r from-rose-50 via-purple-50 to-pink-50 p-4 rounded-3xl border border-rose-200 shadow-soft-purple flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-lg shadow-xs flex-shrink-0">
              🧠
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-rose-950">
                Family Memory Recall Quiz
              </h3>
              <p className="text-[11px] text-gray-600">
                A gentle, relaxed game to connect with familiar smiling faces and memories
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRecallQuiz(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition inline-flex items-center space-x-1.5 flex-shrink-0"
            aria-label="Start Face Recall Quiz"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Start Recall Quiz</span>
          </button>
        </div>
      )}

      {/* Assisted Family Recall Quiz Section */}
      {showRecallQuiz && lovedOnes.length > 0 && !searchQuery && (
        <AssistedFamilyRecallQuiz
          lovedOnes={lovedOnes}
          onClose={() => setShowRecallQuiz(false)}
          onOpenProfile={(member) => setSelectedLovedOne(member)}
        />
      )}

      {/* Verified Data Banner (Privacy & Safety Note) */}
      <div className="bg-white p-3.5 rounded-2xl border border-rose-100 text-xs text-purple-900 flex items-start space-x-2.5 shadow-2xs">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed text-[11px] text-gray-700">
          <span className="font-bold text-purple-900">Verified Family Memory Vault:</span> All photographs, names, phone contacts, and voice recordings are explicitly entered and verified by you and your family. AI companion never guesses identities, invents memories, or uses facial recognition.
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
            userRole={role}
          />
        ))}

        {/* Empty Album State */}
        {lovedOnes.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-rose-200 p-6 space-y-3">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto text-3xl">
              ❤️
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-gray-800">Your Family Memory Album is Empty</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Add your cherished family members, smiling photos, and loving voice notes to create a comforting memory anchor.
              </p>
            </div>
            {!isDoctor && (
              <button
                onClick={() => {
                  setEditingLovedOne(null);
                  setIsAddModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm inline-flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Loved One</span>
              </button>
            )}
          </div>
        )}

        {/* Filtered Empty State */}
        {lovedOnes.length > 0 && filteredMembers.length === 0 && (
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
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>{lovedOnes.length} family memory {lovedOnes.length === 1 ? 'profile' : 'profiles'} safely stored</span>
          </span>
          <span className="font-bold text-rose-600 flex items-center space-x-1">
            <Heart className="w-3 h-3 fill-rose-600" />
            <span>Always with you</span>
          </span>
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
          userRole={role}
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
