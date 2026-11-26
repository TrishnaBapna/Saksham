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
import { RoutineItem, RoutineAttemptRecord } from '../../types/index.js';
import { RoutineService } from '../../features/routines/services/routineService.js';
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
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { language, t, formatDate } = useLanguage();
  const dashUi = getLovedOneModalUi(language);
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
  const [recallSessions, setRecallSessions] = useState<Record<string, RecallSessionState>>({});

  const handleUpdateRecallSession = (routineId: string, session: RecallSessionState) => {
    setRecallSessions((prev) => ({
      ...prev,
      [routineId]: session,
    }));
  };

  // Synchronize with Cloud Firestore on mount & subscribe to cross-module updates
  useEffect(() => {
    // Initial local read
    setRoutines(RoutineService.getRoutines(patientId));
    setHistory(RoutineService.getHistory(patientId));

    // Cloud fetch
    RoutineService.syncRoutinesFromFirestore(patientId).then((cloudItems) => {
      if (cloudItems && cloudItems.length > 0) {
        setRoutines(cloudItems);
      }
    });

    // Real-time listener: when routines or data change in any module, reflect here instantly
    const unsubscribe = subscribeToDataChanges(({ patientId: changedId }) => {
      if (changedId === patientId || isGuestPatient(patientId) || changedId === 'all') {
        setRoutines(RoutineService.getRoutines(patientId));
        setHistory(RoutineService.getHistory(patientId));
      }
    });

    // Event listener for Asha conversational Guided Task Runner launch
    const handleLaunchRunner = (e: Event) => {
      const customEvt = e as CustomEvent<{ routineId?: string }>;
      const rid = customEvt.detail?.routineId;
      const target = routines.find((r) => r.id === rid) || activeRoutine || routines[0];
      if (target) {
        setActiveRoutineForRunner(target);
      }
    };
    window.addEventListener('saksham:launch-routine-runner', handleLaunchRunner);

    return () => {
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
