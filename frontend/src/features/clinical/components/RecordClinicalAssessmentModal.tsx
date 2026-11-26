import React, { useState, useEffect, useId } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle,
  FileText,
  AlertCircle,
  Calendar,
  Languages,
  History,
} from 'lucide-react';
import {
  ClinicalAssessmentRecord,
  ClinicalAssessmentType,
} from '../types/concern.types';
import { CognitiveConcernService } from '../services/cognitiveConcernService';
import { useLanguage } from '../../../context/LanguageContext';
import { getClinicianUi } from '../../portals/utils/clinicianTranslation';

interface RecordClinicalAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  currentUserRole?: string;
  mode?: 'create' | 'amend';
  initialRecord?: ClinicalAssessmentRecord | null;
  onAssessmentSaved?: (record: ClinicalAssessmentRecord) => void;
}

const ASSESSMENT_OPTIONS: Array<{
  id: ClinicalAssessmentType;
  name: string;
  fullName: string;
  defaultMaxScore?: number;
  description: string;
}> = [
  {
    id: 'MMSE',
    name: 'MMSE',
    fullName: 'Mini-Mental State Examination',
    defaultMaxScore: 30,
    description: 'Orientation, registration, attention, recall, language, and copying.',
  },
  {
    id: 'MoCA',
    name: 'MoCA',
    fullName: 'Montreal Cognitive Assessment',
    defaultMaxScore: 30,
    description: 'Visuospatial, executive function, naming, memory, attention, abstraction, and orientation.',
  },
  {
    id: 'HMSE',
    name: 'HMSE',
    fullName: 'Hindi Mental State Examination',
    defaultMaxScore: 30,
    description: 'Culturally adapted cognitive screening battery validated for Hindi-speaking populations.',
  },
  {
    id: 'ACE-III',
    name: 'ACE-III',
    fullName: "Addenbrooke's Cognitive Examination III",
    defaultMaxScore: 100,
    description: 'Comprehensive screening covering attention, memory, fluency, language, and visuospatial domains.',
  },
  {
    id: 'CDR',
    name: 'CDR',
    fullName: 'Clinical Dementia Rating',
    defaultMaxScore: 3,
    description: 'Semi-structured interview scale assessing 6 cognitive and functional domains (0 to 3 scale).',
  },
  {
    id: 'OTHER',
    name: 'Other Tool',
    fullName: 'Other Validated Clinical Instrument',
    defaultMaxScore: 30,
    description: 'Other externally administered standardized cognitive or functional clinical battery.',
  },
];

export const RecordClinicalAssessmentModal: React.FC<RecordClinicalAssessmentModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName = 'Patient',
  doctorId,
  doctorName = 'Dr. Assigned Clinician',
  currentUserRole = 'doctor',
  mode = 'create',
  initialRecord = null,
  onAssessmentSaved,
}) => {
  const modalTitleId = useId();
  const { language: appLanguage } = useLanguage();
  const ui = getClinicianUi(appLanguage);
  const [assessmentName, setAssessmentName] = useState<ClinicalAssessmentType>('MMSE');
  const [customAssessmentName, setCustomAssessmentName] = useState('');
  const [administrationDate, setAdministrationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [language, setLanguage] = useState<string>('English');
  const [totalScore, setTotalScore] = useState<string>('24');
  const [maxScore, setMaxScore] = useState<string>('30');
  const [scoreClassification, setScoreClassification] = useState<string>(
    'Mild cognitive impairment range'
  );
  const [qualitativeSummary, setQualitativeSummary] = useState<string>('');
  const [amendmentReason, setAmendmentReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if editing/amending an existing record
  useEffect(() => {
    if (mode === 'amend' && initialRecord) {
      setAssessmentName(initialRecord.assessmentName);
      setCustomAssessmentName(initialRecord.customAssessmentName || '');
      setAdministrationDate(initialRecord.administrationDate);
      setLanguage(initialRecord.language || 'English');
      setTotalScore(initialRecord.totalScore !== undefined ? String(initialRecord.totalScore) : '');
      setMaxScore(initialRecord.maxScore !== undefined ? String(initialRecord.maxScore) : '30');
      setScoreClassification(initialRecord.scoreClassification || '');
      setQualitativeSummary(initialRecord.qualitativeSummary || '');
      setAmendmentReason('');
    }
  }, [mode, initialRecord, isOpen]);

  if (!isOpen) return null;

  // PRODUCT OWNER DECISION 2: Role Guard Check
  const isDoctorAuthorized = currentUserRole === 'doctor';

  const handleAssessmentTypeChange = (type: ClinicalAssessmentType) => {
    setAssessmentName(type);
    const selected = ASSESSMENT_OPTIONS.find((a) => a.id === type);
    if (selected && selected.defaultMaxScore) {
      setMaxScore(selected.defaultMaxScore.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDoctorAuthorized) {
      setErrorMessage('Permission denied: Only authenticated doctors can record clinical assessment scores.');
      return;
    }

    if (!qualitativeSummary.trim()) {
      setErrorMessage('Please include a brief qualitative clinical summary or domain observations.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let savedRecord: ClinicalAssessmentRecord | null = null;

      if (mode === 'amend' && initialRecord) {
        if (!amendmentReason.trim()) {
          setErrorMessage('An auditable amendment reason is required to correct or append to a clinical assessment record.');
          setIsSubmitting(false);
          return;
        }

        savedRecord = await CognitiveConcernService.amendClinicalAssessment(
          patientId,
          initialRecord.id,
          {
            qualitativeSummary: qualitativeSummary.trim(),
            totalScore: totalScore !== '' ? Number(totalScore) : undefined,
            scoreClassification: scoreClassification.trim() || undefined,
            amendmentReason: amendmentReason.trim(),
            doctorId,
            doctorName,
          },
          currentUserRole
        );
      } else {
        savedRecord = await CognitiveConcernService.recordClinicalAssessment(
          patientId,
          {
            doctorId,
            doctorName,
            assessmentName,
            customAssessmentName: assessmentName === 'OTHER' ? customAssessmentName.trim() : undefined,
            administrationDate,
            language,
            totalScore: totalScore !== '' ? Number(totalScore) : undefined,
            maxScore: maxScore !== '' ? Number(maxScore) : undefined,
            scoreClassification: scoreClassification.trim() || undefined,
            qualitativeSummary: qualitativeSummary.trim(),
          },
          currentUserRole
        );
      }

      setSaveSuccess(true);
      if (savedRecord && onAssessmentSaved) onAssessmentSaved(savedRecord);

      setTimeout(() => {
        setIsSubmitting(false);
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Unable to save assessment record. Please check fields.');
    }
  };

  const isAmendMode = Boolean(mode === 'amend' && initialRecord);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-purple-100 my-8 space-y-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              🩺
            </div>
            <div>
              <h2 id={modalTitleId} className="text-xl font-bold text-gray-900">
                {isAmendMode ? ui.assAmendTitle : ui.assRecordTitle}
              </h2>
              <p className="text-xs text-gray-500">
                {isAmendMode
                  ? `${ui.assAmendSubPrefix} ${patientName}.`
                  : `${ui.assRecordSubPrefix} ${patientName}.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-3 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label={ui.assCloseBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ROLE GUARD WARNING */}
        {!isDoctorAuthorized ? (
          <div
            data-testid="doctor-role-denied-banner"
            className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-2"
          >
            <div className="flex items-start space-x-2 font-bold text-rose-900">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{ui.assRestrictedTitle}</span>
            </div>
            <p className="leading-relaxed">
              {ui.assRestrictedBody}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition min-h-[48px]"
            >
              {ui.assCloseBtn}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Regulatory & Non-Diagnostic Notice */}
            <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200 text-[11px] text-blue-900 flex items-start space-x-2">
              <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{ui.assNoticeTitle} </span>
                <span>
                  {ui.assNoticeBody}
                </span>
              </div>
            </div>

            {/* Read-Only Provenance Card in Amend Mode */}
            {isAmendMode && initialRecord && (
              <div
                data-testid="amendment-original-info"
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>{ui.assOrigTitle}</span>
                  </span>
                  <span className="text-3xs text-slate-500 font-mono">
                    {ui.assAdministeredPrefix} {initialRecord.administrationDate}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-3xs text-slate-700 pt-1">
                  <div>
                    <span className="text-slate-400 block uppercase">{ui.assInstrumentLabel}</span>
                    <strong className="text-slate-900 text-xs">
                      {initialRecord.assessmentName === 'OTHER' && initialRecord.customAssessmentName
                        ? initialRecord.customAssessmentName
                        : initialRecord.assessmentName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase">{ui.assOrigScoreLabel}</span>
                    <strong className="text-slate-900 text-xs">
                      {initialRecord.totalScore !== undefined ? `${initialRecord.totalScore} / ${initialRecord.maxScore || 30}` : ui.assUnscored}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase">{ui.assOrigClinicianLabel}</span>
                    <span className="text-slate-800 font-medium">{initialRecord.doctorName}</span>
                  </div>
                </div>

                {initialRecord.amendments && initialRecord.amendments.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <span className="text-3xs font-bold text-slate-600 uppercase tracking-wider block">
                      {ui.assPriorAmendments} ({initialRecord.amendments.length}):
                    </span>
                    {initialRecord.amendments.map((am, i) => (
                      <div key={i} className="text-3xs p-2 bg-white rounded-lg border border-slate-200">
                        <span className="font-semibold text-slate-900">{am.amendedAt?.split('T')[0]}: </span>
                        <span>{am.amendmentReason}</span>
                        <span className="text-slate-400 block">By: {am.amendedByName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Assessment Battery Picker (Create mode only) */}
            {!isAmendMode && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  {ui.assToolPickerLabel}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ASSESSMENT_OPTIONS.map((opt) => {
                    const isSelected = assessmentName === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`assessment-type-${opt.id}`}
                        onClick={() => handleAssessmentTypeChange(opt.id)}
                        className={`p-3 rounded-2xl border text-left transition min-h-[56px] flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs text-gray-900">{opt.name}</span>
                          {opt.defaultMaxScore && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              /{opt.defaultMaxScore}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{opt.fullName}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!isAmendMode && assessmentName === 'OTHER' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {ui.assCustomNameLabel}
                </label>
                <input
                  type="text"
                  required
                  data-testid="custom-assessment-name-input"
                  value={customAssessmentName}
                  onChange={(e) => setCustomAssessmentName(e.target.value)}
                  placeholder="e.g. Rowland Universal Dementia Assessment Scale (RUDAS)"
                  className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Date and Language (Create mode only) */}
            {!isAmendMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span>{ui.assAdminDateLabel}</span>
                  </label>
                  <input
                    type="date"
                    required
                    data-testid="assessment-date-input"
                    value={administrationDate}
                    onChange={(e) => setAdministrationDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Languages className="w-3.5 h-3.5 text-gray-500" />
                    <span>{ui.assAdminLangLabel}</span>
                  </label>
                  <select
                    data-testid="assessment-language-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Marathi">Marathi (मराठी)</option>
                    <option value="Bengali">Bengali (বাংলা)</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                    <option value="Malayalam">Malayalam (മലയാളം)</option>
                    <option value="Other">Other Language</option>
                  </select>
                </div>
              </div>
            )}

            {/* In Amend Mode: Required Amendment Reason Input */}
            {isAmendMode && (
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-1.5">
                <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
                  {ui.assAmendReasonLabel}
                </label>
                <input
                  type="text"
                  required
                  data-testid="amendment-reason-input"
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  placeholder="e.g. Corrected delayed recall sub-score after reviewing paper scoring protocol."
                  className="w-full text-xs rounded-xl border border-amber-300 p-3 bg-white focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-3xs text-amber-800 block">
                  {ui.assAmendReasonNote}
                </span>
              </div>
            )}

            {/* Score & Impression */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {isAmendMode ? ui.assCorrectedScore : ui.assTotalScore}
                </label>
                <input
                  type="number"
                  data-testid="assessment-total-score-input"
                  step="0.5"
                  value={totalScore}
                  onChange={(e) => setTotalScore(e.target.value)}
                  placeholder="e.g. 24"
                  className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {ui.assMaxScore}
                </label>
                <input
                  type="number"
                  disabled={isAmendMode}
                  data-testid="assessment-max-score-input"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {ui.assClinicalBand}
                </label>
                <input
                  type="text"
                  data-testid="assessment-classification-input"
                  value={scoreClassification}
                  onChange={(e) => setScoreClassification(e.target.value)}
                  placeholder="e.g. Mild impairment range"
                  className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Qualitative Clinical Observations / Addendum */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                {isAmendMode ? ui.assNotesAmendLabel : ui.assNotesLabel}
              </label>
              <textarea
                data-testid="assessment-qualitative-input"
                rows={3}
                required
                value={qualitativeSummary}
                onChange={(e) => setQualitativeSummary(e.target.value)}
                placeholder={
                  isAmendMode
                    ? 'e.g. Addendum: Patient reviewed with family. Delayed recall re-verified at 2/5 with phonemic cueing.'
                    : 'e.g. Intact immediate recall but 1/5 delayed word recall; mild perseveration on clock drawing; excellent cooperative effort with verbal encouragement.'
                }
                className="w-full text-xs rounded-2xl border border-gray-300 p-3.5 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {errorMessage && (
              <div
                data-testid="assessment-error-banner"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {saveSuccess && (
              <div
                data-testid="assessment-success-banner"
                className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>
                  {isAmendMode
                    ? ui.assAmendSuccess
                    : ui.assSaveSuccess}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition min-h-[48px]"
              >
                {ui.assCancel}
              </button>
              <button
                type="submit"
                data-testid="submit-assessment-btn"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm min-h-[48px] flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <span>{ui.assSaving}</span>
                ) : (
                  <>
                    <span>{isAmendMode ? ui.assAppendBtn : ui.assRecordBtn}</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
