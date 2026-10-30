import admin from 'firebase-admin';

let initialized = false;

export function getFirebaseAdminApp(): admin.app.App {
  if (initialized && admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'saksham-2b5f0';

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(creds),
        projectId,
      });
    } catch {
      admin.initializeApp({ projectId });
    }
  } else {
    admin.initializeApp({ projectId });
  }

  initialized = true;
  return admin.app();
}

export function getAdminAuth(): admin.auth.Auth {
  getFirebaseAdminApp();
  return admin.auth();
}

export function getAdminFirestore(): admin.firestore.Firestore {
  getFirebaseAdminApp();
  return admin.firestore();
}
