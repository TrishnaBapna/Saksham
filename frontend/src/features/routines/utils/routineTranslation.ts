/**
 * SAKSHAM — Phase 3.21 Remediation: Routine Translation Helper
 * Preserves Category C user-created routine titles & custom recall cues verbatim while
 * translating system-provided routine templates into the active selected language.
 */

import { RoutineItem } from '../../../types/index.js';
import { translate, SupportedLanguage } from '../../../i18n/index.js';

export const ROUTINE_TITLE_MAP: Record<string, string> = {
  'routine-01': 'routines.title_routine_01',
  'routine-02': 'routines.title_routine_02',
  'routine-03': 'routines.title_routine_03',
  'routine-04': 'routines.title_routine_04',
  'routine-05': 'routines.title_routine_05',
  'routine-06': 'routines.title_routine_06',
  'routine-07': 'routines.title_routine_07',
  'routine-08': 'routines.title_routine_08',
};

// Title match lookup for instances or cloned tasks that may have custom/generated IDs
export const ROUTINE_DEFAULT_TITLES_TO_KEY: Record<string, string> = {
  'morning herbal tea & gentle hydration': 'routines.title_routine_01',
  'morning clinician-prescribed medication': 'routines.title_routine_02',
  'buttoning shirt & morning dressing': 'routines.title_routine_03',
  'antioxidant breakfast (berries & oatmeal)': 'routines.title_routine_04',
  '15-min speech loudness drill (ahhh)': 'routines.title_routine_05',
  'nutritious lunch & fiber salad': 'routines.title_routine_06',
  'assisted garden walk & motor steps': 'routines.title_routine_07',
  'mind clinic cognitive game practice': 'routines.title_routine_08',
};

const SEEDED_RECALL_PREFIX_BY_ID: Record<string, { prefix: string; seededQuestion: string }> = {
  'routine-01': {
    prefix: 'routines.r01',
    seededQuestion: 'You woke up at 08:00 AM. What warm drink gently hydrates your body before your morning activities?',
  },
  'routine-02': {
    prefix: 'routines.r02',
    seededQuestion: 'It is 08:30 AM before breakfast. What authorized medicine needs to be taken now with a sip of water?',
  },
  'routine-03': {
    prefix: 'routines.r03',
    seededQuestion: 'It is 09:00 AM. What fine motor activity prepares you for a fresh day?',
  },
  'routine-04': {
    prefix: 'routines.r04',
    seededQuestion: 'It is 09:30 AM. What breakfast supports dopamine cells without blocking medication?',
  },
  'routine-05': {
    prefix: 'routines.r05',
    seededQuestion: "It's 11:00 AM mid-morning. What vocal exercise helps maintain clear speech volume?",
  },
  'routine-06': {
    prefix: 'routines.r06',
    seededQuestion: 'It is 01:00 PM. What nutritious lunch keeps your energy and digestive motility smooth?',
  },
  'routine-07': {
    prefix: 'routines.r07',
    seededQuestion: 'It is 04:30 PM. What outdoor exercise promotes motor rhythm and balance?',
  },
  'routine-08': {
    prefix: 'routines.r08',
    seededQuestion: 'It is 06:00 PM. What cognitive exercise stimulates synaptic recall?',
  },
};

function safeTranslate(
  t: (key: string, params?: Record<string, any>) => string,
  key: string,
  fallback: string,
  params?: Record<string, any>
): string {
  const translated = t(key, params);
  return translated && translated !== key ? translated : fallback;
}

function resolveTranslator(
  tOrLang: ((key: string, params?: Record<string, any>) => string) | string | undefined,
  language?: string
): (key: string, params?: Record<string, any>) => string {
  if (typeof tOrLang === 'function') {
    return tOrLang;
  }
  const lang = ((typeof tOrLang === 'string' ? tOrLang : language) || 'en')
    .toLowerCase()
    .split(/[-_]/)[0];
  return (key: string, params?: Record<string, any>) =>
    translate(lang as SupportedLanguage, key, params);
}

/**
 * Returns the localized routine title for system templates, or preserves user-created titles verbatim.
 */
export function getTranslatedRoutineTitle(
  routine: { id?: string; title?: string } | string | undefined | null,
  tOrLang: ((key: string, params?: Record<string, any>) => string) | string,
  language?: string
): string {
  if (!routine) return '';
  const t = resolveTranslator(tOrLang, language);
  const title = typeof routine === 'string' ? routine : routine.title || '';
  const id = typeof routine === 'object' && routine ? routine.id : undefined;

  // 1. Direct ID lookup in pre-seeded routine templates
  if (id && ROUTINE_TITLE_MAP[id]) {
    const translated = t(ROUTINE_TITLE_MAP[id]);
    if (translated && translated !== ROUTINE_TITLE_MAP[id]) {
      return translated;
    }
  }

  // 2. Direct title match in default routine templates (case-insensitive)
  const lowerTitle = title.trim().toLowerCase();
  if (ROUTINE_DEFAULT_TITLES_TO_KEY[lowerTitle]) {
    const key = ROUTINE_DEFAULT_TITLES_TO_KEY[lowerTitle];
    const translated = t(key);
    if (translated && translated !== key) {
      return translated;
    }
  }

  // 3. Category C user preservation: if user created a custom routine, preserve exactly as entered
  return title;
}

/**
 * Translates standard routine categories (wellness, medication, etc.) into the active language.
 */
export function getTranslatedRoutineCategory(
  category: string | undefined | null,
  tOrLang: ((key: string, params?: Record<string, any>) => string) | string
): string {
  if (!category) return '';
  const t = resolveTranslator(tOrLang);
  const norm = category.trim().toLowerCase();
  const key = `routines.cat_${norm}`;
  return safeTranslate(t, key, category);
}

/**
 * Translates seeded recall questions, options, and 3-tier hints when matching system defaults,
 * while preserving user-entered or test-mocked custom text verbatim.
 */
export function getTranslatedRoutineRecallContent(
  routine: RoutineItem,
  t: (key: string, params?: Record<string, any>) => string,
  language?: string
): {
  question: string;
  options: string[];
  hint1: string;
  hint2: string;
  hint3: string;
} {
  const localizedTitle = getTranslatedRoutineTitle(routine, t, language);
  const localizedCat = getTranslatedRoutineCategory(routine.category, t);
  const seeded = routine.id ? SEEDED_RECALL_PREFIX_BY_ID[routine.id] : undefined;
  const isUntouchedSeededRecall =
    Boolean(seeded) && routine.recallQuestion?.trim() === seeded!.seededQuestion.trim();

  if (isUntouchedSeededRecall && seeded) {
    const p = seeded.prefix;
    return {
      question: safeTranslate(t, `${p}_question`, routine.recallQuestion || ''),
      options: (routine.recallOptions || []).map((opt, idx) =>
        safeTranslate(t, `${p}_opt_${idx}`, opt)
      ),
      hint1: safeTranslate(t, `${p}_hint_1`, routine.recallCues?.hint1 || ''),
      hint2: safeTranslate(t, `${p}_hint_2`, routine.recallCues?.hint2 || ''),
      hint3: safeTranslate(t, `${p}_hint_3`, routine.recallCues?.hint3 || localizedTitle),
    };
  }

  const question =
    routine.recallQuestion ||
    safeTranslate(
      t,
      'recall.fallback_question',
      `It is ${routine.scheduledTime}. What ${routine.category} activity prepares you for a fresh day?`,
      { time: routine.scheduledTime, category: localizedCat.toLowerCase() }
    );

  const options = routine.recallOptions || [
    localizedTitle,
    safeTranslate(t, 'recall.fallback_opt_1', 'Running outdoors without shoes'),
    safeTranslate(t, 'recall.fallback_opt_2', 'Leaving clothes untouched'),
  ];

  const hint1 =
    routine.recallCues?.hint1 ||
    safeTranslate(
      t,
      'recall.fallback_hint_1',
      `Taking 15-20 calm minutes for ${routine.title.toLowerCase()} keeps coordination sharp.`,
      { title: localizedTitle }
    );

  const hint2 =
    routine.recallCues?.hint2 ||
    safeTranslate(
      t,
      'recall.fallback_hint_2',
      'Look around your home or bedside table for the related items.'
    );

  const hint3 = routine.recallCues?.hint3 || localizedTitle;

  return { question, options, hint1, hint2, hint3 };
}

const SEEDED_DESCRIPTIONS: Record<string, { en: string; hi: string; mr: string; bn: string; ta: string; te: string; kn: string }> = {
  'routine-01': {
    en: 'Taking warm herbal tea gently hydrates your stomach and prepares for your morning activities.',
    hi: 'गुनगुनी हर्बल चाय पेट को आराम से हाइड्रेट करती है और सुबह की गतिविधियों के लिए तैयार करती है।',
    mr: 'कोमट हर्बल चहा पोटाला हलकेच हायड्रेट करतो आणि सकाळच्या कामांसाठी तयार करतो.',
    bn: 'উষ্ণ ভেষজ চা পেটকে আলতোভাবে আর্দ্র রাখে এবং সকালের কাজের জন্য প্রস্তুত করে।',
    ta: 'வெதுவெதுப்பான மூலிகை தேநீர் வயிற்றை இதமாக்கி காலைச் செயல்பாடுகளுக்குத் தயார்படுத்துகிறது.',
    te: 'గోరువెచ్చని హెర్బల్ టీ కడుపుకు హాయినిచ్చి ఉదయపు పనులకు సిద్ధం చేస్తుంది.',
    kn: 'ಬೆಚ್ಚಗಿನ ಹರ್ಬಲ್ ಚಹಾ ಹೊಟ್ಟೆಯನ್ನು ಹಿತವಾಗಿ ತಂಪಾಗಿರಿಸಿ ಬೆಳಗಿನ ಚಟುವಟಿಕೆಗಳಿಗೆ ಸಿದ್ಧಪಡಿಸುತ್ತದೆ.',
  },
  'routine-02': {
    en: 'Authorized morning medication taken on an empty stomach 30-45 minutes before food as directed by your clinician.',
    hi: 'चिकित्सक के निर्देशानुसार भोजन से 30-45 मिनट पहले खाली पेट ली जाने वाली निर्धारित सुबह की दवा।',
    mr: 'डॉक्टरांच्या सूचनेनुसार जेवणापूर्वी ३०-४५ मिनिटे रिकाम्या पोटी घ्यायचे सकाळचे निर्धारित औषध.',
    bn: 'চিকিৎসকের নির্দেশ অনুযায়ী খাবারের ৩০-৪৫ মিনিট আগে খালি পেটে খাওয়ার অনুমোদিত সকালের ওষুধ।',
    ta: 'உங்கள் மருத்துவரின் அறிவுறுத்தல்படி உணவுக்கு 30-45 நிமிடங்களுக்கு முன் வெறும் வயிற்றில் எடுத்துக்கொள்ளும் காலை மருந்து.',
    te: 'మీ వైద్యుల సూచన ప్రకారం ఆహారానికి 30-45 నిమిషాల ముందు ఖాళీ కడుపుతో తీసుకునే ఉదయపు మందు.',
    kn: 'ನಿಮ್ಮ ವೈದ್ಯರ ಸೂಚನೆಯಂತೆ ಆಹಾರಕ್ಕೂ 30-45 ನಿಮಿಷಗಳ ಮೊದಲು ಖಾಲಿ ಹೊಟ್ಟೆಯಲ್ಲಿ ತೆಗೆದುಕೊಳ್ಳುವ ಬೆಳಗಿನ ಔಷಧಿ.',
  },
  'routine-03': {
    en: 'Taking 15-20 calm minutes for buttoning keeps finger coordination sharp.',
    hi: 'बटन लगाने में 15-20 शांत मिनट लगाने से उंगलियों का तालमेल अच्छा बना रहता है।',
    mr: 'बटणे लावण्यासाठी १५-२० मिनिटे शांतपणे घेतल्याने बोटांचा समन्वय चांगला राहतो.',
    bn: 'বোতাম লাগাতে ১৫-২০ মিনিট শান্ত সময় নিলে আঙুলের সমন্বয় সচল থাকে।',
    ta: 'பொத்தான்களைப் போட 15-20 நிமிடங்கள் அமைதியாக எடுத்துக்கொள்வது விரல் ஒருங்கிணைப்பைச் சீராக வைத்திருக்கும்.',
    te: 'బటన్లు పెట్టుకోవడానికి 15-20 నిమిషాలు ప్రశాంతంగా కేటాయించడం వల్ల వేళ్ల సమన్వయం చురుకుగా ఉంటుంది.',
    kn: 'ಬಟನ್ ಹಾಕಲು 15-20 ನಿಮಿಷ ಶಾಂತವಾಗಿ ತೆಗೆದುಕೊಳ್ಳುವುದರಿಂದ ಬೆರಳುಗಳ ಸಮನ್ವಯ ಚುರುಕಾಗಿರುತ್ತದೆ.',
  },
  'routine-04': {
    en: 'Berries provide neural antioxidants while keeping heavy protein for dinner.',
    hi: 'बेरीज़ मस्तिष्क को एंटीऑक्सीडेंट देती हैं और भारी प्रोटीन रात के भोजन के लिए रखा जाता है।',
    mr: 'बेरी मेंदूसाठी अँटिऑक्सिडंट्स देतात, तर जड प्रथिने रात्रीच्या जेवणासाठी ठेवली जातात.',
    bn: 'বেরি স্নায়ুর জন্য অ্যান্টিঅক্সিডেন্ট জোগায় এবং ভারী প্রোটিন রাতের খাবারের জন্য রাখা হয়।',
    ta: 'பெர்ரி பழங்கள் மூளைக்கு ஆன்டிஆக்ஸிடன்ட்களைத் தருகின்றன; கனமான புரதம் இரவு உணவிற்கு ஒதுக்கப்படுகிறது.',
    te: 'బెర్రీలు మెదడుకు యాంటీఆక్సిడెంట్లను అందిస్తాయి; భారీ ప్రోటీన్ ఆహారం రాత్రి భోజనానికి ఉంచబడుతుంది.',
    kn: 'ಬೆರ್ರಿಗಳು ಮೆದುಳಿಗೆ ಆಂಟಿಆಕ್ಸಿಡೆಂಟ್‌ಗಳನ್ನು ನೀಡುತ್ತವೆ ಮತ್ತು ಭಾರೀ ಪ್ರೋಟೀನ್ ರಾತ್ರಿ ಊಟಕ್ಕೆ ಇಡಲಾಗುತ್ತದೆ.',
  },
  'routine-05': {
    en: 'Loud, clear vowel sounds strengthen vocal cords against Parkinsonian vocal fade.',
    hi: 'स्पष्ट और ऊँचे स्वर बोलने से आवाज़ की मांसपेशियाँ मजबूत रहती हैं।',
    mr: 'मोठे आणि स्पष्ट स्वर उच्चारल्याने आवाजाची क्षमता व स्वरतंतू मजबूत राहतात.',
    bn: 'স্পষ্ট ও জোরালো স্বরধ্বনি অনুশীলন কণ্ঠস্বরের শক্তি ধরে রাখতে সাহায্য করে।',
    ta: 'உரத்த, தெளிவான உயிரொலிப் பயிற்சி குரல் நாண்களை வலுப்படுத்திப் பேச்சுத் தெளிவைக் காக்கும்.',
    te: 'బిగ్గరగా, స్పష్టంగా అచ్చులు పలకడం వల్ల స్వర తంతువులు బలపడతాయి.',
    kn: 'ಜೋರಾಗಿ ಮತ್ತು ಸ್ಪಷ್ಟವಾಗಿ ಸ್ವರಗಳನ್ನು ಉಚ್ಚರಿಸುವುದು ಧ್ವನಿ ತಂತುಗಳನ್ನು ಬಲಪಡಿಸುತ್ತದೆ.',
  },
  'routine-06': {
    en: 'Fiber and hydration optimize digestive motility and dopamine medication absorption.',
    hi: 'फ़ाइबर और पानी पाचन गति और दवा के अवशोषण को बेहतर बनाते हैं।',
    mr: 'फायबर आणि पाणी पचनक्रिया सुधारतात व औषधाचे शोषण योग्य ठेवतात.',
    bn: 'ফাইবার ও জল হজমশক্তি এবং ওষুধের কার্যকারিতা ভালো রাখে।',
    ta: 'நார்ச்சத்தும் தண்ணீரும் செரிமானத்தையும் மருந்து உட்கிரகித்தலையும் சீராக்குகின்றன.',
    te: 'పీచు పదార్థం మరియు నీరు జీర్ణక్రియను, మందుల శోషణను మెరుగుపరుస్తాయి.',
    kn: 'ನಾರಿನಂಶ ಮತ್ತು ನೀರು ಜೀರ್ಣಕ್ರಿಯೆ ಹಾಗೂ ಔಷಧಿ ಹೀರಿಕೊಳ್ಳುವಿಕೆಯನ್ನು ಉತ್ತಮಗೊಳಿಸುತ್ತವೆ.',
  },
  'routine-07': {
    en: 'Taking conscious big steps and swinging arms counteracts festination and stiffness.',
    hi: 'जागरूक होकर बड़े कदम बढ़ाने और हाथ हिलाने से जकड़न कम होती है।',
    mr: 'जाणीवपूर्वक मोठी पावले टाकणे व हात हलवणे यामुळे चालण्यातील ताठरपणा कमी होतो.',
    bn: 'সচেতনভাবে বড় পদক্ষেপ নেওয়া ও হাত দোলানো জড়তা কমাতে সাহায্য করে।',
    ta: 'பெரிய அடிகள் எடுத்து வைத்துக் கைகளை வீசி நடப்பது விறைப்புத்தன்மையைக் குறைக்கும்.',
    te: 'పెద్ద అడుగులు వేస్తూ చేతులు ఊపడం వల్ల కదలికల బిగుతు తగ్గుతుంది.',
    kn: 'ದೊಡ್ಡ ಹೆಜ್ಜೆಗಳನ್ನು ಇಡುತ್ತಾ ಕೈಗಳನ್ನು ಬೀಸಿ ನಡೆಯುವುದರಿಂದ ಬಿಗಿತ ಕಡಿಮೆಯಾಗುತ್ತದೆ.',
  },
  'routine-08': {
    en: 'Daily 10-minute cognitive games strengthen working memory pathways.',
    hi: 'रोज़ाना 10 मिनट के दिमागी खेल स्मृति मार्गों को मजबूत रखते हैं।',
    mr: 'दररोज १० मिनिटे मेंदूचे खेळ खेळल्याने स्मरणशक्ती मजबूत राहते.',
    bn: 'প্রতিদিন ১০ মিনিটের মস্তিষ্কের খেলা কার্যকর স্মৃতিপথকে শক্তিশালী করে।',
    ta: 'தினமும் 10 நிமிட அறிவாற்றல் விளையாட்டுகள் நினைவாற்றல் பாதைகளை வலுப்படுத்தும்.',
    te: 'రోజూ 10 నిమిషాల ఆలోచనాత్మక ఆటలు జ్ఞాపకశక్తి మార్గాలను బలోపేతం చేస్తాయి.',
    kn: 'ಪ್ರತಿದಿನ 10 ನಿಮಿಷಗಳ ಮೆದುಳಿನ ಆಟಗಳು ಸ್ಮರಣಶಕ್ತಿ ಮಾರ್ಗಗಳನ್ನು ಬಲಪಡಿಸುತ್ತವೆ.',
  },
};

const SEEDED_STEPS_TRANSLATIONS: Record<
  string,
  {
    en: string[];
    hi: string[];
    mr: string[];
    bn: string[];
    ta: string[];
    te: string[];
    kn: string[];
  }
> = {
  'routine-01': {
    en: [
      '1. Take out the tea pot and pour fresh clean water into it',
      '2. Place the pot on the stove and turn on the flame to heat',
      '3. Put your herbal tea bag into your favorite mug',
      '4. Pour the warm water into the mug and let it steep for 2 minutes',
    ],
    hi: [
      '1. चायदानी निकालें और उसमें ताज़ा साफ पानी डालें',
      '2. चायदानी को चूल्हे पर रखें और धीमी आँच पर गर्म करें',
      '3. अपने पसंदीदा कप में हर्बल टी बैग डालें',
      '4. कप में गुनगुना पानी डालें और 2 मिनट तक रखकर आनंद लें',
    ],
    mr: [
      '१. चहाचे भांडे घ्या आणि त्यात स्वच्छ ताजे पाणी घाला',
      '२. भांडे शेगडीवर ठेवून मंद आचेवर गरम करा',
      '३. तुमच्या आवडत्या कपात हर्बल टी बॅग ठेवा',
      '४. कपात गरम पाणी ओता आणि २ मिनिटे मुरू द्या',
    ],
    bn: [
      '১. চায়ের পাত্রটি নিন এবং তাতে তাজা পরিষ্কার জল ঢালুন',
      '২. পাত্রটি স্টোভে বসিয়ে হালকা আঁচে গরম করুন',
      '৩. আপনার প্রিয় মগে ভেষজ চা-পাতার ব্যাগ দিন',
      '৪. মগে গরম জল ঢেলে ২ মিনিট ভিজিয়ে রাখুন',
    ],
    ta: [
      '1. தேநீர் பாத்திரத்தை எடுத்து, அதில் சுத்தமான தண்ணீரை ஊற்றவும்',
      '2. பாத்திரத்தை அடுப்பில் வைத்துச் சூடாக்கவும்',
      '3. உங்கள் விருப்பமான கோப்பையில் மூலிகை தேநீர் பையை வைக்கவும்',
      '4. வெதுவெதுப்பான நீரைக் கோப்பையில் ஊற்றி 2 நிமிடம் ஊற விடவும்',
    ],
    te: [
      '1. టీ పాత్రను తీసి, దానిలో శుభ్రమైన మంచినీరు పోయండి',
      '2. పాత్రను స్టవ్ మీద పెట్టి వెచ్చగా కాచండి',
      '3. మీ ఇష్టమైన మగ్‌లో హెర్బల్ టీ బ్యాగ్ వేయండి',
      '4. వేడి నీటిని మగ్‌లో పోసి 2 నిమిషాలు నాననివ్వండి',
    ],
    kn: [
      '1. ಚಹಾ ಪಾತ್ರೆಯನ್ನು ತೆಗೆದುಕೊಂಡು ಶುದ್ಧವಾದ ನೀರು ಹಾಕಿ',
      '2. ಪಾತ್ರೆಯನ್ನು ಒಲೆಯ ಮೇಲೆ ಇಟ್ಟು ಬೆಚ್ಚಗೆ ಮಾಡಿ',
      '3. ನಿಮ್ಮ ಇಷ್ಟದ ಮಗ್‌ನಲ್ಲಿ ಹರ್ಬಲ್ ಟೀ ಬ್ಯಾಗ್ ಇಡಿ',
      '4. ಬಿಸಿ ನೀರನ್ನು ಮಗ್‌ಗೆ ಸುರಿದು 2 ನಿಮಿಷ ಬಿಡಿ',
    ],
  },
  'routine-02': {
    en: [
      '1. Get a clean glass of room-temperature drinking water',
      '2. Open the labeled morning compartment of your pillbox',
      '3. Take out your prescribed morning dose',
      '4. Swallow tablet with water and wait 30-45 mins before breakfast',
    ],
    hi: [
      '1. सामान्य तापमान वाले पीने के पानी का एक साफ गिलास लें',
      '2. अपनी दवा की डिब्बी का "सुबह" वाला खाना खोलें',
      '3. डॉक्टर द्वारा निर्धारित सुबह की खुराक बाहर निकालें',
      '4. पानी के साथ गोली निगलें और नाश्ते से पहले 30-45 मिनट प्रतीक्षा करें',
    ],
    mr: [
      '१. सामान्य तापमानाच्या पिण्याच्या पाण्याचा स्वच्छ ग्लास घ्या',
      '२. औषधांच्या बॉक्समधील सकाळचा लेबल केलेला कप्पा उघडा',
      '३. डॉक्टरांनी सांगितलेली सकाळची गोळी बाहेर काढा',
      '४. पाण्यासोबत गोळी घ्या आणि नाश्त्यापूर्वी ३०-४५ मिनिटे थांबा',
    ],
    bn: [
      '১. সাধারণ তাপমাত্রার এক গ্লাস পরিষ্কার খাবার জল নিন',
      '২. ওষুধের বাক্সের সকালের চিহ্নিত ঘরটি খুলুন',
      '৩. চিকিৎসকের নির্ধারিত সকালের ডোজটি বের করুন',
      '৪. জলের সাথে ওষুধটি খেয়ে সকালের খাবারের আগে ৩০-৪৫ মিনিট অপেক্ষা করুন',
    ],
    ta: [
      '1. அறை வெப்பநிலையில் உள்ள சுத்தமான குடிநீர் ஒரு டம்ளர் எடுத்துக் கொள்ளுங்கள்',
      '2. உங்கள் மருந்துப் பெட்டியின் காலைப் பகுதியைத் திறக்கவும்',
      '3. மருத்துவர் பரிந்துரைத்த காலை மருந்தை எடுக்கவும்',
      '4. தண்ணீருடன் மாத்திரையை விழுங்கி, காலை உணவுக்கு முன் 30-45 நிமிடம் காத்திருக்கவும்',
    ],
    te: [
      '1. సాధారణ ఉష్ణోగ్రతలో ఉన్న శుభ్రమైన తాగునీరు ఒక గ్లాసు తీసుకోండి',
      '2. మీ మాత్రల పెట్టెలో ఉదయం అని రాసి ఉన్న భాగాన్ని తెరవండి',
      '3. డాక్టర్ సూచించిన ఉదయపు మోతాదును బయటకు తీయండి',
      '4. నీటితో మాత్రను మింగి, అల్పాహారానికి ముందు 30-45 నిమిషాలు ఆగండి',
    ],
    kn: [
      '1. ಶುದ್ಧವಾದ ಕುಡಿಯುವ ನೀರಿನ ಲೋಟವನ್ನು ತೆಗೆದುಕೊಳ್ಳಿ',
      '2. ನಿಮ್ಮ ಮಾತ್ರೆ ಡಬ್ಬಿಯ ಬೆಳಗಿನ ವಿಭಾಗವನ್ನು ತೆರೆಯಿರಿ',
      '3. ವೈದ್ಯರು ಸೂಚಿಸಿದ ಬೆಳಗಿನ ಮಾತ್ರೆಯನ್ನು ಹೊರತೆಗೆಯಿರಿ',
      '4. ನೀರಿನೊಂದಿಗೆ ಮಾತ್ರೆಯನ್ನು ನುಂಗಿ ತಿಂಡಿಗೆ ಮುಂಚೆ 30-45 ನಿಮಿಷ ಕಾಯಿರಿ',
    ],
  },
  'routine-03': {
    en: [
      '1. Prepare & Relax Fingers: Lay loose shirt flat and perform 3 gentle finger stretches',
      '2. Fasten Bottom-Up: Fasten buttons starting from bottom upward, resting hands between buttons (or use adaptive button aid)',
      '3. Final Comfort & Posture Check: Smooth sleeves comfortably and breathe calmly (Caregiver co-assistance welcome if tremors are present)',
    ],
    hi: [
      '1. उंगलियों को आराम दें: ढीली कमीज़ को सीधा फैलाएं और उंगलियों को 3 बार हल्के से खींचें',
      '2. नीचे से ऊपर बटन बंद करें: सबसे नीचे वाले बटन से शुरू करें और बीच-बीच में हाथ को आराम दें',
      '3. आराम की जांच: आस्तीन ठीक करें और शांत सांस लें (जरूरत हो तो देखभालकर्ता की मदद लें)',
    ],
    mr: [
      '१. बोटांना आराम द्या: शर्ट सरळ ठेवा आणि बोटांचे ३ हलके स्ट्रेच करा',
      '२. खालून वर बटणे लावा: सर्वात खालच्या बटणापासून सुरुवात करा आणि मध्ये हातांना विसावा द्या',
      '३. शांत श्वास व तपासणी: बाह्या नीट करा आणि शांत श्वास घ्या (गरज असल्यास मदत घ्या)',
    ],
    bn: [
      '১. আঙুল শিথিল করুন: জামাটি সমান করে রেখে আঙুলগুলো ৩ বার আলতো করে প্রসারিত করুন',
      '২. নিচ থেকে ওপরে বোতাম লাগান: নিচের বোতাম থেকে শুরু করে মাঝে মাঝে হাতকে বিশ্রাম দিন',
      '৩. স্বস্তি ও ভঙ্গি যাচাই: হাতাগুলো গুছিয়ে নিয়ে শান্তভাবে শ্বাস নিন (প্রয়োজনে সহায়তা নিন)',
    ],
    ta: [
      '1. விரல்களைத் தளர்த்துங்கள்: சட்டையை விரித்து வைத்து விரல்களை 3 முறை மெதுவாக நீட்டவும்',
      '2. கீழிருந்து மேல் பொத்தான்களைப் போடுங்கள்: ஒவ்வொரு பொத்தானுக்கும் இடையே கைகளுக்கு ஓய்வு கொடுங்கள்',
      '3. இறுதி சௌகரியம்: கைப் பகுதிகளைச் சரிசெய்து அமைதியாக மூச்சு விடுங்கள் (தேவையெனில் உதவி பெறலாம்)',
    ],
    te: [
      '1. వేళ్లను విశ్రాంతి చేయండి: చొక్కాను సమానంగా పరిచి వేళ్లను 3 సార్లు సున్నితంగా సాగదీయండి',
      '2. కింది నుండి పైకి గుండీలు పెట్టండి: మధ్యలో చేతులకు విశ్రాంతి ఇస్తూ అడుగు నుండి మొదలుపెట్టండి',
      '3. సౌకర్య పరీక్ష: చేతులు సరిచేసుకుని ప్రశాంతంగా ఊపిరి తీసుకోండి',
    ],
    kn: [
      '1. ಬೆರಳುಗಳನ್ನು ಸಡಿಲಗೊಳಿಸಿ: ಅಂಗಿಯನ್ನು ಹಾಸಿ ಬೆರಳುಗಳನ್ನು 3 ಬಾರಿ ನಿಧಾನವಾಗಿ ಚಾಚಿ',
      '2. ಕೆಳಗಿನಿಂದ ಮೇಲಕ್ಕೆ ಬಟನ್ ಹಾಕಿ: ಕೆಳಗಿನ ಬಟನ್‌ನಿಂದ ಪ್ರಾರಂಭಿಸಿ, ನಡುವೆ ಕೈಗಳಿಗೆ ವಿಶ್ರಾಂತಿ ನೀಡಿ',
      '3. ಅಂತಿಮ ಆರಾಮ: ತೋಳುಗಳನ್ನು ಸರಿಪಡಿಸಿ ಶಾಂತವಾಗಿ ಉಸಿರು ತೆಗೆದುಕೊಳ್ಳಿ',
    ],
  },
  'routine-04': {
    en: [
      '1. Prepare a warm bowl of oatmeal or whole grain porridge',
      '2. Add a handful of raw walnuts for omega-3 brain nourishment',
      '3. Top with wild antioxidant blueberries or fresh fruit',
      '4. Enjoy calmly, keeping heavy meats and dairy for dinner',
    ],
    hi: [
      '1. ओटमील या साबुत अनाज के गर्म दलिया का एक कटोरा तैयार करें',
      '2. मस्तिष्क के पोषण के लिए थोड़े अखरोट डालें',
      '3. ऊपर से ताज़े फल या बेरीज़ डालें',
      '4. आराम से खाएं; भारी मांसाहार व डेयरी रात के लिए रखें',
    ],
    mr: [
      '१. ओटमील किंवा धान्याची कोमट लापशीची वाटी तयार करा',
      '२. मेंदूच्या पोषणासाठी मूठभर अक्रोड घाला',
      '३. वरून ताजी फळे किंवा बेरी घाला',
      '४. शांतपणे आस्वाद घ्या',
    ],
    bn: [
      '১. গরম ওটমিল বা শস্যদানার পায়েস বা পরিজ তৈরি করুন',
      '২. মস্তিষ্কের পুষ্টির জন্য এক মুঠো আখরোট যোগ করুন',
      '৩. ওপরে ব্লুবেরি বা তাজা ফল দিন',
      '৪. শান্তভাবে উপভোগ করুন',
    ],
    ta: [
      '1. வெதுவெதுப்பான ஓட்ஸ் அல்லது முழு தானியக் கஞ்சி ஒரு கிண்ணம் தயார் செய்யவும்',
      '2. மூளை ஆரோக்கியத்திற்கு ஒரு கைப்பிடி வால்நட்ஸ் சேர்க்கவும்',
      '3. மேலே புதிய பழங்கள் அல்லது பெர்ரிகளைத் தூவவும்',
      '4. அமைதியாகச் சாப்பிட்டு மகிழுங்கள்',
    ],
    te: [
      '1. వెచ్చని ఓట్‌మీల్ లేదా తృణధాన్యాల గంజిని సిద్ధం చేసుకోండి',
      '2. మెదడు పోషణ కోసం కొన్ని వాల్‌నట్‌లను కలపండి',
      '3. పైన తాజా పండ్లు లేదా బెర్రీలను వేయండి',
      '4. ప్రశాంతంగా ఆస్వాదించండి',
    ],
    kn: [
      '1. ಬೆಚ್ಚಗಿನ ಓಟ್‌ಮೀಲ್ ಅಥವಾ ಧಾನ್ಯದ ಗಂಜಿ ಬಟ್ಟಲನ್ನು ಸಿದ್ಧಪಡಿಸಿ',
      '2. ಮೆದುಳಿನ ಪೋಷಣೆಗೆ ಸ್ವಲ್ಪ ವಾಲ್‌ನಟ್ಸ್ ಸೇರಿಸಿ',
      '3. ಮೇಲೆ ತಾಜಾ ಹಣ್ಣುಗಳು ಅಥವಾ ಬೆರ್ರಿಗಳನ್ನು ಹಾಕಿ',
      '4. ಶಾಂತವಾಗಿ ಸವಿಯಿರಿ',
    ],
  },
  'routine-05': {
    en: [
      '1. Sit tall with your shoulders back and open chest',
      '2. Inhale a deep diaphragmatic breath through your nose',
      '3. Project your voice forward with a sustained AHHH for 10 seconds',
      '4. Repeat 3 times aiming for clear resonance and comfortable volume',
    ],
    hi: [
      '1. कंधे पीछे और सीना खुला रखकर सीधे बैठें',
      '2. नाक से गहरी सांस अंदर लें',
      '3. 10 सेकंड तक स्पष्ट और ऊँचे स्वर में "आआआ" बोलें',
      '4. स्पष्ट आवाज़ के साथ इसे 3 बार दोहराएं',
    ],
    mr: [
      '१. खांदे मागे करून आणि छाती मोकळी ठेवून ताठ बसा',
      '२. नाकातून दीर्घ श्वास आत घ्या',
      '३. १० सेकंदांसाठी स्पष्ट आणि मोठ्या आवाजात "आऽऽ" असा उच्चार करा',
      '४. स्पष्ट ध्वनीसाठी हे ३ वेळा करा',
    ],
    bn: [
      '১. কাঁধ পেছনে রেখে সোজা হয়ে বসুন',
      '২. নাক দিয়ে গভীর শ্বাস গ্রহণ করুন',
      '৩. ১০ সেকেন্ড ধরে স্পষ্ট ও উচ্চস্বরে "আআআ" শব্দ উচ্চারণ করুন',
      '৪. পরিষ্কার আওয়াজের সাথে ৩ বার অনুশীলন করুন',
    ],
    ta: [
      '1. தோள்களைப் பின்னால் வைத்து நிமிர்ந்து உட்காருங்கள்',
      '2. மூக்கின் வழியே ஆழமாக மூச்சை உள்ளே இழுக்கவும்',
      '3. உங்கள் குரலை முன்னோக்கி செலுத்தி 10 வினாடிகளுக்குத் தொடர்ந்து "ஆஆஆ" என்று ஒலிக்கவும்',
      '4. தெளிவான குரலுடன் 3 முறை திரும்பச் செய்யவும்',
    ],
    te: [
      '1. భుజాలు వెనక్కి పెట్టి నిటారుగా కూర్చోండి',
      '2. ముక్కు ద్వారా లోతైన శ్వాస తీసుకోండి',
      '3. 10 సెకన్ల పాటు స్పష్టమైన, పెద్ద స్వరంతో "ఆఆఆ" అని పలకండి',
      '4. స్పష్టమైన ధ్వనితో 3 సార్లు పునరావృతం చేయండి',
    ],
    kn: [
      '1. ಭುಜಗಳನ್ನು ಹಿಂದಕ್ಕೆ ಇರಿಸಿ ನೆಟ್ಟಗೆ ಕುಳಿತುಕೊಳ್ಳಿ',
      '2. ಮೂಗಿನ ಮೂಲಕ ಆಳವಾದ ಉಸಿರನ್ನು ತೆಗೆದುಕೊಳ್ಳಿ',
      '3. 10 ಸೆಕೆಂಡುಗಳ ಕಾಲ ಸ್ಪಷ್ಟವಾಗಿ ಮತ್ತು ಜೋರಾಗಿ "ಆಆಆ" ಎಂದು ಧ್ವನಿ ಮಾಡಿ',
      '4. ಸ್ಪಷ್ಟ ಧ್ವನಿಯೊಂದಿಗೆ 3 ಬಾರಿ ಪುನರಾವರ್ತಿಸಿ',
    ],
  },
  'routine-06': {
    en: [
      '1. Sit upright in a supportive comfortable dining chair',
      '2. Take small mindful bites and chew thoroughly',
      '3. Sip fresh water between spoonfuls to aid hydration',
    ],
    hi: [
      '1. खाने की आरामदायक कुर्सी पर सीधे बैठें',
      '2. छोटे निवाले लें और अच्छी तरह चबाएं',
      '3. बीच-बीच में थोड़ा ताज़ा पानी पिएं',
    ],
    mr: [
      '१. जेवणाच्या आरामदायी खुर्चीवर ताठ बसा',
      '२. छोटे घास घ्या आणि नीट चावून खा',
      '३. घासांमध्ये थोडे ताजे पाणी प्या',
    ],
    bn: [
      '১. খাওয়ার চেয়ারে আরাম করে সোজা হয়ে বসুন',
      '২. ছোট ছোট গ্রাস নিয়ে ভালোভাবে চিবিয়ে খান',
      '৩. মাঝে মাঝে অল্প তাজা জল পান করুন',
    ],
    ta: [
      '1. வசதியான உணவு நாற்காலியில் நிமிர்ந்து உட்காருங்கள்',
      '2. சிறிய கவளங்களாக எடுத்து நன்றாக மென்று சாப்பிடுங்கள்',
      '3. இடையிடையே சிறிது தண்ணீர் குடியுங்கள்',
    ],
    te: [
      '1. భోజనపు కుర్చీలో సౌకర్యవంతంగా నిటారుగా కూర్చోండి',
      '2. చిన్న ముద్దలుగా తీసుకుని బాగా నమిలి తినండి',
      '3. మధ్యమధ్యలో కొద్దిగా మంచినీరు తాగండి',
    ],
    kn: [
      '1. ಊಟದ ಕುರ್ಚಿಯಲ್ಲಿ ಆರಾಮವಾಗಿ ನೆಟ್ಟಗೆ ಕುಳಿತುಕೊಳ್ಳಿ',
      '2. ಸಣ್ಣ ತುತ್ತುಗಳನ್ನು ತೆಗೆದುಕೊಂಡು ಚೆನ್ನಾಗಿ ಅಗಿಯಿರಿ',
      '3. ನಡುವೆ ಸ್ವಲ್ಪ ತಾಜಾ ನೀರು ಕುಡಿಯಿರಿ',
    ],
  },
  'routine-07': {
    en: [
      '1. Wear supportive comfortable walking shoes with non-slip soles',
      '2. Stand tall and take wide rhythmic strides along the path',
      '3. Consciously swing arms with heel-to-toe foot placement',
    ],
    hi: [
      '1. बिना फिसलने वाले आरामदायक जूते या चप्पल पहनें',
      '2. सीधे खड़े हों और रास्ते पर लयबद्ध बड़े कदम बढ़ाएं',
      '3. एड़ी से पंजे तक कदम रखते हुए ध्यान से हाथ हिलाएं',
    ],
    mr: [
      '१. न घसरणारे आरामदायी चालण्याचे बूट किंवा चप्पल घाला',
      '२. ताठ उभे राहा आणि वाटेवरून लयबद्ध मोठी पावले टाका',
      '३. टाचेपासून बोटांपर्यंत पाऊल ठेवत हात सावकाश हलवा',
    ],
    bn: [
      '১. না পিছলানো আরামদায়ক হাঁটার জুতো পরুন',
      '২. সোজা দাঁড়িয়ে পথ ধরে ছন্দময় বড় পদক্ষেপে হাঁটুন',
      '৩. গোড়ালি থেকে পায়ের পাতা ফেলে সচেতনভাবে হাত দোলান',
    ],
    ta: [
      '1. வழுக்காத வசதியான நடைக் காலணிகளை அணியுங்கள்',
      '2. நிமிர்ந்து நின்று பாதையில் சீரான பெரிய அடிகள் எடுத்து நடக்கவும்',
      '3. குதிகால் முதல் கால் விரல் வரை ஊன்றி கைகளை வீசி நடக்கவும்',
    ],
    te: [
      '1. జారని సౌకర్యవంతమైన నడక బూట్లు ధరించండి',
      '2. నిటారుగా నిలబడి దారి వెంట లయబద్ధంగా పెద్ద అడుగులు వేయండి',
      '3. మడమ నుండి కాలి వేళ్ల వరకు అడుగు వేస్తూ చేతులు ఊపండి',
    ],
    kn: [
      '1. ಜಾರದ ಆರಾಮದಾಯಕ ನಡಿಗೆ ಬೂಟುಗಳನ್ನು ಧರಿಸಿ',
      '2. ನೆಟ್ಟಗೆ ನಿಂತು ದಾರಿಯಲ್ಲಿ ಲಯಬದ್ಧ ದೊಡ್ಡ ಹೆಜ್ಜೆಗಳನ್ನು ಇಡಿ',
      '3. ಹಿಮ್ಮಡಿಯಿಂದ ಕಾಲ್ಬೆರಳುಗಳವರೆಗೆ ಹೆಜ್ಜೆ ಇಡುತ್ತಾ ಕೈಗಳನ್ನು ಬೀಸಿ',
    ],
  },
  'routine-08': {
    en: [
      '1. Open the Mind Games tab in Saksham',
      '2. Choose a comfortable game such as Card Matching or Color Sequence',
      '3. Complete 1 to 2 gentle rounds at your own comfortable pace',
    ],
    hi: [
      '1. सक्षम में "दिमागी खेल" टैब खोलें',
      '2. कार्ड मिलान या रंग क्रम जैसा कोई आरामदायक खेल चुनें',
      '3. अपनी गति से 1 या 2 शांत राउंड पूरे करें',
    ],
    mr: [
      '१. सक्षममध्ये "मेंदूचे खेळ" टॅब उघडा',
      '२. कार्ड जुळवणे किंवा रंगांचा क्रम असा सोपा खेळ निवडा',
      '३. तुमच्या सोयीनुसार १ ते २ फेऱ्या पूर्ण करा',
    ],
    bn: [
      '১. সক্ষমে "মস্তিষ্কের খেলা" ট্যাবটি খুলুন',
      '২. কার্ড ম্যাচিং বা রঙের ধারার মতো সহজ একটি খেলা বেছে নিন',
      '৩. নিজের গতিতে ১ থেকে ২টি শান্ত রাউন্ড সম্পূর্ণ করুন',
    ],
    ta: [
      '1. சக்ஷமில் "மன விளையாட்டுகள்" பகுதியைத் திறக்கவும்',
      '2. அட்டைப் பொருத்தம் அல்லது நிற வரிசை போன்ற எளிய விளையாட்டைத் தேர்ந்தெடுக்கவும்',
      '3. உங்கள் வசதியான வேகத்தில் 1 முதல் 2 சுற்றுகள் விளையாடுங்கள்',
    ],
    te: [
      '1. సక్షంలో "మైండ్ గేమ్స్" ట్యాబ్ తెరవండి',
      '2. కార్డ్ మ్యాచింగ్ లేదా కలర్ సీక్వెన్స్ వంటి సులభమైన ఆటను ఎంచుకోండి',
      '3. మీ సౌకర్యవంతమైన వేగంతో 1 నుండి 2 రౌండ్లు పూర్తి చేయండి',
    ],
    kn: [
      '1. ಸಕ್ಷಮ್‌ನಲ್ಲಿ "ಮೈಂಡ್ ಗೇಮ್ಸ್" ಟ್ಯಾಬ್ ತೆರೆಯಿರಿ',
      '2. ಕಾರ್ಡ್ ಮ್ಯಾಚಿಂಗ್ ಅಥವಾ ಬಣ್ಣದ ಕ್ರಮದಂತಹ ಆರಾಮದಾಯಕ ಆಟವನ್ನು ಆರಿಸಿ',
      '3. ನಿಮ್ಮ ಸ್ವಂತ ವೇಗದಲ್ಲಿ 1 ರಿಂದ 2 ಸುತ್ತುಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ',
    ],
  },
};

export function getTranslatedRoutineDescription(
  routine: RoutineItem | { id?: string; description?: string } | undefined | null,
  language: string = 'en',
  fallback: string = ''
): string {
  if (!routine) return fallback;
  const lang = (language || 'en').split('-')[0];
  if (lang !== 'en' && routine.id && SEEDED_DESCRIPTIONS[routine.id]) {
    const entry = SEEDED_DESCRIPTIONS[routine.id] as Record<string, string>;
    if (entry[lang]) return entry[lang];
  }
  const desc = routine.description || '';
  if (lang !== 'en') {
    for (const id of Object.keys(SEEDED_DESCRIPTIONS)) {
      const entry = SEEDED_DESCRIPTIONS[id] as Record<string, string>;
      if (desc.trim() === entry.en && entry[lang]) {
        return entry[lang];
      }
    }
  }
  return desc || fallback;
}

export function getTranslatedRoutineSteps(
  routine: { id?: string; title?: string; steps?: any[] } | undefined | null,
  language: string = 'en',
  localizedTitle?: string
): string[] {
  const lang = (language || 'en').split('-')[0];
  const rawSteps: string[] =
    routine?.steps && routine.steps.length > 0
      ? routine.steps.map((s: any) =>
          typeof s === 'string'
            ? s
            : s && typeof s === 'object' && 'instruction' in s
            ? s.instruction
            : s && typeof s === 'object' && 'title' in s
            ? s.title
            : String(s)
        )
      : [];

  if (rawSteps.length === 0) {
    const tLabel = localizedTitle || routine?.title || '';
    const fallbacks: Record<string, string[]> = {
      hi: [
        `1. तैयारी और ध्यान: एक शांत सांस लें और ${tLabel || 'अपनी गतिविधि'} के लिए तैयार हों`,
        `2. गतिविधि करें: अपनी सुविधाजनक गति से एक-एक कदम आगे बढ़ें`,
        `3. विश्राम और सराहना: थोड़ा रुकें और कार्य पूरा होने पर गर्व महसूस करें`,
      ],
      mr: [
        `१. तयारी आणि लक्ष: शांत श्वास घ्या आणि ${tLabel || 'तुमच्या उपक्रमासाठी'} सज्ज व्हा`,
        `२. कृती करा: तुमच्या सोयीच्या गतीने एक-एक पाऊल पुढे टाका`,
        `३. विश्रांती आणि आनंद: थोडा वेळ विसावा घ्या आणि आनंदी राहा`,
      ],
      bn: [
        `১. প্রস্তুতি ও মনোযোগ: শান্ত শ্বাস নিন এবং ${tLabel || 'আপনার কাজের'} জন্য প্রস্তুত হোন`,
        `২. কাজটি করুন: নিজের স্বাচ্ছন্দ্য অনুযায়ী ধাপে ধাপে এগোন`,
        `৩. বিশ্রাম ও আনন্দ: একটু জিরিয়ে নিন এবং সুন্দর চেষ্টাকে স্বাগত জানান`,
      ],
      ta: [
        `1. தயாரிப்பு & கவனம்: அமைதியாக மூச்சு விட்டு ${tLabel || 'உங்கள் செயல்பாட்டிற்கு'} தயாராகுங்கள்`,
        `2. செயல்பாட்டைத் தொடருங்கள்: உங்கள் வசதியான வேகத்தில் ஒவ்வொரு படியாகச் செல்லுங்கள்`,
        `3. ஓய்வு & பாராட்டு: சற்று இளைப்பாறி உங்கள் முயற்சியைப் பாராட்டுங்கள்`,
      ],
      te: [
        `1. సిద్ధత & దృష్టి: ప్రశాంతంగా ఊపిరి తీసుకుని ${tLabel || 'మీ కార్యకలాపానికి'} సిద్ధమవ్వండి`,
        `2. కార్యకలాపం చేయండి: మీ సౌకర్యవంతమైన వేగంతో ఒక్కో అడుగు వేయండి`,
        `3. విశ్రాంతి & అభినందన: కాసేపు విశ్రాంతి తీసుకుని ఆనందించండి`,
      ],
      kn: [
        `1. ಸಿದ್ಧತೆ ಮತ್ತು ಗಮನ: ಶಾಂತ ಉಸಿರು ತೆಗೆದುಕೊಂಡು ${tLabel || 'ನಿಮ್ಮ ಚಟುವಟಿಕೆಗೆ'} ಸಿದ್ಧರಾಗಿ`,
        `2. ಚಟುವಟಿಕೆ ಮಾಡಿ: ನಿಮ್ಮ ಆರಾಮದಾಯಕ ವೇಗದಲ್ಲಿ ಹಂತ ಹಂತವಾಗಿ ಮುಂದುವರಿಯಿರಿ`,
        `3. ವಿಶ್ರಾಂತಿ ಮತ್ತು ಮೆಚ್ಚುಗೆ: ಸ್ವಲ್ಪ ವಿಶ್ರಾಂತಿ ಪಡೆದು ಸಂತೋಷಪಡಿ`,
      ],
    };
    return fallbacks[lang] || [
      `1. Prepare & Focus: Take a calm breath and get ready for ${routine?.title || 'your activity'}`,
      `2. Carry Out Activity: Proceed gently step by step at your own comfortable rhythm`,
      `3. Rest & Acknowledge: Take a moment to relax and appreciate completing ${routine?.title || 'this care routine'}`,
    ];
  }

  if (lang === 'en') return rawSteps;

  const seededById = routine?.id ? SEEDED_STEPS_TRANSLATIONS[routine.id] : undefined;
  if (
    seededById &&
    (seededById as Record<string, string[]>)[lang] &&
    rawSteps.length === seededById.en.length &&
    rawSteps.every((s, idx) => s.trim() === seededById.en[idx].trim())
  ) {
    return (seededById as Record<string, string[]>)[lang];
  }

  return rawSteps.map((step) => {
    for (const id of Object.keys(SEEDED_STEPS_TRANSLATIONS)) {
      const entry = SEEDED_STEPS_TRANSLATIONS[id];
      const idx = entry.en.findIndex((es) => es.trim() === step.trim());
      if (idx !== -1 && (entry as Record<string, string[]>)[lang]?.[idx]) {
        return (entry as Record<string, string[]>)[lang][idx];
      }
    }
    return step;
  });
}

const PERIOD_I18N: Record<string, Record<string, string>> = {
  morning: { en: 'MORNING', hi: 'सुबह', mr: 'सकाळ', bn: 'সকাল', ta: 'காலை', te: 'ఉదయం', kn: 'ಬೆಳಗ್ಗೆ' },
  afternoon: { en: 'AFTERNOON', hi: 'दोपहर', mr: 'दुपार', bn: 'দুপুর', ta: 'மதியம்', te: 'మధ్యాహ్నం', kn: 'ಮಧ್ಯಾಹ್ನ' },
  evening: { en: 'EVENING', hi: 'शाम', mr: 'संध्याकाळ', bn: 'সন্ধ্যা', ta: 'மாலை', te: 'సాయంత్రం', kn: 'ಸಂಜೆ' },
  night: { en: 'NIGHT', hi: 'रात', mr: 'रात्र', bn: 'রাত', ta: 'இரவு', te: 'రాత్రి', kn: 'ರಾತ್ರಿ' },
  today: { en: 'TODAY', hi: 'आज', mr: 'आज', bn: 'আজ', ta: 'இன்று', te: 'ఈరోజు', kn: 'ಇಂದು' },
};

export function getTranslatedRoutinePeriod(period: string | undefined, language: string = 'en'): string {
  const lang = (language || 'en').split('-')[0];
  const key = (period || 'today').trim().toLowerCase();
  return PERIOD_I18N[key]?.[lang] || (period ? period.toUpperCase() : PERIOD_I18N.today[lang] || 'TODAY');
}

const TIME_MARKER_I18N: Record<string, { am: string; pm: string; todayAt: string; yesterdayAt: string }> = {
  hi: { am: 'सुबह', pm: 'दोपहर/शाम', todayAt: 'आज', yesterdayAt: 'कल' },
  mr: { am: 'सकाळी', pm: 'दुपारी/सायं', todayAt: 'आज', yesterdayAt: 'काल' },
  bn: { am: 'সকাল', pm: 'অপরাহ্ন', todayAt: 'আজ', yesterdayAt: 'গতকাল' },
  ta: { am: 'முற்பகல்', pm: 'பிற்பகல்', todayAt: 'இன்று', yesterdayAt: 'நேற்று' },
  te: { am: 'ఉదయం', pm: 'సాయంత్రం', todayAt: 'ఈరోజు', yesterdayAt: 'నిన్న' },
  kn: { am: 'ಬೆಳಗ್ಗೆ', pm: 'ಸಂಜೆ', todayAt: 'ಇಂದು', yesterdayAt: 'ನಿನ್ನೆ' },
};

export function getTranslatedScheduleTime(timeStr: string | undefined, language: string = 'en'): string {
  if (!timeStr) return '';
  const lang = (language || 'en').split('-')[0];
  if (lang === 'en' || !TIME_MARKER_I18N[lang]) return timeStr;
  const m = TIME_MARKER_I18N[lang];
  return timeStr
    .replace(/\bToday at\b/gi, m.todayAt)
    .replace(/\bYesterday at\b/gi, m.yesterdayAt)
    .replace(/\bAM\b/g, m.am)
    .replace(/\bPM\b/g, m.pm);
}

