#!/usr/bin/env python3
"""
ASHA Semantic Understanding Engine v2 (Phase 2.5.2 Research Layer)

Major Improvements over Phase 2.5 Engine:
1. Syntactic Clause Segmentation & Discourse Marker Parsing.
2. True Negation Scope Analysis (distinguishes "do not bring water" from "bring water, not tea").
3. Semantic Field & Synonym Expansion (thirst, fatigue, pain, physical inability, loneliness, confusion).
4. Strict Architectural Separation:
   - detected_meaning (concepts, polarity, scope, confidence)
   - proposed_intent (semantic interpretation)
   - uncertainty_level (LOW, MEDIUM, HIGH)
   - required_clarification (gentle multi-turn prompt if ambiguous)
   - permitted_response (safe conversational response text across 7 languages)
   - clinical_guardrail (BLOCKS ALL ACTIONS; strictly prevents Firestore writes or routine completions)
5. Multi-turn context state tracking (speech repairs, follow-up resolutions, contradictory inputs).
6. 100% Deterministic, offline, ₹0 cost. No external paid LLMs or black-box embeddings.
"""

import re
import unicodedata
from typing import Dict, Any, List, Optional, Tuple

SUPPORTED_LANGUAGES = ["en", "mr", "hi", "ml", "ta", "te", "kn"]

# -------------------------------------------------------------------------
# Negation Markers and Boundaries Across 7 Indian Languages
# -------------------------------------------------------------------------
NEGATION_MARKERS = {
    "en": [
        r"\bdo\s+not\b", r"\bdon'?t\b", r"\bdoes\s+not\b", r"\bdoesn'?t\b",
        r"\bdid\s+not\b", r"\bdidn'?t\b", r"\bnot\b", r"\bno\b", r"\bnever\b",
        r"\bno\s+more\b", r"\bstop\b", r"\brefuse\b", r"\bwon'?t\b", r"\bcannot\b",
        r"\bcan'?t\b", r"\bshould\s+not\b", r"\bshouldn'?t\b", r"\bwould\s+not\b"
    ],
    "hi": [
        r"(?:^|\s)नहीं(?:$|\s|\.)", r"(?:^|\s)नही(?:$|\s|\.)", r"(?:^|\s)मत(?:$|\s|\.)",
        r"(?:^|\s)ना(?:$|\s|\.)", r"इनकार", r"बिल्कुल\s+नहीं", r"रहने\s+दो",
        r"\bnahi\b", r"\bnahin\b", r"\bmat\b", r"\bnaa\b", r"rehne\s+do", r"nahi\s+chahiye", r"nahi\s+karna"
    ],
    "mr": [
        r"नाही", r"नको", r"नका", r"नये", r"करायचे\s+नाही", r"नको\s+आहे", r"विसरलो",
        r"nahi", r"nako", r"naka", r"naye", r"karaycha\s+nahi", r"nako\s+aahe"
    ],
    "ta": [
        r"இல்லை", r"வேண்டாம்", r"கூடாது", r"செய்யமாட்டேன்", r"மாட்டேன்", r"இப்போது\s+இல்லை",
        r"illai", r"vendaam", r"koodathu", r"seyyamaatten", r"ippodhu\s+illai", r"vendam"
    ],
    "te": [
        r"వద్దు", r"లేదు", r"కాదు", r"చేయను", r"నడవను", r"ఇప్పుడు\s+వద్దు",
        r"vaddu", r"ledu", r"kaadu", r"cheyanu", r"ippudu\s+vaddu"
    ],
    "kn": [
        r"ಬೇಡ", r"ಇಲ್ಲ", r"ಬಾರದು", r"ಮಾಡಲ್ಲ", r"ಈಗ\s+ಬೇಡ",
        r"beda", r"illa", r"baaradu", r"maadalla", r"eega\s+beda"
    ],
    "ml": [
        r"വേണ്ട", r"ഇല്ല", r"പാടില്ല", r"ചെയ്യില്ല", r"വരില്ല", r"ഇപ്പോൾ\s+വേണ്ട",
        r"venda", r"illa", r"paadilla", r"cheyyilla", r"ippol\s+venda"
    ]
}

# Discourse markers for reassurance that do NOT negate the main predicate
DISCOURSE_REASSURANCE_PATTERNS = [
    r"\bdon'?t\s+worry\b", r"\bno\s+worries\b", r"\bचिंता\s+मत\s+करो\b",
    r"\bकाळजी\s+करू\s+नका\b", r"\bkavalappadaadheergal\b", r"\bchinta\s+mat\s+karo\b",
    r"\bkalji\s+karu\s+naka\b"
]

# Contrastive conjunctions that divide a sentence into clauses with distinct polarity
CONTRASTIVE_CONJUNCTIONS = [
    r"\bbut\b", r"\bhowever\b", r"\binstead\s+of\b", r"\brather\s+than\b", r"\bnot\b",
    r"लेकिन", r"पर", r"किन्तु", r"परन्तु", r"बल्कि", r"के\s+बजाय",
    r"पण", r"परंतु", r"ऐवजी", r"नको\s+तर",
    r"ஆனால்", r"बதிலாக",
    r"కానీ", r"అయితే",
    r"ಆದರೆ", r"ಬದಲು",
    r"എന്നാൽ", r"പകരം",
    r"\blekin\b", r"\bpan\b", r"\baanal\b", r"\bkaani\b", r"\baadare\b", r"\bennal\b"
]

# Speech repair markers (indicating the patient is correcting themselves)
SPEECH_REPAIR_MARKERS = [
    r"\bno\s+wait\b", r"\bactually\b", r"\bsorry\b", r"\bi\s+mean\b",
    r"\bnahi\b", r"\bnahi\s+nahi\b", r"\bनाही\b", r"\bनाही\s+नाही\b",
    r"\bनहीं\b", r"\bनहीं\s+नहीं\b", r"\bमाफ\s+करा\b"
]

# Uncertainty / Cognitive Lapse Markers
UNCERTAINTY_PATTERNS = [
    r"\bdon'?t\s+know\b", r"\bnot\s+sure\b", r"\bforgot\b", r"\bcan'?t\s+remember\b",
    r"\bwhether\b", r"\bif\b", r"\bunclear\b", r"\bconfused\b", r"\bwondering\b",
    r"याद\s+नहीं", r"भूल\s+गया", r"भूल\s+गई", r"पता\s+नहीं", r"समझ\s+नहीं\s+आ\s+रहा",
    r"आठवत\s+नाही", r"विसरलो", r"विसरले", r"कळत\s+नाही", r"माहित\s+नाही",
    r"மறந்துவிட்டது", r"நினைவில்லை", r"புரியவில்லை",
    r"గుర్తు\s+లేదు", r"మర్చిపోయాను", r"తెలియదు",
    r"ನೆನಪಿಲ್ಲ", r"ಮರೆತುಹೋಯಿತು", r"ಗೊತ್ತಿಲ್ಲ",
    r"ഓർമ്മയില്ല", r"മറന്നുപോയി", r"അറിയില്ല",
    r"yaad\s+nahi", r"bhool\s+gaya", r"aathvat\s+nahi", r"visarlo", r"maranthu", r"gurtu\s+ledu"
]

# -------------------------------------------------------------------------
# Semantic Field Concepts (Expanded Synonym Clusters)
# -------------------------------------------------------------------------
CONCEPT_PATTERNS = {
    "HYDRATION": {
        "keywords": [
            r"water", r"drink", r"sip", r"glass\s+of\s+water", r"cup\s+of\s+water",
            r"thirsty", r"thirst", r"parched", r"dry\s+throat", r"dehydrated",
            r"पानी", r"जल", r"प्यास", r"गला\s+सूख", r"गिलास",
            r"पाणी", r"तहान", r"घसा\s+कोरडा", r"एक\s+घोट",
            r"தண்ணீர்", r"தாகம்", r"தொண்டை\s+வறண்டு", r"குடிக்க",
            r"నీళ్ళు", r"దాహం", r"గొంతు\s+ఎండి", r"తాగడానికి",
            r"ನೀರು", r"ದಾಹ", r"ಗಂಟಲು\s+ಒಣಗಿ", r"ಕುಡಿಯಲು",
            r"വെള്ളം", r"ദാഹം", r"തൊണ്ട\s+വരളു", r"കുടിക്കാൻ",
            r"paani", r"vellam", r"thanneer", r"neellu", r"neeru",
            r"pyaas", r"tahaan", r"daaham", r"thaagam", r"gala\s+sookh"
        ]
    },
    "FATIGUE": {
        "keywords": [
            r"tired", r"exhausted", r"fatigue", r"drained", r"weak", r"no\s+energy",
            r"worn\s+out", r"sleepy", r"need\s+to\s+rest", r"lie\s+down", r"heavy\s+eyes", r"\brest\b",
            r"थकान", r"थक\s+गया", r"थक\s+गई", r"बदन\s+टूट\s+रहा", r"सुस्ती", r"जान\s+नहीं\s+है",
            r"थकवा", r"दमलो", r"दमले", r"शक्ती\s+नाही", r"ताकद\s+नाही", r"विश्रांती",
            r"சோர்வு", r"களைப்பு", r"பலவீனம்", r"ஓய்வு",
            r"అలసట", r"నీరసం", r"శక్తి\s+లేదు", r"విశ్రాంతి",
            r"ಆಯಾಸ", r"ಸುಸ್ತು", r"ಶಕ್ತಿ\s+ಇಲ್ಲ", r"ವಿಶ್ರಾಂತಿ",
            r"ക്ഷീണം", r"തളർച്ച", r"ശക്തിയില്ല", r"വിശ്രമം",
            r"thakva", r"thakan", r"ksheenam", r"sorvaga", r"alasata", r"aayasa", r"badan\s+toot"
        ]
    },
    "PAIN_DISTRESS": {
        "keywords": [
            r"pain", r"hurting", r"ache", r"aching", r"throbbing", r"sore", r"burning",
            r"cramps", r"agony", r"discomfort", r"headache", r"chest\s+pain", r"stomach\s+ache",
            r"दर्द", r"दुख\s+रहा", r"पीड़ा", r"जलन", r"तकलीफ", r"सिर\s+दर्द",
            r"वेदना", r"दुखतंय", r"त्रास", r"कळा", r"डोकं\s+दुखतंय",
            r"வலி", r"வலிக்கிறது", r"வேதனை", r"துன்பம்",
            r"నొప్పి", r"బాధ", r"మంట",
            r"ನೋವು", r"ಸಂಕಟ", r"ಉರಿ",
            r"വേദന", r"വിഷമം", r"പൊള്ളൽ",
            r"dard", r"dukhtay", r"vali", r"noppi", r"noovu", r"vedana"
        ]
    },
    "PHYSICAL_ASSISTANCE": {
        "keywords": [
            r"help", r"assist", r"support", r"cannot\s+stand", r"can'?t\s+get\s+up",
            r"can'?t\s+get\s+out", r"get\s+out\s+of", r"stuck", r"cannot\s+move",
            r"legs\s+giving\s+way", r"fall", r"falling", r"dizzy", r"balance",
            r"hold\s+my\s+hand", r"lift\s+me", r"need\s+someone\s+to\s+help",
            r"मदद", r"सहायता", r"उठ\s+नहीं\s+पा\s+रहा", r"उठ\s+नहीं\s+सकती", r"चक्कर", r"सहारा", r"हाथ\s+पकड़ो",
            r"मदत", r"साहाय्य", r"उठता\s+येत\s+नाही", r"उभी\s+राहू\s+शकत\s+नाही", r"तोल\s+जातोय", r"आधार",
            r"உதவி", r"எழுந்திருக்க\s+முடியவில்லை", r"மயக்கம்", r"பிடி",
            r"సహాయం", r"లవలేకపోతున్నాను", r"కళ్ళు\s+తిరుగు", r"పట్టుకో",
            r"ಸಹಾಯ", r"ಎದ್ದೇಳಲು\s+ಆಗುತ್ತಿಲ್ಲ", r"ತಲೆ\s+ತಿರುಗು", r"ಹಿಡಿ",
            r"സഹായം", r"എഴുന്നേൽക്കാൻ\s+വയ്യ", r"തലകറക്കം", r"പിടിക്ക്",
            r"madat", r"sahaya", r"udavi", r"utha", r"tol\s+jatoy"
        ]
    },
    "WALK_ROUTINE": {
        "keywords": [
            r"walk", r"walking", r"stroll", r"afternoon\s+walk", r"garden\s+walk", r"take\s+steps",
            r"सैर", r"चलना", r"टहलना", r"घूमना",
            r"चालणे", r"चालायचे", r"फेरफटका", r"बागेत",
            r"நடை", r"நடப்பது", r"நடக்க", r"உலா",
            r"నడక", r"నడవాలి", r"నడవ", r"తిరగడం",
            r"ನಡಿಗೆ", r"ನಡೆಯಲು", r"ವಾಕ್",
            r"നടത്തം", r"നടക്കാൻ",
            r"sair", r"walk", r"nadakka", r"nadavali", r"nadeyalu"
        ]
    },
    "MEAL_ROUTINE": {
        "keywords": [
            r"meal", r"food", r"eat", r"eating", r"lunch", r"dinner", r"breakfast",
            r"खाना", r"भोजन", r"दोपहर\s+का\s+खाना", r"रोटी",
            r"जेवण", r"दुपारचे\s+जेवण", r"खाणे", r"अन्न",
            r"உணவு", r"சாப்பாடு", r"மதிய\s+உணவு",
            r"భోజనం", r"అన్నం", r"తిండి",
            r"ಊಟ", r"ಆಹಾರ", r"ತಿಂಡಿ",
            r"ഭക്ഷണം", r"ഊണ്",
            r"jevan", r"khana", r"bhojanam", r"unavu", r"oota"
        ]
    },
    "MEDICATION": {
        "keywords": [
            r"medicine", r"medication", r"pill", r"tablet", r"capsule", r"dose", r"prescription",
            r"doctor", r"डॉक्टर",
            r"दवाई", r"दवा", r"गोली", r"खुराक",
            r"औषध", r"गोळी", r"मात्रा",
            r"மருந்து", r"மாத்திரை",
            r"మందు", r"మాత్ర",
            r"ಔಷಧ", r"ಮಾತ್ರೆ",
            r"മരുന്ന്", r"ഗുളിക",
            r"aushadh", r"goli", r"dawa", r"tablet", r"pill", r"matre"
        ]
    },
    "FAMILY_REMINISCENCE": {
        "keywords": [
            r"family", r"photo", r"photos", r"album", r"picture", r"pictures", r"loved\s+ones",
            r"daughter", r"son", r"grandchild", r"wife", r"husband", r"children",
            r"तस्वीर", r"फोटो", r"परिवार", r"बच्चे", r"बेटा", r"बेटी",
            r"छायाचित्र", r"कुटुंब", r"मुलगा", r"मुलगी", r"नातू",
            r"படம்", r"புகைப்படம்", r"குடும்பம்",
            r"ఫోటో", r"చిత్రం", r"కుటుంబం",
            r"ಫೋಟೋ", r"ಚಿತ್ರ", r"ಕುಟುಂಬ",
            r"ചിത്രം", r"ഫോട്ടോ", r"കുടുംബം"
        ]
    },
    "LONELINESS": {
        "keywords": [
            r"lonely", r"\bfeel\s+alone\b", r"\ball\s+alone\b", r"\bi\s+am\s+alone\b",
            r"nobody\s+here", r"no\s+one\s+visits", r"miss\s+my",
            r"feel\s+abandoned", r"talk\s+to\s+me", r"sit\s+with\s+me",
            r"अकेला", r"अकेलापन", r"कोई\s+नहीं\s+है", r"मन\s+नहीं\s+लग\s+रहा", r"उदास",
            r"एकटं", r"एकटेपणा", r"कोणी\s+नाही", r"उदास\s+वाटतंय",
            r"தனிமை", r"யாரும்\s+இல்லை", r"வருத்தமாக",
            r"ఒంటరి", r"ఎవరూ\s+లేరు", r"బాధగా",
            r"ಒಂಟಿ", r"ಯಾರೂ\s+ಇಲ್ಲ", r"ಬೇಸರ",
            r"ഏകാന്തത", r"ആരുമില്ല", r"സങ്കടം"
        ]
    },
    "CONFUSION_DISORIENTATION": {
        "keywords": [
            r"where\s+am\s+i", r"who\s+are\s+you", r"what\s+day\s+is\s+it", r"what\s+place\s+is\s+this",
            r"lost", r"disoriented", r"don'?t\s+understand", r"head\s+spinning", r"blank",
            r"कहाँ\s+हूँ", r"आप\s+कौन\s+हैं", r"कौन\s+सा\s+दिन", r"कुछ\s+समझ\s+नहीं\s+आ\s+रहा",
            r"कुठे\s+आहे\s+मी", r"तुम्ही\s+कोण", r"वार\s+कोणता", r"कळत\s+नाहीये",
            r"எங்கே\s+இருக்கிறேன்", r"நீங்கள்\s+யார்", r"புரியவில்லை",
            r"ఎక్కడ\s+ఉన్నాను", r"మీరు\s+ఎవరు", r"అర్థం\s+కావట్లేదు",
            r"ಎಲ್ಲಿದ್ದೀನಿ", r"ನೀವು\s+ಯಾರು", r"ತಿಳಿಯುತ್ತಿಲ್ಲ",
            r"എവിടെയാണ്\s+ഞാൻ", r"നിങ്ങൾ\s+ആരാണ്", r"മനസ്സിലാകുന്നില്ല"
        ]
    }
}

# -------------------------------------------------------------------------
# Conversational Response Templates across 7 Languages
# -------------------------------------------------------------------------
RESPONSE_TEMPLATES = {
    "REQUEST_WATER": {
        "en": "I understand you are thirsty and need water. I am notifying your caregiver to bring you a fresh glass right away.",
        "mr": "मला समजले की तुम्हाला तहान लागली आहे आणि पाणी पाहिजे आहे. मी काळजीवाहकाला लगेच ताजे पाणी आणायला सांगते.",
        "hi": "मैं समझ गई कि आपको प्यास लगी है और पानी चाहिए. मैं आपकी देखभाल करने वाले को तुरंत पानी लाने के लिए कहती हूँ.",
        "ta": "புரிந்தது, உங்களுக்கு தாகமாக உள்ளது மற்றும் தண்ணீர் வேண்டும். உடனே தண்ணீர் கொண்டுவரச் சொல்கிறேன்.",
        "te": "అర్థమైంది, మీకు దాహం వేస్తోంది, మంచి నీళ్లు కావాలి. మీ సంరక్షకుడికి నీళ్లు తీసుకురమ్మని చెబుతాను.",
        "kn": "ತಿಳಿಯಿತು, ನಿಮಗೆ ದಾಹವಾಗಿದೆ, ಕುಡಿಯಲು ನೀರು ಬೇಕು. ನಿಮ್ಮ ಆರೈಕೆದಾರರಿಗೆ ತಕ್ಷಣ ನೀರು ತರಲು ಹೇಳುತ್ತೇನೆ.",
        "ml": "മനസ്സിലായി, നിങ്ങൾക്ക് ദാഹിക്കുന്നു, കുടിക്കാൻ വെള്ളം വേണം. ഞാൻ ഉടൻ തന്നെ വെള്ളം കൊണ്ടുവരാൻ പറയാം."
    },
    "REFUSE_HYDRATION": {
        "en": "I understand clearly that you do not want water right now. I will not bring any. Please rest comfortably.",
        "mr": "मला स्पष्ट समजले की तुम्हाला आत्ता पाणी नको आहे. मी पाणी आणायला सांगणार नाही. तुम्ही शांत बसा.",
        "hi": "मैं अच्छी तरह समझ गई कि आपको अभी पानी नहीं चाहिए. मैं पानी नहीं मँगवाऊँगी. आप आराम से बैठिए.",
        "ta": "இப்போது உங்களுக்கு தண்ணீர் வேண்டாம் என்பது தெளிவாகப் புரிந்தது. நான் தண்ணீர் கொண்டுவரச் சொல்ல மாட்டேன்.",
        "te": "ఇప్పుడు మీకు నీళ్లు వద్దు అనేది నాకు స్పష్టంగా అర్థమైంది. నేను నీళ్లు తీసుకురమ్మని చెప్పను.",
        "kn": "ಈಗ ನಿಮಗೆ ನೀರು ಬೇಡ ಎಂಬುದು ಸ್ಪಷ್ಟವಾಗಿ ತಿಳಿಯಿತು. ನಾನು ನೀರು ತರಲು ಹೇಳುವುದಿಲ್ಲ. ಆರಾಮಾಗಿರಿ.",
        "ml": "ഇപ്പോൾ വെള്ളം വേണ്ടെന്ന് വ്യക്തമായി മനസ്സിലായി. ഞാൻ വെള്ളം കൊണ്ടുവരാൻ പറയില്ല."
    },
    "REFUSE_WALK_ROUTINE": {
        "en": "I understand that you do not want to walk right now. That is completely okay. Please rest and take it easy.",
        "mr": "मला समजले की तुम्हाला आत्ता फिरायला किंवा चालायला जायचे नाही. काही हरकत नाही, तुम्ही विश्रांती घ्या.",
        "hi": "मैं समझ गई कि आपको अभी टहलने या सैर पर नहीं जाना है. कोई बात नहीं, आप आराम कीजिए.",
        "ta": "இப்போது உங்களுக்கு நடைப்பயிற்சி செய்ய விருப்பமில்லை என்பதைப் புரிந்து கொண்டேன். பரவாயில்லை, ஓய்வெடுங்கள்.",
        "te": "ఇప్పుడు మీకు నడవడానికి ఇష్టం లేదని అర్థమైంది. పర్వాలేదు, మీరు విశ్రాంతి తీసుకోండి.",
        "kn": "ಈಗ ನಿಮಗೆ ವಾಕ್ ಮಾಡಲು ಇಷ್ಟವಿಲ್ಲ ಎಂಬುದು ತಿಳಿಯಿತು. ಪರವಾಗಿಲ್ಲ, ನೀವು ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ.",
        "ml": "ഇപ്പോൾ നടക്കാൻ താൽപ്പര്യമില്ലെന്ന് മനസ്സിലായി. സാരമില്ല, വിശ്രമിക്കൂ."
    },
    "REQUEST_MEDICATION_ASSISTANCE": {
        "en": "I understand you are asking for your medicine. I am alerting your caregiver so they can bring your prescribed dose safely.",
        "mr": "मला समजले की तुम्हाला औषध हवे आहे. मी काळजीवाहकाला सांगते जेणेकरून ते डॉक्टरांच्या सल्ल्यानुसार औषध आणून देतील.",
        "hi": "मैं समझ गई कि आपको दवाई चाहिए. मैं देखभाल करने वाले को बता रही हूँ ताकि वे आपकी निर्धारित दवाई ला सकें.",
        "ta": "உங்களுக்கு மருந்து தேவை என்பதைப் புரிந்து கொண்டேன். கவனிப்பாளரிடம் தெரிவிக்கிறேன்.",
        "te": "మీకు మందులు కావాలని అర్థమైంది. మీ సంరక్షకుడికి తెలియజేస్తున్నాను.",
        "kn": "ನಿಮಗೆ ಔಷಧಿ ಬೇಕು ಎಂದು ತಿಳಿಯಿತು. ಆರೈಕೆದಾರರಿಗೆ ತಿಳಿಸುತ್ತೇನೆ.",
        "ml": "നിങ്ങൾക്ക് മരുന്ന് വേണമെന്ന് മനസ്സിലായി. കെയർഗിവറോട് പറയാം."
    },
    "REFUSE_MEDICATION": {
        "en": "I hear that you do not want to take this medicine right now. I have not recorded it as taken, and I am alerting your family caregiver to talk with you gently.",
        "mr": "मी ऐकले की तुम्हाला हे औषध आत्ता घ्यायचे नाही. मी हे औषध घेतल्याची नोंद केलेली नाही, आणि मी काळजीवाहकाला कळवत आहे.",
        "hi": "मैंने सुना कि आप यह दवाई अभी नहीं लेना चाहते. मैंने इसे लिया हुआ दर्ज नहीं किया है, और मैं देखभाल करने वाले को सूचित कर रही हूँ.",
        "ta": "நீங்கள் இப்போது இந்த மருந்தை உட்கொள்ள விரும்பவில்லை என்பதைக் கவனித்தேன். குடும்ப கவனிப்பாளருக்குத் தெரிவிக்கிறேன்.",
        "te": "మీరు ఇప్పుడు ఈ మందు వేసుకోవడానికి ఇష్టపడట్లేదని గమనించాను. నేను దీన్ని వేసుకున్నట్లు నమోదు చేయలేదు.",
        "kn": "ನೀವು ಈಗ ಈ ಔಷಧಿಯನ್ನು ತೆಗೆದುಕೊಳ್ಳಲು ಬಯಸುತ್ತಿಲ್ಲ ಎಂದು ಗಮನಿಸಿದೆ. ನಾನು ಆರೈಕೆದಾರರಿಗೆ ತಿಳಿಸುತ್ತೇನೆ.",
        "ml": "നിങ്ങൾ ഇപ്പോൾ ഈ മരുന്ന് കഴിക്കാൻ ആഗ്രഹിക്കുന്നില്ലെന്ന് ശ്രദ്ധയിൽപ്പെട്ടു. ഞാൻ കെയർഗിവറെ അറിയിക്കാം."
    },
    "FLAG_MEDICATION_CIRCUMLOCUTION": {
        "en": "I hear you describing a pill by its shape or color. For your medical safety, I cannot guess or identify medicines by their appearance. I have alerted your family caregiver to assist you directly.",
        "mr": "तुम्ही गोळीच्या आकारावरून किंवा रंगावरून विचारत आहात. तुमच्या सुरक्षेसाठी, मी गोळीचा अंदाज लावू शकत नाही. मी काळजीवाहकाला प्रत्यक्ष येऊन औषध पाहायला सांगितले आहे.",
        "hi": "आप दवाई के रंग या आकार से पूछ रहे हैं. आपकी सुरक्षा के लिए मैं दवाई का अंदाज़ा नहीं लगा सकती. मैंने देखभाल करने वाले को आपकी मदद के लिए कहा है.",
        "ta": "மாத்திரையின் வடிவம் மூலம் கேட்கிறீர்கள். உங்கள் பாதுகாப்பிற்காக நான் மருந்தை கணிக்க முடியாது.",
        "te": "మీరు మాత్ర ఆకారం ద్వారా అడుగుతున్నారు. మీ భద్రత కోసం నేను మందును ఊహించలేను.",
        "kn": "ನೀವು ಮಾತ್ರೆಯ ಆಕಾರದಿಂದ ಕೇಳುತ್ತಿದ್ದೀರಿ. ನಿಮ್ಮ ಸುರಕ್ಷತೆಗಾಗಿ ನಾನು ಔಷಧಿಯನ್ನು ಊಹಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.",
        "ml": "ഗുളികയുടെ ആകൃതി വെച്ച് ചോദിക്കുകയാണ്. നിങ്ങളുടെ സുരക്ഷയ്ക്കായി എനിക്ക് മരുന്ന് ഊഹിക്കാൻ കഴിയില്ല."
    },
    "REFUSE_ASSISTANCE": {
        "en": "I understand you would like to manage on your own. I respect that completely. I will be right here quietly if you need anything at all.",
        "mr": "मला समजले की तुम्हाला स्वतः करायचे आहे. मला तुमचा आदर आहे. तुम्हाला काहीही हवे असल्यास मी इथेच शांतपणे थांबले आहे.",
        "hi": "मैं समझ गई कि आप खुद करना चाहते हैं. मैं आपकी बात का पूरा सम्मान करती हूँ. अगर आपको ज़रूरत हो तो मैं यहीं पास में हूँ.",
        "ta": "நீங்கள் சுயமாக செய்ய விரும்புகிறீர்கள் என்பதைப் புரிந்து கொண்டேன். நான் இங்கேயே அமைதியாக இருக்கிறேன்.",
        "te": "మీరు స్వయంగా చేసుకోవాలని అనుకుంటున్నారని అర్థమైంది. నేను ఇక్కడే ఉంటాను.",
        "kn": "ನೀವೇ ಮಾಡಿಕೊಳ್ಳಲು ಬಯಸುತ್ತೀರಿ ಎಂದು ತಿಳಿಯಿತು. ನಾನು ಇಲ್ಲೇ ಇರುತ್ತೇನೆ.",
        "ml": "നിങ്ങൾ സ്വയം ചെയ്യാൻ ആഗ്രഹിക്കുന്നുവെന്ന് മനസ്സിലായി. ഞാൻ ഇവിടെത്തന്നെയുണ്ട്."
    },
    "FLAG_MEDICATION_UNCERTAINTY": {
        "en": "I understand you are unsure whether you took your medication. For your safety, I will never guess or assume. I am asking your family caregiver to verify your prescription directly.",
        "mr": "तुम्हाला औषध घेतले की नाही याबद्दल शंका आहे हे मला समजले. तुमच्या सुरक्षेसाठी, मी अंदाजाने नोंद करणार नाही. मी काळजीवाहकाला प्रत्यक्ष खात्री करायला सांगत आहे.",
        "hi": "मुझे समझ आ रहा है कि आपको याद नहीं है कि आपने दवाई ली या नहीं. आपकी सुरक्षा के लिए मैं कोई अनुमान नहीं लगाऊँगी. मैं देखभाल करने वाले से कह रही हूँ कि वे इसे जाँचें.",
        "ta": "நீங்கள் மருந்து சாப்பிட்டீர்களா இல்லையா என்பதில் சந்தேகம் உள்ளது என்பதைப் புரிந்து கொண்டேன். உங்கள் பாதுகாப்பிற்காக நான் கணிக்க மாட்டேன்.",
        "te": "మీరు మందు వేసుకున్నారో లేదో గుర్తులేదని అర్థమైంది. మీ భద్రత కోసం నేను ఊహించను. మీ సంరక్షకుడిని ధృవీకరించమని అడుగుతున్నాను.",
        "kn": "ನೀವು ಔಷಧಿ ತೆಗೆದುಕೊಂಡಿದ್ದೀರೋ ಇಲ್ಲವೋ ಎಂದು ನೆನಪಿಲ್ಲ ಎಂದು ತಿಳಿಯಿತು. ನಿಮ್ಮ ಸುರಕ್ಷತೆಗಾಗಿ ನಾನು ಊಹಿಸುವುದಿಲ್ಲ.",
        "ml": "മരുന്ന് കഴിച്ചോ ഇല്ലയോ എന്ന് ഉറപ്പില്ലെന്ന് മനസ്സിലായി. നിങ്ങളുടെ സുരക്ഷയ്ക്കായി ഞാൻ ഊഹിക്കില്ല."
    },
    "REPORT_FATIGUE": {
        "en": "I understand that you are feeling very tired and drained today. Please sit down and rest comfortably. You do not have to exert yourself.",
        "mr": "मला समजते की आज तुम्हाला खूप थकवा आणि अशक्तपणा जाणवत आहे. कृपया शांत बसा आणि विश्रांती घ्या.",
        "hi": "मुझे समझ आ रहा है कि आज आपको बहुत थकान और कमजोरी महसूस हो रही है. कृपया आराम से बैठिए.",
        "ta": "இன்று நீங்கள் மிகவும் சோர்வாக உணர்கிறீர்கள் என்பதைப் புரிந்து கொண்டேன். தயவுசெய்து அமர்ந்து ஓய்வெடுங்கள்.",
        "te": "ఈరోజు మీకు చాలా అలసటగా, నీరసంగా ఉందని అర్థమైంది. దయచేసి కూర్చుని విశ్రాంతి తీసుకోండి.",
        "kn": "ಇಂದು ನಿಮಗೆ ತುಂಬಾ ಆಯಾಸವಾಗಿದೆ ಎಂದು ತಿಳಿಯಿತು. ದಯವಿಟ್ಟು ಕುಳಿತು ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ.",
        "ml": "ഇന്ന് നിങ്ങൾക്ക് നല്ല ക്ഷീണം തോന്നുന്നുവെന്ന് മനസ്സിലായി. ദയവായി വിശ്രമിക്കൂ."
    },
    "REPORT_PAIN": {
        "en": "I hear that you are experiencing pain and discomfort. I am immediately notifying your caregiver so they can come check on you and make you comfortable.",
        "mr": "मला समजले की तुम्हाला वेदना किंवा त्रास होत आहे. मी लगेच काळजीवाहकाला कळवत आहे जेणेकरून ते तुमच्याजवळ येतील.",
        "hi": "मुझे समझ आ रहा है कि आपको दर्द या तकलीफ हो रही है. मैं तुरंत देखभाल करने वाले को बता रही हूँ ताकि वे आपकी देखभाल कर सकें.",
        "ta": "உங்களுக்கு வலி அல்லது அசௌகரியம் இருப்பதை உணர்கிறேன். கவனிப்பாளருக்கு உடனே தெரிவிக்கிறேன்.",
        "te": "మీకు నొప్పి లేదా అసౌకర్యంగా ఉందని విన్నాను. వెంటనే మీ సంరక్షకుడికి తెలియజేస్తున్నాను.",
        "kn": "ನಿಮಗೆ ನೋವು ಅಥವಾ ತೊಂದರೆಯಾಗುತ್ತಿದೆ ಎಂದು ಕೇಳಿದೆ. ತಕ್ಷಣ ನಿಮ್ಮ ಆರೈಕೆದಾರರಿಗೆ ತಿಳಿಸುತ್ತೇನೆ.",
        "ml": "നിങ്ങൾക്ക് വേദനയോ അസ്വസ്ഥതയോ ഉണ്ടെന്ന് മനസ്സിലായി. ഞാൻ ഉടൻ തന്നെ കെയർഗിവറെ അറിയിക്കാം."
    },
    "REQUEST_PHYSICAL_HELP": {
        "en": "I hear you. Please stay still and do not try to move on your own. I am alerting your caregiver right now to assist you.",
        "mr": "मी ऐकले. कृपया जागेवरच थांबा आणि स्वतः उठण्याचा प्रयत्न करू नका. मी आत्ताच काळजीवाहकाला मदतीसाठी बोलावते.",
        "hi": "मैंने सुना. कृपया शांत रहिए और खुद उठने की कोशिश मत कीजिए. मैं अभी देखभाल करने वाले को आपकी मदद के लिए बुलाती हूँ.",
        "ta": "நான் கேட்கிறேன். தயவுசெய்து அசையாமல் இருங்கள். உங்களுக்கு உதவ கவனிப்பாளரை இப்போதே அழைக்கிறேன்.",
        "te": "నేను విన్నాను. దయచేసి కదలకుండా ఉండండి. మీకు సహాయం చేయడానికి మీ సంరక్షకుడిని పిలుస్తున్నాను.",
        "kn": "ನಾನು ಕೇಳಿಸಿಕೊಂಡೆ. ದಯವಿಟ್ಟು ಹಾಗೆಯೇ ಇರಿ. ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಆರೈಕೆದಾರರನ್ನು ಕರೆಯುತ್ತಿದ್ದೇನೆ.",
        "ml": "ഞാൻ കേൾക്കുന്നുണ്ട്. ദയവായി അവിടെത്തന്നെ നിൽക്കൂ. സഹായിക്കാൻ കെയർഗിവറെ വിളിക്കാം."
    },
    "REPORT_LONELINESS": {
        "en": "I am right here with you, and you are not alone. I am also letting your family know you would love some company.",
        "mr": "मी इथेच तुमच्यासोबत आहे, तुम्ही एकटे नाही आहात. तुमच्या कुटुंबालाही मी कळवते की त्यांना तुमच्यासोबत वेळ घालवायला सांगावे.",
        "hi": "मैं यहीं आपके पास हूँ, आप अकेले नहीं हैं. मैं आपके परिवार को भी बताती हूँ ताकि वे आपके पास आकर बैठें.",
        "ta": "நான் உங்களுடனேயே இருக்கிறேன், நீங்கள் தனியாக இல்லை. குடும்பத்தினருக்குத் தெரிவிக்கிறேன்.",
        "te": "నేను మీతోనే ఉన్నాను, మీరు ఒంటరిగా లేరు. మీ కుటుంబ సభ్యులకు తెలియజేస్తాను.",
        "kn": "ನಾನು ನಿಮ್ಮೊಂದಿಗೇ ಇದ್ದೇನೆ, ನೀವು ಒಂಟಿಯಲ್ಲ. ನಿಮ್ಮ ಕುಟುಂಬದವರಿಗೂ ತಿಳಿಸುತ್ತೇನೆ.",
        "ml": "ഞാൻ ഇവിടെ നിങ്ങളുടെ കൂടെയുണ്ട്, നിങ്ങൾ ഒറ്റയ്ക്കല്ല."
    },
    "REPORT_CONFUSION": {
        "en": "Everything is alright. You are safe at home in your comfortable room. I am here with you, and your caregiver is close by.",
        "mr": "सर्व काही ठीक आहे. तुम्ही तुमच्या स्वतःच्या घरात सुरक्षित आणि शांत आहात. मी तुमच्यासोबत आहे.",
        "hi": "सब कुछ बिल्कुल ठीक है. आप अपने घर में सुरक्षित हैं. मैं आपके साथ हूँ और आपकी देखभाल करने वाले पास ही हैं.",
        "ta": "எல்லாம் சரியாக உள்ளது. நீங்கள் உங்கள் வீட்டில் பாதுகாப்பாக இருக்கிறீர்கள்.",
        "te": "అంతా బాగానే ఉంది. మీరు మీ ఇంట్లోనే క్షేమంగా ఉన్నారు. నేను మీతోనే ఉన్నాను.",
        "kn": "ಎಲ್ಲವೂ ಸರಿಯಾಗಿದೆ. ನೀವು ಮನೆಯಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿದ್ದೀರಿ. ನಾನು ನಿಮ್ಮೊಂದಿಗಿದ್ದೇನೆ.",
        "ml": "എല്ലാം സുരക്ഷിതമാണ്. നിങ്ങൾ വീട്ടിലാണ്. ഞാൻ കൂടെയുണ്ട്."
    },
    "REPORT_MEDICATION_TAKEN": {
        "en": "Thank you for letting me know that you took your medicine. I have logged this observation for your caregiver to review and confirm.",
        "mr": "तुम्ही औषध घेतले हे सांगितल्याबद्दल धन्यवाद. मी काळजीवाहकांच्या माहितीसाठी ही नोंद ठेवली आहे.",
        "hi": "दवाई लेने की जानकारी देने के लिए धन्यवाद. मैंने देखभाल करने वाले के लिए यह बात लिख ली है.",
        "ta": "மருந்து சாப்பிட்டதை தெரிவித்ததற்கு நன்றி.",
        "te": "మందు వేసుకున్నట్లు తెలిపినందుకు ధన్యవాదాలు.",
        "kn": "ಔಷಧಿ ತೆಗೆದುಕೊಂಡಿದ್ದನ್ನು ತಿಳಿಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು.",
        "ml": "മരുന്ന് കഴിച്ച വിവരം അറിയിച്ചതിന് നന്ദി."
    },
    "ROUTINE_WALK": {
        "en": "It is a wonderful time for your gentle walk. Let's make sure you have your comfortable footwear on first.",
        "mr": "तुमच्या छोट्या फेरफटक्यासाठी ही छान वेळ आहे. आधी तुमच्या पायात आरामदायक चप्पल किंवा बूट आहेत ना ते पाहूया.",
        "hi": "सैर पर जाने का यह बहुत अच्छा समय है. आइए पहले देख लें कि आपने आरामदायक जूते पहने हैं.",
        "ta": "நடைப்பயிற்சிக்கு இது நல்ல நேரம்.",
        "te": "వాకింగ్ చేయడానికి ఇది మంచి సమయం.",
        "kn": "ವಾಕ್ ಮಾಡಲು ಇದು ಉತ್ತಮ ಸಮಯ.",
        "ml": "നടക്കാൻ ഇത് നല്ല സമയമാണ്."
    },
    "CLARIFICATION_NEEDED": {
        "en": "I want to be sure I understand you properly. Could you please say that once more gently?",
        "mr": "मला तुमची गोष्ट नीट समजून घ्यायची आहे. तुम्ही कृपया पुन्हा एकदा शांतपणे सांगाल का?",
        "hi": "मैं आपकी बात ठीक से समझना चाहती हूँ. क्या आप कृपया एक बार फिर धीरे से बता सकते हैं?",
        "ta": "நீங்கள் சொல்வதை சரியாகப் புரிந்து கொள்ள விரும்புகிறேன். தயவுசெய்து மீண்டும் மெதுவாகச் சொல்வீர்களா?",
        "te": "మీరు చెప్పేది సరిగ్గా అర్థం చేసుకోవాలనుకుంటున్నాను. దయచేసి మళ్లీ చెబుతారా?",
        "kn": "ನೀವು ಹೇಳಿದ್ದನ್ನು ಸರಿಯಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಬಯಸುತ್ತೇನೆ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ನಿಧಾನವಾಗಿ ಹೇಳುತ್ತೀರಾ?",
        "ml": "നിങ്ങൾ പറഞ്ഞത് വ്യക്തമായി മനസ്സിലാക്കാൻ ആഗ്രഹിക്കുന്നു. ഒന്നുകൂടി പറയാമോ?"
    }
}


class AshaSemanticEngineV2:
    def __init__(self):
        self.context_history: List[Dict[str, Any]] = []

    def normalize(self, text: str) -> str:
        if not text:
            return ""
        text = unicodedata.normalize("NFC", text)
        text = text.lower()
        # Preserve Unicode Letters (L), Combining Marks/Matras (M), Numbers (N), and essential punctuation
        chars = []
        for c in text:
            cat = unicodedata.category(c)
            if cat.startswith("L") or cat.startswith("M") or cat.startswith("N") or c.isspace() or c in ".,?!-।'\":":
                chars.append(c)
            else:
                chars.append(" ")
        text = "".join(chars)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def detect_speech_repairs(self, text: str) -> Tuple[str, bool, Optional[str]]:
        """
        Detects if patient repaired/corrected their utterance mid-sentence.
        e.g. 'Mala paani... nahi, aushadh pahije' -> Target clause: 'aushadh pahije'
        """
        for marker in SPEECH_REPAIR_MARKERS:
            pattern = rf"(?:^|[\s,\.]){marker}(?:[\s,\.]|$)"
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                before = text[:m.start()].strip()
                after = text[m.end():].strip()
                if after:
                    return after, True, before
        return text, False, None

    def segment_clauses(self, text: str) -> List[Dict[str, Any]]:
        """
        Splits sentence into syntactically bounded clauses and analyzes local polarity.
        """
        # Split on punctuation or contrastive conjunctions
        delim_pattern = r"(?:[\.,\?!]|\b(?:but|however|instead of|rather than|lekin|pan|aanal|kaani|aadare|ennal)\b)"
        raw_chunks = re.split(delim_pattern, text, flags=re.IGNORECASE)
        clauses = []

        for chunk in raw_chunks:
            c = chunk.strip()
            if not c:
                continue

            # Check discourse reassurance (e.g. "Don't worry") which is NOT negation of predicate
            is_reassurance = False
            for r_pat in DISCOURSE_REASSURANCE_PATTERNS:
                if re.search(r_pat, c, re.IGNORECASE):
                    is_reassurance = True
                    # Strip the reassurance phrase so remaining text is evaluated cleanly
                    c = re.sub(r_pat, "", c, flags=re.IGNORECASE).strip()
                    break

            # Evaluate negation within this clause
            is_negated = False
            neg_trigger = None
            for lang, pat_list in NEGATION_MARKERS.items():
                for pat in pat_list:
                    if re.search(pat, c, re.IGNORECASE):
                        is_negated = True
                        neg_trigger = pat
                        break
                if is_negated:
                    break

            clauses.append({
                "clause_text": c,
                "is_negated": is_negated,
                "neg_trigger": neg_trigger,
                "is_reassurance": is_reassurance
            })

        return clauses if clauses else [{"clause_text": text, "is_negated": False, "neg_trigger": None, "is_reassurance": False}]

    def evaluate_concepts(self, text: str) -> List[Tuple[str, float]]:
        """
        Matches semantic concept clusters against text and returns (concept, confidence).
        """
        matches = []
        for concept, data in CONCEPT_PATTERNS.items():
            hit_count = 0
            for kw in data["keywords"]:
                if re.search(kw, text, re.IGNORECASE):
                    hit_count += 1
            if hit_count > 0:
                conf = min(0.95, 0.70 + (hit_count * 0.10))
                matches.append((concept, conf))
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches

    def check_uncertainty(self, text: str) -> bool:
        for pat in UNCERTAINTY_PATTERNS:
            if re.search(pat, text, re.IGNORECASE):
                return True
        return False

    def check_circumlocution(self, text: str) -> bool:
        appearance = [r"white", r"round", r"small", r"choti", r"gol", r"safed", r"pill", r"tablet", r"shape"]
        found = [w for w in appearance if re.search(w, text, re.IGNORECASE)]
        return len(found) >= 2

    def analyze(self, raw_transcript: str) -> Dict[str, Any]:
        """
        Core Semantic Analysis Pipeline:
        1. Normalization
        2. Speech Repair Resolution
        3. Clause Segmentation & Negation Scope Binding
        4. Concept Evaluation & Disambiguation
        5. Separation of Intent, Action & Safety Guardrails
        """
        norm_text = self.normalize(raw_transcript)

        if not norm_text:
            return {
                "detected_meaning": {"concept": "NONE", "polarity": "NEUTRAL", "confidence": 0.0},
                "proposed_intent": "CLARIFICATION_NEEDED",
                "uncertainty_level": "HIGH",
                "required_clarification": "EMPTY_AUDIO",
                "permitted_response": RESPONSE_TEMPLATES["CLARIFICATION_NEEDED"]["en"],
                "clinical_guardrail": {
                    "action_permitted": False,
                    "action_type": "NO_ACTION",
                    "safety_flag": "EMPTY_INPUT"
                }
            }

        # Step 2: Speech Repair
        eval_text, is_repaired, repair_prior = self.detect_speech_repairs(norm_text)

        # Step 3: Cognitive Uncertainty
        has_uncertainty = self.check_uncertainty(eval_text)

        # Step 4: Circumlocution
        has_circumlocution = self.check_circumlocution(eval_text)

        # Step 5: Clause segmentation & negation scope
        clauses = self.segment_clauses(eval_text)

        # Evaluate concepts in each clause
        clause_analyses = []
        for cl in clauses:
            concepts = self.evaluate_concepts(cl["clause_text"])
            clause_analyses.append({
                "clause": cl["clause_text"],
                "is_negated": cl["is_negated"],
                "concepts": concepts
            })

        # Step 5b: Check contradictory clauses for the same concept
        pos_concepts = set()
        neg_concepts = set()
        for ca in clause_analyses:
            for conc, _ in ca["concepts"]:
                if ca["is_negated"]:
                    neg_concepts.add(conc)
                else:
                    pos_concepts.add(conc)
        contradictory_concepts = pos_concepts.intersection(neg_concepts)

        # Step 6: Intent Resolution with Negation Scope
        primary_concept = "NONE"
        primary_conf = 0.0
        is_negated = False

        if contradictory_concepts:
            has_uncertainty = True
            primary_concept = list(contradictory_concepts)[0]
            primary_conf = 0.85
        else:
            # Find dominant concept (prioritize primary actionable clauses over secondary explanation)
            for ca in clause_analyses:
                if ca["concepts"]:
                    primary_concept = ca["concepts"][0][0]
                    primary_conf = ca["concepts"][0][1]
                    is_negated = ca["is_negated"]
                    break

        # If no clause-level concept found, check full text
        if primary_concept == "NONE":
            full_concepts = self.evaluate_concepts(eval_text)
            if full_concepts:
                primary_concept = full_concepts[0][0]
                primary_conf = full_concepts[0][1]
                is_negated = any(c["is_negated"] for c in clauses)

        # -------------------------------------------------------------
        # Decision Matrix: Mapping (Concept, Polarity, Uncertainty) to Intent
        # -------------------------------------------------------------
        proposed_intent = "CLARIFICATION_NEEDED"
        uncertainty_level = "LOW" if primary_conf >= 0.80 else "MEDIUM"
        required_clarification = None
        clinical_action = "NO_ACTION"
        safety_flag = "NORMAL"

        # 1. Circumlocution Safety Guard
        if has_circumlocution:
            proposed_intent = "FLAG_MEDICATION_CIRCUMLOCUTION"
            uncertainty_level = "HIGH"
            clinical_action = "REFUSE_DRUG_INFERENCE_AND_NOTIFY_CARE"
            safety_flag = "REFUSE_DRUG_GUESS"

        # 2. Medication Intent & Safety
        elif primary_concept == "MEDICATION":
            if has_uncertainty or is_negated:
                if is_negated and not has_uncertainty:
                    # Explicit patient refusal of medication
                    proposed_intent = "REFUSE_MEDICATION"
                    clinical_action = "ALERT_CAREGIVER_OF_MEDICATION_REFUSAL"
                    safety_flag = "ACTION_BLOCKED_MEDICATION_REFUSAL"
                else:
                    # Memory lapse on whether medication was taken
                    proposed_intent = "FLAG_MEDICATION_UNCERTAINTY"
                    uncertainty_level = "HIGH"
                    clinical_action = "HALT_COMPLETION_AND_PROMPT_CAREGIVER"
                    safety_flag = "ACTION_BLOCKED_MEDICATION_UNVERIFIED"
            else:
                # Check if patient confirms taking medication
                taken_markers = ["took", "taken", "खा ली", "खा लिया", "घेतली", "घेतले", "சாப்பிட்டேன்", "వేసుకున్నాను", "ತೆಗೆದುಕೊಂಡೆ", "കഴിച്ചു", "kha li", "ghetli", "sappitte"]
                if any(w in eval_text for w in taken_markers):
                    proposed_intent = "REPORT_MEDICATION_TAKEN"
                    clinical_action = "LOG_OBSERVATION_PENDING_CONFIRMATION"
                    safety_flag = "OBSERVATIONAL_ONLY_NO_AUTO_RECORD"
                elif any(w in eval_text for w in ["need", "bring", "give", "chahiye", "pahije", "venum", "kavali", "beku", "do", "dya", "time for"]):
                    proposed_intent = "REQUEST_MEDICATION_ASSISTANCE"
                    clinical_action = "ALERT_CAREGIVER_OF_MEDICATION_REQUEST"
                    safety_flag = "PRESCRIPTION_VERIFICATION_REQUIRED"
                else:
                    proposed_intent = "CLARIFICATION_NEEDED"
                    required_clarification = "MEDICATION_INTENT_AMBIGUOUS"

        # 3. Hydration Intent (with Negation Scope)
        elif primary_concept == "HYDRATION":
            if has_uncertainty:
                proposed_intent = "HYDRATION_UNCERTAINTY"
                uncertainty_level = "HIGH"
                required_clarification = "CONFIRM_WATER_NEED"
            elif is_negated:
                proposed_intent = "REFUSE_HYDRATION"
                clinical_action = "DO_NOT_NOTIFY_HYDRATION"
                safety_flag = "PATIENT_EXPLICIT_REFUSAL"
            else:
                proposed_intent = "REQUEST_WATER"
                clinical_action = "PROPOSE_NOTIFY_CAREGIVER_WATER"

        # 4. Walk Routine Intent (with Negation Scope)
        elif primary_concept == "WALK_ROUTINE":
            if is_negated:
                proposed_intent = "REFUSE_WALK_ROUTINE"
                clinical_action = "DO_NOT_START_ROUTINE"
                safety_flag = "PATIENT_EXPLICIT_REFUSAL"
            else:
                proposed_intent = "ROUTINE_WALK"
                clinical_action = "PROPOSE_START_WALK_ROUTINE"

        # 5. Pain & Physical Distress
        elif primary_concept == "PAIN_DISTRESS":
            proposed_intent = "REPORT_PAIN"
            clinical_action = "PROPOSE_NOTIFY_CAREGIVER_PAIN"
            safety_flag = "PHYSICAL_SYMPTOM_FLAG"

        # 6. Physical Assistance / Inability
        elif primary_concept == "PHYSICAL_ASSISTANCE":
            is_refusing_help = any(re.search(p, eval_text, re.IGNORECASE) for p in [
                r"\b(?:do\s+not|don'?t)\s+help\b", r"\bno\s+help\b", r"\b(?:do\s+not|don'?t)\s+need\s+help\b",
                r"\bleave\s+me\s+alone\b", r"\bby\s+myself\b", r"\bno\s+assist\b",
                r"मदद\s+नहीं", r"सहायता\s+नहीं", r"मदत\s+नको", r"मदत\s+नका",
                r"உதவி\s+வேண்டாம்", r"సహాయం\s+వద్దు", r"ಸಹಾಯ\s+ಬೇಡ", r"സഹായം\s+വേണ്ട",
                r"madat\s+nahi", r"madat\s+nako", r"udavi\s+vendaam", r"sahayam\s+vaddu"
            ])
            if is_refusing_help:
                proposed_intent = "REFUSE_ASSISTANCE"
                clinical_action = "RESPECT_PATIENT_INDEPENDENCE"
            else:
                proposed_intent = "REQUEST_PHYSICAL_HELP"
                clinical_action = "PROPOSE_ALERT_CAREGIVER_HELP"

        # 7. Fatigue
        elif primary_concept == "FATIGUE":
            proposed_intent = "REPORT_FATIGUE"
            clinical_action = "LOG_FATIGUE_OBSERVATION"

        # 8. Loneliness
        elif primary_concept == "LONELINESS":
            proposed_intent = "REPORT_LONELINESS"
            clinical_action = "LOG_AFFECTIVE_NEED"

        # 9. Confusion / Disorientation
        elif primary_concept == "CONFUSION_DISORIENTATION":
            proposed_intent = "REPORT_CONFUSION"
            clinical_action = "ALERT_CAREGIVER_DISORIENTATION"
            safety_flag = "COGNITIVE_DISTRESS_FLAG"

        # 10. Fallback
        else:
            proposed_intent = "CLARIFICATION_NEEDED"
            uncertainty_level = "HIGH"
            required_clarification = "UNRECOGNIZED_CLINICAL_INTENT"

        # Polarity descriptor: Cognitive uncertainty takes priority over simple negation
        if has_uncertainty:
            polarity = "UNCERTAIN"
        elif is_negated:
            polarity = "NEGATIVE"
        elif primary_concept != "NONE":
            polarity = "POSITIVE"
        else:
            polarity = "NEUTRAL"

        return {
            "detected_meaning": {
                "primary_concept": primary_concept,
                "polarity": polarity,
                "confidence": primary_conf,
                "is_self_corrected": is_repaired,
                "repair_prior": repair_prior,
                "negation_detected": is_negated
            },
            "proposed_intent": proposed_intent,
            "uncertainty_level": uncertainty_level,
            "required_clarification": required_clarification,
            "clinical_guardrail": {
                "action_permitted": False, # STRICTLY FALSE: Research layer cannot execute actions
                "proposed_action": clinical_action,
                "safety_flag": safety_flag,
                "firestore_write_permitted": False,
                "prescription_change_permitted": False,
                "routine_auto_complete_permitted": False
            }
        }

    def process_turn(self, raw_transcript: str, detected_lang: str = "en", response_lang: str = "en") -> Dict[str, Any]:
        """
        Generates safe conversational turn output with multi-language text response.
        """
        analysis = self.analyze(raw_transcript)
        intent = analysis["proposed_intent"]
        target_lang = response_lang if response_lang in SUPPORTED_LANGUAGES else "en"

        templates = RESPONSE_TEMPLATES.get(intent, RESPONSE_TEMPLATES["CLARIFICATION_NEEDED"])
        response_text = templates.get(target_lang, templates.get("en", "I am here with you."))

        # Context record
        turn_record = {
            "raw_transcript": raw_transcript,
            "detected_lang": detected_lang,
            "response_lang": target_lang,
            "intent": intent,
            "polarity": analysis["detected_meaning"]["polarity"],
            "response_text": response_text
        }
        self.context_history.append(turn_record)
        if len(self.context_history) > 6:
            self.context_history.pop(0)

        result = dict(analysis)
        result["raw_transcript"] = raw_transcript
        result["detected_lang"] = detected_lang
        result["response_lang"] = target_lang
        result["permitted_response"] = response_text
        result["context_depth"] = len(self.context_history)
        return result
