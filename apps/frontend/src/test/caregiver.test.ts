import { describe, it, expect } from 'vitest';
import { fetchLinkedPatients } from '@/features/caregiver/caregiverService';

describe('Caregiver Service', () => {
  it('returns fallback demonstration patient when no links exist', async () => {
    const patients = await fetchLinkedPatients('cg-test-123', 'caregiver@test.com');
    expect(patients.length).toBeGreaterThan(0);
    expect(patients[0]?.email).toBe('patient@saksham.care');
    expect(patients[0]?.condition).toBe('parkinsons');
  });
});
