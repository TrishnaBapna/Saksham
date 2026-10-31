import React, { useState, useEffect } from 'react';
import {
  getPersonalisationTrialState,
  loadDemoTrialData,
  setTrialDay,
} from '@/services/personalizationService';
import { PersonalisationTrialState, TrialDayNumber } from '@/types/firestore';
import { Button } from '@/components/ui/Button';

interface Props {
  patientUid: string;
  patientName: string;
  onAuditNoteAdded?: (note: string) => void;
}

export const PersonalisationTrialOverview: React.FC<Props> = ({
  patientUid,
  patientName,
  onAuditNoteAdded,
}) => {
  const [trial, setTrial] = useState<PersonalisationTrialState | null>(null);
  const [auditNote, setAuditNote] = useState('');
  const [auditSaved, setAuditSaved] = useState(false);

  useEffect(() => {
    if (patientUid) {
      setTrial(getPersonalisationTrialState(patientUid));
    }
  }, [patientUid]);

  const handleLoadDemo = () => {
    const demo = loadDemoTrialData(patientUid);
    setTrial({ ...demo });
  };

  const handleSelectDay = (day: number) => {
    if (day >= 1 && day <= 7) {
      const updated = setTrialDay(patientUid, day as TrialDayNumber);
      setTrial({ ...updated });
    }
  };

  const handleAddAuditNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditNote.trim()) return;
    if (onAuditNoteAdded) onAuditNoteAdded(auditNote.trim());
    setAuditSaved(true);
    setAuditNote('');
    setTimeout(() => setAuditSaved(false), 2500);
  };

  if (!trial) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
            Module 2: 7-Day Personalisation Trial
          </span>
          <h3 className="text-base font-black text-gray-900 mt-1">
            Care Support &amp; Trial Overview for {patientName}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleLoadDemo}
            className="text-xs"
          >
            🧪 Load 7-Day Demo
          </Button>
        </div>
      </div>

      {/* Trial Progress Bar & Day Stepper */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-gray-700">
          <span>Current Trial Phase: Day {trial.currentDay} of 7</span>
          <span className="text-teal-700 font-extrabold capitalize">
            Status: {trial.status.replace('_', ' ')}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const isCompleted = trial.completedDays.includes(d);
            const isCurrent = trial.currentDay === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => handleSelectDay(d)}
                className={`py-1.5 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                  isCurrent
                    ? 'bg-teal-700 text-white shadow-xs ring-2 ring-teal-400'
                    : isCompleted
                    ? 'bg-teal-50 text-teal-900 border border-teal-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <span>D{d}</span>
                <span className="text-[9px] font-normal">
                  {d === 1
                    ? 'Base'
                    : d <= 3
                    ? 'Diff'
                    : d <= 5
                    ? 'Assist'
                    : 'Review'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Baseline Support Preferences */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-100 space-y-1.5 text-xs">
        <span className="font-black text-gray-800 block text-[11px] uppercase tracking-wider">
          Active Support Preferences
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-700">
          <div>
            <span className="text-gray-400 block text-[10px]">Guidance Style</span>
            <span className="font-bold capitalize">
              {trial.baselinePreferences.guidanceStyle?.replace('_', ' ') || 'Step-by-step'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">Text Size</span>
            <span className="font-bold capitalize">
              {trial.baselinePreferences.textSizePreference || 'Standard'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">Contrast</span>
            <span className="font-bold capitalize">
              {trial.baselinePreferences.contrastPreference?.replace('_', ' ') || 'Standard'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">Adaptive Engine</span>
            <span className="font-bold text-teal-700">
              {trial.baselinePreferences.adaptiveAssistanceEnabled !== false
                ? 'Active'
                : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Reported Difficulties List */}
      <div className="space-y-2">
        <span className="font-black text-gray-800 text-xs block">
          Reported Difficulties ({trial.difficultiesRecorded.length})
        </span>
        {trial.difficultiesRecorded.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-2">
            No difficulties recorded yet. Tap "Load 7-Day Demo" to preview sample trial logs.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {trial.difficultiesRecorded.map((r) => (
              <div
                key={r.id}
                className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs flex justify-between items-center"
              >
                <div>
                  <span className="font-black text-amber-950">{r.taskTitle}</span>
                  <span className="text-amber-800 text-[11px] ml-1.5">
                    • {r.difficultyCategory.replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-500 text-[10px] block mt-0.5">
                    Entered by {r.enteredBy} • {new Date(r.timestamp).toLocaleDateString()}
                  </span>
                </div>
                {r.assistanceSelected && (
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-900 font-bold rounded-lg text-[10px] shrink-0">
                    {r.assistanceSelected.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Helpful vs Unhelpful Assistance Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
          <span className="font-black text-emerald-900 block flex items-center gap-1">
            <span>👍 Helpful Assistive Options</span>
          </span>
          <div className="flex flex-wrap gap-1 pt-1">
            {trial.helpfulAssistanceOptions.length === 0 ? (
              <span className="text-emerald-700 italic text-[11px]">None recorded</span>
            ) : (
              trial.helpfulAssistanceOptions.map((opt, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-emerald-200/70 text-emerald-950 rounded-lg text-[10px] font-bold"
                >
                  {opt.replace(/_/g, ' ')}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-xs">
          <span className="font-black text-gray-800 block flex items-center gap-1">
            <span>👎 Unhelpful Options (Skipped)</span>
          </span>
          <div className="flex flex-wrap gap-1 pt-1">
            {trial.unhelpfulAssistanceOptions.length === 0 ? (
              <span className="text-gray-500 italic text-[11px]">None recorded</span>
            ) : (
              trial.unhelpfulAssistanceOptions.map((opt, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-gray-200 text-gray-800 rounded-lg text-[10px] font-bold"
                >
                  {opt.replace(/_/g, ' ')}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Caregiver Observation / Audit Note */}
      <form onSubmit={handleAddAuditNote} className="pt-2 border-t border-gray-100 space-y-2">
        <label className="block text-xs font-bold text-gray-700">
          Caregiver Support Observation / Audit Note
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={auditNote}
            onChange={(e) => setAuditNote(e.target.value)}
            placeholder="e.g., Patient felt steadier when step-by-step cueing was active..."
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-teal-600"
          />
          <Button type="submit" size="sm" className="text-xs shrink-0">
            Save Note
          </Button>
        </div>
        {auditSaved && (
          <span className="text-emerald-700 font-bold text-xs">
            ✓ Support note recorded to audit trail.
          </span>
        )}
      </form>
    </div>
  );
};

