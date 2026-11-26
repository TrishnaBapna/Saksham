import React, { useState, useEffect, useCallback } from 'react';
import { AuthUser } from '../../auth/types/auth.types.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getRelationshipUi } from '../../portals/utils/relationshipManagementTranslation.js';
import { RelationshipManagementService } from '../services/relationshipService.js';
import {
  CaregiverPatientRelationshipRecord,
  DoctorPatientRelationshipRecord,
  RelationshipCategory,
  RelationshipRemovalRequestRecord,
} from '../types/relationship.types.js';
import {
  Stethoscope,
  HeartHandshake,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';

interface PatientCareTeamCardProps {
  patientId: string;
  currentUser: AuthUser | null;
}

export const PatientCareTeamCard: React.FC<PatientCareTeamCardProps> = ({
  patientId,
  currentUser,
}) => {
  const { language } = useLanguage();
  const relUi = getRelationshipUi(language);

  const [assignedDoctors, setAssignedDoctors] = useState<DoctorPatientRelationshipRecord[]>([]);
  const [connectedCaregivers, setConnectedCaregivers] = useState<
    CaregiverPatientRelationshipRecord[]
  >([]);
  const [pendingReports, setPendingReports] = useState<RelationshipRemovalRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [reportTarget, setReportTarget] = useState<{
    relationshipId: string;
    category: RelationshipCategory;
    counterpartyId: string;
    counterpartyName: string;
    counterpartyRole: 'doctor' | 'caregiver';
  } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const loadCareTeam = useCallback(async () => {
    if (!patientId) {
      setAssignedDoctors([]);
      setConnectedCaregivers([]);
      setPendingReports([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const team = await RelationshipManagementService.fetchPatientCareTeam(
        patientId,
        currentUser
      );
      setAssignedDoctors(team.assignedDoctors);
      setConnectedCaregivers(team.connectedCaregivers);
      setPendingReports(team.pendingReports);
    } catch {
      setAssignedDoctors([]);
      setConnectedCaregivers([]);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, currentUser]);

  useEffect(() => {
    loadCareTeam();
  }, [loadCareTeam]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    setReportError(null);
    setReportFeedback(null);
    setIsSubmittingReport(true);
    try {
      await RelationshipManagementService.submitPatientRemovalReport(currentUser, {
        relationshipId: reportTarget.relationshipId,
        category: reportTarget.category,
        counterpartyId: reportTarget.counterpartyId,
        counterpartyName: reportTarget.counterpartyName,
        counterpartyRole: reportTarget.counterpartyRole,
        reason: reportReason,
      });
      setReportFeedback(relUi.reportSubmittedMsg);
      setReportReason('');
      setReportTarget(null);
      await loadCareTeam();
    } catch (err: any) {
      setReportError(err?.message || 'Unable to submit connection report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <section
      data-testid="patient-care-team-section"
      className="bg-white rounded-3xl p-5 md:p-6 border border-purple-100 shadow-soft-purple space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-saksham-darkText flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>{relUi.myCareTeamTitle}</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{relUi.myCareTeamSubtitle}</p>
        </div>
      </div>

      {reportFeedback && (
        <div
          data-testid="patient-care-team-report-success"
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{reportFeedback}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-4 text-center text-xs text-gray-400">...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Assigned Doctors */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
            <div className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-blue-700" />
              <span>{relUi.assignedDoctorsHeading}</span>
            </div>

            {assignedDoctors.length === 0 ? (
              <p className="text-xs text-gray-500">{relUi.noAssignedDoctorYet}</p>
            ) : (
              <div className="space-y-2.5">
                {assignedDoctors.map((docRel) => {
                  const hasPendingRemoval = pendingReports.some(
                    (r) => r.relationshipId === docRel.id
                  );
                  return (
                    <div
                      key={docRel.id}
                      data-testid={`care-team-doctor-${docRel.doctorId}`}
                      className="p-3 bg-white rounded-xl border border-blue-200 space-y-1.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {docRel.doctorName || docRel.doctorId}
                          </div>
                          {docRel.doctorQualification && (
                            <div className="text-[11px] text-gray-600">
                              {docRel.doctorQualification}
                            </div>
                          )}
                          {(docRel.doctorSpecialty || docRel.doctorHospital) && (
                            <div className="text-[11px] text-blue-800 font-medium">
                              {[docRel.doctorSpecialty, docRel.doctorHospital]
                                .filter(Boolean)
                                .join(' • ')}
                            </div>
                          )}
                          {docRel.doctorLicenseNumber && (
                            <div className="text-[10px] font-mono text-gray-500">
                              Reg: {docRel.doctorLicenseNumber}
                            </div>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          {relUi.activeStatusPill}
                        </span>
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-2 border-t border-gray-100">
                        <span className="text-[10px] text-gray-500 capitalize">
                          {docRel.relationshipType.replace(/_/g, ' ')}
                        </span>
                        {hasPendingRemoval ? (
                          <span className="text-[10px] font-bold text-amber-800">
                            Removal Under Admin Review
                          </span>
                        ) : currentUser?.uid && !currentUser.uid.startsWith('guest_') ? (
                          <button
                            type="button"
                            data-testid={`report-doc-btn-${docRel.doctorId}`}
                            onClick={() => {
                              setReportError(null);
                              setReportFeedback(null);
                              setReportTarget({
                                relationshipId: docRel.id,
                                category: 'doctor_patient',
                                counterpartyId: docRel.doctorId,
                                counterpartyName: docRel.doctorName || docRel.doctorId,
                                counterpartyRole: 'doctor',
                              });
                            }}
                            className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>{relUi.reportIncorrectBtn}</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Connected Caregivers */}
          <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-3">
            <div className="text-xs font-extrabold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-teal-700" />
              <span>{relUi.connectedCaregiversHeading}</span>
            </div>

            {connectedCaregivers.length === 0 ? (
              <p className="text-xs text-gray-500">{relUi.noConnectedCaregiverYet}</p>
            ) : (
              <div className="space-y-2.5">
                {connectedCaregivers.map((cgRel) => {
                  const hasPendingRemoval = pendingReports.some(
                    (r) => r.relationshipId === cgRel.id
                  );
                  return (
                    <div
                      key={cgRel.id}
                      data-testid={`care-team-caregiver-${cgRel.caregiverId}`}
                      className="p-3 bg-white rounded-xl border border-teal-200 space-y-1.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {cgRel.caregiverName || cgRel.caregiverId}
                          </div>
                          {cgRel.caregiverEmail && (
                            <div className="text-[11px] text-gray-500">{cgRel.caregiverEmail}</div>
                          )}
                          <div className="text-[11px] font-semibold text-teal-800 capitalize mt-0.5">
                            {cgRel.relationshipType.replace(/_/g, ' ')}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          {relUi.activeStatusPill}
                        </span>
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-2 border-t border-gray-100">
                        <span className="text-[10px] text-gray-500">
                          {cgRel.permissions.canViewRestrictedClinical
                            ? 'Extended Clinical View'
                            : 'Routines, Safety & Family Support'}
                        </span>
                        {hasPendingRemoval ? (
                          <span className="text-[10px] font-bold text-amber-800">
                            Removal Under Admin Review
                          </span>
                        ) : currentUser?.uid && !currentUser.uid.startsWith('guest_') ? (
                          <button
                            type="button"
                            data-testid={`report-cg-btn-${cgRel.caregiverId}`}
                            onClick={() => {
                              setReportError(null);
                              setReportFeedback(null);
                              setReportTarget({
                                relationshipId: cgRel.id,
                                category: 'caregiver_patient',
                                counterpartyId: cgRel.caregiverId,
                                counterpartyName: cgRel.caregiverName || cgRel.caregiverId,
                                counterpartyRole: 'caregiver',
                              });
                            }}
                            className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>{relUi.reportIncorrectBtn}</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Incorrect Connection / Removal Request Form */}
      {reportTarget && (
        <form
          onSubmit={handleSubmitReport}
          data-testid="patient-report-connection-form"
          className="p-4 rounded-2xl border-2 border-rose-200 bg-rose-50/50 space-y-3 text-xs"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-rose-950 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>
                {relUi.reportModalTitle}: {reportTarget.counterpartyName}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setReportTarget(null)}
              className="p-1 text-gray-500 hover:text-gray-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={2}
            placeholder={relUi.reportReasonPlaceholder}
            className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-white text-xs"
          />
          {reportError && <div className="text-rose-700 font-semibold">{reportError}</div>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReportTarget(null)}
              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="submit-care-team-report-btn"
              disabled={isSubmittingReport}
              className="px-4 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold disabled:opacity-60"
            >
              {relUi.submitReportBtn}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
