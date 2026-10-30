import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { usePatientStore } from './patientStore';
import { fetchLovedOnes } from './patientService';
import { TaskList } from './components/TaskList';
import { EmergencySOS } from './components/EmergencySOS';
import { CareTeamNotes } from './components/CareTeamNotes';
import { WaterTracker } from './components/WaterTracker';
import { TremorBiometricModal } from './components/TremorBiometricModal';
import { MindClinicView } from './components/MindClinicView';
import { MovementView } from './components/MovementView';
import { SpeechView } from './components/SpeechView';
import { LovedOnesView } from './components/LovedOnesView';
import { CalendarView } from './components/CalendarView';
import { ArticlesView } from './components/ArticlesView';
import { SafePathView } from './components/SafePathView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { VoiceAssistantBar } from '@/components/voice/VoiceAssistantBar';
import { voiceService, type VoiceCommandMatch, type VoiceNavigationTarget } from '@/services/voiceService';
import { audioSynthesizer } from '@/services/audioService';
import { saveCondition } from '@/features/auth/authService';
import {
  getAccessibleModulesForCondition,
  type DiseaseModule,
  type CareCondition,
  type LovedOne,
} from '@/types/firestore';

const CONDITION_INFO: Record<string, { label: string; icon: string; tag: string }> = {
  parkinsons: {
    label: "Parkinson's Care",
    icon: '🧠',
    tag: 'Motor pacing, speech projection & routine',
  },
  alzheimers: {
    label: "Alzheimer's Care",
    icon: '🧠',
    tag: 'Memory agility, familiar faces & reminders',
  },
  both: {
    label: "Dual Care (Parkinson's & Alzheimer's)",
    icon: '🧠',
    tag: 'Comprehensive motor, speech, memory & care circle',
  },
  parkinsons_alzheimers: {
    label: "Dual Care (Parkinson's & Alzheimer's)",
    icon: '🧠',
    tag: 'Comprehensive motor, speech, memory & care circle',
  },
  dementia: {
    label: 'Dementia Care',
    icon: '🧠',
    tag: 'Cognitive wellbeing & guided routine',
  },
  other: {
    label: 'General Care Support',
    icon: '💛',
    tag: 'Individualized neurological routine',
  },
};

const MODULE_DEFINITIONS: Record<
  DiseaseModule,
  { label: string; icon: string; ariaLabel: string }
> = {
  routine: { label: "Today's Routine", icon: '📋', ariaLabel: "View Today's Routine & Tasks" },
  mindClinic: { label: 'Mind Clinic', icon: '🧩', ariaLabel: 'Open Mind Clinic Cognitive Exercises' },
  movement: { label: 'Movement', icon: '🚶', ariaLabel: 'Open Movement & Motor Pacing' },
  speech: { label: 'Speech', icon: '🗣️', ariaLabel: 'Open Speech & Vocal Projection' },
  lovedOnes: { label: 'Loved Ones & Care', icon: '💛', ariaLabel: 'Open Loved Ones & Familiar Faces' },
  articles: { label: 'Articles', icon: '📰', ariaLabel: 'Read Condition-Tailored Articles' },
  calendar: { label: 'Calendar', icon: '📅', ariaLabel: 'View 7-day Schedule & Calendar' },
  safepath: { label: 'SafePath', icon: '🛡️', ariaLabel: 'Open SafePath Safety Zone & Tracking' },
};

export const PatientDashboard: React.FC = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const {
    tasks,
    progression,
    notes,
    directives,
    tasksLoading,
    messagesLoading,
    init,
    cleanup,
    completeTask,
    snoozeTask,
    logWater,
  } = usePatientStore();

  const { toasts, toast, dismiss } = useToast();
  const [showBiometrics, setShowBiometrics] = useState(false);
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [isUpdatingCondition, setIsUpdatingCondition] = useState(false);

  // Accessible modules computed strictly from patient condition
  const accessibleModules = useMemo(() => {
    return getAccessibleModulesForCondition(profile?.condition);
  }, [profile?.condition]);

  // Tab state persistence
  const [activeTab, setActiveTab] = useState<DiseaseModule>(() => {
    try {
      const saved = sessionStorage.getItem('saksham_patient_active_tab') as DiseaseModule;
      if (saved && accessibleModules.includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'routine';
  });

  // Guard: if condition changes or activeTab is not in accessible modules, reset to 'routine'
  useEffect(() => {
    if (!accessibleModules.includes(activeTab)) {
      setActiveTab('routine');
      sessionStorage.setItem('saksham_patient_active_tab', 'routine');
    }
  }, [accessibleModules, activeTab]);

  const handleTabChange = (tab: DiseaseModule) => {
    if (!accessibleModules.includes(tab)) {
      toast(`The ${MODULE_DEFINITIONS[tab]?.label || tab} module is not in your care plan.`, 'warning');
      return;
    }
    setActiveTab(tab);
    sessionStorage.setItem('saksham_patient_active_tab', tab);
  };

  useEffect(() => {
    if (user?.uid) {
      init(user.uid);
      fetchLovedOnes(user.uid)
        .then((items) => setLovedOnes(items))
        .catch(() => setLovedOnes([]));
    }
    return () => {
      cleanup();
    };
  }, [user?.uid, init, cleanup]);

  const conditionKey = profile?.condition || 'other';
  const conditionMeta = CONDITION_INFO[conditionKey] || CONDITION_INFO.other!;

  const handleSelectCondition = async (newCondition: CareCondition) => {
    if (!user?.uid) return;
    setIsUpdatingCondition(true);
    try {
      await saveCondition(user.uid, newCondition);
      await refreshProfile();
      toast(`Care profile updated to ${CONDITION_INFO[newCondition]?.label || newCondition}!`, 'success');
      voiceService.speak(`Care profile updated to ${CONDITION_INFO[newCondition]?.label || newCondition}`);
    } catch {
      toast('Failed to update care profile. Please try again.', 'error');
    } finally {
      setIsUpdatingCondition(false);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    if (!user?.uid) return;
    try {
      await completeTask(user.uid, taskId);
      audioSynthesizer.playTaskComplete();
      toast('Task marked as complete! +10 XP', 'success');
    } catch {
      toast('Failed to update task. Please try again.', 'error');
    }
  };

  const handleSnoozeTask = async (taskId: number) => {
    if (!user?.uid) return;
    try {
      await snoozeTask(user.uid, taskId);
      audioSynthesizer.playReminderCue();
      toast('Task snoozed for 15 minutes.', 'info');
    } catch {
      toast('Failed to snooze task.', 'error');
    }
  };

  const handleLogWater = async () => {
    if (!user?.uid) return;
    try {
      await logWater(user.uid);
      audioSynthesizer.playWaterDrop();
      toast('Glass of water logged! Stay hydrated 💧', 'success');
    } catch {
      toast('Failed to log water.', 'error');
    }
  };

  const handleReadRoutine = () => {
    const pendingTasks = tasks.filter((t) => t.status !== 'done');
    if (pendingTasks.length === 0) {
      voiceService.speak('You have completed all scheduled tasks for today! Great job.');
      return;
    }
    const text = `You have ${pendingTasks.length} upcoming tasks. First: ${pendingTasks[0]?.label} at ${pendingTasks[0]?.time}. Second: ${pendingTasks[1]?.label || 'Nothing else scheduled soon'}.`;
    voiceService.speak(text);
  };

  const handleVoiceCommand = async (match: VoiceCommandMatch) => {
    switch (match.action) {
      case 'navigate': {
        const target = match.target as VoiceNavigationTarget;
        if (target === 'home' || target === 'back') {
          handleTabChange('routine');
          voiceService.speak('Going to Today\'s Routine');
          return;
        }

        const diseaseTarget = target as DiseaseModule;
        if (accessibleModules.includes(diseaseTarget)) {
          handleTabChange(diseaseTarget);
          voiceService.speak(`Opening ${MODULE_DEFINITIONS[diseaseTarget]?.label || diseaseTarget}`);
        } else {
          voiceService.speak(
            `The ${MODULE_DEFINITIONS[diseaseTarget]?.label || target} module is not included in your ${conditionMeta.label} plan.`
          );
          toast(`Module '${target}' is not enabled for your care profile.`, 'warning');
        }
        break;
      }
      case 'log_water':
        await handleLogWater();
        voiceService.speak('Water logged. Stay hydrated.');
        break;
      case 'complete_first_task': {
        const nextTask = tasks.find((t) => t.status !== 'done');
        if (nextTask) {
          await handleCompleteTask(nextTask.id);
          voiceService.speak(`Marked ${nextTask.label} complete.`);
        } else {
          voiceService.speak('All tasks are already completed.');
        }
        break;
      }
      case 'trigger_sos':
        toast('Emergency SOS triggered by voice command', 'error');
        audioSynthesizer.playReminderCue();
        voiceService.speak('Emergency alert activated. Notifying your emergency contacts.');
        break;
      case 'read_routine':
        handleReadRoutine();
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-gray-900 pb-16">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 px-4 sm:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">💙</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-teal-800 text-lg">Saksham</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  Patient
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {conditionMeta.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBiometrics(true)}
              className="text-xs px-3"
              aria-label="Verify biometrics"
            >
              🔒 Face ID
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-xs text-gray-600 hover:text-red-700"
              aria-label="Sign out of Saksham"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 flex flex-col gap-6">
        {/* Welcome & Overview Card */}
        <section aria-labelledby="welcome-heading">
          <Card className="p-6 bg-gradient-to-r from-teal-700 to-teal-800 text-white rounded-3xl shadow-sm border-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-teal-200 text-xs font-semibold uppercase tracking-wider">
                  Personal Care Portal
                </p>
                <h1 id="welcome-heading" className="text-2xl sm:text-3xl font-bold font-heading text-white mt-1">
                  Good day, {profile?.name || 'Friend'} 👋
                </h1>
                <p className="text-teal-100 text-sm mt-1 max-w-lg">
                  {conditionMeta.tag}. Your routine is synchronized in real-time with your care circle.
                </p>
              </div>

              {/* XP / Level pill */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-3 px-4 border border-white/20 self-start sm:self-auto flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">⭐</span>
                <div>
                  <div className="text-xs text-teal-200 font-medium">Daily Streak</div>
                  <div className="text-lg font-bold text-white">
                    {progression?.streak ?? 1} Days · {progression?.xp ?? 10} XP
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Condition Setup / Picker Banner (Shown if condition is other / not selected) */}
        {(!profile?.condition || profile.condition === 'other') && (
          <div
            role="region"
            aria-label="Condition Setup"
            className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
          >
            <div>
              <h2 className="text-sm font-bold font-heading flex items-center gap-2">
                <span>⚡</span> Personalize Your Care Plan
              </h2>
              <p className="text-xs text-amber-800 mt-1 max-w-xl">
                Please select your primary neurological care focus to enable tailored therapeutic modules (Movement, Speech, or Loved Ones recall).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                loading={isUpdatingCondition}
                onClick={() => handleSelectCondition('parkinsons')}
                className="bg-teal-700 hover:bg-teal-800 text-xs min-h-touch"
              >
                Parkinson's
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={isUpdatingCondition}
                onClick={() => handleSelectCondition('alzheimers')}
                className="bg-teal-700 hover:bg-teal-800 text-xs min-h-touch"
              >
                Alzheimer's
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={isUpdatingCondition}
                onClick={() => handleSelectCondition('both')}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 text-xs min-h-touch"
              >
                Both Conditions
              </Button>
            </div>
          </div>
        )}

        {/* Voice Assistant & Dictation Bar */}
        <VoiceAssistantBar
          onCommand={handleVoiceCommand}
          onReadRoutine={handleReadRoutine}
        />

        {/* Disease-Adaptive Module Navigation Tabs */}
        <nav
          aria-label="Care plan modules"
          className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
        >
          {accessibleModules.map((modKey, idx) => {
            const def = MODULE_DEFINITIONS[modKey];
            if (!def) return null;
            const isActive = activeTab === modKey;

            return (
              <button
                key={modKey}
                type="button"
                onClick={() => handleTabChange(modKey)}
                aria-pressed={isActive}
                aria-label={def.ariaLabel}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold min-h-touch transition-all shrink-0 ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-700 ring-offset-2'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span aria-hidden="true">{def.icon}</span>
                <span>{`${idx + 1}. ${def.label}`}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Active Module View Container ── */}
        <section aria-live="polite" className="flex flex-col gap-6">
          {activeTab === 'routine' && (
            <>
              {/* Today's Tasks */}
              <TaskList
                tasks={tasks}
                loading={tasksLoading}
                onComplete={handleCompleteTask}
                onSnooze={handleSnoozeTask}
              />

              {/* Water Tracker */}
              <WaterTracker
                logged={progression?.waterLogged ?? 0}
                target={progression?.waterTargetGlasses ?? 8}
                onLogWater={handleLogWater}
              />

              {/* Care Team Notes & Directives */}
              <CareTeamNotes
                notes={notes}
                directives={directives}
                loading={messagesLoading}
              />

              {/* Emergency SOS & WhatsApp */}
              <EmergencySOS
                patientName={profile?.name || 'Patient'}
                emergencyContactName={profile?.phone ? 'Primary Contact' : 'Care Circle'}
                emergencyContactPhone={profile?.phone || '+919876543210'}
                onSendAlert={async (msg) => {
                  toast(msg, 'warning');
                }}
              />
            </>
          )}

          {activeTab === 'mindClinic' && (
            <MindClinicView
              onScoreXp={(pts: number) => {
                toast(`+${pts} XP earned in Mind Clinic!`, 'success');
              }}
            />
          )}

          {activeTab === 'movement' && (
            <MovementView />
          )}

          {activeTab === 'speech' && (
            <SpeechView />
          )}

          {activeTab === 'lovedOnes' && (
            <LovedOnesView lovedOnes={lovedOnes} />
          )}

          {activeTab === 'articles' && (
            <ArticlesView condition={profile?.condition} />
          )}

          {activeTab === 'calendar' && (
            <CalendarView tasks={tasks} />
          )}

          {activeTab === 'safepath' && (
            <SafePathView patientName={profile?.name || 'Patient'} />
          )}
        </section>
      </main>

      {/* Tremor-compensated Biometric Face ID Verification Modal */}
      <TremorBiometricModal
        isOpen={showBiometrics}
        userName={profile?.name || 'Patient'}
        onClose={() => setShowBiometrics(false)}
        onSuccess={() => {
          setShowBiometrics(false);
          toast('Biometric identity verified with tremor dampening! ✓', 'success');
        }}
      />
    </div>
  );
};
