import {
  GameItem,
  GameSessionRecord,
  GameCategory,
  GameDifficulty,
  GamePacing,
  GameBadge,
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
    description: 'Observe an archived reference photograph of a home room and recall where key items are kept.',
    iconName: 'Camera',
    estimatedMinutes: 5,
    instructions: 'Study the reference room photograph, then answer questions about what is visible.',
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

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
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

  public static getGamePacing(patientId: string): GamePacing {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const profile = AdaptiveDifficultyService.getProfile(effectiveId);
    return profile.pacing || 'calm';
  }

  public static setGamePacing(patientId: string, pacing: GamePacing): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    this.safeSetItem(this.getPacingPrefKey(effectiveId), pacing);
    const diffMap: Record<GamePacing, GameDifficulty> = {
      calm: 'Gentle',
      balanced: 'Moderate',
      agile: 'Stimulating',
    };
    const diff = diffMap[pacing] || 'Gentle';
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
        const cloudSessions: GameSessionRecord[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as GameSessionRecord),
          id: docSnap.id,
          patientId: effectiveId,
        }));

        this.safeSetItem(this.getHistoryKey(effectiveId), JSON.stringify(cloudSessions));
        return cloudSessions;
      }
    } catch (err) {
      console.warn('[GamesService] Firestore history sync error:', err);
    }

    return this.getHistory(effectiveId);
  }

  /**
   * Record a completed or paused game session (append-only)
   */
  public static async recordSession(
    patientId: string,
    session: Omit<GameSessionRecord, 'id' | 'patientId'> & { id?: string }
  ): Promise<GameSessionRecord> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const history = this.getHistory(effectiveId);
    const sessionId = session.id || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: GameSessionRecord = {
      ...session,
      id: sessionId,
      patientId: effectiveId,
      completedAt: session.completedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [newRecord, ...history];
    try {
      this.safeSetItem(this.getHistoryKey(effectiveId), JSON.stringify(updated));
    } catch {
      // Storage unavailable
    }

    // Evaluate adaptive difficulty progression based on multi-session rolling history
    try {
      AdaptiveDifficultyService.evaluateSession(
        effectiveId,
        {
          sessionId: newRecord.id,
          gameId: newRecord.gameId,
          gameTitle: newRecord.gameTitle,
          durationSeconds: newRecord.durationSeconds,
          completed: newRecord.completed,
          patientFeedback: newRecord.patientFeedback,
          difficultyAtPlay: newRecord.difficulty,
        },
        updated
      );
    } catch (err) {
      console.warn('[GamesService] Adaptive difficulty evaluation error:', err);
    }

    notifyDataChange('games', effectiveId);

    if (!isGuestPatient(effectiveId) && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'gameSessions', newRecord.id), {
          ...newRecord,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[GamesService] Cloud save failed for gameSession:', err);
      }
    }

    return newRecord;
  }

  public static getDifficultyPreference(patientId: string): GameDifficulty {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const profile = AdaptiveDifficultyService.getProfile(effectiveId);
    return profile.currentDifficulty || 'Gentle';
  }

  public static setDifficultyPreference(patientId: string, diff: GameDifficulty): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    this.safeSetItem(this.getDifficultyPrefKey(effectiveId), diff);
    const pacingMap: Record<GameDifficulty, GamePacing> = {
      Gentle: 'calm',
      Moderate: 'balanced',
      Stimulating: 'agile',
    };
    const pacing = pacingMap[diff] || 'calm';
    this.safeSetItem(this.getPacingPrefKey(effectiveId), pacing);
    const profile = AdaptiveDifficultyService.getProfile(effectiveId);
    AdaptiveDifficultyService.saveProfile({
      ...profile,
      currentDifficulty: diff,
      pacing,
    });
  }

  public static getAdaptiveRecommendation(patientId: string): {
    recommendedDifficulty: GameDifficulty;
    reason: string;
  } {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const profile = AdaptiveDifficultyService.getProfile(effectiveId);
    return {
      recommendedDifficulty: profile.currentDifficulty,
      reason:
        profile.adaptationRationale ||
        `Currently exploring ${profile.currentDifficulty} activities.`
    };
  }

  /**
   * Purge local storage cache for a given patient (used during logout/switch)
   */
  public static clearPatientCache(patientId: string): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    this.safeRemoveItem(this.getHistoryKey(effectiveId));
    this.safeRemoveItem(this.getDifficultyPrefKey(effectiveId));
    this.safeRemoveItem(this.getPacingPrefKey(effectiveId));
    AdaptiveDifficultyService.resetProfile(effectiveId);
  }
}
