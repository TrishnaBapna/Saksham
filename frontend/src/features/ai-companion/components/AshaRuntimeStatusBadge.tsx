/**
 * SAKSHAM NEURO-CARE — ASHA RUNTIME STATUS BADGE & PROVENANCE INSPECTOR
 * 
 * Truthful runtime transparency badge for patient peace-of-mind and
 * rigorous AIU Anveshan demonstration integrity.
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. Honest Disclosure: Never claim local SLM is active when port 8096 is offline.
 * 2. Patient-Centred Accessibility: Calming, non-stigmatizing, high-contrast, respects reduced motion.
 * 3. Jury Transparency Panel: Provides technical inspectability of local Qwen SLM, deterministic fallback,
 *    zero cloud egress, and response provenance.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Cpu,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Network,
} from 'lucide-react';
import { AshaRemoteAdapter, AshaHealthStatus } from '../services/ashaRemoteAdapter.js';
import { ConversationalAIService } from '../services/conversationalAIService.js';
import { AshaRuntimeState, AshaResponseProvenance } from '../types/conversation.types.js';
import { useAccessibility } from '../../../context/AccessibilityContext.js';
import { useLanguage } from '../../../context/LanguageContext.js';

interface BadgeLocalizationSet {
  ready: string;
  basic: string;
  unavailable: string;
  checking: string;
  geminiPrimary: string;
  residentSlm: string;
  deterministicHandler: string;
  safetyGuidance: string;
  offlineFallback: string;
  unknownSource: string;
  detailsToggleLabel: string;
  detailsToggleTitle: string;
  panelAriaLabel: string;
  panelTitle: string;
  pingLabel: string;
  pingTitle: string;
  engineGeminiLabel: string;
  engineLocalLabel: string;
  runtimeStateLabel: string;
  endpointLabel: string;
  gatewaySecurityLabel: string;
  cloudEgressLabel: string;
  geminiCloudValue: string;
  zeroCloudValue: string;
  fallbackTitle: string;
  geminiFallbackDesc: string;
  localFallbackDesc: string;
  lastCheckedLabel: string;
}

const LOCALIZED_BADGE_LABELS: Record<string, BadgeLocalizationSet> = {
  en: {
    ready: "Asha's AI is available",
    basic: 'Asha is using basic support',
    unavailable: "Asha's AI is currently unavailable",
    checking: 'Checking Asha',
    geminiPrimary: 'Gemini Primary (Gateway)',
    residentSlm: 'Resident SLM (Qwen 1.5B)',
    deterministicHandler: 'Deterministic Handler',
    safetyGuidance: 'Safety Policy Guidance',
    offlineFallback: 'Offline Fallback',
    unknownSource: 'Unknown Source',
    detailsToggleLabel: 'Toggle technical runtime details for Anveshan jury',
    detailsToggleTitle: 'Inspect runtime details (AIU Anveshan Jury View)',
    panelAriaLabel: 'Asha Runtime Technical Transparency Panel',
    panelTitle: 'Runtime Architecture Transparency',
    pingLabel: 'Ping',
    pingTitle: 'Ping AI gateway on port 8096',
    engineGeminiLabel: 'Cloud Primary + Local Fallback:',
    engineLocalLabel: 'Local SLM Engine:',
    runtimeStateLabel: 'Runtime State:',
    endpointLabel: 'Endpoint Gateway:',
    gatewaySecurityLabel: 'Cloud & Gateway Mode:',
    cloudEgressLabel: 'Cloud Egress / Budget:',
    geminiCloudValue: 'Cloud Gemini API (Server Gateway) + Local Qwen',
    zeroCloudValue: '₹0.00 (Zero Cloud APIs)',
    fallbackTitle: 'Deterministic Neuro-Care Safety Fallback:',
    geminiFallbackDesc:
      'Engine C uses Cloud Google Gemini via server gateway (key never sent to browser) with automatic fallback to local Resident Qwen 2.5 1.5B, and on-device deterministic safety rules remain 100% active.',
    localFallbackDesc:
      'If the resident Qwen engine is unreachable or offline, Saksham automatically transitions to the on-device deterministic cognitive rule protocol. No patient requests are lost, and safety boundaries remain 100% active.',
    lastCheckedLabel: 'Last Checked:',
  },
  hi: {
    ready: 'आशा की एआई सेवा उपलब्ध है',
    basic: 'आशा बुनियादी सहायता उपयोग कर रही है',
    unavailable: 'आशा की एआई सेवा अभी उपलब्ध नहीं है',
    checking: 'आशा की जाँच हो रही है',
    geminiPrimary: 'जेमिनी प्राइमरी (गेटवे)',
    residentSlm: 'लोकल क्वेन (Qwen 1.5B)',
    deterministicHandler: 'नियमित नियम सहायता',
    safetyGuidance: 'सुरक्षा नीति मार्गदर्शन',
    offlineFallback: 'ऑफ़लाइन बैकअप सहायता',
    unknownSource: 'अज्ञात स्रोत',
    detailsToggleLabel: 'तकनीकी रनटाइम विवरण देखें',
    detailsToggleTitle: 'रनटाइम आर्किटेक्चर और सुरक्षा विवरण देखें',
    panelAriaLabel: 'आशा रनटाइम तकनीकी पारदर्शिता पैनल',
    panelTitle: 'रनटाइम आर्किटेक्चर पारदर्शिता',
    pingLabel: 'पिंग',
    pingTitle: 'पोर्ट 8096 गेटवे की जाँच करें',
    engineGeminiLabel: 'क्लाउड प्राइमरी + लोकल बैकअप:',
    engineLocalLabel: 'लोकल SLM इंजन:',
    runtimeStateLabel: 'रनटाइम स्थिति:',
    endpointLabel: 'गेटवे एंडपॉइंट:',
    gatewaySecurityLabel: 'क्लाउड और गेटवे सुरक्षा:',
    cloudEgressLabel: 'क्लाउड उपयोग / बजट:',
    geminiCloudValue: 'क्लाउड जेमिनी API (सर्वर गेटवे) + लोकल क्वेन',
    zeroCloudValue: '₹0.00 (शून्य क्लाउड API)',
    fallbackTitle: 'सुरक्षित नियमावली बैकअप:',
    geminiFallbackDesc:
      'इंजन C सर्वर गेटवे के माध्यम से क्लाउड गूगल जेमिनी (प्राइमरी) का उपयोग करता है और समस्या आने पर लोकल क्वेन 2.5 1.5B पर आ जाता है। सुरक्षा नियम हमेशा 100% सक्रिय रहते हैं।',
    localFallbackDesc:
      'यदि लोकल क्वेन इंजन उपलब्ध नहीं है, तो सक्षम स्वतः डिवाइस पर सुरक्षित नियम प्रणाली पर काम करता है और सुरक्षा नियम 100% सक्रिय रहते हैं।',
    lastCheckedLabel: 'अंतिम जाँच:',
  },
  mr: {
    ready: 'आशाची एआय सेवा उपलब्ध आहे',
    basic: 'आशा प्राथमिक सहाय्य वापरत आहे',
    unavailable: 'आशाची एआय सेवा सध्या उपलब्ध नाही',
    checking: 'आशा तपासली जात आहे',
    geminiPrimary: 'जेमिनी प्रायमरी (गेटवे)',
    residentSlm: 'लोकल क्वेन (Qwen 1.5B)',
    deterministicHandler: 'नियमित नियम सहाय्य',
    safetyGuidance: 'सुरक्षा धोरण मार्गदर्शन',
    offlineFallback: 'ऑफलाइन बॅकअप सहाय्य',
    unknownSource: 'अज्ञात स्रोत',
    detailsToggleLabel: 'तांत्रिक रनटाइम तपशील पहा',
    detailsToggleTitle: 'रनटाइम रचना आणि सुरक्षा तपशील पहा',
    panelAriaLabel: 'आशा रनटाइम तांत्रिक पारदर्शकता पॅनेल',
    panelTitle: 'रनटाइम रचना पारदर्शकता',
    pingLabel: 'पिंग',
    pingTitle: 'पोर्ट 8096 गेटवे तपासा',
    engineGeminiLabel: 'क्लाउड प्रायमरी + लोकल बॅकअप:',
    engineLocalLabel: 'लोकल SLM इंजिन:',
    runtimeStateLabel: 'रनटाइम स्थिती:',
    endpointLabel: 'गेटवे एंडपॉइंट:',
    gatewaySecurityLabel: 'क्लाउड व गेटवे मोड:',
    cloudEgressLabel: 'क्लाउड वापर / खर्च:',
    geminiCloudValue: 'क्लाउड जेमिनी API (सर्व्हर गेटवे) + लोकल क्वेन',
    zeroCloudValue: '₹0.00 (क्लाउड API नाही)',
    fallbackTitle: 'सुरक्षित नियम बॅकअप:',
    geminiFallbackDesc:
      'इंजिन C सर्व्हर गेटवेद्वारे क्लाउड जेमिनी (प्रायमरी) वापरते आणि अडचण आल्यास लोकल क्वेन 2.5 1.5B बॅकअपवर जाते. सर्व सुरक्षा नियम 100% सक्रिय राहतात.',
    localFallbackDesc:
      'लोकल क्वेन इंजिन उपलब्ध नसल्यास सक्षम सुरक्षित स्थानिक नियमावलीवर कार्य करते आणि रुग्णाची सुरक्षा 100% अबाधित राहते.',
    lastCheckedLabel: 'शेवटची तपासणी:',
  },
  bn: {
    ready: 'আশার এআই সেবা উপলব্ধ আছে',
    basic: 'আশা প্রাথমিক সহায়তা ব্যবহার করছে',
    unavailable: 'আশার এআই সেবা বর্তমানে উপলব্ধ নয়',
    checking: 'আশা যাচাই করা হচ্ছে',
    geminiPrimary: 'জেমিনি প্রাইমারি (গেটওয়ে)',
    residentSlm: 'লোকাল কুয়েন (Qwen 1.5B)',
    deterministicHandler: 'নির্ধারিত সহায়ক নিয়ম',
    safetyGuidance: 'নিরাপত্তা নীতি নির্দেশিকা',
    offlineFallback: 'অফলাইন ব্যাকআপ',
    unknownSource: 'অজানা উৎস',
    detailsToggleLabel: 'প্রযুক্তিগত রানটাইম বিবরণ দেখুন',
    detailsToggleTitle: 'রানটাইম স্থাপত্য ও নিরাপত্তা বিবরণ দেখুন',
    panelAriaLabel: 'আশা রানটাইম প্রযুক্তিগত স্বচ্ছতা প্যানেল',
    panelTitle: 'রানটাইম স্থাপত্য স্বচ্ছতা',
    pingLabel: 'পিং',
    pingTitle: 'পোর্ট 8096 গেটওয়ে যাচাই করুন',
    engineGeminiLabel: 'ক্লাউড প্রাইমারি + লোকাল ব্যাকআপ:',
    engineLocalLabel: 'লোকাল SLM ইঞ্জিন:',
    runtimeStateLabel: 'রানটাইম অবস্থা:',
    endpointLabel: 'গেটওয়ে এন্ডপয়েন্ট:',
    gatewaySecurityLabel: 'ক্লাউড ও গেটওয়ে মোড:',
    cloudEgressLabel: 'ক্লাউড ব্যবহার / বাজেট:',
    geminiCloudValue: 'ক্লাউড জেমিনি API (সার্ভার গেটওয়ে) + লোকাল কুয়েন',
    zeroCloudValue: '₹0.00 (ক্লাউড API নেই)',
    fallbackTitle: 'নিরাপত্তা নিয়ম ব্যাকআপ:',
    geminiFallbackDesc:
      'ইঞ্জিন C সার্ভার গেটওয়ের মাধ্যমে ক্লাউড গুগল জেমিনি (প্রাইমারি) ব্যবহার করে এবং ব্যর্থ হলে লোকাল কুয়েন 2.5 1.5B ব্যাকআপে চলে। নিরাপত্তা নিয়ম 100% সক্রিয় থাকে।',
    localFallbackDesc:
      'লোকাল কুয়েন ইঞ্জিন অনুপলব্ধ থাকলে সক্ষম ডিভাইসের নিরাপদ নিয়মাবলীতে চলে আসে এবং রোগীর নিরাপত্তা 100% অক্ষুণ্ণ থাকে।',
    lastCheckedLabel: 'সর্বশেষ যাচাই:',
  },
  ta: {
    ready: 'ஆஷாவின் AI சேவை கிடைக்கிறது',
    basic: 'ஆஷா அடிப்படை உதவியைப் பயன்படுத்துகிறது',
    unavailable: 'ஆஷாவின் AI சேவை தற்போது கிடைக்கவில்லை',
    checking: 'ஆஷாவைச் சரிபார்க்கிறது',
    geminiPrimary: 'ஜெமினி முதன்மை (கேட்வே)',
    residentSlm: 'உள்ளூர் குவென் (Qwen 1.5B)',
    deterministicHandler: 'விதி அடிப்படை உதவி',
    safetyGuidance: 'பாதுகாப்பு வழிகாட்டல்',
    offlineFallback: 'ஆஃப்லைன் மாற்று',
    unknownSource: 'அறியப்படாத மூலம்',
    detailsToggleLabel: 'தொழில்நுட்ப இயக்க விவரங்களைக் காட்டு',
    detailsToggleTitle: 'இயக்க கட்டமைப்பு விவரங்களைப் பார்வையிடு',
    panelAriaLabel: 'ஆஷா இயக்க வெளிப்படைத்தன்மைப் பலகம்',
    panelTitle: 'இயக்கக் கட்டமைப்பு வெளிப்படைத்தன்மை',
    pingLabel: 'பிங்',
    pingTitle: 'போர்ட் 8096 கேட்வேயைச் சரிபார்',
    engineGeminiLabel: 'கிளவுட் முதன்மை + உள்ளூர் மாற்று:',
    engineLocalLabel: 'உள்ளூர் SLM இயந்திரம்:',
    runtimeStateLabel: 'இயக்க நிலை:',
    endpointLabel: 'கேட்வே முகவரி:',
    gatewaySecurityLabel: 'கிளவுட் & கேட்வே நிலை:',
    cloudEgressLabel: 'கிளவுட் பயன்பாடு / செலவு:',
    geminiCloudValue: 'கிளவுட் ஜெமினி API (சர்வர் கேட்வே) + உள்ளூர் குவென்',
    zeroCloudValue: '₹0.00 (கிளவுட் API இல்லை)',
    fallbackTitle: 'பாதுகாப்பு விதி மாற்று:',
    geminiFallbackDesc:
      'இயந்திரம் C சர்வர் கேட்வே வழியாக ஜெமினியை (முதன்மை) பயன்படுத்துகிறது மற்றும் தேவைப்பட்டால் உள்ளூர் குவென் 1.5Bக்கு மாறும்.',
    localFallbackDesc:
      'உள்ளூர் குவென் கிடைக்காதபோது, பாதுகாப்பு விதிகள் 100% செயலில் இருக்கும் வகையில் சாதன விதிகள் இயங்கும்.',
    lastCheckedLabel: 'கடைசி சோதனை:',
  },
  te: {
    ready: 'ఆశా AI సేవ అందుబాటులో ఉంది',
    basic: 'ఆశా ప్రాథమిక సహాయం ఉపయోగిస్తోంది',
    unavailable: 'ఆశా AI సేవ ప్రస్తుతం అందుబాటులో లేదు',
    checking: 'ఆశాను తనిఖీ చేస్తోంది',
    geminiPrimary: 'జెమిని ప్రైమరీ (గేట్‌వే)',
    residentSlm: 'లోకల్ క్వెన్ (Qwen 1.5B)',
    deterministicHandler: 'నియమాధారిత సహాయం',
    safetyGuidance: 'భద్రతా విధాన మార్గదర్శకం',
    offlineFallback: 'ఆఫ్‌లైన్ బ్యాకప్',
    unknownSource: 'తెలియని మూలం',
    detailsToggleLabel: 'సాంకేతిక రన్‌టైమ్ వివరాలను చూడండి',
    detailsToggleTitle: 'రన్‌టైమ్ వివరాలను పరిశీలించండి',
    panelAriaLabel: 'ఆశా రన్‌టైమ్ పారదర్శకత ప్యానెల్',
    panelTitle: 'రన్‌టైమ్ నిర్మాణ పారదర్శకత',
    pingLabel: 'పింగ్',
    pingTitle: 'పోర్ట్ 8096 గేట్‌వేను తనిఖీ చేయండి',
    engineGeminiLabel: 'క్లౌడ్ ప్రైమరీ + లోకల్ బ్యాకప్:',
    engineLocalLabel: 'లోకల్ SLM ఇంజిన్:',
    runtimeStateLabel: 'రన్‌టైమ్ స్థితి:',
    endpointLabel: 'గేట్‌వే చిరునామా:',
    gatewaySecurityLabel: 'క్లౌడ్ & గేట్‌వే మోడ్:',
    cloudEgressLabel: 'క్లౌడ్ వినియోగం / బడ్జెట్:',
    geminiCloudValue: 'క్లౌడ్ జెమిని API (సర్వర్ గేట్‌వే) + లోకల్ క్వెన్',
    zeroCloudValue: '₹0.00 (క్లౌడ్ APIలు లేవు)',
    fallbackTitle: 'భద్రతా నియమాల బ్యాకప్:',
    geminiFallbackDesc:
      'ఇంజిన్ C సర్వర్ గేట్‌వే ద్వారా జెమిని (ప్రైమరీ) ఉపయోగిస్తుంది మరియు అవసరమైతే లోకల్ క్వెన్ 2.5 1.5Bకి మారుతుంది.',
    localFallbackDesc:
      'లోకల్ క్వెన్ అందుబాటులో లేనప్పుడు, భద్రతా నియమాలు 100% చురుకుగా ఉండి ఆఫ్‌లైన్ నియమాలపై నడుస్తుంది.',
    lastCheckedLabel: 'చివరి తనిఖీ:',
  },
  kn: {
    ready: 'ಆಶಾ AI ಸೇವೆ ಲಭ್ಯವಿದೆ',
    basic: 'ಆಶಾ ಮೂಲ ಬೆಂಬಲವನ್ನು ಬಳಸುತ್ತಿದೆ',
    unavailable: 'ಆಶಾ AI ಸೇವೆ ಪ್ರಸ್ತುತ ಲಭ್ಯವಿಲ್ಲ',
    checking: 'ಆಶಾ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ',
    geminiPrimary: 'ಜೆಮಿನಿ ಪ್ರೈಮರಿ (ಗೇಟ್‌ವೇ)',
    residentSlm: 'ಲೋಕಲ್ ಕ್ವೆನ್ (Qwen 1.5B)',
    deterministicHandler: 'ನಿಯಮಾಧಾರಿತ ಬೆಂಬಲ',
    safetyGuidance: 'ಸುರಕ್ಷತಾ ನೀತಿ ಮಾರ್ಗದರ್ಶಿ',
    offlineFallback: 'ಆಫ್‌ಲೈನ್ ಬ್ಯಾಕಪ್',
    unknownSource: 'ತಿಳಿಯದ ಮೂಲ',
    detailsToggleLabel: 'ತಾಂತ್ರಿಕ ರನ್‌ಟೈಮ್ ವಿವರಗಳನ್ನು ತೋರಿಸಿ',
    detailsToggleTitle: 'ರನ್‌ಟೈಮ್ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ',
    panelAriaLabel: 'ಆಶಾ ರನ್‌ಟೈಮ್ ಪಾರದರ್ಶಕತೆ ಫಲಕ',
    panelTitle: 'ರನ್‌ಟೈಮ್ ವಿನ್ಯಾಸ ಪಾರದರ್ಶಕತೆ',
    pingLabel: 'ಪಿಂಗ್',
    pingTitle: 'ಪೋರ್ಟ್ 8096 ಗೇಟ್‌ವೇ ಪರಿಶೀಲಿಸಿ',
    engineGeminiLabel: 'ಕ್ಲೌಡ್ ಪ್ರೈಮರಿ + ಲೋಕಲ್ ಬ್ಯಾಕಪ್:',
    engineLocalLabel: 'ಲೋಕಲ್ SLM ಎಂಜಿನ್:',
    runtimeStateLabel: 'ರನ್‌ಟೈಮ್ ಸ್ಥಿತಿ:',
    endpointLabel: 'ಗೇಟ್‌ವೇ ವಿಳಾಸ:',
    gatewaySecurityLabel: 'ಕ್ಲೌಡ್ ಮತ್ತು ಗೇಟ್‌ವೇ ಸ್ಥಿತಿ:',
    cloudEgressLabel: 'ಕ್ಲೌಡ್ ಬಳಕೆ / ವೆಚ್ಚ:',
    geminiCloudValue: 'ಕ್ಲೌಡ್ ಜೆಮಿನಿ API (ಸರ್ವರ್ ಗೇಟ್‌ವೇ) + ಲೋಕಲ್ ಕ್ವೆನ್',
    zeroCloudValue: '₹0.00 (ಕ್ಲೌಡ್ API ಇಲ್ಲ)',
    fallbackTitle: 'ಸುರಕ್ಷತಾ ನಿಯಮ ಬ್ಯಾಕಪ್:',
    geminiFallbackDesc:
      'ಎಂಜಿನ್ C ಸರ್ವರ್ ಗೇಟ್‌ವೇ ಮೂಲಕ ಜೆಮಿನಿ (ಪ್ರೈಮರಿ) ಬಳಸುತ್ತದೆ ಮತ್ತು ಅಗತ್ಯವಿದ್ದಾಗ ಲೋಕಲ್ ಕ್ವೆನ್ 2.5 1.5Bಗೆ ಬದಲಾಗುತ್ತದೆ.',
    localFallbackDesc:
      'ಲೋಕಲ್ ಕ್ವೆನ್ ಲಭ್ಯವಿಲ್ಲದಿದ್ದಾಗ ಸುರಕ್ಷತಾ ನಿಯಮಗಳು 100% ಸಕ್ರಿಯವಾಗಿರುವಂತೆ ಸಾಧನದ ನಿಯಮಗಳು ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತವೆ.',
    lastCheckedLabel: 'ಕೊನೆಯ ಪರಿಶೀಲನೆ:',
  },
};

export interface AshaRuntimeStatusBadgeProps {
  /** Optional response provenance to display next to an individual message */
  responseProvenance?: AshaResponseProvenance;
  /** Whether to show the technical expandable jury details button */
  showTechnicalDrawer?: boolean;
  /** Compact pill mode for dense headers */
  compact?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Callback when status is refreshed */
  onStatusChange?: (status: AshaHealthStatus) => void;
}

export const AshaRuntimeStatusBadge: React.FC<AshaRuntimeStatusBadgeProps> = ({
  responseProvenance,
  showTechnicalDrawer = true,
  compact = false,
  className = '',
  onStatusChange,
}) => {
  let highContrast = false;
  let reducedMotion = false;
  let language = 'en';
  try {
    const acc = useAccessibility();
    if (acc) {
      highContrast = acc.highContrast;
      reducedMotion = acc.reducedMotion;
    }
  } catch {
    // Rendered outside AccessibilityProvider (e.g. isolated test)
  }
  try {
    const langCtx = useLanguage();
    if (langCtx?.language) {
      language = langCtx.language;
    }
  } catch {
    // Rendered outside LanguageProvider (e.g. isolated test)
  }

  const badgeLabels = LOCALIZED_BADGE_LABELS[language] || LOCALIZED_BADGE_LABELS.en;

  const [healthStatus, setHealthStatus] = useState<AshaHealthStatus>(() => ({
    isOnline: AshaRemoteAdapter.isCachedOnline(),
    runtimeState: AshaRemoteAdapter.getRuntimeState(),
    model: 'Qwen2.5-1.5B (Offline Fallback)',
    patientId: 'sunita_01',
    lastCheckTime: Date.now(),
    statusMessage: 'Initializing runtime check...',
  }));

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const performHealthCheck = useCallback(async (force = false) => {
    setIsRefreshing(true);
    try {
      if (!AshaRemoteAdapter.shouldUseLocalGateway()) {
        const aiCfg = ConversationalAIService.getStatus();
        const remoteStatus: AshaHealthStatus = {
          isOnline: aiCfg.isConfigured && aiCfg.executionState === 'LIVE_AI',
          runtimeState:
            aiCfg.isConfigured && aiCfg.executionState === 'LIVE_AI'
              ? 'LOCAL_SLM_READY'
              : aiCfg.executionState === 'NETWORK_FAILURE'
              ? 'LOCAL_SLM_UNAVAILABLE'
              : 'DETERMINISTIC_FALLBACK',
          model: aiCfg.modelIdentifier,
          patientId: 'remote',
          lastCheckTime: Date.now(),
          statusMessage: aiCfg.statusMessage,
          geminiConfigured: aiCfg.mode === 'REAL_GEMINI_API' && aiCfg.isConfigured,
          primaryModel: aiCfg.mode === 'REAL_GEMINI_API' ? aiCfg.modelIdentifier : undefined,
        };
        setHealthStatus(remoteStatus);
        onStatusChangeRef.current?.(remoteStatus);
        return;
      }

      const status = await AshaRemoteAdapter.checkHealth(force);
      setHealthStatus(status);
      onStatusChangeRef.current?.(status);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    performHealthCheck(false);
  }, [performHealthCheck]);

  // Patient-friendly reassurance labels
  const getPatientLabel = (state: AshaRuntimeState): string => {
    switch (state) {
      case 'LOCAL_SLM_READY':
        return badgeLabels.ready;
      case 'DETERMINISTIC_FALLBACK':
        return badgeLabels.basic;
      case 'LOCAL_SLM_UNAVAILABLE':
        return badgeLabels.unavailable;
      case 'CHECKING':
        return badgeLabels.checking;
      default:
        return badgeLabels.basic;
    }
  };

  // Visual status themes
  const getTheme = (state: AshaRuntimeState) => {
    if (highContrast) {
      return {
        bg: 'bg-black text-white border-2 border-white',
        dot: state === 'LOCAL_SLM_READY' ? 'bg-green-400' : 'bg-yellow-400',
        text: 'text-white',
        border: 'border-white',
      };
    }

    switch (state) {
      case 'LOCAL_SLM_READY':
        return {
          bg: 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100',
          dot: 'bg-emerald-500',
          text: 'text-emerald-800',
          border: 'border-emerald-300',
        };
      case 'DETERMINISTIC_FALLBACK':
        return {
          bg: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
          dot: 'bg-amber-500',
          text: 'text-amber-800',
          border: 'border-amber-300',
        };
      case 'LOCAL_SLM_UNAVAILABLE':
        return {
          bg: 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100',
          dot: 'bg-rose-500',
          text: 'text-rose-800',
          border: 'border-rose-300',
        };
      case 'CHECKING':
        return {
          bg: 'bg-blue-50 text-blue-900 border-blue-300',
          dot: 'bg-blue-500',
          text: 'text-blue-800',
          border: 'border-blue-300',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-800 border-slate-300',
          dot: 'bg-slate-400',
          text: 'text-slate-700',
          border: 'border-slate-300',
        };
    }
  };

  // Provenance label
  const getProvenanceBadge = (prov?: AshaResponseProvenance) => {
    if (!prov) return null;
    switch (prov) {
      case 'GEMINI_PRIMARY':
        return (
          <span
            data-testid="provenance-gemini-primary"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300"
          >
            <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
            {badgeLabels.geminiPrimary}
          </span>
        );
      case 'LOCAL_MODEL':
        return (
          <span
            data-testid="provenance-local-model"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
          >
            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
            {badgeLabels.residentSlm}
          </span>
        );
      case 'DETERMINISTIC_HANDLER':
        return (
          <span
            data-testid="provenance-deterministic"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300"
          >
            <Cpu className="w-2.5 h-2.5 text-purple-600" />
            {badgeLabels.deterministicHandler}
          </span>
        );
      case 'STATIC_GUIDANCE':
        return (
          <span
            data-testid="provenance-static-guidance"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300"
          >
            <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
            {badgeLabels.safetyGuidance}
          </span>
        );
      case 'FALLBACK':
        return (
          <span
            data-testid="provenance-fallback"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
          >
            <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
            {badgeLabels.offlineFallback}
          </span>
        );
      default:
        return (
          <span
            data-testid="provenance-unknown"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300"
          >
            {badgeLabels.unknownSource}
          </span>
        );
    }
  };

  const theme = getTheme(healthStatus.runtimeState);
  const patientLabel = getPatientLabel(healthStatus.runtimeState);

  // If rendering solely as an inline provenance badge next to a message
  if (responseProvenance) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        {getProvenanceBadge(responseProvenance)}
      </div>
    );
  }

  return (
    <div className={`relative inline-flex flex-col items-start ${className}`}>
      {/* Patient-Centric Accessible Status Pill */}
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-2xs transition-all ${theme.bg} ${
          compact ? 'text-xs' : 'text-xs md:text-sm font-semibold'
        }`}
        data-testid="asha-runtime-status-pill"
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${theme.dot} ${
            !reducedMotion && healthStatus.runtimeState === 'LOCAL_SLM_READY' ? 'animate-pulse' : ''
          }`}
          aria-hidden="true"
        />
        <span className="truncate">{patientLabel}</span>

        {/* Technical Drawer Toggle (For Jury and Examiners) */}
        {showTechnicalDrawer && (
          <button
            type="button"
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className="ml-1 p-0.5 text-slate-500 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-400 rounded cursor-pointer"
            aria-expanded={isDrawerOpen}
            aria-label={badgeLabels.detailsToggleLabel}
            title={badgeLabels.detailsToggleTitle}
            data-testid="asha-runtime-details-toggle"
          >
            {isDrawerOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Expandable Technical Panel for AIU Anveshan Jury */}
      {showTechnicalDrawer && isDrawerOpen && (
        <div
          role="region"
          aria-label={badgeLabels.panelAriaLabel}
          className="absolute z-40 top-full mt-2 left-0 w-80 md:w-96 p-4 rounded-2xl bg-white shadow-xl border border-slate-200 text-xs text-slate-800 space-y-3"
          data-testid="asha-runtime-details-panel"
        >
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-bold flex items-center gap-1.5 text-purple-900">
              <HardDrive className="w-4 h-4 text-purple-600" />
              {badgeLabels.panelTitle}
            </span>
            <button
              type="button"
              onClick={() => performHealthCheck(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 cursor-pointer disabled:opacity-50"
              data-testid="asha-ping-btn"
              title={badgeLabels.pingTitle}
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              {badgeLabels.pingLabel}
            </button>
          </div>

          <div className="space-y-2">
            {/* Primary Engine / SLM Readiness */}
            <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">
                {healthStatus.geminiConfigured ? badgeLabels.engineGeminiLabel : badgeLabels.engineLocalLabel}
              </span>
              <span className="font-mono text-right font-semibold text-slate-900">
                {healthStatus.geminiConfigured
                  ? `${healthStatus.primaryModel || 'gemini-3.5-flash-lite'} + ${healthStatus.fallbackModel || 'Qwen2.5-1.5B-Instruct'}`
                  : healthStatus.model}
              </span>
            </div>

            {/* Runtime Status */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">{badgeLabels.runtimeStateLabel}</span>
              <span
                data-testid="asha-runtime-state-tag"
                className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  healthStatus.runtimeState === 'LOCAL_SLM_READY'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {healthStatus.runtimeState}
              </span>
            </div>

            {/* Gateway & Protocol */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">{badgeLabels.endpointLabel}</span>
              <span className="font-mono text-[11px] text-slate-800">
                {AshaRemoteAdapter.shouldUseLocalGateway()
                  ? AshaRemoteAdapter.getBaseUrl()
                  : 'Firebase AI Logic (App Check)'}
              </span>
            </div>

            {/* Cloud Egress & Gateway Distinguish */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <span className="font-semibold text-emerald-900 flex items-center gap-1">
                <Network className="w-3.5 h-3.5 text-emerald-700" />
                {healthStatus.geminiConfigured ? badgeLabels.gatewaySecurityLabel : badgeLabels.cloudEgressLabel}
              </span>
              <span className="font-bold text-emerald-800 font-mono text-right">
                {healthStatus.geminiConfigured ? badgeLabels.geminiCloudValue : badgeLabels.zeroCloudValue}
              </span>
            </div>

            {/* Offline Fallback Assurance */}
            <div className="p-2 rounded-lg bg-purple-50/70 border border-purple-200 text-purple-950 text-[11px] leading-relaxed">
              <div className="font-semibold flex items-center gap-1 mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />
                {badgeLabels.fallbackTitle}
              </div>
              <p className="text-purple-900">
                {healthStatus.geminiConfigured ? badgeLabels.geminiFallbackDesc : badgeLabels.localFallbackDesc}
              </p>
            </div>

            {/* Check Timestamp */}
            <div className="pt-1 text-[10px] text-slate-600 flex justify-between">
              <span>{badgeLabels.lastCheckedLabel}</span>
              <span className="font-mono">{new Date(healthStatus.lastCheckTime).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
