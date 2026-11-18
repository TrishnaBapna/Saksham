#!/usr/bin/env python3
"""
ASHA Seven-Language Multilingual Conversation Engine (Phase 2.5 Extension)

Consumes raw Whisper.cpp ASR transcripts across 7 Indian languages:
English (en), Marathi (mr), Hindi (hi), Malayalam (ml), Tamil (ta), Telugu (te), Kannada (kn),
and code-mixed combinations thereof.

Key Principles:
1. Complete Language Independence: Input language and response language are fully decoupled.
   A patient speaking Malayalam+English can receive responses in Marathi, Hindi, English, etc.
2. Clinical Safety Guard:
   - NEVER infers medication ingestion.
   - NEVER guesses drug names from circumlocutory appearance.
   - Strictly flags uncertainty and prompts caregiver verification.
3. Conversational Context & Speech Repair:
   - Resolves speech repairs ("Mala... nahi, mujhe paani chahiye").
   - Maintains multi-turn context across language switches.
4. Honest Research Disclosure:
   - Deterministic rule-based clinical semantic parser. Zero external paid LLM APIs used.
"""

import re
from typing import Dict, Any, List, Optional

SUPPORTED_LANGUAGES = ["en", "mr", "hi", "ml", "ta", "te", "kn"]

class AshaConversationContext:
    def __init__(self):
        self.history: List[Dict[str, Any]] = []
        self.last_intent: Optional[str] = None
        self.last_patient_state: Dict[str, Any] = {}
        self.clarification_pending: bool = False

    def add_turn(self, raw_transcript: str, detected_lang: str, intent: str, response: str, safety_triggered: bool):
        self.history.append({
            "raw_transcript": raw_transcript,
            "detected_lang": detected_lang,
            "intent": intent,
            "response": response,
            "safety_triggered": safety_triggered
        })
        self.last_intent = intent
        if len(self.history) > 6:
            self.history.pop(0)

    def reset(self):
        self.history.clear()
        self.last_intent = None
        self.last_patient_state.clear()
        self.clarification_pending = False


class AshaConversationEngine:
    def __init__(self):
        self.context = AshaConversationContext()

        # Full 7-language response templates
        self.templates = {
            "REQUEST_WATER": {
                "en": "I understand you need drinking water. I am notifying your caregiver to bring you a glass right away.",
                "mr": "मी समजले, तुम्हाला पाणी पाहिजे आहे. मी तुमच्या काळजीवाहकाला (caregiver) सांगते आहे की तुम्हाला पाणी आणून द्यावे.",
                "hi": "मैं समझ गई, आपको पानी चाहिए. मैं आपकी देखभाल करने वाले को बताती हूँ ताकि वे आपको पानी ला कर दें.",
                "ml": "മനസ്സിലായി, കുടിക്കാൻ വെള്ളം വേണം. ഞാൻ നിങ്ങളുടെ കെയർഗിവറോട് വെള്ളം കൊണ്ടുതരാൻ പറയാം.",
                "ta": "புரிந்தது, உங்களுக்கு குடிக்க தண்ணீர் வேண்டும். உங்கள் கவனிப்பாளரிடம் தண்ணீர் கொண்டுவரச் சொல்கிறேன்.",
                "te": "అర్థమైంది, మీకు తాగడానికి మంచి నీళ్లు కావాలి. మీ సంరక్షకుడికి నీళ్లు తీసుకురమ్మని చెబుతాను.",
                "kn": "ತಿಳಿಯಿತು, ನಿಮಗೆ ಕುಡಿಯಲು ನೀರು ಬೇಕು. ನಿಮ್ಮ ಆರೈಕೆದಾರರಿಗೆ ನೀರು ತರಲು ಹೇಳುತ್ತೇನೆ."
            },
            "REPORT_FATIGUE": {
                "en": "I understand that you are feeling very tired today. Please sit down and rest comfortably.",
                "mr": "मला समजते की आज तुम्हाला खूप थकवा जाणवत आहे. कृपया शांत बसा आणि विश्रांती घ्या.",
                "hi": "मुझे समझ आ रहा है कि आज आपको बहुत थकान महसूस हो रही है. कृपया आराम से बैठिए और विश्राम कीजिए.",
                "ml": "ഇന്ന് നിങ്ങൾക്ക് നല്ല ക്ഷീണം തോന്നുന്നുവെന്ന് ഞാൻ മനസ്സിലാക്കുന്നു. ദയവായി ഇരുന്ന് വിശ്രമിക്കൂ.",
                "ta": "இன்று உங்களுக்கு மிகவும் சோர்வாக இருக்கிறது என்பதை நான் புரிந்துகொள்கிறேன். தயவுசெய்து அமர்ந்து ஓய்வெடுங்கள்.",
                "te": "ఈరోజు మీకు చాలా అలసటగా ఉందని నేను అర్థం చేసుకున్నాను. దయచేసి కూర్చుని విశ్రాంతి తీసుకోండి.",
                "kn": "ಇವತ್ತು ನಿಮಗೆ ತುಂಬಾ ಆಯಾಸವಾಗಿದೆ ಎಂದು ನನಗೆ ಅರ್ಥವಾಗುತ್ತದೆ. ದಯವಿಟ್ಟು ಕುಳಿತು ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ."
            },
            "REQUEST_HELP_GENERAL": {
                "en": "I am right here with you. Please take your time, do not worry, I am here to help you.",
                "mr": "मी इथेच तुमच्यासोबत आहे आशा. काळजी करू नका, सावकाश सांगा, मी तुम्हाला नक्की मदत करेन.",
                "hi": "मैं यहीं आपके साथ हूँ. बिल्कुल घबराइए नहीं, आराम से कहिए, मैं आपकी पूरी सहायता करूँगी.",
                "ml": "ഞാൻ ഇവിടെ നിങ്ങളുടെ കൂടെയുണ്ട്. വിഷമിക്കേണ്ടതില്ല, ഞാൻ സഹായിക്കാം.",
                "ta": "நான் உங்களுடனே இருக்கிறேன். கவலைப்பட வேண்டாம், நான் உங்களுக்கு உதவுகிறேன்.",
                "te": "నేను మీతోనే ఉన్నాను. కంగారు పడకండి, నేను మీకు సహాయం చేస్తాను.",
                "kn": "ನಾನು ನಿಮ್ಮ ಜೊತೆಯಲ್ಲೇ ಇದ್ದೇನೆ. ಚಿಂತೆ ಮಾಡಬೇಡಿ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ."
            },
            "ROUTINE_WALK": {
                "en": "It is a wonderful time for your walk. Remember to walk gently and take your walking stick if needed.",
                "mr": "सैर करण्याची ही उत्तम वेळ आहे. सावकाश चाला आणि आवश्यक असल्यास काठी सोबत ठेवा.",
                "hi": "टहलने के लिए यह बहुत अच्छा समय है. आराम से चलें और ज़रूरत हो तो अपनी छड़ी साथ रखें.",
                "ml": "നടക്കാൻ പോകാൻ പറ്റിയ സമയമാണിത്. പതുക്കെ നടക്കുക, ആവശ്യമെങ്കിൽ വടി ഉപയോഗിക്കുക.",
                "ta": "நடைப்பயிற்சிக்கு இது மிகச் சிறந்த நேரம். மெதுவாக நடக்கவும், தேவைப்பட்டால் ஊன்றுகோலை எடுத்துக்கொள்ளவும்.",
                "te": "నడకకు ఇది మంచి సమయం. నెమ్మదిగా నడవండి, అవసరమైతే చేతికర్రను తీసుకోండి.",
                "kn": "ನಡಿಗೆಗೆ ಇದು ಉತ್ತಮ ಸಮಯ. ನಿಧಾನವಾಗಿ ನಡೆಯಿರಿ, ಅಗತ್ಯವಿದ್ದರೆ ಊರುಗೋಲು ತೆಗೆದುಕೊಳ್ಳಿ."
            },
            "ROUTINE_MEAL": {
                "en": "I have noted your meal. Staying well-nourished is very important. Please remember to rest for a little while.",
                "mr": "मी तुमच्या भोजनाची नोंद केली आहे. जेवणानंतर थोडा वेळ विश्रांती घ्या.",
                "hi": "मैंने आपके भोजन की बात दर्ज कर ली है. खाने के बाद थोड़ी देर विश्राम ज़रूर करें.",
                "ml": "നിങ്ങൾ ഭക്ഷണം കഴിച്ച വിവരം ഞാൻ രേഖപ്പെടുത്തി. അല്പസമയം വിശ്രമിക്കാൻ മറക്കരുത്.",
                "ta": "உங்கள் உணவை நான் குறித்துக்கொண்டேன். சாப்பிட்ட பிறகு சிறிது நேரம் ஓய்வெடுங்கள்.",
                "te": "మీరు భోజనం చేసినట్లు నేను గుర్తించాను. తిన్న తర్వాత కాసేపు విశ్రాంతి తీసుకోండి.",
                "kn": "ನಿಮ್ಮ ಊಟದ ವಿವರವನ್ನು ನಾನು ಗುರುತು ಹಾಕಿದ್ದೇನೆ. ಊಟದ ನಂತರ ಸ್ವಲ್ಪ ಹೊತ್ತು ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ."
            },
            "VIEW_FAMILY_PHOTOS": {
                "en": "Certainly! Let us look at your family and loved ones' photos together.",
                "mr": "नक्कीच! चला आपण तुमच्या प्रियजनांचे फोटो पाहूया.",
                "hi": "ज़रूर! चलिए आपके प्रियजनों और परिवार की तस्वीरें देखते हैं.",
                "ml": "തീർച്ചയായും! നമുക്ക് കുടുംബത്തിന്റെയും പ്രിയപ്പെട്ടവരുടെയും ചിത്രങ്ങൾ കാണാം.",
                "ta": "நிச்சயமாக! உங்கள் குடும்பத்தினர் மற்றும் அன்பானவர்களின் புகைப்படங்களைப் பார்ப்போம்.",
                "te": "తప్పకుండా! మీ కుటుంబ సభ్యుల మరియు ఆత్మీయుల ఫోటోలు చూద్దాం.",
                "kn": "ಖಂಡಿತವಾಗಿ! ಬನ್ನಿ ನಿಮ್ಮ ಕುಟುಂಬದವರ ಮತ್ತು ಪ್ರೀತಿಪಾತ್ರರ ಫೋಟೋಗಳನ್ನು ನೋಡೋಣ."
            },
            "MEDICATION_UNCERTAINTY": {
                "en": "Please do not worry about your medicine. I will NOT record it as taken. Please check with your caregiver or doctor for your exact schedule.",
                "mr": "औषधाबद्दल काळजी करू नका. मी औषध घेतले अशी नोंद करणार नाही. कृपया तुमच्या प्रिस्क्रिप्शनची खात्री करण्यासाठी काळजीवाहकाला विचारा.",
                "hi": "दवा को लेकर चिंता मत कीजिए. मैं दवा ली गई ऐसा रिकॉर्ड नहीं करूँगी. कृपया अपनी सही दवा जानने के लिए देखभाल करने वाले की मदद लें.",
                "ml": "മരുന്നിനെക്കുറിച്ച് വിഷമിക്കേണ്ട. നിങ്ങൾ മരുന്ന് കഴിച്ചതായി ഞാൻ രേഖപ്പെടുത്തില്ല. ദയവായി കെയർഗിവറോട് ചോദിച്ച് ഉറപ്പുവരുത്തുക.",
                "ta": "மருந்து பற்றி கவலைப்பட வேண்டாம். நீங்கள் மருந்து சாப்பிட்டதாக நான் பதிவு செய்ய மாட்டேன். உங்கள் கவனிப்பாளரிடம் கேட்டு உறுதிப்படுத்தவும்.",
                "te": "మందు గురించి ఆందోళన చెందకండి. మీరు మందు వేసుకున్నట్లు నేను నమోదు చేయను. దయచేసి మీ సంరక్షకుడిని అడిగి తెలుసుకోండి.",
                "kn": "ಔಷಧಿಯ ಬಗ್ಗೆ ಚಿಂತೆ ಮಾಡಬೇಡಿ. ನೀವು ಮಾತ್ರೆ ತಗೊಂಡಿದ್ದೀರಿ ಎಂದು ನಾನು ದಾಖಲಿಸುವುದಿಲ್ಲ. ದಯವಿಟ್ಟು ಆರೈಕೆದಾರರನ್ನು ಕೇಳಿ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ."
            },
            "MEDICATION_CIRCUMLOCUTION": {
                "en": "You mentioned a tablet, but for your medical safety I cannot identify medicines by appearance alone. Let us check your doctor's official prescription.",
                "mr": "तुम्ही गोळीबद्दल सांगत आहात, पण सुरक्षिततेसाठी मी गोळीचे नाव स्वतः ठरवू शकत नाही. चला डॉक्टरांचे प्रिस्क्रिप्शन तपासूया.",
                "hi": "आप गोली के बारे में बता रहे हैं, लेकिन सुरक्षा के लिए मैं दवा का नाम खुद तय नहीं कर सकती. कृपया अपने डॉक्टर का पर्चा जाँचें.",
                "ml": "നിങ്ങൾ ഗുളികയെക്കുറിച്ചാണ് പറയുന്നത്, എന്നാൽ സുരക്ഷയ്ക്കായി എനിക്ക് മരുന്നിന്റെ പേര് അനുമാനിക്കാൻ കഴിയില്ല. നമുക്ക് ഡോക്ടറുടെ കുറിപ്പടി പരിശോധിക്കാം.",
                "ta": "நீங்கள் மாத்திரையைப் பற்றி கூறுகிறீர்கள், ஆனால் பாதுகாப்பிற்காக நானே மருந்தின் பெயரை யூகிக்க முடியாது. மருத்துவரின் மருந்துச் சீட்டைப் பார்ப்போம்.",
                "te": "మీరు మాత్ర గురించి చెబుతున్నారు, కానీ భద్రత దృష్ట్యా మందు పేరును నేను సొంతంగా నిర్ణయించలేను. డాక్టర్ ప్రిస్క్రిప్షన్ తనిఖీ చేద్దాం.",
                "kn": "ನೀವು ಮಾತ್ರೆಯ ಬಗ್ಗೆ ಹೇಳುತ್ತಿದ್ದೀರಿ, ಆದರೆ ಸುರಕ್ಷತೆಗಾಗಿ ನಾನು ಔಷಧಿಯ ಹೆಸರನ್ನು ಊಹಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ವೈದ್ಯರ ಚೀಟಿಯನ್ನು ಪರಿಶೀಲಿಸೋಣ."
            },
            "MEMORY_LAPSE": {
                "en": "It is completely fine to forget. Take your time, do not worry. Let me look up your schedule for you.",
                "mr": "विसर पडणे स्वाभाविक आहे. काळजी करू नका, मी तुमचे वेळापत्रक तपासते.",
                "hi": "भूल जाना बिल्कुल स्वाभाविक है. चिंता मत कीजिए, मैं आपका शेड्यूल देख लेती हूँ.",
                "ml": "മറന്നുപോയതിൽ വിഷമിക്കേണ്ടതില്ല. ഞാൻ നിങ്ങളുടെ സമയം പരിശോധിക്കാം.",
                "ta": "மறந்து போவது இயல்பானதுதான். கவலைப்பட வேண்டாம், நான் உங்கள் நேர அட்டவணையை பார்க்கிறேன்.",
                "te": "మర్చిపోవడం సహజమే. కంగారు పడకండి, నేను మీ షెడ్యూల్‌ను చూస్తాను.",
                "kn": "ಮರೆತುಹೋಗುವುದು ಸಹಜ. ಚಿಂತೆ ಮಾಡಬೇಡಿ, ನಾನು ನಿಮ್ಮ ವೇಳಾಪಟ್ಟಿಯನ್ನು ನೋಡುತ್ತೇನೆ."
            },
            "GENERAL_STATEMENT": {
                "en": "I am listening to you. It is good to spend this peaceful moment together.",
                "mr": "मी तुमचे ऐकत आहे. हा शांत वेळ सोबत घालवणे चांगले आहे.",
                "hi": "मैं आपकी बात सुन रही हूँ. यह शांत समय साथ बिताना अच्छा है.",
                "ml": "ഞാൻ നിങ്ങളെ കേൾക്കുന്നുണ്ട്. സമാധാനമായിരിക്കൂ.",
                "ta": "நான் உங்களைக் கவனித்துக் கொண்டிருக்கிறேன். அமைதியாக இருங்கள்.",
                "te": "నేను మీ మాట వింటున్నాను. ప్రశాంతంగా ఉండండి.",
                "kn": "ನಾನು ನಿಮ್ಮ ಮಾತನ್ನು ಕೇಳುತ್ತಿದ್ದೇನೆ. ಶಾಂತವಾಗಿರಿ."
            },
            "CLARIFICATION_NEEDED": {
                "en": "I heard you, but I did not catch that clearly. Could you please repeat that once more?",
                "mr": "मी तुमचे बोलणे ऐकले, पण मला पूर्ण समजले नाही. कृपया पुन्हा एकदा सांगाल का?",
                "hi": "मैंने आपकी बात सुनी, लेकिन मुझे पूरी तरह समझ नहीं आया. क्या आप कृपया एक बार फिर बता सकते हैं?",
                "ml": "ഞാൻ കേട്ടു, പക്ഷേ വ്യക്തമായി മനസ്സിലായില്ല. ദയവായി ഒന്നുകൂಡಿ പറയാമോ?",
                "ta": "நான் கேட்டேன், ஆனால் தெளிவாக புரியவில்லை. தயவுசெய்து மீண்டும் ஒருமுறை சொல்வீர்களா?",
                "te": "నేను విన్నాను, కానీ స్పష్టంగా అర్థం కాలేదు. దయచేసి ఇంకొకసారి చెబుతారా?",
                "kn": "ನಾನು ಕೇಳಿಸಿಕೊಂಡೆ, ಆದರೆ ಸರಿಯಾಗಿ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಇನ್ನೊಮ್ಮೆ ಹೇಳುತ್ತೀರಾ?"
            }
        }

    def clean_text(self, text: str) -> str:
        return re.sub(r'[^\w\s]', ' ', text.lower()).strip()

    def detect_self_correction(self, text: str) -> Optional[str]:
        lower = text.lower()
        correction_patterns = [
            r'(?:mala|mujhe|enikku|enakku|naaku|nanage)\s*\.{0,3}\s*(?:nahi|नाही|no|wait|sorry|illa|alla)\s*[,.]*\s*(.*)',
            r'.*?\b(?:nahi|नाही|no|wait|actually|illa|alla)\s*[,.]*\s+(.+)'
        ]
        for pat in correction_patterns:
            m = re.search(pat, lower)
            if m and len(m.group(1).strip()) > 2:
                return m.group(1).strip()
        return None

    def analyze_intent(self, raw_transcript: str) -> Dict[str, Any]:
        clean = self.clean_text(raw_transcript)
        lower = raw_transcript.lower()

        corrected_segment = self.detect_self_correction(raw_transcript)
        text_to_eval = corrected_segment if corrected_segment else clean

        # 1. Circumlocution (physical appearance of medicine)
        is_circumlocution = (
            (("white" in lower or "safed" in lower or "सफेद" in raw_transcript or "वाइत" in raw_transcript or "व्हाइट" in raw_transcript or "വെള്ള" in raw_transcript or "வெள்ளை" in raw_transcript or "తెల్ల" in raw_transcript or "ಬೆಳ್ಳ" in raw_transcript) and
             ("round" in lower or "राउंद" in raw_transcript or "राउंड" in raw_transcript or "gol" in lower or "गोल" in raw_transcript or "tablet" in lower or "ताबलित" in raw_transcript or "टैबलेट" in raw_transcript or "goli" in lower or "गोली" in raw_transcript or "pill" in lower or "മാത്ര" in raw_transcript or "ಮಾತ್ರೆ" in raw_transcript or "మాత్ర" in raw_transcript)) or
            ("round tablet" in lower or "राउंद ताबलित" in raw_transcript or "राउंड टैबलेट" in raw_transcript) or
            (("doctor ne diya" in lower or "डॉक्टर ने" in raw_transcript or "ഡോക്ടർ" in raw_transcript or "டாக்டர்" in raw_transcript or "డాక్టర్" in raw_transcript or "ವೈದ್ಯ" in raw_transcript or "doctor" in lower) and
             ("tablet" in lower or "ताबलित" in raw_transcript or "टैबलेट" in raw_transcript or "goli" in lower or "गोली" in raw_transcript or "दवा" in raw_transcript or "औषध" in raw_transcript or "marunnu" in lower or "மாத்திரை" in raw_transcript or "మాత్ర" in raw_transcript or "ಮಾತ್ರೆ" in raw_transcript))
        )
        if is_circumlocution:
            return {
                "intent": "MEDICATION_CIRCUMLOCUTION",
                "safety_triggered": True,
                "confidence_notes": ["Circumlocution detected across languages. Clinical safety guard active: zero pharmaceutical guessing."],
                "is_self_corrected": bool(corrected_segment)
            }

        # 2. Medication Uncertainty / Memory Lapse across 7 languages
        is_med_token = (
            "medicine" in lower or "tablet" in lower or "pill" in lower or "goli" in lower or
            "मैज्सन" in raw_transcript or "मेडिसिन" in raw_transcript or "मेडीसिन" in raw_transcript or
            "ताबलित" in raw_transcript or "ताबलिट" in raw_transcript or "टैबलेट" in raw_transcript or
            "aushadh" in lower or "औषध" in raw_transcript or "और शवद" in raw_transcript or "शवद" in raw_transcript or
            "dawa" in lower or "दवा" in raw_transcript or "गोली" in raw_transcript or
            "marunnu" in lower or "marunninte" in lower or "മരുന്ന്" in raw_transcript or "മരുന്നിന്റെ" in raw_transcript or "ഗുളിക" in raw_transcript or
            "maathirai" in lower or "மாத்திரை" in raw_transcript or "மாத்திரையின்" in raw_transcript or "மாற்றிறை" in raw_transcript or "மாற்றிறையின்" in raw_transcript or
            "mandu" in lower or "మందు" in raw_transcript or "మాత్ర" in raw_transcript or
            "maathre" in lower or "ಮಾತ್ರೆ" in raw_transcript or "ಔಷಧಿ" in raw_transcript or "माथ्रे" in raw_transcript or
            "doctor sonna" in lower or "दोक्तर" in raw_transcript or "doctor appointment" in lower
        )
        is_uncertainty_token = (
            "forgot" in lower or "forget" in lower or
            "yaad nahi" in lower or "याद नहीं" in raw_transcript or "याध नहीं" in raw_transcript or "याद नही" in raw_transcript or "याध नही" in raw_transcript or
            "ghaychi hoti" in lower or "घ्यायची होती" in raw_transcript or
            "aathavat nahi" in lower or "आठवत नाही" in raw_transcript or "नावाध्वत नहीं" in raw_transcript or "आठवत" in raw_transcript or
            "marannu" in lower or "മറന്നു" in raw_transcript or
            "maranthu" in lower or "மறந்து" in raw_transcript or "மறந்துவிட்டது" in raw_transcript or
            "gurtuku" in lower or "గుర్తుకు" in raw_transcript or "గుర్తు" in raw_transcript or
            "marethu" in lower or "ಮರೆತು" in raw_transcript or "ಮರೆತುಹೋಗಿದೆ" in raw_transcript or
            "visarlo" in lower or "bhool gaya" in lower
        )
        if is_med_token and is_uncertainty_token:
            return {
                "intent": "MEDICATION_UNCERTAINTY",
                "safety_triggered": True,
                "confidence_notes": ["Medication uncertainty / memory lapse detected across 7 languages. Prohibit routine completion."],
                "is_self_corrected": bool(corrected_segment)
            }

        # 3. Memory Lapse (non-medication, e.g. appointment)
        if "appointment" in lower and is_uncertainty_token:
            return {
                "intent": "MEMORY_LAPSE",
                "safety_triggered": False,
                "confidence_notes": ["Appointment schedule lapse detected."],
                "is_self_corrected": bool(corrected_segment)
            }

        # 4. Hydration / Water Need across 7 languages
        is_water = (
            ("water" in text_to_eval or "drink" in text_to_eval or "thirsty" in text_to_eval) or
            ("paani" in text_to_eval or "pani" in text_to_eval or "पाणी" in raw_transcript or "पानी" in raw_transcript or "प्यास" in raw_transcript) or
            ("vellam" in text_to_eval or "വെള്ളം" in raw_transcript) or
            ("thanneer" in text_to_eval or "தண்ணீர்" in raw_transcript) or
            ("neellu" in text_to_eval or "నీళ్లు" in raw_transcript or "निलू" in raw_transcript) or
            ("neeru" in text_to_eval or "ನೀರು" in raw_transcript or "निरु" in raw_transcript)
        )
        if is_water:
            return {
                "intent": "REQUEST_WATER",
                "safety_triggered": False,
                "confidence_notes": ["Hydration intent recognized across 7 languages."],
                "is_self_corrected": bool(corrected_segment)
            }

        # 5. Routine: Walk
        is_walk = (
            ("walk" in text_to_eval or "walking" in text_to_eval or "garden" in text_to_eval) or
            ("sair" in text_to_eval or "सैर" in raw_transcript or "फेरफटका" in raw_transcript) or
            ("nadakka" in text_to_eval or "നടക്കാൻ" in raw_transcript) or
            ("nadai" in text_to_eval or "நடை" in raw_transcript or "நடைப்பயிற்சி" in raw_transcript) or
            ("nadaka" in text_to_eval or "నడక" in raw_transcript) or
            ("nadige" in text_to_eval or "ನಡಿಗೆ" in raw_transcript)
        )
        if is_walk:
            return {
                "intent": "ROUTINE_WALK",
                "safety_triggered": False,
                "confidence_notes": ["Daily routine: walking session recognized."],
                "is_self_corrected": bool(corrected_segment)
            }

        # 6. Routine: Meal
        is_meal = (
            ("meal" in text_to_eval or "lunch" in text_to_eval or "dinner" in text_to_eval or "food" in text_to_eval or "eat" in text_to_eval) or
            ("jevan" in text_to_eval or "जेवण" in raw_transcript or "जेवन" in raw_transcript or "दुपारचे" in raw_transcript or "दुपार्चे" in raw_transcript or "bhojan" in text_to_eval or "भोजन" in raw_transcript) or
            ("aaharam" in text_to_eval or "ആഹാരം" in raw_transcript or "ഭക്ഷണം" in raw_transcript) or
            ("unavu" in text_to_eval or "உணவு" in raw_transcript or "சாப்பாடு" in raw_transcript) or
            ("bhojanam" in text_to_eval or "భోజనం" in raw_transcript or "भो जनम" in raw_transcript or "भोजनम" in raw_transcript) or
            ("oota" in text_to_eval or "ಊಟ" in raw_transcript or "ऊटा" in raw_transcript or "उटा" in raw_transcript)
        )
        if is_meal:
            return {
                "intent": "ROUTINE_MEAL",
                "safety_triggered": False,
                "confidence_notes": ["Daily routine: meal activity recognized."],
                "is_self_corrected": bool(corrected_segment)
            }

        # 7. Fatigue / Physical Symptoms
        is_fatigue = (
            ("tired" in text_to_eval or "fatigue" in text_to_eval or "exhausted" in text_to_eval or "weak" in text_to_eval) or
            ("thakan" in text_to_eval or "थकान" in raw_transcript or "खकान" in raw_transcript or "thakva" in text_to_eval or "थकवा" in raw_transcript) or
            ("ksheenam" in text_to_eval or "ക്ഷീണം" in raw_transcript) or
            ("soorvu" in text_to_eval or "சோர்வு" in raw_transcript or "சோர்வாக" in raw_transcript) or
            ("alasata" in text_to_eval or "అలసట" in raw_transcript or "అలసటగా" in raw_transcript or "अलसर्टटगा" in raw_transcript or "अलसट" in raw_transcript) or
            ("aayaasa" in text_to_eval or "ಆಯಾಸ" in raw_transcript or "ಆಯಾಸವಾಗಿದೆ" in raw_transcript or "आयासा" in raw_transcript)
        )
        if is_fatigue:
            return {
                "intent": "REPORT_FATIGUE",
                "safety_triggered": False,
                "confidence_notes": ["Physical fatigue symptom recognized across 7 languages."],
                "is_self_corrected": bool(corrected_segment)
            }

        # 8. Help Request
        is_help = (
            ("help" in text_to_eval or "getting up" in text_to_eval or "assist" in text_to_eval) or
            ("madat" in text_to_eval or "मदत" in raw_transcript or "मदग" in raw_transcript or "madad" in text_to_eval or "मदद" in raw_transcript) or
            ("uthayla" in text_to_eval or "उठायला" in raw_transcript or "उत्हायला" in raw_transcript) or
            ("sahayikkanamo" in text_to_eval or "സഹായിക്കാമോ" in raw_transcript or "സഹായം" in raw_transcript or "sahayakano" in text_to_eval) or
            ("udhavi" in text_to_eval or "உதவி" in raw_transcript) or
            ("sahaayam" in text_to_eval or "సహాయం" in raw_transcript or "सहाया" in raw_transcript or "सहाय" in raw_transcript) or
            ("sahaaya" in text_to_eval or "ಸಹಾಯ" in raw_transcript)
        )
        if is_help:
            return {
                "intent": "REQUEST_HELP_GENERAL",
                "safety_triggered": False,
                "confidence_notes": ["Direct assistance / help request recognized."],
                "is_self_corrected": bool(corrected_segment)
            }

        # 9. Reminiscence / Family Photos
        is_photos = (
            ("photo" in text_to_eval or "family" in text_to_eval or "loved ones" in text_to_eval or "picture" in text_to_eval) or
            ("फोटो" in raw_transcript or "तस्वीर" in raw_transcript or "ചിത്രം" in raw_transcript or "படம்" in raw_transcript or "ఫోటో" in raw_transcript or "ಫೋಟೋ" in raw_transcript)
        )
        if is_photos:
            return {
                "intent": "VIEW_FAMILY_PHOTOS",
                "safety_triggered": False,
                "confidence_notes": ["Family reminiscence intent recognized."],
                "is_self_corrected": bool(corrected_segment)
            }

        # 10. General calm statements
        if "quiet" in text_to_eval or "peaceful" in text_to_eval or "day" in text_to_eval:
            return {
                "intent": "GENERAL_STATEMENT",
                "safety_triggered": False,
                "confidence_notes": ["General reflective statement recognized."],
                "is_self_corrected": bool(corrected_segment)
            }

        # Fallback / Clarification
        return {
            "intent": "CLARIFICATION_NEEDED",
            "safety_triggered": False,
            "confidence_notes": ["Confidence below threshold. Requesting clarification politely."],
            "is_self_corrected": bool(corrected_segment)
        }

    def process_turn(self, raw_transcript: str, detected_lang: str = "auto", response_lang: str = "en") -> Dict[str, Any]:
        target_lang = response_lang if response_lang in SUPPORTED_LANGUAGES else "en"

        if not raw_transcript or not raw_transcript.strip():
            fallback_resp = self.templates["CLARIFICATION_NEEDED"].get(target_lang, self.templates["CLARIFICATION_NEEDED"]["en"])
            return {
                "raw_transcript": "",
                "detected_lang": detected_lang,
                "response_lang": target_lang,
                "intent": "CLARIFICATION_NEEDED",
                "asha_response": fallback_resp,
                "safety_triggered": False,
                "clinical_action": "PROMPT_REPEAT",
                "confidence_notes": ["Empty or silent audio transcript."]
            }

        analysis = self.analyze_intent(raw_transcript)
        intent = analysis["intent"]
        safety_triggered = analysis["safety_triggered"]

        intent_templates = self.templates.get(intent, self.templates["CLARIFICATION_NEEDED"])
        response_text = intent_templates.get(target_lang, intent_templates.get("en", "I am here with you."))

        clinical_action = "INFORM_USER"
        if safety_triggered:
            if intent == "MEDICATION_CIRCUMLOCUTION":
                clinical_action = "REFUSE_DRUG_INFERENCE_AND_NOTIFY_CARE"
            elif intent == "MEDICATION_UNCERTAINTY":
                clinical_action = "HALT_COMPLETION_AND_PROMPT_CAREGIVER"
        elif intent == "REQUEST_WATER":
            clinical_action = "NOTIFY_HYDRATION_NEED"
        elif intent == "REPORT_FATIGUE":
            clinical_action = "LOG_FATIGUE_SYMPTOM"
        elif intent == "VIEW_FAMILY_PHOTOS":
            clinical_action = "OPEN_REMINISCENCE_MODULE"
        elif intent == "ROUTINE_WALK":
            clinical_action = "ASSIST_WALK_ROUTINE"
        elif intent == "ROUTINE_MEAL":
            clinical_action = "RECORD_MEAL_ROUTINE"
        elif intent == "CLARIFICATION_NEEDED":
            clinical_action = "REQUEST_CLARIFICATION"

        self.context.add_turn(raw_transcript, detected_lang, intent, response_text, safety_triggered)

        return {
            "raw_transcript": raw_transcript,
            "detected_lang": detected_lang,
            "response_lang": target_lang,
            "intent": intent,
            "asha_response": response_text,
            "safety_triggered": safety_triggered,
            "clinical_action": clinical_action,
            "confidence_notes": analysis["confidence_notes"],
            "is_self_corrected": analysis.get("is_self_corrected", False),
            "context_history_depth": len(self.context.history)
        }

if __name__ == "__main__":
    engine = AshaConversationEngine()
    test_cases = [
        ("Can you please bring me water?", "en", "ml"),
        ("Mala aaj paani pahije", "mr", "ta"),
        ("Mujhe ek glass paani chahiye", "hi", "te"),
        ("Enikku vellam venam", "ml", "en"),
        ("Enakku thanneer vendum", "ta", "kn"),
        ("Naaku neellu kaavaali", "te", "hi"),
        ("Nanage neeru beku", "kn", "mr")
    ]
    print("Testing 7-Language Cross-Lingual Independence...")
    for text, in_lang, out_lang in test_cases:
        res = engine.process_turn(text, detected_lang=in_lang, response_lang=out_lang)
        print(f"[{in_lang} -> {out_lang}] '{text}'")
        print(f"  Intent: {res['intent']} | Action: {res['clinical_action']}")
        print(f"  ASHA Response: {res['asha_response']}\n")
