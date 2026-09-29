/**
 * Database Adapter for Saksham WebAuthn Service
 *
 * Supports:
 * - Production: Google Cloud Firestore via Firebase Admin SDK
 * - Local Development: File-backed / In-Memory storage if ADC credentials are not present locally
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

let adminApp = null;
let firestoreDb = null;
let firebaseAuth = null;
let useLocalFallback = false;

// Local fallback store path
const LOCAL_DB_PATH = path.join(__dirname, '..', '.local_passkey_db.json');

function initFirebase() {
  if (adminApp) return;
  
  // Force local fallback if no GOOGLE_APPLICATION_CREDENTIALS in local dev
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FUNCTION_TARGET && !process.env.FUNCTIONS_EMULATOR) {
    console.log('[DB Adapter] No service account credentials found. Forcing local fallback.');
    useLocalFallback = true;
    return;
  }

  try {
    if (!getApps().length) {
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'saksham-2b5f0',
      });
    } else {
      adminApp = getApps()[0];
    }
    firestoreDb = getFirestore(adminApp);
    firebaseAuth = getAuth(adminApp);
  } catch (err) {
    console.warn('[DB Adapter] Firebase Admin init notice:', err.message);
    useLocalFallback = true;
  }
}

initFirebase();

// Local JSON File helpers
function loadLocalStore() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
    }
  } catch (e) {}
  return {
    challenges: {},
    users: {},
    passkey_lookups: {},
  };
}

function saveLocalStore(data) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('[DB Adapter] Error writing local store:', e.message);
  }
}

/**
 * Challenges Management
 */
async function saveChallenge(challengeId, data) {
  if (!useLocalFallback && firestoreDb) {
    try {
      await firestoreDb.collection('webauthn_challenges').doc(challengeId).set({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
      });
      return;
    } catch (err) {
      if (err.message && err.message.includes('default credentials')) {
        useLocalFallback = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback
  const store = loadLocalStore();
  store.challenges[challengeId] = {
    ...data,
    createdAt: Date.now(),
  };
  saveLocalStore(store);
}

async function getChallenge(challengeId) {
  if (!useLocalFallback && firestoreDb) {
    try {
      const snap = await firestoreDb.collection('webauthn_challenges').doc(challengeId).get();
      if (!snap.exists) return null;
      return snap.data();
    } catch (err) {
      if (err.message && err.message.includes('default credentials')) {
        useLocalFallback = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback
  const store = loadLocalStore();
  return store.challenges[challengeId] || null;
}

async function deleteChallenge(challengeId) {
  if (!useLocalFallback && firestoreDb) {
    try {
      await firestoreDb.collection('webauthn_challenges').doc(challengeId).delete();
      return;
    } catch (err) {
      if (err.message && err.message.includes('default credentials')) {
        useLocalFallback = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback
  const store = loadLocalStore();
  delete store.challenges[challengeId];
  saveLocalStore(store);
}

/**
 * Passkeys Management
 */
async function savePasskey(uid, credentialId, passkeyDoc) {
  if (!useLocalFallback && firestoreDb) {
    try {
      // 1. users/{uid}/passkeys/{credentialId}
      await firestoreDb.collection('users').doc(uid).collection('passkeys').doc(credentialId).set(passkeyDoc);
      // 2. passkey_lookups/{credentialId}
      await firestoreDb.collection('passkey_lookups').doc(credentialId).set({
        uid,
        credentialId,
        createdAt: passkeyDoc.createdAt || new Date().toISOString(),
      });
      // 3. Mark passkeyEnabled on user document
      await firestoreDb.collection('users').doc(uid).set(
        {
          passkeyEnabled: true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return;
    } catch (err) {
      if (err.message && err.message.includes('default credentials')) {
        useLocalFallback = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback
  const store = loadLocalStore();
  if (!store.users[uid]) store.users[uid] = { passkeys: {}, profile: { uid } };
  if (!store.users[uid].passkeys) store.users[uid].passkeys = {};

  store.users[uid].passkeys[credentialId] = passkeyDoc;
  store.users[uid].profile.passkeyEnabled = true;
  store.passkey_lookups[credentialId] = { uid, credentialId, createdAt: passkeyDoc.createdAt };
  saveLocalStore(store);
}

async function getPasskey(uid, credentialId) {
  if (!useLocalFallback && firestoreDb) {
    try {
      const snap = await firestoreDb.collection('users').doc(uid).collection('passkeys').doc(credentialId).get();
      if (!snap.exists) return null;
      return snap.data();
    } catch (err) {
      if (err.message && err.message.includes('default credentials')) {
        useLocalFallback = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback
  const store = loadLocalStore();
  if (store.users[uid] && store.users[uid].passkeys) {
    return store.users[uid].passkeys[credentialId] || null;
  }
  return null;
}

async function updatePasskeyCounter(uid, credentialId, newCounter) {
  const lastUsedAt = new Date().toISOString();
  if (!useLocalFallback && firestoreDb) {
    try {
      await firestoreDb.collection('users').doc(uid).collection('passkeys').doc(credentialId).update({
        counter: newCounter,
        lastUsedAt,
      });
      return;
    } catch (err) {
      if (err.message && err.message.includes('default credentials')) {
        useLocalFallback = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback
  const store = loadLocalStore();
  if (store.users[uid] && store.users[uid].passkeys && store.users[uid].passkeys[credentialId]) {
    store.users[uid].passkeys[credentialId].counter = newCounter;
    store.users[uid].passkeys[credentialId].lastUsedAt = lastUsedAt;
    saveLocalStore(store);
  }
}

async function findPasskeyLookup(credentialId) {
  if (!useLocalFallback && firestoreDb) {
    try {
      const snap = await firestoreDb.collection('passkey_lookups').doc(credentialId).get();
      if (snap.exists) {
        return snap.data();
      }
      // Fallback query across collection group
      const cgSnap = await firestoreDb.collectionGroup('passkeys').where('credentialId', '==', credentialId).limit(1).get();
      if (!cgSnap.empty) {
        const passDoc = cgSnap.docs[0];
        const parentUser = passDoc.ref.parent.parent;
        if (parentUser) return { uid: parentUser.id, credentialId };
      }
      return null;
    } catch (err) {
      if (err.message && err.message.includes('default credentials')) {
        useLocalFallback = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback
  const store = loadLocalStore();
  return store.passkey_lookups[credentialId] || null;
}

async function listUserPasskeys(uid) {
  if (!useLocalFallback && firestoreDb) {
    try {
      const snap = await firestoreDb.collection('users').doc(uid).collection('passkeys').get();
      const list = [];
      snap.forEach((doc) => {
        const data = doc.data();
        list.push({
          credentialId: data.credentialId,
          deviceName: data.deviceName || 'This Device',
          createdAt: data.createdAt,
          lastUsedAt: data.lastUsedAt,
          backedUp: data.backedUp || false,
        });
      });
      return list;
    } catch (err) {
      if (err.message && err.message.includes('default credentials')) {
        useLocalFallback = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback
  const store = loadLocalStore();
  if (store.users[uid] && store.users[uid].passkeys) {
    return Object.values(store.users[uid].passkeys).map((p) => ({
      credentialId: p.credentialId,
      deviceName: p.deviceName || 'This Device',
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt,
      backedUp: p.backedUp || false,
    }));
  }
  return [];
}

async function deleteUserPasskey(uid, credentialId) {
  if (!useLocalFallback && firestoreDb) {
    try {
      await firestoreDb.collection('users').doc(uid).collection('passkeys').doc(credentialId).delete();
      await firestoreDb.collection('passkey_lookups').doc(credentialId).delete();

      const remSnap = await firestoreDb.collection('users').doc(uid).collection('passkeys').limit(1).get();
      if (remSnap.empty) {
        await firestoreDb.collection('users').doc(uid).set({ passkeyEnabled: false }, { merge: true });
      }
      return true;
    } catch (err) {
      if (err.message && err.message.includes('default credentials')) {
        useLocalFallback = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback
  const store = loadLocalStore();
  if (store.users[uid] && store.users[uid].passkeys) {
    delete store.users[uid].passkeys[credentialId];
    if (Object.keys(store.users[uid].passkeys).length === 0) {
      if (store.users[uid].profile) store.users[uid].profile.passkeyEnabled = false;
    }
  }
  delete store.passkey_lookups[credentialId];
  saveLocalStore(store);
  return true;
}

async function getUserProfile(uid) {
  if (!useLocalFallback && firestoreDb) {
    try {
      const snap = await firestoreDb.collection('users').doc(uid).get();
      if (snap.exists) return snap.data();
    } catch (err) {
      if (err.message && err.message.includes('default credentials')) {
        useLocalFallback = true;
      }
    }
  }

  // Fallback
  const store = loadLocalStore();
  if (store.users[uid] && store.users[uid].profile) {
    return store.users[uid].profile;
  }
  return null;
}

async function saveUserProfile(uid, profile) {
  if (!useLocalFallback && firestoreDb) {
    try {
      await firestoreDb.collection('users').doc(uid).set(profile, { merge: true });
      return;
    } catch (err) {
      if (err.message && err.message.includes('default credentials')) {
        useLocalFallback = true;
      }
    }
  }

  // Fallback
  const store = loadLocalStore();
  if (!store.users[uid]) store.users[uid] = { passkeys: {}, profile: {} };
  store.users[uid].profile = { ...store.users[uid].profile, ...profile };
  saveLocalStore(store);
}

/**
 * Custom Token Creation
 */
async function createCustomToken(uid, claims = {}) {
  if (!useLocalFallback && firebaseAuth) {
    try {
      return await firebaseAuth.createCustomToken(uid, claims);
    } catch (err) {
      console.warn('[DB Adapter] createCustomToken fallback notice:', err.message);
    }
  }
  // Safe local dev token
  return `dev_custom_token_${uid}_${Date.now()}`;
}

/**
 * Verify ID Token
 */
async function verifyIdToken(token) {
  if (!useLocalFallback && firebaseAuth) {
    try {
      return await firebaseAuth.verifyIdToken(token);
    } catch (err) {
      console.warn('[DB Adapter] verifyIdToken notice:', err.message);
    }
  }
  // Local development / fallback check
  if (token && token.startsWith('dev_token_')) {
    const parts = token.split('_');
    return { uid: parts[2] || 'dev_user' };
  }
  return null;
}

module.exports = {
  saveChallenge,
  getChallenge,
  deleteChallenge,
  savePasskey,
  getPasskey,
  updatePasskeyCounter,
  findPasskeyLookup,
  listUserPasskeys,
  deleteUserPasskey,
  getUserProfile,
  saveUserProfile,
  createCustomToken,
  verifyIdToken,
  isUsingFallback: () => useLocalFallback,
};
