import React, { useState, useEffect, useRef } from 'react';
import { RoutineItem, LovedOne } from '../../../types/index.js';
import { SpeechService } from '../../../services/speechService.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import { RoutineService } from '../services/routineService.js';
import { LovedOnesService } from '../../lovedOnes/services/lovedOnesService.js';
import { CharacterVisualizer } from '../../ai-companion/CharacterVisualizer.js';
import { AdaptiveSupportService } from '../../adaptive/services/adaptiveSupportService.js';
import { DailyWellbeingService } from '../../adaptive/services/dailyWellbeingService.js';
import { CareAdaptationProposal, ReversibleRoutineChallenge, StepExecutionRecord } from '../../adaptive/types/adaptive.types.js';
import { TaskLifecycleService } from '../services/taskLifecycleService.js';
import { StepPatternService } from '../services/stepPatternService.js';
import { RoutineSessionService } from '../services/routineSessionService.js';
import {
  StepTelemetry,
  StepInteractionState,
  StepSimplificationProposal,
  FamiliarityPreservingChallengeProposal,
} from '../types/stepPattern.types.js';
import { MemoryChallengeCard } from './MemoryChallengeCard.js';
import { MemoryChallengeResult } from '../types/taskLifecycle.types.js';
import { useAccessibility } from '../../../context/AccessibilityContext.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import {
  getTranslatedRoutineTitle,
  getTranslatedRoutineSteps,
  getTranslatedRoutineCategory,
  getTranslatedScheduleTime,
} from '../utils/routineTranslation.js';
import {
  getGuidedRunnerText,
  getTranslatedMicroActions,
  getTranslatedSimplifiedExplanation,
  getTranslatedAshaReassurance,
  getTranslatedAskAshaHelpMsg,
  getTranslatedStuckChoiceAdvice,
  getTranslatedCalmProposalExplanation,
  formatGuidedTemplate,
} from '../utils/guidedRunnerTranslation.js';
import {
  X,
  Play,
  Pause,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Volume2,
  ListCheck,
  Layout,
  Check,
  Info,
  Clock,
  Phone,
  MessageSquare,
  Sparkles,
  Layers,
  Heart,
} from 'lucide-react';

export interface ProgressiveHintSet {
  tier1: string; // Tier 1: Orientation Cue
  tier2: string; // Tier 2: Contextual Clue
  tier3: string; // Tier 3: Guided Action
}

export const getStepProgressiveHints = (
  stepText: string,
  routineTitle: string = '',
  category: string = '',
  language: string = 'en'
): ProgressiveHintSet => {
  const clean = stepText.replace(/^[0-9]+\.\s*/, '');
  const lower = (stepText + ' ' + routineTitle + ' ' + category).toLowerCase();
  const lang = (language || 'en').toLowerCase().split('-')[0];

  if (lower.includes('tea') || lower.includes('water') || lower.includes('hydrat') || lower.includes('drink')) {
    switch (lang) {
      case 'hi':
        return {
          tier1: '🌱 दिशा-निर्देश: अपनी मेज पर ध्यान दें जहाँ आपका कप और फ्लास्क रखा है।',
          tier2: '🔍 संदर्भ: कोस्टर के ठीक पास रखे थर्मस फ्लास्क को देखें।',
          tier3: '✋ क्रिया: फ्लास्क को दोनों हाथों से थामें और धीरे से थोड़ा पानी कप में डालें।',
        };
      case 'mr':
        return {
          tier1: '🌱 दिशा-निर्देश: टेबलावर जिथे तुमचा कप आणि फ्लास्क ठेवला आहे तेथे पाहा.',
          tier2: '🔍 संदर्भ: कोस्टरच्या बाजूला असलेला थर्मस फ्लास्क नीट पाहा.',
          tier3: '✋ कृती: फ्लास्क दोन्ही हातांनी पकडा आणि हळूवार थोडे पाणी कपात ओता.',
        };
      case 'ta':
        return {
          tier1: '🌱 நோக்குநிலை: உங்கள் கோப்பையும் பிளாஸ்க்கும் உள்ள மேசையைக் கவனியுங்கள்.',
          tier2: '🔍 சூழல்: தட்டின் அருகே இருக்கும் வெதுவெதுப்பான பிளாஸ்க்கை கவனியுங்கள்.',
          tier3: '✋ செயல்முறை: பிளாஸ்க்கை இரு கைகளாலும் பிடித்து நிதானமாக கோப்பையில் ஊற்றுங்கள்.',
        };
      case 'te':
        return {
          tier1: '🌱 దిశా-నిర్దేశం: మీ కప్పు మరియు ఫ్లాస్క్ ఉన్న టేబుల్ వైపు చూడండి.',
          tier2: '🔍 సందర్భం: కోస్టర్ పక్కనే ఉన్న థర్మోస్ ఫ్లాస్క్‌ను గమనించండి.',
          tier3: '✋ చర్య: ఫ్లాస్క్‌ను రెండు చేతులతో పట్టుకుని కప్పులో మెల్లగా కొద్దిగా పోయండి.',
        };
      case 'kn':
        return {
          tier1: '🌱 ದಿಕ್ಸೂಚಿ: ನಿಮ್ಮ ಕಪ್ ಮತ್ತು ಫ್ಲಾಸ್ಕ್ ಇರುವ ಟೇಬಲ್ ಕಡೆಗೆ ನೋಡಿ.',
          tier2: '🔍 ಸಂದರ್ಭ: ಕೋಸ್ಟರ್ ಪಕ್ಕದಲ್ಲಿರುವ ಥರ್ಮೋಸ್ ಫ್ಲಾಸ್ಕ್ ಗಮನಿಸಿ.',
          tier3: '✋ ಕ್ರಿಯೆ: ಫ್ಲಾಸ್ಕ್ ಅನ್ನು ಎರಡೂ ಕೈಗಳಿಂದ ಹಿಡಿದು ನಿಧಾನವಾಗಿ ಕಪ್‌ಗೆ ಸ್ವಲ್ಪ ಸುರಿಯಿರಿ.',
        };
      case 'bn':
        return {
          tier1: '🌱 দিকনির্দেশ: আপনার টেবিল বা কাউন্টারের দিকে তাকান যেখানে কাপ ও ফ্লাস্ক রয়েছে।',
          tier2: '🔍 প্রসঙ্গ: কোস্টারের পাশে রাখা থার্মাস ফ্লাস্কটি লক্ষ্য করুন।',
          tier3: '✋ পদক্ষেপ: ফ্লাস্কটি দুই হাতে ধরে ধীরে ধীরে কাপে সামান্য ঢালুন।',
        };
      case 'en':
      default:
        return {
          tier1: '🌱 Orientation: Look at the table or counter where your cup and flask are resting.',
          tier2: '🔍 Context: Notice the warm thermos flask right next to your coaster.',
          tier3: '✋ Action: Hold the flask with both hands and gently pour a small amount into your cup.',
        };
    }
  }

  if (lower.includes('button') || lower.includes('shirt') || lower.includes('dress') || lower.includes('cloth')) {
    switch (lang) {
      case 'hi':
        return {
          tier1: '🌱 दिशा-निर्देश: अपनी गोद में रखी कमीज को आराम से देखें।',
          tier2: '🔍 संदर्भ: कमीज के सबसे नीचे वाले बटन और उसके काज को देखें।',
          tier3: '✋ क्रिया: नीचे के बटन को धीरे से काज के अंदर डालें, फिर उंगलियों को आराम दें।',
        };
      case 'mr':
        return {
          tier1: '🌱 दिशा-निर्देश: आपल्या मांडीवर पसरलेल्या शर्टकडे शांतपणे पाहा.',
          tier2: '🔍 संदर्भ: शर्टच्या सर्वात खालचे बटण आणि त्याचे काज शोधा.',
          tier3: '✋ कृती: खालचे बटण हळूवारपणे काजात घाला आणि बोटांना विश्रांती द्या.',
        };
      case 'ta':
        return {
          tier1: '🌱 நோக்குநிலை: உங்கள் மடியில் வைக்கப்பட்டுள்ள சட்டையை அமைதியாகப் பாருங்கள்.',
          tier2: '🔍 சூழல்: சட்டையின் கீழ்ப்பகுதியில் உள்ள கடைசி பொத்தானையும் துளையையும் கவனியுங்கள்.',
          tier3: '✋ செயல்முறை: பொத்தானை மெதுவாக துளைக்குள் நுழைத்து விரல்களுக்கு சிறிது ஓய்வு கொடுங்கள்.',
        };
      case 'te':
        return {
          tier1: '🌱 దిశా-నిర్దేశం: మీ ఒడిలో ఉన్న చొక్కాను ప్రశాంతంగా చూడండి.',
          tier2: '🔍 సందర్భం: చొక్కా అడుగున ఉన్న గుండీ మరియు దాని రంధ్రాన్ని గుర్తించండి.',
          tier3: '✋ చర్య: గుండీని నెమ్మదిగా రంధ్రంలోకి పోనిచ్చి వేళ్లకు కాసేపు విశ్రాంతి ఇవ్వండి.',
        };
      case 'kn':
        return {
          tier1: '🌱 ದಿಕ್ಸೂಚಿ: ನಿಮ್ಮ ಮಡಿಲಲ್ಲಿ ಇಟ್ಟಿರುವ ಅಂಗಿಯನ್ನು ಶಾಂತವಾಗಿ ನೋಡಿ.',
          tier2: '🔍 ಸಂದರ್ಭ: ಅಂಗಿಯ ಕೆಳಭಾಗದ ಗುಂಡಿ ಮತ್ತು ಅದರ ರಂಧ್ರವನ್ನು ಗುರುತಿಸಿ.',
          tier3: '✋ ಕ್ರಿಯೆ: ಗುಂಡಿಯನ್ನು ನಿಧಾನವಾಗಿ ರಂಧ್ರದೊಳಗೆ ತೂರಿಸಿ ನಂತರ ಬೆರಳುಗಳಿಗೆ ವಿಶ್ರಾಂತಿ ನೀಡಿ.',
        };
      case 'bn':
        return {
          tier1: '🌱 দিকনির্দেশ: আপনার কোলের ওপর রাখা জামাটির দিকে শান্তভাবে তাকান।',
          tier2: '🔍 প্রসঙ্গ: জামার নিচের বোতাম এবং তার বোতামের ঘরটি খুঁজে নিন।',
          tier3: '✋ পদক্ষেপ: নিচের বোতামটি সাবধানে ঘরের ভেতর ঢুকিয়ে আঙুলগুলোকে একটু বিশ্রাম দিন।',
        };
      case 'en':
      default:
        return {
          tier1: '🌱 Orientation: Take a relaxed look at your shirt laid flat across your lap.',
          tier2: '🔍 Context: Locate the lowest button and its matching buttonhole at the bottom of the shirt.',
          tier3: '✋ Action: Gently push the bottom button through the hole, then rest your fingers for a moment.',
        };
    }
  }

  if (lower.includes('walk') || lower.includes('garden') || lower.includes('stretch') || lower.includes('feet') || lower.includes('exercise')) {
    switch (lang) {
      case 'hi':
        return {
          tier1: '🌱 दिशा-निर्देश: अपने सामने के रास्ते को देखें और सुनिश्चित करें कि फर्श साफ है।',
          tier2: '🔍 संदर्भ: अपने चप्पल-जूते ठीक करें और किसी मजबूत कुर्सी या रेलिंग पर हाथ रखें।',
          tier3: '✋ क्रिया: धीरे से खड़े हों, गहरी सांस लें और दो शांत कदम आगे बढ़ाएं।',
        };
      case 'mr':
        return {
          tier1: '🌱 दिशा-निर्देश: समोरील मार्गाकडे पाहा आणि फरशी मोकळी असल्याची खात्री करा.',
          tier2: '🔍 संदर्भ: पादत्राणे नीट घाला आणि मजबूत खुर्चीवर किंवा रेलिंगवर हात ठेवा.',
          tier3: '✋ कृती: हळूहळू उभे राहा, दीर्घ श्वास घ्या आणि दोन पावले पुढे टाका.',
        };
      case 'ta':
        return {
          tier1: '🌱 நோக்குநிலை: உங்கள் முன் உள்ள பாதையைப் பார்த்து தரை சுத்தமாக இருப்பதை உறுதிசெய்யுங்கள்.',
          tier2: '🔍 சூழல்: காலணிகள் சரியாக இருப்பதை உறுதிசெய்து நாற்காலி அல்லது பிடியைப் பற்றிக்கொள்ளுங்கள்.',
          tier3: '✋ செயல்முறை: மெதுவாக எழுந்து நின்று, ஆழமாக மூச்செடுத்து, இரண்டு அடிகள் முன்னால் வையுங்கள்.',
        };
      case 'te':
        return {
          tier1: '🌱 దిశా-నిర్దేశం: మీ ఎదురుగా ఉన్న దారిని చూసి నేల స్పష్టంగా ఉందని నిర్ధారించుకోండి.',
          tier2: '🔍 సందర్భం: పాదరక్షలు సరిగ్గా ఉన్నాయని చూసి బలమైన కుర్చీ లేదా రెయిలింగ్‌పై చేయి వేయండి.',
          tier3: '✋ చర్య: నెమ్మదిగా లేచి నిలబడి, దీర్ఘ శ్వాస తీసుకుని రెండు అడుగులు ముందుకు వేయండి.',
        };
      case 'kn':
        return {
          tier1: '🌱 ದಿಕ್ಸೂಚಿ: ನಿಮ್ಮ ಮುಂದಿರುವ ದಾರಿಯನ್ನು ನೋಡಿ ನೆಲ ಸ್ವಚ್ಛವಾಗಿದೆಯೇ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.',
          tier2: '🔍 ಸಂದರ್ಭ: ಪಾದರಕ್ಷೆಗಳು ಸರಿಯಾಗಿವೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ ಕುರ್ಚಿ ಅಥವಾ ರೈಲಿಂಗ್ ಮೇಲೆ ಕೈಯಿಡಿ.',
          tier3: '✋ ಕ್ರಿಯೆ: ನಿಧಾನವಾಗಿ ಎದ್ದು ನಿಂತು, ದೀರ್ಘ ಉಸಿರೆಳೆದು, ಎರಡು ಹೆಜ್ಜೆ ಮುಂದಿಡಿ.',
        };
      case 'bn':
        return {
          tier1: '🌱 দিকনির্দেশ: সামনের চলার পথটি দেখুন এবং মেঝে পরিষ্কার আছে কিনা নিশ্চিত করুন।',
          tier2: '🔍 প্রসঙ্গ: জুতো বা চটি ঠিকভাবে পরেছেন কিনা দেখে শক্ত চেয়ার বা রেলিং ধরে নিন।',
          tier3: '✋ পদক্ষেপ: ধীরে ধীরে উঠে দাঁড়ান, গভীর শ্বাস নিন এবং দুটি শান্ত পদক্ষেপ এগিয়ে চলুন।',
        };
      case 'en':
      default:
        return {
          tier1: '🌱 Orientation: Look at the pathway in front of you and ensure the floor is clear.',
          tier2: '🔍 Context: Make sure your footwear is snug, and place one hand on a sturdy chair or railing.',
          tier3: '✋ Action: Stand up slowly, take a deep breath, and take two gentle steps forward.',
        };
    }
  }

  if (lower.includes('medication') || lower.includes('pill') || lower.includes('medicine')) {
    switch (lang) {
      case 'hi':
        return {
          tier1: '🌱 दिशा-निर्देश: अपनी दवा की डिब्बी और पीने के पानी का गिलास पास रखें।',
          tier2: '🔍 संदर्भ: डिब्बी में आज के दिन का खाना देखें।',
          tier3: '✋ क्रिया: बताई गई गोली लें, पानी के घूंट के साथ निगलें और आराम से बैठें।',
        };
      case 'mr':
        return {
          tier1: '🌱 दिशा-निर्देश: औषधांचा बॉक्स आणि एका ग्लासात पिण्याचे पाणी जवळ ठेवा.',
          tier2: '🔍 संदर्भ: बॉक्समध्ये आजच्या दिवसाचा कप्पा पाहा.',
          tier3: '✋ कृती: ठरलेली एक गोळी घ्या, पाण्याचा घोट घेऊन गिळा आणि शांत बसा.',
        };
      case 'ta':
        return {
          tier1: '🌱 நோக்குநிலை: மாத்திரை பெட்டியையும் ஒரு டம்ளர் தண்ணீரையும் அருகில் வையுங்கள்.',
          tier2: '🔍 சூழல்: இன்றைய நாளுக்கான மாத்திரை பகுதியை பெட்டியில் பாருங்கள்.',
          tier3: '✋ செயல்முறை: பரிந்துரைக்கப்பட்ட மாத்திரையை தண்ணீருடன் விழுங்கி அமைதியாக உட்காருங்கள்.',
        };
      case 'te':
        return {
          tier1: '🌱 దిశా-నిర్దేశం: మీ మాత్రల పెట్టెను మరియు గ్లాసు తాగునీటిని దగ్గర ఉంచుకోండి.',
          tier2: '🔍 సందర్భం: పెట్టెలో నేటి రోజుకు సంబంధించిన భాగాన్ని గుర్తించండి.',
          tier3: '✋ చర్య: సూచించిన మాత్రను తీసుకుని నీటితో మింగి ప్రశాంతంగా కూర్చోండి.',
        };
      case 'kn':
        return {
          tier1: '🌱 ದಿಕ್ಸೂಚಿ: ನಿಮ್ಮ ಔಷಧಿ ಪೆಟ್ಟಿಗೆ ಮತ್ತು ಕುಡಿಯುವ ನೀರಿನ ಲೋಟವನ್ನು ಹತ್ತಿರವಿಡಿ.',
          tier2: '🔍 ಸಂದರ್ಭ: ಪೆಟ್ಟಿಗೆಯಲ್ಲಿ ಇಂದಿನ ದಿನದ ವಿಭಾಗವನ್ನು ನೋಡಿ.',
          tier3: '✋ ಕ್ರಿಯೆ: ನಿಗದಿತ ಮಾತ್ರೆಯನ್ನು ನೀರಿನೊಂದಿಗೆ ನುಂಗಿ ಪ್ರಶಾಂತವಾಗಿ ಕುಳಿತುಕೊಳ್ಳಿ.',
        };
      case 'bn':
        return {
          tier1: '🌱 দিকনির্দেশ: ওষুধের বাক্স ও এক গ্লাস খাবার জল হাতের কাছে রাখুন।',
          tier2: '🔍 প্রসঙ্গ: বাক্সে আজকের দিনের নির্দিষ্ট ঘরটি দেখে নিন।',
          tier3: '✋ পদক্ষেপ: নির্দিষ্ট ওষুধটি নিয়ে পর্যাপ্ত জল দিয়ে খেয়ে শান্ত হয়ে বসুন।',
        };
      case 'en':
      default:
        return {
          tier1: '🌱 Orientation: Locate your labeled pill organizer and a glass of fresh drinking water.',
          tier2: '🔍 Context: Look for today’s slot on your organizer.',
          tier3: '✋ Action: Take the single prescribed tablet with a generous sip of water and sit comfortably.',
        };
    }
  }

  // Fallback for general steps
  switch (lang) {
    case 'hi':
      return {
        tier1: `🌱 दिशा-निर्देश: अपने आसपास देखें और इस चरण के लिए जरूरी चीजें पहचानें।`,
        tier2: `🔍 संदर्भ: शांत मन से ध्यान दें: "${clean.slice(0, 50)}"`,
        tier3: `✋ क्रिया: यह आसान काम करें: "${clean}"। आराम से करें, कोई जल्दी नहीं है।`,
      };
    case 'mr':
      return {
        tier1: `🌱 दिशा-निर्देश: आपल्या आजूबाजूला पाहा आणि या पायरीसाठी लागणाऱ्या वस्तू शोधा.`,
        tier2: `🔍 संदर्भ: शांतपणे लक्ष द्या: "${clean.slice(0, 50)}"`,
        tier3: `✋ कृती: ही सोपी कृती करा: "${clean}". शांतपणे करा, अजिबात घाई नाही.`,
      };
    case 'ta':
      return {
        tier1: `🌱 நோக்குநிலை: உங்களைச் சுற்றிப் பார்த்து இந்த படிக்குத் தேவையானவற்றைக் கண்டறியுங்கள்.`,
        tier2: `🔍 சூழல்: அமைதியாக கவனியுங்கள்: "${clean.slice(0, 50)}"`,
        tier3: `✋ செயல்முறை: இந்த எளிய செயலைச் செய்யுங்கள்: "${clean}". நிதானமாகச் செய்யுங்கள்; அவசரமில்லை.`,
      };
    case 'te':
      return {
        tier1: `🌱 దిశా-నిర్దేశం: మీ చుట్టూ చూసి ఈ దశకు అవసరమైన వస్తువులను గుర్తించండి.`,
        tier2: `🔍 సందర్భం: ప్రశాంతంగా దీనిపై దృష్టి పెట్టండి: "${clean.slice(0, 50)}"`,
        tier3: `✋ చర్య: ఈ సులువైన పనిని చేయండి: "${clean}". నిదానంగా చేయండి, ఎటువంటి తొందర లేదు.`,
      };
    case 'kn':
      return {
        tier1: `🌱 ದಿಕ್ಸೂಚಿ: ನಿಮ್ಮ ಸುತ್ತಲೂ ನೋಡಿ ಈ ಹಂತಕ್ಕೆ ಅಗತ್ಯವಿರುವ ವಸ್ತುಗಳನ್ನು ಗುರುತಿಸಿ.`,
        tier2: `🔍 ಸಂದರ್ಭ: ಪ್ರಶಾಂತವಾಗಿ ಇದರ ಮೇಲೆ ಗಮನಹರಿಸಿ: "${clean.slice(0, 50)}"`,
        tier3: `✋ ಕ್ರಿಯೆ: ಈ ಸುಲಭ ಕ್ರಿಯೆಯನ್ನು ಮಾಡಿ: "${clean}". ನಿಧಾನವಾಗಿ ಮಾಡಿ, ಯಾವುದೇ ಆತುರವಿಲ್ಲ.`,
      };
    case 'bn':
      return {
        tier1: `🌱 দিকনির্দেশ: আপনার চারপাশে তাকিয়ে এই ধাপটির প্রয়োজনীয় জিনিসটি খুঁজে নিন।`,
        tier2: `🔍 প্রসঙ্গ: শান্তভাবে মনোযোগ দিন: "${clean.slice(0, 50)}"`,
        tier3: `✋ পদক্ষেপ: এই সাধারণ কাজটি করুন: "${clean}"। ধীরে ধীরে করুন, কোনো তাড়াহুড়ো নেই।`,
      };
    case 'en':
    default:
      return {
        tier1: `🌱 Orientation: Look around your immediate space and find what you need for this step.`,
        tier2: `🔍 Context: Focus gently on: "${clean.slice(0, 50)}".`,
        tier3: `✋ Action: Do this one simple motion: "${clean}". Take your time; there is no test or hurry.`,
      };
  }
};

interface GuidedTaskRunnerProps {
  routine: RoutineItem;
  isOpen: boolean;
  onClose: () => void;
  onFinish: (routineId: string) => void;
  defaultViewMode?: 'single' | 'checklist';
  language?: string;
  patientId?: string;
}

export const GuidedTaskRunner: React.FC<GuidedTaskRunnerProps> = ({
  routine,
  isOpen,
  onClose,
  onFinish,
  defaultViewMode = 'single',
  language: propLanguage,
  patientId = 'default-patient',
}) => {
  const { t, language: activeContextLang } = useLanguage();
  const language = propLanguage || activeContextLang || 'en';
  const localizedRoutineTitle = getTranslatedRoutineTitle(routine, t, language);
  const steps: string[] = getTranslatedRoutineSteps(routine, language, localizedRoutineTitle);

  let accessCtx: any = null;
  try {
    accessCtx = useAccessibility();
  } catch {
    accessCtx = null;
  }
  const textSize = accessCtx?.textSize || 'standard';
  const reducedMotion = accessCtx?.reducedMotion || false;
  const largeTouchTargets = accessCtx?.largeTouchTargets || false;
  const requireActionConfirmations = accessCtx?.requireActionConfirmations !== false;
  const singleInstructionMode = accessCtx?.preferences?.maxInstructionsPerTurn === 1;

  const stepTextSizeClass =
    textSize === 'extra-large'
      ? 'text-xl sm:text-2xl font-black'
      : textSize === 'large'
      ? 'text-lg sm:text-xl font-bold'
      : 'text-base sm:text-lg font-bold';

  const touchTargetClass = largeTouchTargets ? 'min-h-[48px]' : 'min-h-[44px]';

  // Dual View Mode: 'checklist' (all steps overview) vs 'single' (Step-by-step)
  const [viewMode, setViewMode] = useState<'single' | 'checklist'>(
    singleInstructionMode ? 'single' : defaultViewMode
  );
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [independenceLevel, setIndependenceLevel] = useState<'supported' | 'guided' | 'independent' | 'challenge'>('guided');
  const [challengeResult, setChallengeResult] = useState<MemoryChallengeResult | undefined>(undefined);
  const [showIndependentClue, setShowIndependentClue] = useState<boolean>(false);

  // Phase 2.9 Progressive 3-Tier Hint System
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0);
  const [hintsUsedCount, setHintsUsedCount] = useState<number>(0);
  const [repeatedInstructionsCount, setRepeatedInstructionsCount] = useState<number>(0);
  const [assistanceRequested, setAssistanceRequested] = useState<boolean>(false);
  const sessionStartTimeRef = useRef<string>(`rt_sess_${Date.now()}`);

  // Modals state
  const [showStuckModal, setShowStuckModal] = useState<boolean>(false);
  const [stuckActiveTab, setStuckActiveTab] = useState<'main' | 'breakdown' | 'explain' | 'asha' | 'caregiver'>('main');
  const [stuckAdvice, setStuckAdvice] = useState<string | null>(null);
  const [showConfirmFinishModal, setShowConfirmFinishModal] = useState<boolean>(false);

  // Phase 3.3: Step-Level Pattern Tracking & Telemetry
  const [stepHintTiers, setStepHintTiers] = useState<Record<number, 0 | 1 | 2 | 3>>({});
  const [stepAssistance, setStepAssistance] = useState<Record<number, boolean>>({});

  // Phase 3.6: Interrupted Task Session Recovery (Phase D)
  const savedSession = React.useMemo(() => {
    return RoutineSessionService.getActiveSession(patientId, routine.id);
  }, [patientId, routine.id]);

  const [hasInterruptedSession, setHasInterruptedSession] = useState<boolean>(() => {
    return savedSession !== null && savedSession.completedStepIndices.length > 0;
  });
  const [stepSimplifications] = useState<StepSimplificationProposal[]>(() =>
    StepPatternService.getSimplificationProposals(patientId, routine.id)
  );
  const [stepChallenges] = useState<FamiliarityPreservingChallengeProposal[]>(() =>
    StepPatternService.getChallengeProposals(patientId, routine.id)
  );
  const [revealedStepChallenges, setRevealedStepChallenges] = useState<Set<number>>(new Set());

  const currentStepSimplification = stepSimplifications.find(
    (p) => p.stepIndex === currentStepIndex && (p.status === 'proposed' || p.status === 'accepted')
  );
  const currentStepChallenge = stepChallenges.find(
    (c) => c.stepIndex === currentStepIndex && (c.status === 'available' || c.status === 'in_progress')
  );

  // Stage 3 Phase B: Adaptive Personalized Care Proposals
  const [pendingProposal, setPendingProposal] = useState<CareAdaptationProposal | null>(() =>
    AdaptiveSupportService.getPendingProposalForActivity(patientId, routine.id)
  );
  const [activeProposal, setActiveProposal] = useState<CareAdaptationProposal | null>(() =>
    AdaptiveSupportService.getActiveProposalForActivity(patientId, routine.id)
  );
  const [reversibleChallenge, setReversibleChallenge] = useState<ReversibleRoutineChallenge | null>(() =>
    AdaptiveSupportService.getReversibleChallenge(patientId, routine.id)
  );

  const handleRestoreFamiliar = async () => {
    await AdaptiveSupportService.restoreOriginalRoutine(patientId, routine.id);
    setReversibleChallenge((prev) => (prev ? { ...prev, isChallengeActive: false } : null));
  };

  // 15-Minute Activity Timer (Strictly 900 seconds initial)
  const initialSeconds = 15 * 60;
  const [timerDuration, setTimerDuration] = useState<number>(initialSeconds);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [hasWarnedTwoMinutes, setHasWarnedTwoMinutes] = useState<boolean>(false);
  const lastTickRef = useRef<number>(Date.now());

  // 2-Minute Calming Rest feature
  const [isResting, setIsResting] = useState<boolean>(false);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number>(120);

  // Family caregivers linked to patient
  const caregivers: LovedOne[] = React.useMemo(() => {
    try {
      const all = LovedOnesService.getLovedOnes(patientId);
      return all.filter(
        (l) =>
          l.relationship.toLowerCase().includes('caregiver') ||
          Boolean(l.phoneNumber || l.whatsappNumber || l.phone)
      );
    } catch {
      return [];
    }
  }, [patientId]);

  // Phase 3.6: Auto-persist active session progress for interrupted task recovery (Phase D)
  useEffect(() => {
    if (!isOpen) return;
    RoutineSessionService.saveActiveSession({
      sessionId: sessionStartTimeRef.current,
      patientId,
      routineId: routine.id,
      routineTitle: routine.title,
      currentStepIndex,
      completedStepIndices: Array.from(completedSteps),
      stepHintTiers,
      stepAssistance,
      secondsRemaining,
      isResting,
      restSecondsRemaining,
      viewMode,
      startedAt: sessionStartTimeRef.current,
      lastUpdatedAt: new Date().toISOString(),
    });
  }, [
    isOpen,
    patientId,
    routine.id,
    routine.title,
    currentStepIndex,
    completedSteps,
    stepHintTiers,
    stepAssistance,
    secondsRemaining,
    isResting,
    restSecondsRemaining,
    viewMode,
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && secondsRemaining > 0) {
      lastTickRef.current = Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        const deltaSeconds = Math.max(1, Math.round((now - lastTickRef.current) / 1000));
        lastTickRef.current = now;

        setSecondsRemaining((prev) => {
          const nextSecs = Math.max(0, prev - deltaSeconds);

          // Gentle 2-minute warning
          if (nextSecs <= 120 && nextSecs > 0 && !hasWarnedTwoMinutes) {
            setHasWarnedTwoMinutes(true);
            audioSynthesizer.playTone(523.25, 0.2);
            SpeechService.speak(
              getGuidedRunnerText(language).twoMinWarningSpeech,
              () => {},
              () => {},
              SpeechService.getBCP47(language)
            );
          }

          // Timer expiry at 0:00:
          // Crucial rule: NEVER auto-completes task, NEVER auto-ticks steps, NEVER updates progress ring!
          if (nextSecs === 0) {
            setIsTimerRunning(false);
            audioSynthesizer.playChime('chime');
            SpeechService.speak(
              getGuidedRunnerText(language).timerDoneSpeech,
              () => {},
              () => {},
              SpeechService.getBCP47(language)
            );
            return 0;
          }

          return nextSecs;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining, hasWarnedTwoMinutes, language]);

  // 2-Minute Rest Interval
  useEffect(() => {
    let restInterval: NodeJS.Timeout;
    if (isResting && restSecondsRemaining > 0) {
      restInterval = setInterval(() => {
        setRestSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsResting(false);
            audioSynthesizer.playTone(523.25, 0.3);
            SpeechService.speak(
              getGuidedRunnerText(language).restEndSpeech,
              () => {},
              () => {},
              SpeechService.getBCP47(language)
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(restInterval);
  }, [isResting, restSecondsRemaining, language]);

  const handleStartRest = () => {
    setIsTimerRunning(false);
    setIsResting(true);
    setRestSecondsRemaining(120);
    audioSynthesizer.playTone(440, 0.3);
    SpeechService.speak(
      getGuidedRunnerText(language).restStartSpeech,
      () => {},
      () => {},
      SpeechService.getBCP47(language)
    );
  };

  const handleEndRest = () => {
    setIsResting(false);
    SpeechService.cancelSpeech();
  };

  if (!isOpen) return null;

  const runnerUi = getGuidedRunnerText(language);
  const translatedTitle = getTranslatedRoutineTitle(routine, t, language);
  const currentStepText = steps[currentStepIndex] || steps[0] || '1. Take a calm breath and begin.';

  // Helper to extract 2-3 micro-actions for the active step
  const getMicroActions = (stepText: string): string[] => {
    return getTranslatedMicroActions(stepText, translatedTitle, routine.category, language);
  };

  const getSimplifiedExplanation = (stepText: string): string => {
    return getTranslatedSimplifiedExplanation(stepText, language);
  };

  const getAshaReassurance = (): string => {
    return getTranslatedAshaReassurance(translatedTitle, language);
  };

  const progressiveHints = getStepProgressiveHints(currentStepText, routine.title, routine.category, language);

  const handleRequestProgressiveHint = () => {
    const nextTier = (hintTier === 0 ? 1 : hintTier === 1 ? 2 : 3) as 1 | 2 | 3;
    setHintTier(nextTier);
    setHintsUsedCount((prev) => prev + 1);
    setStepHintTiers((prev) => ({
      ...prev,
      [currentStepIndex]: Math.max(prev[currentStepIndex] || 0, nextTier) as 1 | 2 | 3,
    }));

    const hintText =
      nextTier === 1
        ? progressiveHints.tier1
        : nextTier === 2
        ? progressiveHints.tier2
        : progressiveHints.tier3;

    setStuckAdvice(hintText);
    handleReadAloud(hintText);
    audioSynthesizer.playTone(523.25, 0.15);
  };

  const handleAskAshaForHelp = () => {
    setAssistanceRequested(true);
    setStepAssistance((prev) => ({
      ...prev,
      [currentStepIndex]: true,
    }));
    setIndependenceLevel('supported');
    const msg = getTranslatedAskAshaHelpMsg(translatedTitle, language);
    setStuckAdvice(msg);
    handleReadAloud(msg);
    audioSynthesizer.playTone(440, 0.2);
  };

  const handleCloseOrAbandon = () => {
    if (requireActionConfirmations && (completedSteps.size > 0 || isTimerRunning)) {
      setShowExitConfirmModal(true);
      return;
    }
    executeCloseAndSave();
  };

  const executeCloseAndSave = () => {
    const elapsed = initialSeconds - secondsRemaining;
    if (completedSteps.size < steps.length) {
      RoutineSessionService.saveActiveSession({
        sessionId: sessionStartTimeRef.current || `rt_sess_${Date.now()}`,
        patientId,
        routineId: routine.id,
        routineTitle: routine.title,
        currentStepIndex,
        completedStepIndices: Array.from(completedSteps),
        stepHintTiers,
        stepAssistance,
        secondsRemaining,
        isResting,
        restSecondsRemaining,
        viewMode,
        startedAt: new Date(Date.now() - Math.max(0, timerDuration - secondsRemaining) * 1000).toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      });
    }

    if (elapsed >= 10 && completedSteps.size < steps.length) {
      AdaptiveSupportService.recordObservation({
        id: `obs_rt_aband_${routine.id}_${Date.now()}`,
        patientId,
        activityId: routine.id,
        activityTitle: routine.title,
        activityType: 'routine',
        timestamp: new Date().toISOString(),
        sessionId: sessionStartTimeRef.current,
        assistanceRequested,
        hintsUsedCount,
        repeatedInstructionCount: repeatedInstructionsCount,
        completionStatus: 'abandoned',
        pauseCount: isResting ? 1 : 0,
        durationSeconds: Math.max(10, elapsed),
        isInterrupted: false,
        currentLevel: independenceLevel,
        patientFeedback: 'session_abandoned_incomplete',
      }).catch(() => {});
    }
    SpeechService.cancelSpeech();
    setShowExitConfirmModal(false);
    onClose();
  };

  const handleCloseWithoutSaving = () => {
    RoutineSessionService.clearActiveSession(patientId, routine.id);
    SpeechService.cancelSpeech();
    setShowExitConfirmModal(false);
    onClose();
  };

  const handleReadAloud = (text: string) => {
    setIsSpeaking(true);
    setRepeatedInstructionsCount((c) => c + 1);
    SpeechService.speak(
      text,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      SpeechService.getBCP47(language)
    );
  };

  const handleNextStep = () => {
    SpeechService.cancelSpeech();
    setHintTier(0);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    SpeechService.cancelSpeech();
    setHintTier(0);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const toggleStepCheckbox = (idx: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
        audioSynthesizer.playTone(587.33, 0.2);
      }
      return next;
    });
  };

  const handlePresetTimer = (mins: number) => {
    const totalSecs = mins * 60;
    setTimerDuration(totalSecs);
    setSecondsRemaining(totalSecs);
    setIsTimerRunning(true);
    setHasWarnedTwoMinutes(false);
    lastTickRef.current = Date.now();
    audioSynthesizer.playTone(440, 0.15);
  };

  const handleExtendTimer = (extraMins: number = 5) => {
    setTimerDuration((prev) => prev + extraMins * 60);
    setSecondsRemaining((prev) => prev + extraMins * 60);
    setIsTimerRunning(true);
    lastTickRef.current = Date.now();
    audioSynthesizer.playChime('chime');
  };

  // Open confirmation modal for finish
  const handleRequestFinish = () => {
    SpeechService.cancelSpeech();
    setShowConfirmFinishModal(true);
  };

  const handleConfirmFinish = (
    completionType: 'self' | 'with_help' | 'partial' | 'uncertain' = 'self'
  ) => {
    SpeechService.cancelSpeech();
    audioSynthesizer.playChime('fanfare');

    const isAssisted =
      completionType === 'with_help' ||
      assistanceRequested ||
      stuckAdvice !== null ||
      showStuckModal;

    // Stage 3 Phase B: Log structured completion observation
    const elapsed = initialSeconds - secondsRemaining;
    AdaptiveSupportService.recordObservation({
      id: `obs_rt_${routine.id}_${Date.now()}`,
      patientId,
      activityId: routine.id,
      activityTitle: routine.title,
      activityType: 'routine',
      timestamp: new Date().toISOString(),
      sessionId: sessionStartTimeRef.current,
      assistanceRequested: isAssisted,
      hintsUsedCount: Math.max(hintsUsedCount, stuckAdvice !== null ? 1 : 0),
      repeatedInstructionCount: repeatedInstructionsCount,
      completionStatus: 'completed',
      pauseCount: isResting ? 1 : 0,
      durationSeconds: Math.max(15, elapsed),
      isInterrupted: false,
      currentLevel: independenceLevel,
    }).catch(() => {});

    // Phase 3.1: Task Accountability & Instance Completion
    const today = new Date().toISOString().split('T')[0];
    const instanceId = `inst_${routine.id}_${today}`;
    TaskLifecycleService.recordInstanceCompletion(
      patientId,
      instanceId,
      {
        reportedBy: 'patient',
        completionType,
        verifiedMethod: 'none',
      },
      challengeResult
    );

    // Phase 3.3: Record authentic step-level telemetry in StepPatternService
    const nowStr = new Date().toISOString();
    const stepTelemetry: StepTelemetry[] = steps.map((desc, idx) => {
      const hintUsed = (stepHintTiers[idx] || 0) as 0 | 1 | 2 | 3;
      const assisted = !!stepAssistance[idx] || isAssisted;
      const isChecked = completedSteps.has(idx);

      let state: StepInteractionState = 'NOT_ATTEMPTED';
      if (assisted) {
        state = 'ASSISTED';
      } else if (hintUsed > 0) {
        state = 'HINT_USED';
      } else if (isChecked) {
        state = 'INDEPENDENT';
      }

      const stepDuration = Math.round(elapsed / (steps.length || 1));

      return {
        stepIndex: idx,
        stepTitle: desc,
        state,
        hintTierUsed: hintUsed,
        assistanceRequested: assisted,
        durationSeconds: stepDuration,
        timestamp: nowStr,
      };
    });

    StepPatternService.recordStepExecution(
      patientId,
      routine.id,
      routine.title,
      stepTelemetry,
      {
        scheduledTime: routine.scheduledTime,
        openedAt: sessionStartTimeRef.current,
        delayMinutes: 0,
        isInitiationDelayed: false,
        initiationReason: 'on_time',
      }
    );

    // Evaluate step patterns and auto-propose simplifications or challenges
    try {
      const patterns = StepPatternService.analyzeStepPatterns(patientId, routine.id, steps.length);
      for (const p of patterns) {
        if (p.classification === 'frequent_hint' || p.classification === 'assistance_needed') {
          StepPatternService.generateStepSimplification(patientId, routine.id, routine.title, p, steps[p.stepIndex]);
        } else if (p.classification === 'mastered') {
          StepPatternService.generateStepChallenge(patientId, routine.id, routine.title, p, steps[p.stepIndex], routine.category);
        }
      }
    } catch {
      // Non-critical pattern evaluation
    }

    // Priority 2: Record 8-state step-level execution
    const stepExecutions: StepExecutionRecord[] = steps.map((desc, idx) => ({
      stepIndex: idx,
      stepDescription: desc,
      state: completedSteps.has(idx)
        ? isAssisted
          ? 'COMPLETED_WITH_VERBAL_GUIDE'
          : 'COMPLETED_INDEPENDENTLY'
        : 'NOT_ATTEMPTED',
      assistanceLevel: isAssisted ? 'verbal_guide' : 'none',
      durationSeconds: Math.round(elapsed / (steps.length || 1)),
      timestamp: new Date().toISOString(),
    }));

    AdaptiveSupportService.recordRoutineExecution({
      id: `rt_exec_${routine.id}_${Date.now()}`,
      routineId: routine.id,
      patientId,
      routineTitle: routine.title,
      scheduledTime: routine.scheduledTime,
      steps: stepExecutions,
      overallState:
        completedSteps.size === steps.length
          ? isAssisted
            ? 'COMPLETED_WITH_VERBAL_GUIDE'
            : 'COMPLETED_INDEPENDENTLY'
          : 'COMPLETED_WITH_REMINDER',
      completedAt: new Date().toISOString(),
    }).catch(() => {});

    RoutineSessionService.clearActiveSession(patientId, routine.id);
    onFinish(routine.id);
    setShowConfirmFinishModal(false);
    onClose();
  };

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleStuckResponse = (choice: 'started' | 'step1' | 'step2' | 'forgot' | 'caregiver') => {
    RoutineService.recordDifficultyFeedback(patientId, routine.id, choice);

    // Stage 3 Phase B: Record struggle observation to evaluate support proposals
    const elapsed = initialSeconds - secondsRemaining;
    AdaptiveSupportService.recordObservation({
      id: `obs_stuck_${routine.id}_${Date.now()}`,
      patientId,
      activityId: routine.id,
      activityTitle: routine.title,
      activityType: 'routine',
      timestamp: new Date().toISOString(),
      sessionId: `rt_sess_stuck_${Date.now()}`,
      assistanceRequested: true,
      hintsUsedCount: 1,
      repeatedInstructionCount: choice === 'forgot' ? 1 : 0,
      completionStatus: 'incomplete',
      pauseCount: choice === 'caregiver' ? 1 : 0,
      durationSeconds: Math.max(15, elapsed),
      isInterrupted: false,
      currentLevel: activeProposal?.domain || 'standard_steps',
      patientFeedback: `stuck_${choice}`,
    }).then((res) => {
      if (res.proposalGenerated) {
        setPendingProposal(res.proposalGenerated);
      }
    }).catch(() => {});

    const advice = getTranslatedStuckChoiceAdvice(choice, translatedTitle, currentStepText, language);
    switch (choice) {
      case 'started':
        setCurrentStepIndex(0);
        setStuckAdvice(advice);
        handleReadAloud(advice);
        break;
      case 'step1':
        setCurrentStepIndex(1);
        setStuckAdvice(advice);
        handleReadAloud(advice);
        break;
      case 'step2':
        setCurrentStepIndex(Math.min(2, steps.length - 1));
        setStuckAdvice(advice);
        handleReadAloud(advice);
        break;
      case 'forgot':
        setStuckAdvice(advice);
        handleReadAloud(advice);
        break;
      case 'caregiver':
        setStuckAdvice(advice);
        handleReadAloud(advice);
        break;
    }
    setShowStuckModal(false);
  };

  const timerPercent = timerDuration > 0 ? (secondsRemaining / timerDuration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="runner-task-title"
    >
      <div className="bg-white max-w-lg w-full rounded-3xl p-4 sm:p-6 shadow-2xl border-2 border-purple-200 my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
        {/* Pinned Header (Screenshot 2) */}
        <div className="flex justify-between items-center border-b border-purple-100 pb-3 flex-shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-lg sm:text-xl shadow-xs shrink-0">
              <ListCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                {getTranslatedRoutineCategory(routine.category, language).toUpperCase()} • {getTranslatedScheduleTime(routine.scheduledTime, language)}
              </span>
              <span className="sr-only">{runnerUi.srHeaderTitle}</span>
              <h3 id="runner-task-title" className="text-base sm:text-lg font-black text-slate-900 font-heading mt-0.5 leading-snug line-clamp-1">
                {translatedTitle}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseOrAbandon}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-xl font-bold flex items-center justify-center transition shrink-0 cursor-pointer"
            aria-label={runnerUi.closeRunnerAria}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase 3.6: Interrupted Task Session Recovery Banner (Phase D) */}
        {hasInterruptedSession && savedSession && (
          <div
            data-testid="interrupted-session-recovery-banner"
            className="p-3 bg-purple-50 rounded-2xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-purple-950 mt-2 mb-1"
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-700 shrink-0" />
              <div>
                <p className="font-bold text-slate-900">
                  {t('routines.runner_welcome_back', {
                    done: savedSession.completedStepIndices.length,
                    total: steps.length,
                  })}
                </p>
                <p className="text-slate-600 text-2xs">
                  {runnerUi.welcomeBackSub}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                data-testid="btn-resume-interrupted-session"
                onClick={() => {
                  setCurrentStepIndex(savedSession.currentStepIndex);
                  setCompletedSteps(new Set(savedSession.completedStepIndices));
                  setStepHintTiers(savedSession.stepHintTiers || {});
                  setStepAssistance(savedSession.stepAssistance || {});
                  setSecondsRemaining(savedSession.secondsRemaining || initialSeconds);
                  setHasInterruptedSession(false);
                }}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition cursor-pointer min-h-[32px]"
              >
                {runnerUi.resumeStep} {savedSession.currentStepIndex + 1}
              </button>
              <button
                type="button"
                data-testid="btn-restart-fresh-session"
                onClick={() => {
                  RoutineSessionService.clearActiveSession(patientId, routine.id);
                  setCurrentStepIndex(0);
                  setCompletedSteps(new Set());
                  setStepHintTiers({});
                  setStepAssistance({});
                  setHasInterruptedSession(false);
                }}
                className="px-2.5 py-1 bg-white hover:bg-purple-50 text-slate-700 font-semibold border border-purple-200 rounded-xl text-xs transition cursor-pointer min-h-[32px]"
              >
                {runnerUi.startFresh}
              </button>
            </div>
          </div>
        )}

        {/* 4-Level Adaptive Independence Selector */}
        <div
          data-testid="routine-independence-selector"
          className="flex items-center gap-1 p-1 bg-purple-50/90 rounded-2xl border border-purple-200 mt-2 mb-1 text-2xs sm:text-xs font-bold shrink-0"
        >
          <button
            type="button"
            data-testid="ind-level-supported"
            onClick={() => {
              setIndependenceLevel('supported');
              audioSynthesizer.playTone(440, 0.1);
            }}
            className={`flex-1 py-1 px-1.5 rounded-xl text-center transition cursor-pointer ${
              independenceLevel === 'supported'
                ? 'bg-purple-600 text-white shadow-xs font-black'
                : 'text-purple-900 hover:bg-purple-100/60'
            }`}
          >
            {runnerUi.levelSupported}
          </button>
          <button
            type="button"
            data-testid="ind-level-guided"
            onClick={() => {
              setIndependenceLevel('guided');
              audioSynthesizer.playTone(523.25, 0.1);
            }}
            className={`flex-1 py-1 px-1.5 rounded-xl text-center transition cursor-pointer ${
              independenceLevel === 'guided'
                ? 'bg-purple-600 text-white shadow-xs font-black'
                : 'text-purple-900 hover:bg-purple-100/60'
            }`}
          >
            {runnerUi.levelGuided}
          </button>
          <button
            type="button"
            data-testid="ind-level-independent"
            onClick={() => {
              setIndependenceLevel('independent');
              setShowIndependentClue(false);
              audioSynthesizer.playTone(587.33, 0.1);
            }}
            className={`flex-1 py-1 px-1.5 rounded-xl text-center transition cursor-pointer ${
              independenceLevel === 'independent'
                ? 'bg-purple-600 text-white shadow-xs font-black'
                : 'text-purple-900 hover:bg-purple-100/60'
            }`}
          >
            {runnerUi.levelIndependent}
          </button>
          <button
            type="button"
            data-testid="ind-level-challenge"
            onClick={() => {
              setIndependenceLevel('challenge');
              audioSynthesizer.playTone(659.25, 0.15);
            }}
            className={`flex-1 py-1 px-1.5 rounded-xl text-center transition cursor-pointer ${
              independenceLevel === 'challenge'
                ? 'bg-amber-500 text-white shadow-xs font-black'
                : 'text-amber-900 hover:bg-amber-100/60'
            }`}
          >
            {runnerUi.levelChallenge}
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 space-y-3 pr-1 py-3" style={{ overscrollBehavior: 'contain' }}>
          {/* Level Guidance Banners */}
          {independenceLevel === 'supported' && (
            <div
              data-testid="supported-mode-active-banner"
              className="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-2 font-medium"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{runnerUi.supportedBanner}</span>
              </div>
              {assistanceRequested && (
                <span className="text-2xs font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  {runnerUi.inSessionAdaptation}
                </span>
              )}
            </div>
          )}

          {independenceLevel === 'independent' && (
            <div className="p-2.5 bg-indigo-50 rounded-2xl border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between gap-2 font-medium">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{runnerUi.independentBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIndependentClue((prev) => !prev)}
                className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-2xs font-bold hover:bg-indigo-200 cursor-pointer"
              >
                {showIndependentClue ? runnerUi.hideClue : runnerUi.needClue}
              </button>
            </div>
          )}

          {independenceLevel === 'challenge' && (
            <div
              data-testid="safe-challenge-card"
              className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-300 text-xs text-amber-950 space-y-2 shadow-xs animate-in fade-in"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold">{runnerUi.challengeTitle}</span>
                </div>
                <button
                  type="button"
                  data-testid="restore-guided-btn"
                  onClick={() => {
                    setIndependenceLevel('guided');
                    audioSynthesizer.playTone(523.25, 0.1);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-2xs font-extrabold shrink-0 shadow-2xs transition cursor-pointer"
                >
                  {runnerUi.restoreGuided}
                </button>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                {formatGuidedTemplate(runnerUi.challengeDescTemplate, { step: currentStepIndex + 1 })}
              </p>
            </div>
          )}
          {/* Daily Condition Adaptation Banner */}
          {DailyWellbeingService.isAdaptedForFatigue(patientId) && (
            <div className="p-2.5 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {runnerUi.shorterGuidanceBanner}
              </span>
              <button
                type="button"
                onClick={handleRestoreFamiliar}
                className="text-[11px] font-bold text-purple-700 underline hover:text-purple-900 cursor-pointer"
              >
                {runnerUi.restore}
              </button>
            </div>
          )}

          {/* Stage 3 Phase B: Pending Adaptive Support Recommendation Banner */}
          {pendingProposal && (
            <div
              data-testid="routine-adaptive-proposal-banner"
              className="p-3 bg-blue-50/90 rounded-2xl border border-blue-200 text-[11px] sm:text-xs text-blue-950 font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs animate-in fade-in"
            >
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  {getTranslatedCalmProposalExplanation(
                    pendingProposal.calmExplanation,
                    pendingProposal.rationale,
                    language
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    const text = getTranslatedCalmProposalExplanation(
                      pendingProposal.calmExplanation,
                      pendingProposal.rationale,
                      language
                    );
                    handleReadAloud(text);
                  }}
                  className="p-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  title={runnerUi.listenAshaAria}
                  aria-label={runnerUi.listenAshaAria}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  data-testid="routine-accept-smaller-steps-btn"
                  onClick={async () => {
                    const result = await AdaptiveSupportService.recordPatientChoice(
                      patientId,
                      pendingProposal.id,
                      'accepted'
                    );
                    if (result.status === 'activated') {
                      setActiveProposal(
                        AdaptiveSupportService.getActiveProposalForActivity(patientId, routine.id)
                      );
                    }
                    setPendingProposal(null);
                  }}
                  className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-2xs font-bold hover:bg-blue-700 transition cursor-pointer"
                >
                  {runnerUi.yesSmallerSteps}
                </button>
                <button
                  type="button"
                  data-testid="routine-keep-familiar-btn"
                  onClick={async () => {
                    await AdaptiveSupportService.recordPatientChoice(
                      patientId,
                      pendingProposal.id,
                      'keep_familiar'
                    );
                    setPendingProposal(null);
                  }}
                  className="px-2 py-1 bg-white text-gray-700 border border-gray-300 rounded-lg text-2xs font-semibold hover:bg-gray-100 transition cursor-pointer"
                >
                  {runnerUi.keepFamiliar}
                </button>
              </div>
            </div>
          )}

          {/* Priority 2: Reversible Challenge Banner with 1-Tap Instant Restore */}
          {reversibleChallenge && reversibleChallenge.isChallengeActive && (
            <div
              data-testid="reversible-challenge-banner"
              className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-center justify-between gap-2"
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold">{runnerUi.gentleChallengeActive}</span>
                  <span>{reversibleChallenge.rationale}</span>
                </div>
              </div>
              <button
                type="button"
                data-testid="restore-familiar-routine-btn"
                onClick={handleRestoreFamiliar}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-2xs font-extrabold shrink-0 shadow-xs transition cursor-pointer"
              >
                {runnerUi.restoreFamiliarTap}
              </button>
            </div>
          )}

          {/* Reassurance Banner (Screenshot 2) */}
          <div className="p-3 bg-purple-50/80 rounded-2xl border border-purple-200 text-[11px] sm:text-xs text-purple-950 font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-700 shrink-0" />
            <span>
              {runnerUi.reassuranceBanner}
            </span>
          </div>

          {/* 15-Minute Countdown Timer & Progress Bar (Screenshot 2) */}
          <div className="bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 p-3.5 sm:p-4 rounded-2xl border border-purple-500/30 text-white shadow-md space-y-2.5">
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center space-x-2 shrink-0">
                <span className={`w-2.5 h-2.5 rounded-full ${isTimerRunning ? (reducedMotion ? 'bg-emerald-400' : 'bg-emerald-400 animate-pulse') : 'bg-gray-400'}`} />
                <span className="text-[11px] sm:text-xs font-bold text-purple-200 uppercase tracking-wider">
                  {runnerUi.timerHeader}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handlePresetTimer(10)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-purple-400/40 hover:bg-white/10 text-purple-200 cursor-pointer"
                >
                  {runnerUi.min10}
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetTimer(15)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-purple-400/60 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 cursor-pointer"
                >
                  {runnerUi.min15}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {formatTimer(secondsRemaining)}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-purple-300">
                  {isTimerRunning ? runnerUi.remaining : runnerUi.paused}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleExtendTimer(5)}
                  className={`px-3 py-2 ${touchTargetClass} bg-slate-700/80 hover:bg-slate-600 text-amber-300 rounded-xl text-xs font-bold border border-slate-600 flex items-center gap-1 cursor-pointer`}
                  title={runnerUi.extend5Title}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-300" /> {runnerUi.extend5Label}
                </button>
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-3.5 py-2 ${touchTargetClass} text-slate-950 rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 cursor-pointer ${
                    isTimerRunning ? 'bg-amber-400 hover:bg-amber-300' : 'bg-emerald-400 hover:bg-emerald-300'
                  }`}
                  title={isTimerRunning ? runnerUi.pauseTitle : runnerUi.resumeTitle}
                >
                  {isTimerRunning ? <Pause className="w-3.5 h-3.5 text-slate-950" /> : <Play className="w-3.5 h-3.5 text-slate-950" />}
                  <span>{isTimerRunning ? runnerUi.pauseBtn : runnerUi.resumeBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={isResting ? handleEndRest : handleStartRest}
                  className={`px-3 py-2 ${touchTargetClass} rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                    isResting
                      ? `bg-emerald-500/30 border-emerald-400 text-emerald-200 ${reducedMotion ? '' : 'animate-pulse'}`
                      : 'bg-slate-700/80 hover:bg-slate-600 text-pink-300 border-slate-600'
                  }`}
                  title={isResting ? runnerUi.endRestTitle : runnerUi.takeRestTitle}
                  aria-label={isResting ? runnerUi.endRestAria : runnerUi.takeRestAria}
                >
                  <Heart className={`w-3.5 h-3.5 ${isResting ? (reducedMotion ? 'text-emerald-300' : 'text-emerald-300 animate-bounce') : 'text-pink-300'}`} />
                  <span>{isResting ? `${Math.floor(restSecondsRemaining / 60)}:${(restSecondsRemaining % 60).toString().padStart(2, '0')}` : t('routines.runner_rest_2m')}</span>
                </button>
                <button
                  type="button"
                  data-testid="ask-asha-help-runner-btn"
                  onClick={handleAskAshaForHelp}
                  className="px-3.5 py-2 min-h-[44px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 cursor-pointer"
                  aria-label={runnerUi.askAshaAria}
                  title={runnerUi.askAshaTitle}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{runnerUi.askAshaBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStuckModal(true)}
                  className="px-3.5 py-2 min-h-[44px] bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 cursor-pointer"
                  aria-label={runnerUi.stuckAria}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-white" />
                  <span className="sr-only">{runnerUi.stuckAria}</span>
                  <span aria-hidden="true">{runnerUi.stuckBtn}</span>
                </button>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-400 to-indigo-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${timerPercent}%` }}
              />
            </div>

            {/* 2-Minute Gentle Warning Banner */}
            {secondsRemaining <= 120 && secondsRemaining > 0 && (
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>{runnerUi.twoMinWarningBanner}</span>
              </div>
            )}

            {/* Timer Expired Banner (Zero Auto-Complete) */}
            {secondsRemaining === 0 && (
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <Info className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span>{runnerUi.timerDoneBanner}</span>
              </div>
            )}

            {/* Calming 2-Minute Rest Mode Banner */}
            {isResting && (
              <div
                className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-purple-950/70 to-slate-900 border border-emerald-400/50 text-emerald-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner animate-in fade-in"
                role="region"
                aria-label={runnerUi.restBannerAria}
                data-testid="calming-rest-banner"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 animate-pulse">
                    <Heart className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">{runnerUi.restBannerTitle}</h5>
                    <p className="text-[11px] text-emerald-300">
                      {runnerUi.restBannerDesc}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleEndRest}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shrink-0"
                >
                  {runnerUi.resumeNow}
                </button>
              </div>
            )}

            {/* Pause & Rest Banner */}
            {!isTimerRunning && !isResting && secondsRemaining > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between">
                <span>{runnerUi.pausedBanner}</span>
              </div>
            )}
          </div>

          {/* Mode Switcher pill (Step-by-Step Card vs Full Checklist) */}
          <div className="flex items-center justify-between bg-purple-50/60 border border-purple-100 p-1 rounded-xl text-xs">
            <span className="text-[11px] font-bold text-purple-900/80 pl-1">{t('routines.runner_mode_display')}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`py-1 px-2.5 rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'single'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-800 hover:text-purple-950'
                }`}
              >
                <Layout className="w-3 h-3" />
                <span>{t('routines.runner_mode_single')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('checklist')}
                className={`py-1 px-2.5 rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'checklist'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-800 hover:text-purple-950'
                }`}
              >
                <ListCheck className="w-3 h-3" />
                <span>{t('routines.runner_mode_checklist')}</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: Single Step Card */}
          {viewMode === 'single' && (
            <div className="bg-gradient-to-br from-purple-50/30 via-white to-purple-50/20 rounded-2xl p-4 sm:p-5 border border-purple-100 shadow-inner space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-800 bg-white px-2.5 py-1 rounded-md border border-purple-200 shadow-2xs">
                  {t('routines.runner_step_of', { step: currentStepIndex + 1, total: steps.length })}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleReadAloud(currentStepText)}
                    className="px-3.5 py-2 min-h-[44px] text-xs font-bold text-purple-800 bg-white border border-purple-200 rounded-xl hover:bg-purple-50 transition flex items-center gap-1.5 cursor-pointer"
                    aria-label={runnerUi.repeatAria}
                    title={runnerUi.repeatTitle}
                  >
                    <Volume2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>{t('routines.runner_repeat_instruction')}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="progressive-hint-btn"
                    onClick={handleRequestProgressiveHint}
                    className="px-3.5 py-2 min-h-[44px] text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition flex items-center gap-1.5 cursor-pointer"
                    aria-label={runnerUi.giveHintAria}
                    title={runnerUi.giveHintTitle}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>{hintTier === 0 ? t('routines.runner_give_hint') : t('routines.runner_hint_tier', { tier: hintTier })}</span>
                  </button>
                </div>
              </div>

              {/* Asha In-Task Visual Guidance Banner */}
              <div
                data-testid="asha-in-task-guidance"
                className="bg-gradient-to-r from-rose-50/80 via-purple-50/80 to-pink-50/80 p-3 rounded-2xl border border-purple-200/80 flex items-center gap-3 shadow-2xs"
              >
                <div className="shrink-0">
                  <CharacterVisualizer characterId="asha" mode="compact" size={44} expression="guiding" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-purple-950">{t('ai.companion_asha')}</span>
                    <span className="text-[9px] font-bold text-rose-700 bg-white/90 px-1.5 py-0.2 rounded-full border border-rose-200">
                      {t('routines.runner_asha_guidance', { step: currentStepIndex + 1 })}
                    </span>
                  </div>
                  <p className="text-xs text-purple-900 font-medium mt-0.5 leading-relaxed">
                    "{t('routines.runner_asha_guidance_text')}"
                  </p>
                </div>
              </div>

              {/* Phase 3.1: Gentle Memory Recall Challenge (Optional) */}
              {currentStepIndex === 0 && routine.enableAssistedRecall && (
                <MemoryChallengeCard
                  taskId={routine.id}
                  taskTitle={translatedTitle}
                  patientId={patientId}
                  language={language}
                  config={{
                    enabled: true,
                    challengeType: 'next_step',
                    promptQuestion: formatGuidedTemplate(runnerUi.memoryPromptTemplate, { title: translatedTitle }),
                    stepOptions: steps.slice(0, 3),
                    correctOptionIndex: 0,
                  }}
                  onChallengeComplete={(res) => setChallengeResult(res)}
                />
              )}

              {/* Phase 3.3: Familiarity-Preserving Challenge Card (C3) */}
              {currentStepChallenge && !currentStepChallenge.isSafetyLocked && !revealedStepChallenges.has(currentStepIndex) ? (
                <div
                  data-testid="step-challenge-card"
                  className="p-3.5 bg-amber-50/95 rounded-2xl border-2 border-amber-300 text-xs text-amber-950 space-y-2.5 shadow-xs animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs">
                      {runnerUi.challengeCardHeader}
                    </span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold border border-amber-300">
                      {runnerUi.synapticRecall}
                    </span>
                  </div>
                  <p className="font-semibold text-xs leading-relaxed text-amber-950">
                    {currentStepChallenge.promptQuestion}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRevealedStepChallenges((prev) => new Set(prev).add(currentStepIndex));
                        audioSynthesizer.playTone(440, 0.15);
                        if (currentStepChallenge) {
                          StepPatternService.updateChallengeStatus(
                            patientId,
                            currentStepChallenge.id,
                            'reverted',
                            'patient'
                          );
                        }
                      }}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition flex items-center gap-1"
                    >
                      {runnerUi.revealStepBtn}
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  data-testid="guided-current-step-text"
                  className={`${stepTextSizeClass} text-slate-900 leading-relaxed`}
                >
                  "{currentStepText}"
                </p>
              )}

              {/* Phase 3.3: Targeted Step Simplification Card (C2) */}
              {currentStepSimplification && (
                <div
                  data-testid="step-simplification-card"
                  className="p-3.5 bg-indigo-50/90 rounded-2xl border-2 border-indigo-200 text-xs text-indigo-950 space-y-2 shadow-xs animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-indigo-900 flex items-center gap-1.5 text-xs">
                      {runnerUi.microActionsStepHeader} {currentStepIndex + 1}
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold border border-indigo-200">
                      {runnerUi.comfortGuide}
                    </span>
                  </div>
                  <div className="space-y-1 pl-1">
                    {currentStepSimplification.proposedMicroActions.map((ma, mIdx) => (
                      <div key={mIdx} className="text-indigo-950 font-medium flex items-start gap-1.5">
                        <span className="text-indigo-600 font-bold shrink-0">•</span>
                        <span>{ma}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-indigo-800 font-medium italic pt-0.5">
                    {currentStepSimplification.contextualCue}
                  </p>
                </div>
              )}

              {/* Phase 2.9: 3-Tier Progressive Hint Card */}
              {hintTier > 0 && (
                <div
                  data-testid="progressive-hint-card"
                  className="p-3.5 bg-amber-50/90 rounded-2xl border-2 border-amber-300 text-xs text-amber-950 space-y-2 shadow-xs animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span
                      data-testid="progressive-hint-tier-badge"
                      className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-amber-200 text-amber-900 border border-amber-300 uppercase tracking-wider"
                    >
                      {hintTier === 1
                        ? runnerUi.tier1Badge
                        : hintTier === 2
                        ? runnerUi.tier2Badge
                        : runnerUi.tier3Badge}
                    </span>
                    <span className="text-[11px] text-amber-800 font-bold">
                      {formatGuidedTemplate(runnerUi.hintCounterTemplate, { tier: hintTier })}
                    </span>
                  </div>

                  <p className="font-semibold text-xs leading-relaxed text-amber-950">
                    {hintTier === 1
                      ? progressiveHints.tier1
                      : hintTier === 2
                      ? progressiveHints.tier2
                      : progressiveHints.tier3}
                  </p>

                  <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const txt =
                          hintTier === 1
                            ? progressiveHints.tier1
                            : hintTier === 2
                            ? progressiveHints.tier2
                            : progressiveHints.tier3;
                        handleReadAloud(txt);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-2xs flex items-center gap-1 cursor-pointer"
                      aria-label={t('routines.listen_hint')}
                    >
                      <Volume2 className="w-3 h-3 text-amber-800" />
                      <span>{t('routines.listen_hint')}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {hintTier < 3 ? (
                        <button
                          type="button"
                          data-testid="next-hint-tier-btn"
                          onClick={handleRequestProgressiveHint}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-2xs transition cursor-pointer"
                        >
                          {formatGuidedTemplate(runnerUi.nextHintTierTemplate, { tier: hintTier + 1 })}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIndependenceLevel('supported');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-2xs transition cursor-pointer"
                        >
                          {runnerUi.openMicroSteps}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setHintTier(0)}
                        className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 font-semibold text-2xs hover:bg-amber-50 cursor-pointer"
                      >
                        {runnerUi.hide}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Micro-actions Breakdown (Expanded in Supported mode, or on-demand in Independent mode) */}
              {(independenceLevel === 'supported' || (independenceLevel === 'independent' && showIndependentClue)) && (
                <div className="p-3 bg-white/90 rounded-2xl border border-purple-200 space-y-1.5 text-xs text-slate-800 shadow-2xs animate-in fade-in">
                  <span className="font-bold text-purple-900 block text-2xs uppercase tracking-wider">
                    {independenceLevel === 'supported' ? runnerUi.detailedBreakdownLabel : runnerUi.gentleClueLabel}
                  </span>
                  {getMicroActions(currentStepText).map((action, aIdx) => (
                    <div key={aIdx} className="flex items-start gap-2">
                      <span className="text-purple-600 font-bold">•</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={currentStepIndex === 0}
                  className="px-3.5 py-2 min-h-[44px] rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 text-xs font-bold transition flex items-center gap-1.5"
                  aria-label={t('routines.runner_previous_step')}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t('routines.runner_previous_step')}</span>
                </button>
                {currentStepIndex === steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleRequestFinish}
                    className="px-4 py-2 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    aria-label={t('routines.runner_finish_activity')}
                  >
                    <span>{t('routines.runner_finish_activity')}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-4 py-2 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                    aria-label={t('routines.runner_next_step')}
                  >
                    <span>{t('routines.runner_next_step')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: Guided Steps Checklist (Screenshot 2) */}
          {viewMode === 'checklist' && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-slate-600 block pl-0.5">
                {t('routines.runner_tick_steps')}
              </span>
              {steps.map((step, idx) => {
                const isChecked = completedSteps.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleStepCheckbox(idx)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 transition cursor-pointer select-none ${
                      isChecked
                        ? 'bg-purple-50/80 border-purple-200 text-purple-950 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-purple-200 text-slate-800 shadow-xs'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border-2 transition ${
                        isChecked
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1 text-xs sm:text-[13px] leading-relaxed font-semibold">
                      <span className={isChecked ? 'line-through text-slate-400' : 'text-slate-900'}>
                        {step.startsWith(`${idx + 1}.`) ? step : `${idx + 1}. ${step}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Advice / Assistance Feedback */}
          {stuckAdvice && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex items-start space-x-2.5 animate-in fade-in">
              <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-950 font-medium leading-relaxed">{stuckAdvice}</p>
            </div>
          )}
        </div>

        {/* Pinned Action Buttons Footer (Screenshot 2) */}
        <div className="pt-3 border-t border-purple-100 flex flex-col sm:flex-row justify-between items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleReadAloud(steps.join('. '))}
            className={`w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] ${
              isSpeaking
                ? 'bg-purple-600 text-white animate-pulse'
                : 'bg-slate-100 hover:bg-purple-50 text-slate-700'
            }`}
          >
            <Volume2 className="w-4 h-4 text-purple-700" />
            <span>{t('routines.runner_read_aloud')}</span>
          </button>

          <button
            type="button"
            data-testid="runner-complete-btn"
            onClick={handleRequestFinish}
            className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[42px]"
            aria-label={runnerUi.completeTaskAria}
          >
            <CheckCircle2 className="w-4 h-4 text-amber-300" />
            <span>{t('routines.runner_complete_task')}</span>
          </button>
        </div>
      </div>

      {/* Diagnostic Stuck Assistance Modal */}
      {showStuckModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-stuck-title"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border-4 border-purple-300 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-purple-100 pb-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-600 shrink-0" />
                <h3 id="modal-stuck-title" className="text-base font-black text-slate-900 font-heading">
                  {t('routines.runner_stuck_question')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStuckModal(false);
                  setStuckActiveTab('main');
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={runnerUi.closeAssistanceAria}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: Main View with 4 Assistance Options + 4 Checkpoints */}
            {stuckActiveTab === 'main' && (
              <div className="space-y-4">
                {/* 4 Dedicated Assistance Options */}
                <div>
                  <span className="text-[11px] font-black text-purple-800 uppercase tracking-wider block mb-2">
                    Four Calming Ways to Get Help
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Option A: Break step down */}
                    <button
                      type="button"
                      onClick={() => setStuckActiveTab('breakdown')}
                      className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-left transition flex items-start gap-2 cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-purple-700 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-purple-950">{runnerUi.way1Title}</h4>
                        <p className="text-[10px] text-purple-800">{runnerUi.way1Sub}</p>
                      </div>
                    </button>

                    {/* Option B: Explain again */}
                    <button
                      type="button"
                      onClick={() => setStuckActiveTab('explain')}
                      className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/60 hover:bg-sky-100 text-left transition flex items-start gap-2 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4 text-sky-700 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-sky-950">{runnerUi.way2Title}</h4>
                        <p className="text-[10px] text-sky-800">{t('routines.simpler_words')}</p>
                      </div>
                    </button>

                    {/* Option C: Ask Asha */}
                    <button
                      type="button"
                      onClick={() => setStuckActiveTab('asha')}
                      className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-left transition flex items-start gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-700 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-indigo-950">{runnerUi.way3Title}</h4>
                        <p className="text-[10px] text-indigo-800">{t('routines.warm_comfort')}</p>
                      </div>
                    </button>

                    {/* Option D: Ask Caregiver */}
                    <button
                      type="button"
                      onClick={() => setStuckActiveTab('caregiver')}
                      className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-left transition flex items-start gap-2 cursor-pointer"
                    >
                      <Heart className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-rose-950">{runnerUi.way4Title}</h4>
                        <p className="text-[10px] text-rose-800">{runnerUi.way4Sub}</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Quick Checkpoints for test compatibility & fast answers */}
                <div>
                  <p className="text-xs text-slate-600 font-medium mb-1.5">
                    {runnerUi.quickChoicePrompt}
                  </p>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleStuckResponse('started')}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs font-bold text-slate-800 transition cursor-pointer"
                    >
                      1. {runnerUi.choiceStarted}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStuckResponse('step1')}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs font-bold text-slate-800 transition cursor-pointer"
                    >
                      2. {runnerUi.choiceStep1}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStuckResponse('forgot')}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs font-bold text-slate-800 transition cursor-pointer"
                    >
                      3. {runnerUi.choiceForgot}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStuckResponse('caregiver')}
                      className="w-full text-left p-2.5 rounded-xl border border-rose-200 hover:border-rose-400 bg-rose-50/40 text-xs font-bold text-rose-900 transition cursor-pointer"
                    >
                      4. {runnerUi.choiceCaregiver}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB A: Micro-Actions Breakdown */}
            {stuckActiveTab === 'breakdown' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs text-purple-800 font-bold">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>{runnerUi.microActionsStepHeader} {currentStepIndex + 1}</span>
                </div>
                <div className="space-y-2 bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200">
                  {getMicroActions(currentStepText).map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-semibold text-purple-950">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="flex-1 leading-snug">{action}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReadAloud(getMicroActions(currentStepText).join('. '))}
                    className="flex-1 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    aria-label={t('notes.read_aloud')}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{t('notes.read_aloud')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStuckActiveTab('main');
                      setShowStuckModal(false);
                    }}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {runnerUi.back}
                  </button>
                </div>
              </div>
            )}

            {/* TAB B: Explain Again */}
            {stuckActiveTab === 'explain' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs text-sky-800 font-bold">
                  <Volume2 className="w-4 h-4 text-sky-600" />
                  <span>{t('routines.simpler_words')}</span>
                </div>
                <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 text-xs sm:text-sm text-sky-950 font-medium leading-relaxed">
                  "{getSimplifiedExplanation(currentStepText)}"
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReadAloud(getSimplifiedExplanation(currentStepText))}
                    className="flex-1 py-2 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    aria-label={t('notes.read_aloud')}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{t('notes.read_aloud')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStuckActiveTab('main');
                      setShowStuckModal(false);
                    }}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {runnerUi.back}
                  </button>
                </div>
              </div>
            )}

            {/* TAB C: Ask Asha */}
            {stuckActiveTab === 'asha' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs text-purple-800 font-bold">
                  <CharacterVisualizer characterId="asha" mode="compact" size={38} expression="comforting" />
                  <span>{runnerUi.ashaEncouragementHeader}</span>
                </div>
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-xs sm:text-sm text-purple-950 font-medium leading-relaxed">
                  "{getAshaReassurance()}"
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReadAloud(getAshaReassurance())}
                    className="flex-1 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{runnerUi.hearAsha}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStuckActiveTab('main');
                      setShowStuckModal(false);
                    }}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {runnerUi.back}
                  </button>
                </div>
              </div>
            )}

            {/* TAB D: Ask Caregiver */}
            {stuckActiveTab === 'caregiver' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs text-rose-800 font-bold">
                  <Heart className="w-4 h-4 text-rose-600" />
                  <span>{runnerUi.familyCaregiverHeader}</span>
                </div>
                {caregivers.length > 0 ? (
                  <div className="space-y-2">
                    {caregivers.map((cg) => {
                      const phoneNum = cg.phoneNumber || cg.phone || '';
                      const cleanPhone = phoneNum.replace(/[^0-9]/g, '');
                      return (
                        <div
                          key={cg.id}
                          className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <h4 className="text-xs font-black text-slate-900">{cg.name}</h4>
                            <p className="text-[11px] text-rose-800 font-semibold">{cg.relationship}</p>
                            {phoneNum && (
                              <p className="text-[11px] text-slate-600 font-mono mt-0.5">{phoneNum}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {phoneNum && (
                              <a
                                href={`tel:${phoneNum}`}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{runnerUi.callBtn}</span>
                              </a>
                            )}
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>{runnerUi.whatsappBtn}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-950 font-medium leading-relaxed">
                    No caregiver phone number is linked in Loved Ones yet. Take a peaceful resting breath, or ask your family caregiver in person.
                  </div>
                )}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStuckActiveTab('main');
                      setShowStuckModal(false);
                  }}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {runnerUi.back}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Confirmation Modal before marking complete */}
      {showConfirmFinishModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in zoom-in-95 duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-finish-title"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-purple-300 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-purple-600" />
            </div>

            <div className="space-y-1">
              <h3 id="confirm-finish-title" className="text-base font-black text-slate-900 font-heading">
                {formatGuidedTemplate(runnerUi.confirmFinishTitleTemplate, { title: translatedTitle })}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {runnerUi.confirmFinishDesc}
              </p>
            </div>

            <div className="space-y-1.5 pt-1 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                How did you complete it today?
              </span>
              <button
                type="button"
                data-testid="complete-self-btn"
                onClick={() => handleConfirmFinish('self')}
                className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs rounded-xl transition flex items-center justify-between min-h-[42px] cursor-pointer"
              >
                <span>{runnerUi.selfBtn}</span>
                <span className="text-[10px] text-emerald-700">{runnerUi.selfTag}</span>
              </button>
              <button
                type="button"
                data-testid="complete-assisted-btn"
                onClick={() => handleConfirmFinish('with_help')}
                className="w-full py-2.5 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-950 font-bold text-xs rounded-xl transition flex items-center justify-between min-h-[42px] cursor-pointer"
              >
                <span>{runnerUi.assistedBtn}</span>
                <span className="text-[10px] text-purple-700">{runnerUi.assistedTag}</span>
              </button>
              <button
                type="button"
                data-testid="complete-partial-btn"
                onClick={() => handleConfirmFinish('partial')}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition flex items-center justify-between min-h-[38px] cursor-pointer"
              >
                <span>{runnerUi.partialBtn}</span>
                <span className="text-[10px] text-slate-500">{runnerUi.partialTag}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmFinishModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition min-h-[44px] cursor-pointer"
              >
                {runnerUi.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmFinish('self')}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md transition min-h-[44px] cursor-pointer"
              >
                {runnerUi.complete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3.10: Accessible Consequential Action Confirmation Modal on Exit */}
      {showExitConfirmModal && (
        <div
          data-testid="exit-confirm-modal"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in zoom-in-95 duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-exit-title"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-purple-300 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>

            <div className="space-y-1">
              <h3 id="confirm-exit-title" className="text-base font-black text-slate-900 font-heading">
                {runnerUi.confirmExitTitle}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {formatGuidedTemplate(runnerUi.confirmExitDescTemplate, { title: translatedTitle })}
              </p>
            </div>

            <div className="space-y-2 pt-1 text-left">
              <button
                type="button"
                data-testid="btn-pause-and-save"
                onClick={executeCloseAndSave}
                className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-between min-h-[44px] cursor-pointer shadow-xs"
              >
                <span>{runnerUi.pauseSaveBtn}</span>
                <span className="text-[10px] text-purple-200">{runnerUi.recommended}</span>
              </button>
              <button
                type="button"
                data-testid="btn-continue-task"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full py-2.5 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-semibold text-xs rounded-xl transition flex items-center justify-between min-h-[44px] cursor-pointer"
              >
                <span>{runnerUi.continueActivityBtn}</span>
                <span className="text-[10px] text-purple-600">{t('routines.runner_keep_going')}</span>
              </button>
              <button
                type="button"
                data-testid="btn-discard-exit"
                onClick={handleCloseWithoutSaving}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-slate-700 font-medium text-xs rounded-xl transition flex items-center justify-between min-h-[40px] cursor-pointer"
              >
                <span>{runnerUi.discardExitBtn}</span>
                <span className="text-[10px] text-slate-400">{t('routines.runner_clear_session')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
