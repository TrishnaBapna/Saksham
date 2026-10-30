import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    getDocs: vi.fn().mockResolvedValue({ docs: [], empty: true }),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    setDoc: vi.fn().mockResolvedValue(undefined),
    onSnapshot: vi.fn().mockReturnValue(() => {}),
  };
});

import { fetchLinkedPatients } from '@/features/caregiver/caregiverService';

describe('Caregiver Service', () => {
  it('returns fallback demonstration patient when no links exist', async () => {
    const patients = await fetchLinkedPatients('cg-test-123', 'caregiver@test.com');
    expect(patients.length).toBeGreaterThan(0);
    expect(patients[0]?.email).toBe('patient@saksham.care');
    expect(patients[0]?.condition).toBe('parkinsons');
  });
});
