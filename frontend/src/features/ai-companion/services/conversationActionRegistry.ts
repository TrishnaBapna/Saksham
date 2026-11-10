/**
 * SAKSHAM — MILESTONE 7.3: CONVERSATION ACTION REGISTRY & CONFIRMATION PROTOCOL
 * Coordinates Class 1, 2, 3 and 4 actions.
 * Enforces explicit confirmations with 2-minute expiration before executing modifying actions.
 * 100% Spark Free Plan compliant.
 */

import { PendingConfirmation } from '../types/conversation.types.js';
import { RoutineService } from '../../routines/services/routineService.js';
import { NotesService } from '../../notes/services/notesService.js';
import { CalendarService } from '../../calendar/services/calendarService.js';

export class ConversationActionRegistry {
  private static pendingMap: Map<string, PendingConfirmation> = new Map();

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
   * Commits the pending consequential change to actual data services.
   */
  public static executePendingConfirmation(
    patientId: string,
    pendingId?: string
  ): { success: boolean; message: string; speechHi: string; speechEn: string } {
    const pending = this.pendingMap.get(patientId);
    if (!pending || (pendingId && pending.id !== pendingId)) {
      return {
        success: false,
        message: 'No active confirmation found or action expired.',
        speechHi: 'पुष्टि करने के लिए कोई सक्रिय अनुरोध नहीं मिला या समय समाप्त हो गया।',
        speechEn: 'I could not find an active pending action to confirm, or the confirmation has expired.',
      };
    }

    // Check expiration
    if (Date.now() > pending.expiresAt) {
      this.pendingMap.delete(patientId);
      return {
        success: false,
        message: 'Confirmation expired.',
        speechHi: 'कार्रवाई की समय सीमा समाप्त हो गई है। कृपया दोबारा बताएं।',
        speechEn: 'That confirmation has expired for your safety. Please let me know what you would like to do again.',
      };
    }

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

          this.pendingMap.delete(patientId);
          return {
            success: true,
            message: `Created reminder for ${title} at ${time}`,
            speechHi: `मैंने ${time} के लिए आपकी दिनचर्या में '${title}' जोड़ दिया है!`,
            speechEn: `I have saved your reminder for '${title}' at ${time}. It is ready on your care dashboard!`,
          };
        }

        case 'CREATE_NOTE': {
          const title = pending.title || 'Personal Reflection';
          const content = pending.details.content || pending.title;
          const category = pending.details.category || 'general';

          NotesService.createNote(patientId, {
            title,
            content,
            category,
            isPinned: pending.details.isPinned || false,
          });

          this.pendingMap.delete(patientId);
          return {
            success: true,
            message: `Created note: ${title}`,
            speechHi: `आपका नया नोट '${title}' सहेज लिया गया है!`,
            speechEn: `Your new note '${title}' has been safely preserved in your Notes Sanctuary.`,
          };
        }

        case 'CREATE_CALENDAR_EVENT': {
          const title = pending.title || 'Family Moment';
          const date = pending.details.date || new Date().toISOString().split('T')[0];
          const startTime = pending.details.time || '10:00';
          const startAt = new Date(`${date}T${startTime.length === 5 ? startTime : '10:00'}:00`).toISOString();

          CalendarService.createEvent(patientId, {
            title,
            startAt,
            category: (pending.details.category as any) || 'personal',
            isAllDay: false,
            isPrivate: false,
          });

          this.pendingMap.delete(patientId);
          return {
            success: true,
            message: `Created event: ${title}`,
            speechHi: `आपका कार्यक्रम '${title}' कैलेंडर में जोड़ दिया गया है!`,
            speechEn: `I have scheduled '${title}' in your calendar for ${date} at ${startTime}.`,
          };
        }

        default:
          this.pendingMap.delete(patientId);
          return {
            success: false,
            message: 'Unsupported action type',
            speechHi: 'यह क्रिया अभी समर्थित नहीं है।',
            speechEn: 'This action is not currently supported.',
          };
      }
    } catch (err: any) {
      this.pendingMap.delete(patientId);
      return {
        success: false,
        message: err?.message || 'Error executing action',
        speechHi: 'सहेजते समय एक समस्या आई। कृपया पुनः प्रयास करें।',
        speechEn: 'A momentary issue occurred while saving. Please try again.',
      };
    }
  }
}
