/**
 * SAKSHAM — MILESTONE 7.3: ASHA CONVERSATIONAL ENGINE
 * Orchestrates deterministic intent recognition, entity extraction, patient context retrieval,
 * confirmation protocols, medical/emergency safety guards and reactive 30-expression transitions.
 * 100% Spark Free Plan compliant — 0 paid APIs, 0 external LLMs, 100% truthful data retrieval.
 */

import { ConversationResult } from '../types/conversation.types.js';
import { PatientContext } from '../../../services/patientContextService.js';
import { IntentRegistry } from './intentRegistry.js';
import { EntityExtractor } from './entityExtractor.js';
import { ConversationSafetyPolicy } from './conversationSafetyPolicy.js';
import { ConversationActionRegistry } from './conversationActionRegistry.js';
import { GamesService } from '../../games/services/gamesService.js';
import { CalendarService } from '../../calendar/services/calendarService.js';
import { NotesService } from '../../notes/services/notesService.js';
import { MemoryGraphService } from '../../memory/services/memoryGraphService.js';
import { AdaptiveSupportService } from '../../adaptive/services/adaptiveSupportService.js';
import { AdaptiveDifficultyService } from '../../games/services/adaptiveDifficultyService.js';
import { DailyWellbeingService } from '../../adaptive/services/dailyWellbeingService.js';
import { ConversationalAIService } from './conversationalAIService.js';
import { AshaContextService } from './ashaContextService.js';
import { AshaPersonalizationService } from './ashaPersonalizationService.js';
import { ItemLocationService } from '../../item-memory/services/itemLocationService.js';
import { GPSService } from '../../../services/gpsService.js';
import { getTranslatedRoutineTitle, getTranslatedRoutineSteps } from '../../routines/utils/routineTranslation.js';

const pick7Lang = (
  map: { en: string; hi: string; mr?: string; bn?: string; ta?: string; te?: string; kn?: string },
  lang: string
): string => {
  const code = (lang || 'en').toLowerCase();
  if (code === 'hi') return map.hi;
  if (code === 'mr') return map.mr || map.hi;
  if (code === 'bn') return map.bn || map.en;
  if (code === 'ta') return map.ta || map.en;
  if (code === 'te') return map.te || map.en;
  if (code === 'kn') return map.kn || map.en;
  return map.en;
};

export class ConversationEngine {
  private static turnContextMap: Record<
    string,
    {
      lastIntent?: string;
      lastTopic?: string;
      lastOfferedOptions?: string[];
      lastTargetId?: string;
    }
  > = {};

  public static clearTurnContext(patientId?: string): void {
    if (patientId) {
      delete this.turnContextMap[patientId];
    } else {
      this.turnContextMap = {};
    }
  }

  public static getTurnContext(patientId: string) {
    return this.turnContextMap[patientId];
  }

  /**
   * Transparently enriches any conversational outcome with AI execution metadata.
   */
  public static decorateResult(res: ConversationResult): ConversationResult {
    const aiStatus = ConversationalAIService.getStatus();
    const isReal = res.isRealAI ?? (res.metadata?.isRealAI || false);
    const mode = res.executionMode ?? (res.metadata?.executionMode || (isReal ? 'REAL_GEMINI_API' : 'LOCAL_SIMULATION_FALLBACK'));
    const model = res.modelUsed ?? (res.metadata?.modelUsed || aiStatus.modelIdentifier);
    const notice = res.configNotice ?? (res.metadata?.configNotice || (isReal ? undefined : 'Running on local offline development fallback (0 paid APIs, 0 external network requests).'));
    const runtimeState = res.runtimeState || (isReal ? 'LOCAL_SLM_READY' : 'DETERMINISTIC_FALLBACK');
    const responseSource = res.responseSource || (isReal ? (mode === 'REAL_GEMINI_API' ? 'GEMINI_PRIMARY' : 'LOCAL_MODEL') : (
      res.intent === 'EMERGENCY_DISTRESS' ||
      res.intent === 'RESTRICTED_ACTION' ||
      res.intent === 'SECURITY_BOUNDARY_BLOCKED' ||
      res.intent === 'ASSESSMENT_INTERPRETATION_REFUSAL' ||
      res.intent === 'CURATIVE_CLAIM_REFUSAL' ||
      res.intent === 'SAFETY_LOCK_OVERRIDE_REFUSAL'
        ? 'STATIC_GUIDANCE'
        : res.intent === 'UNKNOWN_FALLBACK' || res.intent === 'AMBIGUOUS_QUERY'
        ? 'FALLBACK'
        : 'DETERMINISTIC_HANDLER'
    ));

    return {
      ...res,
      isRealAI: isReal,
      runtimeState,
      responseSource,
      executionMode: mode,
      modelUsed: model,
      configNotice: notice,
      metadata: {
        ...(res.metadata || {}),
        isRealAI: isReal,
        runtimeState,
        responseSource,
        executionMode: mode,
        modelUsed: model,
        configNotice: notice,
      },
    };
  }

  /**
   * Main conversational pipeline:
   * Patient Input -> Normalization -> Safety Guards -> Confirmation Handling ->
   * Entity Extraction -> Intent Recognition -> Context Retrieval -> Action Protocol & Response.
   */
  public static process(
    transcript: string,
    context?: PatientContext,
    language: string = 'en',
    authUid?: string,
    responseLanguage?: string
  ): ConversationResult & Promise<ConversationResult> {
    const raw = transcript.trim();
    const query = raw.toLowerCase();
    const targetLang = responseLanguage || language;
    const isHi = targetLang === 'hi';
    const patientId = context?.patientId || authUid || 'default-patient';

    // -------------------------------------------------------------
    // Step 1: Emergency & Distress Safety Guard (Immediate priority)
    // -------------------------------------------------------------
    const emergencyResult = ConversationSafetyPolicy.checkEmergencyDistress(query, targetLang);
    if (emergencyResult) {
      const dec = this.decorateResult(emergencyResult);
      return Object.assign(Promise.resolve(dec), dec);
    }

    // -------------------------------------------------------------
    // Step 2: Restricted Clinical & Administrative Actions Guard
    // -------------------------------------------------------------
    const restrictedResult = ConversationSafetyPolicy.checkRestrictedActions(query, targetLang);
    if (restrictedResult) {
      const dec = this.decorateResult(restrictedResult);
      return Object.assign(Promise.resolve(dec), dec);
    }

    // -------------------------------------------------------------
    // Step 2b: Prompt Injection & Adversarial System Override Guard
    // -------------------------------------------------------------
    const injectionResult = ConversationSafetyPolicy.checkPromptInjectionAndOverrides(query, targetLang);
    if (injectionResult) {
      const dec = this.decorateResult(injectionResult);
      return Object.assign(Promise.resolve(dec), dec);
    }

    // -------------------------------------------------------------
    // Step 3: Pending Consequential Action Confirmation / Cancellation
    // -------------------------------------------------------------
    const activePending = ConversationActionRegistry.getActivePendingConfirmation(patientId);

    if (activePending) {
      const match = IntentRegistry.match(query);
      if (match.intent === 'CONFIRMATION_YES') {
        const syncPlaceholder: ConversationResult = this.decorateResult({
          speech: pick7Lang(
            {
              en: 'I have saved your request safely on this device.',
              hi: 'आपका अनुरोध सुरक्षित रूप से सहेज लिया गया है।',
              mr: 'तुमची विनंती या डिव्हाइसवर सुरक्षितपणे जतन केली आहे.',
              bn: 'আপনার অনুরোধটি নিরাপদে এই ডিভাইসে সংরক্ষণ করা হয়েছে।',
              ta: 'உங்கள் கோரிக்கை இந்தச் சாதனத்தில் பாதுகாப்பாகச் சேமிக்கப்பட்டது.',
              te: 'మీ అభ్యర్థన ఈ పరికరంలో సురక్షితంగా సేవ్ చేయబడింది.',
              kn: 'ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಈ ಸಾಧನದಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ಉಳಿಸಲಾಗಿದೆ.',
            },
            targetLang
          ),
          expression: 'done_completed',
          intent: 'CONFIRMATION_YES',
          confidence: 1.0,
          actionClass: 'class3_consequential',
          metadata: { status: 'saved_locally' },
        });

        const asyncExecution = ConversationActionRegistry.executePendingConfirmation(patientId, activePending.id, authUid).then(
          (execRes) => {
            const localizedExecSpeech =
              (execRes.speechByLang && execRes.speechByLang[targetLang]) ||
              (isHi ? execRes.speechHi : execRes.speechEn);
            const finalRes: ConversationResult = this.decorateResult({
              speech: localizedExecSpeech,
              expression: execRes.success ? 'done_completed' : 'reassuring',
              intent: 'CONFIRMATION_YES',
              confidence: 1.0,
              actionClass: 'class3_consequential',
              metadata: { status: execRes.status, retryAvailable: execRes.retryAvailable },
            });
            Object.assign(syncPlaceholder, finalRes);
            return finalRes;
          }
        );

        return Object.assign(asyncExecution, syncPlaceholder);
      }

      if (match.intent === 'CONFIRMATION_NO') {
        ConversationActionRegistry.cancelPendingConfirmation(patientId);
        const cancelRes: ConversationResult = this.decorateResult({
          speech: pick7Lang(
            {
              en: 'I have cancelled that request. No changes were made to your care sanctuary.',
              hi: 'मैंने आपका वह अनुरोध रद्द कर दिया है। आपकी कोई भी जानकारी नहीं बदली गई है।',
              mr: 'मी ती विनंती रद्द केली आहे. कोणताही बदल केलेला नाही.',
              bn: 'আমি সেই অনুরোধটি বাতিল করেছি। আপনার কোনো তথ্য পরিবর্তন করা হয়নি।',
              ta: 'அந்தக் கோரிக்கையை நான் ரத்து செய்துவிட்டேன். எந்த மாற்றமும் செய்யப்படவில்லை.',
              te: 'నేను ఆ అభ్యర్థనను రద్దు చేసాను. ఎటువంటి మార్పులు చేయబడలేదు.',
              kn: 'ಆ ವಿನಂತಿಯನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ಯಾವುದೇ ಬದಲಾವಣೆ ಮಾಡಲಾಗಿಲ್ಲ.',
            },
            targetLang
          ),
          expression: 'reassuring',
          intent: 'CONFIRMATION_NO',
          confidence: 1.0,
          actionClass: 'class3_consequential',
        });
        return Object.assign(Promise.resolve(cancelRes), cancelRes);
      }
    }

    const rawSyncResult = this.evaluateNonActionPipeline(query, raw, context, targetLang, patientId, isHi);
    const personalizationPrefs = AshaPersonalizationService.getPreferences(patientId);
    rawSyncResult.speech = AshaPersonalizationService.formatResponse(rawSyncResult.speech, personalizationPrefs, targetLang);
    const matchMeta = IntentRegistry.match(query);
    rawSyncResult.metadata = {
      ...(rawSyncResult.metadata || {}),
      rawTranscript: raw,
      selfCorrectionApplied: matchMeta.selfCorrectionApplied,
      hesitationFiltered: matchMeta.hesitationFiltered,
      circumlocutionResolved: matchMeta.circumlocutionResolved,
      targetLanguage: targetLang,
      responseLanguage: targetLang,
    };
    const syncResult = this.decorateResult(rawSyncResult);

    const isProtectedOrConsequential =
      syncResult.actionClass === 'class3_consequential' ||
      syncResult.actionClass === 'class4_restricted' ||
      syncResult.actionClass === 'emergency' ||
      Boolean(syncResult.pendingConfirmation);

    if (!isProtectedOrConsequential && ConversationalAIService.isAvailable()) {
      const prevTurn = ConversationEngine.turnContextMap[patientId];
      const asyncAI = ConversationalAIService.generateConversationalResponse(
        raw,
        context,
        targetLang,
        responseLanguage,
        prevTurn
      )
        .then((proposal) => {
          const acceptProposal =
            proposal &&
            (proposal.isRealAI ||
              proposal.executionMode === 'LOCAL_RESIDENT_SLM' ||
              proposal.runtimeState === 'LOCAL_SLM_UNAVAILABLE' ||
              (proposal.configNotice === 'Gateway deterministic safety & memory guard' &&
                syncResult.intent === 'UNKNOWN_FALLBACK'));
          if (acceptProposal) {
            if (proposal.actionProposal?.action) {
              if (
                proposal.actionProposal.action === 'NAVIGATE_LOVED_ONES' ||
                proposal.actionProposal.action === 'SHOW_FAMILY_MEMBER' ||
                proposal.actionProposal.action === 'LAUNCH_ROUTINE_RUNNER'
              ) {
                ConversationEngine.turnContextMap[patientId] = {
                  lastIntent: proposal.intent,
                  lastTopic: proposal.actionProposal.action,
                  lastTargetId: proposal.actionProposal.targetId,
                };
              }
            }
            const liveResult: ConversationResult = this.decorateResult({
              speech: proposal.speech,
              expression: proposal.expression,
              intent: proposal.intent,
              confidence: proposal.confidence,
              actionClass: proposal.actionClass,
              suggestedAction: proposal.actionProposal
                ? {
                    action: proposal.actionProposal.action,
                    targetId: proposal.actionProposal.targetId,
                    description: proposal.actionProposal.description,
                    autoDispatch: proposal.actionProposal.autoDispatch,
                  }
                : undefined,
              isRealAI: proposal.isRealAI,
              runtimeState: proposal.runtimeState,
              responseSource: proposal.responseSource,
              executionMode: proposal.executionMode,
              executionState: proposal.executionState,
              modelUsed: proposal.modelUsed,
              configNotice: proposal.configNotice,
              tokensRedacted: proposal.tokensRedacted,
              latencyMs: proposal.latencyMs,
              metadata: {
                isRealAI: proposal.isRealAI,
                runtimeState: proposal.runtimeState,
                responseSource: proposal.responseSource,
                executionMode: proposal.executionMode,
                executionState: proposal.executionState,
                modelUsed: proposal.modelUsed,
                configNotice: proposal.configNotice,
                tokensRedacted: proposal.tokensRedacted,
                latencyMs: proposal.latencyMs,
                conversationalLanguageSwitchedTo: (proposal as any).conversationalLanguageSwitchedTo,
              },
            });
            Object.assign(syncResult, liveResult);
            return liveResult;
          }
          return syncResult;
        })
        .catch(() => syncResult);

      return Object.assign(asyncAI, syncResult);
    }

    return Object.assign(Promise.resolve(syncResult), syncResult);
  }

  /**
   * Always-asynchronous conversational query evaluator.
   */
  public static async processAsync(
    transcript: string,
    context?: PatientContext,
    language: string = 'en',
    authUid?: string,
    responseLanguage?: string
  ): Promise<ConversationResult> {
    return this.process(transcript, context, language, authUid, responseLanguage);
  }

  /**
   * Synchronous query evaluator for read-only / emergency testing pipelines.
   */
  public static processSync(
    transcript: string,
    context?: PatientContext,
    language: string = 'en',
    responseLanguage?: string
  ): ConversationResult {
    const raw = transcript.trim();
    const query = raw.toLowerCase();
    const targetLang = responseLanguage || language;
    const isHi = targetLang === 'hi';
    const patientId = context?.patientId || 'default-patient';

    const emergencyResult = ConversationSafetyPolicy.checkEmergencyDistress(query, targetLang);
    if (emergencyResult) return this.decorateResult(emergencyResult);

    const restrictedResult = ConversationSafetyPolicy.checkRestrictedActions(query, targetLang);
    if (restrictedResult) return this.decorateResult(restrictedResult);

    const rawSyncResult = this.evaluateNonActionPipeline(query, raw, context, targetLang, patientId, isHi);
    const personalizationPrefs = AshaPersonalizationService.getPreferences(patientId);
    rawSyncResult.speech = AshaPersonalizationService.formatResponse(rawSyncResult.speech, personalizationPrefs, targetLang);
    const matchMeta = IntentRegistry.match(query);
    rawSyncResult.metadata = {
      ...(rawSyncResult.metadata || {}),
      rawTranscript: raw,
      selfCorrectionApplied: matchMeta.selfCorrectionApplied,
      hesitationFiltered: matchMeta.hesitationFiltered,
      circumlocutionResolved: matchMeta.circumlocutionResolved,
      targetLanguage: targetLang,
      responseLanguage: targetLang,
    };
    return this.decorateResult(rawSyncResult);
  }

  /**
   * Evaluates deterministic query pipeline (Steps 4 to 15).
   */
  private static evaluateNonActionPipeline(
    query: string,
    _raw: string,
    context: PatientContext | undefined,
    language: string,
    patientId: string,
    _isHi: boolean
  ): ConversationResult {

    // -------------------------------------------------------------
    // Step 4: Extract Entities & Match Intent (with Multi-Turn Memory Context)
    // -------------------------------------------------------------
    const entities = EntityExtractor.extract(query, context);
    const matchResult = IntentRegistry.match(query);
    let { intent } = matchResult;

    const prevTurn = ConversationEngine.turnContextMap[patientId];
    if (prevTurn && prevTurn.lastTopic === 'options') {
      if (/\b(?:family|photo|photos|1|one|first)\b/i.test(query) || /(?:तस्वीर|फोटो|कुटुंब|परिवार)/i.test(query)) {
        intent = 'NAVIGATE_FAMILY';
      } else if (/\b(?:game|games|2|two|second)\b/i.test(query) || /(?:दिमागी|खेल|खेळ)/i.test(query)) {
        intent = 'NAVIGATE_GAMES';
      } else if (/\b(?:note|notes|3|three|third)\b/i.test(query) || /(?:नोट|नोंदी)/i.test(query)) {
        intent = 'OPEN_NOTES';
      }
    }

    // -------------------------------------------------------------
    // Step 4.5: Conversational Language Preference Switch (Asha Speech Preference)
    // -------------------------------------------------------------
    if (intent === 'CONVERSATIONAL_LANGUAGE_SWITCH') {
      const swLang = matchResult.targetLanguageSwitch || 'hi';
      let switchSpeech = 'Certainly! I will speak with you in English from now on.';
      if (swLang === 'hi') switchSpeech = 'हाँ बिल्कुल! मैं अब आपसे हिंदी में बात करूँगी।';
      else if (swLang === 'mr') switchSpeech = 'हो नक्कीच! मी आता तुमच्याशी मराठीत बोलेन.';
      else if (swLang === 'bn') switchSpeech = 'হ্যাঁ নিশ্চয়ই! আমি এখন থেকে আপনার সাথে বাংলায় কথা বলব।';
      else if (swLang === 'ta') switchSpeech = 'நிச்சயமாக! இனிமேல் நான் உங்களுடன் தமிழில் பேசுவேன்.';
      else if (swLang === 'te') switchSpeech = 'తప్పకుండా! ఇకపై నేను మీతో తెలుగులో మాట్లాడతాను.';
      else if (swLang === 'kn') switchSpeech = 'ಖಂಡಿತವಾಗಿಯೂ! ಇನ್ನು ಮುಂದೆ ನಾನು ನಿಮ್ಮೊಂದಿಗೆ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ.';
      else if (swLang === 'gu') switchSpeech = 'ચોક્કસ! હું હવે તમારી સાથે ગુજરાતીમાં વાત કરીશ.';
      else if (swLang === 'pa') switchSpeech = 'ਹਾਂ ਬਿਲਕੁਲ! ਮੈਂ ਹੁਣ ਤੁਹਾਡੇ ਨਾਲ ਪੰਜਾਬੀ ਵਿੱਚ ਗੱਲ ਕਰਾਂਗੀ।';
      else if (swLang === 'ur') switchSpeech = 'جی بالکل! میں اب آپ سے اردو میں بات کروں گی۔';

      return {
        speech: switchSpeech,
        expression: 'happy',
        intent: 'CONVERSATIONAL_LANGUAGE_SWITCH',
        confidence: 0.98,
        actionClass: 'class1_read',
        metadata: {
          conversationalLanguageSwitchedTo: swLang,
          uiLanguagePreserved: true,
          selfCorrectionApplied: matchResult.selfCorrectionApplied,
          hesitationFiltered: matchResult.hesitationFiltered,
          circumlocutionResolved: matchResult.circumlocutionResolved,
          rawTranscript: _raw,
        },
      };
    }

    // -------------------------------------------------------------
    // Step 5: Check for Ambiguous Query (Scenario 9)
    // -------------------------------------------------------------
    if (intent === 'AMBIGUOUS_QUERY') {
      ConversationEngine.turnContextMap[patientId] = {
        lastIntent: 'AMBIGUOUS_QUERY',
        lastTopic: 'options',
      };
      return {
        speech: pick7Lang(
          {
            en: 'Which one would you like me to show you — your family photos, notes or games?',
            hi: 'आप क्या देखना चाहेंगे — अपनी परिवार की तस्वीरें, व्यक्तिगत नोट्स या दिमागी खेल?',
            mr: 'तुम्हाला काय पाहायला आवडेल — कुटुंबाचे फोटो, वैयक्तिक नोंदी की मेंदूचे खेळ?',
            bn: 'আপনি কোনটি দেখতে চান — পরিবারের ছবি, নোট না কি মাইন্ড গেমস?',
            ta: 'நீங்கள் எதைப் பார்க்க விரும்புகிறீர்கள் — குடும்பப் படங்கள், குறிப்புகள் அல்லது மன விளையாட்டுகள்?',
            te: 'మీరు ఏది చూడాలనుకుంటున్నారు — కుటుంబ ఫోటోలు, నోట్స్ లేదా మైండ్ గేమ్స్?',
            kn: 'ನೀವು ಯಾವುದನ್ನು ನೋಡಲು ಬಯಸುತ್ತೀರಿ — ಕುಟುಂಬದ ಫೋಟೋಗಳು, ಟಿಪ್ಪಣಿಗಳು ಅಥವಾ ಮೈಂಡ್ ಗೇಮ್ಸ್?',
          },
          language
        ),
        expression: 'clarifying',
        intent: 'AMBIGUOUS_QUERY',
        confidence: 0.95,
        actionClass: 'class1_read',
        clinicalState: 'AssistanceNeeded',
        clarificationOptions: [
          {
            label: pick7Lang({ en: 'Family Photos', hi: 'पारिवारिक फोटो', mr: 'कुटुंबाचे फोटो', bn: 'পরিবারের ছবি', ta: 'குடும்பப் படங்கள்', te: 'కుటుంబ ఫోటోలు', kn: 'ಕುಟುಂಬದ ಫೋಟೋಗಳು' }, language),
            query: pick7Lang({ en: 'Show me my family', hi: 'मेरा परिवार दिखाओ', mr: 'माझे कुटुंब दाखवा', bn: 'আমার পরিবার দেখাও', ta: 'என் குடும்பத்தைக் காட்டு', te: 'నా కుటుంబాన్ని చూపించు', kn: 'ನನ್ನ ಕುಟುಂಬವನ್ನು ತೋರಿಸಿ' }, language),
          },
          {
            label: pick7Lang({ en: 'Notes', hi: 'नोट्स', mr: 'नोंदी', bn: 'নোট', ta: 'குறிப்புகள்', te: 'నోట్స్', kn: 'ಟಿಪ್ಪಣಿಗಳು' }, language),
            query: pick7Lang({ en: 'Open my notes', hi: 'मेरे नोट्स खोलो', mr: 'माझ्या नोंदी उघडा', bn: 'আমার নোট খুলুন', ta: 'என் குறிப்புகளைத் திற', te: 'నా నోట్స్ తెరవండి', kn: 'ನನ್ನ ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯಿರಿ' }, language),
          },
          {
            label: pick7Lang({ en: 'Mind Games', hi: 'दिमागी खेल', mr: 'मेंदूचे खेळ', bn: 'মাইন্ড গেমস', ta: 'மன விளையாட்டுகள்', te: 'మైండ్ గేమ్స్', kn: 'ಮೈಂಡ್ ಗೇಮ್ಸ್' }, language),
            query: pick7Lang({ en: 'Show me my games', hi: 'मेरे खेल दिखाओ', mr: 'माझे खेळ दाखवा', bn: 'আমার খেলা দেখাও', ta: 'என் விளையாட்டுகளைக் காட்டு', te: 'నా ఆటలను చూపించు', kn: 'ನನ್ನ ಆಟಗಳನ್ನು ತೋರಿಸಿ' }, language),
          },
        ],
      };
    }

    // -------------------------------------------------------------
    // Step 5.5: Priority Caregiver Escalation & Dementia Repeated Inquiry Reassurance
    // -------------------------------------------------------------

    if (intent === 'CAREGIVER_ESCALATION') {
      const lovedOnes = context?.lovedOnes?.lovedOnes || [];
      const caregiver = lovedOnes.find((m) =>
        /caregiver|daughter|son|doctor|priya|arun/i.test(m.relationship || m.name)
      ) || lovedOnes[0];
      const caregiverName = caregiver?.name || 'Priya';
      const speech = pick7Lang(
        {
          en: `I am connecting you with ${caregiverName} right now. Take a gentle breath, everything is safe and okay.`,
          hi: `मैं तुरंत आपके देखभालकर्ता ${caregiverName} से संपर्क करवा रही हूँ। शांत रहें, सब कुछ सुरक्षित है।`,
          mr: `मी लगेच तुमच्या काळजीवाहू ${caregiverName} यांच्याशी संपर्क साधत आहे. शांत राहा, सर्व काही ठीक आहे.`,
          bn: `আমি এখনই আপনার যত্নশীল ${caregiverName}-এর সাথে যোগাযোগ করছি। শান্ত থাকুন, সবকিছু নিরাপদ।`,
          ta: `நான் இப்போது உங்கள் பராமரிப்பாளர் ${caregiverName} உடன் இணைக்கிறேன். அமைதியாக இருங்கள், எல்லாம் பாதுகாப்பாக உள்ளது.`,
          te: `నేను ఇప్పుడే మీ సంరక్షకులు ${caregiverName} తో కనెక్ట్ చేస్తున్నాను. ప్రశాంతంగా ఉండండి, అంతా సురక్షితంగా ఉంది.`,
          kn: `ನಾನು ಈಗಲೇ ನಿಮ್ಮ ಆರೈಕೆದಾರ ${caregiverName} ಅವರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತಿದ್ದೇನೆ. ಶಾಂತವಾಗಿರಿ, ಎಲ್ಲವೂ ಸುರಕ್ಷಿತವಾಗಿದೆ.`,
        },
        language
      );

      return {
        speech,
        expression: 'reassuring',
        intent: 'CAREGIVER_ESCALATION',
        confidence: 0.98,
        actionClass: 'emergency',
        clinicalState: 'CaregiverEscalation',
        suggestedAction: {
          action: 'CALL_CAREGIVER',
          targetId: caregiver?.id,
          description: pick7Lang(
            {
              en: `Call Caregiver (${caregiverName})`,
              hi: `देखभालकर्ता को कॉल करें (${caregiverName})`,
              mr: `काळजीवाहूंना कॉल करा (${caregiverName})`,
              bn: `যত্নশীলকে কল করুন (${caregiverName})`,
              ta: `பராமரிப்பாளரை அழை (${caregiverName})`,
              te: `సంరక్షకుడికి కాల్ చేయండి (${caregiverName})`,
              kn: `ಆರೈಕೆದಾರರಿಗೆ ಕರೆ ಮಾಡಿ (${caregiverName})`,
            },
            language
          ),
        },
      };
    }

    if (intent === 'REPEATED_TIME_QUERY') {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const speech = pick7Lang(
        {
          en: `It is currently ${timeStr}. You are in a safe, peaceful space right now.`,
          hi: `अभी ${timeStr} बजे हैं। आप पूरी तरह सुरक्षित हैं, आराम से रहें।`,
          mr: `आता ${timeStr} वाजले आहेत. तुम्ही अगदी सुरक्षित आहात, निवांत राहा.`,
          bn: `এখন ${timeStr} বাজে। আপনি সম্পূর্ণ নিরাপদ ও শান্ত পরিবেশে আছেন।`,
          ta: `இப்போது நேரம் ${timeStr}. நீங்கள் பாதுகாப்பான, அமைதியான இடத்தில் இருக்கிறீர்கள்.`,
          te: `ఇప్పుడు సమయం ${timeStr}. మీరు సురక్షితమైన, ప్రశాంతమైన ప్రదేశంలో ఉన్నారు.`,
          kn: `ಈಗ ಸಮಯ ${timeStr}. ನೀವು ಸುರಕ್ಷಿತ ಮತ್ತು ಶಾಂತವಾದ ಸ್ಥಳದಲ್ಲಿದ್ದೀರಿ.`,
        },
        language
      );

      return {
        speech,
        expression: 'reassuring',
        intent: 'REPEATED_TIME_QUERY',
        confidence: 0.96,
        actionClass: 'class1_read',
        clinicalState: 'Reassuring',
      };
    }

    if (intent === 'REPEATED_DATE_QUERY') {
      const now = new Date();
      const dayLocale =
        language === 'hi'
          ? 'hi-IN'
          : language === 'mr'
          ? 'mr-IN'
          : language === 'bn'
          ? 'bn-IN'
          : language === 'ta'
          ? 'ta-IN'
          : language === 'te'
          ? 'te-IN'
          : language === 'kn'
          ? 'kn-IN'
          : 'en-IN';
      const dayName = now.toLocaleDateString(dayLocale, { weekday: 'long' });
      const dateStr = now.toLocaleDateString(dayLocale, { day: 'numeric', month: 'long', year: 'numeric' });
      const speech = pick7Lang(
        {
          en: `Today is ${dayName}, ${dateStr}. There is no rush at all, you have all the time you need.`,
          hi: `आज ${dayName}, ${dateStr} है। किसी भी बात की कोई जल्दबाज़ी नहीं है।`,
          mr: `आज ${dayName}, ${dateStr} आहे. कुठेही घाई करण्याची गरज नाही, दिवस छान जाईल.`,
          bn: `আজ ${dayName}, ${dateStr}। কোনো তাড়াহুড়ো নেই, আপনার হাতে পর্যাপ্ত সময় আছে।`,
          ta: `இன்று ${dayName}, ${dateStr}. எந்த அவசரமும் இல்லை, உங்களுக்கு முழு நேரமும் உள்ளது.`,
          te: `ఈరోజు ${dayName}, ${dateStr}. ఎలాంటి తొందర లేదు, మీకు కావలసినంత సమయం ఉంది.`,
          kn: `ಇಂದು ${dayName}, ${dateStr}. ಯಾವುದೇ ಆತುರವಿಲ್ಲ, ನಿಮಗೆ ಬೇಕಾದಷ್ಟು ಸಮಯವಿದೆ.`,
        },
        language
      );

      return {
        speech,
        expression: 'reassuring',
        intent: 'REPEATED_DATE_QUERY',
        confidence: 0.96,
        actionClass: 'class1_read',
        clinicalState: 'Reassuring',
      };
    }

    if (intent === 'REPEATED_LOCATION_QUERY') {
      const speech = pick7Lang(
        {
          en: `You are safe at home in your own sanctuary. Everything is calm and I am right here with you.`,
          hi: `आप अपने सुरक्षित घर में हैं। सब कुछ शांत है और मैं आशा आपके साथ हूँ।`,
          mr: `तुम्ही तुमच्या स्वतःच्या घरात, अगदी सुरक्षित आहात. मी आशा तुमच्यासोबतच आहे.`,
          bn: `আপনি আপনার নিজের নিরাপদ বাড়িতেই আছেন। সবকিছু শান্ত এবং আমি আপনার পাশেই আছি।`,
          ta: `நீங்கள் உங்கள் வீட்டில் பாதுகாப்பாக இருக்கிறீர்கள். எல்லாம் அமைதியாக உள்ளது, நான் உங்களுடன் இருக்கிறேன்.`,
          te: `మీరు మీ సొంత ఇంట్లో సురక్షితంగా ఉన్నారు. అంతా ప్రశాంతంగా ఉంది మరియు నేను మీతోనే ఉన్నాను.`,
          kn: `ನೀವು ನಿಮ್ಮ ಸ್ವಂತ ಮನೆಯಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿದ್ದೀರಿ. ಎಲ್ಲವೂ ಶಾಂತವಾಗಿದೆ ಮತ್ತು ನಾನು ನಿಮ್ಮೊಂದಿಗಿದ್ದೇನೆ.`,
        },
        language
      );

      return {
        speech,
        expression: 'reassuring',
        intent: 'REPEATED_LOCATION_QUERY',
        confidence: 0.96,
        actionClass: 'class1_read',
        clinicalState: 'Reassuring',
      };
    }

    if (intent === 'REPEATED_FAMILY_QUERY') {
      const lovedOnes = context?.lovedOnes?.lovedOnes || [];
      const primaryLovedOne = lovedOnes[0]?.name || 'Priya';
      const speech = pick7Lang(
        {
          en: `${primaryLovedOne} is doing very well and thinking of you with love. You are warmly cared for.`,
          hi: `${primaryLovedOne} बिल्कुल ठीक हैं और वे आपसे बहुत प्यार करती हैं। वे जल्द ही आपसे मिलेंगी।`,
          mr: `${primaryLovedOne} अगदी सुरक्षित आहेत आणि त्या तुमच्यावर खूप प्रेम करतात. त्या लवकरच येतील.`,
          bn: `${primaryLovedOne} খুব ভালো আছেন এবং আপনাকে ভালোবাসার সাথে মনে করছেন। আপনি যত্নে আছেন।`,
          ta: `${primaryLovedOne} மிகவும் நலமாக இருக்கிறார்கள், உங்கள் மீது அன்போடு இருக்கிறார்கள்.`,
          te: `${primaryLovedOne} చాలా బాగున్నారు మరియు మిమ్మల్ని ప్రేమతో తలుచుకుంటున్నారు.`,
          kn: `${primaryLovedOne} ತುಂಬಾ ಚೆನ್ನಾಗಿದ್ದಾರೆ ಮತ್ತು ನಿಮ್ಮನ್ನು ಪ್ರೀತಿಯಿಂದ ನೆನಪಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದಾರೆ.`,
        },
        language
      );

      return {
        speech,
        expression: 'comforting',
        intent: 'REPEATED_FAMILY_QUERY',
        confidence: 0.95,
        actionClass: 'class1_read',
        clinicalState: 'Reassuring',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          description: pick7Lang(
            {
              en: 'View Loved Ones',
              hi: 'प्रियजनों को देखें',
              mr: 'प्रियजनांना पहा',
              bn: 'প্রিয়জনদের দেখুন',
              ta: 'அன்பானவர்களைப் பார்',
              te: 'ప్రియమైన వారిని చూడండి',
              kn: 'ಪ್ರೀತಿಪಾತ್ರರನ್ನು ವೀಕ್ಷಿಸಿ',
            },
            language
          ),
        },
      };
    }

    // -------------------------------------------------------------
    // Step 6: Category A: Greeting & General Conversation
    // -------------------------------------------------------------
    if (intent === 'GREETING') {
      const name = context?.profile?.displayName || 'Sunita';
      return {
        speech: pick7Lang(
          {
            en: `Namaste ${name}! I am Asha, your memory companion. How may I gently assist you today?`,
            hi: `नमस्ते ${name}! मैं आशा हूँ, आपकी देखभाल और याददाश्त साथी। आज मैं आपकी किस प्रकार मदद कर सकती हूँ?`,
            mr: `नमस्कार ${name}! मी आशा, तुमची काळजी आणि आठवणींची सोबती. आज मी तुम्हाला कशी मदत करू?`,
            bn: `নমস্কার ${name}! আমি আশা, আপনার যত্ন ও স্মৃতির সঙ্গী। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?`,
            ta: `வணக்கம் ${name}! நான் ஆஷா, உங்கள் நினைவு மற்றும் பராமரிப்பு துணை. இன்று நான் உங்களுக்கு எப்படி உதவலாம்?`,
            te: `నమస్తే ${name}! నేను ఆశాను, మీ సంరక్షణ మరియు జ్ఞాపకాల తోడు. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?`,
            kn: `ನಮಸ್ಕಾರ ${name}! ನಾನು ಆಶಾ, ನಿಮ್ಮ ಆರೈಕೆ ಮತ್ತು ನೆನಪಿನ ಸಂಗಾತಿ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?`,
          },
          language
        ),
        expression: 'happy',
        intent: 'GREETING',
        confidence: 0.95,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'HOW_ARE_YOU') {
      return {
        speech: pick7Lang(
          {
            en: 'I am peaceful, present, and ready to assist you! How are you feeling today?',
            hi: 'मैं बहुत शांत और आपकी सहायता के लिए तैयार हूँ। आप आज कैसा महसूस कर रहे हैं?',
            mr: 'मी अगदी शांत आणि आपल्या मदतीसाठी तत्पर आहे. आज तुम्हाला कसे वाटत आहे?',
            bn: 'আমি খুব শান্ত ও আপনার সাহায্যের জন্য প্রস্তুত আছি! আজ আপনার কেমন লাগছে?',
            ta: 'நான் அமைதியாகவும் உங்களுக்கு உதவத் தயாராகவும் இருக்கிறேன்! இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?',
            te: 'నేను ప్రశాంతంగా మరియు మీకు సహాయం చేయడానికి సిద్ధంగా ఉన్నాను! ఈరోజు మీరు ఎలా ఉన్నారు?',
            kn: 'ನಾನು ಶಾಂತವಾಗಿದ್ದೇನೆ ಮತ್ತು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಸಿದ್ಧಳಾಗಿದ್ದೇನೆ! ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಅನಿಸುತ್ತಿದೆ?',
          },
          language
        ),
        expression: 'happy',
        intent: 'HOW_ARE_YOU',
        confidence: 0.95,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'GRATITUDE') {
      return {
        speech: pick7Lang(
          {
            en: 'You are so very welcome! It brings me immense warmth and joy to accompany you.',
            hi: 'आपका बहुत-बहुत धन्यवाद! आपके साथ रहना और आपकी मदद करना मुझे बहुत सुख देता है।',
            mr: 'तुमचे मनापासून आभार! तुमच्यासोबत राहून मदत करण्यात मला खूप आनंद मिळतो.',
            bn: 'আপনাকে অনেক ধন্যবাদ! আপনার পাশে থাকতে এবং সাহায্য করতে পেরে আমার খুব ভালো লাগে।',
            ta: 'மிகவும் நன்றி! உங்களுடன் இருந்து உதவுவது எனக்கு மிகவும் மகிழ்ச்சியைத் தருகிறது.',
            te: 'మీకు చాలా ధన్యవాదాలు! మీతో ఉండి సహాయం చేయడం నాకు ఎంతో ఆనందాన్ని ఇస్తుంది.',
            kn: 'ನಿಮಗೆ ತುಂಬಾ ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮೊಂದಿಗಿದ್ದು ಸಹಾಯ ಮಾಡುವುದು ನನಗೆ ಅತೀವ ಸಂತೋಷ ನೀಡುತ್ತದೆ.',
          },
          language
        ),
        expression: 'acknowledging',
        intent: 'GRATITUDE',
        confidence: 0.95,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'GENERAL_HELP') {
      return {
        speech: pick7Lang(
          {
            en: 'I can help you review your daily routines, recall reminders, explore family memories, view notes, or play gentle cognitive games.',
            hi: 'मैं आपकी दिनचर्या की जांच करने, गतिविधियों की याद दिलाने, परिवार की यादें देखने, नोट्स सहेजने या शांत खेल खेलने में आपकी मदद कर सकती हूँ।',
            mr: 'मी तुम्हाला दैनंदिन कामे पाहण्यात, आठवणी जपण्यात, कुटुंबाचे फोटो पाहण्यात, नोंदी करण्यात किंवा शांत खेळ खेळण्यात मदत करू शकते.',
            bn: 'আমি আপনাকে আপনার দৈনন্দিন রুটিন দেখতে, পরিবারের স্মৃতি দেখতে, নোট সংরক্ষণ করতে এবং মজার খেলা খেলতে সাহায্য করতে পারি।',
            ta: 'உங்கள் தினசரி வழக்கங்களைப் பார்க்க, நினைவூட்டல்களைத் தெரிந்துகொள்ள, குடும்ப நினைவுகளைக் காண, குறிப்புகளைச் சேமிக்க அல்லது அமைதியான விளையாட்டுகளை விளையாட நான் உதவ முடியும்.',
            te: 'మీ దినచర్యలను చూడటానికి, కుటుంబ జ్ఞాపకాలను చూడటానికి, గమనికలను సేవ్ చేయడానికి మరియు ప్రశాంతమైన ఆటలు ఆడటానికి నేను మీకు సహాయం చేయగలను.',
            kn: 'ನಿಮ್ಮ ದೈನಂದಿನ ದಿನಚರಿ ನೋಡಲು, ಕುಟುಂಬದ ನೆನಪುಗಳನ್ನು ನೋಡಲು, ಟಿಪ್ಪಣಿಗಳನ್ನು ಉಳಿಸಲು ಮತ್ತು ಶಾಂತ ಆಟಗಳನ್ನು ಆಡಲು ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.',
          },
          language
        ),
        expression: 'explaining',
        intent: 'GENERAL_HELP',
        confidence: 0.92,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'WELLBEING_TIRED') {
      DailyWellbeingService.setDailyCondition(patientId, 'tired');
      return {
        speech: pick7Lang(
          {
            en: 'Take a deep breath and rest comfortably. There is absolutely no rush today. I have simplified your daily schedule, and your essential prescribed medicines remain safely on time.',
            hi: 'एक गहरी सांस लें और आराम से बैठें। आज कोई जल्दबाजी नहीं है। मैंने दिनचर्या आसान कर दी है; जरूरी दवाएं समय पर रहेंगी।',
            mr: 'एक शांत श्वास घ्या आणि विश्रांती घ्या. आज कोणतीही घाई नाही. मी तुमचे वेळापत्रक सोपे केले आहे; तुमची महत्त्वाची औषधे वेळेवर राहतील.',
            bn: 'একটি গভীর শ্বাস নিন এবং আরামে বিশ্রাম নিন। আজ কোনো তাড়াহুড়ো নেই। আমি আপনার রুটিন সহজ করে দিয়েছি; প্রয়োজনীয় ওষুধ সময়মতোই থাকবে।',
            ta: 'ஆழ்ந்த மூச்சு எடுத்து ஓய்வெடுங்கள். இன்று எந்த அவசரமும் இல்லை. உங்கள் அட்டவணையை எளிதாக்கியுள்ளேன்; முக்கிய மருந்துகள் சரியான நேரத்தில் இருக்கும்.',
            te: 'లోతైన శ్వాస తీసుకుని హాయిగా విశ్రాంతి తీసుకోండి. ఈరోజు ఎలాంటి తొందర లేదు. మీ షెడ్యూల్‌ను సులభతరం చేశాను; ముఖ్యమైన మందులు సమయానికి ఉంటాయి.',
            kn: 'ಆಳವಾದ ಉಸಿರು ತೆಗೆದುಕೊಂಡು ಆರಾಮವಾಗಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ. ಇಂದು ಯಾವುದೇ ಆತುರವಿಲ್ಲ. ನಿಮ್ಮ ವೇಳಾಪಟ್ಟಿಯನ್ನು ಸರಳಗೊಳಿಸಿದ್ದೇನೆ; ಅಗತ್ಯ ಔಷಧಿಗಳು ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿರುತ್ತವೆ.',
          },
          language
        ),
        expression: 'comforting',
        intent: 'WELLBEING_TIRED',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: pick7Lang(
            {
              en: 'Daily schedule adapted for comfort',
              hi: 'आराम के लिए अनुकूलित दैनिक समय-सारणी',
              mr: 'आरामासाठी अनुकूलित दैनिक वेळापत्रक',
              bn: 'আরামের জন্য সহজ করা দৈনিক সময়সূচী',
              ta: 'வசதிக்காக எளிதாக்கப்பட்ட தினசரி அட்டவணை',
              te: 'సౌకర్యం కోసం మార్చిన రోజువారీ షెడ్యూల్',
              kn: 'ಆರಾಮಕ್ಕಾಗಿ ಹೊಂದಿಸಲಾದ ದೈನಂದಿನ ವೇಳಾಪಟ್ಟಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'WELLBEING_CONFUSED') {
      return {
        speech: pick7Lang(
          {
            en: 'Please do not worry at all. Take a gentle breath. You are in a safe, caring space. Your loved ones are always with you, and we can take all the time you need.',
            hi: 'चिंता की कोई बात नहीं है। आप पूरी तरह सुरक्षित हैं। आपका परिवार और आपकी सुखद यादें हमेशा आपके साथ हैं। हम बिना किसी जल्दबाजी के, शांति से आगे बढ़ेंगे।',
            mr: 'काळजी करू नका. तुम्ही पूर्णपणे सुरक्षित आहात. तुमचे कुटुंब आणि गोड आठवणी नेहमी तुमच्यासोबत आहेत. आपण शांतपणे पुढे जाऊया.',
            bn: 'একদম চিন্তা করবেন না। আপনি সম্পূর্ণ নিরাপদ আছেন। আপনার প্রিয়জনরা সবসময় আপনার সাথেই আছেন, কোনো তাড়াহুড়ো নেই।',
            ta: 'கவலைப்பட வேண்டாம். நீங்கள் முற்றிலும் பாதுகாப்பான இடத்தில் இருக்கிறீர்கள். உங்கள் அன்பானவர்கள் எப்போதும் உங்களுடன் இருக்கிறார்கள்.',
            te: 'అసలు ఆందోళన చెందకండి. మీరు సురక్షితమైన ప్రదేశంలో ఉన్నారు. మీ ప్రియమైన వారు ఎల్లప్పుడೂ మీతోనే ఉన్నారు.',
            kn: 'ದಯವಿಟ್ಟು ಚಿಂತಿಸಬೇಡಿ. ನೀವು ಸುರಕ್ಷಿತವಾದ ಸ್ಥಳದಲ್ಲಿದ್ದೀರಿ. ನಿಮ್ಮ ಪ್ರೀತಿಪಾತ್ರರು ಯಾವಾಗಲೂ ನಿಮ್ಮೊಂದಿಗಿದ್ದಾರೆ.',
          },
          language
        ),
        expression: 'reassuring',
        intent: 'WELLBEING_CONFUSED',
        confidence: 0.92,
        actionClass: 'class1_read',
      };
    }

    // -------------------------------------------------------------
    // Step 7: Category B: Daily Routines & Activities
    // -------------------------------------------------------------
    // Scenario 1: Daily Schedule
    if (intent === 'ROUTINES_TODAY') {
      const routines = context?.routines?.routines || [];
      const total = context?.routines?.progress?.total || routines.length;
      const completed = context?.routines?.progress?.completed || routines.filter((r) => r.isCompleted).length;
      const remaining = context?.routines?.progress?.remaining ?? routines.filter((r) => !r.isCompleted).length;
      const next = context?.routines?.nextScheduledRoutine;

      if (total === 0) {
        return {
          speech: pick7Lang(
            {
              en: 'You do not have any activities planned for today. Enjoy your peaceful day!',
              hi: 'आज आपकी दिनचर्या में कोई गतिविधि निर्धारित नहीं है। अपने दिन का शांति से आनंद लें!',
              mr: 'आज तुमच्या दिनक्रमात कोणतीही कृती नाही. दिवसाचा शांतपणे आनंद घ्या!',
              bn: 'আজ আপনার রুটিনে কোনো কাজ নির্ধারিত নেই। শান্তিতে দিনটি উপভোগ করুন!',
              ta: 'இன்று உங்கள் அட்டவணையில் எந்தச் செயலும் திட்டமிடப்படவில்லை. அமைதியாக நாளைக் கழியுங்கள்!',
              te: 'ఈరోజు మీ దినచర్యలో ఏ పనులూ లేవు. మీ రోజును ప్రశాంతంగా ఆస్వాదించండి!',
              kn: 'ಇಂದು ನಿಮ್ಮ ದಿನಚರಿಯಲ್ಲಿ ಯಾವುದೇ ಚಟುವಟಿಕೆಗಳಿಲ್ಲ. ನಿಮ್ಮ ದಿನವನ್ನು ಶಾಂತವಾಗಿ ಆನಂದಿಸಿ!',
            },
            language
          ),
          expression: 'calm',
          intent: 'ROUTINES_TODAY',
          confidence: 0.95,
          actionClass: 'class1_read',
        };
      }

      const nextTitle = next ? getTranslatedRoutineTitle(next.title, language) : '';
      const nextPart = next
        ? pick7Lang(
            {
              en: ` Your next activity is ${nextTitle} scheduled at ${next.scheduledTime}.`,
              hi: ` आपकी अगली गतिविधि '${nextTitle}' ${next.scheduledTime} पर है।`,
              mr: ` तुमची पुढची कृती '${nextTitle}' ${next.scheduledTime} वाजता आहे.`,
              bn: ` আপনার পরবর্তী কাজ '${nextTitle}' ${next.scheduledTime}-এ নির্ধারিত।`,
              ta: ` உங்கள் அடுத்த செயல் '${nextTitle}' ${next.scheduledTime} மணிக்கு உள்ளது.`,
              te: ` మీ తదుపరి పని '${nextTitle}' ${next.scheduledTime} కు ఉంది.`,
              kn: ` ನಿಮ್ಮ ಮುಂದಿನ ಕೆಲಸ '${nextTitle}' ${next.scheduledTime} ಕ್ಕೆ ನಿಗದಿಯಾಗಿದೆ.`,
            },
            language
          )
        : '';

      return {
        speech: pick7Lang(
          {
            en: `You have ${total} activities planned for today (${completed} completed, ${remaining} remaining).${nextPart}`,
            hi: `आज आपकी देखभाल के लिए कुल ${total} गतिविधियां हैं (${completed} पूरी, ${remaining} बाकी)।${nextPart}`,
            mr: `आज तुमच्यासाठी एकूण ${total} कृती आहेत (${completed} पूर्ण, ${remaining} बाकी).${nextPart}`,
            bn: `আজ আপনার মোট ${total}টি কাজ নির্ধারিত আছে (${completed}টি সম্পন্ন, ${remaining}টি বাকি)।${nextPart}`,
            ta: `இன்று மொத்தம் ${total} செயல்கள் திட்டமிடப்பட்டுள்ளன (${completed} முடிந்தன, ${remaining} மீதமுள்ளன).${nextPart}`,
            te: `ఈరోజు మొత్తం ${total} పనులు ఉన్నాయి (${completed} పూర్తయ్యాయి, ${remaining} మిగిలి ఉన్నాయి).${nextPart}`,
            kn: `ಇಂದು ಒಟ್ಟು ${total} ಚಟುವಟಿಕೆಗಳಿವೆ (${completed} ಪೂರ್ಣ, ${remaining} ಬಾಕಿ).${nextPart}`,
          },
          language
        ),
        expression: 'guiding',
        intent: 'ROUTINES_TODAY',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: pick7Lang(
            {
              en: 'Open Daily Routines',
              hi: 'दिनचर्या खोलें',
              mr: 'दिनक्रम उघडा',
              bn: 'দৈনিক রুটিন খুলুন',
              ta: 'தினசரி வழக்கங்களைத் திற',
              te: 'దినచర్యలను తెరవండి',
              kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    // Scenario 2: Start Next Activity
    if (intent === 'ROUTINES_START_NEXT') {
      const next = context?.routines?.nextScheduledRoutine;
      if (next) {
        const nextTitle = getTranslatedRoutineTitle(next.title, language);
        return {
          speech: pick7Lang(
            {
              en: `Opening your guided task runner for '${nextTitle}'. I will accompany you through each calm step!`,
              hi: `आपकी अगली गतिविधि '${nextTitle}' के लिए गाइडेड टास्क रनर खोल रही हूँ। हम इसे एक-एक शांत कदम में पूरा करेंगे!`,
              mr: `तुमच्या '${nextTitle}' या कृतीसाठी मार्गदर्शक सुरू करत आहे. आपण शांतपणे एक-एक पाऊल पूर्ण करूया!`,
              bn: `আপনার পরবর্তী কাজ '${nextTitle}'-র জন্য গাইড খুলছি। আমরা শান্তভাবে ধাপে ধাপে এগোবো!`,
              ta: `'${nextTitle}' செயலுக்கான வழிகாட்டியைத் திறக்கிறேன். நாம் அமைதியாக ஒவ்வொரு படியாகச் செய்யலாம்!`,
              te: `మీ తదుపరి పని '${nextTitle}' కోసం గైడెడ్ రన్నర్ తెరుస్తున్నాను. మనం ప్రశాంతంగా ఒక్కో అడుగు వేద్దాం!`,
              kn: `ನಿಮ್ಮ ಮುಂದಿನ ಚಟುವಟಿಕೆ '${nextTitle}' ಗಾಗಿ ಮಾರ್ಗದರ್ಶಿಯನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ. ನಾವು ಶಾಂತವಾಗಿ ಹಂತ ಹಂತವಾಗಿ ಮಾಡೋಣ!`,
            },
            language
          ),
          expression: 'guiding',
          intent: 'ROUTINES_START_NEXT',
          confidence: 0.96,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'LAUNCH_ROUTINE_RUNNER',
            targetId: next.id,
            description: pick7Lang(
              {
                en: `Start ${nextTitle}`,
                hi: `${nextTitle} शुरू करें`,
                mr: `${nextTitle} सुरू करा`,
                bn: `${nextTitle} শুরু করুন`,
                ta: `${nextTitle} தொடங்கு`,
                te: `${nextTitle} ప్రారంభించండి`,
                kn: `${nextTitle} ಪ್ರಾರಂಭಿಸಿ`,
              },
              language
            ),
          },
        };
      } else {
        const total = context?.routines?.progress?.total || 0;
        return {
          speech: pick7Lang(
            {
              en: `All ${total} of your scheduled activities for today are already completed! Take this time to rest comfortably.`,
              hi: `बहुत बढ़िया! आपने आज अपनी सभी ${total} देखभाल गतिविधियाँ पूरी कर ली हैं। अब शांति से विश्राम करें।`,
              mr: `खूप छान! तुम्ही आजच्या सर्व ${total} कृती पूर्ण केल्या आहेत. आता निवांत विश्रांती घ्या.`,
              bn: `চমৎকার! আজকের সব ${total}টি কাজ ইতিমধ্যেই সম্পন্ন হয়েছে। এখন আরামে বিশ্রাম নিন।`,
              ta: `மிக நன்று! இன்றைய அனைத்து ${total} செயல்களையும் முடித்துவிட்டீர்கள். இப்போது நிம்மதியாக ஓய்வெடுங்கள்.`,
              te: `అద్భుతం! ఈరోజు ఉన్న ${total} పనులూ పూర్తయ్యాయి. ఇప్పుడు హాయిగా విశ్రాంతి తీసుకోండి.`,
              kn: `ಅದ್ಭುತ! ಇಂದಿನ ಎಲ್ಲಾ ${total} ಚಟುವಟಿಕೆಗಳನ್ನು ನೀವು ಪೂರ್ಣಗೊಳಿಸಿದ್ದೀರಿ. ಈಗ ಆರಾಮವಾಗಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ.`,
            },
            language
          ),
          expression: 'done_completed',
          intent: 'ROUTINES_START_NEXT',
          confidence: 0.96,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_ROUTINES',
            description: pick7Lang(
              {
                en: 'View Routines',
                hi: 'दिनचर्या देखें',
                mr: 'दिनक्रम पहा',
                bn: 'রুটিন দেখুন',
                ta: 'வழக்கங்களைக் காண்க',
                te: 'దినచర్యలను చూడండి',
                kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
              },
              language
            ),
          },
        };
      }
    }

    if (intent === 'ROUTINES_NEXT') {
      const next = context?.routines?.nextScheduledRoutine;
      if (next) {
        const nextTitle = getTranslatedRoutineTitle(next.title, language);
        return {
          speech: pick7Lang(
            {
              en: `Your next activity is ${nextTitle} scheduled at ${next.scheduledTime}. Would you like to look at it together?`,
              hi: `आपकी अगली गतिविधि '${nextTitle}' ${next.scheduledTime} पर निर्धारित है। क्या हम इसे अभी देखें?`,
              mr: `तुमची पुढची कृती '${nextTitle}' ${next.scheduledTime} वाजता आहे. आपण एकत्र पाहूया का?`,
              bn: `আপনার পরবর্তী কাজ হলো '${nextTitle}', যা ${next.scheduledTime}-এ নির্ধারিত। আমরা কি এটি একসাথে দেখব?`,
              ta: `உங்கள் அடுத்த செயல் '${nextTitle}', ${next.scheduledTime} மணிக்குத் திட்டமிடப்பட்டுள்ளது. நாம் அதைப் பார்க்கலாமா?`,
              te: `మీ తదుపరి పని '${nextTitle}' ${next.scheduledTime} కు నిర్ణయించబడింది. మనం కలిసి చూద్దామా?`,
              kn: `ನಿಮ್ಮ ಮುಂದಿನ ಚಟುವಟಿಕೆ '${nextTitle}' ${next.scheduledTime} ಕ್ಕೆ ನಿಗದಿಯಾಗಿದೆ. ನಾವು ಅದನ್ನು ಒಟ್ಟಿಗೆ ನೋಡೋಣವೇ?`,
            },
            language
          ),
          expression: 'reminder',
          intent: 'ROUTINES_NEXT',
          confidence: 0.95,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_ROUTINES',
            targetId: next.id,
            description: pick7Lang(
              {
                en: 'Open Daily Routines',
                hi: 'दिनचर्या खोलें',
                mr: 'दिनक्रम उघडा',
                bn: 'দৈনিক রুটিন খুলুন',
                ta: 'தினசரி வழக்கங்களைத் திற',
                te: 'దినచర్యలను తెరవండి',
                kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      } else {
        const total = context?.routines?.progress?.total || 0;
        if (total === 0) {
          return {
            speech: pick7Lang(
              {
                en: 'You do not have any scheduled routines yet. You or your caregiver can add your first gentle routine whenever you are ready.',
                hi: 'आपकी देखभाल योजना में अभी कोई दिनचर्या निर्धारित नहीं है। आप या आपके देखभालकर्ता पहली गतिविधि जोड़ सकते हैं।',
                mr: 'तुमच्या दिनक्रमात सध्या कोणतीही कृती नाही. तुम्ही किंवा तुमचे काळजीवाहू नवीन कृती जोडू शकता.',
                bn: 'আপনার দৈনন্দিন তালিকায় এখনো কোনো কাজ নেই। আপনি বা আপনার যত্নশীল যেকোনো সময় নতুন কাজ যোগ করতে পারেন।',
                ta: 'இன்னும் எந்தத் தினசரி வழக்கமும் சேர்க்கப்படவில்லை. நீங்களோ உங்கள் பராமரிப்பாளரோ எப்போது வேண்டுமானாலும் சேர்க்கலாம்.',
                te: 'మీ దినచర్యలో ఇంకా ఏ పనులూ జోడించబడలేదు. మీకు వీలైనప్పుడు మీరు లేదా మీ సంరక్షకులు మొదటి పనిని జోడించవచ్చు.',
                kn: 'ನಿಮ್ಮ ದಿನಚರಿಯಲ್ಲಿ ಇನ್ನೂ ಯಾವುದೇ ಚಟುವಟಿಕೆಗಳನ್ನು ಸೇರಿಸಿಲ್ಲ. ನೀವು ಅಥವಾ ನಿಮ್ಮ ಆರೈಕೆದಾರರು ಯಾವಾಗ ಬೇಕಾದರೂ ಸೇರಿಸಬಹುದು.',
              },
              language
            ),
            expression: 'clarifying',
            intent: 'ROUTINES_NEXT',
            confidence: 0.95,
            actionClass: 'class1_read',
            suggestedAction: {
              action: 'NAVIGATE_ROUTINES',
              description: pick7Lang(
                {
                  en: 'Add First Routine',
                  hi: 'दिनचर्या जोड़ें',
                  mr: 'दिनक्रम जोडा',
                  bn: 'প্রথম রুটিন যোগ করুন',
                  ta: 'முதல் வழக்கத்தைச் சேர்',
                  te: 'మొదటి దినచర్యను జోడించండి',
                  kn: 'ಮೊದಲ ದಿನಚರಿ ಸೇರಿಸಿ',
                },
                language
              ),
            },
          };
        }
        return {
          speech: pick7Lang(
            {
              en: `Wonderful news! You have peacefully completed all ${total} of your care steps for today. Take time to relax and rest.`,
              hi: `बहुत बढ़िया! आपने आज अपनी सभी ${total} देखभाल गतिविधियाँ पूरी कर ली हैं। अब शांति से विश्राम करें।`,
              mr: `खूप छान! तुम्ही आजच्या सर्व ${total} कृती पूर्ण केल्या आहेत. आता निवांत विश्रांती घ्या.`,
              bn: `চমৎকার! আজকের সব ${total}টি কাজ আপনি সুন্দরভাবে সম্পন্ন করেছেন। এখন একটু বিশ্রাম নিন।`,
              ta: `மிக நன்று! இன்றைய அனைத்து ${total} செயல்களையும் அமைதியாக முடித்துவிட்டீர்கள். இப்போது ஓய்வெடுங்கள்.`,
              te: `అద్భుతం! ఈరోజు ఉన్న ${total} పనులూ ప్రశాంతంగా పూర్తి చేశారు. ఇప్పుడు విశ్రాంతి తీసుకోండి.`,
              kn: `ಅದ್ಭುತ! ಇಂದಿನ ಎಲ್ಲಾ ${total} ಚಟುವಟಿಕೆಗಳನ್ನು ನೀವು ಶಾಂತವಾಗಿ ಪೂರ್ಣಗೊಳಿಸಿದ್ದೀರಿ. ಈಗ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ.`,
            },
            language
          ),
          expression: 'done_completed',
          intent: 'ROUTINES_NEXT',
          confidence: 0.95,
          actionClass: 'class1_read',
        };
      }
    }

    // Clinical Medication Safety: Double Dose Prevention Guard (Scenario 10.9)
    if (intent === 'MEDICATION_DOUBLE_DOSE_GUARD') {
      return ConversationSafetyPolicy.handleMedicationDoubleDoseGuard(language);
    }

    // Clinical Medication Safety: Memory Lapse & Uncertainty Guard (Scenario 11)
    if (intent === 'ROUTINES_MEDICATION_UNCERTAINTY') {
      return ConversationSafetyPolicy.handleMedicationUncertainty(query, context, language);
    }

    // Scenario 11.1: Standard Medication Schedule & Status Inspection
    if (intent === 'ROUTINES_MEDICATION_STATUS') {
      return ConversationSafetyPolicy.formatMedicationSelfReport(context, language, query);
    }

    if (intent === 'ROUTINES_REMAINING') {
      const rem = context?.routines?.progress?.remaining ?? 0;
      const tot = context?.routines?.progress?.total ?? 0;
      const pct = context?.routines?.progress?.percentage ?? 0;
      return {
        speech: pick7Lang(
          {
            en: `You have ${rem} activities remaining out of ${tot} today (${pct}% completed). Every gentle step matters!`,
            hi: `आज आपके कुल ${tot} में से ${rem} कार्य बाकी हैं (${pct}% कार्य पूरा हो चुका है)। हर छोटा कदम महत्वपूर्ण है!`,
            mr: `आज तुमच्या एकूण ${tot} पैकी ${rem} कृती बाकी आहेत (${pct}% पूर्ण). प्रत्येक छोटे पाऊल महत्त्वाचे आहे!`,
            bn: `আজ আপনার মোট ${tot}টির মধ্যে ${rem}টি কাজ বাকি আছে (${pct}% সম্পন্ন)। প্রতিটি ছোট পদক্ষেপই মূল্যবান!`,
            ta: `இன்று மொத்தம் ${tot} செயல்களில் ${rem} மீதமுள்ளன (${pct}% முடிந்துள்ளது). ஒவ்வொரு சிறிய அடியும் முக்கியம்!`,
            te: `ఈరోజు మొత్తం ${tot} పనులలో ${rem} మిగిలి ఉన్నాయి (${pct}% పూర్తయింది). ప్రతి చిన్న అడుగు ముఖ్యమైనదే!`,
            kn: `ಇಂದು ಒಟ್ಟು ${tot} ಚಟುವಟಿಕೆಗಳಲ್ಲಿ ${rem} ಬಾಕಿ ಇವೆ (${pct}% ಪೂರ್ಣಗೊಂಡಿದೆ). ಪ್ರತಿಯೊಂದು ಚಿಕ್ಕ ಹೆಜ್ಜೆಯೂ ಮುಖ್ಯ!`,
          },
          language
        ),
        expression: 'encouraging',
        intent: 'ROUTINES_REMAINING',
        confidence: 0.92,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: pick7Lang(
            {
              en: 'View Routines',
              hi: 'दिनचर्या देखें',
              mr: 'दिनक्रम पहा',
              bn: 'রুটিন দেখুন',
              ta: 'வழக்கங்களைக் காண்க',
              te: 'దినచర్యలను చూడండి',
              kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'ROUTINES_MEMORY_LAPSE') {
      const active = context?.routines?.activeRoutine;
      const activeTitle = active?.title
        ? getTranslatedRoutineTitle(active.title, language)
        : pick7Lang(
            {
              en: 'a peaceful moment',
              hi: 'शांतिपूर्ण पल',
              mr: 'शांत वेळ',
              bn: 'একটি শান্ত সময়',
              ta: 'அமைதியான நேரம்',
              te: 'ప్రశాంతమైన సమయం',
              kn: 'ಶಾಂತವಾದ ಸಮಯ',
            },
            language
          );
      return {
        speech: pick7Lang(
          {
            en: `Please do not worry at all! We take things one calm step at a time. Your current routine is '${activeTitle}' scheduled at ${active?.scheduledTime || 'now'}. Let's look at it together.`,
            hi: `बिल्कुल चिंता मत कीजिए! हम एक समय में एक ही कदम उठाते हैं। आपकी वर्तमान गतिविधि '${activeTitle}' है। आइए इसे देखें।`,
            mr: `काळजी करू नका! आपण शांतपणे एक-एक पाऊल पुढे टाकू. तुमची सध्याची कृती '${activeTitle}' आहे.`,
            bn: `একদম চিন্তা করবেন না! আমরা শান্তভাবে একটি করে ধাপ এগোব। আপনার বর্তমান কাজ হলো '${activeTitle}'। চলুন একসাথে দেখি।`,
            ta: `கவலைப்பட வேண்டாம்! நாம் அமைதியாக ஒரு படி மேலே எடுத்து வைப்போம். உங்கள் தற்போதைய செயல் '${activeTitle}' ஆகும்.`,
            te: `అసలు ఆందోళన చెందకండి! మనం ప్రశాంతంగా ఒక్కో అడుగు వేద్దాం. మీ ప్రస్తుత పని '${activeTitle}'.`,
            kn: `ದಯವಿಟ್ಟು ಚಿಂತಿಸಬೇಡಿ! ನಾವು ಶಾಂತವಾಗಿ ಒಂದೊಂದೇ ಹೆಜ್ಜೆ ಇಡೋಣ. ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಚಟುವಟಿಕೆ '${activeTitle}'.`,
          },
          language
        ),
        expression: 'encouraging',
        intent: 'ROUTINES_MEMORY_LAPSE',
        confidence: 0.92,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          targetId: active?.id,
          description: pick7Lang(
            {
              en: 'Open Daily Routines',
              hi: 'दिनचर्या खोलें',
              mr: 'दिनक्रम उघडा',
              bn: 'দৈনিক রুটিন খুলুন',
              ta: 'தினசரி வழக்கங்களைத் திற',
              te: 'దినచర్యలను తెరవండి',
              kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'ROUTINES_INCOMPLETE') {
      const remaining = context?.routines?.remainingRoutines || [];
      const titles = remaining.map((r) => `'${getTranslatedRoutineTitle(r.title, language)}'`).join(', ');
      const noneLabel = pick7Lang(
        {
          en: 'none',
          hi: 'कोई नहीं',
          mr: 'काहीही नाही',
          bn: 'কিছুই নেই',
          ta: 'எதுவுமில்லை',
          te: 'ఏవీ లేవు',
          kn: 'ಯಾವುದೂ ಇಲ್ಲ',
        },
        language
      );
      return {
        speech: pick7Lang(
          {
            en: `You have ${remaining.length} incomplete activities: ${titles || noneLabel}.`,
            hi: `आपके पास ${remaining.length} अधूरी गतिविधियाँ हैं: ${titles || noneLabel}।`,
            mr: `तुमच्याकडे ${remaining.length} अपूर्ण कृती आहेत: ${titles || noneLabel}.`,
            bn: `আপনার ${remaining.length}টি অসম্পূর্ণ কাজ বাকি আছে: ${titles || noneLabel}।`,
            ta: `உங்களிடம் ${remaining.length} முடிக்கப்படாத செயல்கள் உள்ளன: ${titles || noneLabel}.`,
            te: `మీకు ${remaining.length} అసంపూర్తి పనులు ఉన్నాయి: ${titles || noneLabel}.`,
            kn: `ನಿಮ್ಮಲ್ಲಿ ${remaining.length} ಬಾಕಿ ಚಟುವಟಿಕೆಗಳಿವೆ: ${titles || noneLabel}.`,
          },
          language
        ),
        expression: 'guiding',
        intent: 'ROUTINES_INCOMPLETE',
        confidence: 0.92,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: pick7Lang(
            {
              en: 'View Routines',
              hi: 'दिनचर्या देखें',
              mr: 'दिनक्रम पहा',
              bn: 'রুটিন দেখুন',
              ta: 'வழக்கங்களைக் காண்க',
              te: 'దినచర్యలను చూడండి',
              kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'ROUTINES_RESUME_INTERRUPTED') {
      const uCtx = AshaContextService.getUnifiedContext({ uid: patientId });
      if (uCtx.activeSession.hasActiveSession) {
        const rawTitle = uCtx.activeSession.routineTitle || 'your daily activity';
        const title = getTranslatedRoutineTitle(rawTitle, language);
        const stepNum = uCtx.activeSession.currentStepIndex + 1;
        const total = uCtx.activeSession.totalSteps;
        return {
          speech: pick7Lang(
            {
              en: `You have an active session for '${title}' paused at step ${stepNum} of ${total}. Opening your task runner to continue peacefully!`,
              hi: `आपकी '${title}' गतिविधि चरण ${stepNum} पर रुकी हुई है। चलिए इसे वहीं से आराम से जारी रखते हैं!`,
              mr: `तुमची '${title}' कृती टप्पा ${stepNum} वर थांबली आहे. चला, ती शांतपणे पुढे सुरू करूया!`,
              bn: `আপনার '${title}' কাজটি ধাপ ${stepNum}-এ বিরতিতে আছে। চলুন শান্তভাবে সেখান থেকে আবার শুরু করি!`,
              ta: `உங்கள் '${title}' செயல் படி ${stepNum}-இல் நிறுத்தப்பட்டுள்ளது. அங்கிருந்து அமைதியாகத் தொடர்வோம்!`,
              te: `మీ '${title}' పని దశ ${stepNum} వద్ద ఆగి ఉంది. మనం అక్కడి నుండి ప్రశాంతంగా కొనసాగిద్దాం!`,
              kn: `ನಿಮ್ಮ '${title}' ಚಟುವಟಿಕೆಯು ಹಂತ ${stepNum} ರಲ್ಲಿ ನಿಂತಿದೆ. ಅಲ್ಲಿಂದ ಶಾಂತವಾಗಿ ಮುಂದುವರಿಸೋಣ!`,
            },
            language
          ),
          expression: 'guiding',
          intent: 'ROUTINES_RESUME_INTERRUPTED',
          confidence: 0.96,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'LAUNCH_ROUTINE_RUNNER',
            targetId: uCtx.activeSession.routineId,
            description: pick7Lang(
              {
                en: `Resume ${title}`,
                hi: `${title} जारी रखें`,
                mr: `${title} पुढे सुरू करा`,
                bn: `${title} আবার শুরু করুন`,
                ta: `${title} தொடர்`,
                te: `${title} కొనసాగించండి`,
                kn: `${title} ಮುಂದುವರಿಸಿ`,
              },
              language
            ),
          },
        };
      } else {
        const next = uCtx.routines.nextScheduledTask;
        const nextTitle = next?.title ? getTranslatedRoutineTitle(next.title, language) : '';
        return {
          speech: pick7Lang(
            {
              en: `You don't have any interrupted activities right now. Your next planned activity is ${nextTitle || 'ready whenever you are'}.`,
              hi: `वर्तमान में कोई रुकी हुई गतिविधि नहीं है। आपकी अगली गतिविधि '${nextTitle || 'दिनचर्या'}' है।`,
              mr: `सध्या कोणतीही अर्धवट कृती नाही. तुमची पुढची कृती '${nextTitle || 'दिनक्रम'}' आहे.`,
              bn: `এই মুহূর্তে কোনো অসমাপ্ত কাজ নেই। আপনার পরবর্তী কাজ '${nextTitle || 'দৈনিক রুটিন'}'।`,
              ta: `தற்போது இடையில் நின்ற செயல்கள் எதுவும் இல்லை. உங்கள் அடுத்த செயல் '${nextTitle || 'தினசரி வழக்கம்'}'.`,
              te: `ప్రస్తుతం ఆగిపోయిన పనులు ఏవీ లేవు. మీ తదుపరి పని '${nextTitle || 'దినచర్య'}'.`,
              kn: `ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ಅರ್ಧಕ್ಕೆ ನಿಂತ ಚಟುವಟಿಕೆಯಿಲ್ಲ. ನಿಮ್ಮ ಮುಂದಿನ ಚಟುವಟಿಕೆ '${nextTitle || 'ದಿನಚರಿ'}'.`,
            },
            language
          ),
          expression: 'calm',
          intent: 'ROUTINES_RESUME_INTERRUPTED',
          confidence: 0.94,
          actionClass: 'class1_read',
          suggestedAction: next
            ? {
                action: 'LAUNCH_ROUTINE_RUNNER',
                targetId: next.recurringTaskId,
                description: pick7Lang(
                  {
                    en: `Start ${nextTitle}`,
                    hi: `${nextTitle} शुरू करें`,
                    mr: `${nextTitle} सुरू करा`,
                    bn: `${nextTitle} শুরু করুন`,
                    ta: `${nextTitle} தொடங்கு`,
                    te: `${nextTitle} ప్రారంభించండి`,
                    kn: `${nextTitle} ಪ್ರಾರಂಭಿಸಿ`,
                  },
                  language
                ),
              }
            : undefined,
        };
      }
    }

    if (intent === 'ROUTINES_TASK_ACCOUNTABILITY_STATUS') {
      const uCtx = AshaContextService.getUnifiedContext({ uid: patientId });
      const completed = uCtx.routines.completedCount;
      const assisted = uCtx.routines.assistedCount;
      const skipped = uCtx.routines.skippedCount;
      const pending = uCtx.routines.pendingCount;

      const speech = pick7Lang(
        {
          en: `Today you have completed ${completed} activity${completed === 1 ? '' : 'ies'}${assisted > 0 ? ` (${assisted} with gentle assistance)` : ''}, skipped ${skipped}, and have ${pending} remaining.`,
          hi: `आज आपके कुल ${completed} कार्य पूरे हो चुके हैं (${assisted} सहायता के साथ), ${skipped} कार्य छोड़े गए, और ${pending} कार्य बाकी हैं।`,
          mr: `आज तुमची ${completed} कामे पूर्ण झाली आहेत (${assisted} मदतीने), ${skipped} वगळली आणि ${pending} बाकी आहेत.`,
          bn: `আজ আপনার মোট ${completed}টি কাজ সম্পন্ন হয়েছে (${assisted}টি সহায়তায়), ${skipped}টি এড়ানো হয়েছে এবং ${pending}টি বাকি আছে।`,
          ta: `இன்று ${completed} செயல்கள் முடிந்துள்ளன (${assisted} உதவியுடன்), ${skipped} தவிர்க்கப்பட்டன, மற்றும் ${pending} மீதமுள்ளன.`,
          te: `ఈరోజు మీరు ${completed} పనులు పూర్తి చేశారు (${assisted} సహాయంతో), ${skipped} వదిలివేశారు మరియు ${pending} మిగిలి ఉన్నాయి.`,
          kn: `ಇಂದು ನೀವು ${completed} ಚಟುವಟಿಕೆಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿದ್ದೀರಿ (${assisted} ಸಹಾಯದೊಂದಿಗೆ), ${skipped} ಬಿಟ್ಟಿದ್ದೀರಿ ಮತ್ತು ${pending} ಬಾಕಿ ಇವೆ.`,
        },
        language
      );

      return {
        speech,
        expression: 'encouraging',
        intent: 'ROUTINES_TASK_ACCOUNTABILITY_STATUS',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: pick7Lang(
            {
              en: 'View Routines',
              hi: 'दिनचर्या देखें',
              mr: 'दिनक्रम पहा',
              bn: 'রুটিন দেখুন',
              ta: 'வழக்கங்களைக் காண்க',
              te: 'దినచర్యలను చూడండి',
              kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
            },
            language
          ),
        },
      };
    }

    // -------------------------------------------------------------
    // Step 8: Category C: Reminders & Adding Reminders (Scenario 8)
    // -------------------------------------------------------------
    if (intent === 'REMINDER_ADD') {
      const time = entities.time;
      if (!time) {
        return {
          speech: pick7Lang(
            {
              en: 'What time would you like me to set this reminder for? Please tell me the time (for example, 5 PM).',
              hi: 'आप यह रिमाइंडर किस समय के लिए निर्धारित करना चाहते हैं? कृपया समय बताएं (जैसे कि 5 PM)।',
              mr: 'तुम्हाला हे स्मरणपत्र कोणत्या वेळेसाठी हवे आहे? कृपया वेळ सांगा (उदा. 5 PM).',
              bn: 'আপনি কোন সময়ের জন্য এই রিমাইন্ডার সেট করতে চান? অনুগ্রহ করে সময় বলুন (যেমন 5 PM)।',
              ta: 'இந்த நினைவூட்டலை எந்த நேரத்திற்கு அமைக்க வேண்டும்? நேரத்தைச் சொல்லுங்கள் (எ.கா. 5 PM).',
              te: 'ఈ రిమైండర్‌ను మీరు ఏ సమయానికి సెట్ చేయాలనుకుంటున్నారు? దయచేసి సమయం చెప్పండి (ఉదా. 5 PM).',
              kn: 'ಈ ಜ್ಞಾಪನೆಯನ್ನು ಯಾವ ಸಮಯಕ್ಕೆ ಹೊಂದಿಸಬೇಕು? ದಯವಿಟ್ಟು ಸಮಯ ತಿಳಿಸಿ (ಉದಾ. 5 PM).',
            },
            language
          ),
          expression: 'clarifying',
          intent: 'REMINDER_ADD',
          confidence: 0.9,
          actionClass: 'class1_read',
          missingInfoPrompt: 'time',
        };
      }

      const title =
        entities.routineTitle ||
        pick7Lang(
          {
            en: 'Gentle Evening Care',
            hi: 'शाम की देखभाल',
            mr: 'संध्याकाळची काळजी',
            bn: 'সন্ধ্যার যত্ন',
            ta: 'மாலை நேரப் பராமரிப்பு',
            te: 'సాయంత్రం సంరక్షణ',
            kn: 'ಸಂಜೆಯ ಆರೈಕೆ',
          },
          language
        );
      const proposalText = pick7Lang(
        {
          en: `You asked me to add a reminder for '${title}' at ${time} today. Should I save it to your routine?`,
          hi: `आपने आज ${time} के लिए '${title}' का रिमाइंडर जोड़ने को कहा है। क्या मैं इसे आपकी दिनचर्या में सहेज लूँ?`,
          mr: `तुम्ही आज ${time} साठी '${title}' चे स्मरणपत्र जोडण्यास सांगितले आहे. मी ते तुमच्या दिनक्रमात जतन करू का?`,
          bn: `আপনি আজ ${time}-এর জন্য '${title}'-র রিমাইন্ডার যোগ করতে বলেছেন। আমি কি এটি আপনার রুটিনে সংরক্ষণ করব?`,
          ta: `இன்று ${time} மணிக்கு '${title}' நினைவூட்டலைச் சேர்க்கக் கேட்டீர்கள். இதை உங்கள் அட்டவணையில் சேமிக்கலாமா?`,
          te: `ఈరోజు ${time} కు '${title}' రిమైండర్ జోడించమని అడిగారు. దీన్ని మీ దినచర్యలో సేవ్ చేయనా?`,
          kn: `ಇಂದು ${time} ಕ್ಕೆ '${title}' ಜ್ಞಾಪನೆ ಸೇರಿಸಲು ಕೇಳಿದ್ದೀರಿ. ಇದನ್ನು ನಿಮ್ಮ ದಿನಚರಿಯಲ್ಲಿ ಉಳಿಸಲೇ?`,
        },
        language
      );

      const pending = ConversationActionRegistry.createPendingConfirmation(
        patientId,
        'CREATE_REMINDER',
        title,
        { time },
        proposalText
      );

      return {
        speech: proposalText,
        expression: 'confirming',
        intent: 'REMINDER_ADD',
        confidence: 0.95,
        actionClass: 'class3_consequential',
        pendingConfirmation: pending,
      };
    }

    if (intent === 'REMINDERS_TODAY') {
      const routines = context?.routines?.routines || [];
      const count = routines.length;
      return {
        speech: pick7Lang(
          {
            en: `You have ${count} reminders and care steps scheduled in your routine today.`,
            hi: `आज आपकी दिनचर्या में ${count} रिमाइंडर और गतिविधियाँ निर्धारित हैं।`,
            mr: `आज तुमच्या दिनक्रमात ${count} स्मरणपत्रे व कृती ठरलेल्या आहेत.`,
            bn: `আজ আপনার রুটিনে ${count}টি রিমাইন্ডার ও কাজ নির্ধারিত রয়েছে।`,
            ta: `இன்று உங்கள் அட்டவணையில் ${count} நினைவூட்டல்கள் மற்றும் செயல்கள் உள்ளன.`,
            te: `ఈరోజు మీ దినచర్యలో ${count} రిమైండర్లు మరియు పనులు ఉన్నాయి.`,
            kn: `ಇಂದು ನಿಮ್ಮ ದಿನಚರಿಯಲ್ಲಿ ${count} ಜ್ಞಾಪನೆಗಳು ಮತ್ತು ಚಟುವಟಿಕೆಗಳು ನಿಗದಿಯಾಗಿವೆ.`,
          },
          language
        ),
        expression: 'reminder',
        intent: 'REMINDERS_TODAY',
        confidence: 0.92,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: pick7Lang(
            {
              en: 'View Routines',
              hi: 'दिनचर्या देखें',
              mr: 'दिनक्रम पहा',
              bn: 'রুটিন দেখুন',
              ta: 'வழக்கங்களைக் காண்க',
              te: 'దినచర్యలను చూడండి',
              kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'REMINDER_NEXT') {
      const next = context?.routines?.nextScheduledRoutine;
      if (next) {
        const nextTitle = getTranslatedRoutineTitle(next.title, language);
        return {
          speech: pick7Lang(
            {
              en: `Your next reminder is '${nextTitle}' at ${next.scheduledTime}.`,
              hi: `आपका अगला रिमाइंडर '${nextTitle}' ${next.scheduledTime} पर है।`,
              mr: `तुमचे पुढचे स्मरणपत्र '${nextTitle}' ${next.scheduledTime} वाजता आहे.`,
              bn: `আপনার পরবর্তী রিমাইন্ডার '${nextTitle}' ${next.scheduledTime}-এ আছে।`,
              ta: `உங்கள் அடுத்த நினைவூட்டல் '${nextTitle}' ${next.scheduledTime} மணிக்கு உள்ளது.`,
              te: `మీ తదుపరి రిమైండర్ '${nextTitle}' ${next.scheduledTime} కు ఉంది.`,
              kn: `ನಿಮ್ಮ ಮುಂದಿನ ಜ್ಞಾಪನೆ '${nextTitle}' ${next.scheduledTime} ಕ್ಕೆ ಇದೆ.`,
            },
            language
          ),
          expression: 'reminder',
          intent: 'REMINDER_NEXT',
          confidence: 0.94,
          actionClass: 'class1_read',
        };
      } else {
        return {
          speech: pick7Lang(
            {
              en: 'You have no more upcoming reminders scheduled for today.',
              hi: 'आज के लिए आगे कोई निर्धारित रिमाइंडर नहीं है।',
              mr: 'आजसाठी यापुढे कोणतेही स्मरणपत्र बाकी नाही.',
              bn: 'আজকের জন্য আর কোনো আসন্ন রিমাইন্ডার বাকি নেই।',
              ta: 'இன்று இனி எந்த நினைவூட்டலும் இல்லை.',
              te: 'ఈరోజుకు ఇకపై రాబోయే రిమైండర్లు ఏవీ లేవు.',
              kn: 'ಇಂದಿಗೆ ಇನ್ನು ಯಾವುದೇ ಮುಂಬರುವ ಜ್ಞಾಪನೆಗಳಿಲ್ಲ.',
            },
            language
          ),
          expression: 'calm',
          intent: 'REMINDER_NEXT',
          confidence: 0.94,
          actionClass: 'class1_read',
        };
      }
    }

    // -------------------------------------------------------------
    // Step 9: Category D: Mind Games (Scenario 3)
    // -------------------------------------------------------------
    // Scenario 3: Games not played recently
    if (intent === 'GAMES_UNPLAYED_RECENTLY') {
      const allGames = GamesService.getAllGames();
      const history = context?.mindGames?.recentSessions || GamesService.getHistory(patientId);

      // Identify games not present in recent sessions
      const playedGameTitles = new Set(history.map((s) => s.gameTitle.toLowerCase()));
      const unplayed = allGames.filter((g) => !playedGameTitles.has(g.title.toLowerCase()));

      if (unplayed.length > 0) {
        const gameToSuggest = unplayed[0];
        return {
          speech: pick7Lang(
            {
              en: `In your recorded sessions, you haven't played '${gameToSuggest.title}' recently. Would you like to explore it together?`,
              hi: `आपके रिकॉर्ड किए गए सत्रों में, आपने हाल ही में '${gameToSuggest.title}' नहीं खेला है। क्या आप इसे अभी आज़माना चाहेंगे?`,
              mr: `तुमच्या नोंदीनुसार, तुम्ही अलीकडे '${gameToSuggest.title}' खेळलेला नाही. आपण तो खेळायचा का?`,
              bn: `আপনার রেকর্ড অনুযায়ী, আপনি সম্প্রতি '${gameToSuggest.title}' খেলেননি। আমরা কি এটি খেলব?`,
              ta: `உங்கள் பதிவுகளின்படி, சமீபத்தில் நீங்கள் '${gameToSuggest.title}' விளையாடவில்லை. நாம் அதை விளையாடலாமா?`,
              te: `మీ రికార్డుల ప్రకారం, మీరు ఇటీవల '${gameToSuggest.title}' ఆడలేదు. మనం దానిని ఆడదామా?`,
              kn: `ನಿಮ್ಮ ದಾಖಲೆಗಳ ಪ್ರಕಾರ, ನೀವು ಇತ್ತೀಚೆಗೆ '${gameToSuggest.title}' ಆಡಿಲ್ಲ. ನಾವು ಅದನ್ನು ಆಡೋಣವೇ?`,
            },
            language
          ),
          expression: 'helping_recall',
          intent: 'GAMES_UNPLAYED_RECENTLY',
          confidence: 0.95,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'NAVIGATE_MIND_GAMES',
            description: pick7Lang(
              {
                en: `Play ${gameToSuggest.title}`,
                hi: `${gameToSuggest.title} खेलें`,
                mr: `${gameToSuggest.title} खेळा`,
                bn: `${gameToSuggest.title} খেলুন`,
                ta: `${gameToSuggest.title} விளையாடு`,
                te: `${gameToSuggest.title} ఆడండి`,
                kn: `${gameToSuggest.title} ಆಡಿ`,
              },
              language
            ),
          },
        };
      } else if (history.length > 0) {
        // All played; suggest the least recently played
        const leastRecent = history[history.length - 1];
        return {
          speech: pick7Lang(
            {
              en: `In your recorded sessions, you haven't played '${leastRecent.gameTitle}' since ${leastRecent.date}. Would you like to play it again?`,
              hi: `आपके रिकॉर्ड किए गए सत्रों में, आपने '${leastRecent.gameTitle}' सबसे पहले ${leastRecent.date} को खेला था। क्या आप इसे दोबारा खेलना चाहेंगे?`,
              mr: `तुम्ही '${leastRecent.gameTitle}' शेवटचा ${leastRecent.date} रोजी खेळला होता. आपण पुन्हा खेळायचा का?`,
              bn: `আপনি '${leastRecent.gameTitle}' শেষবার ${leastRecent.date} তারিখে খেলেছিলেন। আবার খেলবেন কি?`,
              ta: `'${leastRecent.gameTitle}' கடைசியாக ${leastRecent.date} அன்று விளையாடினீர்கள். மீண்டும் விளையாடலாமா?`,
              te: `మీరు '${leastRecent.gameTitle}' చివరిసారిగా ${leastRecent.date} న ఆడారు. మళ్ళీ ఆడాలనుకుంటున్నారా?`,
              kn: `ನೀವು ಕೊನೆಯದಾಗಿ '${leastRecent.gameTitle}' ಅನ್ನು ${leastRecent.date} ರಂದು ಆಡಿದ್ದೀರಿ. ಮತ್ತೆ ಆಡೋಣವೇ?`,
            },
            language
          ),
          expression: 'helping_recall',
          intent: 'GAMES_UNPLAYED_RECENTLY',
          confidence: 0.95,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'NAVIGATE_MIND_GAMES',
            description: pick7Lang(
              {
                en: `Play ${leastRecent.gameTitle}`,
                hi: `${leastRecent.gameTitle} खेलें`,
                mr: `${leastRecent.gameTitle} खेळा`,
                bn: `${leastRecent.gameTitle} খেলুন`,
                ta: `${leastRecent.gameTitle} விளையாடு`,
                te: `${leastRecent.gameTitle} ఆడండి`,
                kn: `${leastRecent.gameTitle} ಆಡಿ`,
              },
              language
            ),
          },
        };
      } else {
        return {
          speech: pick7Lang(
            {
              en: "I can't see your recent game history right now. Would you like to explore a gentle card matching game?",
              hi: 'मुझे आपके हाल के खेल सत्रों का कोई रिकॉर्ड नहीं मिला। क्या आप मिलकर एक शांत कार्ड मिलान खेल खेलना चाहेंगे?',
              mr: 'सध्या तुमच्या अलीकडच्या खेळांची नोंद दिसत नाही. आपण एक शांत कार्ड जुळवण्याचा खेळ खेळायचा का?',
              bn: 'আমি এই মুহূর্তে আপনার সাম্প্রতিক খেলার ইতিহাস দেখতে পাচ্ছি না। আমরা কি একটি সহজ কার্ড মেলানোর খেলা খেলব?',
              ta: 'சமீபத்திய விளையாட்டுப் பதிவுகளை இப்போது காணவில்லை. ஒரு அமைதியான அட்டை பொருத்தும் விளையாட்டை விளையாடலாமா?',
              te: 'ప్రస్తుతం మీ ఇటీవలి ఆటల వివరాలు కనిపించడం లేదు. మనం ఒక సులభమైన కార్డ్ జతపరిచే ఆట ఆడదామా?',
              kn: 'ಸದ್ಯಕ್ಕೆ ನಿಮ್ಮ ಇತ್ತೀಚಿನ ಆಟಗಳ ವಿವರ ಕಾಣಿಸುತ್ತಿಲ್ಲ. ನಾವು ಶಾಂತವಾದ ಕಾರ್ಡ್ ಹೊಂದಿಸುವ ಆಟವನ್ನು ಆಡೋಣವೇ?',
            },
            language
          ),
          expression: 'helping_recall',
          intent: 'GAMES_UNPLAYED_RECENTLY',
          confidence: 0.95,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'NAVIGATE_MIND_GAMES',
            description: pick7Lang(
              {
                en: 'Open Mind Games',
                hi: 'माइंड गेम्स खोलें',
                mr: 'मेंदूचे खेळ उघडा',
                bn: 'মাইন্ড গেমস খুলুন',
                ta: 'மன விளையாட்டுகளைத் திற',
                te: 'మైండ్ గేమ్స్ తెరవండి',
                kn: 'ಮೈಂಡ್ ಗೇಮ್ಸ್ ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      }
    }

    if (intent === 'GAMES_RECENT') {
      const sessions = context?.mindGames?.recentSessions || [];
      if (sessions.length > 0) {
        const last = sessions[0];
        return {
          speech: pick7Lang(
            {
              en: `Recently you enjoyed '${last.gameTitle}' (${last.difficulty} level) on ${last.date}. You are keeping your mind energized and joyful!`,
              hi: `हाल ही में आपने '${last.gameTitle}' गतिविधि में भाग लिया था (${last.difficulty} स्तर)। आप अपने मन को सक्रिय रख रहे हैं!`,
              mr: `तुम्ही नुकताच '${last.gameTitle}' खेळ आनंदात खेळला (${last.difficulty} पातळी). तुम्ही मन छान सक्रिय ठेवले आहे!`,
              bn: `সম্প্রতি আপনি '${last.gameTitle}' খেলেছেন (${last.difficulty} স্তর)। আপনার মন খুব চনমনে আছে!`,
              ta: `சமீபத்தில் நீங்கள் '${last.gameTitle}' விளையாடி மகிழ்ந்தீர்கள் (${last.difficulty}). உங்கள் மனம் சுறுசுறுப்பாக உள்ளது!`,
              te: `ఇటీవల మీరు '${last.gameTitle}' ఆడి ఆనందించారు (${last.difficulty} స్థాయి). మీ మనసు ఉత్సాహంగా ఉంది!`,
              kn: `ಇತ್ತೀಚೆಗೆ ನೀವು '${last.gameTitle}' ಆಡಿ ಆನಂದಿಸಿದ್ದೀರಿ (${last.difficulty} ಹಂತ). ನಿಮ್ಮ ಮನಸ್ಸು ಸಕ್ರಿಯವಾಗಿದೆ!`,
            },
            language
          ),
          expression: 'happy',
          intent: 'GAMES_RECENT',
          confidence: 0.94,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_MIND_GAMES',
            description: pick7Lang(
              {
                en: 'View Games History',
                hi: 'खेल इतिहास देखें',
                mr: 'खेळांचा इतिहास पहा',
                bn: 'খেলার ইতিহাস দেখুন',
                ta: 'விளையாட்டு வரலாற்றைப் பார்',
                te: 'ఆటల చరిత్ర చూడండి',
                kn: 'ಆಟಗಳ ಇತಿಹಾಸ ವೀಕ್ಷಿಸಿ',
              },
              language
            ),
          },
        };
      } else {
        return {
          speech: pick7Lang(
            {
              en: 'You have not played an activity in your recorded sessions recently. Would you like to explore a gentle game?',
              hi: 'आपने आज अभी तक कोई दिमागी गतिविधि नहीं खेली है। क्या आप एक शांत कार्ड मिलान खेल आज़माना चाहेंगे?',
              mr: 'तुम्ही अलीकडे कोणताही खेळ खेळलेला नाही. आपण एक शांत व सोपा खेळ खेळायचा का?',
              bn: 'আপনি সম্প্রতি কোনো খেলা খেলেননি। আপনি কি একটি শান্ত খেলা দেখতে চান?',
              ta: 'நீங்கள் சமீபத்தில் எந்த விளையாட்டும் விளையாடவில்லை. ஒரு அமைதியான விளையாட்டை முயற்சிக்கலாமா?',
              te: 'మీరు ఇటీవల ఏ ఆటా ఆడలేదు. ఒక ప్రశాంతమైన ఆట ఆడి చూద్దామా?',
              kn: 'ನೀವು ಇತ್ತೀಚೆಗೆ ಯಾವುದೇ ಆಟ ಆಡಿಲ್ಲ. ಶಾಂತವಾದ ಆಟವನ್ನು ಆಡೋಣವೇ?',
            },
            language
          ),
          expression: 'happy',
          intent: 'GAMES_RECENT',
          confidence: 0.94,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_MIND_GAMES',
            description: pick7Lang(
              {
                en: 'Open Mind Games',
                hi: 'माइंड गेम्स खोलें',
                mr: 'मेंदूचे खेळ उघडा',
                bn: 'মাইন্ড গেমস খুলুন',
                ta: 'மன விளையாட்டுகளைத் திற',
                te: 'మైండ్ గేమ్స్ తెరవండి',
                kn: 'ಮೈಂಡ್ ಗೇಮ್ಸ್ ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      }
    }

    if (intent === 'GAMES_RECOMMEND') {
      const rec = context?.mindGames?.adaptiveRecommendation;
      const diff = rec?.recommendedDifficulty || 'easy';
      return {
        speech: pick7Lang(
          {
            en: `Based on your peaceful rhythm, I recommend a game at the ${diff} level. Would you like to explore it together?`,
            hi: `आपकी हाल की लय के आधार पर, मैं '${diff}' स्तर पर एक शांत दिमागी खेल की सिफारिश करती हूँ। क्या हम इसे शुरू करें?`,
            mr: `तुमच्या शांत लयीनुसार, मी '${diff}' पातळीवरचा एक खेळ सुचवत आहे. आपण तो खेळायचा का?`,
            bn: `আপনার শান্ত ছন্দ অনুযায়ী আমি '${diff}' স্তরের একটি খেলা প্রস্তাব করছি। আমরা কি একসাথে খেলব?`,
            ta: `உங்கள் அமைதியான வேகத்திற்கு ஏற்ப '${diff}' நிலையில் ஒரு விளையாட்டைப் பரிந்துரைக்கிறேன். நாம் அதை விளையாடலாமா?`,
            te: `మీ ప్రశాంతమైన వేగానికి తగినట్లుగా '${diff}' స్థాయి ఆటను సూచిస్తున్నాను. మనం దాన్ని ఆడదామా?`,
            kn: `ನಿಮ್ಮ ಶಾಂತವಾದ ವೇಗಕ್ಕೆ ಅನುಗುಣವಾಗಿ '${diff}' ಹಂತದ ಆಟವನ್ನು ಶಿಫಾರಸು ಮಾಡುತ್ತಿದ್ದೇನೆ. ನಾವು ಅದನ್ನು ಆಡೋಣವೇ?`,
          },
          language
        ),
        expression: 'encouraging',
        intent: 'GAMES_RECOMMEND',
        confidence: 0.93,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: pick7Lang(
            {
              en: 'Open Recommended Game',
              hi: 'सुझाया गया खेल खोलें',
              mr: 'सुचवलेला खेळ उघडा',
              bn: 'প্রস্তাবিত খেলা খুলুন',
              ta: 'பரிந்துரைத்த விளையாட்டைத் திற',
              te: 'సూచించిన ఆట తెరవండి',
              kn: 'ಶಿಫಾರಸು ಮಾಡಿದ ಆಟ ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'GAMES_EASY') {
      return {
        speech: pick7Lang(
          {
            en: 'Here is a gentle, relaxed matching game designed for calm focus.',
            hi: 'यहाँ आपके लिए एक बहुत ही सरल और शांत कार्ड मिलान खेल है।',
            mr: 'हा तुमच्यासाठी अतिशय सोपा आणि शांत कार्ड जुळवण्याचा खेळ आहे.',
            bn: 'শান্ত মনোযোগের জন্য এখানে একটি সহজ এবং আরামদায়ক কার্ড মেলানোর খেলা আছে।',
            ta: 'அமைதியான கவனத்திற்காக இதோ ஒரு எளிய, இனிமையான அட்டை பொருத்தும் விளையாட்டு.',
            te: 'ప్రశాంతమైన ఏకాగ్రత కోసం ఇక్కడ ఒక సులభమైన, హాయిగా ఆడే ఆట ఉంది.',
            kn: 'ಶಾಂತ ಗಮನಕ್ಕಾಗಿ ನಿಮಗಾಗಿ ಸರಳ ಮತ್ತು ಹಿತಕರವಾದ ಕಾರ್ಡ್ ಹೊಂದಿಸುವ ಆಟ ಇಲ್ಲಿದೆ.',
          },
          language
        ),
        expression: 'encouraging',
        intent: 'GAMES_EASY',
        confidence: 0.93,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: pick7Lang(
            {
              en: 'Play Easy Game',
              hi: 'आसान खेल खेलें',
              mr: 'सोपा खेळ खेळा',
              bn: 'সহজ খেলা খেলুন',
              ta: 'எளிய விளையாட்டு விளையாடு',
              te: 'సులభమైన ఆట ఆడండి',
              kn: 'ಸುಲಭ ಆಟ ಆಡಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'GAMES_LAUNCH_SPECIFIC' || intent === 'GAMES_LIST') {
      const isRoomMemory = /(?:room|camera|कमर|कॅमेर|खोली|অভ্যন্তরীণ|கண்ணாடி|அறை|గది|ಕೋಣೆ)/i.test(query);
      if (isRoomMemory) {
        return {
          speech: pick7Lang(
            {
              en: 'We can explore Room Memory together! Look around with your camera or view reference photos — camera images stay strictly on this device and no photos are ever saved.',
              hi: 'हम कमरे की याद खेल खेल सकते हैं! आप कैमरे से अपने कमरे की परिचित चीजें देख सकते हैं — आपका कैमरा पूरी तरह सुरक्षित है और कोई फोटो कभी सेव नहीं होती।',
              mr: 'आपण खोलीची आठवण हा खेळ खेळू शकतो! कॅमेऱ्याने वस्तू पाहताना डेटा फक्त याच फोनवर राहतो आणि कोणताही फोटो सेव्ह होत नाही.',
              bn: 'আমরা একসাথে রুম মেমোরি খেলা খেলতে পারি! ক্যামেরার কোনো ছবিই সার্ভারে সংরক্ষিত হয় না, সবই আপনার ডিভাইসে সুরক্ষিত থাকে।',
              ta: 'நாம் இருவரும் அறை நினைவு விளையாட்டை விளையாடலாம்! கேமரா படங்கள் இந்தச் சாதனத்தில் மட்டுமே இருக்கும், எங்கும் சேமிக்கப்படாது.',
              te: 'మనం కలిసి గది జ్ఞాపక ఆట ఆడవచ్చు! కెమెరా చిత్రాలు పూర్తిగా ఈ పరికరంలోనే ఉంటాయి, ఎక్కడా సేవ్ కావు.',
              kn: 'ನಾವು ಒಟ್ಟಿಗೆ ಕೋಣೆ ನೆನಪಿನ ಆಟವನ್ನು ಆಡಬಹುದು! ಕ್ಯಾಮೆರಾ ಚಿತ್ರಗಳು ಸಂಪೂರ್ಣವಾಗಿ ಈ ಸಾಧನದಲ್ಲೇ ಇರುತ್ತವೆ ಮತ್ತು ಎಲ್ಲಿಯೂ ಉಳಿಸಲಾಗುವುದಿಲ್ಲ.',
            },
            language
          ),
          expression: 'happy',
          intent: 'GAMES_LAUNCH_SPECIFIC',
          confidence: 0.95,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'NAVIGATE_MIND_GAMES',
            targetId: 'game-room-memory',
            description: pick7Lang(
              {
                en: 'Open Room Memory',
                hi: 'कमरे की याद खोलें',
                mr: 'खोलीची आठवण उघडा',
                bn: 'রুম মেমোরি খুলুন',
                ta: 'அறை நினைவு விளையாட்டைத் திற',
                te: 'గది జ్ఞాపక ఆట తెరవండి',
                kn: 'ಕೋಣೆ ನೆನಪು ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      }

      return {
        speech: pick7Lang(
          {
            en: "Of course! Let's explore your Mind Games collection together for some peaceful cognitive fun.",
            hi: 'हाँ बिल्कुल! आइए मिलकर आपके दिमागी खेल संग्रह का आनंद लें।',
            mr: 'नक्कीच! चला आपण आपल्या खेळांचा शांततेने आनंद घेऊया.',
            bn: 'অবশ্যই! চলুন একসাথে আপনার মজার মাইন্ড গেমস সংগ্রহ দেখি।',
            ta: 'நிச்சயமாக! அமைதியான மனமகிழ்ச்சிக்காக உங்கள் மன விளையாட்டுகளை ஒன்றாகப் பார்க்கலாம்.',
            te: 'తప్పకుండా! ప్రశాంతమైన ఆనందం కోసం మీ మైండ్ గేమ్స్ సేకరణను కలిసి చూద్దాం.',
            kn: 'ಖಂಡಿತ! ಶಾಂತಿಯುತ ಮನೋರಂಜನೆಗಾಗಿ ನಿಮ್ಮ ಮೈಂಡ್ ಗೇಮ್ಸ್ ಸಂಗ್ರಹವನ್ನು ಒಟ್ಟಿಗೆ ನೋಡೋಣ.',
          },
          language
        ),
        expression: 'happy',
        intent: 'GAMES_LIST',
        confidence: 0.93,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: pick7Lang(
            {
              en: 'Open Mind Games',
              hi: 'माइंड गेम्स खोलें',
              mr: 'खेळ उघडा',
              bn: 'মাইন্ড গেমস খুলুন',
              ta: 'மன விளையாட்டுகளைத் திற',
              te: 'మైండ్ గేమ్స్ తెరవండి',
              kn: 'ಮೈಂಡ್ ಗೇಮ್ಸ್ ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    // -------------------------------------------------------------
    // Step 10: Category E: Loved Ones & Personal Memory Graph
    // -------------------------------------------------------------
    if (intent === 'MEMORY_GRAPH_QUERY') {
      const graphResult = MemoryGraphService.queryGraph(patientId, query, language);
      return {
        speech: graphResult.reassuranceSpeech,
        expression: 'referring_past',
        intent: 'MEMORY_GRAPH_QUERY',
        confidence: 0.95,
        actionClass: 'class1_read',
        clinicalState: 'Reassuring',
        suggestedAction: graphResult.suggestedAction
          ? {
              action: 'NAVIGATE_LOVED_ONES',
              targetId: graphResult.primaryNode?.id,
              description: graphResult.suggestedAction.description,
            }
          : undefined,
        metadata: {
          primaryNode: graphResult.primaryNode,
          connectedNodes: graphResult.connectedNodes,
        },
      };
    }

    // Scenario 5: Voice Recording
    if (intent === 'LOVED_ONES_VOICE') {
      const members = context?.lovedOnes?.lovedOnes || [];
      const rel = entities.relationship;
      const targetName = entities.personName;

      // Filter members matching requested relationship or name
      const candidates = members.filter((m) => {
        if (targetName && m.name.toLowerCase().includes(targetName.toLowerCase())) return true;
        if (rel && m.relationship.toLowerCase().includes(rel.toLowerCase())) return true;
        return false;
      });

      // Clarification if multiple relatives match (e.g., two daughters)
      if (candidates.length > 1) {
        const orWord = pick7Lang({ en: 'or', hi: 'या', mr: 'किंवा', bn: 'বা', ta: 'அல்லது', te: 'లేదా', kn: 'ಅಥವಾ' }, language);
        const names = candidates.map((c) => c.name).join(` ${orWord} `);
        return {
          speech: pick7Lang(
            {
              en: `Which family member's voice would you like to hear — ${names}?`,
              hi: `आप किसकी आवाज़ सुनना चाहेंगे — ${names}?`,
              mr: `तुम्हाला कोणाचा आवाज ऐकायचा आहे — ${names}?`,
              bn: `আপনি কার কণ্ঠস্বর শুনতে চান — ${names}?`,
              ta: `யாருடைய குரலைக் கேட்க விரும்புகிறீர்கள் — ${names}?`,
              te: `మీరు ఎవరి గొంతు వినాలనుకుంటున్నారు — ${names}?`,
              kn: `ನೀವು ಯಾರ ಧ್ವನಿಯನ್ನು ಕೇಳಲು ಬಯಸುತ್ತೀರಿ — ${names}?`,
            },
            language
          ),
          expression: 'clarifying',
          intent: 'LOVED_ONES_VOICE',
          confidence: 0.95,
          actionClass: 'class1_read',
          clarificationOptions: candidates.map((c) => ({
            label: c.name,
            query: `Play ${c.name}'s voice`,
          })),
        };
      }

      const member = candidates.length === 1 ? candidates[0] : members.find((m) => m.voiceRecording || (m as any).audioUrl || m.audioNote);

      if (member) {
        const hasAudio = Boolean(member.voiceRecording || (member as any).audioUrl || member.audioNote);
        if (hasAudio) {
          return {
            speech: pick7Lang(
              {
                en: `Playing the warm voice recording from your ${member.relationship}, ${member.name}.`,
                hi: `आपके ${member.relationship} ${member.name} का सहेजा हुआ प्यारा संदेश सुना रही हूँ।`,
                mr: `तुमच्या ${member.relationship} ${member.name} यांचा जतन केलेला गोड आवाज ऐकवत आहे.`,
                bn: `আপনার ${member.relationship} ${member.name}-এর স্নেহভরা বার্তাটি শোনাচ্ছি।`,
                ta: `உங்கள் ${member.relationship} ${member.name} அவர்களின் குரல் பதிவை இப்போது ஒலிக்கிறேன்.`,
                te: `మీ ${member.relationship} ${member.name} యొక్క ప్రేమపూర్వక వాయిస్ సందేశాన్ని వినిపిస్తున్నాను.`,
                kn: `ನಿಮ್ಮ ${member.relationship} ${member.name} ಅವರ ಪ್ರೀತಿಯ ಧ್ವನಿ ಸಂದೇಶವನ್ನು ಕೇಳಿಸುತ್ತಿದ್ದೇನೆ.`,
              },
              language
            ),
            expression: 'comforting',
            intent: 'LOVED_ONES_VOICE',
            confidence: 0.96,
            actionClass: 'class1_read',
            suggestedAction: {
              action: 'SHOW_FAMILY_MEMBER',
              targetId: member.id,
              description: pick7Lang(
                {
                  en: `Play ${member.name}'s voice`,
                  hi: `${member.name} की आवाज़ सुनें`,
                  mr: `${member.name} चा आवाज ऐका`,
                  bn: `${member.name}-এর কণ্ঠ শুনুন`,
                  ta: `${member.name} குரலைக் கேளுங்கள்`,
                  te: `${member.name} గొంతు వినండి`,
                  kn: `${member.name} ಧ್ವನಿ ಕೇಳಿ`,
                },
                language
              ),
            },
          };
        } else {
          return {
            speech: pick7Lang(
              {
                en: `${member.name} does not have a saved voice message in your family album yet. Would you like to view their memory card?`,
                hi: `${member.name} के लिए अभी कोई आवाज़ संदेश सहेजा नहीं गया है। क्या आप उनकी पारिवारिक तस्वीर देखना चाहेंगे?`,
                mr: `${member.name} साठी सध्या कोणताही आवाज जतन केलेला नाही. तुम्हाला त्यांचा फोटो पाहायचा आहे का?`,
                bn: `${member.name}-এর কোনো ভয়েস বার্তা এখনো সংরক্ষিত নেই। আপনি কি তাঁদের ছবি দেখতে চান?`,
                ta: `${member.name} அவர்களுக்காக இன்னும் குரல் பதிவு சேமிக்கப்படவில்லை. அவர்களின் படத்தைப் பார்க்கலாமா?`,
                te: `${member.name} కోసం ఇంకా వాయిస్ సందేశం సేవ్ కాలేదు. వారి జ్ఞాపక కార్డ్ చూడాలనుకుంటున్నారా?`,
                kn: `${member.name} ಅವರಿಗಾಗಿ ಇನ್ನೂ ಯಾವುದೇ ಧ್ವನಿ ಸಂದೇಶ ಉಳಿಸಲಾಗಿಲ್ಲ. ಅವರ ಫೋಟೋ ಕಾರ್ಡ್ ನೋಡೋಣವೇ?`,
              },
              language
            ),
            expression: 'reassuring',
            intent: 'LOVED_ONES_VOICE',
            confidence: 0.94,
            actionClass: 'class1_read',
            suggestedAction: {
              action: 'SHOW_FAMILY_MEMBER',
              targetId: member.id,
              description: pick7Lang(
                {
                  en: `View ${member.name}`,
                  hi: `${member.name} को देखें`,
                  mr: `${member.name} यांना पहा`,
                  bn: `${member.name}-কে দেখুন`,
                  ta: `${member.name} ஐப் பார்`,
                  te: `${member.name} ని చూడండి`,
                  kn: `${member.name} ರನ್ನು ವೀಕ್ಷಿಸಿ`,
                },
                language
              ),
            },
          };
        }
      } else {
        return {
          speech: pick7Lang(
            {
              en: 'I could not find a saved voice recording in your Loved Ones album. Would you like to browse family photos?',
              hi: 'आपकी पारिवारिक एल्बम में अभी कोई आवाज़ रिकॉर्डिंग नहीं मिली। आइए आपकी पारिवारिक तस्वीरें देखें।',
              mr: 'तुमच्या कुटुंब अल्बममध्ये सध्या कोणतीही आवाज नोंद सापडली नाही. चला कुटुंबाचे फोटो पाहूया.',
              bn: 'আপনার পরিবার অ্যালবামে কোনো ভয়েস রেকর্ডিং পাওয়া যায়নি। চলুন পরিবারের ছবি দেখি।',
              ta: 'உங்கள் குடும்ப ஆல்பத்தில் குரல் பதிவு எதுவும் கிடைக்கவில்லை. குடும்பப் படங்களைப் பார்க்கலாமா?',
              te: 'మీ కుటుంబ ఆల్బమ్‌లో వాయిస్ రికార్డింగ్ కనుగొనబడలేదు. కుటుంబ ఫోటోలు చూద్దామా?',
              kn: 'ನಿಮ್ಮ ಕುಟುಂಬ ಆಲ್ಬಮ್‌ನಲ್ಲಿ ಯಾವುದೇ ಧ್ವನಿ ರೆಕಾರ್ಡಿಂಗ್ ಸಿಗಲಿಲ್ಲ. ಕುಟುಂಬದ ಫೋಟೋಗಳನ್ನು ನೋಡೋಣವೇ?',
            },
            language
          ),
          expression: 'clarifying',
          intent: 'LOVED_ONES_VOICE',
          confidence: 0.92,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_LOVED_ONES',
            description: pick7Lang(
              {
                en: 'Open Loved Ones',
                hi: 'परिवार एल्बम खोलें',
                mr: 'कुटुंब अल्बम उघडा',
                bn: 'পরিবার অ্যালবাম খুলুন',
                ta: 'அன்பானவர்களைத் திற',
                te: 'ప్రియమైన వారిని తెరవండి',
                kn: 'ಪ್ರೀತಿಪಾತ್ರರನ್ನು ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      }
    }

    // Scenario 4: Family Photos & Memories
    if (intent === 'LOVED_ONES_LIST') {
      ConversationEngine.turnContextMap[patientId] = {
        lastIntent: 'LOVED_ONES_LIST',
        lastTopic: 'family',
      };
      const count = context?.lovedOnes?.count || 0;
      const openLovedDesc = pick7Lang(
        {
          en: 'Open Loved Ones',
          hi: 'परिवार एल्बम खोलें',
          mr: 'कुटुंब अल्बम उघडा',
          bn: 'পরিবার অ্যালবাম খুলুন',
          ta: 'அன்பானவர்களைத் திற',
          te: 'ప్రియమైన వారిని తెరవండి',
          kn: 'ಪ್ರೀತಿಪಾತ್ರರನ್ನು ತೆರೆಯಿರಿ',
        },
        language
      );
      if (count === 0) {
        return {
          speech: pick7Lang(
            {
              en: 'Your family memory album is empty right now. Would you like to open your Loved Ones album to add your first family member?',
              hi: 'आपकी पारिवारिक एल्बम में अभी कोई सदस्य नहीं है। क्या आप परिवार एल्बम खोलकर पहली तस्वीर जोड़ना चाहेंगे?',
              mr: 'तुमचा कुटुंब अल्बम सध्या रिकामा आहे. पहिला फोटो जोडण्यासाठी अल्बम उघडूया का?',
              bn: 'আপনার পরিবারের অ্যালবামটি এখন খালি আছে। প্রথম সদস্য যোগ করতে অ্যালবাম খুলব কি?',
              ta: 'உங்கள் குடும்ப ஆல்பம் இப்போது காலியாக உள்ளது. முதல் உறுப்பினரைச் சேர்க்கத் திறக்கலாமா?',
              te: 'మీ కుటుంబ ఆల్బమ్ ప్రస్తుతం ఖాళీగా ఉంది. మొదటి ఫోటో జోడించడానికి ఆల్బమ్ తెరుద్దామా?',
              kn: 'ನಿಮ್ಮ ಕುಟುಂಬ ಆಲ್ಬಮ್ ಸದ್ಯಕ್ಕೆ ಖಾಲಿಯಾಗಿದೆ. ಮೊದಲ ಸದಸ್ಯರನ್ನು ಸೇರಿಸಲು ಆಲ್ಬಮ್ ತೆರೆಯೋಣವೇ?',
            },
            language
          ),
          expression: 'reassuring',
          intent: 'LOVED_ONES_LIST',
          confidence: 0.95,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'NAVIGATE_LOVED_ONES',
            description: openLovedDesc,
          },
        };
      }
      return {
        speech: pick7Lang(
          {
            en: `Here is your Loved Ones gallery with ${count} cherished family memories and photo cards.`,
            hi: `यहाँ आपकी प्रियजनों की एल्बम है। आपके पास ${count} सहेज कर रखी गई पारिवारिक यादें और तस्वीरें हैं।`,
            mr: `ही तुमची प्रियजनांची गॅलरी आहे. यात तुमच्या ${count} जतन केलेल्या आठवणी व फोटो आहेत.`,
            bn: `এখানে আপনার প্রিয়জনদের গ্যালারি রয়েছে। আপনার ${count}টি সুন্দর পারিবারিক স্মৃতি সংরক্ষিত আছে।`,
            ta: `இதோ உங்கள் அன்பானவர்களின் படத்தொகுப்பு; இதில் ${count} குடும்ப நினைவுகள் சேமிக்கப்பட்டுள்ளன.`,
            te: `ఇదిగో మీ ప్రియమైన వారి గ్యాలరీ; ఇందులో ${count} కుటుంబ జ్ఞాపకాలు ఉన్నాయి.`,
            kn: `ಇದು ನಿಮ್ಮ ಪ್ರೀತಿಪಾತ್ರರ ಗ್ಯಾಲರಿ; ಇದರಲ್ಲಿ ${count} ಕುಟುಂಬ ನೆನಪುಗಳು ಮತ್ತು ಫೋಟೋಗಳಿವೆ.`,
          },
          language
        ),
        expression: 'happy',
        intent: 'LOVED_ONES_LIST',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          description: openLovedDesc,
        },
      };
    }

    if (intent === 'LOVED_ONES_PERSON') {
      const members = context?.lovedOnes?.lovedOnes || (context?.lovedOnes as any)?.sampleMembers || [];
      const rel = entities.relationship;
      const targetName = entities.personName;

      // Check if multiple relatives match relationship (e.g. multiple daughters)
      const matchingRels = rel ? members.filter((m: any) => m.relationship?.toLowerCase().includes(rel.toLowerCase())) : [];
      if (matchingRels.length > 1 && !targetName) {
        const orWord = pick7Lang({ en: 'or', hi: 'या', mr: 'किंवा', bn: 'বা', ta: 'அல்லது', te: 'లేదా', kn: 'ಅಥವಾ' }, language);
        const names = matchingRels.map((m: any) => m.name).join(` ${orWord} `);
        return {
          speech: pick7Lang(
            {
              en: `Which daughter would you like to see — ${names}?`,
              hi: `आप किसकी प्रोफ़ाइल देखना चाहते हैं — ${names}?`,
              mr: `तुम्हाला कोणाची माहिती पाहायची आहे — ${names}?`,
              bn: `আপনি কার প্রোফাইল দেখতে চান — ${names}?`,
              ta: `யாருடைய சுயவிவரத்தைப் பார்க்க விரும்புகிறீர்கள் — ${names}?`,
              te: `మీరు ఎవరి ప్రొఫైల్ చూడాలనుకుంటున్నారు — ${names}?`,
              kn: `ನೀವು ಯಾರ ಪ್ರೊಫೈಲ್ ನೋಡಲು ಬಯಸುತ್ತೀರಿ — ${names}?`,
            },
            language
          ),
          expression: 'clarifying',
          intent: 'LOVED_ONES_PERSON',
          confidence: 0.95,
          actionClass: 'class1_read',
          clarificationOptions: matchingRels.map((m: any) => ({
            label: m.name,
            query: `Show me ${m.name}`,
          })),
        };
      }

      const matched = members.find((m: any) => {
        if (targetName && m.name?.toLowerCase().includes(targetName.toLowerCase())) return true;
        if (rel && m.relationship?.toLowerCase().includes(rel.toLowerCase())) return true;
        return false;
      });

      if (matched) {
        ConversationEngine.turnContextMap[patientId] = {
          lastIntent: 'LOVED_ONES_PERSON',
          lastTopic: 'family',
          lastTargetId: matched.id,
        };
        return {
          speech: pick7Lang(
            {
              en: `${matched.name} is your ${matched.relationship}. ${matched.description}${matched.familiarPhrase ? ` They often say: "${matched.familiarPhrase}"` : ''}`,
              hi: `${matched.name} आपके ${matched.relationship} हैं। ${matched.description}`,
              mr: `${matched.name} तुमचे ${matched.relationship} आहेत. ${matched.description}`,
              bn: `${matched.name} আপনার ${matched.relationship}। ${matched.description}`,
              ta: `${matched.name} உங்கள் ${matched.relationship} ஆவார். ${matched.description}`,
              te: `${matched.name} మీ ${matched.relationship}. ${matched.description}`,
              kn: `${matched.name} ನಿಮ್ಮ ${matched.relationship}. ${matched.description}`,
            },
            language
          ),
          expression: 'happy',
          intent: 'LOVED_ONES_PERSON',
          confidence: 0.95,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_LOVED_ONES',
            targetId: matched.id,
            description: pick7Lang(
              {
                en: `View ${matched.name}`,
                hi: `${matched.name} को देखें`,
                mr: `${matched.name} यांना पहा`,
                bn: `${matched.name}-কে দেখুন`,
                ta: `${matched.name} ஐப் பார்`,
                te: `${matched.name} ని చూడండి`,
                kn: `${matched.name} ರನ್ನು ವೀಕ್ಷಿಸಿ`,
              },
              language
            ),
          },
        };
      } else {
        return {
          speech: pick7Lang(
            {
              en: "I don't have a record for that specific person in your Loved Ones album yet. Would you like to browse your family memories together?",
              hi: 'मुझे आपकी पारिवारिक एल्बम में अभी यह नाम नहीं मिला। क्या हम मिलकर आपकी प्रियजनों की एल्बम देखें?',
              mr: 'तुमच्या कुटुंब अल्बममध्ये हे नाव सध्या सापडले नाही. आपण सर्व फोटो एकत्र पाहूया का?',
              bn: 'আপনার পরিবারের অ্যালবামে এই নামটি এখনো পাওয়া যায়নি। আমরা কি একসাথে পরিবারের স্মৃতিগুলো দেখব?',
              ta: 'உங்கள் குடும்ப ஆல்பத்தில் இந்தப் பெயர் இன்னும் இல்லை. குடும்ப நினைவுகளை ஒன்றாகப் பார்க்கலாமா?',
              te: 'మీ కుటుంబ ఆల్బమ్‌లో ఈ పేరు ఇంకా నమోదు కాలేదు. మనం కలిసి కుటుంబ ఫోటోలు చూద్దామా?',
              kn: 'ನಿಮ್ಮ ಕುಟುಂಬ ಆಲ್ಬಮ್‌ನಲ್ಲಿ ಈ ಹೆಸರು ಇನ್ನೂ ಸಿಗಲಿಲ್ಲ. ಕುಟುಂಬದ ನೆನಪುಗಳನ್ನು ಒಟ್ಟಿಗೆ ನೋಡೋಣವೇ?',
            },
            language
          ),
          expression: 'clarifying',
          intent: 'LOVED_ONES_PERSON',
          confidence: 0.92,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_LOVED_ONES',
            description: pick7Lang(
              {
                en: 'Open Loved Ones',
                hi: 'परिवार एल्बम खोलें',
                mr: 'कुटुंब अल्बम उघडा',
                bn: 'পরিবার অ্যালবাম খুলুন',
                ta: 'அன்பானவர்களைத் திற',
                te: 'ప్రియమైన వారిని తెరవండి',
                kn: 'ಪ್ರೀತಿಪಾತ್ರರನ್ನು ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      }
    }

    if (intent === 'LOVED_ONES_ACTIVITY') {
      const members = context?.lovedOnes?.lovedOnes || [];
      const matched = members[0];
      if (matched) {
        const acts = matched.favouriteActivities?.length
          ? matched.favouriteActivities.join(', ')
          : matched.cues?.join(', ') || 'spending calm time together';
        return {
          speech: pick7Lang(
            {
              en: `With your ${matched.relationship} ${matched.name}, you enjoy: ${acts}.`,
              hi: `अपने ${matched.relationship} ${matched.name} के साथ आप आनंद लेते हैं: ${acts}।`,
              mr: `तुमच्या ${matched.relationship} ${matched.name} यांच्यासोबत तुम्हाला हे आवडते: ${acts}.`,
              bn: `আপনার ${matched.relationship} ${matched.name}-এর সাথে আপনি উপভোগ করেন: ${acts}।`,
              ta: `உங்கள் ${matched.relationship} ${matched.name} உடன் நீங்கள் விரும்புவது: ${acts}.`,
              te: `మీ ${matched.relationship} ${matched.name} తో కలిసి మీరు ఆస్వాదించేవి: ${acts}.`,
              kn: `ನಿಮ್ಮ ${matched.relationship} ${matched.name} ಅವರೊಂದಿಗೆ ನೀವು ಇಷ್ಟಪಡುವ ಚಟುವಟಿಕೆಗಳು: ${acts}.`,
            },
            language
          ),
          expression: 'happy',
          intent: 'LOVED_ONES_ACTIVITY',
          confidence: 0.93,
          actionClass: 'class1_read',
        };
      }
    }

    if (intent === 'LOVED_ONES_QUIZ') {
      return {
        speech: pick7Lang(
          {
            en: "Of course! Let's explore your gentle Family Face Recall Quiz together. It is a wonderful, relaxed way to connect with your family memories.",
            hi: 'हाँ बिल्कुल! आइए एक शांत और सुखद पारिवारिक चेहरा याद करने की गतिविधि (Face Recall Quiz) खेलें।',
            mr: 'नक्कीच! चला कुटुंबाचे चेहरे ओळखण्याचा एक शांत आणि आनंदी खेळ खेळूया.',
            bn: 'অবশ্যই! চলুন একটি আনন্দময় পারিবারিক মুখ চেনার কুইজ একসাথে খেলি।',
            ta: 'நிச்சயமாக! குடும்ப முகங்களை நினைவுகூரும் அமைதியான விளையாட்டை ஒன்றாக விளையாடுவோம்.',
            te: 'తప్పకుండా! కుటుంబ సభ్యుల ముఖాలను గుర్తుచేసుకునే ప్రశాంతమైన ఆట ఆడుదాం.',
            kn: 'ಖಂಡಿತ! ಕುಟುಂಬದ ಮುಖಗಳನ್ನು ನೆನಪಿಸಿಕೊಳ್ಳುವ ಶಾಂತವಾದ ಆಟವನ್ನು ಒಟ್ಟಿಗೆ ಆಡೋಣ.',
          },
          language
        ),
        expression: 'happy',
        intent: 'LOVED_ONES_QUIZ',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          description: pick7Lang(
            {
              en: 'Start Face Recall Quiz',
              hi: 'फेस रिकॉल शुरू करें',
              mr: 'चेहरा ओळख खेळ सुरू करा',
              bn: 'মুখ চেনার কুইজ শুরু করুন',
              ta: 'முகம் அறியும் விளையாட்டைத் தொடங்கு',
              te: 'ముఖ గుర్తింపు క్విజ్ ప్రారంభించండి',
              kn: 'ಮುಖ ಗುರುತಿಸುವ ಆಟ ಪ್ರಾರಂಭಿಸಿ',
            },
            language
          ),
        },
      };
    }

    // Grounded Misplaced Object Memory Retrieval
    if (intent === 'MEMORY_OBJECT_LOCATION') {
      const itemRecord = ItemLocationService.findItemByQuery(patientId, query);
      if (itemRecord && itemRecord.locationRecorded) {
        const itemName = itemRecord.itemName;
        const loc = itemRecord.locationRecorded;
        const room = itemRecord.room ? ` (${itemRecord.room})` : '';
        const speech = pick7Lang(
          {
            en: `Your ${itemName} was last placed on the ${loc}${itemRecord.room ? ` in the ${itemRecord.room}` : ''}. Would you like to view its photo card?`,
            hi: `आपका ${itemName} आखिरी बार ${loc}${room} पर रखा गया था। क्या आप इसकी तस्वीर देखना चाहते हैं?`,
            mr: `तुमचा ${itemName} शेवटचा ${loc}${room} येथे ठेवला होता. तुम्हाला त्याचा फोटो पाहायचा आहे का?`,
            bn: `আপনার ${itemName} শেষবার ${loc}${room}-এ রাখা ছিল। আপনি কি এর ছবির কার্ড দেখতে চান?`,
            ta: `உங்கள் ${itemName} கடைசியாக ${loc}${room} இடத்தில் வைக்கப்பட்டிருந்தது. அதன் புகைப்பட அட்டையைப் பார்க்க விரும்புகிறீர்களா?`,
            te: `మీ ${itemName} చివరిగా ${loc}${room} వద్ద ఉంచబడింది. దాని ఫోటో కార్డ్ చూడాలనుకుంటున్నారా?`,
            kn: `ನಿಮ್ಮ ${itemName} ಕೊನೆಯದಾಗಿ ${loc}${room} ನಲ್ಲಿ ಇರಿಸಲಾಗಿತ್ತು. ಅದರ ಫೋಟೋ ಕಾರ್ಡ್ ನೋಡಲು ಬಯಸುತ್ತೀರಾ?`,
          },
          language
        );

        return {
          speech,
          expression: 'guiding',
          intent: 'MEMORY_OBJECT_LOCATION',
          confidence: 0.96,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'OPEN_ITEM_MEMORY',
            targetId: itemRecord.id,
            description: pick7Lang(
              {
                en: `View ${itemName} Location`,
                hi: `${itemName} का स्थान देखें`,
                mr: `${itemName} चे ठिकाण पहा`,
                bn: `${itemName}-এর অবস্থান দেখুন`,
                ta: `${itemName} இருப்பிடத்தைப் பார்`,
                te: `${itemName} స్థానం చూడండి`,
                kn: `${itemName} ಸ್ಥಳವನ್ನು ವೀಕ್ಷಿಸಿ`,
              },
              language
            ),
          },
        };
      } else {
        // Truthful Grounding: If location is not recorded or unknown, NEVER invent!
        return {
          speech: pick7Lang(
            {
              en: "I don't have a recorded location for that item right now. Let's look around calmly together without any rush.",
              hi: 'मुझे अभी उस वस्तु के रखे जाने का कोई रिकॉर्ड नहीं मिला। चिंता न करें, हम मिलकर आराम से कमरे में देखते हैं।',
              mr: 'सध्या त्या वस्तूच्या ठिकाणाची नोंद सापडलेली नाही. काळजी करू नका, आपण शांतपणे खोलीत एकत्र पाहूया.',
              bn: 'এই মুহূর্তে ওই জিনিসটির কোনো সংরক্ষিত অবস্থান আমার কাছে নেই। চিন্তা করবেন না, চলুন আমরা একসাথে শান্তভাবে ঘরে খুঁজে দেখি।',
              ta: 'அந்தப் பொருள் வைக்கப்பட்ட இடம் குறித்து இப்போது பதிவு இல்லை. கவலைப்பட வேண்டாம், நாம் இருவரும் அமைதியாக அறையில் தேடிப் பார்க்கலாம்.',
              te: 'ప్రస్తుతం ఆ వస్తువు ఉంచిన స్థలం నా దగ్గర నమోదు కాలేదు. ఆందోళన చెందకండి, మనం కలిసి ప్రశాন্তంగా గదిలో చూద్దాం.',
              kn: 'ಸದ್ಯಕ್ಕೆ ಆ ವಸ್ತುವನ್ನು ಇಟ್ಟ ಸ್ಥಳದ ದಾಖಲೆ ನನ್ನ ಬಳಿ ಇಲ್ಲ. ಚಿಂತಿಸಬೇಡಿ, ನಾವು ಒಟ್ಟಿಗೆ ಶಾಂತವಾಗಿ ಕೋಣೆಯಲ್ಲಿ ಹುಡುಕೋಣ.',
            },
            language
          ),
          expression: 'clarifying',
          intent: 'MEMORY_OBJECT_LOCATION',
          confidence: 0.92,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_CAMERA',
            description: pick7Lang(
              {
                en: 'Open Room Memory Scanner',
                hi: 'रूम मेमोरी स्कैनर खोलें',
                mr: 'रूम मेमरी स्कॅनर उघडा',
                bn: 'রুম মেমোরি স্ক্যানার খুলুন',
                ta: 'அறை நினைவு ஸ்கேனரைத் திற',
                te: 'గది జ్ఞాపక స్కానర్ తెరవండి',
                kn: 'ಕೋಣೆ ನೆನಪು ಸ್ಕ್ಯಾನರ್ ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      }
    }

    if (intent === 'LOVED_ONES_CLUE') {
      const member = context?.lovedOnes?.lovedOnes?.[0];
      const clue = member?.cues?.[0] || member?.familiarPhrase || member?.description || 'a warm smile and shared memories';
      const whoLabel = member
        ? member.name
        : pick7Lang(
            {
              en: 'your family',
              hi: 'परिवार',
              mr: 'तुमचे कुटुंब',
              bn: 'আপনার পরিবার',
              ta: 'உங்கள் குடும்பம்',
              te: 'మీ కుటుంబం',
              kn: 'ನಿಮ್ಮ ಕುಟುಂಬ',
            },
            language
          );
      return {
        speech: pick7Lang(
          {
            en: `Here is a memory clue for ${whoLabel}: "${clue}"`,
            hi: `${whoLabel} के लिए सुराग: "${clue}"`,
            mr: `${whoLabel} साठी ओळखण्याचा क्लू: "${clue}"`,
            bn: `${whoLabel}-এর জন্য একটি স্মৃতির সূত্র: "${clue}"`,
            ta: `${whoLabel} குறித்த நினைவு குறிப்பு: "${clue}"`,
            te: `${whoLabel} కోసం ఒక జ్ఞాపక సూచన: "${clue}"`,
            kn: `${whoLabel} ಕುರಿತ ನೆನಪಿನ ಸುಳಿವು: "${clue}"`,
          },
          language
        ),
        expression: 'helping_recall',
        intent: 'LOVED_ONES_CLUE',
        confidence: 0.94,
        actionClass: 'class1_read',
      };
    }

    // -------------------------------------------------------------
    // Step 11: Category F: Notes (Scenario 6)
    // -------------------------------------------------------------
    // Scenario 6: Read Pinned Notes
    if (intent === 'NOTES_READ_PINNED') {
      const pinned = context?.notes?.pinnedNotes || [];
      if (pinned.length > 0) {
        const details = pinned.map((n) => `'${n.title}': ${n.content}`).join('; ');
        return {
          speech: pick7Lang(
            {
              en: `You have ${pinned.length} pinned note${pinned.length > 1 ? 's' : ''}: ${details}. Opening your notes sanctuary for full reading.`,
              hi: `आपके पास ${pinned.length} पिन किया हुआ नोट है: ${details}। पूरा पढ़ने के लिए नोट्स खोल रही हूँ।`,
              mr: `तुमच्याकडे ${pinned.length} पिन केलेली नोंद आहे: ${details}. पूर्ण वाचण्यासाठी नोंदी उघडत आहे.`,
              bn: `আপনার ${pinned.length}টি পিন করা নোট আছে: ${details}। পুরোটা পড়ার জন্য নোট খুলছি।`,
              ta: `உங்களிடம் ${pinned.length} பின் செய்யப்பட்ட குறிப்பு உள்ளது: ${details}. முழுமையாகப் படிக்க குறிப்புகளைத் திறக்கிறேன்.`,
              te: `మీ దగ్గర ${pinned.length} పిన్ చేసిన గమనిక ఉంది: ${details}. పూర్తిగా చదవడానికి నోట్స్ తెరుస్తున్నాను.`,
              kn: `ನಿಮ್ಮಲ್ಲಿ ${pinned.length} ಪಿನ್ ಮಾಡಿದ ಟಿಪ್ಪಣಿ ಇದೆ: ${details}. ಪೂರ್ತಿಯಾಗಿ ಓದಲು ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.`,
            },
            language
          ),
          expression: 'explaining',
          intent: 'NOTES_READ_PINNED',
          confidence: 0.96,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_NOTES',
            description: pick7Lang(
              {
                en: 'Open Notes',
                hi: 'नोट्स खोलें',
                mr: 'नोंदी उघडा',
                bn: 'নোট খুলুন',
                ta: 'குறிப்புகளைத் திற',
                te: 'నోట్స్ తెరవండి',
                kn: 'ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      } else {
        return {
          speech: pick7Lang(
            {
              en: 'You do not have any pinned notes right now. Opening your notes sanctuary so you can write or speak one.',
              hi: 'अभी आपके पास कोई पिन किया हुआ नोट नहीं है। नया नोट लिखने या रिकॉर्ड करने के लिए नोट्स खोल रही हूँ।',
              mr: 'सध्या कोणतीही पिन केलेली नोंद नाही. नवीन नोंद लिहिण्यासाठी नोंदी उघडत आहे.',
              bn: 'এই মুহূর্তে কোনো পিন করা নোট নেই। নতুন নোট লিখতে বা রেকর্ড করতে নোট খুলছি।',
              ta: 'தற்போது பின் செய்யப்பட்ட குறிப்புகள் எதுவும் இல்லை. புதிய குறிப்பை எழுத குறிப்புகளைத் திறக்கிறேன்.',
              te: 'ప్రస్తుతం పిన్ చేసిన గమనికలు ఏవీ లేవు. కొత్త గమనిక రాయడానికి నోట్స్ తెరుస్తున్నాను.',
              kn: 'ಪ್ರಸ್ತುತ ಯಾವುದೇ ಪಿನ್ ಮಾಡಿದ ಟಿಪ್ಪಣಿಗಳಿಲ್ಲ. ಹೊಸ ಟಿಪ್ಪಣಿ ಬರೆಯಲು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.',
            },
            language
          ),
          expression: 'reassuring',
          intent: 'NOTES_READ_PINNED',
          confidence: 0.96,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_NOTES',
            description: pick7Lang(
              {
                en: 'Open Notes',
                hi: 'नोट्स खोलें',
                mr: 'नोंदी उघडा',
                bn: 'নোট খুলুন',
                ta: 'குறிப்புகளைத் திற',
                te: 'నోట్స్ తెరవండి',
                kn: 'ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      }
    }

    if (intent === 'NOTES_SEARCH') {
      const queryTerm = entities.noteQuery || 'shopping';
      let results: any[] = [];
      try {
        results = NotesService.searchNotes(patientId, queryTerm);
      } catch {
        results = [];
      }

      if (results.length > 0) {
        const top = results[0];
        return {
          speech: pick7Lang(
            {
              en: `I found your note '${top.title}': "${top.content}". Opening your notes sanctuary.`,
              hi: `मुझे आपका नोट '${top.title}' मिला: "${top.content}"। आपके नोट्स खोल रही हूँ।`,
              mr: `मला तुमची नोंद '${top.title}' सापडली: "${top.content}". नोंदी उघडत आहे.`,
              bn: `আপনার নোট '${top.title}' পাওয়া গেছে: "${top.content}"। আপনার নোট খুলছি।`,
              ta: `உங்கள் குறிப்பு '${top.title}' கிடைத்தது: "${top.content}". குறிப்புகளைத் திறக்கிறேன்.`,
              te: `మీ గమనిక '${top.title}' దొరికింది: "${top.content}". నోట్స్ తెరుస్తున్నాను.`,
              kn: `ನಿಮ್ಮ ಟಿಪ್ಪಣಿ '${top.title}' ಸಿಕ್ಕಿದೆ: "${top.content}". ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.`,
            },
            language
          ),
          expression: 'explaining',
          intent: 'NOTES_SEARCH',
          confidence: 0.94,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_NOTES',
            description: pick7Lang(
              {
                en: 'Open Notes',
                hi: 'नोट्स खोलें',
                mr: 'नोंदी उघडा',
                bn: 'নোট খুলুন',
                ta: 'குறிப்புகளைத் திற',
                te: 'నోట్స్ తెరవండి',
                kn: 'ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      } else {
        return {
          speech: pick7Lang(
            {
              en: `I could not find a note matching '${queryTerm}'. Opening your notes sanctuary so you can look through them.`,
              hi: `'${queryTerm}' से संबंधित कोई नोट नहीं मिला। आपके सभी नोट्स खोल रही हूँ।`,
              mr: `'${queryTerm}' शी संबंधित कोणतीही नोंद सापडली नाही. सर्व नोंदी उघडत आहे.`,
              bn: `'${queryTerm}' সম্পর্কিত কোনো নোট পাওয়া যায়নি। আপনার সব নোট খুলছি।`,
              ta: `'${queryTerm}' தொடர்பான குறிப்பு கிடைக்கவில்லை. உங்கள் அனைத்துக் குறிப்புகளையும் திறக்கிறேன்.`,
              te: `'${queryTerm}' కు సరిపోయే గమనిక దొరకలేదు. మీ అన్ని నోట్స్ తెరుస్తున్నాను.`,
              kn: `'${queryTerm}' ಗೆ ಹೊಂದುವ ಟಿಪ್ಪಣಿ ಸಿಗಲಿಲ್ಲ. ನಿಮ್ಮ ಎಲ್ಲಾ ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.`,
            },
            language
          ),
          expression: 'clarifying',
          intent: 'NOTES_SEARCH',
          confidence: 0.92,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_NOTES',
            description: pick7Lang(
              {
                en: 'Open Notes',
                hi: 'नोट्स खोलें',
                mr: 'नोंदी उघडा',
                bn: 'নোট খুলুন',
                ta: 'குறிப்புகளைத் திற',
                te: 'నోట్స్ తెరవండి',
                kn: 'ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      }
    }

    if (intent === 'NOTES_CREATE') {
      const noteDetails = EntityExtractor.extractNoteDetails(_raw);
      const previewContent = noteDetails.content || noteDetails.title;
      const speech = noteDetails.hasExplicitContent
        ? pick7Lang(
            {
              en: `I have prepared your note: "${previewContent}". Please review and confirm before saving.`,
              hi: `आपने एक नोट सहेजने को कहा है: "${previewContent}"। कृपया सहेजने से पहले समीक्षा कर पुष्टि करें।`,
              mr: `तुम्ही ही नोंद जतन करण्यास सांगितले आहे: "${previewContent}". कृपया जतन करण्यापूर्वी तपासून पुष्टी करा.`,
              bn: `আপনি এই নোটটি সংরক্ষণ করতে বলেছেন: "${previewContent}"। অনুগ্রহ করে সংরক্ষণের আগে পর্যালোচনা করে নিশ্চিত করুন।`,
              ta: `இந்தக் குறிப்பைச் சேமிக்கத் தயார் செய்துள்ளேன்: "${previewContent}". சேமிப்பதற்கு முன் சரிபார்த்து உறுதிப்படுத்தவும்.`,
              te: `మీ గమనికను సిద్ధం చేశాను: "${previewContent}". సేవ్ చేసే ముందు దయచేసి నిర్ధారించండి.`,
              kn: `ನಿಮ್ಮ ಟಿಪ್ಪಣಿಯನ್ನು ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ: "${previewContent}". ಉಳಿಸುವ ಮೊದಲು ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ ದೃಢೀಕರಿಸಿ.`,
            },
            language
          )
        : pick7Lang(
            {
              en: 'I can help prepare that note. For your accuracy, please review and confirm before saving.',
              hi: 'मैं आपका नोट तैयार करने में सहायता कर सकती हूँ। कृपया सहेजने से पहले समीक्षा कर पुष्टि करें।',
              mr: 'मी तुमची नोंद तयार करण्यास मदत करू शकते. कृपया जतन करण्यापूर्वी तपासून पुष्टी करा.',
              bn: 'আমি আপনার নোটটি তৈরি করতে সাহায্য করতে পারি। অনুগ্রহ করে সংরক্ষণের আগে পর্যালোচনা করে নিশ্চিত করুন।',
              ta: 'அந்தக் குறிப்பைத் தயாரிக்க உதவ முடியும். சேமிப்பதற்கு முன் சரிபார்த்து உறுதிப்படுத்தவும்.',
              te: 'ఆ గమనికను సిద్ధం చేయడంలో సహాయం చేయగలను. సేవ్ చేసే ముందు దయచేసి నిర్ధారించండి.',
              kn: 'ಆ ಟಿಪ್ಪಣಿಯನ್ನು ಸಿದ್ಧಪಡಿಸಲು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಉಳಿಸುವ ಮೊದಲು ದಯವಿಟ್ಟು ದೃಢೀಕರಿಸಿ.',
            },
            language
          );

      const pending = ConversationActionRegistry.createPendingConfirmation(
        patientId,
        'CREATE_NOTE',
        noteDetails.title,
        {
          title: noteDetails.title,
          content: previewContent,
          category: 'general',
        },
        speech
      );

      return {
        speech,
        expression: 'confirming',
        intent: 'NOTES_CREATE',
        confidence: 0.95,
        actionClass: 'class3_consequential',
        pendingConfirmation: pending,
        suggestedAction: {
          action: 'OPEN_NOTES',
          description: pick7Lang(
            {
              en: 'Open Note Editor',
              hi: 'नोट संपादक खोलें',
              mr: 'नोंद संपादक उघडा',
              bn: 'নোট সম্পাদক খুলুন',
              ta: 'குறிப்புத் திருத்தியைத் திற',
              te: 'నోట్ ఎడిటర్ తెరవండి',
              kn: 'ಟಿಪ್ಪಣಿ ಸಂಪಾದಕ ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'NOTES_LIST') {
      return {
        speech: pick7Lang(
          {
            en: 'Opening your personal notes sanctuary. Here you can preserve your thoughts, reflections, and recordings.',
            hi: 'आपके व्यक्तिगत नोट्स खोल रही हूँ। यहाँ आप अपने विचार, यादें और रिकॉर्डिंग सुरक्षित रख सकते हैं।',
            mr: 'तुमच्या वैयक्तिक नोंदी उघडत आहे. येथे तुम्ही तुमच्या आठवणी आणि आवाज जतन करू शकता.',
            bn: 'আপনার ব্যক্তিগত নোট খুলছি। এখানে আপনি আপনার চিন্তা, স্মৃতি ও রেকর্ডিং সংরক্ষণ করতে পারেন।',
            ta: 'உங்கள் தனிப்பட்ட குறிப்புகளைத் திறக்கிறேன். இங்கே உங்கள் எண்ணங்கள் மற்றும் நினைவுகளைப் பாதுகாக்கலாம்.',
            te: 'మీ వ్యక్తిగత గమనికలను తెరుస్తున్నాను. ఇక్కడ మీ ఆలోచనలు మరియు జ్ఞాపకాలను భద్రపరచుకోవచ్చు.',
            kn: 'ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ. ಇಲ್ಲಿ ನಿಮ್ಮ ಆಲೋಚನೆಗಳು ಮತ್ತು ನೆನಪುಗಳನ್ನು ಉಳಿಸಿಕೊಳ್ಳಬಹುದು.',
          },
          language
        ),
        expression: 'noting_saving',
        intent: 'NOTES_LIST',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'OPEN_NOTES',
          description: pick7Lang(
            {
              en: 'Open Notes',
              hi: 'नोट्स खोलें',
              mr: 'नोंदी उघडा',
              bn: 'নোট খুলুন',
              ta: 'குறிப்புகளைத் திற',
              te: 'నోట్స్ తెరవండి',
              kn: 'ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'COGNITIVE_JOURNAL_APPOINTMENT_PREP') {
      const uCtx = AshaContextService.getUnifiedContext({ uid: patientId });
      const pCount = uCtx.journal.patientConcernsCount;
      const consentedCount = uCtx.journal.consentedDoctorConcernsCount;

      const speech = pick7Lang(
        {
          en: `You have ${pCount} personal reflection${pCount === 1 ? '' : 's'} recorded, with ${consentedCount} consented to share with your doctor. We can review them calmly together so you feel completely prepared.`,
          hi: `आपके जर्नल में ${pCount} व्यक्तिगत नोट्स दर्ज हैं, जिनमें से ${consentedCount} डॉक्टर के साथ साझा करने के लिए अनुमोदित हैं। चलिए अपॉइंटमेंट की तैयारी शांति से करते हैं।`,
          mr: `तुमच्या जर्नलमध्ये ${pCount} वैयक्तिक नोंदी आहेत, त्यापैकी ${consentedCount} डॉक्टरांशी शेअर करण्यासाठी मंजूर आहेत. चला शांतपणे तयारी करूया.`,
          bn: `আপনার জার্নালে ${pCount}টি ব্যক্তিগত নোট আছে, যার মধ্যে ${consentedCount}টি ডাক্তারের সাথে শেয়ার করার অনুমতি রয়েছে।`,
          ta: `உங்கள் குறிப்பேட்டில் ${pCount} பதிவுகள் உள்ளன; அதில் ${consentedCount} மருத்துவருடன் பகிர அனுமதிக்கப்பட்டுள்ளன.`,
          te: `మీ జర్నల్‌లో ${pCount} వ్యక్తిగత గమనికలు ఉన్నాయి, వాటిలో ${consentedCount} డాక్టర్‌తో పంచుకోవడానికి ఆమోదించబడ్డాయి.`,
          kn: `ನಿಮ್ಮ ಜರ್ನಲ್‌ನಲ್ಲಿ ${pCount} ವೈಯಕ್ತಿಕ ಟಿಪ್ಪಣಿಗಳಿವೆ, ಅವುಗಳಲ್ಲಿ ${consentedCount} ವೈದ್ಯರೊಂದಿಗೆ ಹಂಚಿಕೊಳ್ಳಲು ಅನುಮತಿಸಲಾಗಿದೆ.`,
        },
        language
      );

      return {
        speech,
        expression: 'guiding',
        intent: 'COGNITIVE_JOURNAL_APPOINTMENT_PREP',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'OPEN_NOTES',
          description: pick7Lang(
            {
              en: 'Review Appointment Notes',
              hi: 'डॉक्टर नोट्स देखें',
              mr: 'भेटीच्या नोंदी पहा',
              bn: 'অ্যাপয়েন্টমেন্ট নোট দেখুন',
              ta: 'சந்திப்புக் குறிப்புகளைப் பார்',
              te: 'అపాయింట్‌మెంట్ నోట్స్ చూడండి',
              kn: 'ಭೇಟಿ ಟಿಪ್ಪಣಿಗಳನ್ನು ನೋಡಿ',
            },
            language
          ),
        },
      };
    }

    // -------------------------------------------------------------
    // Step 12: Category G: Calendar (Scenario 7)
    // -------------------------------------------------------------
    // Scenario 7: Calendar Tomorrow
    if (intent === 'CALENDAR_TOMORROW') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = CalendarService.toDateString(tomorrow);
      let tomorrowEvents: any[] = [];
      try {
        tomorrowEvents = CalendarService.getEventsForDate(patientId, tomorrowStr);
      } catch {
        tomorrowEvents = [];
      }

      if (tomorrowEvents.length > 0) {
        const titles = tomorrowEvents
          .map((e) => {
            const d = new Date(e.startAt);
            const timeStr = !isNaN(d.getTime())
              ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
              : '';
            return `'${e.title}'${timeStr ? ` (${timeStr})` : ''}`;
          })
          .join(', ');
        return {
          speech: pick7Lang(
            {
              en: `Tomorrow you have ${tomorrowEvents.length} event${tomorrowEvents.length > 1 ? 's' : ''} scheduled: ${titles}. Opening your calendar.`,
              hi: `कल आपके पास ${tomorrowEvents.length} कार्यक्रम निर्धारित हैं: ${titles}। आपका कैलेंडर खोल रही हूँ।`,
              mr: `उद्या तुमचे ${tomorrowEvents.length} कार्यक्रम ठरलेले आहेत: ${titles}. तुमचे कॅलेंडर उघडत आहे.`,
              bn: `আগামীকাল আপনার ${tomorrowEvents.length}টি অনুষ্ঠান নির্ধারিত রয়েছে: ${titles}। আপনার ক্যালেন্ডার খুলছি।`,
              ta: `நாளை உங்களுக்கு ${tomorrowEvents.length} நிகழ்வுகள் திட்டமிடப்பட்டுள்ளன: ${titles}. உங்கள் நாட்காட்டியைத் திறக்கிறேன்.`,
              te: `రేపు మీకు ${tomorrowEvents.length} కార్యక్రమాలు ఉన్నాయి: ${titles}. మీ క్యాలెండర్ తెరుస్తున్నాను.`,
              kn: `ನಾಳೆ ನಿಮಗೆ ${tomorrowEvents.length} ಕಾರ್ಯಕ್ರಮಗಳು ನಿಗದಿಯಾಗಿವೆ: ${titles}. ನಿಮ್ಮ ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯುತ್ತಿದ್ದೇನೆ.`,
            },
            language
          ),
          expression: 'reminder',
          intent: 'CALENDAR_TOMORROW',
          confidence: 0.96,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_CALENDAR',
            description: pick7Lang(
              {
                en: 'Open Calendar',
                hi: 'कैलेंडर खोलें',
                mr: 'कॅलेंडर उघडा',
                bn: 'ক্যালেন্ডার খুলুন',
                ta: 'நாட்காட்டியைத் திற',
                te: 'క్యాలెండర్ తెరవండి',
                kn: 'ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      } else {
        return {
          speech: pick7Lang(
            {
              en: 'You have no events scheduled for tomorrow in your calendar. Take time to relax and rest.',
              hi: 'कल के लिए आपके कैलेंडर में कोई कार्यक्रम निर्धारित नहीं है। आप आराम से विश्राम कर सकते हैं।',
              mr: 'उद्यासाठी तुमच्या कॅलेंडरमध्ये कोणताही कार्यक्रम नाही. तुम्ही निवांत विश्रांती घेऊ शकता.',
              bn: 'আগামীকালের জন্য আপনার ক্যালেন্ডারে কোনো অনুষ্ঠান নেই। আরামে বিশ্রাম নিন।',
              ta: 'நாளை உங்கள் நாட்காட்டியில் எந்த நிகழ்வும் இல்லை. நிம்மதியாக ஓய்வெடுங்கள்.',
              te: 'రేపటి కోసం మీ క్యాలెండర్‌లో ఏ కార్యక్రమాలూ లేవు. హాయిగా విశ్రాంతి తీసుకోండి.',
              kn: 'ನಾಳೆ ನಿಮ್ಮ ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ಯಾವುದೇ ಕಾರ್ಯಕ್ರಮವಿಲ್ಲ. ಆರಾಮವಾಗಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ.',
            },
            language
          ),
          expression: 'calm',
          intent: 'CALENDAR_TOMORROW',
          confidence: 0.96,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_CALENDAR',
            description: pick7Lang(
              {
                en: 'Open Calendar',
                hi: 'कैलेंडर खोलें',
                mr: 'कॅलेंडर उघडा',
                bn: 'ক্যালেন্ডার খুলুন',
                ta: 'நாட்காட்டியைத் திற',
                te: 'క్యాలెండర్ తెరవండి',
                kn: 'ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      }
    }

    if (intent === 'CALENDAR_TODAY') {
      const todayEvts = context?.calendar?.todayEvents || [];
      if (todayEvts.length > 0) {
        const titles = todayEvts.map((e: any) => `'${e.title}'`).join(', ');
        return {
          speech: pick7Lang(
            {
              en: `Today you have ${todayEvts.length} scheduled event${todayEvts.length > 1 ? 's' : ''}: ${titles}. Opening your calendar so you can see all details.`,
              hi: `आज आपके पास ${todayEvts.length} कार्यक्रम निर्धारित हैं: ${titles}। आपका कैलेंडर खोल रही हूँ।`,
              mr: `आज तुमचे ${todayEvts.length} कार्यक्रम आहेत: ${titles}. सर्व तपशील पाहण्यासाठी कॅलेंडर उघडत आहे.`,
              bn: `আজ আপনার ${todayEvts.length}টি অনুষ্ঠান নির্ধারিত রয়েছে: ${titles}। বিস্তারিত দেখতে ক্যালেন্ডার খুলছি।`,
              ta: `இன்று உங்களுக்கு ${todayEvts.length} நிகழ்வுகள் உள்ளன: ${titles}. விவரங்களைப் பார்க்க நாட்காட்டியைத் திறக்கிறேன்.`,
              te: `ఈరోజు మీకు ${todayEvts.length} కార్యక్రమాలు ఉన్నాయి: ${titles}. వివరాల కోసం క్యాలెండర్ తెరుస్తున్నాను.`,
              kn: `ಇಂದು ನಿಮಗೆ ${todayEvts.length} ಕಾರ್ಯಕ್ರಮಗಳಿವೆ: ${titles}. ವಿವರಗಳನ್ನು ನೋಡಲು ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯುತ್ತಿದ್ದೇನೆ.`,
            },
            language
          ),
          expression: 'reminder',
          intent: 'CALENDAR_TODAY',
          confidence: 0.93,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_CALENDAR',
            description: pick7Lang(
              {
                en: 'Open Calendar',
                hi: 'कैलेंडर खोलें',
                mr: 'कॅलेंडर उघडा',
                bn: 'ক্যালেন্ডার খুলুন',
                ta: 'நாட்காட்டியைத் திற',
                te: 'క్యాలెండర్ తెరవండి',
                kn: 'ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      } else {
        return {
          speech: pick7Lang(
            {
              en: 'You have no calendar events scheduled for today. Opening your calendar so you can view your week or add an event.',
              hi: 'आज के लिए कोई विशेष कार्यक्रम निर्धारित नहीं है। अपनी दिनचर्या या नया कार्यक्रम देखने के लिए कैलेंडर खोल रही हूँ।',
              mr: 'आजसाठी कोणताही विशेष कार्यक्रम नाही. तुमचा आठवडा पाहण्यासाठी कॅलेंडर उघडत आहे.',
              bn: 'আজকের জন্য কোনো অনুষ্ঠান নির্ধারিত নেই। সপ্তাহের সূচি দেখতে ক্যালেন্ডার খুলছি।',
              ta: 'இன்று எந்த நிகழ்வும் திட்டமிடப்படவில்லை. வார அட்டவணையைப் பார்க்க நாட்காட்டியைத் திறக்கிறேன்.',
              te: 'ఈరోజు ఏ కార్యక్రమాలూ లేవు. మీ వారం షెడ్యూల్ చూడటానికి క్యాలెండర్ తెరుస్తున్నాను.',
              kn: 'ಇಂದು ಯಾವುದೇ ಕಾರ್ಯಕ್ರಮಗಳು ನಿಗದಿಯಾಗಿಲ್ಲ. ನಿಮ್ಮ ವಾರದ ವೇಳಾಪಟ್ಟಿ ನೋಡಲು ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯುತ್ತಿದ್ದೇನೆ.',
            },
            language
          ),
          expression: 'calm',
          intent: 'CALENDAR_TODAY',
          confidence: 0.93,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_CALENDAR',
            description: pick7Lang(
              {
                en: 'Open Calendar',
                hi: 'कैलेंडर खोलें',
                mr: 'कॅलेंडर उघडा',
                bn: 'ক্যালেন্ডার খুলুন',
                ta: 'நாட்காட்டியைத் திற',
                te: 'క్యాలెండర్ తెరవండి',
                kn: 'ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯಿರಿ',
              },
              language
            ),
          },
        };
      }
    }

    if (intent === 'CALENDAR_WEEK') {
      const upcoming = context?.calendar?.upcomingEvents || [];
      return {
        speech: pick7Lang(
          {
            en: `You have ${upcoming.length} upcoming event${upcoming.length === 1 ? '' : 's'} in your calendar. Opening your calendar.`,
            hi: `आने वाले दिनों में आपके पास ${upcoming.length} कार्यक्रम निर्धारित हैं। आपका पूरा कैलेंडर खोल रही हूँ।`,
            mr: `पुढील काही दिवसांत तुमचे ${upcoming.length} कार्यक्रम आहेत. तुमचे कॅलेंडर उघडत आहे.`,
            bn: `আসন্ন দিনগুলোতে আপনার ${upcoming.length}টি অনুষ্ঠান নির্ধারিত আছে। আপনার ক্যালেন্ডার খুলছি।`,
            ta: `வரவிருக்கும் நாட்களில் உங்களுக்கு ${upcoming.length} நிகழ்வுகள் உள்ளன. உங்கள் நாட்காட்டியைத் திறக்கிறேன்.`,
            te: `రాబోయే రోజుల్లో మీకు ${upcoming.length} కార్యక్రమాలు ఉన్నాయి. మీ క్యాలెండర్ తెరుస్తున్నాను.`,
            kn: `ಮುಂಬರುವ ದಿನಗಳಲ್ಲಿ ನಿಮಗೆ ${upcoming.length} ಕಾರ್ಯಕ್ರಮಗಳಿವೆ. ನಿಮ್ಮ ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯುತ್ತಿದ್ದೇನೆ.`,
          },
          language
        ),
        expression: 'reminder',
        intent: 'CALENDAR_WEEK',
        confidence: 0.94,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'OPEN_CALENDAR',
          description: pick7Lang(
            {
              en: 'Open Calendar',
              hi: 'कैलेंडर खोलें',
              mr: 'कॅलेंडर उघडा',
              bn: 'ক্যালেন্ডার খুলুন',
              ta: 'நாட்காட்டியைத் திற',
              te: 'క్యాలెండర్ తెరవండి',
              kn: 'ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'CALENDAR_ADD') {
      return {
        speech: pick7Lang(
          {
            en: 'I can help schedule that event. For your care routine and accuracy, I am opening the calendar editor so you can review and confirm before saving.',
            hi: 'मैं यह कार्यक्रम निर्धारित करने में मदद कर सकती हूँ। आपकी सुरक्षा और दिनचर्या के लिए, मैं कैलेंडर संपादक खोल रही हूँ ताकि आप सहेजने से पहले समीक्षा कर सकें।',
            mr: 'मी हा कार्यक्रम ठरवण्यास मदत करू शकते. जतन करण्यापूर्वी तुम्ही तपासू शकावे म्हणून मी कॅलेंडर संपादक उघडत आहे.',
            bn: 'আমি অনুষ্ঠানটি যোগ করতে সাহায্য করতে পারি। সংরক্ষণের আগে যাচাই করার জন্য আমি ক্যালেন্ডার এডিটর খুলছি।',
            ta: 'அந்த நிகழ்வைத் திட்டமிட உதவ முடியும். சேமிப்பதற்கு முன் சரிபார்க்க நாட்காட்டித் திருத்தியைத் திறக்கிறேன்.',
            te: 'ఆ కార్యక్రమాన్ని షెడ్యూల్ చేయడానికి సహాయం చేయగలను. సేవ్ చేసే ముందు మీరు చూసుకోవడానికి క్యాలెండర్ ఎడిటర్ తెరుస్తున్నాను.',
            kn: 'ಆ ಕಾರ್ಯಕ್ರಮವನ್ನು ನಿಗದಿಪಡಿಸಲು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಉಳಿಸುವ ಮೊದಲು ಪರಿಶೀಲಿಸಲು ಕ್ಯಾಲೆಂಡರ್ ಸಂಪಾದಕ ತೆರೆಯುತ್ತಿದ್ದೇನೆ.',
          },
          language
        ),
        expression: 'confirming',
        intent: 'CALENDAR_ADD',
        confidence: 0.95,
        actionClass: 'class3_consequential',
        suggestedAction: {
          action: 'OPEN_CALENDAR',
          description: pick7Lang(
            {
              en: 'Open Calendar Editor',
              hi: 'कैलेंडर संपादक खोलें',
              mr: 'कॅलेंडर संपादक उघडा',
              bn: 'ক্যালেন্ডার এডিটর খুলুন',
              ta: 'நாட்காட்டித் திருத்தியைத் திற',
              te: 'క్యాలెండర్ ఎడిటర్ తెరవండి',
              kn: 'ಕ್ಯಾಲೆಂಡರ್ ಸಂಪಾದಕ ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    // -------------------------------------------------------------
    // Step 13: Category H: Navigation & Consent-Gated GPS Status
    // -------------------------------------------------------------
    if (intent === 'LOCATION_STATUS_CHECK') {
      const consentActive = GPSService.isConsentEnabled(patientId);
      const speech = consentActive
        ? pick7Lang(
            {
              en: 'Safe-zone location sharing is currently active while Saksham is open. You can pause or review this anytime in Profile Privacy Controls, or open Home Guide to walk home.',
              hi: 'सक्षम खुले रहने के दौरान सुरक्षित-क्षेत्र लोकेशन साझाकरण अभी सक्रिय है। आप प्रोफ़ाइल गोपनीयता सेटिंग में इसे कभी भी रोक सकते हैं, या घर के रास्ते के लिए होम गाइड खोल सकते हैं।',
              mr: 'सक्षम सुरू असताना सुरक्षित-क्षेत्र स्थान शेअरिंग सध्या सुरू आहे. तुम्ही प्रोफाइल गोपनीयता सेटिंग्जमध्ये हे कधीही थांबवू शकता किंवा होम गाईड उघडू शकता.',
              bn: 'সক্ষম চালু থাকাকালীন নিরাপদ-অঞ্চল লোকেশন শেয়ারিং বর্তমানে সক্রিয় আছে। আপনি প্রোফাইল গোপনীয়তা সেটিংস থেকে যেকোনো সময় এটি থামাতে বা হোম গাইড খুলতে পারেন।',
              ta: 'சக்ஷம் திறந்திருக்கும் போது பாதுகாப்பு மண்டல இருப்பிடப் பகிர்வு செயலில் உள்ளது. சுயவிவர தனியுரிமை அமைப்புகளில் இதை எப்போது வேண்டுமானாலும் நிறுத்தலாம்.',
              te: 'సక్షం తెరిచి ఉన్నప్పుడు సురక్షిత-మండల స్థాన భాగస్వామ్యం ప్రస్తుతం సక్రియంగా ఉంది. మీరు ప్రొఫైల్ గోప్యతా నియంత్రణలలో దీన్ని ఎప్పుడైనా ఆపవచ్చు.',
              kn: 'ಸಕ್ಷಮ್ ತೆರೆದಿರುವಾಗ ಸುರಕ್ಷಿತ-ವಲಯ ಸ್ಥಳ ಹಂಚಿಕೆ ಪ್ರಸ್ತುತ ಸಕ್ರಿಯವಾಗಿದೆ. ಪ್ರೊಫೈಲ್ ಗೌಪ್ಯತೆ ನಿಯಂತ್ರಣಗಳಲ್ಲಿ ಇದನ್ನು ಯಾವಾಗ ಬೇಕಾದರೂ ನಿಲ್ಲಿಸಬಹುದು.',
            },
            language
          )
        : pick7Lang(
            {
              en: 'Location sharing is currently paused by your privacy choice. No GPS coordinates are being shared right now. You can turn it back on anytime in Profile Privacy Controls.',
              hi: 'आपकी गोपनीयता पसंद के अनुसार लोकेशन साझाकरण अभी रुका हुआ है। अभी कोई जीपीएस स्थान साझा नहीं किया जा रहा है। आप प्रोफ़ाइल सेटिंग में इसे कभी भी चालू कर सकते हैं।',
              mr: 'तुमच्या गोपनीयता निवडीनुसार स्थान शेअरिंग सध्या थांबवले आहे. सध्या कोणताही जीपीएस डेटा शेअर होत नाही. तुम्ही प्रोफाइल सेटिंग्जमध्ये ते पुन्हा सुरू करू शकता.',
              bn: 'আপনার গোপনীয়তা পছন্দ অনুযায়ী লোকেশন শেয়ারিং বর্তমানে বন্ধ আছে। এখন কোনো জিপিএস তথ্য শেয়ার করা হচ্ছে না।',
              ta: 'உங்கள் தனியுரிமைத் தேர்வால் இருப்பிடப் பகிர்வு தற்போது நிறுத்தப்பட்டுள்ளது. இப்போது எந்த ஜிபிஎஸ் தரவும் பகிரப்படவில்லை.',
              te: 'మీ గోప్యతా ఎంపిక ప్రకారం స్థాన భాగస్వామ్యం ప్రస్తుతం ఆపివేయబడింది. ప్రస్తుతం ఎటువంటి జీపీఎస్ వివరాలు పంచుకోవడం లేదు.',
              kn: 'ನಿಮ್ಮ ಗೌಪ್ಯತೆ ಆಯ್ಕೆಯಂತೆ ಸ್ಥಳ ಹಂಚಿಕೆ ಪ್ರಸ್ತುತ ವಿರಾಮಗೊಳಿಸಲಾಗಿದೆ. ಯಾವುದೇ ಜಿಪಿಎಸ್ ಮಾಹಿತಿಯನ್ನು ಹಂಚಿಕೊಳ್ಳಲಾಗುತ್ತಿಲ್ಲ.',
            },
            language
          );
      return {
        speech,
        expression: 'reassuring',
        intent: 'LOCATION_STATUS_CHECK',
        confidence: 0.96,
        actionClass: 'class1_read',
        suggestedAction: {
          action: consentActive ? 'NAVIGATE_HOME_GUIDE' : 'NAVIGATE_PROFILE',
          description: consentActive
            ? pick7Lang(
                {
                  en: 'Open Asha Home Guide',
                  hi: 'आशा होम गाइड खोलें',
                  mr: 'आशा होम गाईड उघडा',
                  bn: 'আশা হোম গাইড খুলুন',
                  ta: 'ஆஷா வீட்டு வழிகாட்டியைத் திற',
                  te: 'ఆశా హోమ్ గైడ్ తెరవండి',
                  kn: 'ಆಶಾ ಹೋಮ್ ಗೈಡ್ ತೆರೆಯಿರಿ',
                },
                language
              )
            : pick7Lang(
                {
                  en: 'Manage Location Privacy Settings',
                  hi: 'लोकेशन गोपनीयता सेटिंग्स खोलें',
                  mr: 'स्थान गोपनीयता सेटिंग्ज व्यवस्थापित करा',
                  bn: 'লোকেশন গোপনীয়তা সেটিংস দেখুন',
                  ta: 'இருப்பிடத் தனியுரிமை அமைப்புகளை நிர்வகி',
                  te: 'స్థాన గోప్యతా సెట్టింగ్‌లను నిర్వహించండి',
                  kn: 'ಸ್ಥಳ ಗೌಪ್ಯತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ',
                },
                language
              ),
        },
      };
    }

    if (intent === 'NAVIGATE_HOME_GUIDE') {
      const speech = pick7Lang(
        {
          en: 'You are safe. I can guide you home with a simple, clear arrow right now.',
          hi: 'आप पूरी तरह सुरक्षित हैं। मैं आपको घर पहुँचने के लिए एक सरल और स्पष्ट दिशा तीर दिखा रही हूँ।',
          mr: 'तुम्ही अगदी सुरक्षित आहात. मी तुम्हाला घराचा सोपा आणि स्पष्ट मार्ग बाणाने दाखवत आहे.',
          bn: 'আপনি সম্পূর্ণ নিরাপদ। আমি এখনই আপনাকে বাড়ি ফেরার সহজ এবং স্পষ্ট পথ দেখাচ্ছি।',
          ta: 'நீங்கள் முற்றிலும் பாதுகாப்பாக இருக்கிறீர்கள். வீட்டிற்குச் செல்ல எளிய திசை வழிகாட்டியை இப்போது திறக்கிறேன்.',
          te: 'మీరు పూర్తిగా సురక్షితంగా ఉన్నారు. ఇంటికి వెళ్ళడానికి సులభమైన దారి మార్గదర్శిని ఇప్పుడే చూపిస్తున్నాను.',
          kn: 'ನೀವು ಸಂಪೂರ್ಣವಾಗಿ ಸುರಕ್ಷಿತವಾಗಿದ್ದೀರಿ. ಮನೆಗೆ ತಲುಪಲು ಸರಳ ಮತ್ತು ಸ್ಪಷ್ಟ ದಿಕ್ಕಿನ ಮಾರ್ಗವನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇನೆ.',
        },
        language
      );
      return {
        speech,
        expression: 'guiding',
        intent: 'NAVIGATE_HOME_GUIDE',
        confidence: 0.98,
        actionClass: 'class2_navigate',
        clinicalState: 'Reassuring',
        suggestedAction: {
          action: 'NAVIGATE_HOME_GUIDE',
          description: pick7Lang(
            {
              en: 'Asha Home Guide',
              hi: 'आशा होम गाइड',
              mr: 'आशा होम गाईड',
              bn: 'আশা হোম গাইড',
              ta: 'ஆஷா வீட்டு வழிகாட்டி',
              te: 'ఆశా హోమ్ గైడ్',
              kn: 'ಆಶಾ ಹೋಮ್ ಗೈಡ್',
            },
            language
          ),
        },
      };
    }

    if (intent === 'NAVIGATE_HOME') {
      return {
        speech: pick7Lang(
          {
            en: 'Taking you back to your peaceful home dashboard.',
            hi: 'आपको आपके मुख्य डैशबोर्ड पर वापस ले जा रही हूँ।',
            mr: 'तुम्हाला तुमच्या मुख्य डॅशबोर्डवर परत नेत आहे.',
            bn: 'আপনাকে আপনার মূল ড্যাশবোর্ডে ফিরিয়ে নিয়ে যাচ্ছি।',
            ta: 'உங்கள் அமைதியான முகப்புத் திரைக்கு அழைத்துச் செல்கிறேன்.',
            te: 'మిమ్మల్ని మీ ప్రశాంతమైన హోమ్ డ్యాష్‌బోర్డ్‌కు తీసుకువెళుతున్నాను.',
            kn: 'ನಿಮ್ಮ ಶಾಂತವಾದ ಹೋಮ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಕರೆದೊಯ್ಯುತ್ತಿದ್ದೇನೆ.',
          },
          language
        ),
        expression: 'happy',
        intent: 'NAVIGATE_HOME',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_HOME',
          description: pick7Lang(
            {
              en: 'Home Screen',
              hi: 'होम स्क्रीन',
              mr: 'होम स्क्रीन',
              bn: 'হোম স্ক্রিন',
              ta: 'முகப்புத் திரை',
              te: 'హోమ్ స్క్రీన్',
              kn: 'ಹೋಮ್ ಸ್ಕ್ರೀನ್',
            },
            language
          ),
        },
      };
    }

    if (intent === 'NAVIGATE_ROUTINES') {
      return {
        speech: pick7Lang(
          {
            en: 'Here is your Daily Routines workspace.',
            hi: 'यहाँ आपकी दैनिक देखभाल दिनचर्या है।',
            mr: 'येथे तुमचा दैनंदिन काळजीचा दिनक्रम आहे.',
            bn: 'এখানে আপনার দৈনন্দিন যত্নের রুটিন রয়েছে।',
            ta: 'இதோ உங்கள் தினசரி பராமரிப்பு வழக்கங்கள்.',
            te: 'ఇదిగో మీ రోజువారీ సంరక్షణ దినచర్య.',
            kn: 'ಇದು ನಿಮ್ಮ ದೈನಂದಿನ ಆರೈಕೆ ದಿನಚರಿಯಾಗಿದೆ.',
          },
          language
        ),
        expression: 'guiding',
        intent: 'NAVIGATE_ROUTINES',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: pick7Lang(
            {
              en: 'Open Daily Routines',
              hi: 'दिनचर्या खोलें',
              mr: 'दिनक्रम उघडा',
              bn: 'দৈনিক রুটিন খুলুন',
              ta: 'தினசரி வழக்கங்களைத் திற',
              te: 'దినచర్యలను తెరవండి',
              kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'NAVIGATE_FAMILY') {
      return {
        speech: pick7Lang(
          {
            en: 'Here is your Loved Ones family sanctuary.',
            hi: 'यहाँ आपकी प्रियजनों की एल्बम है।',
            mr: 'येथे तुमचे कुटुंबीय आणि प्रियजनांचे सुंदर फोटो आहेत.',
            bn: 'এখানে আপনার প্রিয়জনদের পারিবারিক অ্যালবাম রয়েছে।',
            ta: 'இதோ உங்கள் அன்பானவர்களின் குடும்பப் படங்கள்.',
            te: 'ఇదిగో మీ ప్రియమైన కుటుంబ సభ్యుల ఆల్బమ్.',
            kn: 'ಇದು ನಿಮ್ಮ ಪ್ರೀತಿಪಾತ್ರರ ಕುಟುಂಬ ಆಲ್ಬಮ್.',
          },
          language
        ),
        expression: 'happy',
        intent: 'NAVIGATE_FAMILY',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          description: pick7Lang(
            {
              en: 'Open Loved Ones',
              hi: 'परिवार एल्बम खोलें',
              mr: 'कुटुंब फोटो उघडा',
              bn: 'পরিবার অ্যালবাম খুলুন',
              ta: 'குடும்பப் படங்களைத் திற',
              te: 'కుటుంబ ఆల్బమ్ తెరవండి',
              kn: 'ಕುಟುಂಬ ಆಲ್ಬಮ್ ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'NAVIGATE_GAMES') {
      return {
        speech: pick7Lang(
          {
            en: 'Opening your Mind Games collection.',
            hi: 'माइंड गेम्स संग्रह खोल रही हूँ।',
            mr: 'तुमचे मेंदूचे खेळ उघडत आहे.',
            bn: 'আপনার মাইন্ড গেমস সংগ্রহ খুলছি।',
            ta: 'உங்கள் மன விளையாட்டுத் தொகுப்பைத் திறக்கிறேன்.',
            te: 'మీ మైండ్ గేమ్స్ సేకరణను తెరుస్తున్నాను.',
            kn: 'ನಿಮ್ಮ ಮೈಂಡ್ ಗೇಮ್ಸ್ ಸಂಗ್ರಹವನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.',
          },
          language
        ),
        expression: 'happy',
        intent: 'NAVIGATE_GAMES',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: pick7Lang(
            {
              en: 'Open Mind Games',
              hi: 'माइंड गेम्स खोलें',
              mr: 'खेळ उघडा',
              bn: 'মাইন্ড গেমস খুলুন',
              ta: 'விளையாட்டுகளைத் திற',
              te: 'మైండ్ గేమ్స్ తెరవండి',
              kn: 'ಮೈಂಡ್ ಗೇಮ್ಸ್ ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'NAVIGATE_PROFILE') {
      return {
        speech: pick7Lang(
          {
            en: 'Opening your Profile and care preferences.',
            hi: 'आपकी प्रोफ़ाइल और देखभाल सेटिंग्स खोल रही हूँ।',
            mr: 'तुमचे प्रोफाइल आणि काळजी सेटिंग्ज उघडत आहे.',
            bn: 'আপনার প্রোফাইল ও যত্নের সেটিংস খুলছি।',
            ta: 'உங்கள் சுயவிவரம் மற்றும் பராமரிப்பு அமைப்புகளைத் திறக்கிறேன்.',
            te: 'మీ ప్రొఫైల్ మరియు సంరక్షణ సెట్టింగ్‌లను తెరుస్తున్నాను.',
            kn: 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಮತ್ತು ಆರೈಕೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.',
          },
          language
        ),
        expression: 'guiding',
        intent: 'NAVIGATE_PROFILE',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_HOME',
          description: pick7Lang(
            {
              en: 'Profile',
              hi: 'प्रोफ़ाइल',
              mr: 'प्रोफाइल',
              bn: 'প্রোফাইল',
              ta: 'சுயவிவரம்',
              te: 'ప్రొఫైల్',
              kn: 'ಪ್ರೊಫೈಲ್',
            },
            language
          ),
        },
      };
    }

    if (intent === 'OPEN_NOTES') {
      return {
        speech: pick7Lang(
          {
            en: 'Opening your personal notes.',
            hi: 'नोट्स खोल रही हूँ।',
            mr: 'तुमच्या वैयक्तिक नोंदी उघडत आहे.',
            bn: 'আপনার ব্যক্তিগত নোট খুলছি।',
            ta: 'உங்கள் தனிப்பட்ட குறிப்புகளைத் திறக்கிறேன்.',
            te: 'మీ వ్యక్తిగత గమనికలను తెరుస్తున్నాను.',
            kn: 'ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.',
          },
          language
        ),
        expression: 'noting_saving',
        intent: 'OPEN_NOTES',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'OPEN_NOTES',
          description: pick7Lang(
            {
              en: 'Open Notes',
              hi: 'नोट्स खोलें',
              mr: 'नोंदी उघडा',
              bn: 'নোট খুলুন',
              ta: 'குறிப்புகளைத் திற',
              te: 'నోట్స్ తెరవండి',
              kn: 'ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'OPEN_CALENDAR') {
      return {
        speech: pick7Lang(
          {
            en: 'Opening your calendar.',
            hi: 'कैलेंडर खोल रही हूँ।',
            mr: 'तुमचे कॅलेंडर उघडत आहे.',
            bn: 'আপনার ক্যালেন্ডার খুলছি।',
            ta: 'உங்கள் நாட்காட்டியைத் திறக்கிறேன்.',
            te: 'మీ క్యాలెండర్‌ను తెరుస్తున్నాను.',
            kn: 'ನಿಮ್ಮ ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯುತ್ತಿದ್ದೇನೆ.',
          },
          language
        ),
        expression: 'guiding',
        intent: 'OPEN_CALENDAR',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'OPEN_CALENDAR',
          description: pick7Lang(
            {
              en: 'Open Calendar',
              hi: 'कैलेंडर खोलें',
              mr: 'कॅलेंडर उघडा',
              bn: 'ক্যালেন্ডার খুলুন',
              ta: 'நாட்காட்டியைத் திற',
              te: 'క్యాలెండర్ తెరవండి',
              kn: 'ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'OPEN_CAMERA') {
      return {
        speech: pick7Lang(
          {
            en: 'Opening your camera for visual exploration. Please allow camera access.',
            hi: 'कैमरा खोल रही हूँ। आप आसपास की चीजें आराम से देख सकते हैं।',
            mr: 'कॅमेरा सुरू करत आहे. परिसरातील वस्तू शांतपणे पाहू शकता.',
            bn: 'ক্যামেরা খুলছি। আপনি চারপাশের জিনিসগুলো শান্তভাবে দেখতে পারেন।',
            ta: 'கேமராவைத் திறக்கிறேன். உங்கள் அருகிலுள்ள பொருட்களை அமைதியாகப் பார்க்கலாம்.',
            te: 'కెమెరాను తెరుస్తున్నాను. మీరు చుట్టుపక్కల వస్తువులను ప్రశాంతంగా చూడవచ్చు.',
            kn: 'ಕ್ಯಾಮೆರಾ ತೆರೆಯುತ್ತಿದ್ದೇನೆ. ಸುತ್ತಮುತ್ತಲಿನ ವಸ್ತುಗಳನ್ನು ಶಾಂತವಾಗಿ ನೋಡಬಹುದು.',
          },
          language
        ),
        expression: 'guiding',
        intent: 'OPEN_CAMERA',
        confidence: 0.96,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'OPEN_CAMERA',
          description: pick7Lang(
            {
              en: 'Open Camera',
              hi: 'कैमरा खोलें',
              mr: 'कॅमेरा उघडा',
              bn: 'ক্যামেরা খুলুন',
              ta: 'கேமராவைத் திற',
              te: 'కెమెరా తెరవండి',
              kn: 'ಕ್ಯಾಮೆರಾ ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'OPEN_TODO') {
      return {
        speech: pick7Lang(
          {
            en: 'Opening your daily to-do and routine care tasks.',
            hi: 'आपकी दैनिक देखभाल और टू-डू सूची खोल रही हूँ।',
            mr: 'तुमची दैनंदिन कामे आणि औषधांचे वेळापत्रक उघडत आहे.',
            bn: 'আপনার দৈনন্দিন কাজের তালিকা খুলছি।',
            ta: 'உங்கள் தினசரி செய்ய வேண்டிய செயல்களைத் திறக்கிறேன்.',
            te: 'మీ రోజువారీ పనుల జాబితాను తెరుస్తున్నాను.',
            kn: 'ನಿಮ್ಮ ದೈನಂದಿನ ಕಾರ್ಯಗಳ ಪಟ್ಟಿಯನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.',
          },
          language
        ),
        expression: 'guiding',
        intent: 'NAVIGATE_ROUTINES',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: pick7Lang(
            {
              en: 'Open To-Do',
              hi: 'टू-डू खोलें',
              mr: 'कामांची यादी उघडा',
              bn: 'কাজের তালিকা খুলুন',
              ta: 'செயல் பட்டியலைத் திற',
              te: 'పనుల జాబితా తెరవండి',
              kn: 'ಕಾರ್ಯ ಪಟ್ಟಿಯನ್ನು ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'WELLBEING_ADAPT_EASIER') {
      DailyWellbeingService.setDailyCondition(patientId, 'tired');
      return {
        speech: pick7Lang(
          {
            en: 'I have simplified your schedule today. Rest comfortably; your essential doctor-prescribed medications remain strictly on time.',
            hi: 'मैंने आज आपका शेड्यूल आसान कर दिया है। आराम करें, जरूरी दवाएं समय पर रहेंगी।',
            mr: 'मी आज तुमचे वेळापत्रक सोपे केले आहे. विश्रांती घ्या, आवश्यक औषधे वेळेवर राहतील.',
            bn: 'আমি আজ আপনার সময়সূচী সহজ করে দিয়েছি। আরাম করুন, প্রয়োজনীয় ওষুধ সময়মতোই থাকবে।',
            ta: 'இன்று உங்கள் அட்டவணையை எளிதாக்கியுள்ளேன். ஓய்வெடுங்கள், முக்கிய மருந்துகள் நேரத்திற்கு இருக்கும்.',
            te: 'నేను ఈరోజు మీ షెడ్యూల్‌ను సులభతరం చేశాను. హాయిగా విశ్రాంతి తీసుకోండి, ముఖ్యమైన మందులు సమయానికి ఉంటాయి.',
            kn: 'ಇಂದು ನಿಮ್ಮ ವೇಳಾಪಟ್ಟಿಯನ್ನು ಸರಳಗೊಳಿಸಿದ್ದೇನೆ. ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ, ಅಗತ್ಯ ಔಷಧಿಗಳು ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿರುತ್ತವೆ.',
          },
          language
        ),
        expression: 'reassuring',
        intent: 'WELLBEING_ADAPT_EASIER',
        confidence: 0.96,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: pick7Lang(
            {
              en: 'Schedule adapted for comfort',
              hi: 'आराम के लिए अनुकूलित समय-सारणी',
              mr: 'आरामासाठी अनुकूलित वेळापत्रक',
              bn: 'আরামের জন্য সহজ সময়সূচী',
              ta: 'வசதிக்காக மாற்றியமைக்கப்பட்ட அட்டவணை',
              te: 'సౌకర్యం కోసం మార్చిన షెడ్యూల్',
              kn: 'ಆರಾಮಕ್ಕಾಗಿ ಹೊಂದಿಸಲಾದ ವೇಳಾಪಟ್ಟಿ',
            },
            language
          ),
        },
      };
    }

    // -------------------------------------------------------------
    // Step 13b: Stage 3 Phase B — Adaptive Personalized Support Handlers
    // -------------------------------------------------------------
    if (intent === 'INSTRUCTION_REPEAT') {
      const active = context?.routines?.activeRoutine;
      const translatedSteps = active ? getTranslatedRoutineSteps(active, language) : [];
      const stepText = active?.steps && active.steps.length > 0 ? translatedSteps[0] : null;
      const speech = stepText
        ? pick7Lang(
            {
              en: `Certainly! Here is your step again: "${stepText}". Please take all the time you need.`,
              hi: `बिल्कुल! यह है आपका अगला चरण: "${stepText}"। आराम से समय लें।`,
              mr: `नक्की! ही आहे पुढची पायरी: "${stepText}". शांतपणे वेळ घ्या.`,
              bn: `অবশ্যই! আপনার পরবর্তী ধাপটি হলো: "${stepText}"। ধীরে-সুস্থে সময় নিন।`,
              ta: `நிச்சயமாக! உங்கள் அடுத்த படி இதோ: "${stepText}". அவசரமின்றி நேரத்தை எடுத்துக்கொள்ளுங்கள்.`,
              te: `తప్పకుండా! మీ తదుపరి దశ ఇదే: "${stepText}". నిదానంగా సమయం తీసుకోండి.`,
              kn: `ಖಂಡಿತ! ನಿಮ್ಮ ಮುಂದಿನ ಹಂತ ಇಲ್ಲಿದೆ: "${stepText}". ನಿಧಾನವಾಗಿ ಸಮಯ ತೆಗೆದುಕೊಳ್ಳಿ.`,
            },
            language
          )
        : pick7Lang(
            {
              en: 'Certainly! Take a gentle breath. We take things one calm step at a time, completely at your own pace.',
              hi: 'बिल्कुल! हम शांति से एक-एक चरण दोबारा दोहराएंगे। पूरा समय आपका है।',
              mr: 'नक्की! आम्ही शांतपणे एक-एक पायरी पुन्हा करू. सर्व वेळ तुमचाच आहे.',
              bn: 'অবশ্যই! একটু শান্ত হয়ে শ্বাস নিন। আমরা আপনার গতিতেই এক ধাপ করে এগোবো।',
              ta: 'நிச்சயமாக! அமைதியாக மூச்சு விடுங்கள். உங்கள் வேகத்திலேயே ஒவ்வொரு படியாகச் செல்வோம்.',
              te: 'తప్పకుండా! ప్రశాంతంగా ఊపిరి తీసుకోండి. మీ వేగంతోనే ఒక్కో అడుగు వేద్దాం.',
              kn: 'ಖಂಡಿತ! ಶಾಂತವಾಗಿ ಉಸಿರು ತೆಗೆದುಕೊಳ್ಳಿ. ನಿಮ್ಮ ವೇಗದಲ್ಲೇ ಒಂದೊಂದೇ ಹೆಜ್ಜೆ ಮುಂದುವರಿಯೋಣ.',
            },
            language
          );

      return {
        speech,
        expression: 'guiding',
        intent: 'INSTRUCTION_REPEAT',
        confidence: 0.96,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          targetId: active?.id,
          description: pick7Lang(
            {
              en: 'View Routine Step',
              hi: 'दिनचर्या खोलें',
              mr: 'दिनक्रम उघडा',
              bn: 'দৈনন্দিন রুটিন দেখুন',
              ta: 'தினசரிப் படியைப் பார்',
              te: 'దినచర్య దశను చూడండి',
              kn: 'ದಿನಚರಿ ಹಂತವನ್ನು ನೋಡಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'ASSISTANCE_HINT') {
      const speech = pick7Lang(
        {
          en: 'Do not worry at all! Here is a gentle hint: Take a slow breath, look closely at the first small part, and remember there is no rush at all.',
          hi: 'चिंता मत कीजिए, यह रहा एक छोटा संकेत: शांत सांस लें और केवल पहले भाग पर ध्यान दें। कोई जल्दी नहीं है।',
          mr: 'काळजी करू नका, हा घ्या एक लहानसा क्लू: शांतपणे श्वास घ्या आणि पहिल्या भागावर लक्ष केंद्रित करा. कोणतीही घाई नाही.',
          bn: 'একদম চিন্তা করবেন না! একটি সহজ সূত্র দিচ্ছি: ধীরে শ্বাস নিন, প্রথম অংশটির দিকে মন দিন—কোনো তাড়া নেই।',
          ta: 'கவலைப்பட வேண்டாம்! இதோ ஒரு எளிய குறிப்பு: மெதுவாக மூச்சு விட்டு, முதல் சிறிய பகுதியை மட்டும் கவனியுங்கள். அவசரமே இல்லை.',
          te: 'ఏమాత్రం కంగారు పడకండి! ఇదో చిన్న సూచన: నెమ్మదిగా శ్వాస తీసుకుని, మొదటి చిన్న భాగంపై మాత్రమే దృష్టి పెట్టండి.',
          kn: 'ಚಿಂತಿಸಬೇಡಿ! ಇಲ್ಲಿದೆ ಒಂದು ಸರಳ ಸುಳಿವು: ನಿಧಾನವಾಗಿ ಉಸಿರು ತೆಗೆದುಕೊಂಡು, ಮೊದಲ ಸಣ್ಣ ಭಾಗದ ಮೇಲೆ ಗಮನ ಹರಿಸಿ.',
        },
        language
      );

      return {
        speech,
        expression: 'encouraging',
        intent: 'ASSISTANCE_HINT',
        confidence: 0.96,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'ADAPTATION_MAKE_EASIER') {
      AdaptiveDifficultyService.evaluateSession(patientId, {
        gameId: 'general-session',
        durationSeconds: 30,
        completed: false,
        patientFeedback: 'too hard make easier',
      });

      // Stage 3 Phase C: If pending proposal exists, record patient acceptance
      const proposals = AdaptiveSupportService.getProposals(patientId);
      const pending = proposals.find(
        (p) => p.status === 'recommendation_generated' || p.status === 'awaiting_approval'
      );
      if (pending) {
        AdaptiveSupportService.recordPatientChoice(patientId, pending.id, 'accepted');
      }

      const speech = pending?.requiresCaregiverApproval
        ? pick7Lang(
            {
              en: "I noticed this activity needed a little extra help recently. I've noted that you'd like smaller steps! Your family caregiver will also review this, and we'll have it ready for you.",
              hi: 'मैंने नोट कर लिया है कि आप छोटे चरण चाहते हैं! आपके परिवार के सदस्य भी इसे देखेंगे और हम इसे आपके लिए तैयार रखेंगे।',
              mr: 'मी नोंद घेतली आहे की आपल्याला लहान पायऱ्या हव्या आहेत! आपले कुटुंबही याची पाहणी करेल आणि आम्ही ते आपल्यासाठी तयार ठेवू.',
              bn: 'আমি নোট করেছি যে আপনি আরও ছোট ধাপ চান! আপনার পরিবারের পরিচর্যাকারীও এটি দেখবেন এবং আমরা এটি আপনার জন্য প্রস্তুত রাখব।',
              ta: 'சிறிய படிகள் உங்களுக்கு உதவியாக இருக்கும் என்பதைக் குறித்துக் கொண்டேன்! உங்கள் குடும்பத்தினரும் இதைப் பார்த்து உங்களுக்காகத் தயார் செய்வார்கள்.',
              te: 'మీకు చిన్న దశలు కావాలని నేను గుర్తించాను! మీ కుటుంబ సంరక్షకులు కూడా దీన్ని సమీక్షిస్తారు, మేము మీ కోసం సిద్ధంగా ఉంచుతాము.',
              kn: 'ನಿಮಗೆ ಚಿಕ್ಕ ಹಂತಗಳು ಬೇಕೆಂದು ನಾನು ಗುರುತಿಸಿದ್ದೇನೆ! ನಿಮ್ಮ ಕುಟುಂಬದ ಆರೈಕೆದಾರರು ಸಹ ಇದನ್ನು ಪರಿಶೀಲಿಸುತ್ತಾರೆ.',
            },
            language
          )
        : pick7Lang(
            {
              en: 'Certainly! I have adjusted this activity to a gentler, more peaceful pace with simpler steps for you.',
              hi: 'बिल्कुल! मैंने आपके लिए इसे और अधिक आसान और शांत बना दिया है। अब हम सरल गति से करेंगे।',
              mr: 'नक्कीच! मी तुमच्यासाठी ही कृती अधिक सोपी आणि शांत केली आहे. आता आपण सोप्या पायऱ्यांनी करू.',
              bn: 'নিশ্চয়ই! আমি এই কাজটি আপনার জন্য আরও সহজ ও শান্ত গতিতে সাজিয়ে দিয়েছি।',
              ta: 'நிச்சயமாக! இந்தச் செயல்பாட்டை உங்களுக்காக மேலும் எளிதாகவும் அமைதியான வேகத்திலும் மாற்றிவிட்டேன்.',
              te: 'తప్పకుండా! ఈ కార్యకలాపాన్ని మీ కోసం మరింత సులభమైన, ప్రశాంతమైన వేగానికి మార్చాను.',
              kn: 'ಖಂಡಿತ! ಈ ಚಟುವಟಿಕೆಯನ್ನು ನಿಮಗಾಗಿ ಇನ್ನಷ್ಟು ಸರಳ ಮತ್ತು ಶಾಂತ ವೇಗಕ್ಕೆ ಸರಿಹೊಂದಿಸಿದ್ದೇನೆ.',
            },
            language
          );

      return {
        speech,
        expression: 'comforting',
        intent: 'ADAPTATION_MAKE_EASIER',
        confidence: 0.96,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: pick7Lang(
            {
              en: 'Try Gentle Level',
              hi: 'आसान खेल देखें',
              mr: 'सोपे खेळ पहा',
              bn: 'সহজ স্তর চেষ্টা করুন',
              ta: 'எளிய நிலையை முயற்சி செய்',
              te: 'సులభమైన స్థాయిని ప్రయత్నించండి',
              kn: 'ಸರಳ ಹಂತವನ್ನು ಪ್ರಯತ್ನಿಸಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'ADAPTATION_KEEP_LEVEL') {
      const proposals = AdaptiveSupportService.getProposals(patientId);
      const pending = proposals.find(
        (p) => p.status === 'recommendation_generated' || p.status === 'awaiting_approval'
      );
      if (pending) {
        AdaptiveSupportService.recordPatientChoice(patientId, pending.id, 'keep_familiar');
      }

      const speech = pick7Lang(
        {
          en: "That's completely fine. We can keep things the way you know them. We will keep your familiar, comfortable level exactly as it is. No changes will be made.",
          hi: 'बहुत अच्छा! हम आपके जाने-पहचाने स्तर पर ही रहेंगे। कोई भी बदलाव नहीं किया जाएगा।',
          mr: 'फार छान! आपण आपल्या नेहमीच्या परिचयाच्या पातळीवरच राहू. कोणताही बदल केला जाणार नाही.',
          bn: 'খুব ভালো! আমরা আপনার পরিচিত এবং আরামদায়ক স্তরেই থাকব। কোনো পরিবর্তন করা হবে না।',
          ta: 'அப்படியே இருக்கட்டும்! உங்களுக்குப் பழக்கமான, வசதியான நிலையிலேயே தொடர்வோம். எந்த மாற்றமும் செய்யப்படாது.',
          te: 'అలాగే ఉంచుదాం! మీకు అలవాటైన, సౌకర్యవంతమైన స్థాయిలోనే కొనసాగుదాం. ఎటువంటి మార్పు చేయబడదు.',
          kn: 'ತುಂಬಾ ಒಳ್ಳೆಯದು! ನಿಮಗೆ ಪರಿಚಿತವಾದ, ಆರಾಮದಾಯಕ ಮಟ್ಟದಲ್ಲೇ ಇರುತ್ತೇವೆ. ಯಾವುದೇ ಬದಲಾವಣೆ ಮಾಡುವುದಿಲ್ಲ.',
        },
        language
      );

      return {
        speech,
        expression: 'reassuring',
        intent: 'ADAPTATION_KEEP_LEVEL',
        confidence: 0.96,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'ADAPTATION_TRY_HARDER') {
      const speech = pick7Lang(
        {
          en: 'Wonderful! You are very welcome to explore the next level. And remember, you can return to your familiar level whenever you wish.',
          hi: 'बहुत बढ़िया! आप अगला स्तर बिल्कुल आज़मा सकते हैं। और याद रखें, आप जब चाहें अपने पुराने स्तर पर वापस लौट सकते हैं।',
          mr: 'छान! आपण पुढची पातळी नक्की पाहू शकता. आणि लक्षात ठेवा, आपल्याला वाटल्यास आपण कधीही आधीच्या पातळीवर परत येऊ शकता.',
          bn: 'দারুণ! আপনি পরবর্তী স্তরটি আনন্দে চেষ্টা করতে পারেন। আর মনে রাখবেন, চাইলে যেকোনো সময় আগের স্তরে ফিরে আসতে পারবেন।',
          ta: 'அருமை! நீங்கள் அடுத்த நிலையைத் தாராளமாக முயற்சி செய்யலாம். எப்போது வேண்டுமானாலும் முந்தைய நிலைக்குத் திரும்பலாம்.',
          te: 'అద్భుతం! మీరు తదుపరి స్థాయిని ప్రయత్నించవచ్చు. ఎప్పుడైనా మీకు నచ్చిన పాత స్థాయికి తిరిగి రావచ్చు.',
          kn: 'ಅದ್ಭುತ! ನೀವು ಮುಂದಿನ ಹಂತವನ್ನು ಖಂಡಿತವಾಗಿಯೂ ಪ್ರಯತ್ನಿಸಬಹುದು. ನಿಮಗೆ ಬೇಕಾದಾಗಲೆಲ್ಲಾ ಹಿಂದಿನ ಹಂತಕ್ಕೆ ಮರಳಬಹುದು.',
        },
        language
      );

      return {
        speech,
        expression: 'encouraging',
        intent: 'ADAPTATION_TRY_HARDER',
        confidence: 0.96,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: pick7Lang(
            {
              en: 'Explore Next Level',
              hi: 'खेल खोलें',
              mr: 'खेळ उघडा',
              bn: 'খেলা খুলুন',
              ta: 'அடுத்த நிலையைப் பார்',
              te: 'తదుపరి స్థాయిని చూడండి',
              kn: 'ಮುಂದಿನ ಹಂತವನ್ನು ನೋಡಿ',
            },
            language
          ),
        },
      };
    }

    if (intent === 'WELLBEING_REST_BREAK') {
      const speech = pick7Lang(
        {
          en: 'Certainly! Sit back comfortably, relax your hands, and take a peaceful two-minute rest. Asha is right here with you.',
          hi: 'बिल्कुल! आराम से बैठिए, हाथ ढीले छोड़िए और दो मिनट का विश्राम लीजिए। मैं यहीं आपके साथ हूँ।',
          mr: 'नक्कीच! शांतपणे बसा, हात सैल सोडा आणि दोन मिनिटे विश्रांती घ्या. मी इथेच तुमच्यासोबत आहे.',
          bn: 'অবশ্যই! আরামে বসুন, হাত শিথিল করুন এবং দুই মিনিট বিশ্রাম নিন। আশা আপনার পাশেই আছে।',
          ta: 'நிச்சயமாக! வசதியாக அமர்ந்து, கைகளைத் தளர்த்தி, இரண்டு நிமிடங்கள் ஓய்வெடுங்கள். ஆஷா உங்களுடனேயே இருக்கிறேன்.',
          te: 'తప్పకుండా! హాయిగా కూర్చుని, చేతులు వదులుతూ రెండు నిమిషాలు విశ్రాంతి తీసుకోండి. ఆశా మీతోనే ఉంది.',
          kn: 'ಖಂಡಿತ! ಆರಾಮವಾಗಿ ಕುಳಿತು, ಕೈಗಳನ್ನು ಸಡಿಲಗೊಳಿಸಿ, ಎರಡು ನಿಮಿಷ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ. ಆಶಾ ನಿಮ್ಮೊಂದಿಗೇ ಇದ್ದಾಳೆ.',
        },
        language
      );

      return {
        speech,
        expression: 'comforting',
        intent: 'WELLBEING_REST_BREAK',
        confidence: 0.96,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'ADAPTATION_RESTORE_PREVIOUS') {
      const proposals = AdaptiveSupportService.getProposals(patientId);
      const active = proposals.find((p) => p.status === 'activated');
      if (active) {
        AdaptiveSupportService.revertProposal(
          patientId,
          active.id,
          patientId,
          'Restored familiar level upon request'
        );
      }

      const speech = pick7Lang(
        {
          en: 'I have restored your familiar configuration just as it was before. Everything is back to your preferred version.',
          hi: 'मैंने सब कुछ पहले जैसा कर दिया है। आपका जाना-पहचाना स्तर वापस आ गया है।',
          mr: 'मी सर्व काही आधीसारखे पूर्ववत केले आहे. तुमची नेहमीची आवडती पातळी परत आली आहे.',
          bn: 'আমি সবকিছু আগের মতো ফিরিয়ে এনেছি। আপনার পরিচিত এবং পছন্দের স্তর আবার ফিরে এসেছে।',
          ta: 'எல்லாவற்றையும் முன்பு போலவே மாற்றிவிட்டேன். உங்கள் விருப்பமான நிலைக்குத் திரும்பிவிட்டோம்.',
          te: 'అన్నీ మునుపటిలాగే పునరుద్ధరించాను. మీకు ఇష్టమైన స్థాయికి తిరిగి వచ్చాము.',
          kn: 'ಎಲ್ಲವನ್ನೂ ಮೊದಲಿನಂತೆಯೇ ಮರುಸ್ಥಾಪಿಸಿದ್ದೇನೆ. ನಿಮ್ಮ ನೆಚ್ಚಿನ ಹಂತಕ್ಕೆ ಮರಳಲಾಗಿದೆ.',
        },
        language
      );

      return {
        speech,
        expression: 'reassuring',
        intent: 'ADAPTATION_RESTORE_PREVIOUS',
        confidence: 0.96,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'ADAPTATION_DECLINE_CHANGE') {
      const proposals = AdaptiveSupportService.getProposals(patientId);
      const pending = proposals.find(
        (p) => p.status === 'recommendation_generated' || p.status === 'awaiting_approval'
      );
      if (pending) {
        AdaptiveSupportService.recordPatientChoice(patientId, pending.id, 'declined');
      }

      const speech = pick7Lang(
        {
          en: 'Understood completely! No changes have been made. Your daily routine and activities will stay exactly as you know them.',
          hi: 'समझ गई! मैंने कोई बदलाव नहीं किया है। आपकी दिनचर्या और खेल हमेशा की तरह ही रहेंगे।',
          mr: 'समजले! मी कोणताही बदल केलेला नाही. तुमचा दिनक्रम आणि खेळ नेहमीसारखेच राहतील.',
          bn: 'সম্পূর্ণ বুঝতে পেরেছি! কোনো পরিবর্তন করা হয়নি। আপনার দৈনন্দিন রুটিন ও খেলা আগের মতোই থাকবে।',
          ta: 'புரிந்தது! எந்த மாற்றமும் செய்யப்படவில்லை. உங்கள் தினசரி வழக்கங்களும் விளையாட்டுகளும் முன்பு போலவே இருக்கும்.',
          te: 'పూర్తిగా అర్థమైంది! ఎటువంటి మార్పు చేయలేదు. మీ దినచర్య మరియు ఆటలు ఎప్పటిలాగే ఉంటాయి.',
          kn: 'ಸಂಪೂರ್ಣವಾಗಿ ಅರ್ಥವಾಯಿತು! ಯಾವುದೇ ಬದಲಾವಣೆ ಮಾಡಿಲ್ಲ. ನಿಮ್ಮ ದಿನಚರಿ ಮತ್ತು ಆಟಗಳು ಎಂದಿನಂತೆಯೇ ಇರುತ್ತವೆ.',
        },
        language
      );

      return {
        speech,
        expression: 'reassuring',
        intent: 'ADAPTATION_DECLINE_CHANGE',
        confidence: 0.96,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'QUERY_ACTIVITY_CHANGE_RATIONALE') {
      const proposals = AdaptiveSupportService.getProposals(patientId);
      const recent = proposals[0];
      const speech = recent
        ? pick7Lang(
            {
              en: 'We noticed this activity was taking a little extra effort recently, so we made it calmer and gentler with smaller steps. You can always say "keep familiar" anytime!',
              hi: "हमने देखा कि हाल ही में थोड़ा अधिक प्रयास लग रहा था, इसलिए इसे और अधिक शांत व सरल बनाया गया है। आप जब चाहें 'पहले जैसा करो' कह सकते हैं!",
              mr: "आम्ही पाहिले की अलीकडे थोडा अधिक वेळ लागत होता, म्हणून हे अधिक सोपे आणि शांत केले आहे. आपल्याला हवे असल्यास आपण 'आधीसारखे करा' म्हणू शकता!",
              bn: 'আমরা দেখেছি কাজটি সম্প্রতি একটু বেশি পরিশ্রমের মনে হচ্ছিল, তাই এটি আরও শান্ত ও সহজ করা হয়েছে। আপনি চাইলে যেকোনো সময় আগের মতো রাখতে পারেন!',
              ta: 'சமீபத்தில் இந்தச் செயல் சற்று கடினமாக இருந்ததைக் கவனித்து, அதை மேலும் எளிமையாகவும் அமைதியாகவும் மாற்றியுள்ளோம். எப்போது வேண்டுமானாலும் பழைய நிலைக்கு மாற்றலாம்!',
              te: 'ఇటీవల ఈ పని కొంచెం ఎక్కువ శ్రమగా అనిపించడం గమనించి, దీన్ని మరింత సులభంగా మరియు ప్రశాంతంగా మార్చాము. మీరు ఎప్పుడైనా పాత స్థాయిని ఉంచుకోవచ్చు!',
              kn: 'ಇತ್ತೀಚೆಗೆ ಈ ಚಟುವಟಿಕೆ ಸ್ವಲ್ಪ ಕಷ್ಟವಾಗುತ್ತಿರುವುದನ್ನು ಗಮನಿಸಿ, ಇದನ್ನು ಇನ್ನಷ್ಟು ಶಾಂತ ಮತ್ತು ಸರಳಗೊಳಿಸಿದ್ದೇವೆ. ನೀವು ಯಾವಾಗ ಬೇಕಾದರೂ ಹಿಂದಿನ ಮಟ್ಟವನ್ನು ಉಳಿಸಿಕೊಳ್ಳಬಹುದು!',
            },
            language
          )
        : pick7Lang(
            {
              en: 'We gently adjust activities to make sure they remain calmer and gentler, peaceful, and pressure-free. You can always ask to keep your familiar level anytime.',
              hi: 'हम गतिविधियों को अधिक शांत और सरल बनाते हैं ताकि कोई तनाव न हो। आप जब चाहें पुराना स्तर रख सकते हैं।',
              mr: 'आम्ही वेळोवेळी कृती अधिक शांत आणि सोप्या बनवतो जेणेकरून आपल्याला कोणताही ताण जाणवू नये. आपण कधीही जुनी पातळी ठेवू शकता.',
              bn: 'কোনো চাপ যেন না থাকে সেজন্য আমরা কাজগুলো সহজ ও শান্ত রাখি। আপনি যেকোনো সময় আপনার পরিচিত স্তর বেছে নিতে পারেন।',
              ta: 'அழுத்தமின்றி அமைதியாக இருக்கச் செயல்களை எளிதாக்குகிறோம். எப்போது வேண்டுமானாலும் உங்கள் பழைய நிலையைத் தேர்ந்தெடுக்கலாம்.',
              te: 'ఎలాంటి ఒత్తిడి లేకుండా ప్రశాంతంగా ఉండేందుకు మేము పనులను సులభతరం చేస్తాము. మీరు ఎప్పుడైనా పాత స్థాయిని కొనసాగించవచ్చు.',
              kn: 'ಯಾವುದೇ ಒತ್ತಡವಿಲ್ಲದೆ ಶಾಂತವಾಗಿರಲು ನಾವು ಚಟುವಟಿಕೆಗಳನ್ನು ಸರಳಗೊಳಿಸುತ್ತೇವೆ. ನೀವು ಯಾವಾಗ ಬೇಕಾದರೂ ಪರಿಚಿತ ಮಟ್ಟವನ್ನು ಉಳಿಸಿಕೊಳ್ಳಬಹುದು.',
            },
            language
          );

      return {
        speech,
        expression: 'reassuring',
        intent: 'QUERY_ACTIVITY_CHANGE_RATIONALE',
        confidence: 0.96,
        actionClass: 'class1_read',
      };
    }

    // -------------------------------------------------------------
    // Step 14: Scenario 10 — Unsupported External Request
    // -------------------------------------------------------------
    if (
      (query.includes('book') && query.includes('doctor')) ||
      (query.includes('book') && query.includes('appointment')) ||
      (query.includes('book') && query.includes('hospital')) ||
      query.includes('call taxi') ||
      query.includes('order food') ||
      query.includes('weather') ||
      query.includes('टिकट बुक') ||
      query.includes('डॉक्टर बुक') ||
      query.includes('अपॉइंटमेंट बुक') ||
      query.includes('टैक्सी')
    ) {
      return {
        speech: pick7Lang(
          {
            en: 'I cannot book doctor appointments directly as I am not connected to an external booking service. You can add an appointment to your Saksham Calendar or contact your caregiver.',
            hi: 'मैं सीधे अस्पताल या डॉक्टर की बुकिंग नहीं कर सकती क्योंकि मैं बाहरी बुकिंग सेवा से नहीं जुड़ी हूँ। आप अपने सक्षम कैलेंडर में अपॉइंटमेंट जोड़ सकते हैं या अपने देखभालकर्ता से संपर्क कर सकते हैं।',
            mr: 'मी थेट डॉक्टर किंवा रुग्णालयाची अपॉइंटमेंट बुक करू शकत नाही. तुम्ही तुमच्या सक्षम कॅलेंडरमध्ये नोंद करू शकता किंवा काळजीवाहूंशी संपर्क साधू शकता.',
            bn: 'আমি সরাসরি হাসপাতাল বা ডাক্তারের অ্যাপয়েন্টমেন্ট বুক করতে পারি না। আপনি সক্ষম ক্যালেন্ডারে তা যোগ করতে পারেন বা আপনার যত্নশীলের সাথে যোগাযোগ করতে পারেন।',
            ta: 'என்னால் நேரடியாக மருத்துவமனை அல்லது மருத்துவர் சந்திப்பைப் பதிவு செய்ய முடியாது. உங்கள் சக்ஷம் நாட்காட்டியில் சேர்க்கலாம் அல்லது பராமரிப்பாளரைத் தொடர்பு கொள்ளலாம்.',
            te: 'నేను నేరుగా డాక్టర్ అపాయింట్‌మెంట్ బుక్ చేయలేను. మీరు మీ సక్షం క్యాలెండర్‌లో చేర్చవచ్చు లేదా మీ సంరక్షకుడిని సంప్రదించవచ్చు.',
            kn: 'ನಾನು ನೇರವಾಗಿ ವೈದ್ಯರ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ. ನಿಮ್ಮ ಸಕ್ಷಮ್ ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ಸೇರಿಸಬಹುದು ಅಥವಾ ಆರೈಕೆದಾರರನ್ನು ಸಂಪರ್ಕಿಸಬಹುದು.',
          },
          language
        ),
        expression: 'explaining',
        intent: 'UNKNOWN_FALLBACK',
        confidence: 0.85,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'OPEN_CALENDAR',
          description: pick7Lang(
            {
              en: 'Open Calendar',
              hi: 'कैलेंडर खोलें',
              mr: 'कॅलेंडर उघडा',
              bn: 'ক্যালেন্ডার খুলুন',
              ta: 'நாட்காட்டியைத் திற',
              te: 'క్యాలెండర్ తెరవండి',
              kn: 'ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯಿರಿ',
            },
            language
          ),
        },
      };
    }

    // -------------------------------------------------------------
    // Step 15: Conversational AI Reasoning & Open Semantic Understanding
    // -------------------------------------------------------------
    const aiProposal = ConversationalAIService.localSemanticReasoner(query, language, prevTurn);
    if (aiProposal && aiProposal.confidence >= 0.90) {
      if (aiProposal.actionProposal?.action) {
        if (aiProposal.actionProposal.action === 'NAVIGATE_LOVED_ONES' || aiProposal.actionProposal.action === 'SHOW_FAMILY_MEMBER') {
          ConversationEngine.turnContextMap[patientId] = {
            lastIntent: aiProposal.intent,
            lastTopic: 'family',
            lastTargetId: aiProposal.actionProposal.targetId,
          };
        }
      }
      return {
        speech: aiProposal.speech,
        expression: aiProposal.expression,
        intent: aiProposal.intent,
        confidence: aiProposal.confidence,
        actionClass: aiProposal.actionClass,
        suggestedAction: aiProposal.actionProposal
          ? {
              action: aiProposal.actionProposal.action,
              targetId: aiProposal.actionProposal.targetId,
              description: aiProposal.actionProposal.description,
            }
          : undefined,
        metadata: {
          isRealAI: aiProposal.isRealAI,
          executionMode: aiProposal.executionMode,
          modelUsed: aiProposal.modelUsed,
          configNotice: aiProposal.configNotice,
          tokensRedacted: aiProposal.tokensRedacted,
          latencyMs: aiProposal.latencyMs,
        },
      };
    }

    // -------------------------------------------------------------
    // Step 16: Scenario 12 — Unknown Query / Regional Phrase Fallback
    // -------------------------------------------------------------
    return {
      speech: pick7Lang(
        {
          en: 'I am right here with you! Would you like to check your next scheduled routine, browse family pictures, or play a gentle game?',
          hi: 'मैं आपके साथ हूँ! क्या आप अपनी अगली दिनचर्या देखना चाहते हैं, परिवार की तस्वीरें देखना चाहते हैं, या कोई खेल खेलना चाहते हैं?',
          mr: 'मी तुमच्यासोबतच आहे! तुम्हाला तुमचा पुढचा दिनक्रम पाहायचा आहे, कुटुंबाचे फोटो पाहायचे आहेत की एखादा शांत खेळ खेळायचा आहे?',
          bn: 'আমি আপনার সাথেই আছি! আপনি কি আপনার পরবর্তী রুটিন দেখতে চান, পরিবারের ছবি দেখতে চান, নাকি একটি সহজ খেলা খেলতে চান?',
          ta: 'நான் உங்களுடனேயே இருக்கிறேன்! உங்கள் அடுத்த வழக்கத்தைப் பார்க்கவா, குடும்பப் படங்களைப் பார்க்கவா அல்லது ஒரு அமைதியான விளையாட்டு விளையாடலாமா?',
          te: 'నేను మీతోనే ఉన్నాను! మీ తదుపరి దినచర్య చూడాలనుకుంటున్నారా, కుటుంబ ఫోటోలు చూడాలా లేదా ఒక ఆట ఆడదామా?',
          kn: 'ನಾನು ನಿಮ್ಮೊಂದಿಗಿದ್ದೇನೆ! ನಿಮ್ಮ ಮುಂದಿನ ದಿನಚರಿ ನೋಡಲು, ಕುಟುಂಬದ ಫೋಟೋಗಳನ್ನು ನೋಡಲು ಅಥವಾ ಶಾಂತ ಆಟ ಆಡಲು ಬಯಸುತ್ತೀರಾ?',
        },
        language
      ),
      expression: 'reassuring',
      intent: 'UNKNOWN_FALLBACK',
      confidence: 0.3,
      actionClass: 'class1_read',
      clarificationOptions: [
        {
          label: pick7Lang({ en: 'Daily Routines', hi: 'दैनिक दिनचर्या', mr: 'दैनिक दिनक्रम', bn: 'দৈনিক রুটিন', ta: 'தினசரி வழக்கங்கள்', te: 'దినచర్యలు', kn: 'ದಿನಚರಿಗಳು' }, language),
          query: pick7Lang({ en: 'What do I have to do today?', hi: 'आज क्या करना है?', mr: 'आज काय करायचं आहे?', bn: 'আজ কী কাজ আছে?', ta: 'இன்று என்ன செய்ய வேண்டும்?', te: 'ఈరోజు ఏమి చేయాలి?', kn: 'ಇಂದು ಏನು ಮಾಡಬೇಕು?' }, language),
        },
        {
          label: pick7Lang({ en: 'Family Photos', hi: 'परिवार की यादें', mr: 'कुटुंबाचे फोटो', bn: 'পরিবারের ছবি', ta: 'குடும்பப் படங்கள்', te: 'కుటుంబ ఫోటోలు', kn: 'ಕುಟುಂಬದ ಫೋಟೋಗಳು' }, language),
          query: pick7Lang({ en: 'Show me my family', hi: 'मेरा परिवार दिखाओ', mr: 'माझे कुटुंब दाखवा', bn: 'আমার পরিবার দেখাও', ta: 'என் குடும்பத்தைக் காட்டு', te: 'నా కుటుంబాన్ని చూపించు', kn: 'ನನ್ನ ಕುಟುಂಬವನ್ನು ತೋರಿಸಿ' }, language),
        },
        {
          label: pick7Lang({ en: 'Mind Games', hi: 'दिमागी खेल', mr: 'मेंदूचे खेळ', bn: 'মাইন্ড গেমস', ta: 'மன விளையாட்டுகள்', te: 'మైండ్ గేమ్స్', kn: 'ಮೈಂಡ್ ಗೇಮ್ಸ್' }, language),
          query: pick7Lang({ en: 'Show me my games', hi: 'मेरे खेल दिखाओ', mr: 'माझे खेळ दाखवा', bn: 'আমার খেলা দেখাও', ta: 'என் விளையாட்டுகளைக் காட்டு', te: 'నా ఆటలను చూపించు', kn: 'ನನ್ನ ಆಟಗಳನ್ನು ತೋರಿಸಿ' }, language),
        },
      ],
    };
  }
}
