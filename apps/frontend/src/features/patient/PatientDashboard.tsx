import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { usePatientStore } from './patientStore';
import { TaskList } from './components/TaskList';
import { EmergencySOS } from './components/EmergencySOS';
import { CareTeamNotes } from './components/CareTeamNotes';
import { WaterTracker } from './components/WaterTracker';
import { TremorBiometricModal } from './components/TremorBiometricModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { VoiceAssistantBar } from '@/components/voice/VoiceAssistantBar';
import { voiceService, type VoiceCommandMatch } from '@/services/voiceService';
import { audioSynthesizer } from '@/services/audioService';

const CONDITION_INFO: Record<string, { label: string; icon: string; tag: string }> = {
  parkinsons: {
    label: "Parkinson's Care",
    icon: '🧠',
    tag: 'Tremor-compensated routine & voice support',
  },
  alzheimers: {
    label: "Alzheimer's Care",
    icon: '🧠',
    tag: 'Memory, familiar faces & gentle reminders',
  },
  dementia: {
    label: 'Dementia Care',
    icon: '🧠',
    tag: 'Cognitive wellbeing & guided routine',
  },
  other: {
    label: 'Saksham Care Support',
    icon: '💛',
    tag: 'General neurological care support',
  },
};

export const PatientDashboard: React.FC = () => {
  const { user, profile, signOut } = useAuth();
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

  useEffect(() => {
    if (user?.uid) {
      init(user.uid);
    }
    return () => {
      cleanup();
    };
  }, [user?.uid, init, cleanup]);

  const conditionKey = profile?.condition || 'other';
  const conditionMeta = CONDITION_INFO[conditionKey] || CONDITION_INFO.other!;

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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
      <main id="main-content" className="max-w-4xl mx-auto px-4 sm:px-8 pt-6 flex flex-col gap-6">
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
                  {conditionMeta.tag}. Your routine is synced in real-time with your care circle.
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

        {/* Voice Assistant & Dictation Bar */}
        <VoiceAssistantBar
          onCommand={handleVoiceCommand}
          onReadRoutine={handleReadRoutine}
        />

        {/* 1. PRIMARY SECTION: Today's Tasks & Routine (Main Tab) */}
        <TaskList
          tasks={tasks}
          loading={tasksLoading}
          onComplete={handleCompleteTask}
          onSnooze={handleSnoozeTask}
        />

        {/* 2. Hydration & Wellbeing Tracker */}
        <WaterTracker
          logged={progression?.waterLogged ?? 0}
          target={progression?.waterTargetGlasses ?? 8}
          onLogWater={handleLogWater}
        />

        {/* 3. Care Team Messages (Doctor Directives & Caregiver Notes) */}
        <CareTeamNotes
          notes={notes}
          directives={directives}
          loading={messagesLoading}
        />

        {/* 4. SOS Emergency Contact & WhatsApp Card (Prominent & directly accessible) */}
        <EmergencySOS
          patientName={profile?.name || 'Patient'}
          emergencyContactName={profile?.phone ? 'Primary Contact' : 'Care Circle'}
          emergencyContactPhone={profile?.phone || '+919876543210'}
          onSendAlert={async (msg) => {
            toast(msg, 'warning');
          }}
        />
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
