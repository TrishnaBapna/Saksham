/**
 * SAKSHAM NEURO-CARE — LOVED ONES VISUAL RECALL MODAL
 * Character-grounded face and photograph recognition for patients with cognitive memory gaps.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LovedOne } from '../../../types/index.js';
import { LovedOnesVisualRecallService, VisualRecallResult } from '../services/lovedOnesVisualRecallService.js';
import { SpeechService } from '../../../services/speechService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getTranslatedRelationship } from '../utils/relationshipTranslation.js';
import {
  X,
  Users,
  AlertCircle,
  HelpCircle,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface LovedOnesVisualRecallModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
}

export const LovedOnesVisualRecallModal: React.FC<LovedOnesVisualRecallModalProps> = ({
  isOpen,
  onClose,
  patientId = 'sunita_01',
  patientName = 'Sunita Ji',
}) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VisualRecallResult | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (!isOpen) return null;

  const shortLang = (language || 'en').toLowerCase().split('-')[0];
  const recallUiMap: Record<string, Record<string, string>> = {
    en: {
      p1: 'Ananya (Daughter)',
      p2: 'Aarav (Grandson)',
      p3: 'Dr. Vikram (Son)',
      p4: 'Unrecognized Person',
      privacy: 'On-Device Privacy',
      subTemplate: 'Identify familiar people from authorized family records for {name}.',
      closeAria: 'Close Visual Recall',
      selectPhoto: 'Select or test a photograph:',
      comparing: 'Comparing with authorized Loved Ones records...',
      perceptualNote: '100% on-device private perceptual verification',
      recognizedTemplate: 'Recognized Family Member ({pct}% match)',
      stopVoice: 'Stop Voice Note',
      playVoice: 'Play Family Voice Note',
      viewProfile: 'View Full Family Profile',
      ashaAvoids: 'Asha avoids falsely confirming identities when visual features are ambiguous.',
      openAlbum: 'Open Loved Ones album to verify together',
      ashaNeverInvents: 'Asha never invents false family identities or assumes connections that are not verified.',
      addSanctuary: 'Add to Loved Ones Sanctuary',
      footer: '100% On-Device Visual Recall — Zero External Biometric Cloud APIs',
      greetPrefix: 'Namaste, I am',
      greetSuffix: 'Sending you love always!',
    },
    hi: {
      p1: 'अनन्या (बेटी)',
      p2: 'आरव (पोता)',
      p3: 'डॉ. विक्रम (बेटा)',
      p4: 'अपरिचित व्यक्ति',
      privacy: 'ऑन-डिवाइस गोपनीयता',
      subTemplate: '{name} के लिए अधिकृत पारिवारिक रिकॉर्ड से परिचित लोगों की पहचान करें।',
      closeAria: 'दृश्य स्मरण बंद करें',
      selectPhoto: 'कोई तस्वीर चुनें या जाँचें:',
      comparing: 'अधिकृत प्रियजनों के रिकॉर्ड से मिलान किया जा रहा है...',
      perceptualNote: '100% डिवाइस पर सुरक्षित पहचान',
      recognizedTemplate: 'पहचाने गए परिजन ({pct}% मिलान)',
      stopVoice: 'वॉयस संदेश रोकें',
      playVoice: 'परिजन का वॉयस संदेश सुनें',
      viewProfile: 'पूरा परिवार प्रोफ़ाइल देखें',
      ashaAvoids: 'जब पहचान स्पष्ट न हो तो आशा कभी गलत पुष्टि नहीं करती।',
      openAlbum: 'साथ में जाँचने के लिए प्रियजन एल्बम खोलें',
      ashaNeverInvents: 'आशा कभी भी अपुष्ट पहचान या काल्पनिक रिश्ता नहीं जोड़ती।',
      addSanctuary: 'प्रियजनों की सूची में जोड़ें',
      footer: '100% ऑन-डिवाइस दृश्य स्मरण — कोई बाहरी बायोमेट्रिक क्लाउड नहीं',
      greetPrefix: 'नमस्ते, मैं हूँ',
      greetSuffix: 'आपको ढेर सारा प्यार!',
    },
    mr: {
      p1: 'अनन्या (मुलगी)',
      p2: 'आरव (नातू)',
      p3: 'डॉ. विक्रम (मुलगा)',
      p4: 'अपरिचित व्यक्ती',
      privacy: 'ऑन-डिव्हाइस गोपनीयता',
      subTemplate: '{name} यांच्यासाठी अधिकृत कौटुंबिक नोंदीतून परिचित व्यक्ती ओळखा.',
      closeAria: 'दृश्य स्मरण बंद करा',
      selectPhoto: 'फोटो निवडा किंवा तपासा:',
      comparing: 'अधिकृत प्रियजनांच्या नोंदींशी जुळवत आहे...',
      perceptualNote: '१००% डिव्हाइसवर खाजगी पडताळणी',
      recognizedTemplate: 'ओळखलेले कुटुंबीय ({pct}% जुळणी)',
      stopVoice: 'व्हॉइस संदेश थांबवा',
      playVoice: 'कौटुंबिक व्हॉइस संदेश ऐका',
      viewProfile: 'संपूर्ण कुटुंब प्रोफाइल पहा',
      ashaAvoids: 'चेहऱ्याची ओळख अस्पष्ट असताना आशा कधीही चुकीची खात्री देत नाही.',
      openAlbum: 'एकत्र तपासण्यासाठी प्रियजन अल्बम उघडा',
      ashaNeverInvents: 'आशा कधीही चुकीची ओळख किंवा अप्रमाणित नाते सांगत नाही.',
      addSanctuary: 'प्रियजनांच्या यादीत जोडा',
      footer: '१००% ऑन-डिव्हाइस दृश्य स्मरण — बाह्य बायोमेट्रिक क्लाउड नाही',
      greetPrefix: 'नमस्कार, मी',
      greetSuffix: 'तुम्हाला नेहमीच खूप प्रेम!',
    },
    bn: {
      p1: 'অনন্যা (মেয়ে)',
      p2: 'আরভ (নাতি)',
      p3: 'ডাঃ বিক্রম (ছেলে)',
      p4: 'অপরিচিত ব্যক্তি',
      privacy: 'অন-ডিভাইস গোপনীয়তা',
      subTemplate: '{name}-এর জন্য অনুমোদিত পারিবারিক তথ্য থেকে প্রিয়জনকে চিনুন।',
      closeAria: 'ছবি দেখে চেনা বন্ধ করুন',
      selectPhoto: 'একটি ছবি নির্বাচন বা পরীক্ষা করুন:',
      comparing: 'অনুমোদিত প্রিয়জনের রেকর্ডের সাথে মেলানো হচ্ছে...',
      perceptualNote: '১০০% ডিভাইসেই সুরক্ষিত যাচাইকরণ',
      recognizedTemplate: 'পরিচিত পরিবারের সদস্য ({pct}% মিল)',
      stopVoice: 'ভয়েস বার্তা থামান',
      playVoice: 'পরিবারের ভয়েস বার্তা শুনুন',
      viewProfile: 'সম্পূর্ণ পারিবারিক প্রোফাইল দেখুন',
      ashaAvoids: 'ছবি অস্পষ্ট হলে আশা কখনো ভুল পরিচয় নিশ্চিত করে না।',
      openAlbum: 'একসাথে যাচাই করতে প্রিয়জন অ্যালবাম খুলুন',
      ashaNeverInvents: 'আশা কখনো মনগড়া বা যাচাইহীন পারিবারিক পরিচয় তৈরি করে না।',
      addSanctuary: 'প্রিয়জনদের তালিকায় যোগ করুন',
      footer: '১০০% অন-ডিভাইস ভিজ্যুয়াল স্মরণ — কোনো বহিরাগত ক্লাউড API নেই',
      greetPrefix: 'নমস্কার, আমি',
      greetSuffix: 'সবসময় ভালোবাসা রইল!',
    },
    ta: {
      p1: 'அனன்யா (மகள்)',
      p2: 'ஆரவ் (பேரன்)',
      p3: 'டாக்டர் விக்ரம் (மகன்)',
      p4: 'அடையாளம் தெரியாத நபர்',
      privacy: 'சாதனத்தில் தனியுரிமை',
      subTemplate: '{name} அவர்களுக்கு அங்கீகரிக்கப்பட்ட குடும்பப் பதிவுகளிலிருந்து தெரிந்தவர்களை அடையாளம் காணுங்கள்.',
      closeAria: 'காட்சி நினைவகத்தை மூடு',
      selectPhoto: 'புகைப்படத்தைத் தேர்ந்தெடுக்கவும்:',
      comparing: 'அங்கீகரிக்கப்பட்ட அன்பானவர்கள் பதிவுகளுடன் ஒப்பிடப்படுகிறது...',
      perceptualNote: '100% சாதனத்திலேயே பாதுகாப்பான சரிபார்ப்பு',
      recognizedTemplate: 'அடையாளம் காணப்பட்ட குடும்பத்தினர் ({pct}% பொருத்தம்)',
      stopVoice: 'குரல் பதிவை நிறுத்து',
      playVoice: 'குடும்பக் குரல் பதிவைக் கேளுங்கள்',
      viewProfile: 'முழு குடும்ப சுயவிவரத்தைப் பார்',
      ashaAvoids: 'தெளிவில்லாதபோது ஆஷா தவறான அடையாளத்தை உறுதிப்படுத்த மாட்டாள்.',
      openAlbum: 'சேர்ந்து சரிபார்க்க அன்பானவர்கள் ஆல்பத்தைத் திற',
      ashaNeverInvents: 'ஆஷா ஒருபோதும் சரிபார்க்கப்படாத தவறான குடும்ப உறவுகளை உருவாக்க மாட்டாள்.',
      addSanctuary: 'அன்பானவர்கள் பட்டியலில் சேர்',
      footer: '100% சாதனத்தில் காட்சி நினைவு — வெளிப்புற கிளவுட் APIகள் இல்லை',
      greetPrefix: 'வணக்கம், நான்',
      greetSuffix: 'எப்போதும் அன்புடன்!',
    },
    te: {
      p1: 'అనన్య (కూతురు)',
      p2: 'ఆరవ్ (మనవడు)',
      p3: 'డా. విక్రమ్ (కొడుకు)',
      p4: 'గుర్తించబడని వ్యక్తి',
      privacy: 'పరికరంలో గోప్యత',
      subTemplate: '{name} కోసం ఆమోదించబడిన కుటుంబ రికార్డుల నుండి పరిచిత వ్యక్తులను గుర్తించండి.',
      closeAria: 'విజువల్ రీకాల్ మూసివేయండి',
      selectPhoto: 'ఫోటోను ఎంచుకోండి లేదా పరీక్షించండి:',
      comparing: 'ఆమోదించబడిన ప్రియమైనవారి రికార్డులతో పోల్చుతోంది...',
      perceptualNote: '100% పరికరంలోనే సురక్షిత ధృవీకరణ',
      recognizedTemplate: 'గుర్తించబడిన కుటుంబ సభ్యులు ({pct}% సరిపోలిక)',
      stopVoice: 'వాయిస్ నోట్ ఆపండి',
      playVoice: 'కుటుంబ వాయిస్ నోట్ వినండి',
      viewProfile: 'పూర్తి కుటుంబ ప్రొఫైల్ చూడండి',
      ashaAvoids: 'అస్పష్టంగా ఉన్నప్పుడు ఆశా తప్పుడు గుర్తింపులను నిర్ధారించదు.',
      openAlbum: 'కలిసి ధృవీకరించడానికి ప్రియమైనవారి ఆల్బమ్ తెరవండి',
      ashaNeverInvents: 'ఆశా ధృవీకరించని తప్పుడు కుటుంబ గుర్తింపులను ఎప్పుడూ ఊహించదు.',
      addSanctuary: 'ప్రియమైనవారి జాబితాకు జోడించండి',
      footer: '100% పరికరంలో విజువల్ రీకాల్ — బాహ్య బయోమెట్రిక్ క్లౌడ్ APIలు లేవు',
      greetPrefix: 'నమస్తే, నేను',
      greetSuffix: 'ఎల్లప్పుడూ ప్రేమతో!',
    },
    kn: {
      p1: 'ಅನನ್ಯಾ (ಮಗಳು)',
      p2: 'ಆರವ್ (ಮೊಮ್ಮಗ)',
      p3: 'ಡಾ. ವಿಕ್ರಮ್ (ಮಗ)',
      p4: 'ಗುರುತಿಸಲಾಗದ ವ್ಯಕ್ತಿ',
      privacy: 'ಸಾಧನದಲ್ಲಿ ಗೌಪ್ಯತೆ',
      subTemplate: '{name} ಅವರಿಗಾಗಿ ಅಧಿಕೃತ ಕುಟುಂಬ ದಾಖಲೆಗಳಿಂದ ಪರಿಚಿತರನ್ನು ಗುರುತಿಸಿ.',
      closeAria: 'ದೃಶ್ಯ ಸ್ಮರಣೆ ಮುಚ್ಚಿ',
      selectPhoto: 'ಫೋಟೋ ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಪರೀಕ್ಷಿಸಿ:',
      comparing: 'ಅಧಿಕೃತ ಪ್ರೀತಿಪಾತ್ರರ ದಾಖಲೆಗಳೊಂದಿಗೆ ಹೋಲಿಸಲಾಗುತ್ತಿದೆ...',
      perceptualNote: '100% ಸಾಧನದಲ್ಲೇ ಖಾಸಗಿ ಪರಿಶೀಲನೆ',
      recognizedTemplate: 'ಗುರುತಿಸಿದ ಕುಟುಂಬದ ಸದಸ್ಯರು ({pct}% ಹೊಂದಾಣಿಕೆ)',
      stopVoice: 'ಧ್ವನಿ ಸಂದೇಶ ನಿಲ್ಲಿಸಿ',
      playVoice: 'ಕುಟುಂಬ ಧ್ವನಿ ಸಂದೇಶ ಕೇಳಿ',
      viewProfile: 'ಸಂಪೂರ್ಣ ಕುಟುಂಬ ಪ್ರೊಫೈಲ್ ನೋಡಿ',
      ashaAvoids: 'ಅಸ್ಪಷ್ಟವಾಗಿದ್ದಾಗ ಆಶಾ ತಪ್ಪು ಗುರುತುಗಳನ್ನು ದೃಢೀಕರಿಸುವುದಿಲ್ಲ.',
      openAlbum: 'ಒಟ್ಟಿಗೆ ಪರಿಶೀಲಿಸಲು ಪ್ರೀತಿಪಾತ್ರರ ಆಲ್ಬಮ್ ತೆರೆಯಿರಿ',
      ashaNeverInvents: 'ಆಶಾ ಎಂದಿಗೂ ದೃಢೀಕರಿಸದ ಸುಳ್ಳು ಕುಟುಂಬ ಗುರುತುಗಳನ್ನು ಸೃಷ್ಟಿಸುವುದಿಲ್ಲ.',
      addSanctuary: 'ಪ್ರೀತಿಪಾತ್ರರ ಪಟ್ಟಿಗೆ ಸೇರಿಸಿ',
      footer: '100% ಆನ್-ಡಿವೈಸ್ ದೃಶ್ಯ ಸ್ಮರಣೆ — ಬಾಹ್ಯ ಬಯೋಮೆಟ್ರಿಕ್ ಕ್ಲೌಡ್ ಇಲ್ಲ',
      greetPrefix: 'ನಮಸ್ಕಾರ, ನಾನು',
      greetSuffix: 'ಯಾವಾಗಲೂ ಪ್ರೀತಿಯಿಂದ!',
    },
  };
  const ui = recallUiMap[shortLang] || recallUiMap.en;

  // Preset sample photos for rapid demonstration
  const samplePresets = [
    {
      label: ui.p1,
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    },
    {
      label: ui.p2,
      url: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&w=600&q=80',
    },
    {
      label: ui.p3,
      url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
    },
    {
      label: ui.p4,
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const handleSelectPhoto = async (url: string) => {
    setSelectedPhoto(url);
    setIsAnalyzing(true);
    setResult(null);

    try {
      const recallResult = await LovedOnesVisualRecallService.matchCandidatePhoto(patientId, url);
      setResult(recallResult);
    } catch (e) {
      console.warn('Error matching photo:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlayVoiceNote = (member: LovedOne) => {
    if (isPlayingAudio) {
      SpeechService.cancelSpeech();
      setIsPlayingAudio(false);
      return;
    }

    const noteText =
      member.voiceRecording?.transcript ||
      member.audioNote ||
      `${ui.greetPrefix} ${member.name}, ${getTranslatedRelationship(member.relationship, t)}. ${ui.greetSuffix}`;

    setIsPlayingAudio(true);
    SpeechService.speak(
      noteText,
      undefined,
      () => {
        setIsPlayingAudio(false);
      },
      SpeechService.getBCP47(language)
    );
  };

  const handleClose = () => {
    if (isPlayingAudio) {
      SpeechService.cancelSpeech();
      setIsPlayingAudio(false);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="visual-recall-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 via-pink-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 id="visual-recall-title" className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {t('loved_ones.visual_title')}
                <span className="text-xs px-2 py-0.5 font-medium bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                  {ui.privacy}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {ui.subTemplate.replace('{name}', patientName)}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label={ui.closeAria}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Preset Photo Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              {ui.selectPhoto}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {samplePresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleSelectPhoto(preset.url)}
                  className={`p-2 rounded-xl border text-left flex flex-col items-center gap-2 transition-all ${
                    selectedPhoto === preset.url
                      ? 'border-rose-500 bg-rose-50/70 shadow-sm ring-2 ring-rose-200'
                      : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 text-center line-clamp-1">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Analysis in Progress */}
          {isAnalyzing && (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-sm">{ui.comparing}</p>
              <p className="text-xs text-slate-500 mt-1">{ui.perceptualNote}</p>
            </div>
          )}

          {/* Match Results */}
          {result && !isAnalyzing && (
            <div className="space-y-4 animate-fade-in">
              {result.outcome === 'TENTATIVE_MATCH' && result.matchedMember ? (
                <div className="bg-gradient-to-br from-rose-50/80 to-amber-50/40 p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        {ui.recognizedTemplate.replace('{pct}', String(Math.round(result.confidenceScore * 100)))}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-rose-300 shadow-md shrink-0 bg-slate-100">
                      <img
                        src={result.matchedMember.photoUrl || selectedPhoto}
                        alt={result.matchedMember.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-slate-900">
                        {result.matchedMember.name}
                      </h3>
                      <p className="text-sm font-semibold text-rose-700">
                        {getTranslatedRelationship(result.matchedMember.relationship, t)}
                      </p>
                      {result.memoryCue && (
                        <p className="text-xs text-slate-600 italic pt-1">
                          "{result.memoryCue}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for recognized person */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-rose-200/60">
                    {result.audioNoteAvailable && (
                      <button
                        onClick={() => handlePlayVoiceNote(result.matchedMember!)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all ${
                          isPlayingAudio
                            ? 'bg-amber-600 text-white animate-pulse'
                            : 'bg-white hover:bg-rose-50 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        {isPlayingAudio ? ui.stopVoice : ui.playVoice}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleClose();
                        navigate('/patient/loved-ones');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      <Users className="w-4 h-4" /> {ui.viewProfile}
                    </button>
                  </div>
                </div>
              ) : result.outcome === 'UNCERTAIN_MATCH' && result.matchedMember ? (
                <div className="bg-amber-50 p-4 sm:p-5 rounded-2xl border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      {t('loved_ones.visual_uncertain')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium">{result.explanation}</p>
                  <p className="text-xs text-slate-500">
                    {ui.ashaAvoids}
                  </p>
                  <button
                    onClick={() => {
                      handleClose();
                      navigate('/patient/loved-ones');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 underline"
                  >
                    {ui.openAlbum} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center space-y-2">
                  <AlertCircle className="w-7 h-7 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-base">{t('loved_ones.visual_unrecognized')}</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    {shortLang === 'en' ? `${result.explanation} ` : ''}{ui.ashaNeverInvents}
                  </p>
                  <button
                    onClick={() => {
                      handleClose();
                      navigate('/patient/loved-ones');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold mt-2"
                  >
                    {ui.addSanctuary}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            {ui.footer}
          </span>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
