import React, { useState, useEffect } from 'react';
import {
  X,
  Stethoscope,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  History,
} from 'lucide-react';
import {
  ClinicalDiagnosisRecord,
  DementiaPathway,
  DementiaEtiology,
  ClinicalDementiaStage,
} from '../types/concern.types.js';
import { ClinicalDiagnosisService } from '../services/clinicalDiagnosisService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getClinicianUi } from '../../portals/utils/clinicianTranslation.js';

interface AssignClinicalDiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  existingDiagnosis?: ClinicalDiagnosisRecord | null;
  onSuccess?: (diagnosis: ClinicalDiagnosisRecord) => void;
}

export const AssignClinicalDiagnosisModal: React.FC<AssignClinicalDiagnosisModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  doctorId,
  doctorName,
  existingDiagnosis,
  onSuccess,
}) => {
  const { language } = useLanguage();
  const ui = getClinicianUi(language);
  const isAmendMode = Boolean(existingDiagnosis && existingDiagnosis.isCurrent);

  const [pathway, setPathway] = useState<DementiaPathway>('alzheimers_confirmed');
  const [etiology, setEtiology] = useState<DementiaEtiology>('ALZHEIMERS_AMYLOID_CONFIRMED');
  const [stage, setStage] = useState<ClinicalDementiaStage>('mild_cognitive_impairment');
  const [diagnosticCriteria, setDiagnosticCriteria] = useState('NIA-AA 2018 Research Framework & Biomarkers');
  const [clinicalRationale, setClinicalRationale] = useState('');
  const [doctorRegNumber, setDoctorRegNumber] = useState('MCI-MH-2024-89712');
  const [amendmentReason, setAmendmentReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingDiagnosis) {
      setPathway(existingDiagnosis.pathway);
      setEtiology(existingDiagnosis.etiology);
      setStage(existingDiagnosis.clinicalStage);
      setDiagnosticCriteria(existingDiagnosis.diagnosticCriteria || 'NIA-AA 2018 Research Framework & Biomarkers');
      setClinicalRationale(existingDiagnosis.clinicalRationale || '');
      setDoctorRegNumber(existingDiagnosis.doctorRegistrationNumber || 'MCI-MH-2024-89712');
    } else {
      setPathway('alzheimers_confirmed');
      setEtiology('ALZHEIMERS_AMYLOID_CONFIRMED');
      setStage('mild_cognitive_impairment');
      setDiagnosticCriteria('NIA-AA 2018 Research Framework & Biomarkers');
      setClinicalRationale('');
      setDoctorRegNumber('MCI-MH-2024-89712');
    }
    setAmendmentReason('');
    setError(null);
  }, [existingDiagnosis, isOpen]);

  // Adjust default etiology when pathway toggles
  const handlePathwayChange = (newPathway: DementiaPathway) => {
    setPathway(newPathway);
    if (newPathway === 'alzheimers_confirmed') {
      if (!['ALZHEIMERS_AMYLOID_CONFIRMED', 'ALZHEIMERS_CLINICAL_PROBABLE'].includes(etiology)) {
        setEtiology('ALZHEIMERS_AMYLOID_CONFIRMED');
      }
    } else if (newPathway === 'other_or_mixed_dementia') {
      if (['ALZHEIMERS_AMYLOID_CONFIRMED', 'ALZHEIMERS_CLINICAL_PROBABLE'].includes(etiology)) {
        setEtiology('VASCULAR_DEMENTIA');
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clinicalRationale.trim()) {
      setError(ui.diagErrRationale);
      return;
    }

    if (!doctorRegNumber.trim()) {
      setError(ui.diagErrReg);
      return;
    }

    if (isAmendMode && !amendmentReason.trim()) {
      setError(ui.diagErrAmend);
      return;
    }

    setIsSubmitting(true);
    try {
      let saved: ClinicalDiagnosisRecord;
      if (isAmendMode && existingDiagnosis) {
        saved = await ClinicalDiagnosisService.amendDiagnosis(patientId, existingDiagnosis.id, {
          pathway,
          etiology,
          clinicalStage: stage,
          amendmentReason,
          amendedByDoctorId: doctorId,
          amendedByDoctorName: doctorName,
        });
      } else {
        saved = await ClinicalDiagnosisService.assignDiagnosis({
          patientId,
          confirmedByDoctorId: doctorId,
          confirmedByDoctorName: doctorName,
          doctorRegistrationNumber: doctorRegNumber,
          pathway,
          etiology,
          clinicalStage: stage,
          diagnosticCriteria,
          clinicalRationale,
        });
      }

      onSuccess?.(saved);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record clinical diagnosis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnosis-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-blue-200 my-8 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-2xl text-blue-700">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h2 id="diagnosis-modal-title" className="text-lg font-bold text-gray-900">
                {isAmendMode ? ui.diagAmendTitle : ui.diagAssignTitle}
              </h2>
              <p className="text-xs text-blue-700 font-medium">
                {ui.diagPatientPrefix} <span className="font-bold">{patientName}</span> • {ui.diagClinicianOnly}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
            aria-label={ui.diagCloseAria}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clinical Authority Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{ui.diagAuthorityTitle} </span>
            {ui.diagAuthorityBody}
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pathway Selection (A vs B) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {ui.diagSelectPathway}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                data-testid="pathway-a-btn"
                onClick={() => handlePathwayChange('alzheimers_confirmed')}
                className={`p-3.5 rounded-2xl border-2 text-left transition ${
                  pathway === 'alzheimers_confirmed'
                    ? 'border-indigo-600 bg-indigo-50/80 shadow-xs ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-indigo-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-indigo-950">{ui.diagPathwayATitle}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {ui.diagPathwayABadge}
                  </span>
                </div>
                <p className="text-xs font-bold text-gray-900">{ui.diagPathwayAName}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {ui.diagPathwayADesc}
                </p>
              </button>

              <button
                type="button"
                data-testid="pathway-b-btn"
                onClick={() => handlePathwayChange('other_or_mixed_dementia')}
                className={`p-3.5 rounded-2xl border-2 text-left transition ${
                  pathway === 'other_or_mixed_dementia'
                    ? 'border-purple-600 bg-purple-50/80 shadow-xs ring-2 ring-purple-200'
                    : 'border-gray-200 hover:border-purple-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-purple-950">{ui.diagPathwayBTitle}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    {ui.diagPathwayBBadge}
                  </span>
                </div>
                <p className="text-xs font-bold text-gray-900">{ui.diagPathwayBName}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {ui.diagPathwayBDesc}
                </p>
              </button>
            </div>
          </div>

          {/* Etiology Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {ui.diagEtiologyLabel}
            </label>
            <select
              value={etiology}
              onChange={(e) => setEtiology(e.target.value as DementiaEtiology)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {pathway === 'alzheimers_confirmed' ? (
                <>
                  <option value="ALZHEIMERS_AMYLOID_CONFIRMED">
                    Alzheimer's Disease — Biomarker / PET-Amyloid Confirmed
                  </option>
                  <option value="ALZHEIMERS_CLINICAL_PROBABLE">
                    Alzheimer's Disease — NIA-AA Clinical Probable AD
                  </option>
                </>
              ) : (
                <>
                  <option value="VASCULAR_DEMENTIA">Vascular Dementia (VaD / Subcortical Ischemic)</option>
                  <option value="LEWY_BODY_DEMENTIA">Dementia with Lewy Bodies (DLB)</option>
                  <option value="FRONTOTEMPORAL_DEMENTIA">Frontotemporal Dementia (FTD - Behavioral / Semantic)</option>
                  <option value="PARKINSONS_DISEASE">Parkinson's Disease (PD - Motor Predominant)</option>
                  <option value="PARKINSONS_DEMENTIA">Parkinson's Disease Dementia (PDD)</option>
                  <option value="MIXED_ETIOLOGY">Mixed Etiology (AD + Vascular / Mixed Pathology)</option>
                  <option value="OTHER_NON_ALZHEIMERS">Other Non-Alzheimer's Dementia</option>
                </>
              )}
            </select>
          </div>

          {/* Clinical Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {ui.diagStageLabel}
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as ClinicalDementiaStage)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="mild_cognitive_impairment">Mild Cognitive Impairment (MCI)</option>
                <option value="mild_dementia">Mild Dementia</option>
                <option value="moderate_dementia">Moderate Dementia</option>
                <option value="severe_dementia">Severe / Advanced Dementia</option>
                <option value="unspecified">Unspecified / Intermediate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {ui.diagLicenseLabel}
              </label>
              <input
                type="text"
                value={doctorRegNumber}
                onChange={(e) => setDoctorRegNumber(e.target.value)}
                placeholder="e.g. MCI-MH-2024-89712"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Diagnostic Criteria */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {ui.diagCriteriaLabel}
            </label>
            <input
              type="text"
              value={diagnosticCriteria}
              onChange={(e) => setDiagnosticCriteria(e.target.value)}
              placeholder="e.g. NIA-AA 2018 Research Framework, DSM-5, NINDS-AIREN"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Clinical Rationale */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {ui.diagRationaleLabel}
            </label>
            <textarea
              rows={3}
              value={clinicalRationale}
              onChange={(e) => setClinicalRationale(e.target.value)}
              placeholder="Document the clinical basis (e.g. episodic memory deficit on HMSE, MRI medial temporal atrophy, collateral family history)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Amendment Reason if in Amend Mode */}
          {isAmendMode && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-1.5">
              <label className="block text-xs font-bold text-amber-950 flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5 text-amber-700" />
                <span>{ui.diagAmendRationaleLabel}</span>
              </label>
              <textarea
                rows={2}
                value={amendmentReason}
                onChange={(e) => setAmendmentReason(e.target.value)}
                placeholder="Explain the clinical reason for updating the diagnosis or stage (e.g. longitudinal cognitive decline, new imaging)..."
                className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              {ui.diagCancel}
            </button>
            <button
              type="submit"
              data-testid="confirm-diagnosis-submit-btn"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{isSubmitting ? ui.diagSaving : isAmendMode ? ui.diagAmendBtn : ui.diagConfirmBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
