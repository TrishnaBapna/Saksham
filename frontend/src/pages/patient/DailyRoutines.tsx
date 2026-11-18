import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { RoutineItem, RoutineAttemptRecord, ReminderSettings } from '../../types/index.js';
import { RoutineService } from '../../features/routines/services/routineService.js';
import { getEffectivePatientId } from '../../features/auth/services/identityService.js';
import { AssistedRecallEngine } from '../../features/routines/components/AssistedRecallEngine.js';
import { RoutineChecklist } from '../../features/routines/components/RoutineChecklist.js';
import { GuidedTaskRunner } from '../../features/routines/components/GuidedTaskRunner.js';
import { AddRoutineModal } from '../../features/routines/components/AddRoutineModal.js';
import { AssistanceTrayModal } from '../../features/routines/AssistanceTrayModal.js';
import { DailyProgressRing } from '../../features/routines/components/DailyProgressRing.js';
import { ReminderSettingsModal } from '../../features/routines/components/ReminderSettingsModal.js';
import { ActivityReminderModal } from '../../features/routines/components/ActivityReminderModal.js';
import { CharacterVisualizer } from '../../features/ai-companion/CharacterVisualizer.js';
import { DailyWellbeingService, DailyCondition } from '../../features/adaptive/services/dailyWellbeingService.js';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  TrendingUp,
  Award,
  Bell,
  Clock,
  Calendar,
  RotateCcw,
  ShieldCheck,
  Zap,
  Coffee,
  Feather,
} from 'lucide-react';

export const DailyRoutines: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const { language, t } = useLanguage();

  const patientId = getEffectivePatientId(currentUser);

  // Daily Physical/Cognitive Condition State
  const [dailyCondition, setDailyCondition] = useState<DailyCondition>(() =>
    DailyWellbeingService.getDailyCondition(patientId)
  );

  // Primary Tab: View A (assistedRecall) vs View B (checklist)
  const [activeTab, setActiveTab] = useState<'checklist' | 'assistedRecall'>('checklist');

  // Routines state loaded from RoutineService
  const [routines, setRoutines] = useState<RoutineItem[]>(() => {
    return RoutineService.getRoutines(patientId);
  });

  // History state for dynamic streak calculation
  const [history, setHistory] = useState<RoutineAttemptRecord[]>(() => {
    return RoutineService.getHistory(patientId);
  });

  // Reminder settings state
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(() => {
    return RoutineService.getReminderSettings(patientId);
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Active routine for Guided Task Runner
  const [activeRoutineForRunner, setActiveRoutineForRunner] = useState<RoutineItem | null>(null);

  // Active routine for 3-Chance Assisted Recall Tray Modal
  const [activeRoutineForTray, setActiveRoutineForTray] = useState<RoutineItem | null>(null);

  // Assisted Recall step index in View A
  const [recallIndex, setRecallIndex] = useState<number>(0);

  // Add Routine Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // On mount: sync from Firestore & load settings
  useEffect(() => {
    setRoutines(RoutineService.getRoutines(patientId));
    setHistory(RoutineService.getHistory(patientId));
    setReminderSettings(RoutineService.getReminderSettings(patientId));

    RoutineService.syncRoutinesFromFirestore(patientId).then((cloudItems) => {
      if (cloudItems && cloudItems.length > 0) {
        setRoutines(cloudItems);
      }
    });
  }, [patientId]);

  // Save to persistence when routines change
  useEffect(() => {
    RoutineService.saveRoutines(patientId, routines);
  }, [routines, patientId]);

  // Daily Condition Adaptation (Priority 3)
  const handleSetCondition = (cond: DailyCondition) => {
    DailyWellbeingService.setDailyCondition(patientId, cond);
    setDailyCondition(cond);
  };

  const handleRestoreFamiliar = () => {
    DailyWellbeingService.restoreFamiliarBaseline(patientId);
    setDailyCondition('peaceful');
  };

  const { adaptedRoutines, postponedCount, essentialCount } =
    DailyWellbeingService.adaptRoutinesForDailyCondition(routines, dailyCondition);

  // Dynamic progress calculations (not hardcoded)
  const progress = RoutineService.calculateProgress(adaptedRoutines);
  const currentStreak = RoutineService.calculateStreak(history);

  // Quiet hours status
  const isQuietNow = RoutineService.isQuietHoursActive(reminderSettings);

  // Next upcoming task (earliest incomplete)
  const nextScheduledActivity = routines.find((r) => !r.isCompleted);

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  // Formatted date and patient name
  const patientName = currentUser?.displayName || 'Friend';
  const greetingText =
    language === 'hi' ? `नमस्ते, ${patientName}!` : `Namaste, ${patientName}!`;

  const todayFormatted = new Intl.DateTimeFormat(
    language === 'hi' ? 'hi-IN' : 'en-US',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  ).format(new Date());

  // Toggle routine completion
  const handleToggleComplete = (id: string) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const newCompleted = !r.isCompleted;
          if (newCompleted) {
            RoutineService.recordAttempt(patientId, id, 1, false, true);
            setHistory(RoutineService.getHistory(patientId));
          }
          return {
            ...r,
            isCompleted: newCompleted,
            completedAt: newCompleted
              ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : undefined,
          };
        }
        return r;
      })
    );
  };

  // Snooze routine by minutes
  const handleSnooze = (routine: RoutineItem, minutes: number) => {
    const updated = RoutineService.snoozeRoutine(routine, minutes);
    setRoutines((prev) => prev.map((r) => (r.id === routine.id ? updated : r)));
  };

  // Handle Assisted Recall Attempt Recording
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

  // Add new routine from modal
  const handleAddNewRoutine = (newRoutine: RoutineItem) => {
    setRoutines((prev) => [newRoutine, ...prev]);
  };

  // Permissions check: Patients can always add; caregivers can add if authorized
  const canAddRoutine = role === 'patient' || role === 'caregiver' || role === 'admin';

  return (
    <div className="pb-24 pt-4 px-4 max-w-xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Header Bar & Status Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/patient')}
              className="p-2.5 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs cursor-pointer"
              aria-label="Back to Patient Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-saksham-darkText">
                {t('routines.today_routine')}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {t('patient.peaceful_day')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Reminder Settings Pill */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
              aria-label="Open reminder settings"
              title="Reminder Preferences"
            >
              <Bell className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline">
                {isQuietNow ? 'Quiet Hours 🌙' : reminderSettings.enabled ? 'Reminders On' : 'Reminders Off'}
              </span>
            </button>

            {/* Add Activity Button (for authorized users) */}
            {canAddRoutine && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-1 shadow-md transition cursor-pointer"
                aria-label="Add New Routine Activity"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Activity</span>
              </button>
            )}
          </div>
        </div>

        {/* Personalized Greeting Card with Asha & Next Scheduled Activity */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-purple-100 shadow-soft-purple flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-lavender-50 border border-purple-200 flex items-center justify-center shrink-0 p-1">
              <CharacterVisualizer
                characterId="asha"
                state={progress.percentage === 100 ? 'happy' : 'idle'}
                size={54}
              />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-saksham-darkText">
                {greetingText}
              </h2>
              <p className="text-xs text-gray-500 flex items-center space-x-1 font-medium mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-purple-500" />
                <span>{todayFormatted}</span>
              </p>
              {nextScheduledActivity ? (
                <div className="mt-1.5 flex items-center space-x-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-100 w-fit">
                  <Clock className="w-3 h-3 text-purple-600" />
                  <span>Next: {nextScheduledActivity.title} ({nextScheduledActivity.scheduledTime})</span>
                </div>
              ) : (
                <div className="mt-1.5 flex items-center space-x-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100 w-fit">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>{t('progress.encouragement_all')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Condition & Adaptive Routine Selector (Priority 3) */}
        <div className="bg-white rounded-3xl p-4 border border-purple-100 shadow-soft-purple space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              {t('routines.today_condition_prompt')}
            </span>
            {dailyCondition === 'tired' && (
              <button
                type="button"
                onClick={handleRestoreFamiliar}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition cursor-pointer"
                aria-label={t('routines.restore_familiar')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('routines.restore_familiar')}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSetCondition('energetic')}
              className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                dailyCondition === 'energetic'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-white text-slate-700 border-purple-100 hover:bg-amber-50'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{t('routines.feeling_energetic')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetCondition('tired')}
              className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                dailyCondition === 'tired'
                  ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
                  : 'bg-white text-slate-700 border-purple-100 hover:bg-purple-50'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>{t('routines.feeling_tired')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetCondition('peaceful')}
              className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                dailyCondition === 'peaceful'
                  ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                  : 'bg-white text-slate-700 border-purple-100 hover:bg-teal-50'
              }`}
            >
              <Feather className="w-4 h-4" />
              <span>{t('routines.feeling_peaceful')}</span>
            </button>
          </div>

          {dailyCondition === 'tired' && (
            <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">{t('routines.adapted_notice')}</span>
                <p className="text-[11px] text-purple-800 mt-0.5">
                  Guidance is simplified and {postponedCount} flexible activities are gently postponed. All {essentialCount} doctor-prescribed medications remain strictly on schedule.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Progress Strip & SVG Circular Progress Ring */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-lavender-600 rounded-3xl p-5 text-white shadow-soft-purple relative overflow-hidden">
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

            {/* Dynamic Calm Progress Bar */}
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

          {/* SVG Animated Circular Progress Ring */}
          <div className="shrink-0 flex items-center justify-center">
            <DailyProgressRing
              completed={progress.completed}
              total={progress.total}
              percentage={progress.percentage}
              size={135}
              strokeWidth={9}
            />
          </div>
        </div>
      </div>

      {/* Two-View Subtab Switcher: View A (Assisted Recall) vs View B (Direct Checklist) */}
      <div className="flex bg-purple-50/80 p-1.5 rounded-2xl border border-purple-200/90 gap-1.5 shadow-2xs">
        <button
          onClick={() => setActiveTab('assistedRecall')}
          className={`flex-1 py-3 px-2 text-xs md:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center space-x-1.5 min-h-[48px] cursor-pointer ${
            activeTab === 'assistedRecall'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-purple-900/80 hover:bg-white/80 bg-white/60'
          }`}
          aria-label={`${t('routines.tab_assisted_recall')} View Step-by-Step 3-Chance Assisted Recall`}
        >
          <span>{t('routines.tab_assisted_recall')}</span>
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 py-3 px-2 text-xs md:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center space-x-1.5 min-h-[48px] cursor-pointer ${
            activeTab === 'checklist'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-purple-900/80 hover:bg-white/80 bg-white/60'
          }`}
          aria-label={`${t('routines.tab_checklist')} View Direct Schedule Checklist`}
        >
          <span>{t('routines.tab_checklist')}</span>
        </button>
      </div>

      {/* VIEW A: Step-by-Step Task Initiation (Assisted Recall Engine) */}
      {activeTab === 'assistedRecall' && (
        <section aria-label="3-Chance Assisted Recall Engine">
          <AssistedRecallEngine
            routines={adaptedRoutines}
            currentIndex={recallIndex}
            onNavigateIndex={(idx) => setRecallIndex(idx)}
            onComplete={(id) => handleToggleComplete(id)}
            onLaunchTaskRunner={(routine) => setActiveRoutineForRunner(routine)}
            onRecordAttempt={handleRecordAttempt}
            language={language}
          />
        </section>
      )}

      {/* VIEW B: Direct Routine Schedule Checklist */}
      {activeTab === 'checklist' && (
        <section aria-label="Direct Schedule Checklist">
          <RoutineChecklist
            routines={adaptedRoutines}
            onToggleComplete={handleToggleComplete}
            onSnooze={handleSnooze}
            onLaunchTaskRunner={(routine) => setActiveRoutineForRunner(routine)}
            onLaunchAssistedRecall={(routine) => setActiveRoutineForTray(routine)}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            language={language}
          />
        </section>
      )}

      {/* Guided Step-by-Step Task Runner Modal */}
      {activeRoutineForRunner && (
        <GuidedTaskRunner
          routine={activeRoutineForRunner}
          isOpen={Boolean(activeRoutineForRunner)}
          onClose={() => setActiveRoutineForRunner(null)}
          onFinish={(id) => handleToggleComplete(id)}
          language={language}
        />
      )}

      {/* 3-Chance Assisted Recall Tray Modal */}
      {activeRoutineForTray && (
        <AssistanceTrayModal
          routine={activeRoutineForTray}
          isOpen={Boolean(activeRoutineForTray)}
          onClose={() => setActiveRoutineForTray(null)}
          onFeedback={(feedback, attempts) => {
            console.log(`Assisted recall feedback: ${feedback} in ${attempts} attempts`);
          }}
        />
      )}

      {/* Add Routine Activity Modal */}
      <AddRoutineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddRoutine={handleAddNewRoutine}
        patientId={patientId}
      />

      {/* Reminder Settings Modal */}
      <ReminderSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          setReminderSettings(RoutineService.getReminderSettings(patientId));
        }}
        patientId={patientId}
      />

      {/* Activity Reminder Alert Dialog (Screenshot 3) */}
      {isReminderModalOpen && nextScheduledActivity && (
        <ActivityReminderModal
          task={nextScheduledActivity}
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          onOpenGuidedSteps={(task: RoutineItem) => {
            setIsReminderModalOpen(false);
            setActiveRoutineForRunner(task);
          }}
          onComplete={(taskId: string) => {
            handleToggleComplete(taskId);
            setIsReminderModalOpen(false);
          }}
          onSnooze={(task: RoutineItem, mins: number) => {
            handleSnooze(task, mins);
            setIsReminderModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
