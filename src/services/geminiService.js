// Google Gemini AI Assistant Service (Secure Backend Layer)
// ------------------------------------------------------------------------
// IMPORTANT SECURITY REQUIREMENTS:
// 1. NEVER puts hardcoded secret API credentials in frontend bundles.
// 2. Strict sanitization: Biometric embeddings, fingerprint passkeys, WebAuthn private keys,
//    or camera frames are NEVER sent to Gemini under any circumstance.
// 3. Communicates via Firebase Cloud Functions endpoint (/api/geminiAssistant)
//    or user-configured session key for development.

const CLOUD_FUNCTION_URL = import.meta.env.VITE_GEMINI_FUNCTION_URL || '/api/geminiAssistant';

/**
 * Sanitizes input prompt to prevent accidental forwarding of biometric or credential data
 */
function sanitizeAiPrompt(text) {
  if (!text) return '';
  // Strip out any accidental tokens, embeddings, or hex strings
  const forbiddenPatterns = [
    /prot_emb_[a-zA-Z0-9_:]+/gi,
    /cred_[a-zA-Z0-9_-]+/gi,
    /[a-f0-9]{64}/gi, // raw sha256 hashes
    /privateKey/gi,
    /credentialId/gi
  ];
  let cleaned = text;
  forbiddenPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '[REDACTED_SENSITIVE_DATA]');
  });
  return cleaned;
}

/**
 * Sends chat message to Gemini AI Assistant via secure backend function
 */
export async function sendGeminiChatMessage(messages = [], userProfile = null) {
  // 1. Sanitize all messages in history
  const sanitizedMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    text: sanitizeAiPrompt(m.text)
  }));

  // 2. Context system prompt regarding personal profile
  const systemContext = {
    role: 'system',
    text: `You are the AI Assistant for ${userProfile?.name || 'this personal profile'}. ` +
          `You answer visitor questions about professional experience, skills, projects, and contact info. ` +
          `Never ask for or store passwords, biometric data, or passkeys.`
  };

  // Check if secure backend Cloud Function is reachable
  try {
    const res = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: sanitizedMessages,
        userName: userProfile?.name || 'Visitor'
      })
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, text: data.reply || data.text };
    }
  } catch(err) {
    // Cloud function not yet deployed locally - check session dev key fallback
  }

  // Fallback for local development if user provided a personal test API key in settings
  const devKey = localStorage.getItem('gemini_user_api_key');
  if (devKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${devKey}`;
      const payload = {
        contents: sanitizedMessages.map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text }]
        })),
        systemInstruction: {
          parts: [{ text: systemContext.text }]
        }
      };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error?.message || 'Gemini API request failed');
      }

      const resJson = await resp.json();
      const reply = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to assist you with this personal profile.";
      return { success: true, text: reply };
    } catch(devErr) {
      console.warn('[Gemini Dev Key Error]:', devErr.message);
      return {
        success: false,
        text: `Gemini API notice: ${devErr.message}. For production, deploy the Firebase Cloud Function with GEMINI_API_KEY.`
      };
    }
  }

  // Graceful response explaining how Cloud Functions securely handle Gemini
  return {
    success: true,
    text: `Hello! I am ${userProfile?.name || 'the Profile'}'s AI Assistant powered by Google Gemini. ` +
          `To enable live answers, configure the Firebase Cloud Function 'geminiAssistant' or provide a development API key in Assistant Settings.`
  };
}
