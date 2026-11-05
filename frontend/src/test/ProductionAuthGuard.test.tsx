import { describe, it, expect } from 'vitest';
import { AuthService } from '../features/auth/services/authService.js';
import { getUserRoleRecord } from '../features/auth/services/roleService.js';

describe('Production Authentication Security Hardening', () => {
  it('strictly blocks demo authentication when DEV environment is false', () => {
    // Temporarily simulate production environment
    const originalDev = import.meta.env.DEV;
    // @ts-ignore
    import.meta.env.DEV = false;

    try {
      expect(() => {
        AuthService.simulateDemoSignIn('patient@saksham.care', 'password123', 'patient');
      }).toThrow(/Demo authentication is strictly disabled in production/i);
    } finally {
      // @ts-ignore
      import.meta.env.DEV = originalDev;
    }
  });

  it('never silently falls back to demo login when real Firebase authentication fails', async () => {
    // When an unknown email is submitted, it should throw an invalid credentials error
    // and NOT fall back to any mock user
    await expect(
      AuthService.signIn('nonexistent.user@randomdomain.com', 'somepassword', 'patient')
    ).rejects.toThrow(/Invalid email address or password|failed/i);
  });

  it('strictly denies fallback to DEMO_USERS role profile in production mode', async () => {
    const originalDev = import.meta.env.DEV;
    // @ts-ignore
    import.meta.env.DEV = false;

    try {
      const mockFirebaseUser = {
        uid: 'live-firebase-uid-999',
        email: 'admin@saksham.care', // Demo email used in production
        displayName: 'Test User',
        photoURL: null,
        phoneNumber: null,
        getIdTokenResult: async () => ({ claims: {} }),
      } as any;

      const profile = await getUserRoleRecord(mockFirebaseUser);
      // In production without Firestore record or custom claim, it MUST NOT assign admin role!
      expect(profile.role).not.toBe('admin');
      expect(profile.role).toBe('patient'); // Safe least privilege
    } finally {
      // @ts-ignore
      import.meta.env.DEV = originalDev;
    }
  });
});
