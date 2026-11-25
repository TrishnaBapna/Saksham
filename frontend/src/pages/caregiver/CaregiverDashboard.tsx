import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import {
  HeartHandshake,
  CalendarCheck,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  Phone,
  Navigation,
  FileText,
} from 'lucide-react';
import { RoutineItem, RoutineAttemptRecord } from '../../types/index.js';
import { RoutineService } from '../../features/routines/services/routineService.js';
import { subscribeToDataChanges, isExplicitLocalDemo } from '../../features/auth/services/identityService.js';
import {
  CaregiverService,
  ConnectedPatientInfo,
  DEFAULT_CAREGIVER_PERMISSIONS,
  EMPTY_CAREGIVER_PERMISSIONS,
} from '../../features/caregiver/services/caregiverService.js';
import { CaregiverCalendarView } from '../../features/caregiver/components/CaregiverCalendarView.js';
import { CaregiverSafeZoneMap, TrackingState } from '../../features/safety/components/CaregiverSafeZoneMap.js';
import { CaregiverObservationReport } from '../../features/caregiver/components/CaregiverObservationReport.js';
import { CaregiverProposalReview } from '../../features/caregiver/components/CaregiverProposalReview.js';
import { CaregiverStepPatternDashboard } from '../../features/caregiver/components/CaregiverStepPatternDashboard.js';
import { CaregiverDyadicCoordinationView } from '../../features/caregiver/components/CaregiverDyadicCoordinationView.js';
import { AppointmentSummaryModal } from '../../features/doctor/components/AppointmentSummaryModal.js';
import { CognitiveConcernModal } from '../../features/clinical/components/CognitiveConcernModal.js';
import { GeofenceEvaluationResult } from '../../features/safety/types/safety.types.js';

export const CaregiverDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [geofenceRadius] = useState<number>(500); // 500 meters
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isConcernModalOpen, setIsConcernModalOpen] = useState(false);

  // Connected Patient & Permissions State
  const [patientInfo, setPatientInfo] = useState<ConnectedPatientInfo>({
    patientId: 'demo-patient-001',
    patientName: 'Sunita Sharma',
    relationshipStatus: 'active',
    permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS },
  });

  // Dynamic Safety State
  const [safetyTrackingStatus, setSafetyTrackingStatus] = useState<TrackingState>('INSIDE_SAFE_ZONE');
  const [safetyEvaluation, setSafetyEvaluation] = useState<GeofenceEvaluationResult | null>(null);
  const [alertAcknowledged, setAlertAcknowledged] = useState<boolean>(false);

  const handleSafetyStatusChange = useCallback(
    (status: TrackingState, evaluation: GeofenceEvaluationResult) => {
      setSafetyTrackingStatus(status);
      setSafetyEvaluation(evaluation);
    },
    []
  );

  // Live Routines & Supervision State
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [history, setHistory] = useState<RoutineAttemptRecord[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const caregiverUid =
    currentUser?.role === 'caregiver'
      ? currentUser.uid
      : isExplicitLocalDemo()
      ? 'demo-caregiver-001'
      : (currentUser?.uid || '');

  // Load patient routines and assisted-recall history
  const loadPatientData = useCallback(async (targetPatientId: string) => {
    if (!targetPatientId) {
      setIsLoadingRoutines(false);
      return;
    }
    setIsSyncing(true);
    try {
      // 1. Live routines
      const cloudRoutines = await RoutineService.syncRoutinesFromFirestore(targetPatientId);
      setRoutines(cloudRoutines);

      // 2. Live history
      const cloudHistory = await RoutineService.syncHistoryFromFirestore(targetPatientId);
      setHistory(cloudHistory);

      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn('[CaregiverDashboard] Failed to sync patient routines, using local cache:', err);
      setRoutines(RoutineService.getRoutines(targetPatientId));
      setHistory(RoutineService.getHistory(targetPatientId));
    } finally {
      setIsLoadingRoutines(false);
      setIsSyncing(false);
    }
  }, []);

  // Load connected patient info
  useEffect(() => {
    let isMounted = true;
    CaregiverService.getConnectedPatient(caregiverUid)
      .then((info) => {
        if (isMounted) {
          setPatientInfo(info);
          if (info.relationshipStatus !== 'active' || !info.patientId) {
            setIsLoadingRoutines(false);
          }
        }
      })
      .catch((err) => {
        console.warn('[CaregiverDashboard] Error fetching patient info:', err);
        if (isMounted) {
          setPatientInfo({
            patientId: '',
            patientName: 'Unable to Load Patient',
            relationshipStatus: 'none',
            permissions: { ...EMPTY_CAREGIVER_PERMISSIONS },
            error: err instanceof Error ? err.message : 'Error retrieving relationship',
          });
          setIsLoadingRoutines(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [caregiverUid, loadPatientData]);

  useEffect(() => {
    if (patientInfo.patientId && patientInfo.relationshipStatus === 'active') {
      loadPatientData(patientInfo.patientId);
    }
  }, [patientInfo.patientId, patientInfo.relationshipStatus, loadPatientData]);

  // Real-time ecosystem reactivity: when patient completes routines or clinician prescribes care plans
  useEffect(() => {
    if (!patientInfo.patientId || patientInfo.relationshipStatus !== 'active') return;
    const unsubscribe = subscribeToDataChanges(({ patientId: changedId }) => {
      if (changedId === patientInfo.patientId || changedId === 'all') {
        loadPatientData(patientInfo.patientId);
      }
    });
    return () => unsubscribe();
  }, [patientInfo.patientId, patientInfo.relationshipStatus, loadPatientData]);

  // Dynamic calculations from actual verified data
  const progress = RoutineService.calculateProgress(routines);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttempts = history.filter((h) => h.date === todayStr);
  const latestTodayAttempt = todayAttempts.length > 0 ? todayAttempts[0] : null;

  const completedRoutines = routines.filter((r) => r.isCompleted);
  const lastCompletedRoutine = completedRoutines.length > 0
    ? completedRoutines[completedRoutines.length - 1]
    : null;

  const morningRoutines = routines.filter((r) => r.period === 'morning');
  const afternoonRoutines = routines.filter((r) => r.period === 'afternoon');
  const eveningRoutines = routines.filter((r) => r.period === 'evening');
  const adherenceRate = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto space-y-6">
      {/* Demonstration Banner */}
      {isExplicitLocalDemo() && (
        <div data-testid="caregiver-demo-badge" className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl px-4 py-2.5 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>{t('caregiver.demo_badge')}</span>
          </div>
          <span className="text-2xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Local Sandbox</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-600 rounded-3xl p-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
            <HeartHandshake className="w-4 h-4" />
            <span>{t('caregiver.dashboard_title')}</span>
          </div>
          {isSyncing && (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-100 bg-white/10 px-2.5 py-1 rounded-full">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{t('caregiver.syncing_live')}</span>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold">{t('caregiver.welcome_name', { name: currentUser?.displayName || 'Caregiver' })}</h1>
        <p className="text-xs md:text-sm text-emerald-100 mt-1">
          {t('caregiver.caring_for', { name: patientInfo.patientName })} •{' '}
          <span className="capitalize">{patientInfo.relationshipStatus}</span> {t('caregiver.status_active')}
          {lastSyncTime && ` • ${t('caregiver.last_synced', { time: lastSyncTime })}`}
        </p>
      </div>

      {/* If Caregiver has an active verified relationship */}
      {patientInfo.relationshipStatus === 'active' ? (
        <>
          {/* Urgent Safe Zone Alert Banner */}
          {safetyTrackingStatus === 'OUTSIDE_SAFE_ZONE' && !alertAcknowledged && (
            <div
              data-testid="urgent-safety-alert-banner"
              className="bg-rose-600 text-white p-5 rounded-3xl shadow-xl border-2 border-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-black flex items-center gap-2">
                    <span>{t('caregiver.urgent_alert_title')}</span>
                    <span className="text-[10px] bg-rose-900/60 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Urgent
                    </span>
                  </h3>
                  <p className="text-xs text-rose-100 mt-1 leading-relaxed">
                    {patientInfo.patientName} is approximately{' '}
                    <strong>{safetyEvaluation?.distanceMeters || 650}m</strong> from home (geofence radius: {geofenceRadius}m).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
                <a
                  href="tel:+919876543210"
                  className="flex-1 sm:flex-none px-3.5 py-2 min-h-[44px] bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-black shadow transition flex items-center justify-center gap-1.5"
                  aria-label="Call Patient"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Patient</span>
                </a>
                <a
                  href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=12.9716%2C77.5946%3B12.9780%2C77.5990`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-3.5 py-2 min-h-[44px] bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold border border-rose-400 flex items-center justify-center gap-1.5 transition"
                  aria-label="Get Walking Directions"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get Directions</span>
                </a>
                <button
                  type="button"
                  onClick={() => setAlertAcknowledged(true)}
                  className="flex-1 sm:flex-none px-3.5 py-2 min-h-[44px] bg-rose-900/80 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                  aria-label="Acknowledge Alert"
                >
                  <span>Acknowledge</span>
                </button>
              </div>
            </div>
          )}

          {/* Connected Patient Quick Status (Truthful Live Data) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Routine Completion */}
            <div
              data-testid="caregiver-routine-progress-card"
              className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-soft-purple"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-gray-400">Routines Today</span>
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-saksham-darkText">
                {progress.total > 0
                  ? `${progress.completed} / ${progress.total} Done`
                  : '0 / 0 Done'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {progress.total === 0
                  ? 'No routines scheduled today'
                  : lastCompletedRoutine
                  ? `${lastCompletedRoutine.title} completed${
                      lastCompletedRoutine.completedAt ? ` at ${lastCompletedRoutine.completedAt}` : ''
                    }`
                  : `${progress.remaining} routines pending today`}
              </p>
            </div>

            {/* Card 2: Assisted Recall Usage (Truthful) */}
            <div
              data-testid="caregiver-assisted-recall-card"
              className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-soft-purple"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-gray-400">3-Chance Assisted Recall</span>
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-saksham-darkText">
                {latestTodayAttempt
                  ? `Level ${latestTodayAttempt.attemptsUsed} Cue`
                  : 'No attempts today'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {latestTodayAttempt
                  ? `Patient completed recall on attempt ${latestTodayAttempt.attemptsUsed} today`
                  : 'No assisted recall attempts recorded yet today'}
              </p>
            </div>

            {/* Card 3: Safety Status (Dynamic) */}
            <div
              className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-soft-purple"
              data-testid="caregiver-safety-status-card"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-gray-400">Safety Status</span>
                {safetyTrackingStatus === 'OUTSIDE_SAFE_ZONE' ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                )}
              </div>
              <div
                className={`text-2xl font-black ${
                  safetyTrackingStatus === 'OUTSIDE_SAFE_ZONE'
                    ? 'text-rose-600'
                    : 'text-emerald-700'
                }`}
              >
                {safetyTrackingStatus === 'OUTSIDE_SAFE_ZONE'
                  ? 'Outside Safe Zone'
                  : safetyTrackingStatus === 'TRACKING_PAUSED'
                  ? 'Tracking Paused'
                  : safetyTrackingStatus === 'POOR_ACCURACY'
                  ? 'Low GPS Accuracy'
                  : 'Inside Safe Zone'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {safetyTrackingStatus === 'OUTSIDE_SAFE_ZONE'
                  ? `${safetyEvaluation?.distanceMeters || 650}m from home geofence`
                  : `Home Geofence active (${geofenceRadius}m radius)`}
              </p>
            </div>
          </div>

          {/* Routine Supervision Section (Truthful Live Data) */}
          <section
            data-testid="caregiver-routine-monitoring-section"
            className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft-purple space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-saksham-darkText">
                  Authorized Routine Monitoring
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Live schedule and completion tracking for {patientInfo.patientName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadPatientData(patientInfo.patientId)}
                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                title="Refresh patient routines"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoadingRoutines ? (
              <div className="py-6 text-center text-xs text-gray-500">
                Loading patient routines...
              </div>
            ) : routines.length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-gray-50/70 border border-gray-200">
                <CalendarCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No routines found</p>
                <p className="text-xs text-gray-500 mt-1">
                  No daily care routines are currently configured for {patientInfo.patientName}.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {routines.map((routine) => (
                  <div
                    key={routine.id}
                    data-testid={`caregiver-routine-item-${routine.id}`}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      routine.isCompleted
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-white border-gray-200 hover:border-emerald-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            routine.isCompleted
                              ? 'text-emerald-800 bg-white border border-emerald-200'
                              : 'text-purple-700 bg-purple-50'
                          }`}
                        >
                          {routine.scheduledTime}
                        </span>
                        <span className="text-2xs font-semibold uppercase text-gray-500">
                          {routine.period} • {routine.category}
                        </span>
                        {routine.enableAssistedRecall && (
                          <span className="text-3xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium border border-purple-200">
                            Assisted Recall
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-saksham-darkText">
                        {routine.title}
                      </h4>
                      <p className="text-xs text-gray-500">{routine.description}</p>
                    </div>

                    <div className="shrink-0 self-start sm:self-center">
                      {routine.isCompleted ? (
                        <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold bg-emerald-100/70 px-3 py-1 rounded-xl">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Completed {routine.completedAt ? `(${routine.completedAt})` : ''}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 font-semibold inline-block">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Adherence & Routine Review Summary (TASK-ROUTINE-03) */}
            {routines.length > 0 && (
              <div
                data-testid="caregiver-routine-adherence-summary"
                className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Routine Adherence & Review Summary
                    </span>
                    <span className="text-[10px] font-bold bg-white text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                      {adherenceRate}% Completion Rate
                    </span>
                  </div>
                  <span className="text-xs text-emerald-800 font-semibold">
                    {progress.completed} of {progress.total} Completed Today
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Morning</span>
                    <span className="font-extrabold text-sm text-slate-800">
                      {morningRoutines.filter((r) => r.isCompleted).length} / {morningRoutines.length}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Afternoon</span>
                    <span className="font-extrabold text-sm text-slate-800">
                      {afternoonRoutines.filter((r) => r.isCompleted).length} / {afternoonRoutines.length}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Evening</span>
                    <span className="font-extrabold text-sm text-slate-800">
                      {eveningRoutines.filter((r) => r.isCompleted).length} / {eveningRoutines.length}
                    </span>
                  </div>
                </div>

                {todayAttempts.length > 0 && (
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 text-xs text-emerald-900 flex items-center justify-between">
                    <span className="font-medium">
                      🧠 Assisted Recall: {todayAttempts.length} routine {todayAttempts.length === 1 ? 'task' : 'tasks'} supported with progressive cues today.
                    </span>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      Zero Pressure Support
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Caregiver Calendar View (Day / Week / Agenda) */}
          <CaregiverCalendarView
            patientId={patientInfo.patientId}
            patientName={patientInfo.patientName}
            permissions={patientInfo.permissions}
            caregiverId={caregiverUid}
          />

          {/* Consent-Governed Geofencing & Location Module */}
          <CaregiverSafeZoneMap
            patientId={patientInfo.patientId}
            patientName={patientInfo.patientName}
            initialRadiusMeters={geofenceRadius}
            onStatusChange={handleSafetyStatusChange}
          />

          {/* Evidence-Based Weekly Observation Report (TASK-CARE-01 & 02) */}
          <CaregiverObservationReport
            patientId={patientInfo.patientId}
            patientName={patientInfo.patientName}
            routines={routines}
            history={history}
          />

          {/* Stage 3 Phase C: Adaptive Care Proposals & Support Review */}
          <CaregiverProposalReview
            patientId={patientInfo.patientId}
            patientName={patientInfo.patientName}
            caregiverId={caregiverUid}
            isAuthorized={patientInfo.relationshipStatus === 'active'}
          />

          {/* Phase 3.4: Caregiver Dyadic Step-Pattern Dashboard & Adaptive Daily Living */}
          <CaregiverStepPatternDashboard
            patientId={patientInfo.patientId}
            patientName={patientInfo.patientName}
            isAuthorized={patientInfo.relationshipStatus === 'active'}
          />

          {/* Phase 3.11: Caregiver Dyadic Care Coordination & Active Support */}
          <CaregiverDyadicCoordinationView
            patientId={patientInfo.patientId}
            patientName={patientInfo.patientName}
            caregiverId={caregiverUid}
            caregiverName={currentUser?.displayName || 'Family Caregiver'}
            isAuthorized={patientInfo.relationshipStatus === 'active'}
            routines={routines}
          />

          {/* Stage 3 Phase D: Clinical Appointment Preparation & Longitudinal Brief */}
          <section
            data-testid="caregiver-appointment-prep-section"
            className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft-purple space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200 shadow-2xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">
                    Clinical Appointment Preparation & Summary Export
                  </h3>
                  <p className="text-xs text-gray-500">
                    Prepare questions and compile multi-week behavioral records for doctor consultations
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  data-testid="open-caregiver-concern-modal-btn"
                  onClick={() => setIsConcernModalOpen(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center space-x-1.5 shrink-0"
                >
                  <span>+ Log Daily Observation</span>
                </button>
                <button
                  type="button"
                  data-testid="open-appointment-summary-modal-btn"
                  onClick={() => setIsSummaryModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center space-x-1.5 shrink-0"
                >
                  <FileText className="w-4 h-4" />
                  <span>Prepare Appointment Brief</span>
                </button>
              </div>
            </div>
          </section>

          {/* Appointment Summary Modal */}
          <AppointmentSummaryModal
            isOpen={isSummaryModalOpen}
            onClose={() => setIsSummaryModalOpen(false)}
            patientId={patientInfo.patientId}
            patientName={patientInfo.patientName}
            authorId={caregiverUid}
            authorName={currentUser?.displayName || 'Caregiver'}
            authorRole="caregiver"
          />

          {/* Structured Cognitive Concern Modal */}
          <CognitiveConcernModal
            isOpen={isConcernModalOpen}
            onClose={() => setIsConcernModalOpen(false)}
            patientId={patientInfo.patientId}
            patientName={patientInfo.patientName}
            perspective="caregiver"
            currentUserId={caregiverUid}
            currentUserName={currentUser?.displayName || 'Caregiver'}
          />
        </>
      ) : (
        /* Safe Unlinked, Pending, or Errored State (No Fabricated Patient Fallback) */
        <div
          data-testid="caregiver-unlinked-state"
          className="bg-white rounded-3xl p-6 md:p-8 border-2 border-emerald-100 shadow-soft-purple text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {patientInfo.error
              ? 'Unable to Retrieve Care Relationship'
              : patientInfo.relationshipStatus === 'pending'
              ? 'Care Link Pending Confirmation'
              : patientInfo.relationshipStatus === 'revoked'
              ? 'Care Link Inactive'
              : 'No Patient Linked'}
          </h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            {patientInfo.error
              ? `There was an issue checking your authorized care relationship (${patientInfo.error}). Please verify your network connection and retry.`
              : patientInfo.relationshipStatus === 'pending'
              ? 'Your request to connect with your loved one is currently awaiting patient confirmation. Once approved, routine schedules and calendar permissions will appear here.'
              : patientInfo.relationshipStatus === 'revoked'
              ? 'Access to this patient account has been revoked by the patient or administrator.'
              : 'Your caregiver account is not currently connected to an active patient record. An active care relationship must be established before patient routines and calendar appointments can be supervised.'}
          </p>
          <div className="flex justify-center pt-2">
            <button
              type="button"
              data-testid="caregiver-retry-btn"
              onClick={() => {
                setIsLoadingRoutines(true);
                CaregiverService.getConnectedPatient(caregiverUid).then((info) => {
                  setPatientInfo(info);
                  if (info.relationshipStatus === 'active' && info.patientId) {
                    loadPatientData(info.patientId);
                  } else {
                    setIsLoadingRoutines(false);
                  }
                });
              }}
              className="px-5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition"
            >
              Retry Relationship Check
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
