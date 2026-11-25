import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  ReCaptchaEnterpriseProvider,
  CustomProvider,
  AppCheck
} from 'firebase/app-check';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * Resolves Firebase client configuration strictly from environment variables.
 * Under no circumstances does this fall back to hardcoded live production project credentials.
 */
export const getResolvedFirebaseConfig = (): FirebaseConfig => {
  return {
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
    authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
    storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
    messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
    appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
  };
};

export interface ConfigValidationResult {
  isValid: boolean;
  missingFields: string[];
}

/**
 * Validates that all required Firebase configuration parameters are explicitly supplied.
 */
export const validateFirebaseConfig = (config: FirebaseConfig): ConfigValidationResult => {
  const requiredFields: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingFields = requiredFields.filter(
    (field) => !config[field] || config[field].includes('placeholder')
  );
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

const rawConfig = getResolvedFirebaseConfig();
const validation = validateFirebaseConfig(rawConfig);

export const isFirebaseConfigured = validation.isValid;

// Explicitly safe initialization:
// If configuration is missing, fail safely without silently pointing to live production.
let app: FirebaseApp;

if (!getApps().length) {
  if (isFirebaseConfigured) {
    app = initializeApp(rawConfig);
  } else {
    // Fail safely in offline/unconfigured mode without live credentials
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(
        `[Saksham Firebase] Missing required Firebase configuration (${validation.missingFields.join(
          ', '
        )}). Operating in safe unconfigured mode. Production project will NOT be initialized.`
      );
    }
    app = initializeApp(
      {
        apiKey: 'unconfigured-safe-stub',
        authDomain: 'localhost',
        projectId: 'saksham-unconfigured',
        appId: '1:000000000000:web:0000000000000000000000',
      },
      'saksham-unconfigured'
    );
  }
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);

// Explicitly configure Firestore persistent local cache (IndexedDB) for robust offline operation
let firestoreDb: Firestore;
try {
  if (typeof window !== 'undefined' && 'indexedDB' in window) {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } else {
    firestoreDb = getFirestore(app);
  }
} catch {
  firestoreDb = getFirestore(app);
}

export const db: Firestore = firestoreDb;
export const storage: FirebaseStorage = getStorage(app);

// ============================================================================
// FIREBASE APP CHECK INTEGRATION
// ============================================================================

let appCheckInstance: AppCheck | null = null;

export const isAppCheckConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY &&
    !import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY.includes('placeholder')
);

export type AppCheckProviderType = 'enterprise' | 'v3';

export const getResolvedAppCheckProviderType = (explicit?: AppCheckProviderType): AppCheckProviderType => {
  if (explicit === 'enterprise' || explicit === 'v3') {
    return explicit;
  }
  const raw = (import.meta.env.VITE_FIREBASE_APPCHECK_PROVIDER || 'enterprise').trim().toLowerCase();
  return raw === 'v3' ? 'v3' : 'enterprise';
};

export interface InitAppCheckOptions {
  siteKey?: string;
  providerType?: AppCheckProviderType;
  isTokenAutoRefreshEnabled?: boolean;
  debugToken?: boolean | string;
  customProvider?: CustomProvider;
}

/**
 * Initializes Firebase App Check with reCAPTCHA Enterprise (Firebase recommended),
 * reCAPTCHA v3, or a custom provider.
 * Guarantees no production debug bypass and safe singleton initialization.
 */
export const initAppCheck = (options?: InitAppCheckOptions): AppCheck | null => {
  if (appCheckInstance) {
    return appCheckInstance;
  }

  // App Check requires an active browser DOM and configured Firebase instance
  if (!isFirebaseConfigured || typeof window === 'undefined') {
    return null;
  }

  const siteKey = options?.siteKey || import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey && !options?.customProvider) {
    if (import.meta.env.DEV && typeof console !== 'undefined' && console.info) {
      console.info(
        '[Saksham Firebase] App Check site key not present in environment; skipping App Check initialization.'
      );
    }
    return null;
  }

  // Strictly control debug tokens: only permitted in DEV, strictly prohibited in PROD
  if (import.meta.env.DEV && (options?.debugToken || import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN)) {
    const debugTokenVal = options?.debugToken ?? import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
    if (typeof self !== 'undefined') {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugTokenVal === 'true' ? true : debugTokenVal;
    }
  } else if (import.meta.env.PROD) {
    // Explicitly purge any debug token flag in production mode
    if (typeof self !== 'undefined' && (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN) {
      delete (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN;
    }
  }

  try {
    const providerType = getResolvedAppCheckProviderType(options?.providerType);
    const provider =
      options?.customProvider ||
      (providerType === 'enterprise'
        ? new ReCaptchaEnterpriseProvider(siteKey!)
        : new ReCaptchaV3Provider(siteKey!));
    appCheckInstance = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: options?.isTokenAutoRefreshEnabled ?? true,
    });
    return appCheckInstance;
  } catch (error) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[Saksham Firebase] App Check initialization notice:', error);
    }
    return null;
  }
};

// Auto-initialize if site key is available in environment
if (isFirebaseConfigured && isAppCheckConfigured && typeof window !== 'undefined') {
  initAppCheck();
}

export const getAppCheckInstance = (): AppCheck | null => appCheckInstance;

export default app;
