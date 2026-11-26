type LangCode = 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te' | 'kn';

const normalizeLang = (language?: string): LangCode => {
  const short = (language || 'en').toLowerCase().split('-')[0];
  if (
    short === 'hi' ||
    short === 'mr' ||
    short === 'bn' ||
    short === 'ta' ||
    short === 'te' ||
    short === 'kn'
  ) {
    return short;
  }
  return 'en';
};

export interface NotesUiStrings {
  emptyTitleError: string;
  voiceMissingAlert: string;
  saveFailedError: string;
  titleLabel: string;
  detailsLabel: string;
  linkRoutineLabel: string;
  noneOption: string;
  voiceAttachmentLabel: string;
  pinnedNotes: string;
  otherNotes: string;
  pauseVoice: string;
  playingPrefix: string;
  recordBtn: string;
  pauseBtn: string;
  pauseVoiceAria: string;
}

const NOTES_UI: Record<LangCode, NotesUiStrings> = {
  en: {
    emptyTitleError: 'Note title cannot be empty.',
    voiceMissingAlert: 'Voice recording is no longer available on this device.',
    saveFailedError: 'Failed to save note.',
    titleLabel: 'Title',
    detailsLabel: 'Note Details',
    linkRoutineLabel: 'Link with Daily Routine (Optional)',
    noneOption: 'None',
    voiceAttachmentLabel: 'Voice Note Attachment',
    pinnedNotes: 'Pinned Notes',
    otherNotes: 'Other Notes',
    pauseVoice: 'Pause Voice',
    playingPrefix: 'Playing',
    recordBtn: 'Record',
    pauseBtn: 'Pause',
    pauseVoiceAria: 'Pause Voice',
  },
  hi: {
    emptyTitleError: 'नोट का शीर्षक खाली नहीं हो सकता।',
    voiceMissingAlert: 'वॉयस रिकॉर्डिंग अब इस डिवाइस पर उपलब्ध नहीं है।',
    saveFailedError: 'नोट सहेजा नहीं जा सका।',
    titleLabel: 'शीर्षक',
    detailsLabel: 'नोट विवरण',
    linkRoutineLabel: 'दैनिक दिनचर्या से जोड़ें (वैकल्पिक)',
    noneOption: 'कोई नहीं',
    voiceAttachmentLabel: 'वॉयस नोट संलग्नक',
    pinnedNotes: 'पिन किए गए नोट्स',
    otherNotes: 'अन्य नोट्स',
    pauseVoice: 'आवाज़ रोकें',
    playingPrefix: 'चल रहा है',
    recordBtn: 'रिकॉर्ड करें',
    pauseBtn: 'रोकें',
    pauseVoiceAria: 'आवाज़ रोकें',
  },
  mr: {
    emptyTitleError: 'नोंदीचे शीर्षक रिकामे असू शकत नाही.',
    voiceMissingAlert: 'व्हॉइस रेकॉर्डिंग या डिव्हाइसवर उपलब्ध नाही.',
    saveFailedError: 'नोंद जतन करता आली नाही.',
    titleLabel: 'शीर्षक',
    detailsLabel: 'नोंदीचा तपशील',
    linkRoutineLabel: 'दैनंदिन दिनचर्येशी जोडा (ऐच्छिक)',
    noneOption: 'काहीही नाही',
    voiceAttachmentLabel: 'व्हॉइस नोंद जोडा',
    pinnedNotes: 'पिन केलेल्या नोंदी',
    otherNotes: 'इतर नोंदी',
    pauseVoice: 'आवाज थांबवा',
    playingPrefix: 'सुरू आहे',
    recordBtn: 'रेकॉर्ड करा',
    pauseBtn: 'थांबवा',
    pauseVoiceAria: 'आवाज थांबवा',
  },
  bn: {
    emptyTitleError: 'নোটের শিরোনাম খালি রাখা যাবে না।',
    voiceMissingAlert: 'ভয়েস রেকর্ডিং আর এই ডিভাইসে উপলব্ধ নেই।',
    saveFailedError: 'নোট সংরক্ষণ করা যায়নি।',
    titleLabel: 'শিরোনাম',
    detailsLabel: 'নোটের বিবরণ',
    linkRoutineLabel: 'দৈনিক রুটিনের সাথে যুক্ত করুন (ঐচ্ছিক)',
    noneOption: 'কোনটিই নয়',
    voiceAttachmentLabel: 'ভয়েস নোট সংযুক্তি',
    pinnedNotes: 'পিন করা নোট',
    otherNotes: 'অন্যান্য নোট',
    pauseVoice: 'ভয়েস বিরতি',
    playingPrefix: 'চলছে',
    recordBtn: 'রেকর্ড',
    pauseBtn: 'বিরতি',
    pauseVoiceAria: 'ভয়েস বিরতি',
  },
  ta: {
    emptyTitleError: 'குறிப்பு தலைப்பு காலியாக இருக்கக்கூடாது.',
    voiceMissingAlert: 'குரல் பதிவு இனி இந்தச் சாதனத்தில் இல்லை.',
    saveFailedError: 'குறிப்பைச் சேமிக்க முடியவில்லை.',
    titleLabel: 'தலைப்பு',
    detailsLabel: 'குறிப்பு விவரங்கள்',
    linkRoutineLabel: 'தினசரி வழக்கத்துடன் இணைக்கவும் (விருப்பமானது)',
    noneOption: 'ஏதுமில்லை',
    voiceAttachmentLabel: 'குரல் குறிப்பு இணைப்பு',
    pinnedNotes: 'பின் செய்யப்பட்ட குறிப்புகள்',
    otherNotes: 'மற்ற குறிப்புகள்',
    pauseVoice: 'குரலை நிறுத்து',
    playingPrefix: 'இயங்குகிறது',
    recordBtn: 'பதிவு செய்',
    pauseBtn: 'நிறுத்து',
    pauseVoiceAria: 'குரலை நிறுத்து',
  },
  te: {
    emptyTitleError: 'నోట్ శీర్షిక ఖాళీగా ఉండకూడదు.',
    voiceMissingAlert: 'వాయిస్ రికార్డింగ్ ఈ పరికరంలో అందుబాటులో లేదు.',
    saveFailedError: 'నోట్ సేవ్ చేయడం విఫలమైంది.',
    titleLabel: 'శీర్షిక',
    detailsLabel: 'నోట్ వివరాలు',
    linkRoutineLabel: 'రోజువారీ దినచర్యతో లింక్ చేయండి (ఐచ్ఛికం)',
    noneOption: 'ఏదీ లేదు',
    voiceAttachmentLabel: 'వాయిస్ నోట్ జోడింపు',
    pinnedNotes: 'పిన్ చేసిన నోట్స్',
    otherNotes: 'ఇతర నోట్స్',
    pauseVoice: 'వాయిస్ ఆపండి',
    playingPrefix: 'ప్లే అవుతోంది',
    recordBtn: 'రికార్డ్',
    pauseBtn: 'ఆపండి',
    pauseVoiceAria: 'వాయిస్ ఆపండి',
  },
  kn: {
    emptyTitleError: 'ಟಿಪ್ಪಣಿ ಶೀರ್ಷಿಕೆ ಖಾಲಿ ಇರಬಾರದು.',
    voiceMissingAlert: 'ಧ್ವನಿ ರೆಕಾರ್ಡಿಂಗ್ ಈ ಸಾಧನದಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ.',
    saveFailedError: 'ಟಿಪ್ಪಣಿ ಉಳಿಸಲು ವಿಫಲವಾಗಿದೆ.',
    titleLabel: 'ಶೀರ್ಷಿಕೆ',
    detailsLabel: 'ಟಿಪ್ಪಣಿ ವಿವರಗಳು',
    linkRoutineLabel: 'ದೈನಂದಿನ ದಿನಚರಿಯೊಂದಿಗೆ ಲಿಂಕ್ ಮಾಡಿ (ಐಚ್ಛಿಕ)',
    noneOption: 'ಯಾವುದೂ ಇಲ್ಲ',
    voiceAttachmentLabel: 'ಧ್ವನಿ ಟಿಪ್ಪಣಿ ಲಗತ್ತು',
    pinnedNotes: 'ಪಿನ್ ಮಾಡಿದ ಟಿಪ್ಪಣಿಗಳು',
    otherNotes: 'ಇತರ ಟಿಪ್ಪಣಿಗಳು',
    pauseVoice: 'ಧ್ವನಿ ನಿಲ್ಲಿಸಿ',
    playingPrefix: 'ಪ್ಲೇ ಆಗುತ್ತಿದೆ',
    recordBtn: 'ರೆಕಾರ್ಡ್',
    pauseBtn: 'ನಿಲ್ಲಿಸಿ',
    pauseVoiceAria: 'ಧ್ವನಿ ನಿಲ್ಲಿಸಿ',
  },
};

export const getNotesUi = (language?: string): NotesUiStrings => {
  return NOTES_UI[normalizeLang(language)];
};

export interface CalendarUiStrings {
  emptyTitleError: string;
  saveFailedError: string;
  titleLabel: string;
  allDayEvent: string;
  locationPlaceholder: string;
  descLabel: string;
  morePrefix: string;
  agendaPrefix: string;
  eventsWord: string;
  noEventsDay: string;
  eventsForPrefix: string;
  weekdaysShort: string[];
  allDayBadge: string;
  privateBadge: string;
  routineLinkedBadge: string;
  recDaily: string;
  recWeekly: string;
}

const CALENDAR_UI: Record<LangCode, CalendarUiStrings> = {
  en: {
    emptyTitleError: 'Event title cannot be empty.',
    saveFailedError: 'Failed to save event.',
    titleLabel: 'Title',
    allDayEvent: 'All day event',
    locationPlaceholder: 'e.g. Dr. Vikram Clinic, Room 102',
    descLabel: 'Event Description',
    morePrefix: 'more',
    agendaPrefix: 'Agenda for',
    eventsWord: 'events',
    noEventsDay: 'No events on this day.',
    eventsForPrefix: 'Events for',
    weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    allDayBadge: 'All Day',
    privateBadge: 'Private',
    routineLinkedBadge: 'Routine Linked',
    recDaily: 'daily',
    recWeekly: 'weekly',
  },
  hi: {
    emptyTitleError: 'कार्यक्रम का शीर्षक खाली नहीं हो सकता।',
    saveFailedError: 'कार्यक्रम सहेजा नहीं जा सका।',
    titleLabel: 'शीर्षक',
    allDayEvent: 'पूरे दिन का कार्यक्रम',
    locationPlaceholder: 'जैसे: डॉ. विक्रम क्लिनिक, कमरा 102',
    descLabel: 'कार्यक्रम विवरण',
    morePrefix: 'और',
    agendaPrefix: 'कार्यसूची:',
    eventsWord: 'कार्यक्रम',
    noEventsDay: 'इस दिन कोई कार्यक्रम नहीं है।',
    eventsForPrefix: 'कार्यक्रम:',
    weekdaysShort: ['सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'],
    allDayBadge: 'पूरा दिन',
    privateBadge: 'निजी',
    routineLinkedBadge: 'दिनचर्या से जुड़ा',
    recDaily: 'दैनिक',
    recWeekly: 'साप्ताहिक',
  },
  mr: {
    emptyTitleError: 'कार्यक्रमाचे शीर्षक रिकामे असू शकत नाही.',
    saveFailedError: 'कार्यक्रम जतन करता आला नाही.',
    titleLabel: 'शीर्षक',
    allDayEvent: 'संपूर्ण दिवसाचा कार्यक्रम',
    locationPlaceholder: 'उदा. डॉ. विक्रम क्लिनिक, खोली १०२',
    descLabel: 'कार्यक्रम वर्णन',
    morePrefix: 'अधिक',
    agendaPrefix: 'वेळापत्रक:',
    eventsWord: 'कार्यक्रम',
    noEventsDay: 'या दिवशी कोणतेही कार्यक्रम नाहीत.',
    eventsForPrefix: 'कार्यक्रम:',
    weekdaysShort: ['सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'],
    allDayBadge: 'संपूर्ण दिवस',
    privateBadge: 'खाजगी',
    routineLinkedBadge: 'दिनचर्येशी जोडलेले',
    recDaily: 'दैनिक',
    recWeekly: 'साप्ताहिक',
  },
  bn: {
    emptyTitleError: 'অনুষ্ঠানের শিরোনাম খালি রাখা যাবে না।',
    saveFailedError: 'অনুষ্ঠান সংরক্ষণ করা যায়নি।',
    titleLabel: 'শিরোনাম',
    allDayEvent: 'সারাদিনের অনুষ্ঠান',
    locationPlaceholder: 'যেমন: ডাঃ বিক্রম ক্লিনিক, রুম ১০২',
    descLabel: 'অনুষ্ঠানের বিবরণ',
    morePrefix: 'আরও',
    agendaPrefix: 'তালিকা:',
    eventsWord: 'টি অনুষ্ঠান',
    noEventsDay: 'এই দিনে কোনো অনুষ্ঠান নেই।',
    eventsForPrefix: 'অনুষ্ঠান:',
    weekdaysShort: ['সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি', 'রবি'],
    allDayBadge: 'সারাদিন',
    privateBadge: 'ব্যক্তিগত',
    routineLinkedBadge: 'রুটিন যুক্ত',
    recDaily: 'দৈনিক',
    recWeekly: 'সাপ্তাহিক',
  },
  ta: {
    emptyTitleError: 'நிகழ்வுத் தலைப்பு காலியாக இருக்கக்கூடாது.',
    saveFailedError: 'நிகழ்வைச் சேமிக்க முடியவில்லை.',
    titleLabel: 'தலைப்பு',
    allDayEvent: 'முழு நாள் நிகழ்வு',
    locationPlaceholder: 'எ.கா. டாக்டர் விக்ரம் கிளினிக், அறை 102',
    descLabel: 'நிகழ்வு விளக்கம்',
    morePrefix: 'மேலும்',
    agendaPrefix: 'நிகழ்ச்சி நிரல்:',
    eventsWord: 'நிகழ்வுகள்',
    noEventsDay: 'இன்று நிகழ்வுகள் எதுவும் இல்லை.',
    eventsForPrefix: 'நிகழ்வுகள்:',
    weekdaysShort: ['திங்', 'செவ்', 'புத', 'வியா', 'வெள்', 'சனி', 'ஞாயி'],
    allDayBadge: 'முழு நாள்',
    privateBadge: 'தனிப்பட்டது',
    routineLinkedBadge: 'தினசரியுடன் இணைந்தது',
    recDaily: 'தினமும்',
    recWeekly: 'வாரம்',
  },
  te: {
    emptyTitleError: 'కార్యక్రమం శీర్షిక ఖాళీగా ఉండకూడదు.',
    saveFailedError: 'కార్యక్రమాన్ని సేవ్ చేయడం విఫలమైంది.',
    titleLabel: 'శీర్షిక',
    allDayEvent: 'రోజంతా కార్యక్రమం',
    locationPlaceholder: 'ఉదా. డా. విక్రమ్ క్లినిక్, రూమ్ 102',
    descLabel: 'కార్యక్రమ వివరణ',
    morePrefix: 'మరిన్ని',
    agendaPrefix: 'కార్యక్రమాలు:',
    eventsWord: 'కార్యక్రమాలు',
    noEventsDay: 'ఈ రోజున కార్యక్రమాలు లేవు.',
    eventsForPrefix: 'కార్యక్రమాలు:',
    weekdaysShort: ['సోమ', 'మంగళ', 'బుధ', 'గురు', 'శుక్ర', 'శని', 'ఆది'],
    allDayBadge: 'రోజంతా',
    privateBadge: 'వ్యక్తిగతం',
    routineLinkedBadge: 'దినచర్యకు లింక్ చేయబడింది',
    recDaily: 'రోజువారీ',
    recWeekly: 'వారానికి',
  },
  kn: {
    emptyTitleError: 'ಕಾರ್ಯಕ್ರಮದ ಶೀರ್ಷಿಕೆ ಖಾಲಿ ಇರಬಾರದು.',
    saveFailedError: 'ಕಾರ್ಯಕ್ರಮವನ್ನು ಉಳಿಸಲು ವಿಫಲವಾಗಿದೆ.',
    titleLabel: 'ಶೀರ್ಷಿಕೆ',
    allDayEvent: 'ದಿನಪೂರ್ತಿ ಕಾರ್ಯಕ್ರಮ',
    locationPlaceholder: 'ಉದಾ. ಡಾ. ವಿಕ್ರಮ್ ಕ್ಲಿನಿಕ್, ಕೊಠಡಿ 102',
    descLabel: 'ಕಾರ್ಯಕ್ರಮ ವಿವರಣೆ',
    morePrefix: 'ಹೆಚ್ಚು',
    agendaPrefix: 'ಕಾರ್ಯಸೂಚಿ:',
    eventsWord: 'ಕಾರ್ಯಕ್ರಮಗಳು',
    noEventsDay: 'ಈ ದಿನ ಯಾವುದೇ ಕಾರ್ಯಕ್ರಮಗಳಿಲ್ಲ.',
    eventsForPrefix: 'ಕಾರ್ಯಕ್ರಮಗಳು:',
    weekdaysShort: ['ಸೋಮ', 'ಮಂಗಳ', 'ಬುಧ', 'ಗುರು', 'ಶುಕ್ರ', 'ಶನಿ', 'ಭಾನು'],
    allDayBadge: 'ದಿನಪೂರ್ತಿ',
    privateBadge: 'ಖಾಸಗಿ',
    routineLinkedBadge: 'ದಿನಚರಿಗೆ ಸಂಪರ್ಕಿತ',
    recDaily: 'ದೈನಂದಿನ',
    recWeekly: 'ವಾರಕ್ಕೊಮ್ಮೆ',
  },
};

export const getCalendarUi = (language?: string): CalendarUiStrings => {
  return CALENDAR_UI[normalizeLang(language)];
};
