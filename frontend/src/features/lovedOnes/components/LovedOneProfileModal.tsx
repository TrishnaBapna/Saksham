import React, { useState } from 'react';
import { LovedOne } from '../../../types/index.js';
import { VoiceMemoryPlayer } from './VoiceMemoryPlayer.js';
import { SpeechService } from '../../../services/speechService.js';
import {
  X,
  Heart,
  Volume2,
  Sparkles,
  Calendar,
  Edit3,
  Trash2,
  Save,
  CheckCircle2,
  HelpCircle,
  VolumeX,
  Phone,
  MessageCircle,
  Eye,
  EyeOff,
  User,
  ShieldAlert
} from 'lucide-react';

interface LovedOneProfileModalProps {
  lovedOne: LovedOne;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenCues: () => void;
  onSaveNotes: (newNotes: string) => void;
  userRole?: string;
}

export const LovedOneProfileModal: React.FC<LovedOneProfileModalProps> = ({
  lovedOne,
  onClose,
  onEdit,
  onDelete,
  onOpenCues,
  onSaveNotes,
  userRole = 'patient'
}) => {
  const [notes, setNotes] = useState(lovedOne.patientNotes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesSavedAlert, setNotesSavedAlert] = useState(false);
  const [isSpeakingOverview, setIsSpeakingOverview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRelationshipHint, setShowRelationshipHint] = useState(false);

  const canModifyAndContact = userRole !== 'doctor';
  const effectivePhone = lovedOne.phoneNumber || lovedOne.phone;
  const effectiveWhatsApp = lovedOne.whatsappNumber || effectivePhone;

  const handleSaveNotes = () => {
    onSaveNotes(notes);
    setIsEditingNotes(false);
    setNotesSavedAlert(true);
    setTimeout(() => setNotesSavedAlert(false), 2500);
  };

  const handleReadProfileAloud = () => {
    if (isSpeakingOverview) {
      SpeechService.cancelSpeech();
      setIsSpeakingOverview(false);
      return;
    }

    const narrative = `${lovedOne.name}, your ${lovedOne.relationship}. ${lovedOne.description}. ${
      lovedOne.cues && lovedOne.cues.length > 0 ? `Key memory: ${lovedOne.cues[0]}` : ''
    }`;

    SpeechService.speak(
      narrative,
      () => setIsSpeakingOverview(true),
      () => setIsSpeakingOverview(false)
    );
  };

  const handleToggleRelationshipHint = () => {
    const nextState = !showRelationshipHint;
    setShowRelationshipHint(nextState);
    if (nextState) {
      SpeechService.speak(
        `${lovedOne.name} is your ${lovedOne.relationship}. ${lovedOne.description}`
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`${lovedOne.name} Memory Profile`}
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-purple-200 overflow-hidden">
        {/* Top Action Bar */}
        <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-pink-700 text-white p-4 md:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-rose-300 fill-rose-300" />
            <h2 className="text-base md:text-lg font-bold">Personal Memory Profile</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleReadProfileAloud}
              className={`p-2 rounded-xl transition ${
                isSpeakingOverview ? 'bg-white text-purple-900 animate-pulse' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Read profile aloud"
              aria-label={isSpeakingOverview ? 'Stop speaking' : 'Read profile aloud'}
            >
              {isSpeakingOverview ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {canModifyAndContact && (
              <>
                <button
                  onClick={onEdit}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                  title="Edit details"
                  aria-label="Edit memory profile"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white transition"
                  title="Remove profile"
                  aria-label="Remove loved one"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition ml-2"
              aria-label="Close profile modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Doctor Restricted Notice */}
          {!canModifyAndContact && (
            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Clinical Review Mode:</strong> Direct family contact dials and editing permissions are restricted to the patient and authorized caregivers.
              </span>
            </div>
          )}

          {/* Hero Identity Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 bg-lavender-50/60 p-4 sm:p-5 rounded-3xl border border-purple-100">
            <div className="relative flex-shrink-0">
              {lovedOne.photoUrl ? (
                <img
                  src={lovedOne.photoUrl}
                  alt={lovedOne.name}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-white shadow-elevated"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      lovedOne.name
                    )}&background=8b5cf6&color=ffffff&size=300`;
                  }}
                />
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-purple-100 text-purple-600 flex items-center justify-center border-4 border-white shadow-elevated">
                  <User className="w-14 h-14" />
                </div>
              )}
              <span className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-2 rounded-full shadow-md">
                <Heart className="w-4 h-4 fill-white" />
              </span>
            </div>

            <div className="text-center sm:text-left flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-extrabold text-saksham-darkText">
                  {lovedOne.name}
                </h1>
                {lovedOne.nickname && (
                  <span className="text-xs font-bold text-purple-700 bg-white px-2.5 py-0.5 rounded-full border border-purple-200">
                    "{lovedOne.nickname}"
                  </span>
                )}
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200">
                {lovedOne.relationship}
              </div>

              <p className="text-xs md:text-sm text-gray-700 leading-relaxed pt-1">
                {lovedOne.description}
              </p>

              {lovedOne.familiarPhrase && (
                <div className="text-xs italic text-purple-800 bg-white/90 p-2.5 rounded-2xl border border-purple-100">
                  💬 <span className="font-semibold">Familiar greeting:</span> "{lovedOne.familiarPhrase}"
                </div>
              )}

              {/* Direct Family Contact Buttons */}
              {canModifyAndContact && (effectivePhone || effectiveWhatsApp) && (
                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {effectivePhone && (
                    <a
                      href={`tel:${effectivePhone.replace(/[^0-9+]/g, '')}`}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-50 border border-teal-300 text-teal-800 font-bold text-xs hover:bg-teal-100 transition shadow-xs min-h-[40px]"
                      aria-label={`Call ${lovedOne.name}`}
                    >
                      <Phone className="w-4 h-4 text-teal-600" />
                      <span>Call {effectivePhone}</span>
                    </a>
                  )}
                  {effectiveWhatsApp && (
                    <a
                      href={`https://wa.me/${effectiveWhatsApp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition shadow-xs min-h-[40px]"
                      aria-label={`WhatsApp ${lovedOne.name}`}
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp Message</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Relationship Hint & Reassurance Section */}
          <div className="bg-gradient-to-r from-rose-50/70 via-purple-50/70 to-pink-50/70 rounded-2xl p-4 border border-rose-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                  Relationship Hint & Connection
                </h4>
              </div>

              <button
                type="button"
                onClick={handleToggleRelationshipHint}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-800 hover:bg-rose-50 transition shadow-2xs"
                aria-label={showRelationshipHint ? 'Hide Relationship' : 'Reveal Relationship'}
              >
                {showRelationshipHint ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showRelationshipHint ? 'Hide Relation' : 'Reveal Relation'}</span>
              </button>
            </div>

            {showRelationshipHint ? (
              <div className="p-3 bg-white/90 rounded-xl border border-rose-200 text-xs text-rose-950 leading-relaxed space-y-1 animate-fadeIn">
                <p>
                  <strong>{lovedOne.name}</strong> is your{' '}
                  <strong className="text-purple-900">{lovedOne.relationship}</strong>.
                </p>
                <p className="text-gray-700 italic">
                  "{lovedOne.description}"
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-gray-500 italic">
                Tap 'Reveal Relation' anytime for a gentle reminder of how you two are connected. No pressure or testing.
              </p>
            )}
          </div>

          {/* Quick Memory Prompts Trigger */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5 text-yellow-200" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-purple-950">Assisted Memory Cues</h4>
                <p className="text-[11px] text-gray-600">Gentle questions to explore who this is and cherished memories</p>
              </div>
            </div>

            <button
              onClick={onOpenCues}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs min-h-[40px]"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Explore Cues</span>
            </button>
          </div>

          {/* Voice Memories Section */}
          {(lovedOne.voiceRecording || lovedOne.audioNote) && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 mb-2 flex items-center space-x-1.5">
                <Volume2 className="w-4 h-4 text-purple-600" />
                <span>Voice Message Memory</span>
              </h3>
              <VoiceMemoryPlayer
                voiceRecording={
                  lovedOne.voiceRecording || {
                    id: `rec_${lovedOne.id}`,
                    title: `Voice message from ${lovedOne.name}`,
                    speakerName: lovedOne.name,
                    durationSeconds: 15,
                    transcript: lovedOne.audioNote || ''
                  }
                }
              />
            </div>
          )}

          {/* Important Memories & Shared Activities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Important Life & Family Memories */}
            {lovedOne.importantMemories && lovedOne.importantMemories.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-2xs space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center space-x-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span>Important Family Memories</span>
                </h4>
                <ul className="space-y-2 text-xs text-gray-700">
                  {lovedOne.importantMemories.map((mem, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                      <span className="leading-relaxed">{mem}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Favorite Activities */}
            <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-2xs space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span>Favorite Shared Activities</span>
              </h4>
              <ul className="space-y-2 text-xs text-gray-700">
                {(lovedOne.favouriteActivities || [
                  'Enjoying peaceful afternoon chai together',
                  'Sharing memories and stories from past years'
                ]).map((activity, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1.5 flex-shrink-0" />
                    <span className="leading-relaxed">{activity}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Memory Cues List */}
            <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-2xs space-y-2.5 md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Familiar Memory Cues</span>
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                {lovedOne.cues.map((cue, idx) => (
                  <li key={idx} className="flex items-start space-x-2 bg-purple-50/50 p-2 rounded-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                    <span className="leading-relaxed">{cue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Patient / Caregiver Personal Notes */}
          <div className="bg-lavender-50/70 rounded-2xl p-4 border border-purple-200 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center space-x-1.5">
                <Edit3 className="w-3.5 h-3.5 text-purple-700" />
                <span>Personal Family Notes</span>
              </h4>

              {canModifyAndContact && !isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs font-bold text-purple-700 hover:text-purple-900"
                >
                  Edit Note
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Write gentle reminders, favorite sweets, or special reminders..."
                  className="w-full p-3 bg-white rounded-xl border border-purple-300 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-inner min-h-[80px]"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setNotes(lovedOne.patientNotes || '');
                      setIsEditingNotes(false);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center space-x-1 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-700 leading-relaxed italic bg-white/80 p-3 rounded-xl border border-purple-100">
                {notes ? `"${notes}"` : 'No personal notes added yet. Click "Edit Note" to add one.'}
              </p>
            )}

            {notesSavedAlert && (
              <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Notes successfully saved!</span>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Alert Modal */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm deletion"
          >
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-rose-200 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-gray-900">Remove from Loved Ones?</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Are you sure you want to remove <span className="font-bold text-gray-800">{lovedOne.name}</span> from your family album?
                </p>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDelete();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shadow-sm"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
