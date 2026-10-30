import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    getDocs: vi.fn().mockResolvedValue({ docs: [], empty: true }),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
    setDoc: vi.fn().mockResolvedValue(undefined),
    onSnapshot: vi.fn().mockReturnValue(() => {}),
  };
});

import { fetchAssignedPatients, fetchLongitudinalTelemetry } from '@/features/doctor/doctorService';

describe('Doctor Clinical Service', () => {
  it('returns assigned patient cohort or clinical fallback', async () => {
    const patients = await fetchAssignedPatients('dr-uid-100', 'doctor@hospital.org');
    expect(patients.length).toBeGreaterThan(0);
    expect(patients[0]?.name).toBe('Suresh Verma');
    expect(patients[0]?.condition).toBe('parkinsons');
  });

  it('fetches longitudinal telemetry records for tremor and acoustic speech', async () => {
    const records = await fetchLongitudinalTelemetry('SAK-PT-8842');
    expect(records.length).toBeGreaterThan(0);
    expect(records[0]?.speechDb).toBeGreaterThan(50);
    expect(records[0]?.tremorAmplitudeCm).toBeDefined();
  });
});
