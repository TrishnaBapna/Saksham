import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { RoutineItem, RoutineAttemptRecord } from '../../types/index.js';
import { RoutineService } from '../../features/routines/services/routineService.js';
import { getEffectivePatientId } from '../../features/auth/services/identityService.js';
import { AssistedRecallEngine } from '../../features/routines/components/AssistedRecallEngine.js';
import { RoutineChecklist } from '../../features/routines/components/RoutineChecklist.js';
import { GuidedTaskRunner } from '../../features/routines/components/GuidedTaskRunner.js';
import { AddRoutineModal } from '../../features/routines/components/AddRoutineModal.js';
import { AssistanceTrayModal } from '../../features/routines/AssistanceTrayModal.js';
import {
  ArrowLeft,
  Sparkles,
  ListTodo,
  Plus,
  TrendingUp,
  Award,
} from 'lucide-react';

export const DailyRoutines: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const { language } = useLanguage();

  const patientId = getEffectivePatientId(currentUser);

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

  // Active routine for Guided Task Runner
  const [activeRoutineForRunner, setActiveRoutineForRunner] = useState<RoutineItem | null>(null);

  // Active routine for 3-Chance Assisted Recall Tray Modal
  const [activeRoutineForTray, setActiveRoutineForTray] = useState<RoutineItem | null>(null);

  // Assisted Recall step index in View A
  const [recallIndex, setRecallIndex] = useState<number>(0);

  // Add Routine Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // On mount: sync from Firestore
  useEffect(() => {
    setRoutines(RoutineService.getRoutines(patientId));
    setHistory(RoutineService.getHistory(patientId));

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

  // Dynamic progress calculations (not hardcoded)
  const progress = RoutineService.calculateProgress(routines);
  const currentStreak = RoutineService.calculateStreak(history);

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

  // Snooze routine by 5 or 15 minutes
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
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/patient')}
            className="p-2.5 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs"
            aria-label="Back to Patient Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-saksham-darkText">
              Daily Routines & Care
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Assisted recall, medications & gentle daily schedules
            </p>
          </div>
        </div>

        {/* Add Activity Button (for authorized users) */}
        {canAddRoutine && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="p-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-1 shadow-md transition"
            aria-label="Add New Routine Activity"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Activity</span>
          </button>
        )}
      </div>

      {/* Dynamic Progress & Compassionate Streak Strip */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-lavender-600 rounded-3xl p-5 text-white shadow-soft-purple relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between text-xs mb-2">
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

        {/* Dynamic Calm Progress Bar */}
        <div className="w-full bg-white/25 rounded-full h-3 overflow-hidden p-0.5 mt-3">
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

      {/* Two-View Subtab Switcher: View A (Assisted Recall) vs View B (Direct Checklist) */}
      <div className="flex bg-lavender-100/70 p-1.5 rounded-2xl border border-purple-200">
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 min-h-[48px] ${
            activeTab === 'checklist'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-purple-800 hover:text-purple-900'
          }`}
          aria-label="View Direct Schedule Checklist"
        >
          <ListTodo className="w-4 h-4" />
          <span>Direct Schedule Checklist ({progress.completed}/{progress.total})</span>
        </button>

        <button
          onClick={() => setActiveTab('assistedRecall')}
          className={`flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 min-h-[48px] ${
            activeTab === 'assistedRecall'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-purple-800 hover:text-purple-900'
          }`}
          aria-label="View Step-by-Step 3-Chance Assisted Recall"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>3-Chance Assisted Recall</span>
        </button>
      </div>

      {/* VIEW A: Step-by-Step Task Initiation (Assisted Recall Engine) */}
      {activeTab === 'assistedRecall' && (
        <section aria-label="3-Chance Assisted Recall Engine">
          <AssistedRecallEngine
            routines={routines}
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
            routines={routines}
            onToggleComplete={handleToggleComplete}
            onSnooze={handleSnooze}
            onLaunchTaskRunner={(routine) => setActiveRoutineForRunner(routine)}
            onLaunchAssistedRecall={(routine) => setActiveRoutineForTray(routine)}
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
    </div>
  );
};
