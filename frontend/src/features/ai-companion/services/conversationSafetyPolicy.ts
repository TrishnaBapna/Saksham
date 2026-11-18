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
        'हार्ट अटॅक',
        'श्वास घेता येत नाही',
        'दम लागतोय',
        'श्वास कोंडतोय',
        'बेशुद्ध',
        'शुद्ध हरपली',
        'जागे होत नाहीत',
        'रक्तस्त्राव',
        'खूप रक्त वाहतंय',
        'गंभीर जखम',
        'पडलो',
        'पडले',
        'खाली पडलो',
        'तातडीची मदत',
        'इमर्जन्सी',
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
    // English negation
    if (/\b(?:no|not|neither|without|never|denies|denied|ruled out|negative for|zero|don't have|dont have|did not|didn't|do not)\b/i.test(q)) {
      return true;
    }
    // Hindi & Marathi negation
    if (/(?:नहीं|नाही|ना|नको|कोई नहीं|बिना|अजिबात नाही)/i.test(q)) {
      return true;
    }
    return false;
  }

  /**
   * Evaluates if query contains urgent distress, chest pain, fall, or life-threatening symptoms.
   */
  public static checkEmergencyDistress(query: string, language = 'en'): ConversationResult | null {
    const q = query.trim().toLowerCase();

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
      /\b(change\s*(?:my\s*)?(?:medication|meds?|dose)|double\s*(?:my\s*)?dose|increas\s*(?:my\s*)?dose|increas\s*(?:my\s*)?pill|stop\s*(?:all\s*)?(?:my\s*)?med|stop\s*(?:all\s*)?(?:my\s*)?pill|halv\s*(?:my\s*)?dose|halv\s*(?:my\s*)?pill|reduc\s*(?:my\s*)?dose|skip\s*(?:my\s*)?dose|skip\s*(?:my\s*)?med)\b/i,
      // Common misspellings, flexible fillers, & abbreviations
      /\b(doubel|incres|decres|increas|decreas|chang|alter|stop|halv|skip)\s*(?:all\s*)?(?:my\s*)?(?:medicine\s*|medications?\s*|meds?\s*|pill\s*|pills\s*|tablets?\s*|rx\s*)?(?:dose|dosage|prescription|rx|meds?|pills?|tablets?|medications?)\b/i,
      // Direct abbreviations & clinical modifications
      /\b(alter\s*(?:my\s*)?rx|change\s*(?:my\s*)?rx|stop\s*(?:all\s*)?(?:my\s*)?(?:meds?|tabs?|pills?)|alter\s*(?:my\s*)?(?:meds?|tabs?|pills?)|cancle\s*(?:my\s*)?(?:meds?|pills?|rx)|prescrib|medecin|medisin|medicne)\b/i,
      // Phrased instructions
      /\b(halve my (?:pills|tablets|medication)|give me sleeping pills|write me a prescription|can i take two pills|increase my (?:pills|dosage)|stop my (?:medication|pills))\b/i,
      // Mixed English / Hindi terms
      /(दवा\s*बदल|दवा\s*की\s*खुराक|खुराक\s*बदल|दवा\s*बंद|दवा\s*लिखो|गोली\s*बंद|डोज\s*बढ़ा|डोज़\s*बदल|dawa\s*badal|dawa\s*change|dose\s*badhao|goli\s*band)/i,
      // Regional languages (Marathi, Tamil, Telugu, Bengali)
      /(औषध\s*बदला|औषध\s*बंद|औषधाची\s*मात्रा|மருந்து\s*மாற்று|மందులు\s*మార్చండి|ঔষধ\s*পরিবর্তন)/i,
    ];

    if (
      prescriptionKeywords.some((kw) => q.includes(kw)) ||
      prescriptionPatterns.some((pattern) => pattern.test(q))
    ) {
      const isHi = language === 'hi';
      return {
        speech: isHi
          ? 'मैं चिकित्सीय सलाह या दवा में बदलाव का सुझाव नहीं दे सकती। मैं दवाओं के नुस्खे या खुराक में बदलाव नहीं कर सकती। कृपया अपने डॉक्टर या देखभालकर्ता से परामर्श लें।'
          : 'I cannot provide medical advice and cannot modify medical prescriptions or alter drug dosages. Please consult your doctor or primary caregiver for any prescription or medication changes.',
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
      /\b(diagnose|diagnos|am i senile|do i have (?:alzheimer|dementia|parkinson)|check my symptoms|what disease do i have|what illness do i have|medical diagnosis)\b/i,
      /(बीमारी\s*का\s*निदान|रोग\s*का\s*निदान|क्या\s*मुझे\s*अल्जाइमर|बीमारी\s*बताओ|लक्षण\s*बताओ)/i,
      /(माझा\s*आजारी\s*काय\s*आहे|रोगनिदान)/i,
    ];

    if (
      diagnosisKeywords.some((kw) => q.includes(kw)) ||
      diagnosisPatterns.some((pattern) => pattern.test(q))
    ) {
      const isHi = language === 'hi';
      return {
        speech: isHi
          ? 'मैं एक साथी के रूप में आपकी दिनचर्या और याददाश्त में मदद करती हूँ। मैं चिकित्सीय निदान नहीं कर सकती। अपने स्वास्थ्य के बारे में सटीक जानकारी के लिए कृपया अपने चिकित्सक से संपर्क करें।'
          : 'I am here to assist with daily routines and peaceful memories, but I cannot make clinical diagnoses. Please consult a qualified medical professional for health evaluations.',
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
      const isHi = language === 'hi';
      return {
        speech: isHi
          ? 'आपके पास केवल आपकी व्यक्तिगत देखभाल sanctuary तक पहुँच है। अन्य मरीजों के रिकॉर्ड या डॉक्टर की अनुमतियों में बदलाव केवल अधिकृत व्यवस्थापक (Admin) द्वारा ही संभव है।'
          : 'You are viewing your private, protected care sanctuary. Administrative settings, doctor reassignments, and other patient records can only be managed by authorized administrators.',
        expression: 'clarifying',
        intent: 'RESTRICTED_ACTION',
        confidence: 0.95,
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

    const isHi = language === 'hi';
    const isMr = language === 'mr';
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

    if (!medRoutine) {
      return {
        speech: isMr
          ? 'तुमच्या आजच्या वेळापत्रकात औषधांची कोणतीही नोंद आढळली नाही. खात्री नसल्यास कृपया तुमच्या काळजीवाहूंची मदत घ्या.'
          : isHi
          ? 'आपकी आज की दिनचर्या में कोई विशेष दवा दर्ज नहीं है। कृपया अपनी देखभाल डायरी या डॉक्टर की पर्ची की समीक्षा करें।'
          : 'You have no scheduled medication routine recorded in your sanctuary today. Please check with your caregiver if you are unsure.',
        expression: 'reassuring',
        intent: 'ROUTINES_MEDICATION_STATUS',
        confidence: 0.9,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: isMr ? 'दिनक्रम पहा' : isHi ? 'दिनचर्या देखें' : 'View Routines',
        },
      };
    }

    if (medRoutine.isCompleted) {
      return {
        speech: isMr
          ? `होय! तुमच्या नोंदीनुसार, तुम्ही '${medRoutine.title}' ${medRoutine.completedAt || 'आधीच'} पूर्ण केली आहे. तुम्ही स्वतःची छान काळजी घेत आहात!`
          : isHi
          ? `हाँ! आपकी देखभाल सूची के अनुसार, आपने '${medRoutine.title}' ${medRoutine.completedAt || 'आज सुबह'} पूरी कर ली है। क्या आपने दवा ले ली है? आप अपना बहुत अच्छा ध्यान रख रहे हैं!`
          : `Yes! According to your care schedule, you completed '${medRoutine.title}' ${medRoutine.completedAt ? `at ${medRoutine.completedAt}` : 'earlier today'}. Have you taken your medicine? You are taking wonderful care of yourself!`,
        expression: 'confirming',
        intent: 'ROUTINES_MEDICATION_STATUS',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          targetId: medRoutine.id,
          description: isMr ? 'दिनक्रम पहा' : isHi ? 'दिनचर्या देखें' : 'View Routines',
        },
      };
    } else {
      return {
        speech: isMr
          ? `अजून नाही. तुमची औषधाची वेळ '${medRoutine.title}' (${medRoutine.scheduledTime}) अजून पूर्ण झालेली नाही. चला, आपण एकत्र दिनक्रम पाहूया.`
          : isHi
          ? `अभी नहीं। आपकी दवा दिनचर्या '${medRoutine.title}' ${medRoutine.scheduledTime} के लिए निर्धारित है और लंबित है। क्या हम दिनचर्या खोलकर इसे देखें?`
          : `Not yet. Your medication routine '${medRoutine.title}' is scheduled for ${medRoutine.scheduledTime} and is currently marked as pending. Let's open it together so you can review it gently.`,
        expression: 'reminder',
        intent: 'ROUTINES_MEDICATION_STATUS',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          targetId: medRoutine.id,
          description: isMr ? 'दिनक्रम उघडा' : isHi ? 'दिनचर्या खोलें' : 'Open Daily Routines',
        },
      };
    }
  }

  /**
   * Strictly blocks double-dose suggestions and enforces clinical safety.
   */
  public static handleMedicationDoubleDoseGuard(language = 'en'): ConversationResult {
    const isHi = language === 'hi';
    const isMr = language === 'mr';
    return {
      speech: isMr
        ? 'कृपया तुमच्या डॉक्टरांशी किंवा काळजीवाहूशी बोलल्याशिवाय दुसरी गोळी अजिबात घेऊ नका. अतिरिक्त औषध घेणे आरोग्यासाठी धोकादायक ठरू शकते. मी तुमच्या काळजीवाहूंशी संपर्क साधू का?'
        : isHi
        ? 'कृपया अपने डॉक्टर या देखभालकर्ता से परामर्श किए बिना दूसरी खुराक बिल्कुल न लें। अतिरिक्त दवा लेना हानिकारक हो सकता है। क्या मैं आपकी देखभालकर्ता से बात करने में मदद करूँ?'
        : 'Please do not take another pill or extra dose without speaking to your doctor or caregiver. Taking an additional dose can be dangerous. Always confirm with your clinician or primary caregiver before taking extra medication.',
      expression: 'reassuring',
      intent: 'MEDICATION_DOUBLE_DOSE_GUARD',
      confidence: 0.99,
      actionClass: 'class4_restricted',
      suggestedAction: {
        action: 'CALL_CAREGIVER',
        description: isMr ? 'काळजीवाहूंशी संपर्क साधा' : isHi ? 'देखभालकर्ता से संपर्क करें' : 'Contact Caregiver',
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
    const isHi = language === 'hi';
    const isMr = language === 'mr';
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
        speech: isMr
          ? 'तुमच्या आजच्या वेळापत्रकात औषधांची कोणतीही नोंद आढळली नाही. गोळीच्या वर्णनावरून किंवा आठवणीवरून मी खात्री करू शकत नाही. कोणतीही औषध घेण्यापूर्वी कृपया औषधांचा डबा तपासा किंवा काळजीवाहूंची मदत घ्या.'
          : isHi
          ? 'आपकी आज की दिनचर्या में कोई दवा दर्ज नहीं है। रंग या रूप के आधार पर मैं पुष्टि नहीं कर सकती। कोई भी दवा लेने से पहले कृपया अपनी दवा की डिब्बी देखें या अपने देखभालकर्ता से पुष्टि करें।'
          : 'There is no medication routine recorded in your sanctuary today. I cannot confirm whether medication was taken from physical appearance or memory. Please check your pill box or confirm with your caregiver before taking any pill.',
        expression: 'clarifying',
        intent: 'ROUTINES_MEDICATION_UNCERTAINTY',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          description: isMr ? 'दिनक्रम पहा' : isHi ? 'दिनचर्या देखें' : 'View Routines',
        },
      };
    }

    // Case B: Routine is recorded as Missed
    if ((medRoutine as any).isMissed || /\b(?:missed my|miss ho gayi|chhoot gayi)\b/i.test(qLower) || /(छूट गई|विसरलो)/.test(query)) {
      return {
        speech: isMr
          ? `तुमच्या काळजी नोंदीनुसार, '${medRoutine.title}' वेळेवर घेतली गेली नाही. कृपया स्वतःहून दुसरी किंवा दुप्पट गोळी घेऊ नका. काय करावे यासाठी आधी तुमच्या डॉक्टरांशी किंवा काळजीवाहूशी बोला.`
          : isHi
          ? `आपकी देखभाल सूची के अनुसार, '${medRoutine.title}' निर्धारित समय पर नहीं ली गई है। कृपया अपने आप दूसरी या दोहरी खुराक बिल्कुल न लें। सुरक्षित सलाह के लिए अपने डॉक्टर या देखभालकर्ता से संपर्क करें।`
          : `According to your care schedule, '${medRoutine.title}' was missed or not confirmed. Please do not take an extra or double dose on your own. Speak with your doctor or caregiver to guide your next step safely.`,
        expression: 'reassuring',
        intent: 'ROUTINES_MEDICATION_UNCERTAINTY',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'CALL_CAREGIVER',
          description: isMr ? 'काळजीवाहूंशी संपर्क साधा' : isHi ? 'देखभालकर्ता से संपर्क करें' : 'Contact Caregiver',
        },
      };
    }

    // Case C: Routine is recorded as Completed, but patient feels uncertain
    if (medRoutine.isCompleted) {
      return {
        speech: isMr
          ? `काळजी करू नका. तुमच्या वेळापत्रकानुसार, '${medRoutine.title}' ${medRoutine.completedAt ? `${medRoutine.completedAt} वाजता` : 'आज आधी'} पूर्ण झाली म्हणून नोंदवली गेली आहे. तरीही तुम्हाला खात्री नसल्यास, स्वतःहून अतिरिक्त गोळी अजिबात घेऊ नका; कृपया औषधांचा डबा तपासा किंवा काळजीवाहूंची मदत घ्या.`
          : isHi
          ? `चिंता मत कीजिए। आपकी देखभाल सूची के अनुसार, '${medRoutine.title}' ${medRoutine.completedAt ? `${medRoutine.completedAt} पर` : 'आज पहले'} पूर्ण दर्ज की गई है। लेकिन चूंकि आपको संशय है, कृपया अतिरिक्त गोली बिल्कुल न लें; पहले अपनी दवा की डिब्बी जांचें या देखभालकर्ता से पुष्टि करें।`
          : `Please do not worry. According to your care schedule, '${medRoutine.title}' was recorded as completed ${medRoutine.completedAt ? `at ${medRoutine.completedAt}` : 'earlier today'}. However, because you feel uncertain, please do not take another pill; check your pill organizer or confirm with your caregiver first.`,
        expression: 'reassuring',
        intent: 'ROUTINES_MEDICATION_UNCERTAINTY',
        confidence: 0.95,
        actionClass: 'class1_read',
        suggestedAction: {
          action: 'NAVIGATE_ROUTINES',
          targetId: medRoutine.id,
          description: isMr ? 'दिनक्रम तपासा' : isHi ? 'दिनचर्या जांचें' : 'Check Daily Routines',
        },
      };
    }

    // Case D: Routine is recorded as Pending / Not Completed
    return {
      speech: isMr
        ? `तुमच्या वेळापत्रकानुसार, '${medRoutine.title}' (${medRoutine.scheduledTime}) अजून पूर्ण झालेली नोंदवलेली नाही. ${isPhysicalAppearanceDesc ? 'गोळीच्या रंगावरून किंवा आकारावरून मी खात्री करू शकत नाही. ' : ''}औषध घेण्यापूर्वी कृपया तुमचा औषधांचा डबा तपासा किंवा काळजीवाहूंना विचारून खात्री करा.`
        : isHi
        ? `आपकी देखभाल सूची के अनुसार, '${medRoutine.title}' (${medRoutine.scheduledTime}) अभी पूरी दर्ज नहीं है। ${isPhysicalAppearanceDesc ? 'रंग या आकार के आधार पर मैं दवा की पुष्टि नहीं कर सकती। ' : ''}दवा लेने से पहले कृपया अपनी दवा की डिब्बी जांचें या अपने देखभालकर्ता से पुष्टि अवश्य कर लें।`
        : `According to your care schedule, '${medRoutine.title}' (${medRoutine.scheduledTime}) is not marked as taken yet. ${isPhysicalAppearanceDesc ? 'I cannot verify medication intake from physical appearance. ' : ''}Please check your daily pill box or confirm with your caregiver before taking any medication.`,
      expression: 'reminder',
      intent: 'ROUTINES_MEDICATION_UNCERTAINTY',
      confidence: 0.95,
      actionClass: 'class1_read',
      suggestedAction: {
        action: 'NAVIGATE_ROUTINES',
        targetId: medRoutine.id,
        description: isMr ? 'दिनक्रम उघडा' : isHi ? 'दिनचर्या खोलें' : 'Open Daily Routines',
      },
    };
  }
}
