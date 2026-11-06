import { RoutineItem, LovedOne, GameSessionRecord, GameDifficulty } from '../types/index.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { LovedOnesService } from '../features/lovedOnes/services/lovedOnesService.js';
import { GamesService } from '../features/games/services/gamesService.js';
import { getEffectivePatientId, isGuestPatient } from '../features/auth/services/identityService.js';

export interface PatientProfileContext {
  uid: string;
  displayName: string;
  isGuest: boolean;
}

export interface PatientRoutinesContext {
  routines: RoutineItem[];
  progress: {
    total: number;
    completed: number;
    remaining: number;
    percentage: number;
  };
  streak: number;
  activeRoutine: RoutineItem | null;
  nextScheduledRoutine: RoutineItem | null;
  completedRoutines: RoutineItem[];
  remainingRoutines: RoutineItem[];
}

export interface PatientLovedOnesContext {
  lovedOnes: LovedOne[];
  count: number;
  sampleMembers: LovedOne[];
}

export interface PatientMindGamesContext {
  availableGamesCount: number;
  recentSessions: GameSessionRecord[];
  difficultyPreference: GameDifficulty;
  adaptiveRecommendation: {
    recommendedDifficulty: GameDifficulty;
    reason: string;
  };
}

export interface PatientContext {
  patientId: string;
  profile: PatientProfileContext;
  routines: PatientRoutinesContext;
  lovedOnes: PatientLovedOnesContext;
  mindGames: PatientMindGamesContext;
  timestamp: number;
}

export class PatientContextService {
  /**
   * Retrieves an authoritative snapshot of the patient context.
   * Scoped strictly to the patient's authenticated UID (or isolated guest identity).
   */
  public static getPatientContext(user: { uid?: string; displayName?: string | null } | null): PatientContext {
    const patientId = getEffectivePatientId(user);
    const isGuest = isGuestPatient(patientId);
    const displayName = user?.displayName || (isGuest ? 'Guest Companion' : 'Sunita');

    // 1. Routines & Care Context
    const routines = RoutineService.getRoutines(patientId);
    const history = RoutineService.getHistory(patientId);
    const progress = RoutineService.calculateProgress(routines);
    const streak = RoutineService.calculateStreak(history);
    const completedRoutines = routines.filter((r) => r.isCompleted);
    const remainingRoutines = routines.filter((r) => !r.isCompleted);
    const nextScheduledRoutine = remainingRoutines.length > 0 ? remainingRoutines[0] : null;
    const activeRoutine = remainingRoutines[0] || routines[0] || null;

    // 2. Loved Ones & Family Memory Context
    const lovedOnes = LovedOnesService.getLovedOnes(patientId);
    const sampleMembers = lovedOnes.slice(0, 3);

    // 3. Cognitive Mind Games Context
    const allGames = GamesService.getAllGames();
    const gameHistory = GamesService.getHistory(patientId);
    const difficultyPreference = GamesService.getDifficultyPreference(patientId);
    const adaptiveRecommendation = GamesService.getAdaptiveRecommendation(patientId);

    return {
      patientId,
      profile: {
        uid: patientId,
        displayName,
        isGuest,
      },
      routines: {
        routines,
        progress,
        streak,
        activeRoutine,
        nextScheduledRoutine,
        completedRoutines,
        remainingRoutines,
      },
      lovedOnes: {
        lovedOnes,
        count: lovedOnes.length,
        sampleMembers,
      },
      mindGames: {
        availableGamesCount: allGames.length,
        recentSessions: gameHistory.slice(0, 3),
        difficultyPreference,
        adaptiveRecommendation,
      },
      timestamp: Date.now(),
    };
  }
}
