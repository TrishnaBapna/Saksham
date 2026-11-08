/**
 * Saksham Voice Storage Service (Local-Only IndexedDB Foundation)
 * Milestone 6.1: Zero Firebase Storage consumption, 100% Spark Free-Tier Compliant
 *
 * Audio recordings remain strictly inside the patient's device IndexedDB database.
 * No audio blobs are ever transmitted to Firebase Cloud Storage.
 */

const DB_NAME = 'saksham_local_audio_db';
const STORE_NAME = 'audio_blobs';
const DB_VERSION = 1;

export class VoiceStorageService {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Open or initialize the client-side IndexedDB audio store
   */
  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment'));
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB audio store'));
      };
    });

    return this.dbPromise;
  }

  /**
   * Save an audio blob locally in IndexedDB under a unique key
   */
  public static async saveAudioBlob(
    audioKey: string,
    blob: Blob,
    metadata?: { durationSeconds?: number; mimeType?: string }
  ): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise<boolean>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record = {
          key: audioKey,
          blob,
          mimeType: metadata?.mimeType || blob.type || 'audio/webm',
          durationSeconds: metadata?.durationSeconds || 0,
          savedAt: new Date().toISOString(),
        };

        const req = store.put(record);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[VoiceStorageService] Could not save audio blob locally:', err);
      return false;
    }
  }

  /**
   * Retrieve an audio blob from local IndexedDB
   */
  public static async getAudioBlob(audioKey: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      return new Promise<Blob | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(audioKey);

        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            resolve(req.result.blob as Blob);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  /**
   * Delete an audio blob from local IndexedDB when the note is deleted
   */
  public static async deleteAudioBlob(audioKey: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise<boolean>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(audioKey);

        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return false;
    }
  }

  /**
   * Generate unique scoped key for audio storage
   */
  public static generateAudioKey(patientId: string, noteId: string): string {
    return `voice_note_${patientId}_${noteId}_${Date.now()}`;
  }
}
