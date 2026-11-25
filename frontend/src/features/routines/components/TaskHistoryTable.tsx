import React, { useState } from 'react';
import { DailyTaskInstance } from '../types/taskLifecycle.types.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getTranslatedRoutineTitle } from '../utils/routineTranslation.js';
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  Calendar,
  User,
  Heart,
  Filter,
} from 'lucide-react';

interface TaskHistoryTableProps {
  instances: DailyTaskInstance[];
  language?: string;
}

export const TaskHistoryTable: React.FC<TaskHistoryTableProps> = ({
  instances,
  language: _language = 'en',
}) => {
  const { t } = useLanguage();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = instances.filter((inst) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'completed') {
      return inst.status === 'completed' || inst.status === 'completed_assisted';
    }
    if (filterStatus === 'assisted') return inst.status === 'completed_assisted';
    if (filterStatus === 'skipped') return inst.status === 'skipped';
    if (filterStatus === 'unconfirmed') return inst.status === 'unconfirmed';
    return true;
  });

  return (
    <div className="space-y-4" data-testid="task-history-table">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-purple-600" />
          <span>{t('routines.hist_show')}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'all', label: t('routines.hist_all') },
            { id: 'completed', label: t('routines.hist_completed') },
            { id: 'assisted', label: t('routines.hist_assisted') },
            { id: 'skipped', label: t('routines.hist_skipped') },
            { id: 'unconfirmed', label: t('routines.hist_unconfirmed') },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setFilterStatus(btn.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition min-h-[36px] ${
                filterStatus === btn.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-3xl space-y-2">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">{t('routines.hist_empty_title')}</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {t('routines.hist_empty_desc')}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((inst) => {
            const isCompleted = inst.status === 'completed';
            const isAssisted = inst.status === 'completed_assisted';
            const isSkipped = inst.status === 'skipped';
            const isSnoozed = inst.status === 'snoozed';
            const isUnconfirmed = inst.status === 'unconfirmed';

            const attribution = inst.completionAttribution;
            const reporterLabel =
              attribution?.reportedBy === 'patient'
                ? t('routines.hist_reported_you')
                : attribution?.reportedBy === 'caregiver'
                ? t('routines.hist_observed_caregiver')
                : t('routines.hist_system_recorded');

            return (
              <div
                key={inst.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-purple-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
              >
                {/* Left Info */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      {inst.category} • {inst.scheduledTime}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">
                      📅 {inst.date}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {getTranslatedRoutineTitle(inst.title, t)}
                  </h4>

                  {/* Attribution & Context */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                      <User className="w-3 h-3 text-slate-500" />
                      {reporterLabel}
                    </span>

                    {attribution?.completionType === 'with_help' && (
                      <span className="flex items-center gap-1 text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        <Heart className="w-3 h-3 text-purple-600" />
                        Supported with help
                      </span>
                    )}

                    {inst.completedAt && (
                      <span className="text-slate-500">
                        🕒 Reported at {inst.completedAt}
                      </span>
                    )}

                    {inst.skipReason && (
                      <span className="text-amber-700 font-medium">
                        (Peaceful skip: {inst.skipReason})
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Status Badge */}
                <div className="shrink-0 flex items-center">
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {t('routines.hist_completed')}
                    </span>
                  )}
                  {isAssisted && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                      <Heart className="w-3.5 h-3.5 text-purple-600" />
                      {t('routines.hist_status_assisted')}
                    </span>
                  )}
                  {isSkipped && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {t('routines.hist_status_skipped')}
                    </span>
                  )}
                  {isSnoozed && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Snoozed until {inst.snoozeUntil}
                    </span>
                  )}
                  {isUnconfirmed && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      {t('routines.hist_unconfirmed')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
