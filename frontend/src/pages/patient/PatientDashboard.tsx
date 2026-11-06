import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { useAccessibility } from '../../context/AccessibilityContext.js';
import { AICompanion } from '../../features/ai-companion/AICompanion.js';
import { AssistanceTrayModal } from '../../features/routines/AssistanceTrayModal.js';
import { RoutineItem, RoutineAttemptRecord } from '../../types/index.js';
import { RoutineService } from '../../features/routines/services/routineService.js';
import {
  PatientContextService,
  PatientContext,
} from '../../services/patientContextService.js';
import {
  getEffectivePatientId,
  isGuestPatient,
  subscribeToDataChanges,
} from '../../features/auth/services/identityService.js';
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
  Calendar,
  Sunset,
  Sunrise,
  Sun,
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const { simpleMode } = useAccessibility();

  const patientId = getEffectivePatientId(currentUser);
  const patientName = currentUser?.displayName || 'Sunita';

  // Format today's date in a reassuring human format
  const todayFormatted = new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const todayShort = new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
    month: 'long',
    day: 'numeric',
  });

  // Dynamic Routines and History from Shared Service Layer
  const [routines, setRoutines] = useState<RoutineItem[]>(() =>
    RoutineService.getRoutines(patientId)
  );

  const [history, setHistory] = useState<RoutineAttemptRecord[]>(() =>
    RoutineService.getHistory(patientId)
  );

  const [context, setContext] = useState<PatientContext>(() =>
    PatientContextService.getPatientContext(currentUser)
  );

  const [currentRoutineId, setCurrentRoutineId] = useState<string>('routine-02');
  const [isAssistanceOpen, setIsAssistanceOpen] = useState(false);

  // Synchronize with Cloud Firestore on mount & subscribe to cross-module updates
  useEffect(() => {
    // Initial local read
    setRoutines(RoutineService.getRoutines(patientId));
    setHistory(RoutineService.getHistory(patientId));
    setContext(PatientContextService.getPatientContext(currentUser));

    // Cloud fetch
    RoutineService.syncRoutinesFromFirestore(patientId).then((cloudItems) => {
      if (cloudItems && cloudItems.length > 0) {
        setRoutines(cloudItems);
        setContext(PatientContextService.getPatientContext(currentUser));
      }
    });

    // Real-time listener: when routines or data change in any module, reflect here instantly
    const unsubscribe = subscribeToDataChanges(({ patientId: changedId }) => {
      if (changedId === patientId || isGuestPatient(patientId) || changedId === 'all') {
        setRoutines(RoutineService.getRoutines(patientId));
        setHistory(RoutineService.getHistory(patientId));
        setContext(PatientContextService.getPatientContext(currentUser));
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

  // Morning, Afternoon, Evening milestone items
  const morningRoutine = useMemo(
    () => routines.find((r) => r.period === 'morning' || r.category === 'medication'),
    [routines]
  );
  const afternoonRoutine = useMemo(
    () => routines.find((r) => r.period === 'afternoon' || r.category === 'exercise'),
    [routines]
  );
  const eveningRoutine = useMemo(
    () => routines.find((r) => r.period === 'evening' || r.category === 'wellness'),
    [routines]
  );

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
      setContext(PatientContextService.getPatientContext(currentUser));
    }
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

      {/* 2 - 6. Asha AI Companion Component */}
      <section aria-label="Asha AI Companion">
        <AICompanion patientName={patientName} />
      </section>

      {/* 3. Daily Care Milestones Overview (Morning, Midday, Evening) */}
      {!simpleMode && (
        <section aria-label="Today's Care Journey" className="bg-white rounded-3xl p-4 border border-purple-100 shadow-soft-purple">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Today's Care Journey
            </h2>
            <span className="text-[11px] text-purple-700 font-semibold">
              {todayShort}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {/* Morning Milestone */}
            <div
              onClick={() => morningRoutine && setCurrentRoutineId(morningRoutine.id)}
              className={`rounded-2xl p-2.5 border flex flex-col items-center cursor-pointer transition-all ${
                morningRoutine?.isCompleted ? 'bg-emerald-50 border-emerald-100' : 'bg-purple-50/60 border-purple-100'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 shadow-xs ${
                morningRoutine?.isCompleted ? 'bg-emerald-600 text-white' : 'bg-purple-200 text-purple-700'
              }`}>
                {morningRoutine?.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sunrise className="w-3.5 h-3.5" />}
              </div>
              <span className="font-bold text-purple-900 text-[11px]">{morningRoutine?.scheduledTime || '08:30 AM'}</span>
              <span className="text-[10px] text-gray-600 leading-tight mt-0.5 line-clamp-1">
                {morningRoutine?.title ? morningRoutine.title.split(' ')[0] : 'Morning'}
              </span>
            </div>

            {/* Midday Milestone */}
            <div
              onClick={() => afternoonRoutine && setCurrentRoutineId(afternoonRoutine.id)}
              className={`rounded-2xl p-2.5 border flex flex-col items-center cursor-pointer transition-all ${
                afternoonRoutine?.isCompleted
                  ? 'bg-emerald-50 border-emerald-100'
                  : 'bg-purple-50 border-purple-200 ring-2 ring-purple-300'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 shadow-xs ${
                afternoonRoutine?.isCompleted ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white animate-pulse'
              }`}>
                {afternoonRoutine?.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </div>
              <span className="font-bold text-purple-900 text-[11px]">{afternoonRoutine?.scheduledTime || '11:00 AM'}</span>
              <span className="text-[10px] text-purple-700 leading-tight mt-0.5 line-clamp-1">
                {afternoonRoutine?.title ? afternoonRoutine.title.split(' ')[0] : 'Midday'}
              </span>
            </div>

            {/* Evening Milestone */}
            <div
              onClick={() => eveningRoutine && setCurrentRoutineId(eveningRoutine.id)}
              className={`rounded-2xl p-2.5 border flex flex-col items-center cursor-pointer transition-all opacity-90 ${
                eveningRoutine?.isCompleted ? 'bg-emerald-50 border-emerald-100' : 'bg-lavender-50/70 border-purple-100'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 shadow-xs ${
                eveningRoutine?.isCompleted ? 'bg-emerald-600 text-white' : 'bg-lavender-300 text-purple-800'
              }`}>
                {eveningRoutine?.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sunset className="w-3.5 h-3.5" />}
              </div>
              <span className="font-bold text-gray-700 text-[11px]">{eveningRoutine?.scheduledTime || '06:00 PM'}</span>
              <span className="text-[10px] text-gray-500 leading-tight mt-0.5 line-clamp-1">
                {eveningRoutine?.title ? eveningRoutine.title.split(' ')[0] : 'Evening'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 7. Next Scheduled Activity Reminder Card */}
      {activeRoutine && (
        <section aria-label="Next Scheduled Activity">
          <div
            className={`rounded-3xl p-5 border-2 transition-all ${
              activeRoutine.isCompleted
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
                <span>{currentStreak} days gentle streak</span>
              </span>
            </div>

            <h2 className="text-base md:text-lg font-bold text-saksham-darkText mt-1 mb-2">
              {activeRoutine.title}
            </h2>

            <p className="text-xs text-gray-600 mb-4">
              {activeRoutine.description || 'A calming moment to keep your mind energized and muscles relaxed.'}
            </p>

            {/* Action Buttons: 3-Chance Assisted Recall & Direct Done */}
            <div className="flex items-center gap-2.5">
              {!activeRoutine.isCompleted && activeRoutine.enableAssistedRecall && (
                <button
                  onClick={() => setIsAssistanceOpen(true)}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-3 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs md:text-sm rounded-2xl border border-purple-200 transition shadow-xs min-h-[48px]"
                  aria-label="Open 3-chance assisted recall helper"
                >
                  <HelpCircle className="w-4 h-4 text-purple-600" />
                  <span>{t('btn.try_recall')}</span>
                </button>
              )}

              <button
                onClick={handleToggleRoutine}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-3 px-3 font-bold text-xs md:text-sm rounded-2xl transition shadow-md min-h-[48px] ${
                  activeRoutine.isCompleted
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
                aria-label={activeRoutine.isCompleted ? 'Routine marked completed' : 'Mark routine completed'}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{activeRoutine.isCompleted ? t('btn.completed') : t('btn.mark_done')}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 8. Three Primary Feature Cards */}
      <section aria-label="Core Care Modules" className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Explore Your Care Sanctuary
          </h2>
          <span className="text-[11px] text-gray-400">Direct Button Navigation</span>
        </div>

        {/* Card 1: Daily Routines & Care */}
        <div
          onClick={() => navigate('/patient/routines')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/patient/routines')}
          className="bg-white hover:bg-purple-50/40 rounded-3xl p-5 border border-purple-100 shadow-soft-purple hover:shadow-elevated transition-all cursor-pointer group flex items-center justify-between min-h-[72px]"
          role="button"
          tabIndex={0}
          aria-label="Go to Daily Routines and Care"
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
                <span className="text-[11px] text-gray-400">• {progress.total} tasks today</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
        </div>

        {/* Card 2: Loved Ones */}
        <div
          onClick={() => navigate('/patient/loved-ones')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/patient/loved-ones')}
          className="bg-white hover:bg-purple-50/40 rounded-3xl p-5 border border-purple-100 shadow-soft-purple hover:shadow-elevated transition-all cursor-pointer group flex flex-col justify-between min-h-[72px]"
          role="button"
          tabIndex={0}
          aria-label="Go to Loved Ones Family Memories"
        >
          <div className="flex items-start justify-between w-full">
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
                    Family Memories & Voice Notes
                  </span>
                  <span className="text-[11px] text-gray-400">• {context.lovedOnes.count} cherished memories</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition flex-shrink-0" />
          </div>

          {/* Quick Family Member Preview Chips/Cards */}
          {context.lovedOnes.sampleMembers.length > 0 && (
            <div className="mt-3.5 pt-3 border-t border-rose-100/70 grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
              {context.lovedOnes.sampleMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/patient/loved-ones');
                  }}
                  className="flex items-center space-x-2 p-1.5 bg-rose-50/60 hover:bg-rose-100/80 rounded-xl border border-rose-100 text-left transition"
                  title={`View ${member.name}`}
                >
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="w-7 h-7 rounded-full object-cover border border-rose-200 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-rose-950 truncate">{member.name}</p>
                    <p className="text-[10px] text-rose-700/80 truncate">{member.relationship.split('&')[0].trim()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 3: Mind Games */}
        <div
          onClick={() => navigate('/patient/mind-games')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/patient/mind-games')}
          className="bg-white hover:bg-purple-50/40 rounded-3xl p-5 border border-purple-100 shadow-soft-purple hover:shadow-elevated transition-all cursor-pointer group flex flex-col justify-between min-h-[72px]"
          role="button"
          tabIndex={0}
          aria-label="Go to Mind Games Cognitive Activities"
        >
          <div className="flex items-start justify-between w-full">
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
                    Cognitive Wellness
                  </span>
                  <span className="text-[11px] text-gray-400">• {context.mindGames.availableGamesCount} games ready</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition flex-shrink-0" />
          </div>

          {/* Quick Mind Games Recent Activity Badge / Adaptive Recommender */}
          <div className="mt-3.5 pt-3 border-t border-amber-100/70 flex items-center justify-between text-xs w-full">
            <div className="flex items-center space-x-2 text-[11px] text-amber-900">
              <span className="font-semibold text-amber-800">
                {context.mindGames.recentSessions.length > 0
                  ? `Recent: ${context.mindGames.recentSessions[0].gameTitle} (${context.mindGames.recentSessions[0].difficulty})`
                  : 'Recommended: Nature Card Matching (Gentle)'}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200 flex-shrink-0">
              Play Now
            </span>
          </div>
        </div>
      </section>

      {/* 9. Dynamic Progress Summary (AUD-HIGH-01) */}
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
            Every step forward matters. You have enjoyed {currentStreak} consecutive days of healthy routines and gentle cognitive exercises!
          </p>

          {/* Dynamic Calming Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-purple-500 to-lavender-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-gray-500 mt-2">
            <span>{progress.completed} of {progress.total} routines completed</span>
            <span className="font-semibold text-purple-700">{progress.percentage}% peaceful consistency</span>
          </div>
        </section>
      )}

      {/* 3-Chance Assisted Recall Tray Modal */}
      {activeRoutine && (
        <AssistanceTrayModal
          isOpen={isAssistanceOpen}
          routine={activeRoutine}
          onClose={() => setIsAssistanceOpen(false)}
          onFeedback={handleFeedback}
        />
      )}
    </div>
  );
};
