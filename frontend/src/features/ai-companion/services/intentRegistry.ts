/**
 * SAKSHAM — MILESTONE 7.3: STRUCTURED INTENT REGISTRY
 * Deterministic intent recognition with multilingual phrase catalogs (English & Hindi).
 * 100% Spark Free Plan compliant.
 */

import { IntentType } from '../types/conversation.types.js';

interface IntentRule {
  intent: IntentType;
  patterns: RegExp[];
  confidence: number;
}

export class IntentRegistry {
  private static rules: IntentRule[] = [
    // --- CONFIRMATION HANDLERS (Priority) ---
    {
      intent: 'CONFIRMATION_YES',
      patterns: [
        /^(yes|confirm|save it|sure|please do|save|go ahead|correct|okay|ok)\b/i,
        /^(हाँ|बिल्कुल|हाँ करो|सहेजें|ठीक है|कर दो)/i,
      ],
      confidence: 0.98,
    },
    {
      intent: 'CONFIRMATION_NO',
      patterns: [
        /^(no|cancel|don't|stop|never mind|discard|do not save)\b/i,
        /^(नहीं|रद्द करो|रहने दो|मत करो|कैंसिल)/i,
      ],
      confidence: 0.98,
    },

    // --- AMBIGUOUS QUERIES ---
    {
      intent: 'AMBIGUOUS_QUERY',
      patterns: [
        /^(show me that|open that|show that|what is that|tell me about that|open it|show it)$/i,
        /^(वह दिखाओ|उसे खोलो|मुझे वह बताओ|दिखाओ)$/i,
      ],
      confidence: 0.95,
    },

    // --- PRIORITY ROUTINES: MEMORY LAPSE ("I forgot what I was doing") ---
    {
      intent: 'ROUTINES_MEMORY_LAPSE',
      patterns: [
        /\b(what was i doing|lost my place|forgot what i was doing|i forgot what i was doing|help me remember what i need to do)\b/i,
        /(मैं क्या कर रहा था|भूल गया क्या कर रहा था|याद दिलाओ क्या करना है)/i,
      ],
      confidence: 0.96,
    },

    // --- CATEGORY A: GREETING & GENERAL ---
    {
      intent: 'GREETING',
      patterns: [
        /\b(hello asha|hello|hi asha|hi|namaste|good morning|good afternoon|good evening|hey asha)\b/i,
        /(नमस्ते आशा|नमस्ते|सुप्रभात|नमस्कार|प्रणाम)/i,
        /(வணக்கம்|নমস্কার|سلام)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'HOW_ARE_YOU',
      patterns: [
        /\b(how are you|how are you doing|how is it going)\b/i,
        /(आप कैसी हैं|कैसी हो|क्या हाल है)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'GRATITUDE',
      patterns: [
        /\b(thank you|thanks|thank you asha|grateful)\b/i,
        /(धन्यवाद|शुक्रिया|बहुत अच्छा)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'ROUTINES_START_NEXT',
      patterns: [
        /\b(start my next activity|help me start my next activity|start next activity|begin next routine|start routine|start activity)\b/i,
        /(अगली गतिविधि शुरू करो|काम शुरू करो|दिनचर्या शुरू करो|आरंभ करो)/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'GENERAL_HELP',
      patterns: [
        /^(can you help me|i need some help|i need help|help me|what can you do)[.?!]?$/i,
        /\b(what can you do|how can you help me)\b/i,
        /(मेरी मदद करो|मुझे मदद चाहिए|क्या कर सकती हो|सहायता करो)/i,
      ],
      confidence: 0.9,
    },
    {
      intent: 'WELLBEING_TIRED',
      patterns: [
        /\b(tired|exhausted|need rest|want to sleep|so tired)\b/i,
        /(थक गया|थक गई|आराम करना है|नींद आ रही है)/i,
      ],
      confidence: 0.9,
    },
    {
      intent: 'WELLBEING_CONFUSED',
      patterns: [
        /\b(confused|lost|cannot remember|can't remember|where am i)\b/i,
        /(उलझन|समझ नहीं आ रहा|याद नहीं आ रहा|कहाँ हूँ)/i,
      ],
      confidence: 0.9,
    },

    // --- CATEGORY B: DAILY ROUTINES & ACTIVITIES ---
    {
      intent: 'ROUTINES_MEDICATION_STATUS',
      patterns: [
        /\b(did i take my medicine|have i taken my pills|have i taken my medicine|completed my morning routine|morning medicine|blood pressure pill|medicine status)\b/i,
        /(क्या मैंने दवा ली|दवा ली क्या|गोली खाई|सुबह की दवा)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'ROUTINES_NEXT',
      patterns: [
        /\b(what should i do next|what is my next activity|what is next|what next|next task|next activity)\b/i,
        /(अगला क्या है|आगे क्या करना|अगली गतिविधि क्या है|अगला क्या)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'ROUTINES_TODAY',
      patterns: [
        /\b(what do i have to do today|show me today's activities|today's activities|today's routine|what are my activities today|show my routines)\b/i,
        /(आज क्या करना है|आज की गतिविधियां|आज की दिनचर्या|आज के काम)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'ROUTINES_REMAINING',
      patterns: [
        /\b(how many left|what activities have i finished|remaining activities|what is left|how many activities left)\b/i,
        /(कितने काम बाकी|बचे हुए काम|क्या पूरा कर लिया)/i,
      ],
      confidence: 0.92,
    },
    {
      intent: 'ROUTINES_INCOMPLETE',
      patterns: [
        /\b(show my incomplete activities|incomplete activities|unfinished tasks)\b/i,
        /(अधूरे काम|अधूरी गतिविधियां)/i,
      ],
      confidence: 0.92,
    },

    // --- CATEGORY C: REMINDERS ---
    {
      intent: 'REMINDERS_TODAY',
      patterns: [
        /\b(what reminders do i have today|show my reminders|my reminders today|list reminders)\b/i,
        /(आज के रिमाइंडर|मेरे रिमाइंडर्स|याद दिलाने वाले काम)/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'REMINDER_NEXT',
      patterns: [
        /\b(when is my next reminder|next reminder|upcoming reminder)\b/i,
        /(अगला रिमाइंडर कब है|अगला स्मरण)/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'REMINDER_ADD',
      patterns: [
        /\b(remind me|i want to add a reminder|add a reminder|add reminder|create reminder|remind me at|remind me to)\b/i,
        /(मुझे याद दिलाएं|रिमाइंडर जोड़ें|नया रिमाइंडर|याद दिलाओ)/i,
      ],
      confidence: 0.95,
    },

    // --- CATEGORY D: MIND GAMES ---
    {
      intent: 'GAMES_UNPLAYED_RECENTLY',
      patterns: [
        /\b(which games have i not played recently|games not played recently|games i haven't played|not played recently)\b/i,
        /(जो खेल हाल ही में नहीं खेले|कौन से खेल नहीं खेले)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'GAMES_RECENT',
      patterns: [
        /\b(what did i play yesterday|what games did i play|recent games|games history|what did i play)\b/i,
        /(कल मैंने क्या खेला|हाल ही में खेले खेल|खेल का इतिहास)/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'GAMES_RECOMMEND',
      patterns: [
        /\b(suggest a game for me|recommend a game|what should i play|i want to play a game|i want to play a memory game)\b/i,
        /(कोई खेल सुझाओ|क्या खेलूँ|दिमागी खेल खेलना है)/i,
      ],
      confidence: 0.93,
    },
    {
      intent: 'GAMES_EASY',
      patterns: [
        /\b(i want an easy game|easy game|gentle game|simple game)\b/i,
        /(सरल खेल|आसान खेल|हल्का खेल)/i,
      ],
      confidence: 0.93,
    },
    {
      intent: 'GAMES_LAUNCH_SPECIFIC',
      patterns: [
        /\b(open pattern match|play pattern match|open card match|play card match|open daily sequence|play sequence)\b/i,
        /(पैटर्न मैच खोलो|कार्ड मैच खेलो|अनुक्रम खेल)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'GAMES_LIST',
      patterns: [
        /\b(show me my games|show games|open mind games|my games|mind games|play a game|play game|games)\b/i,
        /(मेरे खेल दिखाओ|माइंड गेम्स|दिमागी खेल खोलो|कोई खेल खेलना|खेल खेलना|खेल)/i,
        /(રમત|खेळ|விளையாட்டு|ఆట|খেলা|ଖେଳ|کھیل|ਖੇਡ)/i,
      ],
      confidence: 0.92,
    },

    // --- CATEGORY E: LOVED ONES & FAMILY ---
    {
      intent: 'LOVED_ONES_VOICE',
      patterns: [
        /\b(play family voice recording|play a family voice recording|play voice recording|play voice note|play my daughter's voice|play .* voice)\b/i,
        /(आवाज़ सुनाओ|रिकॉर्डिंग सुनाओ|बेटी की आवाज़|परिवार की आवाज़)/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'LOVED_ONES_QUIZ',
      patterns: [
        /\b(family quiz|face recall quiz|family recall|family activity|recall quiz)\b/i,
        /(फेस रिकॉल क्विज|पारिवारिक क्विज|चेहरा पहचान)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'LOVED_ONES_CLUE',
      patterns: [
        /\b(help me remember this person|memory clue|tell me a clue|clue for)\b/i,
        /(सुराग बताओ|याद दिलाने का सुराग|पहचानने में मदद)/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'LOVED_ONES_ACTIVITY',
      patterns: [
        /\b(what do i enjoy doing with|enjoy doing with|activities with my)\b/i,
        /(के साथ क्या करना पसंद|साथ में क्या करते हैं)/i,
      ],
      confidence: 0.93,
    },
    {
      intent: 'LOVED_ONES_PERSON',
      patterns: [
        /\b(who is [a-z]+|show me my daughter|show me my son|tell me about [a-z]+)\b/i,
        /(मेरी बेटी दिखाओ|मेरा बेटा दिखाओ|कौन है)/i,
      ],
      confidence: 0.93,
    },
    {
      intent: 'LOVED_ONES_LIST',
      patterns: [
        /\b(show me my family|show me family photos|i want to see family photos|open my family memories|show my family|open family|family photos|family album)\b/i,
        /(परिवार दिखाओ|पारिवारिक तस्वीरें|प्रियजन दिखाओ|परिवार की यादें|परिवार|प्रियजन)/i,
        /(குடும்ப|குடும்பம்|కుటుంబం|ಕುಟುಂಬ|পরিবার|ପରିବାର|પરિવાર|કુટુંબ|कुटुंब)/i,
      ],
      confidence: 0.93,
    },

    // --- CATEGORY F: NOTES ---
    {
      intent: 'NOTES_READ_PINNED',
      patterns: [
        /\b(read my pinned notes|read pinned notes|pinned notes|show pinned notes)\b/i,
        /(पिन किए गए नोट्स पढ़ो|पिन नोट्स दिखाओ)/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'NOTES_CREATE',
      patterns: [
        /\b(i want to write a note|write a note|take a note|create a note|create a new note|add note|new note)\b/i,
        /(नोट लिखना है|नोट लिखो|नया नोट|नोट बनाओ)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'NOTES_SEARCH',
      patterns: [
        /\b(show my shopping note|find my note|show note|search note|note about)\b/i,
        /(खरीदारी का नोट|नोट ढूंढो|मेरा नोट दिखाओ)/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'NOTES_LIST',
      patterns: [
        /\b(open my notes|open notes|show notes|view notes)\b/i,
        /(नोट्स खोलो|मेरे नोट्स)/i,
      ],
      confidence: 0.92,
    },

    // --- CATEGORY G: CALENDAR ---
    {
      intent: 'CALENDAR_TOMORROW',
      patterns: [
        /\b(what do i have tomorrow|tomorrow's appointments|tomorrow's schedule|events tomorrow)\b/i,
        /(कल क्या है|कल का कार्यक्रम|कल की मुलाक़ातें)/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'CALENDAR_WEEK',
      patterns: [
        /\b(what is happening this week|this week's events|this week's schedule)\b/i,
        /(इस हफ्ते क्या है|सप्ताह का कार्यक्रम)/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'CALENDAR_ADD',
      patterns: [
        /\b(add an appointment|add event|create event|schedule appointment|schedule an event|schedule event|add to calendar)\b/i,
        /(अपॉइंटमेंट जोड़ें|कार्यक्रम जोड़ो|कैलेंडर में जोड़ो)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'CALENDAR_TODAY',
      patterns: [
        /\b(show today's appointments|today's appointments|today's events|what is happening today|what events do i have today|what events do i have|events today)\b/i,
        /(आज की मुलाक़ातें|आज का कार्यक्रम|आज क्या है)/i,
      ],
      confidence: 0.93,
    },

    // --- CATEGORY H: NAVIGATION ---
    {
      intent: 'NAVIGATE_HOME',
      patterns: [
        /\b(take me home|go home|home screen|main screen|dashboard)\b/i,
        /(घर ले चलो|होम स्क्रीन|डैशबोर्ड)/i,
        /(घर|डैशबोर्ड|होम|ઘર|હોમ|വീട്|வீடு|ఇల్లు|ಮನೆ|বাড়ি|ଘର|گھر)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'NAVIGATE_ROUTINES',
      patterns: [
        /\b(go to routines|open daily routines|open routines)\b/i,
        /(दिनचर्या खोलो|दैनिक दिनचर्या)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'NAVIGATE_FAMILY',
      patterns: [
        /\b(open family|go to family|open loved ones)\b/i,
        /(परिवार खोलो|प्रियजन खोलो)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'NAVIGATE_GAMES',
      patterns: [
        /\b(open games|go to games|open mind games)\b/i,
        /(खेल खोलो|माइंड गेम्स खोलो)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'NAVIGATE_PROFILE',
      patterns: [
        /\b(open my profile|open profile|go to profile|settings)\b/i,
        /(मेरी प्रोफ़ाइल खोलो|सेटिंग्स)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'OPEN_NOTES',
      patterns: [
        /\b(open notes sanctuary|open notes)\b/i,
        /(नोट्स खोलो)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'OPEN_CALENDAR',
      patterns: [
        /\b(open my calendar|open calendar)\b/i,
        /(कैलेंडर खोलो)/i,
      ],
      confidence: 0.95,
    },
  ];

  /**
   * Matches raw query against rules.
   */
  public static match(query: string): { intent: IntentType; confidence: number } {
    const q = query.trim().toLowerCase();

    for (const rule of this.rules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(q)) {
          return { intent: rule.intent, confidence: rule.confidence };
        }
      }
    }

    return { intent: 'UNKNOWN_FALLBACK', confidence: 0.3 };
  }
}
