// WebAuthn / Passkeys Biometric Authentication Service
// -------------------------------------------------------------
// IMPORTANT SECURITY COMPLIANCE:
// 1. Never attempts to access or intercept raw biometric data.
// 2. Uses W3C WebAuthn standards (navigator.credentials) for Touch ID, Face ID, Windows Hello, & PIN.
// 3. Private keys and sensor captures remain strictly inside device Secure Enclave / TPM.
// 4. Stores only public key credential metadata in Firestore under users/{userId}/passkeys/{credentialId}.

import { savePasskey, getPasskeys } from '../firebase/db';

/**
 * Checks whether WebAuthn & Platform Authenticator are available in browser
 */
export async function checkWebAuthnSupport() {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    return { supported: false, platformBioAvailable: false };
  }
  let platformBioAvailable = false;
  if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
    try {
      platformBioAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch(e) {
      platformBioAvailable = false;
    }
  }
  return { supported: true, platformBioAvailable };
}

// ArrayBuffer <-> Base64URL conversion utilities
export function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlToBuffer(base64url) {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Register a new Device Passkey (Touch ID, Windows Hello, Face ID, or PIN)
 * Stored in Firestore users/{userId}/passkeys/{credentialId}
 */
export async function registerDevicePasskey({ userId, userName, userEmail }) {
  if (!userId) throw new Error('User must be authenticated to register a passkey.');

  const support = await checkWebAuthnSupport();
  if (!support.supported) {
    throw new Error('WebAuthn Passkeys are not supported on this browser or platform.');
  }

  // 1. Generate cryptographic 32-byte challenge
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  // 2. Prepare user ID buffer
  const encoder = new TextEncoder();
  const userIdBuffer = encoder.encode(userId);

  // 3. Build creation options
  const publicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "Personal Profile Secure Identity",
      id: window.location.hostname || "localhost"
    },
    user: {
      id: userIdBuffer,
      name: userEmail || userName || 'user@local',
      displayName: userName || 'Personal Profile User'
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },  // ES256 (standard)
      { alg: -257, type: "public-key" } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // Platform biometric sensor
      userVerification: "required",        // Biometric / PIN check required
      residentKey: "preferred"
    },
    timeout: 60000,
    attestation: "none"
  };

  // 4. Prompt device hardware biometric check (Touch ID / Face ID / Windows Hello)
  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions
  });

  if (!credential) {
    throw new Error('Passkey registration was cancelled or timed out.');
  }

  // 5. Extract safe public data
  const rawIdBase64 = bufferToBase64Url(credential.rawId);
  const credentialId = credential.id || rawIdBase64;

  let publicKeyBase64 = '';
  if (credential.response && credential.response.getPublicKey) {
    const pkBuffer = credential.response.getPublicKey();
    if (pkBuffer) publicKeyBase64 = bufferToBase64Url(pkBuffer);
  }
  if (!publicKeyBase64 && credential.response.attestationObject) {
    publicKeyBase64 = bufferToBase64Url(credential.response.attestationObject);
  }

  // 6. Save credential public metadata into Firestore: users/{userId}/passkeys/{credentialId}
  await savePasskey(userId, {
    credentialId,
    publicKey: publicKeyBase64,
    signCount: 0
  });

  return {
    success: true,
    credentialId,
    type: credential.type
  };
}

/**
 * Authenticate with Device Passkey
 * Prompts user's platform sensor (Fingerprint, Touch ID, Face ID, Windows Hello, PIN)
 */
export async function authenticateWithDevicePasskey(allowedCredentials = []) {
  const support = await checkWebAuthnSupport();
  if (!support.supported) {
    throw new Error('WebAuthn Passkeys are not supported on this browser.');
  }

  // 1. Generate challenge
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  // 2. Prepare allowCredentials list if specific passkeys are registered
  const allowList = allowedCredentials.map(c => ({
    id: typeof c === 'string' ? base64UrlToBuffer(c) : base64UrlToBuffer(c.credentialId),
    type: 'public-key',
    transports: ['internal']
  }));

  const publicKeyRequestOptions = {
    challenge,
    timeout: 60000,
    rpId: window.location.hostname || "localhost",
    userVerification: "required",
    ...(allowList.length > 0 ? { allowCredentials: allowList } : {})
  };

  // 3. Invoke native hardware sensor
  const assertion = await navigator.credentials.get({
    publicKey: publicKeyRequestOptions
  });

  if (!assertion) {
    throw new Error('Passkey authentication cancelled or timed out.');
  }

  const credentialId = assertion.id || bufferToBase64Url(assertion.rawId);

  return {
    success: true,
    credentialId,
    clientDataJSON: bufferToBase64Url(assertion.response.clientDataJSON),
    authenticatorData: bufferToBase64Url(assertion.response.authenticatorData),
    signature: bufferToBase64Url(assertion.response.signature)
  };
}
