import React, { useState, useRef, useEffect } from 'react';
import { LovedOne } from '../../../types/index.js';
import { LovedOnesService } from '../services/lovedOnesService.js';
import { validateImageInput } from '../utils/imageCompression.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getLovedOneModalUi } from '../utils/lovedOneFormTranslation.js';
import {
  X,
  Plus,
  Trash2,
  Heart,
  Save,
  Volume2,
  Sparkles,
  Camera,
  ShieldCheck,
  Upload,
  Phone,
  MessageCircle,
  Video,
  CheckCircle
} from 'lucide-react';

interface AddEditLovedOneModalProps {
  lovedOneToEdit?: LovedOne | null;
  onClose: () => void;
  onSave: (data: Omit<LovedOne, 'id'>) => void;
}

export const AddEditLovedOneModal: React.FC<AddEditLovedOneModalProps> = ({
  lovedOneToEdit,
  onClose,
  onSave
}) => {
  const { t, language } = useLanguage();
  const modalUi = getLovedOneModalUi(language);
  const isEditing = Boolean(lovedOneToEdit);

  const [name, setName] = useState(lovedOneToEdit?.name || '');
  const [relationship, setRelationship] = useState(lovedOneToEdit?.relationship || 'Daughter');
  const [customRelationship, setCustomRelationship] = useState('');
  const [nickname, setNickname] = useState(lovedOneToEdit?.nickname || '');
  const [photoUrl, setPhotoUrl] = useState(
    lovedOneToEdit?.photoUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
  );
  const [phoneNumber, setPhoneNumber] = useState(
    lovedOneToEdit?.phoneNumber || lovedOneToEdit?.phone || ''
  );
  const [whatsappNumber, setWhatsappNumber] = useState(
    lovedOneToEdit?.whatsappNumber || ''
  );
  const [description, setDescription] = useState(lovedOneToEdit?.description || '');
  const [familiarPhrase, setFamiliarPhrase] = useState(lovedOneToEdit?.familiarPhrase || '');
  const [cues, setCues] = useState<string[]>(
    lovedOneToEdit?.cues && lovedOneToEdit.cues.length > 0
      ? lovedOneToEdit.cues
      : [modalUi.defaultCue1, modalUi.defaultCue2]
  );
  const [favouriteActivities, setFavouriteActivities] = useState<string[]>(
    lovedOneToEdit?.favouriteActivities && lovedOneToEdit.favouriteActivities.length > 0
      ? lovedOneToEdit.favouriteActivities
      : [modalUi.defaultAct1, modalUi.defaultAct2]
  );
  const [patientNotes, setPatientNotes] = useState(lovedOneToEdit?.patientNotes || '');

  // Voice recording fields
  const [hasVoiceRecording, setHasVoiceRecording] = useState(
    Boolean(lovedOneToEdit?.voiceRecording || lovedOneToEdit?.audioNote)
  );
  const [speakerName, setSpeakerName] = useState(
    lovedOneToEdit?.voiceRecording?.speakerName || lovedOneToEdit?.name || ''
  );
  const [voiceTitle, setVoiceTitle] = useState(
    lovedOneToEdit?.voiceRecording?.title || modalUi.defaultVoiceTitle
  );
  const [voiceTranscript, setVoiceTranscript] = useState(
    lovedOneToEdit?.voiceRecording?.transcript || lovedOneToEdit?.audioNote || ''
  );
  const [voiceDuration, setVoiceDuration] = useState<number>(
    lovedOneToEdit?.voiceRecording?.durationSeconds || 15
  );

  const [newCue, setNewCue] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [validationError, setValidationError] = useState('');
  const [compressionNotice, setCompressionNotice] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const presetAvatars = LovedOnesService.getPresetAvatars();

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError('');
    setValidationError(modalUi.errCameraBlocked);
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    stopCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValidationError(modalUi.errUploadBlocked);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    setCompressionNotice(modalUi.photoRemovedNotice);
  };

  const handleAddCue = () => {
    if (newCue.trim()) {
      setCues([...cues, newCue.trim()]);
      setNewCue('');
    }
  };

  const handleRemoveCue = (idx: number) => {
    setCues(cues.filter((_, i) => i !== idx));
  };

  const handleAddActivity = () => {
    if (newActivity.trim()) {
      setFavouriteActivities([...favouriteActivities, newActivity.trim()]);
      setNewActivity('');
    }
  };

  const handleRemoveActivity = (idx: number) => {
    setFavouriteActivities(favouriteActivities.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setValidationError(modalUi.errMissingName);
      return;
    }

    if (photoUrl && photoUrl.startsWith('data:')) {
      setValidationError(modalUi.errBinaryPhoto);
      return;
    }

    if (photoUrl && !photoUrl.startsWith('http://') && !photoUrl.startsWith('https://')) {
      try {
        validateImageInput(photoUrl);
      } catch (err: unknown) {
        setValidationError(err instanceof Error ? err.message : modalUi.errInvalidPhoto);
        return;
      }
    }

    const finalRelationship =
      relationship === 'Other' ? customRelationship.trim() || 'Family Member' : relationship;

    const dataToSave: Omit<LovedOne, 'id'> = {
      name: name.trim(),
      relationship: finalRelationship,
      nickname: nickname.trim() || undefined,
      photoUrl,
      phoneNumber: phoneNumber.trim() || undefined,
      whatsappNumber: whatsappNumber.trim() || undefined,
      phone: phoneNumber.trim() || undefined,
      description: description.trim() || `Loved family member: ${name.trim()}`,
      familiarPhrase: familiarPhrase.trim() || undefined,
      cues: cues.length > 0 ? cues : [`Cherished member of your family`],
      favouriteActivities: favouriteActivities.length > 0 ? favouriteActivities : undefined,
      patientNotes: patientNotes.trim() || undefined,
      audioNote: hasVoiceRecording && voiceTranscript.trim() ? voiceTranscript.trim() : undefined,
      voiceRecording:
        hasVoiceRecording && voiceTranscript.trim()
          ? {
              id: lovedOneToEdit?.voiceRecording?.id || `rec_${Date.now()}`,
              title: voiceTitle.trim() || `Voice Note from ${name.trim()}`,
              speakerName: speakerName.trim() || name.trim(),
              durationSeconds: voiceDuration,
              transcript: voiceTranscript.trim(),
              recordedAt: new Date().toISOString().split('T')[0]
            }
          : undefined
    };

    onSave(dataToSave);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Edit Loved One' : 'Add New Loved One'}
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-purple-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-pink-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Heart className="w-5 h-5 text-rose-200 fill-rose-200" />
            <div>
              <h2 className="text-lg font-bold">
                {isEditing ? t('loved_ones.form_edit_title', { name: lovedOneToEdit?.name || '' }) : t('loved_ones.form_add_title')}
              </h2>
              <p className="text-xs text-purple-100">
                {modalUi.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            aria-label={modalUi.closeAria}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1">
          {validationError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold">
              {validationError}
            </div>
          )}

          {/* Privacy & Spark Plan Notice */}
          <div className="bg-lavender-50 p-3.5 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">{modalUi.privacyTitle}</span> {modalUi.privacyBody}
            </div>
          </div>

          {/* Name & Relationship */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {modalUi.fullNameLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder={modalUi.fullNamePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {modalUi.relationshipLabel}
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                <option value="Daughter & Primary Caregiver">{modalUi.relDaughterPrimary}</option>
                <option value="Daughter">{modalUi.relDaughter}</option>
                <option value="Son">{modalUi.relSon}</option>
                <option value="Spouse">{modalUi.relSpouse}</option>
                <option value="Grandson">{modalUi.relGrandson}</option>
                <option value="Granddaughter">{modalUi.relGranddaughter}</option>
                <option value="Sister">{modalUi.relSister}</option>
                <option value="Brother">{modalUi.relBrother}</option>
                <option value="Lifelong Best Friend">{modalUi.relBestFriend}</option>
                <option value="Caregiver">{modalUi.relCaregiver}</option>
                <option value="Other">{modalUi.relOther}</option>
              </select>
            </div>
          </div>

          {relationship === 'Other' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {modalUi.customRelLabel}
              </label>
              <input
                type="text"
                value={customRelationship}
                onChange={(e) => setCustomRelationship(e.target.value)}
                placeholder={modalUi.customRelPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          )}

          {/* Contact Numbers: Telephone & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                <span>{modalUi.phoneLabel}</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={modalUi.phonePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center space-x-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>{modalUi.whatsappLabel}</span>
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder={modalUi.whatsappPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>

          {/* Nickname & Familiar Phrase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {modalUi.nicknameLabel}
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={modalUi.nicknamePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {modalUi.phraseLabel}
              </label>
              <input
                type="text"
                value={familiarPhrase}
                onChange={(e) => setFamiliarPhrase(e.target.value)}
                placeholder={modalUi.phrasePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>

          {/* Photograph Management Section */}
          <div className="space-y-3 p-4 rounded-2xl bg-lavender-50/70 border border-purple-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-purple-950 flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-purple-700" />
                <span>{modalUi.photoSectionTitle}</span>
              </label>
              {compressionNotice && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  <span>{compressionNotice}</span>
                </span>
              )}
            </div>

            {/* Live Camera View if Active */}
            {isCameraActive && (
              <div className="p-3 bg-white rounded-2xl border-2 border-purple-400 space-y-3 animate-fadeIn">
                <div className="relative rounded-xl overflow-hidden bg-black max-w-sm mx-auto aspect-square flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{modalUi.snapPhoto}</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
                  >
                    {modalUi.cancelCamera}
                  </button>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {cameraError}
              </div>
            )}

            {/* Photo Preview & Action Bar */}
            <div className="flex items-center space-x-4 bg-white p-3 rounded-2xl border border-purple-100">
              <div className="relative flex-shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-300 shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        name || 'Family'
                      )}&background=8b5cf6&color=ffffff&size=160`;
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg border-2 border-purple-300">
                    {name ? name.substring(0, 2).toUpperCase() : '❤️'}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                {/* Spark Free-Tier Media Notice */}
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[11px] text-purple-900 leading-relaxed">
                  <span className="font-bold">{modalUi.sparkNoticeTitle}</span> {modalUi.sparkNoticeBody}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Camera Button */}
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-bold inline-flex items-center space-x-1.5 shadow-2xs"
                  >
                    <Video className="w-3.5 h-3.5 text-purple-600" />
                    <span>{modalUi.takePhoto}</span>
                  </button>

                  {/* Choose File Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-bold inline-flex items-center space-x-1.5 shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-purple-600" />
                    <span>{modalUi.chooseFile}</span>
                  </button>

                  {/* Remove Photo Button */}
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1.5 rounded-xl bg-gray-50 text-rose-600 border border-gray-200 hover:bg-rose-50 text-xs font-bold inline-flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{modalUi.removePhoto}</span>
                    </button>
                  )}
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder={modalUi.pasteUrlPlaceholder}
                  className="w-full px-3 py-1.5 rounded-xl border border-purple-200 text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>

            {/* Preset Avatars Selection (Zero-cost Spark plan prototype) */}
            <div>
              <p className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center space-x-1">
                <Camera className="w-3 h-3 text-purple-500" />
                <span>{modalUi.selectPortraitHint}</span>
              </p>
              <div className="grid grid-cols-6 gap-2">
                {presetAvatars.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      setPhotoUrl(av.url);
                      setCompressionNotice(`${modalUi.presetSelectedPrefix} ${av.name}`);
                    }}
                    className={`rounded-xl overflow-hidden border-2 transition ${
                      photoUrl === av.url ? 'border-purple-600 ring-2 ring-purple-300 scale-105' : 'border-gray-200 hover:border-purple-300'
                    }`}
                    title={av.name}
                  >
                    <img src={av.url} alt={av.name} className="w-full h-12 object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {modalUi.descLabel}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={modalUi.descPlaceholder}
              className="w-full p-3 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 min-h-[70px]"
            />
          </div>

          {/* Memory Cues List */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>{modalUi.cuesLabel}</span>
              <span className="text-[11px] font-normal text-gray-500">{modalUi.cuesSub}</span>
            </label>

            <div className="flex space-x-2">
              <input
                type="text"
                value={newCue}
                onChange={(e) => setNewCue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCue();
                  }
                }}
                placeholder={modalUi.addCuePlaceholder}
                className="flex-1 px-3 py-2 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <button
                type="button"
                onClick={handleAddCue}
                className="px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {cues.map((cue, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-purple-50/70 border border-purple-100 text-xs text-gray-800"
                >
                  <span className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>{cue}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCue(idx)}
                    className="text-gray-400 hover:text-rose-600"
                    title={modalUi.removeCueTitle}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Shared Activities */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">
              {modalUi.activitiesLabel}
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddActivity();
                  }
                }}
                placeholder={modalUi.addActivityPlaceholder}
                className="flex-1 px-3 py-2 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <button
                type="button"
                onClick={handleAddActivity}
                className="px-3 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold hover:bg-pink-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {favouriteActivities.map((act, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-pink-50/70 border border-pink-100 text-xs text-gray-800"
                >
                  <span>🌸 {act}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveActivity(idx)}
                    className="text-gray-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Recording Config */}
          <div className="p-4 rounded-2xl bg-lavender-50 border border-purple-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-bold text-purple-950">{modalUi.addVoiceTitle}</span>
              </div>
              <input
                type="checkbox"
                checked={hasVoiceRecording}
                onChange={(e) => setHasVoiceRecording(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-400"
              />
            </div>

            {hasVoiceRecording && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      {modalUi.speakerLabel}
                    </label>
                    <input
                      type="text"
                      value={speakerName}
                      onChange={(e) => setSpeakerName(e.target.value)}
                      placeholder={modalUi.speakerPlaceholder}
                      className="w-full px-3 py-1.5 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      {modalUi.recTitleLabel}
                    </label>
                    <input
                      type="text"
                      value={voiceTitle}
                      onChange={(e) => setVoiceTitle(e.target.value)}
                      placeholder={modalUi.recTitlePlaceholder}
                      className="w-full px-3 py-1.5 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    {modalUi.transcriptLabel}
                  </label>
                  <textarea
                    value={voiceTranscript}
                    onChange={(e) => setVoiceTranscript(e.target.value)}
                    placeholder={modalUi.transcriptPlaceholder}
                    className="w-full p-2.5 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white min-h-[60px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    {modalUi.durationPrefix} {voiceDuration}s
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="1"
                    value={voiceDuration}
                    onChange={(e) => setVoiceDuration(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Patient / Caregiver Private Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {modalUi.personalNotesLabel}
            </label>
            <textarea
              value={patientNotes}
              onChange={(e) => setPatientNotes(e.target.value)}
              placeholder={modalUi.personalNotesPlaceholder}
              className="w-full p-2.5 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 min-h-[50px]"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="bg-lavender-50 px-6 py-4 border-t border-purple-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-purple-100 transition"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? t('loved_ones.form_save') : t('loved_ones.form_add_title')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
