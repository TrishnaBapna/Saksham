import {
  AdaptiveAdjustmentRecord,
  CompletionStatus,
  DifficultyAdjustmentDirection,
  GameAdaptiveParameters,
  GameDifficulty,
  GamePacing,
  GameProgressSummary,
  GameSessionRecord,
} from '../../../types/index.js';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { getEffectivePatientId, isGuestPatient } from '../../auth/services/identityService.js';

export type AdaptiveSyncStatus =
  | 'local-only'
  | 'offline-pending'
  | 'syncing'
  | 'synced'
  | 'sync-failed';

export interface AdaptiveProfile {
  patientId: string;
  currentDifficulty: GameDifficulty;
  pacing: GamePacing;
  consecutiveComfortableSessions: number;
  consecutiveStruggleSessions: number;
  lastSessionEvaluated?: string;
  lastEvaluatedSessionId?: string;
  evaluatedSessionIds?: string[];
  syncStatus?: AdaptiveSyncStatus;
  adaptationRationale: string;
  updatedAt: string;
}

export interface AdaptiveDifficultyConfig {
  defaultDifficulty: GameDifficulty;
  comfortAccuracyMin: number;
  maxComfortMistakes: number;
  maxComfortHints: number;
  struggleAccuracyMax: number;
  struggleMistakesMin: number;
  sessionsToIncrease: number;
  sessionsToDecrease: number;
  cooldownSessionsAfterAdjustment: number;
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveDifficultyConfig = {
  defaultDifficulty: 'Gentle',
  comfortAccuracyMin: 0.8,
  maxComfortMistakes: 1,
  maxComfortHints: 2,
  struggleAccuracyMax: 0.55,
  struggleMistakesMin: 3,
  sessionsToIncrease: 3,
  sessionsToDecrease: 2,
  cooldownSessionsAfterAdjustment: 1,
};

export interface AdaptiveGameMetadata {
  gameId: string;
  tier: number; // 0 (Extra Gentle) .. 4 (Stimulating)
  reversalCooldownRemaining: number;
  assistiveHintsEnabled: boolean;
  highClarityMode: boolean;
  recentAdjustments: AdaptiveAdjustmentRecord[];
}

export interface SessionEvaluationMetrics {
  sessionId?: string;
  gameId: string;
  gameTitle?: string;
  durationSeconds: number;
  completed: boolean;
  accuracy?: number; // 0 to 1
  score?: number; // 0 to 100
  correctAnswers?: number;
  incorrectAnswers?: number;
  attempts?: number;
  mistakesCount?: number;
  hintsUsedCount?: number;
  pauseCount?: number;
  reactionTimeMs?: number;
  isInterrupted?: boolean;
  completionStatus?: CompletionStatus;
  patientFeedback?: string;
  difficultyAtPlay?: GameDifficulty;
}

export interface AdaptiveSessionEvaluationOutcome {
  profile: AdaptiveProfile;
  metadata: AdaptiveGameMetadata;
  adaptedParams: GameAdaptiveParameters;
  difficultyBefore: GameDifficulty;
  difficultyAfter: GameDifficulty;
  difficultyAdjustment: DifficultyAdjustmentDirection;
  adjustmentReason: string;
  completionStatus: CompletionStatus;
  normalizedAccuracy?: number;
}

const PACING_BY_DIFFICULTY: Record<GameDifficulty, GamePacing> = {
  Gentle: 'calm',
  Moderate: 'balanced',
  Stimulating: 'agile',
};

const BASE_TIER_BY_DIFFICULTY: Record<GameDifficulty, number> = {
  Gentle: 1,
  Moderate: 2,
  Stimulating: 4,
};

export class AdaptiveDifficultyService {
  private static inMemoryProfiles: Record<string, AdaptiveProfile> = {};
  private static inMemoryGameProfiles: Record<string, AdaptiveProfile> = {};
  private static inMemoryGameMeta: Record<string, AdaptiveGameMetadata> = {};
  private static isOnlineListenerRegistered = false;

  private static getProfileKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_adaptive_profile_${effectiveId}`;
  }

  private static getPendingSyncKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_pending_adaptive_sync_${effectiveId}`;
  }

  private static getSafeGameSlug(gameId: string): string {
    return (gameId || 'global').replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  public static getGameDocId(gameId: string): string {
    return `mindGames_${this.getSafeGameSlug(gameId)}`;
  }

  private static getGameCacheKey(effectiveId: string, gameId: string): string {
    return `${effectiveId}::${this.getSafeGameSlug(gameId)}`;
  }

  private static getGameProfileStorageKey(effectiveId: string, gameId: string): string {
    return `saksham_adaptive_profile_${effectiveId}__${this.getSafeGameSlug(gameId)}`;
  }

  private static getGameMetaStorageKey(effectiveId: string, gameId: string): string {
    return `saksham_adaptive_meta_${effectiveId}__${this.getSafeGameSlug(gameId)}`;
  }

  private static getPendingGameSyncKey(effectiveId: string, gameId: string): string {
    return `saksham_pending_game_adaptive_sync_${effectiveId}__${this.getSafeGameSlug(gameId)}`;
  }

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage unavailable or headless error
    }
    return null;
  }

  private static safeSetItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage unavailable
    }
  }

  private static safeRemoveItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage unavailable
    }
  }

  public static isOnline(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Register automatic reconnection sync listener
   */
  public static ensureReconnectionListener(): void {
    if (this.isOnlineListenerRegistered || typeof window === 'undefined') return;
    this.isOnlineListenerRegistered = true;
    window.addEventListener('online', () => {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('saksham_pending_adaptive_sync_')) {
            const patientId = key.replace('saksham_pending_adaptive_sync_', '');
            this.syncPendingProfile(patientId).catch((err) => {
              console.warn('[AdaptiveDifficultyService] Reconnection sync error:', err);
            });
          }
          if (key && key.startsWith('saksham_pending_game_adaptive_sync_')) {
            const suffix = key.replace('saksham_pending_game_adaptive_sync_', '');
            const sepIdx = suffix.indexOf('__');
            if (sepIdx > 0) {
              const patientId = suffix.slice(0, sepIdx);
              const gameId = suffix.slice(sepIdx + 2);
              this.syncPendingGameProfile(patientId, gameId).catch((err) => {
                console.warn('[AdaptiveDifficultyService] Game reconnection sync error:', err);
              });
            }
          }
        }
      } catch {
        // Storage access error
      }
    });
  }

  /**
   * Reset all in-memory profiles (used for test teardown)
   */
  public static clearAll(): void {
    this.inMemoryProfiles = {};
    this.inMemoryGameProfiles = {};
    this.inMemoryGameMeta = {};
  }

  /**
   * Safe default profile: always starts at Gentle & Calm
   */
  public static getDefaultProfile(patientId: string): AdaptiveProfile {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const isGuest = isGuestPatient(effectiveId);
    return {
      patientId: effectiveId,
      currentDifficulty: 'Gentle',
      pacing: 'calm',
      consecutiveComfortableSessions: 0,
      consecutiveStruggleSessions: 0,
      evaluatedSessionIds: [],
      syncStatus: isGuest ? 'local-only' : 'synced',
      adaptationRationale: 'Starting at Gentle pace for soothing, pressure-free engagement.',
      updatedAt: new Date().toISOString(),
    };
  }

  private static getDefaultMetadata(gameId: string, difficulty: GameDifficulty = 'Gentle'): AdaptiveGameMetadata {
    return {
      gameId,
      tier: BASE_TIER_BY_DIFFICULTY[difficulty],
      reversalCooldownRemaining: 0,
      assistiveHintsEnabled: difficulty === 'Gentle',
      highClarityMode: difficulty === 'Gentle',
      recentAdjustments: [],
    };
  }

  /**
   * Retrieve the global fallback adaptive difficulty profile for a patient
   */
  public static getProfile(patientId: string): AdaptiveProfile {
    this.ensureReconnectionListener();
    const effectiveId = getEffectivePatientId({ uid: patientId });

    if (this.inMemoryProfiles[effectiveId]) {
      return this.inMemoryProfiles[effectiveId];
    }

    const key = this.getProfileKey(effectiveId);
    const stored = this.safeGetItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AdaptiveProfile;
        if (parsed && parsed.currentDifficulty) {
          this.inMemoryProfiles[effectiveId] = parsed;
          return parsed;
        }
      } catch {
        // Fall through to default
      }
    }

    const defaultProfile = this.getDefaultProfile(effectiveId);
    this.inMemoryProfiles[effectiveId] = defaultProfile;
    return defaultProfile;
  }

  /**
   * Retrieve an individual per-game adaptive profile (isolated per gameId and patientId).
   * Starts safely at Gentle for each game so excelling at one cognitive game never makes another overwhelming.
   */
  public static getGameProfile(patientId: string, gameId: string): AdaptiveProfile {
    this.ensureReconnectionListener();
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const cacheKey = this.getGameCacheKey(effectiveId, gameId);

    if (this.inMemoryGameProfiles[cacheKey]) {
      return this.inMemoryGameProfiles[cacheKey];
    }

    const storageKey = this.getGameProfileStorageKey(effectiveId, gameId);
    const stored = this.safeGetItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AdaptiveProfile;
        if (parsed && parsed.currentDifficulty) {
          this.inMemoryGameProfiles[cacheKey] = parsed;
          return parsed;
        }
      } catch {
        // Fall through to default
      }
    }

    const defaultProfile = this.getDefaultProfile(effectiveId);
    this.inMemoryGameProfiles[cacheKey] = defaultProfile;
    return defaultProfile;
  }

  public static getGameMetadata(patientId: string, gameId: string): AdaptiveGameMetadata {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const cacheKey = this.getGameCacheKey(effectiveId, gameId);

    if (this.inMemoryGameMeta[cacheKey]) {
      return this.inMemoryGameMeta[cacheKey];
    }

    const storageKey = this.getGameMetaStorageKey(effectiveId, gameId);
    const stored = this.safeGetItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AdaptiveGameMetadata;
        if (parsed && typeof parsed.tier === 'number') {
          this.inMemoryGameMeta[cacheKey] = parsed;
          return parsed;
        }
      } catch {
        // Fall through
      }
    }

    const profile = this.getGameProfile(effectiveId, gameId);
    const def = this.getDefaultMetadata(gameId, profile.currentDifficulty);
    this.inMemoryGameMeta[cacheKey] = def;
    return def;
  }

  private static saveGameMetadata(effectiveId: string, gameId: string, meta: AdaptiveGameMetadata): void {
    const cacheKey = this.getGameCacheKey(effectiveId, gameId);
    this.inMemoryGameMeta[cacheKey] = meta;
    this.safeSetItem(this.getGameMetaStorageKey(effectiveId, gameId), JSON.stringify(meta));
  }

  /**
   * Filter payload strictly to schema allowed in Firestore security rules (11 keys exact).
   */
  private static sanitizeForFirestore(profile: AdaptiveProfile): Record<string, unknown> {
    const allowed = [
      'patientId',
      'currentDifficulty',
      'pacing',
      'consecutiveComfortableSessions',
      'consecutiveStruggleSessions',
      'lastSessionEvaluated',
      'lastEvaluatedSessionId',
      'evaluatedSessionIds',
      'syncStatus',
      'adaptationRationale',
      'updatedAt',
    ];
    const payload: Record<string, unknown> = {};
    for (const key of allowed) {
      const value = (profile as unknown as Record<string, unknown>)[key];
      if (value !== undefined) {
        payload[key] = value;
      }
    }
    return payload;
  }

  /**
   * Save global adaptive profile with offline handling
   */
  public static async saveProfile(profile: AdaptiveProfile): Promise<AdaptiveProfile> {
    const effectiveId = getEffectivePatientId({ uid: profile.patientId });
    const isGuest = isGuestPatient(effectiveId);
    const online = this.isOnline();

    let resolvedSyncStatus: AdaptiveSyncStatus = profile.syncStatus || 'synced';
    if (isGuest) {
      resolvedSyncStatus = 'local-only';
    } else if (!online) {
      resolvedSyncStatus = 'offline-pending';
    }

    const profileToSave: AdaptiveProfile = {
      ...profile,
      patientId: effectiveId,
      syncStatus: resolvedSyncStatus,
      updatedAt: profile.updatedAt || new Date().toISOString(),
    };

    this.inMemoryProfiles[effectiveId] = profileToSave;
    const key = this.getProfileKey(effectiveId);
    this.safeSetItem(key, JSON.stringify(profileToSave));
    this.safeSetItem(`saksham_game_difficulty_pref_${effectiveId}`, profileToSave.currentDifficulty);
    this.safeSetItem(`saksham_game_pacing_${effectiveId}`, profileToSave.pacing);

    if (isGuest) {
      return profileToSave;
    }

    if (!online) {
      this.safeSetItem(this.getPendingSyncKey(effectiveId), JSON.stringify(profileToSave));
      return profileToSave;
    }

    if (isFirebaseConfigured) {
      try {
        const profileRef = doc(db, 'users', effectiveId, 'adaptiveProfiles', 'mindGames');
        const sanitized = this.sanitizeForFirestore({ ...profileToSave, syncStatus: 'synced' });
        await setDoc(profileRef, sanitized, { merge: true });

        this.safeRemoveItem(this.getPendingSyncKey(effectiveId));
        const syncedProfile: AdaptiveProfile = {
          ...profileToSave,
          syncStatus: 'synced',
        };
        this.inMemoryProfiles[effectiveId] = syncedProfile;
        this.safeSetItem(key, JSON.stringify(syncedProfile));
        return syncedProfile;
      } catch (err) {
        console.warn('[AdaptiveDifficultyService] Cloud save failed:', err);
        const failedProfile: AdaptiveProfile = {
          ...profileToSave,
          syncStatus: 'sync-failed',
        };
        this.inMemoryProfiles[effectiveId] = failedProfile;
        this.safeSetItem(key, JSON.stringify(failedProfile));
        this.safeSetItem(this.getPendingSyncKey(effectiveId), JSON.stringify(failedProfile));
        return failedProfile;
      }
    }

    return profileToSave;
  }

  /**
   * Save per-game adaptive profile under users/{uid}/adaptiveProfiles/mindGames_{gameId}
   * strictly honoring the deployed Firestore 11-key allowlist.
   */
  public static async saveGameProfile(
    profile: AdaptiveProfile,
    gameId: string
  ): Promise<AdaptiveProfile> {
    const effectiveId = getEffectivePatientId({ uid: profile.patientId });
    const cacheKey = this.getGameCacheKey(effectiveId, gameId);
    const storageKey = this.getGameProfileStorageKey(effectiveId, gameId);
    const pendingKey = this.getPendingGameSyncKey(effectiveId, gameId);
    const isGuest = isGuestPatient(effectiveId);
    const online = this.isOnline();

    let resolvedSyncStatus: AdaptiveSyncStatus = profile.syncStatus || 'synced';
    if (isGuest) {
      resolvedSyncStatus = 'local-only';
    } else if (!online) {
      resolvedSyncStatus = 'offline-pending';
    }

    const profileToSave: AdaptiveProfile = {
      ...profile,
      patientId: effectiveId,
      syncStatus: resolvedSyncStatus,
      updatedAt: profile.updatedAt || new Date().toISOString(),
    };

    this.inMemoryGameProfiles[cacheKey] = profileToSave;
    this.safeSetItem(storageKey, JSON.stringify(profileToSave));

    if (isGuest) {
      return profileToSave;
    }

    if (!online) {
      this.safeSetItem(pendingKey, JSON.stringify(profileToSave));
      return profileToSave;
    }

    if (isFirebaseConfigured) {
      try {
        const profileRef = doc(
          db,
          'users',
          effectiveId,
          'adaptiveProfiles',
          this.getGameDocId(gameId)
        );
        const sanitized = this.sanitizeForFirestore({ ...profileToSave, syncStatus: 'synced' });
        await setDoc(profileRef, sanitized, { merge: true });

        this.safeRemoveItem(pendingKey);
        const syncedProfile: AdaptiveProfile = {
          ...profileToSave,
          syncStatus: 'synced',
        };
        this.inMemoryGameProfiles[cacheKey] = syncedProfile;
        this.safeSetItem(storageKey, JSON.stringify(syncedProfile));
        return syncedProfile;
      } catch (err) {
        console.warn(`[AdaptiveDifficultyService] Game cloud save failed (${gameId}):`, err);
        const failedProfile: AdaptiveProfile = {
          ...profileToSave,
          syncStatus: 'sync-failed',
        };
        this.inMemoryGameProfiles[cacheKey] = failedProfile;
        this.safeSetItem(storageKey, JSON.stringify(failedProfile));
        this.safeSetItem(pendingKey, JSON.stringify(failedProfile));
        return failedProfile;
      }
    }

    return profileToSave;
  }

  /**
   * Sync pending changes for a patient when network connectivity returns
   */
  public static async syncPendingProfile(patientId: string): Promise<AdaptiveProfile> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (isGuestPatient(effectiveId) || !isFirebaseConfigured || !this.isOnline()) {
      return this.getProfile(effectiveId);
    }

    // Flush any queued per-game pending sync keys in parallel safely
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const prefix = `saksham_pending_game_adaptive_sync_${effectiveId}__`;
        const gameIdsToFlush: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(prefix)) {
            gameIdsToFlush.push(k.slice(prefix.length));
          }
        }
        await Promise.all(
          gameIdsToFlush.map((gId) => this.syncPendingGameProfile(effectiveId, gId))
        );
      }
    } catch {
      // Non-blocking
    }

    const pendingRaw = this.safeGetItem(this.getPendingSyncKey(effectiveId));
    if (!pendingRaw) {
      return this.getProfile(effectiveId);
    }

    try {
      const pending = JSON.parse(pendingRaw) as AdaptiveProfile;
      const profileRef = doc(db, 'users', effectiveId, 'adaptiveProfiles', 'mindGames');
      const sanitized = this.sanitizeForFirestore({ ...pending, syncStatus: 'synced' });
      await setDoc(profileRef, sanitized, { merge: true });

      this.safeRemoveItem(this.getPendingSyncKey(effectiveId));
      const syncedProfile: AdaptiveProfile = {
        ...pending,
        syncStatus: 'synced',
      };
      this.inMemoryProfiles[effectiveId] = syncedProfile;
      this.safeSetItem(this.getProfileKey(effectiveId), JSON.stringify(syncedProfile));
      return syncedProfile;
    } catch (err) {
      console.warn('[AdaptiveDifficultyService] syncPendingProfile error:', err);
      return this.getProfile(effectiveId);
    }
  }

  public static async syncPendingGameProfile(
    patientId: string,
    gameId: string
  ): Promise<AdaptiveProfile> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (isGuestPatient(effectiveId) || !isFirebaseConfigured || !this.isOnline()) {
      return this.getGameProfile(effectiveId, gameId);
    }

    const pendingKey = this.getPendingGameSyncKey(effectiveId, gameId);
    const pendingRaw = this.safeGetItem(pendingKey);
    if (!pendingRaw) {
      return this.getGameProfile(effectiveId, gameId);
    }

    try {
      const pending = JSON.parse(pendingRaw) as AdaptiveProfile;
      const profileRef = doc(
        db,
        'users',
        effectiveId,
        'adaptiveProfiles',
        this.getGameDocId(gameId)
      );
      const sanitized = this.sanitizeForFirestore({ ...pending, syncStatus: 'synced' });
      await setDoc(profileRef, sanitized, { merge: true });

      this.safeRemoveItem(pendingKey);
      const synced: AdaptiveProfile = {
        ...pending,
        syncStatus: 'synced',
      };
      this.inMemoryGameProfiles[this.getGameCacheKey(effectiveId, gameId)] = synced;
      this.safeSetItem(this.getGameProfileStorageKey(effectiveId, gameId), JSON.stringify(synced));
      return synced;
    } catch (err) {
      console.warn(`[AdaptiveDifficultyService] syncPendingGameProfile error (${gameId}):`, err);
      return this.getGameProfile(effectiveId, gameId);
    }
  }

  private static resolveCloudMerge(
    localProfile: AdaptiveProfile,
    cloudData: AdaptiveProfile
  ): { adopted: 'cloud' | 'local' | 'equal'; profile: AdaptiveProfile } {
    const localTime = new Date(localProfile.updatedAt || 0).getTime();
    const cloudTime = new Date(cloudData.updatedAt || 0).getTime();
    const mergedSessionIds = Array.from(
      new Set([...(localProfile.evaluatedSessionIds || []), ...(cloudData.evaluatedSessionIds || [])])
    ).slice(0, 30);

    if (cloudTime > localTime) {
      return {
        adopted: 'cloud',
        profile: {
          ...cloudData,
          evaluatedSessionIds: mergedSessionIds,
          syncStatus: 'synced',
        },
      };
    }

    if (localTime > cloudTime) {
      return {
        adopted: 'local',
        profile: {
          ...localProfile,
          evaluatedSessionIds: mergedSessionIds,
        },
      };
    }

    return { adopted: 'equal', profile: localProfile };
  }

  /**
   * Load global profile from Firestore with strict timestamp conflict protection
   */
  public static async syncProfileFromFirestore(patientId: string): Promise<AdaptiveProfile> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (isGuestPatient(effectiveId) || !isFirebaseConfigured || !this.isOnline()) {
      return this.getProfile(effectiveId);
    }

    try {
      const profileRef = doc(db, 'users', effectiveId, 'adaptiveProfiles', 'mindGames');
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        const cloudData = snap.data() as AdaptiveProfile;
        const localProfile = this.getProfile(effectiveId);
        const { adopted, profile } = this.resolveCloudMerge(localProfile, cloudData);

        if (adopted === 'cloud') {
          this.inMemoryProfiles[effectiveId] = profile;
          this.safeSetItem(this.getProfileKey(effectiveId), JSON.stringify(profile));
          this.safeSetItem(`saksham_game_difficulty_pref_${effectiveId}`, profile.currentDifficulty);
          this.safeSetItem(`saksham_game_pacing_${effectiveId}`, profile.pacing);
          return profile;
        }
        if (adopted === 'local') {
          await this.saveProfile(profile);
          return localProfile;
        }
        return localProfile;
      }
    } catch (err) {
      console.warn('[AdaptiveDifficultyService] Cloud sync error:', err);
    }

    return this.getProfile(effectiveId);
  }

  /**
   * Sync an individual per-game adaptive profile from Firestore with timestamp conflict protection
   */
  public static async syncGameProfileFromFirestore(
    patientId: string,
    gameId: string
  ): Promise<AdaptiveProfile> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (isGuestPatient(effectiveId) || !isFirebaseConfigured || !this.isOnline()) {
      return this.getGameProfile(effectiveId, gameId);
    }

    try {
      const profileRef = doc(
        db,
        'users',
        effectiveId,
        'adaptiveProfiles',
        this.getGameDocId(gameId)
      );
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        const cloudData = snap.data() as AdaptiveProfile;
        const localProfile = this.getGameProfile(effectiveId, gameId);
        const { adopted, profile } = this.resolveCloudMerge(localProfile, cloudData);

        if (adopted === 'cloud') {
          this.inMemoryGameProfiles[this.getGameCacheKey(effectiveId, gameId)] = profile;
          this.safeSetItem(
            this.getGameProfileStorageKey(effectiveId, gameId),
            JSON.stringify(profile)
          );
          return profile;
        }
        if (adopted === 'local') {
          await this.saveGameProfile(profile, gameId);
          return localProfile;
        }
      }
    } catch (err) {
      console.warn(`[AdaptiveDifficultyService] Cloud game sync error (${gameId}):`, err);
    }

    return this.getGameProfile(effectiveId, gameId);
  }

  /**
   * Batch sync all per-game profiles for a patient with a single Firestore collection read
   * so Spark Free read quota stays minimal while preserving per-game continuity across reloads/devices.
   */
  public static async syncAllGameProfilesFromFirestore(
    patientId: string
  ): Promise<Record<string, AdaptiveProfile>> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const syncedMap: Record<string, AdaptiveProfile> = {};

    if (isGuestPatient(effectiveId) || !isFirebaseConfigured || !this.isOnline()) {
      return syncedMap;
    }

    try {
      const profilesCol = collection(db, 'users', effectiveId, 'adaptiveProfiles');
      const snapshot = await getDocs(profilesCol);

      for (const docSnap of snapshot.docs) {
        if (docSnap.id === 'mindGames') {
          const cloudGlobal = docSnap.data() as AdaptiveProfile;
          const localGlobal = this.getProfile(effectiveId);
          const mergedGlobal = this.resolveCloudMerge(localGlobal, cloudGlobal);
          if (mergedGlobal.adopted === 'cloud') {
            this.inMemoryProfiles[effectiveId] = mergedGlobal.profile;
            this.safeSetItem(this.getProfileKey(effectiveId), JSON.stringify(mergedGlobal.profile));
          }
          continue;
        }

        if (docSnap.id.startsWith('mindGames_')) {
          const gameId = docSnap.id.replace('mindGames_', '');
          const cloudGame = docSnap.data() as AdaptiveProfile;
          const localGame = this.getGameProfile(effectiveId, gameId);
          const merged = this.resolveCloudMerge(localGame, cloudGame);
          if (merged.adopted === 'cloud') {
            this.inMemoryGameProfiles[this.getGameCacheKey(effectiveId, gameId)] = merged.profile;
            this.safeSetItem(
              this.getGameProfileStorageKey(effectiveId, gameId),
              JSON.stringify(merged.profile)
            );
            syncedMap[gameId] = merged.profile;
          } else {
            syncedMap[gameId] = localGame;
          }
        }
      }
    } catch (err) {
      console.warn('[AdaptiveDifficultyService] Batch game profile sync error:', err);
    }

    return syncedMap;
  }

  private static parseFeedbackSignals(feedbackRaw?: string): {
    wantsEasier: boolean;
    wantsChallenge: boolean;
    wantsBreak: boolean;
  } {
    const feedback = (feedbackRaw || '').toLowerCase();
    return {
      wantsEasier:
        feedback.includes('easier') ||
        feedback.includes('tricky') ||
        feedback.includes('difficult') ||
        feedback.includes('too hard') ||
        feedback.includes('need help') ||
        feedback.includes("don't like"),
      wantsChallenge:
        feedback.includes('more challenge') ||
        feedback.includes('too easy'),
      wantsBreak:
        feedback.includes('want a break') ||
        feedback.includes('pause') ||
        feedback.includes("don't like"),
    };
  }

  private static resolveNormalizedAccuracy(metrics: SessionEvaluationMetrics): number | undefined {
    if (typeof metrics.accuracy === 'number' && !Number.isNaN(metrics.accuracy)) {
      return Math.max(0, Math.min(1, metrics.accuracy));
    }
    if (
      typeof metrics.correctAnswers === 'number' &&
      typeof metrics.attempts === 'number' &&
      metrics.attempts > 0
    ) {
      return Math.max(0, Math.min(1, metrics.correctAnswers / metrics.attempts));
    }
    if (typeof metrics.score === 'number' && !Number.isNaN(metrics.score)) {
      return Math.max(0, Math.min(1, metrics.score / 100));
    }
    return undefined;
  }

  private static stepDifficultyDown(current: GameDifficulty): GameDifficulty {
    if (current === 'Stimulating') return 'Moderate';
    return 'Gentle';
  }

  private static stepDifficultyUp(current: GameDifficulty): GameDifficulty {
    if (current === 'Gentle') return 'Moderate';
    return 'Stimulating';
  }

  /**
   * Resolve fine-grained mechanic-specific gameplay parameters for any game in GAME_CATALOGUE (all 21 IDs).
   * Combines persisted per-game AdaptiveProfile level + fine tier + recent session metrics
   * without abrupt mid-round jumps.
   */
  public static getAdaptedGameParameters(
    patientId: string,
    gameId: string,
    difficultyOverride?: GameDifficulty,
    rollingHistory?: GameSessionRecord[]
  ): GameAdaptiveParameters {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const profile = this.getGameProfile(effectiveId, gameId);
    const meta = this.getGameMetadata(effectiveId, gameId);

    const activeDifficulty = difficultyOverride || profile.currentDifficulty || 'Gentle';
    const activePacing = PACING_BY_DIFFICULTY[activeDifficulty];

    // If caller passed a test difficulty override without existing game profile, align base tier cleanly
    let tier =
      difficultyOverride && difficultyOverride !== profile.currentDifficulty
        ? BASE_TIER_BY_DIFFICULTY[difficultyOverride]
        : meta.tier;

    // Gentle contextual nudge from recent accuracy on this specific game (stay within difficulty bounds)
    if (rollingHistory && rollingHistory.length > 0) {
      const sameGameCompleted = rollingHistory
        .filter((s) => s.gameId === gameId && s.completed && typeof s.accuracy === 'number')
        .slice(0, 3);
      if (sameGameCompleted.length >= 2) {
        const avgAcc =
          sameGameCompleted.reduce((sum, s) => sum + (s.accuracy || 0), 0) /
          sameGameCompleted.length;
        if (avgAcc < 0.65 && tier > 0) {
          tier = Math.max(0, tier - 1);
        }
      }
    }

    const clampedTier = Math.max(0, Math.min(4, tier));
    const assistiveHintsEnabled =
      activeDifficulty === 'Gentle' || meta.assistiveHintsEnabled;
    const highClarityMode = activeDifficulty === 'Gentle' || meta.highClarityMode;

    // Base parameters per difficulty level, then tailored per game mechanic
    let itemCount = activeDifficulty === 'Gentle' ? 3 : activeDifficulty === 'Moderate' ? 4 : 6;
    let sequenceLength =
      activeDifficulty === 'Gentle' ? 4 : activeDifficulty === 'Moderate' ? 5 : 6;
    let choiceCount = activeDifficulty === 'Gentle' ? 3 : activeDifficulty === 'Moderate' ? 4 : 4;
    let distractorCount =
      activeDifficulty === 'Gentle' ? 4 : activeDifficulty === 'Moderate' ? 7 : 10;
    let gridSize = activeDifficulty === 'Gentle' ? 3 : 4;
    let memorizationDelayMs =
      activeDifficulty === 'Gentle'
        ? assistiveHintsEnabled
          ? 1600
          : 1300
        : activeDifficulty === 'Moderate'
        ? 1000
        : 750;
    let timeAllowanceMultiplier =
      activeDifficulty === 'Gentle' ? 1.5 : activeDifficulty === 'Moderate' ? 1.15 : 1.0;

    switch (gameId) {
      case 'game-matching':
      case 'game-objects-recall':
      case 'game-spot-difference':
      case 'game-symbol-matching':
      case 'game-object-riddles':
      case 'game-household-uses':
        itemCount =
          activeDifficulty === 'Gentle'
            ? 3
            : activeDifficulty === 'Moderate'
            ? clampedTier >= 3
              ? 5
              : 4
            : 6;
        memorizationDelayMs =
          activeDifficulty === 'Gentle' ? 1600 : activeDifficulty === 'Moderate' ? 1150 : 850;
        break;

      case 'game-daily-sequence':
        sequenceLength =
          activeDifficulty === 'Gentle' ? 3 : activeDifficulty === 'Moderate' ? 4 : 5;
        itemCount = sequenceLength;
        break;

      case 'game-visual-search':
        itemCount =
          activeDifficulty === 'Gentle' ? 2 : activeDifficulty === 'Moderate' ? 3 : 4;
        distractorCount =
          activeDifficulty === 'Gentle'
            ? clampedTier === 0
              ? 4
              : 6
            : activeDifficulty === 'Moderate'
            ? 9
            : 12;
        gridSize = itemCount + distractorCount;
        break;

      case 'game-pattern-completion':
        sequenceLength =
          activeDifficulty === 'Gentle' ? 4 : activeDifficulty === 'Moderate' ? 5 : 6;
        choiceCount = activeDifficulty === 'Stimulating' ? 4 : 3;
        break;

      case 'game-word-garden':
        itemCount =
          activeDifficulty === 'Gentle' ? 3 : activeDifficulty === 'Moderate' ? 4 : 5;
        choiceCount = activeDifficulty === 'Gentle' ? 3 : 4;
        break;

      case 'game-room-memory':
        choiceCount = activeDifficulty === 'Gentle' ? 2 : 3;
        break;

      case 'game-loved-ones-cues':
        choiceCount =
          activeDifficulty === 'Gentle' ? 2 : activeDifficulty === 'Moderate' ? 3 : 4;
        break;

      case 'game-color-sequence':
      case 'game-melody-sequence':
        sequenceLength =
          activeDifficulty === 'Gentle' ? 3 : activeDifficulty === 'Moderate' ? 4 : 5;
        memorizationDelayMs =
          activeDifficulty === 'Gentle' ? 1100 : activeDifficulty === 'Moderate' ? 850 : 650;
        break;

      case 'game-shape-match':
        itemCount =
          activeDifficulty === 'Gentle' ? 5 : activeDifficulty === 'Moderate' ? 7 : 9;
        choiceCount = 2;
        break;

      case 'game-alternating-taps':
        itemCount =
          activeDifficulty === 'Gentle' ? 8 : activeDifficulty === 'Moderate' ? 12 : 16;
        break;

      case 'game-target-catch':
        itemCount =
          activeDifficulty === 'Gentle' ? 5 : activeDifficulty === 'Moderate' ? 7 : 10;
        memorizationDelayMs =
          activeDifficulty === 'Gentle' ? 2600 : activeDifficulty === 'Moderate' ? 1900 : 1400;
        break;

      case 'game-mini-maze':
        gridSize = activeDifficulty === 'Gentle' ? 3 : 4;
        distractorCount = activeDifficulty === 'Stimulating' ? 1 : 0;
        break;

      case 'game-word-unscramble':
        sequenceLength =
          activeDifficulty === 'Gentle' ? 4 : activeDifficulty === 'Moderate' ? 5 : 6;
        itemCount = sequenceLength;
        break;

      case 'game-melody-recall':
        sequenceLength =
          activeDifficulty === 'Gentle' ? 3 : activeDifficulty === 'Moderate' ? 4 : 5;
        memorizationDelayMs =
          activeDifficulty === 'Gentle' ? 950 : activeDifficulty === 'Moderate' ? 720 : 550;
        break;

      case 'game-math-sprint':
        itemCount =
          activeDifficulty === 'Gentle' ? 4 : activeDifficulty === 'Moderate' ? 5 : 6;
        choiceCount = activeDifficulty === 'Gentle' ? 3 : 4;
        break;

      default:
        break;
    }

    return {
      gameId,
      difficulty: activeDifficulty,
      pacing: activePacing,
      tier: clampedTier,
      itemCount,
      sequenceLength,
      choiceCount,
      distractorCount,
      gridSize,
      memorizationDelayMs,
      timeAllowanceMultiplier,
      assistiveHintsEnabled,
      highClarityMode,
      rationale: profile.adaptationRationale,
    };
  }

  /**
   * Patient-progress-based PER-GAME adaptive evaluation engine with configurable thresholds,
   * incomplete/interrupted neutrality, single-poor-session protection, hint reliance awareness,
   * reversal cooldown hysteresis, and full audit output for Caregiver & Doctor dashboards.
   */
  public static evaluateGameSession(
    patientId: string,
    metrics: SessionEvaluationMetrics,
    rollingHistory: GameSessionRecord[] = [],
    config: AdaptiveDifficultyConfig = DEFAULT_ADAPTIVE_CONFIG
  ): AdaptiveSessionEvaluationOutcome {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const gameId = metrics.gameId || 'game-matching';
    const current = this.getGameProfile(effectiveId, gameId);
    const meta = this.getGameMetadata(effectiveId, gameId);
    const normalizedAccuracy = this.resolveNormalizedAccuracy(metrics);
    const completionStatus: CompletionStatus = metrics.isInterrupted
      ? 'interrupted'
      : metrics.completionStatus
      ? metrics.completionStatus
      : metrics.completed
      ? 'completed'
      : 'incomplete';

    // Deduplication guard: identical sessionId must never be evaluated twice
    if (metrics.sessionId) {
      const alreadyEvaluated =
        current.lastEvaluatedSessionId === metrics.sessionId ||
        (current.evaluatedSessionIds && current.evaluatedSessionIds.includes(metrics.sessionId));
      if (alreadyEvaluated) {
        return {
          profile: current,
          metadata: meta,
          adaptedParams: this.getAdaptedGameParameters(effectiveId, gameId, undefined, rollingHistory),
          difficultyBefore: current.currentDifficulty,
          difficultyAfter: current.currentDifficulty,
          difficultyAdjustment: 'unchanged',
          adjustmentReason: current.adaptationRationale,
          completionStatus,
          normalizedAccuracy,
        };
      }
    }

    const sessionId =
      metrics.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nextEvaluatedSessionIds = Array.from(
      new Set([sessionId, ...(current.evaluatedSessionIds || [])])
    ).slice(0, 30);

    const { wantsEasier, wantsChallenge, wantsBreak } = this.parseFeedbackSignals(
      metrics.patientFeedback
    );
    const hintsUsed = metrics.hintsUsedCount ?? 0;
    const mistakesCount =
      metrics.mistakesCount ?? metrics.incorrectAnswers ?? 0;

    const difficultyBefore = metrics.difficultyAtPlay || current.currentDifficulty;
    let nextDifficulty: GameDifficulty = current.currentDifficulty;
    let nextPacing: GamePacing = PACING_BY_DIFFICULTY[nextDifficulty];
    let nextComfortableCount = current.consecutiveComfortableSessions;
    let nextStruggleCount = current.consecutiveStruggleSessions;
    let nextTier = meta.tier;
    let nextReversalCooldown = meta.reversalCooldownRemaining;
    let nextAssistiveHints = meta.assistiveHintsEnabled;
    let nextHighClarity = meta.highClarityMode;
    let adjustment: DifficultyAdjustmentDirection = 'unchanged';
    let rationale = current.adaptationRationale;

    // 1. Explicit patient comfort request always takes gentle priority
    if (wantsEasier) {
      nextDifficulty = this.stepDifficultyDown(current.currentDifficulty);
      nextPacing = PACING_BY_DIFFICULTY[nextDifficulty];
      nextComfortableCount = 0;
      nextStruggleCount = current.consecutiveStruggleSessions + 1;
      nextTier = Math.max(0, BASE_TIER_BY_DIFFICULTY[nextDifficulty] - 1);
      nextAssistiveHints = true;
      nextHighClarity = true;
      if (nextDifficulty !== current.currentDifficulty) {
        adjustment = 'decreased';
        nextReversalCooldown = config.cooldownSessionsAfterAdjustment;
        rationale = `Patient asked for an easier pace — gently adjusted to ${nextDifficulty} with supportive hints.`;
      } else {
        nextReversalCooldown = config.cooldownSessionsAfterAdjustment;
        rationale =
          'Staying in Gentle comfort mode with extra visual clarity and reassuring hints available.';
      }
    } else if (!metrics.completed || completionStatus !== 'completed') {
      // 2. Incomplete / interrupted session rule: NEVER penalize or treat as cognitive struggle!
      // Preserve consecutive counts safely and keep difficulty unchanged.
      rationale =
        completionStatus === 'interrupted'
          ? 'Session interrupted — your current comfort level stays steady without any penalty.'
          : 'Paused before finishing — your comfortable pace is saved and ready whenever you return.';
    } else {
      // 3. Completed session evaluation
      const accuracyMeetsComfort =
        normalizedAccuracy === undefined || normalizedAccuracy >= config.comfortAccuracyMin;
      const mistakesWithinComfort = mistakesCount <= config.maxComfortMistakes;
      const frequentHintsUsed = hintsUsed > config.maxComfortHints;
      const explicitStruggleSignals =
        (normalizedAccuracy !== undefined && normalizedAccuracy < config.struggleAccuracyMax) ||
        mistakesCount >= config.struggleMistakesMin;

      if (explicitStruggleSignals) {
        nextStruggleCount += 1;
        nextComfortableCount = 0;
        nextAssistiveHints = true;
        nextHighClarity = true;

        // Single poor session protection: do NOT drop difficulty harshly after 1 tough round
        if (nextStruggleCount >= config.sessionsToDecrease) {
          const stepped = this.stepDifficultyDown(current.currentDifficulty);
          if (stepped !== current.currentDifficulty) {
            nextDifficulty = stepped;
            nextPacing = PACING_BY_DIFFICULTY[nextDifficulty];
            nextTier = BASE_TIER_BY_DIFFICULTY[nextDifficulty];
            nextStruggleCount = 0;
            nextReversalCooldown = config.cooldownSessionsAfterAdjustment;
            adjustment = 'decreased';
            rationale = `Consistent extra effort noticed across ${config.sessionsToDecrease} sessions — gently stepping to ${nextDifficulty} with clearer cues.`;
          } else {
            nextTier = 0;
            rationale =
              'Keeping Gentle mode extra supportive with slower pacing and clear helpful cues.';
          }
        } else {
          // Stay at current difficulty for now, gently lower sub-tier/enable hints for next round
          nextTier = Math.max(0, nextTier - 1);
          rationale = `Took a little extra time on this round — keeping ${current.currentDifficulty} steady while adding gentler hints for next time.`;
        }
      } else if (frequentHintsUsed) {
        // Frequent hint reliance prevents premature step-up without punitive downgrade
        nextStruggleCount = 0;
        nextAssistiveHints = true;
        nextHighClarity = true;
        rationale = `Completed smoothly with ${hintsUsed} helpful hints — keeping ${current.currentDifficulty} steady with supportive cues.`;
      } else if (accuracyMeetsComfort && mistakesWithinComfort && !wantsBreak) {
        nextStruggleCount = 0;

        if (nextReversalCooldown > 0) {
          nextReversalCooldown -= 1;
          rationale = `Settling comfortably at ${current.currentDifficulty} after recent adjustment before considering further progression.`;
        } else {
          nextComfortableCount += 1;

          // Filter rolling history specifically for this gameId so different games remain independent
          const recentGameSessions = rollingHistory
            .filter((s) => s.gameId === gameId && s.id !== sessionId)
            .slice(0, 3);
          const hasRecentStruggle = recentGameSessions.some(
            (s) =>
              s.completed &&
              ((typeof s.accuracy === 'number' && s.accuracy < config.struggleAccuracyMax) ||
                (typeof s.mistakesCount === 'number' && s.mistakesCount >= config.struggleMistakesMin))
          );

          if (
            nextComfortableCount >= config.sessionsToIncrease &&
            !hasRecentStruggle &&
            current.currentDifficulty !== 'Stimulating'
          ) {
            nextDifficulty = this.stepDifficultyUp(current.currentDifficulty);
            nextPacing = PACING_BY_DIFFICULTY[nextDifficulty];
            nextComfortableCount = 0;
            nextTier = BASE_TIER_BY_DIFFICULTY[nextDifficulty];
            nextAssistiveHints = false;
            nextHighClarity = false;
            adjustment = 'increased';
            rationale = wantsChallenge
              ? `Patient feedback and ${config.sessionsToIncrease} smooth sessions observed — gently progressing to ${nextDifficulty}.`
              : `Completed ${config.sessionsToIncrease} comfortable sessions smoothly — gently stepping up to ${nextDifficulty}.`;
          } else if (current.currentDifficulty === 'Stimulating') {
            nextTier = 4;
            nextAssistiveHints = false;
            rationale = 'Maintaining confident rhythm at Stimulating pace.';
          } else {
            // Subtle positive tier refinement inside current level before full difficulty step-up
            if (current.currentDifficulty === 'Gentle') nextTier = 1;
            if (current.currentDifficulty === 'Moderate' && nextComfortableCount >= 2) {
              nextTier = 3;
            }
            rationale = wantsChallenge
              ? `Comfortable session recorded (${nextComfortableCount}/${config.sessionsToIncrease} toward gradual progression). Noted interest in more challenge.`
              : `Comfortable session recorded (${nextComfortableCount}/${config.sessionsToIncrease} toward gentle progression).`;
          }
        }
      } else {
        // Mixed/moderate completed performance (e.g. ~60-79% accuracy or 2 mistakes): hold steady calmly
        nextStruggleCount = 0;
        if (normalizedAccuracy !== undefined && normalizedAccuracy < 0.7) {
          nextAssistiveHints = true;
          nextHighClarity = true;
        }
        rationale = `Balanced session completed — maintaining ${current.currentDifficulty} pace comfortably.`;
      }
    }

    const nowIso = new Date().toISOString();
    const adjustmentRecord: AdaptiveAdjustmentRecord = {
      sessionId,
      gameId,
      gameTitle: metrics.gameTitle || gameId,
      timestamp: nowIso,
      difficultyBefore,
      difficultyAfter: nextDifficulty,
      adjustment,
      reason: rationale,
      accuracyPercent:
        normalizedAccuracy !== undefined ? Math.round(normalizedAccuracy * 100) : undefined,
      hintsUsed,
      completionStatus,
    };

    const nextMeta: AdaptiveGameMetadata = {
      gameId,
      tier: Math.max(0, Math.min(4, nextTier)),
      reversalCooldownRemaining: Math.max(0, nextReversalCooldown),
      assistiveHintsEnabled: nextAssistiveHints,
      highClarityMode: nextHighClarity,
      recentAdjustments: [adjustmentRecord, ...meta.recentAdjustments].slice(0, 20),
    };
    this.saveGameMetadata(effectiveId, gameId, nextMeta);

    const isGuest = isGuestPatient(effectiveId);
    const online = this.isOnline();
    const initialSyncStatus: AdaptiveSyncStatus = isGuest
      ? 'local-only'
      : !online
      ? 'offline-pending'
      : 'syncing';

    const updatedProfile: AdaptiveProfile = {
      patientId: effectiveId,
      currentDifficulty: nextDifficulty,
      pacing: nextPacing,
      consecutiveComfortableSessions: nextComfortableCount,
      consecutiveStruggleSessions: nextStruggleCount,
      lastSessionEvaluated: nowIso,
      lastEvaluatedSessionId: sessionId,
      evaluatedSessionIds: nextEvaluatedSessionIds,
      syncStatus: initialSyncStatus,
      adaptationRationale: rationale,
      updatedAt: nowIso,
    };

    const cacheKey = this.getGameCacheKey(effectiveId, gameId);
    this.inMemoryGameProfiles[cacheKey] = updatedProfile;
    this.safeSetItem(
      this.getGameProfileStorageKey(effectiveId, gameId),
      JSON.stringify(updatedProfile)
    );

    if (!isGuest) {
      if (!online) {
        this.safeSetItem(
          this.getPendingGameSyncKey(effectiveId, gameId),
          JSON.stringify(updatedProfile)
        );
      } else if (isFirebaseConfigured) {
        const profileRef = doc(
          db,
          'users',
          effectiveId,
          'adaptiveProfiles',
          this.getGameDocId(gameId)
        );
        const sanitized = this.sanitizeForFirestore({
          ...updatedProfile,
          syncStatus: 'synced',
        });
        setDoc(profileRef, sanitized, { merge: true })
          .then(() => {
            this.safeRemoveItem(this.getPendingGameSyncKey(effectiveId, gameId));
            const synced: AdaptiveProfile = { ...updatedProfile, syncStatus: 'synced' };
            this.inMemoryGameProfiles[cacheKey] = synced;
            this.safeSetItem(
              this.getGameProfileStorageKey(effectiveId, gameId),
              JSON.stringify(synced)
            );
          })
          .catch((err) => {
            console.warn(`[AdaptiveDifficultyService] Async game save failed (${gameId}):`, err);
            const failed: AdaptiveProfile = { ...updatedProfile, syncStatus: 'sync-failed' };
            this.inMemoryGameProfiles[cacheKey] = failed;
            this.safeSetItem(
              this.getGameProfileStorageKey(effectiveId, gameId),
              JSON.stringify(failed)
            );
            this.safeSetItem(
              this.getPendingGameSyncKey(effectiveId, gameId),
              JSON.stringify(failed)
            );
          });
      }
    }

    const adaptedParams = this.getAdaptedGameParameters(
      effectiveId,
      gameId,
      nextDifficulty,
      rollingHistory
    );

    return {
      profile: updatedProfile,
      metadata: nextMeta,
      adaptedParams,
      difficultyBefore,
      difficultyAfter: nextDifficulty,
      difficultyAdjustment: adjustment,
      adjustmentReason: rationale,
      completionStatus,
      normalizedAccuracy,
    };
  }

  /**
   * Build per-game progression summaries across all recorded sessions for Caregiver & Doctor dashboards.
   */
  public static buildPerGameSummaries(
    patientId: string,
    sessions: GameSessionRecord[],
    catalogLookup: Record<string, { title: string; category: GameSessionRecord['category'] }> = {}
  ): GameProgressSummary[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const grouped: Record<string, GameSessionRecord[]> = {};

    for (const s of sessions) {
      if (!s.gameId) continue;
      if (!grouped[s.gameId]) grouped[s.gameId] = [];
      grouped[s.gameId].push(s);
    }

    return Object.entries(grouped)
      .map(([gameId, gameSessions]) => {
        const sorted = [...gameSessions].sort((a, b) => {
          const da = `${a.date || ''} ${a.completedAt || ''}`;
          const dbStr = `${b.date || ''} ${b.completedAt || ''}`;
          return dbStr.localeCompare(da);
        });

        const latest = sorted[0];
        const profile = this.getGameProfile(effectiveId, gameId);
        const meta = this.getGameMetadata(effectiveId, gameId);
        const completed = sorted.filter((s) => s.completed);
        const incomplete = sorted.filter((s) => !s.completed);

        const accuracies = completed
          .map((s) =>
            typeof s.accuracy === 'number'
              ? Math.round(s.accuracy * 100)
              : typeof s.score === 'number'
              ? Math.round(s.score)
              : null
          )
          .filter((v): v is number => v !== null);

        const scores = completed
          .map((s) => (typeof s.score === 'number' ? s.score : null))
          .filter((v): v is number => v !== null);

        const totalHintsUsed = sorted.reduce((sum, s) => sum + (s.hintsUsed || 0), 0);

        const currentDifficulty: GameDifficulty =
          latest?.difficultyAfter || profile.currentDifficulty || latest?.difficulty || 'Gentle';

        let recentTrend: GameProgressSummary['recentTrend'] = 'steady';
        if (sorted.some((s) => s.difficultyAdjustment === 'increased')) {
          recentTrend = 'improving';
        } else if (
          sorted.slice(0, 2).some((s) => s.difficultyAdjustment === 'decreased') ||
          profile.consecutiveStruggleSessions >= 1
        ) {
          recentTrend = 'needs-gentle-support';
        } else if (sorted.length === 0) {
          recentTrend = 'new';
        }

        const adjustmentSource = sorted.find(
          (s) => s.difficultyBefore || s.difficultyAfter || s.adjustmentReason
        );
        const lastAdjustment: AdaptiveAdjustmentRecord | undefined = adjustmentSource
          ? {
              sessionId: adjustmentSource.id,
              gameId,
              gameTitle: adjustmentSource.gameTitle || catalogLookup[gameId]?.title || gameId,
              timestamp: adjustmentSource.date,
              difficultyBefore: adjustmentSource.difficultyBefore || adjustmentSource.difficulty,
              difficultyAfter:
                adjustmentSource.difficultyAfter || adjustmentSource.difficulty,
              adjustment: adjustmentSource.difficultyAdjustment || 'unchanged',
              reason:
                adjustmentSource.adjustmentReason ||
                `Completed at ${adjustmentSource.difficulty} pace`,
              accuracyPercent:
                typeof adjustmentSource.accuracy === 'number'
                  ? Math.round(adjustmentSource.accuracy * 100)
                  : undefined,
              hintsUsed: adjustmentSource.hintsUsed || 0,
              completionStatus:
                adjustmentSource.completionStatus ||
                (adjustmentSource.completed ? 'completed' : 'incomplete'),
            }
          : meta.recentAdjustments[0];

        return {
          gameId,
          gameTitle: latest?.gameTitle || catalogLookup[gameId]?.title || gameId,
          category: latest?.category || catalogLookup[gameId]?.category || 'memory',
          currentDifficulty,
          currentTier: meta.tier,
          totalSessions: sorted.length,
          completedSessions: completed.length,
          incompleteSessions: incomplete.length,
          averageAccuracyPercent:
            accuracies.length > 0
              ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
              : null,
          averageScore:
            scores.length > 0
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : null,
          totalHintsUsed,
          lastPlayedDate: latest?.date,
          recentTrend,
          lastAdjustment,
        };
      })
      .sort((a, b) => (b.lastPlayedDate || '').localeCompare(a.lastPlayedDate || ''));
  }

  /**
   * Core multi-session rolling evaluation algorithm (global aggregate fallback profile).
   * Preserves existing Milestone 4 / 4.2 contracts cleanly.
   */
  public static evaluateSession(
    patientId: string,
    metrics: SessionEvaluationMetrics,
    rollingHistory: GameSessionRecord[] = []
  ): AdaptiveProfile {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getProfile(effectiveId);

    if (metrics.sessionId) {
      const alreadyEvaluated =
        current.lastEvaluatedSessionId === metrics.sessionId ||
        (current.evaluatedSessionIds && current.evaluatedSessionIds.includes(metrics.sessionId));

      if (alreadyEvaluated) {
        return current;
      }
    }

    const sessionId =
      metrics.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nextEvaluatedSessionIds = Array.from(
      new Set([sessionId, ...(current.evaluatedSessionIds || [])])
    ).slice(0, 30);

    const { wantsEasier, wantsChallenge, wantsBreak } = this.parseFeedbackSignals(
      metrics.patientFeedback
    );

    const feltComfortable =
      metrics.completed &&
      !wantsEasier &&
      !wantsBreak &&
      (metrics.mistakesCount === undefined || metrics.mistakesCount <= 1) &&
      (metrics.accuracy === undefined || metrics.accuracy >= 0.75);

    const isStruggling =
      wantsEasier ||
      (!metrics.completed && metrics.durationSeconds > 60 && (metrics.pauseCount || 0) === 0) ||
      (metrics.mistakesCount !== undefined && metrics.mistakesCount >= 3) ||
      (metrics.accuracy !== undefined && metrics.accuracy < 0.5);

    let nextDifficulty: GameDifficulty = current.currentDifficulty;
    let nextPacing: GamePacing = current.pacing;
    let nextComfortableCount = current.consecutiveComfortableSessions;
    let nextStruggleCount = current.consecutiveStruggleSessions;
    let rationale = current.adaptationRationale;

    if (isStruggling) {
      nextStruggleCount += 1;
      nextComfortableCount = 0;

      if (current.currentDifficulty === 'Stimulating') {
        nextDifficulty = 'Moderate';
        nextPacing = 'balanced';
        rationale = 'Adjusted to Moderate to keep activities comfortable and peaceful.';
      } else {
        nextDifficulty = 'Gentle';
        nextPacing = 'calm';
        rationale = 'Reset to Gentle pace to provide ample time and reassuring ease.';
      }
    } else if (feltComfortable) {
      nextComfortableCount += 1;
      nextStruggleCount = 0;

      const recentSessions = rollingHistory.slice(0, 4);
      const allRecentCompleted =
        recentSessions.length === 0 || recentSessions.every((s) => s.completed);

      if (nextComfortableCount >= 3 && allRecentCompleted) {
        if (current.currentDifficulty === 'Gentle') {
          nextDifficulty = 'Moderate';
          nextPacing = 'balanced';
          rationale = wantsChallenge
            ? 'Patient feedback and 3 comfortable sessions observed. Stepping gently to Moderate.'
            : 'You have enjoyed 3 peaceful sessions comfortably! Stepping gently to Moderate.';
          nextComfortableCount = 0;
        } else if (current.currentDifficulty === 'Moderate') {
          nextDifficulty = 'Stimulating';
          nextPacing = 'agile';
          rationale = wantsChallenge
            ? 'Patient feedback and 3 comfortable sessions observed. Gently offering Stimulating exploration.'
            : 'Consistently comfortable sessions observed across 3 activities. Gently offering Stimulating exploration.';
          nextComfortableCount = 0;
        } else {
          rationale = 'Maintaining comfortable rhythm at your current level.';
        }
      } else {
        rationale = wantsChallenge
          ? `Comfortable session recorded (${nextComfortableCount}/3 toward gradual progression). Marked desire for challenge.`
          : `Comfortable session recorded (${nextComfortableCount}/3 toward gradual progression).`;
      }
    } else {
      rationale = 'Maintained current soothing pace.';
    }

    const isGuest = isGuestPatient(effectiveId);
    const online = this.isOnline();
    const initialSyncStatus: AdaptiveSyncStatus = isGuest
      ? 'local-only'
      : !online
      ? 'offline-pending'
      : 'syncing';

    const updatedProfile: AdaptiveProfile = {
      patientId: effectiveId,
      currentDifficulty: nextDifficulty,
      pacing: nextPacing,
      consecutiveComfortableSessions: nextComfortableCount,
      consecutiveStruggleSessions: nextStruggleCount,
      lastSessionEvaluated: new Date().toISOString(),
      lastEvaluatedSessionId: sessionId,
      evaluatedSessionIds: nextEvaluatedSessionIds,
      syncStatus: initialSyncStatus,
      adaptationRationale: rationale,
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryProfiles[effectiveId] = updatedProfile;
    this.safeSetItem(this.getProfileKey(effectiveId), JSON.stringify(updatedProfile));
    this.safeSetItem(`saksham_game_difficulty_pref_${effectiveId}`, nextDifficulty);
    this.safeSetItem(`saksham_game_pacing_${effectiveId}`, nextPacing);

    if (isGuest) {
      return updatedProfile;
    }

    if (!online) {
      this.safeSetItem(this.getPendingSyncKey(effectiveId), JSON.stringify(updatedProfile));
      return updatedProfile;
    }

    if (isFirebaseConfigured) {
      const profileRef = doc(db, 'users', effectiveId, 'adaptiveProfiles', 'mindGames');
      const sanitized = this.sanitizeForFirestore({ ...updatedProfile, syncStatus: 'synced' });
      setDoc(profileRef, sanitized, { merge: true })
        .then(() => {
          this.safeRemoveItem(this.getPendingSyncKey(effectiveId));
          const syncedProfile: AdaptiveProfile = {
            ...updatedProfile,
            syncStatus: 'synced',
          };
          this.inMemoryProfiles[effectiveId] = syncedProfile;
          this.safeSetItem(this.getProfileKey(effectiveId), JSON.stringify(syncedProfile));
        })
        .catch((err) => {
          console.warn('[AdaptiveDifficultyService] Async cloud save failed:', err);
          const failedProfile: AdaptiveProfile = {
            ...updatedProfile,
            syncStatus: 'sync-failed',
          };
          this.inMemoryProfiles[effectiveId] = failedProfile;
          this.safeSetItem(this.getProfileKey(effectiveId), JSON.stringify(failedProfile));
          this.safeSetItem(this.getPendingSyncKey(effectiveId), JSON.stringify(failedProfile));
        });
    }

    return updatedProfile;
  }

  /**
   * Purge in-memory cached profiles without wiping patient's offline sync queues.
   */
  public static clearMemoryCache(patientId: string): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    delete this.inMemoryProfiles[effectiveId];
    for (const key of Object.keys(this.inMemoryGameProfiles)) {
      if (key.startsWith(`${effectiveId}::`)) {
        delete this.inMemoryGameProfiles[key];
      }
    }
    for (const key of Object.keys(this.inMemoryGameMeta)) {
      if (key.startsWith(`${effectiveId}::`)) {
        delete this.inMemoryGameMeta[key];
      }
    }
  }

  /**
   * Reset all adaptive profiles for a patient
   */
  public static resetProfile(patientId: string): AdaptiveProfile {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    this.clearMemoryCache(effectiveId);
    const def = this.getDefaultProfile(effectiveId);
    this.inMemoryProfiles[effectiveId] = def;
    const key = this.getProfileKey(effectiveId);
    this.safeSetItem(key, JSON.stringify(def));
    this.safeSetItem(`saksham_game_difficulty_pref_${effectiveId}`, def.currentDifficulty);
    this.safeSetItem(`saksham_game_pacing_${effectiveId}`, def.pacing);
    this.safeRemoveItem(this.getPendingSyncKey(effectiveId));

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const toDelete: string[] = [];
        const profPrefix = `saksham_adaptive_profile_${effectiveId}__`;
        const metaPrefix = `saksham_adaptive_meta_${effectiveId}__`;
        const pendPrefix = `saksham_pending_game_adaptive_sync_${effectiveId}__`;
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && (k.startsWith(profPrefix) || k.startsWith(metaPrefix) || k.startsWith(pendPrefix))) {
            toDelete.push(k);
          }
        }
        toDelete.forEach((k) => window.localStorage.removeItem(k));
      }
    } catch {
      // Storage unavailable
    }

    return def;
  }
}
