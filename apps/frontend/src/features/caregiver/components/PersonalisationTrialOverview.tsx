import React, { useState, useEffect } from 'react';
import {
  getPersonalisationTrialState,
  loadDemoTrialData,
  recordActivityDifficulty,
} from '@/services/personalizationService';
import type { PersonalisationTrialState, DifficultyCategory } from '@/types/firestore';
import { Button } from '@/components/ui/Button';

interface Props {
  patientUid: string;
  patientName: string;
  isAuthorized?: boolean;
  onAuditNoteAdded?: (note: string) => void;
}

export const PersonalisationTrialOverview: React.FC<Props> = ({
  patientUid,
  patientName,
  isAuthorized = true,
  onAuditNoteAdded,
}) => {
  const [trial, setTrial] = useState<PersonalisationTrialState | null>(null);
  const [observationCategory, setObservationCategory] = useState<string>('motor');
  const [observationTaskTitle, setObservationTaskTitle] = useState('General Routine Activity');
  const [observationNote, setObservationNote] = useState('');
  const [observationSaved, setObservationSaved] = useState(false);

  useEffect(() => {
    if (patientUid) {
      setTrial(getPersonalisationTrialState(patientUid));
    }
  }, [patientUid]);

  const handleLoadDemo = () => {
    const demo = loadDemoTrialData(patientUid);
    setTrial({ ...demo });
  };

  const handleRecordCaregiverObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !observationNote.trim()) return;

    const categoryMap: Record<string, DifficultyCategory> = {
      memory: 'instructions_complicated',
      motor: 'buttons_hard_to_tap',
      sequence: 'sequence_hard_to_remember',
      sensory: 'text_too_small',
      other: 'other',
    };

    const mappedCat = categoryMap[observationCategory] || 'other';

    // Record difficulty explicitly attributed to caregiver
    recordActivityDifficulty(patientUid, {
      taskId: Date.now(),
      taskTitle: observationTaskTitle.trim() || 'General Routine Activity',
      difficultyCategory: mappedCat,
      notes: observationNote.trim(),
      enteredBy: 'caregiver',
      helpfulRating: 'unrated',
    });

    if (onAuditNoteAdded) {
      onAuditNoteAdded(`[Caregiver Observation - ${observationCategory.toUpperCase()}]: ${observationNote.trim()}`);
    }

    setTrial(getPersonalisationTrialState(patientUid));
    setObservationSaved(true);
    setObservationNote('');
    setTimeout(() => setObservationSaved(false), 3000);
  };

  if (!trial) return null;

  // Authorization Guard
  if (!isAuthorized) {
    return (
      <div
        data-testid="caregiver-unauthorized-banner"
        className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-xs space-y-2 text-amber-950"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔒</span>
          <h3 className="text-sm font-bold">Care Circle Authorization Required</h3>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          Access to {patientName}'s personalization trial data and support records is pending authorization.
          The patient must grant caregiver access from their account before detailed logs can be reviewed or observations submitted.
        </p>
      </div>
    );
  }

  // Filter patient self-reports from caregiver observations
  const patientDifficulties = trial.difficultiesRecorded.filter(
    (r) => r.enteredBy !== 'caregiver'
  );
  const caregiverObservations = trial.difficultiesRecorded.filter(
    (r) => r.enteredBy === 'caregiver'
  );

  const hasPendingSync = trial.difficultiesRecorded.some((r) => r.synced === false);
  const pendingCount = trial.difficultiesRecorded.filter((r) => r.synced === false).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
      {/* Top Header & Sync Pill */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              Module 2: 7-Day Personalisation Trial
            </span>
            <span
              data-testid="caregiver-sync-status"
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                hasPendingSync
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {hasPendingSync ? `⏳ Pending Sync (${pendingCount} local)` : '☁️ All Data Synced'}
            </span>
          </div>
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

      {/* Trial Progress Bar & Read-Only Day Stepper */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-gray-700">
          <span>Current Trial Phase: Day {trial.currentDay} of 7</span>
          <span className="text-teal-700 font-extrabold capitalize">
            Status: {trial.status.replace('_', ' ')}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 pt-1" aria-label="Trial Day Progress (Read-Only)">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const isCompleted = trial.completedDays.includes(d);
            const isCurrent = trial.currentDay === d;
            return (
              <div
                key={d}
                className={`py-1.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center select-none ${
                  isCurrent
                    ? 'bg-teal-700 text-white shadow-xs ring-2 ring-teal-400'
                    : isCompleted
                    ? 'bg-teal-50 text-teal-900 border border-teal-200'
                    : 'bg-gray-100 text-gray-400'
                }`}
                title={`Day ${d} (${isCurrent ? 'Current' : isCompleted ? 'Completed' : 'Pending'})`}
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
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 italic">
          Trial progress is updated automatically as {patientName} interacts with daily tasks.
        </p>
      </div>

      {/* Active Baseline Support Preferences (Read-Only) */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-100 space-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="font-black text-gray-800 block text-[11px] uppercase tracking-wider">
            Active Support Preferences (Patient Configured — Read-Only)
          </span>
          <span className="text-[10px] text-gray-400 font-medium">🔒 Protected from silent modification</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-700">
          <div>
            <span className="text-gray-400 block text-[10px]">Guidance Style</span>
            <span className="font-bold capitalize">
              {trial.baselinePreferences.guidanceStyle?.replace(/_/g, ' ') || 'Step-by-step'}
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
              {trial.baselinePreferences.contrastPreference?.replace(/_/g, ' ') || 'Standard'}
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

      {/* Difficulties: Missing Data vs No Difficulties vs Difficulties List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-black text-gray-800 text-xs block">
            Reported Difficulties &amp; Caregiver Observations ({trial.difficultiesRecorded.length})
          </span>
        </div>

        {trial.completedDays.length === 0 && trial.difficultiesRecorded.length === 0 ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
            Trial Not Initiated: The patient has not yet started the 7-day personalization trial. No activity data recorded.
          </div>
        ) : trial.difficultiesRecorded.length === 0 ? (
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
            ✓ No Difficulties Reported: No difficulties have been reported by the patient or caregiver so far during completed trial days.
          </div>
        ) : (
          <div className="space-y-3">
            {/* 1. Patient Self-Reported Difficulties */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-teal-800 flex items-center gap-1">
                <span>👤 Patient Self-Reported Difficulties ({patientDifficulties.length})</span>
              </span>
              {patientDifficulties.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic pl-1">No patient self-reported difficulties recorded.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {patientDifficulties.map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs flex justify-between items-center"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-amber-950">{r.taskTitle}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold border border-teal-200">
                            👤 Patient Self-Report
                          </span>
                        </div>
                        <p className="text-amber-800 text-[11px]">
                          Category: <strong>{r.difficultyCategory.replace(/_/g, ' ')}</strong>
                          {r.notes ? ` — "${r.notes}"` : ''}
                        </p>
                        <span className="text-gray-500 text-[10px] block">
                          {new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                          {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {r.helpfulRating !== 'unrated' && (
                            <span className="ml-1.5 font-bold text-gray-700">
                              • Feedback: {r.helpfulRating === 'helpful' ? '👍 Helpful' : '👎 Not for me'}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        {r.assistanceSelected && (
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-900 font-bold rounded-lg text-[10px]">
                            {r.assistanceSelected.replace(/_/g, ' ')}
                          </span>
                        )}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                            r.synced === false
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-white text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {r.synced === false ? '⏳ Pending' : '☁️ Synced'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Caregiver Recorded Observations */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                <span>🤝 Caregiver Support Observations ({caregiverObservations.length})</span>
              </span>
              {caregiverObservations.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic pl-1">No caregiver observations recorded yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {caregiverObservations.map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs flex justify-between items-center"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-indigo-950">{r.taskTitle}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-bold border border-indigo-200">
                            🤝 Caregiver Observation
                          </span>
                        </div>
                        <p className="text-indigo-900 text-[11px]">
                          Domain: <strong>{r.difficultyCategory.replace(/_/g, ' ')}</strong>
                          {r.notes ? ` — "${r.notes}"` : ''}
                        </p>
                        <span className="text-gray-500 text-[10px] block">
                          Recorded on {new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                          {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                            r.synced === false
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-white text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {r.synced === false ? '⏳ Pending' : '☁️ Synced'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Helpful vs Unhelpful Assistance Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
          <span className="font-black text-emerald-900 block flex items-center gap-1">
            <span>👍 Patient-Confirmed Helpful Options</span>
          </span>
          <div className="flex flex-wrap gap-1 pt-1">
            {trial.helpfulAssistanceOptions.length === 0 ? (
              <span className="text-emerald-700 italic text-[11px]">No options rated helpful yet</span>
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
            <span>👎 Patient-Discontinued Options</span>
          </span>
          <div className="flex flex-wrap gap-1 pt-1">
            {trial.unhelpfulAssistanceOptions.length === 0 ? (
              <span className="text-gray-500 italic text-[11px]">No options discontinued</span>
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

      {/* Caregiver Support Observation Form (Authorized Only) */}
      <form onSubmit={handleRecordCaregiverObservation} className="pt-3 border-t border-gray-100 space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="caregiver-observation-notes" className="block text-xs font-bold text-gray-800">
            Record Caregiver Support Observation
          </label>
          <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
            Attributed as Caregiver Observation
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label htmlFor="caregiver-observation-cat" className="block text-[10px] text-gray-500 font-bold mb-1">
              Observation Domain
            </label>
            <select
              id="caregiver-observation-cat"
              aria-label="Observation Domain"
              value={observationCategory}
              onChange={(e) => setObservationCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs bg-gray-50 text-gray-800 focus:outline-teal-600"
            >
              <option value="motor">Motor / Movement (Tremor or physical difficulty)</option>
              <option value="memory">Memory (Remembering what to do)</option>
              <option value="sequence">Steps / Sequencing (Order of operations)</option>
              <option value="sensory">Sensory (Vision, font size, contrast)</option>
              <option value="other">Other daily observation</option>
            </select>
          </div>

          <div>
            <label htmlFor="caregiver-observation-task" className="block text-[10px] text-gray-500 font-bold mb-1">
              Routine Task / Context
            </label>
            <input
              id="caregiver-observation-task"
              aria-label="Routine Task / Context"
              type="text"
              value={observationTaskTitle}
              onChange={(e) => setObservationTaskTitle(e.target.value)}
              placeholder="e.g., Morning Dressing or General Routine"
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs bg-gray-50 text-gray-800 focus:outline-teal-600"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <input
            id="caregiver-observation-notes"
            aria-label="Observation Description"
            type="text"
            value={observationNote}
            onChange={(e) => setObservationNote(e.target.value)}
            placeholder="e.g., Patient felt steadier when step-by-step cueing was active..."
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-teal-600"
          />
          <Button type="submit" size="sm" className="text-xs shrink-0 bg-indigo-700 hover:bg-indigo-800 text-white">
            Record Observation
          </Button>
        </div>

        {observationSaved && (
          <span className="text-emerald-700 font-bold text-xs block">
            ✓ Caregiver observation recorded and attributed to Caregiver.
          </span>
        )}
      </form>
    </div>
  );
};
