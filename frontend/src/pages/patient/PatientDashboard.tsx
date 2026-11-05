import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.js';
import { useAccessibility } from '../../context/AccessibilityContext.js';
import { AICompanion } from '../../features/ai-companion/AICompanion.js';
import { AssistanceTrayModal } from '../../features/routines/AssistanceTrayModal.js';
import { RoutineItem } from '../../types/index.js';
import {
  CalendarCheck,
  Users,
  Gamepad2,
  Clock,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  Award,
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { simpleMode } = useAccessibility();

  // Next scheduled 11 AM routine state
  const [scheduledRoutine, setScheduledRoutine] = useState<RoutineItem>({
    id: 'routine-11am',
    title: 'Morning Hydration & Gentle Arm Stretches',
    scheduledTime: '11:00 AM',
    category: 'exercise',
    streakCount: 4,
    isCompleted: false,
    enableAssistedRecall: true,
    recallCues: {
      hint1: 'Think about what keeps your body feeling fresh and flexible right before lunch.',
      hint2: 'A tall glass of warm water on the kitchen counter and three slow shoulder rolls.',
      hint3: 'Drink one tall glass of fresh water and gently roll your shoulders back 5 times.',
    },
  });

  const [isAssistanceOpen, setIsAssistanceOpen] = useState(false);

  const handleToggleRoutine = () => {
    setScheduledRoutine((prev) => ({
      ...prev,
      isCompleted: !prev.isCompleted,
    }));
  };

  const handleFeedback = (feedback: string, attempts: number) => {
    console.log(`Assisted recall feedback logged: ${feedback} after ${attempts} attempts`);
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-xl mx-auto space-y-5">
      {/* 1. Saksham Branding & Compassionate Welcome */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-lavender-600 rounded-3xl p-5 text-white shadow-soft-purple relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center space-x-2 text-lavender-200 text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Saksham Neuro-Care</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold leading-tight">
          {t('patient.welcome')}
        </h1>
        <p className="text-xs md:text-sm text-lavender-100 mt-1">
          Today is peaceful and full of gentle moments. We are here together.
        </p>
      </div>

      {/* 2 - 6. AI Companion Component (Interactive Avatar, Voice, Text Chat, Suggestions) */}
      <section aria-label="AI Companion Assistant">
        <AICompanion />
      </section>

      {/* 7. Next Scheduled Activity Reminder Card (11:00 AM) */}
      <section aria-label="Next Scheduled Activity">
        <div
          className={`rounded-3xl p-5 border-2 transition-all ${
            scheduledRoutine.isCompleted
              ? 'bg-emerald-50/90 border-emerald-200 shadow-xs'
              : 'bg-white border-purple-200 shadow-soft-purple'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>{t('reminder.title')}</span>
            </span>

            <span className="text-xs text-emerald-700 font-semibold flex items-center space-x-1">
              <Award className="w-3.5 h-3.5" />
              <span>{scheduledRoutine.streakCount} days gentle streak</span>
            </span>
          </div>

          <h2 className="text-base md:text-lg font-bold text-saksham-darkText mt-1 mb-2">
            {scheduledRoutine.title}
          </h2>

          <p className="text-xs text-gray-600 mb-4">
            A calming moment to keep your mind energized and muscles relaxed.
          </p>

          {/* Action Buttons: 3-Chance Assisted Recall & Direct Done */}
          <div className="flex items-center gap-2.5">
            {!scheduledRoutine.isCompleted && (
              <button
                onClick={() => setIsAssistanceOpen(true)}
                className="flex-1 flex items-center justify-center space-x-1.5 py-3 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs md:text-sm rounded-2xl border border-purple-200 transition shadow-xs"
              >
                <HelpCircle className="w-4 h-4 text-purple-600" />
                <span>{t('btn.try_recall')}</span>
              </button>
            )}

            <button
              onClick={handleToggleRoutine}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-3 px-3 font-bold text-xs md:text-sm rounded-2xl transition shadow-md ${
                scheduledRoutine.isCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{scheduledRoutine.isCompleted ? t('btn.completed') : t('btn.mark_done')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 8. Three Primary Feature Cards */}
      <section aria-label="Core Care Modules" className="space-y-3.5">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
          Explore Your Care Sanctuary
        </h2>

        {/* Card 1: Daily Routines & Care */}
        <div
          onClick={() => navigate('/patient/routines')}
          className="bg-white hover:bg-purple-50/40 rounded-3xl p-5 border border-purple-100 shadow-soft-purple hover:shadow-elevated transition-all cursor-pointer group flex items-center justify-between"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0 shadow-xs">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-saksham-darkText group-hover:text-purple-700 transition">
                {t('card.routines')}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {t('card.routines_sub')}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                  3-Chance Assisted Recall
                </span>
                <span className="text-[11px] text-gray-400">• 2 tasks today</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
        </div>

        {/* Card 2: Loved Ones */}
        <div
          onClick={() => navigate('/patient/loved-ones')}
          className="bg-white hover:bg-purple-50/40 rounded-3xl p-5 border border-purple-100 shadow-soft-purple hover:shadow-elevated transition-all cursor-pointer group flex items-center justify-between"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0 shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-saksham-darkText group-hover:text-purple-700 transition">
                {t('card.loved_ones')}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {t('card.loved_ones_sub')}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  Daughter Ananya & Family
                </span>
                <span className="text-[11px] text-gray-400">• 4 saved cues</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
        </div>

        {/* Card 3: Mind Games */}
        <div
          onClick={() => navigate('/patient/mind-games')}
          className="bg-white hover:bg-purple-50/40 rounded-3xl p-5 border border-purple-100 shadow-soft-purple hover:shadow-elevated transition-all cursor-pointer group flex items-center justify-between"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0 shadow-xs">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-saksham-darkText group-hover:text-purple-700 transition">
                {t('card.mind_games')}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {t('card.mind_games_sub')}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Room Memory Game
                </span>
                <span className="text-[11px] text-gray-400">• Gentle stimulation</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
        </div>
      </section>

      {/* 9. Progress Summary (Without Shame Mechanics) */}
      {!simpleMode && (
        <section aria-label="Progress Summary" className="bg-gradient-to-br from-lavender-100/60 to-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-saksham-darkText">{t('progress.weekly')}</h3>
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              Active Care
            </span>
          </div>

          <p className="text-xs text-gray-600 mb-3 leading-relaxed">
            Every step forward matters. You have enjoyed 4 consecutive days of healthy routines and gentle cognitive exercises!
          </p>

          {/* Calming Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5">
            <div className="bg-gradient-to-r from-purple-500 to-lavender-500 h-full rounded-full transition-all duration-500" style={{ width: '80%' }} />
          </div>
          <div className="flex justify-between items-center text-[11px] text-gray-500 mt-2">
            <span>4 routines completed</span>
            <span className="font-semibold text-purple-700">80% peaceful consistency</span>
          </div>
        </section>
      )}

      {/* 3-Chance Assisted Recall Tray Modal */}
      <AssistanceTrayModal
        isOpen={isAssistanceOpen}
        routine={scheduledRoutine}
        onClose={() => setIsAssistanceOpen(false)}
        onFeedback={handleFeedback}
      />
    </div>
  );
};
