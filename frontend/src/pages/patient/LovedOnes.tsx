import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
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
import { getLocalizedLovedOneFields } from '../../features/lovedOnes/utils/lovedOneTranslation.js';
import { getLovedOneModalUi } from '../../features/lovedOnes/utils/lovedOneFormTranslation.js';
import { PersonalMemoryGraphEditor } from '../../features/memory/components/PersonalMemoryGraphEditor.js';
import { LivingMemoryTimeline } from '../../features/memory/components/LivingMemoryTimeline.js';
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
  const { language, t } = useLanguage();
  const patientUid = getEffectivePatientId(currentUser);
  const isDoctor = role === 'doctor';

  const [searchQuery, setSearchQuery] = useState('');
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isAshaSpeaking, setIsAshaSpeaking] = useState(false);
  const [isRecallMinimized, setIsRecallMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'album' | 'graph' | 'timeline'>('album');

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

  const speakWithLanguage = (text: string, onStart?: () => void, onEnd?: () => void) => {
    SpeechService.speak(text, onStart, onEnd, SpeechService.getBCP47(language));
  };

  const handlePlayVoiceNote = (member: LovedOne, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const localized = getLocalizedLovedOneFields(member, t);
    const noteToSpeak =
      localized.voiceTranscript || localized.audioNote || `Voice note from ${member.name}`;

    if (activeAudioId === member.id) {
      SpeechService.cancelSpeech();
      setActiveAudioId(null);
      return;
    }

    setActiveAudioId(member.id);
    speakWithLanguage(
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

    const welcomeText = t('loved_ones.asha_banner_welcome');

    speakWithLanguage(
      welcomeText,
      () => setIsAshaSpeaking(true),
      () => setIsAshaSpeaking(false)
    );
  };

  const handleAshaExplorePhotos = () => {
    const el = document.getElementById('family-photo-gallery');
    el?.scrollIntoView?.({ behavior: 'smooth' });
    speakWithLanguage(
      t('loved_ones.asha_explore_speech'),
      () => setIsAshaSpeaking(true),
      () => setIsAshaSpeaking(false)
    );
  };

  const handleAshaGentleClue = () => {
    const el = document.getElementById('family-recall-section');
    el?.scrollIntoView?.({ behavior: 'smooth' });
    speakWithLanguage(
      t('loved_ones.asha_clue_speech'),
      () => setIsAshaSpeaking(true),
      () => setIsAshaSpeaking(false)
    );
  };

  const handleAshaHearVoices = () => {
    const memberWithVoice = lovedOnes.find((m) => !!m.voiceRecording || !!m.audioNote);
    if (memberWithVoice) {
      const note =
        memberWithVoice.voiceRecording?.transcript ||
        memberWithVoice.audioNote ||
        '';
      speakWithLanguage(
        t('loved_ones.asha_voices_intro', { name: memberWithVoice.name, note }),
        () => setIsAshaSpeaking(true),
        () => {
          setIsAshaSpeaking(false);
          handlePlayVoiceNote(memberWithVoice);
        }
      );
    } else {
      speakWithLanguage(
        t('loved_ones.asha_voices_empty'),
        () => setIsAshaSpeaking(true),
        () => setIsAshaSpeaking(false)
      );
    }
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
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1
              className="text-xl md:text-2xl font-extrabold text-saksham-darkText"
              aria-label={t('loved_ones.header_title')}
            >
              {t('loved_ones.header_title')}
            </h1>
            <p className="text-xs text-rose-800 font-bold">
              {t('loved_ones.header_subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Add Loved One Action (restricted for doctor role) */}
          {!isDoctor && (
            <button
              onClick={() => {
                setEditingLovedOne(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-sm min-h-[44px] cursor-pointer"
              title={t('loved_ones.add_member_aria')}
              aria-label={t('loved_ones.add_member_aria')}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('loved_ones.add_member')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Doctor Permission Guard Banner */}
      {isDoctor && (
        <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2.5 shadow-2xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            {t('loved_ones.clinical_mode_notice')}
          </div>
        </div>
      )}

      {/* View Mode Toggle: Family Album vs Relational Memory Graph */}
      <div className="flex bg-purple-50/80 p-1 rounded-2xl border border-purple-200" role="tablist" aria-label={t('loved_ones.tab_album')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'album'}
          onClick={() => setActiveTab('album')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 ${
            activeTab === 'album'
              ? 'bg-white text-purple-900 shadow-sm border border-purple-200'
              : 'text-purple-700 hover:text-purple-900'
          }`}
        >
          <span>👨‍👩‍👧 {t('loved_ones.tab_album')}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'graph'}
          onClick={() => setActiveTab('graph')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 ${
            activeTab === 'graph'
              ? 'bg-white text-purple-900 shadow-sm border border-purple-200'
              : 'text-purple-700 hover:text-purple-900'
          }`}
        >
          <span>🕸️ {t('loved_ones.tab_graph')}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'timeline'}
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 ${
            activeTab === 'timeline'
              ? 'bg-white text-purple-900 shadow-sm border border-purple-200'
              : 'text-purple-700 hover:text-purple-900'
          }`}
        >
          <span>📜 {t('loved_ones.tab_timeline')}</span>
        </button>
      </div>

      {activeTab === 'graph' ? (
        <PersonalMemoryGraphEditor patientId={patientUid} isCaregiver={!isDoctor} />
      ) : activeTab === 'timeline' ? (
        <LivingMemoryTimeline patientId={patientUid} isCaregiver={!isDoctor} />
      ) : (
        <>
          {/* Asha Companion Warm Banner with Interactive Memory Prompts */}
      <div className="bg-gradient-to-r from-rose-50 via-lavender-50 to-pink-50 p-4 rounded-3xl border border-purple-200 shadow-soft-purple space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-2xl shadow-xs flex-shrink-0">
              🌸
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-purple-950">{t('loved_ones.asha_banner_title')}</span>
                <span className="text-[10px] font-bold text-rose-700 bg-white/80 px-2 py-0.5 rounded-full border border-rose-200">
                  {t('loved_ones.asha_banner_badge')}
                </span>
              </div>
              <p className="text-xs text-purple-900 mt-0.5 leading-relaxed">
                "{t('loved_ones.asha_banner_welcome')}"
              </p>
            </div>
          </div>

          <button
            onClick={handleAshaGreeting}
            className={`p-2.5 rounded-2xl transition ml-2 flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer ${
              isAshaSpeaking
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 shadow-2xs'
            }`}
            title={t('loved_ones.listen_welcome_aria')}
            aria-label={isAshaSpeaking ? t('loved_ones.stop_voice_aria') : t('loved_ones.listen_welcome_aria')}
          >
            {isAshaSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Asha Companion Memory Prompts & Interactive Suggestions */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-purple-100/80">
          <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>{t('loved_ones.asha_banner_badge')}:</span>
          </span>
          <button
            type="button"
            onClick={handleAshaExplorePhotos}
            className="px-2.5 py-1 rounded-xl bg-white/90 hover:bg-white text-purple-900 border border-purple-200 text-xs font-semibold transition shadow-2xs flex items-center gap-1 cursor-pointer"
            aria-label={t('loved_ones.explore_photos')}
          >
            <span>📸 {t('loved_ones.explore_photos')}</span>
          </button>
          <button
            type="button"
            onClick={handleAshaGentleClue}
            className="px-2.5 py-1 rounded-xl bg-white/90 hover:bg-white text-purple-900 border border-purple-200 text-xs font-semibold transition shadow-2xs flex items-center gap-1 cursor-pointer"
            aria-label={t('loved_ones.gentle_memory_clue')}
          >
            <span>💡 {t('loved_ones.gentle_memory_clue')}</span>
          </button>
          <button
            type="button"
            onClick={handleAshaHearVoices}
            className="px-2.5 py-1 rounded-xl bg-white/90 hover:bg-white text-purple-900 border border-purple-200 text-xs font-semibold transition shadow-2xs flex items-center gap-1 cursor-pointer"
            aria-label={t('loved_ones.hear_voice_memories')}
          >
            <span>🎙️ {t('loved_ones.hear_voice_memories')}</span>
          </button>
        </div>
      </div>

      {/* Naturally Integrated Family Memory Recall Section */}
      {lovedOnes.length > 0 && !searchQuery && (
        <>
          {isRecallMinimized ? (
            <div className="bg-gradient-to-r from-rose-50 via-purple-50 to-pink-50 p-4 rounded-3xl border border-rose-200 shadow-soft-purple flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-lg shadow-xs flex-shrink-0">
                  🧠
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-rose-950">
                    {t('loved_ones.quiz_header_title')}
                  </h3>
                  <p className="text-[11px] text-gray-600">
                    {t('loved_ones.quiz_desc')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecallMinimized(false)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition inline-flex items-center space-x-1.5 flex-shrink-0 cursor-pointer"
                aria-label={t('loved_ones.quiz_start')}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>{t('loved_ones.quiz_start')}</span>
              </button>
            </div>
          ) : (
            <div id="family-recall-section" className="space-y-2">
              {/* Section Heading & Focus Action */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs sm:text-sm font-bold text-purple-950 flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span>{t('loved_ones.quiz_header_title')}</span>
                  </h3>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-full border border-rose-200">
                    {t('loved_ones.quiz_badge')}
                  </span>
                </div>
                {/* Backward-compatible and accessible action */}
                <button
                  onClick={() => {
                    const el = document.getElementById('family-recall-card');
                    el?.scrollIntoView?.({ behavior: 'smooth' });
                  }}
                  className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                  aria-label={t('loved_ones.quiz_start')}
                  title={getLovedOneModalUi(language).focusRecallTitle}
                >
                  <span>{t('loved_ones.quiz_focus')}</span>
                </button>
              </div>

              <div id="family-recall-card">
                <AssistedFamilyRecallQuiz
                  lovedOnes={lovedOnes}
                  onClose={() => setIsRecallMinimized(true)}
                  onOpenProfile={(member) => setSelectedLovedOne(member)}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Verified Data Banner (Privacy & Safety Note) */}
      <div className="bg-white p-3.5 rounded-2xl border border-rose-100 text-xs text-purple-900 flex items-start space-x-2.5 shadow-2xs">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed text-[11px] text-gray-700">
          <span className="font-bold text-purple-900">{t('loved_ones.vault_title')}</span> {t('loved_ones.vault_desc')}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('loved_ones.search_placeholder')}
          className="w-full pl-10 pr-10 py-3 bg-white rounded-2xl border border-purple-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-inner"
          aria-label={t('loved_ones.search_placeholder')}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            aria-label={t('loved_ones.clear_search')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Family Profiles Gallery */}
      <div id="family-photo-gallery" className="space-y-4">
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
              <p className="text-base font-bold text-gray-800">{t('loved_ones.empty_album_title')}</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                {t('loved_ones.empty_album_desc')}
              </p>
            </div>
            {!isDoctor && (
              <button
                onClick={() => {
                  setEditingLovedOne(null);
                  setIsAddModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm inline-flex items-center space-x-1.5"
                title={t('loved_ones.add_first_loved_one')}
                aria-label={t('loved_ones.add_first_loved_one')}
              >
                <Plus className="w-4 h-4" />
                <span>{t('loved_ones.add_first_loved_one')}</span>
              </button>
            )}
          </div>
        )}

        {/* Filtered Empty State */}
        {lovedOnes.length > 0 && filteredMembers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-purple-200 p-6 space-y-3">
            <Info className="w-10 h-10 text-purple-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-700">{t('loved_ones.no_results_title', { query: searchQuery })}</p>
              <p className="text-xs text-gray-500">
                {t('loved_ones.no_results_desc')}
              </p>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition"
            >
              {t('loved_ones.clear_search')}
            </button>
          </div>
        )}
      </div>

      {/* Memory Album Stats & Encouragement */}
      {lovedOnes.length > 0 && (
        <div className="bg-lavender-50/70 p-4 rounded-2xl border border-purple-100 flex items-center justify-between text-xs text-purple-900">
          <span className="flex items-center space-x-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>{t('loved_ones.stats_stored', { count: lovedOnes.length, profiles: lovedOnes.length === 1 ? t('loved_ones.stats_profile') : t('loved_ones.stats_profiles') })}</span>
          </span>
          <span className="font-bold text-rose-600 flex items-center space-x-1">
            <Heart className="w-3 h-3 fill-rose-600" />
            <span>{t('loved_ones.always_with_you')}</span>
          </span>
        </div>
      )}
        </>
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
