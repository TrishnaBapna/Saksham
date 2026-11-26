import React, { useState } from 'react';
import {
  MemoryChallengeConfig,
  MemoryChallengeResult,
  MemoryChallengeType,
} from '../types/taskLifecycle.types.js';
import { TaskLifecycleService } from '../services/taskLifecycleService.js';
import {
  Sparkles,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { SpeechService } from '../../../services/speechService.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getSmallRoutineModalsUi } from '../utils/routineModalsTranslation.js';

interface MemoryChallengeCardProps {
  taskId: string;
  taskTitle?: string;
  config: MemoryChallengeConfig;
  patientId: string;
  language?: string;
  onChallengeComplete?: (result: MemoryChallengeResult) => void;
  onDecline?: () => void;
}

export const MemoryChallengeCard: React.FC<MemoryChallengeCardProps> = ({
  taskId,
  config,
  patientId,
  language: propLanguage,
  onChallengeComplete,
  onDecline,
}) => {
  const { t, language: ctxLanguage } = useLanguage();
  const language = propLanguage || ctxLanguage || 'en';
  const cardUi = getSmallRoutineModalsUi(language);
  const shortLang = (language || 'en').toLowerCase().split('-')[0];
  const [cueLevel, setCueLevel] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [hintsRequested, setHintsRequested] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isDeclined, setIsDeclined] = useState<boolean>(false);

  if (isDeclined) return null;

  const challengeType: MemoryChallengeType = config.challengeType || 'next_step';

  const getFallbackQuestion = (): string => {
    const item = config.groundedItemKey || 'item';
    if (challengeType === 'next_step') return t('routines.challenge_q_next');
    if (challengeType === 'location_recall') {
      const m: Record<string, string> = {
        en: `Where do you usually keep your ${item}?`,
        hi: `आप आमतौर पर अपना "${item}" कहाँ रखते हैं?`,
        mr: `तुम्ही तुमचे "${item}" सहसा कुठे ठेवता?`,
        bn: `আপনি সাধারণত আপনার "${item}" কোথায় রাখেন?`,
        ta: `நீங்கள் வழக்கமாக உங்கள் "${item}"-ஐ எங்கே வைப்பீர்கள்?`,
        te: `మీరు సాధారణంగా మీ "${item}" ఎక్కడ ఉంచుతారు?`,
        kn: `ನೀವು ಸಾಮಾನ್ಯವಾಗಿ ನಿಮ್ಮ "${item}" ಅನ್ನು ಎಲ್ಲಿ ಇಡುತ್ತೀರಿ?`,
      };
      return m[shortLang] || m.en;
    }
    if (challengeType === 'delayed_recall') {
      const m: Record<string, string> = {
        en: 'Can you remember which item we planned to use for this activity?',
        hi: 'क्या आपको याद है कि हमने इस गतिविधि के लिए कौन सी वस्तु तय की थी?',
        mr: 'या कृतीसाठी आपण कोणती वस्तू ठरवली होती ते तुम्हाला आठवते का?',
        bn: 'আপনার কি মনে আছে এই কাজের জন্য আমরা কোন জিনিসটি ব্যবহার করার কথা ভেবেছিলাম?',
        ta: 'இந்தச் செயலுக்கு எந்தப் பொருளைப் பயன்படுத்தத் திட்டமிட்டோம் என்பது நினைவிருக்கிறதா?',
        te: 'ఈ కార్యకలాపం కోసం మనం ఏ వస్తువు ఉపయోగించాలనుకున్నామో మీకు గుర్తుందా?',
        kn: 'ಈ ಚಟುವಟಿಕೆಗೆ ನಾವು ಯಾವ ವಸ್ತುವನ್ನು ಬಳಸಲು ಯೋಜಿಸಿದ್ದೇವೆಂದು ನೆನಪಿದೆಯೇ?',
      };
      return m[shortLang] || m.en;
    }
    return t('routines.challenge_q_next');
  };

  const defaultQuestion = config.promptQuestion || getFallbackQuestion();

  const getCueText = (level: 0 | 1 | 2 | 3 | 4): string => {
    const locHint = config.groundedLocationHint;
    const stepOpt = config.stepOptions && config.stepOptions.length > 0 ? config.stepOptions[0] : '';
    switch (level) {
      case 0:
        return cardUi.challengeQuietHint;
      case 1: {
        const m: Record<string, string> = locHint
          ? {
              en: '🌱 Orientation: Look around the room where you rest, such as near your bedside or desk.',
              hi: '🌱 दिशा संकेत: अपने विश्राम वाले कमरे में चारों ओर देखें, जैसे बिस्तर या मेज़ के पास।',
              mr: '🌱 दिशा खूण: तुम्ही जिथे आराम करता त्या खोलीत पलंगाजवळ किंवा टेबलाजवळ पाहा.',
              bn: '🌱 দিকনির্দেশ: আপনি যেখানে বিশ্রাম নেন সেই ঘরের বিছানা বা টেবিলের আশেপাশে তাকান।',
              ta: '🌱 திசை குறிப்பு: நீங்கள் ஓய்வெடுக்கும் அறையில் படுக்கை அல்லது மேசை அருகே சுற்றிப் பாருங்கள்.',
              te: '🌱 దిశా సూచన: మీరు విశ్రాంతి తీసుకునే గదిలో మంచం లేదా టేబుల్ దగ్గర చుట్టూ చూడండి.',
              kn: '🌱 ದಿಕ್ಕು ಸುಳಿವು: ನೀವು ವಿಶ್ರಾಂತಿ ಪಡೆಯುವ ಕೋಣೆಯಲ್ಲಿ ಹಾಸಿಗೆ ಅಥವಾ ಮೇಜಿನ ಹತ್ತಿರ ನೋಡಿ.',
            }
          : {
              en: '🌱 Orientation: Think about where this activity normally takes place in your home.',
              hi: '🌱 दिशा संकेत: सोचें कि घर में यह काम आमतौर पर किस जगह किया जाता है।',
              mr: '🌱 दिशा खूण: घरात हे काम सहसा कुठे केले जाते याचा शांतपणे विचार करा.',
              bn: '🌱 দিকনির্দেশ: বাড়ির কোথায় এই কাজটি সাধারণত করা হয় তা মনে করার চেষ্টা করুন।',
              ta: '🌱 திசை குறிப்பு: வீட்டில் இந்தச் செயல் வழக்கமாக எங்கே நடைபெறும் என்பதை நினைத்துப் பாருங்கள்.',
              te: '🌱 దిశా సూచన: ఇంట్లో ఈ పని సాధారణంగా ఎక్కడ జరుగుతుందో ఆలోచించండి.',
              kn: '🌱 ದಿಕ್ಕು ಸುಳಿವು: ಮನೆಯಲ್ಲಿ ಈ ಚಟುವಟಿಕೆಯನ್ನು ಸಾಮಾನ್ಯವಾಗಿ ಎಲ್ಲಿ ಮಾಡುತ್ತೀರಿ ಎಂದು ಯೋಚಿಸಿ.',
            };
        return m[shortLang] || m.en;
      }
      case 2: {
        const m: Record<string, string> = locHint
          ? {
              en: `🔍 Contextual Clue: It is placed on or near the ${locHint}.`,
              hi: `🔍 संदर्भ संकेत: यह "${locHint}" पर या उसके पास रखा है।`,
              mr: `🔍 संदर्भ खूण: ते "${locHint}" जवळ किंवा त्यावर ठेवलेले आहे.`,
              bn: `🔍 প্রসঙ্গ ইঙ্গিত: এটি "${locHint}"-এর ওপর বা কাছাকাছি রাখা আছে।`,
              ta: `🔍 சூழல் குறிப்பு: இது "${locHint}" மேல் அல்லது அருகே வைக்கப்பட்டுள்ளது.`,
              te: `🔍 సందర్భ సూచన: ఇది "${locHint}" పైన లేదా దగ్గరలో ఉంది.`,
              kn: `🔍 ಸಂದರ್ಭ ಸುಳಿವು: ಇದನ್ನು "${locHint}" ಮೇಲೆ ಅಥವಾ ಹತ್ತಿರ ಇಡಲಾಗಿದೆ.`,
            }
          : {
              en: '🔍 Contextual Clue: Focus on the everyday tools or mug you use for this.',
              hi: '🔍 संदर्भ संकेत: इस काम में इस्तेमाल होने वाली रोज़मर्रा की चीज़ों पर ध्यान दें।',
              mr: '🔍 संदर्भ खूण: यासाठी लागणाऱ्या नेहमीच्या वस्तूंवर लक्ष द्या.',
              bn: '🔍 প্রসঙ্গ ইঙ্গিত: এই কাজের জন্য ব্যবহৃত নিত্যদিনের জিনিসগুলোর দিকে মন দিন।',
              ta: '🔍 சூழல் குறிப்பு: இதற்குப் பயன்படுத்தும் அன்றாடப் பொருட்களில் கவனம் செலுத்துங்கள்.',
              te: '🔍 సందర్భ సూచన: దీని కోసం మీరు ఉపయోగించే రోజువారీ వస్తువులపై దృష్టి పెట్టండి.',
              kn: '🔍 ಸಂದರ್ಭ ಸುಳಿವು: ಇದಕ್ಕಾಗಿ ನೀವು ಬಳಸುವ ದೈನಂದಿನ ವಸ್ತುಗಳ ಮೇಲೆ ಗಮನಹರಿಸಿ.',
            };
        return m[shortLang] || m.en;
      }
      case 3: {
        const m: Record<string, string> = locHint
          ? {
              en: `✋ Guided Answer: It is recorded at: "${locHint}".`,
              hi: `✋ मार्गदर्शित उत्तर: यह यहाँ दर्ज है: "${locHint}"।`,
              mr: `✋ मार्गदर्शित उत्तर: हे येथे नोंदवलेले आहे: "${locHint}".`,
              bn: `✋ সহজ উত্তর: এটি এখানে নথিভুক্ত আছে: "${locHint}"।`,
              ta: `✋ வழிகாட்டப்பட்ட பதில்: இது இங்கே பதிவு செய்யப்பட்டுள்ளது: "${locHint}".`,
              te: `✋ మార్గదర్శక సమాధానం: ఇది ఇక్కడ నమోదు చేయబడింది: "${locHint}".`,
              kn: `✋ ಮಾರ್ಗದರ್ಶಿತ ಉತ್ತರ: ಇದನ್ನು ಇಲ್ಲಿ ದಾಖಲಿಸಲಾಗಿದೆ: "${locHint}".`,
            }
          : stepOpt
          ? {
              en: `✋ Guided Answer: The recommended step is: "${stepOpt}".`,
              hi: `✋ मार्गदर्शित उत्तर: सुझाया गया चरण है: "${stepOpt}"।`,
              mr: `✋ मार्गदर्शित उत्तर: सुचवलेली पायरी अशी आहे: "${stepOpt}".`,
              bn: `✋ সহজ উত্তর: প্রস্তাবিত ধাপটি হলো: "${stepOpt}"।`,
              ta: `✋ வழிகாட்டப்பட்ட பதில்: பரிந்துரைக்கப்படும் படி: "${stepOpt}".`,
              te: `✋ మార్గదర్శక సమాధానం: సూచించిన దశ ఇదిగో: "${stepOpt}".`,
              kn: `✋ ಮಾರ್ಗದರ್ಶಿತ ಉತ್ತರ: ಶಿಫಾರಸು ಮಾಡಿದ ಹಂತ: "${stepOpt}".`,
            }
          : {
              en: '✋ Guided Answer: Take one slow breath and start with the simplest motion.',
              hi: '✋ मार्गदर्शित उत्तर: एक धीमी साँस लें और सबसे आसान कदम से शुरू करें।',
              mr: '✋ मार्गदर्शित उत्तर: एक शांत श्वास घ्या आणि सर्वात सोप्या कृतीपासून सुरुवात करा.',
              bn: '✋ সহজ উত্তর: একটি ধীর শ্বাস নিন এবং সবচেয়ে সহজ কাজটি দিয়ে শুরু করুন।',
              ta: '✋ வழிகாட்டப்பட்ட பதில்: மெதுவாக மூச்செடுத்து எளிய செயலிலிருந்து தொடங்குங்கள்.',
              te: '✋ మార్గదర్శక సమాధానం: నెమ్మదిగా శ్వాస తీసుకుని అతి సులువైన కదలికతో ప్రారంభించండి.',
              kn: '✋ ಮಾರ್ಗದರ್ಶಿತ ಉತ್ತರ: ನಿಧಾನವಾಗಿ ಉಸಿರೆಳೆದು ಅತ್ಯಂತ ಸುಲಭ ಚಲನೆಯಿಂದ ಪ್ರಾರಂಭಿಸಿ.',
            };
        return m[shortLang] || m.en;
      }
      case 4:
        return cardUi.challengeSupportedMsg;
    }
  };

  const handleRequestHint = () => {
    const nextLevel = Math.min(cueLevel + 1, 4) as 0 | 1 | 2 | 3 | 4;
    setCueLevel(nextLevel);
    setHintsRequested((h) => h + 1);
    audioSynthesizer.playTone(523.25, 0.15);

    const hintMsg = getCueText(nextLevel);
    SpeechService.speak(hintMsg, () => {}, () => {}, SpeechService.getBCP47(language));
  };

  const handleSelectOption = (idx: number) => {
    const isCorrect = config.correctOptionIndex !== undefined ? idx === config.correctOptionIndex : true;

    if (isCorrect) {
      audioSynthesizer.playTone(587.33, 0.2);
    }

    const result: MemoryChallengeResult = {
      challengeType,
      attempted: true,
      declined: false,
      cueLevelUsed: cueLevel,
      hintsRequested,
      completed: true,
      caregiverSupported: cueLevel === 4,
      recordedAt: new Date().toISOString(),
      nonDiagnosticNotice: 'Gentle cognitive exercise outcome for activity support. Strictly non-diagnostic.',
    };

    setIsCompleted(true);
    TaskLifecycleService.recordChallengeOutcome(patientId, taskId, result);
    onChallengeComplete?.(result);
  };

  const handleDeclineChallenge = () => {
    setIsDeclined(true);
    const result: MemoryChallengeResult = {
      challengeType,
      attempted: false,
      declined: true,
      cueLevelUsed: 0,
      hintsRequested: 0,
      completed: false,
      caregiverSupported: false,
      recordedAt: new Date().toISOString(),
      nonDiagnosticNotice: 'Patient declined optional recall exercise with zero penalty.',
    };
    TaskLifecycleService.recordChallengeOutcome(patientId, taskId, result);
    onDecline?.();
  };

  return (
    <div
      className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50/50 rounded-2xl border-2 border-purple-200 shadow-xs space-y-3 text-left animate-in fade-in"
      data-testid="memory-challenge-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-purple-100" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-purple-800 bg-purple-100/70 px-2 py-0.5 rounded-full border border-purple-200">
              {t('routines.challenge_optional_badge')}
            </span>
            <h4 className="text-xs font-black text-slate-900 mt-0.5">
              {defaultQuestion}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDeclineChallenge}
          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          title={cardUi.challengeSkipTitle}
        >
          {t('routines.challenge_skip')}
        </button>
      </div>

      {/* Options if available */}
      {config.stepOptions && config.stepOptions.length > 0 && !isCompleted && (
        <div className="space-y-1.5 pt-1">
          {config.stepOptions.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectOption(idx)}
              className="w-full text-left p-2.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-100/60 text-slate-800 text-xs font-semibold transition flex items-center justify-between gap-2 min-h-[40px] cursor-pointer shadow-2xs"
            >
              <span>{opt}</span>
              <ChevronRight className="w-4 h-4 text-purple-500 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Current Cue Level Message */}
      {cueLevel > 0 && (
        <div className="p-2.5 bg-white/80 rounded-xl border border-purple-200 text-xs text-purple-950 font-medium">
          {getCueText(cueLevel)}
        </div>
      )}

      {/* Action Row */}
      {!isCompleted ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={handleRequestHint}
            className="flex-1 py-2 px-3 bg-white hover:bg-purple-50 border border-purple-300 text-purple-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer min-h-[38px]"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>
              {cueLevel === 0
                ? t('routines.challenge_hint_0')
                : cueLevel === 1
                ? t('routines.challenge_hint_1')
                : cueLevel === 2
                ? t('routines.challenge_hint_2')
                : t('routines.challenge_hint_3')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectOption(0)}
            className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer min-h-[38px]"
          >
            {t('routines.challenge_remember')}
          </button>
        </div>
      ) : (
        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {t('routines.challenge_done')}
          </span>
          <span className="text-[10px] text-emerald-700 font-normal">
            {cardUi.challengeZeroPenaltyNote}
          </span>
        </div>
      )}
    </div>
  );
};
