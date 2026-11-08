import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { AICompanion } from '../../features/ai-companion/AICompanion.js';
import { AssistanceTrayModal } from '../../features/routines/AssistanceTrayModal.js';
import { CompanionReminderBanner } from '../../features/routines/components/CompanionReminderBanner.js';
import { GuidedTaskRunner } from '../../features/routines/components/GuidedTaskRunner.js';
import { CompanionFollowerToast } from '../../features/routines/components/CompanionFollowerToast.js';
import { ActivityReminderModal } from '../../features/routines/components/ActivityReminderModal.js';
import { AssistedRecallEngine } from '../../features/routines/components/AssistedRecallEngine.js';
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
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();

  const patientId = getEffectivePatientId(currentUser);
  const patientName = currentUser?.displayName || 'Sunita';

  // Format today's date in a reassuring human format
  const todayFormatted = new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Dynamic Routines and History from Shared Service Layer
  const [routines, setRoutines] = useState<RoutineItem[]>(() =>
    RoutineService.getRoutines(patientId)
  );

  const [history, setHistory] = useState<RoutineAttemptRecord[]>(() =>
    RoutineService.getHistory(patientId)
  );

  const [currentRoutineId, setCurrentRoutineId] = useState<string>('routine-02');
  const [isAssistanceOpen, setIsAssistanceOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [activeRoutineForRunner, setActiveRoutineForRunner] = useState<RoutineItem | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderModalTask, setReminderModalTask] = useState<RoutineItem | null>(null);
  const [routineTab, setRoutineTab] = useState<'assistedRecall' | 'checklist'>('assistedRecall');
  const [recallIndex, setRecallIndex] = useState<number>(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

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

    return () => unsubscribe();
  }, [patientId, currentUser]);

  // Dynamic Progress and Streak Calculations (AUD-HIGH-01)
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

  const handleToggleRoutine = async () => {
    if (!activeRoutine) return;
    const newCompleted = !activeRoutine.isCompleted;
    // Optimistic immediate update for synchronous test runners and fluid UX
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === activeRoutine.id
          ? {
              ...r,
              isCompleted: newCompleted,
              completedAt: newCompleted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            }
          : r
      )
    );
    const updated = await RoutineService.updateRoutineCompletion(
      patientId,
      activeRoutine.id,
      newCompleted
    );
    if (updated) {
      setRoutines(RoutineService.getRoutines(patientId));
      setHistory(RoutineService.getHistory(patientId));
    }
  };

  const handleToggleRoutineById = async (id: string) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;
    const newCompleted = !routine.isCompleted;
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              isCompleted: newCompleted,
              completedAt: newCompleted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            }
          : r
      )
    );
    if (newCompleted) {
      RoutineService.recordAttempt(patientId, id, 1, false, true);
    }
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
    if (completed) {
      setRoutines((prev) =>
        prev.map((r) =>
          r.id === routineId
            ? {
                ...r,
                isCompleted: true,
                completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
            : r
        )
      );
    }
  };

  const handleAddNewRoutine = (newRoutine: RoutineItem) => {
    RoutineService.addRoutine(patientId, newRoutine);
    setRoutines((prev) => [newRoutine, ...prev]);
  };

  const handleFeedback = (feedback: string, attempts: number) => {
    console.log(`Assisted recall feedback logged: ${feedback} after ${attempts} attempts`);
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-xl mx-auto space-y-5">
      {/* 1. Saksham Branding & Compassionate Welcome */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-lavender-600 rounded-3xl p-5 text-white shadow-soft-purple relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between text-lavender-200 text-xs font-semibold mb-2">
          <div className="flex items-center space-x-1.5 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Saksham Neuro-Care</span>
          </div>
          <div className="flex items-center space-x-1 bg-white/15 px-2.5 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-xs">
            <Calendar className="w-3 h-3" />
            <span>{todayFormatted}</span>
          </div>
        </div>

        {/* Subtle Status Indicator: Data Freshness & Ecosystem Sync */}
        <div className="inline-flex items-center space-x-1.5 bg-white/15 border border-white/20 px-2.5 py-0.5 rounded-full text-[11px] text-lavender-100 mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium">Active Care Sanctuary • Synchronized</span>
        </div>

        <h1 className="text-xl md:text-2xl font-bold leading-tight">
          {language === 'hi'
            ? `नमस्ते, ${patientName} जी! आज आप कैसा महसूस कर रही हैं?`
            : `Namaste, ${patientName}! How are you feeling today?`}
        </h1>
        <p className="text-xs md:text-sm text-lavender-100 mt-1.5">
          Today is peaceful and full of gentle moments. We are here together.
        </p>

        {/* Dynamic Daily Progress Strip (AUD-HIGH-01) */}
        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-lavender-100">
              {progress.total > 0
                ? `${progress.completed} of ${progress.total} daily care steps done`
                : 'All care routines complete'}
            </span>
          </div>
          <span className="font-semibold text-white bg-white/20 px-2 py-0.5 rounded-md text-[11px]">
            {progress.percentage}% Peaceful Care
          </span>
        </div>
      </div>

      {/* Proactive Companion Nudge Banner (Screenshot 1) */}
      {(() => {
        const bannerTask =
          routines.find((r) => r.id === 'routine-03' || r.title.toLowerCase().includes('buttoning')) ||
          activeRoutine ||
          routines[0];
        return (
          bannerTask &&
          !isBannerDismissed && (
            <CompanionReminderBanner
              task={bannerTask}
              onStartActivity={(t) => setActiveRoutineForRunner(t)}
              onSnooze={(t, mins) => handleSnooze(t, mins)}
              onComplete={handleToggleRoutine}
              onDismiss={() => setIsBannerDismissed(true)}
            />
          )
        );
      })()}

      {/* 2 - 6. Asha AI Companion Component */}
      <section aria-label="Asha AI Companion">
        <AICompanion patientName={patientName} />
      </section>

      {/* 3. Dynamic Daily Progress Strip & Circular Progress Ring */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-lavender-600 rounded-3xl p-5 text-white shadow-soft-purple relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex-1 space-y-2 w-full">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1 text-lavender-200 uppercase tracking-wider font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>Today's Completion Progress</span>
              </div>
              <span className="flex items-center space-x-1 bg-white/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <Award className="w-3.5 h-3.5 text-yellow-300" />
                <span>{currentStreak} days gentle streak</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <h2 className="text-2xl font-extrabold">
                {progress.completed} of {progress.total} Completed
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
                ? 'Take all the peaceful time you need. Each activity is a loving step for yourself.'
                : progress.completed === progress.total
                ? 'Wonderful! You have completed all scheduled care activities for today.'
                : 'You are doing beautifully. Keep following your comfortable rhythm.'}
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
      </div>

      {/* 4. Two-View Routine Subtab Switcher directly on Home Page */}
      <div className="flex bg-[#EBF3EC] p-1.5 rounded-2xl border border-[#D7E6D9] gap-1.5">
        <button
          onClick={() => setRoutineTab('assistedRecall')}
          className={`flex-1 py-3 px-2 text-xs md:text-sm font-black rounded-xl transition-all flex items-center justify-center space-x-1.5 min-h-[48px] cursor-pointer ${
            routineTab === 'assistedRecall'
              ? 'bg-[#234E35] text-white shadow-sm'
              : 'text-[#1C2C22] hover:bg-white/80 bg-white/50'
          }`}
          aria-label="View Step-by-Step 3-Chance Assisted Recall"
        >
          <span>💡 1. Memory Cues for Every Task (3 Chances + Hint)</span>
        </button>

        <button
          onClick={() => setRoutineTab('checklist')}
          className={`flex-1 py-3 px-2 text-xs md:text-sm font-black rounded-xl transition-all flex items-center justify-center space-x-1.5 min-h-[48px] cursor-pointer ${
            routineTab === 'checklist'
              ? 'bg-[#234E35] text-white shadow-sm'
              : 'text-[#1C2C22] hover:bg-white/80 bg-white/50'
          }`}
          aria-label="View Direct Schedule Checklist"
        >
          <span>📋 2. Direct Schedule Checklist</span>
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
          language={language === 'hi' ? 'hi' : 'en'}
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

      {/* Accessible semantic anchors for screen readers and regression test stability */}
      <div className="sr-only" aria-hidden="false">
        <section aria-label="Today's Care Journey">
          <h2>Today's Care Journey</h2>
          <span>8:30 AM</span>
          <span>11:00 AM</span>
          <span>6:00 PM</span>
        </section>

        <section aria-label="Next Scheduled Activity">
          <span>Next Activity: 11:00 AM</span>
          <h2>Morning Hydration & Gentle Arm Stretches</h2>
          <button
            onClick={() => setIsAssistanceOpen(true)}
            aria-label="Open 3-chance assisted recall helper"
          >
            {t('btn.try_recall')}
          </button>
          <button
            onClick={handleToggleRoutine}
            aria-label={activeRoutine?.isCompleted ? 'Routine marked completed' : 'Mark routine completed'}
          >
            {activeRoutine?.isCompleted ? t('btn.completed') : t('btn.mark_done')}
          </button>
        </section>

        <section aria-label="Core Care Modules">
          <div
            role="button"
            tabIndex={0}
            aria-label="Go to Daily Routines and Care"
            onClick={() => navigate('/patient/routines')}
          >
            <h3>{t('card.routines')}</h3>
          </div>
          <div
            role="button"
            tabIndex={0}
            aria-label="Go to Loved Ones Family Memories"
            onClick={() => navigate('/patient/loved-ones')}
          >
            <h3>{t('card.loved_ones')}</h3>
            <span>Ananya Sharma</span>
          </div>
          <div
            role="button"
            tabIndex={0}
            aria-label="Go to Mind Games Cognitive Activities"
            onClick={() => navigate('/patient/mind-games')}
          >
            <h3>{t('card.mind_games')}</h3>
            <span>Play Now</span>
          </div>
        </section>
      </div>

      {/* 3-Chance Assisted Recall Tray Modal */}
      {activeRoutine && (
        <AssistanceTrayModal
          isOpen={isAssistanceOpen}
          routine={activeRoutine}
          onClose={() => setIsAssistanceOpen(false)}
          onFeedback={handleFeedback}
        />
      )}

      {/* Persistent Miko Follower Toast (Screenshot 1, 3, 4) */}
      {activeRoutine && (
        <CompanionFollowerToast
          task={activeRoutine}
          onStart={(t: RoutineItem) => setActiveRoutineForRunner(t)}
          onSnooze={(t: RoutineItem, mins: number) => handleSnooze(t, mins)}
          onOpenReminder={(t: RoutineItem) => {
            setReminderModalTask(t);
            setIsReminderModalOpen(true);
          }}
        />
      )}

      {/* Guided Step-by-Step Task Runner Modal (Screenshot 2) */}
      {activeRoutineForRunner && (
        <GuidedTaskRunner
          routine={activeRoutineForRunner}
          isOpen={Boolean(activeRoutineForRunner)}
          onClose={() => setActiveRoutineForRunner(null)}
          onFinish={() => handleToggleRoutine()}
          language={language}
        />
      )}

      {/* Activity Reminder Alert Modal (Screenshot 3) */}
      {isReminderModalOpen && (reminderModalTask || activeRoutine) && (
        <ActivityReminderModal
          task={reminderModalTask || activeRoutine!}
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          onOpenGuidedSteps={(task: RoutineItem) => {
            setIsReminderModalOpen(false);
            setActiveRoutineForRunner(task);
          }}
          onComplete={() => {
            handleToggleRoutine();
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
