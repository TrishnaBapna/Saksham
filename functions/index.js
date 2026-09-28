// Firebase Cloud Functions for Personal Profile Biometrics & Gemini AI
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const crypto = require('crypto');

admin.initializeApp();

/**
 * 1. Secure Gemini AI Assistant Endpoint
 * - Strictly prevents biometric leakage
 * - Securely loads GEMINI_API_KEY from server environment
 */
exports.geminiAssistant = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { messages, userName } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid messages array' });
    }

    // Strict sanitization: ensure no biometric tokens, embeddings, or keys are present
    const forbiddenPatterns = [
      /prot_emb_[a-zA-Z0-9_:]+/gi,
      /cred_[a-zA-Z0-9_-]+/gi,
      /[a-f0-9]{64}/gi,
      /privateKey/gi,
      /credentialId/gi
    ];

    const sanitizedMessages = messages.map(m => {
      let text = String(m.text || '');
      forbiddenPatterns.forEach(pattern => {
        text = text.replace(pattern, '[REDACTED_BIOMETRIC_DATA]');
      });
      return {
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text }]
      };
    });

    const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.key;
    if (!apiKey) {
      console.warn('[Gemini Function Notice]: GEMINI_API_KEY is not configured in Cloud Functions environment.');
      return res.json({
        reply: `Hello! I am ${userName || 'this profile'}'s AI Assistant. To enable live Gemini responses, configure GEMINI_API_KEY in your Cloud Functions environment.`
      });
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: sanitizedMessages,
        systemInstruction: {
          parts: [{
            text: `You are the professional AI Assistant for ${userName || 'this personal profile'}. ` +
                  `Provide articulate, friendly information about their portfolio, skills, experience, and contact. ` +
                  `Never solicit or discuss biometric passkeys, private keys, or passwords.`
          }]
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error?.message || 'Gemini API call failed');
      }

      const resJson = await response.json();
      const reply = resJson.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      return res.json({ reply });
    } catch(err) {
      console.error('[Gemini Function Error]:', err);
      return res.status(500).json({ error: 'Failed to generate response: ' + err.message });
    }
  });
});

/**
 * 2. WebAuthn Challenge Generator for Server-Verified Biometric Transactions
 */
exports.generateWebAuthnChallenge = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const challenge = crypto.randomBytes(32).toString('base64url');
  const uid = context.auth.uid;

  // Cache challenge in temporary document with 2-minute TTL
  await admin.firestore().collection('auth_challenges').doc(uid).set({
    challenge,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { challenge };
});
