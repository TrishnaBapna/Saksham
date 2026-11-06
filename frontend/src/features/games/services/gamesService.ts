import { GameItem, GameSessionRecord, GameCategory, GameDifficulty } from '../../../types/index.js';
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
  notifyDataChange,
} from '../../auth/services/identityService.js';

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
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }

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
    session: Omit<GameSessionRecord, 'id' | 'patientId'>
  ): Promise<GameSessionRecord> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const history = this.getHistory(effectiveId);
    const newRecord: GameSessionRecord = {
      ...session,
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      patientId: effectiveId,
      completedAt: session.completedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [newRecord, ...history];
    try {
      this.safeSetItem(this.getHistoryKey(effectiveId), JSON.stringify(updated));
    } catch {
      // Storage unavailable
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
    const val = this.safeGetItem(this.getDifficultyPrefKey(effectiveId));
    if (val === 'Moderate' || val === 'Stimulating') return val;
    return 'Gentle';
  }

  public static setDifficultyPreference(patientId: string, diff: GameDifficulty): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    this.safeSetItem(this.getDifficultyPrefKey(effectiveId), diff);
  }

  public static getAdaptiveRecommendation(patientId: string): {
    recommendedDifficulty: GameDifficulty;
    reason: string;
  } {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const history = this.getHistory(effectiveId);
    if (!history || history.length === 0) {
      return {
        recommendedDifficulty: 'Gentle',
        reason: 'Welcome! Gentle mode offers fewer items and a peaceful pace.'
      };
    }

    const recent = history.slice(0, 3);
    const trickyCount = recent.filter((r) => r.patientFeedback === 'A bit tricky').length;
    const lovedCount = recent.filter((r) => r.patientFeedback === 'Loved it' && r.completed).length;

    if (trickyCount >= 2) {
      return {
        recommendedDifficulty: 'Gentle',
        reason: 'You mentioned some activities were tricky recently. Gentle mode gives extra time and hints!'
      };
    }

    if (lovedCount >= 2) {
      return {
        recommendedDifficulty: 'Moderate',
        reason: 'You have been enjoying activities comfortably! You might like exploring Moderate level.'
      };
    }

    const currentPref = this.getDifficultyPreference(effectiveId);
    return {
      recommendedDifficulty: currentPref,
      reason: `Currently exploring ${currentPref} activities.`
    };
  }

  /**
   * Purge local storage cache for a given patient (used during logout/switch)
   */
  public static clearPatientCache(patientId: string): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    this.safeRemoveItem(this.getHistoryKey(effectiveId));
    this.safeRemoveItem(this.getDifficultyPrefKey(effectiveId));
  }
}
