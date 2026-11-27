/**
 * Localized strings for Asha Accessible Continuous Voice Conversation Mode.
 * Supports all 7 primary Saksham voice languages: en, hi, mr, bn, ta, te, kn
 * with clean English fallback for additional UI locales.
 */

export interface ContinuousVoiceStrings {
  tapToSpeakBtn: string;
  idleHelper: string;
  recordingBadge: string;
  pausedBadge: string;
  finalizingBadge: string;
  errorBadge: string;
  unsupportedBadge: string;
  micActiveLabel: string;
  micPausedLabel: string;
  transcriptLabel: string;
  transcriptPlaceholder: string;
  interimHearingPrefix: string;
  stopAndSendBtn: string;
  pauseBtn: string;
  resumeBtn: string;
  discardBtn: string;
  retryBtn: string;
  emptyTranscriptNotice: string;
  sessionRecoveredNotice: string;
  silencePausedNotice: string;
  languageChangedPausedNotice: string;
  sendFailedPreservedNotice: string;
  recorderRegionAria: string;
  startNewVoiceHint: string;
}

const CONTINUOUS_VOICE_UI: Record<string, ContinuousVoiceStrings> = {
  en: {
    tapToSpeakBtn: 'Tap & Speak to Asha',
    idleHelper: 'Tap to start recording. Speak at your own pace, pause anytime to think, then tap Stop & Send.',
    recordingBadge: 'Listening Continuously',
    pausedBadge: 'Recording Paused',
    finalizingBadge: 'Finishing & Sending...',
    errorBadge: 'Microphone Paused',
    unsupportedBadge: 'Browser Voice Input Unavailable',
    micActiveLabel: 'Microphone listening gently',
    micPausedLabel: 'Microphone paused — spoken words kept safely',
    transcriptLabel: 'What Asha hears so far:',
    transcriptPlaceholder: 'Speak gently whenever you are ready… you can pause and take your time.',
    interimHearingPrefix: 'Listening now:',
    stopAndSendBtn: 'Stop & Send',
    pauseBtn: 'Pause',
    resumeBtn: 'Resume',
    discardBtn: 'Cancel / Discard',
    retryBtn: 'Retry Microphone',
    emptyTranscriptNotice: 'Nothing was heard yet. Tap Resume or Tap & Speak when ready, or type below.',
    sessionRecoveredNotice: 'Listening continued seamlessly — your words above are safe.',
    silencePausedNotice: 'Recording paused softly during a quiet break. Tap Resume to keep speaking, or Stop & Send.',
    languageChangedPausedNotice: 'Language updated. Your spoken words are kept — tap Resume, Stop & Send, or Cancel.',
    sendFailedPreservedNotice: 'Could not send right now, but your spoken message is safe above. Tap Stop & Send to retry.',
    recorderRegionAria: 'Accessible continuous voice recorder for Asha',
    startNewVoiceHint: 'Tap to start another voice turn anytime',
  },
  hi: {
    tapToSpeakBtn: 'बोलने के लिए टैप करें',
    idleHelper: 'बोलने के लिए माइक दबाएँ। आराम से बोलें, बीच में सोचने के लिए रुक सकते हैं, फिर "रोकें और भेजें" दबाएँ।',
    recordingBadge: 'लगातार सुन रहे हैं',
    pausedBadge: 'रिकॉर्डिंग रुकी है',
    finalizingBadge: 'संदेश भेजा जा रहा है...',
    errorBadge: 'माइक्रोफ़ोन रुका हुआ है',
    unsupportedBadge: 'ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं',
    micActiveLabel: 'माइक्रोफ़ोन ध्यान से सुन रहा है',
    micPausedLabel: 'माइक रुका है — आपके शब्द सुरक्षित हैं',
    transcriptLabel: 'आशा ने अब तक जो सुना:',
    transcriptPlaceholder: 'जब भी आप तैयार हों आराम से बोलें… आप सोचने के लिए रुक सकते हैं।',
    interimHearingPrefix: 'अभी सुन रहे हैं:',
    stopAndSendBtn: 'रोकें और भेजें',
    pauseBtn: 'रोकें (Pause)',
    resumeBtn: 'फिर शुरू करें',
    discardBtn: 'रद्द करें / हटाएँ',
    retryBtn: 'माइक फिर से आज़माएँ',
    emptyTranscriptNotice: 'अभी कोई आवाज़ नहीं मिली। बोलने के लिए "फिर शुरू करें" दबाएँ या नीचे लिखें।',
    sessionRecoveredNotice: 'सुनना जारी है — आपके शब्द ऊपर सुरक्षित हैं। आराम से बोलते रहें।',
    silencePausedNotice: 'शांत विराम के कारण रिकॉर्डिंग रोक दी गई है। आगे बोलने के लिए "फिर शुरू करें" या "रोकें और भेजें" दबाएँ।',
    languageChangedPausedNotice: 'भाषा बदली गई। आपके बोले हुए शब्द सुरक्षित हैं — "फिर शुरू करें", "रोकें और भेजें" या "रद्द करें" चुनें।',
    sendFailedPreservedNotice: 'अभी भेजने में समस्या आई, पर आपके शब्द सुरक्षित हैं। फिर से भेजने के लिए "रोकें और भेजें" दबाएँ।',
    recorderRegionAria: 'आशा के लिए निरंतर आवाज़ रिकॉर्डर',
    startNewVoiceHint: 'दोबारा बात करने के लिए कभी भी माइक दबाएँ',
  },
  mr: {
    tapToSpeakBtn: 'बोलण्यासाठी टॅप करा',
    idleHelper: 'बोलण्यासाठी माइक दाबा. शांतपणे बोला, विचार करण्यासाठी मध्ये थांबू शकता, नंतर "थांबवा आणि पाठवा" दाबा.',
    recordingBadge: 'सतत ऐकत आहे',
    pausedBadge: 'रेकॉर्डिंग थांबले आहे',
    finalizingBadge: 'संदेश पाठवत आहे...',
    errorBadge: 'मायक्रोफोन थांबला आहे',
    unsupportedBadge: 'ब्राउझरमध्ये व्हॉइस इनपुट उपलब्ध नाही',
    micActiveLabel: 'मायक्रोफोन शांतपणे ऐकत आहे',
    micPausedLabel: 'माइक थांबला — तुमचे शब्द सुरक्षित आहेत',
    transcriptLabel: 'आशाने आतापर्यंत ऐकलेले:',
    transcriptPlaceholder: 'तुम्ही तयार असाल तेव्हा बोला… विचार करण्यासाठी तुम्ही मध्ये थांबू शकता.',
    interimHearingPrefix: 'आता ऐकत आहे:',
    stopAndSendBtn: 'थांबवा आणि पाठवा',
    pauseBtn: 'थांबवा (Pause)',
    resumeBtn: 'पुन्हा सुरू करा',
    discardBtn: 'रद्द करा / काढून टाका',
    retryBtn: 'माइक पुन्हा प्रयत्न करा',
    emptyTranscriptNotice: 'अद्याप काही ऐकू आले नाही. बोलण्यासाठी "पुन्हा सुरू करा" दाबा किंवा खाली टाइप करा.',
    sessionRecoveredNotice: 'ऐकणे सुरूच आहे — तुमचे शब्द वर सुरक्षित आहेत.',
    silencePausedNotice: 'शांत विश्रांतीमुळे रेकॉर्डिंग थांबवले आहे. बोलण्यासाठी "पुन्हा सुरू करा" किंवा "थांबवा आणि पाठवा" दाबा.',
    languageChangedPausedNotice: 'भाषा बदलली आहे. तुमचे शब्द सुरक्षित आहेत — "पुन्हा सुरू करा", "थांबवा आणि पाठवा" किंवा "रद्द करा" निवडा.',
    sendFailedPreservedNotice: 'आता पाठवता आले नाही, पण तुमचा संदेश वर सुरक्षित आहे. पुन्हा प्रयत्न करण्यासाठी "थांबवा आणि पाठवा" दाबा.',
    recorderRegionAria: 'आशासाठी सुलभ सतत व्हॉइस रेकॉर्डर',
    startNewVoiceHint: 'पुन्हा बोलण्यासाठी कधीही माइक दाबा',
  },
  bn: {
    tapToSpeakBtn: 'কথা বলতে ট্যাপ করুন',
    idleHelper: 'বলতে মাইক চাপুন। ধীরে সুস্থে বলুন, ভাবার জন্য থামতে পারেন, তারপর "থামান ও পাঠান" চাপুন।',
    recordingBadge: 'একটানা শুনছে',
    pausedBadge: 'রেকর্ডিং বিরতিতে',
    finalizingBadge: 'পাঠানো হচ্ছে...',
    errorBadge: 'মাইক্রোফোন থেমে গেছে',
    unsupportedBadge: 'ব্রাউজারে ভয়েস ইনপুট উপলব্ধ নয়',
    micActiveLabel: 'মাইক্রোফোন মনোযোগ দিয়ে শুনছে',
    micPausedLabel: 'মাইক বিরতিতে — আপনার কথা সুরক্ষিত আছে',
    transcriptLabel: 'আশা এ পর্যন্ত যা শুনেছে:',
    transcriptPlaceholder: 'আপনি প্রস্তুত হলেই ধীরে ধীরে বলুন… ভাবার জন্য মাঝে থামতে পারেন।',
    interimHearingPrefix: 'এখন শুনছে:',
    stopAndSendBtn: 'থামান ও পাঠান',
    pauseBtn: 'বিরতি দিন',
    resumeBtn: 'আবার শুরু করুন',
    discardBtn: 'বাতিল / মুছে ফেলুন',
    retryBtn: 'আবার চেষ্টা করুন',
    emptyTranscriptNotice: 'এখনো কোনো কথা শোনা যায়নি। বলতে "আবার শুরু করুন" চাপুন অথবা নিচে লিখুন।',
    sessionRecoveredNotice: 'শোনা চালু আছে — আপনার কথাগুলো উপরে সুরক্ষিত আছে।',
    silencePausedNotice: 'নীরব বিরতির পর রেকর্ডিং থামানো হয়েছে। আবার বলতে "আবার শুরু করুন" বা "থামান ও পাঠান" চাপুন।',
    languageChangedPausedNotice: 'ভাষা পরিবর্তিত হয়েছে। আপনার কথা সুরক্ষিত আছে — "আবার শুরু করুন", "থামান ও পাঠান" বা "বাতিল" চাপুন।',
    sendFailedPreservedNotice: 'এখন পাঠানো যায়নি, তবে আপনার কথা সুরক্ষিত আছে। আবার চেষ্টা করতে "থামান ও পাঠান" চাপুন।',
    recorderRegionAria: 'আশার জন্য সহজ নিরবচ্ছিন্ন ভয়েস রেকর্ডার',
    startNewVoiceHint: 'আবার কথা বলতে যেকোনো সময় মাইক চাপুন',
  },
  ta: {
    tapToSpeakBtn: 'பேச தட்டவும்',
    idleHelper: 'பேச மைக் பட்டனை அழுத்தவும். உங்கள் வேகத்தில் பேசுங்கள், யோசிக்க இடைநிறுத்தலாம், பின்னர் "நிறுத்தி அனுப்பு" அழுத்தவும்.',
    recordingBadge: 'தொடர்ந்து கேட்கிறது',
    pausedBadge: 'பதிவு இடைநிறுத்தப்பட்டது',
    finalizingBadge: 'அனுப்புகிறது...',
    errorBadge: 'மைக்ரோஃபோன் நிறுத்தப்பட்டது',
    unsupportedBadge: 'உலாவியில் குரல் உள்ளீடு இல்லை',
    micActiveLabel: 'மைக்ரோஃபோன் கவனமாகக் கேட்கிறது',
    micPausedLabel: 'மைக் நிறுத்தப்பட்டது — உங்கள் சொற்கள் பாதுகாப்பாக உள்ளன',
    transcriptLabel: 'ஆஷா இதுவரை கேட்டது:',
    transcriptPlaceholder: 'நீங்கள் தயாராக இருக்கும்போது பேசுங்கள்… யோசிக்க இடையில் நிறுத்தலாம்.',
    interimHearingPrefix: 'இப்போது கேட்கிறது:',
    stopAndSendBtn: 'நிறுத்தி அனுப்பு',
    pauseBtn: 'இடைநிறுத்து',
    resumeBtn: 'தொடர்',
    discardBtn: 'ரத்து செய் / அழி',
    retryBtn: 'மீண்டும் முயற்சி செய்',
    emptyTranscriptNotice: 'இதுவரை குரல் எதுவும் கேட்கவில்லை. பேச "தொடர்" அழுத்தவும் அல்லது கீழே தட்டச்சு செய்யவும்.',
    sessionRecoveredNotice: 'தொடர்ந்து கேட்கிறது — மேலே உள்ள உங்கள் சொற்கள் பாதுகாப்பாக உள்ளன.',
    silencePausedNotice: 'அமைதியான இடைவெளியால் பதிவு நிறுத்தப்பட்டது. பேச "தொடர்" அல்லது "நிறுத்தி அனுப்பு" அழுத்தவும்.',
    languageChangedPausedNotice: 'மொழி மாற்றப்பட்டது. உங்கள் சொற்கள் பாதுகாக்கப்பட்டுள்ளன — "தொடர்", "நிறுத்தி அனுப்பு" அல்லது "ரத்து செய்" தேர்வு செய்யவும்.',
    sendFailedPreservedNotice: 'இப்போது அனுப்ப முடியவில்லை, ஆனால் உங்கள் செய்தி பாதுகாப்பாக உள்ளது. மீண்டும் "நிறுத்தி அனுப்பு" அழுத்தவும்.',
    recorderRegionAria: 'ஆஷாவுக்கான தொடர் குரல் பதிவி',
    startNewVoiceHint: 'மீண்டும் பேச எப்போது வேண்டுமானாலும் தட்டவும்',
  },
  te: {
    tapToSpeakBtn: 'మాట్లాడటానికి ట్యాప్ చేయండి',
    idleHelper: 'మాట్లాడటానికి మైక్ నొక్కండి. మీ వేగంతో మాట్లాడండి, ఆలోచించడానికి మధ్యలో ఆగవచ్చు, ఆపై "ఆపి పంపండి" నొక్కండి.',
    recordingBadge: 'నిరంతరం వింటోంది',
    pausedBadge: 'రికార్డింగ్ ఆపబడింది',
    finalizingBadge: 'పంపుతోంది...',
    errorBadge: 'మైక్రోఫోన్ ఆగింది',
    unsupportedBadge: 'బ్రౌజర్ వాయిస్ ఇన్‌పుట్ అందుబాటులో లేదు',
    micActiveLabel: 'మైక్రోఫోన్ జాగ్రత్తగా వింటోంది',
    micPausedLabel: 'మైక్ ఆగింది — మీ మాటలు సురక్షితంగా ఉన్నాయి',
    transcriptLabel: 'ఆశా ఇప్పటివరకు విన్నది:',
    transcriptPlaceholder: 'మీరు సిద్ధమైనప్పుడు మాట్లాడండి… ఆలోచించడానికి మధ్యలో ఆగవచ్చు.',
    interimHearingPrefix: 'ఇప్పుడు వింటోంది:',
    stopAndSendBtn: 'ఆపి పంపండి',
    pauseBtn: 'విరామం',
    resumeBtn: 'కొనసాగించు',
    discardBtn: 'రద్దు చేయి',
    retryBtn: 'మళ్ళీ ప్రయత్నించండి',
    emptyTranscriptNotice: 'ఇంకా ఏ మాట వినిపించలేదు. మాట్లాడటానికి "కొనసాగించు" నొక్కండి లేదా కింద టైప్ చేయండి.',
    sessionRecoveredNotice: 'వినడం కొనసాగుతోంది — మీ మాటలు పైన సురక్షితంగా ఉన్నాయి.',
    silencePausedNotice: 'నిశ్శబ్ద విరామంతో రికార్డింగ్ ఆగింది. కొనసాగించడానికి "కొనసాగించు" లేదా "ఆపి పంపండి" నొక్కండి.',
    languageChangedPausedNotice: 'భాష మార్చబడింది. మీ మాటలు భద్రంగా ఉన్నాయి — "కొనసాగించు", "ఆపి పంపండి" లేదా "రద్దు చేయి" ఎంచుకోండి.',
    sendFailedPreservedNotice: 'ఇప్పుడు పంపలేకపోయాము, కానీ మీ సందేశం సురక్షితంగా ఉంది. మళ్ళీ "ఆపి పంపండి" నొక్కండి.',
    recorderRegionAria: 'ఆశా కోసం నిరంతర వాయిస్ రికార్డర్',
    startNewVoiceHint: 'మళ్ళీ మాట్లాడటానికి ఎప్పుడైనా ట్యాప్ చేయండి',
  },
  kn: {
    tapToSpeakBtn: 'ಮಾತನಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
    idleHelper: 'ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿ. ನಿಧಾನವಾಗಿ ಮಾತನಾಡಿ, ಯೋಚಿಸಲು ನಿಲ್ಲಿಸಬಹುದು, ನಂತರ "ನಿಲ್ಲಿಸಿ ಕಳುಹಿಸಿ" ಒತ್ತಿ.',
    recordingBadge: 'ನಿರಂತರವಾಗಿ ಕೇಳುತ್ತಿದೆ',
    pausedBadge: 'ರೆಕಾರ್ಡಿಂಗ್ ವಿರಾಮದಲ್ಲಿದೆ',
    finalizingBadge: 'ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...',
    errorBadge: 'ಮೈಕ್ರೋಫೋನ್ ನಿಂತಿದೆ',
    unsupportedBadge: 'ಬ್ರೌಸರ್ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಲಭ್ಯವಿಲ್ಲ',
    micActiveLabel: 'ಮೈಕ್ರೋಫೋನ್ ಗಮನವಿಟ್ಟು ಕೇಳುತ್ತಿದೆ',
    micPausedLabel: 'ಮೈಕ್ ವಿರಾಮದಲ್ಲಿದೆ — ನಿಮ್ಮ ಮಾತುಗಳು ಸುರಕ್ಷಿತವಾಗಿವೆ',
    transcriptLabel: 'ಆಶಾ ಇದುವರೆಗೆ ಕೇಳಿರುವುದು:',
    transcriptPlaceholder: 'ನೀವು ಸಿದ್ಧರಾದಾಗ ಮಾತನಾಡಿ… ಯೋಚಿಸಲು ಮಧ್ಯೆ ನಿಲ್ಲಿಸಬಹುದು.',
    interimHearingPrefix: 'ಈಗ ಕೇಳುತ್ತಿದೆ:',
    stopAndSendBtn: 'ನಿಲ್ಲಿಸಿ ಕಳುಹಿಸಿ',
    pauseBtn: 'ವಿರಾಮ',
    resumeBtn: 'ಮುಂದುವರಿಸಿ',
    discardBtn: 'ರದ್ದುಮಾಡಿ',
    retryBtn: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    emptyTranscriptNotice: 'ಇನ್ನೂ ಏನೂ ಕೇಳಿಸಲಿಲ್ಲ. ಮಾತನಾಡಲು "ಮುಂದುವರಿಸಿ" ಒತ್ತಿ ಅಥವಾ ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.',
    sessionRecoveredNotice: 'ಕೇಳುವುದು ಮುಂದುವರಿದಿದೆ — ಮೇಲಿನ ನಿಮ್ಮ ಮಾತುಗಳು ಸುರಕ್ಷಿತವಾಗಿವೆ.',
    silencePausedNotice: 'ಮೌನ ವಿರಾಮದ ನಂತರ ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಲಾಗಿದೆ. ಮುಂದುವರಿಸಲು "ಮುಂದುವರಿಸಿ" ಅಥವಾ "ನಿಲ್ಲಿಸಿ ಕಳುಹಿಸಿ" ಒತ್ತಿ.',
    languageChangedPausedNotice: 'ಭಾಷೆ ಬದಲಾಗಿದೆ. ನಿಮ್ಮ ಮಾತುಗಳು ಉಳಿದಿವೆ — "ಮುಂದುವರಿಸಿ", "ನಿಲ್ಲಿಸಿ ಕಳುಹಿಸಿ" ಅಥವಾ "ರದ್ದುಮಾಡಿ" ಆಯ್ಕೆಮಾಡಿ.',
    sendFailedPreservedNotice: 'ಈಗ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ, ಆದರೆ ನಿಮ್ಮ ಸಂದೇಶ ಸುರಕ್ಷಿತವಾಗಿದೆ. ಮತ್ತೆ "ನಿಲ್ಲಿಸಿ ಕಳುಹಿಸಿ" ಒತ್ತಿ.',
    recorderRegionAria: 'ಆಶಾ ನಿರಂತರ ಧ್ವನಿ ರೆಕಾರ್ಡರ್',
    startNewVoiceHint: 'ಮತ್ತೆ ಮಾತನಾಡಲು ಯಾವಾಗ ಬೇಕಾದರೂ ಟ್ಯಾಪ್ ಮಾಡಿ',
  },
};

export function getContinuousVoiceStrings(language?: string): ContinuousVoiceStrings {
  const code = (language || 'en').trim().toLowerCase().split(/[-_]/)[0];
  return CONTINUOUS_VOICE_UI[code] || CONTINUOUS_VOICE_UI.en;
}
