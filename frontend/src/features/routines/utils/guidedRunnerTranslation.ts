import { SupportedLanguage } from '../../../i18n/index.js';

type SevenLangRecord = Record<'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te' | 'kn', string>;

const normalizeLang = (language?: string): keyof SevenLangRecord => {
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

export const pick7 = (map: SevenLangRecord, language?: string): string => {
  return map[normalizeLang(language)];
};

export interface GuidedRunnerStrings {
  srHeaderTitle: string;
  closeRunnerAria: string;
  welcomeBackSub: string;
  resumeStep: string;
  startFresh: string;
  levelSupported: string;
  levelGuided: string;
  levelIndependent: string;
  levelChallenge: string;
  supportedBanner: string;
  inSessionAdaptation: string;
  independentBanner: string;
  hideClue: string;
  needClue: string;
  challengeTitle: string;
  restoreGuided: string;
  challengeDescTemplate: string;
  shorterGuidanceBanner: string;
  restore: string;
  listenAshaAria: string;
  yesSmallerSteps: string;
  keepFamiliar: string;
  gentleChallengeActive: string;
  restoreFamiliarTap: string;
  reassuranceBanner: string;
  timerHeader: string;
  min10: string;
  min15: string;
  remaining: string;
  paused: string;
  extend5Title: string;
  extend5Label: string;
  pauseTitle: string;
  resumeTitle: string;
  pauseBtn: string;
  resumeBtn: string;
  endRestTitle: string;
  takeRestTitle: string;
  endRestAria: string;
  takeRestAria: string;
  askAshaAria: string;
  askAshaTitle: string;
  askAshaBtn: string;
  stuckAria: string;
  stuckBtn: string;
  twoMinWarningBanner: string;
  twoMinWarningSpeech: string;
  timerDoneBanner: string;
  timerDoneSpeech: string;
  restBannerAria: string;
  restBannerTitle: string;
  restBannerDesc: string;
  resumeNow: string;
  restStartSpeech: string;
  restEndSpeech: string;
  pausedBanner: string;
  repeatAria: string;
  repeatTitle: string;
  giveHintAria: string;
  giveHintTitle: string;
  challengeCardHeader: string;
  synapticRecall: string;
  revealStepBtn: string;
  microActionsStepHeader: string;
  comfortGuide: string;
  tier1Badge: string;
  tier2Badge: string;
  tier3Badge: string;
  hintCounterTemplate: string;
  nextHintTierTemplate: string;
  openMicroSteps: string;
  hide: string;
  detailedBreakdownLabel: string;
  gentleClueLabel: string;
  completeTaskAria: string;
  closeAssistanceAria: string;
  fourWaysLabel: string;
  way1Title: string;
  way1Sub: string;
  way2Title: string;
  way3Title: string;
  way4Title: string;
  way4Sub: string;
  quickChoicePrompt: string;
  choiceStarted: string;
  choiceStep1: string;
  choiceForgot: string;
  choiceCaregiver: string;
  hearSteps: string;
  back: string;
  simpleSummaryHeader: string;
  listenSlowly: string;
  backToOptions: string;
  ashaEncouragementHeader: string;
  hearAsha: string;
  familyCaregiverHeader: string;
  callBtn: string;
  whatsappBtn: string;
  noCaregiverNotice: string;
  confirmFinishTitleTemplate: string;
  confirmFinishDesc: string;
  confirmAttributionLabel: string;
  selfBtn: string;
  selfTag: string;
  assistedBtn: string;
  assistedTag: string;
  partialBtn: string;
  partialTag: string;
  cancel: string;
  complete: string;
  confirmExitTitle: string;
  confirmExitDescTemplate: string;
  pauseSaveBtn: string;
  recommended: string;
  continueActivityBtn: string;
  discardExitBtn: string;
  memoryPromptTemplate: string;
}

const RUNNER_TRANSLATIONS: Record<keyof SevenLangRecord, GuidedRunnerStrings> = {
  en: {
    srHeaderTitle: 'Guided Step-by-Step Task Runner',
    closeRunnerAria: 'Close Task Runner',
    welcomeBackSub: 'Would you like to pick up where you left off, or start fresh?',
    resumeStep: 'Resume Step',
    startFresh: 'Start Fresh',
    levelSupported: '🌱 Supported',
    levelGuided: '🧭 Guided',
    levelIndependent: '⭐ Independent',
    levelChallenge: '✨ Challenge',
    supportedBanner: 'Supported Mode: Full step breakdown and visual cues are open for maximum comfort.',
    inSessionAdaptation: 'In-Session Adaptation',
    independentBanner: 'Independent Practice: Try taking initiative at your own pace!',
    hideClue: 'Hide Clue',
    needClue: '💡 Need a Clue?',
    challengeTitle: 'Flexible Challenge: Try recalling this step before checking hints!',
    restoreGuided: 'Restore Guided',
    challengeDescTemplate:
      'Challenge Exercise: Before looking at the instruction below, try to visualize step {step}. If you\'d like a hint, tap "Give Hint" anytime with zero pressure.',
    shorterGuidanceBanner: "😴 Shorter guidance enabled for today's comfort",
    restore: 'Restore',
    listenAshaAria: 'Listen to Asha explanation',
    yesSmallerSteps: 'Yes, smaller steps',
    keepFamiliar: 'Keep familiar',
    gentleChallengeActive: 'Gentle Routine Challenge Active: ',
    restoreFamiliarTap: '1-Tap Restore Familiar',
    reassuranceBanner:
      'Complete each guided step below. When all steps are ticked, your task will be recorded as completed with a green checkmark!',
    timerHeader: '15M ACTIVITY TIMER',
    min10: '10m',
    min15: '15m',
    remaining: 'Remaining',
    paused: 'Paused',
    extend5Title: 'Extend timer by 5 minutes',
    extend5Label: '+5m',
    pauseTitle: 'Pause activity to rest',
    resumeTitle: 'Resume activity',
    pauseBtn: 'Pause',
    resumeBtn: 'Resume',
    endRestTitle: 'End rest and return',
    takeRestTitle: 'Take a 2-minute calming rest to prevent cognitive fatigue',
    endRestAria: 'End Rest & Return',
    takeRestAria: 'Take a 2-Minute Rest',
    askAshaAria: 'Ask Asha for Help',
    askAshaTitle: 'Ask Asha for gentle help and open micro-steps',
    askAshaBtn: 'Ask Asha',
    stuckAria: 'Stuck? Or need assistance?',
    stuckBtn: 'Stuck?',
    twoMinWarningBanner: '⏳ Gentle reminder: 2 minutes remaining. No rush at all.',
    twoMinWarningSpeech: 'Gentle reminder: two minutes remaining. Take your comfortable time.',
    timerDoneBanner: '🔔 15-minute timer concluded. Take all the peaceful time you need to complete your steps.',
    timerDoneSpeech: '15 minutes has completed. Take all the time you need to finish, or tap Complete when ready.',
    restBannerAria: '2-Minute Calming Rest Active',
    restBannerTitle: '2-Minute Calming Rest',
    restBannerDesc: 'Inhale slowly... exhale gently. Relax your shoulders and rest your eyes.',
    resumeNow: 'Resume Now',
    restStartSpeech: 'Taking a peaceful two-minute rest. Relax your hands, breathe in slowly, and exhale gently.',
    restEndSpeech: 'Your two-minute rest is complete. Whenever you feel ready, you can resume your activity.',
    pausedBanner: '☕ Activity paused. Rest your hands and mind. Tap Resume when ready.',
    repeatAria: 'Repeat Instruction',
    repeatTitle: 'Repeat instruction aloud',
    giveHintAria: 'Give Hint',
    giveHintTitle: 'Get a gentle 3-tier progressive hint for this step',
    challengeCardHeader: '✨ Memory Challenge (Optional)',
    synapticRecall: 'Synaptic Recall',
    revealStepBtn: '🌿 Reveal Step (Keep Familiar)',
    microActionsStepHeader: '💡 Micro-Actions for Step',
    comfortGuide: 'Comfort Guide',
    tier1Badge: 'Tier 1: Orientation Cue',
    tier2Badge: 'Tier 2: Contextual Clue',
    tier3Badge: 'Tier 3: Guided Action',
    hintCounterTemplate: 'Hint {tier} of 3 • Zero Pressure',
    nextHintTierTemplate: 'Next Hint Tier (Tier {tier}) →',
    openMicroSteps: 'Open Micro-Steps',
    hide: 'Hide',
    detailedBreakdownLabel: '🌱 Detailed Step Breakdown:',
    gentleClueLabel: '💡 Gentle Practice Clue:',
    completeTaskAria: 'Complete Task & Auto-Tick',
    closeAssistanceAria: 'Close assistance modal',
    fourWaysLabel: 'Four Calming Ways to Get Help:',
    way1Title: '1. Break Down',
    way1Sub: '3 simple steps',
    way2Title: '2. Explain Again',
    way3Title: '3. Ask Asha',
    way4Title: '4. Caregiver',
    way4Sub: 'Reach loved one',
    quickChoicePrompt: 'Or tap what feels helpful right now:',
    choiceStarted: "I'm not sure how to begin / start fresh",
    choiceStep1: 'I finished step 1 — guide me to step 2',
    choiceForgot: 'Wait — remind me what task I am doing',
    choiceCaregiver: 'I need to pause or talk to my caregiver',
    hearSteps: 'Hear Steps',
    back: 'Back',
    simpleSummaryHeader: 'Gentle Simple Explanation',
    listenSlowly: 'Listen Slowly',
    backToOptions: 'Back to Options',
    ashaEncouragementHeader: "Asha's Encouragement",
    hearAsha: 'Hear Asha',
    familyCaregiverHeader: 'Family Caregiver Support',
    callBtn: 'Call',
    whatsappBtn: 'WhatsApp',
    noCaregiverNotice: 'Please take a peaceful pause or call your family member directly on your phone.',
    confirmFinishTitleTemplate: 'Complete "{title}"?',
    confirmFinishDesc: 'Take a warm moment to appreciate your effort. Everything you try today helps.',
    confirmAttributionLabel: 'How did this feel today?',
    selfBtn: '🌿 I did it myself',
    selfTag: 'Independent',
    assistedBtn: '🤝 I did it with help',
    assistedTag: 'Supported',
    partialBtn: '⏳ I completed part of it',
    partialTag: 'Partial',
    cancel: 'Cancel',
    complete: 'Complete',
    confirmExitTitle: 'Take a pause or leave routine?',
    confirmExitDescTemplate: 'You have active progress on "{title}". We can save your place safely so you can return anytime.',
    pauseSaveBtn: '💾 Pause & Save Progress',
    recommended: 'Recommended',
    continueActivityBtn: '▶️ Continue Activity',
    discardExitBtn: '✕ Discard & Exit',
    memoryPromptTemplate: 'Would you like to try recalling what comes first for {title}?',
  },
  hi: {
    srHeaderTitle: 'चरण-दर-चरण मार्गदर्शित कार्य सहायक',
    closeRunnerAria: 'कार्य मार्गदर्शक बंद करें',
    welcomeBackSub: 'क्या आप वहीं से जारी रखना चाहेंगे जहाँ आपने छोड़ा था, या शुरुआत से करें?',
    resumeStep: 'चरण फिर शुरू करें',
    startFresh: 'नए सिरे से शुरू करें',
    levelSupported: '🌱 पूरा सहारा',
    levelGuided: '🧭 मार्गदर्शित',
    levelIndependent: '⭐ स्वतंत्र',
    levelChallenge: '✨ अभ्यास चुनौती',
    supportedBanner: 'सपोर्ट मोड: आपकी पूरी सुविधा के लिए सभी आसान चरण और संकेत खुले हैं।',
    inSessionAdaptation: 'सत्र अनुकूलन',
    independentBanner: 'स्वतंत्र अभ्यास: अपनी सहज गति से स्वयं प्रयास करें!',
    hideClue: 'संकेत छिपाएँ',
    needClue: '💡 संकेत चाहिए?',
    challengeTitle: 'हल्की चुनौती: संकेत देखने से पहले इस चरण को याद करने की कोशिश करें!',
    restoreGuided: 'मार्गदर्शित पर लौटें',
    challengeDescTemplate:
      'चुनौती अभ्यास: नीचे निर्देश देखने से पहले चरण {step} की कल्पना करें। यदि संकेत चाहिए, तो बिना किसी दबाव के कभी भी "संकेत दें" दबाएँ।',
    shorterGuidanceBanner: '😴 आज के आराम के लिए संक्षिप्त मार्गदर्शन सक्रिय है',
    restore: 'पहले जैसा करें',
    listenAshaAria: 'आशा की बात सुनें',
    yesSmallerSteps: 'हाँ, छोटे चरण',
    keepFamiliar: 'पहले जैसा रखें',
    gentleChallengeActive: 'हल्की दिनचर्या चुनौती सक्रिय: ',
    restoreFamiliarTap: '1-टैप में पहले जैसा करें',
    reassuranceBanner:
      'नीचे दिए गए प्रत्येक मार्गदर्शित चरण को पूरा करें। जब सभी चरण टिक हो जाएँगे, तो आपका कार्य हरे सही निशान के साथ सहेजा जाएगा!',
    timerHeader: '15 मिनट गतिविधि टाइमर',
    min10: '10 मि.',
    min15: '15 मि.',
    remaining: 'शेष समय',
    paused: 'रुका हुआ',
    extend5Title: 'टाइमर 5 मिनट बढ़ाएँ',
    extend5Label: '+5 मि.',
    pauseTitle: 'आराम के लिए गतिविधि रोकें',
    resumeTitle: 'गतिविधि फिर शुरू करें',
    pauseBtn: 'रोकें',
    resumeBtn: 'जारी रखें',
    endRestTitle: 'विश्राम समाप्त कर वापस आएँ',
    takeRestTitle: 'थकान से बचने के लिए 2 मिनट का शांत विश्राम लें',
    endRestAria: 'विश्राम समाप्त करें और लौटें',
    takeRestAria: '2 मिनट का विश्राम लें',
    askAshaAria: 'आशा से मदद माँगें',
    askAshaTitle: 'आशा से शांत मदद और छोटे चरण खोलने को कहें',
    askAshaBtn: 'आशा से पूछें',
    stuckAria: 'अटक गए? क्या मदद चाहिए?',
    stuckBtn: 'अटक गए?',
    twoMinWarningBanner: '⏳ शांत अनुस्मारक: 2 मिनट शेष हैं। कोई जल्दी नहीं है।',
    twoMinWarningSpeech: 'शांत अनुस्मारक: दो मिनट शेष हैं। अपनी सुविधा से आराम से पूरा करें।',
    timerDoneBanner: '🔔 15 मिनट का समय पूरा हुआ। अपने चरण पूरे करने के लिए आराम से समय लें।',
    timerDoneSpeech: 'पंद्रह मिनट पूरे हो गए हैं। आप आराम से काम पूरा कर सकते हैं और तैयार होने पर पूर्ण चुनें।',
    restBannerAria: '2-मिनट का शांत विश्राम सक्रिय',
    restBannerTitle: '2-मिनट का शांत विश्राम',
    restBannerDesc: 'धीरे-धीरे साँस लें... आराम से छोड़ें। कंधों को ढीला छोड़ें और आँखों को आराम दें।',
    resumeNow: 'अभी जारी रखें',
    restStartSpeech: 'दो मिनट का शांत विश्राम शुरू हो रहा है। हाथों को आराम दें और धीरे-धीरे गहरी साँस लें।',
    restEndSpeech: 'आपका दो मिनट का विश्राम पूरा हो गया है। जब आप तैयार हों, फिर से शुरू करें।',
    pausedBanner: '☕ गतिविधि रुकी हुई है। हाथों और मन को आराम दें। तैयार होने पर जारी रखें दबाएँ।',
    repeatAria: 'निर्देश दोहराएँ',
    repeatTitle: 'निर्देश ज़ोर से दोहराएँ',
    giveHintAria: 'संकेत दें',
    giveHintTitle: 'इस चरण के लिए 3-स्तरीय आसान संकेत प्राप्त करें',
    challengeCardHeader: '✨ स्मृति चुनौती (वैकल्पिक)',
    synapticRecall: 'स्मृति अभ्यास',
    revealStepBtn: '🌿 चरण दिखाएँ (परिचित रखें)',
    microActionsStepHeader: '💡 छोटे-छोटे कदम — चरण',
    comfortGuide: 'सुविधा मार्गदर्शिका',
    tier1Badge: 'स्तर 1: दिशा संकेत',
    tier2Badge: 'स्तर 2: संदर्भ संकेत',
    tier3Badge: 'स्तर 3: सरल क्रिया',
    hintCounterTemplate: 'संकेत {tier} / 3 • कोई दबाव नहीं',
    nextHintTierTemplate: 'अगला संकेत (स्तर {tier}) →',
    openMicroSteps: 'छोटे कदम खोलें',
    hide: 'छिपाएँ',
    detailedBreakdownLabel: '🌱 विस्तृत चरण विवरण:',
    gentleClueLabel: '💡 शांत अभ्यास संकेत:',
    completeTaskAria: 'कार्य पूरा करें',
    closeAssistanceAria: 'सहायता विंडो बंद करें',
    fourWaysLabel: 'मदद पाने के चार शांत तरीके:',
    way1Title: '1. छोटे हिस्से करें',
    way1Sub: '3 आसान कदम',
    way2Title: '2. फिर से समझाएँ',
    way3Title: '3. आशा से पूछें',
    way4Title: '4. देखभालकर्ता',
    way4Sub: 'प्रियजन से जुड़ें',
    quickChoicePrompt: 'या अभी जो मददगार लगे उसे चुनें:',
    choiceStarted: 'शुरुआत कैसे करूँ समझ नहीं आ रहा / फिर शुरू करें',
    choiceStep1: 'पहला चरण हो गया — दूसरे चरण पर ले चलें',
    choiceForgot: 'रुकिए — याद दिलाएँ कि मैं कौन सा काम कर रहा हूँ',
    choiceCaregiver: 'मुझे आराम करना है या परिवार से बात करनी है',
    hearSteps: 'कदम सुनें',
    back: 'वापस',
    simpleSummaryHeader: 'सरल शब्दों में समझें',
    listenSlowly: 'धीरे सुनें',
    backToOptions: 'विकल्पों पर लौटें',
    ashaEncouragementHeader: 'आशा का प्रोत्साहन',
    hearAsha: 'आशा को सुनें',
    familyCaregiverHeader: 'पारिवारिक देखभाल सहायता',
    callBtn: 'कॉल करें',
    whatsappBtn: 'व्हाट्सएप',
    noCaregiverNotice: 'कृपया शांत विश्राम लें या फोन पर सीधे अपने परिवार के सदस्य को कॉल करें।',
    confirmFinishTitleTemplate: '"{title}" पूरा करें?',
    confirmFinishDesc: 'अपने प्रयास की सराहना करें। आज किया गया हर छोटा प्रयास महत्वपूर्ण है।',
    confirmAttributionLabel: 'आज यह कैसा लगा?',
    selfBtn: '🌿 मैंने स्वयं किया',
    selfTag: 'स्वतंत्र',
    assistedBtn: '🤝 मैंने मदद से किया',
    assistedTag: 'सहारे के साथ',
    partialBtn: '⏳ मैंने थोड़ा हिस्सा पूरा किया',
    partialTag: 'आंशिक',
    cancel: 'रद्द करें',
    complete: 'पूर्ण करें',
    confirmExitTitle: 'थोड़ा रुकें या दिनचर्या से बाहर जाएँ?',
    confirmExitDescTemplate: '"{title}" में आपकी प्रगति हुई है। हम इसे सुरक्षित सहेज सकते हैं ताकि आप कभी भी लौट सकें।',
    pauseSaveBtn: '💾 रोकें और प्रगति सहेजें',
    recommended: 'सुझावित',
    continueActivityBtn: '▶️ गतिविधि जारी रखें',
    discardExitBtn: '✕ बिना सहेजे बाहर जाएँ',
    memoryPromptTemplate: 'क्या आप याद करने की कोशिश करेंगे कि "{title}" में सबसे पहले क्या आता है?',
  },
  mr: {
    srHeaderTitle: 'टप्प्याटप्प्याने कार्य मार्गदर्शक',
    closeRunnerAria: 'कार्य मार्गदर्शक बंद करा',
    welcomeBackSub: 'तुम्ही जिथे थांबला होतात तिथून पुढे सुरू करायचे की नव्याने सुरू करायचे?',
    resumeStep: 'पायरी पुन्हा सुरू करा',
    startFresh: 'नव्याने सुरू करा',
    levelSupported: '🌱 पूर्ण आधार',
    levelGuided: '🧭 मार्गदर्शित',
    levelIndependent: '⭐ स्वतंत्र',
    levelChallenge: '✨ सराव आव्हान',
    supportedBanner: 'सपोर्ट मोड: तुमच्या पूर्ण सोयीसाठी सर्व लहान पायऱ्या आणि खुणा उघडल्या आहेत.',
    inSessionAdaptation: 'सत्र जुळवून घेणे',
    independentBanner: 'स्वतंत्र सराव: तुमच्या सोयीच्या गतीने स्वतः प्रयत्न करा!',
    hideClue: 'सूचना लपवा',
    needClue: '💡 मदत हवी?',
    challengeTitle: 'सोपे आव्हान: सूचना पाहण्यापूर्वी ही पायरी आठवण्याचा प्रयत्न करा!',
    restoreGuided: 'मार्गदर्शित मोडवर या',
    challengeDescTemplate:
      'आव्हान सराव: खालील सूचना पाहण्यापूर्वी पायरी {step} मनात आठवा. मदत हवी असल्यास कोणत्याही दबावाशिवाय "संकेत द्या" दाबा.',
    shorterGuidanceBanner: '😴 आजच्या आरामासाठी लहान मार्गदर्शन सुरू केले आहे',
    restore: 'पूर्ववत करा',
    listenAshaAria: 'आशाचे स्पष्टीकरण ऐका',
    yesSmallerSteps: 'हो, लहान पायऱ्या',
    keepFamiliar: 'आधीसारखे ठेवा',
    gentleChallengeActive: 'सोपी दिनचर्या आव्हान सक्रिय: ',
    restoreFamiliarTap: '१-टॅपने आधीसारखे करा',
    reassuranceBanner:
      'खालील प्रत्येक मार्गदर्शित पायरी पूर्ण करा. सर्व पायऱ्या टिक केल्यावर तुमचे काम हिरव्या बरोबर चिन्हासह जतन केले जाईल!',
    timerHeader: '१५ मिनिटांचा कार्य वेळ',
    min10: '१० मि.',
    min15: '१५ मि.',
    remaining: 'शिल्लक',
    paused: 'थांबवले',
    extend5Title: 'वेळ ५ मिनिटांनी वाढवा',
    extend5Label: '+५ मि.',
    pauseTitle: 'विश्रांतीसाठी थांबवा',
    resumeTitle: 'कार्य पुन्हा सुरू करा',
    pauseBtn: 'थांबा',
    resumeBtn: 'सुरू ठेवा',
    endRestTitle: 'विश्रांती संपवून परत या',
    takeRestTitle: 'थकवा टाळण्यासाठी २ मिनिटांची शांत विश्रांती घ्या',
    endRestAria: 'विश्रांती संपवा आणि परत या',
    takeRestAria: '२ मिनिटांची विश्रांती घ्या',
    askAshaAria: 'आशाची मदत घ्या',
    askAshaTitle: 'आशाकडून शांत मदत आणि लहान पायऱ्या उघडा',
    askAshaBtn: 'आशाला विचारा',
    stuckAria: 'अडचण येत आहे का? मदत हवी?',
    stuckBtn: 'अडले का?',
    twoMinWarningBanner: '⏳ शांत स्मरणपत्र: २ मिनिटे शिल्लक आहेत. अजिबात घाई नाही.',
    twoMinWarningSpeech: 'शांत स्मरणपत्र: दोन मिनिटे शिल्लक आहेत. तुमच्या आरामात पूर्ण करा.',
    timerDoneBanner: '🔔 १५ मिनिटांचा वेळ पूर्ण झाला. पायऱ्या पूर्ण करण्यासाठी शांतपणे वेळ घ्या.',
    timerDoneSpeech: 'पंधरा मिनिटे पूर्ण झाली आहेत. तुम्ही आरामात काम पूर्ण करा आणि तयार झाल्यावर पूर्ण निवडा.',
    restBannerAria: '२-मिनिटांची शांत विश्रांती सुरू',
    restBannerTitle: '२-मिनिटांची शांत विश्रांती',
    restBannerDesc: 'हळू श्वास घ्या... सावकाश सोडा. खांदे सैल सोडा आणि डोळ्यांना आराम द्या.',
    resumeNow: 'आता पुढे सुरू करा',
    restStartSpeech: 'दोन मिनिटांची शांत विश्रांती सुरू करत आहोत. हात सैल ठेवा आणि हळुवार श्वास घ्या.',
    restEndSpeech: 'तुमची दोन मिनिटांची विश्रांती पूर्ण झाली आहे. तयार वाटेल तेव्हा पुन्हा सुरू करा.',
    pausedBanner: '☕ काम थांबवले आहे. हात व मनाला विश्रांती द्या. तयार झाल्यावर सुरू ठेवा दाबा.',
    repeatAria: 'सूचना पुन्हा ऐका',
    repeatTitle: 'सूचना मोठ्याने पुन्हा ऐका',
    giveHintAria: 'संकेत द्या',
    giveHintTitle: 'या पायरीसाठी ३-टप्प्यांची सोपी मदत मिळवा',
    challengeCardHeader: '✨ स्मरण आव्हान (ऐच्छिक)',
    synapticRecall: 'स्मृती सराव',
    revealStepBtn: '🌿 पायरी दाखवा (परिचित ठेवा)',
    microActionsStepHeader: '💡 लहान कृती — पायरी',
    comfortGuide: 'सोयीचे मार्गदर्शन',
    tier1Badge: 'टप्पा १: दिशा खूण',
    tier2Badge: 'टप्पा २: संदर्भ खूण',
    tier3Badge: 'टप्पा ३: सोपी कृती',
    hintCounterTemplate: 'संकेत {tier} / ३ • कोणताही ताण नाही',
    nextHintTierTemplate: 'पुढचा संकेत (टप्पा {tier}) →',
    openMicroSteps: 'लहान पायऱ्या उघडा',
    hide: 'लपवा',
    detailedBreakdownLabel: '🌱 सविस्तर पायरी विवरण:',
    gentleClueLabel: '💡 सोपा सराव संकेत:',
    completeTaskAria: 'कार्य पूर्ण करा',
    closeAssistanceAria: 'मदत विंडो बंद करा',
    fourWaysLabel: 'मदत मिळवण्याचे चार शांत मार्ग:',
    way1Title: '१. भाग पाडा',
    way1Sub: '३ सोपे टप्पे',
    way2Title: '२. पुन्हा समजावून सांगा',
    way3Title: '३. आशाला विचारा',
    way4Title: '४. काळजीवाहू',
    way4Sub: 'कुटुंबाशी संपर्क',
    quickChoicePrompt: 'किंवा आत्ता काय उपयोगी वाटते ते निवडा:',
    choiceStarted: 'सुरुवात कशी करावी सुचत नाही / नव्याने सुरू करा',
    choiceStep1: 'पहिली पायरी झाली — दुसरी पायरी दाखवा',
    choiceForgot: 'थांबा — मी कोणते काम करत आहे ते आठवण करून द्या',
    choiceCaregiver: 'मला विश्रांती हवी किंवा कुटुंबाशी बोलायचे आहे',
    hearSteps: 'पायऱ्या ऐका',
    back: 'मागे',
    simpleSummaryHeader: 'सोप्या शब्दांत स्पष्टीकरण',
    listenSlowly: 'सावकाश ऐका',
    backToOptions: 'पर्यायांकडे परत जा',
    ashaEncouragementHeader: 'आशाचे प्रोत्साहन',
    hearAsha: 'आशाला ऐका',
    familyCaregiverHeader: 'कुटुंबीय व काळजीवाहू मदत',
    callBtn: 'कॉल करा',
    whatsappBtn: 'व्हॉट्सअॅप',
    noCaregiverNotice: 'कृपया शांत विश्रांती घ्या किंवा तुमच्या फोनवरून थेट कुटुंबातील सदस्याला कॉल करा.',
    confirmFinishTitleTemplate: '"{title}" पूर्ण झाले का?',
    confirmFinishDesc: 'तुमच्या प्रयत्नाबद्दल स्वतःचे कौतुक करा. आज केलेला प्रत्येक प्रयत्न महत्त्वाचा आहे.',
    confirmAttributionLabel: 'आज हे कसे वाटले?',
    selfBtn: '🌿 मी स्वतः केले',
    selfTag: 'स्वतंत्र',
    assistedBtn: '🤝 मी मदतीने केले',
    assistedTag: 'आधाराने',
    partialBtn: '⏳ मी काही भाग पूर्ण केला',
    partialTag: 'अंशतः',
    cancel: 'रद्द करा',
    complete: 'पूर्ण करा',
    confirmExitTitle: 'थोडा विराम घ्यायचा की बाहेर पडायचे?',
    confirmExitDescTemplate: '"{title}" मधील तुमची प्रगती झाली आहे. आम्ही ती सुरक्षित जतन करू शकतो जेणेकरून तुम्ही कधीही परत येऊ शकता.',
    pauseSaveBtn: '💾 थांबवा आणि प्रगती जतन करा',
    recommended: 'शिफारस केलेले',
    continueActivityBtn: '▶️ कार्य सुरू ठेवा',
    discardExitBtn: '✕ जतन न करता बाहेर पडा',
    memoryPromptTemplate: '"{title}" मध्ये सर्वात आधी काय येते ते आठवून पाहायचे का?',
  },
  bn: {
    srHeaderTitle: 'ধাপে ধাপে নির্দেশিত কাজ সহায়ক',
    closeRunnerAria: 'কাজ সহায়ক বন্ধ করুন',
    welcomeBackSub: 'যেখান থেকে থেমেছিলেন সেখান থেকে শুরু করতে চান, নাকি নতুন করে?',
    resumeStep: 'ধাপ পুনরায় শুরু করুন',
    startFresh: 'নতুন করে শুরু করুন',
    levelSupported: '🌱 সম্পূর্ণ সহায়তা',
    levelGuided: '🧭 নির্দেশিত',
    levelIndependent: '⭐ স্বাধীনভাবে',
    levelChallenge: '✨ সহজ চ্যালেঞ্জ',
    supportedBanner: 'সহায়তা মোড: আপনার সম্পূর্ণ আরামের জন্য সমস্ত সহজ ধাপ ও ইঙ্গিত খোলা রয়েছে।',
    inSessionAdaptation: 'সেশন অভিযোজন',
    independentBanner: 'স্বাধীন অনুশীলন: আপনার নিজের স্বাচ্ছন্দ্যের গতিতে চেষ্টা করুন!',
    hideClue: 'ইঙ্গিত লুকান',
    needClue: '💡 ইঙ্গিত প্রয়োজন?',
    challengeTitle: 'সহজ চ্যালেঞ্জ: ইঙ্গিত দেখার আগে এই ধাপটি মনে করার চেষ্টা করুন!',
    restoreGuided: 'নির্দেশিত মোডে ফিরুন',
    challengeDescTemplate:
      'চ্যালেঞ্জ অনুশীলন: নিচের নির্দেশ দেখার আগে ধাপ {step} কল্পনা করার চেষ্টা করুন। ইঙ্গিত চাইলে কোনো চাপ ছাড়াই যেকোনো সময় "ইঙ্গিত দিন" চাপুন।',
    shorterGuidanceBanner: '😴 আজকের আরামের জন্য সংক্ষিপ্ত নির্দেশিকা চালু রয়েছে',
    restore: 'আগের মতো করুন',
    listenAshaAria: 'আশার ব্যাখ্যা শুনুন',
    yesSmallerSteps: 'হ্যাঁ, ছোট ধাপ',
    keepFamiliar: 'পরিচিত রাখুন',
    gentleChallengeActive: 'হালকা রুটিন চ্যালেঞ্জ সক্রিয়: ',
    restoreFamiliarTap: '১-ট্যাপে আগের মতো করুন',
    reassuranceBanner:
      'নিচের প্রতিটি নির্দেশিত ধাপ সম্পূর্ণ করুন। সব ধাপ টিক দেওয়া হলে আপনার কাজটি সবুজ টিক চিহ্নসহ সংরক্ষণ করা হবে!',
    timerHeader: '১৫ মিনিটের কাজের সময়',
    min10: '১০ মি.',
    min15: '১৫ মি.',
    remaining: 'বাকি সময়',
    paused: 'বিরতিতে',
    extend5Title: 'সময় ৫ মিনিট বাড়ান',
    extend5Label: '+৫ মি.',
    pauseTitle: 'বিশ্রামের জন্য কাজ থামান',
    resumeTitle: 'কাজ পুনরায় শুরু করুন',
    pauseBtn: 'বিরতি',
    resumeBtn: 'চালু করুন',
    endRestTitle: 'বিশ্রাম শেষ করে ফিরে আসুন',
    takeRestTitle: 'ক্লান্তি এড়াতে ২ মিনিটের শান্ত বিশ্রাম নিন',
    endRestAria: 'বিশ্রাম শেষ করে ফিরুন',
    takeRestAria: '২ মিনিটের বিশ্রাম নিন',
    askAshaAria: 'আশার সাহায্য নিন',
    askAshaTitle: 'আশার শান্ত সাহায্য এবং ছোট ধাপগুলো খুলুন',
    askAshaBtn: 'আশাকে বলুন',
    stuckAria: 'আটকে গেছেন? সাহায্য লাগবে?',
    stuckBtn: 'আটকে গেছেন?',
    twoMinWarningBanner: '⏳ শান্ত বার্তা: ২ মিনিট বাকি আছে। কোনো তাড়াহুড়ো নেই।',
    twoMinWarningSpeech: 'শান্ত বার্তা: দুই মিনিট বাকি আছে। আপনার স্বাচ্ছন্দ্য অনুযায়ী সময় নিন।',
    timerDoneBanner: '🔔 ১৫ মিনিটের সময় শেষ হয়েছে। আপনার ধাপগুলো শেষ করতে শান্তভাবে সময় নিন।',
    timerDoneSpeech: 'পনেরো মিনিট সম্পন্ন হয়েছে। আপনি নিজের সময় নিয়ে শেষ করতে পারেন এবং প্রস্তুত হলে সম্পূর্ণ বোতামে চাপ দিন।',
    restBannerAria: '২-মিনিটের শান্ত বিশ্রাম চলছে',
    restBannerTitle: '২-মিনিটের শান্ত বিশ্রাম',
    restBannerDesc: 'ধীরে শ্বাস নিন... শান্তভাবে ছাড়ুন। কাঁধ আলগা রাখুন ও চোখকে আরাম দিন।',
    resumeNow: 'এখনই চালু করুন',
    restStartSpeech: 'দুই মিনিটের শান্ত বিশ্রাম শুরু হলো। হাত দুটি শিথিল করুন এবং ধীরে গভীর শ্বাস নিন।',
    restEndSpeech: 'আপনার দুই মিনিটের বিশ্রাম শেষ হয়েছে। প্রস্তুত মনে হলে কাজটি আবার শুরু করুন।',
    pausedBanner: '☕ কাজ বিরতিতে রয়েছে। হাত ও মনকে বিশ্রাম দিন। প্রস্তুত হলে চালু করুন চাপুন।',
    repeatAria: 'নির্দেশ পুনরায় শুনুন',
    repeatTitle: 'নির্দেশ জোরে পুনরায় শুনুন',
    giveHintAria: 'ইঙ্গিত দিন',
    giveHintTitle: 'এই ধাপের জন্য ৩-স্তরের সহজ ইঙ্গিত পান',
    challengeCardHeader: '✨ স্মৃতি চ্যালেঞ্জ (ঐচ্ছিক)',
    synapticRecall: 'স্মৃতি অনুশীলন',
    revealStepBtn: '🌿 ধাপ দেখুন (পরিচিত রাখুন)',
    microActionsStepHeader: '💡 ছোট পদক্ষেপ — ধাপ',
    comfortGuide: 'স্বাচ্ছন্দ্য নির্দেশিকা',
    tier1Badge: 'স্তর ১: দিকনির্দেশ',
    tier2Badge: 'স্তর ২: প্রসঙ্গ ইঙ্গিত',
    tier3Badge: 'স্তর ৩: সহজ পদক্ষেপ',
    hintCounterTemplate: 'ইঙ্গিত {tier} / ৩ • কোনো চাপ নেই',
    nextHintTierTemplate: 'পরবর্তী ইঙ্গিত (স্তর {tier}) →',
    openMicroSteps: 'ছোট ধাপ খুলুন',
    hide: 'লুকান',
    detailedBreakdownLabel: '🌱 বিস্তারিত ধাপ:',
    gentleClueLabel: '💡 সহজ অনুশীলন ইঙ্গিত:',
    completeTaskAria: 'কাজ সম্পূর্ণ করুন',
    closeAssistanceAria: 'সহায়তা উইন্ডো বন্ধ করুন',
    fourWaysLabel: 'সাহায্য পাওয়ার চারটি শান্ত উপায়:',
    way1Title: '১. ভেঙে নিন',
    way1Sub: '৩টি সহজ ধাপ',
    way2Title: '২. আবার বোঝান',
    way3Title: '৩. আশাকে বলুন',
    way4Title: '৪. যত্নকারী',
    way4Sub: 'প্রিয়জনের সাথে যোগাযোগ',
    quickChoicePrompt: 'অথবা এখন যেটি সাহায্য করবে সেটি বেছে নিন:',
    choiceStarted: 'কীভাবে শুরু করবো বুঝতে পারছি না / নতুন করে শুরু',
    choiceStep1: 'প্রথম ধাপ শেষ — দ্বিতীয় ধাপে নিয়ে চলুন',
    choiceForgot: 'একটু থামুন — আমি কোন কাজটি করছি মনে করিয়ে দিন',
    choiceCaregiver: 'আমার বিশ্রাম দরকার বা পরিবারের সাথে কথা বলবো',
    hearSteps: 'ধাপ শুনুন',
    back: 'ফিরুন',
    simpleSummaryHeader: 'সহজ ভাষায় ব্যাখ্যা',
    listenSlowly: 'ধীরে শুনুন',
    backToOptions: 'বিকল্পে ফিরুন',
    ashaEncouragementHeader: 'আশার উৎসাহ',
    hearAsha: 'আশাকে শুনুন',
    familyCaregiverHeader: 'পারিবারিক যত্ন সহায়তা',
    callBtn: 'কল করুন',
    whatsappBtn: 'হোয়াটসঅ্যাপ',
    noCaregiverNotice: 'দয়া করে একটু শান্ত বিশ্রাম নিন অথবা আপনার ফোন থেকে সরাসরি পরিবারের সদস্যকে কল করুন।',
    confirmFinishTitleTemplate: '"{title}" সম্পূর্ণ করবেন?',
    confirmFinishDesc: 'আপনার প্রচেষ্টার প্রশংসা করুন। আজকের প্রতিটি চেষ্টাই মূল্যবান।',
    confirmAttributionLabel: 'আজ কেমন অনুভব হলো?',
    selfBtn: '🌿 আমি নিজেই করেছি',
    selfTag: 'স্বাধীন',
    assistedBtn: '🤝 সাহায্যে করেছি',
    assistedTag: 'সহায়তায়',
    partialBtn: '⏳ কিছু অংশ সম্পূর্ণ করেছি',
    partialTag: 'আংশিক',
    cancel: 'বাতিল',
    complete: 'সম্পূর্ণ',
    confirmExitTitle: 'বিরতি নেবেন নাকি বেরিয়ে আসবেন?',
    confirmExitDescTemplate: '"{title}"-এ আপনার অগ্রগতি রয়েছে। আমরা নিরাপদে সংরক্ষণ করতে পারি যাতে পরে আবার ফিরতে পারেন।',
    pauseSaveBtn: '💾 থামান ও অগ্রগতি সেভ করুন',
    recommended: 'প্রস্তাবিত',
    continueActivityBtn: '▶️ কাজ চালিয়ে যান',
    discardExitBtn: '✕ সেভ না করে বেরিয়ে যান',
    memoryPromptTemplate: '"{title}"-এ প্রথমে কী করতে হয় তা মনে করার চেষ্টা করবেন?',
  },
  ta: {
    srHeaderTitle: 'படிப்படியான செயல் வழிகாட்டி',
    closeRunnerAria: 'வழிகாட்டியை மூடு',
    welcomeBackSub: 'விட்ட இடத்திலிருந்து தொடர விரும்புகிறீர்களா அல்லது புதிதாகத் தொடங்கவா?',
    resumeStep: 'படியைத் தொடரவும்',
    startFresh: 'புதிதாகத் தொடங்கு',
    levelSupported: '🌱 முழு உதவி',
    levelGuided: '🧭 வழிகாட்டல்',
    levelIndependent: '⭐ சுயமாக',
    levelChallenge: '✨ நினைவு சவால்',
    supportedBanner: 'ஆதரவு முறை: உங்கள் முழு வசதிக்காக அனைத்து எளிய படிகளும் குறிப்புகளும் திறக்கப்பட்டுள்ளன.',
    inSessionAdaptation: 'அமர்வு சரிசெய்தல்',
    independentBanner: 'சுய பயிற்சி: உங்கள் வசதியான வேகத்தில் முயற்சி செய்யுங்கள்!',
    hideClue: 'குறிப்பை மறை',
    needClue: '💡 குறிப்பு தேவையா?',
    challengeTitle: 'மென்மையான சவால்: குறிப்புகளைப் பார்ப்பதற்கு முன் இந்தப் படியை நினைவுகூர முயற்சிக்கவும்!',
    restoreGuided: 'வழிகாட்டலுக்குத் திரும்பு',
    challengeDescTemplate:
      'பயிற்சி சவால்: கீழே உள்ள வழிகாட்டலைப் பார்ப்பதற்கு முன் படி {step}-ஐ மனதில் நினைத்துப் பாருங்கள். குறிப்பு தேவைப்பட்டால் அழுத்தமின்றி "குறிப்பு கொடு" தட்டவும்.',
    shorterGuidanceBanner: '😴 இன்றைய ஓய்வுக்காக சுருக்கமான வழிகாட்டல் இயக்கப்பட்டுள்ளது',
    restore: 'முன்போல் மாற்று',
    listenAshaAria: 'ஆஷாவின் விளக்கத்தைக் கேளுங்கள்',
    yesSmallerSteps: 'ஆம், சிறிய படிகள்',
    keepFamiliar: 'பழக்கமானதை வை',
    gentleChallengeActive: 'மென்மையான தினசரி சவால் செயல்பாட்டில்: ',
    restoreFamiliarTap: '1-தட்டலில் முன்போல் மாற்று',
    reassuranceBanner:
      'கீழே உள்ள ஒவ்வொரு வழிகாட்டப்பட்ட படியையும் முடிக்கவும். அனைத்து படிகளும் டிக் செய்யப்பட்டதும், உங்கள் செயல் பச்சை அடையாளத்துடன் சேமிக்கப்படும்!',
    timerHeader: '15 நிமிட செயல் நேர அளவி',
    min10: '10 நி.',
    min15: '15 நி.',
    remaining: 'மீதமுள்ளது',
    paused: 'நிறுத்தப்பட்டது',
    extend5Title: 'நேரத்தை 5 நிமிடம் நீட்டிக்கவும்',
    extend5Label: '+5 நி.',
    pauseTitle: 'ஓய்வெடுக்க செயலை நிறுத்து',
    resumeTitle: 'செயலைத் தொடர்',
    pauseBtn: 'நிறுத்து',
    resumeBtn: 'தொடர்',
    endRestTitle: 'ஓய்வை முடித்து திரும்பு',
    takeRestTitle: 'சோர்வைத் தவிர்க்க 2 நிமிட அமைதியான ஓய்வு எடுங்கள்',
    endRestAria: 'ஓய்வை முடித்து திரும்பவும்',
    takeRestAria: '2 நிமிட ஓய்வு எடுங்கள்',
    askAshaAria: 'ஆஷாவிடம் உதவி கேள்',
    askAshaTitle: 'ஆஷாவிடம் அமைதியான உதவியும் சிறிய படிகளையும் கேளுங்கள்',
    askAshaBtn: 'ஆஷாவைக் கேள்',
    stuckAria: 'தயக்கமா? உதவி தேவையா?',
    stuckBtn: 'உதவி தேவையா?',
    twoMinWarningBanner: '⏳ மென்மையான நினைவூட்டல்: 2 நிமிடங்கள் மீதமுள்ளன. அவசரமே இல்லை.',
    twoMinWarningSpeech: 'மென்மையான நினைவூட்டல்: இரண்டு நிமிடங்கள் மீதமுள்ளன. உங்கள் வசதியான நேரத்தை எடுத்துக்கொள்ளுங்கள்.',
    timerDoneBanner: '🔔 15 நிமிட நேரம் முடிந்தது. உங்கள் படிகளை முடிக்க அமைதியாக நேரத்தை எடுத்துக்கொள்ளுங்கள்.',
    timerDoneSpeech: 'பதினைந்து நிமிடங்கள் முடிந்துவிட்டன. முடிக்கத் தேவையான நேரத்தை எடுத்துக்கொண்டு தயாரானதும் முடித்ததைத் தட்டவும்.',
    restBannerAria: '2-நிமிட அமைதியான ஓய்வு செயல்பாட்டில்',
    restBannerTitle: '2-நிமிட அமைதியான ஓய்வு',
    restBannerDesc: 'மெதுவாக மூச்சிழுங்கள்... மெதுவாக வெளியிடுங்கள். தோள்களைத் தளர்த்தி கண்களுக்கு ஓய்வு கொடுங்கள்.',
    resumeNow: 'இப்போதே தொடர்',
    restStartSpeech: 'இரண்டு நிமிட அமைதியான ஓய்வு தொடங்குகிறது. கைகளைத் தளர்த்தி மெதுவாக மூச்செடுங்கள்.',
    restEndSpeech: 'உங்கள் இரண்டு நிமிட ஓய்வு முடிந்தது. தயாராக உணரும்போது செயலைத் தொடரலாம்.',
    pausedBanner: '☕ செயல் நிறுத்தப்பட்டுள்ளது. கைகளுக்கும் மனதிற்கும் ஓய்வு கொடுங்கள். தயாரானதும் தொடர் தட்டவும்.',
    repeatAria: 'அறிவுரையை மீண்டும் கேள்',
    repeatTitle: 'அறிவுரையைச் சத்தமாக மீண்டும் கேள்',
    giveHintAria: 'குறிப்பு கொடு',
    giveHintTitle: 'இந்தப் படிக்கு 3-நிலை எளிய குறிப்பைப் பெறுங்கள்',
    challengeCardHeader: '✨ நினைவு சவால் (விருப்பமானது)',
    synapticRecall: 'நினைவு மீட்டல்',
    revealStepBtn: '🌿 படியைக் காட்டு (பழக்கமானதை வை)',
    microActionsStepHeader: '💡 சிறிய படிகள் — படி',
    comfortGuide: 'வசதி வழிகாட்டி',
    tier1Badge: 'நிலை 1: திசை குறிப்பு',
    tier2Badge: 'நிலை 2: சூழல் குறிப்பு',
    tier3Badge: 'நிலை 3: எளிய செயல்',
    hintCounterTemplate: 'குறிப்பு {tier} / 3 • அழுத்தமில்லை',
    nextHintTierTemplate: 'அடுத்த குறிப்பு (நிலை {tier}) →',
    openMicroSteps: 'சிறிய படிகளைத் திற',
    hide: 'மறை',
    detailedBreakdownLabel: '🌱 விரிவான படி விளக்கம்:',
    gentleClueLabel: '💡 எளிய பயிற்சி குறிப்பு:',
    completeTaskAria: 'செயலை முடித்து சேமிக்கவும்',
    closeAssistanceAria: 'உதவி சாளரத்தை மூடு',
    fourWaysLabel: 'உதவி பெறுவதற்கான நான்கு அமைதியான வழிகள்:',
    way1Title: '1. பிரித்துப் பார்',
    way1Sub: '3 எளிய படிகள்',
    way2Title: '2. மீண்டும் விளக்கு',
    way3Title: '3. ஆஷாவைக் கேள்',
    way4Title: '4. பராமரிப்பாளர்',
    way4Sub: 'அன்பானவரைத் தொடர்புகொள்',
    quickChoicePrompt: 'அல்லது இப்போது உதவியாக இருப்பதைத் தட்டவும்:',
    choiceStarted: 'எப்படித் தொடங்குவது என்று தெரியவில்லை / புதிதாகத் தொடங்கு',
    choiceStep1: 'படி 1 முடிந்தது — படி 2-க்கு வழிகாட்டு',
    choiceForgot: 'நில் — நான் என்ன செயல் செய்கிறேன் என்று நினைவூட்டு',
    choiceCaregiver: 'நான் ஓய்வெடுக்க வேண்டும் அல்லது பராமரிப்பாளரிடம் பேச வேண்டும்',
    hearSteps: 'படிகளைக் கேள்',
    back: 'பின்செல்',
    simpleSummaryHeader: 'எளிய வார்த்தைகளில் விளக்கம்',
    listenSlowly: 'மெதுவாகக் கேள்',
    backToOptions: 'விருப்பங்களுக்குத் திரும்பு',
    ashaEncouragementHeader: 'ஆஷாவின் ஊக்குவிப்பு',
    hearAsha: 'ஆஷாவைக் கேள்',
    familyCaregiverHeader: 'குடும்பப் பராமரிப்பாளர் உதவி',
    callBtn: 'அழை',
    whatsappBtn: 'வாட்ஸ்அப்',
    noCaregiverNotice: 'தயவுசெய்து அமைதியாக ஓய்வெடுங்கள் அல்லது உங்கள் தொலைபேசியில் குடும்ப உறுப்பினரை நேரடியாக அழையுங்கள்.',
    confirmFinishTitleTemplate: '"{title}" முடிந்ததா?',
    confirmFinishDesc: 'உங்கள் முயற்சியைப் பாராட்ட ஒரு கணம் எடுத்துக்கொள்ளுங்கள். இன்று நீங்கள் செய்யும் ஒவ்வொரு முயற்சியும் உதவும்.',
    confirmAttributionLabel: 'இன்று இது எப்படி இருந்தது?',
    selfBtn: '🌿 நானே சுயமாகச் செய்தேன்',
    selfTag: 'சுயமாக',
    assistedBtn: '🤝 உதவியுடன் செய்தேன்',
    assistedTag: 'உதவியுடன்',
    partialBtn: '⏳ ஒரு பகுதியை முடித்தேன்',
    partialTag: 'பகுதியளவு',
    cancel: 'ரத்து செய்',
    complete: 'முடிந்தது',
    confirmExitTitle: 'ஓய்வெடுக்கவா அல்லது வெளியேறவா?',
    confirmExitDescTemplate: '"{title}"-இல் உங்கள் முன்னேற்றம் உள்ளது. எப்போது வேண்டுமானாலும் திரும்ப வர உங்கள் இடத்தை பாதுகாப்பாகச் சேமிக்கலாம்.',
    pauseSaveBtn: '💾 நிறுத்தி முன்னேற்றத்தைச் சேமி',
    recommended: 'பரிந்துரைக்கப்பட்டது',
    continueActivityBtn: '▶️ செயலைத் தொடரவும்',
    discardExitBtn: '✕ சேமிக்காமல் வெளியேறு',
    memoryPromptTemplate: '"{title}"-இல் முதலில் என்ன வரும் என்பதை நினைவுகூர முயற்சிக்கிறீர்களா?',
  },
  te: {
    srHeaderTitle: 'దశలవారీ మార్గదర్శక కార్య సహాయకం',
    closeRunnerAria: 'కార్య సహాయకాన్ని మూసివేయండి',
    welcomeBackSub: 'మీరు ఎక్కడ ఆపారో అక్కడి నుండే కొనసాగిస్తారా, లేదా కొత్తగా మొదలుపెడతారా?',
    resumeStep: 'దశను కొనసాగించండి',
    startFresh: 'కొత్తగా ప్రారంభించండి',
    levelSupported: '🌱 పూర్తి సహాయం',
    levelGuided: '🧭 మార్గదర్శకం',
    levelIndependent: '⭐ స్వతంత్రంగా',
    levelChallenge: '✨ చిన్న సవాలు',
    supportedBanner: 'సపోర్ట్ మోడ్: మీ పూర్తి సౌకర్యం కోసం అన్ని సులభ దశలు మరియు సూచనలు తెరిచి ఉన్నాయి.',
    inSessionAdaptation: 'సెషన్ సర్దుబాటు',
    independentBanner: 'స్వతంత్ర అభ్యాసం: మీ సౌకర్యవంతమైన వేగంతో ప్రయత్నించండి!',
    hideClue: 'సూచన దాచు',
    needClue: '💡 సూచన కావాలా?',
    challengeTitle: 'సులభ సవాలు: సూచనలు చూసే ముందు ఈ దశను గుర్తుంచుకోవడానికి ప్రయత్నించండి!',
    restoreGuided: 'మార్గదర్శకానికి తిరిగి రండి',
    challengeDescTemplate:
      'సవాలు అభ్యాసం: క్రింది సూచన చూసే ముందు దశ {step} ను మనసులో ఊహించండి. సూచన కావాలంటే ఒత్తిడి లేకుండా "సూచన ఇవ్వండి" నొక్కండి.',
    shorterGuidanceBanner: '😴 నేటి విశ్రాంతి కోసం సంక్షిప్త మార్గదర్శకం ప్రారంభించబడింది',
    restore: 'మునుపటిలా చేయండి',
    listenAshaAria: 'ఆశా వివరణ వినండి',
    yesSmallerSteps: 'అవును, చిన్న దశలు',
    keepFamiliar: 'అలవాటైనట్టే ఉంచండి',
    gentleChallengeActive: 'సులభ దినచర్య సవాలు సక్రియంగా ఉంది: ',
    restoreFamiliarTap: '1-ట్యాప్‌తో మునుపటిలా చేయండి',
    reassuranceBanner:
      'క్రింద ఉన్న ప్రతి మార్గదర్శక దశను పూర్తి చేయండి. అన్ని దశలు టిక్ చేసినప్పుడు, మీ పని ఆకుపచ్చ టిక్ గుర్తుతో సేవ్ చేయబడుతుంది!',
    timerHeader: '15 నిమిషాల కార్య సమయం',
    min10: '10 ని.',
    min15: '15 ని.',
    remaining: 'మిగిలిన సమయం',
    paused: 'ఆపబడింది',
    extend5Title: 'సమయాన్ని 5 నిమిషాలు పెంచండి',
    extend5Label: '+5 ని.',
    pauseTitle: 'విశ్రాంతి కోసం ఆపండి',
    resumeTitle: 'కార్యాన్ని కొనసాగించండి',
    pauseBtn: 'ఆపండి',
    resumeBtn: 'కొనసాగించండి',
    endRestTitle: 'విశ్రాంతి ముగించి తిరిగి రండి',
    takeRestTitle: 'అలసట తగ్గించడానికి 2 నిమిషాల ప్రశాంత విశ్రాంతి తీసుకోండి',
    endRestAria: 'విశ్రాంతి ముగించి తిరిగి రండి',
    takeRestAria: '2 నిమిషాల విశ్రాంతి తీసుకోండి',
    askAshaAria: 'ఆశా సహాయం అడగండి',
    askAshaTitle: 'ఆశా నుండి ప్రశాంత సహాయం మరియు చిన్న దశలను తెరవండి',
    askAshaBtn: 'ఆశాని అడగండి',
    stuckAria: 'సందేహమా? సహాయం కావాలా?',
    stuckBtn: 'సహాయం కావాలా?',
    twoMinWarningBanner: '⏳ ప్రశాంత గుర్తు: 2 నిమిషాలు మిగిలి ఉన్నాయి. అస్సలు తొందర లేదు.',
    twoMinWarningSpeech: 'ప్రశాంత గుర్తు: రెండు నిమిషాలు మిగిలి ఉన్నాయి. మీ సౌకర్యం ప్రకారం పూర్తి చేయండి.',
    timerDoneBanner: '🔔 15 నిమిషాల సమయం పూర్తయింది. మీ దశలను పూర్తి చేయడానికి ప్రశాంతంగా సమయం తీసుకోండి.',
    timerDoneSpeech: 'పదిహేను నిమిషాలు పూర్తయ్యాయి. మీరు నిదానంగా పూర్తి చేయవచ్చు, సిద్ధంగా ఉన్నప్పుడు పూర్తి నొక్కండి.',
    restBannerAria: '2-నిమిషాల ప్రశాంత విశ్రాంతి సక్రియం',
    restBannerTitle: '2-నిమిషాల ప్రశాంత విశ్రాంతి',
    restBannerDesc: 'నెమ్మదిగా గాలి పీల్చండి... శాంతంగా వదలండి. భుజాలను సడలించి కళ్లకు విశ్రాంతి ఇవ్వండి.',
    resumeNow: 'ఇప్పుడే కొనసాగించండి',
    restStartSpeech: 'రెండు నిమిషాల ప్రశాంత విశ్రాంతి మొదలైంది. చేతులకు విశ్రాంతి ఇచ్చి నెమ్మదిగా శ్వాస తీసుకోండి.',
    restEndSpeech: 'మీ రెండు నిమిషాల విశ్రాంతి పూర్తయింది. సిద్ధంగా ఉన్నప్పుడు మళ్లీ కొనసాగించవచ్చు.',
    pausedBanner: '☕ పని ఆపబడింది. చేతులకు, మనసుకి విశ్రాంతి ఇవ్వండి. సిద్ధంగా ఉన్నప్పుడు కొనసాగించండి నొక్కండి.',
    repeatAria: 'సూచన మళ్లీ వినండి',
    repeatTitle: 'సూచనను బిగ్గరగా మళ్లీ వినండి',
    giveHintAria: 'సూచన ఇవ్వండి',
    giveHintTitle: 'ఈ దశ కోసం 3-స్థాయిల సులభ సూచన పొందండి',
    challengeCardHeader: '✨ జ్ఞాపక సవాలు (ఐచ్ఛికం)',
    synapticRecall: 'జ్ఞాపకశక్తి అభ్యాసం',
    revealStepBtn: '🌿 దశను చూపించు (అలవాటైనట్టే ఉంచండి)',
    microActionsStepHeader: '💡 చిన్న చర్యలు — దశ',
    comfortGuide: 'సౌకర్య మార్గదర్శి',
    tier1Badge: 'స్థాయి 1: దిశా సూచన',
    tier2Badge: 'స్థాయి 2: సందర్భ సూచన',
    tier3Badge: 'స్థాయి 3: సులభ చర్య',
    hintCounterTemplate: 'సూచన {tier} / 3 • ఒత్తిడి లేదు',
    nextHintTierTemplate: 'తదుపరి సూచన (స్థాయి {tier}) →',
    openMicroSteps: 'చిన్న దశలు తెరవండి',
    hide: 'దాచు',
    detailedBreakdownLabel: '🌱 వివరమైన దశలు:',
    gentleClueLabel: '💡 సులభ అభ్యాస సూచన:',
    completeTaskAria: 'కార్యాన్ని పూర్తి చేయండి',
    closeAssistanceAria: 'సహాయ విండో మూసివేయండి',
    fourWaysLabel: 'సహాయం పొందడానికి నాలుగు ప్రశాంత మార్గాలు:',
    way1Title: '1. చిన్న భాగాలుగా చేయండి',
    way1Sub: '3 సులభ దశలు',
    way2Title: '2. మళ్లీ వివరించండి',
    way3Title: '3. ఆశాని అడగండి',
    way4Title: '4. సంరక్షకుడు',
    way4Sub: 'కుటుంబ సభ్యుని సంప్రదించండి',
    quickChoicePrompt: 'లేదా ఇప్పుడు మీకు సహాయపడే దానిని ఎంచుకోండి:',
    choiceStarted: 'ఎలా ప్రారంభించాలో అర్థం కావట్లేదు / కొత్తగా ప్రారంభించు',
    choiceStep1: 'మొదటి దశ పూర్తయింది — రెండో దశకు తీసుకెళ్లండి',
    choiceForgot: 'ఆగండి — నేను ఏ పని చేస్తున్నానో గుర్తు చేయండి',
    choiceCaregiver: 'నాకు విశ్రాంతి కావాలి లేదా సంరక్షకులతో మాట్లాడాలి',
    hearSteps: 'దశలు వినండి',
    back: 'వెనుకకు',
    simpleSummaryHeader: 'సులభమైన మాటలలో వివరణ',
    listenSlowly: 'నెమ్మదిగా వినండి',
    backToOptions: 'ఎంపికలకు తిరిగి వెళ్ళండి',
    ashaEncouragementHeader: 'ఆశా ప్రోత్సాహం',
    hearAsha: 'ఆశా మాటలు వినండి',
    familyCaregiverHeader: 'కుటుంబ సంరక్షకుల సహాయం',
    callBtn: 'కాల్ చేయండి',
    whatsappBtn: 'వాట్సాప్',
    noCaregiverNotice: 'దయచేసి ప్రశాంతంగా విశ్రాంతి తీసుకోండి లేదా మీ ఫోన్ నుండి నేరుగా మీ కుటుంబ సభ్యులకు కాల్ చేయండి.',
    confirmFinishTitleTemplate: '"{title}" పూర్తి అయిందా?',
    confirmFinishDesc: 'మీ ప్రయత్నాన్ని అభినందించుకోండి. ఈరోజు మీరు చేసే ప్రతి ప్రయత్నం విలువైనది.',
    confirmAttributionLabel: 'ఈరోజు ఇది ఎలా అనిపించింది?',
    selfBtn: '🌿 నేనే స్వయంగా చేశాను',
    selfTag: 'స్వతంత్రంగా',
    assistedBtn: '🤝 సహాయంతో చేశాను',
    assistedTag: 'సహాయంతో',
    partialBtn: '⏳ కొంత భాగం పూర్తి చేశాను',
    partialTag: 'పాక్షికంగా',
    cancel: 'రద్దు చేయండి',
    complete: 'పూర్తి చేయండి',
    confirmExitTitle: 'కాసేపు ఆపాలా లేదా బయటకు వెళ్లాలా?',
    confirmExitDescTemplate: '"{title}" లో మీ పురోగతి ఉంది. మీరు ఎప్పుడైనా తిరిగి రావడానికి మీ స్థానాన్ని సురక్షితంగా సేవ్ చేయగలము.',
    pauseSaveBtn: '💾 ఆపి పురోగతిని సేవ్ చేయండి',
    recommended: 'సూచించబడింది',
    continueActivityBtn: '▶️ కార్యాన్ని కొనసాగించండి',
    discardExitBtn: '✕ సేవ్ చేయకుండా బయటకు వెళ్ళండి',
    memoryPromptTemplate: '"{title}" లో మొదట ఏమి చేయాలో గుర్తుంచుకోవడానికి ప్రయత్నిస్తారా?',
  },
  kn: {
    srHeaderTitle: 'ಹಂತ-ಹಂತದ ಕಾರ್ಯ ಮಾರ್ಗದರ್ಶಕ',
    closeRunnerAria: 'ಕಾರ್ಯ ಮಾರ್ಗದರ್ಶಕವನ್ನು ಮುಚ್ಚಿ',
    welcomeBackSub: 'ನೀವು ನಿಲ್ಲಿಸಿದಲ್ಲಿಂದ ಮುಂದುವರಿಸಲು ಬಯಸುತ್ತೀರಾ ಅಥವಾ ಹೊಸದಾಗಿ ಪ್ರಾರಂಭಿಸುವಿರಾ?',
    resumeStep: 'ಹಂತವನ್ನು ಮುಂದುವರಿಸಿ',
    startFresh: 'ಹೊಸದಾಗಿ ಪ್ರಾರಂಭಿಸಿ',
    levelSupported: '🌱 ಪೂರ್ಣ ಬೆಂಬಲ',
    levelGuided: '🧭 ಮಾರ್ಗದರ್ಶಿತ',
    levelIndependent: '⭐ ಸ್ವತಂತ್ರವಾಗಿ',
    levelChallenge: '✨ ಸೌಮ್ಯ ಸವಾಲು',
    supportedBanner: 'ಬೆಂಬಲ ಮೋಡ್: ನಿಮ್ಮ ಸಂಪೂರ್ಣ ಅನುಕೂಲಕ್ಕಾಗಿ ಎಲ್ಲಾ ಸುಲಭ ಹಂತಗಳು ಮತ್ತು ಸುಳಿವುಗಳು ತೆರೆದಿವೆ.',
    inSessionAdaptation: 'ಅಧಿವೇಶನ ಹೊಂದಾಣಿಕೆ',
    independentBanner: 'ಸ್ವತಂತ್ರ ಅಭ್ಯಾಸ: ನಿಮ್ಮ ಆರಾಮದಾಯಕ ವೇಗದಲ್ಲಿ ನೀವೇ ಪ್ರಯತ್ನಿಸಿ!',
    hideClue: 'ಸುಳಿವು ಮರೆಮಾಡಿ',
    needClue: '💡 ಸುಳಿವು ಬೇಕೇ?',
    challengeTitle: 'ಸೌಮ್ಯ ಸವಾಲು: ಸುಳಿವು ನೋಡುವ ಮೊದಲು ಈ ಹಂತವನ್ನು ನೆನಪಿಸಿಕೊಳ್ಳಲು ಪ್ರಯತ್ನಿಸಿ!',
    restoreGuided: 'ಮಾರ್ಗದರ್ಶಿತಕ್ಕೆ ಮರಳಿ',
    challengeDescTemplate:
      'ಸವಾಲು ಅಭ್ಯಾಸ: ಕೆಳಗಿನ ಸೂಚನೆ ನೋಡುವ ಮೊದಲು ಹಂತ {step} ಅನ್ನು ಮನಸ್ಸಿನಲ್ಲಿ ಕಲ್ಪಿಸಿಕೊಳ್ಳಿ. ಸುಳಿವು ಬೇಕಿದ್ದರೆ ಒತ್ತಡವಿಲ್ಲದೆ "ಸುಳಿವು ಕೊಡಿ" ಒತ್ತಿ.',
    shorterGuidanceBanner: '😴 ಇಂದಿನ ಆರಾಮಕ್ಕಾಗಿ ಸಂಕ್ಷಿಪ್ತ ಮಾರ್ಗದರ್ಶನ ಸಕ್ರಿಯವಾಗಿದೆ',
    restore: 'ಮೊದಲಿನಂತೆ ಮಾಡಿ',
    listenAshaAria: 'ಆಶಾ ವಿವರಣೆಯನ್ನು ಕೇಳಿ',
    yesSmallerSteps: 'ಹೌದು, ಸಣ್ಣ ಹಂತಗಳು',
    keepFamiliar: 'ಪರಿಚಿತವಾಗಿ ಇರಿಸಿ',
    gentleChallengeActive: 'ಸೌಮ್ಯ ದಿನಚರಿ ಸವಾಲು ಸಕ್ರಿಯವಾಗಿದೆ: ',
    restoreFamiliarTap: '1-ಟ್ಯಾಪ್‌ನಲ್ಲಿ ಮೊದಲಿನಂತೆ ಮಾಡಿ',
    reassuranceBanner:
      'ಕೆಳಗಿನ ಪ್ರತಿಯೊಂದು ಮಾರ್ಗದರ್ಶಿತ ಹಂತವನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ. ಎಲ್ಲಾ ಹಂತಗಳನ್ನು ಗುರುತಿಸಿದಾಗ ನಿಮ್ಮ ಕೆಲಸ ಹಸಿರು ಸರಿ ಗುರುತಿನೊಂದಿಗೆ ಉಳಿಸಲ್ಪಡುತ್ತದೆ!',
    timerHeader: '15 ನಿಮಿಷದ ಚಟುವಟಿಕೆ ಟೈಮರ್',
    min10: '10 ನಿ.',
    min15: '15 ನಿ.',
    remaining: 'ಉಳಿದ ಸಮಯ',
    paused: 'ವಿರಾಮದಲ್ಲಿದೆ',
    extend5Title: 'ಸಮಯವನ್ನು 5 ನಿಮಿಷ ವಿಸ್ತರಿಸಿ',
    extend5Label: '+5 ನಿ.',
    pauseTitle: 'ವಿಶ್ರಾಂತಿಗಾಗಿ ಚಟುವಟಿಕೆ ನಿಲ್ಲಿಸಿ',
    resumeTitle: 'ಚಟುವಟಿಕೆಯನ್ನು ಮುಂದುವರಿಸಿ',
    pauseBtn: 'ನಿಲ್ಲಿಸಿ',
    resumeBtn: 'ಮುಂದುವರಿಸಿ',
    endRestTitle: 'ವಿಶ್ರಾಂತಿ ಮುಗಿಸಿ ಹಿಂತಿರುಗಿ',
    takeRestTitle: 'ಆಯಾಸ ತಡೆಯಲು 2 ನಿಮಿಷಗಳ ಶಾಂತ ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ',
    endRestAria: 'ವಿಶ್ರಾಂತಿ ಮುಗಿಸಿ ಹಿಂತಿರುಗಿ',
    takeRestAria: '2 ನಿಮಿಷಗಳ ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ',
    askAshaAria: 'ಆಶಾರ ಸಹಾಯ ಕೇಳಿ',
    askAshaTitle: 'ಆಶಾರಿಂದ ಸೌಮ್ಯ ಸಹಾಯ ಮತ್ತು ಸಣ್ಣ ಹಂತಗಳನ್ನು ತೆರೆಯಿರಿ',
    askAshaBtn: 'ಆಶಾ ಕೇಳಿ',
    stuckAria: 'ಸಂದೇಹವಿದೆಯೇ? ಸಹಾಯ ಬೇಕೇ?',
    stuckBtn: 'ಸಹಾಯ ಬೇಕೇ?',
    twoMinWarningBanner: '⏳ ಸೌಮ್ಯ ನೆನಪಿಸುವಿಕೆ: 2 ನಿಮಿಷಗಳು ಬಾಕಿ ಇವೆ. ಯಾವುದೇ ಆತುರವಿಲ್ಲ.',
    twoMinWarningSpeech: 'ಸೌಮ್ಯ ನೆನಪಿಸುವಿಕೆ: ಎರಡು ನಿಮಿಷಗಳು ಬಾಕಿ ಇವೆ. ನಿಮ್ಮ ಅನುಕೂಲಕ್ಕೆ ತಕ್ಕಂತೆ ಪೂರ್ಣಗೊಳಿಸಿ.',
    timerDoneBanner: '🔔 15 ನಿಮಿಷಗಳ ಸಮಯ ಪೂರ್ಣಗೊಂಡಿದೆ. ಹಂತಗಳನ್ನು ಮುಗಿಸಲು ಶಾಂತವಾಗಿ ಸಮಯ ತೆಗೆದುಕೊಳ್ಳಿ.',
    timerDoneSpeech: 'ಹದಿನೈದು ನಿಮಿಷಗಳು ಪೂರ್ಣಗೊಂಡಿವೆ. ನಿಧಾನವಾಗಿ ಪೂರ್ಣಗೊಳಿಸಿ ಮತ್ತು ಸಿದ್ಧವಾದಾಗ ಪೂರ್ಣ ಬಟನ್ ಒತ್ತಿ.',
    restBannerAria: '2-ನಿಮಿಷಗಳ ಶಾಂತ ವಿಶ್ರಾಂತಿ ಸಕ್ರಿಯ',
    restBannerTitle: '2-ನಿಮಿಷಗಳ ಶಾಂತ ವಿಶ್ರಾಂತಿ',
    restBannerDesc: 'ನಿಧಾನವಾಗಿ ಉಸಿರೆಳೆಯಿರಿ... ಶಾಂತವಾಗಿ ಬಿಡಿ. ಭುಜಗಳನ್ನು ಸಡಿಲಿಸಿ ಕಣ್ಣುಗಳಿಗೆ ವಿಶ್ರಾಂತಿ ನೀಡಿ.',
    resumeNow: 'ಈಗಲೇ ಮುಂದುವರಿಸಿ',
    restStartSpeech: 'ಎರಡು ನಿಮಿಷಗಳ ಶಾಂತ ವಿಶ್ರಾಂತಿ ಪ್ರಾರಂಭವಾಗುತ್ತಿದೆ. ಕೈಗಳನ್ನು ವಿಶ್ರಾಂತಿಗೊಳಿಸಿ ನಿಧಾನವಾಗಿ ಉಸಿರಾಡಿ.',
    restEndSpeech: 'ನಿಮ್ಮ ಎರಡು ನಿಮಿಷಗಳ ವಿಶ್ರಾಂತಿ ಪೂರ್ಣಗೊಂಡಿದೆ. ಸಿದ್ಧವಾದಾಗ ಮತ್ತೆ ಮುಂದುವರಿಸಿ.',
    pausedBanner: '☕ ಚಟುವಟಿಕೆ ನಿಲ್ಲಿಸಲಾಗಿದೆ. ಕೈ ಮತ್ತು ಮನಸ್ಸಿಗೆ ವಿಶ್ರಾಂತಿ ನೀಡಿ. ಸಿದ್ಧವಾದಾಗ ಮುಂದುವರಿಸಿ ಒತ್ತಿ.',
    repeatAria: 'ಸೂಚನೆಯನ್ನು ಪುನಃ ಕೇಳಿ',
    repeatTitle: 'ಸೂಚನೆಯನ್ನು ಗಟ್ಟಿಯಾಗಿ ಪುನಃ ಕೇಳಿ',
    giveHintAria: 'ಸುಳಿವು ಕೊಡಿ',
    giveHintTitle: 'ಈ ಹಂತಕ್ಕೆ 3-ಹಂತಗಳ ಸುಲಭ ಸುಳಿವು ಪಡೆಯಿರಿ',
    challengeCardHeader: '✨ ಸ್ಮರಣೆ ಸವಾಲು (ಐಚ್ಛಿಕ)',
    synapticRecall: 'ನೆನಪಿನ ಅಭ್ಯಾಸ',
    revealStepBtn: '🌿 ಹಂತವನ್ನು ತೋರಿಸಿ (ಪರಿಚಿತ ಇರಿಸಿ)',
    microActionsStepHeader: '💡 ಸಣ್ಣ ಕ್ರಿಯೆಗಳು — ಹಂತ',
    comfortGuide: 'ಆರಾಮ ಮಾರ್ಗದರ್ಶಿ',
    tier1Badge: 'ಹಂತ 1: ದಿಕ್ಕು ಸುಳಿವು',
    tier2Badge: 'ಹಂತ 2: ಸಂದರ್ಭ ಸುಳಿವು',
    tier3Badge: 'ಹಂತ 3: ಸುಲಭ ಕ್ರಿಯೆ',
    hintCounterTemplate: 'ಸುಳಿವು {tier} / 3 • ಒತ್ತಡವಿಲ್ಲ',
    nextHintTierTemplate: 'ಮುಂದಿನ ಸುಳಿವು (ಹಂತ {tier}) →',
    openMicroSteps: 'ಸಣ್ಣ ಹಂತಗಳನ್ನು ತೆರೆಯಿರಿ',
    hide: 'ಮರೆಮಾಡಿ',
    detailedBreakdownLabel: '🌱 ವಿವರವಾದ ಹಂತಗಳು:',
    gentleClueLabel: '💡 ಸೌಮ್ಯ ಅಭ್ಯಾಸ ಸುಳಿವು:',
    completeTaskAria: 'ಕಾರ್ಯವನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ',
    closeAssistanceAria: 'ಸಹಾಯ ಕಿಟಕಿ ಮುಚ್ಚಿ',
    fourWaysLabel: 'ಸಹಾಯ ಪಡೆಯಲು ನಾಲ್ಕು ಶಾಂತ ವಿಧಾನಗಳು:',
    way1Title: '1. ವಿಭಜಿಸಿ',
    way1Sub: '3 ಸುಲಭ ಹಂತಗಳು',
    way2Title: '2. ಮತ್ತೆ ವಿವರಿಸಿ',
    way3Title: '3. ಆಶಾ ಕೇಳಿ',
    way4Title: '4. ಆರೈಕೆದಾರರು',
    way4Sub: 'ಪ್ರೀತಿಪಾತ್ರರನ್ನು ಸಂಪರ್ಕಿಸಿ',
    quickChoicePrompt: 'ಅಥವಾ ಈಗ ನಿಮಗೆ ಸಹಾಯಕವಾಗುವುದನ್ನು ಆಯ್ಕೆಮಾಡಿ:',
    choiceStarted: 'ಹೇಗೆ ಪ್ರಾರಂಭಿಸಬೇಕು ಎಂದು ತಿಳಿಯುತ್ತಿಲ್ಲ / ಹೊಸದಾಗಿ ಪ್ರಾರಂಭಿಸಿ',
    choiceStep1: 'ಹಂತ 1 ಮುಗಿದಿದೆ — ಹಂತ 2 ಕ್ಕೆ ಮಾರ್ಗದರ್ಶನ ನೀಡಿ',
    choiceForgot: 'ನಿಲ್ಲಿ — ನಾನು ಯಾವ ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದೇನೆಂದು ನೆನಪಿಸಿ',
    choiceCaregiver: 'ನನಗೆ ವಿಶ್ರಾಂತಿ ಬೇಕು ಅಥವಾ ಆರೈಕೆದಾರರೊಂದಿಗೆ ಮಾತನಾಡಬೇಕು',
    hearSteps: 'ಹಂತಗಳನ್ನು ಕೇಳಿ',
    back: 'ಹಿಂದೆ',
    simpleSummaryHeader: 'ಸರಳ ಮಾತುಗಳಲ್ಲಿ ವಿವರಣೆ',
    listenSlowly: 'ನಿಧಾನವಾಗಿ ಕೇಳಿ',
    backToOptions: 'ಆಯ್ಕೆಗಳಿಗೆ ಹಿಂತಿರುಗಿ',
    ashaEncouragementHeader: 'ಆಶಾರ ಪ್ರೋತ್ಸಾಹ',
    hearAsha: 'ಆಶಾರನ್ನು ಕೇಳಿ',
    familyCaregiverHeader: 'ಕುಟುಂಬ ಆರೈಕೆದಾರರ ಬೆಂಬಲ',
    callBtn: 'ಕರೆ ಮಾಡಿ',
    whatsappBtn: 'ವಾಟ್ಸಾಪ್',
    noCaregiverNotice: 'ದಯವಿಟ್ಟು ಶಾಂತವಾಗಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ ಅಥವಾ ನಿಮ್ಮ ಫೋನಿನಿಂದ ನೇರವಾಗಿ ಕುಟುಂಬ ಸದಸ್ಯರಿಗೆ ಕರೆ ಮಾಡಿ.',
    confirmFinishTitleTemplate: '"{title}" ಪೂರ್ಣಗೊಳಿಸುದೇ?',
    confirmFinishDesc: 'ನಿಮ್ಮ ಪ್ರಯತ್ನವನ್ನು ಮೆಚ್ಚಿಕೊಳ್ಳಲು ಒಂದು ಕ್ಷಣ ತೆಗೆದುಕೊಳ್ಳಿ. ಇಂದು ನೀವು ಮಾಡುವ ಪ್ರತಿಯೊಂದು ಪ್ರಯತ್ನವೂ ಮುಖ್ಯವಾಗಿದೆ.',
    confirmAttributionLabel: 'ಇಂದು ಇದು ಹೇಗೆ ಅನಿಸಿತು?',
    selfBtn: '🌿 ನಾನೇ ಸ್ವತಃ ಮಾಡಿದ್ದೇನೆ',
    selfTag: 'ಸ್ವತಂತ್ರ',
    assistedBtn: '🤝 ಸಹಾಯದಿಂದ ಮಾಡಿದ್ದೇನೆ',
    assistedTag: 'ಬೆಂಬಲದೊಂದಿಗೆ',
    partialBtn: '⏳ ಸ್ವಲ್ಪ ಭಾಗ ಪೂರ್ಣಗೊಳಿಸಿದ್ದೇನೆ',
    partialTag: 'ಭಾಗಶಃ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    complete: 'ಪೂರ್ಣಗೊಳಿಸಿ',
    confirmExitTitle: 'ವಿರಾಮ ತೆಗೆದುಕೊಳ್ಳುವುದೇ ಅಥವಾ ಹೊರಹೋಗುವುದೇ?',
    confirmExitDescTemplate: '"{title}" ನಲ್ಲಿ ನಿಮ್ಮ ಪ್ರಗತಿಯಿದೆ. ನೀವು ಯಾವಾಗ ಬೇಕಾದರೂ ಹಿಂತಿರುಗಲು ನಾವು ನಿಮ್ಮ ಸ್ಥಾನವನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಉಳಿಸಬಹುದು.',
    pauseSaveBtn: '💾 ನಿಲ್ಲಿಸಿ ಪ್ರಗತಿ ಉಳಿಸಿ',
    recommended: 'ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ',
    continueActivityBtn: '▶️ ಚಟುವಟಿಕೆ ಮುಂದುವರಿಸಿ',
    discardExitBtn: '✕ ಉಳಿಸದೆ ಹೊರಹೋಗಿ',
    memoryPromptTemplate: '"{title}" ನಲ್ಲಿ ಮೊದಲು ಏನು ಬರುತ್ತದೆ ಎಂದು ನೆನಪಿಸಿಕೊಳ್ಳಲು ಪ್ರಯತ್ನಿಸುತ್ತೀರಾ?',
  },
};

export const getGuidedRunnerText = (language?: string): GuidedRunnerStrings => {
  return RUNNER_TRANSLATIONS[normalizeLang(language)];
};

export const getTranslatedMicroActions = (
  stepText: string,
  routineTitle: string = '',
  category: string = '',
  language?: string
): string[] => {
  const lang = normalizeLang(language);
  const text = `${stepText} ${routineTitle} ${category}`.toLowerCase();
  const clean = stepText.replace(/^[0-9०-९০-৯௦-௯౦-౯೦-೯]+\.\s*/, '').slice(0, 50);

  if (
    text.includes('button') ||
    text.includes('shirt') ||
    text.includes('dress') ||
    text.includes('बटन') ||
    text.includes('शर्ट') ||
    text.includes('बटण') ||
    text.includes('জামা') ||
    text.includes('பொத்தான்') ||
    text.includes('చొక్కా') ||
    text.includes('ಅಂಗಿ')
  ) {
    const map: Record<keyof SevenLangRecord, string[]> = {
      en: [
        '1. Spread your shirt flat across your lap and take a slow breath.',
        '2. Line up the bottom button and hole carefully with both hands.',
        '3. Push the button through gently, resting hands after each button.',
      ],
      hi: [
        '1. अपनी कमीज़ को गोद में सीधा फैलाएँ और गहरी शांत साँस लें।',
        '2. दोनों हाथों से नीचे वाले बटन और उसके काज को ध्यान से मिलाएँ।',
        '3. बटन को धीरे से अंदर डालें और हर बटन के बाद हाथों को आराम दें।',
      ],
      mr: [
        '1. तुमचा शर्ट मांडीवर सपाट पसरवा आणि शांत श्वास घ्या.',
        '2. दोन्ही हातांनी खालचे बटण आणि काज नीट समोरासमोर आणा.',
        '3. हळुवारपणे बटण लावा आणि प्रत्येक बटणानंतर हातांना विश्रांती द्या.',
      ],
      bn: [
        '১. আপনার জামাটি কোলের ওপর সমানভাবে বিছিয়ে ধীরে শ্বাস নিন।',
        '২. দুই হাতে নিচের বোতাম এবং ঘরটি সাবধানে পাশাপাশি আনুন।',
        '৩. ধীরে বোতামটি লাগান এবং প্রতিটি বোতামের পর হাতকে একটু বিশ্রাম দিন।',
      ],
      ta: [
        '1. உங்கள் சட்டையை மடியில் சமமாக விரித்து மெதுவாக மூச்செடுங்கள்.',
        '2. இரு கைகளாலும் கீழே உள்ள பொத்தானையும் துளையையும் கவனமாக நேராக்குங்கள்.',
        '3. பொத்தானை மெதுவாகச் செலுத்தி, ஒவ்வொரு பொத்தானுக்கும் பிறகு கைகளுக்கு ஓய்வு கொடுங்கள்.',
      ],
      te: [
        '1. మీ చొక్కాను ఒడిలో సమంగా పరిచి నెమ్మదిగా శ్వాస తీసుకోండి.',
        '2. రెండు చేతులతో క్రింది గుండీ మరియు రంధ్రాన్ని జాగ్రత్తగా సరిచేయండి.',
        '3. గుండీని మెల్లగా పెట్టి, ప్రతి గుండీ తర్వాత చేతులకు విశ్రాంతి ఇవ్వండి.',
      ],
      kn: [
        '1. ನಿಮ್ಮ ಅಂಗಿಯನ್ನು ಮಡಿಲಲ್ಲಿ ಸಮನಾಗಿ ಹರಡಿ ನಿಧಾನವಾಗಿ ಉಸಿರಾಡಿ.',
        '2. ಎರಡೂ ಕೈಗಳಿಂದ ಕೆಳಗಿನ ಗುಂಡಿ ಮತ್ತು ರಂಧ್ರವನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಹೊಂದಿಸಿ.',
        '3. ಗುಂಡಿಯನ್ನು ನಿಧಾನವಾಗಿ ಹಾಕಿ, ಪ್ರತಿ ಗುಂಡಿಯ ನಂತರ ಕೈಗಳಿಗೆ ವಿಶ್ರಾಂತಿ ನೀಡಿ.',
      ],
    };
    return map[lang];
  }

  if (
    text.includes('tea') ||
    text.includes('water') ||
    text.includes('hydrat') ||
    text.includes('medication') ||
    text.includes('चाय') ||
    text.includes('दवा') ||
    text.includes('पानी') ||
    text.includes('चहा') ||
    text.includes('औषध') ||
    text.includes('জল') ||
    text.includes('ওষুধ') ||
    text.includes('தேநீர்') ||
    text.includes('மருந்து') ||
    text.includes('టీ') ||
    text.includes('మందు') ||
    text.includes('ಚಹಾ') ||
    text.includes('ಔಷಧಿ')
  ) {
    const map: Record<keyof SevenLangRecord, string[]> = {
      en: [
        '1. Place both feet firmly on the ground and rest hands on table.',
        '2. Grip the cup or glass with both hands for steady balance.',
        '3. Take three gentle sips slowly and breathe calmly.',
      ],
      hi: [
        '1. दोनों पैरों को जमीन पर स्थिर रखें और हाथों को मेज़ पर टिकाएँ।',
        '2. संतुलन बनाए रखने के लिए कप या गिलास को दोनों हाथों से पकड़ें।',
        '3. धीरे-धीरे तीन शांत घूँट लें और आराम से साँस लें।',
      ],
      mr: [
        '1. दोन्ही पाय जमिनीवर घट्ट ठेवा आणि हात टेबलावर टेकवा.',
        '2. स्थिर संतुलनासाठी कप किंवा ग्लास दोन्ही हातांनी पकडा.',
        '3. हळुवार तीन घोट घ्या आणि शांतपणे श्वास घ्या.',
      ],
      bn: [
        '১. দুটি পা মাটিতে স্থির রাখুন এবং হাত টেবিলের ওপর রাখুন।',
        '২. স্থির ভারসাম্যের জন্য দুই হাতে কাপ বা গ্লাস ধরুন।',
        '৩. ধীরে ধীরে তিনটি চুমুক দিন এবং শান্তভাবে শ্বাস নিন।',
      ],
      ta: [
        '1. இரு கால்களையும் தரையில் உறுதியாக வைத்து கைகளை மேசையில் தாங்குங்கள்.',
        '2. நிலையான சமநிலைக்கு கோப்பை அல்லது டம்ளரை இரு கைகளாலும் பிடியுங்கள்.',
        '3. மெதுவாக மூன்று மிடறு குடித்து அமைதியாக மூச்செடுங்கள்.',
      ],
      te: [
        '1. రెండు పాదాలను నేలపై స్థిరంగా ఉంచి చేతులను టేబుల్‌పై ఆనించండి.',
        '2. స్థిరమైన సమతుల్యత కోసం కప్పు లేదా గ్లాసును రెండు చేతులతో పట్టుకోండి.',
        '3. నెమ్మదిగా మూడు గుక్కలు త్రాగి ప్రశాంతంగా శ్వాస తీసుకోండి.',
      ],
      kn: [
        '1. ಎರಡೂ ಪಾದಗಳನ್ನು ನೆಲದ ಮೇಲೆ ಸ್ಥಿರವಾಗಿ ಇಟ್ಟು ಕೈಗಳನ್ನು ಟೇಬಲ್ ಮೇಲೆ ಇರಿಸಿ.',
        '2. ಸ್ಥಿರ ಸಮತೋಲನಕ್ಕಾಗಿ ಕಪ್ ಅಥವಾ ಲೋಟವನ್ನು ಎರಡೂ ಕೈಗಳಿಂದ ಹಿಡಿಯಿರಿ.',
        '3. ನಿಧಾನವಾಗಿ ಮೂರು ಗುಟುಕು ಕುಡಿದು ಪ್ರಶಾಂತವಾಗಿ ಉಸಿರಾಡಿ.',
      ],
    };
    return map[lang];
  }

  if (
    text.includes('walk') ||
    text.includes('garden') ||
    text.includes('stretch') ||
    text.includes('feet') ||
    text.includes('सैर') ||
    text.includes('बगीचे') ||
    text.includes('बाग') ||
    text.includes('হাঁটা') ||
    text.includes('நடை') ||
    text.includes('నడక') ||
    text.includes('ನಡಿಗೆ')
  ) {
    const map: Record<keyof SevenLangRecord, string[]> = {
      en: [
        '1. Check that your shoes or slippers are securely fastened.',
        '2. Stand up slowly, holding onto a stable chair for 5 seconds.',
        '3. Take three slow, calm steps forward at your own comfortable pace.',
      ],
      hi: [
        '1. जाँच लें कि आपके जूते या चप्पल ठीक से पहने हुए हैं।',
        '2. किसी मजबूत कुर्सी को पकड़कर 5 सेकंड रुकते हुए धीरे से खड़े हों।',
        '3. अपनी सहज गति से आगे तीन शांत और धीमे कदम बढ़ाएँ।',
      ],
      mr: [
        '1. तुमचे बूट किंवा चप्पल नीट बसले असल्याची खात्री करा.',
        '2. मजबूत खुर्ची धरून ५ सेकंद थांबत हळूहळू उभे राहा.',
        '3. तुमच्या आरामाच्या गतीने पुढे तीन शांत पावले टाका.',
      ],
      bn: [
        '১. আপনার জুতো বা চপ্পল ঠিকভাবে পরা আছে কিনা দেখে নিন।',
        '২. একটি শক্ত চেয়ার ধরে ৫ সেকেন্ড অপেক্ষা করে ধীরে উঠে দাঁড়ান।',
        '৩. আপনার স্বাচ্ছন্দ্যের গতিতে সামনে তিনটি ধীর, শান্ত পা ফেলুন।',
      ],
      ta: [
        '1. உங்கள் காலணிகள் அல்லது செருப்புகள் பாதுகாப்பாக உள்ளதா எனப் பாருங்கள்.',
        '2. உறுதியான நாற்காலியைப் பிடித்து 5 விநாடிகள் நின்று மெதுவாக எழுங்கள்.',
        '3. உங்கள் வசதியான வேகத்தில் மூன்று மெதுவான அமைதியான அடிகள் முன்னால் வையுங்கள்.',
      ],
      te: [
        '1. మీ బూట్లు లేదా చెప్పులు సరిగ్గా ఉన్నాయో లేదో చూసుకోండి.',
        '2. స్థిరమైన కుర్చీని పట్టుకుని 5 సెకన్ల పాటు నిదానంగా నిలబడండి.',
        '3. మీ సౌకర్యవంతమైన వేగంతో ముందుకు మూడు నెమ్మదైన అడుగులు వేయండి.',
      ],
      kn: [
        '1. ನಿಮ್ಮ ಬೂಟು ಅಥವಾ ಚಪ್ಪಲಿಗಳು ಸರಿಯಾಗಿವೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ.',
        '2. ಗಟ್ಟಿಯಾದ ಕುರ್ಚಿಯನ್ನು ಹಿಡಿದು 5 ಸೆಕೆಂಡುಗಳ ಕಾಲ ನಿಧಾನವಾಗಿ ಎದ್ದು ನಿಲ್ಲಿ.',
        '3. ನಿಮ್ಮ ಆರಾಮದಾಯಕ ವೇಗದಲ್ಲಿ ಮುಂದೆ ಮೂರು ಶಾಂತ ಹೆಜ್ಜೆ ಇಡಿ.',
      ],
    };
    return map[lang];
  }

  const genericMap: Record<keyof SevenLangRecord, string[]> = {
    en: [
      '1. Sit in a comfortable, supported chair and take a calm breath.',
      `2. Focus on just the first small part: "${clean}".`,
      '3. Pause and rest your hands whenever you feel any tension.',
    ],
    hi: [
      '1. किसी आरामदायक सहारे वाली कुर्सी पर बैठें और शांत साँस लें।',
      `2. केवल पहले छोटे हिस्से पर ध्यान दें: "${clean}"।`,
      '3. जब भी थकान या तनाव लगे, थोड़ा रुककर हाथों को आराम दें।',
    ],
    mr: [
      '1. आरामदायी खुर्चीवर बसा आणि एक शांत श्वास घ्या.',
      `2. फक्त पहिल्या लहान भागावर लक्ष केंद्रित करा: "${clean}".`,
      '3. जेव्हा थकवा जाणवेल तेव्हा थांबा आणि हातांना विश्रांती द्या.',
    ],
    bn: [
      '১. একটি আরামদায়ক চেয়ারে বসুন এবং শান্ত শ্বাস নিন।',
      `২. শুধুমাত্র প্রথম ছোট অংশটিতে মনোযোগ দিন: "${clean}"।`,
      '৩. কোনো টান বা ক্লান্তি বোধ করলে হাত থামিয়ে বিশ্রাম নিন।',
    ],
    ta: [
      '1. வசதியான நாற்காலியில் அமர்ந்து அமைதியாக மூச்செடுங்கள்.',
      `2. முதல் சிறிய பகுதியில் மட்டும் கவனம் செலுத்துங்கள்: "${clean}".`,
      '3. சிரமமாகத் தோன்றும் போதெல்லாம் சற்று நின்று கைகளுக்கு ஓய்வு கொடுங்கள்.',
    ],
    te: [
      '1. సౌకర్యవంతమైన కుర్చీలో కూర్చుని ప్రశాంతంగా శ్వాస తీసుకోండి.',
      `2. కేవలం మొదటి చిన్న భాగంపై దృష్టి పెట్టండి: "${clean}".`,
      '3. ఎప్పుడైనా ఒత్తిడి అనిపిస్తే ఆపి చేతులకు విశ్రాంతి ఇవ్వండి.',
    ],
    kn: [
      '1. ಆರಾಮದಾಯಕ ಕುರ್ಚಿಯಲ್ಲಿ ಕುಳಿತು ಶಾಂತವಾಗಿ ಉಸಿರೆಳೆಯಿರಿ.',
      `2. ಕೇವಲ ಮೊದಲ ಸಣ್ಣ ಭಾಗದ ಮೇಲೆ ಗಮನಹರಿಸಿ: "${clean}".`,
      '3. ಯಾವಾಗಲಾದರೂ ಆಯಾಸ ಎನಿಸಿದರೆ ನಿಲ್ಲಿಸಿ ಕೈಗಳಿಗೆ ವಿಶ್ರಾಂತಿ ನೀಡಿ.',
    ],
  };
  return genericMap[lang];
};

export const getTranslatedSimplifiedExplanation = (stepText: string, language?: string): string => {
  const clean = stepText.replace(/^[0-9०-९০-৯௦-௯౦-౯೦-೯]+\.\s*/, '');
  const map: SevenLangRecord = {
    en: `In simple words: Take your time with this step. ${clean}. There is no test or hurry at all.`,
    hi: `सरल शब्दों में: इस चरण के लिए आराम से समय लें। ${clean}। यहाँ कोई परीक्षा या जल्दी बिल्कुल नहीं है।`,
    mr: `सोप्या शब्दांत: या पायरीसाठी निवांत वेळ घ्या. ${clean}. येथे कोणतीही परीक्षा किंवा घाई नाही.`,
    bn: `সহজ কথায়: এই ধাপটির জন্য আপনার সময় নিন। ${clean}। এখানে কোনো পরীক্ষা বা তাড়াহুড়ো নেই।`,
    ta: `எளிய வார்த்தைகளில்: இந்தப் படிக்கு உங்கள் நேரத்தை எடுத்துக்கொள்ளுங்கள். ${clean}. எந்த அவசரமும் இல்லை.`,
    te: `సులభమైన మాటలలో: ఈ దశకు మీ సమయాన్ని తీసుకోండి. ${clean}. ఎటువంటి తొందర లేదా పరీక్ష లేదు.`,
    kn: `ಸರಳ ಮಾತುಗಳಲ್ಲಿ: ಈ ಹಂತಕ್ಕಾಗಿ ನಿಧಾನವಾಗಿ ಸಮಯ ತೆಗೆದುಕೊಳ್ಳಿ. ${clean}. ಇಲ್ಲಿ ಯಾವುದೇ ಪರೀಕ್ಷೆ ಅಥವಾ ಆತುರವಿಲ್ಲ.`,
  };
  return pick7(map, language);
};

export const getTranslatedAshaReassurance = (routineTitle: string, language?: string): string => {
  const map: SevenLangRecord = {
    en: `Namaste! Asha is here with you. You are doing wonderfully with "${routineTitle}". Relax your shoulders, breathe in deeply, and remember each calm effort is a victory for your wellbeing.`,
    hi: `नमस्ते! आशा आपके साथ है। आप "${routineTitle}" बहुत अच्छे से कर रहे हैं। अपने कंधे ढीले छोड़ें, गहरी साँस लें और याद रखें आपका हर शांत प्रयास आपकी सेहत की जीत है।`,
    mr: `नमस्कार! आशा तुमच्या सोबत आहे. तुम्ही "${routineTitle}" खूप छान करत आहात. खांदे सैल सोडा, दीर्घ श्वास घ्या आणि लक्षात ठेवा प्रत्येक शांत प्रयत्न तुमच्या आरोग्यासाठी मोठे यश आहे.`,
    bn: `নমস্কার! আশা আপনার সাথেই আছে। আপনি "${routineTitle}" খুব সুন্দরভাবে করছেন। কাঁধ আলগা রাখুন, গভীর শ্বাস নিন এবং মনে রাখবেন প্রতিটি শান্ত প্রচেষ্টাই আপনার সুস্থতার জয়।`,
    ta: `வணக்கம்! ஆஷா உங்களுடன் இருக்கிறாள். நீங்கள் "${routineTitle}"-ஐ மிக அருமையாகச் செய்கிறீர்கள். தோள்களைத் தளர்த்தி ஆழமாக மூச்செடுங்கள்; ஒவ்வொரு அமைதியான முயற்சியும் உங்கள் நலனுக்கான வெற்றியாகும்.`,
    te: `నమస్తే! ఆశా మీతోనే ఉంది. మీరు "${routineTitle}" చాలా అద్భుతంగా చేస్తున్నారు. భుజాలను సడలించి లోతుగా శ్వాస తీసుకోండి, ప్రతి ప్రశాంత ప్రయత్నం మీ ఆరోగ్యానికి విజయమే.`,
    kn: `ನಮಸ್ಕಾರ! ಆಶಾ ನಿಮ್ಮೊಂದಿಗಿದ್ದಾಳೆ. ನೀವು "${routineTitle}" ಅನ್ನು ಬಹಳ ಚೆನ್ನಾಗಿ ಮಾಡುತ್ತಿದ್ದೀರಿ. ಭುಜಗಳನ್ನು ಸಡಿಲಿಸಿ ಆಳವಾಗಿ ಉಸಿರಾಡಿ, ಪ್ರತಿ ಶಾಂತ ಪ್ರಯತ್ನವೂ ನಿಮ್ಮ ಆರೋಗ್ಯಕ್ಕೆ ಗೆಲುವಾಗಿದೆ.`,
  };
  return pick7(map, language);
};

export const getTranslatedAskAshaHelpMsg = (routineTitle: string, language?: string): string => {
  const map: SevenLangRecord = {
    en: `Asha is right here with you. I have opened the full micro-steps for "${routineTitle}". Relax your shoulders and take all the time you need.`,
    hi: `आशा यहीं आपके साथ है। मैंने "${routineTitle}" के सभी छोटे-छोटे चरण खोल दिए हैं। कंधों को आराम दें और आराम से पूरा समय लें।`,
    mr: `आशा तुमच्यासोबतच आहे. मी "${routineTitle}" साठी सर्व लहान पायऱ्या उघडल्या आहेत. खांदे सैल करा आणि हवा तेवढा निवांत वेळ घ्या.`,
    bn: `আশা আপনার পাশেই আছে। আমি "${routineTitle}"-এর সব ছোট ধাপগুলো খুলে দিয়েছি। কাঁধ আলগা রাখুন এবং প্রয়োজনমতো সময় নিন।`,
    ta: `ஆஷா உங்களுடனே இருக்கிறாள். "${routineTitle}"-க்கான அனைத்து சிறிய படிகளையும் திறந்துள்ளேன். தோள்களைத் தளர்த்தி தேவையான நேரத்தை எடுத்துக்கொள்ளுங்கள்.`,
    te: `ఆశా మీతోనే ఉంది. నేను "${routineTitle}" కోసం పూర్తి చిన్న దశలను తెరిచాను. భుజాలను విశ్రాంతిగా ఉంచి మీకు కావలసినంత సమయం తీసుకోండి.`,
    kn: `ಆಶಾ ನಿಮ್ಮೊಂದಿಗೇ ಇದ್ದಾಳೆ. "${routineTitle}" ಗಾಗಿ ಎಲ್ಲಾ ಸಣ್ಣ ಹಂತಗಳನ್ನು ತೆರೆದಿದ್ದೇನೆ. ಭುಜಗಳನ್ನು ಸಡಿಲಿಸಿ ನಿಮಗೆ ಬೇಕಾದಷ್ಟು ಸಮಯ ತೆಗೆದುಕೊಳ್ಳಿ.`,
  };
  return pick7(map, language);
};

export const getTranslatedStuckChoiceAdvice = (
  choice: 'started' | 'step1' | 'step2' | 'forgot' | 'caregiver',
  routineTitle: string,
  currentStepText: string,
  language?: string
): string => {
  const cleanTitle = routineTitle;
  const cleanStep = currentStepText;
  switch (choice) {
    case 'started':
      return pick7(
        {
          en: "No worries at all! Let's begin fresh with the very first step together.",
          hi: 'बिल्कुल चिंता न करें! आइए साथ मिलकर सबसे पहले चरण से फिर शुरू करें।',
          mr: 'अजिबात काळजी करू नका! चला आपण पहिल्या पायरीपासून नव्याने सुरुवात करूया.',
          bn: 'একদম চিন্তা করবেন না! চলুন একসাথে একদম প্রথম ধাপ থেকে নতুন করে শুরু করি।',
          ta: 'கவலையே வேண்டாம்! வாருங்கள் முதல் படியிலிருந்து புதிதாக ஒன்றாகத் தொடங்குவோம்.',
          te: 'అసలు చింతించకండి! రండి కలిసి మొదటి దశ నుండే కొత్తగా ప్రారంభిద్దాం.',
          kn: 'ಸ್ವಲ್ಪವೂ ಚಿಂತಿಸಬೇಡಿ! ಬನ್ನಿ ಒಟ್ಟಿಗೆ ಮೊದಲ ಹಂತದಿಂದ ಹೊಸದಾಗಿ ಪ್ರಾರಂಭಿಸೋಣ.',
        },
        language
      );
    case 'step1':
      return pick7(
        {
          en: 'Great work completing the first step! Now focus gently on step two.',
          hi: 'पहला चरण पूरा करने पर शाबाश! अब आराम से दूसरे चरण पर ध्यान दें।',
          mr: 'पहिली पायरी पूर्ण केल्याबद्दल खूप छान! आता शांतपणे दुसऱ्या पायरीवर लक्ष द्या.',
          bn: 'প্রথম ধাপ শেষ করার জন্য দারুণ কাজ হয়েছে! এখন শান্তভাবে দ্বিতীয় ধাপে মন দিন।',
          ta: 'முதல் படியை முடித்தது அருமை! இப்போது அமைதியாக இரண்டாவது படியில் கவனம் செலுத்துங்கள்.',
          te: 'మొదటి దశ పూర్తి చేసినందుకు శభాష్! ఇప్పుడు ప్రశాంతంగా రెండవ దశపై దృష్టి పెట్టండి.',
          kn: 'ಮೊದಲ ಹಂತವನ್ನು ಪೂರ್ಣಗೊಳಿಸಿದ್ದಕ್ಕೆ ಶಭಾಷ್! ಈಗ ಶಾಂತವಾಗಿ ಎರಡನೇ ಹಂತದ ಮೇಲೆ ಗಮನಹರಿಸಿ.',
        },
        language
      );
    case 'step2':
      return pick7(
        {
          en: "You're making wonderful progress. Here is the next instruction.",
          hi: 'आप बहुत अच्छी प्रगति कर रहे हैं। यह रहा अगला निर्देश।',
          mr: 'तुम्ही खूप छान प्रगती करत आहात. ही पुढची सूचना आहे.',
          bn: 'আপনি দারুণ এগোচ্ছেন। পরের নির্দেশটি এখানে রয়েছে।',
          ta: 'நீங்கள் அருமையாக முன்னேறுகிறீர்கள். இதோ அடுத்த அறிவுரை.',
          te: 'మీరు అద్భుతంగా ముందుకు సాగుతున్నారు. తదుపరి సూచన ఇదిగో.',
          kn: 'ನೀವು ಬಹಳ ಚೆನ್ನಾಗಿ ಮುಂದುವರಿಯುತ್ತಿದ್ದೀರಿ. ಮುಂದಿನ ಸೂಚನೆ ಇಲ್ಲಿದೆ.',
        },
        language
      );
    case 'forgot':
      return pick7(
        {
          en: `You are doing "${cleanTitle}". Right now, all you need to do is: "${cleanStep}". Take your time.`,
          hi: `आप "${cleanTitle}" कर रहे हैं। अभी आपको बस यह करना है: "${cleanStep}"। आराम से समय लें।`,
          mr: `तुम्ही "${cleanTitle}" करत आहात. आत्ता तुम्हाला फक्त हे करायचे आहे: "${cleanStep}". निवांत वेळ घ्या.`,
          bn: `আপনি "${cleanTitle}" করছেন। এখন শুধু এটিই করতে হবে: "${cleanStep}"। ধীরে সময় নিন।`,
          ta: `நீங்கள் "${cleanTitle}" செய்துகொண்டிருக்கிறீர்கள். இப்போது நீங்கள் செய்ய வேண்டியது: "${cleanStep}". உங்கள் நேரத்தை எடுத்துக்கொள்ளுங்கள்.`,
          te: `మీరు "${cleanTitle}" చేస్తున్నారు. ప్రస్తుతం మీరు చేయాల్సింది ఇది మాత్రమే: "${cleanStep}". మీ సమయాన్ని తీసుకోండి.`,
          kn: `ನೀವು "${cleanTitle}" ಮಾಡುತ್ತಿದ್ದೀರಿ. ಈಗ ನೀವು ಮಾಡಬೇಕಾದದ್ದು ಇಷ್ಟೇ: "${cleanStep}". ನಿಧಾನವಾಗಿ ಸಮಯ ತೆಗೆದುಕೊಳ್ಳಿ.`,
        },
        language
      );
    case 'caregiver':
    default:
      return pick7(
        {
          en: 'We are here for you. You can take a peaceful pause or ask your family caregiver for a hand.',
          hi: 'हम आपके साथ हैं। आप शांत विराम ले सकते हैं या अपने पारिवारिक देखभालकर्ता की मदद ले सकते हैं।',
          mr: 'आम्ही तुमच्या सोबत आहोत. तुम्ही शांत विश्रांती घेऊ शकता किंवा कुटुंबातील काळजीवाहूची मदत घेऊ शकता.',
          bn: 'আমরা আপনার সাথেই আছি। আপনি শান্ত বিরতি নিতে পারেন বা পরিবারের যত্নকারীর সাহায্য চাইতে পারেন।',
          ta: 'நாங்கள் உங்களுடன் இருக்கிறோம். நீங்கள் அமைதியாக ஓய்வெடுக்கலாம் அல்லது குடும்பப் பராமரிப்பாளரின் உதவியைக் கேட்கலாம்.',
          te: 'మేము మీ కోసం ఉన్నాము. మీరు ప్రశాంతంగా విరామం తీసుకోవచ్చు లేదా మీ కుటుంబ సంరక్షకుడి సహాయం కోరవచ్చు.',
          kn: 'ನಾವು ನಿಮ್ಮೊಂದಿಗಿದ್ದೇವೆ. ನೀವು ಶಾಂತ ವಿರಾಮ ತೆಗೆದುಕೊಳ್ಳಬಹುದು ಅಥವಾ ಕುಟುಂಬ ಆರೈಕೆದಾರರ ಸಹಾಯ ಕೇಳಬಹುದು.',
        },
        language
      );
  }
};

export const getTranslatedCalmProposalExplanation = (
  calmExplanation: { en: string; hi?: string; mr?: string; [key: string]: string | undefined },
  rationale: string,
  language?: string
): string => {
  const lang = normalizeLang(language);
  const direct = calmExplanation[lang];
  if (direct && direct.trim()) return direct;
  if (lang !== 'en') {
    const fallbackMap: SevenLangRecord = {
      en: calmExplanation.en || rationale,
      hi: calmExplanation.hi || 'यह गतिविधि आपके लिए और भी छोटे व शांत चरणों में सरल बनाई जा सकती है।',
      mr: calmExplanation.mr || 'ही कृती तुमच्यासाठी अधिक लहान व शांत पायऱ्यांमध्ये सोपी करता येईल.',
      bn: 'আপনার সুবিধার জন্য এই কাজটি আরও ছোট এবং শান্ত ধাপে সহজ করা যেতে পারে।',
      ta: 'உங்கள் வசதிக்காக இந்தச் செயலை இன்னும் சிறிய, அமைதியான படிகளாக எளிதாக்கலாம்.',
      te: 'మీ సౌకర్యం కోసం ఈ పనిని మరింత చిన్న, ప్రశాంతమైన దశలుగా సులభతరం చేయవచ్చు.',
      kn: 'ನಿಮ್ಮ ಅನುಕೂಲಕ್ಕಾಗಿ ಈ ಚಟುವಟಿಕೆಯನ್ನು ಇನ್ನೂ ಸಣ್ಣ ಹಾಗೂ ಶಾಂತ ಹಂತಗಳಾಗಿ ಸುಲಭಗೊಳಿಸಬಹುದು.',
    };
    return fallbackMap[lang];
  }
  return calmExplanation.en || rationale;
};

export const formatGuidedTemplate = (
  template: string,
  vars: Record<string, string | number>
): string => {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
};

export type SupportedLangCode = SupportedLanguage;
