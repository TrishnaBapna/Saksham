import { describe, it, expect, beforeEach } from 'vitest';
import {
  offlineSyncService,
  getOfflineAIAssistanceResponse,
} from '@/services/offlineSyncService';

describe('Module 5: Offline-First Operation & Queue', () => {
  const userId = 'offline_user_99';

  beforeEach(() => {
    offlineSyncService.clearQueueForTesting();
  });

  it('enqueues local changes with pending status and retry metadata', () => {
    const op = offlineSyncService.enqueueOperation(
      userId,
      'task',
      'update',
      { taskId: 1, status: 'done' },
      'op_test_1',
      false // test queued state before background sync executes
    );

    expect(op.operationId).toBe('op_test_1');
    expect(op.status).toBe('pending');
    expect(op.retryCount).toBe(0);
    expect(op.maxRetries).toBe(5);

    const queue = offlineSyncService.getQueue(userId);
    expect(queue.some((q) => q.operationId === 'op_test_1')).toBe(true);
  });

  it('prevents duplicate operations with the same operationId and userId', () => {
    offlineSyncService.enqueueOperation(userId, 'task', 'update', { status: 'done' }, 'same_op_id');
    offlineSyncService.enqueueOperation(userId, 'task', 'update', { status: 'done_v2' }, 'same_op_id');

    const queue = offlineSyncService.getQueue(userId).filter((o) => o.operationId === 'same_op_id');
    expect(queue).toHaveLength(1);
    expect((queue[0].data as { status: string }).status).toBe('done_v2');
  });

  it('returns deterministic offline AI guidance without external API dependency', () => {
    const teaGuide = getOfflineAIAssistanceResponse('How do I take my herbal tea?');
    expect(teaGuide).toContain('warm herbal tea');

    const dressGuide = getOfflineAIAssistanceResponse('I have trouble with shirt buttons');
    expect(dressGuide).toContain('shirt flat');

    const walkGuide = getOfflineAIAssistanceResponse('My feet feel frozen to the floor');
    expect(walkGuide).toContain('Stand tall');
  });
});
