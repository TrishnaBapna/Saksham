import React, { useState, useEffect } from 'react';
import {
  getPersonalisationTrialState,
  getTrialReviewSummary,
  loadDemoTrialData,
} from '@/services/personalizationService';
import { PersonalisationTrialState } from '@/types/firestore';
import { Button } from '@/components/ui/Button';

interface Props {
  patientUid: string;
  patientName: string;
}

export const ClinicalTrialSummaryViewer: React.FC<Props> = ({
  patientUid,
  patientName,
}) => {
  const [trial, setTrial] = useState<PersonalisationTrialState | null>(null);
  const [lastFreshness, setLastFreshness] = useState<string>('Just now');
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (patientUid) {
      setTrial(getPersonalisationTrialState(patientUid));
      setLastFreshness(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  }, [patientUid]);

  const handleLoadDemo = () => {
    const demo = loadDemoTrialData(patientUid);
    setTrial({ ...demo });
    setLastFreshness(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (!trial) return null;

  const summary = getTrialReviewSummary(patientUid);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
      {/* Top Header & Data Freshness Indicator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Module 8: Healthcare Telemetry &amp; Trial Review
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Freshness: Synced ({lastFreshness})
            </span>
          </div>
          <h3 className="text-base font-black text-gray-900 mt-1">
            Clinical Consultation Summary — {patientName}
          </h3>
          <p className="text-xs text-gray-500">
            Objective adherence, observed difficulties, and assistive option utility (Non-Diagnostic Framing)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleLoadDemo} className="text-xs">
            🧪 Load 7-Day Demo
          </Button>
          <Button size="sm" onClick={() => setShowExportModal(true)} className="text-xs">
            📄 Export Consultation Report
          </Button>
        </div>
      </div>

      {/* Structured Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 rounded-xl border border-gray-100 text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase block">Trial Progress</span>
          <span className="text-lg font-black text-gray-900">{trial.completedDays.length} / 7 Days</span>
        </div>
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
          <span className="text-[10px] font-bold text-amber-800 uppercase block">Reported Difficulties</span>
          <span className="text-lg font-black text-amber-950">{summary.totalDifficulties}</span>
        </div>
        <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 text-center">
          <span className="text-[10px] font-bold text-teal-800 uppercase block">Helpful Assist Options</span>
          <span className="text-lg font-black text-teal-950">{summary.helpfulOptions.length}</span>
        </div>
        <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-center">
          <span className="text-[10px] font-bold text-purple-800 uppercase block">Caregiver Support Requests</span>
          <span className="text-lg font-black text-purple-950">{summary.humanAssistanceRequests.length}</span>
        </div>
      </div>

      {/* Difficulty Breakdown by Category */}
      <div className="space-y-2">
        <span className="text-xs font-black text-gray-800 block">
          Reported Difficulties by Domain
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {Object.entries(summary.byCategory).map(([cat, count]) => (
            <div
              key={cat}
              className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between"
            >
              <span className="font-bold text-gray-700 capitalize">
                {cat.replace(/_/g, ' ')}
              </span>
              <span className="px-2 py-0.5 bg-gray-200 text-gray-800 rounded-lg text-xs font-bold">
                {Number(count)} {Number(count) === 1 ? 'incident' : 'incidents'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Non-Diagnostic Disclaimer Alert */}
      <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs text-sky-900 leading-relaxed flex items-start gap-2">
        <span className="font-bold">ℹ️ Non-Diagnostic Framing:</span>
        <span>
          This summary records observed activity completion, self-reported difficulties, and patient-approved
          assistance options. It does not generate clinical diagnoses or automated medication changes. Consult
          the attending neurologist for clinical evaluations.
        </span>
      </div>

      {/* Export / Print Preview Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-2xl border border-gray-200 p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h4 className="font-black text-base text-gray-900">
                Healthcare Consultation Summary — {patientName}
              </h4>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-700 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 font-mono space-y-2 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {`=============================================================
SAKSHAM HEALTHCARE CONSULTATION REPORT (NON-DIAGNOSTIC SUMMARY)
Patient: ${patientName}
Patient Identifier: ${patientUid}
Generated At: ${new Date().toISOString()}
Data Freshness: Synchronized from local and Firestore persistent cache
-------------------------------------------------------------
1. TRIAL & ADAPTIVE SUPPORT STATUS
Status: ${trial.status}
Completed Days: ${trial.completedDays.join(', ') || '1'} of 7
Guidance Preference: ${trial.baselinePreferences.guidanceStyle || 'step_by_step'}
Text Scaling Preference: ${trial.baselinePreferences.textSizePreference || 'large'}
Contrast Preference: ${trial.baselinePreferences.contrastPreference || 'standard'}

2. REPORTED ACTIVITY DIFFICULTIES
Total Incidents: ${summary.totalDifficulties}
Categorical Breakdown:
${Object.entries(summary.byCategory)
  .map(([cat, c]) => `  - ${cat.replace(/_/g, ' ')}: ${c}`)
  .join('\n')}

Recent Incidents Log:
${trial.difficultiesRecorded
  .map((d) => `  [${new Date(d.timestamp).toLocaleDateString()}] ${d.taskTitle}: ${d.difficultyCategory} (Assistance: ${d.assistanceSelected || 'none'})`)
  .join('\n') || '  No difficulties recorded'}

3. ASSISTANCE UTILITY RATINGS
Patient-Confirmed Helpful Options:
${summary.helpfulOptions.map((h) => `  - ${h.replace(/_/g, ' ')}`).join('\n') || '  None recorded'}

Options Found Unhelpful / Discontinued:
${summary.unhelpfulOptions.map((u) => `  - ${u.replace(/_/g, ' ')}`).join('\n') || '  None'}

4. CAREGIVER ASSISTANCE DISPATCHES
Tasks Requiring Human Support: ${summary.humanAssistanceRequests.length}
${trial.humanAssistanceRequestedTasks.map((t) => `  - Task ID ${t}`).join('\n') || '  None'}

=============================================================
CLINICAL DISCLAIMER:
This summary represents observational daily-life telemetry and
user-reported assistance preferences. It does not replace formal
neurological assessment, UPDRS examinations, or clinical judgment.
=============================================================`}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={() => setShowExportModal(false)}>
                Close
              </Button>
              <Button size="sm" onClick={handlePrint}>
                🖨️ Print / Save as PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
