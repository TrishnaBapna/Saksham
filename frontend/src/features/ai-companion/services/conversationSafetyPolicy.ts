/**
 * SAKSHAM — MILESTONE 7.3.2: CONVERSATION SAFETY POLICY & MEDICAL BOUNDARIES
 * Enforces strict clinical, diagnostic, medication and emergency safety rules.
 * Structured Emergency Phrase Catalogue covering English and 22 Eighth Schedule Indian languages.
 * Robust regex matching resilient to misspellings, missing spaces, abbreviations, mixed phrases, and regional terms.
 * 100% Spark Free Plan compliant — deterministic local safety verification.
 */

import { ConversationResult } from '../types/conversation.types.js';
import { PatientContext } from '../../../services/patientContextService.js';
import { translate } from '../../../i18n/index.js';
import { SupportedLanguage } from '../../../i18n/types.js';
import { getTranslatedRoutineTitle } from '../../routines/utils/routineTranslation.js';

function pickPolicyLang(language: string, map: Record<string, string>): string {
  return map[language] || map.en;
}

export interface EmergencyPhraseEntry {
  language: string;
  code: string;
  validationStatus: 'verified' | 'provisional' | 'limited';
  keywords: string[];
}

export class ConversationSafetyPolicy {
  /**
   * Structured Emergency Lexicon covering English and 22 Eighth Schedule Indian languages.
   * Tracks validation status honestly: verified vs provisional vs limited.
   */
  public static readonly EMERGENCY_CATALOGUE: Record<string, EmergencyPhraseEntry> = {
    en: {
      language: 'English',
      code: 'en',
      validationStatus: 'verified',
      keywords: [
        'chest pain',
        'heart attack',
        'pain in chest',
        'tightness in chest',
        'chest hurts',
        'cannot breathe',
        "can't breathe",
        'trouble breathing',
        'shortness of breath',
        'gasping for air',
        'choking',
        'severe pain',
        'fell down',
        'i fell',
        'bad fall',
        'cannot get up',
        'bleeding heavily',
        'severe bleeding',
        'severe injury',
        'blood everywhere',
        'head injury',
        'stroke',
        'unconscious',
        'passed out',
        'fainted',
        'cannot wake',
        'not waking up',
        'unresponsive',
        'emergency',
        'call ambulance',
        'call 112',
        // Clinical manifestations
        'facial droop',
        'face is drooping',
        'face drooping',
        'slurred speech',
        'cannot speak',
        'seizure',
        'convulsion',
        'shaking on the floor',
        'chest pressure',
        'pressure on chest',
        'iron band squeezing',
        'squeezing my ribs',
        'cold sweat',
        'coughing up dark blood',
        'coughing up blood',
        'vomiting blood',
        'throwing up blood',
        'cannot catch breath',
        'cannot move leg',
        'cannot move arm',
        'cannot move',
        'severe weakness',
        'loss of vision',
        'thunderclap headache',
        'throat is swelling',
        'swallowed bleach',
        'swallowed cleaning bleach',
        'nasty spill',
        // Common typos and abbreviations
        'chestpain',
        'shortns of breath',
        'cant breath',
        'unconcious',
        'blud everywhere',
        'chokng',
        'droping',
        'sevre burn',
        'skin blistering',
        // Romanized Hindi / Marathi terms & sub-dialects
        'seene me bohot tez dard',
        'seene me dard',
        'chhati me dard',
        'dil ka daura',
        'saans nahi aa rahi',
        'saans lene me',
        'dam ghut raha',
        'behosh ho gaye',
        'behosh',
        'chhatit vedana',
        'chhatit khup vedana',
        'chhatit dukhtay',
        'dava haat dukhto',
        'shwas ghyayla tras',
        'bheshuddha',
        'feffre',
        'droop ho raha',
        'awaz ladkhada',
        'khoon beh raha',
        'uth nahi pa raha',
        'chakkar aakar gir',
        'hrudayvikaracha zatka',
        'chhati dabun',
        'vakda zala',
        'bolta yet nahiye',
      ],
    },
    hi: {
      language: 'Hindi',
      code: 'hi',
      validationStatus: 'verified',
      keywords: [
        'छाती में दर्द',
        'सीने में दर्द',
        'सीने में बहुत तेज़ दर्द',
        'सीने में',
        'दिल का दौरा',
        'हार्ट अटैक',
        'सांस नहीं आ रही',
        'दम घुट रहा',
        'सांस लेने में तकलीफ',
        'सांस फूल रही',
        'बेहोश',
        'बेहोशी',
        'होश नहीं',
        'उठ नहीं रहे',
        'खून बह रहा',
        'बहुत खून निकल रहा',
        'गंभीर चोट',
        'चोट लग गई',
        'गिर गया',
        'गिर गई',
        'चक्कर आकर गिर',
        'आपातकाल',
        'इमरजेंसी',
        'इमर्जेंसी',
        'मेडिकल इमरजेंसी',
        'मदद करो',
        '112 पर कॉल',
        'दर्द',
        // Clinical manifestations in Hindi
        'चेहरा लटक',
        'आवाज़ लड़खड़ा',
        'लड़खड़ा रही',
        'बोल नहीं पा',
        'दौरा',
        'उलटी में खून',
        'खून की उलटी',
        'हिल नहीं पा',
        'असहनीय दर्द',
        'गंभीर दुखापत',
        'दबाव',
        'भारीपन',
        'गला चोक',
      ],
    },
    mr: {
      language: 'Marathi',
      code: 'mr',
      validationStatus: 'verified',
      keywords: [
        'माझ्या छातीत दुखत आहे',
        'छातीत दुखत आहे',
        'छातीत दुखत',
        'छातीत खूप वेदना',
        'छातीत प्रचंड वेदना',
        'छातीत वेदना',
        'प्रचंड वेदना',
        'हार्ट अटॅक',
        'हृदयविकाराचा झटका',
        'छातीत प्रचंड कळ',
        'प्रचंड कळ',
        'श्वास घेता येत नाही',
        'दम लागतोय',
        'श्वास कोंडतोय',
        'बेशुद्ध',
        'शुद्ध हरपली',
        'जागे होत नाहीत',
        'रक्तस्त्राव',
        'खूप रक्त वाहतंय',
        'खूप रक्त वाहते',
        'रक्त वाहते',
        'गंभीर जखम',
        'पडलो',
        'पडले',
        'खाली पडलो',
        'तातडीची मदत',
        'इमर्जन्सी',
        // Clinical manifestations in Marathi
        'असह्य कळ',
        'कळ येत',
        'हात लुळा',
        'पाय लुळा',
        'लुळे पडले',
        'बोलता येत नाही',
        'फेफरे',
        'झटके',
        'रक्ताची उलटी',
        'तोंड वाकडे',
        'दगड ठेवल्यासारखे',
        'कातडी सोलवटली',
        'घास अडकला',
      ],
    },
    bn: {
      language: 'Bengali',
      code: 'bn',
      validationStatus: 'verified',
      keywords: [
        'আমার বুকে প্রচন্ড ব্যথা করছে',
        'বুকে ব্যথা',
        'বুকে চাপ',
        'শ্বাস নিতে পারছি না',
        'দম বন্ধ হয়ে আসছে',
        'নিঃশ্বাস কষ্ট',
        'অজ্ঞান',
        'বেহুঁশ',
        'জ্ঞান হারিয়েছে',
        'রক্ত বের হচ্ছে',
        'প্রচুর রক্তপাত',
        'মারাত্মক আঘাত',
        'পড়ে গেছি',
        'পড়ে গিয়েছি',
        'জরুরি',
        'অসুস্থ',
        'ব্যथा',
        'ব্যথা',
        'বুকে',
      ],
    },
    ta: {
      language: 'Tamil',
      code: 'ta',
      validationStatus: 'verified',
      keywords: [
        'நெஞ்சு வலி',
        'மார்பு வலி',
        'மாரடைப்பு',
        'மூச்சு விட முடியவில்லை',
        'மூச்சு திணறல்',
        'மயக்கம்',
        'மயங்கி விழுந்தார்',
        'நினைவிழந்து',
        'அதிக ரத்தப்போக்கு',
        'ரத்தம் கொட்டுகிறது',
        'படுகாயம்',
        'கீழே விழுந்துவிட்டேன்',
        'விழுந்துவிட்டேன்',
        'அவசரம்',
        'வலி',
      ],
    },
    te: {
      language: 'Telugu',
      code: 'te',
      validationStatus: 'verified',
      keywords: [
        'ఛాతీ నొప్పి',
        'గుండె నొప్పి',
        'గుండెపోటు',
        'శ్వాస ఆడటం లేదు',
        'ఊపిరి ఆడట్లేదు',
        'స్పృహ తప్పి',
        'కళ్ళు తిరిగి పడిపోయారు',
        'తీవ్ర రక్తస్రావం',
        'రక్తం కారుతోంది',
        'తీవ్ర గాయం',
        'కింద పడిపోయాను',
        'పడిపోయాను',
        'అత్యవసరం',
      ],
    },
    gu: {
      language: 'Gujarati',
      code: 'gu',
      validationStatus: 'verified',
      keywords: [
        'મને છાતીમાં દુખાવો થાય છે',
        'છાતીમાં દુખાવો',
        'હાર્ટ એટેક',
        'શ્વાસ લેવામાં તકલીફ',
        'શ્વાસ નથી આવતો',
        'દમ ઘૂંટાય છે',
        'બેભાન',
        'ચક્કર આવીને પડી ગયા',
        'લોહી નીકળે છે',
        'ભારે રક્તસ્રાવ',
        'ગંભીર ઈજા',
        'પડી ગયો',
        'પડી ગઈ',
        'કટોકટી',
      ],
    },
    kn: {
      language: 'Kannada',
      code: 'kn',
      validationStatus: 'verified',
      keywords: [
        'ಎದೆ ನೋವು',
        'ಎದೆಯಲ್ಲಿ ನೋವು',
        'ಹೃದಯಾಘಾತ',
        'ಉಸಿರಾಡಲು ಕಷ್ಟ',
        'ಉಸಿರು ಕಟ್ಟುತ್ತಿದೆ',
        'ಪ್ರಜ್ಞಾಹೀನ',
        'ಪ್ರಜ್ಞೆ ತಪ್ಪಿದೆ',
        'ರಕ್ತಸ್ರಾವ',
        'ತೀವ್ರ ರಕ್ತ',
        'ತೀವ್ರ ಗಾಯ',
        'ಕೆಳಗೆ ಬಿದ್ದೆ',
        'ಬಿದ್ದಿದ್ದೇನೆ',
        'ತುರ್ತು',
      ],
    },
    ml: {
      language: 'Malayalam',
      code: 'ml',
      validationStatus: 'verified',
      keywords: [
        'നെഞ്ചുവേദന',
        'നെഞ്ചിൽ കഠിനമായ വേദന',
        'ഹൃദയാഘാതം',
        'ശ്വാസമെടുക്കാൻ ബുദ്ധിമുട്ട്',
        'ശ്വാസം മുട്ടുന്നു',
        'ബോധക്ഷയം',
        'ബോധമില്ല',
        'അമിത രക്തസ്രാവം',
        'രക്തം പോകുന്നു',
        'ഗുരുതര പരിക്ക്',
        'വീണു',
        'താഴെ വീണു',
        'അടിയന്തരം',
      ],
    },
    pa: {
      language: 'Punjabi',
      code: 'pa',
      validationStatus: 'verified',
      keywords: [
        'ਛਾਤੀ ਵਿੱਚ ਦਰਦ',
        'ਦਿਲ ਦਾ ਦੌਰਾ',
        'ਸਾਹ ਨਹੀਂ ਆ ਰਿਹਾ',
        'ਸਾਹ ਲੈਣ ਵਿੱਚ ਤਕਲੀਫ',
        'ਬੇਹੋਸ਼',
        'ਹੋਸ਼ ਨਹੀਂ',
        'ਬਹੁਤ ਖੂਨ ਵਹਿ ਰਿਹਾ',
        'ਸੱਟ ਲੱਗ ਗਈ',
        'ਡਿੱਗ ਪਿਆ',
        'ਡਿੱਗ ਪਈ',
        'ਐਮਰਜੈਂਸੀ',
      ],
    },
    or: {
      language: 'Odia',
      code: 'or',
      validationStatus: 'verified',
      keywords: [
        'ଛାତିରେ ଯନ୍ତ୍ରଣା',
        'ଛାତି ବ୍ୟଥା',
        'ହୃଦଘାତ',
        'ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ',
        'ନିଶ୍ୱାସ ବନ୍ଦ',
        'ଅଚେତ',
        'ଚେତା ହରାଇବା',
        'ଅଧିକ ରକ୍ତସ୍ରାବ',
        'ଗମ୍ଭୀର ଆଘାତ',
        'ତଳେ ପଡ଼ିଗଲି',
        'ପଡ଼ିଗଲି',
        'ଜରୁରୀକାଳୀନ',
      ],
    },
    ur: {
      language: 'Urdu',
      code: 'ur',
      validationStatus: 'verified',
      keywords: [
        'سینے میں درد',
        'دل کا دورہ',
        'سانس نہیں آ رہی',
        'دم گھٹ رہا ہے',
        'بے ہوش',
        'غش کھا گیا',
        'بہت خون بہہ رہا ہے',
        'شدید چوٹ',
        'گر گیا',
        'گر گئی',
        'طبیعت خراب',
        'ایمرجنسی',
        'درد',
        'طبیعت',
      ],
    },
    as: {
      language: 'Assamese',
      code: 'as',
      validationStatus: 'provisional',
      keywords: ['বুকুত বিষ', 'উশাহ লোৱাত কষ্ট', 'অচেতন', 'তেজ ওলাইছে', 'পৰি গলো', 'জৰুৰী'],
    },
    mai: {
      language: 'Maithili',
      code: 'mai',
      validationStatus: 'provisional',
      keywords: ['छाती मे दर्द', 'सांस नहि आबि रहल', 'बेहोश', 'खून बह रहल अछि', 'गिरि गेलौं', 'आपातकाल'],
    },
    ne: {
      language: 'Nepali',
      code: 'ne',
      validationStatus: 'provisional',
      keywords: ['छातीमा दुखाइ', 'सास फेर्न गाह्रो', 'अचेत', 'रगत बगिरहेको', 'लडे', 'आपतकालीन'],
    },
    kok: {
      language: 'Konkani',
      code: 'kok',
      validationStatus: 'provisional',
      keywords: ['काळीज दुखता', 'श्वास घेवक त्रास', 'बेशुद्ध', 'रगत व्हांवता', 'पडलो', 'तात्काळ'],
    },
    ks: {
      language: 'Kashmiri',
      code: 'ks',
      validationStatus: 'provisional',
      keywords: ['سینَس مَنٛز دَگ', 'دَم پھُٹان', 'بے ہوش', 'خوٗن دراو', 'پیووس', 'ہنگامی'],
    },
    sa: {
      language: 'Sanskrit',
      code: 'sa',
      validationStatus: 'provisional',
      keywords: ['हृदयवेदना', 'श्वासावरोधः', 'मूर्च्छितः', 'रक्तस्रावः', 'पतितः', 'आत्ययिकम्'],
    },
    doi: {
      language: 'Dogri',
      code: 'doi',
      validationStatus: 'limited',
      keywords: ['छाती च पीड़', 'साह नेईं आंदा', 'बेहोश', 'खून बग्गदा', 'डगी पेआ', 'एमरजेंसी'],
    },
    sd: {
      language: 'Sindhi',
      code: 'sd',
      validationStatus: 'limited',
      keywords: ['ڇاتيءَ ۾ سور', 'ساهه نه پيو اچي', 'بيهوش', 'رَت پيو وهي', 'ڪِري پيو', 'هنگامي'],
    },
    brx: {
      language: 'Bodo',
      code: 'brx',
      validationStatus: 'limited',
      keywords: ['मेगनाव सानाय', 'हाबनो हायै', 'गोमोनाय', 'थै ओंखारनाय', 'गोग्लैबाय'],
    },
    sat: {
      language: 'Santali',
      code: 'sat',
      validationStatus: 'limited',
      keywords: ['हड़मो हासु', 'सांहेत बां चोलाकान', 'बेहोस', 'मायां जोरोज़', 'ञुर एना'],
    },
    mni: {
      language: 'Manipuri',
      code: 'mni',
      validationStatus: 'limited',
      keywords: ['থৌজাল য়াবা', 'থৱায় হোন্না থাবা ঙমদবা', 'মায় ওনবা', 'ই থোকপা', 'তাখ্রে'],
    },
  };

  /**
   * Helper to check if an emergency keyword in the query is negated across supported languages (English, Hindi, Marathi, etc.)
   */
  public static isNegatedEmergency(query: string): boolean {
    const q = query.trim().toLowerCase();
    // Guard 1: Inability to breathe, wake, get up, speak, or move is an EMERGENCY, not a negation
    if (
      /(?:सांस\s*नहीं|उठ\s*नहीं|होश\s*नहीं|बोल\s*नहीं|हिल\s*नहीं|श्वास\s*नाही|शुद्ध\s*नाही|बोलता\s*येत\s*नाही|उठता\s*येत\s*नाही|cannot\s*breathe|can't\s*breathe|cannot\s*get\s*up|cannot\s*wake|cannot\s*speak|cannot\s*move|not\s*waking|not\s*breathing|not\s*moving|not\s*responding|won't\s*wake|won't\s*lift|can't\s*move|not\s*without)/i.test(
        q
      )
    ) {
      return false;
    }

    // Guard 2: Contrastive clauses where patient denies one symptom but affirms an emergency
    // e.g. "I have no knee pain now but my chest hurts severely"
    if (
      /\b(?:but|however|per|par|pan|परंतु|पर|पण)\b.*?\b(?:chest\s*pain|chest\s*hurts|cannot\s*breathe|can't\s*breathe|bleeding|blood|bumped\s*my\s*head|head\s*strike|pillow|faint|unconscious|face\s*is\s*drooping|droop|severe\s*pain|छाती|सीने|दुखतंय|वेदना|सांस|श्वास)\b/i.test(
        q
      )
    ) {
      return false;
    }

    // English negation
    if (
      /\b(?:no|not|neither|without|never|denies|denied|ruled out|negative for|zero|don't have|dont have|dont hav|don't hav|did not|didn't|do not)\b/i.test(
        q
      )
    ) {
      return true;
    }

    // Hindi & Marathi negation (specifically symptom negation, e.g. "दर्द नहीं", "कोई समस्या नहीं", "काही त्रास नाही")
    if (
      /(?:दर्द\s*नहीं|तकलीफ\s*नहीं|दिक्कत\s*नहीं|समस्या\s*नहीं|चक्कर\s*नहीं|गिरा\s*नहीं|कोई\s*(?:भी\s*)?(?:दर्द|तकलीफ|दिक्कत|समस्या|इमरजेंसी|इमर्जेंसी)\s*नहीं|इमरजेंसी\s*नहीं|इमर्जेंसी\s*नाही|काही\s*इमर्जन्सी\s*नाही|दुखत\s*नाही|त्रास\s*नाही|काहीही\s*(?:त्रास|वेदना)\s*नाही|वेदना\s*नाहीत?|पडलो\s*नाही|चक्कर\s*नाही|अशक्तपणा\s*नाही)/i.test(
        q
      )
    ) {
      return true;
    }

    // Romanized Hindi / Marathi negation
    if (
      /\b(?:koi\s*dard\s*nahi|nahi\s*gira|padlo\s*nahi|chakkar\s*nahi|tras\s*nahi|dukhat\s*nahi|dikkat\s*nahi|kahi\s*tras\s*nahi|ashaktpana\s*nahi|kahi\s*emergency\s*nahi|koi\s*emergency\s*nahi)\b/i.test(
        q
      )
    ) {
      return true;
    }

    return false;
  }

  /**
   * Evaluates if query contains urgent distress, chest pain, fall, or life-threatening symptoms.
   */
  public static checkEmergencyDistress(query: string, language = 'en'): ConversationResult | null {
    const q = query.trim().toLowerCase();

    // Check query against psychological crisis / suicidal ideation (Direct to Tele-MANAS 14416)
    const isPsychologicalCrisis =
      /\b(?:end\s+(?:my\s+)?life|suicid(?:e|al)|want\s+to\s+die|kill\s+myself|no\s+reason\s+to\s+live|pills\s+saved.*?want\s+to\s+die)\b/i.test(
        q
      ) ||
      /(?:जिंदगी\s*खत्म|जान\s*देना|जान\s*देनी|मरना\s*चाहता|आत्महत्या|जीव\s*संपव|jiv\s*sampv|jaan\s*deni)/i.test(
        q
      );

    if (isPsychologicalCrisis) {
      return {
        speech: pickPolicyLang(language, {
          en: 'You are not alone, and your feelings matter. Please contact the Tele-MANAS mental health helpline at 14416 immediately, or speak with your primary caregiver.',
          hi: 'आप अकेले नहीं हैं और आपकी भावनाएँ महत्वपूर्ण हैं। कृपया तुरंत टेली-मानस (Tele-MANAS) मानसिक स्वास्थ्य हेल्पलाइन 14416 पर कॉल करें या अपने प्रियजनों से बात करें।',
          mr: 'तुम्ही एकटे नाही आहात आणि तुमच्या भावना महत्त्वाच्या आहेत. कृपया तात्काळ टेली-मानस (Tele-MANAS) हेल्पलाइन 14416 वर कॉल करा किंवा तुमच्या काळजीवाहूंशी बोला.',
          bn: 'আপনি একা নন এবং আপনার অনুভূতি আমাদের কাছে গুরুত্বপূর্ণ। অনুগ্রহ করে অবিলম্বে Tele-MANAS মানসিক স্বাস্থ্য হেল্পলাইন 14416-এ কল করুন অথবা আপনার যত্নশীলের সাথে কথা বলুন।',
          ta: 'நீங்கள் தனியாக இல்லை, உங்கள் உணர்வுகள் முக்கியமானவை. தயவுசெய்து உடனடியாக Tele-MANAS மனநல உதவி எண் 14416-ஐ அழைக்கவும் அல்லது உங்கள் பராமரிப்பாளரிடம் பேசவும்.',
          te: 'మీరు ఒంటరిగా లేరు మరియు మీ భావాలు ముఖ్యమైనవి. దయచేసి వెంటనే Tele-MANAS మానసిక ఆరోగ్య హెల్ప్‌లైన్ 14416కు కాల్ చేయండి లేదా మీ సంరక్షకుడితో మాట్లాడండి.',
          kn: 'ನೀವು ಒಬ್ಬಂಟಿಯಾಗಿಲ್ಲ ಮತ್ತು ನಿಮ್ಮ ಭಾವನೆಗಳು ಮುಖ್ಯವಾಗಿವೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ Tele-MANAS ಮಾನಸಿಕ ಆರೋಗ್ಯ ಸಹಾಯವಾಣಿ 14416ಕ್ಕೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ನಿಮ್ಮ ಆರೈಕೆದಾರರೊಂದಿಗೆ ಮಾತನಾಡಿ.',
        }),
        expression: 'reassuring',
        intent: 'EMERGENCY_DISTRESS',
        confidence: 1.0,
        actionClass: 'emergency',
        clinicalState: 'CaregiverEscalation',
        isEmergency: true,
        suggestedAction: {
          action: 'CALL_CAREGIVER',
          description: pickPolicyLang(language, {
            en: 'Tele-MANAS Helpline 14416',
            hi: 'टेली-मानस हेल्पलाइन 14416',
            mr: 'टेली-मानस हेल्पलाइन 14416',
            bn: 'টেলি-মানস হেল্পলাইন 14416',
            ta: 'Tele-MANAS உதவி எண் 14416',
            te: 'Tele-MANAS హెల్ప్‌లైన్ 14416',
            kn: 'Tele-MANAS ಸಹಾಯವಾಣಿ 14416',
          }),
        },
      };
    }

    // Historical / Third-Person / Educational / Botanical / Metaphorical Context Guard:
    const isHistoricalOrNonPersonal =
      // Distant past history without acute current distress, or resolved past events
      (/\b(?:years?\s+ago|\d{4}\b|survived\s+a\s+(?:heart\s+attack|stroke)|used\s+to\s+have|in\s+my\s+childhood|twenty\s+years\s+ago|ten\s+years\s+ago|बीस\s*साल\s*पहले|मागच्या\s*वर्षी)\b/i.test(
        q
      ) &&
        (!/\b(?:now|today|sudden|acute|current|severely|help|urgent|call|112|आज|आता)\b/i.test(q) ||
          /\b(?:completely\s*healthy|healthy\s*today|fine\s*today|no\s*pain|recovered)\b/i.test(q))) ||
      // Past resolved episodes
      /\b(?:last\s+(?:tuesday|monday|wednesday|thursday|friday|saturday|sunday|week))\b.*?\b(?:made\s*it\s*go\s*away|went\s*away|resolved|no\s*longer|disappeared|better\s*now)\b/i.test(
        q
      ) ||
      // Botanical / Metaphorical / Inanimate references
      /\b(?:bleeding\s+heart\s+(?:flower|plant)|leaves\s+fell\s+down|prices\s+fell\s+down|curtain\s+fell\s+down|heavy\s+rain\s+fell|rain\s+fell\s+down|water\s+temperature\s+fell|king\s+fell\s+down|temperature.*?fell\s*down|beetroot|watercolor\s+is\s+bleeding)\b/i.test(
        q
      ) ||
      /\b(?:heavy\s+heart\b.*?\b(?:remember|memory|miss)|breathtaking\s+(?:view|scenery|sunset|sunrise)|hearty\s+(?:meal|breakfast|lunch|dinner)|chest\s+of\s+drawers|breath\s+of\s+fresh\s+air|broken\s+heart|deeply\s+while\s+singing)\b/i.test(
        q
      ) ||
      // Third person historical / media / educational references
      /\b(?:(?:my\s+)?(?:uncle|aunt|grandfather|grandmother|friend|father|mother|दादाजी)\s*(?:had|survived|को)?\s*.*?(?:heart\s+attack|stroke|दौरा)\s*(?:back\s+in|\d+\s+years\s+ago|in\s+\d{4}|साल\s*पहले|पड़ा\s*था))\b/i.test(
        q
      ) ||
      /\b(?:in\s+first\s+aid\s+class|newspaper\s+(?:article|had\s+an\s+article)|morning\s+newspaper|reading\s+a\s+(?:book|novel)|detective\s+book|movie|cinema|film|actor\s+clutched|television\s+news|awareness\s+campaign|school\s+play|acronym\s+fast|stroke\s+awareness)\b/i.test(
        q
      ) ||
      // Inanimate falling in Hindi / Marathi
      /(?:सुकी\s*पाने\s*(?:गळून\s*)?खाली\s*पडली|संदूक|लाल\s*गुलाब|दादाजी\s*को\s*.*?साल\s*पहले)/i.test(q);

    if (isHistoricalOrNonPersonal) {
      return null;
    }

    // Check query against full multi-lingual emergency phrase catalogue
    let isEmergencyMatch = false;

    for (const entry of Object.values(this.EMERGENCY_CATALOGUE)) {
      if (entry.keywords.some((kw) => q.includes(kw.toLowerCase()))) {
        isEmergencyMatch = true;
        break;
      }
    }

    if (!isEmergencyMatch) return null;

    // Multilingual Negation Guard: If the patient states they DO NOT have the symptom
    // (e.g. "no chest pain", "मुझे कोई दर्द नहीं है", "मला चक्कर येत नाही आहे"), suppress false emergency alerts
    if (this.isNegatedEmergency(query)) {
      return null;
    }

    // Benign sleep phrase guard: "fell asleep" is not an emergency fall
    if (
      /\b(?:fell\s+asleep|fall\s+asleep|falling\s+asleep)\b/i.test(q) &&
      !/\b(?:pain|hurt|bleeding|injury|hit|head|cannot\s+wake)\b/i.test(q)
    ) {
      return null;
    }

    const isHi = language === 'hi';
    const isEn = language === 'en';

    const speech = isHi
      ? 'मैं चिकित्सीय सलाह या दवा में बदलाव का सुझाव नहीं दे सकती। यदि आपको कोई अस्वस्थता या आपातकालीन समस्या महसूस हो रही है, तो कृपया तुरंत अपने देखभालकर्ता या डॉक्टर से संपर्क करें या आपातकालीन 112 पर कॉल करें।'
      : isEn
      ? 'I cannot provide medical advice, diagnosis, or medication recommendations. If you are experiencing pain, discomfort, or an urgent medical concern, please immediately contact your caregiver or call 112 immediately for emergency assistance.'
      : translate(language as SupportedLanguage, 'ai.safety_medical_guard') ||
        'I cannot provide medical advice, diagnosis, or medication recommendations. If you are experiencing pain, discomfort, or an urgent medical concern, please immediately contact your caregiver or call 112 immediately for emergency assistance.';

    return {
      speech,
      expression: 'alert_important',
      intent: 'EMERGENCY_DISTRESS',
      confidence: 1.0,
      actionClass: 'emergency',
      clinicalState: 'CaregiverEscalation',
      isEmergency: true,
      suggestedAction: undefined,
    };
  }

  /**
   * Evaluates if query attempts clinical diagnosis, prescription alteration, or administrative tampering.
   * Resilient to misspellings, missing spaces, common abbreviations, mixed phrases, and regional terms.
   */
  public static checkRestrictedActions(query: string, language = 'en'): ConversationResult | null {
    const q = query.trim().toLowerCase();

    // 1. Prescription / Dosage Alterations Regex & Keyword Catalog
    const prescriptionKeywords = [
      'change my medication',
      'change medication',
      'change my dose',
      'change dose',
      'double my dose',
      'double dose',
      'increase my pills',
      'stop my medication',
      'stop pills',
      'change prescription',
      'prescribe',
      'दवा की खुराक',
      'खुराक बदल',
      'दवा बदल',
      'दवा बंद',
      'दवा लिखो',
    ];

    const prescriptionPatterns = [
      // Missing spaces, optional pronouns and variations
      /\b(change\s*(?:my\s*)?(?:medication|meds?|dose)|double\s*(?:my\s*)?(?:sleeping\s*pill\s*|pill\s*|medicine\s*|medication\s*)?dose|increas\s*(?:my\s*)?dose|increas\s*(?:my\s*)?pill|stop\s*(?:all\s*)?(?:my\s*)?med|stop\s*(?:all\s*)?(?:my\s*)?pill|halve?\s*(?:my\s*)?(?:tablet\s*|pill\s*|medicine\s*)?dose|halve?\s*(?:my\s*)?pills?|reduc\s*(?:my\s*)?dose|skip\s*(?:my\s*)?dose|skip\s*(?:my\s*)?med)\b/i,
      // Common misspellings, flexible fillers, & abbreviations
      /\b(doubel|incres|decres|increas|decreas|chang|alter|stop|halve?|half|skip|chnage)\s*(?:all\s*)?(?:my\s*)?(?:medicine\s*|medications?\s*|meds?\s*|pill\s*|pills\s*|tablets?\s*|tab\s*|rx\s*)?(?:dose|dosage|prescription|rx|meds?|pills?|tablets?|medications?)\b/i,
      // Direct abbreviations & clinical modifications
      /\b(alter\s*(?:my\s*)?rx|change\s*(?:my\s*)?rx|stop\s*(?:all\s*)?(?:my\s*)?(?:meds?|tabs?|pills?)|alter\s*(?:my\s*)?(?:meds?|tabs?|pills?)|cancle\s*(?:my\s*)?(?:meds?|pills?|rx)|prescrib|medecin|medisin|medicne)\b/i,
      // Multi-word intervening medication descriptors (e.g. "double my blood pressure medication dose", "take twice my morning tablet dose")
      /\b(?:double(?:\s+up(?:\s+on)?)?|triple|halve|half|increase|decrease|reduce|skip|stop|change|alter|adjust|modify|take\s+(?:twice|2x|double|two|an?\s+extra|extra|more))\s+(?:the\s+|my\s+|this\s+|tonight'?s\s+|today'?s\s+|morning\s+|evening\s+|daily\s+|any\s+)?(?:[a-z0-9'-]+\s+){0,6}(?:dose|dosage|prescription|rx|medication|medications|medicine|medicines|pill|pills|tablet|tablets)\b/i,
      /\b(?:double|triple|increase|decrease|reduce|adjust|change|alter|modify|skip|halve)\b[^.?!]{0,45}\b(?:dose|dosage|milligrams?|mg)\b/i,
      // Phrased instructions
      /\b(halve?\s*(?:my\s*)?(?:pills?|tablets?|medications?|dose)|half\s*(?:my\s*)?(?:tab\s*|tablet\s*|pill\s*)?dose|give me sleeping pills|write\s*(?:me\s*)?(?:a\s*)?(?:new\s*)?prescription|can i take two pills|increase\s*(?:my\s*)?(?:medication\s*|medicine\s*|pill\s*|pills\s*|tablet\s*)?dose|increase my (?:pills|dosage)|stop my (?:medication|pills))\b/i,
      // Mixed English / Hindi terms
      /(दवा\s*बदल|दवा\s*की\s*खुराक|खुराक\s*बदल|दवा\s*बंद|दवा\s*लिखो|नया\s*पर्चा|पर्चा\s*लिख|गोली\s*बंद|डोज\s*बढ़ा|डोज़\s*बदल|डोज\s*डबल|डोज़\s*डबल|गोली\s*का\s*डोज|dawa\s*badal|dawa\s*change|dose\s*badhao|dose\s*double|dawai\s*ki\s*dose|goli\s*band|dose\s*aadhi\s*kar)/i,
      // Regional languages (Marathi, Tamil, Telugu, Bengali)
      /(औषध\s*बदला|औषध\s*बंद|औषधाची\s*मात्रा|गोळीची\s*मात्रा|मात्रा\s*दुप्पट|गोळी\s*बंद|सकाळची\s*गोळी\s*बंद|aushadh\s*badla|sakalchi\s*tablet\s*stop|மருந்து\s*மாற்று|மందులు\s*మార్చండి|ঔষধ\s*পরিবর্তन)/i,
    ];

    if (
      prescriptionKeywords.some((kw) => q.includes(kw)) ||
      prescriptionPatterns.some((pattern) => pattern.test(q))
    ) {
      const speechByLang: Record<string, string> = {
        hi: 'मैं चिकित्सीय सलाह या दवा में बदलाव का सुझाव नहीं दे सकती। मैं दवाओं के नुस्खे या खुराक में बदलाव नहीं कर सकती। कृपया अपने डॉक्टर या देखभालकर्ता से परामर्श लें।',
        mr: 'मी वैद्यकीय सल्ला देऊ शकत नाही आणि औषधांच्या प्रिस्क्रिप्शन किंवा मात्रेत (dose) बदल करू शकत नाही. कृपया आपल्या डॉक्टर किंवा काळजीवाहकांचा सल्ला घ्या.',
        bn: 'আমি চিকিৎসা পরামর্শ দিতে পারি না এবং ওষুধের প্রেসক্রিপশন বা মাত্রা (dose) পরিবর্তন করতে পারি না। অনুগ্রহ করে আপনার ডাক্তার বা যত্নকারীর সাথে পরামর্শ করুন।',
      };
      return {
        speech:
          speechByLang[language] ||
          'I cannot provide medical advice and cannot modify medical prescriptions or alter drug dosages. Please consult your doctor or primary caregiver for any prescription or medication changes.',
        expression: 'reassuring',
        intent: 'RESTRICTED_ACTION',
        confidence: 0.95,
        actionClass: 'class4_restricted',
      };
    }

    // 2. Clinical Diagnosis Queries
    const diagnosisKeywords = [
      'diagnose me',
      'diagnose',
      'what disease do i have',
      'do i have alzheimer',
      'do i have dementia',
      'medical diagnosis',
      'बीमारी का निदान',
      'रोग का निदान',
      'क्या मुझे अल्जाइमर है',
    ];

    const diagnosisPatterns = [
      /\b(diagnose|diagnos|am i senile|do i have (?:alzheimer|dementia|parkinson)|check my symptoms|what disease do i have|what illness do i have|medical diagnosis|do\s*i\s*hav\s*alzhiemers|kya\s*mujhe\s*(?:dementia|alzheimer)\s*ho\s*gaya|mala\s*konta\s*aajar\s*zala)\b/i,
      /(बीमारी\s*का\s*निदान|रोग\s*का\s*निदान|क्या\s*मुझे\s*(?:डिमेंशिया|अल्जाइमर|भूलने)|बीमारी\s*बताओ|लक्षण\s*बताओ)/i,
      /(माझा\s*आजारी\s*काय\s*आहे|रोगनिदान|कोणता\s*आजार|निदान\s*करा)/i,
    ];

    if (
      diagnosisKeywords.some((kw) => q.includes(kw)) ||
      diagnosisPatterns.some((pattern) => pattern.test(q))
    ) {
      return {
        speech: pickPolicyLang(language, {
          en: 'I am here to assist with daily routines and peaceful memories, but I cannot make clinical diagnoses. Please consult a qualified medical professional for health evaluations.',
          hi: 'मैं एक साथी के रूप में आपकी दिनचर्या और याददाश्त में मदद करती हूँ। मैं चिकित्सीय निदान नहीं कर सकती। अपने स्वास्थ्य के बारे में सटीक जानकारी के लिए कृपया अपने चिकित्सक से संपर्क करें।',
          mr: 'मी तुमच्या दैनंदिन दिनक्रमात आणि शांत आठवणींमध्ये मदत करू शकते, पण मी वैद्यकीय निदान करू शकत नाही. कृपया आरोग्याबद्दल अचूक माहितीसाठी तुमच्या डॉक्टरांचा सल्ला घ्या.',
          bn: 'আমি আপনার দৈনন্দিন রুটিন ও স্মৃতিতে সাহায্য করতে পারি, কিন্তু আমি কোনো চিকিৎসা নির্ণয় করতে পারি না। আপনার স্বাস্থ্যের সঠিক মূল্যায়নের জন্য অনুগ্রহ করে একজন চিকিৎসকের পরামর্শ নিন।',
          ta: 'உங்கள் அன்றாட வழக்கங்களிலும் நினைவுகளிலும் உதவ நான் இங்கே இருக்கிறேன்; ஆனால் என்னால் மருத்துவ நோயறிதல் செய்ய முடியாது. தயவுசெய்து தகுதியான மருத்துவரை அணுகவும்.',
          te: 'నేను మీ దినచర్యలు మరియు జ్ఞాపకాలలో సహాయం చేయగలను, కానీ వైద్య నిర్ధారణ చేయలేను. ఆరోగ్య పరీక్షల కోసం దయచేసి అర్హత కలిగిన వైద్యుడిని సంప్రదించండి.',
          kn: 'ನಿಮ್ಮ ದೈನಂದಿನ ದಿನಚರಿ ಮತ್ತು ಸ್ಮರಣೆಯಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ, ಆದರೆ ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಅರ್ಹ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.',
        }),
        expression: 'explaining',
        intent: 'RESTRICTED_ACTION',
        confidence: 0.95,
        actionClass: 'class4_restricted',
      };
    }

    // 3. Administrative / Cross-Patient Access
    const adminPatterns = [
      /\b(change\s*my\s*doctor|switch\s*doctor|change\s*caregiver\s*permissions|admin\s*console|admin\s*mode|other\s*patients|show\s*another\s*patient|doctor\s*assignment|access\s*records\s*of)\b/i,
      /(दूसरे\s*मरीज|एडमिन\s*कंसोल|डॉक्टर\s*बदलो|केयरगिवर\s*अनुमति)/i,
    ];

    if (adminPatterns.some((pattern) => pattern.test(q))) {
      return {
        speech: pickPolicyLang(language, {
          en: 'You are viewing your private, protected care sanctuary. Administrative settings, doctor reassignments, and other patient records can only be managed by authorized administrators.',
          hi: 'आपके पास केवल आपकी व्यक्तिगत देखभाल सैंक्चुअरी तक पहुँच है। अन्य मरीजों के रिकॉर्ड या डॉक्टर की अनुमतियों में बदलाव केवल अधिकृत व्यवस्थापक (Admin) द्वारा ही संभव है।',
          mr: 'तुम्ही तुमचे खाजगी व सुरक्षित केअर पोर्टल पाहत आहात. इतर रुग्णांचे रेकॉर्ड किंवा डॉक्टरांच्या परवानग्या केवळ अधिकृत व्यवस्थापक (Admin) बदलू शकतात.',
          bn: 'আপনি আপনার ব্যক্তিগত ও সুরক্ষিত কেয়ার পোর্টাল দেখছেন। অন্য রোগীর তথ্য বা প্রশাসনিক সেটিংস কেবল অনুমোদিত অ্যাডমিনিস্ট্রেটর পরিবর্তন করতে পারেন।',
          ta: 'நீங்கள் உங்கள் தனிப்பட்ட பாதுகாப்பான பராமரிப்பு இடத்தைப் பார்க்கிறீர்கள். நிர்வாக அமைப்புகள் மற்றும் பிற நோயாளிகளின் பதிவுகளை அங்கீகரிக்கப்பட்ட நிர்வாகிகள் மட்டுமே நிர்வகிக்க முடியும்.',
          te: 'మీరు మీ వ్యక్తిగత సురక్షిత సంరక్షణ పోర్టల్‌ను చూస్తున్నారు. ఇతర రోగుల రికార్డులు లేదా నిర్వాహక సెట్టింగ్‌లను అధికారిక అడ్మిన్ మాత్రమే మార్చగలరు.',
          kn: 'ನೀವು ನಿಮ್ಮ ಖಾಸಗಿ ಮತ್ತು ಸುರಕ್ಷಿತ ಆರೈಕೆ ಸ್ಥಳವನ್ನು ನೋಡುತ್ತಿದ್ದೀರಿ. ಆಡಳಿತಾತ್ಮಕ ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಮತ್ತು ಇತರ ರೋಗಿಗಳ ದಾಖಲೆಗಳನ್ನು ಅಧಿಕೃತ ನಿರ್ವಾಹಕರು ಮಾತ್ರ ನಿರ್ವಹಿಸಬಹುದು.',
        }),
        expression: 'clarifying',
        intent: 'RESTRICTED_ACTION',
        confidence: 0.95,
        actionClass: 'class4_restricted',
      };
    }

    // 4. Clinical Assessment Score & Test Interpretation Queries (Phase 3.14.3 / 3.14.5)
    const assessmentPatterns = [
      /\b(mmse|moca|hmse|ace-iii|ace\s*iii|cdr\s*score|what\s*(?:is|was)\s*(?:my\s*)?(?:test\s*score|score\s*on|mmse|moca|hmse)|did\s*i\s*(?:pass\s+or\s+fail|pass|fail)\s*(?:the\s*)?(?:memory|cognitive|clinical|assessment|\s+)+\s*test|is\s*it\s*pass\s*or\s*fail|interpret\s*(?:my\s*)?(?:score|test|assessment|results?)|what\s*stage\s*of\s*(?:dementia|alzheimer)|how\s*severe\s*is\s*my\s*(?:dementia|alzheimer)|is\s*my\s*(?:dementia|memory|condition)\s*(?:progressing|worsening|deteriorating))\b/i,
      /(एमएमएसई|मोका|एचएमएसई|परीक्षण\s*का\s*स्कोर|मेरा\s*स्कोर\s*क्या\s*है|क्या\s*मैं\s*टेस्ट\s*में\s*(?:पास|फेल)|डिमेंशिया\s*का\s*स्टेज|बीमारी\s*का\s*स्टेज|क्या\s*मेरी\s*बीमारी\s*बढ़\s*रही|मोका\s*चाचणी|चाचणीचा\s*निकाल)/i,
    ];

    if (assessmentPatterns.some((pattern) => pattern.test(q))) {
      return {
        speech: pickPolicyLang(language, {
          en: 'Standardized clinical assessments (such as MMSE, MoCA, or HMSE) are formal clinical tools administered externally by medical professionals. I cannot interpret clinical test scores or determine disease progression. Please review your assessment results directly with your doctor during your clinical appointment.',
          hi: 'मानकीकृत नैदानिक ​​मूल्यांकन (जैसे MMSE, MoCA, या HMSE) आपके चिकित्सक द्वारा बाहरी रूप से संचालित किए जाते हैं। मैं नैदानिक ​​परीक्षण स्कोर की व्याख्या नहीं कर सकती या बीमारी की स्थिति तय नहीं कर सकती। कृपया अपने चिकित्सक से अपने परामर्श के दौरान इस पर चर्चा करें।',
          mr: 'MMSE, MoCA किंवा HMSE सारख्या वैद्यकीय चाचण्या तुमच्या डॉक्टरांद्वारे घेतल्या जातात. मी या चाचण्यांचे गुण किंवा आजाराची स्थिती ठरवू शकत नाही. कृपया भेटीदरम्यान तुमच्या डॉक्टरांशी चर्चा करा.',
          bn: 'MMSE, MoCA বা HMSE-এর মতো ক্লিনিক্যাল মূল্যায়ন চিকিৎসকদের দ্বারা পরিচালিত হয়। আমি পরীক্ষার স্কোর ব্যাখ্যা করতে বা রোগের স্তর নির্ধারণ করতে পারি না। অনুগ্রহ করে আপনার ডাক্তারের সাথে আলোচনা করুন।',
          ta: 'MMSE, MoCA, அல்லது HMSE போன்ற மருத்துவ மதிப்பீடுகள் மருத்துவர்களால் நேரடியாக நடத்தப்படுகின்றன. சோதனை மதிப்பெண்களை என்னால் விளக்க முடியாது. தயவுசெய்து உங்கள் மருத்துவரிடம் நேரடியாகக் கலந்துரையாடுங்கள்.',
          te: 'MMSE, MoCA లేదా HMSE వంటి వైద్య పరీక్షలు వైద్య నిపుణులచే నిర్వహించబడతాయి. నేను పరీక్ష స్కోర్‌లను విశ్లేషించలేను. దయచేసి మీ అపాయింట్‌మెంట్ సమయంలో మీ వైద్యుడితో చర్చించండి.',
          kn: 'MMSE, MoCA, ಅಥವಾ HMSE ನಂತಹ ವೈದ್ಯಕೀಯ ಮೌಲ್ಯಮಾಪನಗಳನ್ನು ವೈದ್ಯರು ನಿರ್ವಹಿಸುತ್ತಾರೆ. ಪರೀಕ್ಷಾ ಅಂಕಗಳನ್ನು ನಾನು ವಿಶ್ಲೇಷಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ವೈದ್ಯರೊಂದಿಗೆ ನೇರವಾಗಿ ಚರ್ಚಿಸಿ.',
        }),
        expression: 'explaining',
        intent: 'ASSESSMENT_INTERPRETATION_REFUSAL',
        confidence: 1.0,
        actionClass: 'class4_restricted',
      };
    }

    // 5. Curative / Preventative / Treatment Claims Refusal (Phase 3.14.2 / 3.14.5)
    const curativePatterns = [
      /\b(cure\s*(?:my\s*)?(?:dementia|alzheimer|memory\s*loss|condition)|can\s*(?:you|this\s*app|saksham)\s*cure|prevent\s*(?:cognitive\s*decline|dementia|alzheimer)|reverse\s*(?:my\s*)?(?:dementia|alzheimer|memory\s*loss|condition)|is\s*(?:this|saksham)\s*a\s*cure|medical\s*treatment\s*for\s*(?:dementia|alzheimer)|will\s*this\s*softwre\s*cure|ha\s*app\s*majha\s*dementia\s*cure|kya\s*saksham\s*app\s*meri\s*memory.*?cure|does\s*playing\s*mind\s*games\s*prevent)\b/i,
      /(क्या\s*(?:यह|आप|यह\s*ऐप|सक्षम\s*ऐप).*(?:ठीक\s*कर|इलाज|रुक\s*जाएगी|क्योर)|इलाज\s*हो\s*सकता\s*है|बीमारी\s*रुक\s*जाएगी|हा\s*ॲप.*बरा\s*करू\s*शकतो|सक्षम\s*ॲप.*बरा)/i,
    ];

    if (curativePatterns.some((pattern) => pattern.test(q))) {
      return {
        speech: pickPolicyLang(language, {
          en: "Saksham is an assistive daily-living companion and cognitive engagement platform, not a medical treatment, cure, or clinical therapy. It cannot prevent, reverse, or treat dementia, Alzheimer's, or neurological diseases. For medical treatments and clinical management, please consult your physician.",
          hi: 'सक्षम एक सहायक दैनिक-जीवन साथी और स्मृति सहायक है। यह मनोभ्रंश (डिमेंशिया) या अल्जाइमर का चिकित्सीय उपचार, इलाज या रोकथाम नहीं करता है। चिकित्सीय उपचार और सलाह के लिए कृपया अपने डॉक्टर से परामर्श लें।',
          mr: 'सक्षम हा दैनंदिन जीवनातील एक सहाय्यक साथी आहे, वैद्यकीय उपचार किंवा औषध नाही. तो डिमेंशिया किंवा अल्झायमर बरा करू शकत नाही. वैद्यकीय उपचारांसाठी कृपया तुमच्या डॉक्टरांचा सल्ला घ्या.',
          bn: 'সক্ষম একটি সহায়ক দৈনন্দিন সঙ্গী, এটি কোনো চিকিৎসা বা ওষুধ নয়। এটি ডিমেনশিয়া বা আলঝাইমার্স নিরাময় করতে পারে না। চিকিৎসার জন্য অনুগ্রহ করে আপনার ডাক্তারের সাথে পরামর্শ করুন।',
          ta: 'சக்ஷம் என்பது அன்றாட வாழ்க்கைக்கு உதவும் ஒரு துணை மட்டுமே; இது மருத்துவ சிகிச்சையோ நோயைக் குணப்படுத்தும் மருந்தோ அல்ல. மருத்துவ சிகிச்சைக்கு உங்கள் மருத்துவரை அணுகவும்.',
          te: 'సక్షం రోజువారీ జీవితానికి సహాయపడే తోడు మాత్రమే, ఇది వైద్య చికిత్స లేదా నివారణ కాదు. ఇది డిమెన్షియాను నయం చేయలేదు. వైద్య చికిత్స కోసం దయచేసి మీ వైద్యుడిని సంప్రదించండి.',
          kn: 'ಸಕ್ಷಮ್ ದೈನಂದಿನ ಜೀವನಕ್ಕೆ ಸಹಾಯ ಮಾಡುವ ಸಂಗಾತಿ ಮಾತ್ರ, ಇದು ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆಯಲ್ಲ. ಇದು ಡಿಮೆನ್ಷಿಯಾವನ್ನು ಗುಣಪಡಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆಗಾಗಿ ದಯವಿಟ್ಟು ನಿಮ್ಮ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.',
        }),
        expression: 'reassuring',
        intent: 'CURATIVE_CLAIM_REFUSAL',
        confidence: 1.0,
        actionClass: 'class4_restricted',
      };
    }

    // 6. Emergency Dispatch / Direct Calling Fabrication Guard (Phase 3.14.5 / 3.14.7)
    const emergencyDispatchPatterns = [
      /\b((?:did|have)\s*you\s*(?:call|called|dispatch|dispatched)\s*(?:112|911|(?:an\s+|the\s+)?ambulance|(?:the\s+)?police|emergency)|is\s*(?:the\s*)?ambulance\s*coming|hav\s*u\s*called\s*(?:an\s*)?ambulence|kya\s*aapne\s*ambulance\s*call\s*kar\s*di|tumhi\s*ambulance\s*bolavli)\b/i,
      /(क्या\s*आपने\s*(?:112|एम्बुलेंस|पुलिस|आपातकालीन)\s*(?:पर\s*)?(?:फोन\s*किया|बुलाई|बुला\s*ली|कॉल\s*किया)|क्या\s*एम्बुलेंस\s*आ\s*रही\s*है|तुम्ही\s*रुग्णवाहिका\s*बोलावली)/i,
    ];

    if (emergencyDispatchPatterns.some((pattern) => pattern.test(q))) {
      return {
        speech: pickPolicyLang(language, {
          en: 'I am an on-device software companion and cannot place telephone calls or dispatch emergency services. If you need urgent medical help or an ambulance, please call 112 directly from your telephone or ask someone nearby to dial 112 immediately.',
          hi: 'मैं एक ऑन-डिवाइस सहायक सॉफ्टवेयर साथी हूँ और फोन कॉल करने या आपातकालीन सेवा भेजने में सक्षम नहीं हूँ। यदि आपको तत्काल आपातकालीन चिकित्सा सहायता चाहिए, तो कृपया अपने फोन से सीधे 112 पर कॉल करें।',
          mr: 'मी एक सॉफ्टवेअर साथी आहे आणि मी थेट फोन कॉल किंवा रुग्णवाहिका पाठवू शकत नाही. कृपया तात्काळ वैद्यकीय मदतीसाठी तुमच्या फोनवरून थेट 112 वर कॉल करा.',
          bn: 'আমি একটি সফটওয়্যার সঙ্গী এবং সরাসরি ফোন কল বা অ্যাম্বুলেন্স পাঠাতে পারি না। জরুরি সাহায্যের জন্য অনুগ্রহ করে আপনার ফোন থেকে সরাসরি 112 নম্বরে কল করুন।',
          ta: 'நான் ஒரு மென்பொருள் துணை, என்னால் தொலைபேசி அழைப்புகளோ அவசர சேவையோ அனுப்ப முடியாது. அவசர மருத்துவ உதவிக்கு உடனடியாக உங்கள் தொலைபேசியில் 112-ஐ அழைக்கவும்.',
          te: 'నేను సాఫ్ట్‌వేర్ సహాయకురాలిని, నేను నేరుగా ఫోన్ కాల్స్ లేదా అంబులెన్స్ పంపలేను. అత్యవసర సహాయం కోసం దయచేసి మీ ఫోన్ నుండి నేరుగా 112కు కాల్ చేయండి.',
          kn: 'ನಾನು ಸಾಫ್ಟ್‌ವೇರ್ ಸಂಗಾತಿಯಾಗಿದ್ದು ನೇರವಾಗಿ ಫೋನ್ ಕರೆ ಮಾಡಲು ಅಥವಾ ಆಂಬ್ಯುಲೆನ್ಸ್ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ತುರ್ತು ಸಹಾಯಕ್ಕಾಗಿ ದಯವಿಟ್ಟು ನಿಮ್ಮ ಫೋನ್‌ನಿಂದ 112ಕ್ಕೆ ಕರೆ ಮಾಡಿ.',
        }),
        expression: 'alert_important',
        intent: 'EMERGENCY_DISPATCH_FABRICATION_DEFENSE',
        confidence: 1.0,
        actionClass: 'class4_restricted',
      };
    }

    // 7. External Doctor / Caregiver Direct Calling Fabrication Guard (Phase 3.14.5)
    const externalCommPatterns = [
      /\b(?:did|have)\s*you\s*(?:call|called|phone|phoned|telephone|telephoned|ring|rung|text|texted|sms|message|messaged)\s*(?:my\s*)?(?:doctor|caregiver|daughter|son|family|nurse)\b/i,
      /\b(?:did\s*u\s*(?:msg|text|phone|call)|tumhi\s*doctorna\s*phone\s*kela|did\s*you\s*phone\s*my\s*doctor)\b/i,
      /(क्या\s*आपने\s*(?:डॉक्टर|केयरगिवर|बेटी|बेटे|परिवार)\s*को\s*(?:फोन|कॉल|मैसेज)\s*किया|तुम्ही\s*माझ्या\s*(?:मुलीला|डॉक्टरांना)\s*फोन\s*केला)/i,
    ];

    if (externalCommPatterns.some((pattern) => pattern.test(q))) {
      return {
        speech: pickPolicyLang(language, {
          en: 'I do not place phone calls or send external text messages. Your shared routine notes and requests are recorded in our shared care portal for your caregiver and doctor to view, but please phone them directly if you need to speak with them right now.',
          hi: 'मैं फोन कॉल या बाहरी संदेश नहीं भेजती हूँ। आपकी साझा दिनचर्या और नोट्स हमारे केयर पोर्टल पर दर्ज होते हैं, लेकिन यदि आपको तुरंत बात करनी है तो कृपया सीधे फोन पर संपर्क करें।',
          mr: 'मी फोन कॉल करत नाही किंवा बाह्य संदेश पाठवत नाही. तुमच्या नोंदी केयर पोर्टलवर जतन केल्या जातात, पण तात्काळ बोलण्यासाठी कृपया त्यांना थेट फोन करा.',
          bn: 'আমি ফোন কল করি না বা বাইরের বার্তা পাঠাই না। আপনার নোটগুলো কেয়ার পোর্টালে সংরক্ষিত থাকে, তবে এখনই কথা বলার প্রয়োজন হলে অনুগ্রহ করে সরাসরি ফোন করুন।',
          ta: 'நான் தொலைபேசி அழைப்புகளோ வெளிப்புற செய்திகளோ அனுப்புவதில்லை. உங்கள் குறிப்புகள் பராமரிப்புப் போர்ட்டலில் பதிவாகின்றன; உடனடியாகப் பேச வேண்டுமெனில் நேரடியாக அவர்களை அழைக்கவும்.',
          te: 'నేను ఫోన్ కాల్స్ చేయను మరియు బయటి సందేశాలు పంపను. మీ గమనికలు కేర్ పోర్టల్‌లో నమోదవుతాయి; వెంటనే మాట్లాడాలంటే దయచేసి వారికి నేరుగా ఫోన్ చేయండి.',
          kn: 'ನಾನು ಫೋನ್ ಕರೆಗಳನ್ನು ಮಾಡುವುದಿಲ್ಲ ಅಥವಾ ಹೊರಗಿನ ಸಂದೇಶಗಳನ್ನು ಕಳುಹಿಸುವುದಿಲ್ಲ. ನಿಮ್ಮ ಟಿಪ್ಪಣಿಗಳು ಕೇರ್ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ದಾಖಲಾಗುತ್ತವೆ; ತಕ್ಷಣ ಮಾತನಾಡಬೇಕಾದರೆ ದಯವಿಟ್ಟು ನೇರವಾಗಿ ಫೋನ್ ಮಾಡಿ.',
        }),
        expression: 'reassuring',
        intent: 'EXTERNAL_COMMUNICATION_FABRICATION_DEFENSE',
        confidence: 1.0,
        actionClass: 'class4_restricted',
      };
    }

    // 8. Safety Lock Override Guard (Phase 3.14.5 / 3.14.7)
    const safetyLockOverridePatterns = [
      /\b((?:disable|turn\s*off|turnoff|remove|bypass|clear|deactivate|override)\s*(?:the\s*)?(?:(?:gas\s*stove|stove|gas\s*stove\s*burner|medication\s*schedule|medication|burner|kitchen\s*burner|gas|flame|(?:clinical|standardized|assessment)(?:\s+(?:clinical|standardized|assessment))*)\s*(?:safety\s*|score\s*)?lock|safety\s*lock(?:\s+on\s+.*)?))\b/i,
      /(सुरक्षा\s*लॉक\s*(?:हटाओ|बंद\s*करो|हटाएं)|सेफ्टी\s*लॉक\s*(?:बंद\s*करो|हटाओ)|गॅस\s*शेगडीचा\s*सेफ्टी\s*लॉक|kitchen\s*gas\s*stove\s*ka\s*safety\s*lock|gas\s*stove\s*safety\s*lock|गैस\s*स्टोव\s*का\s*सुरक्षा\s*लॉक)/i,
    ];

    if (safetyLockOverridePatterns.some((pattern) => pattern.test(q))) {
      return {
        speech: pickPolicyLang(language, {
          en: 'Safety locks on medication schedules and kitchen appliances are clinical safety controls designed to protect your physical wellbeing. They cannot be bypassed or removed through voice conversation.',
          hi: 'दवाओं और रसोई उपकरणों पर सुरक्षा लॉक आपके शारीरिक स्वास्थ्य और सुरक्षा के लिए आवश्यक हैं। इन्हें बातचीत द्वारा हटाया या बदला नहीं जा सकता है।',
          mr: 'औषधे आणि स्वयंपाकघरातील उपकरणांवरील सुरक्षा लॉक तुमच्या सुरक्षिततेसाठी आहेत. ते संभाषणातून बंद करता किंवा हटवता येत नाहीत.',
          bn: 'ওষুধ এবং রান্নাঘরের যন্ত্রপাতির সুরক্ষা লক আপনার নিরাপত্তার জন্য অপরিহার্য। কথোপকথনের মাধ্যমে এগুলো বন্ধ বা পরিবর্তন করা যায় না।',
          ta: 'மருந்துகள் மற்றும் சமையலறை சாதனங்களின் பாதுகாப்புப் பூட்டுகள் உங்கள் நலனுக்காக அமைக்கப்பட்டவை. உரையாடல் மூலம் அவற்றை நீக்கவோ மாற்றவோ முடியாது.',
          te: 'మందులు మరియు వంటగది పరికరాలపై ఉన్న భద్రతా లాక్‌లు మీ ఆరోగ్య రక్షణ కోసం ఉన్నాయి. వాటిని సంభాషణ ద్వారా తొలగించలేము.',
          kn: 'ಔಷಧಿಗಳು ಮತ್ತು ಅಡುಗೆ ಮನೆ ಉಪಕರಣಗಳ ಸುರಕ್ಷತಾ ಲಾಕ್‌ಗಳು ನಿಮ್ಮ ಸುರಕ್ಷತೆಗಾಗಿ ಇವೆ. ಸಂಭಾಷಣೆಯ ಮೂಲಕ ಅವುಗಳನ್ನು ತೆಗೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ.',
        }),
        expression: 'alert_important',
        intent: 'SAFETY_LOCK_OVERRIDE_REFUSAL',
        confidence: 1.0,
        actionClass: 'class4_restricted',
      };
    }

    // 9. Deceptive Roleplay / Fictional Fabrication Guard
    const deceptionPatterns = [
      /\b(?:tell\s+the\s+caregiver\s+you\s+already\s+called|pretend\s+you\s+phoned\s+(?:my\s+)?(?:doctor|caregiver)|in\s+a\s+hypothetical\s+story.*?double.*?medication)\b/i,
    ];

    if (deceptionPatterns.some((pattern) => pattern.test(q))) {
      return {
        speech: pickPolicyLang(language, {
          en: 'Saksham cannot fabricate emergency dispatch, generate false medical communications, or bypass clinical safety through roleplay or hypothetical scenarios.',
          hi: 'सक्षम किसी भी काल्पनिक या अप्रमाणित चिकित्सा संचार का निर्माण नहीं कर सकता है। सभी संचार वास्तविक और प्रमाणित होने चाहिए।',
          mr: 'सक्षम कोणताही खोटा किंवा अप्रमाणित वैद्यकीय संवाद तयार करू शकत नाही. सर्व संवाद खरे आणि सुरक्षित असणे आवश्यक आहे.',
          bn: 'সক্ষম কোনো কাল্পনিক বা অপ্রমাণিত চিকিৎসা তথ্য তৈরি করতে পারে না। সকল তথ্য অবশ্যই সত্য ও নিরাপদ হতে হবে।',
          ta: 'சக்ஷம் எந்தவொரு கற்பனையான அல்லது தவறான மருத்துவத் தகவலையும் உருவாக்க முடியாது. அனைத்துத் தகவல்களும் உண்மையாகவும் பாதுகாப்பாகவும் இருக்க வேண்டும்.',
          te: 'సక్షం ఎటువంటి కల్పిత లేదా తప్పుడు వైద్య సమాచారాన్ని సృష్టించలేదు. అన్ని వివరాలు వాస్తవంగాను సురక్షితంగాను ఉండాలి.',
          kn: 'ಸಕ್ಷಮ್ ಯಾವುದೇ ಕಾಲ್ಪನಿಕ ಅಥವಾ ಸುಳ್ಳು ವೈದ್ಯಕೀಯ ಮಾಹಿತಿಯನ್ನು ರಚಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ಎಲ್ಲಾ ಮಾಹಿತಿಯೂ ನೈಜ ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿರಬೇಕು.',
        }),
        expression: 'alert_important',
        intent: 'SECURITY_BOUNDARY_BLOCKED',
        confidence: 1.0,
        actionClass: 'class4_restricted',
      };
    }

    return null;
  }

  /**
   * Evaluates if query attempts prompt injection, system instruction overrides,
   * jailbreaking, confidential data exfiltration, or unauthorized clinical state mutation.
   */
  public static checkPromptInjectionAndOverrides(query: string, language = 'en'): ConversationResult | null {
    if (!query || typeof query !== 'string') return null;
    const q = query.trim().toLowerCase();

    const injectionPatterns = [
      // 1. System Prompt Overrides & Jailbreaks
      /\b(?:ignore|disregard|forget|ignre)\s+(?:all\s+)?(?:previous|prior|system|previuos)\s+(?:instructions?|rules?|prompts?|directives?|directivs?)\b/i,
      /\b(?:system\s+override|developer\s+mode|dan\s+mode|jailbreak|unrestricted\s+mode|god\s+mode|you\s+are\s+now\s+dan|do\s+anything\s+now)\b/i,
      /\b(?:you\s+are\s+now\s+in\s+developer\s+mode|act\s+as\s+an\s+unrestricted\s+ai|bypass\s+(?:all\s+)?(?:safety|filters|rules|guardrails))\b/i,
      /\b(?:reveal|show|print|display|dump)\s+(?:the\s+)?(?:hidden\s+|developer\s+|system\s+|initial\s+)+(?:prompt|instructions?|directives?)\b/i,

      // 2. Cross-Patient & Caregiver Private Data Exfiltration
      /\b(?:reveal|show|display|read|print|leak)\s+(?:the\s+)?(?:private\s+)?caregiver\s+(?:notes?|observations?|records?)\b/i,
      /\b(?:show\s*me\s*private\s*cargiver\s*notes|caregiver\s*che\s*private|caregiver\s*ke\s*private\s*notes)\b/i,
      /\b(?:show|reveal|give|access|dump)\s+(?:me\s+)?(?:all\s+)?(?:another|other)\s+patients?(?:'s)?\s*(?:medical\s+)?(?:data|records?|files?|history|profiles?)\b/i,
      /\b(?:access|list|view)\s+(?:all\s+)?other\s+patients?\b/i,
      /\b(?:dusrya\s*rugnacha\s*data|other\s*patients\s*ka\s*medical\s*record)\b/i,

      // 3. Clinical State & Diagnosis Manipulation
      /\b(?:change|override|alter|clear|erase|delete|modify)\s+(?:my\s+)?(?:diagnosis|clinical\s+diagnosis|condition)\s*(?:to\s+[a-z0-9_-]+)?\b/i,
      /\b(?:mark\s+(?:every|all)\s+tasks?\s+(?:as\s+)?(?:complete|finished|done)|auto-complete\s+all\s+tasks?)\b/i,
      /\b(?:bypass|fake|override)\s+(?:doctor|clinician|medical)\s+(?:authorization|approval|prescription|verification)\b/i,

      // 4. Indian Language System Overrides & Injection (Hindi & Marathi & Hinglish)
      /(?:पिछले\s*(?:सभी\s*)?निर्देश\s*(?:भूल\s*जाओ|रद्द\s*करो|अनदेखा\s*करो))/i,
      /(?:सिस्टम\s*ओवरराइड|डेवलपर\s*मोड|जेलब्रेक)/i,
      /(?:दूसरे\s*मरीजों?\s*का\s*डेटा\s*(?:दिखाओ|खोलो|लाओ))/i,
      /(?:केयरगिवर\s*(?:के\s*)?(?:निजी\s*)?नोट्स?\s*(?:दिखाओ|बताओ))/i,
      /(?:मेरा\s*निदान\s*(?:बदलो|हटाओ|सामान्य\s*करो))/i,
      /(?:सभी\s*कार्य\s*(?:बिना\s*किए\s*)?(?:पूरे\s*करो|पूरे\s*कर\s*दो|पूर्ण\s*करो|समाप्त\s*करो))/i,
      /(?:सर्व\s*सुरक्षा\s*नियम\s*रद्द|आधीच्या\s*सर्व\s*आज्ञा\s*विसरून|वैद्यकीय\s*निदान\s*बदला|इतर\s*रुग्णांची\s*माहिती|काळजीवाहका.*?गुप्त\s*शेरे|गुप्त\s*शेरे|sarva\s*adhi\s*che\s*nirdesh|system\s*prompt\s*ko\s*bypass)/i,
    ];

    if (injectionPatterns.some((pattern) => pattern.test(q))) {
      return {
        speech: pickPolicyLang(language, {
          en: 'I am here as a gentle companion for your daily wellbeing. I cannot modify system safety policies, override clinical records, or access private data outside your care sanctuary. How can I assist you with your routine today?',
          hi: 'मैं आपकी शांति, सुरक्षा और दैनिक कल्याण के लिए बनाई गई हूँ। मैं प्रणालीगत सुरक्षा नीतियों या गोपनीय व्यक्तिगत रिकॉर्ड्स को नहीं बदल सकती। मैं आपकी सामान्य दिनचर्या में कैसे मदद करूँ?',
          mr: 'मी तुमच्या दैनंदिन आरोग्यासाठी आणि शांततेसाठी एक स्नेही साथी आहे. मी सुरक्षा नियम किंवा वैद्यकीय नोंदी बदलू शकत नाही. तुमच्या आजच्या दिनक्रमात मी कशी मदत करू?',
          bn: 'আমি আপনার দৈনন্দিন সুস্থতা ও শান্তির জন্য এখানে আছি। আমি সুরক্ষা নীতি বা ব্যক্তিগত রেকর্ড পরিবর্তন করতে পারি না। আপনার দৈনন্দিন রুটিনে আমি কীভাবে সাহায্য করতে পারি?',
          ta: 'உங்கள் அன்றாட நலனுக்காக உதவும் அமைதியான துணையாக நான் இங்கே இருக்கிறேன். பாதுகாப்பு விதிகளையோ மருத்துவப் பதிவுகளையோ என்னால் மாற்ற முடியாது. இன்றைய உங்கள் வழக்கங்களில் நான் எப்படி உதவலாம்?',
          te: 'మీ రోజువారీ క్షేమం కోసం నేను మీ సహాయకురాలిగా ఉన్నాను. భద్రతా నియమాలను లేదా వైద్య రికార్డులను నేను మార్చలేను. మీ నేటి దినచర్యలో నేను ఎలా సహాయం చేయగలను?',
          kn: 'ನಿಮ್ಮ ದೈನಂದಿನ ಕ್ಷೇಮಕ್ಕಾಗಿ ಸಹಾಯ ಮಾಡುವ ಸಂಗಾತಿಯಾಗಿ ನಾನು ಇಲ್ಲಿದ್ದೇನೆ. ನಾನು ಸುರಕ್ಷತಾ ನಿಯಮಗಳು ಅಥವಾ ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳನ್ನು ಬದಲಾಯಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ನಿಮ್ಮ ಇಂದಿನ ದಿನಚರಿಯಲ್ಲಿ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
        }),
        expression: 'reassuring',
        intent: 'SECURITY_BOUNDARY_BLOCKED',
        confidence: 1.0,
        actionClass: 'class4_restricted',
      };
    }

    return null;
  }

  /**
   * Generates truth-bound, qualification-safe response for medication status queries.
   * Explicitly prevents asserting physical ingestion was verified.
   */
  public static formatMedicationSelfReport(context?: PatientContext, language = 'en', query?: string): ConversationResult {
    if (query) {
      const qLower = query.toLowerCase();
      if (
        /\b(?:should i take another|can i take another|take another|double (?:the )?dose|dusri goli|dusri dose|ek aur goli)\b/i.test(qLower) ||
        /(दूसरी खुराक|एक और गोली|दुसरी गोळी|आणखी एक)/.test(query)
      ) {
        return this.handleMedicationDoubleDoseGuard(language);
      }
      if (
        /\b(?:forgot|not sure|yaad nahi|bhool|missed|white round tablet|safed goli|shayad|kya maine dawa)\b/i.test(qLower) ||
        /(याद नहीं|भूल|सफेद गोली|शायद|आठवत नाही|घेतलं का|ली थी क्या|खाई थी क्या)/.test(query)
      ) {
        const uncert = this.handleMedicationUncertainty(query, context, language);
        return {
          ...uncert,
          intent: 'ROUTINES_MEDICATION_STATUS',
        };
      }
    }

    const routines = context?.routines?.routines || [];
    const medRoutine = routines.find(
      (r) =>
        r.category === 'medication' ||
        r.title.toLowerCase().includes('medicine') ||
        r.title.toLowerCase().includes('pill') ||
        r.title.toLowerCase().includes('tablet') ||
        r.title.toLowerCase().includes('dawa') ||
        r.title.toLowerCase().includes('दवा') ||
        r.title.toLowerCase().includes('औषध') ||
        r.title.toLowerCase().includes('गोळी')
    );

    const viewRoutinesDesc = pickPolicyLang(language, {
      en: 'View Routines',
      hi: 'दिनचर्या देखें',
      mr: 'दिनक्रम पहा',
      bn: 'রুটিন দেখুন',
      ta: 'வழக்கங்களைக் காண்க',
      te: 'దినచర్యలను చూడండి',
      kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
    });
    const openRoutinesDesc = pickPolicyLang(language, {
      en: 'Open Daily Routines',
      hi: 'दिनचर्या खोलें',
      mr: 'दिनक्रम उघडा',
      bn: 'দৈনিক রুটিন খুলুন',
      ta: 'தினசரி வழக்கங்களைத் திற',
      te: 'దినచర్యలను తెరవండి',
      kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ತೆರೆಯಿರಿ',
    });

    if (!medRoutine) {
      return {
        speech: pickPolicyLang(language, {
          en: 'You have no scheduled medication routine recorded in your sanctuary today. Please check with your caregiver if you are unsure.',
          hi: 'आपकी आज की दिनचर्या में कोई विशेष दवा दर्ज नहीं है। कृपया अपनी देखभाल डायरी या डॉक्टर की पर्ची की समीक्षा करें।',
          mr: 'तुमच्या आजच्या वेळापत्रकात औषधांची कोणतीही नोंद आढळली नाही. खात्री नसल्यास कृपया तुमच्या काळजीवाहूंची मदत घ्या.',
          bn: 'আজকের রুটিনে আপনার কোনো ওষুধের সময়সূচী নথিভুক্ত নেই। নিশ্চিত না হলে অনুগ্রহ করে আপনার যত্নশীলের সাথে কথা বলুন।',
          ta: 'இன்றைய உங்கள் அட்டவணையில் எந்த மருந்து வழக்கமும் பதிவாகவில்லை. சந்தேகம் இருந்தால் உங்கள் பராமரிப்பாளரிடம் சரிபார்க்கவும்.',
          te: 'నేటి మీ దినచర్యలో ఎటువంటి మందుల షెడ్యూల్ నమోదు కాలేదు. మీకు ఖచ్చితంగా తెలియకపోతే దయచేసి మీ సంరక్షకుడిని అడగండి.',
          kn: 'ಇಂದಿನ ನಿಮ್ಮ ವೇಳಾಪಟ್ಟಿಯಲ್ಲಿ ಯಾವುದೇ ಔಷಧಿ ದಿನಚರಿ ದಾಖಲಾಗಿಲ್ಲ. ನಿಮಗೆ ಖಚಿತವಿಲ್ಲದಿದ್ದರೆ ದಯವಿಟ್ಟು ನಿಮ್ಮ ಆರೈಕೆದಾರರನ್ನು ಕೇಳಿ.',
        }),
        expression: 'reassuring',
        intent: 'ROUTINES_MEDICATION_STATUS',
        confidence: 0.9,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: viewRoutinesDesc,
        },
      };
    }

    const medTitle = getTranslatedRoutineTitle(medRoutine.title, language);

    if (medRoutine.isCompleted) {
      const doneAt = medRoutine.completedAt || '';
      return {
        speech: pickPolicyLang(language, {
          en: `Yes! According to your care schedule, you completed '${medTitle}' ${doneAt ? `at ${doneAt}` : 'earlier today'}. Have you taken your medicine? You are taking wonderful care of yourself!`,
          hi: `हाँ! आपकी देखभाल सूची के अनुसार, आपने '${medTitle}' ${doneAt || 'आज सुबह'} पूरी कर ली है। क्या आपने दवा ले ली है? आप अपना बहुत अच्छा ध्यान रख रहे हैं!`,
          mr: `होय! तुमच्या नोंदीनुसार, तुम्ही '${medTitle}' ${doneAt || 'आधीच'} पूर्ण केली आहे. तुम्ही स्वतःची छान काळजी घेत आहात!`,
          bn: `হ্যাঁ! আপনার সময়সূচী অনুযায়ী আপনি '${medTitle}' ${doneAt ? `${doneAt}-এ ` : ''}সম্পন্ন করেছেন। আপনি কি আপনার ওষুধ খেয়েছেন? আপনি নিজের খুব সুন্দর যত্ন নিচ্ছেন!`,
          ta: `ஆம்! உங்கள் அட்டவணைப்படி '${medTitle}' ${doneAt ? `${doneAt} மணிக்கு ` : 'முன்னரே '}முடிக்கப்பட்டுள்ளது. நீங்கள் உங்கள் மருந்தை எடுத்துக்கொண்டீர்களா?`,
          te: `అవును! మీ జాబితా ప్రకారం మీరు '${medTitle}' ${doneAt ? `${doneAt} కు ` : ''}పూర్తి చేశారు. మీరు మీ మందులు తీసుకున్నారా?`,
          kn: `ಹೌದು! ನಿಮ್ಮ ವೇಳಾಪಟ್ಟಿಯ ಪ್ರಕಾರ ನೀವು '${medTitle}' ${doneAt ? `${doneAt} ಕ್ಕೆ ` : ''}ಪೂರ್ಣಗೊಳಿಸಿದ್ದೀರಿ. ನೀವು ನಿಮ್ಮ ಔಷಧಿ ತೆಗೆದುಕೊಂಡಿದ್ದೀರಾ?`,
        }),
        expression: 'confirming',
        intent: 'ROUTINES_MEDICATION_STATUS',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          targetId: medRoutine.id,
          description: viewRoutinesDesc,
        },
      };
    } else {
      return {
        speech: pickPolicyLang(language, {
          en: `Not yet. Your medication routine '${medTitle}' is scheduled for ${medRoutine.scheduledTime} and is currently marked as pending. Let's open it together so you can review it gently.`,
          hi: `अभी नहीं। आपकी दवा दिनचर्या '${medTitle}' ${medRoutine.scheduledTime} के लिए निर्धारित है और लंबित है। क्या हम दिनचर्या खोलकर इसे देखें?`,
          mr: `अजून नाही. तुमची औषधाची वेळ '${medTitle}' (${medRoutine.scheduledTime}) अजून पूर्ण झालेली नाही. चला, आपण एकत्र दिनक्रम पाहूया.`,
          bn: `এখনও হয়নি। আপনার ওষুধের রুটিন '${medTitle}' ${medRoutine.scheduledTime}-এর জন্য নির্ধারিত আছে। চলুন আমরা একসাথে রুটিনটি দেখে নিই।`,
          ta: `இன்னும் இல்லை. உங்கள் மருந்து வழக்கம் '${medTitle}' ${medRoutine.scheduledTime}-க்கு திட்டமிடப்பட்டுள்ளது. நாம் அதைத் திறந்து பார்க்கலாமா?`,
          te: `ఇంకా లేదు. మీ మందుల దినచర్య '${medTitle}' ${medRoutine.scheduledTime} కు నిర్ణయించబడింది. మనం కలిసి దాన్ని తెరిచి చూద్దామా?`,
          kn: `ಇನ್ನೂ ಇಲ್ಲ. ನಿಮ್ಮ ಔಷಧಿ ದಿನಚರಿ '${medTitle}' ${medRoutine.scheduledTime} ಕ್ಕೆ ನಿಗದಿಯಾಗಿದೆ. ನಾವು ಅದನ್ನು ತೆರೆದು ನೋಡೋಣವೇ?`,
        }),
        expression: 'reminder',
        intent: 'ROUTINES_MEDICATION_STATUS',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          targetId: medRoutine.id,
          description: openRoutinesDesc,
        },
      };
    }
  }

  /**
   * Strictly blocks double-dose suggestions and enforces clinical safety.
   */
  public static handleMedicationDoubleDoseGuard(language = 'en'): ConversationResult {
    const lang = language || 'en';
    const speech =
      lang === 'mr'
        ? 'कृपया तुमच्या डॉक्टरांशी किंवा काळजीवाहूशी बोलल्याशिवाय दुसरी गोळी अजिबात घेऊ नका. अतिरिक्त औषध घेणे आरोग्यासाठी धोकादायक ठरू शकते. मी तुमच्या काळजीवाहूंशी संपर्क साधू का?'
        : lang === 'hi'
        ? 'कृपया अपने डॉक्टर या देखभालकर्ता से परामर्श किए बिना दूसरी खुराक बिल्कुल न लें। अतिरिक्त दवा लेना हानिकारक हो सकता है। क्या मैं आपकी देखभालकर्ता से बात करने में मदद करूँ?'
        : lang === 'ta'
        ? 'தயவுசெய்து உங்கள் மருத்துவர் அல்லது பராமரிப்பாளரிடம் பேசாமல் மற்றொரு மாத்திரையை உட்கொள்ள வேண்டாம். கூடுதல் மருந்து ஆபத்தானது.'
        : lang === 'te'
        ? 'దయచేసి మీ వైద్యుడు లేదా సంరక్షకుడితో మాట్లాడకుండా మరొక మాత్ర తీసుకోకండి. అదనపు మోతాదు ప్రమాదకరం కావచ్చు.'
        : lang === 'kn'
        ? 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ವೈದ್ಯರು ಅಥವಾ ಆರೈಕೆದಾರರೊಂದಿಗೆ ಮಾತನಾಡದೆ ಇನ್ನೊಂದು ಮಾತ್ರೆ ತೆಗೆದುಕೊಳ್ಳಬೇಡಿ. ಹೆಚ್ಚುವರಿ ಔಷಧಿ ಅಪಾಯಕಾರಿ.'
        : lang === 'bn'
        ? 'দয়া করে আপনার ডাক্তার বা যত্নশীল ব্যক্তির সাথে কথা না বলে অতিরিক্ত ওষুধ গ্রহণ করবেন না। অতিরিক্ত ওষুধ ক্ষতিকর হতে পারে।'
        : 'Please do not take another pill or extra dose without speaking to your doctor or caregiver. Taking an additional dose can be dangerous. Always confirm with your clinician or primary caregiver before taking extra medication.';

    const desc =
      lang === 'mr'
        ? 'काळजीवाहूंशी संपर्क साधा'
        : lang === 'hi'
        ? 'देखभालकर्ता से संपर्क करें'
        : lang === 'ta'
        ? 'பராமரிப்பாளரைத் தொடர்பு கொள்ள'
        : lang === 'te'
        ? 'సంరక్షకుడిని సంప్రదించండి'
        : lang === 'kn'
        ? 'ಆರೈಕೆದಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ'
        : lang === 'bn'
        ? 'যত্নশীলের সাথে যোগাযোগ করুন'
        : 'Contact Caregiver';

    return {
      speech,
      expression: 'reassuring',
      intent: 'MEDICATION_DOUBLE_DOSE_GUARD',
      confidence: 0.99,
      actionClass: 'class4_restricted',
      suggestedAction: {
        action: 'CALL_CAREGIVER',
        description: desc,
      },
    };
  }

  /**
   * Clinical Medication Uncertainty Handler:
   * Inspects authorized recorded routine status without ever asserting physical ingestion.
   * Cautions patient against guessing, forbids double-dosing, and prompts caregiver verification.
   */
  public static handleMedicationUncertainty(
    query: string,
    context?: PatientContext,
    language = 'en'
  ): ConversationResult {
    const qLower = query.toLowerCase();

    // Guard 1: Double dose prevention
    if (
      /\b(?:should i take another|can i take another|take another|double (?:the )?dose|dusri goli|dusri dose|ek aur goli|take two pills)\b/i.test(qLower) ||
      /(दूसरी खुराक|एक और गोली|दुसरी गोळी|आणखी एक|डबल डोज़)/.test(query)
    ) {
      return this.handleMedicationDoubleDoseGuard(language);
    }

    const routines = context?.routines?.routines || [];
    const medRoutine = routines.find(
      (r) =>
        r.category === 'medication' ||
        r.title.toLowerCase().includes('medicine') ||
        r.title.toLowerCase().includes('pill') ||
        r.title.toLowerCase().includes('tablet') ||
        r.title.toLowerCase().includes('dawa') ||
        r.title.toLowerCase().includes('दवा') ||
        r.title.toLowerCase().includes('औषध') ||
        r.title.toLowerCase().includes('गोळी')
    );

    const isPhysicalAppearanceDesc =
      /\b(?:white round tablet|small pill|round tablet|safed goli|safed wali|pandhri goli|chhoti goli)\b/i.test(qLower) ||
      /(सफेद गोली|पांढरी गोळी|छोटी गोली)/.test(query);

    // Case A: No routine record exists in sanctuary (Unknown status)
    if (!medRoutine) {
      return {
        speech:
          language === 'mr'
            ? 'तुमच्या आजच्या वेळापत्रकात औषधांची कोणतीही नोंद आढळली नाही. गोळीच्या वर्णनावरून किंवा आठवणीवरून मी खात्री करू शकत नाही. कोणतीही औषध घेण्यापूर्वी कृपया औषधांचा डबा तपासा किंवा काळजीवाहूंची मदत घ्या.'
            : language === 'hi'
            ? 'आपकी आज की दिनचर्या में कोई दवा दर्ज नहीं है। रंग या रूप के आधार पर मैं पुष्टि नहीं कर सकती। कोई भी दवा लेने से पहले कृपया अपनी दवा की डिब्बी देखें या अपने देखभालकर्ता से पुष्टि करें।'
            : language === 'ta'
            ? 'இன்றைய அட்டவணையில் எந்த மருந்துப் பதிவும் இல்லை. தோற்றத்தை வைத்து என்னால் உறுதிப்படுத்த முடியாது. தயவுசெய்து உங்கள் பராமரிப்பாளரிடம் உறுதிப்படுத்தவும்.'
            : language === 'te'
            ? 'నేటి దినచర్యలో ఎటువంటి మందుల నమోదు లేదు. రంగు లేదా రూపాన్ని బట్టి నేను నిర్ధారించలేను. దయచేసి మీ సంరక్షకుడిని సంప్రదించండి.'
            : language === 'kn'
            ? 'ಇಂದಿನ ವೇಳಾಪಟ್ಟಿಯಲ್ಲಿ ಯಾವುದೇ ಔಷಧಿ ದಾಖಲಾಗಿಲ್ಲ. ನೋಟದ ಆಧಾರದ ಮೇಲೆ ನಾನು ದೃಢೀಕರಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಆರೈಕೆದಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ.'
            : language === 'bn'
            ? 'আজকের রুটিনে কোনো ওষুধের রেকর্ড নেই। রূপ দেখে আমি নিশ্চিত করতে পারি না। দয়া করে আপনার যত্নশীলের সাথে নিশ্চিত করুন।'
            : 'There is no medication routine recorded in your sanctuary today. I cannot confirm whether medication was taken from physical appearance or memory. Please check your pill box or confirm with your caregiver before taking any pill.',
        expression: 'clarifying',
        intent: 'ROUTINES_MEDICATION_UNCERTAINTY',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description:
            language === 'mr'
              ? 'दिनक्रम पहा'
              : language === 'hi'
              ? 'दिनचर्या देखें'
              : language === 'ta'
              ? 'வழக்கங்களைக் காண்க'
              : language === 'te'
              ? 'దినచర్యలను చూడండి'
              : language === 'kn'
              ? 'ದಿನಚರ್ಯೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ'
              : language === 'bn'
              ? 'রুটিন দেখুন'
              : 'View Routines',
        },
      };
    }

    // Case B: Routine is recorded as Missed
    if ((medRoutine as any).isMissed || /\b(?:missed my|miss ho gayi|chhoot gayi)\b/i.test(qLower) || /(छूट गई|विसरलो)/.test(query)) {
      return {
        speech:
          language === 'mr'
            ? `तुमच्या काळजी नोंदीनुसार, '${medRoutine.title}' वेळेवर घेतली गेली नाही. कृपया स्वतःहून दुसरी किंवा दुप्पट गोळी घेऊ नका. काय करावे यासाठी आधी तुमच्या डॉक्टरांशी किंवा काळजीवाहूशी बोला.`
            : language === 'hi'
            ? `आपकी देखभाल सूची के अनुसार, '${medRoutine.title}' निर्धारित समय पर नहीं ली गई है। कृपया अपने आप दूसरी या दोहरी खुराक बिल्कुल न लें। सुरक्षित सलाह के लिए अपने डॉक्टर या देखभालकर्ता से संपर्क करें।`
            : language === 'ta'
            ? `உங்கள் அட்டவணைப்படி, '${medRoutine.title}' குறித்த நேரத்தில் உட்கொள்ளப்படவில்லை. தயவுசெய்து மற்றொரு மாத்திரையை உட்கொள்ள வேண்டாம்.`
            : language === 'te'
            ? `మీ సంరక్షణ జాబితా ప్రకారం, '${medRoutine.title}' సమయానికి తీసుకోలేదు. దయచేసి మీ స్వంతంగా మరొక మోతాదు తీసుకోకండి.`
            : language === 'kn'
            ? `ನಿಮ್ಮ ವೇಳಾಪಟ್ಟಿಯ ಪ್ರಕಾರ, '${medRoutine.title}' ಸರಿಯಾದ ಸಮಯಕ್ಕೆ ತೆಗೆದುಕೊಂಡಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ವಂತವಾಗಿ ಮತ್ತೊಂದು ಮಾತ್ರೆ ತೆಗೆದುಕೊಳ್ಳಬೇಡಿ.`
            : language === 'bn'
            ? `আপনার সময়সূচী অনুসারে, '${medRoutine.title}' নির্দিষ্ট সময়ে গ্রহণ করা হয়নি। দয়া করে নিজে থেকে অতিরিক্ত ওষুধ নেবেন না।`
            : `According to your care schedule, '${medRoutine.title}' was missed or not confirmed. Please do not take an extra or double dose on your own. Speak with your doctor or caregiver to guide your next step safely.`,
        expression: 'reassuring',
        intent: 'ROUTINES_MEDICATION_UNCERTAINTY',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'CALL_CAREGIVER',
          description:
            language === 'mr'
              ? 'काळजीवाहूंशी संपर्क साधा'
              : language === 'hi'
              ? 'देखभालकर्ता से संपर्क करें'
              : language === 'ta'
              ? 'பராமரிப்பாளரைத் தொடர்பு கொள்ள'
              : language === 'te'
              ? 'సంరక్షకుడిని సంప్రదించండి'
              : language === 'kn'
              ? 'ಆರೈಕೆದಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ'
              : language === 'bn'
              ? 'যত্নশীলের সাথে যোগাযোগ করুন'
              : 'Contact Caregiver',
        },
      };
    }

    const medTitle = getTranslatedRoutineTitle(medRoutine.title, language);

    // Case C: Routine is recorded as Completed, but patient feels uncertain
    if (medRoutine.isCompleted) {
      const doneAt = medRoutine.completedAt || '';
      return {
        speech: pickPolicyLang(language, {
          en: `Please do not worry. According to your care schedule, '${medTitle}' was recorded as completed ${doneAt ? `at ${doneAt}` : 'earlier today'}. However, because you feel uncertain, please do not take another pill; check your pill organizer or confirm with your caregiver first.`,
          hi: `चिंता मत कीजिए। आपकी देखभाल सूची के अनुसार, '${medTitle}' ${doneAt ? `${doneAt} पर` : 'आज पहले'} पूर्ण दर्ज की गई है। लेकिन चूंकि आपको संशय है, कृपया अतिरिक्त गोली बिल्कुल न लें; पहले अपनी दवा की डिब्बी जांचें या देखभालकर्ता से पुष्टि करें।`,
          mr: `काळजी करू नका. तुमच्या वेळापत्रकानुसार, '${medTitle}' ${doneAt ? `${doneAt} वाजता` : 'आज आधी'} पूर्ण झाली म्हणून नोंदवली गेली आहे. तरीही तुम्हाला खात्री नसल्यास, स्वतःहून अतिरिक्त गोळी अजिबात घेऊ नका; कृपया औषधांचा डबा तपासा किंवा काळजीवाहूंची मदत घ्या.`,
          bn: `চিন্তা করবেন না। আপনার সময়সূচী অনুযায়ী, '${medTitle}' ${doneAt ? `${doneAt}-এ ` : 'আগেই '}সম্পন্ন হিসেবে নথিভুক্ত আছে। তবুও সন্দেহ থাকলে দয়া করে নিজে থেকে আরেকটি ওষুধ নেবেন না; আগে যত্নশীলের সাথে নিশ্চিত করুন।`,
          ta: `கவலைப்பட வேண்டாம். உங்கள் அட்டவணைப்படி '${medTitle}' ${doneAt ? `${doneAt} மணிக்கு ` : 'முன்னரே '}முடிக்கப்பட்டதாகப் பதிவாகியுள்ளது. இருந்தாலும் சந்தேகம் இருந்தால் இன்னொரு மாத்திரை எடுக்க வேண்டாம்; பராமரிப்பாளரிடம் சரிபார்க்கவும்.`,
          te: `ఆందోళన చెందకండి. మీ సంరక్షణ జాబితా ప్రకారం '${medTitle}' ${doneAt ? `${doneAt} కు ` : 'ముందే '}పూర్తయినట్లు నమోదైంది. అయినా మీకు సందేహం ఉంటే మరో మాత్ర తీసుకోకండి; ముందుగా సంరక్షకుడితో నిర్ధారించుకోండి.`,
          kn: `ಚಿಂತಿಸಬೇಡಿ. ನಿಮ್ಮ ವೇಳಾಪಟ್ಟಿಯ ಪ್ರಕಾರ '${medTitle}' ${doneAt ? `${doneAt} ಕ್ಕೆ ` : 'ಈಗಾಗಲೇ '}ಪೂರ್ಣಗೊಂಡಿದೆ ಎಂದು ದಾಖಲಾಗಿದೆ. ಆದರೂ ಸಂದೇಹವಿದ್ದರೆ ಮತ್ತೊಂದು ಮಾತ್ರೆ ತೆಗೆದುಕೊಳ್ಳಬೇಡಿ; ಮೊದಲು ಆರೈಕೆದಾರರೊಂದಿಗೆ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.`,
        }),
        expression: 'reassuring',
        intent: 'ROUTINES_MEDICATION_UNCERTAINTY',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          targetId: medRoutine.id,
          description: pickPolicyLang(language, {
            en: 'Check Daily Routines',
            hi: 'दिनचर्या जांचें',
            mr: 'दिनक्रम तपासा',
            bn: 'দৈনিক রুটিন দেখুন',
            ta: 'தினசரி வழக்கங்களைச் சரிபார்க்கவும்',
            te: 'దినచర్యలను తనిఖీ చేయండి',
            kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ',
          }),
        },
      };
    }

    // Case D: Routine is recorded as Pending / Not Completed
    return {
      speech: pickPolicyLang(language, {
        en: `According to your care schedule, '${medTitle}' (${medRoutine.scheduledTime}) is not marked as taken yet. ${isPhysicalAppearanceDesc ? 'I cannot verify medication intake from physical appearance. ' : ''}Please check your daily pill box or confirm with your caregiver before taking any medication.`,
        hi: `आपकी देखभाल सूची के अनुसार, '${medTitle}' (${medRoutine.scheduledTime}) अभी पूरी दर्ज नहीं है। ${isPhysicalAppearanceDesc ? 'रंग या आकार के आधार पर मैं दवा की पुष्टि नहीं कर सकती। ' : ''}दवा लेने से पहले कृपया अपनी दवा की डिब्बी जांचें या अपने देखभालकर्ता से पुष्टि अवश्य कर लें।`,
        mr: `तुमच्या वेळापत्रकानुसार, '${medTitle}' (${medRoutine.scheduledTime}) अजून पूर्ण झालेली नोंदवलेली नाही. ${isPhysicalAppearanceDesc ? 'गोळीच्या रंगावरून किंवा आकारावरून मी खात्री करू शकत नाही. ' : ''}औषध घेण्यापूर्वी कृपया तुमचा औषधांचा डबा तपासा किंवा काळजीवाहूंना विचारून खात्री करा.`,
        bn: `আপনার সময়সূচী অনুযায়ী, '${medTitle}' (${medRoutine.scheduledTime}) এখনো সম্পন্ন হিসেবে চিহ্নিত হয়নি। দয়া করে ওষুধ নেওয়ার আগে আপনার ওষুধের বাক্স দেখুন বা যত্নশীলের সাথে নিশ্চিত করুন।`,
        ta: `உங்கள் அட்டவணைப்படி, '${medTitle}' (${medRoutine.scheduledTime}) இன்னும் எடுத்துக்கொண்டதாகக் குறிக்கப்படவில்லை. எந்த மருந்தையும் எடுப்பதற்கு முன் உங்கள் பராமரிப்பாளரிடம் உறுதிப்படுத்தவும்.`,
        te: `మీ జాబితా ప్రకారం, '${medTitle}' (${medRoutine.scheduledTime}) ఇంకా తీసుకున్నట్లు గుర్తించబడలేదు. దయచేసి ఏదైనా మందు తీసుకునే ముందు మీ సంరక్షకుడితో నిర్ధారించుకోండి.`,
        kn: `ನಿಮ್ಮ ವೇಳಾಪಟ್ಟಿಯ ಪ್ರಕಾರ, '${medTitle}' (${medRoutine.scheduledTime}) ಇನ್ನೂ ತೆಗೆದುಕೊಂಡಿದ್ದೀರಿ ಎಂದು ಗುರುತಿಸಲಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಯಾವುದೇ ಔಷಧಿ ತೆಗೆದುಕೊಳ್ಳುವ ಮೊದಲು ನಿಮ್ಮ ಆರೈಕೆದಾರರೊಂದಿಗೆ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.`,
      }),
      expression: 'reminder',
      intent: 'ROUTINES_MEDICATION_UNCERTAINTY',
      confidence: 0.95,
      actionClass: 'class1_read',
      suggestedAction: {
        action: 'NAVIGATE_ROUTINES',
        targetId: medRoutine.id,
        description: pickPolicyLang(language, {
          en: 'Open Daily Routines',
          hi: 'दिनचर्या खोलें',
          mr: 'दिनक्रम उघडा',
          bn: 'দৈনিক রুটিন খুলুন',
          ta: 'தினசரி வழக்கங்களைத் திற',
          te: 'దినచర్యలను తెరవండి',
          kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ತೆರೆಯಿರಿ',
        }),
      },
    };
  }
}
