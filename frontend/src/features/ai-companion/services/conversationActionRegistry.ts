/**
 * SAKSHAM — MILESTONE 7.3.2: RELIABLE ASYNCHRONOUS CONVERSATION ACTION REGISTRY
 * Coordinates Class 1, 2, 3 and 4 actions.
 * Enforces explicit confirmations with 2-minute execution-time TTL.
 * Completely asynchronous commit pipeline awaiting underlying persistence promises.
 * Local-first truthful status tracking: saved_locally | synced_cloud | failed | expired | duplicate_ignored.
 * 100% Spark Free Plan compliant.
 */

import { ActionExecutionResult, PendingConfirmation } from '../types/conversation.types.js';
import { RoutineService } from '../../routines/services/routineService.js';
import { NotesService } from '../../notes/services/notesService.js';
import { CalendarService } from '../../calendar/services/calendarService.js';
import { isGuestPatient } from '../../auth/services/identityService.js';

export class ConversationActionRegistry {
  private static pendingMap: Map<string, PendingConfirmation> = new Map();
  private static executingSet: Set<string> = new Set();

  /**
   * Registers a pending consequential action requiring explicit patient confirmation.
   * Auto-expires after 2 minutes (120,000ms).
   */
  public static createPendingConfirmation(
    patientId: string,
    actionType: PendingConfirmation['actionType'],
    title: string,
    details: Record<string, any>,
    proposalText: string
  ): PendingConfirmation {
    const id = `confirm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const pending: PendingConfirmation = {
      id,
      patientId,
      actionType,
      title,
      details,
      proposalText,
      createdAt: Date.now(),
      expiresAt: Date.now() + 120_000, // 2 minutes
    };

    this.pendingMap.set(patientId, pending);
    return pending;
  }

  /**
   * Retrieves active pending confirmation for patient, filtering out expired ones.
   */
  public static getActivePendingConfirmation(patientId: string): PendingConfirmation | null {
    const pending = this.pendingMap.get(patientId);
    if (!pending) return null;

    if (Date.now() > pending.expiresAt) {
      this.pendingMap.delete(patientId);
      return null;
    }

    return pending;
  }

  /**
   * Cancels any pending confirmation for the patient without making changes.
   */
  public static cancelPendingConfirmation(patientId: string): boolean {
    if (this.pendingMap.has(patientId)) {
      this.pendingMap.delete(patientId);
      return true;
    }
    return false;
  }

  /**
   * Clears all pending confirmations and execution locks (for testing and teardown).
   */
  public static clearAll(): void {
    this.pendingMap.clear();
    this.executingSet.clear();
  }

  /**
   * Commits the pending consequential change to actual data services.
   * Truly asynchronous: awaits underlying service promises, catches rejections,
   * prevents double-execution races, enforces execution-time TTL, and validates UID ownership.
   */
  public static async executePendingConfirmation(
    patientId: string,
    pendingId?: string,
    authUid?: string
  ): Promise<ActionExecutionResult> {
    // Re-entrancy & race-condition lock for in-flight executions
    if (pendingId && this.executingSet.has(pendingId)) {
      return {
        success: false,
        status: 'duplicate_ignored',
        message: 'Action is already currently being committed.',
        speechHi: 'यह क्रिया पहले से सहेजी जा रही है।',
        speechEn: 'This action is already being processed. Please hold on a moment.',
      };
    }

    const pending = this.pendingMap.get(patientId);

    if (!pending || (pendingId && pending.id !== pendingId)) {
      return {
        success: false,
        status: 'expired',
        message: 'No active confirmation found or action expired.',
        speechHi: 'पुष्टि करने के लिए कोई सक्रिय अनुरोध नहीं मिला या समय समाप्त हो गया।',
        speechEn: 'I could not find an active pending action to confirm, or the confirmation has expired.',
      };
    }

    // UID Ownership re-verification
    if (authUid && pending.patientId && authUid !== pending.patientId && !isGuestPatient(pending.patientId)) {
      this.pendingMap.delete(patientId);
      return {
        success: false,
        status: 'permission_denied',
        message: 'Authenticated account mismatch.',
        speechHi: 'खाता सुरक्षा कारणों से यह क्रिया अस्वीकृत कर दी गई।',
        speechEn: 'For your security, this action cannot be confirmed across different accounts.',
      };
    }

    // Execution-time TTL check (2 minutes)
    if (Date.now() > pending.expiresAt) {
      this.pendingMap.delete(patientId);
      return {
        success: false,
        status: 'expired',
        message: 'Confirmation expired.',
        speechHi: 'कार्रवाई की समय सीमा समाप्त हो गई है। कृपया दोबारा बताएं।',
        speechEn: 'That confirmation has expired for your safety. Please let me know what you would like to do again.',
      };
    }

    // Re-entrancy & race-condition lock
    if (this.executingSet.has(pending.id)) {
      return {
        success: false,
        status: 'duplicate_ignored',
        message: 'Action is already currently being committed.',
        speechHi: 'यह क्रिया पहले से सहेजी जा रही है।',
        speechEn: 'This action is already being processed. Please hold on a moment.',
      };
    }

    // Immediately remove from pendingMap and acquire lock before awaiting
    this.pendingMap.delete(patientId);
    this.executingSet.add(pending.id);

    try {
      switch (pending.actionType) {
        case 'CREATE_REMINDER':
        case 'CREATE_ROUTINE': {
          const title = pending.title || 'Gentle Care Reminder';
          const time = pending.details.time || '03:00 PM';
          const period = time.toLowerCase().includes('pm') ? 'afternoon' : 'morning';

          RoutineService.addRoutine(patientId, {
            id: `routine-${Date.now()}`,
            title,
            scheduledTime: time,
            category: (pending.details.category as any) || 'wellness',
            period: period as any,
            isCompleted: false,
            enableAssistedRecall: true,
            streakCount: 0,
          });

          return {
            success: true,
            status: 'saved_locally',
            message: `Created reminder for ${title} at ${time}`,
            speechHi: `मैंने ${time} के लिए आपकी दिनचर्या में '${title}' इस डिवाइस पर सहेज दिया है। यह आपके डैशबोर्ड पर तैयार है!`,
            speechEn: `I have saved your reminder for '${title}' at ${time} on this device. It is ready on your care dashboard!`,
          };
        }

        case 'CREATE_NOTE': {
          const title = pending.title || 'Personal Reflection';
          const content = pending.details.content || pending.title;
          const category = pending.details.category || 'general';

          const note = await NotesService.createNote(patientId, {
            title,
            content,
            category,
            isPinned: pending.details.isPinned || false,
          });

          const isCloudSynced = note.syncStatus === 'synced';
          return {
            success: true,
            status: isCloudSynced ? 'synced_cloud' : 'saved_locally',
            message: `Created note: ${title}`,
            speechHi: isCloudSynced
              ? `आपका नया नोट '${title}' क्लाउड में सहेज लिया गया है!`
              : `आपका नया नोट '${title}' इस डिवाइस पर सुरक्षित रूप से सहेज लिया गया है।`,
            speechEn: isCloudSynced
              ? `Your new note '${title}' has been safely synced to the cloud.`
              : `Your note '${title}' has been safely preserved on this device and is waiting to sync.`,
          };
        }

        case 'CREATE_CALENDAR_EVENT': {
          const title = pending.title || 'Family Moment';
          const date = pending.details.date || new Date().toISOString().split('T')[0];
          const startTime = pending.details.time || '10:00';
          const startAt = new Date(`${date}T${startTime.length === 5 ? startTime : '10:00'}:00`).toISOString();

          const event = await CalendarService.createEvent(patientId, {
            title,
            startAt,
            category: (pending.details.category as any) || 'personal',
            isAllDay: false,
            isPrivate: false,
          });

          const isCloudSynced = event.syncStatus === 'synced';
          return {
            success: true,
            status: isCloudSynced ? 'synced_cloud' : 'saved_locally',
            message: `Created event: ${title}`,
            speechHi: isCloudSynced
              ? `आपका कार्यक्रम '${title}' क्लाउड कैलेंडर में जोड़ दिया गया है!`
              : `आपका कार्यक्रम '${title}' इस डिवाइस पर कैलेंडर में जोड़ दिया गया है।`,
            speechEn: isCloudSynced
              ? `I have scheduled '${title}' in your cloud calendar for ${date} at ${startTime}.`
              : `I have scheduled '${title}' in your calendar for ${date} at ${startTime} on this device.`,
          };
        }

        default:
          return {
            success: false,
            status: 'failed',
            message: 'Unsupported action type',
            speechHi: 'यह क्रिया अभी समर्थित नहीं है।',
            speechEn: 'This action is not currently supported.',
          };
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        message: err?.message || 'Error executing action',
        speechHi: 'सहेजते समय एक समस्या आई। आप दोबारा प्रयास कर सकते हैं।',
        speechEn: 'I encountered an issue while saving. You can safely try again.',
        retryAvailable: true,
        pendingAction: pending,
      };
    } finally {
      this.executingSet.delete(pending.id);
    }
  }
}
