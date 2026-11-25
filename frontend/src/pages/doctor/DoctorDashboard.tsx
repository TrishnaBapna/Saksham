import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import {
  Stethoscope,
  FileText,
  AlertCircle,
  ShieldCheck,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
} from 'lucide-react';
import { RoutineItem } from '../../types/index.js';
import { RoutineService } from '../../features/routines/services/routineService.js';
import { subscribeToDataChanges, isExplicitLocalDemo } from '../../features/auth/services/identityService.js';
import { AddRoutineModal } from '../../features/routines/components/AddRoutineModal.js';
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
  const { t } = useLanguage();

  const isDemoAllowed = isExplicitLocalDemo();

  // In production, strictly authenticated doctors are authorized; no fallback to demo-doctor-001
  const doctorUid =
    currentUser?.role === 'doctor' && currentUser.uid
      ? currentUser.uid
      : isDemoAllowed
      ? 'demo-doctor-001'
      : '';

  const isInitialDemoAssigned = isDemoAllowed && doctorUid === 'demo-doctor-001';

  const [assignment, setAssignment] = useState<DoctorAssignmentInfo>({
    isAssigned: isInitialDemoAssigned,
    status: isInitialDemoAssigned ? 'active' : 'none',
    doctorId: doctorUid,
    patientId: isInitialDemoAssigned ? 'demo-patient-001' : '',
    patientName: isInitialDemoAssigned ? 'Sunita Sharma' : 'Checking Clinical Assignment...',
  });

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isConcernModalOpen, setIsConcernModalOpen] = useState(false);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [currentDiagnosis, setCurrentDiagnosis] = useState<ClinicalDiagnosisRecord | null>(null);
  const [assignedActivities, setAssignedActivities] = useState<DoctorAssignedActivity[]>([]);
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(false);

  // In production, targetPatientId is derived strictly from confirmed clinical assignment
  const targetPatientId = assignment.patientId || (isInitialDemoAssigned ? 'demo-patient-001' : '');

  const [patientRoutines, setPatientRoutines] = useState<RoutineItem[]>(() =>
    isInitialDemoAssigned ? RoutineService.getRoutines('demo-patient-001') : []
  );
  const [isAddRoutineModalOpen, setIsAddRoutineModalOpen] = useState(false);

  const handleDoctorAddRoutine = async (newRoutine: RoutineItem) => {
    if (!assignment.isAssigned || !targetPatientId) return;
    const updated = [newRoutine, ...patientRoutines];
    setPatientRoutines(updated);
    await RoutineService.saveRoutines(targetPatientId, updated, true);
  };

  const handleDoctorToggleRoutine = async (routineId: string) => {
    if (!assignment.isAssigned || !targetPatientId) return;
    const updated = patientRoutines.map((r) =>
      r.id === routineId ? { ...r, isCompleted: !r.isCompleted } : r
    );
    setPatientRoutines(updated);
    await RoutineService.saveRoutines(targetPatientId, updated, true);
  };

  const handleDoctorDeleteRoutine = async (routineId: string) => {
    if (!assignment.isAssigned || !targetPatientId) return;
    const updated = patientRoutines.filter((r) => r.id !== routineId);
    setPatientRoutines(updated);
    await RoutineService.saveRoutines(targetPatientId, updated, true);
  };

  // Resolve initial assignment from service
  useEffect(() => {
    let isMounted = true;
    if (!doctorUid) {
      setAssignment({
        isAssigned: false,
        status: 'none',
        doctorId: '',
        patientId: '',
        patientName: 'No Patient Assigned',
      });
      return;
    }

    DoctorAnalyticsService.getDoctorAssignment(doctorUid)
      .then((info) => {
        if (isMounted) {
          setAssignment(info);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setAssignment({
            isAssigned: false,
            status: 'none',
            doctorId: doctorUid,
            patientId: '',
            patientName: 'Unable to Load Patient Assignment',
            error: err instanceof Error ? err.message : 'Failed to retrieve assignment',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [doctorUid]);

  // Synchronize diagnosis only for assigned patients
  useEffect(() => {
    if (!assignment.isAssigned || !targetPatientId) {
      setCurrentDiagnosis(null);
      return;
    }
    const unsubDiag = ClinicalDiagnosisService.subscribeToDiagnosis(targetPatientId, (record) => {
      setCurrentDiagnosis(record);
    });
    return () => {
      unsubDiag();
    };
  }, [assignment.isAssigned, targetPatientId]);

  // Synchronize routines only for assigned patients
  useEffect(() => {
    if (!assignment.isAssigned || !targetPatientId) {
      setPatientRoutines([]);
      return;
    }
    setPatientRoutines(RoutineService.getRoutines(targetPatientId));

    const unsubscribe = subscribeToDataChanges(({ patientId: changedId }) => {
      if (changedId === targetPatientId || changedId === 'all') {
        setPatientRoutines(RoutineService.getRoutines(targetPatientId));
      }
    });
    return () => unsubscribe();
  }, [assignment.isAssigned, targetPatientId]);

  // Real-time assignment subscription
  useEffect(() => {
    if (!doctorUid || !targetPatientId) return;

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

  // Fetch assigned cognitive activities only for assigned patients
  useEffect(() => {
    let isMounted = true;
    if (!assignment.isAssigned || !targetPatientId || !doctorUid) {
      setAssignedActivities([]);
      setIsLoadingAssigned(false);
      return;
    }

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
          setAssignedActivities([]);
          setIsLoadingAssigned(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [doctorUid, targetPatientId, assignment.isAssigned]);

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto space-y-6">
      {/* Demonstration Banner */}
      {isDemoAllowed && (
        <div data-testid="doctor-demo-badge" className="bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl px-4 py-2.5 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>{t('doctor.demo_badge')}</span>
          </div>
          <span className="text-2xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Local Sandbox</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-700 rounded-3xl p-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>{t('doctor.dashboard_title')}</span>
          </div>
          {assignment.isAssigned && (
            <div className="flex items-center space-x-1 text-2xs text-emerald-200 bg-white/10 px-2.5 py-1 rounded-full font-semibold border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>{t('doctor.verified_link')}</span>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold">{currentUser?.displayName || (isInitialDemoAssigned ? 'Dr. Raman Verma' : 'Clinical Neurologist')}</h1>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mt-1">
          <p className="text-xs md:text-sm text-blue-100">
            {assignment.isAssigned && targetPatientId ? (
              <>{t('doctor.assigned_patient', { name: assignment.patientName })} (ID: {targetPatientId === 'demo-patient-001' ? 'PAT-84920' : targetPatientId})</>
            ) : (
              <>Status: {assignment.patientName || 'No Verified Patient Assignment'}</>
            )}
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
              <span>{currentDiagnosis ? t('doctor.amend_diagnosis') : t('doctor.assign_diagnosis')}</span>
            </button>
            <button
              type="button"
              data-testid="record-assessment-btn"
              onClick={() => setIsAssessmentModalOpen(true)}
              disabled={!assignment.isAssigned}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shrink-0 disabled:opacity-50"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>{t('doctor.record_assessment')}</span>
            </button>
            <button
              type="button"
              data-testid="doctor-log-concern-btn"
              onClick={() => setIsConcernModalOpen(true)}
              disabled={!assignment.isAssigned}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shrink-0 disabled:opacity-50"
            >
              <span>{t('doctor.log_observation')}</span>
            </button>
            <button
              type="button"
              data-testid="export-appointment-brief-btn"
              onClick={() => setIsSummaryModalOpen(true)}
              disabled={!assignment.isAssigned}
              className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-900 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shrink-0 disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>{t('doctor.export_brief')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Medical Disclaimer Banner */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          {t('doctor.clinical_transparency')}
        </div>
      </div>

      {/* Safe Unassigned, Pending, or Errored State (No Fabricated Patient Fallback) */}
      {!assignment.isAssigned || !targetPatientId ? (
        <div
          data-testid="doctor-unassigned-card"
          className="bg-white rounded-3xl p-6 md:p-8 border-2 border-indigo-100 shadow-soft-purple text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto shadow-2xs">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {assignment.error
              ? 'Unable to Retrieve Clinical Assignment'
              : assignment.status === 'pending'
              ? 'Clinical Assignment Pending Verification'
              : assignment.status === 'revoked'
              ? 'Clinical Assignment Inactive'
              : 'No Patient Assigned'}
          </h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            {assignment.error
              ? `There was an issue checking your authorized clinical patient assignment (${assignment.error}). Please verify your network connection and retry.`
              : assignment.status === 'pending'
              ? 'Your clinical assignment to this patient is currently pending administrative or patient verification. Once verified, longitudinal analytics and care plans will be accessible.'
              : assignment.status === 'revoked'
              ? 'Clinical access to this patient record has been revoked or expired.'
              : 'Your clinical neurology account is not currently assigned to an active patient record. In production, clinical analytics, cognitive diagnoses, and care routines are strictly locked until a verified doctor-patient assignment is confirmed.'}
          </p>
          <div className="flex justify-center pt-2">
            <button
              type="button"
              data-testid="doctor-retry-assignment-btn"
              onClick={() => {
                if (doctorUid) {
                  DoctorAnalyticsService.getDoctorAssignment(doctorUid).then((info) => {
                    setAssignment(info);
                  });
                }
              }}
              className="px-5 py-2.5 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-md transition"
            >
              Retry Assignment Check
            </button>
          </div>
        </div>
      ) : (
        <>
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

      {/* Patient Daily Care Plan & Clinical Routines Section */}
      <section
        data-testid="doctor-care-plan-section"
        className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-soft-purple space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Patient Care Plan & Scheduled Routines</h2>
              <p className="text-xs text-gray-500">
                Prescribe, customize, or disable scheduled daily care routines for {assignment.patientName}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="prescribe-routine-btn"
            onClick={() => setIsAddRoutineModalOpen(true)}
            disabled={!assignment.isAssigned}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Prescribe Daily Routine</span>
          </button>
        </div>

        {patientRoutines.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-500 text-center">
            No routines in active care plan. Click "+ Prescribe Daily Routine" to add medication, nutrition, or mobility tasks.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {patientRoutines.map((routine) => (
              <div
                key={routine.id}
                className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 flex flex-col justify-between space-y-2 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-gray-900 text-sm flex items-center space-x-1.5">
                      <span>{routine.title}</span>
                      {routine.enableAssistedRecall && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">
                          Recall Cue
                        </span>
                      )}
                    </div>
                    <div className="text-2xs text-indigo-600 flex items-center space-x-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{routine.scheduledTime}</span>
                      <span className="text-gray-400">•</span>
                      <span className="capitalize font-semibold">{routine.category}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDoctorToggleRoutine(routine.id)}
                    title={routine.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold border transition ${
                      routine.isCompleted
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    <span>{routine.isCompleted ? 'Completed' : 'Pending'}</span>
                  </button>
                </div>

                {routine.description && (
                  <p className="text-2xs text-gray-600 line-clamp-2">{routine.description}</p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-indigo-100 text-3xs text-gray-500">
                  <span>Streak: {routine.streakCount || 0} days</span>
                  <button
                    type="button"
                    onClick={() => handleDoctorDeleteRoutine(routine.id)}
                    className="text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
            <span>Clinical Review Note ({currentUser?.displayName || (isInitialDemoAssigned ? 'Dr. Raman Verma' : 'Attending Neurologist')})</span>
            <span>Recorded Oct 28, 2026</span>
          </div>
          <p className="leading-relaxed">
            "Patient {assignment.patientName} is responding remarkably well to the 3-chance assisted recall structure. Her emotional distress regarding forgotten keys is significantly reduced thanks to the Room Memory photograph catalog."
          </p>
        </div>
      </section>
        </>
      )}

      {/* Modals mounted strictly when an authorized clinical assignment is confirmed */}
      {assignment.isAssigned && targetPatientId && (
        <>
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

          {/* Doctor Prescribe Routine Modal */}
          <AddRoutineModal
            isOpen={isAddRoutineModalOpen}
            onClose={() => setIsAddRoutineModalOpen(false)}
            onAddRoutine={(newRoutine) => {
              handleDoctorAddRoutine(newRoutine);
              setIsAddRoutineModalOpen(false);
            }}
            patientId={targetPatientId}
          />
        </>
      )}
    </div>
  );
};
