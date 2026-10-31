import React, { useState, useEffect } from 'react';
import {
  getPersonalisationTrialState,
  getTrialReviewSummary,
  loadDemoTrialData,
} from '@/services/personalizationService';
import type { PersonalisationTrialState } from '@/types/firestore';
import { Button } from '@/components/ui/Button';

interface Props {
  patientUid: string;
  patientName: string;
  isAuthorized?: boolean;
}

export const ClinicalTrialSummaryViewer: React.FC<Props> = ({
  patientUid,
  patientName,
  isAuthorized = true,
}) => {
  const [trial, setTrial] = useState<PersonalisationTrialState | null>(null);
  const [lastFreshness, setLastFreshness] = useState<string>('Just now');
  const [showExportModal, setShowExportModal] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Authorization check
  if (!isAuthorized) {
    return (
      <div
        data-testid="clinician-unauthorized-banner"
        className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-xs space-y-2 text-amber-950"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔒</span>
          <h3 className="text-sm font-bold">Clinical Consent &amp; Authorization Pending</h3>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          Access to {patientName}'s daily-life functional telemetry is pending patient consent or clinical coordinator assignment.
          In accordance with privacy standards, clinical summary data is restricted until authorized.
        </p>
      </div>
    );
  }

  const summary = getTrialReviewSummary(patientUid);
  const patientDifficulties = trial.difficultiesRecorded.filter((d) => d.enteredBy !== 'caregiver');
  const caregiverObservations = trial.difficultiesRecorded.filter((d) => d.enteredBy === 'caregiver');
  const hasPendingSync = trial.difficultiesRecorded.some((r) => r.synced === false);

  const reportText = `=============================================================
SAKSHAM HEALTHCARE CONSULTATION REPORT (NON-DIAGNOSTIC SUMMARY)
Patient: ${patientName}
Patient Identifier: ${patientUid}
Generated At: ${new Date().toISOString()}
Data Freshness: Synchronized (${lastFreshness}) ${hasPendingSync ? '[Local Records Pending Sync]' : '[Cloud Synced]'}
-------------------------------------------------------------
1. FUNCTIONAL SUPPORT & TRIAL OVERVIEW
Trial Status: ${trial.status}
Completed Days: ${trial.completedDays.join(', ') || '1'} of 7
Guidance Preference: ${trial.baselinePreferences.guidanceStyle || 'step_by_step'}
Text Scaling: ${trial.baselinePreferences.textSizePreference || 'standard'}
Contrast Setting: ${trial.baselinePreferences.contrastPreference || 'standard'}
Adaptive Engine: ${trial.baselinePreferences.adaptiveAssistanceEnabled !== false ? 'Active' : 'Disabled'}

2. REPORTED ACTIVITY DIFFICULTIES BY DOMAIN
Total Recorded Incidents: ${summary.totalDifficulties}
${Object.entries(summary.byCategory).map(([cat, count]) => {
  const catIncidents = trial.difficultiesRecorded.filter(d => d.difficultyCategory === cat);
  const dates = catIncidents.map(i => new Date(i.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })).join(', ');
  return `  - ${cat.replace(/_/g, ' ')}: ${count} incident(s) [Dates: ${dates || 'N/A'}]`;
}).join('\n')}

3. PATIENT SELF-REPORTS VS CAREGIVER OBSERVATIONS
A. Patient Self-Reports (${patientDifficulties.length} entries):
${patientDifficulties.map(d => `  [${new Date(d.timestamp).toLocaleDateString()}] ${d.taskTitle}: ${d.difficultyCategory} (Assistance: ${d.assistanceSelected || 'none'}, Rating: ${d.helpfulRating}) - "${d.notes || 'None'}"`).join('\n') || '  No patient self-reported difficulties recorded.'}

B. Caregiver Observations (${caregiverObservations.length} entries):
${caregiverObservations.map(d => `  [${new Date(d.timestamp).toLocaleDateString()}] ${d.taskTitle}: ${d.difficultyCategory} - "${d.notes || 'None'}" [Attributed: Caregiver]`).join('\n') || '  No caregiver observations recorded.'}

4. ASSISTANCE UTILITY RATINGS
Patient-Confirmed Helpful Options:
${summary.helpfulOptions.map((h) => `  - ${h.replace(/_/g, ' ')}`).join('\n') || '  None recorded'}

Options Found Unhelpful / Discontinued:
${summary.unhelpfulOptions.map((u) => `  - ${u.replace(/_/g, ' ')}`).join('\n') || '  None recorded'}

5. CAREGIVER ASSISTANCE DISPATCHES
Tasks Requiring Human Assistance: ${summary.humanAssistanceRequests.length}
${trial.humanAssistanceRequestedTasks.map((t) => `  - Task ID ${t}`).join('\n') || '  None'}

=============================================================
NON-DIAGNOSTIC CLINICAL DISCLAIMER:
This summary represents observational daily-life functional support
needs and user-selected assistive options. It does not provide clinical
diagnoses, disease progression predictions, or medication directives.
All clinical evaluations require formal assessment by the attending physician.
=============================================================`;

  const handleCopyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
      {/* Top Header & Data Freshness Indicator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Module 8: Healthcare Telemetry &amp; Trial Review
            </span>
            <span
              data-testid="clinical-freshness-pill"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Freshness: Synced ({lastFreshness})
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                hasPendingSync
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {hasPendingSync ? '⏳ Pending Sync Records' : '☁️ Cloud Synced'}
            </span>
          </div>
          <h3 className="text-base font-black text-gray-900 mt-1">
            Clinical Consultation Summary — {patientName}
          </h3>
          <p className="text-xs text-gray-500">
            Objective adherence, observed daily-life support needs, and assistive option utility (Non-Diagnostic Framing)
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

      {/* Non-Diagnostic Disclaimer Alert */}
      <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs text-sky-900 leading-relaxed flex items-start gap-2">
        <span className="font-bold shrink-0">ℹ️ Non-Diagnostic Framing:</span>
        <span>
          This summary records observed activity completion, self-reported difficulties, and patient-approved
          assistance options. It does not generate clinical diagnoses, predict disease progression, or recommend medication. Consult
          the attending neurologist for clinical evaluations.
        </span>
      </div>

      {/* Missing Data or Incomplete Trial Notice */}
      {trial.completedDays.length === 0 ? (
        <div
          data-testid="clinical-missing-data-notice"
          className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <span>⚠️</span>
            <span>Missing Telemetry / Trial Incomplete</span>
          </div>
          <p className="text-[11px] text-amber-800">
            The patient has not completed baseline onboarding or trial days. Daily-life functional telemetry is currently unavailable.
          </p>
        </div>
      ) : summary.totalDifficulties === 0 ? (
        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <span>✓</span>
            <span>No Difficulties Recorded</span>
          </div>
          <p className="text-[11px] text-emerald-800">
            The patient recorded 0 task difficulties across completed trial days. Baseline routine was completed smoothly.
          </p>
        </div>
      ) : null}

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
          <span className="text-[10px] font-bold text-purple-800 uppercase block">Caregiver Dispatches</span>
          <span className="text-lg font-black text-purple-950">{summary.humanAssistanceRequests.length}</span>
        </div>
      </div>

      {/* Difficulty Breakdown by Category with Incident Dates */}
      <div className="space-y-2">
        <span className="text-xs font-black text-gray-800 block">
          Reported Difficulties by Domain &amp; Dates
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {Object.entries(summary.byCategory).map(([cat, count]) => {
            const catIncidents = trial.difficultiesRecorded.filter(d => d.difficultyCategory === cat);
            const dates = catIncidents.map(i => new Date(i.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })).join(', ');

            return (
              <div
                key={cat}
                className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700 capitalize">
                    {cat.replace(/_/g, ' ')}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-800 rounded-lg text-xs font-bold">
                    {Number(count)} {Number(count) === 1 ? 'incident' : 'incidents'}
                  </span>
                </div>
                {dates && (
                  <span className="text-[10px] text-gray-500">
                    Dates: <strong>{dates}</strong>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Attribution: Patient Reports vs Caregiver Observations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <span>👤 Patient Self-Reports ({patientDifficulties.length})</span>
            </span>
          </div>
          {patientDifficulties.length === 0 ? (
            <p className="text-gray-400 italic text-[11px]">No patient self-reported difficulties</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {patientDifficulties.map(d => (
                <div key={d.id} className="p-1.5 bg-white rounded-lg border border-slate-100 text-[11px]">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{d.taskTitle}</span>
                    <span className="text-teal-700">{d.difficultyCategory.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-[10px]">
                    <span>{new Date(d.timestamp).toLocaleDateString()}</span>
                    <span>Rating: {d.helpfulRating}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <span>🤝 Caregiver Support Observations ({caregiverObservations.length})</span>
            </span>
          </div>
          {caregiverObservations.length === 0 ? (
            <p className="text-gray-400 italic text-[11px]">No caregiver observations recorded</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {caregiverObservations.map(d => (
                <div key={d.id} className="p-1.5 bg-white rounded-lg border border-slate-100 text-[11px]">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{d.taskTitle}</span>
                    <span className="text-indigo-700">{d.difficultyCategory.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-gray-600 text-[10px] mt-0.5 truncate">
                    "{d.notes}"
                  </div>
                  <div className="text-gray-400 text-[9px]">
                    Observed on {new Date(d.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export / Print Preview Modal */}
      {showExportModal && (
        <div
          data-testid="clinical-export-modal"
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <div className="bg-white max-w-2xl w-full rounded-2xl border border-gray-200 p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h4 className="font-black text-base text-gray-900">
                Healthcare Consultation Summary — {patientName}
              </h4>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-700 font-bold text-lg cursor-pointer"
                aria-label="Close export modal"
              >
                &times;
              </button>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 font-mono space-y-2 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {reportText}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={() => setShowExportModal(false)}>
                Close
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCopyReport}>
                {copied ? '✓ Copied!' : '📋 Copy Report'}
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
