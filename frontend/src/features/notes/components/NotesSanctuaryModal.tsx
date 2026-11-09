import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../../../context/LanguageContext.js';
import { useAccessibility } from '../../../context/AccessibilityContext.js';
import { useAuthSafe } from '../../../context/AuthContext.js';
import { getEffectivePatientId } from '../../auth/services/identityService.js';
import { NotesService } from '../services/notesService.js';
import { VoiceStorageService } from '../services/voiceStorageService.js';
import { PatientNote, NoteCategory, LocalVoiceNoteMetadata } from '../types/notes.types.js';
import { VoiceNoteRecorder, VoiceNoteRecordResult } from './VoiceNoteRecorder.js';
import { SpeechService } from '../../../services/speechService.js';
import { RoutineService } from '../../routines/services/routineService.js';
import { RoutineItem } from '../../../types/index.js';
import {
  FileText,
  Search,
  Plus,
  Pin,
  PinOff,
  Trash2,
  Edit3,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Cloud,
  CloudOff,
  HardDrive,
  X,
  Sparkles,
  Link,
} from 'lucide-react';

interface NotesSanctuaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotesSanctuaryModal: React.FC<NotesSanctuaryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, language, isRTL, formatDate } = useLanguage();
  const { highContrast } = useAccessibility();
  const auth = useAuthSafe();
  const patientId = getEffectivePatientId(auth?.currentUser);

  // State
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'all'>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<PatientNote | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<NoteCategory>('personal');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formLinkedRoutineId, setFormLinkedRoutineId] = useState<string>('');
  const [pendingVoiceBlob, setPendingVoiceBlob] = useState<VoiceNoteRecordResult | null>(null);
  const [existingVoiceNote, setExistingVoiceNote] = useState<LocalVoiceNoteMetadata | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion confirmation state
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Audio Playback & TTS state
  const [playingVoiceNoteId, setPlayingVoiceNoteId] = useState<string | null>(null);
  const [readingAloudNoteId, setReadingAloudNoteId] = useState<string | null>(null);
  const activeAudioElementRef = useRef<HTMLAudioElement | null>(null);

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Load notes & routines
  const loadNotes = () => {
    try {
      const allNotes = NotesService.getNotes(patientId);
      setNotes(allNotes);
      const allRoutines = RoutineService.getRoutines(patientId);
      setRoutines(allRoutines);
    } catch (err) {
      console.warn('[NotesSanctuaryModal] Error loading notes:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotes();
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } else {
      // Stop speech or audio when modal closes
      if (activeAudioElementRef.current) {
        activeAudioElementRef.current.pause();
        activeAudioElementRef.current = null;
      }
      SpeechService.stopSpeaking();
      setReadingAloudNoteId(null);
      setPlayingVoiceNoteId(null);
      setIsEditing(false);
      setEditingNote(null);
      setDeletingNoteId(null);
    }
  }, [isOpen, patientId]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudioElementRef.current) {
        activeAudioElementRef.current.pause();
      }
      SpeechService.stopSpeaking();
    };
  }, []);

  // Filter notes by search & category
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (selectedCategory !== 'all') {
      result = result.filter((n) => n.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    }
    return result;
  }, [notes, selectedCategory, searchQuery]);

  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.isPinned), [filteredNotes]);
  const unpinnedNotes = useMemo(() => filteredNotes.filter((n) => !n.isPinned), [filteredNotes]);

  // Open Editor for New Note
  const handleOpenCreate = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('personal');
    setFormIsPinned(false);
    setFormLinkedRoutineId('');
    setPendingVoiceBlob(null);
    setExistingVoiceNote(null);
    setFormError(null);
    setIsEditing(true);
  };

  // Open Editor for Editing an Existing Note
  const handleOpenEdit = (note: PatientNote) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category);
    setFormIsPinned(note.isPinned);
    setFormLinkedRoutineId(note.linkedRoutineId || '');
    setPendingVoiceBlob(null);
    setExistingVoiceNote(note.voiceNote || note.voiceMetadata || null);
    setFormError(null);
    setIsEditing(true);
  };

  // Cancel Editor
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingNote(null);
    setPendingVoiceBlob(null);
    setExistingVoiceNote(null);
    setFormError(null);
  };

  // Save Note (Create or Update)
  const handleSaveNote = async () => {
    setFormError(null);
    const cleanTitle = formTitle.trim();
    if (!cleanTitle) {
      setFormError('Note title cannot be empty.');
      return;
    }

    try {
      let voiceMeta: LocalVoiceNoteMetadata | undefined = existingVoiceNote || undefined;

      // If user recorded a new voice note, persist blob in local IndexedDB
      if (pendingVoiceBlob) {
        const targetNoteId = editingNote?.id || `note_${Date.now()}`;
        const audioKey = VoiceStorageService.generateAudioKey(patientId, targetNoteId);
        await VoiceStorageService.saveAudioBlob(audioKey, pendingVoiceBlob.blob, {
          durationSeconds: pendingVoiceBlob.durationSeconds,
          mimeType: pendingVoiceBlob.mimeType,
        });

        voiceMeta = {
          isRecorded: true,
          durationSeconds: pendingVoiceBlob.durationSeconds,
          localAudioKey: audioKey,
          recordedAt: new Date().toISOString(),
          mimeType: pendingVoiceBlob.mimeType,
        };
      }

      if (editingNote) {
        await NotesService.updateNote(patientId, editingNote.id, {
          title: cleanTitle,
          content: formContent,
          category: formCategory,
          isPinned: formIsPinned,
          linkedRoutineId: formLinkedRoutineId || undefined,
          voiceNote: voiceMeta,
          voiceMetadata: voiceMeta,
        });
      } else {
        await NotesService.createNote(patientId, {
          title: cleanTitle,
          content: formContent,
          category: formCategory,
          isPinned: formIsPinned,
          linkedRoutineId: formLinkedRoutineId || undefined,
          voiceNote: voiceMeta,
          voiceMetadata: voiceMeta,
        });
      }

      loadNotes();
      setIsEditing(false);
      setEditingNote(null);
      setPendingVoiceBlob(null);
      setExistingVoiceNote(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save note.');
    }
  };

  // Toggle Pin
  const handleTogglePin = async (noteId: string) => {
    try {
      await NotesService.togglePinNote(patientId, noteId);
      loadNotes();
    } catch (err) {
      console.warn('[NotesSanctuaryModal] Toggle pin error:', err);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingNoteId) return;
    try {
      await NotesService.deleteNote(patientId, deletingNoteId);
      setDeletingNoteId(null);
      loadNotes();
    } catch (err) {
      console.warn('[NotesSanctuaryModal] Delete error:', err);
    }
  };

  // Play / Pause Voice Note
  const handleToggleVoicePlayback = async (note: PatientNote) => {
    const meta = note.voiceNote || note.voiceMetadata;
    if (!meta || !meta.localAudioKey) return;

    if (playingVoiceNoteId === note.id) {
      if (activeAudioElementRef.current) {
        activeAudioElementRef.current.pause();
        activeAudioElementRef.current = null;
      }
      setPlayingVoiceNoteId(null);
      return;
    }

    try {
      const blob = await VoiceStorageService.getAudioBlob(meta.localAudioKey);
      if (!blob) {
        alert('Voice recording is no longer available on this device.');
        return;
      }

      if (activeAudioElementRef.current) {
        activeAudioElementRef.current.pause();
      }

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      activeAudioElementRef.current = audio;

      audio.onended = () => {
        setPlayingVoiceNoteId(null);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setPlayingVoiceNoteId(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      setPlayingVoiceNoteId(note.id);
    } catch (err) {
      console.warn('[NotesSanctuaryModal] Audio play error:', err);
      setPlayingVoiceNoteId(null);
    }
  };

  // Read Aloud with SpeechService
  const handleToggleReadAloud = (note: PatientNote) => {
    if (readingAloudNoteId === note.id) {
      SpeechService.stopSpeaking();
      setReadingAloudNoteId(null);
      return;
    }

    const textToRead = `${note.title}. ${note.content || ''}`;
    SpeechService.speak(
      textToRead,
      () => setReadingAloudNoteId(note.id),
      () => setReadingAloudNoteId(null),
      language
    );
  };

  const categories: { key: NoteCategory | 'all'; label: string }[] = [
    { key: 'all', label: t('notes.category_all') },
    { key: 'personal', label: t('notes.category_personal') },
    { key: 'medical', label: t('notes.category_medical') },
    { key: 'family', label: t('notes.category_family') },
    { key: 'reminder', label: t('notes.category_reminder') },
    { key: 'other', label: t('notes.category_other') },
  ];

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('notes.title')}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-purple-950/40 backdrop-blur-sm animate-in fade-in"
      data-testid="utility-shell-notes"
    >
      <div
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl transition-all overflow-hidden ${
          highContrast
            ? 'bg-black text-white border-2 border-yellow-300'
            : 'bg-white text-gray-900 border border-purple-100'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-purple-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-100 text-purple-800">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-purple-950 flex items-center gap-2">
                {t('notes.title')}
                <span className="text-xs font-normal text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                  {notes.length}
                </span>
              </h2>
              <p className="text-xs text-gray-500">{t('notes.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-transform active:scale-95 ${
                  highContrast
                    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                    : 'bg-purple-700 hover:bg-purple-800 text-white'
                }`}
                data-testid="notes-new-btn"
              >
                <Plus className="w-4 h-4" />
                <span>{t('notes.new_note')}</span>
              </button>
            )}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
              data-testid="utility-modal-close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Milestone 6.3 Reassurance Notice */}
          <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/60 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div className="text-[11px] text-purple-900 leading-relaxed">
              {t('utility.stage63_notice')}
            </div>
          </div>
          {/* Note Editor View */}
          {isEditing ? (
            <div className="space-y-4 animate-in fade-in" data-testid="notes-editor">
              <div className="flex items-center justify-between pb-2 border-b border-purple-50">
                <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-purple-700" />
                  {editingNote ? t('notes.edit_note') : t('notes.new_note')}
                </h3>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t('notes.title_placeholder')}
                  maxLength={120}
                  className={`w-full p-3 rounded-xl text-sm border focus:outline-none focus:ring-2 ${
                    highContrast
                      ? 'bg-black text-white border-yellow-300 focus:ring-yellow-400'
                      : 'bg-purple-50/40 border-purple-200 text-gray-900 focus:ring-purple-400'
                  }`}
                  data-testid="note-title-input"
                />
              </div>

              {/* Category Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['personal', 'medical', 'family', 'reminder', 'other'] as NoteCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormCategory(cat)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      formCategory === cat
                        ? highContrast
                          ? 'bg-yellow-400 text-black border-yellow-300'
                          : 'bg-purple-700 text-white border-purple-700 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-purple-50'
                    }`}
                  >
                    {t(`notes.category_${cat}` as any)}
                  </button>
                ))}
              </div>

              {/* Content Textarea */}
              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1">
                  Note Details
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder={t('notes.content_placeholder')}
                  rows={4}
                  maxLength={5000}
                  className={`w-full p-3 rounded-xl text-sm border focus:outline-none focus:ring-2 resize-none ${
                    highContrast
                      ? 'bg-black text-white border-yellow-300 focus:ring-yellow-400'
                      : 'bg-purple-50/40 border-purple-200 text-gray-900 focus:ring-purple-400'
                  }`}
                  data-testid="note-content-input"
                />
              </div>

              {/* Pin Note Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/50 border border-purple-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="w-4 h-4 text-purple-700 rounded focus:ring-purple-400 cursor-pointer"
                  data-testid="note-pin-checkbox"
                />
                <span className="text-xs font-medium text-purple-950 flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 text-purple-700" />
                  {t('notes.pin_note')}
                </span>
              </label>

              {/* Optional Routine Link */}
              {routines.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1 flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5 text-purple-700" />
                    <span>Link with Daily Routine (Optional)</span>
                  </label>
                  <select
                    value={formLinkedRoutineId}
                    onChange={(e) => setFormLinkedRoutineId(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs border border-purple-200 bg-purple-50/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="">None</option>
                    {routines.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.scheduledTime} — {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Voice Note Recording Component */}
              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1">
                  Voice Note Attachment
                </label>
                <VoiceNoteRecorder
                  onRecordingComplete={(res) => setPendingVoiceBlob(res)}
                  onDiscard={() => {
                    setPendingVoiceBlob(null);
                    setExistingVoiceNote(null);
                  }}
                  existingDurationSeconds={existingVoiceNote?.durationSeconds}
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-purple-100">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className={`py-2.5 px-5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                    highContrast
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'bg-purple-700 hover:bg-purple-800 text-white'
                  }`}
                  data-testid="note-save-btn"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search & Category Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search
                    className={`w-4 h-4 text-gray-400 absolute top-3.5 ${
                      isRTL ? 'right-3' : 'left-3'
                    }`}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('notes.search_placeholder')}
                    className={`w-full py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    } ${
                      highContrast
                        ? 'bg-black text-white border-yellow-300 focus:ring-yellow-400'
                        : 'bg-purple-50/40 border-purple-200 text-gray-900 focus:ring-purple-400'
                    }`}
                    data-testid="notes-search-input"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {categories.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setSelectedCategory(c.key)}
                      className={`py-1.5 px-3 rounded-full shrink-0 font-medium transition-colors cursor-pointer text-[11px] ${
                        selectedCategory === c.key
                          ? highContrast
                            ? 'bg-yellow-400 text-black'
                            : 'bg-purple-700 text-white shadow-sm'
                          : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                      }`}
                      data-testid={`notes-cat-${c.key}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes List */}
              {filteredNotes.length === 0 ? (
                <div className="p-8 text-center bg-purple-50/30 rounded-3xl border border-purple-100">
                  <FileText className="w-10 h-10 text-purple-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-purple-950">
                    {searchQuery ? t('notes.no_matches') : t('notes.empty')}
                  </p>
                  {!searchQuery && (
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="mt-3 py-2 px-4 rounded-xl text-xs font-semibold bg-purple-700 text-white hover:bg-purple-800 cursor-pointer shadow-sm"
                    >
                      {t('notes.new_note')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pinned Section */}
                  {pinnedNotes.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                        <Pin className="w-3.5 h-3.5 text-purple-700" />
                        <span>Pinned Notes ({pinnedNotes.length})</span>
                      </div>
                      <div className="space-y-2.5">
                        {pinnedNotes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            formatDate={formatDate}
                            t={t}
                            highContrast={highContrast}
                            isPlayingVoice={playingVoiceNoteId === note.id}
                            isReadingAloud={readingAloudNoteId === note.id}
                            onTogglePin={() => handleTogglePin(note.id)}
                            onEdit={() => handleOpenEdit(note)}
                            onDelete={() => setDeletingNoteId(note.id)}
                            onToggleVoice={() => handleToggleVoicePlayback(note)}
                            onToggleReadAloud={() => handleToggleReadAloud(note)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unpinned / Other Notes Section */}
                  {unpinnedNotes.length > 0 && (
                    <div className="space-y-2">
                      {pinnedNotes.length > 0 && (
                        <div className="text-[11px] font-bold uppercase tracking-wider text-purple-900 pt-2">
                          <span>Other Notes ({unpinnedNotes.length})</span>
                        </div>
                      )}
                      <div className="space-y-2.5">
                        {unpinnedNotes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            formatDate={formatDate}
                            t={t}
                            highContrast={highContrast}
                            isPlayingVoice={playingVoiceNoteId === note.id}
                            isReadingAloud={readingAloudNoteId === note.id}
                            onTogglePin={() => handleTogglePin(note.id)}
                            onEdit={() => handleOpenEdit(note)}
                            onDelete={() => setDeletingNoteId(note.id)}
                            onToggleVoice={() => handleToggleVoicePlayback(note)}
                            onToggleReadAloud={() => handleToggleReadAloud(note)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {deletingNoteId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-purple-950/50 backdrop-blur-xs animate-in fade-in">
            <div
              className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl ${
                highContrast
                  ? 'bg-black text-white border-2 border-yellow-300'
                  : 'bg-white text-gray-900 border border-purple-100'
              }`}
            >
              <h4 className="text-sm font-bold text-purple-950 mb-2">
                {t('notes.delete_note')}
              </h4>
              <p className="text-xs text-gray-600 mb-4">
                {t('notes.delete_confirm')}
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingNoteId(null)}
                  className="py-2 px-3.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="py-2 px-4 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-sm"
                  data-testid="notes-confirm-delete-btn"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface NoteCardProps {
  note: PatientNote;
  formatDate: (d: Date) => string;
  t: (key: any) => string;
  highContrast: boolean;
  isPlayingVoice: boolean;
  isReadingAloud: boolean;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVoice: () => void;
  onToggleReadAloud: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  formatDate,
  t,
  highContrast,
  isPlayingVoice,
  isReadingAloud,
  onTogglePin,
  onEdit,
  onDelete,
  onToggleVoice,
  onToggleReadAloud,
}) => {
  const hasVoice = Boolean(note.voiceNote?.localAudioKey || note.voiceMetadata?.localAudioKey);
  const voiceDuration = note.voiceNote?.durationSeconds || note.voiceMetadata?.durationSeconds || 0;

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
        note.isPinned
          ? highContrast
            ? 'bg-purple-950/60 border-yellow-300'
            : 'bg-purple-50/80 border-purple-200 shadow-xs'
          : highContrast
          ? 'bg-gray-900 border-gray-700'
          : 'bg-white border-purple-100 hover:border-purple-200'
      }`}
      data-testid={`note-card-${note.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
            {t(`notes.category_${note.category}` as any)}
          </span>

          {/* Sync status indicator */}
          <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
            {note.syncStatus === 'synced' && (
              <span className="flex items-center gap-1 text-emerald-600">
                <Cloud className="w-3 h-3" />
                <span>{t('notes.status_synced')}</span>
              </span>
            )}
            {note.syncStatus === 'offline-pending' && (
              <span className="flex items-center gap-1 text-amber-600">
                <CloudOff className="w-3 h-3" />
                <span>{t('notes.status_pending')}</span>
              </span>
            )}
            {note.syncStatus === 'local-only' && (
              <span className="flex items-center gap-1 text-blue-600">
                <HardDrive className="w-3 h-3" />
                <span>{t('notes.status_local')}</span>
              </span>
            )}
          </span>

          <span className="text-[10px] text-gray-400">
            {formatDate(new Date(note.updatedAt))}
          </span>
        </div>

        {/* Card Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onTogglePin}
            aria-label={note.isPinned ? t('notes.unpin_note') : t('notes.pin_note')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              note.isPinned
                ? 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
            data-testid={`note-pin-btn-${note.id}`}
          >
            {note.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label={t('notes.edit_note')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            data-testid={`note-edit-btn-${note.id}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('notes.delete_note')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            data-testid={`note-delete-btn-${note.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Note Title */}
      <h3 className="text-sm font-bold text-purple-950 mb-1 leading-snug">
        {note.title}
      </h3>

      {/* Note Content */}
      {note.content && (
        <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed mb-3">
          {note.content}
        </p>
      )}

      {/* Media & Audio Action Bar */}
      <div className="flex items-center gap-2 pt-2 border-t border-purple-50 flex-wrap">
        {hasVoice && (
          <button
            type="button"
            onClick={onToggleVoice}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPlayingVoice
                ? 'bg-purple-700 text-white animate-pulse'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-800'
            }`}
            data-testid={`note-voice-btn-${note.id}`}
          >
            {isPlayingVoice ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Voice</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('notes.play_voice')} ({voiceDuration}s)</span>
              </>
            )}
          </button>
        )}

        {/* Read Aloud Button */}
        <button
          type="button"
          onClick={onToggleReadAloud}
          className={`py-1.5 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            isReadingAloud
              ? 'bg-indigo-700 text-white animate-pulse'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          data-testid={`note-read-aloud-btn-${note.id}`}
        >
          {isReadingAloud ? (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>{t('notes.stop_read_aloud')}</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5" />
              <span>{t('notes.read_aloud')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
