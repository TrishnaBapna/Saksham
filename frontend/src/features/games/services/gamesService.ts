import {
  AdaptiveAdjustmentRecord,
  GameAdaptiveParameters,
  GameBadge,
  GameCategory,
  GameDifficulty,
  GameItem,
  GamePacing,
  GameProgressSummary,
  GameSessionRecord,
} from '../../../types/index.js';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  getEffectivePatientId,
  isGuestPatient,
  isDemoModeEnabled,
  notifyDataChange,
} from '../../auth/services/identityService.js';
import { AdaptiveDifficultyService } from './adaptiveDifficultyService.js';
import { AdaptiveSupportService } from '../../adaptive/services/adaptiveSupportService.js';

export const GAME_CATALOGUE: GameItem[] = [
  // A. Memory & Recall
  {
    id: 'game-matching',
    title: 'Peaceful Nature Card Matching',
    category: 'memory',
    categoryLabel: 'Memory & Recall',
    difficulty: 'Gentle',
    description: 'Find matching pairs of flowers, tea cups, birds, and soothing nature cards at your own pace.',
    iconName: 'Sparkles',
    estimatedMinutes: 3,
    instructions: 'Tap any card to turn it over, then find its matching pair. Take all the time you need.',
    benefits: ['Visual recognition', 'Short-term visual recall', 'Calming focus']
  },
  {
    id: 'game-objects-recall',
    title: 'Warm Object Recall',
    category: 'memory',
    categoryLabel: 'Memory & Recall',
    difficulty: 'Moderate',
    description: 'Observe a small collection of everyday comforting items, pause, and gently remember what was there.',
    iconName: 'Brain',
    estimatedMinutes: 4,
    instructions: 'Look closely at the items shown. When ready, see which ones you remember.',
    benefits: ['Delayed recall', 'Active observation', 'Working memory']
  },
  {
    id: 'game-loved-ones-cues',
    title: 'Familiar Family Memory Cues',
    category: 'memory',
    categoryLabel: 'Memory & Recall',
    difficulty: 'Gentle',
    description: 'Match familiar loving phrases and greetings to approved family members from your Loved Ones album.',
    iconName: 'Heart',
    estimatedMinutes: 3,
    instructions: 'Read or listen to the familiar phrase and pick the loved one who says it.',
    benefits: ['Identity anchoring', 'Emotional comfort', 'Associative memory']
  },

  // B. Attention & Observation
  {
    id: 'game-visual-search',
    title: 'Find the Hidden Blossom',
    category: 'attention',
    categoryLabel: 'Attention & Observation',
    difficulty: 'Gentle',
    description: 'Search for a specific cheerful flower or bird hidden among a cluster of peaceful garden symbols.',
    iconName: 'Search',
    estimatedMinutes: 3,
    instructions: 'Look for the target symbol shown at the top and tap it when you spot it.',
    benefits: ['Visual discrimination', 'Selective attention', 'Spatial scanning']
  },
  {
    id: 'game-spot-difference',
    title: 'Spot the Peaceful Change',
    category: 'attention',
    categoryLabel: 'Attention & Observation',
    difficulty: 'Moderate',
    description: 'Compare two side-by-side drawings to notice what gentle detail has changed.',
    iconName: 'Eye',
    estimatedMinutes: 4,
    instructions: 'Look at both pictures side by side. Tap the item that looks different.',
    benefits: ['Sustained attention', 'Detail orientation', 'Visual comparison']
  },

  // C. Sequence & Ordering
  {
    id: 'game-daily-sequence',
    title: 'Daily Routine Story Order',
    category: 'sequence',
    categoryLabel: 'Sequence & Ordering',
    difficulty: 'Gentle',
    description: 'Arrange everyday comforting activities in chronological order from morning tea to evening rest.',
    iconName: 'Calendar',
    estimatedMinutes: 3,
    instructions: 'Put the cards in the order they usually happen during a peaceful day.',
    benefits: ['Procedural sequencing', 'Daily orientation', 'Logical flow']
  },
  {
    id: 'game-melody-sequence',
    title: 'Gentle Color Sequence',
    category: 'sequence',
    categoryLabel: 'Sequence & Ordering',
    difficulty: 'Moderate',
    description: 'Watch colored bells light up in a calm sequence and repeat the pattern.',
    iconName: 'Music',
    estimatedMinutes: 3,
    instructions: 'Watch the colors light up one by one, then tap them in the same order.',
    benefits: ['Working memory span', 'Motor sequencing', 'Audiovisual integration']
  },

  // D. Pattern Recognition
  {
    id: 'game-pattern-completion',
    title: 'Complete the Shape Pattern',
    category: 'pattern',
    categoryLabel: 'Pattern Recognition',
    difficulty: 'Gentle',
    description: 'Identify which calming geometric shape or Rangoli element completes the row.',
    iconName: 'Shapes',
    estimatedMinutes: 3,
    instructions: 'Look at the sequence of shapes and choose the one that comes next.',
    benefits: ['Pattern induction', 'Abstract reasoning', 'Visual symmetry']
  },
  {
    id: 'game-symbol-matching',
    title: 'Symmetric Symbol Harmony',
    category: 'pattern',
    categoryLabel: 'Pattern Recognition',
    difficulty: 'Moderate',
    description: 'Match pairs of traditional geometric motifs, mandalas, and Rangoli tiles.',
    iconName: 'Compass',
    estimatedMinutes: 4,
    instructions: 'Find the two symbols that share the exact same pattern.',
    benefits: ['Form constancy', 'Symmetry perception', 'Visual analysis']
  },

  // E. Language & Word Recall
  {
    id: 'game-word-garden',
    title: 'Word Garden: Missing Letters',
    category: 'language',
    categoryLabel: 'Language & Word Recall',
    difficulty: 'Gentle',
    description: 'Fill in missing letters in familiar, comforting words with English and Hindi options.',
    iconName: 'BookOpen',
    estimatedMinutes: 3,
    instructions: 'Choose the missing letter to complete the cheerful word.',
    benefits: ['Lexical retrieval', 'Phonemic association', 'Bilingual comfort']
  },
  {
    id: 'game-object-riddles',
    title: 'Household Word Riddles',
    category: 'language',
    categoryLabel: 'Language & Word Recall',
    difficulty: 'Moderate',
    description: 'Read a gentle clue and name the common household object that matches.',
    iconName: 'HelpCircle',
    estimatedMinutes: 4,
    instructions: 'Read the clue describing an everyday helper and pick the matching word.',
    benefits: ['Semantic association', 'Verbal comprehension', 'Descriptive memory']
  },

  // F. Everyday Object Recognition & Room Memory
  {
    id: 'game-household-uses',
    title: 'Everyday Object Helpers',
    category: 'objects',
    categoryLabel: 'Everyday Object Recognition',
    difficulty: 'Gentle',
    description: 'Connect everyday household objects to their purpose (e.g., Reading Glasses for reading, Kettle for tea).',
    iconName: 'CheckCircle',
    estimatedMinutes: 3,
    instructions: 'Pair each familiar object with the activity it helps you do.',
    benefits: ['Functional knowledge', 'Object recognition', 'Daily independence']
  },
  {
    id: 'game-room-memory',
    title: 'Reference Room Memory Observation',
    category: 'objects',
    categoryLabel: 'Everyday Object Recognition',
    difficulty: 'Moderate',
    description: 'Observe a reference room photograph or explore familiar household objects with local, privacy-first camera observation.',
    iconName: 'Camera',
    estimatedMinutes: 5,
    instructions: 'Study the room photograph or use local camera observation to spot and recall familiar items.',
    benefits: ['Spatial orientation', 'Environmental recall', 'Visual memory']
  },

  // G. Legacy Mind Games Suite (Stage 2 Restoration)
  {
    id: 'game-color-sequence',
    title: 'Color Sequence Memory',
    category: 'sequence',
    categoryLabel: 'Sequence & Ordering',
    difficulty: 'Gentle',
    description: 'Watch colored pads pulse in a peaceful order and repeat the sequence.',
    iconName: 'Sparkles',
    estimatedMinutes: 3,
    instructions: 'Watch the colors light up one by one, then tap each pad in the same order.',
    benefits: ['Working memory span', 'Motor sequencing', 'Audiovisual recall']
  },
  {
    id: 'game-shape-match',
    title: 'Shape Match Attention',
    category: 'attention',
    categoryLabel: 'Attention & Observation',
    difficulty: 'Gentle',
    description: 'Compare the current shape with the previous one to decide whether they match.',
    iconName: 'Eye',
    estimatedMinutes: 3,
    instructions: 'Look at the shape shown and decide if it matches the previous shape you saw.',
    benefits: ['Continuous attention', 'Working memory', 'Visual vigilance']
  },
  {
    id: 'game-alternating-taps',
    title: 'Alternating Finger Taps',
    category: 'pattern',
    categoryLabel: 'Pattern Recognition',
    difficulty: 'Gentle',
    description: 'Gently alternate between left and right buttons to build smooth motor rhythm.',
    iconName: 'Activity',
    estimatedMinutes: 2,
    instructions: 'Tap LEFT then RIGHT in an alternating rhythm until you reach your goal.',
    benefits: ['Bimanual coordination', 'Motor pacing', 'Rhythm engagement']
  },
  {
    id: 'game-target-catch',
    title: 'Rapid Target Catch',
    category: 'attention',
    categoryLabel: 'Attention & Observation',
    difficulty: 'Gentle',
    description: 'Spot and gently tap the cheerful targets as they appear around the garden.',
    iconName: 'Target',
    estimatedMinutes: 3,
    instructions: 'Look for the target symbol and tap it when it appears. Catch your target goal.',
    benefits: ['Visual reaction time', 'Spatial alertness', 'Hand-eye coordination']
  },
  {
    id: 'game-mini-maze',
    title: 'Mini Maze Navigator',
    category: 'objects',
    categoryLabel: 'Everyday Object Recognition',
    difficulty: 'Gentle',
    description: 'Guide your friendly traveler through a simple 3x3 path home safely.',
    iconName: 'Compass',
    estimatedMinutes: 3,
    instructions: 'Use the directional arrow buttons to guide the traveler to the cozy home.',
    benefits: ['Spatial navigation', 'Planning', 'Executive functioning']
  },
  {
    id: 'game-word-unscramble',
    title: 'Word Unscramble',
    category: 'language',
    categoryLabel: 'Language & Word Recall',
    difficulty: 'Gentle',
    description: 'Unscramble jumbled letters to reveal comforting, cheerful everyday words.',
    iconName: 'BookOpen',
    estimatedMinutes: 3,
    instructions: 'Rearrange the scrambled letters to spell out a comforting word with helpful clues.',
    benefits: ['Anagram solving', 'Lexical search', 'Spelling memory']
  },
  {
    id: 'game-melody-recall',
    title: 'Melody Recall',
    category: 'sequence',
    categoryLabel: 'Sequence & Ordering',
    difficulty: 'Gentle',
    description: 'Listen to a short sequence of calming musical chime notes and play them back.',
    iconName: 'Music',
    estimatedMinutes: 3,
    instructions: 'Listen closely as notes play, then tap the note pads in the exact same sequence.',
    benefits: ['Auditory working memory', 'Pitch recognition', 'Sequential recall']
  },
  {
    id: 'game-math-sprint',
    title: 'Continuous Math Sprint',
    category: 'pattern',
    categoryLabel: 'Pattern Recognition',
    difficulty: 'Gentle',
    description: 'Enjoy simple, stress-free arithmetic questions with large multiple choice pads.',
    iconName: 'PlusCircle',
    estimatedMinutes: 3,
    instructions: 'Solve the gentle addition problems by tapping the correct answer from the large choices.',
    benefits: ['Mental arithmetic', 'Number fluency', 'Cognitive processing speed']
  }
];

export class GamesService {
  private static inMemoryStore: Record<string, string> = {};

  public static getTranslatedTitle(game: GameItem, t: (k: any) => string): string {
    const key = `game.${game.id}.title`;
    const translated = t(key);
    return translated && translated !== key ? translated : game.title;
  }

  public static getTranslatedDescription(game: GameItem, t: (k: any) => string): string {
    const key = `game.${game.id}.desc`;
    const translated = t(key);
    return translated && translated !== key ? translated : game.description;
  }

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage unavailable or headless error
    }
    return this.inMemoryStore[key] || null;
  }

  private static safeSetItem(key: string, val: string): void {
    this.inMemoryStore[key] = val;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch {
      // Storage unavailable
    }
  }

  private static safeRemoveItem(key: string): void {
    delete this.inMemoryStore[key];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage unavailable
    }
  }

  public static getHistoryKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_game_sessions_${effectiveId}`;
  }

  public static getDifficultyPrefKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_game_difficulty_pref_${effectiveId}`;
  }

  public static getPacingPrefKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_game_pacing_${effectiveId}`;
  }

  public static getGamePacing(patientId: string, gameId?: string): GamePacing {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const profile = gameId
      ? AdaptiveDifficultyService.getGameProfile(effectiveId, gameId)
      : AdaptiveDifficultyService.getProfile(effectiveId);
    return profile.pacing || 'calm';
  }

  public static setGamePacing(patientId: string, pacing: GamePacing, gameId?: string): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const diffMap: Record<GamePacing, GameDifficulty> = {
      calm: 'Gentle',
      balanced: 'Moderate',
      agile: 'Stimulating',
    };
    const diff = diffMap[pacing] || 'Gentle';

    if (gameId) {
      const gameProfile = AdaptiveDifficultyService.getGameProfile(effectiveId, gameId);
      AdaptiveDifficultyService.saveGameProfile(
        {
          ...gameProfile,
          pacing,
          currentDifficulty: diff,
          adaptationRationale: `Adjusted ${gameId} to ${diff} comfort pace.`,
        },
        gameId
      );
      return;
    }

    this.safeSetItem(this.getPacingPrefKey(effectiveId), pacing);
    this.safeSetItem(this.getDifficultyPrefKey(effectiveId), diff);
    const profile = AdaptiveDifficultyService.getProfile(effectiveId);
    AdaptiveDifficultyService.saveProfile({
      ...profile,
      pacing,
      currentDifficulty: diff,
    });
  }

  public static calculateStreak(history: GameSessionRecord[]): number {
    const completed = history.filter((h) => h.completed && h.date);
    if (completed.length === 0) return 0;

    const uniqueDates = Array.from(new Set(completed.map((h) => h.date))).sort().reverse();
    if (uniqueDates.length === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // If no session today or yesterday, streak is broken
    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 0;
    let expectedDate = new Date(uniqueDates[0]);

    for (const dStr of uniqueDates) {
      const actualDate = new Date(dStr);
      const diffDays = Math.round((expectedDate.getTime() - actualDate.getTime()) / 86400000);
      if (diffDays === 0) {
        streak++;
        expectedDate = new Date(actualDate.getTime() - 86400000);
      } else {
        break;
      }
    }

    return streak;
  }

  public static calculateTotalXp(history: GameSessionRecord[]): number {
    return history
      .filter((h) => h.completed)
      .reduce((sum, h) => sum + (h.earnedXp || 35), 0);
  }

  public static getDailyCount(history: GameSessionRecord[], dateStr?: string): number {
    const target = dateStr || new Date().toISOString().split('T')[0];
    return history.filter((h) => h.completed && h.date === target).length;
  }

  public static getEarnedBadges(history: GameSessionRecord[]): GameBadge[] {
    const badges: GameBadge[] = [];
    const completed = history.filter((h) => h.completed);

    if (completed.length >= 1) {
      badges.push({
        id: 'first_play',
        title: 'First Step',
        icon: '🌟',
        description: 'Completed your first cognitive wellness activity.',
      });
    }

    const uniqueCategories = new Set(completed.map((h) => h.category));
    if (uniqueCategories.size >= 3) {
      badges.push({
        id: 'explorer',
        title: 'Mind Explorer',
        icon: '🧭',
        description: 'Explored activities across 3 different categories.',
      });
    }

    const streak = this.calculateStreak(history);
    if (streak >= 3) {
      badges.push({
        id: 'streak_3',
        title: '3-Day Rhythm',
        icon: '🌿',
        description: 'Maintained a gentle 3-day mind practice streak.',
      });
    }

    if (completed.length >= 5) {
      badges.push({
        id: 'focus_5',
        title: 'Peaceful Focus',
        icon: '⭐',
        description: 'Completed 5 calming mind engagement sessions.',
      });
    }

    return badges;
  }

  public static getRandomGame(): GameItem {
    const list = GAME_CATALOGUE;
    return list[Math.floor(Math.random() * list.length)];
  }

  public static getRecentlyPlayed(patientId: string, limit: number = 3): GameItem[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const history = this.getHistory(effectiveId);
    const recentGameIds: string[] = [];
    for (const h of history) {
      if (!recentGameIds.includes(h.gameId)) {
        recentGameIds.push(h.gameId);
        if (recentGameIds.length >= limit) break;
      }
    }
    return recentGameIds
      .map((id) => this.getGameById(id))
      .filter((g): g is GameItem => Boolean(g));
  }

  public static getRecommendedGame(patientId: string): GameItem {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const rec = this.getAdaptiveRecommendation(effectiveId);
    // Find an activity matching recommended difficulty
    const match = GAME_CATALOGUE.find((g) => g.difficulty === rec.recommendedDifficulty);
    return match || GAME_CATALOGUE[0];
  }

  public static getAllGames(): GameItem[] {
    return GAME_CATALOGUE;
  }

  public static getGamesByCategory(category: GameCategory | 'all'): GameItem[] {
    if (category === 'all') return GAME_CATALOGUE;
    return GAME_CATALOGUE.filter((g) => g.category === category);
  }

  public static getGameById(id: string): GameItem | undefined {
    return GAME_CATALOGUE.find((g) => g.id === id);
  }

  /**
   * Load game participation history for a specific patient UID (local cache)
   */
  public static getHistory(patientId: string): GameSessionRecord[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    try {
      const key = this.getHistoryKey(effectiveId);
      const data = this.safeGetItem(key);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }

    if (isDemoModeEnabled(effectiveId)) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

      return [
        {
          id: 'sess-01',
          patientId: effectiveId,
          gameId: 'game-matching',
          gameTitle: 'Peaceful Nature Card Matching',
          category: 'memory',
          difficulty: 'Gentle',
          date: yesterday,
          durationSeconds: 145,
          completed: true,
          patientFeedback: 'Relaxing',
          notes: 'Enjoyed flower cards',
          completedAt: '10:30 AM'
        },
        {
          id: 'sess-02',
          patientId: effectiveId,
          gameId: 'game-daily-sequence',
          gameTitle: 'Daily Routine Story Order',
          category: 'sequence',
          difficulty: 'Gentle',
          date: twoDaysAgo,
          durationSeconds: 180,
          completed: true,
          patientFeedback: 'Loved it',
          completedAt: '03:15 PM'
        }
      ];
    }

    return [];
  }

  /**
   * Synchronize game session history from Cloud Firestore
   */
  public static async syncHistoryFromFirestore(patientId: string): Promise<GameSessionRecord[]> {
    const effectiveId = getEffectivePatientId({ uid: patientId });

    if (isGuestPatient(effectiveId) || !isFirebaseConfigured) {
      return this.getHistory(effectiveId);
    }

    try {
      const q = query(
        collection(db, 'gameSessions'),
        where('patientId', '==', effectiveId)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const localSessions = this.getHistory(effectiveId);
        const cloudSessions: GameSessionRecord[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as GameSessionRecord),
          id: docSnap.id,
          patientId: effectiveId,
        }));

        const mergedById = new Map<string, GameSessionRecord>();
        for (const s of cloudSessions) {
          mergedById.set(s.id, s);
        }
        // Retain local-only records that haven't flushed to cloud yet
        for (const local of localSessions) {
          if (!mergedById.has(local.id) && local.id.startsWith('sess_')) {
            mergedById.set(local.id, local);
          }
        }

        const mergedList = Array.from(mergedById.values()).sort((a, b) =>
          `${b.date || ''} ${b.completedAt || ''}`.localeCompare(
            `${a.date || ''} ${a.completedAt || ''}`
          )
        );

        this.safeSetItem(this.getHistoryKey(effectiveId), JSON.stringify(mergedList));
        return mergedList;
      }
    } catch (err) {
      console.warn('[GamesService] Firestore history sync error:', err);
    }

    return this.getHistory(effectiveId);
  }

  /**
   * Record a completed, incomplete, or interrupted game session with per-game adaptive intelligence.
   */
  public static async recordSession(
    patientId: string,
    session: Omit<GameSessionRecord, 'id' | 'patientId'> & { id?: string }
  ): Promise<GameSessionRecord> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const history = this.getHistory(effectiveId);
    const sessionId =
      session.id || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const baseRecord: GameSessionRecord = {
      ...session,
      id: sessionId,
      patientId: effectiveId,
      completedAt:
        session.completedAt ||
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const dedupedHistory = history.filter((item) => item.id !== sessionId);
    const provisionalHistory = [baseRecord, ...dedupedHistory];

    const derivedMistakes =
      session.mistakesCount ?? session.incorrectAnswers;
    const derivedAccuracy =
      typeof session.accuracy === 'number'
        ? session.accuracy
        : typeof session.correctAnswers === 'number' &&
          typeof session.attempts === 'number' &&
          session.attempts > 0
        ? session.correctAnswers / session.attempts
        : undefined;

    const evaluationMetrics = {
      sessionId: baseRecord.id,
      gameId: baseRecord.gameId,
      gameTitle: baseRecord.gameTitle,
      durationSeconds: baseRecord.durationSeconds,
      completed: baseRecord.completed,
      accuracy: derivedAccuracy,
      score: baseRecord.score,
      correctAnswers: baseRecord.correctAnswers,
      incorrectAnswers: baseRecord.incorrectAnswers,
      attempts: baseRecord.attempts,
      mistakesCount: derivedMistakes,
      hintsUsedCount: baseRecord.hintsUsed,
      pauseCount: baseRecord.pauseCount,
      reactionTimeMs: baseRecord.reactionTimeMs,
      isInterrupted: baseRecord.isInterrupted,
      completionStatus: baseRecord.completionStatus,
      patientFeedback: baseRecord.patientFeedback,
      difficultyAtPlay: baseRecord.difficulty,
    };

    let enrichedRecord: GameSessionRecord = { ...baseRecord };

    try {
      const perGameOutcome = AdaptiveDifficultyService.evaluateGameSession(
        effectiveId,
        evaluationMetrics,
        provisionalHistory
      );

      enrichedRecord = {
        ...baseRecord,
        completionStatus: perGameOutcome.completionStatus,
        accuracy: perGameOutcome.normalizedAccuracy ?? derivedAccuracy,
        difficultyBefore: perGameOutcome.difficultyBefore,
        difficultyAfter: perGameOutcome.difficultyAfter,
        difficultyAdjustment: perGameOutcome.difficultyAdjustment,
        adjustmentReason: perGameOutcome.adjustmentReason,
        adaptedTier: perGameOutcome.adaptedParams.tier,
      };

      const finalHistory = [enrichedRecord, ...dedupedHistory];
      this.safeSetItem(this.getHistoryKey(effectiveId), JSON.stringify(finalHistory));

      // Keep global fallback profile and existing spy integrations synchronized
      AdaptiveDifficultyService.evaluateSession(
        effectiveId,
        evaluationMetrics,
        finalHistory
      );

      const feedbackLower = (enrichedRecord.patientFeedback || '').toLowerCase();
      const explicitHelpRequested =
        feedbackLower.includes('need help') ||
        feedbackLower.includes('too difficult') ||
        feedbackLower.includes('easier');

      // Stage 3 Phase B: Unified adaptive support observation logging (single gentle hint does NOT trigger struggle proposal)
      AdaptiveSupportService.recordObservation({
        id: `obs_${enrichedRecord.id}`,
        patientId: effectiveId,
        activityId: enrichedRecord.gameId,
        activityTitle: enrichedRecord.gameTitle || 'Cognitive Activity',
        activityType: 'game',
        timestamp: new Date().toISOString(),
        sessionId: enrichedRecord.id,
        assistanceRequested: explicitHelpRequested || Boolean(enrichedRecord.hintsUsed && enrichedRecord.hintsUsed >= 3),
        hintsUsedCount: enrichedRecord.hintsUsed || 0,
        repeatedInstructionCount: 0,
        completionStatus: enrichedRecord.completed ? 'completed' : 'incomplete',
        pauseCount: enrichedRecord.pauseCount || 0,
        durationSeconds: enrichedRecord.durationSeconds || 0,
        isInterrupted: Boolean(
          enrichedRecord.isInterrupted ||
            perGameOutcome.completionStatus === 'interrupted' ||
            (enrichedRecord.durationSeconds < 10 && !enrichedRecord.completed)
        ),
        currentLevel: enrichedRecord.difficulty || 'Gentle',
        patientFeedback: enrichedRecord.patientFeedback,
      }).catch((err) => {
        console.warn('[GamesService] Adaptive support observation recording error:', err);
      });
    } catch (err) {
      console.warn('[GamesService] Adaptive difficulty evaluation error:', err);
      this.safeSetItem(this.getHistoryKey(effectiveId), JSON.stringify(provisionalHistory));
    }

    notifyDataChange('games', effectiveId);

    if (!isGuestPatient(effectiveId) && isFirebaseConfigured) {
      try {
        // Strip undefined values so Firestore SDK never throws invalid-argument errors
        const firestorePayload = Object.fromEntries(
          Object.entries({
            ...enrichedRecord,
            createdAt: new Date().toISOString(),
          }).filter(([, value]) => value !== undefined)
        );
        await setDoc(doc(db, 'gameSessions', enrichedRecord.id), firestorePayload);
      } catch (err) {
        console.warn('[GamesService] Cloud save failed for gameSession:', err);
      }
    }

    return enrichedRecord;
  }

  public static getDifficultyPreference(patientId: string, gameId?: string): GameDifficulty {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const profile = gameId
      ? AdaptiveDifficultyService.getGameProfile(effectiveId, gameId)
      : AdaptiveDifficultyService.getProfile(effectiveId);
    return profile.currentDifficulty || 'Gentle';
  }

  public static setDifficultyPreference(
    patientId: string,
    diff: GameDifficulty,
    gameId?: string
  ): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const pacingMap: Record<GameDifficulty, GamePacing> = {
      Gentle: 'calm',
      Moderate: 'balanced',
      Stimulating: 'agile',
    };
    const pacing = pacingMap[diff] || 'calm';

    if (gameId) {
      const gameProfile = AdaptiveDifficultyService.getGameProfile(effectiveId, gameId);
      AdaptiveDifficultyService.saveGameProfile(
        {
          ...gameProfile,
          currentDifficulty: diff,
          pacing,
          adaptationRationale: `Adjusted to ${diff} comfort level for this activity.`,
        },
        gameId
      );
      return;
    }

    this.safeSetItem(this.getDifficultyPrefKey(effectiveId), diff);
    this.safeSetItem(this.getPacingPrefKey(effectiveId), pacing);
    const profile = AdaptiveDifficultyService.getProfile(effectiveId);
    AdaptiveDifficultyService.saveProfile({
      ...profile,
      currentDifficulty: diff,
      pacing,
    });
  }

  public static getAdaptiveRecommendation(patientId: string, gameId?: string): {
    recommendedDifficulty: GameDifficulty;
    reason: string;
    adaptedParams?: GameAdaptiveParameters;
  } {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const profile = gameId
      ? AdaptiveDifficultyService.getGameProfile(effectiveId, gameId)
      : AdaptiveDifficultyService.getProfile(effectiveId);
    const adaptedParams = gameId
      ? AdaptiveDifficultyService.getAdaptedGameParameters(
          effectiveId,
          gameId,
          profile.currentDifficulty,
          this.getHistory(effectiveId)
        )
      : undefined;
    return {
      recommendedDifficulty: profile.currentDifficulty,
      reason:
        profile.adaptationRationale ||
        `Currently exploring ${profile.currentDifficulty} activities.`,
      adaptedParams,
    };
  }

  public static getAdaptedParametersForGame(
    patientId: string,
    gameId: string,
    difficultyOverride?: GameDifficulty
  ): GameAdaptiveParameters {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return AdaptiveDifficultyService.getAdaptedGameParameters(
      effectiveId,
      gameId,
      difficultyOverride,
      this.getHistory(effectiveId)
    );
  }

  public static getPerGameProgressionSummaries(
    patientId: string,
    sessionsOverride?: GameSessionRecord[]
  ): GameProgressSummary[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const sessions = sessionsOverride ?? this.getHistory(effectiveId);
    const lookup: Record<string, { title: string; category: GameCategory }> = {};
    for (const g of GAME_CATALOGUE) {
      lookup[g.id] = { title: g.title, category: g.category };
    }
    return AdaptiveDifficultyService.buildPerGameSummaries(effectiveId, sessions, lookup);
  }

  public static getRecentAdaptiveAdjustments(
    patientId: string,
    sessionsOverride?: GameSessionRecord[]
  ): AdaptiveAdjustmentRecord[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const sessions = sessionsOverride ?? this.getHistory(effectiveId);
    return sessions
      .filter((s) => s.difficultyAdjustment || s.adjustmentReason)
      .slice(0, 15)
      .map((s) => ({
        sessionId: s.id,
        gameId: s.gameId,
        gameTitle: s.gameTitle,
        timestamp: s.date,
        difficultyBefore: s.difficultyBefore || s.difficulty,
        difficultyAfter: s.difficultyAfter || s.difficulty,
        adjustment: s.difficultyAdjustment || 'unchanged',
        reason: s.adjustmentReason || `Completed at ${s.difficulty} comfort level`,
        accuracyPercent:
          typeof s.accuracy === 'number'
            ? Math.round(s.accuracy * 100)
            : typeof s.score === 'number'
            ? Math.round(s.score)
            : undefined,
        hintsUsed: s.hintsUsed || 0,
        completionStatus: s.completionStatus || (s.completed ? 'completed' : 'incomplete'),
      }));
  }

  /**
   * Purge local storage cache for a given patient (used during logout/switch)
   * Preserves pending offline sync queues by default.
   */
  public static clearPatientCache(patientId: string, preservePendingSync: boolean = true): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    this.safeRemoveItem(this.getHistoryKey(effectiveId));
    this.safeRemoveItem(this.getDifficultyPrefKey(effectiveId));
    this.safeRemoveItem(this.getPacingPrefKey(effectiveId));
    AdaptiveDifficultyService.clearMemoryCache(effectiveId);
    if (!preservePendingSync) {
      AdaptiveDifficultyService.resetProfile(effectiveId);
    }
  }
}
