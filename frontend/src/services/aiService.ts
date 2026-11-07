import { WhitelistedAction } from '../types/index.js';
import { PatientContext } from './patientContextService.js';

export interface AIResponse {
  speech: string;
  characterState: 'greeting' | 'listening' | 'speaking' | 'thinking' | 'happy' | 'reminder' | 'encouraging';
  suggestedAction?: {
    action: WhitelistedAction;
    targetId?: string;
    description: string;
  };
}

const PERMITTED_ACTIONS: WhitelistedAction[] = [
  'NAVIGATE_HOME',
  'NAVIGATE_ROUTINES',
  'NAVIGATE_LOVED_ONES',
  'NAVIGATE_MIND_GAMES',
  'NAVIGATE_ROOM_MEMORY',
  'TRIGGER_ROUTINE_REMINDER',
  'SHOW_FAMILY_MEMBER',
  'TRIGGER_ASSISTANCE_TRAY'
];

/**
 * Local Contextual Intent Parser.
 * Uses real patient data from PatientContext to produce truthful, reassuring responses
 * with zero external paid LLM calls (100% Spark Free Plan compliant).
 */
export const parseAIIntentLocally = (
  transcript: string,
  context?: PatientContext,
  language: string = 'en'
): AIResponse => {
  const query = transcript.trim().toLowerCase();
  const isHi = language === 'hi';

  // 1. SAFETY CRITICAL GUARD: Medical Advice & Urgent Distress
  if (
    query.includes('chest pain') ||
    query.includes('heart attack') ||
    query.includes('double my dose') ||
    query.includes('change my pills') ||
    query.includes('change pills') ||
    query.includes('change dose') ||
    query.includes('diagnose') ||
    query.includes('emergency') ||
    query.includes('छाती में दर्द') ||
    query.includes('दवा बदल') ||
    query.includes('खुराक बदल') ||
    query.includes('आपातकाल')
  ) {
    return {
      speech: isHi
        ? "मैं चिकित्सीय सलाह या दवा में बदलाव का सुझाव नहीं दे सकती। यदि आपको कोई अस्वस्थता या आपातकालीन समस्या महसूस हो रही है, तो कृपया तुरंत अपने देखभालकर्ता या डॉक्टर से संपर्क करें।"
        : "I cannot provide medical advice, diagnosis, or medication recommendations. If you are experiencing pain, discomfort, or an urgent medical concern, please immediately contact your caregiver or healthcare provider.",
      characterState: 'encouraging',
    };
  }

  // 2. Navigation — Dashboard / Home
  if (
    query.includes('take me home') ||
    query.includes('dashboard') ||
    query.includes('main screen') ||
    query.includes('घर') ||
    query.includes('डैशबोर्ड') ||
    query.includes('होम')
  ) {
    return {
      speech: isHi
        ? "आपको आपके मुख्य डैशबोर्ड पर वापस ले जा रही हूँ।"
        : "Taking you back to your peaceful home dashboard.",
      characterState: 'greeting',
      suggestedAction: {
        action: 'NAVIGATE_HOME',
        description: isHi ? 'डैशबोर्ड खोलें' : 'Open Dashboard',
      },
    };
  }

  // 3. Daily Routines: Next Task Query
  if (
    query.includes('what should i do next') ||
    query.includes('what is next') ||
    query.includes('next task') ||
    query.includes('what next') ||
    query.includes('अगला क्या है') ||
    query.includes('आगे क्या करना')
  ) {
    const next = context?.routines.nextScheduledRoutine;
    if (next) {
      return {
        speech: isHi
          ? `आपकी अगली गतिविधि '${next.title}' ${next.scheduledTime} पर निर्धारित है। क्या हम इसे अभी देखें?`
          : `Your next activity is ${next.title} scheduled at ${next.scheduledTime}. Would you like to look at it together?`,
        characterState: 'reminder',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          targetId: next.id,
          description: isHi ? 'दिनचर्या खोलें' : 'Open Daily Routines',
        },
      };
    } else {
      const total = context?.routines.progress.total || 0;
      return {
        speech: isHi
          ? `बहुत बढ़िया! आपने आज अपनी सभी ${total} देखभाल गतिविधियाँ पूरी कर ली हैं। अब शांति से विश्राम करें।`
          : `Wonderful news! You have peacefully completed all ${total} of your care steps for today. Take time to relax and rest.`,
        characterState: 'happy',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: isHi ? 'दिनचर्या देखें' : 'View Routines',
        },
      };
    }
  }

  // 4. Daily Routines: Specific Medication / Morning Check
  if (
    query.includes('medicine') ||
    query.includes('pill') ||
    query.includes('blood pressure') ||
    query.includes('completed my morning') ||
    query.includes('morning routine') ||
    query.includes('दवा') ||
    query.includes('गोली') ||
    query.includes('सुबह की दिनचर्या')
  ) {
    const medRoutine = context?.routines.routines.find(
      (r) => r.category === 'medication' || r.period === 'morning'
    );

    if (medRoutine) {
      if (medRoutine.isCompleted) {
        return {
          speech: isHi
            ? `हाँ! आपने '${medRoutine.title}' ${medRoutine.completedAt || 'आज सुबह'} पूरी कर ली है। आप अपना बहुत अच्छा ध्यान रख रहे हैं!`
            : `Yes! You completed '${medRoutine.title}' ${medRoutine.completedAt ? `at ${medRoutine.completedAt}` : 'earlier today'}. You are taking wonderful care of yourself!`,
          characterState: 'happy',
          suggestedAction: {
            action: 'NAVIGATE_ROUTINES',
            targetId: medRoutine.id,
            description: isHi ? 'दिनचर्या देखें' : 'View Routines',
          },
        };
      } else {
        return {
          speech: isHi
            ? `अभी नहीं। आपकी '${medRoutine.title}' ${medRoutine.scheduledTime} के लिए निर्धारित है। आइए इसे मिलकर पूरा करें।`
            : `Not yet. Your '${medRoutine.title}' is scheduled for ${medRoutine.scheduledTime}. Let's open it together so you can complete it gently.`,
          characterState: 'reminder',
          suggestedAction: {
            action: 'NAVIGATE_ROUTINES',
            targetId: medRoutine.id,
            description: isHi ? 'दिनचर्या खोलें' : 'Open Daily Routines',
          },
        };
      }
    }
  }

  // 5. Daily Routines: Remaining Tasks
  if (
    query.includes('remaining') ||
    query.includes('how many left') ||
    query.includes('what is left') ||
    query.includes('कितने काम बाकी') ||
    query.includes('बचे हुए')
  ) {
    const rem = context?.routines.progress.remaining ?? 0;
    const tot = context?.routines.progress.total ?? 0;
    const pct = context?.routines.progress.percentage ?? 0;

    return {
      speech: isHi
        ? `आज आपके कुल ${tot} में से ${rem} कार्य बाकी हैं (${pct}% कार्य पूरा हो चुका है)। हर छोटा कदम महत्वपूर्ण है!`
        : `You have ${rem} activities remaining out of ${tot} today (${pct}% completed). Every gentle step matters!`,
      characterState: 'encouraging',
      suggestedAction: {
        action: 'NAVIGATE_ROUTINES',
        description: isHi ? 'दिनचर्या देखें' : 'View Routines',
      },
    };
  }

  // 6. Daily Routines: Memory Lapse / "I forgot what I was doing"
  if (
    query.includes('forgot') ||
    query.includes('what was i doing') ||
    query.includes('lost my place') ||
    query.includes('भूल गया') ||
    query.includes('क्या कर रहा था')
  ) {
    const active = context?.routines.activeRoutine;
    return {
      speech: isHi
        ? `बिल्कुल चिंता मत कीजिए! हम एक समय में एक ही कदम उठाते हैं। आपकी वर्तमान गतिविधि '${active?.title || 'शांतिपूर्ण पल'}' है। आइए इसे देखें।`
        : `Please do not worry at all! We take things one calm step at a time. Your current routine is '${active?.title || 'a peaceful moment'}' scheduled at ${active?.scheduledTime || 'now'}. Let's look at it together.`,
      characterState: 'encouraging',
      suggestedAction: {
        action: 'NAVIGATE_ROUTINES',
        targetId: active?.id,
        description: isHi ? 'दिनचर्या खोलें' : 'Open Daily Routines',
      },
    };
  }

  // 7. General Routines Navigation
  if (
    query.includes('routine') ||
    query.includes('schedule') ||
    query.includes('task') ||
    query.includes('दिनचर्या') ||
    query.includes('काम')
  ) {
    const active = context?.routines.activeRoutine;
    return {
      speech: isHi
        ? `यहाँ आपकी दैनिक देखभाल दिनचर्या है। अगली गतिविधि '${active?.title || 'सुबह का समय'}' है।`
        : `Here is your Daily Routines schedule. Your next gentle focus is ${active?.title || 'morning care'}.`,
      characterState: 'reminder',
      suggestedAction: {
        action: 'NAVIGATE_ROUTINES',
        description: isHi ? 'दिनचर्या खोलें' : 'Open Daily Routines',
      },
    };
  }

  // 8. Loved Ones: Specific Person Query ("Who is Ananya?", "Who is Aarav?", etc.)
  if (query.includes('who is') || query.includes('कौन है') || query.includes('tell me about')) {
    const members = context?.lovedOnes.lovedOnes || [];
    const matchedMember = members.find((m) => {
      const name = m.name.toLowerCase();
      const nick = (m.nickname || '').toLowerCase();
      return query.includes(name) || (nick && query.includes(nick)) || name.split(' ').some((n) => query.includes(n));
    });

    if (matchedMember) {
      return {
        speech: isHi
          ? `${matchedMember.name} आपके ${matchedMember.relationship} हैं। ${matchedMember.description}`
          : `${matchedMember.name} is your ${matchedMember.relationship}. ${matchedMember.description}${matchedMember.familiarPhrase ? ` They often say: "${matchedMember.familiarPhrase}"` : ''}`,
        characterState: 'happy',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          targetId: matchedMember.id,
          description: isHi ? 'प्रोफ़ाइल देखें' : `View ${matchedMember.name}`,
        },
      };
    } else {
      return {
        speech: isHi
          ? "मुझे आपकी पारिवारिक एल्बम में अभी यह नाम नहीं मिला। क्या हम मिलकर आपकी प्रियजनों की एल्बम देखें?"
          : "I don't have a record for that specific person in your Loved Ones album yet. Would you like to browse your family memories together?",
        characterState: 'thinking',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          description: isHi ? 'परिवार एल्बम खोलें' : 'Open Loved Ones',
        },
      };
    }
  }

  // 9. Loved Ones: Activities with Relatives ("What do I enjoy doing with my daughter?")
  if (
    query.includes('enjoy doing with') ||
    query.includes('do with my') ||
    query.includes('daughter') ||
    query.includes('son') ||
    query.includes('grandson') ||
    query.includes('के साथ क्या')
  ) {
    const members = context?.lovedOnes.lovedOnes || [];
    const matched = members.find((m) => {
      const rel = m.relationship.toLowerCase();
      if (query.includes('daughter') && rel.includes('daughter')) return true;
      if (query.includes('son') && rel.includes('son') && !rel.includes('grandson')) return true;
      if (query.includes('grandson') && rel.includes('grandson')) return true;
      if (query.includes('friend') && rel.includes('friend')) return true;
      return false;
    });

    if (matched) {
      const acts = matched.favouriteActivities && matched.favouriteActivities.length > 0
        ? matched.favouriteActivities.join(', ')
        : matched.cues?.join(', ') || 'spending quiet time together';
      return {
        speech: isHi
          ? `अपने ${matched.relationship} ${matched.name} के साथ आप आनंद लेते हैं: ${acts}।`
          : `With your ${matched.relationship} ${matched.name}, you enjoy: ${acts}.`,
        characterState: 'happy',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          targetId: matched.id,
          description: isHi ? 'यादें देखें' : `View ${matched.name}`,
        },
      };
    }
  }

  // 9b. Loved Ones: Family Face Recall Quiz & Activity
  if (
    query.includes('family quiz') ||
    query.includes('recall quiz') ||
    query.includes('face recall') ||
    query.includes('family activity') ||
    query.includes('family recall') ||
    query.includes('चेहरा याद')
  ) {
    return {
      speech: isHi
        ? "हाँ बिल्कुल! आइए एक शांत और सुखद पारिवारिक चेहरा याद करने की गतिविधि (Face Recall Quiz) खेलें।"
        : "Of course! Let's explore your gentle Family Face Recall Quiz together. It is a wonderful, relaxed way to connect with your family memories.",
      characterState: 'happy',
      suggestedAction: {
        action: 'NAVIGATE_LOVED_ONES',
        description: isHi ? 'फेस रिकॉल शुरू करें' : 'Start Face Recall Quiz',
      },
    };
  }

  // 9c. Loved Ones: Read Memory Clue
  if (
    query.includes('memory clue') ||
    query.includes('clue for') ||
    query.includes('tell me a clue') ||
    query.includes('याद दिलाने का सुराग') ||
    query.includes('सुराग')
  ) {
    const members = context?.lovedOnes.lovedOnes || [];
    const matched = members.find((m) => {
      const name = m.name.toLowerCase();
      return query.includes(name) || name.split(' ').some((n) => query.includes(n));
    }) || members[0];

    if (matched) {
      const clue = matched.cues?.[0] || matched.familiarPhrase || matched.description;
      return {
        speech: isHi
          ? `${matched.name} के लिए पारिवारिक सुराग: "${clue}"`
          : `Here is a memory clue for ${matched.name}: "${clue}"`,
        characterState: 'happy',
        suggestedAction: {
          action: 'NAVIGATE_LOVED_ONES',
          targetId: matched.id,
          description: isHi ? 'प्रोफ़ाइल देखें' : `View ${matched.name}`,
        },
      };
    }
  }

  // 10. General Loved Ones / Family Navigation
  if (
    query.includes('family') ||
    query.includes('loved one') ||
    query.includes('photo') ||
    query.includes('album') ||
    query.includes('परिवार') ||
    query.includes('तस्वीर')
  ) {
    const count = context?.lovedOnes.count || 0;
    return {
      speech: isHi
        ? `यहाँ आपकी प्रियजनों की एल्बम है। आपके पास ${count} सहेज कर रखी गई पारिवारिक यादें हैं।`
        : `Here is your Loved Ones gallery. You have ${count} cherished family members and warm voice notes to enjoy.`,
      characterState: 'happy',
      suggestedAction: {
        action: 'NAVIGATE_LOVED_ONES',
        description: isHi ? 'परिवार एल्बम खोलें' : 'Open Loved Ones',
      },
    };
  }

  // 11. Mind Games: Recent Games History
  if (
    query.includes('recent games') ||
    query.includes('what games did i play') ||
    query.includes('played recently') ||
    query.includes('game history') ||
    query.includes('हाल ही में खेले')
  ) {
    const sessions = context?.mindGames.recentSessions || [];
    if (sessions.length > 0) {
      const last = sessions[0];
      return {
        speech: isHi
          ? `हाल ही में आपने '${last.gameTitle}' गतिविधि में भाग लिया था (${last.difficulty} स्तर)। आप अपने मन को सक्रिय रख रहे हैं!`
          : `Recently you enjoyed '${last.gameTitle}' (${last.difficulty} level) on ${last.date}. You are keeping your mind energized and joyful!`,
        characterState: 'happy',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: isHi ? 'खेल इतिहास देखें' : 'View Games History',
        },
      };
    } else {
      return {
        speech: isHi
          ? "आपने आज अभी तक कोई दिमागी गतिविधि नहीं खेली है। क्या आप एक शांत कार्ड मिलान खेल आज़माना चाहेंगे?"
          : "You haven't played an activity today yet. Would you like to explore a gentle card matching game?",
        characterState: 'greeting',
        suggestedAction: {
          action: 'NAVIGATE_MIND_GAMES',
          description: isHi ? 'माइंड गेम्स खोलें' : 'Open Mind Games',
        },
      };
    }
  }

  // 12. General Mind Games Navigation
  if (
    query.includes('game') ||
    query.includes('play') ||
    query.includes('puzzle') ||
    query.includes('matching') ||
    query.includes('खेल') ||
    query.includes('पहेली')
  ) {
    return {
      speech: isHi
        ? "हाँ बिल्कुल! आइए मिलकर एक शांतिपूर्ण और आनंददायक दिमागी खेल खेलें।"
        : "Of course! Let's explore your Mind Games collection together for some peaceful fun.",
      characterState: 'happy',
      suggestedAction: {
        action: 'NAVIGATE_MIND_GAMES',
        description: isHi ? 'माइंड गेम्स खोलें' : 'Open Mind Games',
      },
    };
  }

  // 13. Emotional Support: Tired / Exhausted
  if (
    query.includes('tired') ||
    query.includes('exhausted') ||
    query.includes('rest') ||
    query.includes('थक') ||
    query.includes('आराम')
  ) {
    return {
      speech: isHi
        ? "एक गहरी सांस लें और आराम से बैठें। आज कोई जल्दबाजी नहीं है। थोड़ा पानी पिएं और शांति महसूस करें।"
        : "Take a deep breath and rest comfortably. There is absolutely no rush today. Would you like to sip some warm water and rest?",
      characterState: 'encouraging',
    };
  }

  // 14. Emotional Support: Confused / "I can't remember" / "I forgot"
  if (
    query.includes('confused') ||
    query.includes('understand') ||
    query.includes('lost') ||
    query.includes('cannot remember') ||
    query.includes("can't remember") ||
    query.includes('forgot') ||
    query.includes('याद नहीं') ||
    query.includes('भूल') ||
    query.includes('समझ नहीं') ||
    query.includes('उलझन')
  ) {
    return {
      speech: isHi
        ? "चिंता की कोई बात नहीं है। आप पूरी तरह सुरक्षित हैं। आपका परिवार और आपकी सुखद यादें हमेशा आपके साथ हैं। हम बिना किसी जल्दबाजी के, शांति से आगे बढ़ेंगे।"
        : "Please do not worry at all. Take a gentle breath. You are in a safe, caring space. Your loved ones are always with you, and we can take all the time you need.",
      characterState: 'encouraging',
    };
  }

  // 15. General Feature Overview / "What can I do?"
  if (
    query.includes('what can i do') ||
    query.includes('explain') ||
    query.includes('features') ||
    query.includes('menu') ||
    query.includes('क्या कर सकते') ||
    query.includes('सुविधा')
  ) {
    return {
      speech: isHi
        ? "सक्षम के 3 मुख्य शांतिपूर्ण क्षेत्र हैं: दैनिक दिनचर्या (देखभाल और याद दिलाने के लिए), प्रियजन (पारिवारिक फोटो और आवाज़ें), और माइंड गेम्स (मन को सक्रिय रखने के लिए)।"
        : "Saksham has 3 comforting areas: Daily Routines with gentle recall cues, your Loved Ones family memories, and Mind Games for peaceful cognitive joy.",
      characterState: 'greeting',
    };
  }

  // 16. Empathetic Conversational Fallback
  return {
    speech: isHi
      ? "मैं आपके साथ हूँ! क्या आप अपनी अगली दिनचर्या देखना चाहते हैं, परिवार की तस्वीरें देखना चाहते हैं, या कोई खेल खेलना चाहते हैं?"
      : "I am right here with you! Would you like to check your next scheduled routine, browse family pictures, or play a gentle game?",
    characterState: 'speaking',
  };
};

export const queryAICompanion = async (
  transcript: string,
  _currentScreen = 'home',
  language = 'en',
  context?: PatientContext
): Promise<AIResponse> => {
  const backendUrl = import.meta.env.VITE_BACKEND_API_URL;

  // Optional backend endpoint (if configured)
  if (backendUrl && !backendUrl.includes('placeholder')) {
    try {
      const response = await fetch(`${backendUrl}/ai/converse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, currentScreen: _currentScreen, language, context })
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload.data) {
          if (
            payload.data.suggestedAction &&
            !PERMITTED_ACTIONS.includes(payload.data.suggestedAction.action)
          ) {
            delete payload.data.suggestedAction;
          }
          return payload.data;
        }
      }
    } catch {
      // Graceful fallback to local intent matcher
    }
  }

  // Authoritative local intent resolution using patient context
  return parseAIIntentLocally(transcript, context, language);
};
