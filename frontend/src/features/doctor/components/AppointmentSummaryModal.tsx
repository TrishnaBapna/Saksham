/**
 * SAKSHAM NEURO-CARE — STAGE 3 PHASE D
 * Clinical Appointment Summary & Export Modal
 * Generates an appointment-ready longitudinal brief for doctor consultations with
 * category selection, caregiver discussion questions, non-diagnostic disclaimers,
 * and client-side print export (100% Spark Free Plan compliant).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  Printer,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  LongitudinalReportService,
  MANDATORY_CLINICAL_DISCLAIMER,
  PRIVACY_EXCLUSION_NOTICE,
} from '../services/longitudinalReportService.js';
import {
  AppointmentSummary,
  SummaryCategory,
} from '../types/longitudinal.types.js';
import type { ClinicalAssessmentRecord } from '../../clinical/types/concern.types.js';
import { RecordClinicalAssessmentModal } from '../../clinical/components/RecordClinicalAssessmentModal.js';

interface AppointmentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  authorId: string;
  authorName: string;
  authorRole: 'doctor' | 'caregiver' | 'patient';
}

const CAREGIVER_PRESET_QUESTIONS = [
  'Which daily activities have shown the most friction or pauses lately?',
  'Does the patient seem more comfortable with smaller steps or familiar routines?',
  'Should routine timing or medication schedule be adjusted for afternoon fatigue?',
  'Are there recommended non-pharmacological calming techniques for moments of agitation?',
];

const PATIENT_PRESET_QUESTIONS = [
  'What should we do when remembering a routine becomes difficult?',
  'What level of assistance is most helpful without making me feel rushed?',
  'Are there ways to make morning and evening activities feel more calm and familiar?',
  'How can my caregiver and I best work together on daily routines?',
];

export const AppointmentSummaryModal: React.FC<AppointmentSummaryModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  authorId,
  authorName,
  authorRole,
}) => {
  const [periodDays, setPeriodDays] = useState<7 | 30 | 90>(30);
  const [includedCategories, setIncludedCategories] = useState<SummaryCategory[]>([
    'routines',
    'games',
    'adaptive',
    'caregiver_notes',
    'concerns',
    'clinical_assessments',
  ]);
  const [questions, setQuestions] = useState<string[]>(() =>
    authorRole === 'patient'
      ? [
          'What should we do when remembering a routine becomes difficult?',
          'What level of assistance is most helpful without making me feel rushed?',
        ]
      : [
          'Which daily activities have shown the most friction or pauses lately?',
          'Does the patient seem more comfortable with smaller steps or familiar routines?',
        ]
  );
  const [newQuestionText, setNewQuestionText] = useState<string>('');

  const presetQuestions =
    authorRole === 'patient' ? PATIENT_PRESET_QUESTIONS : CAREGIVER_PRESET_QUESTIONS;

  const [summary, setSummary] = useState<AppointmentSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'customize' | 'preview'>('preview');
  const [amendingAssessment, setAmendingAssessment] = useState<ClinicalAssessmentRecord | null>(null);

  // Compute date range
  const getDateRange = useCallback(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (periodDays - 1));
    return {
      startDate: start.toISOString().substring(0, 10),
      endDate: end.toISOString().substring(0, 10),
      label: `Past ${periodDays} Days (${start.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      })} - ${end.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })})`,
    };
  }, [periodDays]);

  // Generate summary preview
  const refreshSummary = useCallback(async () => {
    if (!isOpen || !patientId) return;
    setIsGenerating(true);
    try {
      const { startDate, endDate, label } = getDateRange();
      const generated = await LongitudinalReportService.generateAppointmentSummary(
        patientId,
        patientName,
        {
          startDate,
          endDate,
          label,
          authorId,
          authorName,
          authorRole,
          includedCategories,
          caregiverQuestions: questions,
        }
      );
      setSummary(generated);
    } catch (err) {
      console.warn('[AppointmentSummaryModal] Failed to generate summary:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [isOpen, patientId, patientName, getDateRange, authorId, authorName, authorRole, includedCategories, questions]);

  useEffect(() => {
    if (isOpen) {
      refreshSummary();
    }
  }, [isOpen, refreshSummary]);

  if (!isOpen) return null;

  const toggleCategory = (cat: SummaryCategory) => {
    setIncludedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    setQuestions((prev) => [...prev, newQuestionText.trim()]);
    setNewQuestionText('');
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPreset = (preset: string) => {
    if (!questions.includes(preset)) {
      setQuestions((prev) => [...prev, preset]);
    }
  };

  const handlePrint = async () => {
    if (summary) {
      await LongitudinalReportService.saveAppointmentSummary(summary);
    }
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="bg-gradient-to-r from-blue-800 to-indigo-800 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="summary-modal-title" className="text-lg font-bold">
                Clinical Appointment Brief & Longitudinal Summary
              </h2>
              <p className="text-xs text-blue-100">
                Patient: {patientName} • Prepared for Doctor Consultation
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              data-testid="print-summary-btn"
              onClick={handlePrint}
              disabled={isGenerating || !summary}
              className="px-3.5 py-1.5 bg-white text-indigo-900 hover:bg-blue-50 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Preview Appointment Brief
            </button>
            <button
              type="button"
              data-testid="tab-customize-brief"
              onClick={() => setActiveTab('customize')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                activeTab === 'customize'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Customize Content & Questions ({questions.length})
            </button>
          </div>

          <div className="text-2xs text-gray-500 hidden sm:block">
            100% Spark Free • Client-Side Export
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'customize' ? (
            /* Customization Form */
            <div className="space-y-6">
              {/* 1. Reporting Window */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Reporting Window
                </label>
                <div className="flex items-center space-x-2">
                  {[7, 30, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setPeriodDays(days as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                        periodDays === days
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      Past {days} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Included Categories */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Included Summary Categories
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleCategory('routines')}
                    className="flex items-center space-x-2 p-2.5 bg-white rounded-xl border border-gray-200 text-left font-medium text-gray-800"
                  >
                    {includedCategories.includes('routines') ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-300" />
                    )}
                    <span>Daily Routine Participation & Cues</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCategory('games')}
                    className="flex items-center space-x-2 p-2.5 bg-white rounded-xl border border-gray-200 text-left font-medium text-gray-800"
                  >
                    {includedCategories.includes('games') ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-300" />
                    )}
                    <span>Cognitive Activities & Pauses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCategory('adaptive')}
                    className="flex items-center space-x-2 p-2.5 bg-white rounded-xl border border-gray-200 text-left font-medium text-gray-800"
                  >
                    {includedCategories.includes('adaptive') ? (
                      <CheckSquare className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-300" />
                    )}
                    <span>Adaptive Scaffolding & Patient Choices</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCategory('caregiver_notes')}
                    className="flex items-center space-x-2 p-2.5 bg-white rounded-xl border border-gray-200 text-left font-medium text-gray-800"
                  >
                    {includedCategories.includes('caregiver_notes') ? (
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-300" />
                    )}
                    <span>Caregiver Functional Notes</span>
                  </button>

                  <button
                    type="button"
                    data-testid="toggle-category-concerns"
                    onClick={() => toggleCategory('concerns')}
                    className="flex items-center space-x-2 p-2.5 bg-white rounded-xl border border-gray-200 text-left font-medium text-gray-800"
                  >
                    {includedCategories.includes('concerns') ? (
                      <CheckSquare className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-300" />
                    )}
                    <span>Shared Cognitive & Functional Concerns</span>
                  </button>

                  <button
                    type="button"
                    data-testid="toggle-category-clinical-assessments"
                    onClick={() => toggleCategory('clinical_assessments')}
                    className="flex items-center space-x-2 p-2.5 bg-white rounded-xl border border-gray-200 text-left font-medium text-gray-800"
                  >
                    {includedCategories.includes('clinical_assessments') ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-300" />
                    )}
                    <span>Formal Clinical Assessment Records</span>
                  </button>
                </div>
              </div>

              {/* 3. Questions to Discuss with Doctor */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Questions to Discuss with Doctor ({questions.length})
                  </label>
                  <span className="text-3xs text-gray-400">
                    {authorRole === 'patient'
                      ? 'Empowering patients during doctor consultations'
                      : 'Empowering caregivers during OPD appointments'}
                  </span>
                </div>

                {/* Add new question */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    data-testid="input-appointment-question"
                    placeholder="Add a question or concern to discuss during consultation..."
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddQuestion();
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    data-testid="btn-add-question"
                    onClick={handleAddQuestion}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Preset Suggestions */}
                <div className="space-y-1">
                  <span className="text-3xs text-gray-500 font-semibold uppercase">
                    Suggested Discussion Prompts:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {presetQuestions.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddPreset(preset)}
                        className="text-3xs bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200 rounded-lg px-2.5 py-1 text-left transition"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question List */}
                <div className="space-y-1.5 pt-2">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between p-2.5 bg-white rounded-xl border border-gray-200 text-xs text-gray-800"
                    >
                      <span className="flex-1 leading-relaxed">
                        {idx + 1}. {q}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="p-1 text-gray-400 hover:text-rose-600 transition ml-2"
                        title="Remove question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Apply & View Summary Preview
                </button>
              </div>
            </div>
          ) : (
            /* Printable Preview Sheet */
            <div
              id="printable-appointment-brief"
              data-testid="printable-appointment-brief"
              className="bg-white border-2 border-gray-200 rounded-2xl p-6 md:p-8 space-y-6 text-gray-900 print:border-0 print:p-0"
            >
              {/* Document Header */}
              <div className="border-b-2 border-indigo-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-indigo-800 font-black text-xl tracking-tight flex items-center gap-1.5">
                    <span>SAKSHAM NEURO-CARE</span>
                    <span className="text-xs bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full font-bold">
                      CLINICAL BRIEF
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Longitudinal Functional Activity Summary & Consultation Aid
                  </div>
                </div>

                <div className="text-right text-3xs text-gray-500">
                  <div>
                    Generated: {summary?.generatedAt ? new Date(summary.generatedAt).toLocaleDateString() : ''}
                  </div>
                  <div>Prepared By: {summary?.generatedBy.name} ({summary?.generatedBy.role})</div>
                </div>
              </div>

              {/* Patient & Window Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3.5 rounded-xl text-xs border border-gray-200">
                <div>
                  <span className="text-3xs uppercase text-gray-400 font-bold block">Patient</span>
                  <span className="font-extrabold text-gray-900">{patientName}</span>
                </div>
                <div>
                  <span className="text-3xs uppercase text-gray-400 font-bold block">Patient ID</span>
                  <span className="font-mono text-gray-800">{patientId}</span>
                </div>
                <div>
                  <span className="text-3xs uppercase text-gray-400 font-bold block">Reporting Window</span>
                  <span className="font-bold text-gray-800">{summary?.reportingPeriod.label}</span>
                </div>
                <div>
                  <span className="text-3xs uppercase text-gray-400 font-bold block">Observed Events</span>
                  <span className="font-bold text-indigo-800">
                    {summary?.timeline.length || 0} Records
                  </span>
                </div>
              </div>

              {/* Section 1: Executive Metrics Summary */}
              {summary && (
                <div className="space-y-3">
                  <h3 className="font-black text-sm uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <span>1. Objective Behavioral Metrics</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Routine Participation */}
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                      <span className="text-3xs font-bold uppercase text-emerald-800 block">
                        Routine Participation
                      </span>
                      <div className="text-lg font-black text-emerald-950 mt-0.5">
                        {summary.metrics.routineParticipation.completionRatePercent}%
                      </div>
                      <span className="text-3xs text-emerald-700">
                        {summary.metrics.routineParticipation.completedCount} completed of{' '}
                        {summary.metrics.routineParticipation.totalScheduled} scheduled
                      </span>
                    </div>

                    {/* Cognitive Sessions */}
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                      <span className="text-3xs font-bold uppercase text-blue-800 block">
                        Cognitive Exercises
                      </span>
                      <div className="text-lg font-black text-blue-950 mt-0.5">
                        {summary.metrics.cognitiveActivities.totalSessions} Sessions
                      </div>
                      <span className="text-3xs text-blue-700">
                        {summary.metrics.cognitiveActivities.interruptedSessions} paused / incomplete
                      </span>
                    </div>

                    {/* Assisted Recall Cues */}
                    <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200">
                      <span className="text-3xs font-bold uppercase text-purple-800 block">
                        Assisted Recall Cues
                      </span>
                      <div className="text-lg font-black text-purple-950 mt-0.5">
                        {summary.metrics.assistancePatterns.routineCueEscalations} Events
                      </div>
                      <span className="text-3xs text-purple-700">
                        Zero-pressure progressive scaffolding
                      </span>
                    </div>

                    {/* Adaptive Support Changes */}
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                      <span className="text-3xs font-bold uppercase text-amber-800 block">
                        Support Adjustments
                      </span>
                      <div className="text-lg font-black text-amber-950 mt-0.5">
                        {summary.metrics.adaptiveHistory.totalProposals} Evaluated
                      </div>
                      <span className="text-3xs text-amber-700">
                        {summary.metrics.adaptiveHistory.acceptedCount} accepted,{' '}
                        {summary.metrics.adaptiveHistory.revertedCount} reverted
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Questions for Doctor Consultation */}
              {questions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-black text-sm uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <span>2. Questions for Clinical Consultation</span>
                  </h3>
                  <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1.5 text-xs text-indigo-950">
                    {questions.map((q, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="font-bold text-indigo-700 shrink-0">{idx + 1}.</span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Patient Preferences & Pacing */}
              {summary?.patientPreferencesSummary && (
                <div className="space-y-2">
                  <h3 className="font-black text-sm uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <span>3. Patient Preference & Familiarity Observations</span>
                  </h3>
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1">
                    <div>
                      <strong className="text-gray-900">Observed Preference: </strong>
                      <span>{summary.patientPreferencesSummary.preferredPacing}</span>
                    </div>
                    <div className="text-3xs text-gray-500">
                      {summary.patientPreferencesSummary.preferenceNotes}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3b: Shared Cognitive & Functional Concerns */}
              {summary?.sharedConcerns && summary.sharedConcerns.length > 0 && (
                <div data-testid="summary-shared-concerns-section" className="space-y-2">
                  <h3 className="font-black text-sm uppercase tracking-wider text-indigo-950 flex items-center justify-between">
                    <span>3b. Shared Cognitive & Daily Life Observations ({summary.sharedConcerns.length})</span>
                    <span className="text-3xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Explicit Patient / Caregiver Sharing Consent
                    </span>
                  </h3>

                  {summary.acuteConcernsFlag && (
                    <div
                      data-testid="summary-acute-alert"
                      className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-950 space-y-1"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>⚠️ Urgent Clinical Attention Note: Sudden / Acute Onset Indicators</span>
                      </div>
                      <p className="text-3xs text-amber-900 leading-relaxed">
                        One or more reported observations describe rapid or sudden shifts appearing over hours or days.
                        Clinical guidelines advise prompt medical evaluation for acute medical etiologies (delirium,
                        systemic infection, metabolic disturbance, stroke) rather than typical dementia progression.
                      </p>
                    </div>
                  )}

                  {(() => {
                    const patientConcerns = summary.sharedConcerns.filter((sc) => sc.perspective === 'patient');
                    const caregiverConcerns = summary.sharedConcerns.filter((sc) => sc.perspective === 'caregiver');

                    return (
                      <div className="space-y-4">
                        {patientConcerns.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                              <span>Patient-Reported Concerns ({patientConcerns.length})</span>
                            </h4>
                            <div className="space-y-2 text-xs">
                              {patientConcerns.map((sc) => (
                                <div
                                  key={sc.id}
                                  data-testid="summary-shared-concern-item"
                                  className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200 text-gray-800 space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-indigo-950 capitalize">
                                        {sc.category.replace('_', ' ')}
                                      </span>
                                      <span className="text-3xs px-2 py-0.5 rounded-full font-bold bg-white text-indigo-700 border border-indigo-200">
                                        Patient Self-Report
                                      </span>
                                      <span className="text-3xs px-1.5 py-0.5 rounded-md font-semibold bg-gray-100 text-gray-600 capitalize">
                                        {sc.status}
                                      </span>
                                    </div>
                                    <span className="text-3xs text-gray-400 font-mono">
                                      {sc.recordedAt.substring(0, 10)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700 font-medium">"{sc.description}"</p>
                                  {sc.contextNotes && (
                                    <div className="text-3xs text-gray-500 italic">
                                      Context: {sc.contextNotes}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {caregiverConcerns.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              <span>Caregiver-Observed Concerns ({caregiverConcerns.length})</span>
                            </h4>
                            <div className="space-y-2 text-xs">
                              {caregiverConcerns.map((sc) => (
                                <div
                                  key={sc.id}
                                  data-testid="summary-shared-concern-item"
                                  className="p-3 bg-amber-50/40 rounded-xl border border-amber-200 text-gray-800 space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-amber-950 capitalize">
                                        {sc.category.replace('_', ' ')}
                                      </span>
                                      <span className="text-3xs px-2 py-0.5 rounded-full font-bold bg-white text-amber-700 border border-amber-200">
                                        Caregiver Observed
                                      </span>
                                      <span className="text-3xs px-1.5 py-0.5 rounded-md font-semibold bg-gray-100 text-gray-600 capitalize">
                                        {sc.status}
                                      </span>
                                    </div>
                                    <span className="text-3xs text-gray-400 font-mono">
                                      {sc.recordedAt.substring(0, 10)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700">{sc.description}</p>
                                  {sc.contextNotes && (
                                    <div className="text-3xs text-gray-500 italic">
                                      Context: {sc.contextNotes}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Section 3c: Formal Clinical Assessment History */}
              {summary?.clinicalAssessments && summary.clinicalAssessments.length > 0 && (
                <div data-testid="summary-clinical-assessments-section" className="space-y-2">
                  <h3 className="font-black text-sm uppercase tracking-wider text-indigo-950 flex items-center justify-between">
                    <span>3c. External Standardized Clinical Assessments ({summary.clinicalAssessments.length})</span>
                    <span className="text-3xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Clinician Administered
                    </span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    {summary.clinicalAssessments.map((ca) => (
                      <div
                        key={ca.id}
                        data-testid="summary-clinical-assessment-item"
                        className="p-3 bg-blue-50/40 rounded-xl border border-blue-200 text-gray-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-950">
                              {ca.assessmentName === 'OTHER' && ca.customAssessmentName
                                ? ca.customAssessmentName
                                : ca.assessmentName}
                            </span>
                            {ca.totalScore !== undefined && (
                              <span className="text-xs font-black text-blue-900 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                                {ca.totalScore} {ca.maxScore ? `/ ${ca.maxScore}` : 'points'}
                              </span>
                            )}
                            {ca.scoreClassification && (
                              <span className="text-3xs font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md">
                                {ca.scoreClassification}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-3xs text-gray-500 font-mono">
                              {ca.administrationDate} ({ca.language})
                            </span>
                            {authorRole === 'doctor' && (
                              <button
                                type="button"
                                data-testid={`amend-assessment-btn-${ca.id}`}
                                onClick={() => setAmendingAssessment(ca)}
                                className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 min-h-[36px]"
                              >
                                <span>+ Add Addendum</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-700">{ca.qualitativeSummary}</p>
                        {ca.amendments && ca.amendments.length > 0 && (
                          <div className="mt-1 pt-1.5 border-t border-blue-200 space-y-1">
                            <span className="text-3xs font-bold uppercase tracking-wider text-blue-900 block">
                              Addenda / Amendments ({ca.amendments.length}):
                            </span>
                            {ca.amendments.map((am, i) => (
                              <div key={i} className="text-3xs bg-white/80 p-2 rounded-lg border border-blue-100">
                                <div className="font-semibold text-gray-800">
                                  {am.amendedAt?.split('T')[0]} • {am.amendedByName}: {am.amendmentReason}
                                </div>
                                {am.previousSummary && (
                                  <div className="text-gray-500 italic mt-0.5">
                                    Current Domain Note: {ca.qualitativeSummary}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-3xs text-gray-400">
                          Recorded by: {ca.doctorName} • External clinical administration
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Longitudinal Event Audit (Sample / Chronological) */}
              <div className="space-y-2">
                <h3 className="font-black text-sm uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <span>4. Recent Recorded Activity Timeline</span>
                </h3>

                {summary && summary.timeline.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500">
                    No activity recorded during this period.
                  </div>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {summary?.timeline.slice(0, 10).map((event) => (
                      <div
                        key={event.id}
                        className="p-2.5 rounded-lg border border-gray-100 bg-white flex items-start justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{event.title}</span>
                            <span className="text-3xs px-1.5 py-0.5 rounded-md font-semibold bg-gray-100 text-gray-600">
                              {event.source}
                            </span>
                            {event.isInterrupted && (
                              <span className="text-3xs px-1.5 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800">
                                Interrupted
                              </span>
                            )}
                          </div>
                          <p className="text-3xs text-gray-600">{event.description}</p>
                        </div>
                        <span className="text-3xs text-gray-400 shrink-0 font-mono">
                          {event.date}
                        </span>
                      </div>
                    ))}
                    {summary && summary.timeline.length > 10 && (
                      <div className="text-3xs text-gray-400 text-center pt-1">
                        + {summary.timeline.length - 10} additional chronological records recorded in full digital audit log.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 5: Clinical Non-Diagnostic Disclaimer */}
              <div
                data-testid="clinical-disclaimer-box"
                className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-3xs text-amber-950 space-y-1"
              >
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Mandatory Non-Diagnostic Disclaimer</span>
                </div>
                <p className="leading-relaxed">{MANDATORY_CLINICAL_DISCLAIMER}</p>
              </div>

              {/* Section 6: Privacy Guardrail Notice */}
              <div
                data-testid="privacy-guardrail-notice"
                className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-3xs text-gray-600 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{PRIVACY_EXCLUSION_NOTICE}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between shrink-0">
          <div className="text-2xs text-gray-500">
            {activeTab === 'preview' ? 'Ready for printing or OPD consultation' : 'Changes applied to preview'}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-bold transition min-h-[48px] flex items-center justify-center"
            >
              Close
            </button>
            <button
              type="button"
              data-testid="print-brief-action"
              onClick={handlePrint}
              disabled={isGenerating || !summary}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5 min-h-[48px]"
            >
              <Printer className="w-4 h-4" />
              <span>Print Appointment Brief</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clinician Assessment Amendment Modal */}
      {amendingAssessment && (
        <RecordClinicalAssessmentModal
          isOpen={!!amendingAssessment}
          onClose={() => setAmendingAssessment(null)}
          patientId={patientId}
          patientName={patientName}
          doctorId={authorId}
          doctorName={authorName}
          currentUserRole={authorRole}
          mode="amend"
          initialRecord={amendingAssessment}
          onAssessmentSaved={() => {
            setAmendingAssessment(null);
            refreshSummary();
          }}
        />
      )}
    </div>
  );
};
