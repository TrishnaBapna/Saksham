/**
 * SAKSHAM NEURO-CARE — PHASE 3.5
 * PATIENT-ACCESSIBLE COGNITIVE & FUNCTIONAL JOURNAL
 * Allows patients to record, view, edit, and manage their own daily observations in their own words.
 * Enforces strictly separate patient perspectives, private-by-default sharing, and non-diagnostic dignity.
 * 100% Spark Free Plan compliant ($0.00 cloud cost).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Lock,
  Share2,
  Trash2,
  Edit3,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { CognitiveConcern, PATIENT_CONCERN_PROMPTS } from '../types/concern.types.js';
import { CognitiveConcernService } from '../services/cognitiveConcernService.js';
import { CognitiveConcernModal } from './CognitiveConcernModal.js';
import { SyncQueueService, SyncState } from '../../../services/syncQueueService.js';
import { SpeechService } from '../../../services/speechService.js';
import { useLanguage } from '../../../context/LanguageContext.js';

export interface PatientCognitiveJournalProps {
  patientId: string;
  patientName?: string;
  onOpenAppointmentPrep?: () => void;
}

export const PatientCognitiveJournal: React.FC<PatientCognitiveJournalProps> = ({
  patientId,
  patientName = 'Sunita',
  onOpenAppointmentPrep,
}) => {
  const { t, language } = useLanguage();
  const [concerns, setConcerns] = useState<CognitiveConcern[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConcern, setEditingConcern] = useState<CognitiveConcern | null>(null);

  // Phase 3.6: Offline-First Reassuring Sync State
  const [syncState, setSyncState] = useState<SyncState>(() =>
    SyncQueueService.isOnline() ? 'synced' : 'pending_sync'
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() =>
    SyncQueueService.getPendingCount(patientId)
  );

  useEffect(() => {
    const unsubscribe = SyncQueueService.subscribe((pid, state, count) => {
      if (pid === patientId) {
        setSyncState(state);
        setPendingSyncCount(count);
      }
    });
    return unsubscribe;
  }, [patientId]);

  const loadConcerns = useCallback(async () => {
    if (!patientId) return;
    try {
      const all = await CognitiveConcernService.getConcerns(patientId);
      // Strictly filter to patient's own perspective (Part D)
      const patientOnly = all.filter((c) => c.perspective === 'patient');
      setConcerns(patientOnly);
    } catch (err) {
      console.warn('[PatientCognitiveJournal] Failed to load concerns:', err);
    }
  }, [patientId]);

  useEffect(() => {
    loadConcerns();
  }, [loadConcerns]);

  const handleOpenNew = () => {
    setEditingConcern(null);
    setIsModalOpen(true);
  };

  const handleEdit = (concern: CognitiveConcern) => {
    setEditingConcern(concern);
    setIsModalOpen(true);
  };

  const handleDelete = async (concernId: string) => {
    try {
      await CognitiveConcernService.deleteConcern(patientId, concernId, 'patient');
      await loadConcerns();
    } catch (err) {
      console.error('[PatientCognitiveJournal] Delete failed:', err);
    }
  };

  const handleToggleSharing = async (concern: CognitiveConcern) => {
    try {
      await CognitiveConcernService.updateConcernSharing(
        patientId,
        concern.id,
        !concern.sharedWithDoctor
      );
      await loadConcerns();
    } catch (err) {
      console.error('[PatientCognitiveJournal] Toggle sharing failed:', err);
    }
  };

  const handleToggleDiscuss = async (concern: CognitiveConcern) => {
    try {
      await CognitiveConcernService.updateDiscussAtAppointment(
        patientId,
        concern.id,
        !concern.discussAtAppointment
      );
      await loadConcerns();
    } catch (err) {
      console.error('[PatientCognitiveJournal] Toggle discuss failed:', err);
    }
  };

  const syncInfo = SyncQueueService.getHumanReadableSyncStatus(syncState, language, pendingSyncCount);

  return (
    <div
      data-testid="patient-cognitive-journal"
      className="bg-white rounded-3xl p-5 sm:p-7 border border-purple-100 shadow-soft-purple space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-50 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xl shadow-2xs">
            📝
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                {t('journal.title')}
              </h3>
              <div
                data-testid="journal-sync-status"
                role="status"
                aria-live="polite"
                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${syncInfo.colorClass}`}
              >
                <span>{syncInfo.label}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {t('journal.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            data-testid="patient-open-concern-modal-btn"
            onClick={handleOpenNew}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('journal.share_btn')}</span>
          </button>

          {onOpenAppointmentPrep && (
            <button
              type="button"
              data-testid="open-appointment-prep-btn"
              onClick={onOpenAppointmentPrep}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold border border-indigo-200 transition flex items-center space-x-1.5 shadow-2xs cursor-pointer min-h-[44px]"
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>{t('journal.prepare_summary_btn')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Non-Diagnostic Dignity Guarantee */}
      <div
        data-testid="journal-disclaimer"
        className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200 text-xs text-purple-950 flex items-start gap-2.5"
      >
        <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-bold">{t('journal.privacy_title')}</strong> {t('journal.privacy_desc')}
        </p>
      </div>

      {/* Quick Common Experience Chips */}
      <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
          {t('journal.common_experiences_label')}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PATIENT_CONCERN_PROMPTS.slice(0, 5).map((prompt, i) => (
            <button
              key={i}
              type="button"
              data-testid={`journal-quick-prompt-${i}`}
              onClick={() => {
                setEditingConcern(null);
                setIsModalOpen(true);
              }}
              className="text-2xs bg-white text-slate-800 hover:text-purple-900 border border-slate-200 rounded-xl px-2.5 py-1.5 font-semibold hover:bg-purple-50 transition cursor-pointer shadow-2xs"
            >
              + {t(`journal.prompt_${i}`) || prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Concerns List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>{t('journal.recorded_notes_count', { count: concerns.length })}</span>
          <span className="text-slate-400 font-normal">{t('journal.most_recent_first')}</span>
        </div>

        {concerns.length === 0 ? (
          <div
            data-testid="empty-journal-notice"
            className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500 space-y-1"
          >
            <p className="font-semibold text-slate-700">{t('journal.empty_title')}</p>
            <p>{t('journal.empty_desc')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {concerns.map((concern) => (
              <div
                key={concern.id}
                data-testid={`patient-concern-card-${concern.id}`}
                className="p-4 bg-white rounded-2xl border border-purple-100 shadow-2xs space-y-3 transition hover:border-purple-300"
              >
                {/* Header row: category, date, badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      data-testid={`patient-concern-category-${concern.id}`}
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200 capitalize"
                    >
                      {t(`journal.cat_${concern.category}`) !== `journal.cat_${concern.category}`
                        ? t(`journal.cat_${concern.category}`)
                        : concern.category.replace('_', ' ')}
                    </span>

                    {/* Sharing Badge */}
                    {concern.sharedWithDoctor ? (
                      <span
                        data-testid={`concern-shared-badge-${concern.id}`}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3 text-emerald-700" />
                        <span>{t('journal.shared_with_doctor')}</span>
                      </span>
                    ) : (
                      <span
                        data-testid={`concern-private-badge-${concern.id}`}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>{t('journal.private_to_you')}</span>
                      </span>
                    )}

                    {/* Discuss at Appointment Badge */}
                    {concern.discussAtAppointment && (
                      <span
                        data-testid={`discuss-appointment-badge-${concern.id}`}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200"
                      >
                        {t('journal.discuss_at_visit')}
                      </span>
                    )}
                  </div>

                  <span
                    data-testid={`patient-concern-date-${concern.id}`}
                    className="text-2xs text-slate-400 font-medium"
                  >
                    {new Date(concern.recordedAt).toLocaleDateString(SpeechService.getBCP47(language), {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Patient's Own Wording (Part D: Must be preserved verbatim) */}
                <p
                  data-testid={`patient-concern-description-${concern.id}`}
                  className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium"
                >
                  "{concern.description}"
                </p>

                {concern.contextNotes && (
                  <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {t('journal.context_label')} {concern.contextNotes}
                  </div>
                )}

                {/* Interactive Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-50 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      data-testid={`toggle-sharing-btn-${concern.id}`}
                      onClick={() => handleToggleSharing(concern)}
                      className="px-2.5 py-1 text-2xs font-bold rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition cursor-pointer"
                    >
                      {concern.sharedWithDoctor ? t('journal.make_private') : t('journal.share_with_doctor')}
                    </button>

                    <button
                      type="button"
                      data-testid={`toggle-discuss-btn-${concern.id}`}
                      onClick={() => handleToggleDiscuss(concern)}
                      className="px-2.5 py-1 text-2xs font-bold rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                    >
                      {concern.discussAtAppointment ? t('journal.on_discuss_list') : t('journal.flag_for_appointment')}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid={`edit-concern-btn-${concern.id}`}
                      onClick={() => handleEdit(concern)}
                      className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                      title={t('journal.edit_note')}
                      aria-label={t('journal.edit_note')}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      data-testid={`delete-concern-btn-${concern.id}`}
                      onClick={() => handleDelete(concern.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title={t('journal.delete_note')}
                      aria-label={t('journal.delete_note')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Integration */}
      <CognitiveConcernModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingConcern(null);
        }}
        patientId={patientId}
        patientName={patientName}
        perspective="patient"
        currentUserId={patientId}
        currentUserName={patientName}
        editingConcern={editingConcern}
        onConcernSaved={() => {
          loadConcerns();
        }}
      />
    </div>
  );
};
