/**
 * First test suite — verifies the environment config module works correctly
 * and that the Firebase config shape matches what the SDK expects.
 *
 * Uses vi.stubEnv so Vitest intercepts import.meta.env lookups
 * before the module under test throws a missing-var error.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Stub all required env vars BEFORE importing the module under test.
// vi.stubEnv patches import.meta.env and is reset after each test.
beforeEach(() => {
  vi.stubEnv('VITE_FIREBASE_API_KEY',             'test-api-key');
  vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN',         'saksham-2b5f0.firebaseapp.com');
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID',          'saksham-2b5f0');
  vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET',      'saksham-2b5f0.appspot.com');
  vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '123456789');
  vi.stubEnv('VITE_FIREBASE_APP_ID',              'test-app-id');
  vi.stubEnv('VITE_API_BASE_URL',                 '/api');
  vi.stubEnv('VITE_FEATURE_WEBAUTHN',             'true');
  vi.stubEnv('VITE_FEATURE_VOICE',                'true');
  vi.stubEnv('VITE_FEATURE_FACE',                 'true');
});

describe('env config', () => {
  it('exports all required Firebase config keys', async () => {
    // Re-import fresh each time so stubs are in place
    vi.resetModules();
    const { env } = await import('@/config/env');

    const requiredKeys: Array<keyof typeof env.firebase> = [
      'apiKey',
      'authDomain',
      'projectId',
      'storageBucket',
      'messagingSenderId',
      'appId',
    ];

    for (const key of requiredKeys) {
      expect(env.firebase[key], `firebase.${key} should be defined`).toBeTruthy();
    }
  });

  it('has the correct project ID', async () => {
    vi.resetModules();
    const { env } = await import('@/config/env');
    expect(env.firebase.projectId).toBe('saksham-2b5f0');
  });

  it('feature flags default to true in test env', async () => {
    vi.resetModules();
    const { env } = await import('@/config/env');
    expect(env.features.webAuthn).toBe(true);
    expect(env.features.voiceAssist).toBe(true);
    expect(env.features.faceDetection).toBe(true);
  });

  it('apiBaseUrl falls back to /api', async () => {
    vi.resetModules();
    const { env } = await import('@/config/env');
    expect(env.apiBaseUrl).toBe('/api');
  });

  it('throws when a required env var is missing', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    await expect(import('@/config/env')).rejects.toThrow(
      'Missing required environment variable: VITE_FIREBASE_API_KEY'
    );
  });
});
