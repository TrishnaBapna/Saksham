import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { usePatientExperienceSafe } from '../../context/PatientExperienceContext.js';
import { getLovedOneModalUi } from '../../features/lovedOnes/utils/lovedOneFormTranslation.js';
import { ConversationalSanctuaryStage } from '../../features/ai-companion/components/ConversationalSanctuaryStage.js';
import { AssistanceTrayModal } from '../../features/routines/AssistanceTrayModal.js';
import { GuidedTaskRunner } from '../../features/routines/components/GuidedTaskRunner.js';
import { ActivityReminderModal } from '../../features/routines/components/ActivityReminderModal.js';
import { AssistedRecallEngine, RecallSessionState } from '../../features/routines/components/AssistedRecallEngine.js';
import { RoutineChecklist } from '../../features/routines/components/RoutineChecklist.js';
import { DailyProgressRing } from '../../features/routines/components/DailyProgressRing.js';
import { AddRoutineModal } from '../../features/routines/components/AddRoutineModal.js';
import { PatientCareTeamCard } from '../../features/relationships/components/PatientCareTeamCard.js';
import { PatientLocationConsentModal } from '../../features/safety/components/PatientLocationConsentModal.js';
import { GPSService, DEFAULT_SAFE_ZONE_RADIUS_METERS } from '../../services/gpsService.js';
import { GeofenceConfig, PatientLocationUpdate } from '../../features/safety/types/safety.types.js';
import { getGpsSafetyUi, formatGpsSafetyMessage } from '../../features/safety/utils/gpsSafetyTranslation.js';
import { RoutineItem, RoutineAttemptRecord } from '../../types/index.js';
import { RoutineService } from '../../features/routines/services/routineService.js';
import { NotificationService } from '../../features/notifications/services/notificationService.js';
import { InAppNotification } from '../../features/notifications/types/notification.types.js';
import { getRoutineSyncUi } from '../../features/routines/utils/caregiverRoutineSyncTranslation.js';
import {
  getEffectivePatientId,
  isGuestPatient,
  subscribeToDataChanges,
} from '../../features/auth/services/identityService.js';
import {
  Sparkles,
  TrendingUp,
  Award,
  Calendar,
  Bell,
  X,
  Navigation,
  ShieldCheck,
  MapPin,
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { language, t, formatDate } = useLanguage();
  const dashUi = getLovedOneModalUi(language);
  const syncUi = getRoutineSyncUi(language);
  const safetyUi = getGpsSafetyUi(language);
  const { isAshaOnly } = usePatientExperienceSafe();

  const patientId = getEffectivePatientId(currentUser);
  const patientName = currentUser?.displayName || 'Sunita';

  // Format today's date in a reassuring human format in active language
  const todayFormatted = formatDate(new Date());

  // Dynamic Routines and History from Shared Service Layer
  const [routines, setRoutines] = useState<RoutineItem[]>(() =>
    RoutineService.getRoutines(patientId)
  );

  const [history, setHistory] = useState<RoutineAttemptRecord[]>(() =>
    RoutineService.getHistory(patientId)
  );

  const [currentRoutineId, setCurrentRoutineId] = useState<string>('routine-02');
  const [isAssistanceOpen, setIsAssistanceOpen] = useState(false);
  const [activeRoutineForRunner, setActiveRoutineForRunner] = useState<RoutineItem | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [routineTab, setRoutineTab] = useState<'assistedRecall' | 'checklist'>('assistedRecall');
  const [recallIndex, setRecallIndex] = useState<number>(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isLocationConsentModalOpen, setIsLocationConsentModalOpen] = useState<boolean>(false);
  const [recallSessions, setRecallSessions] = useState<Record<string, RecallSessionState>>({});
  const [geofenceConfig, setGeofenceConfig] = useState<GeofenceConfig | null>(() =>
    GPSService.getStoredGeofenceConfig(patientId)
  );
  const [latestGpsLocation, setLatestGpsLocation] = useState<PatientLocationUpdate | null>(() =>
    GPSService.getStoredLatestLocation(patientId)
  );
  const [gpsConsentActive, setGpsConsentActive] = useState<boolean>(() =>
    GPSService.isConsentEnabled(patientId)
  );
  const [routineUpdates, setRoutineUpdates] = useState<InAppNotification[]>(() =>
    NotificationService.getNotifications(patientId, 'patient').filter(
      (n) =>
        !n.read &&
        ['ROUTINE_ADDED', 'ROUTINE_UPDATED', 'ROUTINE_REORDERED', 'ROUTINE_DELETED'].includes(n.type)
    )
  );

  const handleUpdateRecallSession = (routineId: string, session: RecallSessionState) => {
    setRecallSessions((prev) => ({
      ...prev,
      [routineId]: session,
    }));
  };

  // Synchronize with Cloud Firestore on mount & subscribe to cross-module & caregiver live updates
  useEffect(() => {
    const syncUnreadRoutineUpdates = () => {
      const unread = NotificationService.getNotifications(patientId, 'patient').filter(
        (n) =>
          !n.read &&
          ['ROUTINE_ADDED', 'ROUTINE_UPDATED', 'ROUTINE_REORDERED', 'ROUTINE_DELETED'].includes(n.type)
      );
      setRoutineUpdates(unread);
    };

    // Initial local read
    setRoutines(RoutineService.getRoutines(patientId));
    setHistory(RoutineService.getHistory(patientId));
    syncUnreadRoutineUpdates();

    // One-time cloud history fetch + real-time Firestore listeners for routines & notifications
    RoutineService.syncRoutinesFromFirestore(patientId).then((cloudItems) => {
      if (cloudItems && cloudItems.length > 0) {
        setRoutines(cloudItems);
      }
    });

    const unsubscribeCloudRoutines = RoutineService.subscribeToRoutinesFromFirestore(
      patientId,
      (liveRoutines) => {
        setRoutines(liveRoutines);
      }
    );

    const unsubscribeCloudNotifications = NotificationService.subscribeToFirestoreNotifications(patientId);
    const unsubscribeNotifLocal = NotificationService.subscribe(() => {
      syncUnreadRoutineUpdates();
    });

    const unsubGeofence = GPSService.subscribeToGeofenceConfig(patientId, setGeofenceConfig);
    const unsubLatestGps = GPSService.subscribeToLatestLocation(patientId, setLatestGpsLocation);

    // Cross-module reactivity listener
    const unsubscribe = subscribeToDataChanges(({ patientId: changedId }) => {
      if (changedId === patientId || isGuestPatient(patientId) || changedId === 'all') {
        setRoutines(RoutineService.getRoutines(patientId));
        setHistory(RoutineService.getHistory(patientId));
        syncUnreadRoutineUpdates();
        setGpsConsentActive(GPSService.isConsentEnabled(patientId));
        setGeofenceConfig(GPSService.getStoredGeofenceConfig(patientId));
        setLatestGpsLocation(GPSService.getStoredLatestLocation(patientId));
      }
    });

    // Event listener for Asha conversational Guided Task Runner launch
    const handleLaunchRunner = (e: Event) => {
      const customEvt = e as CustomEvent<{ routineId?: string }>;
      const rid = customEvt.detail?.routineId;
      const latestList = RoutineService.getRoutines(patientId);
      const target = latestList.find((r) => r.id === rid) || activeRoutine || latestList[0];
      if (target) {
        setActiveRoutineForRunner(target);
      }
    };
    window.addEventListener('saksham:launch-routine-runner', handleLaunchRunner);

    return () => {
      unsubscribeCloudRoutines();
      unsubscribeCloudNotifications();
      unsubscribeNotifLocal();
      unsubGeofence();
      unsubLatestGps();
      unsubscribe();
      window.removeEventListener('saksham:launch-routine-runner', handleLaunchRunner);
    };
  }, [patientId, currentUser]);

  // Dynamic Progress and Streak Calculations
  const progress = useMemo(() => RoutineService.calculateProgress(routines), [routines]);
  const currentStreak = useMemo(() => RoutineService.calculateStreak(history), [history]);

  // Determine current active/next routine to display
  const activeRoutine: RoutineItem | null = useMemo(() => {
    if (!routines || routines.length === 0) return null;
    return (
      routines.find((r) => r.id === currentRoutineId || r.id.endsWith(currentRoutineId)) ||
      routines.find((r) => !r.isCompleted) ||
      routines[0]
    );
  }, [routines, currentRoutineId]);

  const handleSnooze = (routine: RoutineItem, minutes: number) => {
    const updated = RoutineService.snoozeRoutine(routine, minutes);
    setRoutines((prev) => prev.map((r) => (r.id === routine.id ? updated : r)));
  };

  const handleToggleRoutineById = async (id: string) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;
    const newCompleted = !routine.isCompleted;

    // Optimistic immediate update for synchronous test runners and fluid UX
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              isCompleted: newCompleted,
              completedAt: newCompleted
                ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : undefined,
            }
          : r
      )
    );

    const updated = await RoutineService.updateRoutineCompletion(
      patientId,
      id,
      newCompleted
    );
    if (updated) {
      setRoutines(RoutineService.getRoutines(patientId));
      setHistory(RoutineService.getHistory(patientId));
    }
  };

  const handleRecordAttempt = (
    routineId: string,
    attemptsUsed: number,
    skipped: boolean,
    completed: boolean
  ) => {
    RoutineService.recordAttempt(patientId, routineId, attemptsUsed, skipped, completed);
    setHistory(RoutineService.getHistory(patientId));
  };

  const handleAddNewRoutine = (newRoutine: RoutineItem) => {
    RoutineService.addRoutine(patientId, newRoutine);
    setRoutines((prev) => [newRoutine, ...prev]);
  };

  const handleFeedback = (feedback: string, attempts: number) => {
    console.log(`Assisted recall feedback logged: ${feedback} after ${attempts} attempts`);
  };

  return (
    <div className={`${isAshaOnly ? 'pb-10' : 'pb-28'} pt-4 px-4 max-w-4xl mx-auto space-y-6`}>
      {/* 1. Saksham Branding & Compassionate Welcome Header */}
      <header
        aria-label={dashUi.dashHeaderAria}
        className="bg-gradient-to-r from-purple-700 via-purple-600 to-lavender-600 rounded-3xl p-5 text-white shadow-soft-purple relative overflow-hidden"
      >
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between text-lavender-200 text-xs font-semibold mb-2">
          <div className="flex items-center space-x-1.5 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('app.title')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-white/15 px-2.5 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-xs">
              <Calendar className="w-3 h-3" />
              <span>{todayFormatted}</span>
            </div>
          </div>
        </div>

        {/* Subtle Status Indicator: Data Freshness & Ecosystem Sync */}
        <div className="inline-flex items-center space-x-1.5 bg-white/15 border border-white/20 px-2.5 py-0.5 rounded-full text-[11px] text-lavender-100 mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium">{t('app.sanctuary_synchronized')}</span>
        </div>

        <h1 className="text-xl md:text-2xl font-bold leading-tight">
          {t('patient.welcome_name', { name: patientName })}
        </h1>
        <p className="text-xs md:text-sm text-lavender-100 mt-1.5">
          {t('patient.peaceful_day')}
        </p>
      </header>

      {/* 2. Asha Conversational Sanctuary Stage */}
      <section aria-label={dashUi.dashCompanionAria}>
        <ConversationalSanctuaryStage
          patientName={patientName}
          onNavigateRoutines={() => {
            const el = document.getElementById('daily-routines-workspace');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onLaunchRoutineRunner={(routine) => setActiveRoutineForRunner(routine)}
        />
      </section>

      {/* 3. Dynamic Daily Progress Card featuring Circular DailyProgressRing */}
      <section
        aria-label={dashUi.dashProgressAria}
        className="bg-gradient-to-r from-purple-700 via-purple-600 to-lavender-600 rounded-3xl p-5 text-white shadow-soft-purple relative overflow-hidden"
      >
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex-1 space-y-2 w-full">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1 text-lavender-200 uppercase tracking-wider font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>{t('progress.title')}</span>
              </div>
              <span className="flex items-center space-x-1 bg-white/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <Award className="w-3.5 h-3.5 text-yellow-300" />
                <span>{t('progress.streak_days', { count: currentStreak })}</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <h2 className="text-2xl font-extrabold">
                {t('progress.completed_of', { completed: progress.completed, total: progress.total })}
              </h2>
              <span className="text-lg font-bold text-lavender-100">
                {progress.percentage}%
              </span>
            </div>

            <div className="w-full bg-white/25 rounded-full h-3 overflow-hidden p-0.5 mt-2">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>

            <p className="text-xs text-lavender-100 mt-2">
              {progress.completed === 0
                ? t('progress.encouragement_none')
                : progress.completed === progress.total
                ? t('progress.encouragement_all')
                : t('progress.encouragement_some')}
            </p>
          </div>

          <div className="shrink-0 flex items-center justify-center">
            <DailyProgressRing
              completed={progress.completed}
              total={progress.total}
              percentage={progress.percentage}
              size={130}
              strokeWidth={9}
            />
          </div>
        </div>
      </section>

      {/* 3. Central Daily Routine Care Workspace directly on Home Page */}
      <section id="daily-routines-workspace" aria-label={dashUi.dashWorkspaceAria} className="space-y-4">
        {/* Live In-App Caregiver Routine Update Banner */}
        {routineUpdates.length > 0 && (
          <div
            data-testid="patient-routine-update-banner"
            role="status"
            className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-emerald-950">
                  {syncUi.patientBannerTitle}
                </h3>
                <ul className="space-y-0.5 text-xs text-emerald-900 font-medium">
                  {routineUpdates.slice(0, 3).map((n) => (
                    <li key={n.id}>• {n.message}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                data-testid="patient-routine-banner-view-btn"
                onClick={async () => {
                  setRoutineTab('checklist');
                  for (const n of routineUpdates) {
                    await NotificationService.markAsRead(patientId, n.id);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer transition"
              >
                {syncUi.patientViewTasksBtn}
              </button>
              <button
                type="button"
                data-testid="patient-routine-banner-dismiss-btn"
                onClick={async () => {
                  for (const n of routineUpdates) {
                    await NotificationService.dismissNotification(patientId, n.id);
                  }
                }}
                className="p-2 rounded-xl bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                aria-label={syncUi.dismissBtn}
                title={syncUi.dismissBtn}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Two-View Routine Subtab Switcher directly on Home Page */}
        <div className="flex bg-purple-50/80 p-1.5 rounded-2xl border border-purple-200/90 gap-1.5 shadow-2xs">
          <button
            onClick={() => setRoutineTab('assistedRecall')}
            className={`flex-1 py-3 px-2 text-xs md:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center space-x-1.5 min-h-[48px] cursor-pointer ${
              routineTab === 'assistedRecall'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-900/80 hover:bg-white/80 bg-white/60'
            }`}
            aria-label={dashUi.dashRecallTabAria}
          >
            <span>{t('routines.tab_assisted_recall')}</span>
          </button>

          <button
            onClick={() => setRoutineTab('checklist')}
            className={`flex-1 py-3 px-2 text-xs md:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center space-x-1.5 min-h-[48px] cursor-pointer ${
              routineTab === 'checklist'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-900/80 hover:bg-white/80 bg-white/60'
            }`}
            aria-label={dashUi.dashChecklistTabAria}
          >
            <span>{t('routines.tab_checklist')}</span>
          </button>
        </div>

        {/* 5. Routine View Content directly embedded on Home Page */}
        {routineTab === 'assistedRecall' ? (
          <AssistedRecallEngine
            routines={routines}
            currentIndex={recallIndex}
            onNavigateIndex={(idx) => setRecallIndex(idx)}
            onComplete={(id) => handleToggleRoutineById(id)}
            onLaunchTaskRunner={(routine) => setActiveRoutineForRunner(routine)}
            onRecordAttempt={handleRecordAttempt}
            onLaunchAssistanceTray={(routine) => {
              setCurrentRoutineId(routine.id);
              setIsAssistanceOpen(true);
            }}
            language={language}
            session={routines[recallIndex] ? recallSessions[routines[recallIndex].id] : undefined}
            onUpdateSession={handleUpdateRecallSession}
          />
        ) : (
          <RoutineChecklist
            routines={routines}
            onToggleComplete={(id) => handleToggleRoutineById(id)}
            onSnooze={handleSnooze}
            onLaunchTaskRunner={(routine) => setActiveRoutineForRunner(routine)}
            onLaunchAssistedRecall={(routine) => {
              const idx = routines.findIndex((r) => r.id === routine.id);
              if (idx >= 0) setRecallIndex(idx);
              setRoutineTab('assistedRecall');
            }}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            language={language}
          />
        )}
      </section>

      {/* 4. Home Safe Zone & Guide Me Home GPS Card */}
      {(() => {
        const activeRadius = geofenceConfig?.radiusMeters || DEFAULT_SAFE_ZONE_RADIUS_METERS;
        const hasFix = Boolean(latestGpsLocation && gpsConsentActive);
        const liveDistance =
          hasFix && geofenceConfig
            ? Math.round(
                GPSService.calculateHaversineDistance(
                  {
                    latitude: latestGpsLocation!.latitude,
                    longitude: latestGpsLocation!.longitude,
                  },
                  {
                    latitude: geofenceConfig.centerLatitude,
                    longitude: geofenceConfig.centerLongitude,
                  }
                )
              )
            : null;
        const isOutside = liveDistance !== null && liveDistance > activeRadius;

        return (
          <section
            data-testid="patient-gps-safety-card"
            aria-label={safetyUi.patientCardTitle}
            className={`rounded-3xl p-5 border-2 shadow-soft-purple space-y-3 ${
              isOutside
                ? 'bg-rose-50 border-rose-300'
                : 'bg-white border-emerald-100'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isOutside
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-saksham-darkText">
                    {safetyUi.patientCardTitle}
                  </h2>
                  <p className="text-xs text-gray-600">{safetyUi.patientCardSubtitle}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      {safetyUi.patientHomeLabel}: {geofenceConfig?.addressLabel || 'Home Sanctuary'} ({activeRadius}m)
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full border ${
                        !gpsConsentActive
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : isOutside
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : hasFix
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-purple-50 text-purple-800 border-purple-200'
                      }`}
                    >
                      {!gpsConsentActive
                        ? safetyUi.patientStatusPaused
                        : isOutside
                        ? safetyUi.patientStatusOutside
                        : liveDistance !== null
                        ? `${safetyUi.patientStatusInside} • ${formatGpsSafetyMessage(safetyUi.patientDistanceFromHome, { meters: liveDistance })}`
                        : safetyUi.patientStatusAwaiting}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <a
                  href="/patient/home-guide"
                  data-testid="patient-guide-me-home-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('saksham:navigate', { detail: '/patient/home-guide' }));
                  }}
                  className="px-4 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-2 transition min-h-[44px]"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{safetyUi.patientGuideMeHomeBtn}</span>
                </a>
                <button
                  type="button"
                  data-testid="patient-gps-privacy-btn"
                  onClick={() => setIsLocationConsentModalOpen(true)}
                  className="px-3 py-2.5 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold cursor-pointer min-h-[44px]"
                >
                  {safetyUi.patientPrivacyLink}
                </button>
              </div>
            </div>
          </section>
        );
      })()}

      {/* 5. My Care Team (Admin-Approved Doctors & Caregivers) */}
      <PatientCareTeamCard patientId={patientId} currentUser={currentUser} />

      <PatientLocationConsentModal
        isOpen={isLocationConsentModalOpen}
        onClose={() => {
          setIsLocationConsentModalOpen(false);
          setGpsConsentActive(GPSService.isConsentEnabled(patientId));
        }}
        patientId={patientId}
        onConsentChange={(nextVal) => setGpsConsentActive(nextVal)}
      />

      {/* 3-Chance Assisted Recall Tray Modal */}
      {activeRoutine && (
        <AssistanceTrayModal
          isOpen={isAssistanceOpen}
          routine={activeRoutine}
          onClose={() => setIsAssistanceOpen(false)}
          onFeedback={handleFeedback}
        />
      )}

      {/* Guided Step-by-Step Task Runner Modal (Screenshot 2) */}
      {activeRoutineForRunner && (
        <GuidedTaskRunner
          routine={activeRoutineForRunner}
          isOpen={Boolean(activeRoutineForRunner)}
          onClose={() => setActiveRoutineForRunner(null)}
          onFinish={(routineId) => handleToggleRoutineById(routineId || activeRoutineForRunner.id)}
          defaultViewMode="checklist"
          language={language}
          patientId={patientId}
        />
      )}

      {/* Activity Reminder Alert Modal (Screenshot 3) */}
      {isReminderModalOpen && activeRoutine && (
        <ActivityReminderModal
          task={activeRoutine}
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          onOpenGuidedSteps={(task: RoutineItem) => {
            setIsReminderModalOpen(false);
            setActiveRoutineForRunner(task);
          }}
          onComplete={() => {
            handleToggleRoutineById(activeRoutine.id);
            setIsReminderModalOpen(false);
          }}
          onSnooze={(task: RoutineItem, mins: number) => {
            handleSnooze(task, mins);
            setIsReminderModalOpen(false);
          }}
        />
      )}

      {/* Add Routine Modal */}
      <AddRoutineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddRoutine={(newRoutine) => {
          handleAddNewRoutine(newRoutine);
          setIsAddModalOpen(false);
        }}
        patientId={patientId}
      />
    </div>
  );
};
