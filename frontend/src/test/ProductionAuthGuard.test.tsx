import { describe, it, expect } from 'vitest';
import { AuthService } from '../features/auth/services/authService.js';

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
});
