import React, { useState, useEffect } from 'react';
import { GameDifficulty } from '../../../../types/index.js';
import { SpeechService } from '../../../../services/speechService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { BookOpen, Volume2, CheckCircle, HelpCircle } from 'lucide-react';

interface WordPuzzle {
  id: string;
  wordEn: string;
  wordHi: string;
  wordByLang: Record<string, string>;
  meaningByLang: Record<string, string>;
  displayLetters: string[];
  missingIndex: number;
  missingChar: string;
  options: string[];
  meaning: string;
  icon: string;
}

interface WordGardenGameProps {
  difficulty: GameDifficulty;
  onComplete: () => void;
}

const ADAPTIVE_WORD_PUZZLES: Record<GameDifficulty, WordPuzzle[]> = {
  Gentle: [
    {
      id: 'w-gentle-1',
      wordEn: 'GARDEN',
      wordHi: 'बगीचा',
      wordByLang: { en: 'GARDEN', hi: 'बगीचा', mr: 'बगीचा', bn: 'বাগান', ta: 'தோட்டம்', te: 'తోట', kn: 'ಉದ್ಯಾನ' },
      meaningByLang: {
        en: 'A peaceful place with green plants and blooming flowers',
        hi: 'हरे-भरे पौधों और खिले फूलों वाली शांत जगह',
        mr: 'हिरवीगार झाडे आणि फुललेल्या फुलांची शांत जागा',
        bn: 'সবুজ গাছ ও ফোটা ফুলের একটি শান্ত জায়গা',
        ta: 'பசுமையான செடிகளும் மலர்ந்த பூக்களும் நிறைந்த அமைதியான இடம்',
        te: 'పచ్చని మొక్కలు మరియు వికసించిన పూలతో ఉన్న ప్రశాంతమైన ప్రదేశం',
        kn: 'ಹಸಿರು ಸಸ್ಯಗಳು ಮತ್ತು ಅರಳಿದ ಹೂವುಗಳಿರುವ ಶಾಂತವಾದ ಸ್ಥಳ',
      },
      displayLetters: ['G', 'A', 'R', '_', 'E', 'N'],
      missingIndex: 3,
      missingChar: 'D',
      options: ['D', 'B', 'P'],
      meaning: 'A peaceful place with green plants and blooming flowers',
      icon: '🌸'
    },
    {
      id: 'w-gentle-2',
      wordEn: 'WATER',
      wordHi: 'पानी',
      wordByLang: { en: 'WATER', hi: 'पानी', mr: 'पाणी', bn: 'জল', ta: 'தண்ணீர்', te: 'నీరు', kn: 'ನೀರು' },
      meaningByLang: {
        en: 'Fresh, clear water to keep your body refreshed',
        hi: 'शरीर को तरोताजा रखने के लिए साफ और ताजा पानी',
        mr: 'शरीर ताजेतवाने ठेवण्यासाठी स्वच्छ आणि ताजे पाणी',
        bn: 'শরীরকে সতেজ রাখার জন্য পরিষ্কার ও বিশুদ্ধ জল',
        ta: 'உடலைப் புத்துணர்ச்சியாக வைத்திருக்க உதவும் சுத்தமான தண்ணீர்',
        te: 'శరీరాన్ని తాజాగా ఉంచే స్వచ్ఛమైన నీరు',
        kn: 'ದೇಹವನ್ನು ಉಲ್ಲಾಸವಾಗಿರಿಸಲು ಶುದ್ಧವಾದ ತಾಜಾ ನೀರು',
      },
      displayLetters: ['W', 'A', '_', 'E', 'R'],
      missingIndex: 2,
      missingChar: 'T',
      options: ['T', 'S', 'L'],
      meaning: 'Fresh, clear water to keep your body refreshed',
      icon: '💧'
    },
    {
      id: 'w-gentle-3',
      wordEn: 'MUSIC',
      wordHi: 'संगीत',
      wordByLang: { en: 'MUSIC', hi: 'संगीत', mr: 'संगीत', bn: 'সঙ্গীত', ta: 'இசை', te: 'సంగీతం', kn: 'ಸಂಗೀತ' },
      meaningByLang: {
        en: 'Soothing old songs and classical morning ragas',
        hi: 'मन को शांत करने वाले पुराने गीत और सुबह के राग',
        mr: 'मनाला शांत करणारी जुनी गाणी आणि सकाळचे राग',
        bn: 'মন শান্ত করা পুরনো গান ও সকালের সুরেলা রাগ',
        ta: 'மனதை அமைதிப்படுத்தும் இனிமையான பாடல்களும் காலை ராகங்களும்',
        te: 'మనసుకు ప్రశాంతతనిచ్చే పాటలు మరియు ఉదయపు రాగాలు',
        kn: 'ಮನಸ್ಸಿಗೆ ನೆಮ್ಮದಿ ನೀಡುವ ಹಳೆಯ ಹಾಡುಗಳು ಮತ್ತು ಬೆಳಗಿನ ರಾಗಗಳು',
      },
      displayLetters: ['M', 'U', '_', 'I', 'C'],
      missingIndex: 2,
      missingChar: 'S',
      options: ['S', 'N', 'R'],
      meaning: 'Soothing old songs and classical morning ragas',
      icon: '🎶'
    }
  ],
  Moderate: [
    {
      id: 'w-mod-1',
      wordEn: 'FLOWER',
      wordHi: 'फूल',
      wordByLang: { en: 'FLOWER', hi: 'फूल', mr: 'फूल', bn: 'ফুল', ta: 'பூ', te: 'పువ్వు', kn: 'ಹೂವು' },
      meaningByLang: {
        en: 'Fragrant natural petals brightening the room',
        hi: 'कमरे को महकाने वाली सुगंधित प्राकृतिक पंखुड़ियाँ',
        mr: 'खोली प्रसन्न करणाऱ्या सुगंधी नैसर्गिक पाकळ्या',
        bn: 'ঘর উজ্জ্বল করা সুগন্ধি প্রাকৃতিক ফুলের পাপড়ি',
        ta: 'அறையைப் பிரகாசமாக்கும் நறுமணமுள்ள இயற்கை மலர் இதழ்கள்',
        te: 'గదిని ప్రకాశవంతం చేసే సువాసన గల సహజ పూల రేకులు',
        kn: 'ಕೋಣೆಯನ್ನು ಬೆಳಗಿಸುವ ಸುಗಂಧಭರಿತ ನೈಸರ್ಗಿಕ ಹೂವಿನ ದಳಗಳು',
      },
      displayLetters: ['F', 'L', '_', 'W', 'E', 'R'],
      missingIndex: 2,
      missingChar: 'O',
      options: ['O', 'U', 'A', 'E'],
      meaning: 'Fragrant natural petals brightening the room',
      icon: '🌺'
    },
    {
      id: 'w-mod-2',
      wordEn: 'SUNSHINE',
      wordHi: 'धूप',
      wordByLang: { en: 'SUNSHINE', hi: 'धूप', mr: 'सूर्यप्रकाश', bn: 'রোদ', ta: 'வெயில்', te: 'ఎండ', kn: 'ಬಿಸಿಲು' },
      meaningByLang: {
        en: 'Gentle morning warmth pouring through the window',
        hi: 'खिड़की से अंदर आती सुबह की मीठी गुनगुनी धूप',
        mr: 'खिडकीतून आत येणारी सकाळची कोवळी ऊब',
        bn: 'জানলা দিয়ে আসা সকালের মিষ্টি রোদের উষ্ণতা',
        ta: 'ஜன்னல் வழியே வரும் இதமான காலை வெயில்',
        te: 'కిటికీలో నుండి వచ్చే ఉదయపు వెచ్చని ఎండ',
        kn: 'ಕಿಟಕಿಯಿಂದ ಒಳಗೆ ಬರುವ ಬೆಳಗಿನ ಹಿತವಾದ ಬಿಸಿಲು',
      },
      displayLetters: ['S', 'U', 'N', '_', 'H', 'I', 'N', 'E'],
      missingIndex: 3,
      missingChar: 'S',
      options: ['S', 'C', 'Z', 'T'],
      meaning: 'Gentle morning warmth pouring through the window',
      icon: '☀️'
    }
  ],
  Stimulating: [
    {
      id: 'w-stim-1',
      wordEn: 'COMFORT',
      wordHi: 'सुकून',
      wordByLang: { en: 'COMFORT', hi: 'सुकून', mr: 'निवांतपणा', bn: 'স্বস্তি', ta: 'ஆறுதல்', te: 'సౌకర్యం', kn: 'ನೆಮ್ಮದಿ' },
      meaningByLang: {
        en: 'A warm feeling of physical peace and emotional ease',
        hi: 'शारीरिक शांति और मानसिक सुकून का सुखद अहसास',
        mr: 'शारीरिक शांतता आणि मनाच्या समाधानाची सुखद भावना',
        bn: 'শারীরিক শান্তি ও মানসিক স্বস্তির এক উষ্ণ অনুভূতি',
        ta: 'உடல் அமைதியும் மன நிம்மதியும் தரும் இனிமையான உணர்வு',
        te: 'శారీరక శాంతి మరియు మానసిక హాయినిచ్చే భావన',
        kn: 'ದೈಹಿಕ ಶಾಂತಿ ಮತ್ತು ಮಾನಸಿಕ ನೆಮ್ಮದಿಯ ಹಿತವಾದ ಭಾವನೆ',
      },
      displayLetters: ['C', 'O', 'M', '_', 'O', 'R', 'T'],
      missingIndex: 3,
      missingChar: 'F',
      options: ['F', 'P', 'V', 'T'],
      meaning: 'A warm feeling of physical peace and emotional ease',
      icon: '🕊️'
    },
    {
      id: 'w-stim-2',
      wordEn: 'BLOSSOM',
      wordHi: 'बहार',
      wordByLang: { en: 'BLOSSOM', hi: 'बहार', mr: 'बहर', bn: 'প্রস্ফুটন', ta: 'மலர்ச்சி', te: 'వికాసం', kn: 'ಅರಳುವಿಕೆ' },
      meaningByLang: {
        en: 'When lovely flower buds open into full spring blooms',
        hi: 'जब सुंदर फूलों की कलियाँ पूरी तरह खिल उठती हैं',
        mr: 'जेव्हा सुंदर फुलांच्या कळ्या पूर्णपणे उमलतात',
        bn: 'যখন সুন্দর ফুলের কুঁড়িগুলো পুরোপুরি ফুটে ওঠে',
        ta: 'அழகிய பூ மொட்டுகள் முழுமையாக மலரும் நேரம்',
        te: 'అందమైన పూల మొగ్గలు పూర్తిగా వికసించే సమయం',
        kn: 'ಸುಂದರ ಹೂವಿನ ಮೊಗ್ಗುಗಳು ಪೂರ್ಣವಾಗಿ ಅರಳುವ ಸಮಯ',
      },
      displayLetters: ['B', 'L', 'O', '_', 'S', 'O', 'M'],
      missingIndex: 3,
      missingChar: 'S',
      options: ['S', 'Z', 'C', 'R'],
      meaning: 'When lovely flower buds open into full spring blooms',
      icon: '🌷'
    }
  ]
};

const WORD_GARDEN_UI: Record<
  string,
  {
    nativeTabFallback: string;
    choicesSuffix: string;
    wordCuePrefix: string;
    meaningLabel: string;
    greatWord: (w: string, nativeW: string) => string;
    goodTry: (m: string) => string;
    speakPhrase: (w: string, m: string) => string;
    letterAria: (c: string) => string;
  }
> = {
  en: {
    nativeTabFallback: 'हिंदी',
    choicesSuffix: 'Letter Choices',
    wordCuePrefix: 'Word Clue',
    meaningLabel: 'Word Meaning Clue:',
    greatWord: (w, n) => (w !== n ? `Beautiful! The word is "${w}" (${n})! 🌸` : `Beautiful! The word is "${w}"! 🌸`),
    goodTry: (m) => `Good try! Think of: "${m}".`,
    speakPhrase: (w, m) => `The word is ${w}. ${m}`,
    letterAria: (c) => `Letter ${c}`,
  },
  hi: {
    nativeTabFallback: 'हिंदी',
    choicesSuffix: 'अक्षर विकल्प',
    wordCuePrefix: 'शब्द संकेत',
    meaningLabel: 'शब्द अर्थ संकेत:',
    greatWord: (w, n) => `बहुत सुंदर! शब्द "${n}" (${w}) है! 🌸`,
    goodTry: (m) => `अच्छा प्रयास! इसके बारे में सोचें: "${m}"।`,
    speakPhrase: (w, m) => `यह शब्द है ${w}। ${m}`,
    letterAria: (c) => `अक्षर ${c}`,
  },
  mr: {
    nativeTabFallback: 'मराठी',
    choicesSuffix: 'अक्षर पर्याय',
    wordCuePrefix: 'शब्द संकेत',
    meaningLabel: 'शब्दाचा अर्थ संकेत:',
    greatWord: (w, n) => `खूप छान! शब्द "${n}" (${w}) आहे! 🌸`,
    goodTry: (m) => `छान प्रयत्न! विचार करा: "${m}".`,
    speakPhrase: (w, m) => `हा शब्द आहे ${w}. ${m}`,
    letterAria: (c) => `अक्षर ${c}`,
  },
  bn: {
    nativeTabFallback: 'বাংলা',
    choicesSuffix: 'অক্ষরের বিকল্প',
    wordCuePrefix: 'শব্দের ইঙ্গিত',
    meaningLabel: 'শব্দের অর্থের ইঙ্গিত:',
    greatWord: (w, n) => `চমৎকার! শব্দটি হলো "${n}" (${w})! 🌸`,
    goodTry: (m) => `ভালো চেষ্টা! ভাবুন: "${m}"।`,
    speakPhrase: (w, m) => `শব্দটি হলো ${w}। ${m}`,
    letterAria: (c) => `অক্ষর ${c}`,
  },
  ta: {
    nativeTabFallback: 'தமிழ்',
    choicesSuffix: 'எழுத்துத் தேர்வுகள்',
    wordCuePrefix: 'சொல் குறிப்பு',
    meaningLabel: 'சொல் பொருள் குறிப்பு:',
    greatWord: (w, n) => `அருமை! அந்தச் சொல் "${n}" (${w})! 🌸`,
    goodTry: (m) => `நல்ல முயற்சி! சிந்தியுங்கள்: "${m}".`,
    speakPhrase: (w, m) => `சொல் ${w}. ${m}`,
    letterAria: (c) => `எழுத்து ${c}`,
  },
  te: {
    nativeTabFallback: 'తెలుగు',
    choicesSuffix: 'అక్షర ఎంపికలు',
    wordCuePrefix: 'పద సూచన',
    meaningLabel: 'పద అర్థం సూచన:',
    greatWord: (w, n) => `అద్భుతం! ఆ పదం "${n}" (${w})! 🌸`,
    goodTry: (m) => `మంచి ప్రయత్నం! ఆలోచించండి: "${m}".`,
    speakPhrase: (w, m) => `ఆ పదం ${w}. ${m}`,
    letterAria: (c) => `అక్షరం ${c}`,
  },
  kn: {
    nativeTabFallback: 'ಕನ್ನಡ',
    choicesSuffix: 'ಅಕ್ಷರ ಆಯ್ಕೆಗಳು',
    wordCuePrefix: 'ಪದ ಸುಳಿವು',
    meaningLabel: 'ಪದದ ಅರ್ಥದ ಸುಳಿವು:',
    greatWord: (w, n) => `ಅದ್ಭುತ! ಆ ಪದ "${n}" (${w})! 🌸`,
    goodTry: (m) => `ಒಳ್ಳೆಯ ಪ್ರಯತ್ನ! ಯೋಚಿಸಿ: "${m}".`,
    speakPhrase: (w, m) => `ಆ ಪದ ${w}. ${m}`,
    letterAria: (c) => `ಅಕ್ಷರ ${c}`,
  },
};

export const WordGardenGame: React.FC<WordGardenGameProps> = ({
  difficulty,
  onComplete
}) => {
  const { t, language } = useLanguage();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [langMode, setLangMode] = useState<'en' | 'native'>(language === 'en' ? 'en' : 'native');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setLangMode(language === 'en' ? 'en' : 'native');
  }, [language]);

  const activeNativeLang = language === 'en' ? 'hi' : language;
  const activeUiLang = langMode === 'en' ? 'en' : activeNativeLang;
  const ui = WORD_GARDEN_UI[language] || WORD_GARDEN_UI.en;
  const activeUi = WORD_GARDEN_UI[activeUiLang] || WORD_GARDEN_UI.en;

  const puzzles = ADAPTIVE_WORD_PUZZLES[difficulty] || ADAPTIVE_WORD_PUZZLES.Gentle;
  const puzzle = puzzles[currentIdx % puzzles.length];
  const activeMeaning = puzzle.meaningByLang[activeUiLang] || puzzle.meaning;
  const activeNativeWord = puzzle.wordByLang[activeNativeLang] || puzzle.wordHi;
  const localizedDiff =
    t(`games.difficulty_${difficulty.toLowerCase()}`) !== `games.difficulty_${difficulty.toLowerCase()}`
      ? t(`games.difficulty_${difficulty.toLowerCase()}`)
      : difficulty;

  useEffect(() => {
    setCurrentIdx(0);
    setSelectedLetter(null);
    setIsAnswered(false);
    setFeedback(null);
  }, [difficulty]);

  const handleSelectLetter = (char: string) => {
    setSelectedLetter(char);
    if (char === puzzle.missingChar) {
      setIsAnswered(true);
      setFeedback(ui.greatWord(puzzle.wordEn, activeNativeWord));
      const wordToSpeak = langMode === 'en' ? puzzle.wordEn : activeNativeWord;
      SpeechService.speak(wordToSpeak, () => {}, () => {}, SpeechService.getBCP47(activeUiLang));
      setTimeout(onComplete, 1400);
    } else {
      setFeedback(ui.goodTry(puzzle.meaningByLang[language] || puzzle.meaning));
    }
  };

  const handleReadAloud = () => {
    const wordToSpeak = langMode === 'en' ? puzzle.wordEn : activeNativeWord;
    SpeechService.speak(
      activeUi.speakPhrase(wordToSpeak, activeMeaning),
      () => {},
      () => {},
      SpeechService.getBCP47(activeUiLang)
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-6">
      {/* Header and Language Selector */}
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between text-xs text-purple-900 font-semibold">
        <div className="flex items-center space-x-1.5">
          <BookOpen className="w-4 h-4 text-purple-600" />
          <span>{t('games_runner.word_garden_title')}</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold text-purple-700 bg-lavender-50 px-2 py-0.5 rounded-full border border-purple-200">
            {localizedDiff} ({puzzle.options.length} {ui.choicesSuffix})
          </span>

          <div className="flex items-center space-x-1 bg-lavender-100 p-0.5 rounded-xl border border-purple-200">
            <button
              type="button"
              onClick={() => setLangMode('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                langMode === 'en' ? 'bg-purple-600 text-white shadow-2xs' : 'text-purple-800 hover:bg-white'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLangMode('native')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                langMode === 'native' ? 'bg-purple-600 text-white shadow-2xs' : 'text-purple-800 hover:bg-white'
              }`}
            >
              {ui.nativeTabFallback}
            </button>
          </div>
        </div>
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

      {/* Target Word Display */}
      <div className="bg-lavender-50/70 p-6 rounded-3xl border border-purple-200 text-center space-y-4">
        <div className="text-3xl mx-auto">{puzzle.icon}</div>

        <div className="space-y-1">
          <div className="text-xs font-bold text-purple-800 tracking-wider">
            {langMode === 'native' ? `${activeUi.wordCuePrefix}: ${activeNativeWord}` : ui.meaningLabel}
          </div>
          <p className="text-xs sm:text-sm text-gray-700 font-medium max-w-md mx-auto">
            "{activeMeaning}"
          </p>
        </div>

        {/* Word Display with Missing Letter */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {puzzle.displayLetters.map((char, idx) => (
            <div
              key={idx}
              className={`w-11 h-12 sm:w-12 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black transition-all ${
                char === '_'
                  ? selectedLetter && isAnswered
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-purple-600 text-white shadow-md animate-pulse'
                  : 'bg-white text-saksham-darkText border border-purple-200 shadow-2xs'
              }`}
            >
              {char === '_' ? (isAnswered ? puzzle.missingChar : '?') : char}
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleReadAloud}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white border border-purple-200 text-purple-700 text-xs font-bold hover:bg-lavender-50 transition shadow-2xs"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{t('games_runner.word_read_aloud')}</span>
          </button>
        </div>
      </div>

      {/* Letter Options */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-gray-700 text-center">
          {t('games_runner.word_tap_letter')}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {puzzle.options.map((char, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectLetter(char)}
              disabled={isAnswered}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border text-xl sm:text-2xl font-extrabold transition transform active:scale-95 flex items-center justify-center ${
                selectedLetter === char
                  ? char === puzzle.missingChar
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-2 ring-emerald-200 shadow-md'
                    : 'bg-rose-100 border-rose-300 text-rose-950'
                  : 'bg-white hover:bg-lavender-50 border-purple-200 text-purple-950 shadow-xs hover:shadow-sm'
              }`}
              aria-label={ui.letterAria(char)}
            >
              {char}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
