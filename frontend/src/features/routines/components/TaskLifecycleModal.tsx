import React, { useState } from 'react';
import {
  RecurringTask,
  RemovalReasonCode,
} from '../types/taskLifecycle.types.js';
import { TaskLifecycleService } from '../services/taskLifecycleService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getTranslatedRoutineTitle } from '../utils/routineTranslation.js';
import {
  X,
  Pause,
  Play,
  Archive,
  RotateCcw,
  AlertCircle,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface TaskLifecycleModalProps {
  task: RecurringTask | null;
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  userRole?: 'patient' | 'caregiver' | 'doctor';
  language?: string;
}

export const TaskLifecycleModal: React.FC<TaskLifecycleModalProps> = ({
  task,
  patientId,
  isOpen,
  onClose,
  onTaskUpdated,
  userRole = 'patient',
  language: _language = 'en',
}) => {
  const { t } = useLanguage();
  const [activeAction, setActiveAction] = useState<'view' | 'pause' | 'archive' | 'restore'>('view');
  const [selectedReason, setSelectedReason] = useState<RemovalReasonCode>('no_longer_needed');
  const [explanation, setExplanation] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const isPaused = task.lifecycleStatus === 'paused';
  const isArchived = task.lifecycleStatus === 'archived';
  const isPendingReview = task.lifecycleStatus === 'pending_removal_review';

  const handlePause = () => {
    TaskLifecycleService.pauseTask(patientId, task.id, userRole === 'caregiver' ? 'caregiver' : 'patient');
    setStatusMessage('Task has been paused comfortably. No reminders will trigger.');
    onTaskUpdated();
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 1500);
  };

  const handleResume = () => {
    TaskLifecycleService.resumeTask(patientId, task.id, userRole === 'caregiver' ? 'caregiver' : 'patient');
    setStatusMessage('Task has been resumed to your active schedule.');
    onTaskUpdated();
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 1500);
  };

  const handleArchive = () => {
    const res = TaskLifecycleService.archiveTask(patientId, task.id, {
      reasonCode: selectedReason,
      explanation: explanation.trim() || undefined,
      requestedBy: userRole === 'caregiver' ? 'caregiver' : 'patient',
      requestedAt: new Date().toISOString(),
      status: task.isClinicianPrescribed ? 'pending_review' : 'archived',
    });

    if (res?.pendingReview) {
      setStatusMessage(
        'Removal requested. Because this is doctor-prescribed, your caregiver or clinician will confirm before permanent removal. You can pause or skip it today freely.'
      );
    } else {
      setStatusMessage('Task archived safely. All your historical records remain completely preserved.');
    }

    onTaskUpdated();
    setTimeout(() => {
      setStatusMessage(null);
      setActiveAction('view');
      onClose();
    }, 2000);
  };

  const handleRestore = () => {
    TaskLifecycleService.restoreTask(patientId, task.id, userRole === 'caregiver' ? 'caregiver' : 'patient');
    setStatusMessage('Task restored from archive to active schedule.');
    onTaskUpdated();
    setTimeout(() => {
      setStatusMessage(null);
      setActiveAction('view');
      onClose();
    }, 1500);
  };

  const summary = TaskLifecycleService.getTaskHistorySummary(patientId, task.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lifecycle-modal-title"
    >
      <div className="bg-white max-w-lg w-full rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-purple-200 my-auto flex flex-col space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-purple-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                {task.category.toUpperCase()} • {task.scheduledTime}
              </span>
              {task.isClinicianPrescribed && (
                <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                  {t('routines.weekly_prescribed')}
                </span>
              )}
            </div>
            <h3
              id="lifecycle-modal-title"
              className="text-base sm:text-lg font-black text-slate-900 font-heading mt-1"
            >
              {getTranslatedRoutineTitle(task.title, t)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div
            className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-semibold text-purple-900 flex items-center gap-2 animate-in fade-in"
            role="status"
          >
            <Info className="w-4 h-4 text-purple-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* View Details Mode */}
        {activeAction === 'view' && (
          <div className="space-y-4 text-left">
            <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>

            {/* Quick Summary Stats (Non-diagnostic) */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">{t('routines.lifecycle_scheduled')}</span>
                <span className="text-base font-black text-slate-800">{summary?.totalScheduled || 0}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">{t('routines.hist_completed')}</span>
                <span className="text-base font-black text-emerald-700">{summary?.reportedCompleted || 0}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">{t('routines.hist_assisted')}</span>
                <span className="text-base font-black text-purple-700">{summary?.reportedWithHelp || 0}</span>
              </div>
            </div>

            {/* Status Alert if not active */}
            {isPaused && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                <Pause className="w-4 h-4 text-amber-600 shrink-0" />
                <span>This activity is currently paused. Tap "Resume Activity" when ready.</span>
              </div>
            )}

            {isArchived && (
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-800 flex items-center gap-2">
                <Archive className="w-4 h-4 text-slate-600 shrink-0" />
                <span>This activity is archived. Its history is safe and it can be restored anytime.</span>
              </div>
            )}

            {isPendingReview && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Doctor-prescribed activity: Removal requested, pending clinician/caregiver confirmation.</span>
              </div>
            )}

            {/* Actions Row */}
            <div className="flex flex-wrap gap-2 pt-2">
              {!isArchived ? (
                <>
                  {isPaused ? (
                    <button
                      type="button"
                      onClick={handleResume}
                      className="flex-1 min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Play className="w-4 h-4" />
                      {t('routines.lifecycle_resume_btn')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePause}
                      className="flex-1 min-h-[44px] py-2.5 px-4 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Pause className="w-4 h-4" />
                      {t('routines.lifecycle_pause_btn')}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveAction('archive')}
                    className="flex-1 min-h-[44px] py-2.5 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Archive className="w-4 h-4" />
                    {t('routines.lifecycle_remove_btn')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleRestore}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('routines.lifecycle_restore_btn')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Archive / Removal Request Confirmation Mode */}
        {activeAction === 'archive' && (
          <div className="space-y-3 text-left">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <h4 className="text-xs font-black text-purple-900 uppercase tracking-wide">
                Why would you like to remove this activity?
              </h4>
              <p className="text-[11px] text-purple-800 mt-0.5">
                Your past completed history will never be lost. Please select a gentle reason:
              </p>
            </div>

            <div className="space-y-1.5">
              {[
                { code: 'no_longer_needed', label: 'I no longer need this activity' },
                { code: 'schedule_changed', label: 'My daily schedule has changed' },
                { code: 'pause_instead', label: 'I want to pause it for now instead' },
                { code: 'incorrect_task', label: 'This activity is incorrect or outdated' },
                { code: 'replace_task', label: 'I want to replace it with a new activity' },
                { code: 'other', label: 'Other reason' },
              ].map((opt) => (
                <label
                  key={opt.code}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                    selectedReason === opt.code
                      ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="removalReason"
                    value={opt.code}
                    checked={selectedReason === opt.code}
                    onChange={() => setSelectedReason(opt.code as RemovalReasonCode)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Optional note (in simple words):
              </label>
              <input
                type="text"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="e.g. Completed during afternoon walk instead"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveAction('view')}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition min-h-[44px]"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={handleArchive}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition min-h-[44px]"
              >
                {t('routines.lifecycle_confirm_removal')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
