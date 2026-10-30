import { describe, it, expect } from 'vitest';
import { DEFAULT_TASKS } from '@/features/patient/patientService';

describe('Patient Service & Routine Defaults', () => {
  it('contains accessible default tasks covering medication, hydration, and exercises', () => {
    expect(DEFAULT_TASKS.length).toBeGreaterThanOrEqual(10);
    const labels = DEFAULT_TASKS.map((t) => t.label);
    expect(labels).toContain('Morning Medication');
    expect(labels).toContain('Hydration Check');
    expect(labels).toContain('Speech Exercise');
  });

  it('all default tasks start with pending status and valid icon', () => {
    DEFAULT_TASKS.forEach((task) => {
      expect(task.status).toBe('pending');
      expect(task.icon).toBeTruthy();
      expect(task.time).toMatch(/AM|PM/);
    });
  });
});
