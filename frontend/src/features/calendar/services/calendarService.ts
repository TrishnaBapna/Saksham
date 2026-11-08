/**
 * Saksham Calendar Data Service
 * Milestone 6.1: Core Types, Services, Data Persistence & Firestore Security
 */

import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { getEffectivePatientId, isGuestPatient, notifyDataChange } from '../../auth/services/identityService.js';
import {
  CalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  CalendarCategory,
  CaregiverCalendarPermissions,
  CalendarRecurrenceRule,
} from '../types/calendar.types.js';

export class CalendarService {
  private static isOnlineListenerRegistered = false;

  private static getStorageKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_calendar_${effectiveId}`;
  }

  private static getPendingSyncKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_pending_calendar_sync_${effectiveId}`;
  }

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage unavailable or headless
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

  /**
   * Register automatic reconnection sync listener
   */
  public static ensureReconnectionListener(): void {
    if (this.isOnlineListenerRegistered || typeof window === 'undefined') return;
    this.isOnlineListenerRegistered = true;
    window.addEventListener('online', () => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('saksham_pending_calendar_sync_')) {
            const patientId = key.replace('saksham_pending_calendar_sync_', '');
            if (patientId && !isGuestPatient(patientId)) {
              this.syncPendingEvents(patientId).catch((err) =>
                console.warn('[CalendarService] Auto-sync on reconnection failed:', err)
              );
            }
          }
        }
      } catch (err) {
        console.warn('[CalendarService] Reconnection listener error:', err);
      }
    });
  }

  /**
   * Helper to format Date into YYYY-MM-DD
   */
  public static toDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper to extract YYYY-MM-DD from an ISO string
   */
  public static extractDateString(isoString: string): string {
    return isoString.split('T')[0];
  }

  /**
   * Calculate difference in whole days between two YYYY-MM-DD dates
   */
  public static getDayDifference(d1Str: string, d2Str: string): number {
    const d1 = new Date(`${d1Str}T00:00:00Z`);
    const d2 = new Date(`${d2Str}T00:00:00Z`);
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Virtual Recurrence Evaluator:
   * Determines if a recurring rule falls on a specific date string (YYYY-MM-DD).
   * 100% deterministic, zero additional Firestore writes.
   */
  public static doesRecurOnDate(
    startDateStr: string,
    targetDateStr: string,
    rule: CalendarRecurrenceRule
  ): boolean {
    if (targetDateStr < startDateStr) return false;
    if (rule.endAt && targetDateStr > rule.endAt) return false;

    const diffDays = this.getDayDifference(startDateStr, targetDateStr);

    if (rule.frequency === 'daily') {
      const interval = Math.max(1, rule.interval || 1);
      return diffDays % interval === 0;
    }

    if (rule.frequency === 'weekly') {
      const interval = Math.max(1, rule.interval || 1);
      const targetDayOfWeek = new Date(`${targetDateStr}T00:00:00Z`).getUTCDay();

      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        if (!rule.daysOfWeek.includes(targetDayOfWeek)) {
          return false;
        }
        const weekDiff = Math.floor(diffDays / 7);
        return weekDiff % interval === 0;
      } else {
        const startDayOfWeek = new Date(`${startDateStr}T00:00:00Z`).getUTCDay();
        if (targetDayOfWeek !== startDayOfWeek) {
          return false;
        }
        const weekDiff = Math.floor(diffDays / 7);
        return weekDiff % interval === 0;
      }
    }

    return false;
  }

  /**
   * Get all active calendar events for a patient.
   * Sorted chronologically by startAt ascending.
   */
  public static getEvents(patientId: string): CalendarEvent[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getStorageKey(effectiveId));
    if (!raw) return [];

    try {
      const events: CalendarEvent[] = JSON.parse(raw);
      return events
        .filter((e) => !e.deletedAt)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    } catch {
      return [];
    }
  }

  /**
   * Get a single event by ID
   */
  public static getEventById(patientId: string, eventId: string): CalendarEvent | null {
    const events = this.getEvents(patientId);
    return events.find((e) => e.id === eventId) || null;
  }

  /**
   * Generate an instance of an event for a target date
   */
  private static createOccurrenceForDate(event: CalendarEvent, targetDateStr: string): CalendarEvent {
    const origDateStr = this.extractDateString(event.startAt);
    if (origDateStr === targetDateStr) {
      return event;
    }

    const timePart = event.startAt.includes('T') ? event.startAt.split('T')[1] : '00:00:00.000Z';
    const newStartAt = `${targetDateStr}T${timePart}`;

    let newEndAt: string | undefined = undefined;
    if (event.endAt) {
      const durationMs = new Date(event.endAt).getTime() - new Date(event.startAt).getTime();
      newEndAt = new Date(new Date(newStartAt).getTime() + Math.max(0, durationMs)).toISOString();
    }

    return {
      ...event,
      startAt: newStartAt,
      endAt: newEndAt,
    };
  }

  /**
   * Get all events (single and virtual recurring occurrences) that occur on dateStr (YYYY-MM-DD).
   * Sorted chronologically.
   */
  public static getEventsForDate(patientId: string, dateStr: string): CalendarEvent[] {
    const events = this.getEvents(patientId);
    const result: CalendarEvent[] = [];

    for (const event of events) {
      const eventStartDate = this.extractDateString(event.startAt);

      if (!event.recurrence || event.recurrence.frequency === 'none') {
        if (eventStartDate === dateStr) {
          result.push(event);
        }
      } else {
        if (this.doesRecurOnDate(eventStartDate, dateStr, event.recurrence)) {
          result.push(this.createOccurrenceForDate(event, dateStr));
        }
      }
    }

    return result.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }

  /**
   * Get today's events for the patient
   */
  public static getTodayEvents(patientId: string): CalendarEvent[] {
    const todayStr = this.toDateString(new Date());
    return this.getEventsForDate(patientId, todayStr);
  }

  /**
   * Get upcoming events for the next N days (including today)
   */
  public static getUpcomingEvents(patientId: string, daysAhead: number = 7): CalendarEvent[] {
    const allEvents: CalendarEvent[] = [];
    const today = new Date();

    for (let i = 0; i < daysAhead; i++) {
      const current = new Date(today);
      current.setDate(today.getDate() + i);
      const dateStr = this.toDateString(current);
      const dayEvents = this.getEventsForDate(patientId, dateStr);
      allEvents.push(...dayEvents);
    }

    return allEvents.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }

  /**
   * Search events by text query
   */
  public static searchEvents(patientId: string, query: string): CalendarEvent[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return this.getEvents(patientId);

    return this.getEvents(patientId).filter((event) => {
      const titleMatch = event.title.toLowerCase().includes(trimmed);
      const descMatch = event.description ? event.description.toLowerCase().includes(trimmed) : false;
      const locMatch = event.locationLabel ? event.locationLabel.toLowerCase().includes(trimmed) : false;
      return titleMatch || descMatch || locMatch;
    });
  }

  /**
   * Filter events by category
   */
  public static filterByCategory(patientId: string, category: CalendarCategory): CalendarEvent[] {
    return this.getEvents(patientId).filter((event) => event.category === category);
  }

  /**
   * Filter events according to whether the viewer is a caregiver.
   * Caregivers are strictly blocked from seeing private events.
   */
  public static filterEventsForViewer(events: CalendarEvent[], isCaregiver: boolean): CalendarEvent[] {
    if (!isCaregiver) return events;
    return events.filter((e) => !e.isPrivate);
  }

  /**
   * Verify if a caregiver has permission for a specific calendar operation
   */
  public static canCaregiverPerform(
    permissions: Partial<CaregiverCalendarPermissions> | undefined,
    action: 'read' | 'create' | 'edit' | 'delete'
  ): boolean {
    if (!permissions) return false;
    switch (action) {
      case 'read':
        return !!permissions.canReadCalendar;
      case 'create':
        return !!permissions.canCreateCalendarEvents;
      case 'edit':
        return !!permissions.canEditCalendarEvents;
      case 'delete':
        return !!permissions.canDeleteCalendarEvents;
      default:
        return false;
    }
  }

  /**
   * Create a new calendar event.
   */
  public static async createEvent(
    patientId: string,
    input: CreateCalendarEventInput,
    creatorId?: string
  ): Promise<CalendarEvent> {
    const effectiveId = getEffectivePatientId({ uid: patientId });

    if (!input.title || !input.title.trim()) {
      throw new Error('Event title cannot be empty');
    }
    if (!input.startAt || isNaN(new Date(input.startAt).getTime())) {
      throw new Error('Valid start time is required');
    }
    if (input.endAt && isNaN(new Date(input.endAt).getTime())) {
      throw new Error('Invalid end time format');
    }
    if (input.endAt && new Date(input.endAt).getTime() < new Date(input.startAt).getTime()) {
      throw new Error('End time cannot precede start time');
    }

    const now = new Date().toISOString();
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const effectiveCreator = creatorId || effectiveId;

    const newEvent: CalendarEvent = {
      id: eventId,
      patientId: effectiveId,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      category: input.category || 'personal',
      startAt: new Date(input.startAt).toISOString(),
      endAt: input.endAt ? new Date(input.endAt).toISOString() : undefined,
      timezone: input.timezone || (Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Asia/Kolkata',
      isAllDay: !!input.isAllDay,
      reminderMinutesBefore: input.reminderMinutesBefore !== undefined ? input.reminderMinutesBefore : 15,
      recurrence: input.recurrence,
      linkedRoutineId: input.linkedRoutineId,
      locationLabel: input.locationLabel?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: effectiveCreator,
      syncStatus: isGuestPatient(effectiveId) ? 'local-only' : this.isOnline() ? 'synced' : 'offline-pending',
      isPrivate: !!input.isPrivate,
      sharing: {
        isSharedWithCaregiver: !input.isPrivate,
      },
    };

    // Save locally
    const existing = this.getEvents(effectiveId);
    existing.push(newEvent);
    this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(existing));

    // Notify listeners
    notifyDataChange('calendar', effectiveId);

    // If guest, do not push to cloud
    if (isGuestPatient(effectiveId)) {
      return newEvent;
    }

    // Cloud push or offline queue
    if (this.isOnline()) {
      try {
        await this.pushToFirestore(effectiveId, newEvent);
      } catch (err) {
        console.warn('[CalendarService] Failed to sync to Firestore, queuing offline:', err);
        this.queuePendingSync(effectiveId, newEvent.id, 'save');
        newEvent.syncStatus = 'offline-pending';
        this.updateLocalEvent(effectiveId, newEvent);
      }
    } else {
      this.queuePendingSync(effectiveId, newEvent.id, 'save');
    }

    return newEvent;
  }

  /**
   * Update an existing event
   */
  public static async updateEvent(
    patientId: string,
    eventId: string,
    input: UpdateCalendarEventInput
  ): Promise<CalendarEvent | null> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const existing = this.getEvents(effectiveId);
    const index = existing.findIndex((e) => e.id === eventId);
    if (index === -1) return null;

    const event = existing[index];

    if (input.title !== undefined) {
      if (!input.title.trim()) {
        throw new Error('Event title cannot be empty');
      }
      event.title = input.title.trim();
    }
    if (input.description !== undefined) {
      event.description = input.description.trim() || undefined;
    }
    if (input.category !== undefined) {
      event.category = input.category;
    }
    if (input.startAt !== undefined) {
      if (isNaN(new Date(input.startAt).getTime())) {
        throw new Error('Valid start time is required');
      }
      event.startAt = new Date(input.startAt).toISOString();
    }
    if (input.endAt !== undefined) {
      if (input.endAt && isNaN(new Date(input.endAt).getTime())) {
        throw new Error('Invalid end time format');
      }
      if (input.endAt && new Date(input.endAt).getTime() < new Date(event.startAt).getTime()) {
        throw new Error('End time cannot precede start time');
      }
      event.endAt = input.endAt ? new Date(input.endAt).toISOString() : undefined;
    }
    if (input.timezone !== undefined) {
      event.timezone = input.timezone;
    }
    if (input.isAllDay !== undefined) {
      event.isAllDay = input.isAllDay;
    }
    if (input.reminderMinutesBefore !== undefined) {
      event.reminderMinutesBefore = input.reminderMinutesBefore;
    }
    if (input.recurrence !== undefined) {
      event.recurrence = input.recurrence;
    }
    if (input.linkedRoutineId !== undefined) {
      event.linkedRoutineId = input.linkedRoutineId;
    }
    if (input.locationLabel !== undefined) {
      event.locationLabel = input.locationLabel.trim() || undefined;
    }
    if (input.isPrivate !== undefined) {
      event.isPrivate = input.isPrivate;
      event.sharing = { isSharedWithCaregiver: !input.isPrivate };
    }

    event.updatedAt = new Date().toISOString();
    event.syncStatus = isGuestPatient(effectiveId) ? 'local-only' : this.isOnline() ? 'synced' : 'offline-pending';

    existing[index] = event;
    this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(existing));
    notifyDataChange('calendar', effectiveId);

    if (isGuestPatient(effectiveId)) {
      return event;
    }

    if (this.isOnline()) {
      try {
        await this.pushToFirestore(effectiveId, event);
      } catch (err) {
        console.warn('[CalendarService] Failed to update Firestore, queuing offline:', err);
        this.queuePendingSync(effectiveId, event.id, 'save');
        event.syncStatus = 'offline-pending';
        this.updateLocalEvent(effectiveId, event);
      }
    } else {
      this.queuePendingSync(effectiveId, event.id, 'save');
    }

    return event;
  }

  /**
   * Delete an event (soft-delete with deletedAt, then remote deletion)
   */
  public static async deleteEvent(patientId: string, eventId: string): Promise<boolean> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const existing = this.getEvents(effectiveId);
    const index = existing.findIndex((e) => e.id === eventId);
    if (index === -1) return false;

    // Remove locally
    const filtered = existing.filter((e) => e.id !== eventId);
    this.safeSetItem(this.getStorageKey(effectiveId), JSON.stringify(filtered));
    notifyDataChange('calendar', effectiveId);

    if (isGuestPatient(effectiveId)) {
      return true;
    }

    if (this.isOnline()) {
      try {
        const eventRef = doc(db, 'users', effectiveId, 'calendarEvents', eventId);
        await deleteDoc(eventRef);
      } catch (err) {
        console.warn('[CalendarService] Remote deletion failed, queuing offline delete:', err);
        this.queuePendingSync(effectiveId, eventId, 'delete');
      }
    } else {
      this.queuePendingSync(effectiveId, eventId, 'delete');
    }

    return true;
  }

  /**
   * Direct update of a local event without triggering new sync cycle
   */
  private static updateLocalEvent(patientId: string, event: CalendarEvent): void {
    const events = this.getEvents(patientId);
    const idx = events.findIndex((e) => e.id === event.id);
    if (idx !== -1) {
      events[idx] = event;
      this.safeSetItem(this.getStorageKey(patientId), JSON.stringify(events));
    }
  }

  /**
   * Push a calendar event to Firestore
   */
  private static async pushToFirestore(patientId: string, event: CalendarEvent): Promise<void> {
    const eventRef = doc(db, 'users', patientId, 'calendarEvents', event.id);
    const { ...payload } = event;
    await setDoc(eventRef, payload, { merge: true });
  }

  /**
   * Add an item to offline sync queue
   */
  private static queuePendingSync(patientId: string, eventId: string, action: 'save' | 'delete'): void {
    const key = this.getPendingSyncKey(patientId);
    const raw = this.safeGetItem(key);
    let queue: { eventId: string; action: 'save' | 'delete'; timestamp: number }[] = [];
    if (raw) {
      try {
        queue = JSON.parse(raw);
      } catch {
        queue = [];
      }
    }

    queue = queue.filter((item) => item.eventId !== eventId);
    queue.push({ eventId, action, timestamp: Date.now() });
    this.safeSetItem(key, JSON.stringify(queue));
  }

  /**
   * Flush offline sync queue for a patient
   */
  public static async syncPendingEvents(patientId: string): Promise<void> {
    if (isGuestPatient(patientId) || !this.isOnline()) return;

    const key = this.getPendingSyncKey(patientId);
    const raw = this.safeGetItem(key);
    if (!raw) return;

    let queue: { eventId: string; action: 'save' | 'delete'; timestamp: number }[] = [];
    try {
      queue = JSON.parse(raw);
    } catch {
      return;
    }

    if (queue.length === 0) return;

    const remainingQueue: typeof queue = [];

    for (const item of queue) {
      try {
        if (item.action === 'delete') {
          const eventRef = doc(db, 'users', patientId, 'calendarEvents', item.eventId);
          await deleteDoc(eventRef);
        } else {
          const event = this.getEventById(patientId, item.eventId);
          if (event && !event.deletedAt) {
            await this.pushToFirestore(patientId, event);
            event.syncStatus = 'synced';
            this.updateLocalEvent(patientId, event);
          }
        }
      } catch (err) {
        console.warn(`[CalendarService] Failed to sync item ${item.eventId}:`, err);
        remainingQueue.push(item);
      }
    }

    if (remainingQueue.length === 0) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch {
        // no-op
      }
    } else {
      this.safeSetItem(key, JSON.stringify(remainingQueue));
    }

    notifyDataChange('calendar', patientId);
  }
}
