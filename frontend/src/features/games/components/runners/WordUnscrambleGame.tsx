import React, { useState, useEffect, useRef } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GamePacing, GameRunMetrics } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { SpeechService } from '../../../../services/speechService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { BookOpen, HelpCircle, Eye, RotateCcw } from 'lucide-react';

interface WordUnscrambleGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
  onRequestHint?: () => void;
}

interface WordPuzzle {
  word: string;
  hint: string;
  meaning: string;
}

const ADAPTIVE_WORD_PUZZLES: Record<GameDifficulty, WordPuzzle[]> = {
  Gentle: [
    { word: 'CALM', hint: 'Feeling quiet, peaceful, and still inside', meaning: 'Restful tranquility' },
    { word: 'HOPE', hint: 'A bright, cheerful feeling for tomorrow', meaning: 'Looking forward with warmth' },
    { word: 'WARM', hint: 'Comforting like morning sunshine or hot tea', meaning: 'Gentle pleasant heat' },
    { word: 'CARE', hint: 'Kindness, attention, and love for yourself and family', meaning: 'Nourishing kindness' },
  ],
  Moderate: [
    { word: 'SMILE', hint: 'A warm and cheerful expression on your face', meaning: 'Brings joy to everyone around' },
    { word: 'PEACE', hint: 'Quiet tranquility and calm in your heart', meaning: 'Restful stillness' },
    { word: 'BLOOM', hint: 'What a flower does in the warm morning sunshine', meaning: 'Opening fresh and cheerful' },
    { word: 'WATER', hint: 'Fresh, clear hydration for the body', meaning: 'Pure refreshing nourishment' },
  ],
  Stimulating: [
    { word: 'HEALTH', hint: 'Feeling strong, peaceful, and well in body and mind', meaning: 'Your greatest natural treasure' },
    { word: 'HARMONY', hint: 'Living in peace, kindness, and balance', meaning: 'A calm and balanced state' },
    { word: 'GARDEN', hint: 'A peaceful outdoor space with blooming flowers', meaning: 'Nature surrounding your home' },
    { word: 'NATURE', hint: 'The beauty of green trees, rivers, and skies', meaning: 'Earth’s peaceful creation' },
  ]
};

export const WordUnscrambleGame: React.FC<WordUnscrambleGameProps> = ({
  difficulty,
  adaptiveParams,
  onComplete,
  onRequestHint,
}) => {
  const { t, language } = useLanguage();
  const preferences = useOptionalAccessibility()?.preferences;
  const resolvedGameplay = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);
  const includeDecoyTile =
    (difficulty === 'Stimulating' || resolvedGameplay.mechanics.distractorSimilarity === 'similar') &&
    resolvedGameplay.distractorCap > 0;
  const highlightFirstAnchorTile = resolvedGameplay.mechanics.showFirstAnchor;

  const mistakesRef = useRef(0);
  const hintsRef = useRef(0);
  const startRef = useRef(Date.now());
  const unscrambleUi = (
    {
      en: {
        tapPrompt: 'Tap the letters in the correct order to spell the word!',
        unscrambleWord: (n: number) => `Unscramble this ${n}-letter word:`,
        won: (w: string) => `✨ Beautiful! The word is "${w}"!`,
        almost: "Almost! Let's rethink. Tap a letter to remove it, or use a hint.",
        reveal: (w: string, m: string) => `The comforting word is: "${w}" - ${m} 🌿`,
        lettersBadge: (n: number) => `${n} Letters`,
        meaningPrefix: 'Meaning:',
        anchor: (c: string) => `🌱 First Letter Anchor: Starts with "${c}"`,
        tapBelow: 'Tap letters below in order:',
        tileAria: (c: string) => `Letter tile ${c}`,
      },
      hi: {
        tapPrompt: 'शब्द बनाने के लिए सही क्रम में अक्षरों पर टैप करें!',
        unscrambleWord: (n: number) => `${n} अक्षरों वाले इस शब्द को सुलझाएं:`,
        won: (w: string) => `✨ बहुत सुंदर! शब्द है "${w}"!`,
        almost: 'लगभग सही! किसी अक्षर को हटाने के लिए टैप करें या संकेत लें।',
        reveal: (w: string, m: string) => `यह सुखद शब्द है: "${w}" - ${m} 🌿`,
        lettersBadge: (n: number) => `${n} अक्षर`,
        meaningPrefix: 'अर्थ:',
        anchor: (c: string) => `🌱 पहला अक्षर संकेत: "${c}" से शुरू`,
        tapBelow: 'नीचे दिए अक्षरों को क्रम से चुनें:',
        tileAria: (c: string) => `अक्षर टाइल ${c}`,
      },
      mr: {
        tapPrompt: 'शब्द तयार करण्यासाठी योग्य क्रमाने अक्षरांवर टॅप करा!',
        unscrambleWord: (n: number) => `हा ${n} अक्षरांचा शब्द जुळवा:`,
        won: (w: string) => `✨ खूप छान! शब्द आहे "${w}"!`,
        almost: 'जवळपास पोहोचलात! अक्षर काढण्यासाठी टॅप करा किंवा मदत घ्या.',
        reveal: (w: string, m: string) => `शब्द आहे: "${w}" - ${m} 🌿`,
        lettersBadge: (n: number) => `${n} अक्षरे`,
        meaningPrefix: 'अर्थ:',
        anchor: (c: string) => `🌱 पहिले अक्षर संकेत: "${c}" ने सुरू`,
        tapBelow: 'खालील अक्षरे क्रमाने दाबा:',
        tileAria: (c: string) => `अक्षर ${c}`,
      },
      bn: {
        tapPrompt: 'শব্দটি তৈরি করতে সঠিক ক্রমে অক্ষরগুলোতে ট্যাপ করুন!',
        unscrambleWord: (n: number) => `${n} অক্ষরের এই শব্দটি সাজান:`,
        won: (w: string) => `✨ চমৎকার! শব্দটি হলো "${w}"!`,
        almost: 'প্রায় হয়েছে! সরাতে অক্ষরে ট্যাপ করুন বা ইঙ্গিত নিন।',
        reveal: (w: string, m: string) => `শব্দটি হলো: "${w}" - ${m} 🌿`,
        lettersBadge: (n: number) => `${n} অক্ষর`,
        meaningPrefix: 'অর্থ:',
        anchor: (c: string) => `🌱 প্রথম অক্ষরের ইঙ্গিত: "${c}" দিয়ে শুরু`,
        tapBelow: 'নিচের অক্ষরগুলো ক্রমানুসারে চাপুন:',
        tileAria: (c: string) => `অক্ষর ${c}`,
      },
      ta: {
        tapPrompt: 'சொல்லை உருவாக்க எழுத்துக்களை சரியான வரிசையில் தட்டவும்!',
        unscrambleWord: (n: number) => `இந்த ${n} எழுத்துச் சொல்லை வரிசைப்படுத்தவும்:`,
        won: (w: string) => `✨ அருமை! அந்தச் சொல் "${w}"!`,
        almost: 'நெருங்கிவிட்டீர்கள்! நீக்க தட்டவும் அல்லது குறிப்பைப் பார்க்கவும்.',
        reveal: (w: string, m: string) => `சொல்: "${w}" - ${m} 🌿`,
        lettersBadge: (n: number) => `${n} எழுத்துக்கள்`,
        meaningPrefix: 'பொருள்:',
        anchor: (c: string) => `🌱 முதல் எழுத்து: "${c}" இல் தொடங்கும்`,
        tapBelow: 'கீழே உள்ள எழுத்துக்களை வரிசையாகத் தட்டவும்:',
        tileAria: (c: string) => `எழுத்து ${c}`,
      },
      te: {
        tapPrompt: 'పదం తయారు చేయడానికి అక్షరాలను సరైన క్రమంలో నొక్కండి!',
        unscrambleWord: (n: number) => `ఈ ${n} అక్షరాల పదాన్ని సరిచేయండి:`,
        won: (w: string) => `✨ అద్భుతం! పదం "${w}"!`,
        almost: 'దాదాపు అయింది! తొలగించడానికి నొక్కండి లేదా సూచన తీసుకోండి.',
        reveal: (w: string, m: string) => `పదం: "${w}" - ${m} 🌿`,
        lettersBadge: (n: number) => `${n} అక్షరాలు`,
        meaningPrefix: 'అర్థం:',
        anchor: (c: string) => `🌱 మొదటి అక్షరం: "${c}" తో మొదలవుతుంది`,
        tapBelow: 'కింది అక్షరాలను వరుసగా నొక్కండి:',
        tileAria: (c: string) => `అక్షరం ${c}`,
      },
      kn: {
        tapPrompt: 'ಪದವನ್ನು ರಚಿಸಲು ಅಕ್ಷರಗಳನ್ನು ಸರಿಯಾದ ಕ್ರಮದಲ್ಲಿ ಒತ್ತಿರಿ!',
        unscrambleWord: (n: number) => `ಈ ${n} ಅಕ್ಷರಗಳ ಪದವನ್ನು ಸರಿಪಡಿಸಿ:`,
        won: (w: string) => `✨ ಅದ್ಭುತ! ಪದ "${w}"!`,
        almost: 'ಬಹುತೇಕ ಸರಿ! ತೆಗೆಯಲು ಒತ್ತಿರಿ ಅಥವಾ ಸುಳಿವು ಪಡೆಯಿರಿ.',
        reveal: (w: string, m: string) => `ಪದ: "${w}" - ${m} 🌿`,
        lettersBadge: (n: number) => `${n} ಅಕ್ಷರಗಳು`,
        meaningPrefix: 'ಅರ್ಥ:',
        anchor: (c: string) => `🌱 ಮೊದಲ ಅಕ್ಷರ ಸುಳಿವು: "${c}" ನಿಂದ ಪ್ರಾರಂಭ`,
        tapBelow: 'ಕೆಳಗಿನ ಅಕ್ಷರಗಳನ್ನು ಕ್ರಮವಾಗಿ ಒತ್ತಿರಿ:',
        tileAria: (c: string) => `ಅಕ್ಷರ ${c}`,
      },
    } as Record<string, any>
  )[language] || {
    tapPrompt: 'Tap the letters in the correct order to spell the word!',
    unscrambleWord: (n: number) => `Unscramble this ${n}-letter word:`,
    won: (w: string) => `✨ Beautiful! The word is "${w}"!`,
    almost: "Almost! Let's rethink. Tap a letter to remove it, or use a hint.",
    reveal: (w: string, m: string) => `The comforting word is: "${w}" - ${m} 🌿`,
    lettersBadge: (n: number) => `${n} Letters`,
    meaningPrefix: 'Meaning:',
    anchor: (c: string) => `🌱 First Letter Anchor: Starts with "${c}"`,
    tapBelow: 'Tap letters below in order:',
    tileAria: (c: string) => `Letter tile ${c}`,
  };

  const WORD_TEXTS: Record<string, Record<string, { meaning: string; hint: string }>> = {
    CALM: {
      hi: { meaning: 'मन की शांति और सुकून', hint: 'भीतर से शांत और स्थिर महसूस करना' },
      mr: { meaning: 'मनाची शांतता आणि समाधान', hint: 'आतून शांत आणि स्थिर वाटणे' },
      bn: { meaning: 'মনের শান্তি ও প্রশান্তি', hint: 'ভেতর থেকে শান্ত ও স্থির অনুভব করা' },
      ta: { meaning: 'மன அமைதியும் நிம்மதியும்', hint: 'உள்ளத்தில் அமைதியாக உணர்தல்' },
      te: { meaning: 'మనసు ప్రశాంతత మరియు విశ్రాంతి', hint: 'లోపల ప్రశాంతంగా మరియు స్థిరంగా ఉండటం' },
      kn: { meaning: 'ಮನಸ್ಸಿನ ಶಾಂತಿ ಮತ್ತು ನೆಮ್ಮದಿ', hint: 'ಒಳಗಿನಿಂದ ಶಾಂತವಾಗಿರುವ ಭಾವನೆ' },
    },
    HOPE: {
      hi: { meaning: 'उम्मीद के साथ आगे देखना', hint: 'आने वाले कल के लिए उज्ज्वल और प्रसन्न भाव' },
      mr: { meaning: 'आनंदाने उद्याची अपेक्षा करणे', hint: 'उद्याच्या दिवसासाठी सकारात्मक भाव' },
      bn: { meaning: 'উষ্ণ আশায় সামনের দিকে তাকানো', hint: 'আগামীকালের জন্য উজ্জ্বল অনুভূতি' },
      ta: { meaning: 'நாளைய நாளை நம்பிக்கையுடன் எதிர்பார்த்தல்', hint: 'மகிழ்ச்சியான எதிர்பார்ப்பு' },
      te: { meaning: 'రేపటిపై మంచి ఆశ', hint: 'భవిష్యత్తుపై ఉత్సాహభరితమైన భావన' },
      kn: { meaning: 'ನಾಳೆಯ ಬಗ್ಗೆ ಆಶಾಭಾವನೆ', hint: 'ಸಂತೋಷದ ನಿರೀಕ್ಷೆ' },
    },
    WARM: {
      hi: { meaning: 'सुखद गर्माहट', hint: 'सुबह की धूप या गर्म चाय जैसा सुकून' },
      mr: { meaning: 'हवीहवीशी ऊब', hint: 'सकाळच्या कोवळ्या उन्हासारखा किंवा गरम चहासारखा आराम' },
      bn: { meaning: 'স্নিগ্ধ উষ্ণতা', hint: 'সকালের রোদ বা গরম চায়ের মতো আরামদায়ক' },
      ta: { meaning: 'இதமான வெப்பம்', hint: 'காலை வெயில் அல்லது சூடான தேநீர் போன்ற இதம்' },
      te: { meaning: 'హాయినిచ్చే వెచ్చదనం', hint: 'ఉదయపు ఎండ లేదా వేడి టీ లాంటి సౌకర్యం' },
      kn: { meaning: 'ಹಿತವಾದ ಬೆಚ್ಚಗಿನ ಭಾವ', hint: 'ಬೆಳಗಿನ ಬಿಸಿಲು ಅಥವಾ ಬಿಸಿ ಚಹಾದಂತೆ ಆರಾಮ' },
    },
    CARE: {
      hi: { meaning: 'स्नेहपूर्ण देखभाल', hint: 'अपने और परिवार के प्रति दया और प्रेम' },
      mr: { meaning: 'प्रेमळ काळजी', hint: 'स्वतःवर आणि कुटुंबावर केलेले प्रेम व लक्ष' },
      bn: { meaning: 'স্নেহময় যত্ন', hint: 'নিজের ও পরিবারের প্রতি ভালোবাসা ও যত্ন' },
      ta: { meaning: 'அன்பான பராமரிப்பு', hint: 'உங்கள் மற்றும் குடும்பத்தின் மீதான அன்பு' },
      te: { meaning: 'ప్రేమతో కూడిన సంరక్షణ', hint: 'మీ పట్ల మరియు కుటుంబం పట్ల శ్రద్ధ' },
      kn: { meaning: 'ಪ್ರೀತಿಯ ಆರೈಕೆ', hint: 'ನಿಮ್ಮ ಮತ್ತು ಕುಟುಂಬದ ಮೇಲಿನ ಪ್ರೀತಿ ಹಾಗೂ ಕಾಳಜಿ' },
    },
    SMILE: {
      hi: { meaning: 'सबको खुश करने वाली मुस्कान', hint: 'चेहरे पर प्यारी और प्रसन्न मुस्कान' },
      mr: { meaning: 'सर्वांना आनंद देणारे हास्य', hint: 'चेहऱ्यावरचे गोड आणि प्रसन्न हास्य' },
      bn: { meaning: 'সবার মুখে হাসি ফোটায়', hint: 'মুখের উষ্ণ ও আনন্দময় হাসি' },
      ta: { meaning: 'அனைவருக்கும் மகிழ்ச்சி தரும் புன்னகை', hint: 'முகத்தில் மலரும் இனிமையான புன்னகை' },
      te: { meaning: 'అందరికీ ఆనందం ఇచ్చే చిరునవ్వు', hint: 'ముఖంలో ప్రశాంతమైన చిరునవ్వు' },
      kn: { meaning: 'ಎಲ್ಲರಿಗೂ ಸಂತೋಷ ತರುವ ನಗು', hint: 'ಮುಖದಲ್ಲಿನ ಸುಂದರ ಮಂದಹಾಸ' },
    },
    PEACE: {
      hi: { meaning: 'शांत स्थिरता', hint: 'दिल में शांति और सुकून' },
      mr: { meaning: 'निवांत शांतता', hint: 'मनाची खोल शांतता आणि स्थिरता' },
      bn: { meaning: 'প্রশান্ত নীরবতা', hint: 'হৃদয়ে শান্ত ও নিশ্চিন্ত অনুভূতি' },
      ta: { meaning: 'அமைதியான மனநிலை', hint: 'உள்ளத்தில் நிறைந்த அமைதி' },
      te: { meaning: 'నిశ్చలమైన ప్రశాంతత', hint: 'మనసులో హాయి మరియు శాంతి' },
      kn: { meaning: 'ಶಾಂತ ಸ್ಥಿರತೆ', hint: 'ಮನಸ್ಸಿನಲ್ಲಿನ ಶಾಂತಿ ಮತ್ತು ನೆಮ್ಮದಿ' },
    },
    BLOOM: {
      hi: { meaning: 'ताज़गी से खिल उठना', hint: 'सुबह की धूप में फूल का खिलना' },
      mr: { meaning: 'ताजेपणाने उमलणे', hint: 'सकाळच्या उन्हात फूल उमलणे' },
      bn: { meaning: 'সতেজ হয়ে ফুটে ওঠা', hint: 'সকালের রোদে ফুল ফোটা' },
      ta: { meaning: 'மலர்ந்து விரிதல்', hint: 'காலை வெயிலில் பூ மலர்வது போல' },
      te: { meaning: 'తాజాగా వికసించడం', hint: 'ఉదయపు ఎండలో పువ్వు వికసించడం' },
      kn: { meaning: 'ಹೂವಿನಂತೆ ಅರಳುವುದು', hint: 'ಬೆಳಗಿನ ಬಿಸಿಲಿನಲ್ಲಿ ಹೂ ಅರಳುವುದು' },
    },
    WATER: {
      hi: { meaning: 'शुद्ध ताज़गी भरा जल', hint: 'शरीर को तरोताजा करने वाला स्वच्छ पानी' },
      mr: { meaning: 'स्वच्छ व ताजे पाणी', hint: 'शरीराला ताजेतवाने ठेवणारे स्वच्छ पाणी' },
      bn: { meaning: 'বিশুদ্ধ সতেজ জল', hint: 'শরীরকে সতেজ রাখা পরিষ্কার জল' },
      ta: { meaning: 'தூய குளிர்ந்த நீர்', hint: 'உடலைப் புத்துணர்ச்சியாக்கும் சுத்தமான தண்ணீர்' },
      te: { meaning: 'స్వచ్ఛమైన మంచినీరు', hint: 'శరీరాన్ని తాజాగా ఉంచే నీరు' },
      kn: { meaning: 'ಶುದ್ಧವಾದ ಕುಡಿಯುವ ನೀರು', hint: 'ದೇಹವನ್ನು ತಾಜಾವಾಗಿರಿಸುವ ಶುದ್ಧ ನೀರು' },
    },
    HEALTH: {
      hi: { meaning: 'सबसे बड़ा खज़ाना — उत्तम स्वास्थ्य', hint: 'तन और मन से स्वस्थ महसूस करना' },
      mr: { meaning: 'उत्तम आरोग्य हाच खरा खजिना', hint: 'शरीर आणि मनाने निरोगी वाटणे' },
      bn: { meaning: 'সুস্থ শরীর ও প্রশান্ত মন', hint: 'শারীরিক ও মানসিকভাবে ভালো থাকা' },
      ta: { meaning: 'உடல் மற்றும் மன நலம்', hint: 'நலமாகவும் உறுதியாகவும் உணர்தல்' },
      te: { meaning: 'ఆరోగ్యమే మహాభాగ్యం', hint: 'శరీరం మరియు మనసు ఆరోగ్యంగా ఉండటం' },
      kn: { meaning: 'ದೇಹ ಮತ್ತು ಮನಸ್ಸಿನ ಉತ್ತಮ ಆರೋಗ್ಯ', hint: 'ಆರೋಗ್ಯಕರ ಹಾಗೂ ಶಾಂತ ಮನಸ್ಥಿತಿ' },
    },
    HARMONY: {
      hi: { meaning: 'शांत और संतुलित जीवन', hint: 'शांति, दया और संतुलन से रहना' },
      mr: { meaning: 'शांत व समतोल जीवन', hint: 'शांतता, प्रेम आणि समतोलाने जगणे' },
      bn: { meaning: 'শান্ত ও ভারসাম্যপূর্ণ অবস্থা', hint: 'শান্তি ও মমতার সাথে বসবাস' },
      ta: { meaning: 'அமைதியான இணக்கம்', hint: 'அன்பு மற்றும் அமைதியுடன் வாழ்தல்' },
      te: { meaning: 'శాంతియుత సమతుల్యత', hint: 'ప్రశాంతత మరియు దయతో జీవించడం' },
      kn: { meaning: 'ಶಾಂತ ಮತ್ತು ಸಮತೋಲಿತ ಸ್ಥಿತಿ', hint: 'ಶಾಂತಿ ಮತ್ತು ದಯೆಯಿಂದ ಬದುಕುವುದು' },
    },
    GARDEN: {
      hi: { meaning: 'घर के आसपास की हरियाली', hint: 'खिले फूलों वाला शांत बागीचा' },
      mr: { meaning: 'फुलांनी बहरलेली बाग', hint: 'फुले उमललेली शांत मोकळी जागा' },
      bn: { meaning: 'বাড়ির পাশের সবুজ বাগান', hint: 'ফুলে ভরা শান্ত খোলা বাগান' },
      ta: { meaning: 'பூக்கள் நிறைந்த தோட்டம்', hint: 'பூக்கள் மலரும் அமைதியான வெளி' },
      te: { meaning: 'పూల తోట', hint: 'పువ్వులు పూసే ప్రశాంతమైన ప్రదేశం' },
      kn: { meaning: 'ಹೂಗಳಿಂದ ಕೂಡಿದ ಉದ್ಯಾನ', hint: 'ಅರಳಿದ ಹೂವುಗಳಿರುವ ಶಾಂತ ತೋಟ' },
    },
    NATURE: {
      hi: { meaning: 'सुंदर प्रकृति', hint: 'हरे पेड़, नदियाँ और नीला आकाश' },
      mr: { meaning: 'निसर्गाचे सौंदर्य', hint: 'हिरवी झाडे, नद्या आणि निळे आकाश' },
      bn: { meaning: 'সবুজ প্রকৃতির সৌন্দর্য', hint: 'সবুজ গাছপালা, নদী ও আকাশ' },
      ta: { meaning: 'அழகிய இயற்கை', hint: 'பசுமையான மரங்கள், நதிகள் மற்றும் வானம்' },
      te: { meaning: 'అందమైన ప్రకృతి', hint: 'పచ్చని చెట్లు, నదులు మరియు ఆకాశం' },
      kn: { meaning: 'ಸುಂದರ ಪ್ರಕೃತಿ', hint: 'ಹಸಿರು ಮರಗಳು, ನದಿಗಳು ಮತ್ತು ಆಕಾಶ' },
    },
  };

  const [currentPuzzleIdx, setCurrentPuzzleIdx] = useState<number>(0);
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [placedIndices, setPlacedIndices] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string>(unscrambleUi.tapPrompt);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  const puzzles = ADAPTIVE_WORD_PUZZLES[difficulty] || ADAPTIVE_WORD_PUZZLES.Gentle;
  const activePuzzle = puzzles[currentPuzzleIdx % puzzles.length] || puzzles[0];
  const activeMeaning = WORD_TEXTS[activePuzzle.word]?.[language]?.meaning || activePuzzle.meaning;
  const activeHint = WORD_TEXTS[activePuzzle.word]?.[language]?.hint || activePuzzle.hint;

  const scramble = (str: string): string[] => {
    const arr = str.split('');
    if (includeDecoyTile) {
      const decoyPool = ['X', 'Q', 'Z', 'K', 'J'];
      const decoy = decoyPool.find((ch) => !arr.includes(ch)) || 'X';
      arr.push(decoy);
    }
    let shuffled = [...arr];
    for (let attempts = 0; attempts < 10; attempts++) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      if (shuffled.join('') !== str) break;
    }
    return shuffled;
  };

  const loadPuzzle = (idx: number) => {
    const puzzle = puzzles[idx % puzzles.length];
    setCurrentPuzzleIdx(idx % puzzles.length);
    setScrambledLetters(scramble(puzzle.word));
    setPlacedIndices([]);
    setIsRevealed(false);
    setFeedback(unscrambleUi.unscrambleWord(puzzle.word.length));
    mistakesRef.current = 0;
    hintsRef.current = 0;
    startRef.current = Date.now();
  };

  useEffect(() => {
    loadPuzzle(0);
  }, [difficulty, language, adaptiveParams?.tier]);

  const handleLetterTap = (scrambledIdx: number) => {
    if (placedIndices.includes(scrambledIdx)) {
      setPlacedIndices((prev) => prev.filter((i) => i !== scrambledIdx));
      audioSynthesizer.playTone(350, 0.1);
      return;
    }

    const nextIndices = [...placedIndices, scrambledIdx];
    setPlacedIndices(nextIndices);
    audioSynthesizer.playTone(450 + nextIndices.length * 40, 0.15);

    const formed = nextIndices.map((i) => scrambledLetters[i]).join('');
    if (formed.length === activePuzzle.word.length) {
      if (formed === activePuzzle.word) {
        audioSynthesizer.playChime('fanfare');
        setFeedback(unscrambleUi.won(activePuzzle.word));
        const metrics = buildGameRunMetrics({
          correctAnswers: 1,
          incorrectAnswers: mistakesRef.current,
          hintsUsed: hintsRef.current,
          reactionTimesMs: [Date.now() - startRef.current],
          completionStatus: 'completed',
          mechanicMode: resolvedGameplay.mode,
          appliedMechanics: resolvedGameplay.mechanics.appliedMechanicsSummary,
        });
        setTimeout(() => {
          onComplete(metrics);
        }, 1200);
      } else {
        mistakesRef.current += 1;
        audioSynthesizer.playChime('chime');
        setFeedback(unscrambleUi.almost);
      }
    }
  };

  const handleClear = () => {
    setPlacedIndices([]);
    setFeedback(unscrambleUi.unscrambleWord(activePuzzle.word.length));
  };

  const hintLead = (ch: string) =>
    language === 'hi'
      ? `अक्षर "${ch}" से शुरू होता है`
      : language === 'mr'
      ? `"${ch}" अक्षराने सुरू होते`
      : language === 'bn'
      ? `"${ch}" অক্ষর দিয়ে শুরু`
      : language === 'ta'
      ? `"${ch}" எழுத்தில் தொடங்கும்`
      : language === 'te'
      ? `"${ch}" అక్షరంతో ప్రారంభమవుతుంది`
      : language === 'kn'
      ? `"${ch}" ಅಕ್ಷರದಿಂದ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ`
      : `Starts with "${ch}"`;

  const handleHint = () => {
    hintsRef.current += 1;
    onRequestHint?.();
    audioSynthesizer.playTone(550, 0.2);
    const clueText = `${hintLead(activePuzzle.word[0])}. ${activeHint}`;
    setFeedback(language === 'en' ? `Gentle Clue: ${clueText}` : clueText);
    SpeechService.speak(clueText, undefined, undefined, SpeechService.getBCP47(language));
  };

  const handleReveal = () => {
    hintsRef.current += 1;
    onRequestHint?.();
    setIsRevealed(true);
    setFeedback(unscrambleUi.reveal(activePuzzle.word, activeMeaning));
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-5 text-center animate-fadeIn">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <BookOpen className="w-3.5 h-3.5 text-purple-600" />
          <span>{t('games_runner.unscramble_title')} • {t(`games.difficulty_${difficulty.toLowerCase()}` as any)} ({unscrambleUi.lettersBadge(activePuzzle.word.length)})</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {feedback}
        </h3>
        <p className="text-xs text-gray-600">
          {unscrambleUi.meaningPrefix} {activeMeaning}
        </p>

        {difficulty === 'Gentle' && (
          <p className="text-[11px] font-bold text-purple-700 bg-lavender-50 px-2.5 py-0.5 rounded-full inline-block border border-purple-200 mt-1">
            {unscrambleUi.anchor(activePuzzle.word[0])}
          </p>
        )}
        {includeDecoyTile && (
          <p
            data-testid="unscramble-decoy-notice"
            className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full inline-block border border-indigo-200 mt-1"
          >
            Extra Decoy Letter Active — watch carefully for 1 unused letter!
          </p>
        )}
      </div>

      {/* Answer Slots */}
      <div className="flex items-center justify-center gap-2 max-w-[340px] mx-auto p-3 bg-lavender-50/70 rounded-2xl border border-purple-100 min-h-[64px]">
        {Array.from({ length: activePuzzle.word.length }).map((_, idx) => {
          const letterPlaced = placedIndices[idx] !== undefined ? scrambledLetters[placedIndices[idx]] : '';
          return (
            <div
              key={idx}
              className={`w-12 h-14 rounded-2xl flex items-center justify-center text-xl font-black border-2 transition-all ${
                letterPlaced
                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs scale-105'
                  : 'bg-white border-purple-200 text-gray-300 border-dashed'
              }`}
            >
              {letterPlaced}
            </div>
          );
        })}
      </div>

      {/* Scrambled Letter Tiles */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500">{unscrambleUi.tapBelow}</p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-[340px] mx-auto">
          {scrambledLetters.map((char, idx) => {
            const isUsed = placedIndices.includes(idx);
            const isStarterAnchorTile =
              highlightFirstAnchorTile && placedIndices.length === 0 && char === activePuzzle.word[0];
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleLetterTap(idx)}
                className={`w-12 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold border transition-all cursor-pointer ${
                  isUsed
                    ? 'bg-gray-100 border-gray-200 text-gray-300 opacity-40 scale-95'
                    : isStarterAnchorTile
                    ? 'bg-amber-50 hover:bg-amber-100 border-amber-400 ring-2 ring-amber-300 text-amber-950 shadow-sm'
                    : 'bg-white hover:bg-lavender-50 border-purple-300 text-purple-900 shadow-2xs hover:shadow-xs active:scale-95'
                }`}
                aria-label={unscrambleUi.tileAria(char)}
              >
                {char}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-3.5 py-1.5 rounded-xl bg-lavender-50 hover:bg-lavender-100 text-purple-700 font-bold text-xs border border-purple-200 transition shadow-2xs flex items-center space-x-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('games_runner.unscramble_clear')}</span>
        </button>

        <button
          type="button"
          onClick={handleHint}
          className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 transition shadow-2xs flex items-center space-x-1"
        >
          <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
          <span>{t('games_runner.unscramble_clue')}</span>
        </button>

        {!isRevealed && (
          <button
            type="button"
            onClick={handleReveal}
            className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 transition shadow-2xs flex items-center space-x-1"
            aria-label={t('games_runner.unscramble_reveal')}
          >
            <Eye className="w-3.5 h-3.5 text-purple-600" />
            <span>{t('games_runner.unscramble_reveal')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
