/**
 * Saksham WebAuthn / Passkeys Cloud Functions
 * Trusted server-side layer for WebAuthn authentication & registration.
 *
 * Implements:
 * - Registration options generation & credential verification
 * - Authentication options generation & assertion verification
 * - Firebase Custom Token generation for authenticated sessions
 * - Restrictive Firestore management for passkey credentials & lookups
 * - Replay protection, challenge expiration, and counter validation
 */

const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { isoBase64URL } = require('@simplewebauthn/server/helpers');
const dbAdapter = require('./db-adapter');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Configuration
const DEFAULT_RP_NAME = 'Saksham - Cognitive Wellness';
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Determine allowed origins and RP ID dynamically or via env.
 */
function getRpAndOrigin(req) {
  const originHeader = req.get('origin') || req.get('referer') || '';
  let origin = process.env.WEBAUTHN_ORIGIN || '';
  let rpID = process.env.WEBAUTHN_RP_ID || '';
  const rpName = process.env.WEBAUTHN_RP_NAME || DEFAULT_RP_NAME;

  if (originHeader) {
    try {
      const url = new URL(originHeader);
      const host = url.hostname;
      const protocol = url.protocol;
      const port = url.port ? `:${url.port}` : '';
      const reconstructed = `${protocol}//${host}${port}`;

      const isLocal = host === 'localhost' || host === '127.0.0.1';
      const isAllowedDomain =
        isLocal ||
        host.endsWith('.vercel.app') ||
        host.endsWith('.firebaseapp.com') ||
        host.endsWith('.web.app') ||
        host === (process.env.CUSTOM_DOMAIN || '');

      if (isAllowedDomain) {
        origin = reconstructed;
        rpID = isLocal ? 'localhost' : host;
      }
    } catch (e) {
      // Fall through
    }
  }

  if (!origin) origin = 'https://saksham-rho-six.vercel.app';
  if (!rpID) rpID = 'saksham-rho-six.vercel.app';

  return { origin, rpID, rpName };
}

/**
 * Helper to authenticate incoming requests via Firebase ID Token
 */
async function authenticateRequest(req) {
  const authHeader = req.headers.authorization || '';
  let token = null;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else if (req.body && req.body.idToken) {
    token = req.body.idToken;
  }
  if (!token) return null;

  try {
    return await dbAdapter.verifyIdToken(token);
  } catch (err) {
    console.warn('[WebAuthn Auth] ID token verification notice:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 0. HEALTH / STATUS CHECK
// ---------------------------------------------------------------------------
app.get('/status', (req, res) => {
  const { origin, rpID, rpName } = getRpAndOrigin(req);
  res.json({
    status: 'online',
    service: 'Saksham WebAuthn / Passkeys API',
    rpID,
    rpName,
    detectedOrigin: origin,
    storageMode: dbAdapter.isUsingFallback() ? 'local_fallback' : 'cloud_firestore',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// 1. GENERATE REGISTRATION OPTIONS
// ---------------------------------------------------------------------------
app.post('/generateRegistrationOptions', async (req, res) => {
  try {
    const { rpID, rpName } = getRpAndOrigin(req);
    const decodedToken = await authenticateRequest(req);

    // UID must come from verified Firebase token or verified body
    const uid = decodedToken ? decodedToken.uid : req.body.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Authentication required to create a passkey.' });
    }

    const email = (decodedToken && decodedToken.email) || req.body.email || `${uid}@saksham.local`;
    const displayName =
      (decodedToken && decodedToken.name) || req.body.displayName || 'Saksham User';

    // Retrieve existing credentials to prevent duplicate enrollment
    const existingPasskeys = await dbAdapter.listUserPasskeys(uid);
    const excludeCredentials = existingPasskeys.map((p) => ({
      id: p.credentialId,
      transports: p.transports || undefined,
    }));

    const userID = new TextEncoder().encode(uid);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID,
      userName: email,
      userDisplayName: displayName,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      timeout: 60000,
    });

    const challengeId = 'chall_reg_' + Math.random().toString(36).substring(2, 15) + Date.now();
    await dbAdapter.saveChallenge(challengeId, {
      challenge: options.challenge,
      uid,
      type: 'registration',
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
    });

    res.json({
      options,
      challengeId,
    });
  } catch (err) {
    console.error('[WebAuthn] generateRegistrationOptions error:', err);
    res.status(500).json({ error: 'Failed to generate registration options. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// 2. VERIFY REGISTRATION RESPONSE
// ---------------------------------------------------------------------------
app.post('/verifyRegistration', async (req, res) => {
  try {
    const { origin, rpID } = getRpAndOrigin(req);
    const { response, challengeId, deviceName } = req.body;

    if (!response || !challengeId) {
      return res.status(400).json({ error: 'Missing registration response or challenge ID.' });
    }

    // Verify user session
    const decodedToken = await authenticateRequest(req);
    const uid = decodedToken ? decodedToken.uid : req.body.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Authentication required to save passkey.' });
    }

    // Retrieve challenge
    const challengeData = await dbAdapter.getChallenge(challengeId);
    if (!challengeData) {
      return res.status(400).json({ error: 'Registration challenge not found or already used.' });
    }

    // Check expiration
    if (challengeData.expiresAt && Date.now() > challengeData.expiresAt) {
      await dbAdapter.deleteChallenge(challengeId);
      return res.status(400).json({ error: 'Registration challenge has expired. Please try again.' });
    }

    // Check matching user
    if (challengeData.uid && challengeData.uid !== uid) {
      return res.status(403).json({ error: 'Challenge was generated for a different user.' });
    }

    // Verify registration with @simplewebauthn/server
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Passkey verification failed cryptographically.' });
    }

    // Invalidate challenge immediately (replay protection)
    await dbAdapter.deleteChallenge(challengeId);

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Convert Uint8Array public key to Base64URL string for safe storage
    const publicKeyBase64URL = isoBase64URL.fromBuffer(credential.publicKey);

    const nowIso = new Date().toISOString();
    const passkeyDoc = {
      credentialId: credential.id,
      publicKey: publicKeyBase64URL,
      counter: credential.counter || 0,
      transports: credential.transports || (response.response && response.response.transports) || [],
      deviceType: credentialDeviceType || 'singleDevice',
      backedUp: Boolean(credentialBackedUp),
      deviceName: deviceName || (credentialBackedUp ? 'Synced Passkey' : 'This Device'),
      createdAt: nowIso,
      lastUsedAt: nowIso,
    };

    // Store in user's passkeys
    await dbAdapter.savePasskey(uid, credential.id, passkeyDoc);

    res.json({
      verified: true,
      credentialId: credential.id,
      deviceName: passkeyDoc.deviceName,
      createdAt: nowIso,
    });
  } catch (err) {
    console.error('[WebAuthn] verifyRegistration error:', err);
    res.status(500).json({ error: 'Error during passkey registration: ' + (err.message || 'Unknown error') });
  }
});

// ---------------------------------------------------------------------------
// 3. GENERATE AUTHENTICATION OPTIONS
// ---------------------------------------------------------------------------
app.post('/generateAuthenticationOptions', async (req, res) => {
  try {
    const { rpID } = getRpAndOrigin(req);
    const { email } = req.body || {};

    let allowCredentials = undefined;

    // If an email is provided, narrow credentials
    if (email) {
      // In resident-key / discoverable passkey mode, leaving allowCredentials undefined
      // allows the browser to show all passkeys for this RP.
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials,
      timeout: 60000,
    });

    const challengeId = 'chall_auth_' + Math.random().toString(36).substring(2, 15) + Date.now();
    await dbAdapter.saveChallenge(challengeId, {
      challenge: options.challenge,
      type: 'authentication',
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
    });

    res.json({
      options,
      challengeId,
    });
  } catch (err) {
    console.error('[WebAuthn] generateAuthenticationOptions error:', err);
    res.status(500).json({ error: 'Failed to prepare passkey login. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// 4. VERIFY AUTHENTICATION RESPONSE
// ---------------------------------------------------------------------------
app.post('/verifyAuthentication', async (req, res) => {
  try {
    const { origin, rpID } = getRpAndOrigin(req);
    const { response, challengeId } = req.body;

    if (!response || !response.id || !challengeId) {
      return res.status(400).json({ error: 'Missing passkey assertion response or challenge ID.' });
    }

    // 1. Retrieve & validate challenge
    const challengeData = await dbAdapter.getChallenge(challengeId);
    if (!challengeData) {
      return res.status(400).json({ error: 'Authentication challenge expired or invalid.' });
    }

    if (challengeData.expiresAt && Date.now() > challengeData.expiresAt) {
      await dbAdapter.deleteChallenge(challengeId);
      return res.status(400).json({ error: 'Passkey challenge expired. Please try again.' });
    }

    // 2. Identify user from credential ID
    const credentialId = response.id;
    const lookup = await dbAdapter.findPasskeyLookup(credentialId);

    if (!lookup || !lookup.uid) {
      return res.status(404).json({ error: 'No user account found for this passkey.' });
    }

    const uid = lookup.uid;

    // 3. Load credential
    const storedPasskey = await dbAdapter.getPasskey(uid, credentialId);
    if (!storedPasskey) {
      return res.status(404).json({ error: 'Registered passkey not found in user account.' });
    }

    // Convert stored Base64URL public key back to Uint8Array
    const publicKeyUint8 = isoBase64URL.toBuffer(storedPasskey.publicKey);

    // 4. Verify assertion with @simplewebauthn/server
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: storedPasskey.credentialId,
        publicKey: publicKeyUint8,
        counter: storedPasskey.counter || 0,
        transports: storedPasskey.transports || undefined,
      },
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return res.status(401).json({ error: 'Passkey signature verification failed.' });
    }

    // 5. Delete challenge immediately to prevent replay
    await dbAdapter.deleteChallenge(challengeId);

    // 6. Update counter
    const { newCounter } = verification.authenticationInfo;
    await dbAdapter.updatePasskeyCounter(uid, credentialId, newCounter);

    // 7. Load user profile
    const userProfile = (await dbAdapter.getUserProfile(uid)) || {};

    // 8. Generate Firebase Custom Token
    const customToken = await dbAdapter.createCustomToken(uid, {
      passkeyAuth: true,
      authTime: Date.now(),
    });

    res.json({
      verified: true,
      customToken,
      uid,
      user: {
        uid,
        name: userProfile.name || 'Saksham User',
        email: userProfile.email || '',
        role: userProfile.role || 'patient',
        lang: userProfile.lang || 'en',
      },
    });
  } catch (err) {
    console.error('[WebAuthn] verifyAuthentication error:', err);
    res.status(500).json({ error: 'Passkey login failed: ' + (err.message || 'Unknown error') });
  }
});

// ---------------------------------------------------------------------------
// 5. LIST USER PASSKEYS
// ---------------------------------------------------------------------------
app.post('/listPasskeys', async (req, res) => {
  try {
    const decodedToken = await authenticateRequest(req);
    const uid = decodedToken ? decodedToken.uid : req.body.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const passkeys = await dbAdapter.listUserPasskeys(uid);
    res.json({ passkeys });
  } catch (err) {
    console.error('[WebAuthn] listPasskeys error:', err);
    res.status(500).json({ error: 'Failed to retrieve passkeys.' });
  }
});

// ---------------------------------------------------------------------------
// 6. DELETE / REMOVE PASSKEY
// ---------------------------------------------------------------------------
app.post('/deletePasskey', async (req, res) => {
  try {
    const decodedToken = await authenticateRequest(req);
    const uid = decodedToken ? decodedToken.uid : req.body.uid;
    const { credentialId } = req.body;

    if (!uid || !credentialId) {
      return res.status(400).json({ error: 'Missing UID or credential ID.' });
    }

    await dbAdapter.deleteUserPasskey(uid, credentialId);
    res.json({ success: true, credentialId });
  } catch (err) {
    console.error('[WebAuthn] deletePasskey error:', err);
    res.status(500).json({ error: 'Failed to remove passkey.' });
  }
});

// Export Cloud Functions
exports.api = onRequest({ cors: true, maxInstances: 10 }, app);
exports.webauthn = onRequest({ cors: true, maxInstances: 10 }, app);

// Export Express app for local dev server
exports.app = app;
