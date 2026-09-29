/* ======================================================================= */
/* SAKSHAM WEBAUTHN / PASSKEYS FRONTEND SERVICE                            */
/* Web-only implementation using navigator.credentials.create/get          */
/* No fingerprint images, face data, or biometric templates are accessed.  */
/* The browser/OS handles device biometric verification entirely.          */
/* ======================================================================= */

window.SakshamPasskey = (function () {

  /* ------------------------------------------------------------------ */
  /* CONFIGURATION                                                        */
  /* ------------------------------------------------------------------ */

  // Determine the API base URL from the current page origin
  function _getApiBase() {
    const origin = window.location.origin;
    // When running under our local server.js (port 3000) or any host,
    // API is mounted at /api
    return origin + '/api';
  }

  /* ------------------------------------------------------------------ */
  /* SUPPORT DETECTION                                                    */
  /* ------------------------------------------------------------------ */

  function isSupported() {
    return Boolean(
      window.PublicKeyCredential &&
      typeof navigator.credentials?.create === 'function' &&
      typeof navigator.credentials?.get === 'function'
    );
  }

  async function isPlatformAuthenticatorAvailable() {
    if (!isSupported()) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* INTERNAL HELPERS                                                     */
  /* ------------------------------------------------------------------ */

  // Convert a base64url string to a Uint8Array (for WebAuthn challenge/id fields)
  function _base64urlToBuffer(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  // Convert an ArrayBuffer/Uint8Array to a base64url string (for sending to server)
  function _bufferToBase64url(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // Transform the server's registration options so the browser can use them.
  // The server returns challenge/id fields as base64url strings; WebAuthn API
  // requires them as ArrayBuffers.
  function _prepareRegistrationOptions(options) {
    return {
      ...options,
      challenge: _base64urlToBuffer(options.challenge),
      user: {
        ...options.user,
        id: _base64urlToBuffer(options.user.id),
      },
      excludeCredentials: (options.excludeCredentials || []).map(c => ({
        ...c,
        id: _base64urlToBuffer(c.id),
      })),
    };
  }

  // Transform the server's authentication options so the browser can use them.
  function _prepareAuthenticationOptions(options) {
    return {
      ...options,
      challenge: _base64urlToBuffer(options.challenge),
      allowCredentials: (options.allowCredentials || []).map(c => ({
        ...c,
        id: _base64urlToBuffer(c.id),
      })),
    };
  }

  // Serialize a PublicKeyCredential (registration) for sending to the server.
  function _serializeRegistrationCredential(cred) {
    const response = cred.response;
    return {
      id: cred.id,
      rawId: _bufferToBase64url(cred.rawId),
      type: cred.type,
      response: {
        attestationObject: _bufferToBase64url(response.attestationObject),
        clientDataJSON: _bufferToBase64url(response.clientDataJSON),
        transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
      },
      clientExtensionResults: cred.getClientExtensionResults
        ? cred.getClientExtensionResults()
        : {},
    };
  }

  // Serialize a PublicKeyCredential (authentication) for sending to the server.
  function _serializeAuthenticationCredential(cred) {
    const response = cred.response;
    return {
      id: cred.id,
      rawId: _bufferToBase64url(cred.rawId),
      type: cred.type,
      response: {
        authenticatorData: _bufferToBase64url(response.authenticatorData),
        clientDataJSON: _bufferToBase64url(response.clientDataJSON),
        signature: _bufferToBase64url(response.signature),
        userHandle: response.userHandle ? _bufferToBase64url(response.userHandle) : null,
      },
      clientExtensionResults: cred.getClientExtensionResults
        ? cred.getClientExtensionResults()
        : {},
    };
  }

  // Get Firebase ID token for authenticated API requests (if user is logged in)
  async function _getIdToken() {
    try {
      if (window.firebase && firebase.auth) {
        const currentUser = firebase.auth().currentUser;
        if (currentUser) return await currentUser.getIdToken();
      }
    } catch (e) {}
    return null;
  }

  // Sign into Firebase using the custom token returned by the backend
  async function _signInWithCustomToken(customToken, uid) {
    // Detect development token (no real Firebase service account)
    if (customToken && customToken.startsWith('dev_custom_token_')) {
      console.log('[Passkey] Local dev mode: custom token is a dev placeholder. Skipping Firebase signIn.');
      return { uid };
    }

    try {
      if (window.firebase && firebase.auth) {
        const userCred = await firebase.auth().signInWithCustomToken(customToken);
        return userCred.user;
      }
    } catch (err) {
      console.warn('[Passkey] signInWithCustomToken notice:', err.message);
    }
    return { uid };
  }

  // POST helper
  async function _post(path, body) {
    const idToken = await _getIdToken();
    const headers = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

    const res = await fetch(_getApiBase() + path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error(`API endpoint unavailable (${res.status})`);
    }

    if (!res.ok) {
      throw new Error(data.error || `Server error ${res.status}`);
    }
    return data;
  }

  /* ------------------------------------------------------------------ */
  /* 1. REGISTRATION — create a new passkey for the authenticated user   */
  /* ------------------------------------------------------------------ */

  /**
   * Register a new passkey for the currently signed-in Firebase user.
   * @param {object} user - { firebaseUid, email, name }
   * @param {string} [deviceName] - friendly label for this passkey
   * @returns {Promise<{credentialId, deviceName, createdAt}>}
   */
  async function registerPasskey(user, deviceName) {
    if (!isSupported()) {
      throw new Error('Passkeys are not supported in this browser.');
    }

    const uid = user.firebaseUid || user.uid || user.id;
    if (!uid) throw new Error('No authenticated user UID available.');

    // 1. Get registration options from backend
    const { options, challengeId } = await _post('/generateRegistrationOptions', {
      uid,
      email: user.email,
      displayName: user.name,
    });

    // 2. Prepare options for the WebAuthn API
    const publicKeyOptions = _prepareRegistrationOptions(options);

    // 3. Trigger browser/OS native UI (fingerprint, Face ID, Windows Hello, PIN…)
    let credential;
    try {
      credential = await navigator.credentials.create({ publicKey: publicKeyOptions });
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Passkey creation was cancelled.');
      }
      if (err.name === 'InvalidStateError') {
        throw new Error('A passkey for this account already exists on this device.');
      }
      throw new Error('Passkey creation failed: ' + err.message);
    }

    if (!credential) throw new Error('No passkey credential returned by browser.');

    // 4. Serialize and send to backend for cryptographic verification
    const serialized = _serializeRegistrationCredential(credential);
    const result = await _post('/verifyRegistration', {
      response: serialized,
      challengeId,
      uid,
      deviceName: deviceName || _getDefaultDeviceName(),
    });

    return result;
  }

  /* ------------------------------------------------------------------ */
  /* 2. AUTHENTICATION — sign in using an existing passkey               */
  /* ------------------------------------------------------------------ */

  /**
   * Authenticate with a passkey and return a Firebase session.
   * @param {string} [email] - optional email hint to narrow credential list
   * @returns {Promise<{uid, user, firebaseUser}>}
   */
  async function loginWithPasskey(email) {
    if (!isSupported()) {
      throw new Error('Passkeys are not supported in this browser.');
    }

    // 1. Get authentication options (fresh challenge) from backend
    const { options, challengeId } = await _post('/generateAuthenticationOptions', {
      email: email || null,
    });

    // 2. Prepare options for the WebAuthn API
    const publicKeyOptions = _prepareAuthenticationOptions(options);

    // 3. Trigger browser/OS native authentication UI
    let assertion;
    try {
      assertion = await navigator.credentials.get({ publicKey: publicKeyOptions });
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Passkey authentication was cancelled.');
      }
      throw new Error('Passkey authentication failed: ' + err.message);
    }

    if (!assertion) throw new Error('No passkey assertion returned by browser.');

    // 4. Send assertion to backend for cryptographic verification
    const serialized = _serializeAuthenticationCredential(assertion);
    const result = await _post('/verifyAuthentication', {
      response: serialized,
      challengeId,
    });

    // 5. Sign into Firebase with the returned custom token
    const firebaseUser = await _signInWithCustomToken(result.customToken, result.uid);

    return {
      uid: result.uid,
      user: result.user,
      firebaseUser,
    };
  }

  /* ------------------------------------------------------------------ */
  /* 3. LIST PASSKEYS for the current user                               */
  /* ------------------------------------------------------------------ */

  async function listPasskeys(uid) {
    if (!uid) return [];
    try {
      const { passkeys } = await _post('/listPasskeys', { uid });
      return passkeys || [];
    } catch (e) {
      console.warn('[Passkey] listPasskeys error:', e.message);
      return [];
    }
  }

  /* ------------------------------------------------------------------ */
  /* 4. DELETE a passkey                                                 */
  /* ------------------------------------------------------------------ */

  async function deletePasskey(uid, credentialId) {
    if (!uid || !credentialId) throw new Error('Missing UID or credential ID.');
    return _post('/deletePasskey', { uid, credentialId });
  }

  /* ------------------------------------------------------------------ */
  /* UTILITIES                                                           */
  /* ------------------------------------------------------------------ */

  function _getDefaultDeviceName() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iPhone / iPad';
    if (/Android/i.test(ua)) return 'Android Device';
    if (/Win/i.test(ua)) return 'Windows Device';
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Linux/i.test(ua)) return 'Linux Device';
    return 'This Device';
  }

  /* ------------------------------------------------------------------ */
  /* PUBLIC API                                                          */
  /* ------------------------------------------------------------------ */

  return {
    isSupported,
    isPlatformAuthenticatorAvailable,
    registerPasskey,
    loginWithPasskey,
    listPasskeys,
    deletePasskey,
  };

})();
