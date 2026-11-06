import { RoutineItem, LovedOne, GameSessionRecord } from '../../../types/index.js';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { isGuestPatient } from './identityService.js';

export interface MigrationSummary {
  module: 'routines' | 'lovedOnes' | 'games';
  totalFound: number;
  migrated: number;
  skipped: number;
  failed: number;
}

export interface MigrationReport {
  patientId: string;
  timestamp: string;
  success: boolean;
  modules: MigrationSummary[];
  errors: string[];
}

export class MigrationService {
  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage unavailable
    }
    return null;
  }

  private static safeSetItem(key: string, val: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch {
      // Storage unavailable
    }
  }

  /**
   * Safe migration of legacy localStorage records to Cloud Firestore.
   * Strictly verifies patient ownership and avoids overwriting newer cloud records.
   */
  public static async migrateUserData(patientId: string): Promise<MigrationReport> {
    const report: MigrationReport = {
      patientId,
      timestamp: new Date().toISOString(),
      success: true,
      modules: [],
      errors: [],
    };

    // 1. Never migrate guest data into Firestore
    if (isGuestPatient(patientId)) {
      report.errors.push('Guest accounts cannot be migrated to Cloud Firestore.');
      report.success = false;
      return report;
    }

    if (!isFirebaseConfigured) {
      report.errors.push('Firebase is not configured; migration aborted.');
      report.success = false;
      return report;
    }

    const migrationStatusKey = `saksham_migrated_${patientId}`;
    if (this.safeGetItem(migrationStatusKey) === 'true') {
      // Already successfully migrated previously
      return report;
    }

    // --- Module 1: Routines Migration ---
    const routinesSummary: MigrationSummary = { module: 'routines', totalFound: 0, migrated: 0, skipped: 0, failed: 0 };
    try {
      const legacyRaw = this.safeGetItem(`saksham_routines_${patientId}`);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed)) {
          routinesSummary.totalFound = parsed.length;
          for (const item of parsed as RoutineItem[]) {
            if (!item || !item.id || !item.title) {
              routinesSummary.failed++;
              continue;
            }
            const docId = item.id.startsWith(patientId) ? item.id : `${patientId}_${item.id}`;
            const docRef = doc(db, 'routines', docId);
            const existingSnap = await getDoc(docRef);

            if (!existingSnap.exists()) {
              await setDoc(docRef, {
                ...item,
                id: docId,
                patientId,
                migratedFromLocal: true,
                updatedAt: new Date().toISOString(),
              });
              routinesSummary.migrated++;
            } else {
              // Cloud doc exists: do not overwrite newer remote record
              routinesSummary.skipped++;
            }
          }
        }
      }
    } catch (e: any) {
      routinesSummary.failed++;
      report.errors.push(`Routines migration error: ${e.message}`);
    }
    report.modules.push(routinesSummary);

    // --- Module 2: Loved Ones Migration ---
    const lovedOnesSummary: MigrationSummary = { module: 'lovedOnes', totalFound: 0, migrated: 0, skipped: 0, failed: 0 };
    try {
      const legacyRaw = this.safeGetItem(`saksham_loved_ones_${patientId}`);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed)) {
          lovedOnesSummary.totalFound = parsed.length;
          for (const item of parsed as LovedOne[]) {
            if (!item || !item.id || !item.name) {
              lovedOnesSummary.failed++;
              continue;
            }
            const docId = item.id.startsWith(patientId) ? item.id : `${patientId}_${item.id}`;
            const docRef = doc(db, 'lovedOnes', docId);
            const existingSnap = await getDoc(docRef);

            if (!existingSnap.exists()) {
              await setDoc(docRef, {
                ...item,
                id: docId,
                patientId,
                migratedFromLocal: true,
                updatedAt: new Date().toISOString(),
              });
              lovedOnesSummary.migrated++;
            } else {
              lovedOnesSummary.skipped++;
            }
          }
        }
      }
    } catch (e: any) {
      lovedOnesSummary.failed++;
      report.errors.push(`LovedOnes migration error: ${e.message}`);
    }
    report.modules.push(lovedOnesSummary);

    // --- Module 3: Game Sessions Migration ---
    const gamesSummary: MigrationSummary = { module: 'games', totalFound: 0, migrated: 0, skipped: 0, failed: 0 };
    try {
      const legacyRaw = this.safeGetItem(`saksham_game_sessions_${patientId}`);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed)) {
          gamesSummary.totalFound = parsed.length;
          for (const session of parsed as GameSessionRecord[]) {
            if (!session || !session.id || !session.gameId) {
              gamesSummary.failed++;
              continue;
            }
            const docRef = doc(db, 'gameSessions', session.id);
            const existingSnap = await getDoc(docRef);

            if (!existingSnap.exists()) {
              await setDoc(docRef, {
                ...session,
                patientId,
                migratedFromLocal: true,
                createdAt: session.date || new Date().toISOString(),
              });
              gamesSummary.migrated++;
            } else {
              gamesSummary.skipped++;
            }
          }
        }
      }
    } catch (e: any) {
      gamesSummary.failed++;
      report.errors.push(`Games migration error: ${e.message}`);
    }
    report.modules.push(gamesSummary);

    // Mark as migrated if no critical error occurred
    if (report.errors.length === 0) {
      this.safeSetItem(migrationStatusKey, 'true');
    } else {
      report.success = false;
    }

    return report;
  }
}
