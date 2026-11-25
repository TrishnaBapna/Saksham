/**
 * SAKSHAM NEURO-CARE — PHASE 3.1
 * TASK LIFECYCLE, ACCOUNTABILITY, RECURRENCE & MEMORY CHALLENGE SERVICE
 * 100% Spark Free Plan compliant — strictly non-diagnostic.
 */

import {
  RecurringTask,
  DailyTaskInstance,
  TaskLifecycleStatus,
  TaskRemovalReason,
  TaskCompletionAttribution,
  MemoryChallengeResult,
  TaskLifecycleHistorySummary,
  DescriptiveTaskInsight,
  RecurrencePattern,
  TaskSupportLevel,
} from '../types/taskLifecycle.types.js';
import { DEFAULT_PATIENT_ROUTINES, RoutineService } from './routineService.js';
import { AdaptiveSupportService } from '../../adaptive/services/adaptiveSupportService.js';
import { getEffectivePatientId, isGuestPatient } from '../../auth/services/identityService.js';
import { SyncQueueService } from '../../../services/syncQueueService.js';
import { RoutineSessionService } from './routineSessionService.js';

export class TaskLifecycleService {
  private static inMemoryStore: Record<string, string> = {};

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch {
      // Storage unavailable or headless node
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

  public static clearCache(): void {
    this.inMemoryStore = {};
  }

  // Storage Keys
  private static getRecurringKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_recurring_tasks_${effectiveId}`;
  }

  private static getInstancesKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_daily_instances_${effectiveId}`;
  }

  private static getChallengesKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_challenge_results_${effectiveId}`;
  }

  // ---------------------------------------------------------------------------
  // 1. RECURRING TASK MANAGEMENT
  // ---------------------------------------------------------------------------

  public static getRecurringTasks(patientId: string): RecurringTask[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const key = this.getRecurringKey(effectiveId);
    const data = this.safeGetItem(key);

    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Parse error, fallback to seeding
      }
    }

    // Seed from default patient routines
    const seeded = this.seedDefaultRecurringTasks(effectiveId);
    this.saveRecurringTasks(effectiveId, seeded);
    return seeded;
  }

  public static saveRecurringTasks(patientId: string, tasks: RecurringTask[]): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const key = this.getRecurringKey(effectiveId);
    this.safeSetItem(key, JSON.stringify(tasks));
  }

  private static seedDefaultRecurringTasks(patientId: string): RecurringTask[] {
    const now = new Date().toISOString();
    return DEFAULT_PATIENT_ROUTINES.map((r) => {
      const isMed = r.category === 'medication';
      const challengeConfig = isMed
        ? {
            enabled: true,
            challengeType: 'sequence_recall' as const,
            promptQuestion: 'What authorized medicine is taken now before breakfast?',
            stepOptions: [
              'Morning clinician-prescribed medication dose',
              'Evening sleep tea',
              'Afternoon vitamin supplement',
            ],
            correctOptionIndex: 0,
          }
        : r.id === 'routine-01'
        ? {
            enabled: true,
            challengeType: 'next_step' as const,
            promptQuestion: 'What step comes after taking out the teapot?',
            stepOptions: [
              'Place pot on stove to heat clean water',
              'Run outside into the garden',
              'Go back to sleep',
            ],
            correctOptionIndex: 0,
          }
        : r.id === 'routine-03'
        ? {
            enabled: true,
            challengeType: 'patient_selected' as const,
            promptQuestion: 'Would you like to try buttoning the first two buttons independently?',
          }
        : undefined;

      return {
        id: r.id,
        patientId,
        title: r.title,
        description: r.description || '',
        category: r.category,
        period: r.period || 'morning',
        scheduledTime: r.scheduledTime,
        durationMinutes: r.timerMinutes || 10,
        recurrence: 'daily' as RecurrencePattern,
        supportLevel: isMed ? 'guided' : ('supported' as TaskSupportLevel),
        createdBy: isMed ? 'clinician' : 'patient',
        lifecycleStatus: 'active' as const,
        reminderConfig: {
          enabled: true,
          leadTimeMinutes: 0,
          followUpMinutes: 10,
          maxFollowUps: 1,
        },
        memoryChallengeConfig: challengeConfig,
        steps: r.steps || [],
        isClinicianPrescribed: !!r.isClinicianPrescribed,
        prescribingDoctorId: r.prescribingDoctorId || (isMed ? 'dr-arun-sharma' : undefined),
        prescriptionRef: r.prescriptionRef,
        modificationHistory: [
          {
            id: `mod_${Date.now()}_init`,
            modifiedBy: isMed ? 'clinician' : 'system',
            modifiedAt: now,
            changeType: 'created',
            details: isMed
              ? 'Authorized clinical prescription routine initialized'
              : 'Daily routine schedule established',
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  public static addRecurringTask(
    patientId: string,
    taskData: Omit<RecurringTask, 'id' | 'createdAt' | 'updatedAt' | 'modificationHistory' | 'lifecycleStatus'>
  ): RecurringTask {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getRecurringTasks(effectiveId);
    const now = new Date().toISOString();
    const newId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newTask: RecurringTask = {
      ...taskData,
      id: newId,
      patientId: effectiveId,
      lifecycleStatus: 'active',
      modificationHistory: [
        {
          id: `mod_${Date.now()}`,
          modifiedBy: taskData.createdBy || 'patient',
          modifiedAt: now,
          changeType: 'created',
          details: `Created task "${taskData.title}"`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newTask, ...current];
    this.saveRecurringTasks(effectiveId, updated);
    return newTask;
  }

  public static updateRecurringTask(
    patientId: string,
    taskId: string,
    updates: Partial<RecurringTask>,
    modifiedBy: 'patient' | 'caregiver' | 'clinician' = 'patient',
    details: string = 'Updated task details'
  ): RecurringTask | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getRecurringTasks(effectiveId);
    const index = current.findIndex((t) => t.id === taskId);
    if (index === -1) return null;

    const existing = current[index];
    const now = new Date().toISOString();

    const updated: RecurringTask = {
      ...existing,
      ...updates,
      updatedAt: now,
      modificationHistory: [
        {
          id: `mod_${Date.now()}`,
          modifiedBy,
          modifiedAt: now,
          changeType: 'edited',
          details,
        },
        ...existing.modificationHistory,
      ],
    };

    current[index] = updated;
    this.saveRecurringTasks(effectiveId, current);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // 2. PAUSE, RESUME, ARCHIVE & SAFEGUARDED REMOVAL
  // ---------------------------------------------------------------------------

  public static pauseTask(
    patientId: string,
    taskId: string,
    requestedBy: 'patient' | 'caregiver' = 'patient',
    reason: string = 'Patient paused activity'
  ): RecurringTask | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getRecurringTasks(effectiveId);
    const task = current.find((t) => t.id === taskId);
    if (!task) return null;

    const now = new Date().toISOString();
    return this.updateRecurringTask(
      effectiveId,
      taskId,
      {
        lifecycleStatus: 'paused',
        pausedAt: now,
      },
      requestedBy,
      `Paused: ${reason}`
    );
  }

  public static resumeTask(
    patientId: string,
    taskId: string,
    requestedBy: 'patient' | 'caregiver' = 'patient'
  ): RecurringTask | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return this.updateRecurringTask(
      effectiveId,
      taskId,
      {
        lifecycleStatus: 'active',
        pausedAt: undefined,
      },
      requestedBy,
      'Resumed active task schedule'
    );
  }

  public static archiveTask(
    patientId: string,
    taskId: string,
    reason: TaskRemovalReason
  ): { task: RecurringTask; pendingReview: boolean } | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getRecurringTasks(effectiveId);
    const task = current.find((t) => t.id === taskId);
    if (!task) return null;

    const now = new Date().toISOString();

    // Critical Safeguard: Clinician prescribed tasks cannot be deleted unilaterally by patient
    if (task.isClinicianPrescribed && reason.requestedBy === 'patient') {
      const updated = this.updateRecurringTask(
        effectiveId,
        taskId,
        {
          lifecycleStatus: 'pending_removal_review',
          removalReason: {
            ...reason,
            status: 'pending_review',
          },
        },
        'patient',
        `Removal requested by patient: ${reason.reasonCode} - awaiting clinician/caregiver review`
      );
      return updated ? { task: updated, pendingReview: true } : null;
    }

    // Normal task: archive with full preservation of identity and history
    const updated = this.updateRecurringTask(
      effectiveId,
      taskId,
      {
        lifecycleStatus: 'archived',
        archivedAt: now,
        removalReason: {
          ...reason,
          status: 'archived',
        },
      },
      reason.requestedBy,
      `Archived: ${reason.reasonCode}${reason.explanation ? ` (${reason.explanation})` : ''}`
    );

    return updated ? { task: updated, pendingReview: false } : null;
  }

  public static restoreTask(
    patientId: string,
    taskId: string,
    restoredBy: 'patient' | 'caregiver' = 'patient'
  ): RecurringTask | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return this.updateRecurringTask(
      effectiveId,
      taskId,
      {
        lifecycleStatus: 'active',
        archivedAt: undefined,
        pausedAt: undefined,
        removalReason: undefined,
      },
      restoredBy,
      'Restored task from archive'
    );
  }

  // ---------------------------------------------------------------------------
  // 3. DAILY TASK INSTANCES (DATE-SCOPED PERSISTENCE)
  // ---------------------------------------------------------------------------

  public static getAllInstances(patientId: string): DailyTaskInstance[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const key = this.getInstancesKey(effectiveId);
    const data = this.safeGetItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Storage corrupt, return empty
      }
    }
    return [];
  }

  public static saveAllInstances(patientId: string, instances: DailyTaskInstance[]): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const key = this.getInstancesKey(effectiveId);
    this.safeSetItem(key, JSON.stringify(instances));
  }

  public static getOrCreateTodayInstances(
    patientId: string,
    targetDateStr?: string
  ): DailyTaskInstance[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const today = targetDateStr || new Date().toISOString().split('T')[0];
    const recurring = this.getRecurringTasks(effectiveId);
    const existing = this.getAllInstances(effectiveId);

    const todayInstances = existing.filter((inst) => inst.date === today);
    const newInstances: DailyTaskInstance[] = [];

    // Create instances for active recurring tasks not yet instantiated for today
    for (const task of recurring) {
      if (task.lifecycleStatus !== 'active') continue;

      const hasInstance = todayInstances.some((inst) => inst.recurringTaskId === task.id);
      if (!hasInstance) {
        const instanceId = `inst_${task.id}_${today}`;
        const newInst: DailyTaskInstance = {
          id: instanceId,
          recurringTaskId: task.id,
          patientId: effectiveId,
          date: today,
          scheduledTime: task.scheduledTime,
          title: task.title,
          description: task.description,
          category: task.category,
          period: task.period,
          status: 'scheduled',
          hintsUsedCount: 0,
          isClinicianPrescribed: task.isClinicianPrescribed,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        newInstances.push(newInst);
      }
    }

    if (newInstances.length > 0) {
      const merged = [...newInstances, ...existing];
      this.saveAllInstances(effectiveId, merged);
      return merged.filter((inst) => inst.date === today);
    }

    return todayInstances;
  }

  public static getInstancesForDate(patientId: string, dateStr: string): DailyTaskInstance[] {
    return this.getOrCreateTodayInstances(patientId, dateStr);
  }

  // ---------------------------------------------------------------------------
  // 4. TASK COMPLETION ACCOUNTABILITY & ATTRIBUTION
  // ---------------------------------------------------------------------------

  public static recordInstanceCompletion(
    patientId: string,
    instanceId: string,
    attribution: TaskCompletionAttribution,
    challengeResult?: MemoryChallengeResult
  ): DailyTaskInstance | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    let instances = this.getAllInstances(effectiveId);
    let index = instances.findIndex((inst) => inst.id === instanceId);

    if (index === -1) {
      // Auto-create instance if not pre-instantiated
      const today = new Date().toISOString().split('T')[0];
      const recurring = this.getRecurringTasks(effectiveId);
      const parentTask = recurring.find(
        (t) => t.id === instanceId.replace('inst_', '').replace(`_${today}`, '')
      );
      const newInst: DailyTaskInstance = {
        id: instanceId,
        recurringTaskId: parentTask?.id || instanceId,
        patientId: effectiveId,
        date: today,
        scheduledTime: parentTask?.scheduledTime || '08:00 AM',
        title: parentTask?.title || 'Daily Activity',
        category: parentTask?.category || 'wellness',
        period: parentTask?.period || 'morning',
        status: 'scheduled',
        hintsUsedCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      instances = [newInst, ...instances];
      index = 0;
    }

    const inst = instances[index];
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isAssisted =
      attribution.completionType === 'with_help' ||
      attribution.completionType === 'partial' ||
      attribution.completionType === 'uncertain' ||
      attribution.helpType !== undefined;

    const syncStatus = isGuestPatient(effectiveId)
      ? 'local_only'
      : SyncQueueService.isOnline()
      ? 'synced'
      : 'pending_sync';

    const updated: DailyTaskInstance = {
      ...inst,
      status: isAssisted ? 'completed_assisted' : 'completed',
      completedAt: timeStr,
      completionAttribution: attribution,
      challengeResult,
      syncStatus,
      updatedAt: now.toISOString(),
    };

    instances[index] = updated;
    this.saveAllInstances(effectiveId, instances);

    // Enqueue idempotent offline-first sync
    SyncQueueService.enqueue(effectiveId, 'dailyTaskInstances', updated.id, 'upsert', updated);

    // Sync with existing legacy RoutineService and streak calculations
    RoutineService.updateRoutineCompletion(effectiveId, inst.recurringTaskId, true);

    // If memory challenge was completed, record outcome
    if (challengeResult) {
      this.recordChallengeOutcome(effectiveId, inst.recurringTaskId, challengeResult);
    }

    // Record observation in AdaptiveSupportService
    AdaptiveSupportService.recordObservation({
      id: `obs_${inst.id}_${Date.now()}`,
      patientId: effectiveId,
      activityId: inst.recurringTaskId,
      activityTitle: inst.title,
      activityType: 'routine',
      timestamp: now.toISOString(),
      sessionId: `sess_${inst.id}`,
      assistanceRequested: isAssisted,
      hintsUsedCount: inst.hintsUsedCount || 0,
      repeatedInstructionCount: 0,
      completionStatus: 'completed',
      pauseCount: 0,
      durationSeconds: 60,
      isInterrupted: false,
      currentLevel: isAssisted ? 'supported' : 'independent',
      patientFeedback: attribution.notes,
    }).catch(() => {});

    return updated;
  }

  public static recordInstanceSkip(
    patientId: string,
    instanceId: string,
    reason: string = 'Skipped by patient preference (Zero penalty)'
  ): DailyTaskInstance | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const instances = this.getAllInstances(effectiveId);
    const index = instances.findIndex((inst) => inst.id === instanceId);
    if (index === -1) return null;

    const inst = instances[index];
    const now = new Date();
    const syncStatus = isGuestPatient(effectiveId)
      ? 'local_only'
      : SyncQueueService.isOnline()
      ? 'synced'
      : 'pending_sync';

    const updated: DailyTaskInstance = {
      ...inst,
      status: 'skipped',
      skipReason: reason,
      syncStatus,
      updatedAt: now.toISOString(),
    };

    instances[index] = updated;
    this.saveAllInstances(effectiveId, instances);
    SyncQueueService.enqueue(effectiveId, 'dailyTaskInstances', updated.id, 'upsert', updated);
    return updated;
  }

  public static recordInstanceSnooze(
    patientId: string,
    instanceId: string,
    snoozeMinutes: number = 15
  ): DailyTaskInstance | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const instances = this.getAllInstances(effectiveId);
    const index = instances.findIndex((inst) => inst.id === instanceId);
    if (index === -1) return null;

    const inst = instances[index];
    const snoozeTime = new Date(Date.now() + snoozeMinutes * 60000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const syncStatus = isGuestPatient(effectiveId)
      ? 'local_only'
      : SyncQueueService.isOnline()
      ? 'synced'
      : 'pending_sync';

    const updated: DailyTaskInstance = {
      ...inst,
      status: 'snoozed',
      snoozeUntil: snoozeTime,
      syncStatus,
      updatedAt: new Date().toISOString(),
    };

    instances[index] = updated;
    this.saveAllInstances(effectiveId, instances);
    SyncQueueService.enqueue(effectiveId, 'dailyTaskInstances', updated.id, 'upsert', updated);
    return updated;
  }

  public static recordInstanceUnconfirmed(
    patientId: string,
    instanceId: string
  ): DailyTaskInstance | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const instances = this.getAllInstances(effectiveId);
    const index = instances.findIndex((inst) => inst.id === instanceId);
    if (index === -1) return null;

    const inst = instances[index];
    // Do not overwrite completed or skipped instances
    if (inst.status === 'completed' || inst.status === 'completed_assisted' || inst.status === 'skipped') {
      return inst;
    }

    const syncStatus = isGuestPatient(effectiveId)
      ? 'local_only'
      : SyncQueueService.isOnline()
      ? 'synced'
      : 'pending_sync';

    const updated: DailyTaskInstance = {
      ...inst,
      status: 'unconfirmed',
      syncStatus,
      updatedAt: new Date().toISOString(),
    };

    instances[index] = updated;
    this.saveAllInstances(effectiveId, instances);
    SyncQueueService.enqueue(effectiveId, 'dailyTaskInstances', updated.id, 'upsert', updated);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // 5. MEMORY CHALLENGES EXECUTION & RECORDING
  // ---------------------------------------------------------------------------

  public static recordChallengeOutcome(
    patientId: string,
    taskId: string,
    result: MemoryChallengeResult
  ): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const key = this.getChallengesKey(effectiveId);
    const current = this.getChallengeHistory(effectiveId);

    const record = {
      ...result,
      taskId,
      id: `chal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nonDiagnosticNotice:
        'Gentle cognitive exercise outcome for activity support. Strictly non-diagnostic.',
    };

    this.safeSetItem(key, JSON.stringify([record, ...current]));
  }

  public static getChallengeHistory(patientId: string, taskId?: string): MemoryChallengeResult[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const key = this.getChallengesKey(effectiveId);
    const data = this.safeGetItem(key);
    if (!data) return [];
    try {
      const parsed: (MemoryChallengeResult & { taskId?: string })[] = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      if (taskId) {
        return parsed.filter((r) => r.taskId === taskId);
      }
      return parsed;
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // 6. REMINDER EVALUATION ENGINE
  // ---------------------------------------------------------------------------

  public static evaluateDueReminders(
    patientId: string,
    now: Date = new Date(),
    dateStr?: string
  ): { due: DailyTaskInstance[]; followupDue: DailyTaskInstance[] } {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const targetDate = dateStr || now.toISOString().split('T')[0];
    const instances = this.getOrCreateTodayInstances(effectiveId, targetDate);
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    const due: DailyTaskInstance[] = [];
    const followupDue: DailyTaskInstance[] = [];

    for (const inst of instances) {
      if (inst.status !== 'scheduled' && inst.status !== 'snoozed') continue;

      // Parse scheduled time e.g. "08:30 AM"
      const scheduledMinutes = this.parseTimeToMinutes(inst.snoozeUntil || inst.scheduledTime);
      if (scheduledMinutes === null) continue;

      const diff = currentTimeMinutes - scheduledMinutes;

      // Due at or within 5 minutes of scheduled time
      if (diff >= 0 && diff <= 5) {
        due.push(inst);
      } else if (diff > 5 && diff <= 15) {
        // One gentle follow-up between 5 and 15 mins after
        followupDue.push(inst);
      }
    }

    return { due, followupDue };
  }

  private static parseTimeToMinutes(timeStr: string): number | null {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3] ? match[3].toUpperCase() : null;

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  // ---------------------------------------------------------------------------
  // 7. TASK HISTORY & DESCRIPTIVE ANALYTICS
  // ---------------------------------------------------------------------------

  public static getTaskHistorySummary(
    patientId: string,
    taskId: string
  ): TaskLifecycleHistorySummary | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const recurring = this.getRecurringTasks(effectiveId);
    const task = recurring.find((t) => t.id === taskId);
    if (!task) return null;

    const allInstances = this.getAllInstances(effectiveId).filter(
      (inst) => inst.recurringTaskId === taskId
    );

    let completed = 0;
    let completedWithHelp = 0;
    let snoozed = 0;
    let skipped = 0;
    let unconfirmed = 0;

    for (const inst of allInstances) {
      if (inst.status === 'completed') completed++;
      else if (inst.status === 'completed_assisted') completedWithHelp++;
      else if (inst.status === 'snoozed') snoozed++;
      else if (inst.status === 'skipped') skipped++;
      else if (inst.status === 'unconfirmed') unconfirmed++;
    }

    return {
      taskId,
      taskTitle: task.title,
      totalScheduled: allInstances.length,
      reportedCompleted: completed + completedWithHelp,
      reportedWithHelp: completedWithHelp,
      snoozedCount: snoozed,
      skippedCount: skipped,
      unconfirmedCount: unconfirmed,
      recentInstances: allInstances.slice(0, 14), // Last 14 days
    };
  }

  public static getDescriptiveInsights(patientId: string): DescriptiveTaskInsight[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const recurring = this.getRecurringTasks(effectiveId);
    const allInstances = this.getAllInstances(effectiveId);
    const insights: DescriptiveTaskInsight[] = [];

    // 1. Check for assistance patterns
    for (const task of recurring) {
      const taskInsts = allInstances.filter((i) => i.recurringTaskId === task.id);
      const assistedCount = taskInsts.filter((i) => i.status === 'completed_assisted').length;
      if (assistedCount >= 2) {
        insights.push({
          type: 'assistance_preferred',
          taskId: task.id,
          messageEn: `Assistance has often been comfortably chosen for "${task.title}".`,
          messageHi: `"${task.title}" के लिए अक्सर सहायता को आराम से चुना गया है।`,
          messageMr: `"${task.title}" साठी अनेकदा सहाय्य शांतपणे निवडले गेले आहे.`,
        });
      }
    }

    // 2. Check for morning completion pattern
    const morningCompleted = allInstances.filter(
      (i) => i.period === 'morning' && (i.status === 'completed' || i.status === 'completed_assisted')
    ).length;
    if (morningCompleted >= 3) {
      insights.push({
        type: 'frequent_completion',
        messageEn: 'Morning activities are usually reported as completed with steady calm.',
        messageHi: 'सुबह की गतिविधियाँ आमतौर पर स्थिरता और शांति के साथ पूरी दर्ज की गई हैं।',
        messageMr: 'सकाळच्या कृती सहसा स्थिरतेने आणि शांतपणे पूर्ण नोंदवल्या गेल्या आहेत.',
      });
    }

    // 3. Paused notice
    const paused = recurring.filter((t) => t.lifecycleStatus === 'paused');
    for (const p of paused) {
      insights.push({
        type: 'paused_notice',
        taskId: p.id,
        messageEn: `"${p.title}" is currently resting in paused state at your preference.`,
        messageHi: `"${p.title}" आपकी पसंद से इस समय रोकी गई अवस्था में है।`,
        messageMr: `"${p.title}" आपल्या पसंतीनुसार सध्या थांबवलेल्या स्थितीत आहे.`,
      });
    }

    return insights;
  }

  // ---------------------------------------------------------------------------
  // 8. ASHA CONVERSATIONAL INTEGRATION GROUNDING
  // ---------------------------------------------------------------------------

  public static getAshaGroundedTaskSummary(
    patientId: string,
    dateStr?: string
  ): {
    todayTotal: number;
    completedCount: number;
    inProgressCount: number;
    pendingCount: number;
    recommendedNext: DailyTaskInstance | null;
    activeTasks: { title: string; scheduledTime: string; status: TaskLifecycleStatus }[];
    pausedTasks: string[];
    archivedTasks: string[];
    inProgressTasks: string[];
    summaryText: string;
  } {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const todayInsts = this.getOrCreateTodayInstances(effectiveId, dateStr);
    const recurring = this.getRecurringTasks(effectiveId);

    const activeSessions = RoutineSessionService.getAllActiveSessions(effectiveId);
    const activeSessionRoutineIds = new Set(activeSessions.map((s) => s.routineId));

    const completed = todayInsts.filter(
      (i) => i.status === 'completed' || i.status === 'completed_assisted'
    );
    const inProgress = todayInsts.filter(
      (i) =>
        i.status === 'in_progress' ||
        (activeSessionRoutineIds.has(i.recurringTaskId) &&
          i.status !== 'completed' &&
          i.status !== 'completed_assisted')
    );
    const pending = todayInsts.filter(
      (i) =>
        (i.status === 'scheduled' || i.status === 'snoozed') &&
        !activeSessionRoutineIds.has(i.recurringTaskId)
    );

    // Prioritize medication task if incomplete
    const medPending = pending.find((i) => i.category === 'medication');
    const recommendedNext = medPending || inProgress[0] || pending[0] || null;

    const paused = recurring.filter((t) => t.lifecycleStatus === 'paused').map((t) => t.title);
    const archived = recurring.filter((t) => t.lifecycleStatus === 'archived').map((t) => t.title);

    const inProgressNames = inProgress.map((i) => i.title);
    const summaryText = `You have completed ${completed.length} task${completed.length === 1 ? '' : 's'} today. ${
      inProgressNames.length > 0 ? `${inProgressNames.length} task (${inProgressNames.join(', ')}) is currently in progress. ` : ''
    }${pending.length} remaining.`;

    return {
      todayTotal: todayInsts.length,
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      pendingCount: pending.length,
      recommendedNext,
      activeTasks: todayInsts.map((i) => ({
        title: i.title,
        scheduledTime: i.scheduledTime,
        status: activeSessionRoutineIds.has(i.recurringTaskId) && i.status !== 'completed' && i.status !== 'completed_assisted' ? 'in_progress' : i.status,
      })),
      pausedTasks: paused,
      archivedTasks: archived,
      inProgressTasks: inProgressNames,
      summaryText,
    };
  }
}
