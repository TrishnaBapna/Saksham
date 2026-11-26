import { ItemLocationRecord } from '../types/itemMemory.types.js';

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

export interface ItemMemoryStrings {
  groundingVerified: string;
  subtitleTemplate: string;
  closeAria: string;
  backToList: string;
  personalItem: string;
  lastRecordedPrefix: string;
  visualGrounding: string;
  lastRecordedLocationLabel: string;
  notesPrefix: string;
  ashaUsesTemplate: string;
  deleteRecord: string;
  cancel: string;
  recordItemLocation: string;
  itemNameLabel: string;
  itemNamePlaceholder: string;
  roomAreaLabel: string;
  specificLocationLabel: string;
  specificLocationPlaceholder: string;
  photoUrlLabel: string;
  photoUrlPlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  saveLocationBtn: string;
  searchPlaceholder: string;
  recordNewBtn: string;
  recordedAtPrefix: string;
  noMatchingItems: string;
  clearSearch: string;
  footerSummaryTemplate: string;
}

const ITEM_UI_MAP: Record<LangCode, ItemMemoryStrings> = {
  en: {
    groundingVerified: 'Grounding Verified',
    subtitleTemplate: 'Misplaced personal items grounded with photographic verification for {name}.',
    closeAria: 'Close Item Memory',
    backToList: 'Back to saved items list',
    personalItem: 'Personal Item',
    lastRecordedPrefix: 'Last Recorded:',
    visualGrounding: 'Visual Location Grounding',
    lastRecordedLocationLabel: 'Last Recorded Location:',
    notesPrefix: 'Notes:',
    ashaUsesTemplate: 'Asha uses this grounded record when you ask "Where is my {item}?"',
    deleteRecord: 'Delete Record',
    cancel: 'Cancel',
    recordItemLocation: 'Record Item Location',
    itemNameLabel: 'Item Name *',
    itemNamePlaceholder: 'e.g. Reading Glasses, Wallet, House Keys',
    roomAreaLabel: 'Room / Area',
    specificLocationLabel: 'Specific Location Spot *',
    specificLocationPlaceholder: 'e.g. Bedside table next to reading lamp',
    photoUrlLabel: 'Photo URL or Camera Capture',
    photoUrlPlaceholder: 'Paste image URL or leave empty for default placeholder',
    notesLabel: 'Helpful Grounding Notes (Optional)',
    notesPlaceholder: 'e.g. Inside purple leather case',
    saveLocationBtn: 'Save Grounded Location',
    searchPlaceholder: 'Search items (e.g. glasses, keys, bedroom)...',
    recordNewBtn: 'Record New Item',
    recordedAtPrefix: 'Recorded:',
    noMatchingItems: 'No matching personal items found.',
    clearSearch: 'Clear search',
    footerSummaryTemplate: 'Grounded Memory Protection • {count} items saved locally',
  },
  hi: {
    groundingVerified: 'स्थान सत्यापित',
    subtitleTemplate: '{name} के आवश्यक सामान की तस्वीर और स्थान की सटीक जानकारी।',
    closeAria: 'वस्तु स्मृति बंद करें',
    backToList: 'सहेजी गई वस्तुओं की सूची पर लौटें',
    personalItem: 'व्यक्तिगत वस्तु',
    lastRecordedPrefix: 'अंतिम दर्ज:',
    visualGrounding: 'दृश्य स्थान सत्यापन',
    lastRecordedLocationLabel: 'अंतिम दर्ज स्थान:',
    notesPrefix: 'नोट्स:',
    ashaUsesTemplate: 'जब आप पूछते हैं "मेरा {item} कहाँ है?", तो आशा इसी रिकॉर्ड का उपयोग करती है।',
    deleteRecord: 'रिकॉर्ड हटाएँ',
    cancel: 'रद्द करें',
    recordItemLocation: 'वस्तु का स्थान दर्ज करें',
    itemNameLabel: 'वस्तु का नाम *',
    itemNamePlaceholder: 'जैसे: पढ़ने का चश्मा, बटुआ, घर की चाबियाँ',
    roomAreaLabel: 'कमरा / क्षेत्र',
    specificLocationLabel: 'सटीक स्थान *',
    specificLocationPlaceholder: 'जैसे: पलंग के पास वाली मेज़ पर लैंप के बगल में',
    photoUrlLabel: 'फोटो लिंक या कैमरा',
    photoUrlPlaceholder: 'फोटो लिंक डालें या खाली छोड़ें',
    notesLabel: 'सहायक विवरण (वैकल्पिक)',
    notesPlaceholder: 'जैसे: बैंगनी चमड़े के केस के अंदर',
    saveLocationBtn: 'स्थान सहेजें',
    searchPlaceholder: 'वस्तुएँ खोजें (जैसे: चश्मा, चाबी, शयनकक्ष)...',
    recordNewBtn: 'नई वस्तु दर्ज करें',
    recordedAtPrefix: 'दर्ज:',
    noMatchingItems: 'कोई मिलती-जुलती वस्तु नहीं मिली।',
    clearSearch: 'खोज साफ़ करें',
    footerSummaryTemplate: 'सत्यापित स्मृति सुरक्षा • {count} वस्तुएँ सुरक्षित सहेजी गईं',
  },
  mr: {
    groundingVerified: 'ठिकाण प्रमाणित',
    subtitleTemplate: '{name} यांच्या महत्त्वाच्या वस्तूंची फोटोसह अचूक नोंद.',
    closeAria: 'वस्तू स्मृती बंद करा',
    backToList: 'जतन केलेल्या वस्तूंच्या यादीकडे परत जा',
    personalItem: 'वैयक्तिक वस्तू',
    lastRecordedPrefix: 'शेवटची नोंद:',
    visualGrounding: 'छायाचित्र स्थान पडताळणी',
    lastRecordedLocationLabel: 'शेवटचे नोंदवलेले ठिकाण:',
    notesPrefix: 'नोंदी:',
    ashaUsesTemplate: 'तुम्ही "माझे {item} कुठे आहे?" विचारल्यास आशा हीच नोंद वापरते.',
    deleteRecord: 'नोंद हटवा',
    cancel: 'रद्द करा',
    recordItemLocation: 'वस्तूचे ठिकाण नोंदवा',
    itemNameLabel: 'वस्तूचे नाव *',
    itemNamePlaceholder: 'उदा. वाचण्याचा चष्मा, पाकीट, घराच्या चाव्या',
    roomAreaLabel: 'खोली / जागा',
    specificLocationLabel: 'नेमके ठिकाण *',
    specificLocationPlaceholder: 'उदा. पलंगाजवळच्या टेबलावर दिव्याशेजारी',
    photoUrlLabel: 'फोटो लिंक किंवा कॅमेरा',
    photoUrlPlaceholder: 'फोटो लिंक पेस्ट करा किंवा रिकामे सोडा',
    notesLabel: 'उपयुक्त माहिती (ऐच्छिक)',
    notesPlaceholder: 'उदा. जांभळ्या चामड्याच्या कव्हरमध्ये',
    saveLocationBtn: 'ठिकाण जतन करा',
    searchPlaceholder: 'वस्तू शोधा (उदा. चष्मा, चावी, शयनकक्ष)...',
    recordNewBtn: 'नवीन वस्तू नोंदवा',
    recordedAtPrefix: 'नोंदवले:',
    noMatchingItems: 'जुळणारी कोणतीही वस्तू सापडली नाही.',
    clearSearch: 'शोध साफ करा',
    footerSummaryTemplate: 'प्रमाणित स्मृती संरक्षण • {count} वस्तू स्थानिक पातळीवर जतन',
  },
  bn: {
    groundingVerified: 'অবস্থান যাচাইকৃত',
    subtitleTemplate: '{name}-এর হারিয়ে যাওয়া দরকারি জিনিসের ছবিসহ সঠিক অবস্থান।',
    closeAria: 'জিনিসের স্মৃতি বন্ধ করুন',
    backToList: 'সংরক্ষিত জিনিসের তালিকায় ফিরুন',
    personalItem: 'ব্যক্তিগত জিনিস',
    lastRecordedPrefix: 'সর্বশেষ রেকর্ড:',
    visualGrounding: 'ছবিভিত্তিক অবস্থান যাচাই',
    lastRecordedLocationLabel: 'সর্বশেষ নথিভুক্ত অবস্থান:',
    notesPrefix: 'নোট:',
    ashaUsesTemplate: 'আপনি "আমার {item} কোথায়?" জিজ্ঞাসা করলে আশা এই তথ্যটি ব্যবহার করে।',
    deleteRecord: 'রেকর্ড মুছুন',
    cancel: 'বাতিল',
    recordItemLocation: 'জিনিসের অবস্থান নথিভুক্ত করুন',
    itemNameLabel: 'জিনিসের নাম *',
    itemNamePlaceholder: 'যেমন: চশমা, মানিব্যাগ, বাড়ির চাবি',
    roomAreaLabel: 'ঘর / জায়গা',
    specificLocationLabel: 'নির্দিষ্ট জায়গা *',
    specificLocationPlaceholder: 'যেমন: বিছানার পাশের টেবিলে ল্যাম্পের পাশে',
    photoUrlLabel: 'ছবির লিংক বা ক্যামেরা',
    photoUrlPlaceholder: 'ছবির লিংক দিন অথবা ফাঁকা রাখুন',
    notesLabel: 'সহায়ক তথ্য (ঐচ্ছিক)',
    notesPlaceholder: 'যেমন: বেগুনি চামড়ার কেসের ভেতর',
    saveLocationBtn: 'অবস্থান সংরক্ষণ করুন',
    searchPlaceholder: 'জিনিস খুঁজুন (যেমন: চশমা, চাবি, শোবার ঘর)...',
    recordNewBtn: 'নতুন জিনিস যোগ করুন',
    recordedAtPrefix: 'নথিভুক্ত:',
    noMatchingItems: 'মিল থাকা কোনো ব্যক্তিগত জিনিস পাওয়া যায়নি।',
    clearSearch: 'অনুসন্ধান মুছুন',
    footerSummaryTemplate: 'নিরাপদ স্মৃতি সুরক্ষা • {count}টি জিনিস সংরক্ষিত',
  },
  ta: {
    groundingVerified: 'இருப்பிடம் சரிபார்க்கப்பட்டது',
    subtitleTemplate: '{name} அவர்களின் தனிப்பட்ட பொருட்களின் புகைப்பட இருப்பிடப் பதிவு.',
    closeAria: 'பொருள் நினைவகத்தை மூடு',
    backToList: 'சேமித்த பொருட்கள் பட்டியலுக்குத் திரும்பு',
    personalItem: 'தனிப்பட்ட பொருள்',
    lastRecordedPrefix: 'கடைசிப் பதிவு:',
    visualGrounding: 'புகைப்பட இருப்பிட உறுதிப்படுத்தல்',
    lastRecordedLocationLabel: 'கடைசியாகப் பதிவு செய்த இடம்:',
    notesPrefix: 'குறிப்புகள்:',
    ashaUsesTemplate: '"என் {item} எங்கே?" என்று நீங்கள் கேட்கும்போது ஆஷா இந்தப் பதிவைப் பயன்படுத்துவாள்.',
    deleteRecord: 'பதிவை நீக்கு',
    cancel: 'ரத்து செய்',
    recordItemLocation: 'பொருளின் இடத்தைப் பதிவு செய்',
    itemNameLabel: 'பொருளின் பெயர் *',
    itemNamePlaceholder: 'எ.கா. வாசிப்பு கண்ணாடி, பர்ஸ், வீட்டுச் சாவி',
    roomAreaLabel: 'அறை / பகுதி',
    specificLocationLabel: 'சரியான இடம் *',
    specificLocationPlaceholder: 'எ.கா. படுக்கை மேசையில் விளக்கின் அருகில்',
    photoUrlLabel: 'புகைப்பட இணைப்பு அல்லது கேமரா',
    photoUrlPlaceholder: 'படத்தின் இணைப்பை உள்ளிடவும் அல்லது காலியாக விடவும்',
    notesLabel: 'உதவிகரமான குறிப்புகள் (விருப்பமானது)',
    notesPlaceholder: 'எ.கா. ஊதா தோல் உறைக்குள்',
    saveLocationBtn: 'இருப்பிடத்தைச் சேமி',
    searchPlaceholder: 'பொருட்களைத் தேடு (எ.கா. கண்ணாடி, சாவி, படுக்கையறை)...',
    recordNewBtn: 'புதிய பொருள் சேர்',
    recordedAtPrefix: 'பதிவு:',
    noMatchingItems: 'பொருந்தும் தனிப்பட்ட பொருட்கள் எதுவும் இல்லை.',
    clearSearch: 'தேடலை அழி',
    footerSummaryTemplate: 'பாதுகாப்பான நினைவு பாதுகாப்பு • {count} பொருட்கள் சேமிக்கப்பட்டுள்ளன',
  },
  te: {
    groundingVerified: 'స్థానం ధృవీకరించబడింది',
    subtitleTemplate: '{name} కోసం ముఖ్యమైన వస్తువుల ఫోటో ఆధారిత ఖచ్చితమైన స్థానం.',
    closeAria: 'వస్తువు జ్ఞాపకాన్ని మూసివేయండి',
    backToList: 'సేవ్ చేసిన వస్తువుల జాబితాకు తిరిగి వెళ్ళండి',
    personalItem: 'వ్యక్తిగత వస్తువు',
    lastRecordedPrefix: 'చివరిగా నమోదు:',
    visualGrounding: 'చిత్ర స్థాన ధృవీకరణ',
    lastRecordedLocationLabel: 'చివరిగా నమోదు చేసిన స్థానం:',
    notesPrefix: 'గమనికలు:',
    ashaUsesTemplate: 'మీరు "నా {item} ఎక్కడ ఉంది?" అని అడిగినప్పుడు ఆశా ఈ రికార్డును ఉపయోగిస్తుంది.',
    deleteRecord: 'రికార్డును తొలగించండి',
    cancel: 'రద్దు చేయండి',
    recordItemLocation: 'వస్తువు స్థానాన్ని నమోదు చేయండి',
    itemNameLabel: 'వస్తువు పేరు *',
    itemNamePlaceholder: 'ఉదా. కళ్ళద్దాలు, పర్సు, ఇంటి తాళాలు',
    roomAreaLabel: 'గది / ప్రాంతం',
    specificLocationLabel: 'ఖచ్చితమైన స్థానం *',
    specificLocationPlaceholder: 'ఉదా. మంచం పక్కన టేబుల్ మీద దీపం పక్కన',
    photoUrlLabel: 'ఫోటో URL లేదా కెమెరా',
    photoUrlPlaceholder: 'చిత్రం URL పేస్ట్ చేయండి లేదా ఖాళీగా ఉంచండి',
    notesLabel: 'సహాయక గమనికలు (ఐచ్ఛికం)',
    notesPlaceholder: 'ఉదా. ఊదా రంగు తోలు కవర్ లోపల',
    saveLocationBtn: 'స్థానాన్ని సేవ్ చేయండి',
    searchPlaceholder: 'వస్తువులను వెతకండి (ఉదా. కళ్ళద్దాలు, తాళం, పడకగది)...',
    recordNewBtn: 'కొత్త వస్తువు నమోదు',
    recordedAtPrefix: 'నమోదు:',
    noMatchingItems: 'సరిపోయే వ్యక్తిగత వస్తువులు కనుగొనబడలేదు.',
    clearSearch: 'శోధనను క్లియర్ చేయండి',
    footerSummaryTemplate: 'ధృవీకరించబడిన జ్ఞాపక రక్షణ • {count} వస్తువులు స్థానికంగా సేవ్ చేయబడ్డాయి',
  },
  kn: {
    groundingVerified: 'ಸ್ಥಳ ದೃಢೀಕರಿಸಲಾಗಿದೆ',
    subtitleTemplate: '{name} ಅವರ ವೈಯಕ್ತಿಕ ವಸ್ತುಗಳ ಫೋಟೋ ಆಧಾರಿತ ನಿಖರ ಸ್ಥಳ ಮಾಹಿತಿ.',
    closeAria: 'ವಸ್ತು ಸ್ಮರಣೆಯನ್ನು ಮುಚ್ಚಿ',
    backToList: 'ಉಳಿಸಿದ ವಸ್ತುಗಳ ಪಟ್ಟಿಗೆ ಹಿಂತಿರುಗಿ',
    personalItem: 'ವೈಯಕ್ತಿಕ ವಸ್ತು',
    lastRecordedPrefix: 'ಕೊನೆಯ ದಾಖಲೆ:',
    visualGrounding: 'ದೃಶ್ಯ ಸ್ಥಳ ದೃಢೀಕರಣ',
    lastRecordedLocationLabel: 'ಕೊನೆಯದಾಗಿ ದಾಖಲಿಸಿದ ಸ್ಥಳ:',
    notesPrefix: 'ಟಿಪ್ಪಣಿಗಳು:',
    ashaUsesTemplate: 'ನೀವು "ನನ್ನ {item} ಎಲ್ಲಿದೆ?" ಎಂದು ಕೇಳಿದಾಗ ಆಶಾ ಈ ದಾಖಲೆಯನ್ನು ಬಳಸುತ್ತಾಳೆ.',
    deleteRecord: 'ದಾಖಲೆ ಅಳಿಸಿ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    recordItemLocation: 'ವಸ್ತುವಿನ ಸ್ಥಳವನ್ನು ದಾಖಲಿಸಿ',
    itemNameLabel: 'ವಸ್ತುವಿನ ಹೆಸರು *',
    itemNamePlaceholder: 'ಉದಾ. ಕನ್ನಡಕ, ಪರ್ಸ್, ಮನೆ ಕೀಲಿಗಳು',
    roomAreaLabel: 'ಕೊಠಡಿ / ಪ್ರದೇಶ',
    specificLocationLabel: 'ನಿಖರ ಸ್ಥಳ *',
    specificLocationPlaceholder: 'ಉದಾ. ಹಾಸಿಗೆಯ ಪಕ್ಕದ ಮೇಜಿನ ಮೇಲೆ ದೀಪದ ಹತ್ತಿರ',
    photoUrlLabel: 'ಫೋಟೋ URL ಅಥವಾ ಕ್ಯಾಮೆರಾ',
    photoUrlPlaceholder: 'ಚಿತ್ರದ URL ಅಂಟಿಸಿ ಅಥವಾ ಖಾಲಿ ಬಿಡಿ',
    notesLabel: 'ಸಹಾಯಕ ಟಿಪ್ಪಣಿಗಳು (ಐಚ್ಛಿಕ)',
    notesPlaceholder: 'ಉದಾ. ನೇರಳೆ ಚರ್ಮದ ಕವರ್ ಒಳಗೆ',
    saveLocationBtn: 'ಸ್ಥಳವನ್ನು ಉಳಿಸಿ',
    searchPlaceholder: 'ವಸ್ತುಗಳನ್ನು ಹುಡುಕಿ (ಉದಾ. ಕನ್ನಡಕ, ಕೀಲಿ, ಮಲಗುವ ಕೋಣೆ)...',
    recordNewBtn: 'ಹೊಸ ವಸ್ತು ದಾಖಲಿಸಿ',
    recordedAtPrefix: 'ದಾಖಲಾದದ್ದು:',
    noMatchingItems: 'ಹೊಂದಾಣಿಕೆಯಾಗುವ ವೈಯಕ್ತಿಕ ವಸ್ತುಗಳು ಕಂಡುಬಂದಿಲ್ಲ.',
    clearSearch: 'ಹುಡುಕಾಟ ತೆರವುಗೊಳಿಸಿ',
    footerSummaryTemplate: 'ದೃಢೀಕೃತ ಸ್ಮರಣೆ ರಕ್ಷಣೆ • {count} ವಸ್ತುಗಳು ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಸಲಾಗಿದೆ',
  },
};

export const getItemMemoryUi = (language?: string): ItemMemoryStrings => {
  return ITEM_UI_MAP[normalizeLang(language)];
};

const ROOM_NAME_TRANSLATIONS: Record<string, Record<LangCode, string>> = {
  Bedroom: {
    en: 'Bedroom',
    hi: 'शयनकक्ष (बेडरूम)',
    mr: 'शयनकक्ष (बेडरूम)',
    bn: 'শোবার ঘর',
    ta: 'படுக்கையறை',
    te: 'పడకగది',
    kn: 'ಮಲಗುವ ಕೋಣೆ',
  },
  'Living Room': {
    en: 'Living Room',
    hi: 'बैठक कक्ष (लिविंग रूम)',
    mr: 'दिवाणखाना (लिविंग रूम)',
    bn: 'বসার ঘর',
    ta: 'வரவேற்பறை',
    te: 'గది (లివింగ్ రూమ్)',
    kn: 'ಹಾಲ್ (ಲಿವಿಂಗ್ ರೂಮ್)',
  },
  'Dining Room': {
    en: 'Dining Room',
    hi: 'भोजन कक्ष (डाइनिंग रूम)',
    mr: 'जेवणाची खोली (डायनिंग रूम)',
    bn: 'খাবার ঘর',
    ta: 'உணவறை',
    te: 'భోజనపు గది',
    kn: 'ಊಟದ ಕೋಣೆ',
  },
  'Entrance Hall': {
    en: 'Entrance Hall',
    hi: 'प्रवेश द्वार / हॉल',
    mr: 'प्रवेश हॉल',
    bn: 'প্রবেশ কক্ষ / হল',
    ta: 'நுழைவாயில் ஹால்',
    te: 'ప్రవేశ హాలు',
    kn: 'ಪ್ರವೇಶ ದ್ವಾರ / ಹಾಲ್',
  },
  Kitchen: {
    en: 'Kitchen',
    hi: 'रसोईघर',
    mr: 'स्वयंपाकघर',
    bn: 'রান্নাঘর',
    ta: 'சமையலறை',
    te: 'వంటగది',
    kn: 'ಅಡುಗೆಮನೆ',
  },
  Verandah: {
    en: 'Verandah',
    hi: 'बरामदा',
    mr: 'व्हरांडा',
    bn: 'বারান্দা',
    ta: 'வராண்டா',
    te: 'వసారా (వరండా)',
    kn: 'ವರಾಂಡ',
  },
};

export const getTranslatedRoomName = (room?: string, language?: string): string => {
  if (!room) return getItemMemoryUi(language).personalItem;
  const lang = normalizeLang(language);
  return ROOM_NAME_TRANSLATIONS[room]?.[lang] || room;
};

interface ItemRecordTranslation {
  itemName: string;
  locationRecorded: string;
  recordedAt: string;
  notes?: string;
}

const DEFAULT_ITEM_TRANSLATIONS: Record<string, Record<LangCode, ItemRecordTranslation>> = {
  'item-01': {
    en: {
      itemName: 'Reading Glasses',
      locationRecorded: 'On the bedside wooden table next to the morning lamp',
      recordedAt: '08:15 AM today',
      notes: 'Gold rimmed spectacles inside purple velvet case',
    },
    hi: {
      itemName: 'पढ़ने का चश्मा',
      locationRecorded: 'पलंग के पास लकड़ी की मेज़ पर लैंप के बगल में',
      recordedAt: 'आज सुबह 08:15',
      notes: 'बैंगनी मखमली केस के अंदर सुनहरे फ्रेम का चश्मा',
    },
    mr: {
      itemName: 'वाचण्याचा चष्मा',
      locationRecorded: 'पलंगाजवळच्या लाकडी टेबलावर दिव्याशेजारी',
      recordedAt: 'आज सकाळी ०८:१५',
      notes: 'जांभळ्या मखमली कव्हरमध्ये सोनेरी फ्रेमचा चष्मा',
    },
    bn: {
      itemName: 'পড়ার চশমা',
      locationRecorded: 'বিছানার পাশের কাঠের টেবিলে সকালের ল্যাম্পের পাশে',
      recordedAt: 'আজ সকাল ০৮:১৫',
      notes: 'বেগুনি মখমলের খাপের ভেতর সোনালি ফ্রেমের চশমা',
    },
    ta: {
      itemName: 'வாசிப்பு கண்ணாடி',
      locationRecorded: 'படுக்கை அருகிலுள்ள மர மேசையில் விளக்கின் அருகில்',
      recordedAt: 'இன்று காலை 08:15',
      notes: 'ஊதா வெல்வெட் உறைக்குள் தங்க பிரேம் கண்ணாடி',
    },
    te: {
      itemName: 'చదువుకునే కళ్ళద్దాలు',
      locationRecorded: 'మంచం పక్కన చెక్క టేబుల్ మీద దీపం పక్కన',
      recordedAt: 'ఈరోజు ఉదయం 08:15',
      notes: 'ఊదా రంగు వెల్వెట్ కవర్‌లో బంగారు ఫ్రేమ్ కళ్ళద్దాలు',
    },
    kn: {
      itemName: 'ಓದುವ ಕನ್ನಡಕ',
      locationRecorded: 'ಹಾಸಿಗೆಯ ಪಕ್ಕದ ಮರದ ಮೇಜಿನ ಮೇಲೆ ದೀಪದ ಹತ್ತಿರ',
      recordedAt: 'ಇಂದು ಬೆಳಿಗ್ಗೆ 08:15',
      notes: 'ನೇರಳೆ ವೆಲ್ವೆಟ್ ಕವರ್ ಒಳಗೆ ಚಿನ್ನದ ಫ್ರೇಮ್ ಕನ್ನಡಕ',
    },
  },
  'item-02': {
    en: {
      itemName: 'House Keys',
      locationRecorded: 'Hanging on the brass wall hook near the main door entrance',
      recordedAt: 'Yesterday evening',
      notes: 'Silver keyring with brass Om pendant',
    },
    hi: {
      itemName: 'घर की चाबियाँ',
      locationRecorded: 'मुख्य दरवाज़े के पास दीवार पर पीतल के हुक पर टंगी हुई हैं',
      recordedAt: 'कल शाम',
      notes: 'पीतल के ॐ पेंडेंट के साथ चांदी का छल्ला',
    },
    mr: {
      itemName: 'घराच्या चाव्या',
      locationRecorded: 'मुख्य दरवाजाजवळ भिंतीवरच्या पितळेच्या हुकवर टांगलेल्या आहेत',
      recordedAt: 'काल संध्याकाळी',
      notes: 'पितळेच्या ॐ पदकासह चांदीची किल्लीची रिंग',
    },
    bn: {
      itemName: 'বাড়ির চাবি',
      locationRecorded: 'প্রধান দরজার পাশে দেওয়ালের পিতলের হুকে ঝোলানো আছে',
      recordedAt: 'গতকাল সন্ধ্যায়',
      notes: 'পিতলের ॐ লকেটসহ রুপোলি চাবির রিং',
    },
    ta: {
      itemName: 'வீட்டுச் சாவிகள்',
      locationRecorded: 'பிரதான கதவு நுழைவாயிலுக்கு அருகே சுவர் பித்தளை கொக்கியில் தொங்குகிறது',
      recordedAt: 'நேற்று மாலை',
      notes: 'பித்தளை ஓம் பதக்கத்துடன் வெள்ளி சாவிக்கொத்து',
    },
    te: {
      itemName: 'ఇంటి తాళాలు',
      locationRecorded: 'ప్రధాన తలుపు ప్రవేశం వద్ద గోడపై ఇత్తడి హుక్‌కు వేలాడుతున్నాయి',
      recordedAt: 'నిన్న సాయంత్రం',
      notes: 'ఇత్తడి ఓం లాకెట్‌తో ఉన్న వెండి కీచైన్',
    },
    kn: {
      itemName: 'ಮನೆ ಕೀಲಿಗಳು',
      locationRecorded: 'ಮುಖ್ಯ ಬಾಗಿಲಿನ ಬಳಿ ಗೋಡೆಯ ಹಿತ್ತಾಳೆ ಹುಕ್ ಮೇಲೆ ನೇತುಹಾಕಲಾಗಿದೆ',
      recordedAt: 'ನಿನ್ನೆ ಸಂಜೆ',
      notes: 'ಹಿತ್ತಾಳೆ ಓಂ ಪದಕದೊಂದಿಗೆ ಬೆಳ್ಳಿ ಕೀಲಿ ಗೊಂಚಲು',
    },
  },
  'item-03': {
    en: {
      itemName: 'Blue Leather Wallet',
      locationRecorded: 'Top drawer of the dressing cupboard next to your watch',
      recordedAt: '10:30 AM today',
      notes: 'Contains Aadhaar card and ₹500 cash',
    },
    hi: {
      itemName: 'नीला चमड़े का बटुआ',
      locationRecorded: 'ड्रेसिंग अलमारी की सबसे ऊपरी दराज़ में आपकी घड़ी के पास',
      recordedAt: 'आज सुबह 10:30',
      notes: 'इसमें आधार कार्ड और ₹500 नकद रखे हैं',
    },
    mr: {
      itemName: 'निळे चामड्याचे पाकीट',
      locationRecorded: 'ड्रेसिंग कपाटाच्या वरच्या ड्रॉवरमध्ये तुमच्या घड्याळाजवळ',
      recordedAt: 'आज सकाळी १०:३०',
      notes: 'आधार कार्ड आणि ₹५०० रोख रक्कम आहे',
    },
    bn: {
      itemName: 'নীল চামড়ার মানিব্যাগ',
      locationRecorded: 'ড্রেসিং আলমারির উপরের ড্রয়ারে আপনার ঘড়ির পাশে',
      recordedAt: 'আজ সকাল ১০:৩০',
      notes: 'আধার কার্ড এবং ₹৫০০ নগদ রয়েছে',
    },
    ta: {
      itemName: 'நீல தோல் பர்ஸ்',
      locationRecorded: 'அலங்கார அலமாரியின் மேல் டிராயரில் உங்கள் கைக்கடிகாரத்தின் அருகில்',
      recordedAt: 'இன்று காலை 10:30',
      notes: 'ஆதார் அட்டை மற்றும் ₹500 ரொக்கம் உள்ளது',
    },
    te: {
      itemName: 'నీలం తోలు పర్సు',
      locationRecorded: 'డ్రెస్సింగ్ అల్మారా పై డ్రాయర్‌లో మీ గడియారం పక్కన',
      recordedAt: 'ఈరోజు ఉదయం 10:30',
      notes: 'ఆధార్ కార్డు మరియు ₹500 నగదు ఉన్నాయి',
    },
    kn: {
      itemName: 'ನೀಲಿ ಚರ್ಮದ ಪರ್ಸ್',
      locationRecorded: 'ಡ್ರೆಸ್ಸಿಂಗ್ ಕಪಾಟಿನ ಮೇಲಿನ ಡ್ರಾಯರ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಗಡಿಯಾರದ ಪಕ್ಕದಲ್ಲಿ',
      recordedAt: 'ಇಂದು ಬೆಳಿಗ್ಗೆ 10:30',
      notes: 'ಆಧಾರ್ ಕಾರ್ಡ್ ಮತ್ತು ₹500 ನಗದು ಇದೆ',
    },
  },
  'item-04': {
    en: {
      itemName: 'Morning Pillbox Organizer',
      locationRecorded: 'Dining table centerpiece next to the stainless steel water pitcher',
      recordedAt: '08:05 AM today',
      notes: '7-day lavender labeled pillbox',
    },
    hi: {
      itemName: 'सुबह की दवाइयों का डिब्बा',
      locationRecorded: 'डाइनिंग टेबल के बीच में स्टील के पानी के जग के पास',
      recordedAt: 'आज सुबह 08:05',
      notes: '7-दिन का लेबल लगा हुआ लैवेंडर रंग का दवा डिब्बा',
    },
    mr: {
      itemName: 'सकाळचा औषधांचा डबा',
      locationRecorded: 'जेवणाच्या टेबलाच्या मध्यभागी स्टीलच्या पाण्याच्या जगजवळ',
      recordedAt: 'आज सकाळी ०८:०५',
      notes: '७-दिवसांचा लेबल असलेला लॅव्हेंडर औषध डबा',
    },
    bn: {
      itemName: 'সকালের ওষুধের বাক্স',
      locationRecorded: 'খাবার টেবিলের মাঝখানে স্টিলের জলের জগের পাশে',
      recordedAt: 'আজ সকাল ০৮:০৫',
      notes: '৭-দিনের লেবেল দেওয়া ল্যাভেন্ডার রঙের পিলবক্স',
    },
    ta: {
      itemName: 'காலை மாத்திரை பெட்டி',
      locationRecorded: 'உணவு மேசையின் நடுவில் ஸ்டீல் தண்ணீர் குவளைக்கு அருகில்',
      recordedAt: 'இன்று காலை 08:05',
      notes: '7-நாள் பெயரிடப்பட்ட லாவெண்டர் மாத்திரை பெட்டி',
    },
    te: {
      itemName: 'ఉదయం మాత్రల పెట్టె',
      locationRecorded: 'భోజనపు టేబుల్ మధ్యలో స్టీల్ నీటి జగ్ పక్కన',
      recordedAt: 'ఈరోజు ఉదయం 08:05',
      notes: '7-రోజుల లేబుల్ చేసిన లావెండర్ మాత్రల పెట్టె',
    },
    kn: {
      itemName: 'ಬೆಳಗಿನ ಮಾತ್ರೆ ಪೆಟ್ಟಿಗೆ',
      locationRecorded: 'ಊಟದ ಮೇಜಿನ ಮಧ್ಯದಲ್ಲಿ ಸ್ಟೀಲ್ ನೀರಿನ ಜಗ್ ಪಕ್ಕದಲ್ಲಿ',
      recordedAt: 'ಇಂದು ಬೆಳಿಗ್ಗೆ 08:05',
      notes: '7-ದಿನದ ಲೇಬಲ್ ಇರುವ ಲ್ಯಾವೆಂಡರ್ ಮಾತ್ರೆ ಪೆಟ್ಟಿಗೆ',
    },
  },
  'item-05': {
    en: {
      itemName: 'Television Remote Control',
      locationRecorded: 'Living room small woven tray next to your knitted cushion',
      recordedAt: 'Last night',
      notes: 'Black Sony TV remote with fresh batteries',
    },
    hi: {
      itemName: 'टीवी रिमोट कंट्रोल',
      locationRecorded: 'बैठक कक्ष में बुने हुए छोटे ट्रे में आपके कुशन के पास',
      recordedAt: 'कल रात',
      notes: 'नए सेल वाला काला सोनी टीवी रिमोट',
    },
    mr: {
      itemName: 'टीव्ही रिमोट कंट्रोल',
      locationRecorded: 'दिवाणखान्यात विणलेल्या छोट्या ट्रेमध्ये उशीशेजारी',
      recordedAt: 'काल रात्री',
      notes: 'नवीन बॅटरी असलेला काळा सोनी टीव्ही रिमोट',
    },
    bn: {
      itemName: 'টিভি রিমোট কন্ট্রোল',
      locationRecorded: 'বসার ঘরের ছোট বোনা ট্রে-তে আপনার কুশনের পাশে',
      recordedAt: 'গত রাতে',
      notes: 'নতুন ব্যাটারিসহ কালো সোনি টিভি রিমোট',
    },
    ta: {
      itemName: 'டிவி ரிமோட் கண்ட்ரோல்',
      locationRecorded: 'வரவேற்பறையில் உள்ள சிறிய கூடையில் உங்கள் தலையணைக்கு அருகில்',
      recordedAt: 'நேற்று இரவு',
      notes: 'புதிய பேட்டரிகளுடன் கருப்பு சோனி டிவி ரிமோட்',
    },
    te: {
      itemName: 'టీవీ రిమోట్ కంట్రోల్',
      locationRecorded: 'లివింగ్ రూమ్‌లో చిన్న అల్లిన ట్రేలో మీ కుషన్ పక్కన',
      recordedAt: 'గత రాత్రి',
      notes: 'కొత్త బ్యాటరీలతో ఉన్న నలుపు సోనీ టీవీ రిమోట్',
    },
    kn: {
      itemName: 'ಟಿವಿ ರಿಮೋಟ್ ಕಂಟ್ರೋಲ್',
      locationRecorded: 'ಹಾಲ್‌ನಲ್ಲಿರುವ ಸಣ್ಣ ಬುಟ್ಟಿಯಲ್ಲಿ ನಿಮ್ಮ ದಿಂಬಿನ ಪಕ್ಕದಲ್ಲಿ',
      recordedAt: 'ಕಳೆದ ರಾತ್ರಿ',
      notes: 'ಹೊಸ ಬ್ಯಾಟರಿಗಳೊಂದಿಗೆ ಕಪ್ಪು ಸೋನಿ ಟಿವಿ ರಿಮೋಟ್',
    },
  },
};

export const getTranslatedItemRecord = (
  item: ItemLocationRecord,
  language?: string
): {
  itemName: string;
  locationRecorded: string;
  room: string;
  recordedAt: string;
  notes?: string;
} => {
  const lang = normalizeLang(language);
  const preset = DEFAULT_ITEM_TRANSLATIONS[item.id]?.[lang];
  const justNowMap: Record<LangCode, string> = {
    en: 'Just now',
    hi: 'अभी',
    mr: 'आत्ताच',
    bn: 'এইমাত্র',
    ta: 'இப்போது',
    te: 'ఇప్పుడే',
    kn: 'ಈಗಷ್ಟೇ',
  };
  return {
    itemName: preset?.itemName || item.itemName,
    locationRecorded: preset?.locationRecorded || item.locationRecorded,
    room: getTranslatedRoomName(item.room, language),
    recordedAt: preset?.recordedAt || (item.recordedAt === 'Just now' ? justNowMap[lang] : item.recordedAt),
    notes: preset?.notes ?? item.notes,
  };
};
