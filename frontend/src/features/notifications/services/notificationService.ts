/**
 * SAKSHAM — STAGE 3 PHASE C: IN-APP NOTIFICATION SERVICE
 * Privacy-first notification engine for patient choice and caregiver transparency.
 * 100% Spark Free Plan compliant — zero paid APIs, zero FCM, zero external push SDKs.
 */

import { InAppNotification, InAppNotificationType } from '../types/notification.types.js';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import { doc, setDoc, getDocs, collection, query, onSnapshot } from 'firebase/firestore';
import {
  getEffectivePatientId,
  shouldUseLocalDemoSandboxOnly,
} from '../../auth/services/identityService.js';

type NotificationListener = (notifications: InAppNotification[]) => void;

export class NotificationService {
  private static inMemoryStore: Record<string, InAppNotification[]> = {};
  private static listeners: Set<NotificationListener> = new Set();

  private static getStorageKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_notifications_${effectiveId}`;
  }

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

  private static safeSetItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
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

  public static subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifySubscribers(patientId: string): void {
    const notifications = this.getNotifications(patientId);
    this.listeners.forEach((listener) => {
      try {
        listener(notifications);
      } catch (err) {
        console.warn('[NotificationService] Listener error:', err);
      }
    });
  }

  /**
   * Resets in-memory cache (for test teardown and sign out)
   */
  public static clearCache(patientId?: string): void {
    if (patientId) {
      const effectiveId = getEffectivePatientId({ uid: patientId });
      delete this.inMemoryStore[effectiveId];
    } else {
      this.inMemoryStore = {};
    }
  }

  /**
   * Retrieves all notifications for a patient, optionally filtered by recipient role.
   */
  public static getNotifications(
    patientId: string,
    role?: 'patient' | 'caregiver' | 'doctor'
  ): InAppNotification[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    let list: InAppNotification[] = this.inMemoryStore[effectiveId] || [];

    if (list.length === 0) {
      const stored = this.safeGetItem(this.getStorageKey(effectiveId));
      if (stored) {
        try {
          list = JSON.parse(stored);
          this.inMemoryStore[effectiveId] = list;
        } catch {
          list = [];
        }
      }
    }

    const activeList = list.filter((n) => !n.dismissed);

    if (role) {
      return activeList.filter((n) => n.recipientRole === role || n.recipientRole === 'all');
    }
    return activeList;
  }

  /**
   * Returns count of unread notifications for a patient and role.
   */
  public static getUnreadCount(
    patientId: string,
    role?: 'patient' | 'caregiver' | 'doctor'
  ): number {
    return this.getNotifications(patientId, role).filter((n) => !n.read && !n.dismissed).length;
  }

  /**
   * Creates and persists an in-app notification with optional deduplication bypass for routine & safety alerts.
   */
  public static async createNotification(params: {
    patientId: string;
    recipientRole: 'patient' | 'caregiver' | 'doctor' | 'all';
    type: InAppNotificationType;
    title: string;
    message: string;
    activityId?: string;
    activityTitle?: string;
    proposalId?: string;
    actionUrl?: string;
    senderUid?: string;
    senderName?: string;
    senderRole?: 'patient' | 'caregiver' | 'doctor';
    i18nKey?: string;
    i18nParams?: Record<string, string | number>;
    bypassDedup?: boolean;
  }): Promise<InAppNotification> {
    const effectiveId = getEffectivePatientId({ uid: params.patientId });
    const current = this.inMemoryStore[effectiveId] || this.getNotifications(effectiveId);

    // Strict deduplication for recurring proposals unless bypassDedup is specified
    if (!params.bypassDedup) {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const isDuplicate = current.some((n) => {
        const isSameType = n.type === params.type;
        const isSameProposal = params.proposalId ? n.proposalId === params.proposalId : true;
        const isSameActivity = params.activityId ? n.activityId === params.activityId : true;
        const isRecent = new Date(n.createdAt).getTime() > oneDayAgo;
        return !n.dismissed && isSameType && isSameProposal && isSameActivity && isRecent;
      });

      if (isDuplicate) {
        const existing = current.find(
          (n) => !n.dismissed && n.type === params.type && n.proposalId === params.proposalId
        );
        if (existing) return existing;
      }
    }

    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const notification: InAppNotification = {
      id,
      patientId: effectiveId,
      recipientRole: params.recipientRole,
      type: params.type,
      title: params.title,
      message: params.message,
      activityId: params.activityId,
      activityTitle: params.activityTitle,
      proposalId: params.proposalId,
      senderUid: params.senderUid,
      senderName: params.senderName,
      senderRole: params.senderRole,
      i18nKey: params.i18nKey,
      i18nParams: params.i18nParams,
      actionUrl: params.actionUrl,
      read: false,
      dismissed: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [notification, ...current];
    this.inMemoryStore[effectiveId] = updated;
    this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(updated));

    // Firestore synchronization (Spark free compliant)
    if (isFirebaseConfigured && !shouldUseLocalDemoSandboxOnly(effectiveId) && this.isOnline()) {
      try {
        const docRef = doc(db, 'users', effectiveId, 'notifications', notification.id);
        await setDoc(docRef, notification, { merge: true });
      } catch (err) {
        console.warn('[NotificationService] Firestore sync warning:', err);
      }
    }

    this.notifySubscribers(effectiveId);
    return notification;
  }

  /**
   * Dismisses a notification via immutable update (audit retention compliant).
   */
  public static async dismissNotification(patientId: string, notificationId: string): Promise<boolean> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const rawList = this.inMemoryStore[effectiveId] || [];
    const current = rawList.length > 0 ? rawList : this.getNotifications(effectiveId);
    const index = current.findIndex((n) => n.id === notificationId);
    if (index === -1) return false;

    const now = new Date().toISOString();
    const updated = [...current];
    updated[index] = {
      ...updated[index],
      read: true,
      dismissed: true,
      readAt: updated[index].readAt || now,
      dismissedAt: now,
    };

    this.inMemoryStore[effectiveId] = updated;
    this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(updated));

    if (isFirebaseConfigured && !shouldUseLocalDemoSandboxOnly(effectiveId) && this.isOnline()) {
      try {
        const docRef = doc(db, 'users', effectiveId, 'notifications', notificationId);
        await setDoc(
          docRef,
          { read: true, dismissed: true, readAt: updated[index].readAt, dismissedAt: now },
          { merge: true }
        );
      } catch (err) {
        console.warn('[NotificationService] Firestore dismiss warning:', err);
      }
    }

    this.notifySubscribers(effectiveId);
    return true;
  }

  /**
   * Marks a single notification as read.
   */
  public static async markAsRead(patientId: string, notificationId: string): Promise<boolean> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getNotifications(effectiveId);
    const index = current.findIndex((n) => n.id === notificationId);

    if (index === -1) return false;

    const updated = [...current];
    updated[index] = {
      ...updated[index],
      read: true,
      readAt: new Date().toISOString(),
    };

    this.inMemoryStore[effectiveId] = updated;
    this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(updated));

    if (isFirebaseConfigured && !shouldUseLocalDemoSandboxOnly(effectiveId) && this.isOnline()) {
      try {
        const docRef = doc(db, 'users', effectiveId, 'notifications', notificationId);
        await setDoc(docRef, { read: true, readAt: updated[index].readAt }, { merge: true });
      } catch (err) {
        console.warn('[NotificationService] Firestore markAsRead warning:', err);
      }
    }

    this.notifySubscribers(effectiveId);
    return true;
  }

  /**
   * Marks all notifications as read for a given patient and optional role.
   */
  public static async markAllAsRead(
    patientId: string,
    role?: 'patient' | 'caregiver' | 'doctor'
  ): Promise<void> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getNotifications(effectiveId);
    const now = new Date().toISOString();

    const updated = current.map((n) => {
      if (!role || n.recipientRole === role || n.recipientRole === 'all') {
        return { ...n, read: true, readAt: n.readAt || now };
      }
      return n;
    });

    this.inMemoryStore[effectiveId] = updated;
    this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(updated));

    if (isFirebaseConfigured && !shouldUseLocalDemoSandboxOnly(effectiveId) && this.isOnline()) {
      updated.forEach((n) => {
        if (!role || n.recipientRole === role || n.recipientRole === 'all') {
          void setDoc(
            doc(db, 'users', effectiveId, 'notifications', n.id),
            { read: true, readAt: n.readAt },
            { merge: true }
          ).catch(() => {});
        }
      });
    }

    this.notifySubscribers(effectiveId);
  }

  /**
   * Real-time Firestore onSnapshot listener for live patient/caregiver notifications.
   */
  public static subscribeToFirestoreNotifications(
    patientId: string,
    onUpdate?: (notifications: InAppNotification[]) => void
  ): () => void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (shouldUseLocalDemoSandboxOnly(effectiveId) || !isFirebaseConfigured) {
      return () => {};
    }

    try {
      const q = query(collection(db, 'users', effectiveId, 'notifications'));
      return onSnapshot(
        q,
        (snapshot) => {
          const map = new Map<string, InAppNotification>();
          const currentLocal = this.inMemoryStore[effectiveId] || [];
          currentLocal.forEach((n) => map.set(n.id, n));
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data) {
              const item: InAppNotification = {
                ...(data as InAppNotification),
                id: docSnap.id || data.id,
                patientId: effectiveId,
              };
              map.set(item.id, item);
            }
          });
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.inMemoryStore[effectiveId] = merged;
          this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(merged));
          this.notifySubscribers(effectiveId);
          if (onUpdate) onUpdate(merged.filter((n) => !n.dismissed));
        },
        (err) => {
          console.warn('[NotificationService] Realtime listener warning:', err);
        }
      );
    } catch (err) {
      console.warn('[NotificationService] Failed to attach realtime listener:', err);
      return () => {};
    }
  }

  /**
   * Cross-device synchronization from Firestore.
   */
  public static async syncNotificationsFromFirestore(
    patientId: string
  ): Promise<InAppNotification[]> {
    const effectiveId = getEffectivePatientId({ uid: patientId });

    if (shouldUseLocalDemoSandboxOnly(effectiveId) || !isFirebaseConfigured || !this.isOnline()) {
      return this.getNotifications(effectiveId);
    }

    try {
      const q = query(collection(db, 'users', effectiveId, 'notifications'));
      const snapshot = await getDocs(q);

      const cloudList: InAppNotification[] = [];
      const docList =
        typeof snapshot?.forEach === 'function'
          ? snapshot
          : Array.isArray(snapshot?.docs)
          ? snapshot.docs
          : [];

      docList.forEach((docSnap: any) => {
        if (!docSnap) return;
        const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap.data;
        if (data) {
          cloudList.push({
            ...data,
            id: docSnap.id || data.id,
            patientId: effectiveId,
          });
        }
      });

      const local = this.getNotifications(effectiveId);
      const map = new Map<string, InAppNotification>();
      local.forEach((n) => map.set(n.id, n));
      cloudList.forEach((n) => map.set(n.id, n));

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      this.inMemoryStore[effectiveId] = merged;
      this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(merged));
      this.notifySubscribers(effectiveId);
      return merged;
    } catch (err) {
      console.warn('[NotificationService] syncNotificationsFromFirestore error:', err);
      return this.getNotifications(effectiveId);
    }
  }
}
