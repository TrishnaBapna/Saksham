import React, { useState, useEffect, useRef } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GameRunMetrics } from '../../../../types/index.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { Shapes, CheckCircle, HelpCircle } from 'lucide-react';

interface PatternItem {
  difficulty: GameDifficulty;
  sequence: string[];
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface PatternMatchGameProps {
  difficulty: GameDifficulty;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
}

const ADAPTIVE_PATTERN_SETS: Record<GameDifficulty, PatternItem[]> = {
  Gentle: [
    {
      difficulty: 'Gentle',
      sequence: ['🔵', '🔺', '🔵', '🔺'],
      options: ['🔵', '🔺', '⭐'],
      correctAnswer: '🔵',
      explanation: 'The pattern alternates between Blue Circle and Red Triangle!'
    },
    {
      difficulty: 'Gentle',
      sequence: ['🌸', '🌿', '🌸', '🌿'],
      options: ['🌸', '🌿', '☕'],
      correctAnswer: '🌸',
      explanation: 'Lotus flower alternates with Jasmine leaf!'
    },
    {
      difficulty: 'Gentle',
      sequence: ['⭐', '🌙', '⭐', '🌙'],
      options: ['⭐', '🌙', '☀️'],
      correctAnswer: '⭐',
      explanation: 'Golden Star alternates with Silver Crescent Moon!'
    }
  ],
  Moderate: [
    {
      difficulty: 'Moderate',
      sequence: ['🌸', '🌿', '☕', '🌸', '🌿'],
      options: ['☕', '🌸', '⭐'],
      correctAnswer: '☕',
      explanation: 'Lotus, Leaf, and Tea Cup follow in a steady three-part rhythm!'
    },
    {
      difficulty: 'Moderate',
      sequence: ['🟡', '🟢', '🔵', '🟡', '🟢'],
      options: ['🔵', '🟡', '🔺'],
      correctAnswer: '🔵',
      explanation: 'Yellow, Green, and Blue flow in a calm tri-color sequence!'
    },
    {
      difficulty: 'Moderate',
      sequence: ['⭐', '⭐', '🌙', '⭐', '⭐'],
      options: ['🌙', '⭐', '☀️'],
      correctAnswer: '🌙',
      explanation: 'Two Stars are followed by one Crescent Moon!'
    }
  ],
  Stimulating: [
    {
      difficulty: 'Stimulating',
      sequence: ['🔴', '🔷', '🔶', '🟢', '🔴', '🔷'],
      options: ['🔶', '🟢', '🔴', '⭐'],
      correctAnswer: '🔶',
      explanation: 'Four colorful symbols progress in smooth circular harmony!'
    },
    {
      difficulty: 'Stimulating',
      sequence: ['🌸', '🌸', '🌿', '🌿', '☕', '☕', '🌸', '🌸'],
      options: ['🌿', '☕', '🌸', '⭐'],
      correctAnswer: '🌿',
      explanation: 'Each symbol repeats twice before gently passing to the next!'
    }
  ]
};

const PATTERN_EXPLANATION_I18N: Record<string, Record<string, string>> = {
  'The pattern alternates between Blue Circle and Red Triangle!': {
    hi: 'यह क्रम नीले गोले और लाल त्रिकोण के बीच बारी-बारी से चलता है!',
    mr: 'हा क्रम निळ्या वर्तुळाचा आणि लाल त्रिकोणाचा आलटून-पालटून आहे!',
    bn: 'এই ধারাটি নীল বৃত্ত এবং লাল ত্রিভুজের মধ্যে পালাক্রমে চলছে!',
    ta: 'நீல வட்டமும் சிவப்பு முக்கோணமும் மாறி மாறி வருகின்றன!',
    te: 'ఈ నమూనా నీలి వృత్తం మరియు ఎరుపు త్రిభుజం మధ్య మారుతూ వస్తుంది!',
    kn: 'ಈ ವಿನ್ಯಾಸವು ನೀಲಿ ವೃತ್ತ ಮತ್ತು ಕೆಂಪು ತ್ರಿಕೋನದ ನಡುವೆ ಪರ್ಯಾಯವಾಗಿ ಬರುತ್ತದೆ!',
  },
  'Lotus flower alternates with Jasmine leaf!': {
    hi: 'कमल के फूल के बाद चमेली का पत्ता बारी-बारी से आता है!',
    mr: 'कमळाच्या फुलांनंतर जाईचे पान आलटून-पालटून येत आहे!',
    bn: 'পদ্ম ফুল এবং বেলি পাতা পালাক্রমে আসছে!',
    ta: 'தாமரை மலரும் மல்லிகை இலையும் மாறி மாறி வருகின்றன!',
    te: 'తామర పువ్వు మరియు మల్లె ఆకు ఒకదాని తర్వాత ఒకటి వస్తున్నాయి!',
    kn: 'ಕಮಲದ ಹೂವು ಮತ್ತು ಮಲ್ಲಿಗೆ ಎಲೆ ಒಂದರ ನಂತರ ಒಂದರಂತೆ ಬರುತ್ತಿವೆ!',
  },
  'Golden Star alternates with Silver Crescent Moon!': {
    hi: 'सुनहरे तारे के बाद चाँदी जैसा अर्धचंद्र बारी-बारी से आता है!',
    mr: 'सोनेरी तारा आणि चंद्रकोर आलटून-पालटून येत आहेत!',
    bn: 'সোনালি তারা ও রুপালি চাঁদ পালাক্রমে আসছে!',
    ta: 'பொன் நட்சத்திரமும் வெள்ளி நிலவும் மாறி மாறி வருகின்றன!',
    te: 'బంగారు నక్షత్రం మరియు వెండి చంద్రవంక మారుతూ వస్తున్నాయి!',
    kn: 'ಚಿನ್ನದ ನಕ್ಷತ್ರ ಮತ್ತು ಬೆಳ್ಳಿ ಚಂದ್ರ ಪರ್ಯಾಯವಾಗಿ ಬರುತ್ತಿವೆ!',
  },
  'Lotus, Leaf, and Tea Cup follow in a steady three-part rhythm!': {
    hi: 'कमल, पत्ता और चाय का कप तीन चरणों की शांत लय में चल रहे हैं!',
    mr: 'कमळ, पान आणि चहाचा कप या तीन भागांच्या लयीत येत आहेत!',
    bn: 'পদ্ম, পাতা ও চায়ের কাপ তিনটি করে ছন্দে এগোচ্ছে!',
    ta: 'தாமரை, இலை மற்றும் தேநீர் கோப்பை என மூன்றின் வரிசையில் வருகிறது!',
    te: 'తామర, ఆకు మరియు టీ కప్పు మూడు దశల లయలో వస్తున్నాయి!',
    kn: 'ಕಮಲ, ಎಲೆ ಮತ್ತು ಚಹಾದ ಕಪ್ ಮೂರು ಹಂತಗಳ ಲಯದಲ್ಲಿ ಬರುತ್ತಿವೆ!',
  },
  'Yellow, Green, and Blue flow in a calm tri-color sequence!': {
    hi: 'पीला, हरा और नीला रंग एक शांत तीन-रंगी क्रम में आ रहे हैं!',
    mr: 'पिवळा, हिरवा आणि निळा हे तीन रंग शांत क्रमाने येत आहेत!',
    bn: 'হলুদ, সবুজ ও নীল—এই তিন রঙের ধারায় এগোচ্ছে!',
    ta: 'மஞ்சள், பச்சை மற்றும் நீலம் ஆகிய மூன்று நிறங்கள் வரிசையாக வருகின்றன!',
    te: 'పసుపు, ఆకుపచ్చ మరియు నీలం మూడు రంగుల క్రమంలో వస్తున్నాయి!',
    kn: 'ಹಳದಿ, ಹಸಿರು ಮತ್ತು ನೀಲಿ ಬಣ್ಣಗಳು ಮೂರು ಬಣ್ಣಗಳ ಕ್ರಮದಲ್ಲಿ ಬರುತ್ತಿವೆ!',
  },
  'Two Stars are followed by one Crescent Moon!': {
    hi: 'दो तारों के बाद एक अर्धचंद्र आता है!',
    mr: 'दोन ताऱ्यांनंतर एक चंद्रकोर येते!',
    bn: 'দুটি তারার পর একটি চাঁদ আসছে!',
    ta: 'இரண்டு நட்சத்திரங்களைத் தொடர்ந்து ஒரு நிலா வருகிறது!',
    te: 'రెండు నక్షత్రాల తర్వాత ఒక చంద్రవంక వస్తుంది!',
    kn: 'ಎರಡು ನಕ್ಷತ್ರಗಳ ನಂತರ ಒಂದು ಚಂದ್ರ ಬರುತ್ತದೆ!',
  },
  'Four colorful symbols progress in smooth circular harmony!': {
    hi: 'चार रंगीन चिह्न एक समान गोल चक्र में आगे बढ़ रहे हैं!',
    mr: 'चार रंगीत चिन्हे एका गोलाकार लयीत पुढे सरकत आहेत!',
    bn: 'চারটি রঙিন চিহ্ন একটি সুন্দর বৃত্তাকার ছন্দে এগোচ্ছে!',
    ta: 'நான்கு வண்ணக் குறியீடுகள் சீரான வட்ட வரிசையில் வருகின்றன!',
    te: 'నాలుగు రంగుల గుర్తులు సులభమైన వృత్తాకార క్రమంలో వస్తున్నాయి!',
    kn: 'ನಾಲ್ಕು ಬಣ್ಣದ ಚಿಹ್ನೆಗಳು ನಿಯಮಿತ ವೃತ್ತಾಕಾರದ ಕ್ರಮದಲ್ಲಿ ಮುಂದುವರಿಯುತ್ತಿವೆ!',
  },
  'Each symbol repeats twice before gently passing to the next!': {
    hi: 'अगले चिह्न पर जाने से पहले हर चिह्न दो बार आता है!',
    mr: 'पुढील चिन्हाकडे जाण्यापूर्वी प्रत्येक चिन्ह दोनदा येते!',
    bn: 'পরবর্তী চিহ্নে যাওয়ার আগে প্রতিটি চিহ্ন দুবার করে আসছে!',
    ta: 'அடுத்ததற்குச் செல்லும் முன் ஒவ்வொரு குறியீடும் இரண்டு முறை வருகிறது!',
    te: 'తదుపరి గుర్తుకు వెళ్లే ముందు ప్రతి గుర్తు రెండుసార్లు వస్తుంది!',
    kn: 'ಮುಂದಿನದಕ್ಕೆ ಹೋಗುವ ಮೊದಲು ಪ್ರತಿಯೊಂದು ಚಿಹ್ನೆಯೂ ಎರಡು ಬಾರಿ ಬರುತ್ತದೆ!',
  },
};

export const PatternMatchGame: React.FC<PatternMatchGameProps> = ({
  difficulty,
  adaptiveParams,
  onComplete
}) => {
  const { t, language } = useLanguage();
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const mistakesRef = useRef(0);
  const hintsRef = useRef(0);
  const startRef = useRef(Date.now());

  const patternsForDifficulty = ADAPTIVE_PATTERN_SETS[difficulty] || ADAPTIVE_PATTERN_SETS.Gentle;
  const pattern = patternsForDifficulty[currentPatternIndex % patternsForDifficulty.length];
  const localizedExplanation =
    PATTERN_EXPLANATION_I18N[pattern.explanation]?.[language] || pattern.explanation;

  const patternUi = (
    {
      hi: {
        won: (exp: string) => `अद्भुत! ${exp} 🌸`,
        retry: 'चिह्नों की लय देखें! आखिरी चिह्न के ठीक बाद क्या आया था, वह चुनें।',
        badge: (diff: string, len: number) => `अनुकूल लय • ${diff} (${len}-चरण क्रम)`,
        optionAria: (idx: number, opt: string) => `विकल्प ${idx + 1}: ${opt}`,
      },
      mr: {
        won: (exp: string) => `खूप सुंदर! ${exp} 🌸`,
        retry: 'आकृत्यांची लय पहा! शेवटच्या चिन्हाच्या पुढे काय येते ते ओळखा.',
        badge: (diff: string, len: number) => `सुलभ लय • ${diff} (${len}-पायऱ्यांचा क्रम)`,
        optionAria: (idx: number, opt: string) => `पर्याय ${idx + 1}: ${opt}`,
      },
      bn: {
        won: (exp: string) => `চমৎকার! ${exp} 🌸`,
        retry: 'চিহ্নগুলোর ছন্দ লক্ষ করুন! শেষ চিহ্নের পর কী এসেছিল দেখুন।',
        badge: (diff: string, len: number) => `সহজ ছন্দ • ${diff} (${len}-ধাপের ধারা)`,
        optionAria: (idx: number, opt: string) => `বিকল্প ${idx + 1}: ${opt}`,
      },
      ta: {
        won: (exp: string) => `அருமை! ${exp} 🌸`,
        retry: 'குறியீடுகளின் வரிசையை கவனியுங்கள்! கடைசி குறியீட்டிற்கு அடுத்து என்ன வரும் எனப் பாருங்கள்.',
        badge: (diff: string, len: number) => `எளிய தாளம் • ${diff} (${len}-படி வரிசை)`,
        optionAria: (idx: number, opt: string) => `விருப்பம் ${idx + 1}: ${opt}`,
      },
      te: {
        won: (exp: string) => `అద్భుతం! ${exp} 🌸`,
        retry: 'గుర్తుల లయను గమనించండి! చివరి గుర్తు తర్వాత ఏమి వస్తుందో చూడండి.',
        badge: (diff: string, len: number) => `అనుకూల లయ • ${diff} (${len}-దశల క్రమం)`,
        optionAria: (idx: number, opt: string) => `ఎంపిక ${idx + 1}: ${opt}`,
      },
      kn: {
        won: (exp: string) => `ಅದ್ಭುತ! ${exp} 🌸`,
        retry: 'ಚಿಹ್ನೆಗಳ ಲಯವನ್ನು ಗಮನಿಸಿ! ಕೊನೆಯ ಚಿಹ್ನೆಯ ನಂತರ ಯಾವುದು ಬರುತ್ತದೆ ಎಂದು ನೋಡಿ.',
        badge: (diff: string, len: number) => `ಅನುಕೂಲ ಲಯ • ${diff} (${len}-ಹಂತದ ಕ್ರಮ)`,
        optionAria: (idx: number, opt: string) => `ಆಯ್ಕೆ ${idx + 1}: ${opt}`,
      },
    } as Record<string, any>
  )[language] || {
    won: (exp: string) => `Wonderful! ${exp} 🌸`,
    retry: t('games.pattern_notice_rhythm') || 'Notice the rhythm of the shapes! Look at what came right after the last symbol.',
    badge: (diff: string, len: number) => `Adaptive Rhythm • ${diff} (${len}-step sequence)`,
    optionAria: (idx: number, opt: string) => `Option ${idx + 1}: ${opt}`,
  };
  const localizedDiff = t(`games.difficulty_${difficulty.toLowerCase()}` as any) || difficulty;

  useEffect(() => {
    setCurrentPatternIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setFeedback(null);
    mistakesRef.current = 0;
    hintsRef.current = 0;
    startRef.current = Date.now();
  }, [difficulty, adaptiveParams?.tier]);

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    if (option === pattern.correctAnswer) {
      setIsAnswered(true);
      setFeedback(patternUi.won(localizedExplanation));
      const metrics = buildGameRunMetrics({
        correctAnswers: 1,
        incorrectAnswers: mistakesRef.current,
        hintsUsed: hintsRef.current,
        reactionTimesMs: [Date.now() - startRef.current],
        completionStatus: 'completed',
      });
      setTimeout(() => onComplete(metrics), 1400);
    } else {
      mistakesRef.current += 1;
      setFeedback(patternUi.retry);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-6">
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between gap-2 flex-wrap text-xs text-purple-900 font-semibold">
        <span className="flex items-center space-x-1.5">
          <Shapes className="w-4 h-4 text-purple-600" />
          <span>{t('games.pattern_sequence') || 'Pattern Recognition Sequence'}</span>
        </span>
        <span className="text-gray-500 font-medium">
          {patternUi.badge(localizedDiff, pattern.sequence.length)}
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start space-x-2 animate-fadeIn ${
            isAnswered
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
              : 'bg-lavender-50 border-purple-200 text-purple-900'
          }`}
        >
          {isAnswered ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <HelpCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedback}</span>
        </div>
      )}

      {/* Pattern Row */}
      <div className="bg-lavender-50/70 p-6 rounded-3xl border border-purple-200 text-center space-y-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {t('games.pattern_observed') || 'Observed Pattern'}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {pattern.sequence.map((symbol, idx) => (
            <div
              key={idx}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-purple-200 shadow-xs flex items-center justify-center text-2xl"
            >
              {symbol}
            </div>
          ))}

          {/* Missing slot with question mark */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-600 text-white shadow-md flex items-center justify-center text-xl font-bold animate-pulse">
            ?
          </div>
        </div>

        <p className="text-xs text-gray-600 font-medium">
          {t('games.pattern_choose_next') || 'Choose the symbol that comes next:'}
        </p>
      </div>

      {/* Options Row */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {pattern.options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectOption(opt)}
            disabled={isAnswered}
            className={`p-4 rounded-2xl border text-center transition transform active:scale-95 flex flex-col items-center justify-center space-y-1 ${
              selectedOption === opt
                ? opt === pattern.correctAnswer
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-2 ring-emerald-200 shadow-md'
                  : 'bg-rose-100 border-rose-300 text-rose-950'
                : 'bg-white hover:bg-lavender-50 border-purple-200 shadow-2xs hover:shadow-xs'
            }`}
            aria-label={patternUi.optionAria(idx, opt)}
          >
            <span className="text-3xl">{opt}</span>
            <span className="text-[10px] font-bold text-purple-800">{t('games.pattern_choice', { num: String(idx + 1) }) || `Choice ${idx + 1}`}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
