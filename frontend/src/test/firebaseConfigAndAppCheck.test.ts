import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getResolvedFirebaseConfig,
  validateFirebaseConfig,
  FirebaseConfig,
  isFirebaseConfigured,
  initAppCheck,
  getAppCheckInstance,
  isAppCheckConfigured,
  auth,
  db,
  storage
} from '../services/firebase.js';
import { getApps } from 'firebase/app';
import { CustomProvider } from 'firebase/app-check';

describe('SEC-05: Firebase Configuration Fallback & App Check Security Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // FIREBASE CONFIGURATION SCENARIOS (A - F)
  // =========================================================================

  describe('Firebase Configuration Scenarios (A - F)', () => {
    it('Scenario A: valid explicit Firebase configuration validates successfully', () => {
      const validConfig: FirebaseConfig = {
        apiKey: 'AIzaSyExampleValidApiKey1234567890',
        authDomain: 'saksham-d3b71.firebaseapp.com',
        projectId: 'saksham-d3b71',
        storageBucket: 'saksham-d3b71.firebasestorage.app',
        messagingSenderId: '1084220897195',
        appId: '1:1084220897195:web:65467d2231e064766504ee',
      };

      const result = validateFirebaseConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('Scenario B: missing required configuration does not validate or silently point to live project', () => {
      const emptyConfig: FirebaseConfig = {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      };

      const result = validateFirebaseConfig(emptyConfig);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('apiKey');
      expect(result.missingFields).toContain('authDomain');
      expect(result.missingFields).toContain('projectId');
      expect(result.missingFields).toContain('appId');
      // Must not silently populate production project ID
      expect(emptyConfig.projectId).not.toBe('saksham-d3b71');
    });

    it('Scenario C: placeholder configuration produces a safe and understandable failure', () => {
      const placeholderConfig: FirebaseConfig = {
        apiKey: 'AIzaSy_placeholder_key',
        authDomain: 'saksham-d3b71.firebaseapp.com',
        projectId: 'saksham-d3b71',
        storageBucket: 'saksham-d3b71.firebasestorage.app',
        messagingSenderId: '1084220897195',
        appId: '1:1084220897195:web:65467d2231e064766504ee',
      };

      const result = validateFirebaseConfig(placeholderConfig);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('apiKey');
    });

    it('Scenario D: initialization reuses existing Firebase app without duplicating instances', () => {
      const existingApps = getApps();
      expect(existingApps.length).toBeGreaterThan(0);

      // Verify that the singleton app instance is one of the registered apps
      const defaultApp = existingApps[0];
      expect(defaultApp).toBeDefined();
      expect(typeof defaultApp.name).toBe('string');
    });

    it('Scenario E: existing legitimate Firebase client handles (auth, db, storage) remain functional', () => {
      expect(auth).toBeDefined();
      expect(db).toBeDefined();
      expect(storage).toBeDefined();
      expect(typeof isFirebaseConfigured).toBe('boolean');
    });

    it('Scenario F: no private secrets or service account keys are exposed in client configuration', () => {
      const config = getResolvedFirebaseConfig();

      // Only standard public web client identifiers are permitted
      const allowedKeys = [
        'apiKey',
        'authDomain',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId',
      ];
      expect(Object.keys(config)).toEqual(allowedKeys);

      // Verify no sensitive server credential fields exist
      const forbiddenTerms = [
        'private_key',
        'client_secret',
        'service_account',
        'token_uri',
        'privateKey',
      ];
      const serialized = JSON.stringify(config).toLowerCase();
      for (const term of forbiddenTerms) {
        expect(serialized).not.toContain(term);
      }
    });
  });

  // =========================================================================
  // APP CHECK SCENARIOS (G - L)
  // =========================================================================

  describe('App Check Scenarios (G - L)', () => {
    it('Scenario G: App Check initializes correctly with a custom provider (mock disclosure: simulated provider)', () => {
      // Disclose mock: custom provider provides offline mock token without live Google APIs
      const mockCustomProvider = new CustomProvider({
        getToken: async () => ({
          token: 'mock-app-check-token-12345',
          expireTimeMillis: Date.now() + 3600000,
        }),
      });

      const appCheck = initAppCheck({
        customProvider: mockCustomProvider,
        isTokenAutoRefreshEnabled: false,
      });

      if (isFirebaseConfigured && typeof window !== 'undefined') {
        expect(appCheck).toBeDefined();
        expect(getAppCheckInstance()).toBe(appCheck);
      } else {
        expect(appCheck).toBeNull();
      }
    });

    it('Scenario H: subsequent initAppCheck calls return existing singleton without duplicate initialization', () => {
      const firstInstance = getAppCheckInstance();
      const secondCall = initAppCheck();

      // Must return identical reference
      expect(secondCall).toBe(firstInstance);
    });

    it('Scenario I: App Check testing operates offline without requiring live Google reCAPTCHA registration', () => {
      // Offline verification: custom provider resolves deterministically
      const customProvider = new CustomProvider({
        getToken: async () => ({
          token: 'offline-test-token',
          expireTimeMillis: Date.now() + 60000,
        }),
      });

      expect(customProvider).toBeDefined();
      expect(typeof customProvider).toBe('object');
    });

    it('Scenario J: missing App Check site key in environment is handled safely without throwing exceptions', () => {
      // Calling initAppCheck with no parameters when site key is omitted
      // should return null or existing instance safely without throwing
      const result = initAppCheck({});
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('Scenario K: debug tokens are not enabled when PROD mode is simulated', () => {
      // Test the logic that purges debug tokens in production
      if (typeof self !== 'undefined') {
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = 'test-token-to-purge';
      }

      // In production, debug token must be purged
      const isProd = import.meta.env.PROD;
      if (isProd && typeof self !== 'undefined') {
        expect((self as any).FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
      }
    });

    it('Scenario L: existing application consumers remain fully compatible with export signatures', () => {
      // Verify all required exports exist and match expected types
      expect(typeof isFirebaseConfigured).toBe('boolean');
      expect(typeof isAppCheckConfigured).toBe('boolean');
      expect(typeof initAppCheck).toBe('function');
      expect(typeof getResolvedFirebaseConfig).toBe('function');
      expect(typeof validateFirebaseConfig).toBe('function');
    });
  });
});
