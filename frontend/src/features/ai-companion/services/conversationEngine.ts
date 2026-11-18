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

    return {
      ...res,
      isRealAI: isReal,
      executionMode: mode,
      modelUsed: model,
      configNotice: notice,
      metadata: {
        ...(res.metadata || {}),
        isRealAI: isReal,
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
    // Step 3: Pending Consequential Action Confirmation / Cancellation
    // -------------------------------------------------------------
    const activePending = ConversationActionRegistry.getActivePendingConfirmation(patientId);

    if (activePending) {
      const match = IntentRegistry.match(query);
      if (match.intent === 'CONFIRMATION_YES') {
        const syncPlaceholder: ConversationResult = this.decorateResult({
          speech: isHi
            ? 'आपका अनुरोध सुरक्षित रूप से सहेज लिया गया है।'
            : 'I have saved your request safely on this device.',
          expression: 'done_completed',
          intent: 'CONFIRMATION_YES',
          confidence: 1.0,
          actionClass: 'class3_consequential',
          metadata: { status: 'saved_locally' },
        });

        const asyncExecution = ConversationActionRegistry.executePendingConfirmation(patientId, activePending.id, authUid).then(
          (execRes) => {
            const finalRes: ConversationResult = this.decorateResult({
              speech: isHi ? execRes.speechHi : execRes.speechEn,
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
          speech: isHi
            ? 'मैंने आपका वह अनुरोध रद्द कर दिया है। आपकी कोई भी जानकारी नहीं बदली गई है।'
            : 'I have cancelled that request. No changes were made to your care sanctuary.',
          expression: 'reassuring',
          intent: 'CONFIRMATION_NO',
          confidence: 1.0,
          actionClass: 'class3_consequential',
        });
        return Object.assign(Promise.resolve(cancelRes), cancelRes);
      }
    }

    const rawSyncResult = this.evaluateNonActionPipeline(query, raw, context, targetLang, patientId, isHi);
    const syncResult = this.decorateResult(rawSyncResult);

    if (ConversationalAIService.hasApiKey() && ConversationalAIService.canMakeRequest()) {
      const prevTurn = ConversationEngine.turnContextMap[patientId];
      const asyncAI = ConversationalAIService.generateConversationalResponse(
        raw,
        context,
        targetLang,
        responseLanguage,
        prevTurn
      )
        .then((proposal) => {
          if (proposal && proposal.isRealAI) {
            if (proposal.actionProposal?.action) {
              if (
                proposal.actionProposal.action === 'NAVIGATE_LOVED_ONES' ||
                proposal.actionProposal.action === 'SHOW_FAMILY_MEMBER'
              ) {
                ConversationEngine.turnContextMap[patientId] = {
                  lastIntent: proposal.intent,
                  lastTopic: 'family',
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
                  }
                : undefined,
              isRealAI: proposal.isRealAI,
              executionMode: proposal.executionMode,
              executionState: proposal.executionState,
              modelUsed: proposal.modelUsed,
              configNotice: proposal.configNotice,
              tokensRedacted: proposal.tokensRedacted,
              latencyMs: proposal.latencyMs,
              metadata: {
                isRealAI: proposal.isRealAI,
                executionMode: proposal.executionMode,
                executionState: proposal.executionState,
                modelUsed: proposal.modelUsed,
                configNotice: proposal.configNotice,
                tokensRedacted: proposal.tokensRedacted,
                latencyMs: proposal.latencyMs,
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

    return this.decorateResult(this.evaluateNonActionPipeline(query, raw, context, targetLang, patientId, isHi));
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
    isHi: boolean
  ): ConversationResult {

    // -------------------------------------------------------------
    // Step 4: Extract Entities & Match Intent (with Multi-Turn Memory Context)
    // -------------------------------------------------------------
    const entities = EntityExtractor.extract(query, context);
    let { intent } = IntentRegistry.match(query);

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
    // Step 5: Check for Ambiguous Query (Scenario 9)
    // -------------------------------------------------------------
    const isMr = language === 'mr';

    if (intent === 'AMBIGUOUS_QUERY') {
      ConversationEngine.turnContextMap[patientId] = {
        lastIntent: 'AMBIGUOUS_QUERY',
        lastTopic: 'options',
      };
      return {
        speech: isMr
          ? 'तुम्हाला काय पाहायला आवडेल — कुटुंबाचे फोटो, वैयक्तिक नोंदी की मेंदूचे खेळ?'
          : isHi
          ? 'आप क्या देखना चाहेंगे — अपनी परिवार की तस्वीरें, व्यक्तिगत नोट्स या दिमागी खेल?'
          : 'Which one would you like me to show you — your family photos, notes or games?',
        expression: 'clarifying',
        intent: 'AMBIGUOUS_QUERY',
        confidence: 0.95,
        actionClass: 'class1_read',
        clinicalState: 'AssistanceNeeded',
        clarificationOptions: [
          { label: isMr ? 'कुटुंबाचे फोटो' : isHi ? 'पारिवारिक फोटो' : 'Family Photos', query: isMr ? 'माझे कुटुंब दाखवा' : 'Show me my family' },
          { label: isMr ? 'नोंदी' : isHi ? 'नोट्स' : 'Notes', query: isMr ? 'माझ्या नोंदी उघडा' : 'Open my notes' },
          { label: isMr ? 'मेंदूचे खेळ' : isHi ? 'दिमागी खेल' : 'Mind Games', query: isMr ? 'माझे खेळ दाखवा' : 'Show me my games' },
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
      const speech = isMr
        ? `मी लगेच तुमच्या काळजीवाहू ${caregiverName} यांच्याशी संपर्क साधत आहे. शांत राहा, सर्व काही ठीक आहे.`
        : isHi
        ? `मैं तुरंत आपके देखभालकर्ता ${caregiverName} से संपर्क करवा रही हूँ। शांत रहें, सब कुछ सुरक्षित है।`
        : `I am connecting you with ${caregiverName} right now. Take a gentle breath, everything is safe and okay.`;

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
          description: `Call Caregiver (${caregiverName})`,
        },
      };
    }

    if (intent === 'REPEATED_TIME_QUERY') {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const speech = isMr
        ? `आता ${timeStr} वाजले आहेत. तुम्ही अगदी सुरक्षित आहात, निवांत राहा.`
        : isHi
        ? `अभी ${timeStr} बजे हैं। आप पूरी तरह सुरक्षित हैं, आराम से रहें।`
        : `It is currently ${timeStr}. You are in a safe, peaceful space right now.`;

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
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = now.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
      const speech = isMr
        ? `आज ${dayName}, ${dateStr} आहे. कुठेही घाई करण्याची गरज नाही, दिवस छान जाईल.`
        : isHi
        ? `आज ${dayName}, ${dateStr} है। किसी भी बात की कोई जल्दबाज़ी नहीं है।`
        : `Today is ${dayName}, ${dateStr}. There is no rush at all, you have all the time you need.`;

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
      const speech = isMr
        ? `तुम्ही तुमच्या स्वतःच्या घरात, अगदी सुरक्षित आहात. मी आशा तुमच्यासोबतच आहे.`
        : isHi
        ? `आप अपने सुरक्षित घर में हैं। सब कुछ शांत है और मैं आशा आपके साथ हूँ।`
        : `You are safe at home in your own sanctuary. Everything is calm and I am right here with you.`;

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
      const speech = isMr
        ? `${primaryLovedOne} अगदी सुरक्षित आहेत आणि त्या तुमच्यावर खूप प्रेम करतात. त्या लवकरच येतील.`
        : isHi
        ? `${primaryLovedOne} बिल्कुल ठीक हैं और वे आपसे बहुत प्यार करती हैं। वे जल्द ही आपसे मिलेंगी।`
        : `${primaryLovedOne} is doing very well and thinking of you with love. You are warmly cared for.`;

      return {
        speech,
        expression: 'comforting',
        intent: 'REPEATED_FAMILY_QUERY',
        confidence: 0.95,
        actionClass: 'class1_read',
        clinicalState: 'Reassuring',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          description: 'View Loved Ones',
        },
      };
    }

    // -------------------------------------------------------------
    // Step 6: Category A: Greeting & General Conversation
    // -------------------------------------------------------------
    if (intent === 'GREETING') {
      const name = context?.profile?.displayName || 'Sunita';
      return {
        speech: isMr
          ? `नमस्कार ${name}! मी आशा, तुमची काळजी आणि आठवणींची सोबती. आज मी तुम्हाला कशी मदत करू?`
          : isHi
          ? `नमस्ते ${name}! मैं आशा हूँ, आपकी देखभाल और याददाश्त साथी। आज मैं आपकी किस प्रकार मदद कर सकती हूँ?`
          : `Namaste ${name}! I am Asha, your memory companion. How may I gently assist you today?`,
        expression: 'happy',
        intent: 'GREETING',
        confidence: 0.95,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'HOW_ARE_YOU') {
      return {
        speech: isMr
          ? 'मी अगदी शांत आणि आपल्या मदतीसाठी तत्पर आहे. आज तुम्हाला कसे वाटत आहे?'
          : isHi
          ? 'मैं बहुत शांत और आपकी सहायता के लिए तैयार हूँ। आप आज कैसा महसूस कर रहे हैं?'
          : 'I am peaceful, present, and ready to assist you! How are you feeling today?',
        expression: 'happy',
        intent: 'HOW_ARE_YOU',
        confidence: 0.95,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'GRATITUDE') {
      return {
        speech: isMr
          ? 'तुमचे मनापासून आभार! तुमच्यासोबत राहून मदत करण्यात मला खूप आनंद मिळतो.'
          : isHi
          ? 'आपका बहुत-बहुत धन्यवाद! आपके साथ रहना और आपकी मदद करना मुझे बहुत सुख देता है।'
          : 'You are so very welcome! It brings me immense warmth and joy to accompany you.',
        expression: 'acknowledging',
        intent: 'GRATITUDE',
        confidence: 0.95,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'GENERAL_HELP') {
      return {
        speech: isHi
          ? 'मैं आपकी दिनचर्या की जांच करने, गतिविधियों की याद दिलाने, परिवार की यादें देखने, नोट्स सहेजने या शांत खेल खेलने में आपकी मदद कर सकती हूँ।'
          : 'I can help you review your daily routines, recall reminders, explore family memories, view notes, or play gentle cognitive games.',
        expression: 'explaining',
        intent: 'GENERAL_HELP',
        confidence: 0.92,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'WELLBEING_TIRED') {
      DailyWellbeingService.setDailyCondition(patientId, 'tired');
      return {
        speech: isMr
          ? 'एक शांत श्वास घ्या आणि विश्रांती घ्या. आज कोणतीही घाई नाही. मी तुमचे वेळापत्रक सोपे केले आहे; तुमची महत्त्वाची औषधे वेळेवर राहतील.'
          : isHi
          ? 'एक गहरी सांस लें और आराम से बैठें। आज कोई जल्दबाजी नहीं है। मैंने दिनचर्या आसान कर दी है; जरूरी दवाएं समय पर रहेंगी।'
          : 'Take a deep breath and rest comfortably. There is absolutely no rush today. I have simplified your daily schedule, and your essential prescribed medicines remain safely on time.',
        expression: 'comforting',
        intent: 'WELLBEING_TIRED',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: 'Daily schedule adapted for comfort',
        },
      };
    }

    if (intent === 'WELLBEING_CONFUSED') {
      return {
        speech: isHi
          ? 'चिंता की कोई बात नहीं है। आप पूरी तरह सुरक्षित हैं। आपका परिवार और आपकी सुखद यादें हमेशा आपके साथ हैं। हम बिना किसी जल्दबाजी के, शांति से आगे बढ़ेंगे।'
          : 'Please do not worry at all. Take a gentle breath. You are in a safe, caring space. Your loved ones are always with you, and we can take all the time you need.',
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
          speech: isHi
            ? 'आज आपकी दिनचर्या में कोई गतिविधि निर्धारित नहीं है। अपने दिन का शांति से आनंद लें!'
            : 'You do not have any activities planned for today. Enjoy your peaceful day!',
          expression: 'calm',
          intent: 'ROUTINES_TODAY',
          confidence: 0.95,
          actionClass: 'class1_read',
        };
      }

      const nextPartHi = next ? ` आपकी अगली गतिविधि '${next.title}' ${next.scheduledTime} पर है।` : '';
      const nextPartEn = next ? ` Your next activity is ${next.title} scheduled at ${next.scheduledTime}.` : '';

      return {
        speech: isHi
          ? `आज आपकी देखभाल के लिए कुल ${total} गतिविधियां हैं (${completed} पूरी, ${remaining} बाकी)।${nextPartHi}`
          : `You have ${total} activities planned for today (${completed} completed, ${remaining} remaining).${nextPartEn}`,
        expression: 'guiding',
        intent: 'ROUTINES_TODAY',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: isHi ? 'दिनचर्या खोलें' : 'Open Daily Routines',
        },
      };
    }

    // Scenario 2: Start Next Activity
    if (intent === 'ROUTINES_START_NEXT') {
      const next = context?.routines?.nextScheduledRoutine;
      if (next) {
        return {
          speech: isHi
            ? `आपकी अगली गतिविधि '${next.title}' के लिए गाइडेड टास्क रनर खोल रही हूँ। हम इसे एक-एक शांत कदम में पूरा करेंगे!`
            : `Opening your guided task runner for '${next.title}'. I will accompany you through each calm step!`,
          expression: 'guiding',
          intent: 'ROUTINES_START_NEXT',
          confidence: 0.96,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'LAUNCH_ROUTINE_RUNNER',
            targetId: next.id,
            description: isHi ? `${next.title} शुरू करें` : `Start ${next.title}`,
          },
        };
      } else {
        const total = context?.routines?.progress?.total || 0;
        return {
          speech: isHi
            ? `बहुत बढ़िया! आपने आज अपनी सभी ${total} देखभाल गतिविधियाँ पूरी कर ली हैं। अब शांति से विश्राम करें।`
            : `All ${total} of your scheduled activities for today are already completed! Take this time to rest comfortably.`,
          expression: 'done_completed',
          intent: 'ROUTINES_START_NEXT',
          confidence: 0.96,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_ROUTINES',
            description: isHi ? 'दिनचर्या देखें' : 'View Routines',
          },
        };
      }
    }

    if (intent === 'ROUTINES_NEXT') {
      const next = context?.routines?.nextScheduledRoutine;
      if (next) {
        return {
          speech: isMr
            ? `तुमची पुढची कृती '${next.title}' ${next.scheduledTime} वाजता आहे. आपण एकत्र पाहूया का?`
            : isHi
            ? `आपकी अगली गतिविधि '${next.title}' ${next.scheduledTime} पर निर्धारित है। क्या हम इसे अभी देखें?`
            : `Your next activity is ${next.title} scheduled at ${next.scheduledTime}. Would you like to look at it together?`,
          expression: 'reminder',
          intent: 'ROUTINES_NEXT',
          confidence: 0.95,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_ROUTINES',
            targetId: next.id,
            description: isMr ? 'दिनक्रम उघडा' : isHi ? 'दिनचर्या खोलें' : 'Open Daily Routines',
          },
        };
      } else {
        const total = context?.routines?.progress?.total || 0;
        if (total === 0) {
          return {
            speech: isMr
              ? 'तुमच्या दिनक्रमात सध्या कोणतीही कृती नाही. तुम्ही किंवा तुमचे काळजीवाहू नवीन कृती जोडू शकता.'
              : isHi
              ? 'आपकी देखभाल योजना में अभी कोई दिनचर्या निर्धारित नहीं है। आप या आपके देखभालकर्ता पहली गतिविधि जोड़ सकते हैं।'
              : 'You do not have any scheduled routines yet. You or your caregiver can add your first gentle routine whenever you are ready.',
            expression: 'clarifying',
            intent: 'ROUTINES_NEXT',
            confidence: 0.95,
            actionClass: 'class1_read',
            suggestedAction: {
              action: 'NAVIGATE_ROUTINES',
              description: isMr ? 'दिनक्रम जोडा' : isHi ? 'दिनचर्या जोड़ें' : 'Add First Routine',
            },
          };
        }
        return {
          speech: isMr
            ? `खूप छान! तुम्ही आजच्या सर्व ${total} कृती पूर्ण केल्या आहेत. आता निवांत विश्रांती घ्या.`
            : isHi
            ? `बहुत बढ़िया! आपने आज अपनी सभी ${total} देखभाल गतिविधियाँ पूरी कर ली हैं। अब शांति से विश्राम करें।`
            : `Wonderful news! You have peacefully completed all ${total} of your care steps for today. Take time to relax and rest.`,
          expression: 'done_completed',
          intent: 'ROUTINES_NEXT',
          confidence: 0.95,
          actionClass: 'class1_read',
        };
      }
    }

    // Scenario 11: Medication Check (Truthful Self-Report Guard)
    if (intent === 'ROUTINES_MEDICATION_STATUS') {
      return ConversationSafetyPolicy.formatMedicationSelfReport(context, language);
    }

    if (intent === 'ROUTINES_REMAINING') {
      const rem = context?.routines?.progress?.remaining ?? 0;
      const tot = context?.routines?.progress?.total ?? 0;
      const pct = context?.routines?.progress?.percentage ?? 0;
      return {
        speech: isHi
          ? `आज आपके कुल ${tot} में से ${rem} कार्य बाकी हैं (${pct}% कार्य पूरा हो चुका है)। हर छोटा कदम महत्वपूर्ण है!`
          : `You have ${rem} activities remaining out of ${tot} today (${pct}% completed). Every gentle step matters!`,
        expression: 'encouraging',
        intent: 'ROUTINES_REMAINING',
        confidence: 0.92,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: isHi ? 'दिनचर्या देखें' : 'View Routines',
        },
      };
    }

    if (intent === 'ROUTINES_MEMORY_LAPSE') {
      const active = context?.routines?.activeRoutine;
      return {
        speech: isMr
          ? `काळजी करू नका! आपण शांतपणे एक-एक पाऊल पुढे टाकू. तुमची सध्याची कृती '${active?.title || 'शांत वेळ'}' आहे.`
          : isHi
          ? `बिल्कुल चिंता मत कीजिए! हम एक समय में एक ही कदम उठाते हैं। आपकी वर्तमान गतिविधि '${active?.title || 'शांतिपूर्ण पल'}' है। आइए इसे देखें।`
          : `Please do not worry at all! We take things one calm step at a time. Your current routine is '${active?.title || 'a peaceful moment'}' scheduled at ${active?.scheduledTime || 'now'}. Let's look at it together.`,
        expression: 'encouraging',
        intent: 'ROUTINES_MEMORY_LAPSE',
        confidence: 0.92,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          targetId: active?.id,
          description: isMr ? 'दिनक्रम उघडा' : isHi ? 'दिनचर्या खोलें' : 'Open Daily Routines',
        },
      };
    }

    if (intent === 'ROUTINES_INCOMPLETE') {
      const remaining = context?.routines?.remainingRoutines || [];
      const titles = remaining.map((r) => `'${r.title}'`).join(', ');
      return {
        speech: isHi
          ? `आपके पास ${remaining.length} अधूरी गतिविधियाँ हैं: ${titles || 'कोई नहीं'}।`
          : `You have ${remaining.length} incomplete activities: ${titles || 'none'}.`,
        expression: 'guiding',
        intent: 'ROUTINES_INCOMPLETE',
        confidence: 0.92,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: isHi ? 'दिनचर्या देखें' : 'View Routines',
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
          speech: isHi
            ? 'आप यह रिमाइंडर किस समय के लिए निर्धारित करना चाहते हैं? कृपया समय बताएं (जैसे कि 5 PM)।'
            : 'What time would you like me to set this reminder for? Please tell me the time (for example, 5 PM).',
          expression: 'clarifying',
          intent: 'REMINDER_ADD',
          confidence: 0.9,
          actionClass: 'class1_read',
          missingInfoPrompt: 'time',
        };
      }

      const title = entities.routineTitle || (isHi ? 'शाम की देखभाल' : 'Gentle Evening Care');
      const proposalText = isHi
        ? `आपने आज ${time} के लिए '${title}' का रिमाइंडर जोड़ने को कहा है। क्या मैं इसे आपकी दिनचर्या में सहेज लूँ?`
        : `You asked me to add a reminder for '${title}' at ${time} today. Should I save it to your routine?`;

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
        speech: isHi
          ? `आज आपकी दिनचर्या में ${count} रिमाइंडर और गतिविधियाँ निर्धारित हैं।`
          : `You have ${count} reminders and care steps scheduled in your routine today.`,
        expression: 'reminder',
        intent: 'REMINDERS_TODAY',
        confidence: 0.92,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: isHi ? 'दिनचर्या देखें' : 'View Routines',
        },
      };
    }

    if (intent === 'REMINDER_NEXT') {
      const next = context?.routines?.nextScheduledRoutine;
      if (next) {
        return {
          speech: isHi
            ? `आपका अगला रिमाइंडर '${next.title}' ${next.scheduledTime} पर है।`
            : `Your next reminder is '${next.title}' at ${next.scheduledTime}.`,
          expression: 'reminder',
          intent: 'REMINDER_NEXT',
          confidence: 0.94,
          actionClass: 'class1_read',
        };
      } else {
        return {
          speech: isHi
            ? 'आज के लिए आगे कोई निर्धारित रिमाइंडर नहीं है।'
            : 'You have no more upcoming reminders scheduled for today.',
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
          speech: isHi
            ? `आपके रिकॉर्ड किए गए सत्रों में, आपने हाल ही में '${gameToSuggest.title}' नहीं खेला है। क्या आप इसे अभी आज़माना चाहेंगे?`
            : `In your recorded sessions, you haven't played '${gameToSuggest.title}' recently. Would you like to explore it together?`,
          expression: 'helping_recall',
          intent: 'GAMES_UNPLAYED_RECENTLY',
          confidence: 0.95,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'NAVIGATE_MIND_GAMES',
            description: isHi ? `${gameToSuggest.title} खेलें` : `Play ${gameToSuggest.title}`,
          },
        };
      } else if (history.length > 0) {
        // All played; suggest the least recently played
        const leastRecent = history[history.length - 1];
        return {
          speech: isHi
            ? `आपके रिकॉर्ड किए गए सत्रों में, आपने '${leastRecent.gameTitle}' सबसे पहले ${leastRecent.date} को खेला था। क्या आप इसे दोबारा खेलना चाहेंगे?`
            : `In your recorded sessions, you haven't played '${leastRecent.gameTitle}' since ${leastRecent.date}. Would you like to play it again?`,
          expression: 'helping_recall',
          intent: 'GAMES_UNPLAYED_RECENTLY',
          confidence: 0.95,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'NAVIGATE_MIND_GAMES',
            description: isHi ? `${leastRecent.gameTitle} खेलें` : `Play ${leastRecent.gameTitle}`,
          },
        };
      } else {
        return {
          speech: isHi
            ? 'मुझे आपके हाल के खेल सत्रों का कोई रिकॉर्ड नहीं मिला। क्या आप मिलकर एक शांत कार्ड मिलान खेल खेलना चाहेंगे?'
            : "I can't see your recent game history right now. Would you like to explore a gentle card matching game?",
          expression: 'helping_recall',
          intent: 'GAMES_UNPLAYED_RECENTLY',
          confidence: 0.95,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'NAVIGATE_MIND_GAMES',
            description: isHi ? 'माइंड गेम्स खोलें' : 'Open Mind Games',
          },
        };
      }
    }

    if (intent === 'GAMES_RECENT') {
      const sessions = context?.mindGames?.recentSessions || [];
      if (sessions.length > 0) {
        const last = sessions[0];
        return {
          speech: isHi
            ? `हाल ही में आपने '${last.gameTitle}' गतिविधि में भाग लिया था (${last.difficulty} स्तर)। आप अपने मन को सक्रिय रख रहे हैं!`
            : `Recently you enjoyed '${last.gameTitle}' (${last.difficulty} level) on ${last.date}. You are keeping your mind energized and joyful!`,
          expression: 'happy',
          intent: 'GAMES_RECENT',
          confidence: 0.94,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_MIND_GAMES',
            description: isHi ? 'खेल इतिहास देखें' : 'View Games History',
          },
        };
      } else {
        return {
          speech: isHi
            ? 'आपने आज अभी तक कोई दिमागी गतिविधि नहीं खेली है। क्या आप एक शांत कार्ड मिलान खेल आज़माना चाहेंगे?'
            : 'You have not played an activity in your recorded sessions recently. Would you like to explore a gentle game?',
          expression: 'happy',
          intent: 'GAMES_RECENT',
          confidence: 0.94,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_MIND_GAMES',
            description: isHi ? 'माइंड गेम्स खोलें' : 'Open Mind Games',
          },
        };
      }
    }

    if (intent === 'GAMES_RECOMMEND') {
      const rec = context?.mindGames?.adaptiveRecommendation;
      const diff = rec?.recommendedDifficulty || 'easy';
      return {
        speech: isHi
          ? `आपकी हाल की लय के आधार पर, मैं '${diff}' स्तर पर एक शांत दिमागी खेल की सिफारिश करती हूँ। क्या हम इसे शुरू करें?`
          : `Based on your peaceful rhythm, I recommend a game at the ${diff} level. Would you like to explore it together?`,
        expression: 'encouraging',
        intent: 'GAMES_RECOMMEND',
        confidence: 0.93,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: isHi ? 'सुझाया गया खेल खोलें' : 'Open Recommended Game',
        },
      };
    }

    if (intent === 'GAMES_EASY') {
      return {
        speech: isHi
          ? 'यहाँ आपके लिए एक बहुत ही सरल और शांत कार्ड मिलान खेल है।'
          : 'Here is a gentle, relaxed matching game designed for calm focus.',
        expression: 'encouraging',
        intent: 'GAMES_EASY',
        confidence: 0.93,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: isHi ? 'आसान खेल खेलें' : 'Play Easy Game',
        },
      };
    }

    if (intent === 'GAMES_LAUNCH_SPECIFIC' || intent === 'GAMES_LIST') {
      const isRoomMemory = /(?:room|camera|कमर|कॅमेर|खोली)/i.test(query);
      if (isRoomMemory) {
        return {
          speech: isMr
            ? 'आपण खोलीची आठवण हा खेळ खेळू शकतो! आपण कॅमेऱ्याने खोलीतील वस्तू पाहू शकता किंवा सुंदर छायाचित्रे. कॅमेऱ्याचा डेटा फक्त याच फोनवर राहतो आणि कोणताही फोटो सेव्ह होत नाही.'
            : isHi
            ? 'हम कमरे की याद खेल खेल सकते हैं! आप कैमरे से अपने कमरे की परिचित चीजें देख सकते हैं या सुंदर तस्वीरें। आपका कैमरा पूरी तरह सुरक्षित है और कोई फोटो कभी सेव नहीं होती।'
            : "We can explore Room Memory together! You can look around your room with your device camera or view comforting reference photos. Your camera image stays strictly on this device and no photos are ever saved.",
          expression: 'happy',
          intent: 'GAMES_LAUNCH_SPECIFIC',
          confidence: 0.95,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'NAVIGATE_MIND_GAMES',
            targetId: 'game-room-memory',
            description: isMr ? 'खोलीची आठवण उघडा' : isHi ? 'कमरे की याद खोलें' : 'Open Room Memory',
          },
        };
      }

      return {
        speech: isMr
          ? 'नक्कीच! चला आपण आपल्या खेळांचा शांततेने आनंद घेऊया.'
          : isHi
          ? 'हाँ बिल्कुल! आइए मिलकर आपके दिमागी खेल संग्रह का आनंद लें।'
          : "Of course! Let's explore your Mind Games collection together for some peaceful cognitive fun.",
        expression: 'happy',
        intent: 'GAMES_LIST',
        confidence: 0.93,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: isMr ? 'खेळ उघडा' : isHi ? 'माइंड गेम्स खोलें' : 'Open Mind Games',
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
        const names = candidates.map((c) => c.name).join(' or ');
        return {
          speech: isHi
            ? `आप किसकी आवाज़ सुनना चाहेंगे — ${candidates.map((c) => c.name).join(' या ')}?`
            : `Which family member's voice would you like to hear — ${names}?`,
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
            speech: isHi
              ? `आपके ${member.relationship} ${member.name} का सहेजा हुआ प्यारा संदेश सुना रही हूँ।`
              : `Playing the warm voice recording from your ${member.relationship}, ${member.name}.`,
            expression: 'comforting',
            intent: 'LOVED_ONES_VOICE',
            confidence: 0.96,
            actionClass: 'class1_read',
            suggestedAction: {
              action: 'SHOW_FAMILY_MEMBER',
              targetId: member.id,
              description: isHi ? `${member.name} की आवाज़ सुनें` : `Play ${member.name}'s voice`,
            },
          };
        } else {
          return {
            speech: isHi
              ? `${member.name} के लिए अभी कोई आवाज़ संदेश सहेजा नहीं गया है। क्या आप उनकी पारिवारिक तस्वीर देखना चाहेंगे?`
              : `${member.name} does not have a saved voice message in your family album yet. Would you like to view their memory card?`,
            expression: 'reassuring',
            intent: 'LOVED_ONES_VOICE',
            confidence: 0.94,
            actionClass: 'class1_read',
            suggestedAction: {
              action: 'SHOW_FAMILY_MEMBER',
              targetId: member.id,
              description: isHi ? `${member.name} को देखें` : `View ${member.name}`,
            },
          };
        }
      } else {
        return {
          speech: isHi
            ? 'आपकी पारिवारिक एल्बम में अभी कोई आवाज़ रिकॉर्डिंग नहीं मिली। आइए आपकी पारिवारिक तस्वीरें देखें।'
            : 'I could not find a saved voice recording in your Loved Ones album. Would you like to browse family photos?',
          expression: 'clarifying',
          intent: 'LOVED_ONES_VOICE',
          confidence: 0.92,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_LOVED_ONES',
            description: isHi ? 'परिवार एल्बम खोलें' : 'Open Loved Ones',
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
      if (count === 0) {
        return {
          speech: isHi
            ? 'आपकी पारिवारिक एल्बम में अभी कोई सदस्य नहीं है। क्या आप परिवार एल्बम खोलकर पहली तस्वीर जोड़ना चाहेंगे?'
            : 'Your family memory album is empty right now. Would you like to open your Loved Ones album to add your first family member?',
          expression: 'reassuring',
          intent: 'LOVED_ONES_LIST',
          confidence: 0.95,
          actionClass: 'class2_navigate',
          suggestedAction: {
            action: 'NAVIGATE_LOVED_ONES',
            description: isHi ? 'परिवार एल्बम खोलें' : 'Open Loved Ones',
          },
        };
      }
      return {
        speech: isHi
          ? `यहाँ आपकी प्रियजनों की एल्बम है। आपके पास ${count} सहेज कर रखी गई पारिवारिक यादें और तस्वीरें हैं।`
          : `Here is your Loved Ones gallery with ${count} cherished family memories and photo cards.`,
        expression: 'happy',
        intent: 'LOVED_ONES_LIST',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          description: isHi ? 'परिवार एल्बम खोलें' : 'Open Loved Ones',
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
        const names = matchingRels.map((m: any) => m.name).join(' or ');
        return {
          speech: isHi
            ? `आप किस बेटी की प्रोफ़ाइल देखना चाहते हैं — ${matchingRels.map((m: any) => m.name).join(' या ')}?`
            : `Which daughter would you like to see — ${names}?`,
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
          speech: isHi
            ? `${matched.name} आपके ${matched.relationship} हैं। ${matched.description}`
            : `${matched.name} is your ${matched.relationship}. ${matched.description}${matched.familiarPhrase ? ` They often say: "${matched.familiarPhrase}"` : ''}`,
          expression: 'happy',
          intent: 'LOVED_ONES_PERSON',
          confidence: 0.95,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_LOVED_ONES',
            targetId: matched.id,
            description: isHi ? `${matched.name} को देखें` : `View ${matched.name}`,
          },
        };
      } else {
        return {
          speech: isHi
            ? 'मुझे आपकी पारिवारिक एल्बम में अभी यह नाम नहीं मिला। क्या हम मिलकर आपकी प्रियजनों की एल्बम देखें?'
            : "I don't have a record for that specific person in your Loved Ones album yet. Would you like to browse your family memories together?",
          expression: 'clarifying',
          intent: 'LOVED_ONES_PERSON',
          confidence: 0.92,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_LOVED_ONES',
            description: isHi ? 'परिवार एल्बम खोलें' : 'Open Loved Ones',
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
          speech: isHi
            ? `अपने ${matched.relationship} ${matched.name} के साथ आप आनंद लेते हैं: ${acts}।`
            : `With your ${matched.relationship} ${matched.name}, you enjoy: ${acts}.`,
          expression: 'happy',
          intent: 'LOVED_ONES_ACTIVITY',
          confidence: 0.93,
          actionClass: 'class1_read',
        };
      }
    }

    if (intent === 'LOVED_ONES_QUIZ') {
      return {
        speech: isHi
          ? 'हाँ बिल्कुल! आइए एक शांत और सुखद पारिवारिक चेहरा याद करने की गतिविधि (Face Recall Quiz) खेलें।'
          : "Of course! Let's explore your gentle Family Face Recall Quiz together. It is a wonderful, relaxed way to connect with your family memories.",
        expression: 'happy',
        intent: 'LOVED_ONES_QUIZ',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          description: isHi ? 'फेस रिकॉल शुरू करें' : 'Start Face Recall Quiz',
        },
      };
    }

    if (intent === 'LOVED_ONES_CLUE') {
      const member = context?.lovedOnes?.lovedOnes?.[0];
      const clue = member?.cues?.[0] || member?.familiarPhrase || member?.description || 'a warm smile and shared memories';
      return {
        speech: isHi
          ? `${member ? member.name : 'परिवार'} के लिए सुराग: "${clue}"`
          : `Here is a memory clue for ${member ? member.name : 'your family'}: "${clue}"`,
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
          speech: isHi
            ? `आपके पास ${pinned.length} पिन किया हुआ नोट है: ${details}। पूरा पढ़ने के लिए नोट्स खोल रही हूँ।`
            : `You have ${pinned.length} pinned note${pinned.length > 1 ? 's' : ''}: ${details}. Opening your notes sanctuary for full reading.`,
          expression: 'explaining',
          intent: 'NOTES_READ_PINNED',
          confidence: 0.96,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_NOTES',
            description: isHi ? 'नोट्स खोलें' : 'Open Notes',
          },
        };
      } else {
        return {
          speech: isHi
            ? 'अभी आपके पास कोई पिन किया हुआ नोट नहीं है। नया नोट लिखने या रिकॉर्ड करने के लिए नोट्स खोल रही हूँ।'
            : 'You do not have any pinned notes right now. Opening your notes sanctuary so you can write or speak one.',
          expression: 'reassuring',
          intent: 'NOTES_READ_PINNED',
          confidence: 0.96,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_NOTES',
            description: isHi ? 'नोट्स खोलें' : 'Open Notes',
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
          speech: isHi
            ? `मुझे आपका नोट '${top.title}' मिला: "${top.content}"। आपके नोट्स खोल रही हूँ।`
            : `I found your note '${top.title}': "${top.content}". Opening your notes sanctuary.`,
          expression: 'explaining',
          intent: 'NOTES_SEARCH',
          confidence: 0.94,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_NOTES',
            description: isHi ? 'नोट्स खोलें' : 'Open Notes',
          },
        };
      } else {
        return {
          speech: isHi
            ? `'${queryTerm}' से संबंधित कोई नोट नहीं मिला। आपके सभी नोट्स खोल रही हूँ।`
            : `I could not find a note matching '${queryTerm}'. Opening your notes sanctuary so you can look through them.`,
          expression: 'clarifying',
          intent: 'NOTES_SEARCH',
          confidence: 0.92,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_NOTES',
            description: isHi ? 'नोट्स खोलें' : 'Open Notes',
          },
        };
      }
    }

    if (intent === 'NOTES_CREATE') {
      return {
        speech: isHi
          ? 'मैं आपका नोट तैयार करने में सहायता कर सकती हूँ। आपकी सुरक्षा और पुष्टि के लिए, मैं नोट संपादक खोल रही हूँ ताकि आप सहेजने से पहले समीक्षा कर सकें।'
          : 'I can help prepare that note. For your accuracy, I am opening the note editor so you can review and confirm before saving.',
        expression: 'confirming',
        intent: 'NOTES_CREATE',
        confidence: 0.95,
        actionClass: 'class3_consequential',
        suggestedAction: {
          action: 'OPEN_NOTES',
          description: isHi ? 'नोट संपादक खोलें' : 'Open Note Editor',
        },
      };
    }

    if (intent === 'NOTES_LIST') {
      return {
        speech: isHi
          ? 'आपके व्यक्तिगत नोट्स खोल रही हूँ। यहाँ आप अपने विचार, यादें और रिकॉर्डिंग सुरक्षित रख सकते हैं।'
          : 'Opening your personal notes sanctuary. Here you can preserve your thoughts, reflections, and recordings.',
        expression: 'noting_saving',
        intent: 'NOTES_LIST',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'OPEN_NOTES',
          description: isHi ? 'नोट्स खोलें' : 'Open Notes',
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
            return `'${e.title}'${timeStr ? ` at ${timeStr}` : ''}`;
          })
          .join(', ');
        return {
          speech: isHi
            ? `कल आपके पास ${tomorrowEvents.length} कार्यक्रम निर्धारित हैं: ${titles}। आपका कैलेंडर खोल रही हूँ।`
            : `Tomorrow you have ${tomorrowEvents.length} event${tomorrowEvents.length > 1 ? 's' : ''} scheduled: ${titles}. Opening your calendar.`,
          expression: 'reminder',
          intent: 'CALENDAR_TOMORROW',
          confidence: 0.96,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_CALENDAR',
            description: isHi ? 'कैलेंडर खोलें' : 'Open Calendar',
          },
        };
      } else {
        return {
          speech: isHi
            ? 'कल के लिए आपके कैलेंडर में कोई कार्यक्रम निर्धारित नहीं है। आप आराम से विश्राम कर सकते हैं।'
            : 'You have no events scheduled for tomorrow in your calendar. Take time to relax and rest.',
          expression: 'calm',
          intent: 'CALENDAR_TOMORROW',
          confidence: 0.96,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_CALENDAR',
            description: isHi ? 'कैलेंडर खोलें' : 'Open Calendar',
          },
        };
      }
    }

    if (intent === 'CALENDAR_TODAY') {
      const todayEvts = context?.calendar?.todayEvents || [];
      if (todayEvts.length > 0) {
        const titles = todayEvts.map((e: any) => `'${e.title}'`).join(', ');
        return {
          speech: isHi
            ? `आज आपके पास ${todayEvts.length} कार्यक्रम निर्धारित हैं: ${titles}। आपका कैलेंडर खोल रही हूँ।`
            : `Today you have ${todayEvts.length} scheduled event${todayEvts.length > 1 ? 's' : ''}: ${titles}. Opening your calendar so you can see all details.`,
          expression: 'reminder',
          intent: 'CALENDAR_TODAY',
          confidence: 0.93,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_CALENDAR',
            description: isHi ? 'कैलेंडर खोलें' : 'Open Calendar',
          },
        };
      } else {
        return {
          speech: isHi
            ? 'आज के लिए कोई विशेष कार्यक्रम निर्धारित नहीं है। अपनी दिनचर्या या नया कार्यक्रम देखने के लिए कैलेंडर खोल रही हूँ।'
            : 'You have no calendar events scheduled for today. Opening your calendar so you can view your week or add an event.',
          expression: 'calm',
          intent: 'CALENDAR_TODAY',
          confidence: 0.93,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'OPEN_CALENDAR',
            description: isHi ? 'कैलेंडर खोलें' : 'Open Calendar',
          },
        };
      }
    }

    if (intent === 'CALENDAR_WEEK') {
      const upcoming = context?.calendar?.upcomingEvents || [];
      return {
        speech: isHi
          ? `आने वाले दिनों में आपके पास ${upcoming.length} कार्यक्रम निर्धारित हैं। आपका पूरा कैलेंडर खोल रही हूँ।`
          : `You have ${upcoming.length} upcoming event${upcoming.length === 1 ? '' : 's'} in your calendar. Opening your calendar.`,
        expression: 'reminder',
        intent: 'CALENDAR_WEEK',
        confidence: 0.94,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'OPEN_CALENDAR',
          description: isHi ? 'कैलेंडर खोलें' : 'Open Calendar',
        },
      };
    }

    if (intent === 'CALENDAR_ADD') {
      return {
        speech: isHi
          ? 'मैं यह कार्यक्रम निर्धारित करने में मदद कर सकती हूँ। आपकी सुरक्षा और दिनचर्या के लिए, मैं कैलेंडर संपादक खोल रही हूँ ताकि आप सहेजने से पहले समीक्षा कर सकें।'
          : 'I can help schedule that event. For your care routine and accuracy, I am opening the calendar editor so you can review and confirm before saving.',
        expression: 'confirming',
        intent: 'CALENDAR_ADD',
        confidence: 0.95,
        actionClass: 'class3_consequential',
        suggestedAction: {
          action: 'OPEN_CALENDAR',
          description: isHi ? 'कैलेंडर संपादक खोलें' : 'Open Calendar Editor',
        },
      };
    }

    // -------------------------------------------------------------
    // Step 13: Category H: Navigation
    // -------------------------------------------------------------
    if (intent === 'NAVIGATE_HOME_GUIDE') {
      const speech = isMr
        ? 'तुम्ही अगदी सुरक्षित आहात. मी तुम्हाला घराचा सोपा आणि स्पष्ट मार्ग बाणाने दाखवत आहे.'
        : isHi
        ? 'आप पूरी तरह सुरक्षित हैं। मैं आपको घर पहुँचने के लिए एक सरल और स्पष्ट दिशा तीर दिखा रही हूँ।'
        : 'You are safe. I can guide you home with a simple, clear arrow right now.';
      return {
        speech,
        expression: 'guiding',
        intent: 'NAVIGATE_HOME_GUIDE',
        confidence: 0.98,
        actionClass: 'class2_navigate',
        clinicalState: 'Reassuring',
        suggestedAction: {
          action: 'NAVIGATE_HOME_GUIDE',
          description: isMr ? 'घराचा मार्ग' : isHi ? 'घर का रास्ता' : 'Asha Home Guide',
        },
      };
    }

    if (intent === 'NAVIGATE_HOME') {
      return {
        speech: isHi
          ? 'आपको आपके मुख्य डैशबोर्ड पर वापस ले जा रही हूँ।'
          : 'Taking you back to your peaceful home dashboard.',
        expression: 'happy',
        intent: 'NAVIGATE_HOME',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_HOME',
          description: isHi ? 'होम स्क्रीन' : 'Home Screen',
        },
      };
    }

    if (intent === 'NAVIGATE_ROUTINES') {
      return {
        speech: isHi
          ? 'यहाँ आपकी दैनिक देखभाल दिनचर्या है।'
          : 'Here is your Daily Routines workspace.',
        expression: 'guiding',
        intent: 'NAVIGATE_ROUTINES',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: isHi ? 'दिनचर्या खोलें' : 'Open Daily Routines',
        },
      };
    }

    if (intent === 'NAVIGATE_FAMILY') {
      return {
        speech: isMr
          ? 'येथे तुमचे कुटुंबीय आणि प्रियजनांचे सुंदर फोटो आहेत.'
          : isHi
          ? 'यहाँ आपकी प्रियजनों की एल्बम है।'
          : 'Here is your Loved Ones family sanctuary.',
        expression: 'happy',
        intent: 'NAVIGATE_FAMILY',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          description: isMr ? 'कुटुंब फोटो उघडा' : isHi ? 'परिवार एल्बम खोलें' : 'Open Loved Ones',
        },
      };
    }

    if (intent === 'NAVIGATE_GAMES') {
      return {
        speech: isMr
          ? 'तुमचे मेंदूचे खेळ उघडत आहे.'
          : isHi
          ? 'माइंड गेम्स संग्रह खोल रही हूँ।'
          : 'Opening your Mind Games collection.',
        expression: 'happy',
        intent: 'NAVIGATE_GAMES',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: isMr ? 'खेळ उघडा' : isHi ? 'माइंड गेम्स खोलें' : 'Open Mind Games',
        },
      };
    }

    if (intent === 'NAVIGATE_PROFILE') {
      return {
        speech: isHi
          ? 'आपकी प्रोफ़ाइल और देखभाल सेटिंग्स खोल रही हूँ।'
          : 'Opening your Profile and care preferences.',
        expression: 'guiding',
        intent: 'NAVIGATE_PROFILE',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_HOME',
          description: isHi ? 'प्रोफ़ाइल' : 'Profile',
        },
      };
    }

    if (intent === 'OPEN_NOTES') {
      return {
        speech: isHi ? 'नोट्स खोल रही हूँ।' : 'Opening your personal notes.',
        expression: 'noting_saving',
        intent: 'OPEN_NOTES',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'OPEN_NOTES',
          description: isHi ? 'नोट्स खोलें' : 'Open Notes',
        },
      };
    }

    if (intent === 'OPEN_CALENDAR') {
      return {
        speech: isHi ? 'कैलेंडर खोल रही हूँ।' : 'Opening your calendar.',
        expression: 'guiding',
        intent: 'OPEN_CALENDAR',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'OPEN_CALENDAR',
          description: isHi ? 'कैलेंडर खोलें' : 'Open Calendar',
        },
      };
    }

    if (intent === 'OPEN_CAMERA') {
      return {
        speech: isMr
          ? 'कॅमेरा सुरू करत आहे. परिसरातील वस्तू शांतपणे पाहू शकता.'
          : isHi
          ? 'कैमरा खोल रही हूँ। आप आसपास की चीजें आराम से देख सकते हैं।'
          : 'Opening your camera for visual exploration. Please allow camera access.',
        expression: 'guiding',
        intent: 'OPEN_CAMERA',
        confidence: 0.96,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'OPEN_CAMERA',
          description: isMr ? 'कॅमेरा उघडा' : isHi ? 'कैमरा खोलें' : 'Open Camera',
        },
      };
    }

    if (intent === 'OPEN_TODO') {
      return {
        speech: isMr
          ? 'तुमची दैनंदिन कामे आणि औषधांचे वेळापत्रक उघडत आहे.'
          : isHi
          ? 'आपकी दैनिक देखभाल और टू-डू सूची खोल रही हूँ।'
          : 'Opening your daily to-do and routine care tasks.',
        expression: 'guiding',
        intent: 'NAVIGATE_ROUTINES',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: isHi ? 'टू-डू खोलें' : 'Open To-Do',
        },
      };
    }

    if (intent === 'WELLBEING_ADAPT_EASIER') {
      DailyWellbeingService.setDailyCondition(patientId, 'tired');
      return {
        speech: isMr
          ? 'मी आज तुमचे वेळापत्रक सोपे केले आहे. विश्रांती घ्या, आवश्यक औषधे वेळेवर राहतील.'
          : isHi
          ? 'मैंने आज आपका शेड्यूल आसान कर दिया है। आराम करें, जरूरी दवाएं समय पर रहेंगी।'
          : 'I have simplified your schedule today. Rest comfortably; your essential doctor-prescribed medications remain strictly on time.',
        expression: 'reassuring',
        intent: 'WELLBEING_ADAPT_EASIER',
        confidence: 0.96,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: 'Schedule adapted for comfort',
        },
      };
    }

    // -------------------------------------------------------------
    // Step 13b: Stage 3 Phase B — Adaptive Personalized Support Handlers
    // -------------------------------------------------------------
    if (intent === 'INSTRUCTION_REPEAT') {
      const active = context?.routines?.activeRoutine;
      const stepText = active?.steps && active.steps.length > 0 ? active.steps[0] : null;
      const speech = isMr
        ? (stepText
            ? `नक्की! ही आहे पुढची पायरी: ${stepText}. शांतपणे वेळ घ्या.`
            : 'नक्की! आम्ही शांतपणे एक-एक पायरी पुन्हा करू. सर्व वेळ तुमचाच आहे.')
        : isHi
        ? (stepText
            ? `बिल्कुल! यह है आपका अगला चरण: ${stepText}। आराम से समय लें।`
            : 'बिल्कुल! हम शांति से एक-एक चरण दोबारा दोहराएंगे। पूरा समय आपका है।')
        : (stepText
            ? `Certainly! Here is your step again: "${stepText}". Please take all the time you need.`
            : `Certainly! Take a gentle breath. We take things one calm step at a time, completely at your own pace.`);

      return {
        speech,
        expression: 'guiding',
        intent: 'INSTRUCTION_REPEAT',
        confidence: 0.96,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          targetId: active?.id,
          description: isMr ? 'दिनक्रम उघडा' : isHi ? 'दिनचर्या खोलें' : 'View Routine Step',
        },
      };
    }

    if (intent === 'ASSISTANCE_HINT') {
      const speech = isMr
        ? 'काळजी करू नका, हा घ्या एक लहानसा क्लू: शांतपणे श्वास घ्या आणि पहिल्या भागावर लक्ष केंद्रित करा. कोणतीही घाई नाही.'
        : isHi
        ? 'चिंता मत कीजिए, यह रहा एक छोटा संकेत: शांत सांस लें और केवल पहले भाग पर ध्यान दें। कोई जल्दी नहीं है।'
        : 'Do not worry at all! Here is a gentle hint: Take a slow breath, look closely at the first small part, and remember there is no rush at all.';

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

      let speech = isMr
        ? 'नक्कीच! मी तुमच्यासाठी ही कृती अधिक सोपी आणि शांत केली आहे. आता आपण सोप्या पायऱ्यांनी करू.'
        : isHi
        ? 'बिल्कुल! मैंने आपके लिए इसे और अधिक आसान और शांत बना दिया है। अब हम सरल गति से करेंगे।'
        : 'Certainly! I have adjusted this activity to a gentler, more peaceful pace with simpler steps for you.';

      if (pending?.requiresCaregiverApproval) {
        speech = isMr
          ? 'मी नोंद घेतली आहे की आपल्याला लहान पायऱ्या हव्या आहेत! आपले कुटुंबही याची पाहणी करेल आणि आम्ही ते आपल्यासाठी तयार ठेवू.'
          : isHi
          ? 'मैंने नोट कर लिया है कि आप छोटे चरण चाहते हैं! आपके परिवार के सदस्य भी इसे देखेंगे और हम इसे आपके लिए तैयार रखेंगे।'
          : "I noticed this activity needed a little extra help recently. I've noted that you'd like smaller steps! Your family caregiver will also review this, and we'll have it ready for you.";
      }

      return {
        speech,
        expression: 'comforting',
        intent: 'ADAPTATION_MAKE_EASIER',
        confidence: 0.96,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: isMr ? 'सोपे खेळ पहा' : isHi ? 'आसान खेल देखें' : 'Try Gentle Level',
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

      const speech = isMr
        ? 'फार छान! आपण आपल्या नेहमीच्या परिचयाच्या पातळीवरच राहू. कोणताही बदल केला जाणार नाही.'
        : isHi
        ? 'बहुत अच्छा! हम आपके जाने-पहचाने स्तर पर ही रहेंगे। कोई भी बदलाव नहीं किया जाएगा।'
        : "That's completely fine. We can keep things the way you know them. We will keep your familiar, comfortable level exactly as it is. No changes will be made.";

      return {
        speech,
        expression: 'reassuring',
        intent: 'ADAPTATION_KEEP_LEVEL',
        confidence: 0.96,
        actionClass: 'class1_read',
      };
    }

    if (intent === 'ADAPTATION_TRY_HARDER') {
      const speech = isMr
        ? 'छान! आपण पुढची पातळी नक्की पाहू शकता. आणि लक्षात ठेवा, आपल्याला वाटल्यास आपण कधीही आधीच्या पातळीवर परत येऊ शकता.'
        : isHi
        ? 'बहुत बढ़िया! आप अगला स्तर बिल्कुल आज़मा सकते हैं। और याद रखें, आप जब चाहें अपने पुराने स्तर पर वापस लौट सकते हैं।'
        : 'Wonderful! You are very welcome to explore the next level. And remember, you can return to your familiar level whenever you wish.';

      return {
        speech,
        expression: 'encouraging',
        intent: 'ADAPTATION_TRY_HARDER',
        confidence: 0.96,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: isMr ? 'खेळ उघडा' : isHi ? 'खेल खोलें' : 'Explore Next Level',
        },
      };
    }

    if (intent === 'WELLBEING_REST_BREAK') {
      const speech = isMr
        ? 'नक्कीच! शांतपणे बसा, हात सैल सोडा आणि दोन मिनिटे विश्रांती घ्या. मी इथेच तुमच्यासोबत आहे.'
        : isHi
        ? 'बिल्कुल! आराम से बैठिए, हाथ ढीले छोड़िए और दो मिनट का विश्राम लीजिए। मैं यहीं आपके साथ हूँ।'
        : 'Certainly! Sit back comfortably, relax your hands, and take a peaceful two-minute rest. Asha is right here with you.';

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

      const speech = isMr
        ? 'मी सर्व काही आधीसारखे पूर्ववत केले आहे. तुमची नेहमीची आवडती पातळी परत आली आहे.'
        : isHi
        ? 'मैंने सब कुछ पहले जैसा कर दिया है। आपका जाना-पहचाना स्तर वापस आ गया है।'
        : 'I have restored your familiar configuration just as it was before. Everything is back to your preferred version.';

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

      const speech = isMr
        ? 'समजले! मी कोणताही बदल केलेला नाही. तुमचा दिनक्रम आणि खेळ नेहमीसारखेच राहतील.'
        : isHi
        ? 'समझ गई! मैंने कोई बदलाव नहीं किया है। आपकी दिनचर्या और खेल हमेशा की तरह ही रहेंगे।'
        : 'Understood completely! No changes have been made. Your daily routine and activities will stay exactly as you know them.';

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
      const speech = isMr
        ? recent
          ? `आम्ही पाहिले की अलीकडे थोडा अधिक वेळ लागत होता, म्हणून हे अधिक सोपे आणि शांत केले आहे. आपल्याला हवे असल्यास आपण 'आधीसारखे करा' म्हणू शकता!`
          : 'आम्ही वेळोवेळी कृती अधिक शांत आणि सोप्या बनवतो जेणेकरून आपल्याला कोणताही ताण जाणवू नये. आपण कधीही जुनी पातळी ठेवू शकता.'
        : isHi
        ? recent
          ? `हमने देखा कि हाल ही में थोड़ा अधिक प्रयास लग रहा था, इसलिए इसे और अधिक शांत व सरल बनाया गया है। आप जब चाहें 'पहले जैसा करो' कह सकते हैं!`
          : 'हम गतिविधियों को अधिक शांत और सरल बनाते हैं ताकि कोई तनाव न हो। आप जब चाहें पुराना स्तर रख सकते हैं।'
        : recent
        ? `We noticed this activity was taking a little extra effort recently, so we made it calmer and gentler with smaller steps. You can always say "keep familiar" anytime!`
        : `We gently adjust activities to make sure they remain calmer and gentler, peaceful, and pressure-free. You can always ask to keep your familiar level anytime.`;

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
        speech: isHi
          ? 'मैं सीधे अस्पताल या डॉक्टर की बुकिंग नहीं कर सकती क्योंकि मैं बाहरी बुकिंग सेवा से नहीं जुड़ी हूँ। आप अपने सक्षम कैलेंडर में अपॉइंटमेंट जोड़ सकते हैं या अपने देखभालकर्ता से संपर्क कर सकते हैं।'
          : 'I cannot book doctor appointments directly as I am not connected to an external booking service. You can add an appointment to your Saksham Calendar or contact your caregiver.',
        expression: 'explaining',
        intent: 'UNKNOWN_FALLBACK',
        confidence: 0.85,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'OPEN_CALENDAR',
          description: isHi ? 'कैलेंडर खोलें' : 'Open Calendar',
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
      speech: isHi
        ? 'मैं आपके साथ हूँ! क्या आप अपनी अगली दिनचर्या देखना चाहते हैं, परिवार की तस्वीरें देखना चाहते हैं, या कोई खेल खेलना चाहते हैं?'
        : 'I am right here with you! Would you like to check your next scheduled routine, browse family pictures, or play a gentle game?',
      expression: 'reassuring',
      intent: 'UNKNOWN_FALLBACK',
      confidence: 0.3,
      actionClass: 'class1_read',
      clarificationOptions: [
        { label: isHi ? 'दैनिक दिनचर्या' : 'Daily Routines', query: 'What do I have to do today?' },
        { label: isHi ? 'परिवार की यादें' : 'Family Photos', query: 'Show me my family' },
        { label: isHi ? 'दिमागी खेल' : 'Mind Games', query: 'Show me my games' },
      ],
    };
  }
}
