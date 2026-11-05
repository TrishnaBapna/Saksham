import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoutineItem } from '../../types/index.js';
import { AssistanceTrayModal } from '../../features/routines/AssistanceTrayModal.js';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  ArrowLeft,
  Filter,
} from 'lucide-react';

export const DailyRoutines: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'checklist' | 'assistedRecall'>('checklist');

  const [routines, setRoutines] = useState<RoutineItem[]>([
    {
      id: 'routine-01',
      title: 'Morning Blood Pressure Medication & Warm Tea',
      scheduledTime: '08:30 AM',
      category: 'medication',
      streakCount: 6,
      isCompleted: true,
      enableAssistedRecall: true,
      recallCues: {
        hint1: 'A warm sip from your favorite ceramic mug right after breakfast.',
        hint2: 'Check the blue pill organizer beside the kettle in the kitchen.',
        hint3: 'Take the morning tablet with half a glass of warm water.',
      },
    },
    {
      id: 'routine-02',
      title: 'Morning Hydration & Gentle Arm Stretches',
      scheduledTime: '11:00 AM',
      category: 'exercise',
      streakCount: 4,
      isCompleted: false,
      enableAssistedRecall: true,
      recallCues: {
        hint1: 'What helps your shoulders feel relaxed and your posture tall before noon?',
        hint2: 'A tall glass of lemon water on your desk and rolling shoulders back.',
        hint3: 'Drink one glass of water and reach both arms upward toward the sky for 20 seconds.',
      },
    },
    {
      id: 'routine-03',
      title: 'Afternoon Photo Album Walk with Ananya',
      scheduledTime: '02:30 PM',
      category: 'activity',
      streakCount: 3,
      isCompleted: false,
      enableAssistedRecall: true,
      recallCues: {
        hint1: 'Looking at pictures of smiling faces from your family album.',
        hint2: 'Open the Loved Ones tab and look at Ananya and Aarav.',
        hint3: 'Spend 5 minutes looking through family memories in the Loved Ones tab.',
      },
    },
    {
      id: 'routine-04',
      title: 'Gentle Evening Breathing & Sleep Preparation',
      scheduledTime: '08:30 PM',
      category: 'exercise',
      streakCount: 5,
      isCompleted: false,
      enableAssistedRecall: true,
      recallCues: {
        hint1: 'Taking 5 deep, calming breaths in your quiet bedroom before sleep.',
        hint2: 'Sit on the bed and place your hand on your heart.',
        hint3: 'Inhale for 4 seconds, exhale slowly for 4 seconds.',
      },
    },
  ]);

  const [activeRoutineForAssistance, setActiveRoutineForAssistance] = useState<RoutineItem | null>(null);

  const toggleRoutine = (id: string) => {
    setRoutines((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isCompleted: !r.isCompleted } : r))
    );
  };

  const completedCount = routines.filter((r) => r.isCompleted).length;

  return (
    <div className="pb-24 pt-4 px-4 max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/patient')}
          className="p-2 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs"
          aria-label="Back to Patient Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-saksham-darkText">
            Daily Routines & Care
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Assisted recall, medication checks and gentle scheduled habits
          </p>
        </div>
      </div>

      {/* Subtab Switcher: A (Assisted Recall) vs B (Direct Checklist) */}
      <div className="flex bg-lavender-100/70 p-1 rounded-2xl border border-purple-200">
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all ${
            activeTab === 'checklist'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-purple-800 hover:text-purple-900'
          }`}
        >
          Schedule Checklist ({completedCount}/{routines.length})
        </button>
        <button
          onClick={() => setActiveTab('assistedRecall')}
          className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
            activeTab === 'assistedRecall'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-purple-800 hover:text-purple-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>3-Chance Assisted Recall</span>
        </button>
      </div>

      {/* Subtab A: 3-Chance Assisted Recall Spotlight */}
      {activeTab === 'assistedRecall' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-gradient-to-br from-lavender-100 to-pink-50 rounded-3xl p-5 border border-purple-200 shadow-soft-purple">
            <div className="flex items-center space-x-2 text-purple-700 font-bold text-sm mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Assisted Recall Philosophy</span>
            </div>
            <p className="text-xs text-saksham-darkText leading-relaxed">
              Instead of immediately revealing answers, Saksham offers up to <strong>three gentle, progressive cues</strong> to stimulate cognitive recall. No pressure, no timers rushing you.
            </p>
          </div>

          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 px-1">
            Active Recall Routines
          </h2>

          <div className="space-y-3">
            {routines.map((routine) => (
              <div
                key={routine.id}
                className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                      {routine.scheduledTime}
                    </span>
                    <span className="text-[11px] text-gray-400 capitalize">{routine.category}</span>
                  </div>
                  <h3 className="font-bold text-sm md:text-base text-saksham-darkText">{routine.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">3 progressive cues ready to assist</p>
                </div>

                <button
                  onClick={() => setActiveRoutineForAssistance(routine)}
                  className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 flex-shrink-0"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Try Clues</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab B: Direct Schedule Checklist */}
      {activeTab === 'checklist' && (
        <div className="space-y-3.5 animate-in fade-in">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Today's Care Schedule
            </span>
            <div className="flex items-center space-x-1 text-xs text-purple-700 font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>All Scheduled</span>
            </div>
          </div>

          <div className="space-y-3">
            {routines.map((routine) => (
              <div
                key={routine.id}
                className={`rounded-3xl p-4.5 border-2 transition-all flex items-start justify-between gap-3 ${
                  routine.isCompleted
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-white border-purple-100 shadow-soft-purple'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="flex items-center space-x-1 text-xs font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                      <Clock className="w-3 h-3 text-purple-600" />
                      <span>{routine.scheduledTime}</span>
                    </span>
                    {routine.streakCount > 0 && (
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        ★ {routine.streakCount} day streak
                      </span>
                    )}
                  </div>

                  <h3
                    className={`font-bold text-sm md:text-base leading-snug ${
                      routine.isCompleted ? 'line-through text-gray-500' : 'text-saksham-darkText'
                    }`}
                  >
                    {routine.title}
                  </h3>

                  {/* 3-chance hint trigger button inside checklist */}
                  {!routine.isCompleted && (
                    <button
                      onClick={() => setActiveRoutineForAssistance(routine)}
                      className="mt-2 inline-flex items-center space-x-1 text-xs text-purple-700 hover:text-purple-900 font-bold"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Need a hint? (3-Chance Recall)</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => toggleRoutine(routine.id)}
                  className={`p-3 rounded-2xl transition flex-shrink-0 ${
                    routine.isCompleted
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                  }`}
                  aria-label={routine.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                >
                  <CheckCircle2 className="w-6 h-6" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assistance Tray Modal */}
      {activeRoutineForAssistance && (
        <AssistanceTrayModal
          isOpen={Boolean(activeRoutineForAssistance)}
          routine={activeRoutineForAssistance}
          onClose={() => setActiveRoutineForAssistance(null)}
          onFeedback={(f, a) => console.log('Routine assisted feedback:', f, a)}
        />
      )}
    </div>
  );
};
