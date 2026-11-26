import React, { useState, useEffect } from 'react';
import { RoutineItem } from '../../types/index.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { getTranslatedRoutineTitle } from './utils/routineTranslation.js';
import { Sparkles, ThumbsUp, ThumbsDown, X, Clock, HelpCircle } from 'lucide-react';

interface AssistanceTrayModalProps {
  isOpen: boolean;
  routine: RoutineItem;
  onClose: () => void;
  onFeedback: (feedback: 'helpful' | 'not-for-me' | 'dismissed', attempts: number) => void;
}

export const AssistanceTrayModal: React.FC<AssistanceTrayModalProps> = ({
  isOpen,
  routine,
  onClose,
  onFeedback,
}) => {
  const { t, language } = useLanguage();
  // Retain attempts & timer across opens/closes
  const [attemptLevel, setAttemptLevel] = useState<number>(1);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null);

  const trayUi = (
    {
      hi: {
        title: '3-अवसर सहायक स्मरण',
        dismissAria: 'सहायता बंद करें',
        attemptLabel: 'प्रयास:',
        timeLabel: (tm: string) => `समय: ${tm}`,
        t1Title: 'पहला हल्का संकेत', t1Tone: 'सरल याद दिलाना',
        t2Title: 'दूसरा दृश्य संकेत', t2Tone: 'घर के आसपास देखें',
        t3Title: 'सीधा सहायक कदम', t3Tone: 'अभी करने के लिए स्पष्ट कदम',
        d1: 'याद करें कि शरीर में ऊर्जा और ताज़गी रखने के लिए आप सुबह लगभग 11:00 बजे क्या करते हैं।',
        d2: 'रसोई के काउंटर या बिस्तर के पास की मेज़ पर देखें। वहाँ ताज़ा पानी का गिलास रखा है।',
        d3: 'एक गिलास पानी पिएं और गर्दन को आराम देने के लिए कंधों को 5 बार धीरे-धीरे पीछे घुमाएं।',
        feedbackDone: '✓ धन्यवाद! आपकी प्रतिक्रिया हमें आपके देखभाल संकेतों को बेहतर बनाने में मदद करती है।',
        moreHelp: (nxt: number) => `और मदद चाहिए? प्रयास ${nxt} का संकेत देखें`,
        helpful: 'मददगार रहा',
        notForMe: 'मेरे लिए ठीक नहीं',
        dismissBtn: 'अभी के लिए बंद करें (आपकी प्रगति सुरक्षित रहेगी)',
      },
      mr: {
        title: '३-संधी स्मरण सहाय्य',
        dismissAria: 'सहाय्य बंद करा',
        attemptLabel: 'प्रयत्न:',
        timeLabel: (tm: string) => `वेळ: ${tm}`,
        t1Title: 'पहिला हलका संकेत', t1Tone: 'सौम्य आठवण',
        t2Title: 'दुसरा दृश्य संकेत', t2Tone: 'घराभोवती पहा',
        t3Title: 'थेट मदतीची पायरी', t3Tone: 'आत्ता करण्यासाठी स्पष्ट कृती',
        d1: 'तुमचे शरीर उत्साही ठेवण्यासाठी तुम्ही सकाळी ११:०० च्या सुमारास काय करता ते आठवा.',
        d2: 'स्वयंपाकघरातील ओट्यावर किंवा बेडशेजारील टेबलाकडे पहा. तिथे ताज्या पाण्याचा ग्लास ठेवला आहे.',
        d3: 'एक ग्लास पाणी प्या आणि मान सैल करण्यासाठी खांदे ५ वेळा हळूच मागे फिरवा.',
        feedbackDone: '✓ धन्यवाद! तुमचा अभिप्राय आम्हाला तुमचे संकेत अधिक उपयुक्त बनवण्यास मदत करतो.',
        moreHelp: (nxt: number) => `आणखी मदत हवी? प्रयत्न ${nxt} संकेत पहा`,
        helpful: 'उपयुक्त वाटले',
        notForMe: 'माझ्यासाठी योग्य नाही',
        dismissBtn: 'सध्या बंद करा (तुमची प्रगती जतन राहील)',
      },
      bn: {
        title: '৩-ধাপের সহায়ক স্মরণ',
        dismissAria: 'সহায়তা বন্ধ করুন',
        attemptLabel: 'চেষ্টা:',
        timeLabel: (tm: string) => `সময়: ${tm}`,
        t1Title: 'প্রথম হালকা ইঙ্গিত', t1Tone: 'মৃদু মনে করিয়ে দেওয়া',
        t2Title: 'দ্বিতীয় দৃশ্যমান সূত্র', t2Tone: 'ঘরের চারপাশে দেখুন',
        t3Title: 'সরাসরি সহায়ক ধাপ', t3Tone: 'এখনের জন্য সহজ কাজ',
        d1: 'শরীর সতেজ রাখতে সকাল ১১টার দিকে আপনি সাধারণত কী করেন তা মনে করে দেখুন।',
        d2: 'রান্নাঘরের কাউন্টার বা বিছানার পাশের টেবিলের দিকে তাকান। সেখানে এক গ্লাস তাজা জল রাখা আছে।',
        d3: 'এক গ্লাস জল পান করুন এবং কাঁধ ৫ বার আলতো করে ঘোরান।',
        feedbackDone: '✓ ধন্যবাদ! আপনার মতামত আমাদের আপনার যত্নের ইঙ্গিতগুলো আরও ভালো করতে সাহায্য করে।',
        moreHelp: (nxt: number) => `আরও সাহায্য চাই? ধাপ ${nxt}-এর সূত্র দেখুন`,
        helpful: 'সাহায্যকারী ছিল',
        notForMe: 'আমার জন্য উপযুক্ত নয়',
        dismissBtn: 'এখনকার মতো বন্ধ করুন (আপনার অগ্রগতি সংরক্ষিত থাকবে)',
      },
      ta: {
        title: '3-வாய்ப்பு உதவி நினைவூட்டி',
        dismissAria: 'உதவியை மூடு',
        attemptLabel: 'முயற்சி:',
        timeLabel: (tm: string) => `நேரம்: ${tm}`,
        t1Title: 'முதல் எளிய குறிப்பு', t1Tone: 'மென்மையான நினைவூட்டல்',
        t2Title: 'இரண்டாவது காட்சி குறிப்பு', t2Tone: 'வீட்டைச் சுற்றிப் பாருங்கள்',
        t3Title: 'நேரடி உதவிகரமான படி', t3Tone: 'இப்போது செய்ய வேண்டிய எளிய செயல்',
        d1: 'உடலைச் சுறுசுறுப்பாக வைத்திருக்க காலை 11:00 மணிக்கு என்ன செய்வீர்கள் என்பதை நினைத்துப் பாருங்கள்.',
        d2: 'சமையலறை மேடை அல்லது படுக்கை மேசையைப் பாருங்கள். அங்கே ஒரு டம்ளர் தண்ணீர் உள்ளது.',
        d3: 'ஒரு டம்ளர் தண்ணீர் குடித்து, தோள்களை 5 முறை மெதுவாகச் சுழற்றுங்கள்.',
        feedbackDone: '✓ நன்றி! உங்கள் கருத்து உங்கள் பராமரிப்புக் குறிப்புகளைத் தனிப்பயனாக்க உதவுகிறது.',
        moreHelp: (nxt: number) => `மேலும் உதவி தேவையா? முயற்சி ${nxt} குறிப்பைப் பார்`,
        helpful: 'உதவிகரமாக இருந்தது',
        notForMe: 'எனக்குப் பொருந்தவில்லை',
        dismissBtn: 'இப்போது மூடு (உங்கள் முன்னேற்றம் சேமிக்கப்படும்)',
      },
      te: {
        title: '3-అవకాశాల జ్ఞాపక సహాయం',
        dismissAria: 'సహాయాన్ని మూసివేయండి',
        attemptLabel: 'ప్రయత్నం:',
        timeLabel: (tm: string) => `సమయం: ${tm}`,
        t1Title: 'మొదటి సున్నిత సూచన', t1Tone: 'మెల్లగా గుర్తుచేయడం',
        t2Title: 'రెండవ దృశ్య సూచన', t2Tone: 'మీ ఇంటి చుట్టూ చూడండి',
        t3Title: 'నేరుగా సహాయపడే దశ', t3Tone: 'ఇప్పుడు చేయవలసిన స్పష్టమైన పని',
        d1: 'శరీరాన్ని ఉత్సాహంగా ఉంచడానికి ఉదయం 11:00 గంటలకు మీరు సాధారణంగా ఏమి చేస్తారో ఆలోచించండి.',
        d2: 'వంటగది గట్టు లేదా పడక బల్ల వైపు చూడండి. అక్కడ తాజా నీటి గ్లాసు సిద్ధంగా ఉంది.',
        d3: 'ఒక గ్లాసు నీరు త్రాగి, భుజాలను 5 సార్లు మెల్లగా వెనక్కి తిప్పండి.',
        feedbackDone: '✓ ధన్యవాదాలు! మీ అభిప్రాయం మీ సంరక్షణ సూచనలను మెరుగుపరచడంలో సహాయపడుతుంది.',
        moreHelp: (nxt: number) => `మరింత సహాయం కావాలా? ప్రయత్నం ${nxt} సూచన చూడండి`,
        helpful: 'ఉపయోగకరంగా ఉంది',
        notForMe: 'నాకు సరైనది కాదు',
        dismissBtn: 'ఇప్పుడు మూసివేయండి (మీ ప్రగతి సేవ్ చేయబడుతుంది)',
      },
      kn: {
        title: '3-ಅವಕಾಶದ ಸ್ಮರಣ ಸಹಾಯ',
        dismissAria: 'ಸಹಾಯ ಮುಚ್ಚಿರಿ',
        attemptLabel: 'ಪ್ರಯತ್ನ:',
        timeLabel: (tm: string) => `ಸಮಯ: ${tm}`,
        t1Title: 'ಮೊದಲ ಸರಳ ಸುಳಿವು', t1Tone: 'ಮೃದು ನೆನಪಿಸುವಿಕೆ',
        t2Title: 'ಎರಡನೇ ದೃಶ್ಯ ಸುಳಿವು', t2Tone: 'ಮನೆಯ ಸುತ್ತಮುತ್ತ ನೋಡಿ',
        t3Title: 'ನೇರ ಸಹಾಯಕ ಹಂತ', t3Tone: 'ಈಗಲೇ ಮಾಡಲು ಸ್ಪಷ್ಟ ಕ್ರಮ',
        d1: 'ದೇಹವನ್ನು ಚೈತನ್ಯದಿಂದ ಇರಿಸಲು ಬೆಳಗ್ಗೆ 11:00 ಗಂಟೆಗೆ ನೀವು ಸಾಮಾನ್ಯವಾಗಿ ಏನು ಮಾಡುತ್ತೀರಿ ಎಂದು ಯೋಚಿಸಿ.',
        d2: 'ಅಡುಗೆಮನೆ ಕೌಂಟರ್ ಅಥವಾ ಹಾಸಿಗೆಯ ಪಕ್ಕದ ಮೇಜಿನ ಕಡೆ ನೋಡಿ. ಅಲ್ಲಿ ತಾಜಾ ನೀರಿನ ಲೋಟ ಇದೆ.',
        d3: 'ಒಂದು ಲೋಟ ನೀರು ಕುಡಿದು ಭುಜಗಳನ್ನು 5 ಬಾರಿ ನಿಧಾನವಾಗಿ ಹಿಂದಕ್ಕೆ ತಿರುಗಿಸಿ.',
        feedbackDone: '✓ ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆ ನಿಮ್ಮ ಆರೈಕೆ ಸುಳಿವುಗಳನ್ನು ಉತ್ತಮಗೊಳಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
        moreHelp: (nxt: number) => `ಹೆಚ್ಚು ಸಹಾಯ ಬೇಕೇ? ಪ್ರಯತ್ನ ${nxt} ಸುಳಿವು ನೋಡಿ`,
        helpful: 'ಸಹಾಯಕವಾಗಿತ್ತು',
        notForMe: 'ನನಗೆ ಸೂಕ್ತವಲ್ಲ',
        dismissBtn: 'ಈಗ ಮುಚ್ಚಿರಿ (ನಿಮ್ಮ ಪ್ರಗತಿ ಉಳಿಸಲ್ಪಡುತ್ತದೆ)',
      },
    } as Record<string, any>
  )[language] || {
    title: '3-Chance Assisted Recall',
    dismissAria: 'Dismiss assistance',
    attemptLabel: 'Attempt:',
    timeLabel: (tm: string) => `Time: ${tm}`,
    t1Title: 'First Gentle Hint', t1Tone: 'A soft reminder',
    t2Title: 'Second Visual Clue', t2Tone: 'Looking around your home',
    t3Title: 'Direct Helpful Step', t3Tone: 'Clear action for right now',
    d1: 'Think about what you usually do right around 11:00 AM to keep your body energetic and hydrated.',
    d2: 'Look towards the kitchen counter or bedside table. There is a tall glass of fresh water waiting.',
    d3: 'Drink one tall glass of water and gently roll your shoulders back 5 times to loosen your neck.',
    feedbackDone: '✓ Thank you! Your feedback helps us personalise your care cues.',
    moreHelp: (nxt: number) => `Need more help? Reveal Attempt ${nxt} Clue`,
    helpful: 'Helpful',
    notForMe: 'Not for me',
    dismissBtn: 'Dismiss for now (Keeps your progress saved)',
  };

  // Timer counter that increments while modal is open
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      timer = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const defaultCues = routine.recallCues || {
    hint1: trayUi.d1,
    hint2: trayUi.d2,
    hint3: trayUi.d3,
  };

  const getHintForLevel = (level: number) => {
    if (level === 1) return { title: trayUi.t1Title, hint: defaultCues.hint1, tone: trayUi.t1Tone };
    if (level === 2) return { title: trayUi.t2Title, hint: defaultCues.hint2, tone: trayUi.t2Tone };
    return { title: trayUi.t3Title, hint: defaultCues.hint3, tone: trayUi.t3Tone };
  };

  const currentHint = getHintForLevel(attemptLevel);

  const handleNextAttempt = () => {
    if (attemptLevel < 3) {
      setAttemptLevel((prev) => prev + 1);
    }
  };

  const handleUserFeedback = (type: 'helpful' | 'not-for-me') => {
    setFeedbackGiven(type);
    onFeedback(type, attemptLevel);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleDismiss = () => {
    onFeedback('dismissed', attemptLevel);
    onClose();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-saksham-darkText/40 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistance-tray-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-purple-200 relative">
        {/* Header with persistent state tags */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-100">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 id="assistance-tray-title" className="text-lg font-bold text-saksham-darkText">
                {trayUi.title}
              </h3>
              <p className="text-xs text-purple-600 font-medium">{getTranslatedRoutineTitle(routine, t, language)}</p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            aria-label={trayUi.dismissAria}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State Bar: Attempt Level (1, 2, 3) & Timer Preservation */}
        <div className="flex items-center justify-between bg-lavender-50 rounded-2xl p-3 my-4 border border-purple-100">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-purple-900">{trayUi.attemptLabel}</span>
            <div className="flex space-x-1.5">
              {[1, 2, 3].map((lvl) => (
                <span
                  key={lvl}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    lvl === attemptLevel
                      ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                      : lvl < attemptLevel
                      ? 'bg-purple-200 text-purple-800'
                      : 'bg-white text-gray-400 border border-gray-200'
                  }`}
                >
                  {lvl}
                </span>
              ))}
            </div>
          </div>

          {/* Time spent */}
          <div className="flex items-center space-x-1.5 text-xs text-purple-700 font-medium">
            <Clock className="w-4 h-4 text-purple-500" />
            <span>{trayUi.timeLabel(formatTime(secondsElapsed))}</span>
          </div>
        </div>

        {/* Dynamic Clue Card */}
        <div className="bg-gradient-to-br from-lavender-100/70 to-pink-50/50 rounded-2xl p-5 border border-purple-200/80 mb-5 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-white/80 px-2.5 py-1 rounded-md border border-purple-200">
              {currentHint.title}
            </span>
            <span className="text-xs text-gray-500 italic">{currentHint.tone}</span>
          </div>
          <p className="text-base text-saksham-darkText font-medium leading-relaxed my-3">
            "{currentHint.hint}"
          </p>
        </div>

        {/* Actions Tray */}
        {feedbackGiven ? (
          <div className="text-center py-4 bg-emerald-50 rounded-2xl text-emerald-800 font-semibold text-sm border border-emerald-200 animate-in fade-in">
            {trayUi.feedbackDone}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Try More Assistance */}
            {attemptLevel < 3 && (
              <button
                onClick={handleNextAttempt}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-md transition-all"
              >
                <HelpCircle className="w-5 h-5" />
                <span>{trayUi.moreHelp(attemptLevel + 1)}</span>
              </button>
            )}

            {/* Feedback Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => handleUserFeedback('helpful')}
                className="flex items-center justify-center space-x-1.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs md:text-sm rounded-xl transition"
              >
                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                <span>{trayUi.helpful}</span>
              </button>

              <button
                onClick={() => handleUserFeedback('not-for-me')}
                className="flex items-center justify-center space-x-1.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-semibold text-xs md:text-sm rounded-xl transition"
              >
                <ThumbsDown className="w-4 h-4 text-gray-500" />
                <span>{trayUi.notForMe}</span>
              </button>
            </div>

            {/* Dismiss */}
            <div className="text-center pt-2">
              <button
                onClick={handleDismiss}
                className="text-xs text-gray-500 hover:text-gray-700 underline font-medium"
              >
                {trayUi.dismissBtn}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
