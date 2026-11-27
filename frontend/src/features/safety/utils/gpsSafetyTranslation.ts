/**
 * Localization Dictionary for Real-World GPS Safe-Zone Configurator & Guide Me Home Navigation
 * Full parity across all 7 Saksham languages: en, hi, mr, bn, ta, te, kn
 */

import { SupportedLanguage } from '../../../context/LanguageContext.js';

export interface GpsSafetyTranslationBundle {
  // Caregiver Safe-Zone configurator
  configureHomeTitle: string;
  homeLabelInput: string;
  useCurrentGpsBtn: string;
  locatingGps: string;
  gpsCapturedMsg: string;
  latLabel: string;
  lngLabel: string;
  customRadiusLabel: string;
  saveSafeZoneBtn: string;
  savingSafeZone: string;
  savedSafeZoneMsg: string;
  monitoringToggleLabel: string;
  monitoringActive: string;
  monitoringPaused: string;
  noRealLocationYet: string;
  lastFixPrefix: string;
  liveDistanceLabel: string;
  recentAlertsTitle: string;
  noAlertsYet: string;
  acknowledgeAlertBtn: string;
  acknowledgedBadge: string;
  alertExitedTitle: string;
  alertReturnedTitle: string;
  alertExitedMsg: string;
  alertReturnedMsg: string;
  alertConfiguredTitle: string;
  alertConfiguredMsg: string;
  gpsPermissionDeniedErr: string;
  gpsUnavailableErr: string;
  invalidCoordinatesErr: string;

  // Patient Dashboard Safety Card
  patientCardTitle: string;
  patientCardSubtitle: string;
  patientGuideMeHomeBtn: string;
  patientHomeLabel: string;
  patientSafeRadiusLabel: string;
  patientDistanceFromHome: string;
  patientStatusInside: string;
  patientStatusOutside: string;
  patientStatusAwaiting: string;
  patientStatusPaused: string;
  patientPrivacyLink: string;

  // Guide Me Home Page extras
  stopNavigationBtn: string;
  navigationStoppedNotice: string;
  resumeNavigationBtn: string;
  enableCompassBtn: string;
  compassActiveBadge: string;
  compassUnavailableNotice: string;
  bearingNorthNote: string;
  safetyLimitationNotice: string;
  backgroundGpsNotice: string;
  spokenArrivedCue: string;
  spokenReturnCue: string;
  spokenOutsideCue: string;
  spokenDistanceMilestoneCue: string;
  spokenMovingAwayCue: string;
  liveMapTitle: string;
}

const BUNDLES: Record<'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te' | 'kn', GpsSafetyTranslationBundle> = {
  en: {
    configureHomeTitle: 'Configure Home Location & Safe Zone',
    homeLabelInput: 'Home Location Name',
    useCurrentGpsBtn: 'Use Current GPS Location',
    locatingGps: 'Getting GPS coordinates...',
    gpsCapturedMsg: 'Current GPS coordinates captured.',
    latLabel: 'Latitude',
    lngLabel: 'Longitude',
    customRadiusLabel: 'Custom Radius (m)',
    saveSafeZoneBtn: 'Save Safe Zone to Cloud',
    savingSafeZone: 'Saving safe zone...',
    savedSafeZoneMsg: 'Safe-zone configuration saved and synced to patient.',
    monitoringToggleLabel: 'Safe-Zone Monitoring',
    monitoringActive: 'Monitoring Active',
    monitoringPaused: 'Monitoring Paused',
    noRealLocationYet: 'No real-time GPS location shared by patient device yet.',
    lastFixPrefix: 'Last GPS fix',
    liveDistanceLabel: 'Distance from Home',
    recentAlertsTitle: 'Safe-Zone Exit & Return Alerts',
    noAlertsYet: 'No safe-zone boundary alerts recorded.',
    acknowledgeAlertBtn: 'Acknowledge',
    acknowledgedBadge: 'Acknowledged',
    alertExitedTitle: 'Safe-Zone Boundary Alert',
    alertReturnedTitle: 'Patient Returned to Safe Zone',
    alertExitedMsg: '{name} is {distance}m away from Home (limit {radius}m).',
    alertReturnedMsg: '{name} returned inside the {radius}m Home Safe Zone.',
    alertConfiguredTitle: 'Home Safe Zone Updated',
    alertConfiguredMsg: 'Your caregiver set Home Sanctuary to "{label}" ({radius}m radius).',
    gpsPermissionDeniedErr: 'Browser location permission was denied. Please enter coordinates manually or allow GPS access.',
    gpsUnavailableErr: 'Device GPS signal is currently unavailable. Please enter coordinates manually.',
    invalidCoordinatesErr: 'Please enter valid latitude (-90 to 90), longitude (-180 to 180), and radius (25m–10000m).',

    patientCardTitle: 'Home Safe Zone & Live GPS',
    patientCardSubtitle: 'Real-time safety boundary with Asha guided navigation home',
    patientGuideMeHomeBtn: 'Guide Me Home',
    patientHomeLabel: 'Home',
    patientSafeRadiusLabel: 'Safe Zone Radius',
    patientDistanceFromHome: '{meters}m from Home',
    patientStatusInside: 'Inside Safe Zone',
    patientStatusOutside: 'Outside Safe Zone — Let Asha Guide You Home',
    patientStatusAwaiting: 'Waiting for real device GPS fix',
    patientStatusPaused: 'Location sharing paused in Privacy Controls',
    patientPrivacyLink: 'Location Privacy & Consent',

    stopNavigationBtn: 'Stop Navigation',
    navigationStoppedNotice: 'Voice and GPS home guidance paused cleanly. You can resume anytime or call your caregiver.',
    resumeNavigationBtn: 'Resume Guide Me Home',
    enableCompassBtn: 'Enable Device Compass',
    compassActiveBadge: 'Live Compass Active',
    compassUnavailableNotice: 'Device compass sensor unavailable on this browser — arrow shows geographic bearing from North ({deg}°).',
    bearingNorthNote: 'Geographic bearing toward Home: {deg}°',
    safetyLimitationNotice: 'Compass guidance shows straight-line direction home and is not a turn-by-turn street route. Use sidewalks and crossings, or open Walking Directions.',
    backgroundGpsNotice: 'Browser GPS updates only while this app remains open and screen is active; background tracking stops if the browser sleeps.',
    spokenArrivedCue: 'You have arrived safely near Home. You are right at your Home Sanctuary.',
    spokenReturnCue: 'Welcome back inside your safe zone. Home is about {meters} metres ahead.',
    spokenOutsideCue: 'You are {meters} metres outside your safe zone. Stay calm. {direction}. Walk gently toward Home.',
    spokenDistanceMilestoneCue: 'Home is {meters} metres away. {direction}. You are doing well.',
    spokenMovingAwayCue: 'It looks like you moved farther from Home ({meters} metres). Pause gently and turn {direction}.',
    liveMapTitle: 'Live Home Orientation Map',
  },
  hi: {
    configureHomeTitle: 'घर का स्थान और सुरक्षित क्षेत्र सेट करें',
    homeLabelInput: 'घर के स्थान का नाम',
    useCurrentGpsBtn: 'मेरी वर्तमान GPS स्थिति चुनें',
    locatingGps: 'GPS स्थान प्राप्त हो रहा है...',
    gpsCapturedMsg: 'वर्तमान GPS निर्देशांक प्राप्त हो गए।',
    latLabel: 'अक्षांश (Latitude)',
    lngLabel: 'देशांतर (Longitude)',
    customRadiusLabel: 'कस्टम दायरा (मीटर)',
    saveSafeZoneBtn: 'सुरक्षित क्षेत्र सहेजें',
    savingSafeZone: 'सहेजा जा रहा है...',
    savedSafeZoneMsg: 'सुरक्षित क्षेत्र सहेजा गया और मरीज से सिंक हो गया।',
    monitoringToggleLabel: 'सुरक्षित क्षेत्र निगरानी',
    monitoringActive: 'निगरानी सक्रिय',
    monitoringPaused: 'निगरानी रुकी हुई',
    noRealLocationYet: 'मरीज के डिवाइस से अभी तक लाइव GPS स्थान प्राप्त नहीं हुआ है।',
    lastFixPrefix: 'अंतिम GPS अपडेट',
    liveDistanceLabel: 'घर से दूरी',
    recentAlertsTitle: 'सुरक्षित क्षेत्र निकास और वापसी अलर्ट',
    noAlertsYet: 'कोई सुरक्षित क्षेत्र अलर्ट दर्ज नहीं है।',
    acknowledgeAlertBtn: 'स्वीकार करें',
    acknowledgedBadge: 'स्वीकृत',
    alertExitedTitle: 'सुरक्षित क्षेत्र सीमा अलर्ट',
    alertReturnedTitle: 'मरीज सुरक्षित क्षेत्र में लौट आए',
    alertExitedMsg: '{name} घर से {distance} मी. दूर हैं (सीमा {radius} मी.)।',
    alertReturnedMsg: '{name} {radius} मी. सुरक्षित क्षेत्र के भीतर लौट आए हैं।',
    alertConfiguredTitle: 'घर का सुरक्षित क्षेत्र अपडेट हुआ',
    alertConfiguredMsg: 'आपके देखभालकर्ता ने घर "{label}" ({radius} मी. दायरा) सेट किया है।',
    gpsPermissionDeniedErr: 'ब्राउज़र ने लोकेशन अनुमति अस्वीकार की। कृपया निर्देशांक मैनुअल दर्ज करें।',
    gpsUnavailableErr: 'डिवाइस GPS उपलब्ध नहीं है। कृपया मैनुअल निर्देशांक दर्ज करें।',
    invalidCoordinatesErr: 'कृपया सही अक्षांश, देशांतर और दायरा (25–10000 मी.) दर्ज करें।',

    patientCardTitle: 'घर का सुरक्षित क्षेत्र और लाइव GPS',
    patientCardSubtitle: 'घर वापस आने के लिए आशा का रीयल-टाइम मार्गदर्शन',
    patientGuideMeHomeBtn: 'मुझे घर ले चलें',
    patientHomeLabel: 'घर',
    patientSafeRadiusLabel: 'सुरक्षित दायरा',
    patientDistanceFromHome: 'घर से {meters} मी.',
    patientStatusInside: 'सुरक्षित क्षेत्र के भीतर',
    patientStatusOutside: 'सुरक्षित क्षेत्र से बाहर — आशा के साथ घर लौटें',
    patientStatusAwaiting: 'लाइव GPS सिग्नल की प्रतीक्षा',
    patientStatusPaused: 'गोपनीयता नियंत्रण में लोकेशन साझाकरण बंद है',
    patientPrivacyLink: 'लोकेशन गोपनीयता और सहमति',

    stopNavigationBtn: 'नेविगेशन रोकें',
    navigationStoppedNotice: 'वॉइस और GPS मार्गदर्शन रोक दिया गया है। आप कभी भी फिर शुरू कर सकते हैं या देखभालकर्ता को कॉल कर सकते हैं।',
    resumeNavigationBtn: 'घर मार्गदर्शन फिर शुरू करें',
    enableCompassBtn: 'कम्पास चालू करें',
    compassActiveBadge: 'लाइव कम्पास सक्रिय',
    compassUnavailableNotice: 'इस डिवाइस पर कम्पास सेंसर उपलब्ध नहीं है — तीर उत्तर दिशा के सापेक्ष ({deg}°) दिखाता है।',
    bearingNorthNote: 'घर की भौगोलिक दिशा: {deg}°',
    safetyLimitationNotice: 'यह दिशा सीधी भौगोलिक दिशा दिखाती है, सड़क के मोड़ नहीं। कृपया फुटपाथ का उपयोग करें या वॉकिंग मैप खोलें।',
    backgroundGpsNotice: 'ब्राउज़र GPS केवल ऐप खुले रहने पर अपडेट होता है; स्क्रीन बंद होने पर बैकग्राउंड ट्रैकिंग रुक सकती है।',
    spokenArrivedCue: 'आप सुरक्षित रूप से घर के पास पहुँच गए हैं।',
    spokenReturnCue: 'आप फिर से सुरक्षित क्षेत्र में आ गए हैं। घर लगभग {meters} मीटर आगे है।',
    spokenOutsideCue: 'आप सुरक्षित क्षेत्र से {meters} मीटर बाहर हैं। शांत रहें। {direction}। धीरे-धीरे घर की ओर चलें।',
    spokenDistanceMilestoneCue: 'घर {meters} मीटर दूर है। {direction}। आप अच्छा कर रहे हैं।',
    spokenMovingAwayCue: 'आप घर से थोड़ा दूर जा रहे हैं ({meters} मीटर)। कृपया रुकें और {direction}।',
    liveMapTitle: 'लाइव घर दिशा मानचित्र',
  },
  mr: {
    configureHomeTitle: 'घराचे ठिकाण आणि सुरक्षित क्षेत्र सेट करा',
    homeLabelInput: 'घराच्या ठिकाणाचे नाव',
    useCurrentGpsBtn: 'माझे सध्याचे GPS ठिकाण वापरा',
    locatingGps: 'GPS मिळवत आहे...',
    gpsCapturedMsg: 'सध्याचे GPS निर्देशांक मिळाले.',
    latLabel: 'अक्षांश (Latitude)',
    lngLabel: 'रेखांश (Longitude)',
    customRadiusLabel: 'कस्टम त्रिज्या (मी.)',
    saveSafeZoneBtn: 'सुरक्षित क्षेत्र जतन करा',
    savingSafeZone: 'जतन होत आहे...',
    savedSafeZoneMsg: 'सुरक्षित क्षेत्र जतन झाले व रुग्णाशी सिंक झाले.',
    monitoringToggleLabel: 'सुरक्षित क्षेत्र देखरेख',
    monitoringActive: 'देखरेख सुरू',
    monitoringPaused: 'देखरेख थांबवली',
    noRealLocationYet: 'रुग्णाच्या डिव्हाइसवरून अद्याप थेट GPS ठिकाण आलेले नाही.',
    lastFixPrefix: 'शेवटचे GPS अपडेट',
    liveDistanceLabel: 'घरापासून अंतर',
    recentAlertsTitle: 'सुरक्षित क्षेत्र अलर्ट',
    noAlertsYet: 'कोणताही सीमा अलर्ट नोंदलेला नाही.',
    acknowledgeAlertBtn: 'मान्य करा',
    acknowledgedBadge: 'मान्य केले',
    alertExitedTitle: 'सुरक्षित क्षेत्र सीमा अलर्ट',
    alertReturnedTitle: 'रुग्ण सुरक्षित क्षेत्रात परतले',
    alertExitedMsg: '{name} घरापासून {distance} मी. दूर आहेत (मर्यादा {radius} मी.).',
    alertReturnedMsg: '{name} {radius} मी. सुरक्षित क्षेत्रात परतले आहेत.',
    alertConfiguredTitle: 'सुरक्षित क्षेत्र अद्यतनित झाले',
    alertConfiguredMsg: 'तुमच्या काळजीवाहकाने "{label}" ({radius} मी.) हे सुरक्षित क्षेत्र सेट केले आहे.',
    gpsPermissionDeniedErr: 'ब्राउझरने स्थान परवानगी नाकारली. कृपया निर्देशांक स्वतः भरा.',
    gpsUnavailableErr: 'डिव्हाइस GPS उपलब्ध नाही. कृपया निर्देशांक स्वतः भरा.',
    invalidCoordinatesErr: 'कृपया वैध अक्षांश, रेखांश आणि त्रिज्या (25–10000 मी.) टाका.',

    patientCardTitle: 'घर सुरक्षित क्षेत्र आणि थेट GPS',
    patientCardSubtitle: 'घरी परतण्यासाठी आशाचे थेट मार्गदर्शन',
    patientGuideMeHomeBtn: 'मला घरी न्या',
    patientHomeLabel: 'घर',
    patientSafeRadiusLabel: 'सुरक्षित त्रिज्या',
    patientDistanceFromHome: 'घरापासून {meters} मी.',
    patientStatusInside: 'सुरक्षित क्षेत्रात',
    patientStatusOutside: 'सुरक्षित क्षेत्राबाहेर — आशासोबत घरी चला',
    patientStatusAwaiting: 'थेट GPS सिग्नलची प्रतीक्षा',
    patientStatusPaused: 'गोपनीयता सेटिंग्जमध्ये स्थान शेअरिंग बंद आहे',
    patientPrivacyLink: 'स्थान गोपनीयता व संमती',

    stopNavigationBtn: 'मार्गदर्शन थांबवा',
    navigationStoppedNotice: 'व्हॉइस आणि GPS मार्गदर्शन थांबवले आहे. तुम्ही कधीही पुन्हा सुरू करू शकता.',
    resumeNavigationBtn: 'मार्गदर्शन पुन्हा सुरू करा',
    enableCompassBtn: 'कंपास सुरू करा',
    compassActiveBadge: 'थेट कंपास सुरू',
    compassUnavailableNotice: 'या डिव्हाइसवर कंपास सेन्सर उपलब्ध नाही — बाण उत्तरेकडून दिशा ({deg}°) दाखवतो.',
    bearingNorthNote: 'घराची भौगोलिक दिशा: {deg}°',
    safetyLimitationNotice: 'हे मार्गदर्शन थेट दिशा दाखवते, रस्त्याचे वळण नाही. सुरक्षितपणे पदपथावरून चाला किंवा चालण्याचा नकाशा उघडा.',
    backgroundGpsNotice: 'ब्राउझर GPS फक्त ॲप उघडे असतानाच अद्यतनित होतो; स्क्रीन बंद झाल्यास पार्श्वभूमी ट्रॅकिंग थांबते.',
    spokenArrivedCue: 'तुम्ही सुरक्षितपणे घराजवळ पोहोचला आहात.',
    spokenReturnCue: 'तुम्ही पुन्हा सुरक्षित क्षेत्रात आला आहात. घर सुमारे {meters} मीटर पुढे आहे.',
    spokenOutsideCue: 'तुम्ही सुरक्षित क्षेत्रापासून {meters} मीटर बाहेर आहात. शांत राहा. {direction}. हळूहळू घराकडे चाला.',
    spokenDistanceMilestoneCue: 'घर {meters} मीटर दूर आहे. {direction}. तुम्ही छान चालत आहात.',
    spokenMovingAwayCue: 'तुम्ही घरापासून थोडे दूर जात आहात ({meters} मीटर). कृपया थांबा आणि {direction}.',
    liveMapTitle: 'थेट घर दिशा नकाशा',
  },
  bn: {
    configureHomeTitle: 'বাড়ির অবস্থান ও নিরাপদ অঞ্চল সেট করুন',
    homeLabelInput: 'বাড়ির অবস্থানের নাম',
    useCurrentGpsBtn: 'আমার বর্তমান GPS ব্যবহার করুন',
    locatingGps: 'GPS পাওয়া যাচ্ছে...',
    gpsCapturedMsg: 'বর্তমান GPS স্থানাঙ্ক সংগ্রহ হয়েছে।',
    latLabel: 'অক্ষাংশ (Latitude)',
    lngLabel: 'দ্রাঘিমাংশ (Longitude)',
    customRadiusLabel: 'কাস্টম ব্যাসার্ধ (মি.)',
    saveSafeZoneBtn: 'নিরাপদ অঞ্চল সংরক্ষণ করুন',
    savingSafeZone: 'সংরক্ষণ হচ্ছে...',
    savedSafeZoneMsg: 'নিরাপদ অঞ্চল সংরক্ষিত ও রোগীর সাথে সিঙ্ক হয়েছে।',
    monitoringToggleLabel: 'নিরাপদ অঞ্চল পর্যবেক্ষণ',
    monitoringActive: 'পর্যবেক্ষণ সক্রিয়',
    monitoringPaused: 'পর্যবেক্ষণ বিরতি',
    noRealLocationYet: 'রোগীর ডিভাইস থেকে এখনো লাইভ GPS অবস্থান পাওয়া যায়নি।',
    lastFixPrefix: 'সর্বশেষ GPS আপডেট',
    liveDistanceLabel: 'বাড়ি থেকে দূরত্ব',
    recentAlertsTitle: 'নিরাপদ অঞ্চল সতর্কতা',
    noAlertsYet: 'কোনো সীমানা সতর্কতা নথিভুক্ত হয়নি।',
    acknowledgeAlertBtn: 'স্বীকার করুন',
    acknowledgedBadge: 'স্বীকৃত',
    alertExitedTitle: 'নিরাপদ অঞ্চল সীমানা সতর্কতা',
    alertReturnedTitle: 'রোগী নিরাপদ অঞ্চলে ফিরেছেন',
    alertExitedMsg: '{name} বাড়ি থেকে {distance} মি. দূরে আছেন (সীমা {radius} মি.)।',
    alertReturnedMsg: '{name} {radius} মি. নিরাপদ অঞ্চলে ফিরে এসেছেন।',
    alertConfiguredTitle: 'বাড়ির নিরাপদ অঞ্চল আপডেট হয়েছে',
    alertConfiguredMsg: 'আপনার পরিচর্যাকারী "{label}" ({radius} মি. ব্যাসার্ধ) নির্ধারণ করেছেন।',
    gpsPermissionDeniedErr: 'ব্রাউজার লোকেশন অনুমতি বাতিল করেছে। অনুগ্রহ করে ম্যানুয়ালি লিখুন।',
    gpsUnavailableErr: 'ডিভাইস GPS অনুপলব্ধ। অনুগ্রহ করে ম্যানুয়ালি লিখুন।',
    invalidCoordinatesErr: 'সঠিক অক্ষাংশ, দ্রাঘিমাংশ এবং ব্যাসার্ধ (25–10000 মি.) দিন।',

    patientCardTitle: 'বাড়ির নিরাপদ অঞ্চল ও লাইভ GPS',
    patientCardSubtitle: 'বাড়ি ফেরার জন্য আশার সরাসরি পথনির্দেশ',
    patientGuideMeHomeBtn: 'আমাকে বাড়ি নিয়ে চলুন',
    patientHomeLabel: 'বাড়ি',
    patientSafeRadiusLabel: 'নিরাপদ ব্যাসার্ধ',
    patientDistanceFromHome: 'বাড়ি থেকে {meters} মি.',
    patientStatusInside: 'নিরাপদ অঞ্চলের ভেতরে',
    patientStatusOutside: 'নিরাপদ অঞ্চলের বাইরে — আশার সাথে বাড়ি ফিরুন',
    patientStatusAwaiting: 'লাইভ GPS সংকেতের অপেক্ষায়',
    patientStatusPaused: 'গোপনীয়তা নিয়ন্ত্রণে অবস্থান শেয়ারিং বন্ধ আছে',
    patientPrivacyLink: 'অবস্থান গোপনীয়তা ও সম্মতি',

    stopNavigationBtn: 'নেভিগেশন থামান',
    navigationStoppedNotice: 'ভয়েস ও GPS নির্দেশনা থামানো হয়েছে। যেকোনো সময় পুনরায় শুরু করুন।',
    resumeNavigationBtn: 'বাড়ি পথনির্দেশ পুনরায় শুরু করুন',
    enableCompassBtn: 'কম্পাস চালু করুন',
    compassActiveBadge: 'লাইভ কম্পাস সক্রিয়',
    compassUnavailableNotice: 'এই ব্রাউজারে কম্পাস সেন্সর নেই — তীরটি উত্তর দিক থেকে ({deg}°) দেখাচ্ছে।',
    bearingNorthNote: 'বাড়ির ভৌগোলিক দিক: {deg}°',
    safetyLimitationNotice: 'এটি সরলরেখার দিকনির্দেশ দেখায়, রাস্তার বাঁক নয়। ফুটপাত ব্যবহার করুন বা হাঁটার মানচিত্র খুলুন।',
    backgroundGpsNotice: 'অ্যাপ খোলা থাকলে তবেই ব্রাউজার GPS আপডেট হয়; স্ক্রিন বন্ধ হলে ব্যাকগ্রাউন্ড ট্র্যাকিং থেমে যায়।',
    spokenArrivedCue: 'আপনি নিরাপদে বাড়ির কাছাকাছি পৌঁছে গেছেন।',
    spokenReturnCue: 'আপনি আবার নিরাপদ অঞ্চলে ফিরে এসেছেন। বাড়ি প্রায় {meters} মিটার দূরে।',
    spokenOutsideCue: 'আপনি নিরাপদ অঞ্চলের বাইরে {meters} মিটার দূরে আছেন। শান্ত থাকুন। {direction}। ধীরে ধীরে বাড়ির দিকে হাঁটুন।',
    spokenDistanceMilestoneCue: 'বাড়ি {meters} মিটার দূরে। {direction}। আপনি খুব ভালো হাঁটছেন।',
    spokenMovingAwayCue: 'মনে হচ্ছে আপনি বাড়ি থেকে দূরে যাচ্ছেন ({meters} মিটার)। অনুগ্রহ করে থামুন এবং {direction}।',
    liveMapTitle: 'লাইভ বাড়ির দিক মানচিত্র',
  },
  ta: {
    configureHomeTitle: 'வீட்டு இடம் & பாதுகாப்பு மண்டலம் அமைக்கவும்',
    homeLabelInput: 'வீட்டு முகவரி பெயர்',
    useCurrentGpsBtn: 'என் தற்போதைய GPS இடத்தைத் தேர்ந்தெடு',
    locatingGps: 'GPS இடம் பெறப்படுகிறது...',
    gpsCapturedMsg: 'தற்போதைய GPS ஆயத்தொலைவுகள் பெறப்பட்டன.',
    latLabel: 'அட்சரேகை (Latitude)',
    lngLabel: 'தீர்க்கரேகை (Longitude)',
    customRadiusLabel: 'தனிப்பயன் ஆரம் (மீ)',
    saveSafeZoneBtn: 'பாதுகாப்பு மண்டலத்தைச் சேமி',
    savingSafeZone: 'சேமிக்கிறது...',
    savedSafeZoneMsg: 'பாதுகாப்பு மண்டலம் சேமிக்கப்பட்டு நோயாளியுடன் ஒத்திசைக்கப்பட்டது.',
    monitoringToggleLabel: 'பாதுகாப்பு கண்காணிப்பு',
    monitoringActive: 'கண்காணிப்பு செயலில்',
    monitoringPaused: 'கண்காணிப்பு நிறுத்தப்பட்டது',
    noRealLocationYet: 'நோயாளி சாதனத்திலிருந்து நேரலை GPS இடம் இன்னும் வரவில்லை.',
    lastFixPrefix: 'கடைசி GPS பதிவு',
    liveDistanceLabel: 'வீட்டிலிருந்து தூரம்',
    recentAlertsTitle: 'பாதுகாப்பு மண்டல எச்சரிக்கைகள்',
    noAlertsYet: 'எல்லை எச்சரிக்கைகள் எதுவும் இல்லை.',
    acknowledgeAlertBtn: 'ஒப்புக்கொள்',
    acknowledgedBadge: 'ஒப்புக்கொள்ளப்பட்டது',
    alertExitedTitle: 'பாதுகாப்பு எல்லை எச்சரிக்கை',
    alertReturnedTitle: 'நோயாளி பாதுகாப்பாக திரும்பினார்',
    alertExitedMsg: '{name} வீட்டிலிருந்து {distance} மீ. தொலைவில் உள்ளார் (எல்லை {radius} மீ.).',
    alertReturnedMsg: '{name} {radius} மீ. பாதுகாப்பு மண்டலத்திற்குள் திரும்பினார்.',
    alertConfiguredTitle: 'வீட்டு பாதுகாப்பு மண்டலம் புதுப்பிக்கப்பட்டது',
    alertConfiguredMsg: 'உங்கள் பராமரிப்பாளர் "{label}" ({radius} மீ. ஆரம்) என அமைத்துள்ளார்.',
    gpsPermissionDeniedErr: 'இருப்பிட அனுமதி மறுக்கப்பட்டது. கைமுறையாக ஆயத்தொலைவுகளை உள்ளிடவும்.',
    gpsUnavailableErr: 'சாதன GPS கிடைக்கவில்லை. கைமுறையாக உள்ளிடவும்.',
    invalidCoordinatesErr: 'சரியான அட்சரேகை, தீர்க்கரேகை மற்றும் ஆரத்தை (25–10000 மீ.) உள்ளிடவும்.',

    patientCardTitle: 'வீட்டு பாதுகாப்பு மண்டலம் & நேரலை GPS',
    patientCardSubtitle: 'ஆஷா வழிகாட்டுதலுடன் பாதுகாப்பாக வீடு திரும்ப',
    patientGuideMeHomeBtn: 'என்னை வீட்டிற்கு அழைத்துச் செல்',
    patientHomeLabel: 'வீடு',
    patientSafeRadiusLabel: 'பாதுகாப்பு ஆரம்',
    patientDistanceFromHome: 'வீட்டிலிருந்து {meters} மீ.',
    patientStatusInside: 'பாதுகாப்பு மண்டலத்திற்குள்',
    patientStatusOutside: 'பாதுகாப்பு மண்டலத்திற்கு வெளியே — வீட்டிற்குத் திரும்புங்கள்',
    patientStatusAwaiting: 'நேரலை GPS சமிக்ஞைக்காக காத்திருக்கிறது',
    patientStatusPaused: 'தனியுரிமை அமைப்பில் இடம் பகிர்வு நிறுத்தப்பட்டுள்ளது',
    patientPrivacyLink: 'இருப்பிட தனியுரிமை & ஒப்புதல்',

    stopNavigationBtn: 'வழிகாட்டுதலை நிறுத்து',
    navigationStoppedNotice: 'குரல் மற்றும் GPS வழிகாட்டுதல் நிறுத்தப்பட்டது. எப்போது வேண்டுமானாலும் தொடரலாம்.',
    resumeNavigationBtn: 'வழிகாட்டுதலைத் தொடர்',
    enableCompassBtn: 'திசைகாட்டியை இயக்கு',
    compassActiveBadge: 'நேரலை திசைகாட்டி செயலில்',
    compassUnavailableNotice: 'திசைகாட்டி சென்சார் இல்லை — அம்பு வடக்கிலிருந்து திசையை ({deg}°) காட்டுகிறது.',
    bearingNorthNote: 'வீட்டின் புவியியல் திசை: {deg}°',
    safetyLimitationNotice: 'இது நேர்க்கோட்டு திசையைக் காட்டுகிறது, தெரு திருப்பங்களை அல்ல. நடைபாதையைப் பயன்படுத்தவும்.',
    backgroundGpsNotice: 'செயலி திறந்திருக்கும் போது மட்டுமே உலாவி GPS புதுப்பிக்கப்படும்; திரை அணைந்தால் நிறுத்தப்படும்.',
    spokenArrivedCue: 'நீங்கள் பாதுகாப்பாக வீட்டிற்கு அருகில் வந்துவிட்டீர்கள்.',
    spokenReturnCue: 'பாதுகாப்பு மண்டலத்திற்குள் திரும்பிவிட்டீர்கள். வீடு இன்னும் {meters} மீட்டரில் உள்ளது.',
    spokenOutsideCue: 'நீங்கள் பாதுகாப்பு மண்டலத்திலிருந்து {meters} மீட்டர் வெளியே உள்ளீர்கள். அமைதியாக இருங்கள். {direction}.',
    spokenDistanceMilestoneCue: 'வீடு {meters} மீட்டர் தொலைவில் உள்ளது. {direction}.',
    spokenMovingAwayCue: 'வீட்டிலிருந்து சற்று விலகிச் செல்கிறீர்கள் ({meters} மீட்டர்). சற்று நின்று {direction}.',
    liveMapTitle: 'நேரலை வீட்டுத் திசை வரைபடம்',
  },
  te: {
    configureHomeTitle: 'ఇంటి స్థానం & సురక్షిత ప్రాంతాన్ని సెట్ చేయండి',
    homeLabelInput: 'ఇంటి చిరునామా పేరు',
    useCurrentGpsBtn: 'నా ప్రస్తుత GPS స్థానాన్ని ఉపయోగించు',
    locatingGps: 'GPS స్థానం పొందుతోంది...',
    gpsCapturedMsg: 'ప్రస్తుత GPS కోఆర్డినేట్లు పొందబడ్డాయి.',
    latLabel: 'అక్షాంశం (Latitude)',
    lngLabel: 'రేఖాంశం (Longitude)',
    customRadiusLabel: 'కస్టమ్ వ్యాసార్థం (మీ)',
    saveSafeZoneBtn: 'సురక్షిత ప్రాంతాన్ని సేవ్ చేయండి',
    savingSafeZone: 'సేవ్ అవుతోంది...',
    savedSafeZoneMsg: 'సురక్షిత ప్రాంతం సేవ్ చేయబడి రోగితో సింక్ అయింది.',
    monitoringToggleLabel: 'సురక్షిత ప్రాంత పర్యవేక్షణ',
    monitoringActive: 'పర్యవేక్షణ సక్రియం',
    monitoringPaused: 'పర్యవేక్షణ ఆపబడింది',
    noRealLocationYet: 'రోగి పరికరం నుండి ఇంకా లైవ్ GPS స్థానం అందలేదు.',
    lastFixPrefix: 'చివరి GPS సమయం',
    liveDistanceLabel: 'ఇంటి నుండి దూరం',
    recentAlertsTitle: 'సురక్షిత ప్రాంత హెచ్చరికలు',
    noAlertsYet: 'సరిహద్దు హెచ్చరికలు ఏవీ నమోదు కాలేదు.',
    acknowledgeAlertBtn: 'అంగీకరించు',
    acknowledgedBadge: 'అంగీకరించబడింది',
    alertExitedTitle: 'సురక్షిత ప్రాంత సరిహద్దు హెచ్చరిక',
    alertReturnedTitle: 'రోగి సురక్షిత ప్రాంతానికి తిరిగి వచ్చారు',
    alertExitedMsg: '{name} ఇంటి నుండి {distance} మీ. దూరంలో ఉన్నారు (పరిమితి {radius} మీ.).',
    alertReturnedMsg: '{name} {radius} మీ. సురక్షిత ప్రాంతంలోకి తిరిగి వచ్చారు.',
    alertConfiguredTitle: 'ఇంటి సురక్షిత ప్రాంతం నవీకరించబడింది',
    alertConfiguredMsg: 'మీ సంరక్షకులు "{label}" ({radius} మీ. వ్యాసార్థం) గా సెట్ చేశారు.',
    gpsPermissionDeniedErr: 'స్థాన అనుమతి నిరాకరించబడింది. దయచేసి కోఆర్డినేట్లను మాన్యువల్‌గా నమోదు చేయండి.',
    gpsUnavailableErr: 'పరికర GPS అందుబాటులో లేదు. మాన్యువల్‌గా నమోదు చేయండి.',
    invalidCoordinatesErr: 'దయచేసి చెల్లుబాటు అయ్యే అక్షాంశం, రేఖాంశం మరియు వ్యాసార్థం (25–10000 మీ.) ఇవ్వండి.',

    patientCardTitle: 'ఇంటి సురక్షిత ప్రాంతం & లైవ్ GPS',
    patientCardSubtitle: 'ఆశా మార్గదర్శకత్వంతో సురక్షితంగా ఇంటికి చేరండి',
    patientGuideMeHomeBtn: 'నన్ను ఇంటికి దారి చూపించు',
    patientHomeLabel: 'ఇల్లు',
    patientSafeRadiusLabel: 'సురక్షిత వ్యాసార్థం',
    patientDistanceFromHome: 'ఇంటి నుండి {meters} మీ.',
    patientStatusInside: 'సురక్షిత ప్రాంతంలో ఉన్నారు',
    patientStatusOutside: 'సురక్షిత ప్రాంతం వెలుపల — ఆశా సహాయంతో ఇంటికి రండి',
    patientStatusAwaiting: 'లైవ్ GPS సిగ్నల్ కోసం వేచి ఉంది',
    patientStatusPaused: 'గోప్యతా నియంత్రణలో స్థాన భాగస్వామ్యం ఆపబడింది',
    patientPrivacyLink: 'స్థాన గోప్యత & సమ్మతి',

    stopNavigationBtn: 'నావిగేషన్ ఆపండి',
    navigationStoppedNotice: 'వాయిస్ మరియు GPS మార్గదర్శకత్వం ఆపబడింది. ఎప్పుడైనా మళ్లీ ప్రారంభించండి.',
    resumeNavigationBtn: 'మళ్లీ ఇంటి దారి చూపించు',
    enableCompassBtn: 'దిక్సూచి ప్రారంభించు',
    compassActiveBadge: 'లైవ్ దిక్సూచి సక్రియం',
    compassUnavailableNotice: 'ఈ బ్రౌజర్‌లో దిక్సూచి సెన్సార్ లేదు — బాణం ఉత్తరం నుండి దిశను ({deg}°) చూపుతుంది.',
    bearingNorthNote: 'ఇంటి భౌగోళిక దిశ: {deg}°',
    safetyLimitationNotice: 'ఇది నేరుగా ఇంటి దిశను చూపుతుంది, వీధి మలుపులను కాదు. దయచేసి కాలిబాటపై నడవండి లేదా మ్యాప్ తెరవండి.',
    backgroundGpsNotice: 'యాప్ తెరిచి ఉన్నప్పుడు మాత్రమే బ్రౌజర్ GPS పనిచేస్తుంది; స్క్రీన్ ఆగితే నేపథ్య ట్రాకింగ్ ఆగిపోతుంది.',
    spokenArrivedCue: 'మీరు సురక్షితంగా ఇంటి దగ్గరకు చేరుకున్నారు.',
    spokenReturnCue: 'మీరు సురక్షిత ప్రాంతంలోకి తిరిగి వచ్చారు. ఇల్లు {meters} మీటర్ల దూరంలో ఉంది.',
    spokenOutsideCue: 'మీరు సురక్షిత ప్రాంతం నుండి {meters} మీటర్ల బయట ఉన్నారు. ప్రశాంతంగా ఉండండి. {direction}.',
    spokenDistanceMilestoneCue: 'ఇల్లు {meters} మీటర్ల దూరంలో ఉంది. {direction}.',
    spokenMovingAwayCue: 'మీరు ఇంటి నుండి దూరంగా వెళుతున్నట్లు అనిపిస్తోంది ({meters} మీటర్లు). దయచేసి ఆగి {direction}.',
    liveMapTitle: 'లైవ్ ఇంటి దిశ మ్యాప్',
  },
  kn: {
    configureHomeTitle: 'ಮನೆಯ ಸ್ಥಳ ಮತ್ತು ಸುರಕ್ಷಿತ ವಲಯವನ್ನು ಹೊಂದಿಸಿ',
    homeLabelInput: 'ಮನೆಯ ಸ್ಥಳದ ಹೆಸರು',
    useCurrentGpsBtn: 'ನನ್ನ ಪ್ರಸ್ತುತ GPS ಸ್ಥಳ ಬಳಸಿ',
    locatingGps: 'GPS ಪಡೆಯಲಾಗುತ್ತಿದೆ...',
    gpsCapturedMsg: 'ಪ್ರಸ್ತುತ GPS ನಿರ್ದೇಶಾಂಕಗಳನ್ನು ಪಡೆಯಲಾಗಿದೆ.',
    latLabel: 'ಅಕ್ಷಾಂಶ (Latitude)',
    lngLabel: 'ರೇಖಾಂಶ (Longitude)',
    customRadiusLabel: 'ಕಸ್ಟಮ್ ತ್ರಿಜ್ಯ (ಮೀ)',
    saveSafeZoneBtn: 'ಸುರಕ್ಷಿತ ವಲಯವನ್ನು ಉಳಿಸಿ',
    savingSafeZone: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ...',
    savedSafeZoneMsg: 'ಸುರಕ್ಷಿತ ವಲಯವನ್ನು ಉಳಿಸಿ ರೋಗಿಗೆ ಸಿಂಕ್ ಮಾಡಲಾಗಿದೆ.',
    monitoringToggleLabel: 'ಸುರಕ್ಷಿತ ವಲಯ ಮೇಲ್ವಿಚಾರಣೆ',
    monitoringActive: 'ಮೇಲ್ವಿಚಾರಣೆ ಸಕ್ರಿಯ',
    monitoringPaused: 'ಮೇಲ್ವಿಚಾರಣೆ ವಿರಾಮಗೊಂಡಿದೆ',
    noRealLocationYet: 'ರೋಗಿಯ ಸಾಧನದಿಂದ ಇನ್ನೂ ನೇರ GPS ಸ್ಥಳ ಹಂಚಿಕೆಯಾಗಿಲ್ಲ.',
    lastFixPrefix: 'ಕೊನೆಯ GPS ಸಮಯ',
    liveDistanceLabel: 'ಮನೆಯಿಂದ ದೂರ',
    recentAlertsTitle: 'ಸುರಕ್ಷಿತ ವಲಯ ಎಚ್ಚರಿಕೆಗಳು',
    noAlertsYet: 'ಯಾವುದೇ ಗಡಿ ಎಚ್ಚರಿಕೆ ದಾಖಲಾಗಿಲ್ಲ.',
    acknowledgeAlertBtn: 'ಒಪ್ಪಿಕೊಳ್ಳಿ',
    acknowledgedBadge: 'ಒಪ್ಪಿಕೊಳ್ಳಲಾಗಿದೆ',
    alertExitedTitle: 'ಸುರಕ್ಷಿತ ವಲಯ ಗಡಿ ಎಚ್ಚರಿಕೆ',
    alertReturnedTitle: 'ರೋಗಿ ಸುರಕ್ಷಿತ ವಲಯಕ್ಕೆ ಮರಳಿದ್ದಾರೆ',
    alertExitedMsg: '{name} ಮನೆಯಿಂದ {distance} ಮೀ. ದೂರದಲ್ಲಿದ್ದಾರೆ (ಮಿತಿ {radius} ಮೀ.).',
    alertReturnedMsg: '{name} {radius} ಮೀ. ಸುರಕ್ಷಿತ ವಲಯದೊಳಗೆ ಮರಳಿದ್ದಾರೆ.',
    alertConfiguredTitle: 'ಮನೆಯ ಸುರಕ್ಷಿತ ವಲಯ ನವೀಕರಿಸಲಾಗಿದೆ',
    alertConfiguredMsg: 'ನಿಮ್ಮ ಆರೈಕೆದಾರರು "{label}" ({radius} ಮೀ. ತ್ರಿಜ್ಯ) ಎಂದು ಹೊಂದಿಸಿದ್ದಾರೆ.',
    gpsPermissionDeniedErr: 'ಬ್ರೌಸರ್ ಸ್ಥಳ ಅನುಮತಿಯನ್ನು ನಿರಾಕರಿಸಿದೆ. ದಯವಿಟ್ಟು ನಿರ್ದೇಶಾಂಕಗಳನ್ನು ಕೈಯಾರೆ ನಮೂದಿಸಿ.',
    gpsUnavailableErr: 'ಸಾಧನದ GPS ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಕೈಯಾರೆ ನಮೂದಿಸಿ.',
    invalidCoordinatesErr: 'ದಯವಿಟ್ಟು ಮಾನ್ಯ ಅಕ್ಷಾಂಶ, ರೇಖಾಂಶ ಮತ್ತು ತ್ರಿಜ್ಯ (25–10000 ಮೀ.) ನಮೂದಿಸಿ.',

    patientCardTitle: 'ಮನೆ ಸುರಕ್ಷಿತ ವಲಯ ಮತ್ತು ನೇರ GPS',
    patientCardSubtitle: 'ಸುರಕ್ಷಿತವಾಗಿ ಮನೆಗೆ ಮರಳಲು ಆಶಾ ನೇರ ಮಾರ್ಗದರ್ಶನ',
    patientGuideMeHomeBtn: 'ನನ್ನನ್ನು ಮನೆಗೆ ಕರೆದೊಯ್ಯಿರಿ',
    patientHomeLabel: 'ಮನೆ',
    patientSafeRadiusLabel: 'ಸುರಕ್ಷಿತ ತ್ರಿಜ್ಯ',
    patientDistanceFromHome: 'ಮನೆಯಿಂದ {meters} ಮೀ.',
    patientStatusInside: 'ಸುರಕ್ಷಿತ ವಲಯದೊಳಗೆ',
    patientStatusOutside: 'ಸುರಕ್ಷಿತ ವಲಯದ ಹೊರಗೆ — ಆಶಾ ಜೊತೆ ಮನೆಗೆ ಮರಳಿ',
    patientStatusAwaiting: 'ನೇರ GPS ಸಿಗ್ನಲ್‌ಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ',
    patientStatusPaused: 'ಗೌಪ್ಯತಾ ನಿಯಂತ್ರಣಗಳಲ್ಲಿ ಸ್ಥಳ ಹಂಚಿಕೆ ನಿಲ್ಲಿಸಲಾಗಿದೆ',
    patientPrivacyLink: 'ಸ್ಥಳ ಗೌಪ್ಯತೆ ಮತ್ತು ಸಮ್ಮತಿ',

    stopNavigationBtn: 'ಮಾರ್ಗದರ್ಶನ ನಿಲ್ಲಿಸಿ',
    navigationStoppedNotice: 'ಧ್ವನಿ ಮತ್ತು GPS ಮಾರ್ಗದರ್ಶನವನ್ನು ನಿಲ್ಲಿಸಲಾಗಿದೆ. ನೀವು ಯಾವಾಗ ಬೇಕಾದರೂ ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಬಹುದು.',
    resumeNavigationBtn: 'ಮನೆ ಮಾರ್ಗದರ್ಶನ ಮುಂದುವರಿಸಿ',
    enableCompassBtn: 'ದಿಕ್ಸೂಚಿ ಸಕ್ರಿಯಗೊಳಿಸಿ',
    compassActiveBadge: 'ನೇರ ದಿಕ್ಸೂಚಿ ಸಕ್ರಿಯ',
    compassUnavailableNotice: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ದಿಕ್ಸೂಚಿ ಸಂವೇದಕ ಲಭ್ಯವಿಲ್ಲ — ಬಾಣ ಉತ್ತರದಿಂದ ದಿಕ್ಕನ್ನು ({deg}°) ತೋರಿಸುತ್ತದೆ.',
    bearingNorthNote: 'ಮನೆಯ ಭೌಗೋಳಿಕ ದಿಕ್ಕು: {deg}°',
    safetyLimitationNotice: 'ಇದು ನೇರ ರೇಖೆಯ ದಿಕ್ಕನ್ನು ತೋರಿಸುತ್ತದೆ, ಬೀದಿ ತಿರುವುಗಳನ್ನಲ್ಲ. ದಯವಿಟ್ಟು ಪಾದಚಾರಿ ಮಾರ್ಗ ಬಳಸಿ.',
    backgroundGpsNotice: 'ಆ್ಯಪ್ ತೆರೆದಿರುವಾಗ ಮಾತ್ರ ಬ್ರೌಸರ್ GPS ನವೀಕರಿಸುತ್ತದೆ; ಪರದೆ ಆಫ್ ಆದರೆ ಹಿನ್ನೆಲೆ ಟ್ರ್ಯಾಕಿಂಗ್ ನಿಲ್ಲುತ್ತದೆ.',
    spokenArrivedCue: 'ನೀವು ಸುರಕ್ಷಿತವಾಗಿ ಮನೆಯ ಹತ್ತಿರ ತಲುಪಿದ್ದೀರಿ.',
    spokenReturnCue: 'ನೀವು ಮತ್ತೆ ಸುರಕ್ಷಿತ ವಲಯದೊಳಗೆ ಬಂದಿದ್ದೀರಿ. ಮನೆ ಸುಮಾರು {meters} ಮೀಟರ್ ಮುಂದೆ ಇದೆ.',
    spokenOutsideCue: 'ನೀವು ಸುರಕ್ಷಿತ ವಲಯದಿಂದ {meters} ಮೀಟರ್ ಹೊರಗಿದ್ದೀರಿ. ಶಾಂತವಾಗಿರಿ. {direction}.',
    spokenDistanceMilestoneCue: 'ಮನೆ {meters} ಮೀಟರ್ ದೂರದಲ್ಲಿದೆ. {direction}.',
    spokenMovingAwayCue: 'ನೀವು ಮನೆಯಿಂದ ದೂರ ಹೋಗುತ್ತಿರುವಂತೆ ಕಾಣುತ್ತಿದೆ ({meters} ಮೀಟರ್). ದಯವಿಟ್ಟು ನಿಂತು {direction}.',
    liveMapTitle: 'ನೇರ ಮನೆ ದಿಕ್ಕಿನ ನಕ್ಷೆ',
  },
};

export function getGpsSafetyUi(language?: SupportedLanguage | string): GpsSafetyTranslationBundle {
  const short = String(language || 'en').split('-')[0].toLowerCase() as keyof typeof BUNDLES;
  return BUNDLES[short] || BUNDLES.en;
}

export function formatGpsSafetyMessage(
  template: string,
  params: Record<string, string | number | undefined>
): string {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value ?? '')),
    template
  );
}
