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

export class ConversationEngine {
  /**
   * Main conversational pipeline:
   * Patient Input -> Normalization -> Safety Guards -> Confirmation Handling ->
   * Entity Extraction -> Intent Recognition -> Context Retrieval -> Action Protocol & Response.
   */
  public static process(
    transcript: string,
    context?: PatientContext,
    language: string = 'en',
    authUid?: string
  ): ConversationResult & Promise<ConversationResult> {
    const raw = transcript.trim();
    const query = raw.toLowerCase();
    const isHi = language === 'hi';
    const patientId = context?.patientId || 'default-patient';

    // -------------------------------------------------------------
    // Step 1: Emergency & Distress Safety Guard (Immediate priority)
    // -------------------------------------------------------------
    const emergencyResult = ConversationSafetyPolicy.checkEmergencyDistress(query, language);
    if (emergencyResult) {
      return Object.assign(Promise.resolve(emergencyResult), emergencyResult);
    }

    // -------------------------------------------------------------
    // Step 2: Restricted Clinical & Administrative Actions Guard
    // -------------------------------------------------------------
    const restrictedResult = ConversationSafetyPolicy.checkRestrictedActions(query, language);
    if (restrictedResult) {
      return Object.assign(Promise.resolve(restrictedResult), restrictedResult);
    }

    // -------------------------------------------------------------
    // Step 3: Pending Consequential Action Confirmation / Cancellation
    // -------------------------------------------------------------
    const activePending = ConversationActionRegistry.getActivePendingConfirmation(patientId);

    if (activePending) {
      const match = IntentRegistry.match(query);
      if (match.intent === 'CONFIRMATION_YES') {
        const syncPlaceholder: ConversationResult = {
          speech: isHi
            ? 'आपका अनुरोध सुरक्षित रूप से सहेज लिया गया है।'
            : 'I have saved your request safely on this device.',
          expression: 'done_completed',
          intent: 'CONFIRMATION_YES',
          confidence: 1.0,
          actionClass: 'class3_consequential',
          metadata: { status: 'saved_locally' },
        };

        const asyncExecution = ConversationActionRegistry.executePendingConfirmation(patientId, activePending.id, authUid).then(
          (execRes) => {
            const finalRes: ConversationResult = {
              speech: isHi ? execRes.speechHi : execRes.speechEn,
              expression: execRes.success ? 'done_completed' : 'reassuring',
              intent: 'CONFIRMATION_YES',
              confidence: 1.0,
              actionClass: 'class3_consequential',
              metadata: { status: execRes.status, retryAvailable: execRes.retryAvailable },
            };
            Object.assign(syncPlaceholder, finalRes);
            return finalRes;
          }
        );

        return Object.assign(asyncExecution, syncPlaceholder);
      }

      if (match.intent === 'CONFIRMATION_NO') {
        ConversationActionRegistry.cancelPendingConfirmation(patientId);
        const cancelRes: ConversationResult = {
          speech: isHi
            ? 'मैंने आपका वह अनुरोध रद्द कर दिया है। आपकी कोई भी जानकारी नहीं बदली गई है।'
            : 'I have cancelled that request. No changes were made to your care sanctuary.',
          expression: 'reassuring',
          intent: 'CONFIRMATION_NO',
          confidence: 1.0,
          actionClass: 'class3_consequential',
        };
        return Object.assign(Promise.resolve(cancelRes), cancelRes);
      }
    }

    const syncResult = this.evaluateNonActionPipeline(query, raw, context, language, patientId, isHi);
    return Object.assign(Promise.resolve(syncResult), syncResult);
  }

  /**
   * Always-asynchronous conversational query evaluator.
   */
  public static async processAsync(
    transcript: string,
    context?: PatientContext,
    language: string = 'en',
    authUid?: string
  ): Promise<ConversationResult> {
    return this.process(transcript, context, language, authUid);
  }

  /**
   * Synchronous query evaluator for read-only / emergency testing pipelines.
   */
  public static processSync(
    transcript: string,
    context?: PatientContext,
    language: string = 'en'
  ): ConversationResult {
    const raw = transcript.trim();
    const query = raw.toLowerCase();
    const isHi = language === 'hi';
    const patientId = context?.patientId || 'default-patient';

    const emergencyResult = ConversationSafetyPolicy.checkEmergencyDistress(query, language);
    if (emergencyResult) return emergencyResult;

    const restrictedResult = ConversationSafetyPolicy.checkRestrictedActions(query, language);
    if (restrictedResult) return restrictedResult;

    return this.evaluateNonActionPipeline(query, raw, context, language, patientId, isHi);
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
    // Step 4: Extract Entities & Match Intent
    // -------------------------------------------------------------
    const entities = EntityExtractor.extract(query, context);
    const { intent } = IntentRegistry.match(query);

    // -------------------------------------------------------------
    // Step 5: Check for Ambiguous Query (Scenario 9)
    // -------------------------------------------------------------
    if (intent === 'AMBIGUOUS_QUERY') {
      return {
        speech: isHi
          ? 'आप क्या देखना चाहेंगे — अपनी परिवार की तस्वीरें, व्यक्तिगत नोट्स या दिमागी खेल?'
          : 'Which one would you like me to show you — your family photos, notes or games?',
        expression: 'clarifying',
        intent: 'AMBIGUOUS_QUERY',
        confidence: 0.95,
        actionClass: 'class1_read',
        clarificationOptions: [
          { label: isHi ? 'पारिवारिक फोटो' : 'Family Photos', query: 'Show me my family' },
          { label: isHi ? 'नोट्स' : 'Notes', query: 'Open my notes' },
          { label: isHi ? 'दिमागी खेल' : 'Mind Games', query: 'Show me my games' },
        ],
      };
    }

    // -------------------------------------------------------------
    // Step 6: Category A: Greeting & General Conversation
    // -------------------------------------------------------------
    if (intent === 'GREETING') {
      const name = context?.profile?.displayName || 'Sunita';
      return {
        speech: isHi
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
        speech: isHi
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
        speech: isHi
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
      return {
        speech: isHi
          ? 'एक गहरी सांस लें और आराम से बैठें। आज कोई जल्दबाजी नहीं है। थोड़ा पानी पिएं और शांति महसूस करें।'
          : 'Take a deep breath and rest comfortably. There is absolutely no rush today. Would you like to sip some warm water and rest?',
        expression: 'comforting',
        intent: 'WELLBEING_TIRED',
        confidence: 0.92,
        actionClass: 'class1_read',
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
          speech: isHi
            ? `आपकी अगली गतिविधि '${next.title}' ${next.scheduledTime} पर निर्धारित है। क्या हम इसे अभी देखें?`
            : `Your next activity is ${next.title} scheduled at ${next.scheduledTime}. Would you like to look at it together?`,
          expression: 'reminder',
          intent: 'ROUTINES_NEXT',
          confidence: 0.95,
          actionClass: 'class1_read',
          suggestedAction: {
            action: 'NAVIGATE_ROUTINES',
            targetId: next.id,
            description: isHi ? 'दिनचर्या खोलें' : 'Open Daily Routines',
          },
        };
      } else {
        const total = context?.routines?.progress?.total || 0;
        if (total === 0) {
          return {
            speech: isHi
              ? 'आपकी देखभाल योजना में अभी कोई दिनचर्या निर्धारित नहीं है। आप या आपके देखभालकर्ता पहली गतिविधि जोड़ सकते हैं।'
              : 'You do not have any scheduled routines yet. You or your caregiver can add your first gentle routine whenever you are ready.',
            expression: 'clarifying',
            intent: 'ROUTINES_NEXT',
            confidence: 0.95,
            actionClass: 'class1_read',
            suggestedAction: {
              action: 'NAVIGATE_ROUTINES',
              description: isHi ? 'दिनचर्या जोड़ें' : 'Add First Routine',
            },
          };
        }
        return {
          speech: isHi
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
        speech: isHi
          ? `बिल्कुल चिंता मत कीजिए! हम एक समय में एक ही कदम उठाते हैं। आपकी वर्तमान गतिविधि '${active?.title || 'शांतिपूर्ण पल'}' है। आइए इसे देखें।`
          : `Please do not worry at all! We take things one calm step at a time. Your current routine is '${active?.title || 'a peaceful moment'}' scheduled at ${active?.scheduledTime || 'now'}. Let's look at it together.`,
        expression: 'encouraging',
        intent: 'ROUTINES_MEMORY_LAPSE',
        confidence: 0.92,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          targetId: active?.id,
          description: isHi ? 'दिनचर्या खोलें' : 'Open Daily Routines',
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
      return {
        speech: isHi
          ? 'हाँ बिल्कुल! आइए मिलकर आपके दिमागी खेल संग्रह का आनंद लें।'
          : "Of course! Let's explore your Mind Games collection together for some peaceful cognitive fun.",
        expression: 'happy',
        intent: 'GAMES_LIST',
        confidence: 0.93,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: isHi ? 'माइंड गेम्स खोलें' : 'Open Mind Games',
        },
      };
    }

    // -------------------------------------------------------------
    // Step 10: Category E: Loved Ones & Family (Scenarios 4 & 5)
    // -------------------------------------------------------------
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
      const members = context?.lovedOnes?.lovedOnes || [];
      const rel = entities.relationship;
      const targetName = entities.personName;

      // Check if multiple relatives match relationship (e.g. multiple daughters)
      const matchingRels = rel ? members.filter((m) => m.relationship.toLowerCase().includes(rel.toLowerCase())) : [];
      if (matchingRels.length > 1 && !targetName) {
        const names = matchingRels.map((m) => m.name).join(' or ');
        return {
          speech: isHi
            ? `आप किस बेटी की प्रोफ़ाइल देखना चाहते हैं — ${matchingRels.map((m) => m.name).join(' या ')}?`
            : `Which daughter would you like to see — ${names}?`,
          expression: 'clarifying',
          intent: 'LOVED_ONES_PERSON',
          confidence: 0.95,
          actionClass: 'class1_read',
          clarificationOptions: matchingRels.map((m) => ({
            label: m.name,
            query: `Show me ${m.name}`,
          })),
        };
      }

      const matched = members.find((m) => {
        if (targetName && m.name.toLowerCase().includes(targetName.toLowerCase())) return true;
        if (rel && m.relationship.toLowerCase().includes(rel.toLowerCase())) return true;
        return false;
      });

      if (matched) {
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
        speech: isHi
          ? 'यहाँ आपकी प्रियजनों की एल्बम है।'
          : 'Here is your Loved Ones family sanctuary.',
        expression: 'happy',
        intent: 'NAVIGATE_FAMILY',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          description: isHi ? 'परिवार एल्बम खोलें' : 'Open Loved Ones',
        },
      };
    }

    if (intent === 'NAVIGATE_GAMES') {
      return {
        speech: isHi
          ? 'माइंड गेम्स संग्रह खोल रही हूँ।'
          : 'Opening your Mind Games collection.',
        expression: 'happy',
        intent: 'NAVIGATE_GAMES',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: isHi ? 'माइंड गेम्स खोलें' : 'Open Mind Games',
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
    // Step 15: Scenario 12 — Unknown Query / Regional Phrase Fallback
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
