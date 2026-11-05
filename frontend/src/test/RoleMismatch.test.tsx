import { describe, it, expect } from 'vitest';
import { verifyRoleMatch } from '../features/auth/services/roleService.js';
import { AuthService } from '../features/auth/services/authService.js';

describe('Strict Role-Based Access Control (RBAC) & Portal Mismatch Prevention', () => {
  it('allows access when verified role matches selected portal', () => {
    expect(verifyRoleMatch('patient', 'patient').matches).toBe(true);
    expect(verifyRoleMatch('caregiver', 'caregiver').matches).toBe(true);
    expect(verifyRoleMatch('doctor', 'doctor').matches).toBe(true);
    expect(verifyRoleMatch('admin', 'admin').matches).toBe(true);
  });

  it('rejects cross-role login and generates clear mismatch message', () => {
    const check1 = verifyRoleMatch('caregiver', 'doctor');
    expect(check1.matches).toBe(false);
    expect(check1.mismatchMessage).toContain('Account Role Mismatch');
    expect(check1.mismatchMessage).toContain('Caregiver');
    expect(check1.mismatchMessage).toContain('Doctor');

    const check2 = verifyRoleMatch('patient', 'admin');
    expect(check2.matches).toBe(false);
    expect(check2.mismatchMessage).toContain('Patient');
  });

  it('rejects pending doctor login from accessing doctor dashboard', async () => {
    await expect(
      AuthService.signIn('doctor.pending@saksham.care', 'password123', 'doctor')
    ).rejects.toThrow(/PENDING administrative approval/i);
  });

  it('blocks caregiver from signing in through doctor portal', async () => {
    await expect(
      AuthService.signIn('caregiver@saksham.care', 'password123', 'doctor')
    ).rejects.toThrow(/Account Role Mismatch/i);
  });
});
