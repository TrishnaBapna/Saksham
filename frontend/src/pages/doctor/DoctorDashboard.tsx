import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  Stethoscope,
  FileText,
  AlertCircle,
  ShieldCheck,
  Brain,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { DoctorLongitudinalAnalytics } from '../../features/doctor/components/DoctorLongitudinalAnalytics.js';
import { PatientTimelineView } from '../../features/doctor/components/PatientTimelineView.js';
import { AppointmentSummaryModal } from '../../features/doctor/components/AppointmentSummaryModal.js';
import {
  DoctorAnalyticsService,
  DoctorAssignmentInfo,
  DoctorAssignedActivity,
} from '../../features/doctor/services/doctorAnalyticsService.js';
import { AssignCognitiveTaskModal } from '../../features/doctor/components/AssignCognitiveTaskModal.js';
import { RecordClinicalAssessmentModal } from '../../features/clinical/components/RecordClinicalAssessmentModal.js';
import { CognitiveConcernModal } from '../../features/clinical/components/CognitiveConcernModal.js';
import { AssignClinicalDiagnosisModal } from '../../features/clinical/components/AssignClinicalDiagnosisModal.js';
import { ClinicalDiagnosisService } from '../../features/clinical/services/clinicalDiagnosisService.js';
import { ClinicalDiagnosisRecord } from '../../features/clinical/types/concern.types.js';

export const DoctorDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const doctorUid = (currentUser?.role === 'doctor' && currentUser.uid) ? currentUser.uid : 'demo-doctor-001';
  const targetPatientId = 'demo-patient-001';

  const isInitialDemoAssigned = doctorUid === 'demo-doctor-001' && targetPatientId === 'demo-patient-001';
  const [assignment, setAssignment] = useState<DoctorAssignmentInfo>({
    isAssigned: isInitialDemoAssigned,
    status: isInitialDemoAssigned ? 'active' : 'none',
    doctorId: doctorUid,
    patientId: targetPatientId,
    patientName: 'Sunita Sharma',
  });

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isConcernModalOpen, setIsConcernModalOpen] = useState(false);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [currentDiagnosis, setCurrentDiagnosis] = useState<ClinicalDiagnosisRecord | null>(null);
  const [assignedActivities, setAssignedActivities] = useState<DoctorAssignedActivity[]>([]);
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(false);

  useEffect(() => {
    const unsubDiag = ClinicalDiagnosisService.subscribeToDiagnosis(targetPatientId, (record) => {
      setCurrentDiagnosis(record);
    });
    return () => {
      unsubDiag();
    };
  }, [targetPatientId]);

  useEffect(() => {
    const unsubscribe = DoctorAnalyticsService.subscribeToDoctorAssignment(
      doctorUid,
      targetPatientId,
      (info) => {
        setAssignment(info);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [doctorUid, targetPatientId]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingAssigned(true);
    DoctorAnalyticsService.getAssignedCognitiveActivities(doctorUid, targetPatientId)
      .then((activities) => {
        if (isMounted) {
          setAssignedActivities(activities);
          setIsLoadingAssigned(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoadingAssigned(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [doctorUid, targetPatientId, assignment.isAssigned]);

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-700 rounded-3xl p-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Clinical Neurology Portal</span>
          </div>
          {assignment.isAssigned && (
            <div className="flex items-center space-x-1 text-2xs text-emerald-200 bg-white/10 px-2.5 py-1 rounded-full font-semibold border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Verified Clinical Link</span>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold">{currentUser?.displayName || 'Dr. Raman Verma'}</h1>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mt-1">
          <p className="text-xs md:text-sm text-blue-100">
            Assigned Patient: {assignment.patientName} (ID: PAT-84920) • Early Cognitive Support
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="assign-diagnosis-btn"
              onClick={() => setIsDiagnosisModalOpen(true)}
              disabled={!assignment.isAssigned}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shrink-0 disabled:opacity-50"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>{currentDiagnosis ? 'Amend Diagnosis' : 'Assign Diagnosis'}</span>
            </button>
            <button
              type="button"
              data-testid="record-assessment-btn"
              onClick={() => setIsAssessmentModalOpen(true)}
              disabled={!assignment.isAssigned}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shrink-0 disabled:opacity-50"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Record Clinical Assessment</span>
            </button>
            <button
              type="button"
              data-testid="doctor-log-concern-btn"
              onClick={() => setIsConcernModalOpen(true)}
              disabled={!assignment.isAssigned}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shrink-0 disabled:opacity-50"
            >
              <span>+ Log Observation</span>
            </button>
            <button
              type="button"
              data-testid="export-appointment-brief-btn"
              onClick={() => setIsSummaryModalOpen(true)}
              disabled={!assignment.isAssigned}
              className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-900 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shrink-0 disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>Export Appointment Brief</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Medical Disclaimer Banner */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Clinical Transparency Policy: </span>
          Saksham strictly separates measured objective behavioral records (routine completions, prompt cues, session attempts) from clinical diagnoses or disease-progression models to prevent algorithmic bias.
        </div>
      </div>

      {/* Priority 3: Doctor-Confirmed Clinical Diagnosis Pathway Card */}
      <div
        data-testid="doctor-clinical-pathway-card"
        className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-soft-purple space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-700">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Clinical Diagnosis Pathway</h2>
              <p className="text-xs text-gray-500">
                Doctor-confirmed diagnosis separates Alzheimer's from other/mixed dementia
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="edit-pathway-action-btn"
            onClick={() => setIsDiagnosisModalOpen(true)}
            disabled={!assignment.isAssigned}
            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition disabled:opacity-50"
          >
            {currentDiagnosis ? 'Amend Diagnosis' : '+ Assign Diagnosis'}
          </button>
        </div>

        {currentDiagnosis ? (
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span
                  data-testid="doctor-pathway-badge"
                  className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                    currentDiagnosis.pathway === 'alzheimers_confirmed'
                      ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                      : 'bg-purple-100 text-purple-900 border-purple-300'
                  }`}
                >
                  {currentDiagnosis.pathway === 'alzheimers_confirmed'
                    ? 'Pathway A: Doctor-Confirmed Alzheimer\'s Disease'
                    : 'Pathway B: Doctor-Confirmed Other / Mixed Dementia'}
                </span>
                <span className="text-[11px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                  Stage: {currentDiagnosis.clinicalStage.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              <span className="text-2xs text-gray-500 font-medium">
                Confirmed: {new Date(currentDiagnosis.confirmedAt).toLocaleDateString()}
              </span>
            </div>

            <div className="text-xs space-y-1.5 text-gray-700">
              <p>
                <span className="font-bold text-gray-900">Etiology / Subtype:</span>{' '}
                {currentDiagnosis.etiology.replace(/_/g, ' ')}
              </p>
              <p>
                <span className="font-bold text-gray-900">Diagnostic Criteria:</span>{' '}
                {currentDiagnosis.diagnosticCriteria}
              </p>
              <p>
                <span className="font-bold text-gray-900">Clinical Rationale:</span>{' '}
                {currentDiagnosis.clinicalRationale}
              </p>
              <p className="text-[11px] text-gray-500 pt-1 border-t border-indigo-100">
                Attending Neurologist: {currentDiagnosis.confirmedByDoctorName} (Reg #{' '}
                {currentDiagnosis.doctorRegistrationNumber})
                {currentDiagnosis.amendments && currentDiagnosis.amendments.length > 0 && (
                  <span className="ml-2 font-semibold text-indigo-700">
                    • {currentDiagnosis.amendments.length} clinical amendment(s) on file
                  </span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center space-y-2">
            <p className="text-xs font-bold text-gray-700">
              Clinical Evaluation Pending (No Diagnosis Assigned Yet)
            </p>
            <p className="text-[11px] text-gray-500 max-w-md mx-auto">
              Saksham is strictly non-diagnostic. Patients and caregivers cannot self-diagnose. Click "Assign Diagnosis" above to assign Pathway A (Alzheimer's) or Pathway B (Other/Mixed Dementia).
            </p>
          </div>
        )}
      </div>

      {/* 30-Day Longitudinal Behavioral Analytics Portal */}
      <DoctorLongitudinalAnalytics
        doctorId={doctorUid}
        patientId={targetPatientId}
        patientName={assignment.patientName}
      />

      {/* Longitudinal Patient Activity & Support Timeline */}
      <PatientTimelineView
        patientId={targetPatientId}
        patientName={assignment.patientName}
        isAuthorized={assignment.isAssigned}
      />

      {/* Clinical Task Assignment & Notes Section */}
      <section className="bg-white rounded-3xl p-6 border border-blue-100 shadow-soft-purple space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-saksham-darkText flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Neurological Progress Notes & Task Assignment</span>
          </h2>
          <button
            type="button"
            onClick={() => setIsAssignModalOpen(true)}
            disabled={!assignment.isAssigned}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1"
          >
            <span>+ Assign Cognitive Activity</span>
          </button>
        </div>

        {/* Assigned Activities List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
            <Brain className="w-3.5 h-3.5 text-blue-500" />
            <span>Assigned Cognitive Activities ({assignedActivities.length})</span>
          </h3>

          {isLoadingAssigned ? (
            <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-gray-500 animate-pulse">
              Loading prescribed activities...
            </div>
          ) : assignedActivities.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-500 text-center">
              No cognitive activities assigned yet. Click "+ Assign Cognitive Activity" to prescribe targeted stimulation.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignedActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{act.gameTitle}</div>
                      <div className="text-2xs text-blue-600 flex items-center space-x-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span className="capitalize">
                          {act.frequency === 'alternate_days'
                            ? 'Alternate Days (3x/wk)'
                            : act.frequency}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                      Active
                    </span>
                  </div>

                  {act.clinicalGoal && (
                    <div className="text-2xs text-gray-600">
                      <strong className="text-gray-700">Goal: </strong>
                      {act.clinicalGoal}
                    </div>
                  )}

                  <div className="text-2xs text-gray-700 bg-white/70 p-2.5 rounded-xl border border-blue-50">
                    <span className="font-semibold text-gray-800">Instructions: </span>
                    {act.instructions}
                  </div>

                  <div className="text-3xs text-gray-400 pt-1 flex justify-between">
                    <span>Prescribed by {act.doctorName}</span>
                    <span>{new Date(act.assignedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clinical Review Note */}
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-700 space-y-2">
          <div className="flex items-center justify-between font-bold text-gray-800">
            <span>Clinical Review Note (Dr. Raman Verma)</span>
            <span>Recorded Oct 28, 2026</span>
          </div>
          <p className="leading-relaxed">
            "Patient Sunita Sharma is responding remarkably well to the 3-chance assisted recall structure. Her emotional distress regarding forgotten keys is significantly reduced thanks to the Room Memory photograph catalog."
          </p>
        </div>
      </section>

      {/* Task Assignment Modal */}
      <AssignCognitiveTaskModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        doctorId={doctorUid}
        doctorName={currentUser?.displayName || 'Dr. Raman Verma'}
        patientId={targetPatientId}
        patientName={assignment.patientName}
        onAssigned={(newActivity) => {
          setAssignedActivities((prev) => [newActivity, ...prev]);
        }}
      />

      {/* Clinical Appointment Summary & Export Modal */}
      <AppointmentSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        patientId={targetPatientId}
        patientName={assignment.patientName}
        authorId={doctorUid}
        authorName={currentUser?.displayName || 'Dr. Raman Verma'}
        authorRole="doctor"
      />

      {/* Record Clinical Assessment Modal */}
      <RecordClinicalAssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        patientId={targetPatientId}
        patientName={assignment.patientName}
        doctorId={doctorUid}
        doctorName={currentUser?.displayName || 'Dr. Raman Verma'}
        currentUserRole={currentUser?.role || 'doctor'}
      />

      {/* Structured Cognitive Concern Modal */}
      <CognitiveConcernModal
        isOpen={isConcernModalOpen}
        onClose={() => setIsConcernModalOpen(false)}
        patientId={targetPatientId}
        patientName={assignment.patientName}
        perspective="caregiver"
        currentUserId={doctorUid}
        currentUserName={currentUser?.displayName || 'Dr. Raman Verma'}
      />

      {/* Priority 3: Assign / Amend Clinical Diagnosis Modal */}
      <AssignClinicalDiagnosisModal
        isOpen={isDiagnosisModalOpen}
        onClose={() => setIsDiagnosisModalOpen(false)}
        patientId={targetPatientId}
        patientName={assignment.patientName}
        doctorId={doctorUid}
        doctorName={currentUser?.displayName || 'Dr. Raman Verma'}
        existingDiagnosis={currentDiagnosis}
        onSuccess={(diag) => setCurrentDiagnosis(diag)}
      />
    </div>
  );
};
