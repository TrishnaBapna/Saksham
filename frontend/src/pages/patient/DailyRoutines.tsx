import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { useAccessibility } from '../../context/AccessibilityContext.js';
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
import { SpeechService } from '../../services/speechService.js';
import { CharacterVisualizer } from '../../features/ai-companion/CharacterVisualizer.js';
import { DailyWellbeingService, DailyCondition } from '../../features/adaptive/services/dailyWellbeingService.js';
import { TaskLifecycleService } from '../../features/routines/services/taskLifecycleService.js';
import { TaskLifecycleModal } from '../../features/routines/components/TaskLifecycleModal.js';
import { TaskHistoryTable } from '../../features/routines/components/TaskHistoryTable.js';
import { WeeklyRoutineView } from '../../features/routines/components/WeeklyRoutineView.js';
import { RecurringTask, DailyTaskInstance } from '../../features/routines/types/taskLifecycle.types.js';
import { SyncQueueService, SyncState } from '../../services/syncQueueService.js';
import { PatientSharedCareView } from '../../features/caregiver/components/PatientSharedCareView.js';
import { getTranslatedRoutineTitle } from '../../features/routines/utils/routineTranslation.js';
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
  Play,
  Heart,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  History,
  Layers,
  HeartHandshake,
} from 'lucide-react';

export const DailyRoutines: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const { language, t } = useLanguage();

  const patientId = getEffectivePatientId(currentUser);

  let accessCtx: any = null;
  try {
    accessCtx = useAccessibility();
  } catch {
    accessCtx = null;
  }
  const isSimplifiedNav = !!accessCtx?.preferences?.simplifiedNavigation;
  const isSingleInstructionMode = accessCtx?.preferences?.maxInstructionsPerTurn === 1;

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

  // Phase 3.1 & 3.11: Adaptive Memory-Aware Daily Living & Shared Care Section Tabs
  const [mainSectionTab, setMainSectionTab] = useState<'today' | 'my-routine' | 'history' | 'weekly' | 'shared-care'>('today');
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>(() =>
    TaskLifecycleService.getRecurringTasks(patientId)
  );
  const [allInstances, setAllInstances] = useState<DailyTaskInstance[]>(() =>
    TaskLifecycleService.getOrCreateTodayInstances(patientId)
  );
  const [selectedTaskForLifecycle, setSelectedTaskForLifecycle] = useState<RecurringTask | null>(null);
  const [isLifecycleModalOpen, setIsLifecycleModalOpen] = useState<boolean>(false);

  // Phase 3.6: Offline-First Reassuring Sync State
  const [syncState, setSyncState] = useState<SyncState>(() =>
    SyncQueueService.isOnline() ? 'synced' : 'pending_sync'
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() =>
    SyncQueueService.getPendingCount(patientId)
  );

  useEffect(() => {
    const unsubscribe = SyncQueueService.subscribe((pid, state, count) => {
      if (pid === patientId) {
        setSyncState(state);
        setPendingSyncCount(count);
      }
    });
    return unsubscribe;
  }, [patientId]);

  const handleRefreshLifecycle = () => {
    setRecurringTasks(TaskLifecycleService.getRecurringTasks(patientId));
    setAllInstances(TaskLifecycleService.getAllInstances(patientId));
    setRoutines(RoutineService.getRoutines(patientId));
  };

  // On mount: sync from Firestore & load settings
  useEffect(() => {
    setRoutines(RoutineService.getRoutines(patientId));
    setHistory(RoutineService.getHistory(patientId));
    setReminderSettings(RoutineService.getReminderSettings(patientId));
    setRecurringTasks(TaskLifecycleService.getRecurringTasks(patientId));
    setAllInstances(TaskLifecycleService.getOrCreateTodayInstances(patientId));

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

  // Phase 2.9 Intelligent Recommended Activity & Full Schedule Toggle
  const [showFullSchedule, setShowFullSchedule] = useState<boolean>(true);
  const [isHeroResting, setIsHeroResting] = useState<boolean>(false);

  // Priority 1: Incomplete Doctor-prescribed medication tasks
  // Priority 2: Incomplete tasks by scheduled time
  const currentRecommendedActivity = React.useMemo(() => {
    const incomplete = adaptedRoutines.filter((r) => !r.isCompleted);
    if (incomplete.length === 0) return null;

    // Doctor-prescribed medications must never be autonomously deprioritized or hidden
    const medRoutine = incomplete.find((r) => r.category === 'medication');
    if (medRoutine) return medRoutine;

    return incomplete[0];
  }, [adaptedRoutines]);

  const handleHeroAskAsha = (routine: RoutineItem) => {
    const localizedTitle = getTranslatedRoutineTitle(routine, t, language);
    const messages: Record<string, string> = {
      hi: `नमस्ते! ${localizedTitle} के लिए आशा आपके साथ है। जब भी आप तैयार हों, आराम से शुरू करें।`,
      mr: `नमस्ते! ${localizedTitle} साठी आशा तुमच्या सोबत आहे. शांतपणे वेळ घ्या आणि तयार झाल्यावर सुरू करा.`,
      ta: `வணக்கம்! ${localizedTitle} செய்ய ஆஷா உங்களுடன் இருக்கிறார். தயாராகும்போது தொடங்குங்கள்.`,
      te: `నమస్కారం! ${localizedTitle} కోసం ఆశా మీతోనే ఉన్నారు. ప్రశాంతంగా సమయం తీసుకోండి.`,
      kn: `ನಮಸ್ಕಾರ! ${localizedTitle} ಗಾಗಿ ಆಶಾ ನಿಮ್ಮೊಂದಿಗಿದ್ದಾರೆ. ನೀವು ಸಿದ್ಧವಾದಾಗ ಪ್ರಾರಂಭಿಸಿ.`,
      bn: `নমস্কার! ${localizedTitle}-এর জন্য আশা আপনার পাশে রয়েছে। প্রস্তুত হলে শুরু করুন।`,
    };
    const text =
      messages[language] ||
      `Namaste! For ${localizedTitle}, Asha is right here with you. Take all the comfortable time you need, and tap Start whenever you feel ready.`;

    SpeechService.speak(
      text,
      () => {},
      () => {},
      SpeechService.getBCP47(language)
    );
  };

  const handleSkipWithoutPenalty = (routine: RoutineItem) => {
    const localizedTitle = getTranslatedRoutineTitle(routine, t, language);
    const messages: Record<string, string> = {
      hi: `कोई चिंता नहीं! हमने ${localizedTitle} को आज के लिए छोड़ दिया है। आपकी शांति सबसे पहले है।`,
      mr: `काही काळजी करू नका! आपण आजसाठी ${localizedTitle} पुढे ढकलले आहे. आपले समाधान सर्वात महत्त्वाचे आहे.`,
      ta: `கவலைப்பட வேண்டாம்! ${localizedTitle} செயல்பாட்டை இப்போது தவிர்த்துள்ளோம். உங்கள் மன நிம்மதியே முதன்மையானது.`,
      te: `ఎటువంటి ఆందోళన వద్దు! ${localizedTitle} పనిని ప్రస్తుతానికి ఆపాము. మీ మనశ్శాంతి ముఖ్యం.`,
      kn: `ಚಿಂತಿಸಬೇಡಿ! ನಾವು ${localizedTitle} ಅನ್ನು ಸದ್ಯಕ್ಕೆ ಮುಂದೂಡಿದ್ದೇವೆ. ನಿಮ್ಮ ಮನಸ್ಸಿನ ನೆಮ್ಮದಿಯೇ ಮುಖ್ಯ.`,
      bn: `কোনো চিন্তা নেই! আমরা আজকের মতো ${localizedTitle} স্থগিত রেখেছি। আপনার স্বাচ্ছন্দ্যই প্রথম।`,
    };
    const skipMsg =
      messages[language] ||
      `No worries at all! We have skipped ${localizedTitle} for now with zero penalty. Your comfort and peace of mind always come first.`;

    SpeechService.speak(
      skipMsg,
      () => {},
      () => {},
      SpeechService.getBCP47(language)
    );

    // Non-punitive: marks completed/skipped for today without penalty
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === routine.id
          ? {
              ...r,
              isCompleted: true,
              completedAt: 'Skipped peacefully (No penalty)',
            }
          : r
      )
    );
  };

  const handleHeroRestBreak = () => {
    setIsHeroResting(true);
    const restMsg = t('routines.rest_break_speech');

    SpeechService.speak(
      restMsg,
      () => {},
      () => {},
      SpeechService.getBCP47(language)
    );
  };

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  // Formatted date and patient name
  const patientName = currentUser?.displayName || 'Friend';
  const greetingText = t('routines.greeting_namaste', { name: patientName });

  const todayFormatted = new Intl.DateTimeFormat(
    SpeechService.getBCP47(language),
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

  const syncInfo = SyncQueueService.getHumanReadableSyncStatus(syncState, language, pendingSyncCount);

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
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h1 className="text-xl md:text-2xl font-extrabold text-saksham-darkText">
                  {t('routines.today_routine')}
                </h1>
                <div
                  data-testid="sync-status-indicator"
                  role="status"
                  aria-live="polite"
                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${syncInfo.colorClass}`}
                >
                  <span>{syncInfo.label}</span>
                </div>
              </div>
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
                aria-label={t('routines.add_activity')}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t('routines.add_activity')}</span>
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
                  <span>{t('routines.next_scheduled') || 'Next:'} {getTranslatedRoutineTitle(nextScheduledActivity, t, language)} ({nextScheduledActivity.scheduledTime})</span>
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
                  {t('routines.adapted_notice_desc', { postponedCount: String(postponedCount), essentialCount: String(essentialCount) }) ||
                    `Guidance is simplified and ${postponedCount} flexible activities are gently postponed. All ${essentialCount} doctor-prescribed medications remain strictly on schedule.`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phase 3.1 Primary Section Navigation: Today | My Routine | Activity History | Weekly Rhythm */}
      <div className="flex bg-purple-50 p-1.5 rounded-2xl border border-purple-200 gap-1 shadow-2xs">
        <button
          type="button"
          data-testid="tab-today-btn"
          onClick={() => setMainSectionTab('today')}
          className={`flex-1 py-2.5 px-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
            mainSectionTab === 'today'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-purple-900 hover:bg-white/70'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('routines.tab_today')}</span>
        </button>

        <button
          type="button"
          data-testid="tab-my-routine-btn"
          onClick={() => setMainSectionTab('my-routine')}
          className={`flex-1 py-2.5 px-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
            mainSectionTab === 'my-routine'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-purple-900 hover:bg-white/70'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t('routines.tab_my_routine')}</span>
        </button>

        <button
          type="button"
          data-testid="tab-history-btn"
          onClick={() => setMainSectionTab('history')}
          className={`flex-1 py-2.5 px-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
            mainSectionTab === 'history'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-purple-900 hover:bg-white/70'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>{t('routines.tab_history')}</span>
        </button>

        <button
          type="button"
          data-testid="tab-weekly-btn"
          onClick={() => setMainSectionTab('weekly')}
          className={`flex-1 py-2.5 px-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
            mainSectionTab === 'weekly'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-purple-900 hover:bg-white/70'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{t('routines.tab_weekly')}</span>
        </button>

        <button
          type="button"
          data-testid="tab-shared-care-btn"
          onClick={() => setMainSectionTab('shared-care')}
          className={`flex-1 py-2.5 px-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
            mainSectionTab === 'shared-care'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-purple-900 hover:bg-white/70'
          }`}
        >
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>{t('routines.tab_shared_care')}</span>
        </button>
      </div>

      {mainSectionTab === 'today' && (
        <>
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

      {/* Phase 2.9 Intelligent Daily Plan Card (Recommended Next Activity Hero Card) */}
      {currentRecommendedActivity ? (
        <section
          data-testid="intelligent-daily-plan-hero"
          className={`bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-300 shadow-soft-purple space-y-4 animate-in fade-in ${
            isSimplifiedNav || isSingleInstructionMode ? 'ring-4 ring-purple-300/60 shadow-lg' : ''
          }`}
          aria-label="Current Recommended Activity"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs font-black uppercase text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                {currentRecommendedActivity.period?.toUpperCase() || 'TODAY'} • {currentRecommendedActivity.category.toUpperCase()}
              </span>
              {currentRecommendedActivity.category === 'medication' && (
                <span className="text-[10px] sm:text-xs font-extrabold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>{t('routines.doctor_prescribed')}</span>
                </span>
              )}
              {(isSimplifiedNav || isSingleInstructionMode) && (
                <span className="text-[10px] sm:text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                  Step-by-Step Focus
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 bg-purple-50/80 px-2.5 py-1 rounded-xl border border-purple-100">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>{currentRecommendedActivity.scheduledTime} (~{currentRecommendedActivity.timerMinutes || 15}m)</span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 font-heading leading-snug">
              {getTranslatedRoutineTitle(currentRecommendedActivity, t, language)}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              {currentRecommendedActivity.description ||
                'Take your comfortable time with this guided activity. Asha will guide you calmly through each small step.'}
            </p>
          </div>

          {/* Primary Action: Start Activity (Touch target >= 44px) */}
          <button
            type="button"
            data-testid="hero-start-activity-btn"
            onClick={() => setActiveRoutineForRunner(currentRecommendedActivity)}
            className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px] active:scale-98"
            aria-label={`Start Guided Activity: ${currentRecommendedActivity.title}`}
          >
            <Play className="w-5 h-5 fill-white text-white" />
            <span>{isSimplifiedNav || isSingleInstructionMode ? 'Start Next Task' : 'Start Guided Activity'}</span>
          </button>

          {/* Quick Supportive Actions Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              data-testid="hero-ask-asha-btn"
              onClick={() => handleHeroAskAsha(currentRecommendedActivity)}
              className="py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] transition"
              aria-label={t('routines.ask_asha')}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>{t('routines.ask_asha')}</span>
            </button>

            <button
              type="button"
              data-testid="hero-pause-rest-btn"
              onClick={handleHeroRestBreak}
              className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] transition"
              aria-label={t('routines.rest_pause_btn')}
            >
              <Heart className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isHeroResting ? (t('routines.resting_btn') || 'Resting...') : (t('routines.rest_pause_btn') || 'Rest / Pause')}</span>
            </button>

            <button
              type="button"
              data-testid="hero-snooze-btn"
              onClick={() => handleSnooze(currentRecommendedActivity, 15)}
              className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] transition"
              aria-label={t('routines.snooze_15m')}
            >
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>{t('routines.snooze_15m')}</span>
            </button>

            <button
              type="button"
              data-testid="hero-skip-btn"
              onClick={() => handleSkipWithoutPenalty(currentRecommendedActivity)}
              className="py-2.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-2xs sm:text-xs font-bold flex items-center justify-center gap-1 cursor-pointer min-h-[44px] transition text-center"
              aria-label={t('routines.skip_no_penalty')}
              title={t('routines.skip_no_penalty')}
            >
              <span>{t('routines.skip_no_penalty')}</span>
            </button>
          </div>
        </section>
      ) : (
        <section
          data-testid="daily-plan-all-completed-hero"
          className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-3xl p-6 border-2 border-emerald-300 shadow-soft-purple text-center space-y-3 animate-in fade-in"
        >
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
              All Scheduled Activities Complete!
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Wonderful job today. You have completed all scheduled care routines. Take a peaceful rest and enjoy your day!
            </p>
          </div>
        </section>
      )}

      {/* Schedule View Toggle Button */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          data-testid="toggle-full-schedule-btn"
          onClick={() => setShowFullSchedule((prev) => !prev)}
          className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-purple-50 border border-purple-200 text-purple-900 text-xs font-extrabold flex items-center justify-between shadow-2xs transition cursor-pointer min-h-[44px]"
          aria-expanded={showFullSchedule}
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>
              {showFullSchedule
                ? 'Hide Full Daily Schedule'
                : `View Full Daily Schedule (${progress.remaining} remaining)`}
            </span>
          </span>
          {showFullSchedule ? (
            <ChevronUp className="w-4 h-4 text-purple-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-purple-600" />
          )}
        </button>
      </div>

      {showFullSchedule && (
        <div className="space-y-4 animate-in fade-in duration-150">
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
        </div>
      )}
      </>
      )}

      {/* VIEW: My Recurring Routines (Phase 3.1) */}
      {mainSectionTab === 'my-routine' && (
        <section aria-label="My Routine Tasks" className="space-y-4 text-left animate-in fade-in" data-testid="my-routine-view">
          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-purple-900 uppercase tracking-wide">
                My Recurring Routines ({recurringTasks.length})
              </h3>
              <p className="text-[11px] text-purple-800">
                You can manage, pause, or request removal with zero penalty at any time.
              </p>
            </div>
            {canAddRoutine && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('routines.add_short')}</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {recurringTasks.map((task) => {
              const isPaused = task.lifecycleStatus === 'paused';
              const isArchived = task.lifecycleStatus === 'archived';
              return (
                <div
                  key={task.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-purple-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        {task.period} • {task.scheduledTime}
                      </span>
                      {task.isClinicianPrescribed && (
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                          {t('routines.doctor_prescribed')}
                        </span>
                      )}
                      {isPaused && (
                        <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                          Paused
                        </span>
                      )}
                      {isArchived && (
                        <span className="text-[9px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                          Archived
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{getTranslatedRoutineTitle(task, t, language)}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isArchived && !isPaused && (
                      <button
                        type="button"
                        onClick={() => {
                          const match = routines.find((r) => r.id === task.id);
                          if (match) setActiveRoutineForRunner(match);
                        }}
                        className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{t('routines.start_short')}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTaskForLifecycle(task);
                        setIsLifecycleModalOpen(true);
                      }}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition min-h-[36px] cursor-pointer"
                    >
                      Manage & History →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* VIEW: Activity History (Phase 3.1) */}
      {mainSectionTab === 'history' && (
        <section aria-label="Activity History" className="space-y-4 animate-in fade-in" data-testid="activity-history-view">
          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-left">
            <h3 className="text-xs font-black text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
              <History className="w-4 h-4 text-purple-700" />
              Activity Accountability History
            </h3>
            <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
              Every reported activity is saved here with honest attribution. This is a gentle record of your engagement, never a clinical grade or exam score.
            </p>
          </div>
          <TaskHistoryTable instances={allInstances} language={language} />
        </section>
      )}

      {/* VIEW: Weekly Rhythm (Phase 3.1) */}
      {mainSectionTab === 'weekly' && (
        <section aria-label="Weekly Routine" className="space-y-4 animate-in fade-in" data-testid="weekly-rhythm-view">
          <WeeklyRoutineView
            recurringTasks={recurringTasks}
            recentInstances={allInstances}
            language={language}
            onSelectTask={(task) => {
              setSelectedTaskForLifecycle(task);
              setIsLifecycleModalOpen(true);
            }}
          />
        </section>
      )}

      {/* VIEW: Shared Care & Dyadic Support Coordination (Phase 3.11) */}
      {mainSectionTab === 'shared-care' && (
        <section
          aria-label="Shared Care and Dyadic Coordination"
          className="space-y-4 animate-in fade-in"
          data-testid="patient-shared-care-section"
        >
          <PatientSharedCareView
            patientId={patientId}
            patientName={currentUser?.displayName || 'Sunita'}
            routines={routines}
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

      {/* Task Lifecycle & Management Modal (Phase 3.1) */}
      {isLifecycleModalOpen && selectedTaskForLifecycle && (
        <TaskLifecycleModal
          task={selectedTaskForLifecycle}
          patientId={patientId}
          isOpen={isLifecycleModalOpen}
          onClose={() => {
            setIsLifecycleModalOpen(false);
            setSelectedTaskForLifecycle(null);
          }}
          onTaskUpdated={handleRefreshLifecycle}
          userRole={role === 'caregiver' ? 'caregiver' : 'patient'}
          language={language}
        />
      )}
    </div>
  );
};
