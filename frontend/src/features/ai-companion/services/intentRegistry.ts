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
        /^(हो|होय|नक्की|करा|ठीक आहे|सुरू करा)/i,
      ],
      confidence: 0.98,
    },
    {
      intent: 'CONFIRMATION_NO',
      patterns: [
        /^(no|cancel|don't|stop|never mind|discard|do not save)\b(?!.*(?:take me to|open (?:mind )?games|open puzzles?))/i,
        /^(नहीं|रद्द करो|रहने दो|मत करो|कैंसिल)/i,
        /^(नाही|नको|रद्द करा|थांबा)/i,
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

    // --- PRIORITY CAREGIVER ESCALATION ("Call my daughter / caregiver") ---
    {
      intent: 'CAREGIVER_ESCALATION',
      patterns: [
        /\b(call (?:my )?(?:caregiver|daughter|son|doctor|family|priya|arun)|contact (?:my )?(?:caregiver|family)|i need to (?:call|speak to) (?:my )?(?:daughter|son|caregiver|priya)|reach (?:out to )?caregiver|help me.*(?:lost|confused|scared)|i need help.*(?:lost|confused))\b/i,
        /(देखभालकर्ता को फोन|बेटी को फोन|बेटे को फोन|प्रिया को फोन|डॉक्टर को फोन|परिवार को फोन|फोन लगाओ|बात करवाओ|मदद करो.*भटक|मदद चाहिए.*उलझन)/i,
        /(काळजीवाहकाला फोन|मुलीला फोन|मुलाला फोन|प्रियाला फोन|मदत करा.*चुकलो)/i,
      ],
      confidence: 0.98,
    },

    // --- PRIORITY ROUTINES: MEMORY LAPSE ("I forgot what I was doing") ---
    {
      intent: 'ROUTINES_MEMORY_LAPSE',
      patterns: [
        /\b(what was i doing|lost my place|forgot what i was doing|i forgot what i was doing|help me remember what i need to do)\b/i,
        /(मैं क्या कर रहा था|भूल गया क्या कर रहा था|याद दिलाओ क्या करना है)/i,
        /(मी काय करत होतो|मी काय करत होते|मी विसरलो काय करायचं|विसरले काय करायचं)/i,
      ],
      confidence: 0.96,
    },

    // --- REPEATED INQUIRY REASSURANCE (Dementia Memory Support) ---
    {
      intent: 'REPEATED_TIME_QUERY',
      patterns: [
        /\b(what time is it|what is the time|tell me the time|current time|is it morning or afternoon)\b/i,
        /(कितने बजे हैं|समय क्या हुआ|क्या समय है|टाइम क्या है)/i,
        /(किती वाजले|काय वेळ झाली आहे)/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'REPEATED_DATE_QUERY',
      patterns: [
        /\b(what day is today|what is today's date|what date is today|which day is it|what month is it|what year is it)\b/i,
        /(आज कौन सा दिन है|आज क्या तारीख है|आज कौन सी तारीख है|आज का दिन)/i,
        /(आज कोणता दिवस आहे|आज काय तारीख आहे)/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'REPEATED_LOCATION_QUERY',
      patterns: [
        /\b(where am i|where is this place|am i home|is this my house|am i in my room)\b/i,
        /(मैं कहाँ हूँ|यह कौन सी जगह है|क्या मैं घर पर हूँ|क्या यह मेरा घर है)/i,
        /(मी कुठे आहे|हे कोणतं ठिकाण आहे|मी घरी आहे का)/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'REPEATED_FAMILY_QUERY',
      patterns: [
        /\b(who is coming today|where is my daughter|where is priya|when is priya coming|is anyone visiting me)\b/i,
        /(आज कौन आ रहा है|मेरी बेटी कहाँ है|प्रिया कहाँ है|कोई आ रहा है क्या)/i,
        /(आज कोण येणार आहे|माझी मुलगी कुठे आहे|प्रिया कुठे आहे)/i,
      ],
      confidence: 0.95,
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
        /(तुम्ही कसे आहात|कशी आहेस|काय चाललंय)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'GRATITUDE',
      patterns: [
        /\b(thank you|thanks|thank you asha|grateful)\b/i,
        /(धन्यवाद|शुक्रिया|बहुत अच्छा)/i,
        /(खूप धन्यवाद|आभार|मनापासून धन्यवाद)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'ROUTINES_START_NEXT',
      patterns: [
        /\b(start my next activity|help me start my next activity|start next activity|begin next routine|start routine|start activity)\b/i,
        /\b(?:asha,? )?(?:mujhe|humko|hame) (?:water|paani|pani|dawa|medicine|chai|tea) chahiye(?: please)?\b/i,
        /\b(?:water|paani|pani|chai|tea) (?:peena hai|chahiye|de do|la do|please)\b/i,
        /(अगली गतिविधि शुरू करो|काम शुरू करो|दिनचर्या शुरू करो|आरंभ करो)/i,
        /(पानी पीना है|पानी चाहिए|जल चाहिए|चाय चाहिए|दवा खानी है)/i,
        /(पाणी प्यायचे आहे|पाणी द्या|पाणी हवे आहे|मला पाणी हवे)/i,
        /(জল খাব|জল দিন|চা খাব)/i,
        /(தண்ணீர் வேண்டும்|தண்ணீர் குடிக்க வேண்டும்)/i,
        /(నీళ్లు కావాలి|మంచి నీళ్లు తాగాలి)/i,
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

    // --- CATEGORY A.1: CONVERSATIONAL LANGUAGE PREFERENCE SWITCH ---
    {
      intent: 'CONVERSATIONAL_LANGUAGE_SWITCH',
      patterns: [
        /\b(?:(?:asha,? )?(?:speak|talk|converse|reply) in (?:hindi|english|marathi|bengali|tamil|telugu|gujarati|kannada|malayalam|punjabi|urdu)|(?:hindi|english|marathi|bengali|tamil|telugu|gujarati|punjabi|urdu) me (?:bolo|baat karo)|(?:marathi|marathit) madhe bola)\b/i,
        /(हिंदी में बोलो|हिंदी में बात करो|अंग्रेजी में बोलो|मराठीत बोला|मराठी मध्ये बोला|বাংলায় বলুন|தமிழில் பேசு|తెలుగులో మాట్లాడు|ગુજરાતીમાં બોલો)/i,
      ],
      confidence: 0.98,
    },

    // --- CATEGORY B: DAILY ROUTINES & ACTIVITIES ---
    {
      intent: 'ROUTINES_MEDICATION_STATUS',
      patterns: [
        /\b(?:did i take|have i taken) (?:my )?(?:morning |evening )?(?:pills?|medicine|meds?|tablets?|dawa)\b/i,
        /\b(did i take my medicine|have i taken my pills|have i taken my medicine|completed my morning routine|morning medicine|blood pressure pill|medicine status|don't remember my medicine|forgot my medicine)\b/i,
        /\b(?:white (?:round )?(?:morning )?(?:tablet|pill)|small (?:morning )?pill|little box with pills|pill box|round tablet|safed goli|safed wali (?:dawa|dawai)|sakalchi goli|chhoti goli|subah wali (?:goli|dawai)|blood pressure wali (?:goli|dawai)|chhotu tablet|dawa ki patti|memory tablet|dawa ka dabba)\b/i,
        /(सफेद गोली|सफ़ेद गोली|सफेद दवाई|सुबह की गोली|छोटी गोली|दवा की डिब्बी|दवा का पत्ता|सकाळची गोळी|पांढरी गोळी|लहान गोळी|औषधाचा डबा|औषधाची पट्टी)/i,
        /(क्या मैंने दवा ली|दवा ली क्या|गोली खाई|सुबह की दवा|दवा लेना याद नहीं|दवाई याद नहीं|दवा खाई या नहीं|दवा भूल गया|दवा भूल गई)/i,
        /(मी औषध घेतलं का|माझं औषध झालं का|औषध घेतले का|मला औषध.*आठवत नाही|औषध घ्यायचं आठवत नाही|औषध आठवत नाही|औषध विसरलो|औषध विसरले|औषधाची आठवण नाही)/i,
        /(আমার ওষুধ খেতে মনে নেই|ওষুধ খেয়েছি কি|ওষুধ মনে নেই|ওষুধের কথা ভুলে গেছি)/i,
        /(மருந்து சாப்பிட்டேனா என்று நினைவில்லை|மருந்து சாப்பிட நினைவில்லை|மருந்து நினைவில்லை)/i,
        /(నాకు మందులు వేసుకోవడం గుర్తులేదు|మందులు వేసుకున్నానా|మందుల విషయం మరిచిపోయాను)/i,
        /(ನನಗೆ ಮಾತ್ರೆ ತಗೋಬೇಕೋ ನೆನಪಿಲ್ಲ|ಔಷಧಿ ನೆನपಿಲ್ಲ|ಮಾತ್ರೆ ತಗೊಂಡ್ನಾ)/i,
        /(મને દવા લેવાનું યાદ નથી|દવા લીધી કે નહીં|દવા ભૂલી ગયો|દવા ભૂલી ગઈ)/i,
        /\b(medicine yaad nahi|dawa li kya|medicine bhool gaya|aushadh aathvat nahi|dawa khayi kya)\b/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'ROUTINES_NEXT',
      patterns: [
        /\b(what should i do next|what is my next activity|what is my next routine|what is next|what next|next task|next activity|next routine)\b/i,
        /(अगला क्या है|आगे क्या करना|अगली गतिविधि क्या है|अगला क्या)/i,
        /(पुढे काय करायचं|पुढची कृती काय आहे|पुढचा दिनक्रम काय आहे|पुढे काय)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'ROUTINES_TODAY',
      patterns: [
        /\b(what do i have to do today|show me today's activities|today's activities|today's routine|what are my activities today|show my routines)\b/i,
        /\b(?:the (?:morning )?walk thing(?: in the garden)?|garden walk|subah ka walk|sakalcha firaycha|morning walk|evening walk)\b/i,
        /(आज क्या करना है|आज की गतिविधियां|आज की दिनचर्या|आज के काम)/i,
        /(आज काय करायचं आहे|आजचा दिनक्रम काय आहे|आजचे काम)/i,
        /(बगीचे में टहलना|सुबह की सैर|बागेत फिरणे|सकाळची फेरी)/i,
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
        /\b(open pattern match|play pattern match|open card match|play card match|open daily sequence|play sequence|room memory|open room memory|play room memory|observe room|explore room|explore room with camera|camera game|play camera game)\b/i,
        /(पैटर्न मैच खोलो|कार्ड मैच खेलो|अनुक्रम खेल|कमरे की याद|कमरा देखना|कैमरा खेल|कैमरा गेम|कमरा खोजो)/i,
        /(खोलीची आठवण|खोली पाहा|कॅमेरा खेळ)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'GAMES_LIST',
      patterns: [
        /\b(show me my games|show games|open mind games|my games|mind games|play a game|play game|games)\b/i,
        /\b(?:the card game with pictures|card game with pictures|pictures game|memory game|patte wala khel|sochne wala game|ulta seedha khel)\b/i,
        /(मेरे खेल दिखाओ|माइंड गेम्स|दिमागी खेल खोलो|कोई खेल खेलना|खेल खेलना|खेल|तस्वीरों वाला खेल|पत्तों वाला खेल|याददाश्त का खेल|चित्रांचा खेळ|पत्त्यांचा खेळ)/i,
        /(રમત|खेळ|விளையாட்டு|ఆట|খেলা|ଖେଳ|کھیل|ਖੇਡ)/i,
      ],
      confidence: 0.92,
    },

    // --- CATEGORY E: LOVED ONES & PERSONAL MEMORY GRAPH ---
    {
      intent: 'MEMORY_GRAPH_QUERY',
      patterns: [
        /\b(?:do you remember|tell me about|what was|who makes|who prepares|remind me about|can you recall|talk to me about)\b.*\b(?:wedding|marriage|jaipur|cardamom|tea|chai|song|prayer|bhajan|veranda|roses|garden|shimla)\b/i,
        /\b(tell me about (?:the |my )?(?:wedding|marriage|jaipur|shimla|favorite song|prayer|bhajan|tea|chai)|what is my favorite (?:song|prayer|bhajan|activity)|remind me about (?:the |my )?(?:wedding|trip|song|tea))\b/i,
        /(शादी के बारे में बताओ|विवाह की याद|पसंदीदा गाना|पसंदीदा भजन|इलायची चाय|बगीचे में चाय)/i,
        /(लग्नाबद्दल सांगा|माझं आवडतं गाणं|चहाबद्दल सांगा)/i,
      ],
      confidence: 0.95,
    },
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
        /\b(?:the boy who lives in [a-z]+|mera beta jo [a-z]+ me rehta hai|my daughter who lives in [a-z]+|the girl who visited|boy who calls|girl with glasses|ladki ka photo|beti ki tasveer|mulgiche photo|pune wala beta|the person who calls me)\b/i,
        /(मेरी बेटी दिखाओ|मेरा बेटा दिखाओ|कौन है|पुणे वाला बेटा|पुण्यात राहणारा मुलगा|लड़की का फोटो|बेटी की तस्वीर|मुलीचा फोटो|फोन करने वाला लड़का|चश्मे वाली लड़की)/i,
      ],
      confidence: 0.93,
    },
    {
      intent: 'LOVED_ONES_LIST',
      patterns: [
        /\b(show me my family|show me family photos|i want to see family photos|open my family memories|show my family|open family|family photos|family album)\b/i,
        /\b(?:family members|family pictures|photos of my family|relatives photos|people who love me)\b/i,
        /(परिवार दिखाओ|पारिवारिक तस्वीरें|प्रियजन दिखाओ|परिवार की यादें|परिवार|प्रियजन|घर के लोग)/i,
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
      intent: 'NAVIGATE_HOME_GUIDE',
      patterns: [
        /\b(guide me home|how do i get home|how to get home|i am lost|find my way home|show me the way home|open home guide|home navigation|lead me home|help me walk home)\b/i,
        /(घर का रास्ता बताओ|मुझे घर जाना है|मैं रास्ता भूल गया|मैं भटक गया|होम गाइड खोलो|घर की दिशा दिखाओ)/i,
        /(मला घरी जायचं आहे|घराचा मार्ग दाखवा|मी रस्ता चुकलो|घराची दिशा दाखवा|होम गाइड उघडा)/i,
      ],
      confidence: 0.98,
    },
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
        /(दिनक्रम उघडा|माझा दिनक्रम)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'NAVIGATE_FAMILY',
      patterns: [
        /(?:see|show|open|view|visit|look at)\s+(?:me\s+)?(?:my\s+)?(?:family|loved ones|pictures|photos|family photos|family pictures)/i,
        /\b(open (?:my )?family|go to (?:my )?family|open (?:my )?loved ones|my family|family members|see (?:my )?pictures|show (?:my )?pictures|see (?:my )?photos|show (?:my )?photos)\b/i,
        /(परिवार खोलो|प्रियजन खोलो|परिवार दिखाओ|मेरा परिवार|परिवार देखना|परिवार के लोग|तस्वीरें दिखाओ|फोटो दिखाओ)/i,
        /(कुटुंब दाखवा|प्रियजन दाखवा|कुटुंबाचे फोटो|माझे कुटुंब|कुटुंब पाहायचे|कुटुंब पहा|फोटो दाखवा)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'NAVIGATE_GAMES',
      patterns: [
        /\b(open games|go to games|open mind games|open puzzles?|go to puzzles?|take me to (?:my )?puzzles?|take me to (?:my )?games?|play (?:a )?puzzle|play puzzles?|can i play (?:a )?(?:puzzle|game))\b/i,
        /(खेल खोलो|माइंड गेम्स खोलो|पहेली खोलो|पहेलियाँ खोलो)/i,
        /(खेळ उघडा|मेंदूचे खेळ दाखवा|खेळ सुरू करा|कोडी उघडा)/i,
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
    {
      intent: 'OPEN_CAMERA',
      patterns: [
        /\b(open (?:the )?camera|take (?:a )?(?:photo|picture)|start camera|use camera|camera mode|room memory camera)\b/i,
        /(कैमरा खोलो|फोटो खींचो|कैमरा चालू करो|फोटो लो|कैमरा दिखाओ)/i,
        /(कॅमेरा उघडा|फोटो काढा|कॅमेरा सुरू करा|कॅमेरा मोड)/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'OPEN_TODO',
      patterns: [
        /\b(open (?:my )?(?:todo|to-do|tasks|task list|routines)|check (?:my )?tasks|show (?:my )?todo)\b/i,
        /(टू-डू खोलो|मेरे काम दिखाओ|कार्य सूची खोलो|आज के कार्य)/i,
        /(माझी कामे दाखवा|टू-डू उघडा|कामांची यादी)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'WELLBEING_ADAPT_EASIER',
      patterns: [
        /\b(i am (?:very )?tired|feeling exhausted|too tired today|make it easier today|i feel tired|exhausted today|today is hard)\b/i,
        /(बहुत थकान लग रही है|मैं थक गया हूँ|थक गई हूँ|आज थोड़ा आसान करो|आज बहुत थकान है)/i,
        /(मला खूप थकवा आलाय|मला थकवा जाणवतोय|आज थोडं सोपं करा|आज खूप थकलो)/i,
      ],
      confidence: 0.96,
    },

    // --- STAGE 3 PHASE B: ADAPTIVE PERSONALIZED SUPPORT INTENTS ---
    {
      intent: 'INSTRUCTION_REPEAT',
      patterns: [
        /\b(repeat (?:the )?(?:instruction|step|steps|what you said)|say that again|what did you say|repeat please|tell me again|can you repeat)\b/i,
        /(निर्देश दोबारा बताएं|निर्देश फिर से बोलो|दोबारा कहो|फिर से बताओ|क्या कहा|दोबारा सुनाओ|निर्देश फिर से)/i,
        /(सूचना परत सांगा|पुन्हा सांगा|काय म्हणालात|माहिती परत द्या|पुन्हा एकदा सांगा)/i,
        /\b(fir se bolo|kya kaha|repeat karo|punha sanga|step repeat)\b/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'ASSISTANCE_HINT',
      patterns: [
        /\b(give me a hint|need a (?:hint|clue)|help me with a hint|can you give (?:a )?hint|hint please|show hint)\b/i,
        /(?:(?:मुझे|हमे)?\s*(?:एक)?\s*(?:संकेत|इशारा|हिंट)\s*(?:दो|बताओ|दीजिए|देना)|कोई क्लू दो|हिंट चाहिए|संकेत चाहिए|संकेत दो)/i,
        /(?:(?:मला)?\s*(?:एक)?\s*(?:संकेत|हिंट|इशारा)\s*(?:द्या|सांगा)|काहीतरी इशारा द्या|क्लू सांगा|मदत करा क्लू द्या|संकेत द्या)/i,
        /\b(hint do|hint chahiye|ek clue do|hint dya|clue dya|sanket do)\b/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'ADAPTATION_MAKE_EASIER',
      patterns: [
        /\b(make (?:this|it) (?:easier|simpler)|too (?:difficult|hard|tricky)|can we make this (?:easier|simpler)|reduce difficulty|make it gentle|this is (?:too )?(?:hard|difficult)|i want (?:an )?easier level)\b/i,
        /(इसे (?:थोड़ा )?(?:आसान|सरल) (?:बनाओ|करो|कीजिए)|यह बहुत कठिन है|आसान स्तर करो|कठिन लग रहा है|सरल करो)/i,
        /(हे (?:थोडे )?(?:सोपे|सहज) करा|हे खूप कठीण आहे|सोपी पातळी करा|थोडं सोपं करा|कठीण वाटते)/i,
        /\b(thoda aasan karo|aasan banao|sope kara|kathin hai|too hard)\b/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'ADAPTATION_KEEP_LEVEL',
      patterns: [
        /\b(keep the same level|keep it familiar|do not change level|i like this level|stay on this level|keep current level|do not increase difficulty)\b/i,
        /(यही स्तर रखो|स्तर मत बदलो|पुराना स्तर ही ठीक है|यही रहने दो|बदलाव मत करो|मुझे यही पसंद है)/i,
        /(हीच पातळी ठेवा|पातळी बदलू नका|हेच ठीक आहे|बदल नको|मला हीच पातळी आवडते)/i,
        /\b(yahi level rakho|level change mat karo|hich patali theva|change nako)\b/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'ADAPTATION_TRY_HARDER',
      patterns: [
        /\b(i want to try something harder|make it more challenging|next level please|can i try the next level|give me more challenge|try harder level|feel energetic|feeling energetic|energetic today|full of energy)\b/i,
        /(अगला स्तर (?:आजमाना|खेलना) है|थोड़ा कठिन करो|चैलेंज चाहिए|अगला लेवल खोलो|अधिक चुनौती चाहिए|ऊर्जा महसूस हो रही|उत्साहित हूँ)/i,
        /(पुढची पातळी (?:दाखवा|द्या|खेळायची आहे)|काहीतरी नवीन किंवा कठीण द्या|पुढचा लेव्हल खेळायचा|उत्साही वाटतंय)/i,
        /\b(agla level|next level try|pudhchi patali|thoda challenge)\b/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'WELLBEING_REST_BREAK',
      patterns: [
        /\b(take a (?:break|rest)|i need to rest|let me rest for two minutes|pause please|need a short rest|pause the timer|time for a break|don't want to go out|dont want to go out|stay home today|don't feel like walking|dont feel like walking|don't want to walk|dont want to walk|not walking today|do not want to (?:do (?:the )?)?walk(?:ing)?(?: task)?|don't want to (?:do (?:the )?)?walk(?:ing)?(?: task)?)\b/i,
        /(थोड़ा विश्राम (?:चाहिए|करना है)|दो मिनट का ब्रेक|आराम करना है|रुक जाओ|पॉज करो|विश्राम लो|मुझे आज बाहर नहीं जाना|आज बाहर नहीं जाना|बाहर नहीं जाना है|घर पर ही रहना है|घर में रहना है|कहीं नहीं जाना|बाहर नहीं निकलना)/i,
        /(थोडा वेळ विश्रांती घेऊया|मला विश्रांती हवी आहे|दोन मिनिटे थांबा|विश्रांती घ्यायची आहे|थांबवा|मला आज बाहेर जायचे नाही|बाहेर जायचं नाही|घरीच राहायचं आहे|कुठेही जायचे नाही)/i,
        /\b(break chahiye|aaram karna hai|pause karo|vishranti dya|take break|aaj bahar nahi jana|ghar par hi rehna)\b/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'ADAPTATION_RESTORE_PREVIOUS',
      patterns: [
        /\b(restore (?:the )?previous (?:version|level|config)|bring back the old level|revert (?:the )?change|go back to how it was|undo change|reset to familiar)\b/i,
        /(पहले जैसा कर दो|पिछला स्तर वापस लाओ|पुराना वाला ठीक था|बदलाव वापस लो|पूर्ववत करो|पुराना स्तर खोलो)/i,
        /(आधीसारखे करा|मागील पातळी परत आणा|बदल मागे घ्या|आधीचेच चांगले होते|मागील आवृत्ती पूर्ववत करा)/i,
        /\b(pehle jaisa karo|undo change|adhisarkhe kara|wapas pehle jaisa)\b/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'ADAPTATION_DECLINE_CHANGE',
      patterns: [
        /\b(do not change this activity|decline (?:the )?change|no changes needed|keep my routine as is|do not modify my routine|no change please)\b/i,
        /(कोई बदलाव नहीं चाहिए|बदलाव अस्वीकार करें|मेरी दिनचर्या वैसी ही रहने दो|कोई परिवर्तन मत करो|बदलाव मत करो)/i,
        /(कोणताही बदल नको|बदल नाकारा|माझा दिनक्रम तसाच राहू द्या|बदल करू नका)/i,
        /\b(badlav mat karo|badal nako|no change needed|decline proposal)\b/i,
      ],
      confidence: 0.96,
    },
    {
      intent: 'QUERY_ACTIVITY_CHANGE_RATIONALE',
      patterns: [
        /\b(why is this different today|why did this change|why are cards fewer|why is the step smaller|why is this easier today|why did you change it)\b/i,
        /(आज यह अलग क्यों है|यह क्यों बदला|कार्ड कम क्यों हैं|आज यह आसान क्यों लग रहा है|कदम छोटे क्यों हैं|यह बदलाव क्यों हुआ)/i,
        /(आज हे वेगळे का आहे|हे का बदलले|पायऱ्या लहान का केल्या|कार्ड्स कमी का आहेत|आज सोपे का वाटते)/i,
        /\b(alag kyu hai|badla kyu|vegale ka aahe|why different today)\b/i,
      ],
      confidence: 0.96,
    },
  ];

  /**
   * Matches raw query against rules with dementia speech preprocessing:
   * 1. Self-correction resolution ("show games, no wait, family photos" -> tail segment).
   * 2. Hesitation and pause tolerance (removes "umm", "uhh", "arre", "woh").
   * 3. Circumlocution detection (identifies functional descriptions of pills, family, walks).
   * 4. Conversational language preference switching.
   */
  public static match(query: string): {
    intent: IntentType;
    confidence: number;
    selfCorrectionApplied?: boolean;
    hesitationFiltered?: boolean;
    circumlocutionResolved?: boolean;
    targetLanguageSwitch?: string;
    normalizedQuery?: string;
  } {
    let raw = query.trim();
    if (!raw) return { intent: 'UNKNOWN_FALLBACK', confidence: 0.1 };

    let selfCorrectionApplied = false;
    let hesitationFiltered = false;
    let circumlocutionResolved = false;

    // 1. Self-Correction Handler (Dementia Memory Support)
    const correctionRegex = /\b(?:no wait|actually|wait no|not that|nahi wait|nahi nahi|ruk jao|thaamba|instead)[,.]?\s+(.*)$/i;
    const corrMatch = raw.match(correctionRegex);
    if (corrMatch && corrMatch[1] && corrMatch[1].trim().length > 2) {
      raw = corrMatch[1].trim();
      selfCorrectionApplied = true;
    }

    // 2. Tolerance for fillers, pauses, and hesitations
    const fillerRegex = /\b(?:umm+|uhh+|arre|woh|matlab|actually|you know)[.,…]*/gi;
    if (fillerRegex.test(raw)) {
      raw = raw.replace(fillerRegex, ' ').replace(/[.,…]+/g, ' ').replace(/\s+/g, ' ').trim();
      hesitationFiltered = true;
    }

    const q = raw.toLowerCase();

    // 3. Circumlocution detection flag
    if (
      /(?:white (?:round )?(?:morning )?(?:tablet|pill)|small (?:morning )?pill|little box with pills|pill box|round tablet|safed goli|safed wali|sakalchi goli|chhoti goli|the boy who lives in|mera beta jo|ladki ka photo|beti ki tasveer|the card game with pictures|patte wala khel|the (?:morning )?walk thing|garden walk|subah ka walk)/i.test(q)
    ) {
      circumlocutionResolved = true;
    }

    // 4. Conversational language switch target resolution
    let targetLanguageSwitch: string | undefined;
    if (/\bhindi\b|हिंदी/i.test(q)) targetLanguageSwitch = 'hi';
    else if (/\benglish\b|अंग्रेजी|इंग्लिश|इंग्रजी/i.test(q)) targetLanguageSwitch = 'en';
    else if (/\bmarathi\b|मराठी/i.test(q)) targetLanguageSwitch = 'mr';
    else if (/\bbengali\b|বাংলা/i.test(q)) targetLanguageSwitch = 'bn';
    else if (/\btamil\b|தமிழ்/i.test(q)) targetLanguageSwitch = 'ta';
    else if (/\btelugu\b|తెలుగు/i.test(q)) targetLanguageSwitch = 'te';
    else if (/\bgujarati\b|ગુજરાતી/i.test(q)) targetLanguageSwitch = 'gu';
    else if (/\bpunjabi\b|ਪੰਜਾਬੀ/i.test(q)) targetLanguageSwitch = 'pa';
    else if (/\burdu\b|اردو/i.test(q)) targetLanguageSwitch = 'ur';

    for (const rule of this.rules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(q)) {
          return {
            intent: rule.intent,
            confidence: rule.confidence,
            selfCorrectionApplied,
            hesitationFiltered,
            circumlocutionResolved,
            targetLanguageSwitch: rule.intent === 'CONVERSATIONAL_LANGUAGE_SWITCH' ? targetLanguageSwitch : undefined,
            normalizedQuery: q,
          };
        }
      }
    }

    return {
      intent: 'UNKNOWN_FALLBACK',
      confidence: 0.3,
      selfCorrectionApplied,
      hesitationFiltered,
      circumlocutionResolved,
      normalizedQuery: q,
    };
  }
}
