import { MemoryNode } from '../types/memoryGraph.types.js';
import type { TimelineMilestone } from '../components/LivingMemoryTimeline.js';

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

export interface MemoryGraphUiStrings {
  allAnchors: string;
  people: string;
  places: string;
  events: string;
  activities: string;
  songs: string;
  photos: string;
  ofPrefix: string;
  verifiedAnchorsSuffix: string;
  relationalLinksSuffix: string;
  searchPlaceholder: string;
  searchAria: string;
  clearSearchAria: string;
  catFilterAria: string;
  noMatch: string;
  deleteNodeTitle: string;
  deleteAriaPrefix: string;
  approved: string;
  inspectorTitle: string;
  stopNarration: string;
  listenNarration: string;
  stopNarrationAria: string;
  listenNarrationAria: string;
  connectedRelationships: string;
  noLinksYet: string;
  linkedMemoryFallback: string;
  selectNodeHint: string;
  caregiverReassurance: string;
  addNodeTitle: string;
  memoryTypeLabel: string;
  optSharedEvent: string;
  optFavoriteActivity: string;
  optSong: string;
  optPhoto: string;
  optPlace: string;
  optPerson: string;
  titleNameLabel: string;
  titlePlaceholder: string;
  dupTitle: string;
  dupBodyTemplate: string;
  linkExistingBtn: string;
  calmDescLabel: string;
  calmDescPlaceholder: string;
  valenceLabel: string;
  valCalming: string;
  valJoyful: string;
  valGrounding: string;
  valNeutral: string;
  cuesLabel: string;
  cuesPlaceholder: string;
  cancel: string;
  saveApprove: string;
  linkModalTitle: string;
  sourceLabel: string;
  selectSource: string;
  targetLabel: string;
  selectTarget: string;
  relTypeLabel: string;
  relShared: string;
  relLoves: string;
  relEnjoyed: string;
  relPhotographed: string;
  relResided: string;
  relPhraseLabel: string;
  relPhrasePlaceholder: string;
  createConnection: string;
  nodeTypes: Record<string, string>;
}

const GRAPH_UI_MAP: Record<LangCode, MemoryGraphUiStrings> = {
  en: {
    allAnchors: 'All Anchors',
    people: 'People',
    places: 'Places',
    events: 'Events',
    activities: 'Activities',
    songs: 'Songs',
    photos: 'Photos',
    ofPrefix: 'of',
    verifiedAnchorsSuffix: 'Verified Anchors',
    relationalLinksSuffix: 'Relational Links',
    searchPlaceholder: 'Search anchors by name, description, or cue...',
    searchAria: 'Search memory anchors',
    clearSearchAria: 'Clear search',
    catFilterAria: 'Category filters',
    noMatch: 'No memory anchors match your filter.',
    deleteNodeTitle: 'Delete node',
    deleteAriaPrefix: 'Delete',
    approved: 'Approved',
    inspectorTitle: 'Memory Connection Inspector',
    stopNarration: 'Stop Asha Narration',
    listenNarration: 'Listen to Asha Narrate',
    stopNarrationAria: 'Stop Asha narration',
    listenNarrationAria: 'Listen to Asha narrate memory',
    connectedRelationships: 'Connected Relationships',
    noLinksYet: 'No relational links yet.',
    linkedMemoryFallback: 'Linked Memory',
    selectNodeHint: 'Select any memory node to view its verified connections and conversational prompts.',
    caregiverReassurance: '🛡️ Asha uses strictly caregiver-approved memories for reassurance.',
    addNodeTitle: 'Add Memory Anchor',
    memoryTypeLabel: 'Memory Type',
    optSharedEvent: 'Shared Event / Milestone',
    optFavoriteActivity: 'Favorite Activity',
    optSong: 'Familiar Song or Prayer',
    optPhoto: 'Photograph Memory',
    optPlace: 'Meaningful Place',
    optPerson: 'Person / Family',
    titleNameLabel: 'Title / Name',
    titlePlaceholder: 'e.g. Cardamom Tea on the Veranda',
    dupTitle: 'Memory anchor already exists!',
    dupBodyTemplate: '"{label}" is already registered. In relational memory care, linking to existing anchors is preferred over duplicates.',
    linkExistingBtn: 'Link to existing anchor instead →',
    calmDescLabel: 'Calm Description',
    calmDescPlaceholder: 'Explain this memory calmly as Asha would speak it.',
    valenceLabel: 'Emotional Valence',
    valCalming: 'Calming (gentle, soothing)',
    valJoyful: 'Joyful (celebration, happiness)',
    valGrounding: 'Grounding (reassurance, safety)',
    valNeutral: 'Neutral (factual memory)',
    cuesLabel: 'Recognition Cues (comma-separated)',
    cuesPlaceholder: 'e.g. Elaichi, Chai, Veranda, Garden',
    cancel: 'Cancel',
    saveApprove: 'Save & Approve',
    linkModalTitle: 'Link Two Memories',
    sourceLabel: 'Source Memory',
    selectSource: 'Select source memory...',
    targetLabel: 'Target Memory',
    selectTarget: 'Select target memory...',
    relTypeLabel: 'Relationship Type',
    relShared: 'Shared Moment / Memory',
    relLoves: 'Loves Listening To',
    relEnjoyed: 'Enjoyed Together',
    relPhotographed: 'Photographed With',
    relResided: 'Resided At / Visited',
    relPhraseLabel: 'Relationship Phrase',
    relPhrasePlaceholder: 'e.g. Priya always prepares cardamom tea with you.',
    createConnection: 'Create Connection',
    nodeTypes: {
      person: 'person',
      place: 'place',
      shared_event: 'shared event',
      favorite_activity: 'favorite activity',
      voice_or_song: 'voice or song',
      photo: 'photo',
    },
  },
  hi: {
    allAnchors: 'सभी स्मृतियाँ',
    people: 'लोग',
    places: 'स्थान',
    events: 'घटनाएँ',
    activities: 'गतिविधियाँ',
    songs: 'भजन / गीत',
    photos: 'तस्वीरें',
    ofPrefix: 'में से',
    verifiedAnchorsSuffix: 'सत्यापित स्मृतियाँ',
    relationalLinksSuffix: 'आपसी संबंध',
    searchPlaceholder: 'नाम, विवरण या संकेत से स्मृति खोजें...',
    searchAria: 'स्मृति खोजें',
    clearSearchAria: 'खोज साफ़ करें',
    catFilterAria: 'श्रेणी फ़िल्टर',
    noMatch: 'आपके फ़िल्टर से कोई स्मृति मेल नहीं खाती।',
    deleteNodeTitle: 'स्मृति हटाएँ',
    deleteAriaPrefix: 'हटाएँ',
    approved: 'स्वीकृत',
    inspectorTitle: 'स्मृति संबंध विवरण',
    stopNarration: 'आशा का वाचन रोकें',
    listenNarration: 'आशा से स्मृति सुनें',
    stopNarrationAria: 'आशा का वाचन रोकें',
    listenNarrationAria: 'आशा से स्मृति सुनें',
    connectedRelationships: 'जुड़े हुए संबंध',
    noLinksYet: 'अभी कोई जुड़ा हुआ संबंध नहीं है।',
    linkedMemoryFallback: 'जुड़ी स्मृति',
    selectNodeHint: 'सत्यापित संबंध और शांत संकेत देखने के लिए किसी भी स्मृति कार्ड को चुनें।',
    caregiverReassurance: '🛡️ आशा केवल परिवार द्वारा स्वीकृत सुरक्षित स्मृतियों का ही उपयोग करती है।',
    addNodeTitle: 'नई स्मृति जोड़ें',
    memoryTypeLabel: 'स्मृति प्रकार',
    optSharedEvent: 'साझा कार्यक्रम / यादगार पल',
    optFavoriteActivity: 'पसंदीदा गतिविधि',
    optSong: 'परिचित भजन या गीत',
    optPhoto: 'तस्वीर स्मृति',
    optPlace: 'महत्वपूर्ण स्थान',
    optPerson: 'व्यक्ति / परिवार',
    titleNameLabel: 'शीर्षक / नाम',
    titlePlaceholder: 'जैसे: बरामदे में इलायची वाली चाय',
    dupTitle: 'यह स्मृति पहले से मौजूद है!',
    dupBodyTemplate: '"{label}" पहले से दर्ज है। दोहराव के बजाय मौजूदा स्मृति से जोड़ना बेहतर है।',
    linkExistingBtn: 'मौजूदा स्मृति से जोड़ें →',
    calmDescLabel: 'शांत विवरण',
    calmDescPlaceholder: 'इस याद को शांत शब्दों में लिखें जैसे आशा सुनाती है।',
    valenceLabel: 'भावनात्मक भाव',
    valCalming: 'शांत और सुखद',
    valJoyful: 'आनंदमय और उत्सवपूर्ण',
    valGrounding: 'आश्वस्त करने वाला / सुरक्षित',
    valNeutral: 'तथ्यात्मक / सामान्य',
    cuesLabel: 'पहचान संकेत (कॉमा से अलग करें)',
    cuesPlaceholder: 'जैसे: इलायची, चाय, बरामदा, बगीचा',
    cancel: 'रद्द करें',
    saveApprove: 'सहेजें और स्वीकृत करें',
    linkModalTitle: 'दो स्मृतियों को जोड़ें',
    sourceLabel: 'स्रोत स्मृति',
    selectSource: 'स्रोत स्मृति चुनें...',
    targetLabel: 'लक्ष्य स्मृति',
    selectTarget: 'लक्ष्य स्मृति चुनें...',
    relTypeLabel: 'संबंध का प्रकार',
    relShared: 'साझा पल / याद',
    relLoves: 'सुनना पसंद है',
    relEnjoyed: 'साथ में आनंद लिया',
    relPhotographed: 'साथ में तस्वीर',
    relResided: 'निवास / भ्रमण किया',
    relPhraseLabel: 'संबंध वाक्य',
    relPhrasePlaceholder: 'जैसे: प्रिया हमेशा आपके साथ इलायची चाय बनाती हैं।',
    createConnection: 'संबंध जोड़ें',
    nodeTypes: {
      person: 'व्यक्ति',
      place: 'स्थान',
      shared_event: 'साझा घटना',
      favorite_activity: 'पसंदीदा गतिविधि',
      voice_or_song: 'गीत या भजन',
      photo: 'तस्वीर',
    },
  },
  mr: {
    allAnchors: 'सर्व आठवणी',
    people: 'व्यक्ती',
    places: 'ठिकाणे',
    events: 'प्रसंग',
    activities: 'उपक्रम',
    songs: 'गाणी / प्रार्थना',
    photos: 'फोटो',
    ofPrefix: 'पैकी',
    verifiedAnchorsSuffix: 'प्रमाणित स्मृती',
    relationalLinksSuffix: 'जोडलेले दुवे',
    searchPlaceholder: 'नाव, वर्णन किंवा खुणेने आठवण शोधा...',
    searchAria: 'स्मृती शोधा',
    clearSearchAria: 'शोध साफ करा',
    catFilterAria: 'वर्ग फिल्टर',
    noMatch: 'तुमच्या शोधाशी जुळणारी आठवण सापडली नाही.',
    deleteNodeTitle: 'आठवण काढून टाका',
    deleteAriaPrefix: 'काढून टाका',
    approved: 'मंजूर',
    inspectorTitle: 'स्मृती दुवा निरीक्षक',
    stopNarration: 'आशाचे कथन थांबवा',
    listenNarration: 'आशाकडून आठवण ऐका',
    stopNarrationAria: 'आशाचे कथन थांबवा',
    listenNarrationAria: 'आशाकडून आठवण ऐका',
    connectedRelationships: 'जोडलेले संबंध',
    noLinksYet: 'अजून कोणतेही दुवे जोडलेले नाहीत.',
    linkedMemoryFallback: 'जोडलेली आठवण',
    selectNodeHint: 'प्रमाणित दुवे आणि संवादात्मक खुणा पाहण्यासाठी कोणतीही आठवण निवडा.',
    caregiverReassurance: '🛡️ आशा फक्त काळजीवाहूंनी मंजूर केलेल्या सुरक्षित आठवणीच वापरते.',
    addNodeTitle: 'नवीन स्मृती जोडा',
    memoryTypeLabel: 'स्मृतीचा प्रकार',
    optSharedEvent: 'सामायिक प्रसंग / टप्पा',
    optFavoriteActivity: 'आवडता उपक्रम',
    optSong: 'परिचित गाणे किंवा आरती',
    optPhoto: 'छायाचित्र आठवण',
    optPlace: 'महत्त्वाचे ठिकाण',
    optPerson: 'व्यक्ती / कुटुंब',
    titleNameLabel: 'शीर्षक / नाव',
    titlePlaceholder: 'उदा. व्हरांड्यात वेलची चहा',
    dupTitle: 'ही आठवण आधीच जतन आहे!',
    dupBodyTemplate: '"{label}" आधीच नोंदवलेली आहे. पुन्हा नोंदवण्याऐवजी विद्यमान आठवणीशी जोडणे अधिक चांगले.',
    linkExistingBtn: 'विद्यमान आठवणीशी जोडा →',
    calmDescLabel: 'शांत वर्णन',
    calmDescPlaceholder: 'आशा जसे शांतपणे सांगेल तसे ही आठवण लिहा.',
    valenceLabel: 'भावनिक भाव',
    valCalming: 'शांत व सुखद',
    valJoyful: 'आनंददायी व उत्साही',
    valGrounding: 'आश्वासक व सुरक्षित',
    valNeutral: 'तथ्यात्मक आठवण',
    cuesLabel: 'ओळखीच्या खुणा (स्वल्पविरामाने वेगळ्या)',
    cuesPlaceholder: 'उदा. वेलची, चहा, व्हरांडा, बाग',
    cancel: 'रद्द करा',
    saveApprove: 'जतन आणि मंजूर करा',
    linkModalTitle: 'दोन आठवणी जोडा',
    sourceLabel: 'स्रोत आठवण',
    selectSource: 'स्रोत आठवण निवडा...',
    targetLabel: 'लक्ष्य आठवण',
    selectTarget: 'लक्ष्य आठवण निवडा...',
    relTypeLabel: 'नात्याचा प्रकार',
    relShared: 'सामायिक क्षण / आठवण',
    relLoves: 'ऐकायला आवडते',
    relEnjoyed: 'एकत्र आनंद घेतला',
    relPhotographed: 'सोबत छायाचित्र',
    relResided: 'राहिलेले / भेट दिलेले ठिकाण',
    relPhraseLabel: 'संबंध वाक्य',
    relPhrasePlaceholder: 'उदा. प्रिया नेहमी तुमच्यासोबत वेलची चहा बनवते.',
    createConnection: 'संबंध जोडा',
    nodeTypes: {
      person: 'व्यक्ती',
      place: 'ठिकाण',
      shared_event: 'सामायिक प्रसंग',
      favorite_activity: 'आवडता उपक्रम',
      voice_or_song: 'गाणे किंवा प्रार्थना',
      photo: 'फोटो',
    },
  },
  bn: {
    allAnchors: 'সমস্ত স্মৃতি',
    people: 'মানুষ',
    places: 'স্থান',
    events: 'ঘটনা',
    activities: 'কাজকর্ম',
    songs: 'গান / প্রার্থনা',
    photos: 'ছবি',
    ofPrefix: 'এর মধ্যে',
    verifiedAnchorsSuffix: 'যাচাইকৃত স্মৃতি',
    relationalLinksSuffix: 'পারস্পরিক সংযোগ',
    searchPlaceholder: 'নাম, বিবরণ বা ইঙ্গিত দিয়ে খুঁজুন...',
    searchAria: 'স্মৃতি খুঁজুন',
    clearSearchAria: 'অনুসন্ধান মুছুন',
    catFilterAria: 'বিভাগ ফিল্টার',
    noMatch: 'কোনো স্মৃতি মেলেনি।',
    deleteNodeTitle: 'স্মৃতি মুছুন',
    deleteAriaPrefix: 'মুছুন',
    approved: 'অনুমোদিত',
    inspectorTitle: 'স্মৃতি সংযোগ বিবরণ',
    stopNarration: 'আশার বলা থামান',
    listenNarration: 'আশার মুখে শুনুন',
    stopNarrationAria: 'আশার বলা থামান',
    listenNarrationAria: 'আশার মুখে স্মৃতি শুনুন',
    connectedRelationships: 'যুক্ত সম্পর্কসমূহ',
    noLinksYet: 'এখনো কোনো সংযোগ নেই।',
    linkedMemoryFallback: 'যুক্ত স্মৃতি',
    selectNodeHint: 'সংযোগ এবং কথা বলার সূত্র দেখতে যেকোনো স্মৃতি নির্বাচন করুন।',
    caregiverReassurance: '🛡️ আশা শুধুমাত্র পরিবারের অনুমোদিত নিরাপদ স্মৃতিই ব্যবহার করে।',
    addNodeTitle: 'নতুন স্মৃতি যোগ করুন',
    memoryTypeLabel: 'স্মৃতির ধরন',
    optSharedEvent: 'যৌথ অনুষ্ঠান / বিশেষ দিন',
    optFavoriteActivity: 'প্রিয় কাজ',
    optSong: 'পরিচিত গান বা প্রার্থনা',
    optPhoto: 'ছবির স্মৃতি',
    optPlace: 'গুরুত্বপূর্ণ স্থান',
    optPerson: 'ব্যক্তি / পরিবার',
    titleNameLabel: 'শিরোনাম / নাম',
    titlePlaceholder: 'যেমন: বারান্দায় এলাচ চা',
    dupTitle: 'স্মৃতিটি আগে থেকেই রয়েছে!',
    dupBodyTemplate: '"{label}" ইতিমধ্যেই নিবন্ধিত রয়েছে। নতুন তৈরির বদলে আগেরটির সাথে যুক্ত করাই ভালো।',
    linkExistingBtn: 'বিদ্যমান স্মৃতির সাথে যুক্ত করুন →',
    calmDescLabel: 'শান্ত বিবরণ',
    calmDescPlaceholder: 'আশা যেভাবে শান্তভাবে বলবে সেভাবে স্মৃতিটি লিখুন।',
    valenceLabel: 'মানসিক অনুভূতি',
    valCalming: 'শান্ত ও স্নিগ্ধ',
    valJoyful: 'আনন্দময় ও উৎসবের',
    valGrounding: 'নিরাপদ ও আশ্বস্তিকর',
    valNeutral: 'সাধারণ তথ্যমূলক',
    cuesLabel: 'চেনার ইঙ্গিত (কমা দিয়ে)',
    cuesPlaceholder: 'যেমন: এলাচ, চা, বারান্দা, বাগান',
    cancel: 'বাতিল',
    saveApprove: 'সেভ ও অনুমোদন করুন',
    linkModalTitle: 'দুটি স্মৃতি যুক্ত করুন',
    sourceLabel: 'উৎস স্মৃতি',
    selectSource: 'উৎস স্মৃতি বেছে নিন...',
    targetLabel: 'লক্ষ্য স্মৃতি',
    selectTarget: 'লক্ষ্য স্মৃতি বেছে নিন...',
    relTypeLabel: 'সম্পর্কের ধরন',
    relShared: 'যৌথ মুহূর্ত / স্মৃতি',
    relLoves: 'শুনতে ভালোবাসেন',
    relEnjoyed: 'একসাথে উপভোগ করেছেন',
    relPhotographed: 'একসাথে তোলা ছবি',
    relResided: 'বসবাস / ভ্রমণ করেছেন',
    relPhraseLabel: 'সম্পর্কের বর্ণনা',
    relPhrasePlaceholder: 'যেমন: প্রিয়া সবসময় আপনার সাথে এলাচ চা বানায়।',
    createConnection: 'সংযোগ তৈরি করুন',
    nodeTypes: {
      person: 'ব্যক্তি',
      place: 'স্থান',
      shared_event: 'যৌথ ঘটনা',
      favorite_activity: 'প্রিয় কাজ',
      voice_or_song: 'গান বা সুর',
      photo: 'ছবি',
    },
  },
  ta: {
    allAnchors: 'அனைத்து நினைவுகள்',
    people: 'நபர்கள்',
    places: 'இடங்கள்',
    events: 'நிகழ்வுகள்',
    activities: 'செயல்பாடுகள்',
    songs: 'பாடல்கள்',
    photos: 'புகைப்படங்கள்',
    ofPrefix: '/',
    verifiedAnchorsSuffix: 'சரிபார்க்கப்பட்ட நினைவுகள்',
    relationalLinksSuffix: 'தொடர்புகள்',
    searchPlaceholder: 'பெயர், விளக்கம் அல்லது குறிப்பால் தேடுங்கள்...',
    searchAria: 'நினைவுகளைத் தேடு',
    clearSearchAria: 'தேடலை அழி',
    catFilterAria: 'வகை வடிகட்டிகள்',
    noMatch: 'உங்கள் வடிகட்டிக்குப் பொருந்தும் நினைவுகள் இல்லை.',
    deleteNodeTitle: 'நினைவை நீக்கு',
    deleteAriaPrefix: 'நீக்கு',
    approved: 'அங்கீகரிக்கப்பட்டது',
    inspectorTitle: 'நினைவுத் தொடர்பு விவரம்',
    stopNarration: 'ஆஷா விவரிப்பை நிறுத்து',
    listenNarration: 'ஆஷா சொல்லக் கேளுங்கள்',
    stopNarrationAria: 'ஆஷா விவரிப்பை நிறுத்து',
    listenNarrationAria: 'ஆஷா நினைவைச் சொல்லக் கேளுங்கள்',
    connectedRelationships: 'இணைக்கப்பட்ட உறவுகள்',
    noLinksYet: 'தொடர்புகள் எதுவும் இல்லை.',
    linkedMemoryFallback: 'இணைக்கப்பட்ட நினைவு',
    selectNodeHint: 'தொடர்புகளையும் உரையாடல் குறிப்புகளையும் பார்க்க எந்தவொரு நினைவையும் தேர்ந்தெடுக்கவும்.',
    caregiverReassurance: '🛡️ ஆஷா குடும்பத்தினர் அங்கீகரித்த நினைவுகளை மட்டுமே பயன்படுத்துவாள்.',
    addNodeTitle: 'நினைவு சேர்க்கவும்',
    memoryTypeLabel: 'நினைவு வகை',
    optSharedEvent: 'பகிரப்பட்ட நிகழ்வு / மைல்கல்',
    optFavoriteActivity: 'விருப்பமான செயல்பாடு',
    optSong: 'பழக்கமான பாடல் அல்லது பிரார்த்தனை',
    optPhoto: 'புகைப்பட நினைவு',
    optPlace: 'அர்த்தமுள்ள இடம்',
    optPerson: 'நபர் / குடும்பம்',
    titleNameLabel: 'தலைப்பு / பெயர்',
    titlePlaceholder: 'எ.கா. வராண்டாவில் ஏலக்காய் தேநீர்',
    dupTitle: 'நினைவு ஏற்கனவே உள்ளது!',
    dupBodyTemplate: '"{label}" ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. நகல்களை விட உள்ள நினைவுடன் இணைப்பது சிறந்தது.',
    linkExistingBtn: 'உள்ள நினைவுடன் இணைக்கவும் →',
    calmDescLabel: 'அமைதியான விளக்கம்',
    calmDescPlaceholder: 'ஆஷா மென்மையாகச் சொல்வது போல் இதை எழுதுங்கள்.',
    valenceLabel: 'உணர்வு நிலை',
    valCalming: 'அமைதியானது',
    valJoyful: 'மகிழ்ச்சியானது',
    valGrounding: 'பாதுகாப்பானது',
    valNeutral: 'இயல்பானது',
    cuesLabel: 'நினைவூட்டல் குறிப்புகள் (கமா இட்டு)',
    cuesPlaceholder: 'எ.கா. ஏலக்காய், தேநீர், வராண்டா, தோட்டம்',
    cancel: 'ரத்து செய்',
    saveApprove: 'சேமி மற்றும் அங்கீகரி',
    linkModalTitle: 'இரு நினைவுகளை இணை',
    sourceLabel: 'மூல நினைவு',
    selectSource: 'மூல நினைவைத் தேர்ந்தெடு...',
    targetLabel: 'இலக்கு நினைவு',
    selectTarget: 'இலக்கு நினைவைத் தேர்ந்தெடு...',
    relTypeLabel: 'உறவு வகை',
    relShared: 'பகிரப்பட்ட தருணம்',
    relLoves: 'கேட்க விரும்புவது',
    relEnjoyed: 'சேர்ந்து மகிழ்ந்தது',
    relPhotographed: 'புகைப்படம் எடுத்தது',
    relResided: 'வசித்த / சென்ற இடம்',
    relPhraseLabel: 'உறவு வாக்கியம்',
    relPhrasePlaceholder: 'எ.கா. பிரியா எப்போதும் உங்களுடன் ஏலக்காய் தேநீர் தயாரிப்பாள்.',
    createConnection: 'தொடர்பை உருவாக்கு',
    nodeTypes: {
      person: 'நபர்',
      place: 'இடம்',
      shared_event: 'பகிரப்பட்ட நிகழ்வு',
      favorite_activity: 'விருப்பமான செயல்',
      voice_or_song: 'பாடல் / குரல்',
      photo: 'புகைப்படம்',
    },
  },
  te: {
    allAnchors: 'అన్ని జ్ఞాపకాలు',
    people: 'వ్యక్తులు',
    places: 'ప్రదేశాలు',
    events: 'సంఘటనలు',
    activities: 'కార్యకలాపాలు',
    songs: 'పాటలు',
    photos: 'ఫోటోలు',
    ofPrefix: '/',
    verifiedAnchorsSuffix: 'ధృవీకరించబడిన జ్ఞాపకాలు',
    relationalLinksSuffix: 'సంబంధ లింక్‌లు',
    searchPlaceholder: 'పేరు, వివరణ లేదా సూచన ద్వారా శోధించండి...',
    searchAria: 'జ్ఞాపకాలను శోధించండి',
    clearSearchAria: 'శోధనను క్లియర్ చేయండి',
    catFilterAria: 'వర్గ ఫిల్టర్లు',
    noMatch: 'మీ ఫిల్టర్‌కు సరిపోయే జ్ఞాపకాలు లేవు.',
    deleteNodeTitle: 'జ్ఞాపకాన్ని తొలగించు',
    deleteAriaPrefix: 'తొలగించు',
    approved: 'ఆమోదించబడింది',
    inspectorTitle: 'జ్ఞాపక సంబంధాల వివరాలు',
    stopNarration: 'ఆశా వివరణను ఆపండి',
    listenNarration: 'ఆశా మాటల్లో వినండి',
    stopNarrationAria: 'ఆశా వివరణను ఆపండి',
    listenNarrationAria: 'ఆశా జ్ఞాపకాన్ని వినండి',
    connectedRelationships: 'అనుసంధానమైన సంబంధాలు',
    noLinksYet: 'ఇంకా సంబంధాలు లేవు.',
    linkedMemoryFallback: 'అనుసంధానమైన జ్ఞాపకం',
    selectNodeHint: 'ధృవీకరించబడిన సంబంధాలు మరియు సంభాషణ సూచనలను చూడటానికి ఏదైనా జ్ఞాపకాన్ని ఎంచుకోండి.',
    caregiverReassurance: '🛡️ ఆశా కేవలం సంరక్షకులు ఆమోదించిన జ్ఞాపకాలను మాత్రమే ఉపయోగిస్తుంది.',
    addNodeTitle: 'కొత్త జ్ఞాపకం జోడించు',
    memoryTypeLabel: 'జ్ఞాపకం రకం',
    optSharedEvent: 'భాగస్వామ్య సంఘటన / మైలురాయి',
    optFavoriteActivity: 'ఇష్టమైన కార్యకలాపం',
    optSong: 'పరిచితమైన పాట లేదా ప్రార్థన',
    optPhoto: 'ఫోటో జ్ఞాపకం',
    optPlace: 'ముఖ్యమైన ప్రదేశం',
    optPerson: 'వ్యక్తి / కుటుంబం',
    titleNameLabel: 'శీర్షిక / పేరు',
    titlePlaceholder: 'ఉదా. వరండాలో యాలకుల టీ',
    dupTitle: 'ఈ జ్ఞాపకం ఇప్పటికే ఉంది!',
    dupBodyTemplate: '"{label}" ఇప్పటికే నమోదు చేయబడింది. నకిలీల కంటే ఉన్న జ్ఞాపకంతో కలపడం మంచిది.',
    linkExistingBtn: 'ఉన్న జ్ఞాపకంతో కలపండి →',
    calmDescLabel: 'ప్రశాంతమైన వివరణ',
    calmDescPlaceholder: 'ఆశా ప్రశాంతంగా చెప్పేలా ఈ జ్ఞాపకాన్ని వివరించండి.',
    valenceLabel: 'భావోద్వేగ స్వభావం',
    valCalming: 'ప్రశాంతమైనది',
    valJoyful: 'ఆనందకరమైనది',
    valGrounding: 'భద్రమైనది మరియు నమ్మకమైనది',
    valNeutral: 'సాధారణ వాస్తవ జ్ఞాపకం',
    cuesLabel: 'గుర్తింపు సూచనలు (కామాతో విభజించండి)',
    cuesPlaceholder: 'ఉదా. యాలకులు, టీ, వరండా, తోట',
    cancel: 'రద్దు చేయండి',
    saveApprove: 'సేవ్ చేసి ఆమోదించండి',
    linkModalTitle: 'రెండు జ్ఞాపకాలను కలపండి',
    sourceLabel: 'మూల జ్ఞాపకం',
    selectSource: 'మూల జ్ఞాపకాన్ని ఎంచుకోండి...',
    targetLabel: 'లక్ష్య జ్ఞాపకం',
    selectTarget: 'లక్ష్య జ్ఞాపకాన్ని ఎంచుకోండి...',
    relTypeLabel: 'సంబంధం రకం',
    relShared: 'భాగస్వామ్య క్షణం',
    relLoves: 'వినడానికి ఇష్టపడతారు',
    relEnjoyed: 'కలిసి ఆనందించారు',
    relPhotographed: 'కలిసి ఫోటో దిగారు',
    relResided: 'నివసించిన / సందర్శించిన ప్రదేశం',
    relPhraseLabel: 'సంబంధ వాక్యం',
    relPhrasePlaceholder: 'ఉదా. ప్రియా ఎల్లప్పుడూ మీతో యాలకుల టీ చేస్తుంది.',
    createConnection: 'సంబంధం సృష్టించండి',
    nodeTypes: {
      person: 'వ్యక్తి',
      place: 'ప్రదేశం',
      shared_event: 'భాగస్వామ్య సంఘటన',
      favorite_activity: 'ఇష్టమైన పని',
      voice_or_song: 'పాట / స్వరం',
      photo: 'ఫోటో',
    },
  },
  kn: {
    allAnchors: 'ಎಲ್ಲಾ ನೆನಪುಗಳು',
    people: 'ಜನರು',
    places: 'ಸ್ಥಳಗಳು',
    events: 'ಘಟನೆಗಳು',
    activities: 'ಚಟುವಟಿಕೆಗಳು',
    songs: 'ಹಾಡುಗಳು',
    photos: 'ಫೋಟೋಗಳು',
    ofPrefix: '/',
    verifiedAnchorsSuffix: 'ದೃಢೀಕೃತ ನೆನಪುಗಳು',
    relationalLinksSuffix: 'ಸಂಬಂಧ ಕೊಂಡಿಗಳು',
    searchPlaceholder: 'ಹೆಸರು, ವಿವರಣೆ ಅಥವಾ ಸುಳಿವಿನಿಂದ ಹುಡುಕಿ...',
    searchAria: 'ನೆನಪುಗಳನ್ನು ಹುಡುಕಿ',
    clearSearchAria: 'ಹುಡುಕಾಟ ತೆರವುಗೊಳಿಸಿ',
    catFilterAria: 'ವರ್ಗ ಫಿಲ್ಟರ್‌ಗಳು',
    noMatch: 'ನಿಮ್ಮ ಫಿಲ್ಟರ್‌ಗೆ ಹೊಂದಿಕೆಯಾಗುವ ನೆನಪುಗಳಿಲ್ಲ.',
    deleteNodeTitle: 'ನೆನಪು ಅಳಿಸಿ',
    deleteAriaPrefix: 'ಅಳಿಸಿ',
    approved: 'ಅನುಮೋದಿಸಲಾಗಿದೆ',
    inspectorTitle: 'ನೆನಪಿನ ಸಂಪರ್ಕ ವಿವರ',
    stopNarration: 'ಆಶಾ ನಿರೂಪಣೆ ನಿಲ್ಲಿಸಿ',
    listenNarration: 'ಆಶಾ ಹೇಳುವುದನ್ನು ಕೇಳಿ',
    stopNarrationAria: 'ಆಶಾ ನಿರೂಪಣೆ ನಿಲ್ಲಿಸಿ',
    listenNarrationAria: 'ಆಶಾ ನೆನಪನ್ನು ಕೇಳಿ',
    connectedRelationships: 'ಸಂಪರ್ಕಿತ ಸಂಬಂಧಗಳು',
    noLinksYet: 'ಇನ್ನೂ ಯಾವುದೇ ಸಂಬಂಧಗಳಿಲ್ಲ.',
    linkedMemoryFallback: 'ಸಂಪರ್ಕಿತ ನೆನಪು',
    selectNodeHint: 'ದೃಢೀಕೃತ ಸಂಪರ್ಕಗಳು ಮತ್ತು ಸಂವಾದ ಸುಳಿವುಗಳನ್ನು ನೋಡಲು ಯಾವುದೇ ನೆನಪನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
    caregiverReassurance: '🛡️ ಆಶಾ ಆರೈಕೆದಾರರು ಅನುಮೋದಿಸಿದ ನೆನಪುಗಳನ್ನು ಮಾತ್ರ ಬಳಸುತ್ತಾಳೆ.',
    addNodeTitle: 'ಹೊಸ ನೆನಪು ಸೇರಿಸಿ',
    memoryTypeLabel: 'ನೆನಪಿನ ಪ್ರಕಾರ',
    optSharedEvent: 'ಹಂಚಿದ ಘಟನೆ / ಮೈಲಿಗಲ್ಲು',
    optFavoriteActivity: 'ನೆಚ್ಚಿನ ಚಟುವಟಿಕೆ',
    optSong: 'ಪರಿಚಿತ ಹಾಡು ಅಥವಾ ಪ್ರಾರ್ಥನೆ',
    optPhoto: 'ಫೋಟೋ ನೆನಪು',
    optPlace: 'ಮಹತ್ವದ ಸ್ಥಳ',
    optPerson: 'ವ್ಯಕ್ತಿ / ಕುಟುಂಬ',
    titleNameLabel: 'ಶೀರ್ಷಿಕೆ / ಹೆಸರು',
    titlePlaceholder: 'ಉದಾ. ವರಾಂಡದಲ್ಲಿ ಏಲಕ್ಕಿ ಚಹಾ',
    dupTitle: 'ಈ ನೆನಪು ಈಗಾಗಲೇ ಇದೆ!',
    dupBodyTemplate: '"{label}" ಈಗಾಗಲೇ ದಾಖಲಾಗಿದೆ. ನಕಲುಗಳಿಗಿಂತ ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ ನೆನಪಿಗೆ ಜೋಡಿಸುವುದು ಉತ್ತಮ.',
    linkExistingBtn: 'ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ ನೆನಪಿಗೆ ಜೋಡಿಸಿ →',
    calmDescLabel: 'ಶಾಂತ ವಿವರಣೆ',
    calmDescPlaceholder: 'ಆಶಾ ಶಾಂತವಾಗಿ ಹೇಳುವಂತೆ ಈ ನೆನಪನ್ನು ವಿವರಿಸಿ.',
    valenceLabel: 'ಭಾವನಾತ್ಮಕ ಭಾವನೆ',
    valCalming: 'ಶಾಂತ ಮತ್ತು ಹಿತಕರ',
    valJoyful: 'ಸಂತೋಷದಾಯಕ',
    valGrounding: 'ಸುರಕ್ಷಿತ ಮತ್ತು ಧೈರ್ಯ ನೀಡುವ',
    valNeutral: 'ವಾಸ್ತವಿಕ ನೆನಪು',
    cuesLabel: 'ಗುರುತಿನ ಸುಳಿವುಗಳು (ಅಲ್ಪವಿರಾಮದಿಂದ ಬೇರ್ಪಡಿಸಿ)',
    cuesPlaceholder: 'ಉದಾ. ಏಲಕ್ಕಿ, ಚಹಾ, ವರಾಂಡ, ತೋಟ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    saveApprove: 'ಉಳಿಸಿ ಮತ್ತು ಅನುಮೋದಿಸಿ',
    linkModalTitle: 'ಎರಡು ನೆನಪುಗಳನ್ನು ಜೋಡಿಸಿ',
    sourceLabel: 'ಮೂಲ ನೆನಪು',
    selectSource: 'ಮೂಲ ನೆನಪು ಆಯ್ಕೆಮಾಡಿ...',
    targetLabel: 'ಗುರಿ ನೆನಪು',
    selectTarget: 'ಗುರಿ ನೆನಪು ಆಯ್ಕೆಮಾಡಿ...',
    relTypeLabel: 'ಸಂಬಂಧದ ಪ್ರಕಾರ',
    relShared: 'ಹಂಚಿದ ಕ್ಷಣ / ನೆನಪು',
    relLoves: 'ಕೇಳಲು ಇಷ್ಟಪಡುತ್ತಾರೆ',
    relEnjoyed: 'ಒಟ್ಟಿಗೆ ಆನಂದಿಸಿದರು',
    relPhotographed: 'ಜೊತೆಗಿನ ಫೋಟೋ',
    relResided: 'ವಾಸಿಸಿದ / ಭೇಟಿ ನೀಡಿದ ಸ್ಥಳ',
    relPhraseLabel: 'ಸಂಬಂಧದ ವಾಕ್ಯ',
    relPhrasePlaceholder: 'ಉದಾ. ಪ್ರಿಯಾ ಯಾವಾಗಲೂ ನಿಮ್ಮೊಂದಿಗೆ ಏಲಕ್ಕಿ ಚಹಾ ತಯಾರಿಸುತ್ತಾಳೆ.',
    createConnection: 'ಸಂಪರ್ಕ ರಚಿಸಿ',
    nodeTypes: {
      person: 'ವ್ಯಕ್ತಿ',
      place: 'ಸ್ಥಳ',
      shared_event: 'ಹಂಚಿದ ಘಟನೆ',
      favorite_activity: 'ನೆಚ್ಚಿನ ಚಟುವಟಿಕೆ',
      voice_or_song: 'ಹಾಡು / ಪ್ರಾರ್ಥನೆ',
      photo: 'ಫೋಟೋ',
    },
  },
};

export const getMemoryGraphUi = (language?: string): MemoryGraphUiStrings => {
  return GRAPH_UI_MAP[normalizeLang(language)];
};

export interface TimelineUiStrings {
  filterAria: string;
  catAll: string;
  catFamily: string;
  catEvent: string;
  catPlace: string;
  catExperience: string;
  listenAriaPrefix: string;
  stopSpeech: string;
  ashaVoice: string;
  closeAddAria: string;
  addTitle: string;
  addSub: string;
  yearLabel: string;
  categoryLabel: string;
  optFamily: string;
  optEvent: string;
  optPlace: string;
  optExperience: string;
  milestoneTitleLabel: string;
  milestoneTitlePlaceholder: string;
  locationLabel: string;
  locationPlaceholder: string;
  peopleLabel: string;
  peoplePlaceholder: string;
  descLabel: string;
  descPlaceholder: string;
  cancel: string;
  saveMilestone: string;
  inYearPrefix: string;
}

const TIMELINE_UI_MAP: Record<LangCode, TimelineUiStrings> = {
  en: {
    filterAria: 'Filter timeline categories',
    catAll: 'All Milestones',
    catFamily: 'Family Milestones',
    catEvent: 'Life Events',
    catPlace: 'Familiar Places',
    catExperience: 'Experiences',
    listenAriaPrefix: 'Listen to Asha describe',
    stopSpeech: 'Stop Speech',
    ashaVoice: 'Asha Voice',
    closeAddAria: 'Close add milestone modal',
    addTitle: 'Add Memory Milestone',
    addSub: 'Caregiver-verified milestones for calm, factual recall',
    yearLabel: 'Year *',
    categoryLabel: 'Category *',
    optFamily: 'Family Milestone',
    optEvent: 'Life Event',
    optPlace: 'Familiar Place',
    optExperience: 'Experience',
    milestoneTitleLabel: 'Milestone Title *',
    milestoneTitlePlaceholder: 'e.g. Pune Balcony Tea Sanctuary',
    locationLabel: 'Location',
    locationPlaceholder: 'e.g. Pune, Maharashtra',
    peopleLabel: 'People Involved',
    peoplePlaceholder: 'e.g. Priya, Arvind',
    descLabel: 'Warm Reassuring Description *',
    descPlaceholder: 'Describe this memory gently. Asha reads this to reassure the patient.',
    cancel: 'Cancel',
    saveMilestone: 'Save Milestone',
    inYearPrefix: 'in',
  },
  hi: {
    filterAria: 'समयरेखा श्रेणियाँ फ़िल्टर करें',
    catAll: 'सभी स्मृतियाँ',
    catFamily: 'पारिवारिक पल',
    catEvent: 'जीवन के प्रसंग',
    catPlace: 'परिचित स्थान',
    catExperience: 'अनुभव',
    listenAriaPrefix: 'आशा से सुनें:',
    stopSpeech: 'वाणी रोकें',
    ashaVoice: 'आशा की आवाज़',
    closeAddAria: 'नई स्मृति विंडो बंद करें',
    addTitle: 'नई यादगार स्मृति जोड़ें',
    addSub: 'शांत व सटीक स्मरण के लिए परिवार-सत्यापित मील के पत्थर',
    yearLabel: 'वर्ष *',
    categoryLabel: 'श्रेणी *',
    optFamily: 'पारिवारिक पल',
    optEvent: 'जीवन का प्रसंग',
    optPlace: 'परिचित स्थान',
    optExperience: 'सुखद अनुभव',
    milestoneTitleLabel: 'स्मृति का शीर्षक *',
    milestoneTitlePlaceholder: 'जैसे: पुणे बालकनी चाय कोना',
    locationLabel: 'स्थान',
    locationPlaceholder: 'जैसे: पुणे, महाराष्ट्र',
    peopleLabel: 'शामिल लोग',
    peoplePlaceholder: 'जैसे: प्रिया, अरविंद',
    descLabel: 'मधुर आश्वस्त विवरण *',
    descPlaceholder: 'इस स्मृति को शांति से लिखें। आशा इसे पढ़कर मन शांत करती है।',
    cancel: 'रद्द करें',
    saveMilestone: 'स्मृति सहेजें',
    inYearPrefix: 'सन्',
  },
  mr: {
    filterAria: 'कालरेषा वर्ग फिल्टर करा',
    catAll: 'सर्व टप्पे',
    catFamily: 'कौटुंबिक टप्पे',
    catEvent: 'जीवनातील प्रसंग',
    catPlace: 'ओळखीची ठिकाणे',
    catExperience: 'अनुभव',
    listenAriaPrefix: 'आशाकडून वर्णन ऐका:',
    stopSpeech: 'आवाज थांबवा',
    ashaVoice: 'आशा आवाज',
    closeAddAria: 'नवीन टप्पा विंडो बंद करा',
    addTitle: 'नवीन स्मृती टप्पा जोडा',
    addSub: 'शांत आणि अचूक आठवणीसाठी काळजीवाहू-प्रमाणित टप्पे',
    yearLabel: 'वर्ष *',
    categoryLabel: 'प्रकार *',
    optFamily: 'कौटुंबिक टप्पा',
    optEvent: 'जीवनातील प्रसंग',
    optPlace: 'ओळखीचे ठिकाण',
    optExperience: 'सुखद अनुभव',
    milestoneTitleLabel: 'टप्प्याचे शीर्षक *',
    milestoneTitlePlaceholder: 'उदा. पुणे बाल्कनी चहा जागा',
    locationLabel: 'ठिकाण',
    locationPlaceholder: 'उदा. पुणे, महाराष्ट्र',
    peopleLabel: 'समाविष्ट व्यक्ती',
    peoplePlaceholder: 'उदा. प्रिया, अरविंद',
    descLabel: 'उबदार आश्वासक वर्णन *',
    descPlaceholder: 'ही आठवण हळुवारपणे लिहा. आशा हे वाचून धीर देते.',
    cancel: 'रद्द करा',
    saveMilestone: 'टप्पा जतन करा',
    inYearPrefix: 'वर्ष',
  },
  bn: {
    filterAria: 'সময়রেখা বিভাগ ফিল্টার করুন',
    catAll: 'সব স্মৃতি',
    catFamily: 'পারিবারিক স্মৃতি',
    catEvent: 'জীবনের ঘটনা',
    catPlace: 'পরিচিত জায়গা',
    catExperience: 'অভিজ্ঞতা',
    listenAriaPrefix: 'আশার মুখে শুনুন:',
    stopSpeech: 'কথা থামান',
    ashaVoice: 'আশার কণ্ঠস্বর',
    closeAddAria: 'স্মৃতি যোগ উইন্ডো বন্ধ করুন',
    addTitle: 'নতুন স্মৃতির মাইলফলক যোগ করুন',
    addSub: 'শান্ত ও সঠিক স্মরণ করার জন্য পরিবারের যাচাইকৃত স্মৃতি',
    yearLabel: 'বছর *',
    categoryLabel: 'বিভাগ *',
    optFamily: 'পারিবারিক স্মৃতি',
    optEvent: 'জীবনের ঘটনা',
    optPlace: 'পরিচিত জায়গা',
    optExperience: 'অভিজ্ঞতা',
    milestoneTitleLabel: 'স্মৃতির শিরোনাম *',
    milestoneTitlePlaceholder: 'যেমন: পুনে বারান্দায় চায়ের সময়',
    locationLabel: 'স্থান',
    locationPlaceholder: 'যেমন: পুনে, মহারাষ্ট্র',
    peopleLabel: 'যুক্ত মানুষেরা',
    peoplePlaceholder: 'যেমন: প্রিয়া, অরবিন্দ',
    descLabel: 'আন্তরিক ও শান্ত বিবরণ *',
    descPlaceholder: 'এই স্মৃতিটি শান্তভাবে বর্ণনা করুন। আশা এটি পড়ে শোনায়।',
    cancel: 'বাতিল',
    saveMilestone: 'স্মৃতি সংরক্ষণ করুন',
    inYearPrefix: 'সাল',
  },
  ta: {
    filterAria: 'காலவரிசை வகைகளை வடிகட்டு',
    catAll: 'அனைத்து மைல்கற்கள்',
    catFamily: 'குடும்ப நினைவுகள்',
    catEvent: 'வாழ்க்கை நிகழ்வுகள்',
    catPlace: 'பழக்கமான இடங்கள்',
    catExperience: 'அனுபவங்கள்',
    listenAriaPrefix: 'ஆஷா விவரிப்பதைக் கேள்:',
    stopSpeech: 'பேச்சை நிறுத்து',
    ashaVoice: 'ஆஷா குரல்',
    closeAddAria: 'மைல்கல் சேர்ப்பு சாளரத்தை மூடு',
    addTitle: 'நினைவு மைல்கல் சேர்க்கவும்',
    addSub: 'அமைதியான நினைவூட்டலுக்கான குடும்பம் சரிபார்த்த மைல்கற்கள்',
    yearLabel: 'ஆண்டு *',
    categoryLabel: 'வகை *',
    optFamily: 'குடும்ப மைல்கல்',
    optEvent: 'வாழ்க்கை நிகழ்வு',
    optPlace: 'பழக்கமான இடம்',
    optExperience: 'அனுபவம்',
    milestoneTitleLabel: 'மைல்கல் தலைப்பு *',
    milestoneTitlePlaceholder: 'எ.கா. புனே பால்கனி தேநீர் நேரம்',
    locationLabel: 'இடம்',
    locationPlaceholder: 'எ.கா. புனே, மகாராஷ்டிரா',
    peopleLabel: 'சம்பந்தப்பட்ட நபர்கள்',
    peoplePlaceholder: 'எ.கா. பிரியா, அரவிந்த்',
    descLabel: 'அன்பான அமைதியான விளக்கம் *',
    descPlaceholder: 'இந்த நினைவை மென்மையாக விவரிக்கவும். ஆஷா இதைப் படிப்பாள்.',
    cancel: 'ரத்து செய்',
    saveMilestone: 'மைல்கல்லைச் சேமி',
    inYearPrefix: 'ஆண்டு',
  },
  te: {
    filterAria: 'టైమ్‌లైన్ వర్గాలను ఫిల్టర్ చేయండి',
    catAll: 'అన్ని మైలురాళ్ళు',
    catFamily: 'కుటుంబ మైలురాళ్ళు',
    catEvent: 'జీవిత సంఘటనలు',
    catPlace: 'పరిచిత ప్రదేశాలు',
    catExperience: 'అనుభవాలు',
    listenAriaPrefix: 'ఆశా వివరణ వినండి:',
    stopSpeech: 'మాట ఆపండి',
    ashaVoice: 'ఆశా స్వరం',
    closeAddAria: 'మైలురాయి జోడించు విండో మూసివేయండి',
    addTitle: 'జ్ఞాపక మైలురాయిని జోడించండి',
    addSub: 'ప్రశాంత జ్ఞాపకం కోసం సంరక్షకులు ధృవీకరించిన మైలురాళ్ళు',
    yearLabel: 'సంవత్సరం *',
    categoryLabel: 'వర్గం *',
    optFamily: 'కుటుంబ మైలురాయి',
    optEvent: 'జీవిత సంఘటన',
    optPlace: 'పరిచిత ప్రదేశం',
    optExperience: 'అనుభవం',
    milestoneTitleLabel: 'మైలురాయి శీర్షిక *',
    milestoneTitlePlaceholder: 'ఉదా. పూణే బాల్కనీ టీ విశ్రాంతి',
    locationLabel: 'ప్రదేశం',
    locationPlaceholder: 'ఉదా. పూణే, మహారాష్ట్ర',
    peopleLabel: 'సంబంధిత వ్యక్తులు',
    peoplePlaceholder: 'ఉదా. ప్రియా, అరవింద్',
    descLabel: 'ఆప్యాయమైన వివరణ *',
    descPlaceholder: 'ఈ జ్ఞాపకాన్ని మృదువుగా వివరించండి. ఆశా దీనిని చదివి ధైర్యం చెప్తుంది.',
    cancel: 'రద్దు చేయండి',
    saveMilestone: 'మైలురాయిని సేవ్ చేయండి',
    inYearPrefix: 'సంవత్సరం',
  },
  kn: {
    filterAria: 'ಕಾಲಾನುಕ್ರಮ ವರ್ಗಗಳನ್ನು ಫಿಲ್ಟರ್ ಮಾಡಿ',
    catAll: 'ಎಲ್ಲಾ ಮೈಲಿಗಲ್ಲುಗಳು',
    catFamily: 'ಕುಟುಂಬ ಮೈಲಿಗಲ್ಲುಗಳು',
    catEvent: 'ಜೀವನ ಘಟನೆಗಳು',
    catPlace: 'ಪರಿಚಿತ ಸ್ಥಳಗಳು',
    catExperience: 'ಅನುಭವಗಳು',
    listenAriaPrefix: 'ಆಶಾ ವಿವರಣೆ ಕೇಳಿ:',
    stopSpeech: 'ಮಾತು ನಿಲ್ಲಿಸಿ',
    ashaVoice: 'ಆಶಾ ಧ್ವನಿ',
    closeAddAria: 'ಮೈಲಿಗಲ್ಲು ಸೇರಿಸುವ ಕಿಟಕಿ ಮುಚ್ಚಿ',
    addTitle: 'ನೆನಪಿನ ಮೈಲಿಗಲ್ಲು ಸೇರಿಸಿ',
    addSub: 'ಶಾಂತ ಸ್ಮರಣೆಗಾಗಿ ಆರೈಕೆದಾರರು ದೃಢೀಕರಿಸಿದ ಮೈಲಿಗಲ್ಲುಗಳು',
    yearLabel: 'ವರ್ಷ *',
    categoryLabel: 'ವರ್ಗ *',
    optFamily: 'ಕುಟುಂಬ ಮೈಲಿಗಲ್ಲು',
    optEvent: 'ಜೀವನ ಘಟನೆ',
    optPlace: 'ಪರಿಚಿತ ಸ್ಥಳ',
    optExperience: 'ಅನುಭವ',
    milestoneTitleLabel: 'ಮೈಲಿಗಲ್ಲು ಶೀರ್ಷಿಕೆ *',
    milestoneTitlePlaceholder: 'ಉದಾ. ಪುಣೆ ಬಾಲ್ಕನಿ ಚಹಾ ತಾಣ',
    locationLabel: 'ಸ್ಥಳ',
    locationPlaceholder: 'ಉದಾ. ಪುಣೆ, ಮಹಾರಾಷ್ಟ್ರ',
    peopleLabel: 'ಸಂಬಂಧಿಸಿದ ಜನರು',
    peoplePlaceholder: 'ಉದಾ. ಪ್ರಿಯಾ, ಅರವಿಂದ್',
    descLabel: 'ಪ್ರೀತಿಯ ಶಾಂತ ವಿವರಣೆ *',
    descPlaceholder: 'ಈ ನೆನಪನ್ನು ಮೃದುವಾಗಿ ವಿವರಿಸಿ. ಆಶಾ ಇದನ್ನು ಓದಿ ಧೈರ್ಯ ನೀಡುತ್ತಾಳೆ.',
    cancel: 'ರದ್ದುಮಾಡಿ',
    saveMilestone: 'ಮೈಲಿಗಲ್ಲು ಉಳಿಸಿ',
    inYearPrefix: 'ವರ್ಷ',
  },
};

export const getTimelineUi = (language?: string): TimelineUiStrings => {
  return TIMELINE_UI_MAP[normalizeLang(language)];
};

const DEFAULT_MILESTONES_I18N: Record<
  string,
  Record<LangCode, { title: string; dateStr: string; location: string; description: string; people?: string[] }>
> = {
  tm_2005_graduation: {
    en: {
      dateStr: '18 June 2005',
      title: "Priya's University Graduation",
      location: 'Pune University, Pune',
      description:
        'A proud day celebrating Priya earning her engineering degree. Sunita draped her favorite royal blue silk saree for the ceremony.',
      people: ['Priya', 'Sunita', 'Arvind'],
    },
    hi: {
      dateStr: '18 जून 2005',
      title: 'प्रिया का विश्वविद्यालय दीक्षांत समारोह',
      location: 'पुणे विश्वविद्यालय, पुणे',
      description:
        'प्रिया के इंजीनियरिंग स्नातक बनने का गौरवपूर्ण दिन। समारोह के लिए सुनीता जी ने अपनी पसंदीदा शाही नीली रेशमी साड़ी पहनी थी।',
      people: ['प्रिया', 'सुनीता', 'अरविंद'],
    },
    mr: {
      dateStr: '१८ जून २००५',
      title: 'प्रियाचा विद्यापीठ पदवीदान समारंभ',
      location: 'पुणे विद्यापीठ, पुणे',
      description:
        'प्रियाने अभियांत्रिकी पदवी मिळवल्याचा अभिमानाचा दिवस. समारंभासाठी सुनीता यांनी त्यांची आवडती निळी रेशमी साडी नेसली होती.',
      people: ['प्रिया', 'सुनीता', 'अरविंद'],
    },
    bn: {
      dateStr: '১৮ জুন ২০০৫',
      title: 'প্রিয়ার বিশ্ববিদ্যালয় সমাবর্তন',
      location: 'পুনে বিশ্ববিদ্যালয়, পুনে',
      description:
        'প্রিয়ার ইঞ্জিনিয়ারিং ডিগ্রি অর্জনের গর্বের দিন। অনুষ্ঠানে সুনীতা তাঁর প্রিয় নীল রেশমি শাড়ি পরেছিলেন।',
      people: ['প্রিয়া', 'সুনীতা', 'অরবিন্দ'],
    },
    ta: {
      dateStr: '18 ஜூன் 2005',
      title: 'பிரியாவின் பல்கலைக்கழகப் பட்டமளிப்பு விழா',
      location: 'புனே பல்கலைக்கழகம், புனே',
      description:
        'பிரியா பொறியியல் பட்டம் பெற்ற பெருமைமிகு நாள். விழாவிற்கு சுனிதா தனக்குப் பிடித்த நீலப் பட்டுப் புடவை அணிந்திருந்தார்.',
      people: ['பிரியா', 'சுனிதா', 'அரவிந்த்'],
    },
    te: {
      dateStr: '18 జూన్ 2005',
      title: 'ప్రియా విశ్వవిద్యాలయ పట్టభద్రత వేడుక',
      location: 'పూణే విశ్వవిద్యాలయం, పూణే',
      description:
        'ప్రియా ఇంజనీరింగ్ పట్టా పొందిన గర్వకారణమైన రోజు. వేడుక కోసం సునీత తన ఇష్టమైన నీలం పట్టు చీర ధరించారు.',
      people: ['ప్రియా', 'సునీత', 'అరవింద్'],
    },
    kn: {
      dateStr: '18 ಜೂನ್ 2005',
      title: 'ಪ್ರಿಯಾರ ವಿಶ್ವವಿದ್ಯಾಲಯ ಪದವಿ ಪ್ರದಾನ ಸಮಾರಂಭ',
      location: 'ಪುಣೆ ವಿಶ್ವವಿದ್ಯಾಲಯ, ಪುಣೆ',
      description:
        'ಪ್ರಿಯಾ ಇಂಜಿನಿಯರಿಂಗ್ ಪದವಿ ಪಡೆದ ಹೆಮ್ಮೆಯ ದಿನ. ಸಮಾರಂಭಕ್ಕೆ ಸುನೀತಾ ತಮ್ಮ ನೆಚ್ಚಿನ ನೀಲಿ ರೇಷ್ಮೆ ಸೀರೆಯನ್ನು ಉಟ್ಟಿದ್ದರು.',
      people: ['ಪ್ರಿಯಾ', 'ಸುನೀತಾ', 'ಅರವಿಂದ್'],
    },
  },
  tm_2019_aarav: {
    en: {
      dateStr: '14 November 2019',
      title: "Grandson Aarav's Birth",
      location: 'Bengaluru, Karnataka',
      description:
        'Aarav was born on Children\'s Day. He calls Sunita "Aaji" and loves eating soft poha from her hands.',
      people: ['Aarav (Grandson)', 'Priya', 'Sunita'],
    },
    hi: {
      dateStr: '14 नवंबर 2019',
      title: 'पोते आरव का जन्म',
      location: 'बेंगलुरु, कर्नाटक',
      description:
        'आरव का जन्म बाल दिवस पर हुआ। वह सुनीता जी को "आजी" बुलाता है और उनके हाथों से नरम पोहा खाना पसंद करता है।',
      people: ['आरव (पोता)', 'प्रिया', 'सुनीता'],
    },
    mr: {
      dateStr: '१४ नोव्हेंबर २०१९',
      title: 'नातू आरवचा जन्म',
      location: 'बेंगळुरू, कर्नाटक',
      description:
        'आरवचा जन्म बालदिनी झाला. तो सुनीता यांना "आजी" म्हणतो आणि त्यांच्या हातून मऊ पोहे आवडीने खातो.',
      people: ['आरव (नातू)', 'प्रिया', 'सुनीता'],
    },
    bn: {
      dateStr: '১৪ নভেম্বর ২০১৯',
      title: 'নাতি আরভের জন্ম',
      location: 'বেঙ্গালুরু, কর্ণাটক',
      description:
        'শিশু দিবসে আরভের জন্ম হয়েছিল। সে সুনীতাকে "আজি" ডাকে এবং তাঁর হাতে নরম চিঁড়ের পোলাও খেতে ভালোবাসে।',
      people: ['আরভ (নাতি)', 'প্রিয়া', 'সুনীতা'],
    },
    ta: {
      dateStr: '14 நவம்பர் 2019',
      title: 'பேரன் ஆரவ் பிறப்பு',
      location: 'பெங்களூரு, கர்நாடகா',
      description:
        'குழந்தைகள் தினத்தன்று ஆரவ் பிறந்தான். அவன் சுனிதாவை "ஆஜி" என்று அழைப்பான்; அவர் கையால் அவல் உண்ண விரும்புவான்.',
      people: ['ஆரவ் (பேரன்)', 'பிரியா', 'சுனிதா'],
    },
    te: {
      dateStr: '14 నవంబర్ 2019',
      title: 'మనవడు ఆరవ్ జననం',
      location: 'బెంగళూరు, కర్ణాటక',
      description:
        'ఆరవ్ బాలల దినోత్సవం రోజున జన్మించాడు. అతను సునీతను "ఆజీ" అని పిలుస్తాడు మరియు ఆమె చేతితో అటుకులు తినడానికి ఇష్టపడతాడు.',
      people: ['ఆరవ్ (మనవడు)', 'ప్రియా', 'సునీత'],
    },
    kn: {
      dateStr: '14 ನವೆಂಬರ್ 2019',
      title: 'ಮೊಮ್ಮಗ ಆರವ್ ಜನನ',
      location: 'ಬೆಂಗಳೂರು, ಕರ್ನಾಟಕ',
      description:
        'ಮಕ್ಕಳ ದಿನದಂದು ಆರವ್ ಜನಿಸಿದನು. ಅವನು ಸುನೀತಾರನ್ನು "ಆಜಿ" ಎಂದು ಕರೆಯುತ್ತಾನೆ ಮತ್ತು ಅವರ ಕೈಯಿಂದ ಅವಲಕ್ಕಿ ತಿನ್ನಲು ಇಷ್ಟಪಡುತ್ತಾನೆ.',
      people: ['ಆರವ್ (ಮೊಮ್ಮಗ)', 'ಪ್ರಿಯಾ', 'ಸುನೀತಾ'],
    },
  },
  tm_2023_garden: {
    en: {
      dateStr: '15 March 2023',
      title: 'Balcony Jasmine & Tulsi Sanctuary',
      location: 'Indiranagar Home, Bengaluru',
      description:
        'Priya and Sunita set up the morning balcony sanctuary with fragrant Mogra jasmine, holy Tulsi, and wind chimes.',
      people: ['Priya', 'Sunita', 'Aarav'],
    },
    hi: {
      dateStr: '15 मार्च 2023',
      title: 'बालकनी मोगरा और तुलसी बगीचा',
      location: 'इंदिरानगर घर, बेंगलुरु',
      description:
        'प्रिया और सुनीता जी ने सुगंधित मोगरा, पवित्र तुलसी और विंड चाइम्स के साथ सुबह की शांत बालकनी सजाई।',
      people: ['प्रिया', 'सुनीता', 'आरव'],
    },
    mr: {
      dateStr: '१५ मार्च २०२३',
      title: 'बाल्कनीतील मोगरा आणि तुळशी बाग',
      location: 'इंदिरानगर घर, बेंगळुरू',
      description:
        'प्रिया आणि सुनीता यांनी सुवासिक मोगरा, पवित्र तुळस आणि वाऱ्याच्या घंटेसह सकाळचा निवांत बाल्कनी कोपरा सजवला.',
      people: ['प्रिया', 'सुनीता', 'आरव'],
    },
    bn: {
      dateStr: '১৫ মার্চ ২০২৩',
      title: 'বারান্দায় বেলফুল ও তুলসী বাগান',
      location: 'ইন্দিরানগর বাড়ি, বেঙ্গালুরু',
      description:
        'প্রিয়া ও সুনীতা মিলে সুগন্ধি বেলফুল, পবিত্র তুলসী ও উইন্ড চাইম দিয়ে সকালের বারান্দাটি সাজিয়েছিলেন।',
      people: ['প্রিয়া', 'সুনীতা', 'আরভ'],
    },
    ta: {
      dateStr: '15 மார்ச் 2023',
      title: 'பால்கனி மல்லிகை & துளசி தோட்டம்',
      location: 'இந்திராநகர் இல்லம், பெங்களூரு',
      description:
        'பிரியாவும் சுனிதாவும் நறுமண மல்லிகை, புனித துளசி மற்றும் காற்று மணிகளுடன் காலை பால்கனி பூங்காவை அமைத்தனர்.',
      people: ['பிரியா', 'சுனிதா', 'ஆரவ்'],
    },
    te: {
      dateStr: '15 మార్చి 2023',
      title: 'బాల్కనీ మల్లె & తులసి తోట',
      location: 'ఇందిరానగర్ ఇల్లు, బెంగళూరు',
      description:
        'ప్రియా మరియు సునీత సువాసనగల మల్లె, పవిత్ర తులసి మరియు విండ్ చైమ్స్‌తో ప్రశాంతమైన బాల్కనీని అలంకరించారు.',
      people: ['ప్రియా', 'సునీత', 'ఆరవ్'],
    },
    kn: {
      dateStr: '15 ಮಾರ್ಚ್ 2023',
      title: 'ಬಾಲ್ಕನಿ ಮಲ್ಲಿಗೆ ಮತ್ತು ತುಳಸಿ ಉದ್ಯಾನ',
      location: 'ಇಂದಿರಾನಗರ ಮನೆ, ಬೆಂಗಳೂರು',
      description:
        'ಪ್ರಿಯಾ ಮತ್ತು ಸುನೀತಾ ಸುವಾಸನೆಯ ಮಲ್ಲಿಗೆ, ಪವಿತ್ರ ತುಳಸಿ ಮತ್ತು ಗಾಳಿ ಗಂಟೆಗಳೊಂದಿಗೆ ಬೆಳಗಿನ ಬಾಲ್ಕನಿ ತೋಟವನ್ನು ಸಿದ್ಧಪಡಿಸಿದರು.',
      people: ['ಪ್ರಿಯಾ', 'ಸುನೀತಾ', 'ಆರವ್'],
    },
  },
};

export const getTranslatedTimelineMilestone = (
  m: TimelineMilestone,
  language?: string
): { title: string; dateStr?: string; location: string; description: string; people: string[] } => {
  const lang = normalizeLang(language);
  const preset = DEFAULT_MILESTONES_I18N[m.id]?.[lang];
  if (preset) {
    return {
      title: preset.title,
      dateStr: preset.dateStr,
      location: preset.location,
      description: preset.description,
      people: preset.people || m.people,
    };
  }
  return {
    title: m.title,
    dateStr: m.dateStr,
    location: m.location,
    description: m.description,
    people: m.people,
  };
};

export const getTranslatedMemoryNodeType = (type: MemoryNode['type'], language?: string): string => {
  return getMemoryGraphUi(language).nodeTypes[type] || String(type).replace('_', ' ');
};
