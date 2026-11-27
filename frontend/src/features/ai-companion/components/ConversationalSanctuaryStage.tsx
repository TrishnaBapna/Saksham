/**
 * SAKSHAM — MILESTONE 7.2: CONVERSATIONAL SANCTUARY STAGE
 * Prominent character-led sanctuary with accessible conversation input,
 * honest microphone availability detection, and tactile quick actions.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacter } from '../../../context/CharacterContext.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { useAccessibility } from '../../../context/AccessibilityContext.js';
import { useAuthSafe } from '../../../context/AuthContext.js';
import { usePatientExperienceSafe } from '../../../context/PatientExperienceContext.js';
import { CharacterVisualizer } from '../CharacterVisualizer.js';
import { AshaInteractiveCompanion2D } from './AshaInteractiveCompanion2D.js';
import { SpeechService } from '../../../services/speechService.js';
import { MultilingualVoicePipeline, TIER_1_WEB_SPEECH_LANGUAGES } from '../../../services/multilingualVoicePipeline.js';
import { queryAICompanion } from '../../../services/aiService.js';
import { getLiveTemporalContext } from '../../../utils/temporalContext.js';
import { PatientContextService, PatientContext } from '../../../services/patientContextService.js';
import { getEffectivePatientId, subscribeToDataChanges } from '../../auth/services/identityService.js';
import { RoutineService } from '../../routines/services/routineService.js';
import { ConversationActionRegistry } from '../services/conversationActionRegistry.js';
import { ConversationalAIService, AIConfigurationStatus } from '../services/conversationalAIService.js';
import { AshaRemoteAdapter } from '../services/ashaRemoteAdapter.js';
import { ItemMemoryModal } from '../../item-memory/components/ItemMemoryModal.js';
import { LovedOnesVisualRecallModal } from '../../lovedOnes/components/LovedOnesVisualRecallModal.js';
import { AshaRuntimeStatusBadge } from './AshaRuntimeStatusBadge.js';
import { ChatMessage, WhitelistedAction, RoutineItem } from '../../../types/index.js';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  CalendarCheck,
  Volume2,
  VolumeX,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Settings,
  Phone,
  PhoneCall,
  X,
  Layers,
  Cpu,
  ShieldCheck,
  MapPin,
  Camera,
} from 'lucide-react';

interface SanctuaryStatusUISet {
  companionHeading: string;
  ashaName: string;
  pillGeminiEngine: string;
  pillQwenEngine: string;
  pillOfflineFallback: string;
  pillUnavailable: string;
  webSpeech: string;
  tapInteract: string;
  badgeGemini: string;
  badgeQwen: string;
  badgeQuota: string;
  badgeOffline: string;
  badgeUnconfigured: string;
  badgeLocalSim: string;
  noticeGemini: string;
  noticeQwenFallback: string;
  noticeOffline: string;
  emergencyTitle: string;
  contactCaregiver: string;
  confirmTitle: string;
  confirmSave: string;
  cancelBtn: string;
  cancelConfirmMsg: string;
  confirmSavedFallback: string;
  tryAsking: string;
  suggestGlasses: string;
  suggestWho: string;
  quickTitle: string;
  openBtn: string;
  itemMemoryTitle: string;
  itemMemoryDesc: string;
  whoIsThisTitle: string;
  whoIsThisDesc: string;
  thinkingGently: string;
  minimizedTitle: string;
  minimizedSubtitle: string;
  openChat: string;
  viewCanvasRig: string;
  viewFocusAvatar: string;
  ashaOnlyLabel: string;
  voiceMuteLabel: string;
  voiceUnmuteLabel: string;
  minimizeLabel: string;
  expandLabel: string;
  convoRegionAria: string;
  devBridgeSim: string;
  textTouchLabel: string;
  aiModalTitle: string;
  aiModalSubGemini: string;
  aiModalSubQwen: string;
  aiModalSubOffline: string;
  modalStatusGeminiReady: string;
  modalStatusQwenReady: string;
  modalStatusUnavailable: string;
  modalStatusOffline: string;
  gatewayCardGeminiTitle: string;
  gatewayCardGeminiDesc: string;
  gatewayCardLocalTitle: string;
  gatewayCardLocalDesc: string;
  gatewayStatusGeminiReady: string;
  gatewayStatusLocalReady: string;
  gatewayStatusOffline: string;
  testConnectionBtn: string;
  securityTitle: string;
  securityBodyServerOnly: string;
  privacyTitle: string;
  privacyBodyGemini: string;
  privacyBodyLocal: string;
  doneBtn: string;
  closeModalAria: string;
  caregiverModalTitle: string;
  caregiverHere: string;
  closeCaregiverAria: string;
  caregiverCallDesc: string;
  callEmergency112: string;
  openFamilySanctuary: string;
}

const SANCTUARY_STATUS_UI: Record<string, SanctuaryStatusUISet> = {
  en: {
    companionHeading: 'Asha Companion',
    ashaName: 'Asha',
    pillGeminiEngine: 'Gemini Primary + Qwen Fallback',
    pillQwenEngine: 'Resident Qwen 1.5B (Metal GPU)',
    pillOfflineFallback: 'Local Offline Fallback',
    pillUnavailable: 'AI Currently Unavailable',
    webSpeech: 'Web Speech',
    tapInteract: 'Tap Asha to interact gently',
    badgeGemini: 'Gemini',
    badgeQwen: 'Resident Qwen 1.5B',
    badgeQuota: 'Quota Exhausted (429) • Local Fallback',
    badgeOffline: 'Network Offline • Local Fallback',
    badgeUnconfigured: 'Unconfigured • Local Fallback',
    badgeLocalSim: 'Local Simulation Fallback',
    noticeGemini: 'Engine C Primary: Google Gemini via Server Gateway',
    noticeQwenFallback: 'Engine C Fallback: Resident Qwen 2.5 1.5B (Apple Silicon Metal GPU)',
    noticeOffline: 'Running on local offline development fallback (0 paid APIs, 0 external network requests).',
    emergencyTitle: 'Immediate Care Support',
    contactCaregiver: '📞 Contact Caregiver',
    confirmTitle: 'Action Confirmation Required',
    confirmSave: '✓ Confirm & Save',
    cancelBtn: '✕ Cancel',
    cancelConfirmMsg: 'I have cancelled that request. No changes were made to your care sanctuary.',
    confirmSavedFallback: 'I have safely saved your confirmed request.',
    tryAsking: 'Try asking:',
    suggestGlasses: 'Where are my glasses?',
    suggestWho: 'Who is this person?',
    quickTitle: 'Tactile Quick Actions (1-Tap Alternatives)',
    openBtn: 'Open',
    itemMemoryTitle: 'Item Memory',
    itemMemoryDesc: 'Where are my glasses, keys, or remote?',
    whoIsThisTitle: 'Who is this?',
    whoIsThisDesc: 'Identify familiar faces from photos',
    thinkingGently: 'Thinking gently...',
    minimizedTitle: 'Asha is right here with you',
    minimizedSubtitle: 'Tap to expand conversation or ask a question',
    openChat: 'Open Chat',
    viewCanvasRig: '2D Canvas Rig',
    viewFocusAvatar: 'Focus Avatar',
    ashaOnlyLabel: 'Asha-Only',
    voiceMuteLabel: 'Mute voice output',
    voiceUnmuteLabel: 'Enable voice output',
    minimizeLabel: 'Minimize Companion',
    expandLabel: 'Expand Companion',
    convoRegionAria: 'Conversation with Asha',
    devBridgeSim: 'Dev Bridge (Sim)',
    textTouchLabel: 'Text/Touch',
    aiModalTitle: 'Conversational AI Engine & Privacy',
    aiModalSubGemini: 'Engine C: Cloud Google Gemini Primary + Local Qwen Fallback',
    aiModalSubQwen: 'Local Resident Qwen 2.5 1.5B (₹0.00 / Zero Cloud APIs)',
    aiModalSubOffline: 'On-Device Deterministic Care Protocol',
    modalStatusGeminiReady: 'Engine C: Cloud Gemini Primary + Local Qwen Fallback',
    modalStatusQwenReady: 'Resident Qwen 1.5B (Local Metal GPU)',
    modalStatusUnavailable: 'Engine C AI Currently Unavailable',
    modalStatusOffline: 'Offline Local Fallback',
    gatewayCardGeminiTitle: 'Engine C Server Gateway (Cloud Primary + Local Fallback)',
    gatewayCardGeminiDesc:
      'Primary inference runs on Cloud Google Gemini via the local Python Gateway (127.0.0.1:8096) with automatic fallback to Local Qwen2.5-1.5B (Port 8085). Cloud API calls occur strictly server-side.',
    gatewayCardLocalTitle: 'Resident Local Inference Gateway',
    gatewayCardLocalDesc:
      'Powered by local Qwen2.5-1.5B-Instruct on Apple Silicon Metal GPU (Port 8085) with ₹0.00 cost and zero cloud API calls.',
    gatewayStatusGeminiReady: '✓ Cloud Gemini Primary + Local Qwen Ready',
    gatewayStatusLocalReady: '✓ Local Qwen Engine Ready (Zero Cloud APIs)',
    gatewayStatusOffline: '⚠ Server Gateway Offline (Deterministic Safety Active)',
    testConnectionBtn: 'Test Local Connection',
    securityTitle: 'Server-Side API Key Security',
    securityBodyServerOnly:
      'The cloud credential is stored strictly on the server gateway (.env) and is never sent to browser code or frontend bundles.',
    privacyTitle: 'Privacy & Clinical Safety Boundary',
    privacyBodyGemini:
      'Cloud Gemini inference receives de-identified conversational context via the local gateway, while medical advice, emergency triage, and Class 3 actions stay strictly protected locally.',
    privacyBodyLocal:
      'Zero external cloud PHI transmission: local Qwen inference and deterministic cognitive safety rules run completely on this device.',
    doneBtn: 'Done',
    closeModalAria: 'Close AI configuration modal',
    caregiverModalTitle: 'Connect with Caregiver',
    caregiverHere: 'Asha is right here with you',
    closeCaregiverAria: 'Close caregiver dialer',
    caregiverCallDesc: 'Take a slow, gentle breath. Your caregiver is just one tap away.',
    callEmergency112: 'National Emergency Services (112)',
    openFamilySanctuary: 'Open Family & Loved Ones Sanctuary →',
  },
  hi: {
    companionHeading: 'आशा साथी',
    ashaName: 'आशा',
    pillGeminiEngine: 'जेमिनी प्राइमरी + क्वेन बैकअप',
    pillQwenEngine: 'लोकल क्वेन 1.5B (मेटल जीपीयू)',
    pillOfflineFallback: 'ऑफ़लाइन लोकल बैकअप',
    pillUnavailable: 'एआई सेवा अभी उपलब्ध नहीं',
    webSpeech: 'वॉइस इनपुट',
    tapInteract: 'बात करने के लिए आशा को स्पर्श करें',
    badgeGemini: 'जेमिनी',
    badgeQwen: 'लोकल क्वेन 1.5B',
    badgeQuota: 'कोटा समाप्त (429) • लोकल बैकअप',
    badgeOffline: 'नेटवर्क ऑफ़लाइन • लोकल बैकअप',
    badgeUnconfigured: 'कॉन्फ़िगर नहीं • लोकल बैकअप',
    badgeLocalSim: 'लोकल नियम सहायता',
    noticeGemini: 'इंजन C प्राइमरी: सर्वर गेटवे द्वारा क्लाउड गूगल जेमिनी',
    noticeQwenFallback: 'इंजन C बैकअप: लोकल क्वेन 2.5 1.5B',
    noticeOffline: 'स्थानीय ऑफ़लाइन सहायता मोड सक्रिय है।',
    emergencyTitle: 'तत्काल देखभाल सहायता',
    contactCaregiver: '📞 देखभालकर्ता से संपर्क करें',
    confirmTitle: 'पुष्टि आवश्यक है',
    confirmSave: '✓ पुष्टि करें और सहेजें',
    cancelBtn: '✕ रद्द करें',
    cancelConfirmMsg: 'मैंने आपका वह अनुरोध रद्द कर दिया है। कोई बदलाव नहीं किया गया है।',
    confirmSavedFallback: 'आपका अनुरोध सुरक्षित रूप से सहेज लिया गया है।',
    tryAsking: 'पूछकर देखें:',
    suggestGlasses: 'मेरा चश्मा कहाँ है?',
    suggestWho: 'यह व्यक्ति कौन है?',
    quickTitle: 'तुरंत खोलें (1-टैप विकल्प)',
    openBtn: 'खोलें',
    itemMemoryTitle: 'वस्तु स्मृति',
    itemMemoryDesc: 'चश्मा, चाबी या रिमोट कहाँ रखा है?',
    whoIsThisTitle: 'यह कौन हैं?',
    whoIsThisDesc: 'फ़ोटो से अपनों को पहचानें',
    thinkingGently: 'आशा सोच रही है...',
    minimizedTitle: 'आशा यहीं आपके साथ है',
    minimizedSubtitle: 'बातचीत खोलने या प्रश्न पूछने के लिए स्पर्श करें',
    openChat: 'चैट खोलें',
    viewCanvasRig: '2D आशा दृश्य',
    viewFocusAvatar: 'फ़ोकस अवतार',
    ashaOnlyLabel: 'केवल आशा मोड',
    voiceMuteLabel: 'आवाज़ बंद करें',
    voiceUnmuteLabel: 'आवाज़ चालू करें',
    minimizeLabel: 'साथी छोटा करें',
    expandLabel: 'साथी बड़ा करें',
    convoRegionAria: 'आशा के साथ बातचीत',
    devBridgeSim: 'लोकल वॉइस ब्रिज',
    textTouchLabel: 'लेखन/टच',
    aiModalTitle: 'एआई इंजन और गोपनीयता विवरण',
    aiModalSubGemini: 'इंजन C: क्लाउड गूगल जेमिनी प्राइमरी + लोकल क्वेन बैकअप',
    aiModalSubQwen: 'लोकल क्वेन 2.5 1.5B (₹0.00 / कोई क्लाउड उपयोग नहीं)',
    aiModalSubOffline: 'ऑफ़लाइन नियमावली देखभाल सहायता',
    modalStatusGeminiReady: 'इंजन C: क्लाउड जेमिनी प्राइमरी + लोकल क्वेन बैकअप',
    modalStatusQwenReady: 'लोकल क्वेन 1.5B (मेटल जीपीयू)',
    modalStatusUnavailable: 'एआई सेवा अभी उपलब्ध नहीं',
    modalStatusOffline: 'ऑफ़लाइन लोकल बैकअप',
    gatewayCardGeminiTitle: 'इंजन C सर्वर गेटवे (क्लाउड प्राइमरी + लोकल बैकअप)',
    gatewayCardGeminiDesc:
      'प्राइमरी उत्तर स्थानीय गेटवे (127.0.0.1:8096) द्वारा क्लाउड गूगल जेमिनी से आते हैं और आवश्यकता पड़ने पर लोकल क्वेन 2.5 1.5B (पोर्ट 8085) पर स्वचालित बैकअप होता है।',
    gatewayCardLocalTitle: 'लोकल इनफ़रेंस गेटवे (केवल डिवाइस पर)',
    gatewayCardLocalDesc:
      'ऐपल सिलिकॉन मेटल जीपीयू (पोर्ट 8085) पर लोकल क्वेन 2.5 1.5B द्वारा संचालित — शून्य क्लाउड API और ₹0.00 लागत।',
    gatewayStatusGeminiReady: '✓ क्लाउड जेमिनी प्राइमरी + लोकल क्वेन तैयार',
    gatewayStatusLocalReady: '✓ लोकल क्वेन इंजन तैयार (शून्य क्लाउड API)',
    gatewayStatusOffline: '⚠ सर्वर गेटवे ऑफ़लाइन (नियमावली सक्रिय)',
    testConnectionBtn: 'कनेक्शन जाँचें',
    securityTitle: 'सर्वर-स्तरीय कुंजी सुरक्षा',
    securityBodyServerOnly:
      'एपीआई कुंजी केवल सर्वर गेटवे पर सुरक्षित रहती है और कभी भी ब्राउज़र या फ्रंटएंड कोड में नहीं भेजी जाती।',
    privacyTitle: 'गोपनीयता और चिकित्सीय सुरक्षा सीमा',
    privacyBodyGemini:
      'क्लाउड जेमिनी को केवल आवश्यक बातचीत संदर्भ भेजा जाता है; आपातकाल, दवा नियम और महत्वपूर्ण कार्य पुष्टि यहीं सुरक्षित रहते हैं।',
    privacyBodyLocal:
      'डिवाइस से बाहर कोई क्लाउड डेटा नहीं जाता; लोकल क्वेन और सुरक्षा नियम पूरी तरह स्थानीय चलते हैं।',
    doneBtn: 'पूर्ण',
    closeModalAria: 'एआई सेटिंग्स बंद करें',
    caregiverModalTitle: 'देखभालकर्ता से संपर्क करें',
    caregiverHere: 'आशा यहीं आपके साथ है',
    closeCaregiverAria: 'देखभालकर्ता डायलर बंद करें',
    caregiverCallDesc: 'शांत सांस लें। आपके देखभालकर्ता केवल एक स्पर्श दूर हैं।',
    callEmergency112: 'राष्ट्रीय आपातकालीन सेवा (112)',
    openFamilySanctuary: 'परिवार और प्रियजन खोलें →',
  },
  mr: {
    companionHeading: 'आशा साथीदार',
    ashaName: 'आशा',
    pillGeminiEngine: 'जेमिनी प्रायमरी + क्वेन बॅकअप',
    pillQwenEngine: 'लोकल क्वेन 1.5B (मेटल जीपीयू)',
    pillOfflineFallback: 'ऑफलाइन लोकल बॅकअप',
    pillUnavailable: 'एआय सेवा सध्या उपलब्ध नाही',
    webSpeech: 'व्हॉइस इनपुट',
    tapInteract: 'बोलण्यासाठी आशावर हळुवार टॅप करा',
    badgeGemini: 'जेमिनी',
    badgeQwen: 'लोकल क्वेन 1.5B',
    badgeQuota: 'कोटा संपला (429) • लोकल बॅकअप',
    badgeOffline: 'नेटवर्क ऑफलाइन • लोकल बॅकअप',
    badgeUnconfigured: 'सेटअप नाही • लोकल बॅकअप',
    badgeLocalSim: 'लोकल नियम सहाय्य',
    noticeGemini: 'इंजिन C प्रायमरी: सर्व्हर गेटवेद्वारे क्लाउड गूगल जेमिनी',
    noticeQwenFallback: 'इंजिन C बॅकअप: लोकल क्वेन 2.5 1.5B',
    noticeOffline: 'स्थानिक ऑफलाइन सहाय्य मोड सुरू आहे.',
    emergencyTitle: 'तातडीची काळजी मदत',
    contactCaregiver: '📞 काळजीवाहकांशी संपर्क साधा',
    confirmTitle: 'पुष्टी आवश्यक आहे',
    confirmSave: '✓ पुष्टी करा आणि जतन करा',
    cancelBtn: '✕ रद्द करा',
    cancelConfirmMsg: 'मी तुमची विनंती रद्द केली आहे. कोणताही बदल केलेला नाही.',
    confirmSavedFallback: 'तुमची विनंती सुरक्षितपणे जतन केली आहे.',
    tryAsking: 'विचारून पहा:',
    suggestGlasses: 'माझा चष्मा कुठे आहे?',
    suggestWho: 'हे कोण आहेत?',
    quickTitle: 'झटपट कृती (१-टॅप पर्याय)',
    openBtn: 'उघडा',
    itemMemoryTitle: 'वस्तू स्मृती',
    itemMemoryDesc: 'चष्मा, किल्ली किंवा रिमोट कुठे आहे?',
    whoIsThisTitle: 'हे कोण आहेत?',
    whoIsThisDesc: 'फोटोमधून ओळखीचे चेहरे ओळखा',
    thinkingGently: 'आशा विचार करत आहे...',
    minimizedTitle: 'आशा तुमच्या सोबतच आहे',
    minimizedSubtitle: 'संभाषण उघडण्यासाठी किंवा प्रश्न विचारण्यासाठी टॅप करा',
    openChat: 'चॅट उघडा',
    viewCanvasRig: '2D आशा दृश्य',
    viewFocusAvatar: 'फोकस अवतार',
    ashaOnlyLabel: 'फक्त आशा मोड',
    voiceMuteLabel: 'आवाज बंद करा',
    voiceUnmuteLabel: 'आवाज सुरू करा',
    minimizeLabel: 'साथीदार लहान करा',
    expandLabel: 'साथीदार मोठा करा',
    convoRegionAria: 'आशासोबत संवाद',
    devBridgeSim: 'लोकल व्हॉइस ब्रिज',
    textTouchLabel: 'लेखन/टच',
    aiModalTitle: 'एआय इंजिन व गोपनीयता तपशील',
    aiModalSubGemini: 'इंजिन C: क्लाउड गूगल जेमिनी प्रायमरी + लोकल क्वेन बॅकअप',
    aiModalSubQwen: 'लोकल क्वेन 2.5 1.5B (₹0.00 / क्लाउड वापर नाही)',
    aiModalSubOffline: 'ऑफलाइन सुरक्षित नियमावली सहाय्य',
    modalStatusGeminiReady: 'इंजिन C: क्लाउड जेमिनी प्रायमरी + लोकल क्वेन बॅकअप',
    modalStatusQwenReady: 'लोकल क्वेन 1.5B (मेटल जीपीयू)',
    modalStatusUnavailable: 'एआय सेवा सध्या उपलब्ध नाही',
    modalStatusOffline: 'ऑफलाइन लोकल बॅकअप',
    gatewayCardGeminiTitle: 'इंजिन C सर्व्हर गेटवे (क्लाउड प्रायमरी + लोकल बॅकअप)',
    gatewayCardGeminiDesc:
      'प्रायमरी प्रतिसाद स्थानिक गेटवे (127.0.0.1:8096) द्वारे क्लाउड गूगल जेमिनीवरून येतात आणि गरज पडल्यास लोकल क्वेन 2.5 1.5B (पोर्ट 8085) वर बॅकअप होतो.',
    gatewayCardLocalTitle: 'स्थानिक लोकल इंजिन गेटवे',
    gatewayCardLocalDesc:
      'अॅपल सिलिकॉन मेटल जीपीयू (पोर्ट 8085) वर लोकल क्वेन 2.5 1.5B कार्यरत — शून्य क्लाउड API आणि ₹0.00 खर्च.',
    gatewayStatusGeminiReady: '✓ क्लाउड जेमिनी प्रायमरी + लोकल क्वेन तयार',
    gatewayStatusLocalReady: '✓ लोकल क्वेन इंजिन तयार (शून्य क्लाउड API)',
    gatewayStatusOffline: '⚠ सर्व्हर गेटवे ऑफलाइन (सुरक्षा नियम सक्रिय)',
    testConnectionBtn: 'कनेक्शन तपासा',
    securityTitle: 'सर्व्हर-स्तरीय की सुरक्षा',
    securityBodyServerOnly:
      'API की केवळ सर्व्हर गेटवेमध्ये सुरक्षित असते आणि ब्राउझर किंवा फ्रंटएंड कोडमध्ये कधीही पाठवली जात नाही.',
    privacyTitle: 'गोपनीयता आणि वैद्यकीय सुरक्षा मर्यादा',
    privacyBodyGemini:
      'क्लाउड जेमिनीला फक्त आवश्यक संवाद संदर्भ दिला जातो; तातडीची मदत, औषधांचे नियम आणि पुष्टी प्रक्रिया स्थानिक पातळीवरच सुरक्षित राहतात.',
    privacyBodyLocal:
      'कोणताही वैयक्तिक डेटा क्लाउडवर जात नाही; सर्व प्रक्रिया आणि सुरक्षा नियम पूर्णपणे या डिव्हाइसवर चालतात.',
    doneBtn: 'पूर्ण',
    closeModalAria: 'एआय माहिती बंद करा',
    caregiverModalTitle: 'काळजीवाहकांशी संपर्क साधा',
    caregiverHere: 'आशा तुमच्या सोबतच आहे',
    closeCaregiverAria: 'काळजीवाहक संपर्क बंद करा',
    caregiverCallDesc: 'शांतपणे श्वास घ्या. तुमचे काळजीवाहक एका टॅपवर उपलब्ध आहेत.',
    callEmergency112: 'राष्ट्रीय आपत्कालीन सेवा (112)',
    openFamilySanctuary: 'कुटुंब व प्रियजन विभाग उघडा →',
  },
  bn: {
    companionHeading: 'আশা সঙ্গী',
    ashaName: 'আশা',
    pillGeminiEngine: 'জেমিনি প্রাইমারি + কুয়েন ব্যাকআপ',
    pillQwenEngine: 'লোকাল কুয়েন 1.5B (মেটাল জিপিইউ)',
    pillOfflineFallback: 'অফলাইন লোকাল ব্যাকআপ',
    pillUnavailable: 'এআই পরিষেবা বর্তমানে উপলব্ধ নয়',
    webSpeech: 'ভয়েস ইনপুট',
    tapInteract: 'কথা বলতে আশাকে স্পর্শ করুন',
    badgeGemini: 'জেমিনি',
    badgeQwen: 'লোকাল কুয়েন 1.5B',
    badgeQuota: 'কোটা শেষ (429) • লোকাল ব্যাকআপ',
    badgeOffline: 'নেটওয়ার্ক অফলাইন • লোকাল ব্যাকআপ',
    badgeUnconfigured: 'কনফিগার করা নেই • লোকাল ব্যাকআপ',
    badgeLocalSim: 'লোকাল নিয়ম সহায়তা',
    noticeGemini: 'ইঞ্জিন C প্রাইমারি: সার্ভার গেটওয়ের মাধ্যমে ক্লাউড গুগল জেমিনি',
    noticeQwenFallback: 'ইঞ্জিন C ব্যাকআপ: লোকাল কুয়েন 2.5 1.5B',
    noticeOffline: 'স্থানীয় অফলাইন সহায়তা মোড চালু আছে।',
    emergencyTitle: 'জরুরি যত্ন সহায়তা',
    contactCaregiver: '📞 যত্নকারীর সাথে যোগাযোগ করুন',
    confirmTitle: 'নিশ্চিতকরণ প্রয়োজন',
    confirmSave: '✓ নিশ্চিত করুন ও সংরক্ষণ করুন',
    cancelBtn: '✕ বাতিল করুন',
    cancelConfirmMsg: 'আমি আপনার অনুরোধটি বাতিল করেছি। কোনো পরিবর্তন করা হয়নি।',
    confirmSavedFallback: 'আপনার অনুরোধ নিরাপদে সংরক্ষণ করা হয়েছে।',
    tryAsking: 'জিজ্ঞাসা করে দেখুন:',
    suggestGlasses: 'আমার চশমা কোথায়?',
    suggestWho: 'উনি কে?',
    quickTitle: 'দ্রুত কাজ (১-ট্যাপ বিকল্প)',
    openBtn: 'খুলুন',
    itemMemoryTitle: 'বস্তুর স্মৃতি',
    itemMemoryDesc: 'চশমা, চাবি বা রিমোট কোথায় আছে?',
    whoIsThisTitle: 'ইনি কে?',
    whoIsThisDesc: 'ছবি দেখে প্রিয়জনকে চিনুন',
    thinkingGently: 'আশা ভাবছে...',
    minimizedTitle: 'আশা আপনার পাশেই আছে',
    minimizedSubtitle: 'কথোপকথন খুলতে বা প্রশ্ন করতে ট্যাপ করুন',
    openChat: 'চ্যাট খুলুন',
    viewCanvasRig: '2D আশা দৃশ্য',
    viewFocusAvatar: 'ফোকাস অবতার',
    ashaOnlyLabel: 'শুধু আশা মোড',
    voiceMuteLabel: 'ভয়েস বন্ধ করুন',
    voiceUnmuteLabel: 'ভয়েস চালু করুন',
    minimizeLabel: 'সঙ্গী ছোট করুন',
    expandLabel: 'সঙ্গী বড় করুন',
    convoRegionAria: 'আশার সাথে কথোপকথন',
    devBridgeSim: 'লোকাল ভয়েস ব্রিজ',
    textTouchLabel: 'লেখা/টাচ',
    aiModalTitle: 'এআই ইঞ্জিন এবং গোপনীয়তা তথ্য',
    aiModalSubGemini: 'ইঞ্জিন C: ক্লাউড গুগল জেমিনি প্রাইমারি + লোকাল কুয়েন ব্যাকআপ',
    aiModalSubQwen: 'লোকাল কুয়েন 2.5 1.5B (₹0.00 / কোনো ক্লাউড ব্যবহার নেই)',
    aiModalSubOffline: 'অফলাইন নির্ধারিত যত্ন সহায়তা',
    modalStatusGeminiReady: 'ইঞ্জিন C: ক্লাউড জেমিনি প্রাইমারি + লোকাল কুয়েন ব্যাকআপ',
    modalStatusQwenReady: 'লোকাল কুয়েন 1.5B (মেটাল জিপিইউ)',
    modalStatusUnavailable: 'এআই পরিষেবা বর্তমানে উপলব্ধ নয়',
    modalStatusOffline: 'অফলাইন লোকাল ব্যাকআপ',
    gatewayCardGeminiTitle: 'ইঞ্জিন C সার্ভার গেটওয়ে (ক্লাউড প্রাইমারি + লোকাল ব্যাকআপ)',
    gatewayCardGeminiDesc:
      'প্রাথমিক উত্তর স্থানীয় গেটওয়ের (127.0.0.1:8096) মাধ্যমে ক্লাউড গুগল জেমিনি থেকে আসে এবং প্রয়োজন হলে লোকাল কুয়েন 2.5 1.5B (পোর্ট 8085)-এ স্বয়ংক্রিয় ব্যাকআপ হয়।',
    gatewayCardLocalTitle: 'লোকাল ইনফারেন্স গেটওয়ে',
    gatewayCardLocalDesc:
      'অ্যাপল সিলিকন মেটাল জিপিইউ (পোর্ট 8085)-এ লোকাল কুয়েন 2.5 1.5B দ্বারা চালিত — কোনো ক্লাউড API নয় এবং ₹0.00 খরচ।',
    gatewayStatusGeminiReady: '✓ ক্লাউড জেমিনি প্রাইমারি + লোকাল কুয়েন প্রস্তুত',
    gatewayStatusLocalReady: '✓ লোকাল কুয়েন ইঞ্জিন প্রস্তুত (শূন্য ক্লাউড API)',
    gatewayStatusOffline: '⚠ সার্ভার গেটওয়ে অফলাইন (সুরক্ষা নিয়ম সক্রিয়)',
    testConnectionBtn: 'সংযোগ পরীক্ষা করুন',
    securityTitle: 'সার্ভার-স্তরের কী নিরাপত্তা',
    securityBodyServerOnly:
      'API কী কেবল সার্ভার গেটওয়েতে সুরক্ষিত থাকে এবং কখনো ব্রাউজার বা ফ্রন্টএন্ড কোডে পাঠানো হয় না।',
    privacyTitle: 'গোপনীয়তা ও চিকিৎসা নিরাপত্তা সীমা',
    privacyBodyGemini:
      'ক্লাউড জেমিনি কেবল প্রয়োজনীয় কথোপকথন প্রসঙ্গ পায়; জরুরি সতর্কতা, ওষুধের নিয়ম ও নিশ্চিতকরণ ব্যবস্থা সম্পূর্ণ স্থানীয়ভাবে সুরক্ষিত থাকে।',
    privacyBodyLocal:
      'ডিভাইসের বাইরে কোনো ক্লাউড ডেটা যায় না; লোকাল কুয়েন ও নিরাপত্তা নিয়ম সম্পূর্ণ ডিভাইসে চলে।',
    doneBtn: 'সম্পন্ন',
    closeModalAria: 'এআই তথ্য বন্ধ করুন',
    caregiverModalTitle: 'যত্নকারীর সাথে যোগাযোগ করুন',
    caregiverHere: 'আশা আপনার পাশেই আছে',
    closeCaregiverAria: 'যত্নকারীর ডায়ালার বন্ধ করুন',
    caregiverCallDesc: 'ধীরে শ্বাস নিন। আপনার যত্নকারী মাত্র এক ট্যাপ দূরে।',
    callEmergency112: 'জাতীয় জরুরি পরিষেবা (112)',
    openFamilySanctuary: 'পরিবার ও প্রিয়জন খুলুন →',
  },
  ta: {
    companionHeading: 'ஆஷா துணை',
    ashaName: 'ஆஷா',
    pillGeminiEngine: 'ஜெமினி முதன்மை + குவென் மாற்று',
    pillQwenEngine: 'உள்ளூர் குவென் 1.5B',
    pillOfflineFallback: 'ஆஃப்லைன் உள்ளூர் மாற்று',
    pillUnavailable: 'AI சேவை இப்போது கிடைக்கவில்லை',
    webSpeech: 'குரல் உள்ளீடு',
    tapInteract: 'ஆஷாவைத் தொடவும்',
    badgeGemini: 'ஜெமினி',
    badgeQwen: 'உள்ளூர் குவென் 1.5B',
    badgeQuota: 'வரம்பு முடிந்தது (429) • உள்ளூர் மாற்று',
    badgeOffline: 'நெட்வொர்க் இல்லை • உள்ளூர் மாற்று',
    badgeUnconfigured: 'அமைக்கப்படவில்லை • உள்ளூர் மாற்று',
    badgeLocalSim: 'உள்ளூர் விதி உதவி',
    noticeGemini: 'இயந்திரம் C முதன்மை: சர்வர் கேட்வே வழியாக ஜெமினி',
    noticeQwenFallback: 'இயந்திரம் C மாற்று: உள்ளூர் குவென் 2.5 1.5B',
    noticeOffline: 'உள்ளூர் ஆஃப்லைன் உதவி செயலில் உள்ளது.',
    emergencyTitle: 'அவசர பராமரிப்பு உதவி',
    contactCaregiver: '📞 பராமரிப்பாளரை அழைக்கவும்',
    confirmTitle: 'உறுதிப்படுத்தல் தேவை',
    confirmSave: '✓ உறுதிசெய்து சேமி',
    cancelBtn: '✕ ரத்து செய்',
    cancelConfirmMsg: 'அந்த கோரிக்கை ரத்து செய்யப்பட்டது. எந்த மாற்றமும் செய்யப்படவில்லை.',
    confirmSavedFallback: 'உங்கள் கோரிக்கை பாதுகாப்பாக சேமிக்கப்பட்டது.',
    tryAsking: 'கேட்டுப் பாருங்கள்:',
    suggestGlasses: 'என் கண்ணாடி எங்கே?',
    suggestWho: 'இவர் யார்?',
    quickTitle: 'விரைவு செயல்கள்',
    openBtn: 'திற',
    itemMemoryTitle: 'பொருள் நினைவகம்',
    itemMemoryDesc: 'கண்ணாடி, சாவி அல்லது ரிமோட் எங்கே?',
    whoIsThisTitle: 'இவர் யார்?',
    whoIsThisDesc: 'புகைப்படத்தில் உள்ளவரை அடையாளம் காண்க',
    thinkingGently: 'ஆஷா சிந்திக்கிறது...',
    minimizedTitle: 'ஆஷா உங்களுடன் இங்கே இருக்கிறார்',
    minimizedSubtitle: 'உரையாடலைத் திறக்க தொடவும்',
    openChat: 'உரையாடலைத் திற',
    viewCanvasRig: '2D ஆஷா காட்சி',
    viewFocusAvatar: 'அவதார் காட்சி',
    ashaOnlyLabel: 'ஆஷா மட்டும்',
    voiceMuteLabel: 'குரலை அமைதியாக்கு',
    voiceUnmuteLabel: 'குரலை இயக்கு',
    minimizeLabel: 'சுருக்கு',
    expandLabel: 'விரிவுபடுத்து',
    convoRegionAria: 'ஆஷாவுடனான உரையாடல்',
    devBridgeSim: 'உள்ளூர் குரல் இணைப்பு',
    textTouchLabel: 'எழுத்து/தொடுதல்',
    aiModalTitle: 'AI இயந்திரம் & தனியுரிமை',
    aiModalSubGemini: 'இயந்திரம் C: கிளவுட் ஜெமினி முதன்மை + உள்ளூர் குவென் மாற்று',
    aiModalSubQwen: 'உள்ளூர் குவென் 2.5 1.5B (₹0.00)',
    aiModalSubOffline: 'ஆஃப்லைன் பாதுகாப்பு விதிகள்',
    modalStatusGeminiReady: 'இயந்திரம் C: கிளவுட் ஜெமினி முதன்மை + உள்ளூர் குவென்',
    modalStatusQwenReady: 'உள்ளூர் குவென் 1.5B',
    modalStatusUnavailable: 'AI சேவை கிடைக்கவில்லை',
    modalStatusOffline: 'ஆஃப்லைன் உள்ளூர் மாற்று',
    gatewayCardGeminiTitle: 'இயந்திரம் C சர்வர் கேட்வே',
    gatewayCardGeminiDesc: 'சர்வர் கேட்வே (127.0.0.1:8096) வழியாக ஜெமினி மற்றும் உள்ளூர் குவென் 2.5 1.5B இயங்குகிறது.',
    gatewayCardLocalTitle: 'உள்ளூர் இயந்திரம் கேட்வே',
    gatewayCardLocalDesc: 'குவென் 2.5 1.5B (Port 8085) — கிளவுட் செலவு இல்லை (₹0.00).',
    gatewayStatusGeminiReady: '✓ கிளவுட் ஜெமினி + உள்ளூர் குவென் தயார்',
    gatewayStatusLocalReady: '✓ உள்ளூர் குவென் தயார்',
    gatewayStatusOffline: '⚠ கேட்வே ஆஃப்லைன்',
    testConnectionBtn: 'இணைப்பைச் சோதி',
    securityTitle: 'சர்வர் API பாதுகாப்பு',
    securityBodyServerOnly: 'சர்வர் API விசை சர்வரில் மட்டுமே இருக்கும்; உலாவியில் அனுப்பப்படாது.',
    privacyTitle: 'தனியுரிமை & மருத்துவ பாதுகாப்பு',
    privacyBodyGemini: 'பாதுகாப்பு மற்றும் உறுதிப்படுத்தல் விதிகள் உள்ளூரில் பாதுகாக்கப்படுகின்றன.',
    privacyBodyLocal: 'கிளவுட் பரிமாற்றம் இல்லாமல் உள்ளூரில் இயங்குகிறது.',
    doneBtn: 'முடிந்தது',
    closeModalAria: 'மூடு',
    caregiverModalTitle: 'பராமரிப்பாளரை அழைக்கவும்',
    caregiverHere: 'ஆஷா உங்களுடன் இருக்கிறார்',
    closeCaregiverAria: 'மூடு',
    caregiverCallDesc: 'அமைதியாக மூச்சு விடுங்கள். உங்கள் பராமரிப்பாளர் ஒரு தொடுதலில் உள்ளார்.',
    callEmergency112: 'அவசர உதவி (112)',
    openFamilySanctuary: 'குடும்பப் பகுதியைத் திற →',
  },
  te: {
    companionHeading: 'ఆశా సహచరి',
    ashaName: 'ఆశా',
    pillGeminiEngine: 'జెమిని ప్రైమరీ + క్వెన్ బ్యాకప్',
    pillQwenEngine: 'లోకల్ క్వెన్ 1.5B',
    pillOfflineFallback: 'ఆఫ్‌లైన్ లోకల్ బ్యాకప్',
    pillUnavailable: 'AI సేవ ప్రస్తుతం అందుబాటులో లేదు',
    webSpeech: 'వాయిస్ ఇన్‌పుట్',
    tapInteract: 'మాట్లాడటానికి ఆశాను తాకండి',
    badgeGemini: 'జెమిని',
    badgeQwen: 'లోకల్ క్వెన్ 1.5B',
    badgeQuota: 'కోటా ముగిసింది (429) • లోకల్ బ్యాకప్',
    badgeOffline: 'నెట్‌వర్క్ లేదు • లోకల్ బ్యాకప్',
    badgeUnconfigured: 'కాన్ఫిగర్ కాలేదు • లోకల్ బ్యాకప్',
    badgeLocalSim: 'లోకల్ నియమ సహాయం',
    noticeGemini: 'ఇంజిన్ C ప్రైమరీ: సర్వర్ గేట్‌వే ద్వారా గూగుల్ జెమిని',
    noticeQwenFallback: 'ఇంజిన్ C బ్యాకప్: లోకల్ క్వెన్ 2.5 1.5B',
    noticeOffline: 'స్థానిక ఆఫ్‌లైన్ సహాయం సక్రియంగా ఉంది.',
    emergencyTitle: 'తక్షణ సంరక్షణ సహాయం',
    contactCaregiver: '📞 సంరక్షకుడిని సంప్రదించండి',
    confirmTitle: 'నిర్ధారణ అవసరం',
    confirmSave: '✓ నిర్ధారించి సేవ్ చేయండి',
    cancelBtn: '✕ రద్దు చేయండి',
    cancelConfirmMsg: 'మీ అభ్యర్థన రద్దు చేయబడింది. ఎలాంటి మార్పులు చేయలేదు.',
    confirmSavedFallback: 'మీ అభ్యర్థన సురక్షితంగా సేవ్ చేయబడింది.',
    tryAsking: 'ఇలా అడగండి:',
    suggestGlasses: 'నా కళ్ళద్దాలు ఎక్కడ?',
    suggestWho: 'ఈ వ్యక్తి ఎవరు?',
    quickTitle: 'త్వరిత చర్యలు',
    openBtn: 'తెరవండి',
    itemMemoryTitle: 'వస్తువుల జ్ఞాపకం',
    itemMemoryDesc: 'కళ్ళద్దాలు, తాళాలు లేదా రిమోట్ ఎక్కడ?',
    whoIsThisTitle: 'వీరు ఎవరు?',
    whoIsThisDesc: 'ఫోటోలలో తెలిసిన వారిని గుర్తించండి',
    thinkingGently: 'ఆశా ఆలోచిస్తోంది...',
    minimizedTitle: 'ఆశా మీతోనే ఉంది',
    minimizedSubtitle: 'మాట్లాడటానికి ట్యాప్ చేయండి',
    openChat: 'చాట్ తెరవండి',
    viewCanvasRig: '2D ఆశా దృశ్యం',
    viewFocusAvatar: 'ఫోకస్ అవతార్',
    ashaOnlyLabel: 'ఆశా-మాత్రమే',
    voiceMuteLabel: 'వాయిస్ మ్యూట్ చేయండి',
    voiceUnmuteLabel: 'వాయిస్ ఆన్ చేయండి',
    minimizeLabel: 'చిన్నది చేయండి',
    expandLabel: 'పెద్దది చేయండి',
    convoRegionAria: 'ఆశాతో సంభాషణ',
    devBridgeSim: 'లోకల్ వాయిస్ బ్రిడ్జ్',
    textTouchLabel: 'టెక్స్ట్/టచ్',
    aiModalTitle: 'AI ఇంజిన్ & గోప్యత',
    aiModalSubGemini: 'ఇంజిన్ C: క్లౌడ్ జెమిని ప్రైమరీ + లోకల్ క్వెన్ బ్యాకప్',
    aiModalSubQwen: 'లోకల్ క్వెన్ 2.5 1.5B (₹0.00)',
    aiModalSubOffline: 'ఆఫ్‌లైన్ భద్రతా నియమాలు',
    modalStatusGeminiReady: 'ఇంజిన్ C: క్లౌడ్ జెమిని ప్రైమరీ + లోకల్ క్వెన్',
    modalStatusQwenReady: 'లోకల్ క్వెన్ 1.5B',
    modalStatusUnavailable: 'AI అందుబాటులో లేదు',
    modalStatusOffline: 'ఆఫ్‌లైన్ లోకల్ బ్యాకప్',
    gatewayCardGeminiTitle: 'ఇంజిన్ C సర్వర్ గేట్‌వే',
    gatewayCardGeminiDesc: 'సర్వర్ గేట్‌వే (127.0.0.1:8096) ద్వారా జెమిని మరియు లోకల్ క్వెన్ 2.5 1.5B పనిచేస్తాయి.',
    gatewayCardLocalTitle: 'లోకల్ ఇన్ఫరెన్స్ గేట్‌వే',
    gatewayCardLocalDesc: 'లోకల్ క్వెన్ 2.5 1.5B (Port 8085) — ₹0.00 ఖర్చు.',
    gatewayStatusGeminiReady: '✓ క్లౌడ్ జెమిని + లోకల్ క్వెన్ సిద్ధం',
    gatewayStatusLocalReady: '✓ లోకల్ క్వెన్ సిద్ధం',
    gatewayStatusOffline: '⚠ గేట్‌వే ఆఫ్‌లైన్',
    testConnectionBtn: 'కనెక్షన్ పరీక్షించండి',
    securityTitle: 'సర్వర్ API భద్రత',
    securityBodyServerOnly: 'సర్వర్ API కీ సర్వర్ గేట్‌వేలోనే ఉంటుంది; బ్రౌజర్‌కు పంపబడదు.',
    privacyTitle: 'గోప్యత & వైద్య భద్రత',
    privacyBodyGemini: 'భద్రతా నియమాలు మరియు నిర్ధారణ ప్రక్రియలు పరికరంలోనే రక్షించబడతాయి.',
    privacyBodyLocal: 'క్లౌడ్ API లేకుండా పరికరంలోనే నడుస్తుంది.',
    doneBtn: 'పూర్తయింది',
    closeModalAria: 'మూసివేయండి',
    caregiverModalTitle: 'సంరక్షకుడిని సంప్రదించండి',
    caregiverHere: 'ఆశా మీతోనే ఉంది',
    closeCaregiverAria: 'మూసివేయండి',
    caregiverCallDesc: 'శాంతంగా శ్వాస తీసుకోండి. మీ సంరక్షకుడు ఒక ట్యాప్ దూరంలో ఉన్నారు.',
    callEmergency112: 'జాతీయ అత్యవసర సేవ (112)',
    openFamilySanctuary: 'కుటుంబం తెరవండి →',
  },
  kn: {
    companionHeading: 'ಆಶಾ ಸಂಗಾತಿ',
    ashaName: 'ಆಶಾ',
    pillGeminiEngine: 'ಜೆಮಿನಿ ಪ್ರೈಮರಿ + ಕ್ವೆನ್ ಬ್ಯಾಕಪ್',
    pillQwenEngine: 'ಲೋಕಲ್ ಕ್ವೆನ್ 1.5B',
    pillOfflineFallback: 'ಆಫ್‌ಲೈನ್ ಲೋಕಲ್ ಬ್ಯಾಕಪ್',
    pillUnavailable: 'AI ಸೇವೆ ಪ್ರಸ್ತುತ ಲಭ್ಯವಿಲ್ಲ',
    webSpeech: 'ಧ್ವನಿ ಇನ್‌ಪುಟ್',
    tapInteract: 'ಮಾತನಾಡಲು ಆಶಾ ಅವರನ್ನು ಸ್ಪರ್ಶಿಸಿ',
    badgeGemini: 'ಜೆಮಿನಿ',
    badgeQwen: 'ಲೋಕಲ್ ಕ್ವೆನ್ 1.5B',
    badgeQuota: 'ಕೋಟಾ ಮುಗಿದಿದೆ (429) • ಲೋಕಲ್ ಬ್ಯಾಕಪ್',
    badgeOffline: 'ನೆಟ್‌ವರ್ಕ್ ಆಫ್‌ಲೈನ್ • ಲೋಕಲ್ ಬ್ಯಾಕಪ್',
    badgeUnconfigured: 'ಸಿದ್ಧವಾಗಿಲ್ಲ • ಲೋಕಲ್ ಬ್ಯಾಕಪ್',
    badgeLocalSim: 'ಲೋಕಲ್ ನಿಯಮ ಬೆಂಬಲ',
    noticeGemini: 'ಎಂಜಿನ್ C ಪ್ರೈಮರಿ: ಸರ್ವರ್ ಗೇಟ್‌ವೇ ಮೂಲಕ ಗೂಗಲ್ ಜೆಮಿನಿ',
    noticeQwenFallback: 'ಎಂಜಿನ್ C ಬ್ಯಾಕಪ್: ಲೋಕಲ್ ಕ್ವೆನ್ 2.5 1.5B',
    noticeOffline: 'ಸ್ಥಳೀಯ ಆಫ್‌ಲೈನ್ ಬೆಂಬಲ ಸಕ್ರಿಯವಾಗಿದೆ.',
    emergencyTitle: 'ತುರ್ತು ಆರೈಕೆ ಬೆಂಬಲ',
    contactCaregiver: '📞 ಆರೈಕೆದಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ',
    confirmTitle: 'ದೃಢೀಕರಣ ಅಗತ್ಯವಿದೆ',
    confirmSave: '✓ ದೃಢೀಕರಿಸಿ ಮತ್ತು ಉಳಿಸಿ',
    cancelBtn: '✕ ರದ್ದುಮಾಡಿ',
    cancelConfirmMsg: 'ಆ ವಿನಂತಿಯನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ಯಾವುದೇ ಬದಲಾವಣೆ ಮಾಡಲಾಗಿಲ್ಲ.',
    confirmSavedFallback: 'ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಉಳಿಸಲಾಗಿದೆ.',
    tryAsking: 'ಹೀಗೆ ಕೇಳಿ:',
    suggestGlasses: 'ನನ್ನ ಕನ್ನಡಕ ಎಲ್ಲಿದೆ?',
    suggestWho: 'ಇವರು ಯಾರು?',
    quickTitle: 'ತ್ವರಿತ ಕ್ರಿಯೆಗಳು',
    openBtn: 'ತೆರೆಯಿರಿ',
    itemMemoryTitle: 'ವಸ್ತು ಸ್ಮರಣೆ',
    itemMemoryDesc: 'ಕನ್ನಡಕ, ಕೀಲಿ ಅಥವಾ ರಿಮೋಟ್ ಎಲ್ಲಿದೆ?',
    whoIsThisTitle: 'ಇವರು ಯಾರು?',
    whoIsThisDesc: 'ಫೋಟೋಗಳಿಂದ ಪರಿಚಿತರನ್ನು ಗುರುತಿಸಿ',
    thinkingGently: 'ಆಶಾ ಯೋಚಿಸುತ್ತಿದ್ದಾರೆ...',
    minimizedTitle: 'ಆಶಾ ನಿಮ್ಮೊಂದಿಗಿದ್ದಾರೆ',
    minimizedSubtitle: 'ಸಂಭಾಷಣೆ ತೆರೆಯಲು ಸ್ಪರ್ಶಿಸಿ',
    openChat: 'ಚಾಟ್ ತೆರೆಯಿರಿ',
    viewCanvasRig: '2D ಆಶಾ ನೋಟ',
    viewFocusAvatar: 'ಫೋಕಸ್ ಅವತಾರ್',
    ashaOnlyLabel: 'ಆಶಾ-ಮಾತ್ರ ಮೋಡ್',
    voiceMuteLabel: 'ಧ್ವನಿ ಮ್ಯೂಟ್ ಮಾಡಿ',
    voiceUnmuteLabel: 'ಧ್ವನಿ ಆನ್ ಮಾಡಿ',
    minimizeLabel: 'ಕಿರಿದಾಗಿಸಿ',
    expandLabel: 'ವಿಸ್ತರಿಸಿ',
    convoRegionAria: 'ಆಶಾ ಜೊತೆ ಸಂಭಾಷಣೆ',
    devBridgeSim: 'ಲೋಕಲ್ ವಾಯ್ಸ್ ಬ್ರಿಡ್ಜ್',
    textTouchLabel: 'ಪಠ್ಯ/ಟಚ್',
    aiModalTitle: 'AI ಎಂಜಿನ್ ಮತ್ತು ಗೌಪ್ಯತೆ',
    aiModalSubGemini: 'ಎಂಜಿನ್ C: ಕ್ಲೌಡ್ ಜೆಮಿನಿ ಪ್ರೈಮರಿ + ಲೋಕಲ್ ಕ್ವೆನ್ ಬ್ಯಾಕಪ್',
    aiModalSubQwen: 'ಲೋಕಲ್ ಕ್ವೆನ್ 2.5 1.5B (₹0.00)',
    aiModalSubOffline: 'ಆಫ್‌ಲೈನ್ ಸುರಕ್ಷತಾ ನಿಯಮಗಳು',
    modalStatusGeminiReady: 'ಎಂಜಿನ್ C: ಕ್ಲೌಡ್ ಜೆಮಿನಿ ಪ್ರೈಮರಿ + ಲೋಕಲ್ ಕ್ವೆನ್',
    modalStatusQwenReady: 'ಲೋಕಲ್ ಕ್ವೆನ್ 1.5B',
    modalStatusUnavailable: 'AI ಲಭ್ಯವಿಲ್ಲ',
    modalStatusOffline: 'ಆಫ್‌ಲೈನ್ ಲೋಕಲ್ ಬ್ಯಾಕಪ್',
    gatewayCardGeminiTitle: 'ಎಂಜಿನ್ C ಸರ್ವರ್ ಗೇಟ್‌ವೇ',
    gatewayCardGeminiDesc: 'ಸರ್ವರ್ ಗೇಟ್‌ವೇ (127.0.0.1:8096) ಮೂಲಕ ಜೆಮಿನಿ ಮತ್ತು ಲೋಕಲ್ ಕ್ವೆನ್ 2.5 1.5B ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತವೆ.',
    gatewayCardLocalTitle: 'ಲೋಕಲ್ ಇನ್ಫರೆನ್ಸ್ ಗೇಟ್‌ವೇ',
    gatewayCardLocalDesc: 'ಲೋಕಲ್ ಕ್ವೆನ್ 2.5 1.5B (Port 8085) — ₹0.00 ವೆಚ್ಚ.',
    gatewayStatusGeminiReady: '✓ ಕ್ಲೌಡ್ ಜೆಮಿನಿ + ಲೋಕಲ್ ಕ್ವೆನ್ ಸಿದ್ಧವಾಗಿದೆ',
    gatewayStatusLocalReady: '✓ ಲೋಕಲ್ ಕ್ವೆನ್ ಸಿದ್ಧವಾಗಿದೆ',
    gatewayStatusOffline: '⚠ ಗೇಟ್‌ವೇ ಆಫ್‌ಲೈನ್',
    testConnectionBtn: 'ಸಂಪರ್ಕ ಪರೀಕ್ಷಿಸಿ',
    securityTitle: 'ಸರ್ವರ್ API ಭದ್ರತೆ',
    securityBodyServerOnly: 'ಸರ್ವರ್ API ಕೀ ಸರ್ವರ್ ಗೇಟ್‌ವೇಯಲ್ಲೇ ಇರುತ್ತದೆ; ಬ್ರೌಜರ್‌ಗೆ ಕಳುಹಿಸುವುದಿಲ್ಲ.',
    privacyTitle: 'ಗೌಪ್ಯತೆ ಮತ್ತು ವೈದ್ಯಕೀಯ ಸುರಕ್ಷತೆ',
    privacyBodyGemini: 'ಸುರಕ್ಷತಾ ನಿಯಮಗಳು ಮತ್ತು ದೃಢೀಕರಣ ಕ್ರಮಗಳು ಸಾಧನದಲ್ಲೇ ಸುರಕ್ಷಿತವಾಗಿರುತ್ತವೆ.',
    privacyBodyLocal: 'ಕ್ಲೌಡ್ API ಇಲ್ಲದೆ ಸಾಧನದಲ್ಲೇ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ.',
    doneBtn: 'ಮುಗಿಯಿತು',
    closeModalAria: 'ಮುಚ್ಚಿ',
    caregiverModalTitle: 'ಆರೈಕೆದಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ',
    caregiverHere: 'ಆಶಾ ನಿಮ್ಮೊಂದಿಗಿದ್ದಾರೆ',
    closeCaregiverAria: 'ಮುಚ್ಚಿ',
    caregiverCallDesc: 'ಶಾಂತವಾಗಿ ಉಸಿರಾಡಿ. ನಿಮ್ಮ ಆರೈಕೆದಾರರು ಕೇವಲ ಒಂದು ಟ್ಯಾಪ್ ದೂರದಲ್ಲಿದ್ದಾರೆ.',
    callEmergency112: 'ರಾಷ್ಟ್ರೀಯ ತುರ್ತು ಸೇವೆ (112)',
    openFamilySanctuary: 'ಕುಟುಂಬ ವಿಭಾಗ ತೆರೆಯಿರಿ →',
  },
};

interface ConversationalSanctuaryStageProps {
  patientName?: string;
  onNavigateRoutines?: () => void;
  onLaunchRoutineRunner?: (routine: RoutineItem) => void;
  className?: string;
}

export const ConversationalSanctuaryStage: React.FC<ConversationalSanctuaryStageProps> = ({
  patientName = 'Sunita',
  onNavigateRoutines,
  onLaunchRoutineRunner,
  className = '',
}) => {
  const navigate = useNavigate();
  const auth = useAuthSafe();
  const currentUser = auth?.currentUser ?? null;
  const effectiveName =
    patientName && patientName !== 'Sunita'
      ? patientName
      : currentUser?.displayName || patientName || 'Sunita';

  const {
    characterState,
    expression,
    triggerEmotion,
    autoSpeak,
    setAutoSpeak,
  } = useCharacter();

  const { t, language, setLanguage, isRTL, responseLanguage, spokenInputLanguages, readingPreference, setResponseLanguage } = useLanguage();
  const ui = SANCTUARY_STATUS_UI[language] || SANCTUARY_STATUS_UI.en;
  const effectiveSpeakLang = responseLanguage || language;
  const shouldAutoSpeak = autoSpeak || readingPreference === 'audio' || readingPreference === 'both';
  const { highContrast, simpleMode } = useAccessibility();
  const { isAshaOnly } = usePatientExperienceSafe();
  const reducedMotion = simpleMode;

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isVoiceConversationActive, setIsVoiceConversationActive] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isVoiceReviewing, setIsVoiceReviewing] = useState(false);
  const [reviewCountdown, setReviewCountdown] = useState<number | null>(null);
  const reviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeVoiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceConversationActiveRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const prevVoiceLangRef = useRef<string>(effectiveSpeakLang);
  const isVoiceReviewingRef = useRef<boolean>(false);
  isVoiceReviewingRef.current = isVoiceReviewing;
  const lastSubmittedVoiceRef = useRef<{ norm: string; at: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);

  const setListeningState = useCallback((next: boolean) => {
    isListeningRef.current = next;
    setIsListening(next);
  }, []);
  const [isMinimized, setIsMinimized] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'avatar'>('canvas');
  const [showCaregiverModal, setShowCaregiverModal] = useState<boolean>(false);
  const [showItemMemoryModal, setShowItemMemoryModal] = useState<boolean>(false);
  const [showVisualRecallModal, setShowVisualRecallModal] = useState<boolean>(false);
  const [selectedMemoryItemId, setSelectedMemoryItemId] = useState<string | undefined>(undefined);
  const [lastSpokenSpeech, setLastSpokenSpeech] = useState<string>('');
  const [isSpeakingActive, setIsSpeakingActive] = useState<boolean>(false);

  // AI Configuration & Transparency Status
  const [aiStatus, setAiStatus] = useState<AIConfigurationStatus>(() =>
    ConversationalAIService.getStatus()
  );
  const [showAIModal, setShowAIModal] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => ConversationalAIService.getModel());
  const [serverFeedback, setServerFeedback] = useState<string | null>(null);

  const [localBridgeActive, setLocalBridgeActive] = useState<boolean>(() =>
    MultilingualVoicePipeline.isLocalBridgeOnline()
  );

  useEffect(() => {
    MultilingualVoicePipeline.checkLocalBridgeHealth().then((isOnline) => {
      setLocalBridgeActive(isOnline);
    });
  }, []);

  const refreshAiStatus = useCallback(() => {
    setAiStatus(ConversationalAIService.getStatus());
    setSelectedModel(ConversationalAIService.getModel());
  }, []);

  // Honest speech recognition capability detection
  const isSpeechSupported = SpeechService.isSpeechRecognitionSupported();

  const stopListeningRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reactive Patient Context & Suggestions
  const [patientContext, setPatientContext] = useState<PatientContext>(() =>
    PatientContextService.getPatientContext(currentUser)
  );

  useEffect(() => {
    setPatientContext(PatientContextService.getPatientContext(currentUser));
    const unsubscribe = subscribeToDataChanges(({ patientId }) => {
      const effectiveId = getEffectivePatientId(currentUser);
      if (!patientId || patientId === effectiveId || !currentUser) {
        setPatientContext(PatientContextService.getPatientContext(currentUser));
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Quick suggestion chips customized with patient data
  const pickSanctuaryQuery = (lang: string, map: Record<string, string>) => map[lang] || map.en;
  const firstLovedOne = patientContext?.lovedOnes?.sampleMembers?.[0]?.name;
  const suggestions = [
    {
      label: t('ai.suggestion_what_can_i_do'),
      query: pickSanctuaryQuery(language, {
        en: 'Explain what I can do here',
        hi: 'यहाँ मैं क्या कर सकती हूँ?',
        mr: 'मी इथे काय करू शकते?',
        bn: 'আমি এখানে কী করতে পারি?',
        ta: 'நான் இங்கே என்ன செய்யலாம்?',
        te: 'నేను ఇక్కడ ఏమి చేయగలను?',
        kn: 'ನಾನು ಇಲ್ಲಿ ಏನು ಮಾಡಬಹುದು?',
      }),
    },
    { label: ui.suggestGlasses, query: ui.suggestGlasses },
    { label: ui.suggestWho, query: ui.suggestWho },
    {
      label: t('ai.suggestion_schedule'),
      query: pickSanctuaryQuery(language, {
        en: 'What should I do at 11 AM?',
        hi: 'सुबह 11 बजे मुझे क्या करना चाहिए?',
        mr: 'सकाळी 11 वाजता मी काय करावे?',
        bn: 'সকাল ১১টায় আমার কী করা উচিত?',
        ta: 'காலை 11 மணிக்கு நான் என்ன செய்ய வேண்டும்?',
        te: 'ఉదయం 11 గంటలకు నేను ఏమి చేయాలి?',
        kn: 'ಬೆಳಿಗ್ಗೆ 11 ಗಂಟೆಗೆ ನಾನು ಏನು ಮಾಡಬೇಕು?',
      }),
    },
    {
      label: t('ai.suggestion_play_game'),
      query: pickSanctuaryQuery(language, {
        en: 'I want to play a game',
        hi: 'मैं एक खेल खेलना चाहती हूँ',
        mr: 'मला एक खेळ खेळायचा आहे',
        bn: 'আমি একটি খেলা খেলতে চাই',
        ta: 'நான் ஒரு விளையாட்டு விளையாட விரும்புகிறேன்',
        te: 'నేను ఒక ఆట ఆడాలనుకుంటున్నాను',
        kn: 'ನಾನು ಒಂದು ಆಟ ಆಡಲು ಬಯಸುತ್ತೇನೆ',
      }),
    },
    {
      label: firstLovedOne
        ? t('ai.suggestion_who_is', { name: firstLovedOne })
        : t('ai.suggestion_see_family'),
      query: firstLovedOne
        ? pickSanctuaryQuery(language, {
            en: `Who is ${firstLovedOne}?`,
            hi: `${firstLovedOne} कौन हैं?`,
            mr: `${firstLovedOne} कोण आहेत?`,
            bn: `${firstLovedOne} কে?`,
            ta: `${firstLovedOne} யார்?`,
            te: `${firstLovedOne} ఎవరు?`,
            kn: `${firstLovedOne} ಯಾರು?`,
          })
        : pickSanctuaryQuery(language, {
            en: 'I want to see my family',
            hi: 'मैं अपने परिवार को देखना चाहती हूँ',
            mr: 'मला माझे कुटुंब पहायचे आहे',
            bn: 'আমি আমার পরিবারকে দেখতে চাই',
            ta: 'நான் என் குடும்பத்தைப் பார்க்க விரும்புகிறேன்',
            te: 'నేను నా కుటుంబాన్ని చూడాలనుకుంటున్నాను',
            kn: 'ನಾನು ನನ್ನ ಕುಟುಂಬವನ್ನು ನೋಡಲು ಬಯಸುತ್ತೇನೆ',
          }),
    },
  ];

  const justNowLabel =
    t('sanctuary.just_now') !== 'sanctuary.just_now'
      ? t('sanctuary.just_now')
      : pickSanctuaryQuery(language, {
          en: 'Just now',
          hi: 'अभी',
          mr: 'आत्ताच',
          bn: 'এইমাত্র',
          ta: 'இப்போது',
          te: 'ఇప్పుడే',
          kn: 'ಇದೀಗ',
        });

  const buildTemporalWelcome = useCallback(() => {
    const intro = t('sanctuary.greeting_intro');
    const temporal = getLiveTemporalContext(effectiveSpeakLang);
    if (intro.toLowerCase().includes(temporal.appropriateGreeting.toLowerCase())) {
      return intro;
    }
    return `${temporal.appropriateGreeting}! ${intro}`;
  }, [t, effectiveSpeakLang]);

  // Initial welcome message from Asha anchored to live time of day
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'sanctuary-welcome-01',
      sender: 'ai',
      text: buildTemporalWelcome(),
      timestamp: justNowLabel,
    },
  ]);

  // Update welcome greeting dynamically on language switch even after chatting
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === 'sanctuary-welcome-01'
          ? {
              ...m,
              text: buildTemporalWelcome(),
              timestamp: justNowLabel,
            }
          : m
      )
    );
  }, [language, effectiveName, t, justNowLabel, buildTemporalWelcome]);

  // Optional demo scenario hook for visual verification & documentation captures
  useEffect(() => {
    try {
      const demoData = localStorage.getItem('saksham_demo_scenario');
      if (demoData) {
        const parsed = JSON.parse(demoData);
        if (parsed.messages && Array.isArray(parsed.messages)) {
          setMessages(parsed.messages);
        }
        if (parsed.expression) {
          triggerEmotion(parsed.expression);
        }
        if (parsed.isListening) {
          setIsListening(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Clean up listening on unmount
  useEffect(() => {
    mountedRef.current = true;
    const handleOpenItemMemory = (e: any) => {
      if (e?.detail?.itemId) {
        setSelectedMemoryItemId(e.detail.itemId);
      }
      setShowItemMemoryModal(true);
    };
    const handleOpenVisualRecall = () => {
      setShowVisualRecallModal(true);
    };

    window.addEventListener('saksham:open-item-memory', handleOpenItemMemory);
    window.addEventListener('saksham:open-photo-recall', handleOpenVisualRecall);

    return () => {
      mountedRef.current = false;
      voiceConversationActiveRef.current = false;
      if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);
      if (resumeVoiceTimerRef.current) clearTimeout(resumeVoiceTimerRef.current);
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      window.removeEventListener('saksham:open-item-memory', handleOpenItemMemory);
      window.removeEventListener('saksham:open-photo-recall', handleOpenVisualRecall);
      if (stopListeningRef.current) {
        stopListeningRef.current();
        stopListeningRef.current = null;
      }
      SpeechService.abortListening();
      SpeechService.cancelSpeech();
    };
  }, []);

  // Cleanly tear down stale recognition & pending voice buffers when active language switches
  useEffect(() => {
    if (prevVoiceLangRef.current === effectiveSpeakLang) return;
    prevVoiceLangRef.current = effectiveSpeakLang;

    const wasActive = isListeningRef.current || voiceConversationActiveRef.current;

    if (reviewTimerRef.current) {
      clearTimeout(reviewTimerRef.current);
      reviewTimerRef.current = null;
    }
    if (resumeVoiceTimerRef.current) {
      clearTimeout(resumeVoiceTimerRef.current);
      resumeVoiceTimerRef.current = null;
    }
    if (stopListeningRef.current) {
      stopListeningRef.current();
      stopListeningRef.current = null;
    }
    MultilingualVoicePipeline.stopMicrophone();
    SpeechService.abortListening();
    SpeechService.cancelSpeech();

    setIsSpeakingActive(false);
    setListeningState(false);
    setInterimTranscript('');
    if (isVoiceReviewingRef.current) {
      setIsVoiceReviewing(false);
      setReviewCountdown(null);
      setInputText('');
    }
    lastSubmittedVoiceRef.current = null;

    if (wasActive && mountedRef.current) {
      resumeVoiceTimerRef.current = setTimeout(() => {
        resumeVoiceTimerRef.current = null;
        if (mountedRef.current && prevVoiceLangRef.current === effectiveSpeakLang) {
          startVoiceTurnRef.current({ isAutoResume: false });
        }
      }, 60);
    }
  }, [effectiveSpeakLang, setListeningState]);

  // Dispatch safe action
  const handleActionDispatch = (action: WhitelistedAction, _targetId?: string) => {
    switch (action) {
      case 'NAVIGATE_MIND_GAMES':
      case 'NAVIGATE_ROOM_MEMORY':
        navigate('/patient/mind-games');
        break;
      case 'NAVIGATE_ROUTINES':
      case 'TRIGGER_ROUTINE_REMINDER':
      case 'TRIGGER_ASSISTANCE_TRAY':
        if (onNavigateRoutines) {
          onNavigateRoutines();
        } else {
          const el = document.getElementById('daily-routines-workspace');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          } else {
            navigate('/patient/daily-routines');
          }
        }
        break;
      case 'NAVIGATE_LOVED_ONES':
      case 'SHOW_FAMILY_MEMBER':
        navigate('/patient/loved-ones');
        break;
      case 'NAVIGATE_HOME':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'OPEN_NOTES':
        window.dispatchEvent(new CustomEvent('saksham:open-notes'));
        break;
      case 'OPEN_CALENDAR':
        window.dispatchEvent(new CustomEvent('saksham:open-calendar'));
        break;
      case 'OPEN_UTILITIES':
        window.dispatchEvent(new CustomEvent('saksham:open-utility'));
        break;
      case 'LAUNCH_ROUTINE_RUNNER': {
        const effectiveId = getEffectivePatientId(currentUser);
        const routines = RoutineService.getRoutines(effectiveId);
        const targetRoutine = routines.find((r) => r.id === _targetId) || routines[0];
        if (targetRoutine && onLaunchRoutineRunner) {
          onLaunchRoutineRunner(targetRoutine);
        }
        window.dispatchEvent(
          new CustomEvent('saksham:launch-routine-runner', { detail: { routineId: _targetId } })
        );
        break;
      }
      case 'CALL_CAREGIVER':
        setShowCaregiverModal(true);
        break;
      case 'NAVIGATE_HOME_GUIDE':
        navigate('/patient/home-guide');
        break;
      case 'OPEN_CAMERA':
        navigate('/patient/mind-games?game=game-room-memory');
        break;
      case 'OPEN_TODO':
        navigate('/patient/daily-routines');
        break;
      case 'NAVIGATE_PROFILE':
        navigate('/patient/profile');
        break;
      case 'OPEN_ITEM_MEMORY':
        if (_targetId) setSelectedMemoryItemId(_targetId);
        setShowItemMemoryModal(true);
        break;
      case 'OPEN_PHOTO_RECALL':
        setShowVisualRecallModal(true);
        break;
      default:
        console.warn('Unhandled sanctuary action:', action);
    }
  };

  const handleConfirmPending = async (pendingId: string) => {
    const effectiveId = getEffectivePatientId(currentUser);
    const execRes = await ConversationActionRegistry.executePendingConfirmation(
      effectiveId,
      pendingId,
      currentUser?.uid
    );
    triggerEmotion(execRes.success ? 'done_completed' : 'reassuring', 3000);
    const speech =
      (execRes.speechByLang && (execRes.speechByLang[effectiveSpeakLang] || execRes.speechByLang[language])) ||
      (language === 'hi'
        ? execRes.speechHi
        : language === 'en' || !execRes.success
        ? execRes.speechEn
        : ui.confirmSavedFallback);
    const confirmMsg: ChatMessage = {
      id: `ai-confirm-${Date.now()}`,
      sender: 'ai',
      text: speech,
      timestamp: justNowLabel,
      responseSource: 'DETERMINISTIC_HANDLER',
    };
    setMessages((prev) => [...prev, confirmMsg]);
    if (shouldAutoSpeak) {
      SpeechService.speak(speech, undefined, undefined, effectiveSpeakLang);
    }
  };

  const handleCancelPending = (_pendingId: string) => {
    const effectiveId = getEffectivePatientId(currentUser);
    ConversationActionRegistry.cancelPendingConfirmation(effectiveId);
    triggerEmotion('reassuring', 2500);
    const speech = ui.cancelConfirmMsg;
    const cancelMsg: ChatMessage = {
      id: `ai-cancel-${Date.now()}`,
      sender: 'ai',
      text: speech,
      timestamp: 'Just now',
      responseSource: 'DETERMINISTIC_HANDLER',
    };
    setMessages((prev) => [...prev, cancelMsg]);
    if (shouldAutoSpeak) {
      SpeechService.speak(speech, undefined, undefined, effectiveSpeakLang);
    }
  };

  const handleSendMessageRef = useRef<(textToSend?: string) => Promise<void>>(async () => {});
  const startVoiceTurnRef = useRef<(opts?: { isAutoResume?: boolean }) => void>(() => {});

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? inputText).trim();
    if (!query) return;

    if (resumeVoiceTimerRef.current) {
      clearTimeout(resumeVoiceTimerRef.current);
      resumeVoiceTimerRef.current = null;
    }
    if (stopListeningRef.current) {
      stopListeningRef.current();
      stopListeningRef.current = null;
    }
    SpeechService.abortListening();
    setListeningState(false);

    setMicNotice(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    triggerEmotion('thinking', 0);

    try {
      const currentContext = PatientContextService.getPatientContext(currentUser);
      const response = await queryAICompanion(
        query,
        'home',
        language,
        currentContext,
        currentUser?.uid,
        responseLanguage
      );

      // Check if response matches known intents or needs honest unsupported fallback
      const isKnown =
        response.suggestedAction ||
        (response.speech &&
          !response.speech.includes('ai.fallback_understanding') &&
          !response.speech.includes('Would you like to check your next scheduled routine'));

      const responseSpeech = isKnown
        ? response.speech
        : t('sanctuary.unsupported_fallback');

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: responseSpeech,
        timestamp: 'Just now',
        suggestedAction: response.suggestedAction,
        pendingConfirmation: response.pendingConfirmation,
        clarificationOptions: response.clarificationOptions,
        isEmergency: response.isEmergency,
        isRealAI: response.isRealAI,
        runtimeState: response.runtimeState,
        responseSource: response.responseSource,
        executionMode: response.executionMode,
        executionState: (response as any).executionState || (response.isRealAI ? 'LIVE_AI' : 'LOCAL_SIMULATION'),
        modelUsed: response.modelUsed,
        configNotice: response.configNotice,
      };

      setMessages((prev) => [...prev, aiMsg]);
      triggerEmotion(response.characterState || 'explaining', 4000);
      setLastSpokenSpeech(responseSpeech);
      setIsSpeakingActive(true);

      // Conversational language preference switch handling
      if (response.metadata?.conversationalLanguageSwitchedTo) {
        const switched = response.metadata.conversationalLanguageSwitchedTo as any;
        setResponseLanguage(switched);
        if (setLanguage) {
          setLanguage(switched);
        }
      }

      const speakLang = response.metadata?.conversationalLanguageSwitchedTo || effectiveSpeakLang;

      const scheduleNextVoiceTurn = () => {
        if (!mountedRef.current || !voiceConversationActiveRef.current) return;
        if (resumeVoiceTimerRef.current) clearTimeout(resumeVoiceTimerRef.current);
        resumeVoiceTimerRef.current = setTimeout(() => {
          resumeVoiceTimerRef.current = null;
          if (
            mountedRef.current &&
            voiceConversationActiveRef.current &&
            !isListeningRef.current &&
            !SpeechService.isSpeakingActive()
          ) {
            startVoiceTurnRef.current({ isAutoResume: true });
          }
        }, 180);
      };

      if (shouldAutoSpeak) {
        SpeechService.speak(
          responseSpeech,
          () => {
            triggerEmotion('explaining', 0);
            setIsSpeakingActive(true);
          },
          () => {
            triggerEmotion('neutral', 1000);
            setIsSpeakingActive(false);
            scheduleNextVoiceTurn();
          },
          speakLang
        );
      } else {
        if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
        speakingTimeoutRef.current = setTimeout(() => {
          speakingTimeoutRef.current = null;
          setIsSpeakingActive(false);
          scheduleNextVoiceTurn();
        }, Math.min(2500, Math.max(300, responseSpeech.length * 40)));
      }

      // Execute routine creation if requested
      if (response.newRoutine) {
        const effectiveId = getEffectivePatientId(currentUser);
        const rawPeriod = getLiveTemporalContext(speakLang).timeOfDay;
        const routinePeriod = (rawPeriod === 'night' ? 'evening' : rawPeriod) as 'morning' | 'afternoon' | 'evening';
        RoutineService.addRoutine(effectiveId, {
          id: `routine-${Date.now()}`,
          title: response.newRoutine.title,
          scheduledTime: response.newRoutine.scheduledTime,
          category: (response.newRoutine.category as any) || 'wellness',
          period: routinePeriod,
          isCompleted: false,
          enableAssistedRecall: true,
          streakCount: 0,
        });
      }

      if (response.suggestedAction) {
        if (response.suggestedAction.action === 'CALL_CAREGIVER') {
          handleActionDispatch('CALL_CAREGIVER', response.suggestedAction.targetId);
        } else if ((response.suggestedAction as any).autoDispatch === true) {
          setTimeout(() => {
            handleActionDispatch(response.suggestedAction!.action, response.suggestedAction!.targetId);
          }, 1200);
        }
      }
    } catch {
      triggerEmotion('reassuring', 3000);
    } finally {
      refreshAiStatus();
      setIsLoading(false);
    }
  };
  handleSendMessageRef.current = handleSendMessage;

  const stopVoiceConversation = useCallback((preserveNotice: boolean = false) => {
    voiceConversationActiveRef.current = false;
    setIsVoiceConversationActive(false);
    if (reviewTimerRef.current) {
      clearTimeout(reviewTimerRef.current);
      reviewTimerRef.current = null;
    }
    if (resumeVoiceTimerRef.current) {
      clearTimeout(resumeVoiceTimerRef.current);
      resumeVoiceTimerRef.current = null;
    }
    if (stopListeningRef.current) {
      stopListeningRef.current();
      stopListeningRef.current = null;
    }
    MultilingualVoicePipeline.stopMicrophone();
    SpeechService.abortListening();
    setListeningState(false);
    setInterimTranscript('');
    setIsVoiceReviewing(false);
    setReviewCountdown(null);
    if (!preserveNotice) {
      setMicNotice(null);
    }
    triggerEmotion('neutral');
  }, [setListeningState, triggerEmotion]);

  const startVoiceTurn = useCallback((opts?: { isAutoResume?: boolean }) => {
    if (!mountedRef.current) return;
    const isAutoResume = Boolean(opts?.isAutoResume);

    if (reviewTimerRef.current) {
      clearTimeout(reviewTimerRef.current);
      reviewTimerRef.current = null;
    }
    if (resumeVoiceTimerRef.current) {
      clearTimeout(resumeVoiceTimerRef.current);
      resumeVoiceTimerRef.current = null;
    }
    if (stopListeningRef.current) {
      stopListeningRef.current();
      stopListeningRef.current = null;
    }

    setMicNotice(null);
    setInterimTranscript('');
    setIsVoiceReviewing(false);
    setReviewCountdown(null);
    SpeechService.cancelSpeech();

    voiceConversationActiveRef.current = true;
    setIsVoiceConversationActive(true);
    setListeningState(true);
    triggerEmotion('listening', 0);

    const targetLang = effectiveSpeakLang || spokenInputLanguages?.[0] || language;
    let emittedResultInThisCall = false;
    let sessionEndedWithError = false;
    let isInsideSyncStart = true;

    const stopFn = MultilingualVoicePipeline.startListening(
      targetLang,
      (result) => {
        emittedResultInThisCall = true;
        stopListeningRef.current = null;
        setListeningState(false);
        setInterimTranscript('');

        if (result.success && result.transcript) {
          const trimmed = result.transcript.trim();
          if (!trimmed) return;
          const norm = trimmed.toLowerCase().replace(/\s+/g, ' ');
          const now = Date.now();

          // Guard against synchronous test-stub echo loops when auto-resuming
          if (
            isAutoResume &&
            isInsideSyncStart &&
            lastSubmittedVoiceRef.current &&
            lastSubmittedVoiceRef.current.norm === norm
          ) {
            voiceConversationActiveRef.current = false;
            setIsVoiceConversationActive(false);
            return;
          }

          // Guard against duplicate finals in the same utterance window
          if (
            lastSubmittedVoiceRef.current &&
            lastSubmittedVoiceRef.current.norm === norm &&
            now - lastSubmittedVoiceRef.current.at < 1200 &&
            isVoiceReviewingRef.current
          ) {
            return;
          }

          lastSubmittedVoiceRef.current = { norm, at: now };

          setInputText(trimmed);
          setIsVoiceReviewing(true);
          setReviewCountdown(2);
          if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);
          reviewTimerRef.current = setTimeout(() => {
            reviewTimerRef.current = null;
            if (!mountedRef.current) return;
            setIsVoiceReviewing(false);
            setReviewCountdown(null);
            handleSendMessageRef.current(trimmed);
          }, 2500);
        } else if (result.error) {
          voiceConversationActiveRef.current = false;
          setIsVoiceConversationActive(false);
          triggerEmotion('neutral');
          setMicNotice(result.error);
          setTimeout(() => setMicNotice(null), 6000);
        }
      },
      (error) => {
        sessionEndedWithError = true;
        stopListeningRef.current = null;
        voiceConversationActiveRef.current = false;
        setIsVoiceConversationActive(false);
        console.warn('Voice input error:', error);
        setListeningState(false);
        setInterimTranscript('');
        triggerEmotion('neutral');
        setMicNotice(error);
        setTimeout(() => setMicNotice(null), 6000);
      },
      () => {
        stopListeningRef.current = null;
        setListeningState(false);
        setInterimTranscript('');
        if (!emittedResultInThisCall && !sessionEndedWithError) {
          voiceConversationActiveRef.current = false;
          setIsVoiceConversationActive(false);
        }
      },
      spokenInputLanguages,
      (interim) => {
        setInterimTranscript(interim);
      },
      {
        onStart: () => {
          if (mountedRef.current) {
            setListeningState(true);
          }
        },
        onNoMatch: () => {
          voiceConversationActiveRef.current = false;
          setIsVoiceConversationActive(false);
          setListeningState(false);
          setMicNotice(SpeechService.getCalmVoiceErrorMessage('no-speech', targetLang));
        },
        onStructuredError: () => {
          sessionEndedWithError = true;
          voiceConversationActiveRef.current = false;
          setIsVoiceConversationActive(false);
          setListeningState(false);
        },
      }
    );

    isInsideSyncStart = false;
    stopListeningRef.current = emittedResultInThisCall || sessionEndedWithError ? null : stopFn;
  }, [
    effectiveSpeakLang,
    language,
    setListeningState,
    spokenInputLanguages,
    triggerEmotion,
  ]);
  startVoiceTurnRef.current = startVoiceTurn;

  const handleImmediateVoiceSend = () => {
    if (reviewTimerRef.current) {
      clearTimeout(reviewTimerRef.current);
      reviewTimerRef.current = null;
    }
    setIsVoiceReviewing(false);
    setReviewCountdown(null);
    handleSendMessageRef.current(inputText);
  };

  const handleCancelVoiceReview = () => {
    if (reviewTimerRef.current) {
      clearTimeout(reviewTimerRef.current);
      reviewTimerRef.current = null;
    }
    setIsVoiceReviewing(false);
    setReviewCountdown(null);
    setInputText('');
    setInterimTranscript('');
  };

  const toggleVoiceInput = () => {
    if (isListening || isVoiceConversationActive || voiceConversationActiveRef.current) {
      stopVoiceConversation(false);
    } else {
      startVoiceTurn({ isAutoResume: false });
    }
  };

  // Streamlined Contextual Memory Actions (Cognitive Patient-Centric)
  const quickActions = [
    {
      id: 'quick-routines',
      icon: CalendarCheck,
      title: t('sanctuary.action_routines'),
      desc: t('sanctuary.action_routines_desc'),
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      badgeColor: 'bg-purple-600 text-white',
      onClick: () => {
        triggerEmotion('guiding', 3000);
        if (onNavigateRoutines) {
          onNavigateRoutines();
        } else {
          const el = document.getElementById('daily-routines-workspace');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      },
    },
    {
      id: 'quick-item-memory',
      icon: MapPin,
      title: ui.itemMemoryTitle,
      desc: ui.itemMemoryDesc,
      color: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      badgeColor: 'bg-emerald-600 text-white',
      onClick: () => {
        triggerEmotion('helping_recall', 2500);
        setSelectedMemoryItemId(undefined);
        setShowItemMemoryModal(true);
      },
    },
    {
      id: 'quick-visual-recall',
      icon: Camera,
      title: ui.whoIsThisTitle,
      desc: ui.whoIsThisDesc,
      color: 'bg-rose-100 text-rose-900 border-rose-200',
      badgeColor: 'bg-rose-600 text-white',
      onClick: () => {
        triggerEmotion('explaining', 2500);
        setShowVisualRecallModal(true);
      },
    },
    ...(isAshaOnly
      ? [
          {
            id: 'quick-settings',
            icon: Settings,
            title:
              t('sanctuary.action_settings') !== 'sanctuary.action_settings'
                ? t('sanctuary.action_settings')
                : pickSanctuaryQuery(language, {
                    en: 'Settings & Profile',
                    hi: 'सेटिंग्स और प्रोफ़ाइल',
                    mr: 'सेटिंग्ज आणि प्रोफाइल',
                    bn: 'সেটিংস ও প্রোফাইল',
                    ta: 'அமைப்புகள் & சுயவிவரம்',
                    te: 'సెట్టింగ్‌లు & ప్రొఫైల్',
                    kn: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಮತ್ತು ಪ್ರೊಫೈಲ್',
                  }),
            desc:
              t('sanctuary.action_settings_desc') !== 'sanctuary.action_settings_desc'
                ? t('sanctuary.action_settings_desc')
                : pickSanctuaryQuery(language, {
                    en: 'Care preferences and navigation mode',
                    hi: 'देखभाल प्राथमिकताएँ और नेविगेशन मोड',
                    mr: 'काळजी प्राधान्ये आणि नेव्हिगेशन मोड',
                    bn: 'যত্নের পছন্দ ও নেভিগেশন মোড',
                    ta: 'பராமரிப்பு விருப்பங்கள் & வழிசெலுத்தல் முறை',
                    te: 'సంరక్షణ ప్రాధాన్యతలు మరియు నావిగేషన్ మోడ్',
                    kn: 'ಆರೈಕೆ ಆದ್ಯತೆಗಳು ಮತ್ತು ನ್ಯಾವಿగేಷನ್ ಮೋಡ್',
                  }),
            color: 'bg-slate-100 text-slate-900 border-slate-300',
            badgeColor: 'bg-slate-700 text-white',
            onClick: () => {
              triggerEmotion('explaining', 2000);
              navigate('/patient/profile');
            },
          },
        ]
      : []),
  ];

  return (
    <div
      className={`rounded-3xl p-5 md:p-7 transition-all duration-300 shadow-soft-purple border ${
        highContrast
          ? 'bg-neutral-950 text-white border-4 border-amber-400'
          : 'bg-gradient-to-br from-lavender-100 via-purple-50 to-pink-50/40 text-slate-900 border-purple-200/90'
      } ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={ui.companionHeading}
    >
      {/* Sanctuary Top Bar: Branding & Ambient Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-200/60 mb-5">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base md:text-lg text-slate-900 font-heading">
                {ui.companionHeading}
              </span>
              <span className="sr-only">{ui.companionHeading}</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full border border-purple-200">
                {ui.ashaName}
              </span>
              <button
                type="button"
                onClick={() => {
                  refreshAiStatus();
                  setShowAIModal(true);
                }}
                className={`text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-full border transition flex items-center gap-1 cursor-pointer shadow-2xs ${
                  aiStatus.isConfigured && aiStatus.executionState === 'LIVE_AI'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : aiStatus.executionState === 'NETWORK_FAILURE'
                    ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
                title={`${aiStatus.statusMessage} (Tap to configure API / Privacy)`}
                aria-label={`AI Status: ${aiStatus.statusMessage}. Tap to configure.`}
                data-testid="ai-status-pill"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    aiStatus.executionState === 'LIVE_AI'
                      ? 'bg-emerald-500 animate-pulse'
                      : aiStatus.executionState === 'NETWORK_FAILURE'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                />
                <span>
                  {aiStatus.executionState === 'LIVE_AI'
                    ? aiStatus.mode === 'REAL_GEMINI_API'
                      ? ui.pillGeminiEngine
                      : ui.pillQwenEngine
                    : aiStatus.executionState === 'NETWORK_FAILURE'
                    ? ui.pillUnavailable
                    : ui.pillOfflineFallback}
                </span>
              </button>

              <AshaRuntimeStatusBadge
                compact={true}
                showTechnicalDrawer={true}
                onStatusChange={refreshAiStatus}
              />

              <span
                data-testid="voice-pipeline-badge"
                className={`text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shadow-2xs ${
                  localBridgeActive
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : TIER_1_WEB_SPEECH_LANGUAGES.includes(language)
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
                title={
                  localBridgeActive
                    ? ui.devBridgeSim
                    : TIER_1_WEB_SPEECH_LANGUAGES.includes(language)
                    ? `${ui.webSpeech} (${language.toUpperCase()})`
                    : `${ui.textTouchLabel} (${language.toUpperCase()})`
                }
              >
                <span className={`w-1.5 h-1.5 rounded-full ${localBridgeActive ? 'bg-amber-500 animate-pulse' : TIER_1_WEB_SPEECH_LANGUAGES.includes(language) ? 'bg-blue-500' : 'bg-slate-400'}`} />
                <span>{localBridgeActive ? ui.devBridgeSim : TIER_1_WEB_SPEECH_LANGUAGES.includes(language) ? `${ui.webSpeech} (${language.toUpperCase()})` : `${ui.textTouchLabel} (${language.toUpperCase()})`}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Companion Audio Toggle & Minimize */}
        <div className="flex items-center space-x-2">
          {isAshaOnly && (
            <button
              type="button"
              onClick={() => navigate('/patient/profile')}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-100/90 hover:bg-purple-200 text-purple-900 border border-purple-300 transition cursor-pointer flex items-center space-x-1 shadow-2xs"
              title={ui.ashaOnlyLabel}
              aria-label={ui.ashaOnlyLabel}
              data-testid="asha-only-mode-badge"
            >
              <span>{ui.ashaOnlyLabel}</span>
              <Settings className="w-3 h-3 ml-0.5 text-purple-700" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setAutoSpeak(!autoSpeak);
              if (autoSpeak) SpeechService.cancelSpeech();
            }}
            className={`p-2 rounded-full border transition cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center ${
              autoSpeak
                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                : 'bg-white text-slate-500 border-slate-300'
            }`}
            title={autoSpeak ? ui.voiceMuteLabel : ui.voiceUnmuteLabel}
            aria-label={autoSpeak ? ui.voiceMuteLabel : ui.voiceUnmuteLabel}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 rounded-full bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 transition cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
            title={isMinimized ? ui.expandLabel : ui.minimizeLabel}
            aria-label={isMinimized ? ui.expandLabel : ui.minimizeLabel}
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* When Minimized: Calm fallback bar */}
      {isMinimized ? (
        <div
          onClick={() => setIsMinimized(false)}
          className="flex items-center justify-between bg-white/95 p-3.5 rounded-2xl border border-purple-200 cursor-pointer hover:bg-white transition shadow-sm"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setIsMinimized(false)}
          aria-label={ui.expandLabel}
        >
          <div className="flex items-center space-x-3">
            <CharacterVisualizer
              characterId="asha"
              state={characterState}
              expression={expression}
              mode="compact"
              size={48}
            />
            <div>
              <p className="text-sm font-bold text-purple-950">
                {ui.minimizedTitle}
              </p>
              <p className="text-xs text-slate-500">
                {ui.minimizedSubtitle}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
            {ui.openChat}
          </span>
        </div>
      ) : (
        /* BALANCED SANCTUARY LAYOUT: Side-by-Side on Desktop/Tablet, Vertical on Mobile */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* LEFT / TOP STAGE: Prominent Asha Character (md:col-span-5) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center p-3">
            {viewMode === 'canvas' ? (
              <div className="flex flex-col items-center w-full">
                <AshaInteractiveCompanion2D
                  mode="sanctuary"
                  externalExpression={expression}
                  speechText={lastSpokenSpeech}
                  isSpeaking={isSpeakingActive}
                  language={effectiveSpeakLang}
                  speakAudio={false}
                  sanctuaryStatusLabels={{
                    badgeName: ui.ashaName,
                    speaking: t('ai.speaking_gently') !== 'ai.speaking_gently' ? t('ai.speaking_gently') : ui.ashaName,
                    idle: t('ai.calm_ready') !== 'ai.calm_ready' ? t('ai.calm_ready') : ui.tapInteract,
                    tapTitle: ui.tapInteract,
                    ariaLabel: ui.companionHeading,
                  }}
                  reducedMotion={reducedMotion}
                  highContrast={highContrast}
                  onTap={() => triggerEmotion('greeting', 3500)}
                />
                {/* Accessible Screen-Reader Anchor & Test Compatibility */}
                <div className="sr-only" aria-hidden="false">
                  <CharacterVisualizer
                    characterId="asha"
                    state={characterState}
                    expression={expression}
                    mode="primary"
                    size={180}
                    showBadge={true}
                    showLabel={true}
                    showAura={true}
                    highContrast={highContrast}
                    reducedMotion={reducedMotion}
                  />
                </div>
              </div>
            ) : (
              <div
                className="cursor-pointer transition-transform hover:scale-102 active:scale-98"
                onClick={() => triggerEmotion('greeting', 3500)}
                title="Tap Asha to say hello"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && triggerEmotion('greeting', 3500)}
                aria-label="Interactive Asha character. Tap to interact."
              >
                <CharacterVisualizer
                  characterId="asha"
                  state={characterState}
                  expression={expression}
                  mode="primary"
                  size={180}
                  showBadge={true}
                  showLabel={true}
                  showAura={true}
                  highContrast={highContrast}
                  reducedMotion={reducedMotion}
                />
              </div>
            )}

            {/* View Mode Toggle Pill & Tap Prompt */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setViewMode((prev) => (prev === 'canvas' ? 'avatar' : 'canvas'))}
                className="text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1 rounded-full transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title={viewMode === 'canvas' ? ui.viewFocusAvatar : ui.viewCanvasRig}
                aria-label={viewMode === 'canvas' ? ui.viewFocusAvatar : ui.viewCanvasRig}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{viewMode === 'canvas' ? ui.viewCanvasRig : ui.viewFocusAvatar}</span>
              </button>
              <span className="text-[11px] text-purple-700 font-medium opacity-90">
                {ui.tapInteract}
              </span>
            </div>
          </div>

          {/* RIGHT / MAIN AREA: Conversation Area & Quick Actions (md:col-span-7) */}
          <div className="md:col-span-7 space-y-4">
            {/* Conversation Messages Balloon */}
            <div
              className={`rounded-2xl p-4 border max-h-48 overflow-y-auto space-y-2.5 transition shadow-xs ${
                highContrast
                  ? 'bg-neutral-900 border-neutral-700 text-white'
                  : 'bg-white/95 border-purple-100 text-slate-800'
              }`}
              role="region"
              aria-label={ui.convoRegionAria}
            >
              {messages.slice(-3).map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl transition ${
                    msg.sender === 'user'
                      ? 'bg-purple-100/90 text-purple-950 border border-purple-200 ml-auto max-w-[90%] font-semibold'
                      : highContrast
                      ? 'bg-neutral-800 text-white border border-neutral-700 font-medium'
                      : 'bg-lavender-50/80 text-purple-950 font-medium'
                  }`}
                >
                  <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>

                  {/* Explicit AI Engine / Simulation Disclosure Badge */}
                  {msg.sender === 'ai' && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]" data-testid="ai-execution-badge">
                      {msg.responseSource && (
                        <AshaRuntimeStatusBadge responseProvenance={msg.responseSource} />
                      )}
                      {msg.isRealAI ? (
                        (() => {
                          const isGeminiMsg =
                            msg.responseSource === 'GEMINI_PRIMARY' || msg.executionMode === 'REAL_GEMINI_API';
                          const geminiModelLabel =
                            msg.modelUsed || AshaRemoteAdapter.getCachedPrimaryModel() || 'gemini-3.5-flash-lite';
                          const qwenModelLabel =
                            msg.modelUsed && !msg.modelUsed.toLowerCase().includes('gemini')
                              ? msg.modelUsed
                              : 'Qwen2.5-1.5B-Instruct (Apple Metal GPU)';
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-bold ${
                                isGeminiMsg
                                  ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              <Sparkles className={`w-2.5 h-2.5 ${isGeminiMsg ? 'text-indigo-600' : 'text-emerald-600'}`} />
                              {isGeminiMsg
                                ? `${ui.badgeGemini} (${geminiModelLabel})`
                                : `${ui.badgeQwen} (${qwenModelLabel})`}
                            </span>
                          );
                        })()
                      ) : msg.executionState === 'QUOTA_EXHAUSTED' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 font-bold">
                          <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                          {ui.badgeQuota}
                        </span>
                      ) : msg.executionState === 'NETWORK_FAILURE' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 font-bold">
                          <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                          {ui.badgeOffline}
                        </span>
                      ) : msg.executionState === 'MISSING_CREDENTIALS' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
                          <Cpu className="w-2.5 h-2.5 text-slate-600" />
                          {ui.badgeUnconfigured}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-100/80 text-purple-800 border border-purple-200 font-medium">
                          <Cpu className="w-2.5 h-2.5 text-purple-600" />
                          {ui.badgeLocalSim}
                        </span>
                      )}
                      {msg.configNotice && (
                        <span className="text-[10px] text-amber-700 italic font-medium">
                          •{' '}
                          {msg.configNotice.includes('Engine C Primary')
                            ? ui.noticeGemini
                            : msg.configNotice.includes('Engine C Fallback')
                            ? ui.noticeQwenFallback
                            : msg.configNotice.includes('local offline development fallback')
                            ? ui.noticeOffline
                            : msg.configNotice}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Immediate Emergency Care Support Banner */}
                  {msg.isEmergency && (
                    <div className="mt-2.5 p-3 rounded-xl border border-rose-300 bg-rose-50/95 text-rose-950 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-900">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{ui.emergencyTitle}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleActionDispatch('CALL_CAREGIVER')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0 shadow-xs"
                      >
                        {ui.contactCaregiver}
                      </button>
                    </div>
                  )}

                  {/* Class 3 Action Confirmation Guard */}
                  {msg.pendingConfirmation && (
                    <div className="mt-2.5 p-3.5 rounded-xl border-2 border-amber-300 bg-amber-50/95 text-amber-950 space-y-2 shadow-2xs">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                        <span>{ui.confirmTitle}</span>
                      </div>
                      <p className="text-xs font-medium text-amber-900 leading-relaxed">
                        {msg.pendingConfirmation.proposalText}
                      </p>
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmPending(msg.pendingConfirmation!.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition"
                        >
                          {ui.confirmSave}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelPending(msg.pendingConfirmation!.id)}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold cursor-pointer transition"
                        >
                          {ui.cancelBtn}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Clarification Options / Ambiguity Resolution */}
                  {msg.clarificationOptions && msg.clarificationOptions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.clarificationOptions.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendMessage(opt.query)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200 transition cursor-pointer"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.suggestedAction && !msg.pendingConfirmation && (
                    <button
                      type="button"
                      onClick={() =>
                        handleActionDispatch(
                          msg.suggestedAction!.action,
                          msg.suggestedAction!.targetId
                        )
                      }
                      className="mt-2.5 inline-flex items-center space-x-1.5 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <span>👉 {msg.suggestedAction.description}</span>
                    </button>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center space-x-2 text-xs text-purple-600 py-1 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
                  <span>{ui.thinkingGently}</span>
                </div>
              )}
            </div>

            {/* Conversation Input Area: Accessible Text & Real Speech Detection */}
            <div className="space-y-2">
              {/* Active Speech Interim Recognition Banner */}
              {isListening && interimTranscript && (
                <div data-testid="interim-voice-pill" className="flex items-center space-x-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl font-medium animate-in fade-in">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                  <span>{t('voice.hearing', { transcript: interimTranscript }) || `Asha is hearing: "${interimTranscript}"`}</span>
                </div>
              )}

              {/* Voice Review / Transparent Confirmation Banner */}
              {isVoiceReviewing && inputText && (
                <div data-testid="voice-review-banner" className="bg-purple-50 border border-purple-200 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-purple-900 shadow-xs animate-in fade-in">
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>
                      {t('voice.heard_label')} <strong className="font-bold">"{inputText}"</strong>
                      {reviewCountdown !== null && <span className="text-purple-600 font-normal"> {t('voice.sending_in', { count: reviewCountdown })}</span>}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      data-testid="voice-review-send-btn"
                      onClick={handleImmediateVoiceSend}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-2xs transition cursor-pointer"
                    >
                      {t('voice.send_now')}
                    </button>
                    <button
                      type="button"
                      data-testid="voice-review-cancel-btn"
                      onClick={handleCancelVoiceReview}
                      className="px-3 py-1 bg-white hover:bg-purple-100 text-purple-800 border border-purple-300 font-medium rounded-lg transition cursor-pointer"
                    >
                      {t('voice.cancel')}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={isListening ? (interimTranscript || t('ai.voice_start')) : t('sanctuary.input_placeholder')}
                    aria-label={t('sanctuary.input_placeholder')}
                    className={`w-full py-3.5 pl-4 pr-11 rounded-2xl border text-sm md:text-base font-medium focus:outline-none transition shadow-inner ${
                      highContrast
                        ? 'bg-black text-white border-2 border-amber-400 focus:ring-2 focus:ring-amber-300'
                        : isListening
                        ? 'bg-white border-purple-500 ring-2 ring-purple-300 placeholder-purple-700 font-bold'
                        : 'bg-white border-purple-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-200'
                    }`}
                  />
                  {inputText && (
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-purple-600 hover:text-purple-800 transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title={t('sanctuary.send')}
                      aria-label={t('sanctuary.send')}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Microphone Button with Honest Capability Feedback */}
                <button
                  type="button"
                  data-testid="sanctuary-mic-button"
                  data-listening={isListening ? 'true' : 'false'}
                  data-voice-active={isVoiceConversationActive ? 'true' : 'false'}
                  onClick={toggleVoiceInput}
                  className={`flex-shrink-0 flex items-center justify-center p-3.5 rounded-2xl transition-all cursor-pointer min-w-[50px] min-h-[50px] shadow-sm ${
                    !isSpeechSupported
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : isListening || isVoiceConversationActive
                      ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-200'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                  title={
                    !isSpeechSupported
                      ? t('sanctuary.mic_unsupported')
                      : isListening
                      ? t('ai.voice_start')
                      : t('ai.voice_stop')
                  }
                  aria-label={
                    !isSpeechSupported
                      ? t('sanctuary.mic_unsupported')
                      : isListening
                      ? t('ai.voice_start')
                      : t('ai.voice_stop')
                  }
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>

              {/* Honest Microphone Unsupported Notice Toast */}
              {micNotice && (
                <div
                  className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center space-x-2 animate-in fade-in"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{micNotice}</span>
                </div>
              )}

              {/* Helpful Suggestion Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-500 font-semibold flex-shrink-0">{ui.tryAsking}</span>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(s.query)}
                    className="flex-shrink-0 bg-white/90 hover:bg-white text-purple-700 px-3 py-1 rounded-full border border-purple-200 font-semibold transition-colors shadow-2xs cursor-pointer min-h-[30px]"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tactile Quick-Action Alternative Cards (5 Destinations) */}
            <div className="pt-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {ui.quickTitle}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickActions.map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <button
                      key={qa.id}
                      type="button"
                      onClick={qa.onClick}
                      className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between min-h-[72px] cursor-pointer group shadow-2xs hover:shadow-sm ${
                        highContrast
                          ? 'bg-neutral-900 border-2 border-neutral-700 hover:border-amber-400 text-white'
                          : `bg-white/95 hover:bg-white border-purple-200/80 hover:border-purple-300 text-slate-800`
                      }`}
                      aria-label={`${qa.title} - ${qa.desc}`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div
                          className={`p-2 rounded-xl transition-transform group-hover:scale-105 ${qa.color}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          {ui.openBtn}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1">
                          {qa.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1">
                          {qa.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Caregiver Escalation Contact Modal (TASK-ASHA-05) */}
      {showCaregiverModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="caregiver-modal-title"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-purple-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="caregiver-modal-title" className="text-base font-bold text-gray-900">
                    {ui.caregiverModalTitle}
                  </h3>
                  <p className="text-xs text-purple-700">{ui.caregiverHere}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCaregiverModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition cursor-pointer"
                aria-label={ui.closeCaregiverAria}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-purple-50/80 rounded-2xl p-4 border border-purple-100 flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-purple-200 border-2 border-white shadow-xs overflow-hidden flex items-center justify-center text-purple-800 font-bold text-lg shrink-0">
                {patientContext?.lovedOnes?.sampleMembers?.[0]?.photoUrl ? (
                  <img
                    src={patientContext.lovedOnes.sampleMembers[0].photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{patientContext?.lovedOnes?.sampleMembers?.[0]?.name?.[0] || 'P'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-purple-950 truncate">
                  {patientContext?.lovedOnes?.sampleMembers?.[0]?.name || 'Priya Sharma'}
                </p>
                <p className="text-xs text-purple-700 truncate">
                  {patientContext?.lovedOnes?.sampleMembers?.[0]?.relationship || 'Daughter & Primary Caregiver'}
                </p>
                <p className="text-xs font-mono text-gray-600 mt-0.5">
                  {patientContext?.lovedOnes?.sampleMembers?.[0]?.phoneNumber || '+91 98201 12345'}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {ui.caregiverCallDesc}
            </p>

            <div className="space-y-2 pt-2">
              <a
                href={`tel:${patientContext?.lovedOnes?.sampleMembers?.[0]?.phoneNumber || '+919820112345'}`}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
              >
                <Phone className="w-5 h-5" />
                <span>{patientContext?.lovedOnes?.sampleMembers?.[0]?.name || 'Priya'}</span>
              </a>

              <a
                href="tel:112"
                className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{ui.callEmergency112}</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setShowCaregiverModal(false);
                  navigate('/patient/loved-ones');
                }}
                className="w-full py-2 text-center text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
              >
                {ui.openFamilySanctuary}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Engine & Privacy Configuration Modal */}
      {showAIModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-modal-title"
          data-testid="ai-transparency-modal"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-purple-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="ai-modal-title" className="text-base font-bold text-gray-900">
                    {ui.aiModalTitle}
                  </h3>
                  <p className="text-xs text-purple-700">
                    {aiStatus.executionState === 'LIVE_AI'
                      ? aiStatus.mode === 'REAL_GEMINI_API'
                        ? ui.aiModalSubGemini
                        : ui.aiModalSubQwen
                      : ui.aiModalSubOffline}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAIModal(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition cursor-pointer"
                aria-label={ui.closeModalAria}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Engine Status */}
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                aiStatus.isConfigured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      aiStatus.executionState === 'LIVE_AI' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {aiStatus.executionState === 'LIVE_AI'
                    ? aiStatus.mode === 'REAL_GEMINI_API'
                      ? ui.modalStatusGeminiReady
                      : ui.modalStatusQwenReady
                    : aiStatus.executionState === 'NETWORK_FAILURE'
                    ? ui.modalStatusUnavailable
                    : ui.modalStatusOffline}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/80 border">
                  {aiStatus.mode}
                </span>
              </div>
              <p className="font-medium font-mono text-[11px]">{aiStatus.modelIdentifier}</p>
              <p className="text-[11px] opacity-80">{aiStatus.quotaInfo}</p>
            </div>

            {/* Inference Gateway Configuration & Health Ping */}
            <div className="space-y-3 pt-1">
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-purple-900">
                  <span>
                    {aiStatus.mode === 'REAL_GEMINI_API'
                      ? ui.gatewayCardGeminiTitle
                      : ui.gatewayCardLocalTitle}
                  </span>
                  <span className="text-[11px] font-mono bg-purple-200/80 text-purple-800 px-2 py-0.5 rounded">
                    {AshaRemoteAdapter.shouldUseLocalGateway()
                      ? AshaRemoteAdapter.getBaseUrl()
                      : 'Firebase AI Logic + App Check'}
                  </span>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {AshaRemoteAdapter.shouldUseLocalGateway()
                    ? aiStatus.mode === 'REAL_GEMINI_API'
                      ? ui.gatewayCardGeminiDesc
                      : ui.gatewayCardLocalDesc
                    : aiStatus.statusMessage}
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-800">
                    {aiStatus.executionState === 'LIVE_AI'
                      ? aiStatus.mode === 'REAL_GEMINI_API'
                        ? ui.gatewayStatusGeminiReady
                        : ui.gatewayStatusLocalReady
                      : ui.gatewayStatusOffline}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!AshaRemoteAdapter.shouldUseLocalGateway()) {
                        refreshAiStatus();
                        const st = ConversationalAIService.getStatus();
                        setServerFeedback(st.isConfigured ? `✓ ${st.statusMessage}` : `⚠ ${st.statusMessage}`);
                        return;
                      }
                      setServerFeedback('Pinging local Engine C gateway...');
                      try {
                        const status = await AshaRemoteAdapter.checkHealth(true);
                        refreshAiStatus();
                        if (status.isOnline) {
                          setServerFeedback(
                            `✓ ${status.model} (${status.patientId})`
                          );
                        } else {
                          setServerFeedback('⚠ Local Engine C gateway offline');
                        }
                      } catch {
                        setServerFeedback('⚠ Local Engine C gateway offline');
                      }
                    }}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    {ui.testConnectionBtn}
                  </button>
                </div>
                {serverFeedback && (
                  <p className="text-xs font-semibold text-purple-700 mt-1">{serverFeedback}</p>
                )}
              </div>

              {/* Active Model Selector (Dev Fallback Only) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Model ({selectedModel})
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    ConversationalAIService.setModel(newModel);
                    setSelectedModel(newModel);
                    refreshAiStatus();
                  }}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {ConversationalAIService.SUPPORTED_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Server-Side Security Disclosure */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1 text-amber-950">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{ui.securityTitle}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  {ui.securityBodyServerOnly}
                </p>
              </div>

              {/* Privacy and Clinical Boundary Statement */}
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-xs space-y-1.5 text-purple-950">
                <div className="flex items-center gap-1.5 font-bold text-purple-900">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>{ui.privacyTitle}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-purple-900">
                  {aiStatus.mode === 'REAL_GEMINI_API'
                    ? ui.privacyBodyGemini
                    : ui.privacyBodyLocal}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAIModal(false);
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {ui.doneBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Location Memory Modal */}
      <ItemMemoryModal
        isOpen={showItemMemoryModal}
        onClose={() => {
          setShowItemMemoryModal(false);
          setSelectedMemoryItemId(undefined);
        }}
        patientId={currentUser?.uid || 'sunita_01'}
        patientName={effectiveName}
        initialSelectedItemId={selectedMemoryItemId}
      />

      {/* Loved Ones Visual Recall Modal */}
      <LovedOnesVisualRecallModal
        isOpen={showVisualRecallModal}
        onClose={() => setShowVisualRecallModal(false)}
        patientId={currentUser?.uid || 'sunita_01'}
        patientName={effectiveName}
      />
    </div>
  );
};
