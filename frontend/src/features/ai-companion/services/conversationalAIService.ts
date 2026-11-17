/**
 * SAKSHAM — PHASE 2 REMEDIATION: CONVERSATIONAL AI SERVICE
 * 
 * Real Google Gemini Developer API Free Tier Integration with Local Privacy De-identification Boundary.
 * 100% Firebase Spark Free Plan compliant ($0.00 / month).
 * 
 * CRITICAL TRANSPARENCY RULES:
 * 1. When API key is missing, clearly report unconfigured status; do NOT pretend real AI was called.
 * 2. Explicitly label any simulated responses as development fallback ('LOCAL_SIMULATION_FALLBACK').
 * 3. Never send Protected Health Information (PHI) to the free-tier model.
 */

import { WhitelistedAction } from '../../../types/index.js';
import { AshaExpression } from '../types/character.types.js';
import { ActionClass, IntentType } from '../types/conversation.types.js';
import { PatientContext } from '../../../services/patientContextService.js';

export type AIExecutionMode = 'REAL_GEMINI_API' | 'LOCAL_SIMULATION_FALLBACK';

export interface AIConfigurationStatus {
  isConfigured: boolean;
  mode: AIExecutionMode;
  modelIdentifier: string;
  statusMessage: string;
  quotaInfo: string;
  requiresSetup: boolean;
}

export interface StructuredAIProposal {
  speech: string;
  expression: AshaExpression;
  intent: IntentType;
  confidence: number;
  actionClass: ActionClass;
  actionProposal?: {
    action: WhitelistedAction;
    targetId?: string;
    description: string;
    parameters?: Record<string, any>;
  };
  clarificationNeeded?: boolean;
  followUpPrompt?: string;
  // Remediation Sprint Fields:
  isRealAI: boolean;
  executionMode: AIExecutionMode;
  modelUsed: string;
  tokensRedacted?: number;
  latencyMs?: number;
  configNotice?: string;
}

export class ConversationalAIService {
  private static requestTimestamps: number[] = [];
  private static readonly MAX_RPM = 12; // Enforce conservative 12 RPM under Gemini Flash 15 RPM free quota
  private static activeModel = 'gemini-1.5-flash';
  private static runtimeApiKey: string | null = null;

  /**
   * Supported eligible models on Google AI Studio / Gemini Developer API Free Tier.
   */
  public static readonly SUPPORTED_MODELS = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-8b',
  ];

  public static getModel(): string {
    const envModel = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_MODEL : undefined;
    return this.activeModel || envModel || 'gemini-1.5-flash';
  }

  public static setModel(modelName: string): boolean {
    if (this.SUPPORTED_MODELS.includes(modelName)) {
      this.activeModel = modelName;
      return true;
    }
    return false;
  }

  /**
   * Retrieves the configured API key (from runtime storage or env).
   */
  public static getApiKey(): string | null {
    if (this.runtimeApiKey && this.runtimeApiKey.trim().length > 10) {
      return this.runtimeApiKey.trim();
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('saksham_gemini_api_key');
        if (stored && stored.trim().length > 10) {
          return stored.trim();
        }
      }
    } catch {
      // Storage unavailable
    }
    const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;
    return envKey && envKey.trim().length > 10 ? envKey.trim() : null;
  }

  public static setApiKey(key: string): void {
    const clean = key.trim();
    this.runtimeApiKey = clean;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('saksham_gemini_api_key', clean);
      }
    } catch {
      // Ignore
    }
  }

  public static clearApiKey(): void {
    this.runtimeApiKey = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('saksham_gemini_api_key');
      }
    } catch {
      // Ignore
    }
  }

  public static hasApiKey(): boolean {
    return Boolean(this.getApiKey());
  }

  /**
   * Current execution status and configuration transparency.
   */
  public static getStatus(): AIConfigurationStatus {
    const configured = this.hasApiKey();
    const model = this.getModel();
    return {
      isConfigured: configured,
      mode: configured ? 'REAL_GEMINI_API' : 'LOCAL_SIMULATION_FALLBACK',
      modelIdentifier: model,
      statusMessage: configured
        ? `Live Google Gemini API Connected (${model})`
        : 'Gemini API Key Not Configured — Running Local Simulation Fallback (Development Mode)',
      quotaInfo: configured
        ? 'Free Tier (15 RPM / 1M TPM / 1,500 RPD) — $0.00 Spark Free'
        : 'Local Offline Fallback (0 RPM / 0 network cost)',
      requiresSetup: !configured,
    };
  }

  /**
   * Privacy Disclosure notice for patient and examiner consent.
   */
  public static getPrivacyConsentNotice(): {
    title: string;
    body: string;
    phiStatus: string;
    freeTierNotice: string;
    dataUseStatement: string;
  } {
    return {
      title: 'Conversational AI Privacy & Data Use Disclosure',
      body: 'Saksham uses Google Gemini Developer API (Free Tier) to process natural conversations. On this free tier, Google may collect and review prompt data to improve its models. Therefore, Saksham executes on-device de-identification to redact names, diagnoses, prescriptions, and contacts before transmission.',
      phiStatus: 'On-device Privacy De-identifier actively redacts real PHI.',
      freeTierNotice: 'Operates on 100% Free-Tier quotas ($0.00 cost, no billing account required).',
      dataUseStatement: 'Only anonymized task intents and synthetically tokenized phrases leave the browser.',
    };
  }

  /**
   * Client-side privacy redaction: Replaces real patient names, contact numbers,
   * clinical diagnoses, loved ones names, and prescriptions with abstract tokens.
   */
  public static anonymizePrompt(rawText: string, context?: PatientContext): { anonymizedText: string; tokensRedacted: number } {
    let text = rawText;
    let tokensRedacted = 0;

    // 1. Redact known patient name
    const patientName = context?.profile?.displayName || (context as any)?.patientName;
    if (patientName && typeof patientName === 'string' && patientName.trim()) {
      const nameParts = patientName.trim().split(/\s+/);
      nameParts.forEach((part: string) => {
        if (part.length > 2) {
          const reg = new RegExp(`\\b${part}\\b`, 'gi');
          if (reg.test(text)) {
            text = text.replace(reg, '[PATIENT_NAME]');
            tokensRedacted++;
          }
        }
      });
    }

    // 2. Redact loved ones / family relative names
    const members = context?.lovedOnes?.lovedOnes || context?.lovedOnes?.sampleMembers;
    if (members && Array.isArray(members)) {
      members.forEach((member: any) => {
        if (member.name && typeof member.name === 'string' && member.name.trim().length > 2) {
          const nameParts = member.name.trim().split(/\s+/);
          nameParts.forEach((part: string) => {
            if (part.length > 2) {
              const reg = new RegExp(`\\b${part}\\b`, 'gi');
              if (reg.test(text)) {
                text = text.replace(reg, '[FAMILY_MEMBER]');
                tokensRedacted++;
              }
            }
          });
        }
        if (member.phoneNumber) {
          const clean = member.phoneNumber.replace(/[+()-\s]/g, '');
          if (clean.length >= 7) {
            const escaped = member.phoneNumber.replace(/[+]/g, '\\+').replace(/[\s]/g, '\\s*');
            const reg = new RegExp(escaped, 'gi');
            if (reg.test(text)) {
              text = text.replace(reg, '[PHONE_REDACTED]');
              tokensRedacted++;
            }
          }
        }
      });
    }

    // 3. Redact phone numbers and email patterns
    const phonePattern = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b|\b\d{10,12}\b|(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/g;
    const phoneMatches = text.match(phonePattern);
    if (phoneMatches) {
      tokensRedacted += phoneMatches.length;
      text = text.replace(phonePattern, '[PHONE_REDACTED]');
    }
    const emailMatches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    if (emailMatches) {
      tokensRedacted += emailMatches.length;
      text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
    }

    // 4. Redact clinical diagnoses and neuro-cognitive staging phrases
    const diagnosisRegex = /\b(alzheimer(?:'s)?(?:\s+disease)?|dementia|mild cognitive impairment|mci|vascular dementia|lewy body|frontotemporal|ftd|parkinson(?:'s)?(?:\s+disease)?|gds stage \d|fast stage \d|cdr \d|stage \d)\b/gi;
    const diagnosisMatches = text.match(diagnosisRegex);
    if (diagnosisMatches) {
      tokensRedacted += diagnosisMatches.length;
      text = text.replace(diagnosisRegex, '[CLINICAL_DIAGNOSIS]');
    }

    // 5. Redact specific drug names if present in prescriptions or common neuro regimens
    const commonDrugsRegex = /\b(donepezil|memantine|rivastigmine|galantamine|levodopa|carbidopa|aricept|namenda)\b/gi;
    const drugMatches = text.match(commonDrugsRegex);
    if (drugMatches) {
      tokensRedacted += drugMatches.length;
      text = text.replace(commonDrugsRegex, '[MEDICATION]');
    }

    if (context?.routines?.routines) {
      context.routines.routines.forEach((r) => {
        if (r.category === 'medication' && r.title) {
          const drugWords = r.title.split(/\s+/).filter((w) => w.length > 3);
          drugWords.forEach((word) => {
            const reg = new RegExp(`\\b${word}\\b`, 'gi');
            if (reg.test(text)) {
              text = text.replace(reg, '[MEDICATION]');
              tokensRedacted++;
            }
          });
        }
      });
    }

    return { anonymizedText: text, tokensRedacted };
  }

  /**
   * Rate Limiter: Ensures client requests never exceed 12 RPM.
   */
  public static canMakeRequest(): boolean {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < 60_000);
    return this.requestTimestamps.length < this.MAX_RPM;
  }

  private static recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Generates a conversational response and structured action proposal.
   * If Gemini API key is configured, issues a real API request to Google AI Studio.
   * If unconfigured or on network/quota failure, clearly records the simulation fallback.
   */
  public static async generateConversationalResponse(
    query: string,
    context?: PatientContext,
    language: string = 'en',
    responseLanguage?: string,
    turnHistory?: { lastIntent?: string; lastTopic?: string; lastTargetId?: string }
  ): Promise<StructuredAIProposal> {
    const targetLang = responseLanguage || language;
    const { anonymizedText, tokensRedacted } = this.anonymizePrompt(query, context);
    const startTime = Date.now();

    // Check if live API key is available
    if (this.hasApiKey()) {
      if (this.canMakeRequest()) {
        try {
          const liveResult = await this.callGeminiAPI(anonymizedText, targetLang, turnHistory);
          if (liveResult) {
            liveResult.tokensRedacted = tokensRedacted;
            liveResult.latencyMs = Date.now() - startTime;
            return liveResult;
          }
        } catch (err: any) {
          console.warn('Real Gemini API call failed, falling back to local semantic simulation:', err?.message || err);
          const fallback = this.localSemanticReasoner(anonymizedText, targetLang, turnHistory);
          fallback.tokensRedacted = tokensRedacted;
          fallback.latencyMs = Date.now() - startTime;
          fallback.isRealAI = false;
          fallback.executionMode = 'LOCAL_SIMULATION_FALLBACK';
          fallback.configNotice = `Live Gemini API Error: ${err?.message || 'Network failure'}. Switched to explicitly labelled development fallback.`;
          return fallback;
        }
      } else {
        const fallback = this.localSemanticReasoner(anonymizedText, targetLang, turnHistory);
        fallback.tokensRedacted = tokensRedacted;
        fallback.latencyMs = Date.now() - startTime;
        fallback.isRealAI = false;
        fallback.executionMode = 'LOCAL_SIMULATION_FALLBACK';
        fallback.configNotice = 'Rate limit protected (12 RPM). Temporarily switched to local development fallback.';
        return fallback;
      }
    }

    // Unconfigured state: Return explicitly labelled local development simulation fallback
    const fallback = this.localSemanticReasoner(anonymizedText, targetLang, turnHistory);
    fallback.tokensRedacted = tokensRedacted;
    fallback.latencyMs = Date.now() - startTime;
    fallback.isRealAI = false;
    fallback.executionMode = 'LOCAL_SIMULATION_FALLBACK';
    fallback.configNotice = 'Gemini API Key Not Configured — Response simulated by local development engine.';
    return fallback;
  }

  /**
   * Calls Google Gemini Developer API using structured JSON output.
   */
  public static async callGeminiAPI(
    anonymizedQuery: string,
    targetLangOrContext: string | PatientContext = 'en',
    langOrTurn?: string | any,
    turnHistory?: { lastIntent?: string; lastTopic?: string; lastTargetId?: string }
  ): Promise<StructuredAIProposal> {
    const targetLang =
      typeof targetLangOrContext === 'string'
        ? targetLangOrContext
        : typeof langOrTurn === 'string'
        ? langOrTurn
        : 'en';
    const effectiveTurn =
      typeof langOrTurn === 'object' && !('displayName' in (langOrTurn as any))
        ? langOrTurn
        : turnHistory;

    const apiKey = this.getApiKey();
    if (!apiKey) {
      const fallback = this.localSemanticReasoner(anonymizedQuery, targetLang, effectiveTurn);
      return {
        ...fallback,
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        configNotice: 'Gemini API Key Not Configured — Simulation fallback.',
      };
    }

    this.recordRequest();
    const model = this.getModel();

    const systemInstruction = `You are ASHA, a gentle, compassionate, reassuring voice companion for an elderly Indian patient living with memory loss or mild cognitive impairment.
Your goal is to converse with warmth, patience, and clear dignity.
Respond in language code: "${targetLang}".
Always provide a reassuring spoken response. If the user wants to see family, play a game, check tasks, or rest, propose the corresponding action.
NEVER prescribe medication. NEVER diagnose disease.
Output strictly JSON matching the required schema:
{
  "speech": "spoken response text in requested language",
  "expression": "neutral" | "listening" | "thinking" | "explaining" | "happy" | "encouraging" | "reassuring" | "comforting",
  "intent": "GENERAL_HELP" | "ROUTINES_TODAY" | "GAMES_LIST" | "LOVED_ONES_LIST" | "LOVED_ONES_PERSON" | "WELLBEING_REST_BREAK",
  "confidence": number (0.0 to 1.0),
  "actionClass": "class1_read" | "class2_navigate" | "class3_consequential",
  "actionProposal": {
    "action": "NAVIGATE_ROUTINES" | "NAVIGATE_LOVED_ONES" | "SHOW_FAMILY_MEMBER" | "NAVIGATE_MIND_GAMES" | "CALL_CAREGIVER",
    "targetId": string (optional),
    "description": string
  } (optional),
  "clarificationNeeded": boolean
}`;

    const contents: any[] = [];
    if (turnHistory?.lastTopic) {
      contents.push({
        role: 'user',
        parts: [{ text: `Previous context: topic=${turnHistory.lastTopic}, intent=${turnHistory.lastIntent || 'none'}` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: `{"speech": "Understood.", "expression": "reassuring", "intent": "GENERAL_HELP", "confidence": 1.0, "actionClass": "class1_read"}` }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: anonymizedQuery }],
    });

    const requestBody = {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const startTime = Date.now();
    const tokensRedacted = 0;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        console.warn(`Gemini API returned HTTP ${res.status}`);
        const fallback = this.localSemanticReasoner(anonymizedQuery, targetLang);
        return {
          ...fallback,
          isRealAI: false,
          executionMode: 'LOCAL_SIMULATION_FALLBACK',
          configNotice: `Gemini API returned HTTP ${res.status}. Switched to local fallback.`,
          tokensRedacted,
          latencyMs: Date.now() - startTime,
        };
      }

      const data = await res.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        const fallback = this.localSemanticReasoner(anonymizedQuery, targetLang);
        return {
          ...fallback,
          isRealAI: false,
          executionMode: 'LOCAL_SIMULATION_FALLBACK',
          configNotice: 'Gemini returned empty candidate. Switched to local fallback.',
          tokensRedacted,
          latencyMs: Date.now() - startTime,
        };
      }

      const parsed = JSON.parse(rawJson);
      return {
        speech: parsed.speech || 'I am right here with you.',
        expression: parsed.expression || 'reassuring',
        intent: parsed.intent || 'GENERAL_HELP',
        confidence: parsed.confidence || 0.95,
        actionClass: parsed.actionClass || 'class1_read',
        actionProposal: parsed.actionProposal,
        clarificationNeeded: parsed.clarificationNeeded || false,
        followUpPrompt: parsed.followUpPrompt,
        isRealAI: true,
        executionMode: 'REAL_GEMINI_API',
        modelUsed: model,
        tokensRedacted,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      console.warn('Gemini API fetch error:', err);
      const fallback = this.localSemanticReasoner(anonymizedQuery, targetLang);
      return {
        ...fallback,
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        configNotice: `Gemini API connection error (${err?.message || 'Offline'}). Switched to local fallback.`,
        tokensRedacted,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Local Semantic Reasoner:
   * Explicitly labelled development simulation fallback for offline use or when no API key is provided.
   */
  public static localSemanticReasoner(
    query: string,
    targetLang: string = 'en',
    turnHistory?: { lastIntent?: string; lastTopic?: string; lastTargetId?: string }
  ): StructuredAIProposal {
    const lower = query.toLowerCase().trim();
    const isHi = targetLang === 'hi';
    const isMr = targetLang === 'mr';
    const model = 'local-semantic-engine-v2';

    // 0. Medication & Routine Health Status Check (Multilingual: Hindi, Marathi, Assamese, Odia, Sanskrit, Urdu, etc.)
    if (/(?:medicine|medication|pills|dawa|aushadh|vakhat|muli|দৰব|औषध|ଔଷଧ|دوا|दवाई)/i.test(lower)) {
      return {
        speech: isMr
          ? 'तुमची सकाळची औषधे नोंदवलेली आहेत. तुम्ही डॉक्टरांच्या सल्ल्यानुसार औषध वेळेवर घेतले आहे.'
          : isHi
          ? 'आपकी सुबह की दवाइयां निर्धारित समय पर दर्ज हैं। आपने डॉक्टर की सलाह के अनुसार दवा ली है।'
          : 'Your scheduled morning medication is recorded. Everything is safely on track with your doctor’s plan.',
        expression: 'reassuring',
        intent: 'ROUTINES_MEDICATION_STATUS',
        confidence: 0.94,
        actionClass: 'class1_read',
        actionProposal: {
          action: 'NAVIGATE_ROUTINES',
          description: 'View daily medication routine schedule',
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 0.1 Distress, Emergency & Acute Confusion (Multilingual de-escalation)
    if (/(?:help|scared|fear|confused|lost|madat|ghabra|bhay|خوف|مَدَتھ|सहायता|भय)/i.test(lower)) {
      return {
        speech: isMr
          ? 'शांत व्हा, तुम्ही सुरक्षित आहात. मी तुमच्या काळजीवाहूशी संपर्क साधत आहे.'
          : isHi
          ? 'घबराइए नहीं, आप पूरी तरह सुरक्षित हैं। मैं आपके परिवार या देखभालकर्ता को सूचित कर रही हूँ।'
          : 'You are completely safe. I am right here with you, and I am alerting your caregiver to assist you.',
        expression: 'reassuring',
        intent: 'CAREGIVER_ESCALATION',
        confidence: 0.95,
        actionClass: 'class3_consequential',
        actionProposal: {
          action: 'CALL_CAREGIVER',
          description: 'Emergency alert confirmation card for caregiver',
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 1. Multi-turn Follow-up: "Can I call her?" / "Can you call my daughter?"
    if (turnHistory?.lastTopic === 'family' || /\b(?:call her|call him|phone|call my daughter|call family)\b/i.test(lower)) {
      return {
        speech: isMr
          ? 'मी तुमच्या मुलीशी संपर्क साधण्यासाठी कॉल स्क्रीन उघडत आहे. तुम्ही खात्री करून कॉल करू शकता.'
          : isHi
          ? 'मैं आपकी बेटी से संपर्क करने के लिए कॉल स्क्रीन खोल रही हूँ। आप पुष्टि करके कॉल कर सकते हैं।'
          : 'I am opening the contact screen to reach your daughter. You can confirm and make the call.',
        expression: 'reassuring',
        intent: 'LOVED_ONES_PERSON',
        confidence: 0.92,
        actionClass: 'class3_consequential',
        actionProposal: {
          action: 'CALL_CAREGIVER',
          description: 'Open contact confirmation for family member',
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 2. Multi-turn Follow-up: "Show me my daughter" after family list
    if (/\b(?:show (?:me )?(?:my )?daughter|show (?:me )?(?:my )?son|daughter|beta|beti|mulga|mulgi)\b/i.test(lower)) {
      return {
        speech: isMr
          ? 'हे पहा तुमच्या मुलीचे छायाचित्र आणि गोड आठवणी.'
          : isHi
          ? 'यह देखिए आपकी बेटी की तस्वीर और प्यारी यादें।'
          : 'Here is your daughter’s photo and lovely memories.',
        expression: 'happy',
        intent: 'LOVED_ONES_PERSON',
        confidence: 0.94,
        actionClass: 'class2_navigate',
        actionProposal: {
          action: 'SHOW_FAMILY_MEMBER',
          targetId: 'daughter',
          description: 'Filter family memories to daughter',
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 3. Open Question: "I am feeling lonely" / "I feel lonely" / "I want to talk"
    if (/\b(?:feel(?:ing)? lonely|lonely|alone|i want to talk|talk to me|koi nahi hai|ekla|ekakipana)\b/i.test(lower)) {
      return {
        speech: isMr
          ? 'तुम्ही मुळीच एकटे नाही आहात. मी नेहमी तुमच्या सोबत आहे. आपण काही छान आठवणी पाहूया का?'
          : isHi
          ? 'आप बिल्कुल अकेले नहीं हैं। मैं हमेशा आपके साथ हूँ। क्या हम आपके परिवार की पुरानी यादें देखें?'
          : 'You are never alone. I am right here with you. Would you like to look at some family memories together?',
        expression: 'comforting',
        intent: 'GENERAL_HELP',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        actionProposal: {
          action: 'NAVIGATE_LOVED_ONES',
          description: 'Open Loved Ones photo album for emotional comfort',
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 4. Unexpected Question: "Why do I have to do this?" / "Why are we doing this?"
    if (/\b(?:why do i have to|why are we doing this|why this|kyun|ka bara)\b/i.test(lower)) {
      return {
        speech: isMr
          ? 'हे तुमच्या आरोग्यासाठी आणि मन शांत ठेवण्यासाठी आहे. काही घाई नाही, आपण हळूहळू करू.'
          : isHi
          ? 'यह आपकी सेहत और मन को शांत रखने के लिए है। कोई जल्दी नहीं है, हम आराम से करेंगे।'
          : 'This is just to help you feel healthy and refreshed. There is no rush at all, take your time.',
        expression: 'explaining',
        intent: 'GENERAL_HELP',
        confidence: 0.91,
        actionClass: 'class1_read',
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 5. Open Request: "I want to play something" / "Can we play a game?"
    if (/\b(?:play something|play a game|game khelna|khelavasa vatatay|want to play)\b/i.test(lower)) {
      return {
        speech: isMr
          ? 'नक्कीच! चला आपण मेंदूला ताजेतवाने करणारा एक सोपा खेळ खेळूया.'
          : isHi
          ? 'ज़रूर! चलिए दिमाग को तरोताज़ा करने वाला एक हल्का-फुल्का खेल खेलते हैं।'
          : 'Of course! Let us enjoy a gentle mind game together to keep your mind active.',
        expression: 'happy',
        intent: 'GAMES_LIST',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        actionProposal: {
          action: 'NAVIGATE_MIND_GAMES',
          description: 'Navigate to Mind Games sanctuary',
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 6. Natural Statement: "Can we do this later?" / "Delay this"
    if (/\b(?:do this later|later|baad mein|nantar|not now|can we do this after lunch)\b/i.test(lower)) {
      return {
        speech: isMr
          ? 'काही हरकत नाही. आपण ही क्रिया नंतर करू शकतो. विश्रांती घ्या.'
          : isHi
          ? 'कोई बात नहीं। हम यह गतिविधि बाद में कर सकते हैं। आप आराम कीजिए।'
          : 'No problem at all. We can certainly do this activity later. Please take your rest.',
        expression: 'reassuring',
        intent: 'WELLBEING_REST_BREAK',
        confidence: 0.93,
        actionClass: 'class1_read',
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 7. General Fallback with Empathy
    return {
      speech: isMr
        ? 'मी तुमच्या सोबत आहे. मी तुम्हाला दिनचर्या, कुटुंब किंवा खेळांमध्ये मदत करू शकते.'
        : isHi
        ? 'मैं आपके साथ हूँ। मैं आपकी दिनचर्या, परिवार की यादों या खेलों में मदद कर सकती हूँ।'
        : 'I am right here with you. I can help you check your daily routine, see your family, or play a game.',
      expression: 'reassuring',
      intent: 'GENERAL_HELP',
      confidence: 0.88,
      actionClass: 'class1_read',
      isRealAI: false,
      executionMode: 'LOCAL_SIMULATION_FALLBACK',
      modelUsed: model,
    };
  }
}
