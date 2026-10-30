/**
 * Typed environment variable access.
 * All VITE_* variables must be present in .env.local (never committed).
 * Throws at startup if any required var is missing.
 */

function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `[Saksham] Missing required environment variable: ${key}\n` +
      `Copy apps/frontend/.env.example to apps/frontend/.env.local and fill in the values.`
    );
  }
  return value as string;
}

function optionalEnv(key: string, fallback = ''): string {
  return (import.meta.env[key] as string | undefined) ?? fallback;
}

export const env = {
  // Firebase
  firebase: {
    apiKey:            requireEnv('VITE_FIREBASE_API_KEY'),
    authDomain:        requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId:         requireEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket:     requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId:             requireEnv('VITE_FIREBASE_APP_ID'),
    measurementId:     optionalEnv('VITE_FIREBASE_MEASUREMENT_ID'),
  },

  // Backend API (optional — only used when backend Express server is running)
  apiBaseUrl: optionalEnv('VITE_API_BASE_URL', '/api'),

  // Feature flags
  features: {
    webAuthn:      optionalEnv('VITE_FEATURE_WEBAUTHN', 'true') === 'true',
    voiceAssist:   optionalEnv('VITE_FEATURE_VOICE', 'true') === 'true',
    faceDetection: optionalEnv('VITE_FEATURE_FACE', 'true') === 'true',
  },

  // Build info
  isDev:  import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode:   import.meta.env.MODE,
} as const;
