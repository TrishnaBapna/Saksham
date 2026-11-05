import React, { useState } from 'react';
import { RoutineItem } from '../../../types/index.js';
import { SpeechService } from '../../../services/speechService.js';
import {
  CheckCircle2,
  Clock,
  Volume2,
  PlayCircle,
  Sparkles,
  RotateCcw,
  Bell,
  Sun,
  Sunset,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RoutineChecklistProps {
  routines: RoutineItem[];
  onToggleComplete: (id: string) => void;
  onSnooze: (routine: RoutineItem, minutes: number) => void;
  onLaunchTaskRunner: (routine: RoutineItem) => void;
  onLaunchAssistedRecall: (routine: RoutineItem) => void;
  language?: 'en' | 'hi';
}

export const RoutineChecklist: React.FC<RoutineChecklistProps> = ({
  routines,
  onToggleComplete,
  onSnooze,
  onLaunchTaskRunner,
  onLaunchAssistedRecall,
  language = 'en',
}) => {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [snoozeMenuOpenId, setSnoozeMenuOpenId] = useState<string | null>(null);

  const handleReadAloud = (routine: RoutineItem) => {
    setSpeakingId(routine.id);
    const speechText = `${routine.title}, scheduled for ${routine.scheduledTime}. ${routine.description || ''}`;
    SpeechService.speak(
      speechText,
      () => setSpeakingId(routine.id),
      () => setSpeakingId(null),
      language === 'hi' ? 'hi-IN' : 'en-IN'
    );
  };

  // Group routines by period: Morning, Afternoon, Evening
  const morningRoutines = routines.filter((r) => !r.period || r.period === 'morning');
  const afternoonRoutines = routines.filter((r) => r.period === 'afternoon');
  const eveningRoutines = routines.filter((r) => r.period === 'evening');

  // Find next due routine (earliest incomplete task)
  const nextDueId = routines.find((r) => !r.isCompleted)?.id;

  const renderRoutineCard = (routine: RoutineItem) => {
    const isNextDue = routine.id === nextDueId;
    const isSpeaking = speakingId === routine.id;
    const isSnoozeOpen = snoozeMenuOpenId === routine.id;

    return (
      <div
        key={routine.id}
        className={`rounded-3xl p-5 border-2 transition-all duration-200 relative ${
          routine.isCompleted
            ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs'
            : isNextDue
            ? 'bg-white border-purple-400 ring-2 ring-purple-200 shadow-soft-purple'
            : 'bg-white border-purple-100 shadow-xs hover:border-purple-200'
        }`}
      >
        {/* Next Due Highlight Badge */}
        {isNextDue && !routine.isCompleted && (
          <div className="absolute -top-3 left-6 bg-gradient-to-r from-purple-600 to-lavender-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full shadow-xs flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>Up Next</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {/* Time & Category & Snooze indicator */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="flex items-center space-x-1 text-xs font-bold text-purple-900 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>{routine.scheduledTime}</span>
              </span>

              <span className="text-[11px] font-medium text-gray-500 capitalize bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                {routine.category}
              </span>

              {routine.snoozedUntil && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center space-x-1">
                  <Bell className="w-3 h-3 text-amber-600" />
                  <span>Snoozed until {routine.snoozedUntil}</span>
                </span>
              )}

              {routine.streakCount > 0 && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  ★ {routine.streakCount} day streak
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              className={`text-base font-bold leading-snug transition ${
                routine.isCompleted ? 'line-through text-gray-400' : 'text-saksham-darkText'
              }`}
            >
              {routine.title}
            </h3>

            {/* Description */}
            {routine.description && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {routine.description}
              </p>
            )}

            {/* Secondary Action Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-purple-50">
              {/* Guided Step-by-Step Task Runner */}
              {routine.steps && routine.steps.length > 0 && !routine.isCompleted && (
                <button
                  onClick={() => onLaunchTaskRunner(routine)}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-200 transition"
                  aria-label={`Start guided task runner for ${routine.title}`}
                >
                  <PlayCircle className="w-3.5 h-3.5 text-purple-600" />
                  <span>Step-by-Step ({routine.steps.length} steps)</span>
                </button>
              )}

              {/* 3-Chance Assisted Recall */}
              {routine.enableAssistedRecall && !routine.isCompleted && (
                <button
                  onClick={() => onLaunchAssistedRecall(routine)}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-purple-600 hover:text-purple-800 px-2.5 py-1.5 rounded-xl hover:bg-purple-50 transition"
                  aria-label={`Open assisted recall clues for ${routine.title}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>3-Chance Clues</span>
                </button>
              )}

              {/* Read Aloud */}
              <button
                onClick={() => handleReadAloud(routine)}
                className={`inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition ${
                  isSpeaking
                    ? 'bg-purple-600 text-white border-purple-600 animate-pulse'
                    : 'text-gray-600 hover:text-purple-700 bg-white border-gray-200'
                }`}
                aria-label={`Read aloud ${routine.title}`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Read</span>
              </button>

              {/* Snooze Button & Menu */}
              {!routine.isCompleted && (
                <div className="relative">
                  <button
                    onClick={() => setSnoozeMenuOpenId(isSnoozeOpen ? null : routine.id)}
                    className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-200 transition"
                    aria-label="Snooze routine"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-600" />
                    <span>Snooze</span>
                    {isSnoozeOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {/* Snooze Dropdown Menu */}
                  {isSnoozeOpen && (
                    <div className="absolute left-0 mt-1 w-36 bg-white rounded-2xl shadow-lg border border-purple-100 p-1.5 z-20 animate-in fade-in">
                      <button
                        onClick={() => {
                          onSnooze(routine, 5);
                          setSnoozeMenuOpenId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-900 rounded-xl transition"
                      >
                        ⏱️ +5 minutes
                      </button>
                      <button
                        onClick={() => {
                          onSnooze(routine, 15);
                          setSnoozeMenuOpenId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-900 rounded-xl transition"
                      >
                        ⏱️ +15 minutes
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Big Accessible Toggle Checkbox */}
          <button
            onClick={() => onToggleComplete(routine.id)}
            className={`p-3.5 rounded-2xl transition-all flex-shrink-0 min-w-[50px] min-h-[50px] flex items-center justify-center ${
              routine.isCompleted
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
            }`}
            aria-label={routine.isCompleted ? `Mark ${routine.title} incomplete` : `Mark ${routine.title} complete`}
          >
            <CheckCircle2 className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Morning Section */}
      {morningRoutines.length > 0 && (
        <section aria-label="Morning Routines" className="space-y-3">
          <div className="flex items-center space-x-2 px-1">
            <Sun className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Morning Care Routines
            </h2>
          </div>
          <div className="space-y-3">
            {morningRoutines.map(renderRoutineCard)}
          </div>
        </section>
      )}

      {/* Afternoon Section */}
      {afternoonRoutines.length > 0 && (
        <section aria-label="Afternoon Routines" className="space-y-3">
          <div className="flex items-center space-x-2 px-1">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Afternoon Care Routines
            </h2>
          </div>
          <div className="space-y-3">
            {afternoonRoutines.map(renderRoutineCard)}
          </div>
        </section>
      )}

      {/* Evening Section */}
      {eveningRoutines.length > 0 && (
        <section aria-label="Evening Routines" className="space-y-3">
          <div className="flex items-center space-x-2 px-1">
            <Sunset className="w-4 h-4 text-rose-500" />
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Evening Care Routines
            </h2>
          </div>
          <div className="space-y-3">
            {eveningRoutines.map(renderRoutineCard)}
          </div>
        </section>
      )}
    </div>
  );
};
