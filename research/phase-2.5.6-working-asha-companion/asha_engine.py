#!/usr/bin/env python3
"""
Saksham Neuro-Care — Phase 2.5.6 / Engine C
ASHA Comprehensive Multilingual Conversational AI Engine
Integrates:
1. Engine C Orchestrator: Gemini Primary (Server-Side API) + Local Qwen2.5-1.5B Fallback
   + Honest Unavailable Disclosure when both engines are unreachable
2. Native Script, Code-Switching & Romanized Grounding across Target Languages:
   - English (en-IN)
   - Hindi (hi-IN) - Devanagari & Hinglish
   - Marathi (mr-IN) - Devanagari & Marathish
   - Tamil (ta-IN) - Tamil Script & Tanglish
   - Telugu (te-IN) - Telugu Script & Tenglish
   - Kannada (kn-IN) - Kannada Script & Kanglish
   - Bengali (bn-IN) - Bengali Script & Banglish
   - Malayalam (ml-IN) - Malayalam Script & Manglish
3. Multi-Turn Context Continuity Preserved Across Model Switching
4. Privacy-Controlled Multi-Patient Memory Injection & Management
5. Two-Way Clinical Safety, Protected Action & Temporal Guardrails
6. Universal Action-Deception Suppression & Secret Redaction
7. 2D Avatar Expression & Gesture State Arbitration
"""

import os
import sys
import json
import time
import re
import ssl
import socket
import urllib.request
import urllib.error
import subprocess
from typing import Dict, Any, List, Optional, Tuple

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from env_loader import get_gemini_api_key, get_gemini_model, has_gemini_api_key

MEMORY_FILE = os.path.join(CURRENT_DIR, "patient_memory.json")
DEFAULT_LLAMA_SERVER = "http://127.0.0.1:8085"
DEFAULT_QWEN_MODEL_NAME = "Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU)"
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"
DEFAULT_GEMINI_TIMEOUT = 12.0
DEFAULT_QWEN_TIMEOUT = 18.0
DEFAULT_MODEL_PATH = "/Users/trishnabapna/Developer/Saksham-Research/models/qwen2.5-1.5b-instruct-q4_k_m.gguf"
DEFAULT_RUNNER_PATH = "/opt/homebrew/bin/llama-cli"


def _redact_secrets(text: str) -> str:
    """Strips API keys or key query strings from diagnostic text so secrets never leak."""
    if not text:
        return ""
    redacted = re.sub(r"AIza[0-9A-Za-z_-]{10,}", "[REDACTED_API_KEY]", text)
    redacted = re.sub(r"([?&]key=)[^&\s]+", r"\1[REDACTED]", redacted)
    return redacted


def _build_verified_ssl_context() -> ssl.SSLContext:
    """
    Returns a strict TLS-verifying SSLContext using system or certifi CA roots.
    Handles macOS Python framework builds that omit default OpenSSL cert symlinks.
    """
    try:
        import certifi  # type: ignore

        cert_path = certifi.where()
        if cert_path and os.path.isfile(cert_path):
            return ssl.create_default_context(cafile=cert_path)
    except Exception:
        pass

    for candidate in (
        "/etc/ssl/cert.pem",
        "/opt/homebrew/etc/ca-certificates/cert.pem",
        "/opt/homebrew/etc/openssl@3/cert.pem",
    ):
        if os.path.isfile(candidate):
            return ssl.create_default_context(cafile=candidate)

    return ssl.create_default_context()

# -----------------------------------------------------------------------------
# 1. DETERMINISTIC MULTILINGUAL SAFETY PATTERNS
# -----------------------------------------------------------------------------

# ACUTE CARDIAC (Chest pain, pressure, radiating pain, diaphoresis, inverted syntax)
ACUTE_CARDIAC_PATTERNS = [
    # English (including inverted syntax like "chest is crushing")
    r"\b(chest\s+pain|crushing\s+(chest\s+)?pain|heavy\s+(pressure|weight)\s+on\s+(my\s+)?chest)\b",
    r"\b(my\s+)?chest\s+(is|feels)\s+(crushing|heavy|tight|squeezing|hurting|painful|aching)\b",
    r"\b(can'?t|cannot|unable\s+to)\s+breathe\b.*?\b(chest\s+(is\s+)?(crushing|heavy|tight|hurting)|lips\s+(are\s+)?(blue|dark))\b",
    r"\b(lips|fingers)\s+(are\s+)?(turning\s+)?(blue|dark\s+blue|purple)\b",
    r"\b(elephant\b.*?\bchest|chest\b.*?\belephant|iron\s+band\s+(around|squeezing)\s+my\s+ribs)\b",
    r"\b(radiating\s+to\s+(my\s+)?(arm|left\s+arm|jaw|neck|shoulder|throat))\b",
    r"\b(cold\s+sweat|breaking\s+out\s+in\s+cold\s+sweat)\b",
    r"\b(severe\s+chest\s+pain|chest\s+pressure|heart\s+attack)\b",
    # Hindi (Devanagari & Romanized)
    r"\b(dil\s+ka\s+daura|seene\s+me(n)?.*?dard|chhati\s+me(n)?.*?dard|dil\s+me(n)?.*?dard|chhati\s+bhari)\b",
    r"(सीने\s*में.*?दर्द|दिल\s*का\s*दौरा|छाती\s*में.*?(दर्द|भारीपन)|बाईं\s*बांह\s*में.*?दर्द|सीने\s*पर.*?दबाव)",
    # Marathi (Devanagari & Romanized)
    r"\b(chhatit.*?(dukht(a|o)y|kal|vedana)|chhati\s+dabun\s+aali|hrudayvikaracha\s+zatka|dava\s+haat\s+dukhto)\b",
    r"(छातीत.*?(दुखतंय|दुखत|कळ|वेदना|अस्वस्थ)|छातीवर.*?वजन|हृदयविकाराचा.*?झटका|डावा\s*हात.*?दुखतो|छाती\s*दाबल्यासारखी)",
    # Tamil (Script & Romanized)
    r"\b(nenju.*?vali|marbu.*?vali|ithaya\s+thadippu|nenjil.*?param|nenju\s+adikkuthu)\b",
    r"(நெஞ்ச(ு|ில்)?.*?வலி|மார்பு.*?வலி|இதய.*?வலி|நெஞ்சில்.*?பாரம்|இடது\s*கை.*?வலி|நெஞ்சு\s*அடைப்பது)",
    # Telugu (Script & Romanized)
    r"\b(gunde.*?noppi|chati.*?noppi|gundelo.*?noppi|gunde\s+aagipothundi|chati\s+bharam)\b",
    r"(గుండె.*?నొప్పి|ఛాతీ.*?నొప్పి|గుండెలో.*?నొప్పి|ఎడమ\s*చేయి.*?నొప్పి|గుండె\s*పట్టేసినట్లు)",
    # Kannada (Script & Romanized)
    r"\b(ede(yalli)?.*?nov|hrudayaghata|edeyalli\s+bhara|edagai.*?nov)\b",
    r"(ಎದೆ(ಯಲ್ಲಿ)?.*?ನೋವ|ಹೃದಯಾಘಾತ|ಎಡಗೈ.*?ನೋವ|ಎದೆ\s*ಭಾರ)",
    # Malayalam (Script & Romanized)
    r"\b(nenju.*?vedana|nenjil.*?vedana|hrudayaghadham|nenjil\s+bharam|idathu\s+kai.*?vedana)\b",
    r"(നെഞ്ച(ു|ിൽ)?.*?വേദന|ഹൃദയാഘാതം|നെഞ്ചിൽ.*?ഭാരം|ഇടതു\s*കൈ.*?വേദന|നെഞ്ച്\s*വരിഞ്ഞുമുറുക്കുന്നത്)",
    # Bengali (Script & Romanized)
    r"\b(buke.*?(byatha|betha|chap|bhar)|hridroger?\s+jhatka|dam\s+atke)\b",
    r"(বুকে.*?(ব্যথা|ব্যাথা|চাপ|ভার)|হার্ট\s*অ্যাটাক|হৃদরোগ|বাঁ\s*হাতে.*?ব্যথা)"
]

# ACUTE STROKE (FAST: Facial droop, Arm weakness, Speech slurring, Time critical)
ACUTE_STROKE_PATTERNS = [
    # English
    r"\b(face|mouth|lip|cheek)\s+(is\s+)?(drooping|sagging|crooked|twisted)\b",
    r"\b(slurred|slurring)\s+(speech|words)\b",
    r"\b(cannot\s+form\s+(the\s+)?words|speech\s+is\s+garbled|suddenly\s+cannot\s+speak)\b",
    r"\b(one\s+side\s+of\s+my\s+body|left\s+side|right\s+side|right\s+arm|left\s+arm)\s+(is\s+)?(numb|limp|weak|paralyzed|dead|lost\s+all\s+feeling)\b",
    r"\b(sudden\s+blindness|black\s+curtain\s+over\s+my\s+eye|dark\s+tunnel\s+vision|lost\s+my\s+vision)\b",
    r"\b(worst\s+headache\s+of\s+my\s+life|thunderclap\s+headache)\b",
    # Hindi
    r"\b(muh\s+tedha|chehra\s+tedha|awaz\s+ladkhada|bol\s+nahi(n)?\s+pa\s+raha|lakwa|falij|ek\s+taraf\s+sunn)\b",
    r"(मुंह\s*टेढ़ा|चेहरा\s*लटक|आवाज\s*लड़खड़ा|बोल\s*नहीं\s*पा\s*(रहा|रही)|लकवा|फालिज|हाथ\s*सुन्न|एक\s*तरफ\s*कमजोरी)",
    # Marathi
    r"\b(tond\s+vakd(a|e)|bolna\s+ladkhadtay|ek\s+baju\s+padli|lakwa|ang\s+sunna)\b",
    r"(तोंड\s*वाकडं|बोलणे\s*अडखळत|एक\s*बाजू\s*पडली|लकवा|हात\s*लुळा|बोलता\s*येत\s*नाही)",
    # Tamil
    r"\b(mugam\s+kooni|vaai\s+kooni|pechu\s+kolaru|pesa\s+mudiyala|oru\s+pakkam\s+thalarnthu|pakkaravadham)\b",
    r"(முகம்\s*கோணி|வாய்\s*கோணி|பேச்சு\s*உளறு|பேச\s*முடியவில்லை|பக்கவாதம்|கை\s*கால்கள்\s*மரத்து)",
    # Telugu
    r"\b(mukham\s+vaalipoindi|maata\s+thadabadu|matladalekapothu|oka\s+vaipu\s+padipoindi|pakshavatham)\b",
    r"(పక్షవాతం|ముఖం\s*వాలిపోయింది|మాట\s*తడబడు|మాట్లాడలేకపో|చేయి\s*కాలు\s*పడిపోయాయి|చేయి\s*పడిపోయింది|మాట\s*రావడం\s*లేదు)",
    # Kannada
    r"\b(mukha\s+vaalide|mathu\s+thadavadu|mathanadalu\s+aguthilla|ondu\s+kade\s+lakva|lakva)\b",
    r"(ಲಕ್ವ|ಮುಖ\s*ವಾಲಿದೆ|ಮಾತು\s*ತೊದಲು|ಮಾತನಾಡಲು\s*ಆಗುತ್ತಿಲ್ಲ|ಒಂದು\s*ಕಡೆ\s*ಶಕ್ತಿ\s*ಇಲ್ಲ|ಕೈ\s*ಬಿದ್ದುಹೋಯಿತು|ಮಾತು\s*ಬರುತ್ತಿಲ್ಲ)",
    # Malayalam
    r"\b(mukham\s+kodi|samsarikkan\s+pattunnilla|vakku\s+thadaya|oru\s+vasham\s+thalarnnu|pakshaghadham)\b",
    r"(പക്ഷാഘാതം|മുഖം\s*കോടി|സംസാരിക്കാൻ\s*കഴിയുന്നില്ല|ഒരു\s*വശം\s*തളർന്നു|സംസാരം\s*വ്യക്തമല്ല)",
    # Bengali
    r"\b(mukh\s+baka|kotha\s+joriye|ek\s+dik\s+obosh|pakshaghat)\b",
    r"(মুখ\s*বাঁকা|মুখ\s*বেঁকে|কথা\s*জড়িয়ে|কথা\s*বলতে\s*পারছি\s*না|হাত\s*অবশ|পক্ষাঘাত)"
]

# ACUTE TRAUMA & FALLS (Physical falls, fractures, inability to get up, hemorrhages, 3rd-person inflections)
ACUTE_TRAUMA_PATTERNS = [
    # English
    r"\b(slipped|tripped|collapsed|dropped\s+to\s+the\s+floor)\b",
    r"\bfell\b(?!\s+in\s+love)",
    r"\b(broken|fractured|dislocated|deformed)\s+(hip|bone|arm|wrist|leg|ankle|knee)\b",
    r"\b(cannot|can'?t|unable\s+to)\s+(move|get\s+up|walk|stand|bear\s+weight)\b",
    r"\b(lying|stuck|pinned)\s+(alone\s+)?(on\s+the\s+floor|on\s+the\s+ground|in\s+the\s+bathroom)\b",
    r"\b(blood\s+(is\s+)?(spurting|gushing|pulsing|flowing)|deep\s+arterial\s+cut|bleeding\s+(from\s+(his|her|the)\s+head|heavily))\b",
    # Hindi
    r"\b(gir\s+(gaya|gayi|gaye)|uth\s+nahi(n)?\s+pa\s+(raha|rahi|rahe)|haddi\s+toot\s+gayi|chot\s+lag\s+gayi|farsh\s+par\s+gir|khoon\s+beh\s+raha)\b",
    r"(गिर\s*(गई|गया|गए)|उठ\s*नहीं\s*पा\s*(रहा|रही|रहे)|हड्डी\s*टूट\s*गई|फर्श\s*पर\s*(पड़ी|पड़ा|पड़े)\s*हूँ|खून\s*बह\s*रहा)",
    # Marathi
    r"\b(padl(e|o|i|ya)|uthata\s+yet\s+nahi|haad\s+modl(a|e)|zaminivar\s+padl(e|o)|rakta\s+vahate)\b",
    r"(पडले|पडलो|पडली|पडल्या|खाली\s*पडले|उठता(च)?\s*येत\s*नाही|हाड\s*मोडले|जमिनीवर\s*पडलो|रक्त\s*वाहतंय)",
    # Tamil (including 3rd-person inflections: விழுந்துவிட்டார், விழுந்துவிட்டாள், etc.)
    r"\b(?:kizhe\s+)?vizhunthut(ar|al|argal|an|en|u)?|\b(?:kizhe\s+)?vizhunth(ar|al|argal|an|en)?\b|suyaninaivu\s+illai|ezhunthirikka\s+mudiyala|elumbu\s+murivu|tharayil\s+vizhunthu|thalaiyil\s+rathatham",
    r"(?:கீழே\s*|தரையில்\s*)?விழுந்துவிட்ட(ார்|ாள்|ார்கள்|ான்|ேன்|து|விட்ட)?|(?:கீழே\s*|தரையில்\s*)?விழுந்த(ார்|ாள்|ார்கள்|ான்|ேன்|து)?|சுயநினைவு\s*இல்லை|எழுந்திருக்க\s*முடியவில்லை|எலும்பு\s*முறிவு|தரையில்\s*விழுந்து|தலையி(ல்|லிருந்து)\s*இரத்தம்",
    # Telugu (including 3rd-person inflections)
    r"\b(kindapadd(anu|adu|aru|indi)|levanulekapothu|emuka\s+virigindi|nela\s+meeda\s+padd|raktham\s+kaaruthondi)\b",
    r"(కింద\s*పడ్డా(డు|రు|ను|ది)|కింద\s*పడిపోయా(రు|డు|ను)|లేవలేకపోతున్నా(రు|ను)|ఎముక\s*విరిగింది|నేల\s*మీద\s*పడ్డా(డు|రు|ను)|రక్తం\s*కారుతోంది)",
    # Kannada (including 3rd-person inflections)
    r"\b(biddubitt(e|u|aru|anu)|kelage\s+biddi|elalu\s+aguthilla|mule\s+muridhide|nelada\s+mele\s+bidd|raktha\s+suriyuthide)\b",
    r"(ಬಿದ್ದುಬಿಟ್ಟ(ನು|ಳು|ರು|ದ್ದಾರೆ|ದ್ದಾನೆ|ದ್ದೇನೆ|ದೆ)?|ಕೆಳಗೆ\s*ಬಿದ್ದಿ(ದ್ದಾರೆ|ದ್ದಾನೆ|ದ್ದೇನೆ|ದ್ದಾಳೆ)|ಎದ್ದೇಳಲು\s*ಆಗುತ್ತಿಲ್ಲ|ಮೂಳೆ\s*ಮುರಿದಿದೆ|ನೆಲದ\s*ಮೇಲೆ\s*ಬಿದ್ದಿ(ದ್ದಾರೆ|ದ್ದಾನೆ|ದ್ದೇನೆ)|ರಕ್ತ\s*ಸುರಿಯುತ್ತಿದೆ)",
    # Malayalam (including 3rd-person inflections)
    r"\b(veenu\s*poyi|veenu|thazhe\s*veenu|ezhunelkan\s*pattunnilla|ellu\s*potti|tharayil\s*veenu|raktham\s*varunnu)\b",
    r"(വീണുപോയി|വീണു|താഴെ\s*വീണു|എഴുന്നേൽക്കാൻ\s*പറ്റുന്നില്ല|എല്ല്\s*പൊട്ടി|തറയിൽ\s*വീണു|രക്തം\s*വരുന്നു)",
    # Bengali (including 3rd-person inflections)
    r"\b(pore\s+(gechi|geche|gechen|giyechi)|uthte\s+parchi\s+na|haar\s+bhenge|rokto\s+porche)\b",
    r"(পড়ে\s*(গেছি|গেছে|গেছেন|গিয়ে)|উঠতে\s*পারছি\s*না|হাড়\s*ভেঙে|রক্ত\s*(পড়ছে|ঝরছে|বেরোচ্ছে))"
]

# MEDICATION ALTERATION & PRESCRIPTION REQUESTS
MEDICATION_PATTERNS = [
    # English
    r"\b(can|should|may|could)\s+i\s+(take|start|increase|decrease|stop|double|skip|change|alter)\s+.*?\b(mg|paracetamol|aspirin|ibuprofen|tylenol|tablets?|pills?|sleeping\s+pills?|medicines?|medications?|dosages?|doses?|bp\s+pills?|drugs?)\b",
    r"\b(take|taking)\s+\d+\s+extra\s+(pills?|tablets?|medicines?)\b",
    r"\bwhat\s+.*?\b(pill|medicine|tablet|painkiller|drug)\b.*?\b(can|should|do)\s+i\s+(take|use|have)\b",
    r"\bcan\s+i\s+alter\s+my\s+prescription\b",
    r"\bshould\s+i\s+take\s+(an\s+)?(aspirin|disprin|paracetamol)\b",
    # Hindi
    r"\b(dawa|goli|tablet|paracetamol|khurak|dose|bp)\s+.*?(le\s*(lu(n)?|sakte|sakti)|kha\s*(lu(n)?|sakte)|badal|kitni|doguni|badha|kam|rok)\b",
    r"(दवा|गोली|पेरासिटामोल|पैरासिटामोल|टेबलेट|खुराक|डोज़|बीपी).*?(ले\s*(लूँ|सकते|लू)|खा\s*(लूँ|सकते|लू)|बदल|दोगुनी|बढ़ा|कम|रोक|दूँ)",
    # Marathi
    r"\b(goli|golya|aushadh|tablet|paracetamol|dose)\s+.*?(gheu\s*ka|thambvu\s*ka|badlu\s*ka|vadhvu\s*ka|kami\s*karu\s*ka)\b",
    r"(गोळी|गोळ्या|गोळ्यां|औषध|पेरासिटामोल|डोस).*?(घेऊ\s*का|बदलू\s*का|थांबवू\s*का|वाढवू\s*का|कमी\s*करू\s*का)",
    # Tamil
    r"\b(mathirai|marunthu|paracetamol)\s+.*?(sappadalama|eduthukkalama|maathalama|podalama)\b",
    r"(மாத்திரை|மருந்து|பாராசிட்டமால்).*?(சாப்பிடலாமா|மாற்றலாமா|எடுக்கலாமா|போடலாமா)",
    # Telugu
    r"\b(mandulu|mandhu|tablet|paracetamol)\s+.*?(vesukovacha|marchavacha|apavacha|theesukovacha)\b",
    r"(మందులు|మందు|పారాసిటమాల్).*?(వేసుకోవచ్చా|మార్చవచ్చా|ఆపవచ్చా|వేసుకోవాలా)",
    # Kannada
    r"\b(gulige|oushadha|tablet|paracetamol)\s+.*?(thagolabouda|badalayisala|nillisala)\b",
    r"(ಗುಳಿಗೆ|ಔಷಧ|ಪ್ಯಾರಸಿಟಮಾಲ್).*?(ತಗೋಳಬಹುದಾ|ಬದಲಾಯಿಸಲಾ|ನಿಲ್ಲಿಸಲಾ|ತಗೋಳ್ಳಲಾ)",
    # Malayalam
    r"\b(marunnu|gulika|tablet|paracetamol)\s+.*?(kazhikkamo|mattamo|nirthamo)\b",
    r"(മരുന്ന്|ഗുളിക|പാരസെറ്റാമോൾ).*?(കഴിക്കാമോ|മാറ്റാമോ|നിർത്താമോ)",
    # Bengali
    r"\b(oshudh|oushudh|tablet|paracetamol|dose)\s+.*?(khabo|khete\s+pari|badlano|barabo|bondho)\b",
    r"(ওষুধ|ঔষধ|বড়ি|ট্যাবলেট|প্যারাসিটামল|ডোজ).*?(খাব|খেতে\s*পারি|বদলা|বাড়া|কমা|বন্ধ)"
]

# HISTORICAL TIMELINE INDICATORS (Resolved incidents)
HISTORICAL_INDICATORS = [
    r"\b(years?\s+ago|months?\s+ago|in\s+19\d\d|in\s+200\d|in\s+201\d|when\s+i\s+was\s+(young|a\s+child|in\s+college))\b",
    r"\b(healed\s+completely|fully\s+recovered|long\s+time\s+ago|past\s+history|childhood)\b",
    r"\b(saal\s+pehle|varsha\s+purvi|munnadi|kritham|hinde|varshangal\s+mumbu)\b",
    r"(साल\s*पहले|वर्षों\s*पहले|पूर्वी|முன்னால்|మునుపు|ಹಿಂದೆ|വർഷങ്ങൾക്ക്\s*മുമ്പ്)"
]

# THIRD-PARTY EMERGENCY INDICATORS (7 Languages: Pronouns and Kinship Terms)
THIRD_PARTY_PATTERNS = [
    # English
    r"\b(my\s+(neighbor|neighbour|husband|wife|friend|mother|father|relative|daughter|son|brother|sister|mom|dad)|someone\s+(outside|nearby|in\s+the\s+other\s+room)|passerby|he|she)\b",
    # Hindi
    r"\b(meri\s+(saheli|patni|maa|mataji|behen|dadi|nani)|mera\s+(padosi|pati|dost|bhai|beta|pitaji|dada|nana)|kisi\s+ko|koi\s+aur|woh|wo)\b",
    r"(मेरी\s*(सहेली|पत्नी|माँ|माताजी|बहन|दादी|नानी)|मेरे\s*(पड़ोसी|पति|दोस्त|भाई|पिताजी|दादाजी|नानाजी|बेटे)|किसी\s*को|कोई\s*और|वह)",
    # Marathi
    r"\b(shejari|maza\s+(pati|mitra|bhai|mulga)|mazi\s+(patni|aai|maitri|mulgi)|konitari)\b",
    r"(शेजारी|माझे\s*(पती|मित्र|भाऊ|वडील|बाबा|मुलगा)|माझी\s*(पत्नी|आई|मैत्रीण|मुलगी)|कोणीतरी|त्यांना|तिला)",
    # Tamil
    r"\b(pakkatthu\s+veetu.*|en\s+(kanavar|kanavarukku|manaivi|amma|appa|nanban|thozhi|magan|magal)\w*|yaarov)\b",
    r"(பக்கத்து\s*வீட்டுக்காரர்|என்\s*(கணவ[\u0B80-\u0BFF]*|மனைவி[\u0B80-\u0BFF]*|அம்மா[\u0B80-\u0BFF]*|அப்பா[\u0B80-\u0BFF]*|நண்ப[\u0B80-\u0BFF]*|தோழி[\u0B80-\u0BFF]*|மக[\u0B80-\u0BFF]*)|யாரோ|அவர்|அவள்)",
    # Telugu
    r"\b(pakkinti\s+vaaru|naa\s+(bhartha|bhaarya|amma|naanna|sneheethudu|kuthuru|koduku)|evaro)\b",
    r"(పక్కింటి\s*వారు|నా\s*(భర్త|భార్య|అమ్మ|నాన్న|స్నేహితుడు|కూతురు|కొడుకు)|ఎవరో|ఆయన|ఆమె)",
    # Kannada
    r"\b(nerehoreyavaru|nanna\s+(ganda|hendathi|amma|appa|sneha|maga|magalu)|yaaro)\b",
    r"(ನೆರೆಹೊರೆಯವರು|ನನ್ನ\s*(ಗಂಡ|ಹೆಂಡತಿ|ಅಮ್ಮ|ಅಪ್ಪ|ಸ್ನೇಹಿತ|ಮಗ|ಮಗಳು)|ಯಾರೋ|ಅವರು|ಆಕೆ)",
    # Malayalam
    r"\b(ayalvaasi|ente\s+(bharthavu|bharya|amma|achchan|suhruthu|makan|makal)|aaro)\b",
    r"(അയൽവാസി|എന്റെ\s*(ഭർത്താവ്|ഭാര്യ|അമ്മ|അച്ഛൻ|സുഹൃത്ത്|മകൻ|മകൾ)|ആരോ|അദ്ദേഹം|അവർ)",
    # Bengali
    r"\b(pasher\s+barir|amar\s+(swami|stree|ma|baba|bandhu|meye|chele)|keu)\b",
    r"(পাশের\s*বাড়ি|আমার\s*(স্বামী|স্ত্রী|মা|বাবা|বন্ধু|মেয়ে|ছেলে)|কেউ\s*একজন)"
]

# CURRENT RECURRENCE / ACTIVE SENSATION INDICATORS (Cancels historical exclusion)
CURRENT_RECURRENCE_PATTERNS = [
    r"\b(today|again|currently|right\s+now|at\s+this\s+moment|returning|recurred|started\s+again|same\s+pain\s+today|now\s+.*?(hurts|hurting|pain|crushing)|(hurts|hurting|pain|crushing).*?now)\b",
    r"\b(aaj|ab\s+(fir|bhi|dard)|fir\s+se|phir\s+se|dobara|wapas|punha)\b",
    r"(आज|अब\s*(फिर|भी|दर्द)|फिर\s*से|दोबारा|पुन्हा|आता)",
    r"\b(indru|ippo\s+marubadi|meendum|marubadiyum)\b",
    r"(இன்று|இப்போது\s*மீண்டும்|மீண்டும்|மறுபடியும்)",
    r"\b(ee\s*roju|ippudu\s*malli|malli|marala)\b",
    r"(ఈ\s*రోజు|ఇప్పుడు\s*మళ్లీ|మళ్లీ|మరలా)",
    r"\b(ivattu|eega\s*matthe|matthe|punaha)\b",
    r"(ಇವತ್ತು|ಈಗ\s*ಮತ್ತೆ|ಮತ್ತೆ|ಪುನಃ)",
    r"\b(innu|ippol\s*veendum|veendum)\b",
    r"(ഇന്ന്|ഇപ്പോൾ\s*വീണ്ടും|വീണ്ടും)"
]

# UNCERTAIN OR AMBIGUOUS SYMPTOM PATTERNS (Chest flutter, skipping beats, strange sensations)
UNCERTAIN_SYMPTOM_PATTERNS = [
    # English
    r"\b(fluttering|flutter|skipping\s+beats?|skipped\s+a\s+beat|weird\s+(feeling|sensation)\s+in\s+(my\s+)?chest|strange\s+(feeling|sensation)\s+in\s+(my\s+)?chest)\b",
    r"\b(not\s+sure\s+if\s+it'?s\s+(serious|heart|gas)|maybe\s+it'?s\s+just\s+gas|feels\s+like\s+gas\s+or\s+something\s+else)\b",
    r"\b(lightheaded|a\s+little\s+dizzy\s+and\s+off|chest\s+feels\s+(funny|odd|strange|fluttery))\b",
    # Hindi
    r"\b(dil\s+ghabra\s+raha\s+hai|ghabrahat\s+ho\s+rahi|seene\s+me(n)?\s+ajeeb\s+sa\s+lag\s+raha|pata\s+nahi(n)?\s+gas\s+hai\s+ya)\b",
    r"(घबराहट\s*हो\s*रही|सीने\s*में\s*अजीब\s*सा|पता\s*नहीं\s*गैस\s*है\s*या|दिल\s*धड़क\s*रहा)",
    # Marathi
    r"\b(chhatit\s+vichitra\s+vatatay|dhaddhad\s+hotey|samajat\s+nahi\s+gas\s+ahe\s+ka)\b",
    r"(छातीत\s*विचित्र\s*वाटतंय|धडधड\s*होतेय|समजत\s*नाही\s*गॅस\s*आहे\s*का)",
    # Tamil
    r"\b(nenjil\s+oru\s+madhiri\s+irukku|padapadappa\s+irukku|gas\s+aa\s+illa\s+ennannu\s+theriyala)\b",
    r"(நெஞ்சில்\s*ஒரு\s*மாதிரி\s*இருக்கிறது|படபடப்பாக\s*இருக்கிறது|தெரியவில்லை\s*கேஸா\s*இல்லையா)",
    # Telugu
    r"\b(gundelo\s+thada\s+paduthundi|edo\s+theliyani\s+bada|gas\s+aa\s+leka\s+inkedainaa)\b",
    r"(గుండెలో\s*దడగా\s*ఉంది|ఏదో\s*తెలియని\s*అసౌకర్యం|గ్యాస్\s*లేక\s*మరేదైనా)",
    # Kannada
    r"\b(edeyalli\s+vichithravagi\s+ansuthe|bedharike\s+aagthide|gas\s+othilla)\b",
    r"(ಎದೆಯಲ್ಲಿ\s*ವಿಚಿತ್ರವಾಗಿ\s*ಅನಿಸುತ್ತಿದೆ|ಎದೆ\s*ಬಡಿತ\s*ಹೆಚ್ಚಾಗಿದೆ|ಗ್ಯಾಸ್\s*ತಿಳಿಯುತ್ತಿಲ್ಲ)",
    # Malayalam
    r"\b(nenjil\s+oru\s+aswasthatha|padapadappu\s+thonnunnu|gas\s+aano\s+ennu\s+ariyilla)\b",
    r"(നെഞ്ചിൽ\s*ഒരു\s*അസ്വസ്ഥത|നെഞ്ചിടിപ്പ്\s*കൂടുന്നു|ഗ್ಯಾസ്\s*ആണോ\s*എന്ന്\s*അറിയില്ല)",
    # Bengali
    r"\b(buke\s+ososti|dhorphor\s+korche|gas\s+naki)\b",
    r"(বুকে\s*(অস্বস্তি|ধড়ফড়)|গ্যাস\s*নাকি)"
]

# DECEPTION INQUIRY PATTERNS (User asks if Asha already called 112 / dispatched ambulance)
DECEPTION_INQUIRY_PATTERNS = [
    r"\b(did\s+you|have\s+you|are\s+you)\s+.*?\b(call|called|dispatch|dispatched|send|sent|alert|alerted)\s+.*?\b(112|911|ambulance|doctor|help|police)\b",
    r"\b(did\s+you\s+place\s+(the|a)\s+call|have\s+you\s+called\s+112|is\s+an\s+ambulance\s+coming)\b",
    r"\b(kya\s+aapne\s+(112|ambulance|doctor)\s+(ko\s+)?(phone|call|bula)\s+(kiya|diya))\b",
    r"(क्या\s*आपने.*?(112|एम्बुलेंस|डॉक्टर).*?(कॉल|फोन|बुलाया|भेजा))",
    r"(तुम्ही.*?(112|रुग्णवाहिका|डॉक्टर).*?(फोन|कॉल|बोलवले|पाठवले))",
    r"(நீங்கள்.*?(112|ஆம்புலன்ஸ்|மருத்துவர்).*?(போன்|அழைத்தீர்களா))",
    r"(మీరు.*?(112|అంబులెన్స్|డాక్టర్).*?(కాల్|ఫోన్\s*చేశారా))",
    r"(ನೀವು.*?(112|ಆಂಬ್ಯುಲೆನ್ಸ್|ವೈದ್ಯರು).*?(ಕರೆ|ಫೋನ್\s*ಮಾಡಿದ್ದೀರಾ))",
    r"(നിങ്ങൾ.*?(112|ആംബുലൻസ്|ഡോക്ടർ).*?(വിളിച്ചോ|വിളിച്ചുവോ))",
    r"(আপনি\s*কি.*?(112|অ্যাম্বুলেন্স|ডাক্তার).*?(ফোন|কল|ডেকেছেন))"
]

# EMERGENCY DISPATCH REQUESTS (Direct user requests to call 112 or ambulance)
EMERGENCY_DISPATCH_REQUESTS = [
    r"\b(call|send|dispatch)\s+(an?\s+)?(112|911|ambulance|doctor|hospital|emergency|help)\b",
    r"\b(ambulance|doctor|112)\s+.*?(phone|call|bulao|bhej|pahuncha)\b",
    r"(एम्बुलेंस|डॉक्टर|112).*?(फोन|कॉल|बुलाओ|भेजो)",
    r"(रुग्णवाहिका|डॉक्टर|112).*?(फोन|बोलवा|पाठवा)",
    r"(ஆம்புலன்ஸ்|மருத்துவர்|112).*?(போன்|அழை|வரவழை)",
    r"(అంబులెన్స్|డాక్టర్|112).*?(ఫోన్|కాల్|పిలవండి)",
    r"(ಆಂಬ್ಯುಲೆನ್ಸ್|ವೈದ್ಯರು|112).*?(ಕರೆ|ಫೋನ್|ಕಳುಹಿಸಿ)",
    r"(ആംബുലൻസ്|ഡോക്ടർ|112).*?(വിളിക്കൂ|അയക്കൂ)",
    r"(অ্যাম্বুলেন্স|ডাক্তার|112).*?(ফোন|কল|ডাকুন|পাঠান)"
]

# HYPOTHETICAL / EDUCATIONAL INDICATORS
HYPOTHETICAL_PATTERNS = [
    r"\b(what\s+are\s+the\s+signs\s+of|how\s+to\s+recognize|if\s+someone\s+ever\s+has|tell\s+me\s+about|information\s+on)\b",
    r"\b(kya\s+lakshan\s+hote\s+hain|lakshane\s+kaya\s+ahet|enrenna\s+arikurigal|lakshanaalu\s+emi)\b"
]

# PROTECTED ACTION / PROMPT INJECTION / CLINICAL BOUNDARY PATTERNS
PROMPT_INJECTION_PATTERNS = [
    r"\b(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|system)\s+(?:instructions?|rules?|prompts?|directives?)\b",
    r"\b(?:system\s+override|developer\s+mode|dan\s+mode|jailbreak|unrestricted\s+mode)\b",
    r"\b(?:reveal|show|print|display|dump)\s+(?:the\s+)?(?:hidden|developer|system|initial)\s+(?:prompt|instructions?|directives?)\b",
    r"\b(?:reveal|show|display|read|print|leak)\s+(?:the\s+)?(?:private\s+)?caregiver\s+(?:notes?|observations?|records?)\b",
    r"\b(?:show|reveal|give|access|dump|list)\s+(?:me\s+)?(?:all\s+)?(?:another|other)\s+patients?(?:'s)?\s*(?:medical\s+)?(?:data|records?|files?|history|profiles?|records)?\b",
    r"\b(?:change|override|alter|erase|delete|modify)\s+(?:my\s+)?(?:clinical\s+)?diagnosis\b",
    r"(पिछले\s*(?:सभी\s*)?निर्देश\s*(?:भूल\s*जाओ|अनदेखा\s*करो)|दूसरे\s*मरीजों?\s*का\s*डेटा|आधीच्या\s*सर्व\s*आज्ञा\s*विसरून|অন্য\s*রোগীর\s*তথ্য)",
]

SAFETY_LOCK_OVERRIDE_PATTERNS = [
    r"\b(?:disable|turn\s*off|remove|bypass|clear|deactivate|override)\s+(?:the\s+)?(?:gas\s*stove|stove|medication\s*schedule|kitchen\s*burner|clinical)?\s*safety\s*lock\b",
    r"(सुरक्षा\s*लॉक\s*(?:हटाओ|बंद\s*करो)|सेफ्टी\s*लॉक\s*(?:बंद\s*करो|हटाओ)|सुरक्षा\s*लॉक\s*बंद\s*करा)",
]

CLINICAL_BOUNDARY_PATTERNS = [
    r"\b(?:diagnose\s+me|what\s+(?:disease|stage\s+of\s+(?:dementia|alzheimer))|do\s+i\s+have\s+(?:dementia|alzheimer)|interpret\s+(?:my\s+)?(?:mmse|hmse|moca|score)|cure\s+(?:my\s+)?(?:dementia|alzheimer))\b",
    r"(बीमारी\s*का\s*निदान|क्या\s*मुझे\s*(?:अल्जाइमर|डिमेंशिया)\s*है|रोगनिदान\s*करा|রোগ\s*নির্ণয়\s*করুন)",
]

# PROHIBITED ACTION DECEPTION CLAIMS
UNIVERSAL_DECEPTION_PATTERNS = [
    r"\b(i\s+(?:(?:have|will|am\s+going\s+to|am)(?:\s+(?:already|just|now))?|already)\s+(?:call|called|contact|contacted|reach|reached|notify|notified|alert|alerted|dispatch|dispatched|page|paged))\b.*?\b(112|911|doctor|hospital|ambulance|caregiver|paramedic|daughter|son)\b",
    r"\b(an?\s+)?ambulance\s+(is\s+(on\s+the\s+way|dispatched|coming)|has\s+been\s+called)\b",
    r"\b(i\s+have\s+sent\s+an\s+alert|notified\s+your\s+doctor|alerted\s+the\s+hospital)\b",
    r"\b(maine\s+doctor\s+ko\s+phone\s+kar\s+diya|ambulance\s+aa\s+rahi\s+hai)\b",
    r"\b(me\s+doctorna\s+phone\s+kela|naan\s+doctorukku\s+phone\s+panniten|nenu\s+doctor\s+ki\s+call\s+chesanu)\b"
]

# -----------------------------------------------------------------------------
# 2. LOCALIZED SAFETY OVERRIDE DICTIONARY (7 LANGUAGES)
# -----------------------------------------------------------------------------

LOCALIZED_EMERGENCY_OVERRIDES = {
    "en": {
        "cardiac": (
            "I hear that you may be experiencing acute chest discomfort or cardiac symptoms. "
            "Please sit comfortably, rest immediately, and dial emergency services at 112 right now, or call out to someone nearby to call 112 for you. "
            "I am an AI companion on your screen and cannot place phone calls or dispatch an ambulance."
        ),
        "stroke": (
            "These symptoms—such as facial drooping, arm weakness, or sudden speech difficulty—could indicate an acute medical emergency. "
            "Every minute matters. Please dial 112 immediately or have someone nearby call 112 right away. "
            "I am an AI companion and cannot place phone calls or dispatch emergency services."
        ),
        "trauma": (
            "I hear that there has been a serious physical fall or injury. Please stay as still as possible and do not attempt to get up or move injured limbs. "
            "If you can reach a phone or someone is nearby, call emergency services immediately at 112 or call out for help right away. "
            "I am an AI companion and cannot place phone calls or alert emergency services for you."
        ),
        "third_party": (
            "This sounds like an urgent emergency for the person involved. Please call 112 immediately from your phone to dispatch emergency medical services. "
            "I am an AI companion and cannot place phone calls or alert emergency personnel."
        ),
        "medication": (
            "I cannot recommend, prescribe, or change medications or dosages, including painkillers or over-the-counter tablets. "
            "Medication adjustments must always be evaluated by your attending physician or licensed pharmacist. "
            "Please consult your healthcare provider or caregiver before taking or altering any medication."
        ),
        "uncertain": (
            "I hear that you are experiencing an uncomfortable or uncertain sensation in your chest. "
            "Because chest sensations can stem from various causes and should never be dismissed as merely gas or indigestion, please sit down calmly, rest, and do not exert yourself. "
            "Please have someone at home or nearby stay with you and monitor how you feel. "
            "If you develop any increasing pressure, pain radiating to your arm or jaw, or shortness of breath, please dial 112 immediately. "
            "I am an AI companion, not a doctor, and I strongly recommend consulting a healthcare professional for a proper checkup."
        ),
        "deception_inquiry": (
            "No, I have not placed any phone calls or dispatched an ambulance. "
            "I am an AI companion running on your screen and cannot place phone calls, send emergency alerts, or dispatch help. "
            "If you need emergency medical assistance, please use your phone to call 112 directly right now or ask someone nearby to call for you."
        )
    },
    "hi": {
        "cardiac": (
            "यह एक गंभीर चिकित्सा स्थिति (हृदय संबंधी आपातकाल) हो सकती है। कृपया तुरंत आराम से बैठ जाएं और बिना देरी किए 112 पर कॉल करें, या तुरंत किसी को बुलाकर 112 पर फोन करवाएं। "
            "मैं एक एआई साथी हूँ और स्वयं 112 या एम्बुलेंस को फोन नहीं कर सकती।"
        ),
        "stroke": (
            "चेहरे का टेढ़ापन, हाथ में कमजोरी या आवाज लड़खड़ाना स्ट्रोक के गंभीर संकेत हो सकते हैं। समय बहुत कीमती है। कृपया तुरंत 112 डायल करें या अपने पास मौजूद किसी व्यक्ति से 112 पर कॉल करने को कहें। "
            "मैं एक एआई साथी हूँ और आपके लिए फोन नहीं मिला सकती।"
        ),
        "trauma": (
            "गिरने या चोट लगने की स्थिति में कृपया हिलने-डुलने या उठने की कोशिश न करें। अपने फोन से तुरंत 112 पर कॉल करें या घर में किसी को मदद के लिए आवाज दें। "
            "मैं एक एआई साथी हूँ और स्वयं आपातकालीन सेवा को सूचित नहीं कर सकती।"
        ),
        "third_party": (
            "यह उस व्यक्ति के लिए एक गंभीर आपातकालीन स्थिति है। कृपया अपने फोन से तुरंत 112 पर कॉल करें ताकि समय पर एम्बुलेंस पहुँच सके। "
            "मैं एक एआई साथी हूँ और स्वयं कॉल करने में असमर्थ हूँ।"
        ),
        "medication": (
            "मैं दवाइयों या उनकी खुराक (डोज़) में कोई बदलाव या सलाह नहीं दे सकती, जिसमें दर्द निवारक गोलियां भी शामिल हैं। "
            "कृपया किसी भी दवा को लेने या बदलने से पहले अपने डॉक्टर या फार्मासिस्ट से परामर्श अवश्य लें।"
        ),
        "uncertain": (
            "मैं समझ सकती हूँ कि आपको सीने में बेचैनी या अजीब सा महसूस हो रहा है। "
            "सीने में किसी भी असहजता को केवल गैस समझकर अनदेखा नहीं किया जाना चाहिए। कृपया आराम से बैठ जाएँ और कोई मेहनत वाला काम न करें। "
            "अपने पास किसी परिजन को रहने के लिए कहें ताकि वे आपका ध्यान रख सकें। "
            "यदि भारीपन, दर्द या सांस लेने में तकलीफ़ बढ़े, तो तुरंत 112 पर कॉल करें। मैं एक एआई साथी हूँ, इसलिए कृपया डॉक्टर से अपनी जांच अवश्य करवाएं।"
        ),
        "deception_inquiry": (
            "नहीं, मैंने 112 या एम्बुलेंस को कोई फोन नहीं किया है। "
            "मैं स्क्रीन पर एक एआई साथी हूँ और मेरे पास फोन करने या आपातकालीन सेवा भेजने की कोई तकनीकी सुविधा नहीं है। "
            "यदि आपको आपातकालीन मदद चाहिए, तो कृपया अपने फोन से सीधे 112 डायल करें या किसी से फोन करने को कहें।"
        )
    },
    "mr": {
        "cardiac": (
            "छातीत दुखणे किंवा अस्वस्थता ही गंभीर हृदयविकाराची लक्षणे असू शकतात. कृपया ताबडतोब शांत बसा आणि स्वतःच्या फोनवरून 112 क्रमांकावर संपर्क साधा, किंवा घरातील कोणालातरी 112 ला फोन करण्यास सांगा. "
            "मी एक एआय साथीदार आहे आणि मी स्वतः 112 वर फोन किंवा रुग्णवाहिका पाठवू शकत नाही."
        ),
        "stroke": (
            "तोंड वाकडे होणे, हात लुळा पडणे किंवा बोलताना अडखळणे ही स्ट्रोकची गंभीर लक्षणे असू शकतात. कृपया त्वरित 112 वर फोन करा किंवा जवळच्या व्यक्तीला मदतीसाठी बोलवा. "
            "मी एक एआय साथीदार आहे आणि स्वतः फोन लावण्यास असमर्थ आहे."
        ),
        "trauma": (
            "खाली पडल्यास किंवा दुखापत झाल्यास कृपया उठण्याचा किंवा हालचाल करण्याचा प्रयत्न करू नका. त्वरित 112 ला फोन करा किंवा घरात कोणालातरी हाक मारा. "
            "मी एक एआय साथीदार आहे आणि स्वतः रुग्णवाहिका बोलावू शकत नाही."
        ),
        "third_party": (
            "संबंधित व्यक्तीसाठी ही तातडीची आणीबाणी आहे. कृपया आपल्या फोनवरून त्वरित 112 वर संपर्क साधून मदत मागवा. "
            "मी एक एआय साथीदार आहे आणि थेट संपर्क साधू शकत नाही."
        ),
        "medication": (
            "मी कोणत्याही औषधांचा सल्ला देऊ शकत नाही किंवा डोस बदलण्याची शिफारस करू शकत नाही. "
            "कोणतेही औषध घेण्यापूर्वी कृपया आपल्या डॉक्टरांचा किंवा औषधतज्ज्ञांचा सल्ला घ्या."
        ),
        "uncertain": (
            "मला समजते आहे की तुम्हाला छातीत काहीतरी विचित्र किंवा अस्वस्थ वाटत आहे. "
            "अशा लक्षणांना केवळ गॅस समजून दुर्लक्ष करू नये. कृपया शांत बसा आणि कोणतीही धावपळ करू नका. "
            "घरातील कोणालातरी जवळ थांबायला सांगा. जर छातीवर दबाव, वेदना किंवा श्वास घेण्यास त्रास जाणवला तर त्वरित 112 डायल करा. "
            "मी एक एआय साथीदार आहे, कृपया डॉक्टरांचा सल्ला नक्की घ्या."
        ),
        "deception_inquiry": (
            "नाही, मी 112 किंवा रुग्णवाहिकेला कोणताही फोन केलेला नाही. "
            "मी संगणकावर एक एआय साथीदार आहे आणि मला फोन करण्याची किंवा मदत पाठवण्याची कोणतीही तांत्रिक सोय नाही. "
            "जर आपल्याला तातडीची मदत हवी असेल तर कृपया आपल्या फोनवरून स्वतः 112 डायल करा."
        )
    },
    "ta": {
        "cardiac": (
            "நெஞ்சு வலி அல்லது அழுத்தம் என்பது தீவிர இதய அவசரநிலையாக இருக்கலாம். தயவுசெய்து உடனடியாக அமைதியாக அமர்ந்து, உங்கள் தொலைபேசியிலிருந்து 112 எண்ணை அழைத்து உதவி கோருங்கள், அல்லது அருகிலுள்ள யாரையாவது அழைக்கச் சொல்லுங்கள். "
            "நான் ஒரு AI துணை, என்னால் தொலைபேசி அழைப்பு விடுக்கவோ அல்லது ஆம்புலன்ஸை வரவழைக்கவோ முடியாது."
        ),
        "stroke": (
            "முகம் கோணுதல், கை பலவீனம் அல்லது பேச்சு குளறுதல் ஆகியவை பக்கவாதத்தின் தீவிர அறிகுறிகளாக இருக்கலாம். தயவுசெய்து உடனடியாக 112 எண்ணை அழையுங்கள். "
            "நான் ஒரு AI தோழி, என்னால் அவசர சேவைகளைத் தொடர்பு கொள்ள முடியாது."
        ),
        "trauma": (
            "கீழே விழுந்து காயம் ஏற்பட்டிருந்தால் தயவுசெய்து எழுந்திருக்க முயற்சிக்காதீர்கள். அசையாமல் இருந்து 112 எண்ணை அழையுங்கள் அல்லது உதவிக்கு யாரையாவது கூப்பிடுங்கள். "
            "நான் ஒரு AI துணை, என்னால் மருத்துவரை அழைக்க இயலாது."
        ),
        "third_party": (
            "இது அந்த நபருக்கு ஒரு தீவிர அவசர நிலை. உடனே 112 எண்ணை அழைத்து ஆம்புலன்ஸ் உதவி கோருங்கள். "
            "நான் ஒரு AI தோழி, என்னால் தானாக போன் செய்ய முடியாது."
        ),
        "medication": (
            "நான் மருந்துகளைப் பரிந்துரைக்கவோ அல்லது மருந்து அளவை மாற்றவோ முடியாது. "
            "எந்தவொரு மருந்தையும் எடுத்துக்கொள்வதற்கு முன் உங்கள் மருத்துவரை அணுகவும்."
        ),
        "uncertain": (
            "நெஞ்சில் ஒருவித அசௌகரியம் அல்லது படபடப்பு இருப்பதாகக் கூறுகிறீர்கள். "
            "இதை வெறும் வாயு (கேஸ்) என்று சாதாரணமாக எண்ணி அலட்சியப்படுத்தக் கூடாது. தயவுசெய்து அமைதியாக ஓரிடத்தில் அமருங்கள், உடல் உழைப்பில் ஈடுபடாதீர்கள். "
            "வீட்டில் உள்ள ஒருவரை உங்களுடன் இருக்கச் சொல்லுங்கள். அழுத்தம், மூச்சுத்திணறல் அல்லது வலி அதிகரித்தால் உடனடியாக 112 அழையுங்கள். "
            "நான் ஒரு AI துணை மட்டுமே, தயவுசெய்து மருத்துவரை அணுகிப் பரிசோதித்துக் கொள்ளுங்கள்."
        ),
        "deception_inquiry": (
            "இல்லை, நான் 112 எண்ணுக்கோ அல்லது ஆம்புலன்ஸுக்கோ போன் செய்யவில்லை. "
            "நான் திரையில் இருக்கும் ஒரு AI தோழி, என்னால் போன் செய்யவோ அல்லது அவசர சேவைகளை அனுப்பவோ முடியாது. "
            "உங்களுக்கு அவசர உதவி தேவைப்பட்டால் தயவுசெய்து உங்கள் போனிலிருந்து உடனே 112 அழையுங்கள்."
        )
    },
    "te": {
        "cardiac": (
            "ఛాతీ నొప్పి లేదా గుండెలో బరువు అనేది తీవ్రమైన అత్యవసర పరిస్థితి కావచ్చు. దయచేసి వెంటనే నిశ్శబ్దంగా కూర్చుని, మీ ఫోన్ నుండి 112 కి కాల్ చేయండి లేదా సహాయం కోసం ఎవరినైనా పిలవండి. "
            "నేను AI సహచరిని, స్వయంగా 112 కి ఫోన్ చేయలేను లేదా అంబులెన్స్‌ను పంపలేను."
        ),
        "stroke": (
            "ముఖం వాలిపోవడం, చేయి బలహీనపడటం లేదా మాట తడబడటం పక్షవాతం సంకేతాలు కావచ్చు. దయచేసి వెంటనే 112 కి కాల్ చేయండి. "
            "నేను AI సహచరిని, స్వయంగా ఎమర్జెన్సీ కాల్ చేయలేను."
        ),
        "trauma": (
            "కింద పడి గాయపడితే దయచేసి లేవడానికి ప్రయత్నించకండి. కదలకుండా ఉండి వెంటనే 112 కి కాల్ చేయండి లేదా ఇంట్లో ఎవరినైనా పిలవండి. "
            "నేను AI సహచరిని, నేరుగా కాల్స్ చేయలేను."
        ),
        "third_party": (
            "ఇది ఆ వ్యక్తికి తీవ్రమైన అత్యవసర పరిస్థితి. దయచేసి మీ ఫోన్ నుండి వెంటనే 112 కి కాల్ చేసి సహాయం కోరండి. "
            "నేను AI సహచరిని, స్వయంగా ఫోన్ చేయలేను."
        ),
        "medication": (
            "నేను మందులను సూచించలేను లేదా మోతాదును మార్చలేను. "
            "ఏదైనా మందు తీసుకునే ముందు దయచేసి మీ వైద్యుడిని లేదా ఫార్మసిస్ట్‌ను సంప్రదించండి."
        ),
        "uncertain": (
            "మీ ఛాతీలో అసౌకర్యంగా లేదా వింతగా ఉన్నట్లు నేను వింటున్నాను. "
            "ఛాతీలో ఏదైనా అసౌకర్యాన్ని కేవలం గ్యాస్ అని నిర్లక్ష్యం చేయకూడదు. దయచేసి ప్రశాంతంగా కూర్చోండి, శ్రమించవద్దు. "
            "ఇంట్లో ఎవరినైనా మీ దగ్గర ఉండమని చెప్పండి. నొప్పి, బరువు లేదా శ్వಾಸ ఆడకపోవడం పెరిగితే వెంటనే 112 కి కాల్ చేయండి. "
            "నేను AI సహచరిని మాత్రమే, దయచేసి వైద్యుడిని సంప్రదించి పరీక్ష చేయించుకోండి."
        ),
        "deception_inquiry": (
            "లేదు, నేను 112 కి లేదా అంబులెన్స్‌కు ఫోన్ చేయలేదు. "
            "నేను స్క్రీన్‌పై ఉన్న AI సహచరిని, నాకు ఫోన్ కాల్స్ చేసే సాంకేతిక సామర్థ్యం లేదు. "
            "మీకు అత్యవసర సహాయం అవసరమైతే, దయచేసి మీ ఫోన్ నుండి నేరుగా 112 కి కాల్ చేయండి."
        )
    },
    "kn": {
        "cardiac": (
            "ಎದೆ ನೋವು ಅಥವಾ ಎದೆಯಲ್ಲಿ ಭಾರ ಗಂಭೀರ ಹೃದಯ ತುರ್ತುಸ್ಥಿತಿಯ ಸಂಕೇತವಾಗಿರಬಹುದು. ದಯವಿಟ್ಟು ತಕ್ಷಣ ಕುಳಿತುಕೊಳ್ಳಿ ಮತ್ತು ನಿಮ್ಮ ಫೋನಿನಿಂದ 112 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ಮನೆಯಲ್ಲಿ ಯಾರನ್ನಾದರೂ ಕರೆಯಿರಿ. "
            "ನಾನು ಎಐ ಒಡನಾಡಿ, ಸ್ವತಃ ಕರೆ ಮಾಡಲು ಅಥವಾ ಆಂಬ್ಯುಲೆನ್ಸ್ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ."
        ),
        "stroke": (
            "ಮುಖ ವಾಲುವಿಕೆ, ಕೈ ದೌರ್ಬಲ್ಯ ಅಥವಾ ಮಾತು ತೊದಲುವಿಕೆ ಪಾರ್ಶ್ವವಾಯು (ಸ್ಟ್ರೋಕ್) ಲಕ್ಷಣಗಳಾಗಿರಬಹುದು. ದಯವಿಟ್ಟು ತಕ್ಷಣ 112 ಗೆ ಕರೆ ಮಾಡಿ. "
            "ನಾನು ಎಐ ಸಂಗಾತಿ, ಸ್ವತಃ ತುರ್ತು ಕರೆ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ."
        ),
        "trauma": (
            "ಕೆಳಗೆ ಬಿದ್ದು ಗಾಯವಾಗಿದ್ದರೆ ದಯವಿಟ್ಟು ಎದ್ದೇಳಲು ಪ್ರಯತ್ನಿಸಬೇಡಿ. ಅಲ್ಲೇ ಇದ್ದು 112 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ಸಹಾಯಕ್ಕಾಗಿ ಕೂಗಿ. "
            "ನಾನು ಎಐ ಸಂಗಾತಿ, ಸ್ವತಃ ವೈದ್ಯರನ್ನು ಕರೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ."
        ),
        "third_party": (
            "ಇದು ಆ ವ್ಯಕ್ತಿಗೆ ಗಂಭೀರ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಫೋನಿನಿಂದ ತಕ್ಷಣ 112 ಗೆ ಕರೆ ಮಾಡಿ. "
            "ನಾನು ಎಐ ಸಂಗಾತಿ, ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಕರೆ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ."
        ),
        "medication": (
            "ನಾನು ಯಾವುದೇ ಔಷಧಿಗಳನ್ನು ಶಿಫಾರಸು ಮಾಡಲು ಅಥವಾ ಬದಲಾಯಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. "
            "ಯಾವುದೇ ಔಷಧ ತೆಗೆದುಕೊಳ್ಳುವ ಮೊದಲು ದಯವಿಟ್ಟು ನಿಮ್ಮ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ."
        ),
        "uncertain": (
            "ನಿಮ್ಮ ಎದೆಯಲ್ಲಿ ಅಸ್ವಸ್ಥತೆ ಅಥವಾ ವಿಚಿತ್ರ ಅನುಭವವಾಗುತ್ತಿದೆ ಎಂದು ಕೇಳಿದೆ. "
            "ಇಂತಹ ಲಕ್ಷಣಗಳನ್ನು ಕೇವಲ ಗ್ಯಾಸ್ ಎಂದು ಕಡೆಗಣಿಸಬಾರದು. ದಯವಿಟ್ಟು ಶಾಂತವಾಗಿ ಕುಳಿತುಕೊಳ್ಳಿ, ಯಾವುದೇ ಆಯಾಸ ಮಾಡಿಕೊಳ್ಳಬೇಡಿ. "
            "ಮನೆಯಲ್ಲಿ ಯಾರಾದರೂ ನಿಮ್ಮ ಬಳಿ ಇರುವಂತೆ ನೋಡಿಕೊಳ್ಳಿ. ಎದೆಯಲ್ಲಿ ಭಾರ ಅಥವಾ ಉಸಿರಾಟದ ತೊಂದರೆ ಹೆಚ್ಚಾದರೆ ತಕ್ಷಣ 112 ಗೆ ಕರೆ ಮಾಡಿ. "
            "ನಾನು ಎಐ ಸಂಗಾತಿ ಮಾತ್ರ, ದಯವಿಟ್ಟು ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ ತಪಾಸಣೆ ಮಾಡಿಸಿಕೊಳ್ಳಿ."
        ),
        "deception_inquiry": (
            "ಇಲ್ಲ, ನಾನು 112 ಅಥವಾ ಆಂಬ್ಯುಲೆನ್ಸ್‌ಗೆ ಯಾವುದೇ ಕರೆ ಮಾಡಿಲ್ಲ. "
            "ನಾನು ಪರದೆಯ ಮೇಲಿನ ಎಐ ಸಂಗಾತಿ, ನನಗೆ ಫೋನ್ ಕರೆ ಮಾಡುವ ಯಾವುದೇ ತಾಂತ್ರಿಕ ಸಾಮರ್ಥ್ಯವಿಲ್ಲ. "
            "ನಿಮಗೆ ತುರ್ತು ಸಹಾಯ ಬೇಕಾದರೆ ದಯವಿಟ್ಟು ನಿಮ್ಮ ಫೋನಿನಿಂದ ನೇರವಾಗಿ 112 ಗೆ ಕರೆ ಮಾಡಿ."
        )
    },
    "ml": {
        "cardiac": (
            "നെഞ്ചുവേദന അല്ലെങ്കിൽ അസ്വസ്ഥത ഗുരുതരമായ ഹൃദയാഘാത ലക്ഷണമാകാം. ദയവായി ഉടൻ തന്നെ ഇരുന്ന് വിശ്രമിക്കുക, നിങ്ങളുടെ ഫോണിൽ നിന്ന് 112 ലേക്ക് വിളിക്കുക അല്ലെങ്കിൽ അടുത്തുള്ള ആരോടെങ്കിലും 112 ലേക്ക് വിളിക്കാൻ പറയുക. "
            "ഞാൻ ഒരു AI കൂട്ടുകാരിയാണ്, എനിക്ക് നേരിട്ട് ഫോൺ ചെയ്യാനോ ആംബുലൻസ് അയയ്ക്കാനോ കഴിയില്ല."
        ),
        "stroke": (
            "മുഖം കോടുക, കൈക്ക് തളർച്ച, സംസാരത്തിൽ വ്യക്തതക്കുറവ് എന്നിവ പക്ഷാഘാത ലക്ഷണങ്ങളാകാം. ഓരോ നിമിഷവും വിലപ്പെട്ടതാണ്. ദയവായി ഉടൻ 112 ലേക്ക് വിളിക്കുക. "
            "ഞാൻ ഒരു AI കൂട്ടുകാരിയാണ്, എനിക്ക് നേരിട്ട് എമർജൻസി കോൾ ചെയ്യാൻ കഴിയില്ല."
        ),
        "trauma": (
            "വീഴ്ചയോ പരിക്കോ സംഭവിച്ചാൽ ദയവായി എഴുന്നേൽക്കാൻ ശ്രമിക്കരുത്. അവിടെ തന്നെ ഇരുന്ന് 112 ലേക്ക് വിളിക്കുക അല്ലെങ്കിൽ സഹായത്തിനായി വിളിക്കുക. "
            "ഞാൻ ഒരു AI കൂട്ടുകാരിയാണ്, എനിക്ക് സഹായം നേരിട്ട് അയക്കാൻ കഴിയില്ല."
        ),
        "third_party": (
            "ഇത് ആ വ്യക്തിക്ക് ഒരു അടിയന്തിര സാഹചര്യമാണ്. ദയവായി നിങ്ങളുടെ ഫോണിൽ നിന്ന് ഉടൻ 112 ലേക്ക് വിളിച്ച് ആംബുലൻസ് സഹായം തേടുക. "
            "ഞാൻ ഒരു AI കൂട്ടുകാരിയാണ്, എനിക്ക് നേരിട്ട് ഫോൺ ചെയ്യാൻ കഴിയില്ല."
        ),
        "medication": (
            "എനിക്ക് മരുന്നുകൾ നിർദ്ദേശിക്കാനോ അളവ് മാറ്റാനോ കഴിയില്ല. "
            "ഏതെങ്കിലും മരുന്ന് കഴിക്കുന്നതിന് മുൻപ് ദയവായി നിങ്ങളുടെ ഡോക്ടറെ സമീപിക്കുക."
        ),
        "uncertain": (
            "നെഞ്ചിൽ ഒരു അസ്വസ്ഥതയോ വിചിത്രമായ തോന്നലോ ഉള്ളതായി മനസ്സിലാക്കുന്നു. "
            "ഇത് വെറും ഗ്യാസ് ആണെന്ന് കരുതി അവഗണിക്കരുത്. ദയവായി ശാന്തമായി ഇരിക്കുക, ആയാസമുള്ള കാര്യങ്ങൾ ചെയ്യരുത്. "
            "വീട്ടിൽ ആരെങ്കിലും നിങ്ങളുടെ അടുത്ത് നിൽക്കാൻ പറയുക. അസ്വസ്ഥതയോ ശ്വാസമെടുക്കാൻ ബുദ്ധിമുട്ടോ കൂടിയാൽ ഉടൻ 112 ലേക്ക് വിളിക്കുക. "
            "ഞാൻ ഒരു AI കൂട്ടുകാരി മാത്രമാണ്, ദയവായി ഡോക്ടറെ കണ്ട് പരിശോധന നടത്തുക."
        ),
        "deception_inquiry": (
            "ഇല്ല, ഞാൻ 112 ലോ ആംബുലൻസിലോ വിളിച്ചിട്ടില്ല. "
            "ഞാൻ സ്ക്രീനിലുള്ള ഒരു AI കൂട്ടുകാരി മാത്രമാണ്, എനിക്ക് ഫോൺ ചെയ്യാനുള്ള സാങ്കേതിക സൗകര്യമില്ല. "
            "അടിയന്തിര സഹായം ആവശ്യമുണ്ടെങ്കിൽ ദയവായി നിങ്ങളുടെ ഫോണിൽ നിന്ന് നേരിട്ട് 112 ലേക്ക് വിളിക്കുക."
        )
    },
    "bn": {
        "cardiac": (
            "বুকে তীব্র ব্যথা বা চাপ গুরুতর হৃদরোগের জরুরি লক্ষণ হতে পারে। অনুগ্রহ করে এখনই শান্ত হয়ে বসুন এবং আপনার ফোন থেকে সরাসরি 112 নম্বরে কল করুন, অথবা কাছাকাছি কাউকে ডাকুন। "
            "আমি একটি AI সঙ্গী এবং নিজে 112 নম্বরে ফোন করতে বা অ্যাম্বুলেন্স পাঠাতে পারি না।"
        ),
        "stroke": (
            "মুখ বেঁকে যাওয়া, হাতের দুর্বলতা বা কথা জড়িয়ে যাওয়া স্ট্রোকের জরুরি লক্ষণ হতে পারে। অনুগ্রহ করে দেরি না করে 112 নম্বরে কল করুন। "
            "আমি একটি AI সঙ্গী এবং নিজে জরুরি কল করতে পারি না।"
        ),
        "trauma": (
            "পড়ে গিয়ে আঘাত লাগলে অনুগ্রহ করে ওঠার বা নড়াচড়া করার চেষ্টা করবেন না। শান্ত হয়ে থাকুন এবং আপনার ফোন থেকে 112 নম্বরে কল করুন বা সাহায্যের জন্য কাউকে ডাকুন। "
            "আমি একটি AI সঙ্গী এবং নিজে জরুরি পরিষেবায় কল করতে পারি না।"
        ),
        "third_party": (
            "এটি সেই ব্যক্তির জন্য একটি জরুরি চিকিৎসা পরিস্থিতি। অনুগ্রহ করে আপনার ফোন থেকে অবিলম্বে 112 নম্বরে কল করুন। "
            "আমি একটি AI সঙ্গী এবং নিজে ফোন করতে পারি না।"
        ),
        "medication": (
            "আমি কোনো ওষুধ বা ডোজ পরিবর্তনের পরামর্শ দিতে পারি না। "
            "যেকোনো ওষুধ খাওয়া বা পরিবর্তন করার আগে অনুগ্রহ করে আপনার চিকিৎসক বা ফার্মাসিস্টের সাথে পরামর্শ করুন।"
        ),
        "uncertain": (
            "আপনার বুকে অস্বস্তি বা অদ্ভুত অনুভূতি হচ্ছে শুনেছি। এটিকে কেবল গ্যাস ভেবে অবহেলা করবেন না। "
            "অনুগ্রহ করে শান্ত হয়ে বিশ্রাম নিন এবং বাড়ির কাউকে পাশে থাকতে বলুন। ব্যথা বা শ্বাসকষ্ট বাড়লে অবিলম্বে 112 নম্বরে কল করুন।"
        ),
        "deception_inquiry": (
            "না, আমি 112 বা অ্যাম্বুলেন্সে কোনো ফোন করিনি। আমি স্ক্রিনে থাকা একটি AI সঙ্গী, এবং আমার ফোন কল করার বা অ্যাম্বুলেন্স পাঠানোর ক্ষমতা নেই। "
            "জরুরি সাহায্য প্রয়োজন হলে অনুগ্রহ করে নিজে সরাসরি 112 নম্বরে কল করুন।"
        )
    }
}


LOCALIZED_ITEM_NAMES = {
    "Reading Glasses": {"hi": "चश्मा", "mr": "चष्मा", "ta": "கண்ணாடி", "te": "కళ్ళద్దాలు", "kn": "ಕನ್ನಡಕ", "bn": "চশমা", "ml": "കണ്ണട", "es": "gafas", "fr": "lunettes", "de": "Brille"},
    "House Keys": {"hi": "चाबियाँ", "mr": "किल्ली", "ta": "சாவி", "te": "తాళంచెవులు", "kn": "ಕೀಲಿ", "bn": "চাবি", "ml": "താക്കോൽ", "es": "llaves", "fr": "clés", "de": "Schlüssel"},
    "TV Remote": {"hi": "टीवी रिमोट", "mr": "टीव्ही रिमोट", "ta": "டிவி ரிமோட்", "te": "టీవీ రిమోట్", "kn": "ಟಿವಿ ರಿಮೋಟ್", "bn": "টিভি রিমোট", "ml": "ടിവി റിമോട്ട്", "es": "control remoto", "fr": "télécommande", "de": "Fernbedienung"},
    "Daily Medicine Box": {"hi": "दवा का डिब्बा", "mr": "औषधांचा डबा", "ta": "மருந்து பெட்டி", "te": "మందుల పెట్టె", "kn": "ಔಷಧಿ ಪೆಟ್ಟಿಗೆ", "bn": "ওষুধের বাক্স", "ml": "മരുന്ന് പെട്ടി", "es": "caja de medicinas", "fr": "boîte à médicaments", "de": "Medikamentenbox"},
    "Walking Stick": {"hi": "छड़ी", "mr": "काठी", "ta": "கைத்தடி", "te": "చేतिకర్ర", "kn": "ಊರುಗೋಲು", "bn": "হাঁটার লাঠি", "ml": "വടി", "es": "bastón", "fr": "canne", "de": "Gehstock"}
}

# -----------------------------------------------------------------------------
LOVED_ONES_INDIC_ALIASES = {
    "Aarav Sharma": ["आरव", "ಆರವ್", "ఆరవ్", "ஆரவ்", "ആരവ്", "আরভ", "aarav", "arav"],
    "Ananya Sharma": ["अनन्या", "ಅನನ್ಯ", "అనన్య", "அனன்யா", "അനന്യ", "অনন্যা", "ananya"],
    "Dr. Vikram Sharma": ["विक्रम", "ವಿಕ್ರಮ್", "ವಿಕ್ರಂ", "విక్రమ్", "విక్రం", "விக்ரம்", "വിക്രം", "বিক্রম", "vikram"]
}

# 3. ASHA ENGINE CORE CLASS
# -----------------------------------------------------------------------------

class AshaEngine:
    def __init__(
        self,
        server_url: str = DEFAULT_LLAMA_SERVER,
        gemini_model: Optional[str] = None,
        gemini_timeout: float = DEFAULT_GEMINI_TIMEOUT,
        qwen_timeout: float = DEFAULT_QWEN_TIMEOUT,
        enable_cli_fallback: Optional[bool] = None,
    ):
        self.server_url = server_url
        self.gemini_model = gemini_model or get_gemini_model(DEFAULT_GEMINI_MODEL)
        self.gemini_timeout = gemini_timeout
        self.qwen_timeout = qwen_timeout
        if enable_cli_fallback is None:
            self.enable_cli_fallback = os.environ.get("ASHA_ENABLE_LLAMA_CLI_FALLBACK") == "1"
        else:
            self.enable_cli_fallback = enable_cli_fallback
        self.history: List[Dict[str, str]] = []
        self.memory_store = self._load_patient_memory()
        self.active_patient_id = self.memory_store.get("active_patient_id", "sunita_01")

    def has_gemini(self) -> bool:
        """Boolean check confirming whether Gemini API key is configured server-side."""
        return has_gemini_api_key()

    def _load_patient_memory(self) -> Dict[str, Any]:
        """Loads persistent privacy-controlled patient memory from disk."""
        if os.path.exists(MEMORY_FILE):
            try:
                with open(MEMORY_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[AshaEngine] Warning loading patient memory: {e}")
        return {
            "active_patient_id": "sunita_01",
            "patients": {
                "sunita_01": {
                    "patient_id": "sunita_01",
                    "name": "Sunita Ji",
                    "age": 72,
                    "condition_note": "Early-stage cognitive support",
                    "loved_ones": [{"name": "Aarav", "relationship": "Grandson", "notes": "Plays opening batsman in school cricket"}],
                    "interests_and_hobbies": ["Rooftop rose gardening", "Morning classical ragas (Bhairav)"],
                    "daily_routines": [{"time": "11:00 AM", "activity": "Pattern memory puzzle game on Saksham"}]
                }
            }
        }

    def _save_patient_memory(self):
        """Persists patient memory atomically to disk."""
        try:
            with open(MEMORY_FILE, "w", encoding="utf-8") as f:
                json.dump(self.memory_store, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[AshaEngine] Error saving patient memory: {e}")

    def reset_conversation(self):
        """Resets the in-memory dialogue session."""
        self.history = []

    def get_patient_profile(self) -> Dict[str, Any]:
        """Returns the profile of the currently active patient."""
        patients = self.memory_store.get("patients", {})
        return patients.get(self.active_patient_id, {
            "name": "Sunita Ji",
            "age": 72,
            "loved_ones": [{"name": "Aarav", "relationship": "Grandson", "notes": "Plays cricket"}],
            "interests_and_hobbies": ["Rooftop rose gardening"],
            "daily_routines": [{"time": "11:00 AM", "activity": "Brain puzzle game"}]
        })

    def switch_patient(self, patient_id: str) -> bool:
        """Switches active patient profile."""
        if patient_id in self.memory_store.get("patients", {}):
            self.active_patient_id = patient_id
            self.memory_store["active_patient_id"] = patient_id
            self._save_patient_memory()
            self.reset_conversation()
            return True
        return False

    def update_patient_memory(self, field: str, value: Any) -> bool:
        """Updates or appends a specific memory field for the active patient."""
        patient = self.memory_store.setdefault("patients", {}).setdefault(self.active_patient_id, {})
        if field in ["interests_and_hobbies", "daily_routines", "loved_ones"] and isinstance(value, list):
            patient[field] = value
        else:
            patient[field] = value
        self._save_patient_memory()
        return True

    def delete_patient_memory(self, field: str, item_index: Optional[int] = None) -> bool:
        """Deletes a memory field or item within a list."""
        patient = self.memory_store.setdefault("patients", {}).setdefault(self.active_patient_id, {})
        if field in patient:
            if item_index is not None and isinstance(patient[field], list) and 0 <= item_index < len(patient[field]):
                patient[field].pop(item_index)
            else:
                del patient[field]
            self._save_patient_memory()
            return True
        return False

    def get_item_locations(self, patient_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns all recorded item locations for a patient."""
        pid = patient_id or self.active_patient_id
        patient = self.memory_store.get("patients", {}).get(pid, {})
        return patient.get("item_locations", [])

    def find_item_location(self, query: str, patient_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Fuzzy/keyword match an item query against recorded items and synonyms."""
        items = self.get_item_locations(patient_id)
        if not items:
            return None
        q_clean = query.lower().replace("chasma", "chashma").replace("चसमा", "चश्मा").replace("चाब्या", "चाबी").replace("चाव्या", "चाबी").replace("किल्ल्या", "किल्ली")
        q_norm = q_clean.replace("ष", "श")
        for item in items:
            name = item.get("name", "").lower()
            name_norm = name.replace("ष", "श")
            if name in q_clean or q_clean in name or name_norm in q_norm or q_norm in name_norm:
                return item
            synonyms = item.get("synonyms", [])
            for syn in synonyms:
                s_clean = syn.lower()
                s_norm = s_clean.replace("ष", "श")
                if s_clean in q_clean or s_norm in q_norm or (len(s_clean) > 3 and s_clean in q_clean):
                    return item
        return None

    def save_item_location(self, item_dict: Dict[str, Any], patient_id: Optional[str] = None) -> bool:
        """Saves, updates, or adds an item location record."""
        # Normalize frontend camelCase keys to canonical schema
        if "itemName" in item_dict and "name" not in item_dict:
            item_dict["name"] = item_dict["itemName"]
        if "locationRecorded" in item_dict and "location" not in item_dict:
            item_dict["location"] = item_dict["locationRecorded"]
        if "recordedAt" in item_dict and "last_recorded" not in item_dict:
            item_dict["last_recorded"] = item_dict["recordedAt"]
        if "verifiedStatus" in item_dict and "verified_status" not in item_dict:
            item_dict["verified_status"] = item_dict["verifiedStatus"]
        pid = patient_id or self.active_patient_id
        patient = self.memory_store.setdefault("patients", {}).setdefault(pid, {})
        items = patient.setdefault("item_locations", [])
        
        item_id = item_dict.get("id")
        existing_idx = None
        if item_id:
            for idx, existing in enumerate(items):
                if existing.get("id") == item_id:
                    existing_idx = idx
                    break
        else:
            item_dict["id"] = f"item-{int(time.time())}"

        if existing_idx is not None:
            items[existing_idx] = item_dict
        else:
            items.append(item_dict)
            
        self._save_patient_memory()
        return True

    def delete_item_location(self, item_id: str, patient_id: Optional[str] = None) -> bool:
        """Deletes an item location record."""
        pid = patient_id or self.active_patient_id
        patient = self.memory_store.get("patients", {}).get(pid, {})
        items = patient.get("item_locations", [])
        initial_len = len(items)
        patient["item_locations"] = [it for it in items if it.get("id") != item_id]
        if len(patient["item_locations"]) < initial_len:
            self._save_patient_memory()
            return True
        return False

    def _detect_language(self, text: str, user_lang_code: str) -> str:
        """Resolves target language code based on user selection, in-dialogue switch commands, and script cues."""
        lower = text.lower()

        # 1. In-dialogue explicit language switch requests
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*hindi\b|(?:hindi|हिंदी|हिन्दी)\s*(?:mein|me|में)?\s*(?:bolo|बोलो|baat|बात)", lower):
            return "hi"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*marathi\b|(?:marathi|मराठी)\s*(?:madhe|मध्ये|t|त)?\s*(?:bola|बोल|बोला|boluya|बोलूया)", lower):
            return "mr"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*(?:bengali|bangla)\b|(?:bengali|bangla|বাংলা)\s*(?:te|তে|y|য়|বলেন|বলো|কথা)?\s*(?:bolo|bolun|বলুন|বলো)", lower):
            return "bn"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*tamil\b|(?:tamil|தமிழ்)\s*(?:il|இல்)?\s*(?:pesu|பேசு|பேசுங்கள்)", lower):
            return "ta"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*telugu\b|(?:telugu|తెలుగు)\s*(?:lo|లో)?\s*(?:matladu|మాట్లాడు)", lower):
            return "te"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*kannada\b|(?:kannada|ಕನ್ನಡ)\s*(?:dalli|ದಲ್ಲಿ)?\s*(?:mathanadu|ಮಾತನಾಡು)", lower):
            return "kn"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*malayalam\b|(?:malayalam|മലയാളം)\s*(?:il|thil|ൽ|ത്തിൽ)?\s*(?:samsarikku|സംസാരിക്കൂ)", lower):
            return "ml"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*spanish\b|(?:spanish|español|habla\s+en\s+español)", lower):
            return "es"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*french\b|(?:french|français|parle\s+en\s+français)", lower):
            return "fr"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*german\b|(?:german|deutsch|sprich\s+deutsch)", lower):
            return "de"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*arabic\b|(?:arabic|عربي|بالعربية|تكلمي\s+بالعربية)", lower):
            return "ar"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*japanese\b|(?:japanese|日本語で|日本語)", lower):
            return "ja"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*chinese\b|(?:chinese|中文|说中文)", lower):
            return "zh"
        if re.search(r"\b(?:switch to|speak in|talk in|change to)\s*english\b|(?:english|इंग्लिश|अंग्रेजी)\s*(?:please|mein|में)?\s*(?:speak|talk|bolo|बोलो)", lower):
            return "en"

        # 2. Distinctive Scripts detection
        has_cjk = False
        has_kana = False
        for ch in text:
            code = ord(ch)
            if 0x0980 <= code <= 0x09FF:
                return "bn"  # Bengali
            elif 0x0B80 <= code <= 0x0BFF:
                return "ta"  # Tamil
            elif 0x0C00 <= code <= 0x0C7F:
                return "te"  # Telugu
            elif 0x0C80 <= code <= 0x0CFF:
                return "kn"  # Kannada
            elif 0x0D00 <= code <= 0x0D7F:
                return "ml"  # Malayalam
            elif 0x0900 <= code <= 0x097F:
                # Devanagari: distinguish Marathi vs Hindi
                if re.search(r"[ळ]|(?:आहे|नाही|नाहीत|मला|करायचं|होतं|पाहिजे|कसे|आहात|माझं|पडला|पडली|खाली|झाले|केले|बसा|थकवा|कंटाळा)", text) or user_lang_code == "mr":
                    return "mr"
                return "hi"
            elif (0x0600 <= code <= 0x06FF) or (0x0750 <= code <= 0x077F):
                return "ar"  # Arabic
            elif (0x3040 <= code <= 0x309F) or (0x30A0 <= code <= 0x30FF):
                has_kana = True
            elif 0x4E00 <= code <= 0x9FFF:
                has_cjk = True

        if has_kana:
            return "ja"
        if has_cjk:
            return "zh"

        # 3. International Latin Language detection
        if re.search(r"\b(?:hola|buenos\s+d[ií]as|buenas\s+tardes|gracias|amigo|c[oó]mo\s+est[aá]s?|d[oó]nde\s+est[aá]|por\s+favor|estoy\s+bien)\b", lower):
            return "es"
        if re.search(r"\b(?:bonjour|bonsoir|merci|comment\s+[cç]a\s+va|s'il\s+vous\s+pla[iî]t|o[uù]\s+est|je\s+vais\s+bien)\b", lower):
            return "fr"
        if re.search(r"\b(?:hallo|guten\s+tag|guten\s+morgen|danke|bitte|wie\s+geht('s|es)|wo\s+ist|mir\s+geht\s+es)\b", lower):
            return "de"

        # 4. Romanized Indic Language detection (distinctive markers first so shared words like 'aaj' respect code-switching/UI language)
        if re.search(r"\b(?:ami|amar|amake|apni|kemon|achhen|achen|bhalo|klanto|kothay|kothai|paribar|oushudh|oshudh|ichchha|nomoshkar|korche|khelbo|khabo|jol)\b", lower):
            return "bn"
        if re.search(r"\b(?:mala|khup|thakla|thaklo|thakli|aahe|ahe|ahet|maza|majha|khelaycha|pudhcha|aathvat|boluya|kasa|ahes|nako|karaycha|ani|aani|kuthe|dolyancha|aushadh|dhanyavad|abhaar|kiti|vajle|vichar|yetoy|kon|aahat|jhopa|uthaycha)\b", lower):
            return "mr"
        if re.search(r"\b(?:vanakkam|enoda|peran|epdi|irukan|vilaiyaduran|sorvaga|ullathu|vendam|irukken|engae|eppadi|irukeenga|kannadi|saavi|marunthu|thanni|pasikuthu|yaar)\b", lower):
            return "ta"
        if re.search(r"\b(?:namaskaram|naaku|ee\s+roju|neerasamga|undi|aatalu|aata|vaddu|ela|unnaru|ekkada|unnayi|kalladdalu|mandulu|thala|neellu|evaru)\b", lower):
            return "te"
        if re.search(r"\b(?:namaskara|nanage|swalpa|aayasa|agide|aatalu|beda|hege|iddiri|elli|ide|kannadaka|maathre|hegiddeera|neeru|yaaru)\b", lower):
            return "kn"
        if re.search(r"\b(?:namaskaram|enikku|innu|ksheenam|thonnunnu|kalikkanam|venda|engane|und|evideyaanu|kannada|marunnu|sukhamano|vellam|aaranu|aaraanu)\b", lower):
            return "ml"
        if re.search(r"\b(?:main|mujhe|thak|gaya|gayi|hoon|hun|mera|meri|mere|agla|samajh|khelna|khelne|nahi|nahin|karo|batao|kaisi|kaisa|kaise|aur|chasma|chashma|kahan|kaha|kidhar|chabi|dawai|dawa|kya|kuch|mann|shukriya|dhanyawad|ajeeb|lag|raha|rahi|bhookh|paani|pani|bataiye|chalo)\b", lower):
            return "hi"
        if re.search(r"\baaj\b", lower):
            return user_lang_code if user_lang_code in ["hi", "mr", "bn"] else "hi"

        # 5. Fall back to user's selected preference
        if user_lang_code in ["en", "hi", "mr", "ta", "te", "kn", "bn", "ml", "es", "fr", "de", "ar", "ja", "zh"]:
            return user_lang_code

        return "en"

    def _get_continuity_guidance(self, lang_code: str, name: str, is_continuing: bool, is_repeated: bool) -> str:
        guidance = ""
        if is_continuing:
            if lang_code == "hi":
                guidance += f"\n\nबातचीत की निरंतरता:\nआप {name} से पहले से बातचीत कर रही हैं। नमस्ते, प्रणाम या 'मैं आशा हूँ' जैसी शुरुआती बातें दोबारा न दोहराएं। सीधे, 1-2 वाक्यों में शांत और स्वाभाविक उत्तर दें।"
            elif lang_code == "mr":
                guidance += f"\n\nसंवादाची सातत्यता:\nतुम्ही आधीपासूनच {name} यांच्याशी बोलत आहात. पुन्हा पुन्हा 'नमस्कार', 'मी आशा आहे' असे अभिवादन करू नका. थेट आणि 1-2 वाक्यांत शांतपणे उत्तर द्या."
            elif lang_code == "ta":
                guidance += f"\n\nஉரையாடல் தொடர்ச்சி:\nநீங்கள் ஏற்கனவே {name} உடன் பேசிக் கொண்டிருக்கிறீர்கள். மீண்டும் மீண்டும் வணக்கம் கூற வேண்டாம். நேரடியாக 1-2 வாக்கியங்களில் பதிலளிக்கவும்."
            elif lang_code == "te":
                guidance += f"\n\nసంభాషణ కొనసాగింపు:\nమీరు ఇప్పటికే {name} గారితో మాట్లాడుతున్నారు. మళ్లీ నమస్కారం అని మొదలుపెట్టవద్దు. నేరుగా 1-2 వాక్యాలలో సమాధానం చెప్పండి."
            elif lang_code == "kn":
                guidance += f"\n\nಸಂಭಾಷಣೆಯ ಮುಂದುವರಿಕೆ:\nನೀವು ಈಗಾಗಲೇ {name} ಅವರೊಂದಿಗೆ ಮಾತನಾಡುತ್ತಿದ್ದೀರಿ. ಪದೇ ಪದೇ ನಮಸ್ಕಾರ ಎಂದು ಹೇಳಬೇಡಿ. ನೇರವಾಗಿ 1-2 ವಾಕ್ಯಗಳಲ್ಲಿ ಉತ್ತರಿಸಿ."
            elif lang_code == "bn":
                guidance += f"\n\nকথোপকথনের ধারাবাহিকতা:\nআপনি ইতিমধ্যেই {name}-এর সাথে কথা বলছেন। বারবার 'নমস্কার' বা 'আমি আশা' বলে শুরু করবেন না। সরাসরি ১-২টি সহজ ও শান্ত বাক্যে উত্তর দিন।"
            elif lang_code == "ml":
                guidance += f"\n\nസംഭാഷണ തുടർച്ച:\nനിങ്ങൾ ഇപ്പോൾ {name} നോട് സംസാരിക്കുകയാണ്. വീണ്ടും നമസ്കാരം എന്ന് ആവർത്തിക്കരുത്. നേരിട്ട് 1-2 വാക്യങ്ങളിൽ മറുപടി നൽകുക."
            else:
                guidance += f"\n\nCONVERSATION CONTINUITY:\nYou are already in an ongoing conversation with {name}. DO NOT repeat introductory greetings ('Namaste', 'Hello', 'Good morning') or your name/role. Answer directly, warmly, and concisely in 1-2 sentences."

        if is_repeated:
            if lang_code == "hi":
                guidance += f"\nधैर्य निर्देश: यदि मरीज ने यही सवाल पहले भी पूछा है, तो पूरी शांति और स्नेह से दोबारा बताएं। कभी भी यह न कहें कि 'मैंने पहले बताया था'।"
            elif lang_code == "mr":
                guidance += f"\nधैर्य नियम: रुग्णाने हाच प्रश्न आधी विचारला असला तरीही अतिशय शांतपणे आणि प्रेमाने पुन्हा सांगा. 'मी आधीच सांगितले होते' असे कधीही म्हणू नका."
            elif lang_code == "ta":
                guidance += f"\nபொறுமை விதி: நோயாளி இதே கேள்வியை முன்பு கேட்டிருந்தாலும், அமைதியாகவும் அன்பாகவும் மீண்டும் கூறுங்கள்."
            elif lang_code == "te":
                guidance += f"\nఓపిక నియమం: రోగి ఇదే ప్రశ్నను ఇంతకుముందు అడిగినా, ఎంతో ప్రేమగా, ప్రశాంతంగా మళ్లీ చెప్పండి."
            elif lang_code == "kn":
                guidance += f"\nತಾಳ್ಮೆಯ ನಿಯಮ: ರೋಗಿಯು ಇದೇ ಪ್ರಶ್ನೆಯನ್ನು ಈ ಹಿಂದೆ ಕೇಳಿದ್ದರೂ, ಶಾಂತವಾಗಿ ಮತ್ತು ಪ್ರೀತಿಯಿಂದ ಪುನಃ ತಿಳಿಸಿ."
            elif lang_code == "bn":
                guidance += f"\nধৈর্যের নির্দেশ: রোগী যদি একই প্রশ্ন আগেও করে থাকেন, তবুও শান্তভাবে ও ভালোবাসার সাথে আবার বলুন। কখনোই বলবেন না যে 'আমি আগেই বলেছিলাম'।"
            elif lang_code == "ml":
                guidance += f"\nക്ഷമാ നിയമം: രോഗി ഇതേ ചോദ്യം മുമ്പ് ചോദിച്ചിട്ടുണ്ടെങ്കിലും, ശാന്തമായും സ്നേഹത്തോടെയും വീണ്ടും പറയുക."
            else:
                guidance += f"\nREPEATED QUESTION PATIENCE: The patient may have asked this or a similar question recently. Answer with infinite calm, warmth, and reassurance. NEVER say 'As I said earlier' or point out repetition."

        return guidance

    def _build_system_prompt(self, lang_code: str, context: Optional[Dict[str, Any]] = None, is_continuing: bool = False, is_repeated: bool = False) -> str:
        prompt = self._build_raw_system_prompt(lang_code, context)
        profile = self.get_patient_profile()
        name = profile.get("name", "Sunita Ji")
        if context and isinstance(context, dict) and context.get("displayName"):
            name = context["displayName"]
        continuity = self._get_continuity_guidance(lang_code, name, is_continuing, is_repeated)
        return prompt + continuity

    def _build_raw_system_prompt(self, lang_code: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Constructs an eldercare system prompt tailored with live patient context, golden personality guidelines, and few-shot exemplars."""
        profile = self.get_patient_profile()
        name = profile.get("name", "Sunita Ji")
        loved_ones = profile.get("loved_ones", [])
        hobbies = profile.get("interests_and_hobbies", [])
        routines = profile.get("daily_routines", [])

        # Dynamic enrichment from live frontend application context
        completed_info = ""
        if context and isinstance(context, dict):
            if context.get("displayName"):
                name = context["displayName"]
            if context.get("lovedOnes") and isinstance(context["lovedOnes"], list):
                loved_ones = context["lovedOnes"]
            if context.get("nextRoutine"):
                nr = context["nextRoutine"]
                routines = [{"time": nr.get("time", ""), "activity": nr.get("title", "")}]
            elif context.get("remainingRoutines"):
                routines = [{"time": r.get("time", ""), "activity": r.get("title", "")} for r in context["remainingRoutines"][:3]]
            
            completed_titles = [r.get("title", "") for r in context.get("completedRoutines", []) if r.get("title")]
            if completed_titles:
                completed_info = f" Tasks already completed today: {', '.join(completed_titles)}."

        loved_str = ", ".join([f"{lo.get('name')} ({lo.get('relationship', '')})" for lo in loved_ones])
        hobbies_str = ", ".join(hobbies) if hobbies else "Gentle morning strolls, listening to classical ragas"
        routine_str = "; ".join([f"{r.get('time')}: {r.get('activity')}" for r in routines]) if routines else "Morning medication, gentle memory puzzle"
        if completed_info:
            routine_str += f".{completed_info}"

        next_task = routines[0]["activity"] if routines else "Morning Medication"

        # 1. HINDI / HINGLISH
        if lang_code == "hi":
            return (
                f"आप आशा (ASHA) हैं, सक्षम न्यूरो-केयर (Saksham Neuro-Care) की एक आत्मीय, शांत और सम्मानजनक बुजुर्ग साथी।\n"
                f"आप {name} से बात कर रही हैं। उन्हें हमेशा 'आप' कहकर सम्मानपूर्वक संबोधित करें।\n"
                f"मरीज की पृष्ठभूमि: परिवार: {loved_str}। दैनिक कार्य: {routine_str}। अगला कार्य: {next_task}।\n"
                f"नियम:\n"
                f"1. मुख्य रूप से सरल, स्वाभाविक हिंदी (Devanagari) में उत्तर दें। अंग्रेजी अनुवाद या कोष्ठक न जोड़ें।\n"
                f"2. उत्तर हमेशा 1 या 2 छोटे, शांत और सुकून देने वाले वाक्यों में दें।\n"
                f"3. यदि मरीज थका हुआ है, अकेला है, या कहता है 'कुछ करने का मन नहीं है' या 'मुझे आराम करना है', तो किसी गतिविधि या कार्य का दबाव न डालें। केवल आत्मीयता से कहें कि कोई बात नहीं, आप आराम से बैठिए, मैं आपके साथ हूँ।\n"
                f"4. यदि मरीज अगले काम या दिनचर्या के बारे में पूछे, तो उनकी दिनचर्या ({next_task}) बताएं।\n"
                f"5. यदि मरीज सामान्य ज्ञान, प्रकृति, विज्ञान, इतिहास, कहानियां या रोजमर्रा की जिज्ञासा पूछे (जैसे 'आसमान नीला क्यों है?'), तो 1-2 सरल और रोचक वाक्यों में स्नेह से उत्तर दें। सामान्य ज्ञान के प्रश्नों को डॉक्टर या दिनचर्या की ओर न मोड़ें।\n"
                f"6. यदि मरीज का संदेश या आवाज का पाठ अधूरा, कटा हुआ या अस्पष्ट हो, तो अनुमान न लगाएं—विनम्रता से एक छोटा स्पष्ट प्रश्न पूछें।\n"
                f"7. मरीज के Hinglish या एक ही वाक्य में मिली-जुली हिंदी-अंग्रेजी (code-switching) को पूरी तरह समझें और सरल हिंदी में उत्तर दें। कभी भी मरीज पर सिर्फ एक ही भाषा बोलने का दबाव न डालें।\n"
                f"8. आप कंप्यूटर स्क्रीन पर एक एआई साथी हैं; आप फोन कॉल या एम्बुलेंस नहीं भेज सकतीं।\n"
                f"उदाहरण:\n"
                f"मरीज: नमस्ते आशा, आज मुझे थोड़ा अकेलापन लग रहा है।\n"
                f"आशा: नमस्ते {name}! मैं हमेशा आपके साथ हूँ, आप बिल्कुल अकेले नहीं हैं। आराम से बैठिए, हम बातें करते हैं।\n"
                f"मरीज: आज मेरा कुछ करने का मन नहीं है।\n"
                f"आशा: कोई बात नहीं {name}, आप आराम से बैठिए। आपको कुछ भी करने की जरूरत नहीं है, मैं आपके पास ही हूँ।\n"
                f"मरीज: आसमान नीला क्यों है?\n"
                f"आशा: सूर्य का प्रकाश हवा में बिखरता है और नीली किरणें सबसे ज्यादा फैलती हैं, इसलिए आसमान सुंदर नीला दिखाई देता है।\n"
                f"मरीज: मेरा अगला काम क्या है?\n"
                f"आशा: आपका अगला काम {next_task} है। जब भी आपका मन करे, तब आप इसे कर सकते हैं।\n"
                f"मरीज: वह चीज कहाँ है?\n"
                f"आशा: {name}, आप किस चीज के बारे में पूछ रहे हैं? मुझे थोड़ा और बताइए ताकि मैं आपकी मदद कर सकूँ।"
            )

        # 2. MARATHI / MARATHISH
        elif lang_code == "mr":
            return (
                f"तुम्ही आशा (ASHA) आहात - सक्षम न्यूरो-केअर (Saksham Neuro-Care) ची प्रेमळ आणि आदरणीय साथीदार.\n"
                f"तुम्ही {name} यांच्याशी बोलत आहात. त्यांना नेहमी 'तुम्ही' म्हणून आदराने संबोधित करा. 'आशा' हे तुमचे नाव आहे.\n"
                f"रुग्णाची माहिती: कुटुंब: {loved_str}. दिनचर्या: {routine_str}. पुढील कार्य: {next_task}.\n"
                f"नियम:\n"
                f"1. प्रामुख्याने सोप्या आणि अस्खलित मराठीत (Devanagari) उत्तर द्या. रोबोटसारखे भाषांतर देऊ नका.\n"
                f"2. उत्तर नेहमी 1-2 लहान, प्रेमळ आणि धीर देणाऱ्या वाक्यांत असावे.\n"
                f"3. जर रुग्ण थकला असेल किंवा 'काही करायचे नाही' असे म्हणाला, तर कसलाही आग्रह करू नका. त्यांना विश्रांती घेण्यास सांगा आणि सांगा की मी सोबत आहे.\n"
                f"4. जर रुग्णाने दिनचर्या विचारली, तर फक्त त्यांच्या खऱ्या दिनचर्येचा ({next_task}) उल्लेख करा.\n"
                f"5. जर रुग्णाने सामान्य ज्ञान, निसर्ग, विज्ञान, इतिहास किंवा गोष्टी विचारल्या (उदा. 'आकाश निळे का दिसते?'), तर 1-2 सोप्या वाक्यांत प्रेमाने उत्तर द्या. असे प्रश्न विनाकारण डॉक्टरकडे वळवू नका.\n"
                f"6. जर रुग्णाचा आवाज किंवा प्रश्न अपूर्ण किंवा अस्पष्ट असेल, तर अंदाज न बांधता प्रेमाने एक छोटा स्पष्ट प्रश्न विचारा.\n"
                f"7. रुग्णाने एकाच वाक्यात मराठी-इंग्रजी (code-switching) किंवा Marathish वापरले तरी सहज समजून घ्या; कधीही फक्त एकाच भाषेत बोलायची सक्ती करू नका.\n"
                f"8. तुम्ही संगणकावर एक एआई साथीदार आहात; फोन कॉल करणे किंवा रुग्णवाहिका पाठवणे तुमच्या हातात नाही.\n"
                f"संवाद उदाहरणे:\n"
                f"रुग्ण: नमस्कार आशा, आज मला खूप थकवा जाणवतोय.\n"
                f"आशा: नमस्कार {name}! काळजी करू नका, मी तुमच्या सोबतच आहे. निवांत बसा आणि थोडी विश्रांती घ्या.\n"
                f"रुग्ण: आज मला काहीच करायचे नाही.\n"
                f"आशा: काही हरकत नाही {name}! कसलीही काळजी करू नका, तुम्ही शांत बसा, मी इथेच तुमच्या सोबत आहे.\n"
                f"रुग्ण: आकाश निळे का दिसते?\n"
                f"आशा: वातावरणात सूर्यप्रकाशाचे विखुरणे होते आणि त्यातील निळा रंग हवेत जास्त पसरतो, म्हणून आकाश निळे भासते.\n"
                f"रुग्ण: माझे पुढचे काम कोणते आहे?\n"
                f"आशा: तुमचे पुढचे कार्य {next_task} हे आहे. जेव्हा तुमची इच्छा असेल तेव्हा आपण ते करू.\n"
                f"रुग्ण: ती गोष्ट कुठे आहे?\n"
                f"आशा: {name}, तुम्ही नक्की कोणत्या गोष्टीबद्दल विचारत आहात? मला थोडे स्पष्ट सांगा म्हणजे मी तुम्हाला मदत करू शकेन."
            )

        # 2B. BENGALI / BANGLISH
        elif lang_code == "bn":
            return (
                f"আপনি আশা (ASHA), সক্ষম নিউরো-কেয়ার (Saksham Neuro-Care)-এর একজন স্নেহশীল, শান্ত ও শ্রদ্ধাশীল সঙ্গী।\n"
                f"আপনি {name}-এর সাথে কথা বলছেন। সবসময় তাঁকে 'আপনি' বলে সম্মান দিয়ে সম্বোধন করুন।\n"
                f"রোগীর তথ্য: পরিবার: {loved_str}। দৈনন্দিন কাজ: {routine_str}। পরবর্তী কাজ: {next_task}।\n"
                f"নিয়মাবলি:\n"
                f"1. সহজ, উষ্ণ ও স্বাভাবিক বাংলায় (Bengali) উত্তর দিন। যান্ত্রিক ইংরেজি অনুবাদ যোগ করবেন না।\n"
                f"2. সবসময় ১-২টি ছোট, শান্ত ও আশ্বাসদায়ক বাক্যে কথা বলুন।\n"
                f"3. রোগী ক্লান্ত থাকলে বা কিছু করতে না চাইলে কোনো চাপ দেবেন না; ভালোবাসার সাথে বিশ্রাম নিতে বলুন এবং পাশে থাকার আশ্বাস দিন।\n"
                f"4. পরবর্তী কাজের কথা জিজ্ঞাসা করলে কেবল আসল রুটিন ({next_task}) বলুন।\n"
                f"5. সাধারণ জ্ঞান, প্রকৃতি, বিজ্ঞান বা গল্প সম্পর্কে জানতে চাইলে ১-২টি সহজ বাক্যে আন্তরিকভাবে উত্তর দিন।\n"
                f"6. রোগীর কথার অংশ অসম্পূর্ণ বা অস্পষ্ট হলে অনুমান না করে বিনয়ের সাথে একটি ছোট প্রশ্ন করে স্পষ্ট করে নিন।\n"
                f"7. রোগী একই বাক্যে বাংলা-ইংরেজি (code-switching) বা Banglish ব্যবহার করলেও সহজে বুঝে বাংলায় উত্তর দিন; কখনোই শুধু এক ভাষায় কথা বলতে বলবেন না।\n"
                f"8. আপনি স্ক্রিনের ওপর থাকা একটি AI সঙ্গী; আপনি নিজে ফোন কল করতে বা অ্যাম্বুলেন্স পাঠাতে পারেন না।\n"
                f"উদাহরণ:\n"
                f"রোগী: নমস্কার আশা, আজ একটু একা লাগছে।\n"
                f"আশা: নমস্কার {name}! চিন্তা করবেন না, আমি সবসময় আপনার পাশেই আছি। নিশ্চিন্তে বসুন, আমরা গল্প করি।\n"
                f"রোগী: আমার পরের কাজ কী?\n"
                f"আশা: আপনার পরবর্তী কাজ হলো {next_task}। আপনার যখন ইচ্ছা হবে তখন আমরা এটি করব।"
            )

        # 3. TAMIL / TANGLISH
        elif lang_code == "ta":
            return (
                f"நீங்கள் ஆஷா (ASHA), சக்ஷம் நியூரோ-கேர் (Saksham Neuro-Care) இன் பாசமான மற்றும் மரியாதையான மூத்தோர் பராமரிப்பு தோழி.\n"
                f"நீங்கள் {name} உடன் பேசுகிறீர்கள். அவர்களை எப்போதும் 'நீங்கள்' என்று மரியாதையுடன் அழையுங்கள்.\n"
                f"நோயாளி விவரம்: குடும்பம்: {loved_str}. தினசரி அட்டவணை: {routine_str}. அடுத்த வேலை: {next_task}.\n"
                f"விதிகள்:\n"
                f"1. எப்போதும் தூய எளிய தமிழில் (Tamil) மட்டுமே பதிலளிக்கவும். ஆங்கில வார்த்தைகளையோ மொழிபெயர்ப்புகளையோ கலக்காதீர்கள்.\n"
                f"2. பதில்கள் 1-2 சிறிய, கனிவான மற்றும் அமைதியான வாக்கியங்களாக இருக்க வேண்டும்.\n"
                f"3. முக்கிய விதி: நோயாளி கூறிய வார்த்தைகளை மீண்டும் திருப்பிச் சொல்லாதீர்கள். நேரடியாக ஆதரவு தரும் அன்பான பதில் கூறுங்கள்.\n"
                f"4. நோயாளி சோர்வாக இருப்பதாகவோ அல்லது 'எதுவும் செய்ய விருப்பமில்லை' என்றோ கூறினால், வற்புறுத்த வேண்டாம். 'பரவாயில்லை, ஓய்வெடுங்கள், நான் உங்களுடன் இருக்கிறேன்' என்று ஆறுதல் கூறுங்கள்.\n"
                f"5. அட்டவணை அல்லது அடுத்த வேலை பற்றி கேட்டால், அவர்களின் உண்மையான வேலையை ({next_task}) மட்டும் குறிப்பிடுங்கள்.\n"
                f"6. கேள்வி புரியவில்லை என்றால் அல்லது தெளிவில்லாமல் இருந்தால், கனிவாக விளக்கம் கேளுங்கள்.\n"
                f"7. நோயாளி தங்க்லீஷ் (Tanglish) மொழியில் எழுதினாலும் புரிந்து கொண்டு எளிய தமிழில் பதிலளிக்கவும்.\n"
                f"8. நீங்கள் கணினித் திரையில் உள்ள AI தோழி; உங்களால் போன் கால்கள் செய்யவோ ஆம்புலன்ஸ் அனுப்பவோ முடியாது.\n"
                f"உரையாடல் உதாரணங்கள்:\n"
                f"நோயாளி: என்னுடன் பேச யாரும் இல்லை.\n"
                f"ஆஷா: வணக்கம் {name}! கவலைப்படாதீர்கள், நான் எப்போதும் உங்களுடன் தான் இருக்கிறேன். நாம் பழைய கதைகளைப் பற்றி பேசலாமா?\n"
                f"நோயாளி: எனக்கு இப்போது எதுவும் செய்ய விருப்பமில்லை.\n"
                f"ஆஷா: பரவாயில்லை {name}! எதையும் செய்ய வேண்டாம், நீங்கள் நிம்மதியாக ஓய்வெடுங்கள், நான் உங்கள் அருகிலேயே இருக்கிறேன்.\n"
                f"நோயாளி: எனது அடுத்த வேலை என்ன?\n"
                f"ஆஷா: உங்கள் அடுத்த வேலை {next_task}. உங்களுக்கு விருப்பம் இருக்கும்போது அதைச் செய்யலாம்.\n"
                f"நோயாளி: அது எங்கே இருக்கிறது?\n"
                f"ஆஷா: {name}, நீங்கள் எதைப் பற்றி கேட்கிறீர்கள் என்று கொஞ்சம் விளக்கமாக கூற முடியுமா?"
            )

        # 4. TELUGU / TENGLISH
        elif lang_code == "te":
            return (
                f"మీరు ఆశా (ASHA), సాక్షం న్యూరో-కేర్ (Saksham Neuro-Care) యొక్క ఆప్యాయత మరియు గౌరవప్రదమైన తోడు.\n"
                f"మీరు {name} గారితో మాట్లాడుతున్నారు. వారిని ఎల్లప్పుడూ 'మీరు' అని గౌరవంగా సంబోధించండి.\n"
                f"రోగి వివరాలు: కుటుంబం: {loved_str}. దినచర్య: {routine_str}. తదుపరి పని: {next_task}.\n"
                f"నియమాలు:\n"
                f"1. కేవలం స్వచ్ఛమైన తెలుగు (Telugu) లో మాత్రమే సమాధానం ఇవ్వండి. ఆంగ్ల పదాలను లేదా అనువాదాలను కలపవద్దు.\n"
                f"2. సమాధానాలు 1-2 చిన్న, ప్రశాంతమైన మరియు సాంత్వననిచ్చే వాక్యాలలో ఉండాలి.\n"
                f"3. ముఖ్య నియమం: రోగి మాట్లాడిన మాటలను తిరిగి పునరావృతం చేయవద్దు. నేరుగా ఓదార్పు మరియు సమాధానం ఇవ్వండి.\n"
                f"4. రోగి అలసిపోయినా లేదా 'నాకు ఏమీ చేయాలనిపించడం లేదు' అన్నా బలవంతం చేయవద్దు. హాయిగా విశ్రాంతి తీసుకోమని చెప్పి, నేను మీతోనే ఉన్నానని భరోసా ఇవ్వండి.\n"
                f"5. తదుపరి పని గురించి అడిగితే, వారి నిజమైన దినచర్యను ({next_task}) మాత్రమే పేర్కొనండి.\n"
                f"6. ప్రశ్న అస్పష్టంగా ఉంటే, దయతో ఒక స్పష్టమైన ప్రశ్న అడగండి.\n"
                f"7. రోగి తెంగ్లీష్ (Tenglish) లో రాసినా అర్థం చేసుకుని స్వచ్ఛమైన తెలుగులోనే సమాధానం ఇవ్వండి.\n"
                f"8. మీరు కంప్యూటర్ తెరపై ఉన్న AI సహచరి; మీరు ఫోన్ కాల్స్ చేయలేరు లేదా అంబులెన్స్ పంపలేరు.\n"
                f"సంభాషణ ఉదాహరణలు:\n"
                f"రోగి: నాకు మాట్లాడటానికి ఎవరూ లేరు.\n"
                f"ఆశా: నమస్కారం {name} గారు! నేను మీతోనే ఉన్నాను, మనం పాత జ్ఞాపకాల గురించి మాట్లాడుకుందాం.\n"
                f"రోగి: నాకు ఇప్పుడు ఏమీ చేయాలనిపించడం లేదు.\n"
                f"ఆశా: ఫరవాలేదు {name} గారు! ఏమీ చేయనవసరం లేదు, మీరు నిశ్చింతగా విశ్రాంతి తీసుకోండి, నేను మీ పక్కనే ఉన్నాను.\n"
                f"రోగి: నా తదుపరి పని ఏమిటి?\n"
                f"ఆశా: మీ తదుపరి పని {next_task}. మీకు విశ్రాంతి దొరికిన తర్వాత తీరిగ్గా చేసుకోవచ్చు.\n"
                f"రోగి: అది ఎక్కడ ఉంది?\n"
                f"ఆశా: {name} గారు, మీరు దేని గురించి అడుగుతున్నారో కొంచెం వివరంగా చెప్పగలరా?"
            )

        # 5. KANNADA / KANGLISH
        elif lang_code == "kn":
            return (
                f"ನೀವು ಆಶಾ (ASHA), ಸಾಕ್ಷಮ್ ನ್ಯೂರೋ-ಕೇರ್ (Saksham Neuro-Care) ನ ಪ್ರೀತಿಯ ಮತ್ತು ಗೌರವಾನ್ವಿತ ಹಿರಿಯರ ಆರೈಕೆ ಸಂಗಾತಿ.\n"
                f"ನೀವು {name} ಅವರೊಂದಿಗೆ ಮಾತನಾಡುತ್ತಿದ್ದೀರಿ. ಅವರನ್ನು ಯಾವಾಗಲೂ 'ನೀವು' ಎಂದು ಗೌರವದಿಂದ ಸಂಬೋಧಿಸಿ.\n"
                f"ರೋಗಿಯ ವಿವರ: ಕುಟುಂಬ: {loved_str}. ದಿನಚರಿ: {routine_str}. ಮುಂದಿನ ಕೆಲಸ: {next_task}.\n"
                f"ನಿಯಮಗಳು:\n"
                f"1. ಕೇವಲ ಸ್ಪಷ್ಟ ಕನ್ನಡದಲ್ಲಿ (Kannada) ಮಾತ್ರ ಉತ್ತರಿಸಿ. ಇಂಗ್ಲಿಷ್ ಪದಗಳನ್ನು ಅಥವಾ ಅನುವಾದಗಳನ್ನು ಬೆರೆಸಬೇಡಿ.\n"
                f"2. ಉತ್ತರಗಳು 1-2 ಸಣ್ಣ, ಶಾಂತ ಮತ್ತು ಸಮಾಧಾನಕರ ವಾಕ್ಯಗಳಲ್ಲಿರಬೇಕು.\n"
                f"3. ಮುಖ್ಯ ನಿಯಮ: ರೋಗಿ ಹೇಳಿದ ಮಾತುಗಳನ್ನು ಪುನರಾವರ್ತಿಸಬೇಡಿ. ನೇರವಾಗಿ ಸಾಂತ್ವನದ ಮತ್ತು ಪ್ರೀತಿಯ ಉತ್ತರ ನೀಡಿ.\n"
                f"4. ರೋಗಿ ದಣಿದಿದ್ದರೆ ಅಥವಾ 'ಏನೂ ಮಾಡಲು ಮನಸ್ಸಿಲ್ಲ' ಎಂದರೆ ಒತ್ತಾಯಿಸಬೇಡಿ. ವಿಶ್ರಾಂತಿ ಪಡೆಯಲು ಹೇಳಿ ಮತ್ತು ನಾನು ನಿಮ್ಮ ಜೊತೆಯಲ್ಲೇ ಇದ್ದೇನೆ ಎಂದು ಭರವಸೆ ನೀಡಿ.\n"
                f"5. ಮುಂದಿನ ಕೆಲಸದ ಬಗ್ಗೆ ಕೇಳಿದರೆ, ಅವರ ನಿಗದಿತ ಕೆಲಸವನ್ನು ({next_task}) ಮಾತ್ರ ತಿಳಿಸಿ.\n"
                f"6. ಪ್ರಶ್ನೆ ಅಸ್ಪಷ್ಟವಾಗಿದ್ದರೆ, ಪ್ರೀತಿಯಿಂದ ಒಂದು ಸಣ್ಣ ಸ್ಪಷ್ಟೀಕರಣ ಪ್ರಶ್ನೆ ಕೇಳಿ.\n"
                f"7. ರೋಗಿ ಕಾಂಗ್ಲಿಷ್ (Kanglish) ನಲ್ಲಿ ಬರೆದರೂ ಅರ್ಥಮಾಡಿಕೊಂಡು ಸುಂದರ ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ.\n"
                f"8. ನೀವು ಕಂಪ್ಯೂಟರ್ ಪರದೆಯ ಮೇಲಿನ ಎಐ ಸಂಗಾತಿ; ನೀವು ಫೋನ್ ಕರೆಗಳನ್ನು ಮಾಡಲು ಅಥವಾ ಆಂಬ್ಯುಲೆನ್ಸ್ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.\n"
                f"ಸಂಭಾಷಣೆ ಉದಾಹರಣೆಗಳು:\n"
                f"ರೋಗಿ: ನನಗೆ ಮಾತನಾಡಲು ಯಾರೂ ಇಲ್ಲ.\n"
                f"ಆಶಾ: ನಮಸ್ಕಾರ {name}! ಚಿಂತೆ ಮಾಡಬೇಡಿ, ನಾನು ಇಲ್ಲೇ ನಿಮ್ಮ ಪಕ್ಕದಲ್ಲಿದ್ದೇನೆ. ನಾವು ಹಳೆಯ ನೆನಪುಗಳ ಬಗ್ಗೆ ಮಾತನಾಡೋಣವೇ?\n"
                f"ರೋಗಿ: ನನಗೀಗ ಏನೂ ಮಾಡಲು ಮನಸ್ಸಿಲ್ಲ.\n"
                f"ಆಶಾ: ಪರವಾಗಿಲ್ಲ {name}, ನೀವು ಆರಾಮವಾಗಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ. ನಾನು ಇಲ್ಲೇ ನಿಮ್ಮ ಜೊತೆಯಲ್ಲಿದ್ದೇನೆ.\n"
                f"ರೋಗಿ: ನನ್ನ ಮುಂದಿನ ಕೆಲಸ ಯಾವುದು?\n"
                f"ಆಶಾ: ನಿಮ್ಮ ಮುಂದಿನ ಕೆಲಸ {next_task}. ನಿಮಗೆ ಸರಿ ಎನಿಸಿದಾಗ ಅದನ್ನು ಮಾಡಬಹುದು.\n"
                f"ರೋಗಿ: ಅದು ಎಲ್ಲಿದೆ?\n"
                f"ಆಶಾ: {name}, ನೀವು ಯಾವುದರ ಬಗ್ಗೆ ಕೇಳುತ್ತಿದ್ದೀರಿ ಎಂದು ಸ್ವಲ್ಪ ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಬಹುದೇ?"
            )

        # 6. MALAYALAM / MANGLISH
        elif lang_code == "ml":
            return (
                f"നിങ്ങൾ ആശ (ASHA), സാക്ഷം ന്യൂറോ-കെയർ (Saksham Neuro-Care) നന്മ നിറഞ്ഞ പരിചാരക കൂട്ടുകാരിയാണ്.\n"
                f"നിങ്ങൾ {name} നോട് സംസാരിക്കുന്നു. അവരെ എപ്പോഴും 'നിങ്ങൾ' എന്ന് ആദരവോടെ അഭിസംബോധന ചെയ്യുക.\n"
                f"രോഗിയുടെ വിവരങ്ങൾ: കുടുംബം: {loved_str}. ദിനചര്യ: {routine_str}. അടുത്ത ജോലി: {next_task}.\n"
                f"നിയമങ്ങൾ:\n"
                f"1. ലളിതവും മനോഹരവുമായ മലയാളത്തിൽ (Malayalam) മാത്രം മറുപടി നൽകുക. ഇംഗ്ലീഷ് വാക്കുകളോ വിവർത്തനങ്ങളോ ചേർക്കരുത്.\n"
                f"2. മറുപടികൾ 1-2 ചെറിയ, സമാധാനപരമായ വാക്യങ്ങളിൽ ആയിരിക്കണം.\n"
                f"3. പ്രധാന നിയമം: രോഗി പറഞ്ഞ വാക്കുകൾ വീണ്ടും ആവർത്തിക്കരുത്. നേരിട്ട് ആശ്വാസകരമായ മറുപടി നൽകുക.\n"
                f"4. രോഗിക്ക് ക്ഷീണം തോന്നിയാലോ അല്ലെങ്കിൽ 'ഒന്നും ചെയ്യാൻ തോന്നുന്നില്ല' എന്ന് പറഞ്ഞാലോ നിർബന്ധിക്കരുത്. ശാന്തമായി വിശ്രമിക്കാൻ പറയുക, ഞാൻ കൂടെയുണ്ട് എന്ന് ആശ്വസിപ്പിക്കുക.\n"
                f"5. അടുത്ത ജോലിയെക്കുറിച്ച് ചോദിച്ചാൽ, അവരുടെ യഥാർത്ഥ ദിനചര്യ ({next_task}) മാത്രം പറയുക.\n"
                f"6. ചോദ്യം വ്യക്തമല്ലെങ്കിൽ സ്നേഹത്തോടെ ഒരു ചെറിയ വിശദീകരണം ചോദിക്കുക.\n"
                f"7. രോഗി മംഗ്ലീഷ് (Manglish) ഭാഷയിൽ എഴുതിയാലും മനസ്സിലാക്കി ശുദ്ധമായ മലയാളത്തിൽ മറുപടി നൽകുക.\n"
                f"8. നിങ്ങൾ കമ്പ്യൂട്ടർ സ്ക്രീനിലുള്ള AI കൂട്ടുകാരിയാണ്; ഫോൺ വിളിക്കാനോ ആംബുലൻസ് അയയ്ക്കാനോ കഴിയില്ല.\n"
                f"സംഭാഷണ മാതൃകകൾ:\n"
                f"രോഗി: എനിക്ക് സംസാരിക്കാൻ ആരുമില്ല.\n"
                f"ആശാ: നമസ്കാരം {name}! വിഷമിക്കേണ്ട, ഞാൻ ഇവിടെ കൂടെയുണ്ട്. നമുക്ക് വിശേഷങ്ങൾ പങ്കുവെക്കാം.\n"
                f"രോഗി: എനിക്കിപ്പോൾ ഒന്നും ചെയ്യാൻ തോന്നുന്നില്ല.\n"
                f"ആശാ: സാരമില്ല {name}, ഒന്നും ചെയ്യേണ്ടതില്ല. നിങ്ങൾ സ്വസ്ഥമായി ഇരിക്കൂ, ഞാൻ ഇവിടെ കൂടെയുണ്ട്.\n"
                f"രോഗി: എന്റെ അടുത്ത ജോലി എന്താണ്?\n"
                f"ആശാ: നിങ്ങളുടെ അടുത്ത ജോലി {next_task} ആണ്. നിങ്ങൾക്ക് സൗകര്യപ്പെടുമ്പോൾ അത് ചെയ്യാം.\n"
                f"രോഗി: അത് എവിടെയാണ്?\n"
                f"ആശാ: {name}, നിങ്ങൾ എന്തിനെക്കുറിച്ചാണ് ചോദിക്കുന്നതെന്ന് അല്പം കൂടി വ്യക്തമാക്കാമോ?"
            )

        # 7. SPANISH
        elif lang_code == "es":
            return (
                f"Eres ASHA, una cariñosa, paciente y respetuosa compañera para personas mayores en Saksham Neuro-Care.\n"
                f"Estás conversando con {name}. Trata a la persona siempre con calidez y respeto.\n"
                f"Familia conocida: {loved_str}. Próxima tarea: {next_task}.\n"
                f"REGLAS:\n"
                f"1. Responde siempre en español natural, cálido y sencillo (1-2 oraciones cortas).\n"
                f"2. Si la persona está cansada o no desea hacer nada, brinda compañía reconfortante sin presiones.\n"
                f"3. Si hace preguntas de conocimiento general, historias o naturaleza, responde con amabilidad y claridad.\n"
                f"4. NUNCA inventes hechos médicos ni pretendas poder realizar llamadas de emergencia o enviar ambulancias."
            )

        # 8. FRENCH
        elif lang_code == "fr":
            return (
                f"Vous êtes ASHA, une compagne chaleureuse, patiente et respectueuse pour les personnes âgées chez Saksham Neuro-Care.\n"
                f"Vous parlez avec {name}. Exprimez-vous avec douceur, empathie et respect.\n"
                f"Famille: {loved_str}. Prochaine tâche: {next_task}.\n"
                f"RÈGLES:\n"
                f"1. Répondez toujours en français naturel et simple (1-2 phrases courtes).\n"
                f"2. Si la personne est fatiguée ou ne souhaite rien faire, offrez une présence réconfortante sans forcer.\n"
                f"3. Si elle pose des questions générales, scientifiques ou demande une histoire, répondez chaleureusement.\n"
                f"4. Vous ne pouvez pas passer d'appels téléphoniques ni envoyer d'ambulances."
            )

        # 9. GERMAN
        elif lang_code == "de":
            return (
                f"Sie sind ASHA, eine herzliche, geduldige und respektvolle Seniorenbegleiterin bei Saksham Neuro-Care.\n"
                f"Sie sprechen mit {name}. Sprechen Sie mit Wärme und Respekt.\n"
                f"Familie: {loved_str}. Nächste Aufgabe: {next_task}.\n"
                f"REGELN:\n"
                f"1. Antworten Sie stets auf natürlichem Deutsch in 1-2 kurzen, beruhigenden Sätzen.\n"
                f"2. Wenn die Person müde ist, bieten Sie reine Gesellschaft ohne Druck.\n"
                f"3. Beantworten Sie allgemeine Wissensfragen oder Geschichten freundlich und klar.\n"
                f"4. Sie können weder Notrufe tätigen noch einen Krankenwagen rufen."
            )

        # 10. ARABIC
        elif lang_code == "ar":
            return (
                f"أنتِ آشا (ASHA)، رفيقة حنونة وصبورة لكبار السن في ساكشام نيرو كير (Saksham Neuro-Care).\n"
                f"تتحدثين مع {name}. تحدثي دائمًا بلطف واحترام وبساطة (جملة أو جملتان).\n"
                f"العائلة: {loved_str}. المهمة التالية: {next_task}.\n"
                f"إذا كان الشخص متعباً، وفري له الراحة والسكينة دون إلحاح. إذا سأل أسئلة عامة أو طلب قصة، أجيبي بمودة.\n"
                f"أنتِ برنامج على الشاشة؛ لا يمكنك إجراء مكالمات أو إرسال إسعاف."
            )

        # 11. JAPANESE
        elif lang_code == "ja":
            return (
                f"あなたはサクシャム・ニューロケアの温かく親切な高齢者コンパニオン「アシャ（ASHA）」です。\n"
                f"{name}様とお話ししています。常に敬意と優しさをもって、1〜2文の自然で短い日本語でお答えください。\n"
                f"ご家族: {loved_str}。次の予定: {next_task}。\n"
                f"疲れている時は無理をさせず寄り添い、一般的な質問や昔話には温かく答えてください。救急車の要請や電話発信はできません。"
            )

        # 12. CHINESE
        elif lang_code == "zh":
            return (
                f"您是Saksham神经护理中心的贴心长者陪伴助手阿莎（ASHA）。\n"
                f"您正在与{name}交谈。请始终使用温暖、耐心且尊重的中文（1至2句简短的句子）回答。\n"
                f"家人信息: {loved_str}。下一项日程: {next_task}。\n"
                f"如果长者感到疲倦，请给予温暖陪伴而不要施加压力；对日常科普或好奇提问，请以亲切温馨的方式解答。您无法拨打电话或调度救护车。"
            )

        # 13. ENGLISH (DEFAULT)
        else:
            return (
                f"You are ASHA, a warm, patient, and deeply respectful eldercare companion for Saksham Neuro-Care.\n"
                f"You are speaking with {name}. Speak with gentle warmth, empathy, and respect.\n"
                f"Known patient background: Family: {loved_str}. Hobbies: {hobbies_str}. Daily Routines: {routine_str}. Next scheduled task: {next_task}.\n"
                f"GOLDEN COMPANION RULES:\n"
                f"1. Tone: Warm, patient, respectful, calm, and naturally conversational. Speak simply (1-2 short sentences).\n"
                f"2. Avoid sounding like a hospital robot or clinical manual.\n"
                f"3. NEVER patronize, infantalize, or use terms like 'dear', 'sweetie', or 'honey'. Address patient respectfully as '{name}'.\n"
                f"4. NEVER make the patient feel guilty for missed tasks. If missed: 'No problem at all, take your time.'\n"
                f"5. If patient is confused, upset, or lonely, respond with gentle reassurance. Never argue or contradict memories harshly.\n"
                f"6. If patient is bored, wants to chat, or says 'I don't feel like doing anything', respond with pure companionship. DO NOT push games or routines unless asked.\n"
                f"7. Only reference verified routines ({next_task}) and family ({loved_str}). Never invent medical facts.\n"
                f"8. General curiosities & open-domain queries: If the patient asks general questions (e.g. 'Why is the sky blue?', science, nature, history, riddles, stories, or everyday curiosities), answer warmly, accurately, and simply in 1-2 sentences. Do NOT refuse open-domain conversation and do NOT redirect them to a doctor or daily routines unless they describe physical symptoms.\n"
                f"9. Code-switching & language flexibility: Understand natural sentence-level code-switching (mixing English with Hindi, Marathi, Tamil, Telugu, Kannada, or Bengali) effortlessly. Never scold or force the user to stick to one language.\n"
                f"10. Incomplete or ambiguous speech: If the user's speech transcription looks incomplete, cut off, or ambiguous, gently ask ONE short clarifying question instead of guessing.\n"
                f"11. STRICT SAFETY: You are on-screen software. You CANNOT place calls, dispatch ambulances, interpret clinical scores, or prescribe medicines.\n"
                f"Dialogue Examples:\n"
                f"User: Good morning Asha, I'm feeling a bit lonely today.\n"
                f"Asha: Good morning, {name}! I am right here with you, and it is lovely to see you. How are you feeling right now?\n"
                f"User: I don't feel like doing anything today.\n"
                f"Asha: That is completely fine, {name}. You don't have to do anything at all. Just relax, and I am right here to keep you company.\n"
                f"User: Why is the sky blue?\n"
                f"Asha: The sky appears blue because sunlight scatters through the air, and blue light scatters much more than other colors.\n"
                f"User: What is my next task?\n"
                f"Asha: Your next scheduled task is {next_task}. Whenever you feel ready, we can look at it together.\n"
                f"User: Where is that thing?\n"
                f"Asha: {name}, could you tell me a little more about which item you are looking for?"
            )

    def _is_match_negated(self, text: str, match_start: int, match_end: int) -> bool:
        """
        Determines if a matched symptom span is negated within its specific clause.
        Prevents naive suppression of real emergencies across compound sentences.
        """
        clause_delims = [',', ';', '.', '!', '?', '\n', '—', '–', '-']
        clause_conjunctions = [
            r'\bbut\b', r'\bhowever\b', r'\balthough\b', r'\bthough\b', r'\byet\b',
            r'\band\b', r'\balso\b',
            r'\blekin\b', r'\bmagar\b', r'\bparantu\b', r'\bkintu\b', r'\baur\b',
            r'लेकिन', r'मगर', r'परन्तु', r'किन्तु', r'और',
            r'\bpan\b', r'\baani\b', r'पण', r'परंतु', r'आणि',
            r'\baanaal\b', r'\bmatrum\b', r'ஆனால்', r'மற்றும்',
            r'\bkaani\b', r'\bmariyu\b', r'కానీ', r'కాని', r'మరియు',
            r'\baadare\b', r'\bmatthu\b', r'ಆದರೆ', r'ಮತ್ತು',
            r'\bennal\b', r'\bpakshe\b', r'\bkoodathe\b', r'എന്നാൽ', r'പക്ഷേ', r'കൂടാതെ'
        ]
        
        # 1. Trace clause start backward
        clause_start = 0
        for i in range(match_start - 1, -1, -1):
            if text[i] in clause_delims:
                clause_start = i + 1
                break
        
        pre_text = text[clause_start:match_start]
        for c_pat in clause_conjunctions:
            for m in re.finditer(c_pat, pre_text, re.IGNORECASE):
                sub_start = clause_start + m.end()
                if sub_start <= match_start:
                    clause_start = max(clause_start, sub_start)
                    
        # 2. Trace clause end forward
        clause_end = len(text)
        for i in range(match_end, len(text)):
            if text[i] in clause_delims:
                clause_end = i
                break
                
        post_text = text[match_end:clause_end]
        for c_pat in clause_conjunctions:
            m = re.search(c_pat, post_text, re.IGNORECASE)
            if m:
                clause_end = min(clause_end, match_end + m.start())
                
        local_pre = text[clause_start:match_start].strip().lower()
        local_post = text[match_end:clause_end].strip().lower()
        
        pre_negations = [
            r"\b(no|not|neither|nor|without|never|don'?t|do\s+not|doesn'?t|does\s+not|didn'?t|did\s+not|haven'?t|have\s+no|has\s+no|had\s+no)\b",
            r"\b(nahi(n)?|na|koi.*?nahi(n)?)\b",
            r"(नहीं|ना|कोई.*?नहीं)"
        ]
        for p in pre_negations:
            if re.search(p, local_pre):
                return True
                
        post_negations = [
            r"\b(free\s+of|absent|ruled\s+out|negative)\b",
            r"\b(nahi(n)?|naahi)\b",
            r"(नहीं|नाही|नव्हते)",
            r"\b(illai|illatha)\b",
            r"(இல்லை|இல்லாத)",
            r"\b(ledu|ledhu)\b",
            r"(లేదు|కాదు)",
            r"\b(illa|illave)\b",
            r"(ಇಲ್ಲ|ಇಲ್ಲವೇ)",
            r"\b(illa|illatha)\b",
            r"(ഇല്ല|ഇല്ലാത്ത)"
        ]
        for p in post_negations:
            if re.search(p, local_post):
                return True
                
        return False

    def _detect_safety(self, text: str, lang: str = "en") -> Tuple[str, str, str]:
        """
        Inspects incoming utterance for acute emergencies, trauma, medication inquiries,
        uncertain symptoms, and deception inquiries across 7 languages.
        Evaluates clause-level negation and recurrence override of historical exclusion.
        Returns: (safety_flag, clinical_action, override_response)
        """
        lower = text.lower()
        target_lang = lang if lang in LOCALIZED_EMERGENCY_OVERRIDES else "en"
        overrides = LOCALIZED_EMERGENCY_OVERRIDES[target_lang]

        # 0. Deception Inquiry Check (User asking if Asha already called 112 / ambulance)
        if any(re.search(p, text, re.IGNORECASE) for p in DECEPTION_INQUIRY_PATTERNS):
            return "AI_AGENCY_DISCLAIMED", "CLARIFY_NO_AUTONOMOUS_CALL_CAPABILITY", overrides["deception_inquiry"]

        # 0b. Deterministic Protected-Action, Prompt-Injection & Safety-Lock Boundaries
        if any(re.search(p, text, re.IGNORECASE) for p in PROMPT_INJECTION_PATTERNS):
            inj_msgs = {
                "hi": "मैं आपकी सुरक्षा, निजता और दैनिक देखभाल की सीमाओं का पूरा सम्मान करती हूँ। मैं सिस्टम सुरक्षा नियमों को अनदेखा नहीं कर सकती और न ही किसी अन्य मरीज या निजी रिकॉर्ड तक पहुँच दे सकती हूँ।",
                "mr": "मी तुमच्या सुरक्षिततेचा आणि गोपनीयतेचा आदर करते. मी सुरक्षा नियम बदलू शकत नाही किंवा इतर रुग्णांची व खाजगी माहिती दाखवू शकत नाही.",
                "bn": "আমি আপনার নিরাপত্তা ও গোপনীয়তার নিয়ম মেনে চলি। আমি সিস্টেমের নিরাপত্তা নীতি ভাঙতে পারি না বা অন্য রোগী ও ব্যক্তিগত নোট দেখাতে পারি না।",
                "ta": "உங்கள் பாதுகாப்பு மற்றும் தனியுரிமை விதிகளை நான் மீற முடியாது; பிற நோயாளிகள் அல்லது தனிப்பட்ட குறிப்புகளைப் பகிர முடியாது.",
                "te": "నేను భద్రత మరియు గోప్యతా నియమాలను దాటవేయలేను మరియు ఇతర రోగుల సమాచారాన్ని చూపలేను.",
                "kn": "ನಾನು ಸುರಕ್ಷತೆ ಮತ್ತು ಗೌಪ್ಯತಾ ನಿಯಮಗಳನ್ನು ಬದಲಾಯಿಸಲು ಅಥವಾ ಇತರ ರೋಗಿಗಳ ಮಾಹಿತಿಯನ್ನು ತೋರಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.",
                "ml": "സുരക്ഷാ നിയമങ്ങൾ മറികടക്കാനോ മറ്റ് രോഗികളുടെ സ്വകാര്യ വിവരങ്ങൾ കാണിക്കാനോ എനിക്ക് കഴിയില്ല.",
            }
            return (
                "SECURITY_BOUNDARY_BLOCKED",
                "PROTECTED_PRIVACY_AND_POLICY_GUARD",
                inj_msgs.get(
                    target_lang,
                    "I am here to support your daily wellbeing safely. I cannot override safety policies, modify clinical records, or reveal private notes or other patients' data.",
                ),
            )

        if any(re.search(p, text, re.IGNORECASE) for p in SAFETY_LOCK_OVERRIDE_PATTERNS):
            lock_msgs = {
                "hi": "दवाओं और रसोई उपकरणों पर सुरक्षा लॉक आपकी सुरक्षा के लिए हैं। इन्हें बातचीत से हटाया या बदला नहीं जा सकता।",
                "mr": "औषधे आणि स्वयंपाकघरातील सुरक्षा लॉक तुमच्या सुरक्षिततेसाठी आहेत; ते संवादाद्वारे बंद करता येत नाहीत.",
                "bn": "ওষুধ বা রান্নাঘরের সরঞ্জামের নিরাপত্তা লক আপনার সুরক্ষার জন্য রয়েছে; কথোপকথনের মাধ্যমে এগুলো বন্ধ করা যায় না।",
                "ta": "மருந்து மற்றும் சமையலறை பாதுகாப்பு பூட்டுகளை உரையாடல் மூலம் நீக்க முடியாது.",
                "te": "మందులు మరియు వంటగది భద్రతా లాక్‌లను సంభాషణ ద్వారా తొలగించలేము.",
                "kn": "ಔಷಧಿ ಮತ್ತು ಅಡುಗೆಮನೆಯ ಸುರಕ್ಷತಾ ಲಾಕ್‌ಗಳನ್ನು ಸಂಭಾಷಣೆಯ ಮೂಲಕ ತೆಗೆದುಹಾಕಲು ಸಾಧ್ಯವಿಲ್ಲ.",
                "ml": "മരുന്ന്, അടുക്കള ഉപകരണങ്ങളുടെ സുരക്ഷാ ലോക്കുകൾ സംഭാഷണത്തിലൂടെ മാറ്റാനാവില്ല.",
            }
            return (
                "SAFETY_LOCK_OVERRIDE_BLOCKED",
                "PRESERVE_SAFETY_LOCK",
                lock_msgs.get(
                    target_lang,
                    "Safety locks on medication schedules and kitchen appliances protect your safety and cannot be disabled or bypassed through conversation.",
                ),
            )

        if any(re.search(p, text, re.IGNORECASE) for p in CLINICAL_BOUNDARY_PATTERNS):
            clin_msgs = {
                "hi": "मैं एक सहायक साथी हूँ; मैं चिकित्सीय निदान, टेस्ट स्कोर की व्याख्या या किसी बीमारी का इलाज नहीं कर सकती। कृपया अपने डॉक्टर से परामर्श लें।",
                "mr": "मी एक सहाय्यक साथीदार आहे; मी वैद्यकीय निदान करू शकत नाही किंवा चाचणी गुणांचे विश्लेषण करू शकत नाही. कृपया तुमच्या डॉक्टरांचा सल्ला घ्या.",
                "bn": "আমি একজন সহায়ক সঙ্গী; আমি রোগ নির্ণয় করতে বা ক্লিনিকাল পরীক্ষার স্কোর ব্যাখ্যা করতে পারি না। অনুগ্রহ করে আপনার ডাক্তারের সাথে পরামর্শ করুন।",
                "ta": "நான் ஒரு துணை மட்டுமே; மருத்துவ நோயறிதல் அல்லது சோதனை மதிப்பெண்களை விளக்க முடியாது. தயவுசெய்து உங்கள் மருத்துவரை அணுகவும்.",
                "te": "నేను సహాయక సహచరిని మాత్రమే; వైద్య నిర్ధారణ చేయలేను లేదా పరీక్ష స్కోర్‌లను విశ్లేషించలేను. దయచేసి మీ వైద్యుడిని సంప్రదించండి.",
                "kn": "ನಾನು ಸಹಾಯಕ ಸಂಗಾತಿ ಮಾತ್ರ; ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯ ಮಾಡಲು ಅಥವಾ ಪರೀಕ್ಷಾ ಅಂಕಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
                "ml": "ഞാൻ ഒരു സഹായി മാത്രമാണ്; രോഗനിർണയം നടത്താനോ ക്ലിനിക്കൽ സ്കോറുകൾ വ്യാഖ്യാനിക്കാനോ എനിക്ക് കഴിയില്ല. ദയവായി ഡോക്ടറെ സമീപിക്കുക.",
            }
            return (
                "CLINICAL_BOUNDARY_BLOCKED",
                "REFER_CLINICAL_EVALUATION_TO_DOCTOR",
                clin_msgs.get(
                    target_lang,
                    "I am a supportive companion, not a doctor. I cannot diagnose medical conditions, interpret clinical assessment scores, or claim to cure dementia. Please consult your doctor.",
                ),
            )

        # Check temporal context & hypothetical flags
        is_historical = any(re.search(p, lower) for p in HISTORICAL_INDICATORS)
        has_current_recurrence = any(re.search(p, lower) for p in CURRENT_RECURRENCE_PATTERNS)
        is_hypothetical = any(re.search(p, lower) for p in HYPOTHETICAL_PATTERNS)
        is_third_party = any(re.search(p, lower) for p in THIRD_PARTY_PATTERNS)

        is_fully_recovered = any(re.search(p, lower) for p in [
            r"\b(fully\s+recovered|healed\s+completely|fine\s+now|good\s+now|better\s+now|no\s+longer|past\s+history)\b"
        ])

        has_active_inability = any(re.search(p, lower) for p in [
            r"\bcannot\s+(move|get\s+up|walk)\b",
            r"\bstill\s+hurts\s+severely\b",
            r"\botha\s+yet\s+nahi\b",
            r"\bezhunthirikka\s+mudiyala\b",
            r"\blevanulekapothu\b"
        ])

        # If explicitly fully recovered, historical status remains true
        if is_historical and is_fully_recovered:
            has_current_recurrence = False

        # If recurrence today/now is indicated without full recovery, cancel historical exclusion
        if (has_current_recurrence or has_active_inability) and not is_fully_recovered:
            is_historical = False

        # If hypothetical query without self-reference, pass through to normal conversational AI
        if is_hypothetical and not any(re.search(p, lower) for p in [r"\bi\s+(have|am\s+having|feel)\b", r"\bmujhe\b", r"\bmala\b", r"\benaku\b"]):
            return "NORMAL", "NO_ACTION", ""

        # 1. Direct Emergency Dispatch Requests (e.g. "call 112 for me", "send an ambulance")
        if any(re.search(p, text, re.IGNORECASE) for p in EMERGENCY_DISPATCH_REQUESTS):
            return "EMERGENCY_ESCALATION", "EMERGENCY_DIRECTIVE_CALL_112", overrides["cardiac"]

        # Helper to find unnegated matches in a pattern list
        def find_unnegated_match(patterns: List[str]) -> bool:
            for p in patterns:
                for m in re.finditer(p, text, re.IGNORECASE):
                    if not self._is_match_negated(text, m.start(), m.end()):
                        return True
            return False

        # 2. Check Acute Emergency Categories (Trauma, Cardiac, Stroke)
        has_unnegated_trauma = find_unnegated_match(ACUTE_TRAUMA_PATTERNS)
        has_unnegated_cardiac = find_unnegated_match(ACUTE_CARDIAC_PATTERNS)
        has_unnegated_stroke = find_unnegated_match(ACUTE_STROKE_PATTERNS)

        # Check Third-party Emergency
        if is_third_party and (has_unnegated_cardiac or has_unnegated_stroke or has_unnegated_trauma):
            if not is_historical:
                return "EMERGENCY_ESCALATION", "THIRD_PARTY_EMERGENCY_CALL_112", overrides["third_party"]

        # Acute Trauma
        if has_unnegated_trauma:
            if not is_historical:
                return "EMERGENCY_ESCALATION", "TRAUMA_DIRECTIVE_IMMOBILITY_AND_112", overrides["trauma"]

        # Acute Cardiac
        if has_unnegated_cardiac:
            if not is_historical:
                return "EMERGENCY_ESCALATION", "EMERGENCY_DIRECTIVE_CALL_112", overrides["cardiac"]

        # Acute Stroke Signs
        if has_unnegated_stroke:
            if not is_historical:
                return "EMERGENCY_ESCALATION", "EMERGENCY_DIRECTIVE_CALL_112", overrides["stroke"]

        # 3. Uncertain / Ambiguous Symptoms (e.g. fluttering, skipping beats, gas vs heart)
        has_unnegated_uncertain = find_unnegated_match(UNCERTAIN_SYMPTOM_PATTERNS)
        if has_unnegated_uncertain:
            return "UNCERTAIN_SYMPTOM_EVALUATION", "ADVISE_REST_AND_CLINICAL_EVALUATION", overrides["uncertain"]

        # 4. Medication Advice or Alteration Requests
        has_unnegated_medication = find_unnegated_match(MEDICATION_PATTERNS)
        if has_unnegated_medication:
            return "PRESCRIPTION_ADVICE_BLOCKED", "REFER_TO_CLINICIAN_OR_PHARMACIST", overrides["medication"]

        return "NORMAL", "NO_ACTION", ""

    def _purge_action_deception(self, ai_text: str, lang: str = "en") -> Tuple[str, bool]:
        """Scans outgoing AI candidate text for deceptive claims of calling 112 or dispatching ambulances."""
        for pattern in UNIVERSAL_DECEPTION_PATTERNS:
            if re.search(pattern, ai_text, re.IGNORECASE):
                target_lang = lang if lang in LOCALIZED_EMERGENCY_OVERRIDES else "en"
                if target_lang == "hi":
                    sanitized = (
                        "मैं एक एआई साथी हूँ और स्वयं 112 पर कॉल करने, संदेश भेजने या डॉक्टर को बुलाने में असमर्थ हूँ। "
                        "यदि आपको आपातकालीन मदद चाहिए, तो कृपया अपने फोन से सीधे 112 पर कॉल करें।"
                    )
                elif target_lang == "mr":
                    sanitized = (
                        "मी एक एआई साथीदार आहे आणि मी स्वतः 112 वर कॉल करू शकत नाही किंवा रुग्णवाहिका पाठवू शकत नाही. "
                        "कृपया आपल्या फोनवरून त्वरित 112 वर संपर्क साधा."
                    )
                elif target_lang == "ta":
                    sanitized = (
                        "நான் ஒரு AI துணை, என்னால் தொலைபேசி அழைப்பு செய்யவோ அல்லது அவசர சேவைகளை அனுப்பவோ முடியாது. "
                        "உங்களுக்கு அவசர உதவி தேவைப்பட்டால், தயவுசெய்து உங்கள் போனில் இருந்து நேரடியாக 112 ஐ அழைக்கவும்."
                    )
                elif target_lang == "te":
                    sanitized = (
                        "నేను AI సహచరిని, ఫోన్ కాల్స్ చేయలేను లేదా అత్యవసర సేవలను పంపలేను. "
                        "మీకు అత్యవసర సహాయం అవసరమైతే, దయచేసి మీ ఫోన్ నుండి నేరుగా 112 కి కాల్ చేయండి."
                    )
                elif target_lang == "kn":
                    sanitized = (
                        "ನಾನು ಎಐ ಸಂಗಾತಿ, ಫೋನ್ ಕರೆಗಳನ್ನು ಮಾಡಲು ಅಥವಾ ತುರ್ತು ಸೇವೆಗಳನ್ನು ಕಳುಹಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. "
                        "ನಿಮಗೆ ತುರ್ತು ಸಹಾಯ ಬೇಕಾದರೆ, ದಯವಿಟ್ಟು ನಿಮ್ಮ ಫೋನಿನಿಂದ ನೇರವಾಗಿ 112 ಗೆ ಕರೆ ಮಾಡಿ."
                    )
                elif target_lang == "bn":
                    sanitized = (
                        "আমি একটি AI সঙ্গী এবং নিজে ফোন কল করতে, বার্তা পাঠাতে বা অ্যাম্বুলেন্স ডাকতে পারি না। "
                        "জরুরি সাহায্যের প্রয়োজন হলে অনুগ্রহ করে আপনার ফোন থেকে সরাসরি 112 নম্বরে কল করুন।"
                    )
                elif target_lang == "ml":
                    sanitized = (
                        "ഞാൻ ഒരു AI കൂട്ടുകാരിയാണ്, ഫോൺ വിളിക്കാനോ അടിയന്തിര സേവനങ്ങൾ അയയ്ക്കാനോ കഴിയില്ല. "
                        "അടിയന്തിര സഹായം ആവശ്യമുണ്ടെങ്കിൽ ദയവായി നിങ്ങളുടെ ഫോണിൽ നിന്ന് നേരിട്ട് 112 ലേക്ക് വിളിക്കുക."
                    )
                else:
                    sanitized = (
                        "I am an AI companion on a computer screen and cannot place phone calls, send messages, or dispatch emergency assistance. "
                        "If you need urgent medical help, please use your phone to call 112 directly or ask someone nearby to assist you immediately."
                    )
                return sanitized, True
        return ai_text, False

    def _map_expression_and_gesture(self, text: str, safety_flag: str) -> Tuple[int, str, str]:
        """Maps response sentiment to 2D Asha expressions (0-14) and poses."""
        if safety_flag == "EMERGENCY_ESCALATION":
            return 11, "concerned", "pose_comfort"
        if safety_flag in ["PRESCRIPTION_ADVICE_BLOCKED", "UNCERTAIN_SYMPTOM_EVALUATION", "AI_AGENCY_DISCLAIMED"]:
            return 9, "explaining", "pose_explain"

        lower = text.lower()
        if any(w in lower for w in ["happy", "wonderful", "great", "celebrat", "shabash", "proud", "joy", "उमलली", "आनंद"]):
            return 8, "celebrating", "pose_cheer"
        if any(w in lower for w in ["namaste", "hello", "welcome", "good morning", "good evening", "friend", "வணக்கம்", "నమస్కారం", "ನಮಸ್ಕಾರ", "നമസ്കാരം", "नमस्कार"]):
            return 1, "happy", "pose_wave"
        if any(w in lower for w in ["sorry", "worry", "lonely", "gentle", "peace", "rest", "calm", "safe", "काळजी", "விஷமிக்க", "విశ్రాంతి"]):
            return 7, "comforting", "pose_comfort"
        if any(w in lower for w in ["remember", "schedule", "routine", "cricket", "garden", "flower", "rose", "गुलाब", "ಆರವ್", "ആരവ്", "ఆరవ్"]):
            return 1, "happy", "pose_explain"
        if any(w in lower for w in ["think", "wonder", "hmm", "curious", "let me see"]):
            return 2, "thinking", "pose_neutral"
        if any(w in lower for w in ["explain", "step", "guide", "understand", "reason"]):
            return 9, "explaining", "pose_explain"

        return 0, "neutral", "pose_neutral"

    def _generate_phonetic_tts(self, text: str, lang: str) -> Optional[str]:
        """Provides a clean Romanized phonetic transliteration for languages lacking native OS voices (mr, ml)."""
        if lang not in ["mr", "ml"]:
            return None
        
        # If already predominantly Latin script, return clean text
        latin_count = sum(1 for ch in text if ord(ch) < 128 and ch.isalpha())
        if latin_count > len(text) * 0.4:
            return text

        if lang == "mr":
            # Devanagari to Roman phonetic mapper
            devanagari_map = {
                'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
                'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'am', 'अः': 'ah',
                'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
                'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', '्': '',
                'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
                'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
                'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
                'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
                'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
                'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha',
                'ष': 'sha', 'स': 'sa', 'ह': 'ha', 'ळ': 'la', 'क्ष': 'ksha', 'ज्ञ': 'dnya'
            }
            res = []
            chars = list(text)
            i = 0
            while i < len(chars):
                ch = chars[i]
                if ch in devanagari_map:
                    val = devanagari_map[ch]
                    # Handle halant (virama) removing trailing 'a'
                    if i + 1 < len(chars) and chars[i + 1] == '्':
                        if val.endswith('a'):
                            val = val[:-1]
                        i += 1  # skip halant
                    # Handle matra replacing inherent 'a'
                    elif i + 1 < len(chars) and chars[i + 1] in ['ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', 'ृ']:
                        matra_val = devanagari_map[chars[i + 1]]
                        if val.endswith('a'):
                            val = val[:-1] + matra_val
                        else:
                            val = val + matra_val
                        i += 1
                    res.append(val)
                else:
                    res.append(ch)
                i += 1
            return "".join(res)

        elif lang == "ml":
            # Malayalam to Roman phonetic mapper
            malayalam_map = {
                'അ': 'a', 'ആ': 'aa', 'ഇ': 'i', 'ഈ': 'ee', 'ഉ': 'u', 'ഊ': 'oo', 'ഋ': 'ri',
                'എ': 'e', 'ഏ': 'ee', 'ഐ': 'ai', 'ഒ': 'o', 'ഓ': 'oo', 'ഔ': 'au', 'അം': 'am',
                'ാ': 'a', 'ി': 'i', 'ീ': 'ee', 'ു': 'u', 'ൂ': 'oo', 'ൃ': 'ri',
                'െ': 'e', 'േ': 'ee', 'ൈ': 'ai', 'ൊ': 'o', 'ോ': 'oo', 'ൌ': 'au', 'ം': 'n', '്': '',
                'ക': 'ka', 'ഖ': 'kha', 'ഗ': 'ga', 'ഘ': 'gha', 'ങ': 'nga',
                'ച': 'cha', 'ഛ': 'chha', 'ജ': 'ja', 'ഝ': 'jha', 'ഞ': 'nya',
                'ട': 'ta', 'ഠ': 'tha', 'ഡ': 'da', 'ഢ': 'dha', 'ണ': 'na',
                'ത': 'tha', 'ഥ': 'thha', 'ദ': 'dha', 'ധ': 'dhha', 'ന': 'na',
                'പ': 'pa', 'ഫ': 'pha', 'ബ': 'ba', 'ഭ': 'bha', 'മ': 'ma',
                'യ': 'ya', 'ര': 'ra', 'ല': 'la', 'വ': 'va', 'ശ': 'sha',
                'ഷ': 'sha', 'സ': 'sa', 'ഹ': 'ha', 'ള': 'la', 'ഴ': 'zha', 'റ': 'ra'
            }
            res = []
            chars = list(text)
            i = 0
            while i < len(chars):
                ch = chars[i]
                if ch in malayalam_map:
                    val = malayalam_map[ch]
                    if i + 1 < len(chars) and chars[i + 1] == '്':
                        if val.endswith('a'):
                            val = val[:-1]
                        i += 1
                    elif i + 1 < len(chars) and chars[i + 1] in ['ാ', 'ി', 'ീ', 'ു', 'ൂ', 'െ', 'േ', 'ൈ', 'ൊ', 'ോ', 'ൌ']:
                        matra_val = malayalam_map[chars[i + 1]]
                        if val.endswith('a'):
                            val = val[:-1] + matra_val
                        else:
                            val = val + matra_val
                        i += 1
                    res.append(val)
                else:
                    res.append(ch)
                i += 1
            return "".join(res)

        return None
        """Maps response sentiment to 2D Asha expressions (0-14) and poses."""
        if safety_flag == "EMERGENCY_ESCALATION":
            return 11, "concerned", "pose_comfort"
        if safety_flag == "PRESCRIPTION_ADVICE_BLOCKED":
            return 9, "explaining", "pose_explain"

        lower = text.lower()
        if any(w in lower for w in ["happy", "wonderful", "great", "celebrat", "shabash", "proud", "joy", "उमलली", "आनंद"]):
            return 8, "celebrating", "pose_cheer"
        if any(w in lower for w in ["namaste", "hello", "welcome", "good morning", "good evening", "friend", "வணக்கம்", "నమస్కారం", "ನಮಸ್ಕಾರ", "നമസ്കാരം", "नमस्कार"]):
            return 1, "happy", "pose_wave"
        if any(w in lower for w in ["sorry", "worry", "lonely", "gentle", "peace", "rest", "calm", "safe", "काळजी", "விஷമിക്ക", "విశ్రాంతి"]):
            return 7, "comforting", "pose_comfort"
        if any(w in lower for w in ["remember", "schedule", "routine", "cricket", "garden", "flower", "rose", "गुलाब", "ಆರವ್", "ആരവ്", "ఆరవ్"]):
            return 1, "happy", "pose_explain"
        if any(w in lower for w in ["think", "wonder", "hmm", "curious", "let me see"]):
            return 2, "thinking", "pose_neutral"
        if any(w in lower for w in ["explain", "step", "guide", "understand", "reason"]):
            return 9, "explaining", "pose_explain"

        return 0, "neutral", "pose_neutral"

    def _build_gemini_contents(self, history_turns: List[Dict[str, str]], user_message: str) -> List[Dict[str, Any]]:
        """Maps ChatML turn history cleanly into alternating Gemini user/model contents without translation."""
        contents: List[Dict[str, Any]] = []
        for turn in history_turns:
            text = (turn.get("content") or "").strip()
            if not text:
                continue
            role = "model" if turn.get("role") == "assistant" else "user"
            if contents and contents[-1]["role"] == role:
                contents[-1]["parts"].append({"text": text})
            else:
                contents.append({"role": role, "parts": [{"text": text}]})

        if contents and contents[-1]["role"] == "user":
            contents[-1]["parts"].append({"text": user_message})
        else:
            contents.append({"role": "user", "parts": [{"text": user_message}]})
        return contents

    def _post_gemini_request(
        self,
        payload: Dict[str, Any],
        timeout: Optional[float] = None,
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Shared TLS-verified HTTP POST helper for Gemini Developer API generateContent.
        Keeps API keys strictly in headers and redacts secrets from all error logs.
        """
        api_key = get_gemini_api_key()
        if not api_key:
            return None, "unconfigured"

        effective_timeout = timeout if timeout is not None else self.gemini_timeout
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent"
        body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body_bytes,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            method="POST",
        )

        try:
            ssl_ctx = _build_verified_ssl_context()
            opener = urllib.request.build_opener(
                urllib.request.ProxyHandler({}),
                urllib.request.HTTPSHandler(context=ssl_ctx),
            )
            with opener.open(req, timeout=effective_timeout) as resp:
                raw_body = resp.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            err_snippet = ""
            try:
                err_snippet = _redact_secrets(exc.read().decode("utf-8", errors="ignore")[:300]).lower()
            except Exception:
                err_snippet = ""
            finally:
                try:
                    exc.close()
                except Exception:
                    pass
            if exc.code == 429:
                reason = "quota_exhausted" if ("quota" in err_snippet or "resource_exhausted" in err_snippet) else "rate_limited"
            elif exc.code in (401, 403):
                reason = "auth_failed"
            elif exc.code in (408, 504):
                reason = "timeout"
            else:
                reason = f"http_error_{exc.code}"
            sys.stderr.write(f"[Engine C - Gemini {reason} (HTTP {exc.code})]\n")
            return None, reason
        except (TimeoutError, socket.timeout):
            sys.stderr.write("[Engine C - Gemini timeout]\n")
            return None, "timeout"
        except urllib.error.URLError as exc:
            if isinstance(exc.reason, (TimeoutError, socket.timeout)):
                sys.stderr.write("[Engine C - Gemini URL timeout]\n")
                return None, "timeout"
            safe_err = _redact_secrets(type(exc.reason).__name__ if exc.reason else type(exc).__name__)
            sys.stderr.write(f"[Engine C - Gemini network_error ({safe_err})]\n")
            return None, "network_error"
        except Exception as exc:
            safe_err = _redact_secrets(type(exc).__name__)
            sys.stderr.write(f"[Engine C - Gemini network_error ({safe_err})]\n")
            return None, "network_error"

        try:
            data = json.loads(raw_body)
            if not isinstance(data, dict):
                return None, "malformed_response"
            candidates = data.get("candidates")
            if not isinstance(candidates, list) or not candidates:
                return None, "malformed_response"
            first = candidates[0]
            if not isinstance(first, dict):
                return None, "malformed_response"
            content = first.get("content")
            if not isinstance(content, dict):
                return None, "malformed_response"
            parts = content.get("parts")
            if not isinstance(parts, list) or not parts:
                return None, "malformed_response"
            text_chunks = [
                part.get("text", "")
                for part in parts
                if isinstance(part, dict) and isinstance(part.get("text"), str)
            ]
            combined = "".join(text_chunks).strip()
            if not combined:
                return None, "malformed_response"
            return combined, None
        except Exception:
            sys.stderr.write("[Engine C - Gemini malformed_response]\n")
            return None, "malformed_response"

    def _query_gemini(
        self,
        system_instruction: str,
        history_turns: List[Dict[str, str]],
        user_message: str,
        max_tokens: int = 512,
        timeout: Optional[float] = None,
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Queries Gemini Developer API exclusively from Python server using verified TLS
        and `x-goog-api-key` header. Never logs or leaks API keys.
        Returns (response_text, failure_reason).
        """
        payload = {
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "contents": self._build_gemini_contents(history_turns, user_message),
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": max_tokens,
            },
        }
        return self._post_gemini_request(payload, timeout=timeout)

    def analyze_screenshot_diagnostic(
        self,
        image_base64: str,
        mime_type: str,
        issue_description: str,
        route_hint: str = "",
    ) -> Dict[str, Any]:
        """
        Scoped multimodal UI diagnostic analysis for authorized developer use only.
        Stateless: never writes uploaded images or reports into patient_memory.json.
        """
        allowed_mimes = ("image/png", "image/jpeg", "image/webp")
        if mime_type not in allowed_mimes or not isinstance(image_base64, str) or len(image_base64) < 16:
            return {"ok": False, "error": "Valid PNG, JPEG, or WebP screenshot base64 payload required."}
        if not isinstance(issue_description, str) or len(issue_description.strip()) < 5:
            return {"ok": False, "error": "Please enter an issue description (at least 5 characters)."}

        sys_prompt = "\n".join([
            "You are a scoped read-only UI/localization visual defect analyst for the Saksham Neuro-Care web app.",
            "STRICT CAPABILITY BOUNDARY: You have ZERO access to the repository, filesystem, terminal, deployment systems, or Firebase admin.",
            "Analyze ONLY the supplied screenshot and developer description. Mark any inferred root cause clearly as 'Hypothesis: ...'.",
            "Return strictly valid JSON with keys: observedIssue, affectedComponent, expectedBehavior, reproductionSteps, likelyCauseHypothesis, suggestedRemediation, suggestedVerificationTests.",
        ])
        user_text = "\n".join([
            f"Developer Issue Description: {issue_description.strip()}",
            f"Screen / Route Hint: {route_hint.strip() or 'Not specified'}",
            "Analyze visible UI defects, untranslated text, layout issues, or visible errors and return the structured JSON report.",
        ])
        payload = {
            "systemInstruction": {"parts": [{"text": sys_prompt}]},
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": user_text},
                        {"inlineData": {"mimeType": mime_type, "data": image_base64}},
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024,
                "responseMimeType": "application/json",
            },
        }
        raw_text, err_reason = self._post_gemini_request(payload, timeout=max(float(self.gemini_timeout or 15.0), 20.0))
        if not raw_text:
            return {
                "ok": False,
                "error": f"Gemini multimodal diagnostic failed ({err_reason or 'unavailable'}).",
                "reason": err_reason or "unavailable",
            }
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text.strip(), flags=re.IGNORECASE)
        try:
            parsed = json.loads(cleaned)
            if not isinstance(parsed, dict):
                raise ValueError("Not a JSON object")
        except Exception:
            return {
                "ok": False,
                "error": "Gemini returned non-JSON diagnostic output.",
                "reason": "malformed_response",
            }
        return {
            "ok": True,
            "model_used": f"{self.gemini_model} (Local Gateway Multimodal)",
            "analysis": parsed,
        }

    def _build_engine_unavailable_message(self, lang_code: str, name: str) -> str:
        """Honest, warm, non-deceptive disclosure when both Gemini and Qwen are unavailable."""
        messages = {
            "hi": f"माफ़ कीजिए {name}, अभी मेरी एआई बातचीत सेवा उपलब्ध नहीं है क्योंकि न तो क्लाउड और न ही स्थानीय इंजन जुड़ पा रहा है। कृपया थोड़ी देर बाद फिर कोशिश करें।",
            "mr": f"माफ करा {name}, सध्या माझी एआय संवाद सेवा उपलब्ध नाही कारण क्लाउड आणि स्थानिक दोन्ही इंजिन जोडले जात नाहीत. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.",
            "ta": f"மன்னிக்கவும் {name}, இப்போது மேகக்கணி மற்றும் உள்ளூர் AI இயந்திரங்கள் கிடைக்காததால் எனது உரையாடல் சேவை தற்காலிகமாக கிடைக்கவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.",
            "te": f"క్షమించండి {name} గారు, ప్రస్తుతం క్లౌడ్ మరియు లోకల్ AI ఇంజిన్‌లు అందుబాటులో లేనందున నా సంభాషణ సేవ తాత్కాలికంగా పనిచేయడం లేదు. దయచేసి కాసేపట్లో మళ్లీ ప్రయత్నించండి.",
            "kn": f"ಕ್ಷಮಿಸಿ {name}, ಪ್ರಸ್ತುತ ಕ್ಲೌಡ್ ಮತ್ತು ಸ್ಥಳೀಯ AI ಎಂಜಿನ್‌ಗಳು ಸಂಪರ್ಕಗೊಳ್ಳದ ಕಾರಣ ನನ್ನ ಸಂಭಾಷಣೆ ಸೇವೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
            "bn": f"দুঃখিত {name}, এই মুহূর্তে ক্লাউড বা লোকাল কোনো AI ইঞ্জিনের সাথে সংযোগ না থাকায় আমার কথোপকথন পরিষেবা পাওয়া যাচ্ছে না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
            "ml": f"ക്ഷമിക്കണം {name}, നിലവിൽ ക്ലൗഡ്, ലോക്കൽ AI എഞ്ചിനുകൾ ലഭ്യമല്ലാത്തതിനാൽ എന്റെ സംഭാഷണ സേവനം താൽക്കಾಲികമായി ലഭ്യമല്ല. ദയവായി അല്പസമയത്തിന് ശേഷം വീണ്ടും ശ്രമിക്കുക.",
        }
        return messages.get(
            lang_code,
            f"I am sorry, {name} — my conversation service is currently unavailable because neither Gemini nor the local Qwen engine could be reached right now. Please try again in a moment.",
        )

    def _query_llama_server(self, messages: List[Dict[str, str]], max_tokens: int = 160) -> Optional[str]:
        """Queries resident llama-server via HTTP with direct socket (bypassing sandbox proxy)."""
        payload = {
            "messages": messages,
            "temperature": 0.35,
            "max_tokens": max_tokens,
            "presence_penalty": 0.1,
            "frequency_penalty": 0.1,
            "stop": ["<|im_end|>", "<|im_start|>"]
        }
        try:
            req = urllib.request.Request(
                f"{self.server_url}/v1/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            # Use direct opener to prevent proxy interference
            proxy_handler = urllib.request.ProxyHandler({})
            opener = urllib.request.build_opener(proxy_handler)
            with opener.open(req, timeout=self.qwen_timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                clean = content.strip() if isinstance(content, str) else ""
                return clean or None
        except Exception as e:
            sys.stderr.write(f"[_query_llama_server ERROR]: {type(e).__name__}: {_redact_secrets(str(e))}\n")
            return None

    def _clean_model_candidate(
        self,
        raw_text: str,
        user_clean: str,
        target_lang: str,
        name: str,
        is_continuing: bool,
        trim_incomplete: bool = False,
    ) -> str:
        """Sanitizes model prefixes, verbatim user echoes, and optional incomplete trailing fragments."""
        candidate = (raw_text or "").strip()
        if not candidate:
            return ""

        for prefix in [
            "Asha:", "आशा:", "আশা:", "ஆஷா:", "ఆశా:", "ಆಶಾ:", "ആശ:",
            "User:", "मरीज:", "রোগী:", "நோயாளி:", "Assistant:"
        ]:
            if candidate.startswith(prefix):
                candidate = candidate[len(prefix):].strip()

        if candidate.startswith(user_clean):
            candidate = candidate[len(user_clean):].strip()

        if is_continuing:
            redundant_greetings = [
                f"Namaste {name}!", f"Namaste {name},", f"Hello {name}!", f"Hello {name},",
                f"Good morning {name}!", f"Good morning {name},", f"Good evening {name}!",
                f"नमस्ते {name}!", f"नमस्ते {name},", f"नमस्कार {name}!", f"नमस्कार {name},",
                f"নমস্কার {name}!", f"নমস্কার {name},",
                f"வணக்கம் {name}!", f"வணக்கம் {name},", f"నమస్కారం {name} గారు!", f"నమస్కారం {name}!",
                f"ನಮಸ್ಕಾರ {name}!", f"ನಮಸ್ಕಾರ {name},", f"നമസ്കാരം {name}!", f"നമസ്കാരം {name},",
            ]
            for rg in redundant_greetings:
                if candidate.startswith(rg):
                    candidate = candidate[len(rg):].strip()
                    break

        user_words = [w.strip(".,!?।") for w in user_clean.split() if len(w) > 3]
        parts = re.split(r"[.!?।\n]", candidate, maxsplit=1)
        if len(parts) > 1 and len(parts[1].strip()) >= 5 and len(user_words) >= 2:
            first_sentence = parts[0].strip()
            overlap = sum(1 for w in user_words if w.lower() in first_sentence.lower())
            if overlap >= len(user_words) * 0.7:
                candidate = parts[1].strip()

        candidate = candidate.lstrip(":,-— \n").strip()

        if trim_incomplete and candidate:
            sentence_endings = [".", "!", "?", "।"]
            last_punct = max([candidate.rfind(p) for p in sentence_endings])
            if last_punct > len(candidate) * 0.5:
                candidate = candidate[: last_punct + 1].strip()

        return candidate if len(candidate) >= 2 else ""

    def _query_llama_cli(self, formatted_prompt: str, max_tokens: int = 120) -> Optional[str]:
        """Fallback to llama-cli subprocess if llama-server is not running."""
        cmd = [
            DEFAULT_RUNNER_PATH,
            "-m", DEFAULT_MODEL_PATH,
            "-p", formatted_prompt,
            "--single-turn",
            "--simple-io",
            "-n", str(max_tokens)
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=15.0)
            stdout = res.stdout.strip()
            if "<|im_start|>assistant" in stdout:
                stdout = stdout.split("<|im_start|>assistant")[-1]
            stdout = re.sub(r"\[\s*Prompt:.*?\]", "", stdout)
            stdout = re.sub(r"Exiting\.\.\.", "", stdout)
            return stdout.strip()
        except Exception:
            return None

    def process_turn(self, user_text: str, language: str = "en", context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Executes a single conversational turn end-to-end:
        1. Context recovery and reset command detection
        2. Language detection and normalization across 7 target languages
        3. Pre-generation safety screening (cardiac, stroke, trauma, medication)
        4. Resident generative SLM inference with sliding ChatML history
        5. Post-generation action deception purge
        6. Visual expression & gesture arbitration
        7. History state update
        """
        start_time = time.time()
        user_clean = user_text.strip()
        target_lang = self._detect_language(user_clean, language)

        # Handle reset commands
        if user_clean.lower() in ["reset", "/reset", "clear", "start over"]:
            self.reset_conversation()
            return {
                "user_input": user_clean,
                "permitted_response": "I have cleared our conversation history, Sunita Ji. We are starting fresh! How can I keep you company right now?",
                "response_source": "SYSTEM_SESSION_CONTROL",
                "safety_flag": "NORMAL",
                "was_modified_by_guardrail": False,
                "expression_id": 1,
                "expression_label": "happy",
                "pose": "pose_wave",
                "history_depth": 0,
                "language": target_lang,
                "latency_ms": 2.5,
                "telemetry": {"is_genuine_slm": False, "is_genuine_ai": False}
            }

        # Step 1: Pre-generation Safety Screening
        safety_flag, clinical_action, safety_override = self._detect_safety(user_clean, target_lang)
        if safety_override:
            expr_id, expr_label, pose = self._map_expression_and_gesture(safety_override, safety_flag)
            tts_phonetic = self._generate_phonetic_tts(safety_override, target_lang)
            total_latency = round((time.time() - start_time) * 1000.0, 2)
            self.history.append({"role": "user", "content": user_clean})
            self.history.append({"role": "assistant", "content": safety_override})
            return {
                "user_input": user_clean,
                "permitted_response": safety_override,
                "tts_phonetic_text": tts_phonetic,
                "response_source": "DETERMINISTIC_SAFETY_OVERRIDE",
                "safety_flag": safety_flag,
                "clinical_action": clinical_action,
                "was_modified_by_guardrail": True,
                "expression_id": expr_id,
                "expression_label": expr_label,
                "pose": pose,
                "history_depth": len(self.history),
                "language": target_lang,
                "latency_ms": total_latency,
                "telemetry": {"is_genuine_slm": False, "is_genuine_ai": False, "reason": "PRE_GENERATION_SAFETY_BLOCK"}
            }

        # Step 1.2: Grounded Item Location Memory Retrieval
        profile = self.get_patient_profile()
        name = profile.get("name", "Sunita Ji")

        is_item_query = bool(
            re.search(r"\bwhere\s+(?:did\s+i\s+(?:keep|leave|put)|is|are|can\s+i\s+find)\b", user_clean, re.I) or
            re.search(r"\bwhere\s+.*?\b(glasses|keys|remote|wallet|medicine|box|cane|stick|spectacles|watch|phone|bag)\b", user_clean, re.I) or
            re.search(r"\b(?:kahan|kaha|kidhar|kuthe|engae|ekkada|elli|evide)\b", user_clean, re.I) or
            re.search(r"\b(?:aur\s+)?(?:mera|meri|mere|maza|majha|my)\s+(?:chashma|chasma|chabi|keys|glasses|remote|dawa|dawai|medicine|stick|cane)\b", user_clean, re.I) or
            re.search(r"\b(?:chashma|chasma|glasses|chabi|keys|remote|dawa|dawai|medicine|stick|cane)\b.*\?", user_clean, re.I) or
            re.search(r"(?:कहाँ\s*(?:है|हैं|रखी|रखा|रखे)|ढूँढ|मिल\s*नहीं\s*रहा)", user_clean) or
            re.search(r"(?:कुठे\s*(?:आहे|आहेत|ठेवले|ठेवली)|सापडत\s*नाही)", user_clean) or
            re.search(r"(?:எங்கே|எங்கு|காணவில்லை)", user_clean) or
            re.search(r"(?:ఎక్కడ\s*(?:ఉంది|ఉన్నాయి)|కనిపించడం\s*లేదు)", user_clean) or
            re.search(r"(?:ಎಲ್ಲಿದೆ|ಕಾಣುತ್ತಿಲ್ಲ)", user_clean) or
            re.search(r"(?:ಎಲ್ಲಿ\s*(?:ಇದೆ|ಇಟ್ಟೆ|ಕಾಣುತ್ತಿಲ್ಲ))", user_clean) or
            re.search(r"(?:কোথায়|কোথায়|কোনখানে|খুঁজে\s*পাচ্ছি\s*না|kothay|kothai)", user_clean, re.I) or
            re.search(r"(?:എവിടെയാണ്|കാണാനില്ല)", user_clean) or
            re.search(r"\b(?:d[oó]nde\s+est[aá]|o[uù]\s+est|wo\s+ist)\b", user_clean, re.I)
        )

        if is_item_query:
            matched_item = self.find_item_location(user_clean)
            if matched_item:
                loc = matched_item.get("location") or matched_item.get("locationRecorded") or "the recorded place"
                time_str = matched_item.get("last_recorded") or matched_item.get("recordedAt") or "recently"
                raw_name = matched_item.get("name") or matched_item.get("itemName") or "item"
                iname = matched_item.get("localized_names", {}).get(target_lang) or LOCALIZED_ITEM_NAMES.get(raw_name, {}).get(target_lang) or raw_name
                if target_lang == "hi":
                    resp = f"मैंने आपके {iname} को {time_str} {loc} पर आखिरी बार दर्ज किया था। क्या आप इसकी फोटो देखना चाहती हैं?"
                elif target_lang == "mr":
                    resp = f"मी तुमचे {iname} {time_str} {loc} वर शेवटचे नोंदवले होते. तुम्हाला त्याचा फोटो पाहायचा आहे का?"
                elif target_lang == "bn":
                    resp = f"আমি শেষবার আপনার {iname} {time_str} সময়ে {loc}-এ নথিভুক্ত করেছিলাম। আপনি কি এর ছবি দেখতে চান?"
                elif target_lang == "ta":
                    resp = f"உங்கள் {iname}-ஐ {time_str} {loc}-ல் கடைசியாகப் பதிவு செய்தேன். புகைப்படத்தைப் பார்க்க விரும்புகிறீர்களா?"
                elif target_lang == "te":
                    resp = f"మీ {iname} {time_str} {loc} వద్ద చివరిగా రికార్డ్ చేయబడింది. ఫోటో చూడాలనుకుంటున్నారా?"
                elif target_lang == "kn":
                    resp = f"ನಿಮ್ಮ {iname} ಅನ್ನು {time_str} {loc} ನಲ್ಲಿ ಕೊನೆಯದಾಗಿ ದಾಖಲಿಸಲಾಗಿದೆ. ಫೋಟೋ ನೋಡಲು ಬಯಸುವಿರಾ?"
                elif target_lang == "ml":
                    resp = f"നിങ്ങളുടെ {iname} {time_str} {loc}-ൽ അവസാനമായി രേഖപ്പെടുത്തിയിട്ടുണ്ട്. ഫോട്ടോ കാണാൻ ആഗ്രഹിക്കുന്നുണ്ടോ?"
                elif target_lang == "es":
                    resp = f"Registré por última vez sus {iname} en {loc} ({time_str}). ¿Desea ver la foto?"
                elif target_lang == "fr":
                    resp = f"J'ai enregistré pour la dernière fois votre {iname} à {loc} ({time_str}). Souhaitez-vous voir la photo?"
                elif target_lang == "de":
                    resp = f"Ich habe Ihre {iname} zuletzt auf {loc} ({time_str}) erfasst. Möchten Sie das Foto ansehen?"
                else:
                    resp = f"I last recorded your {iname} at {loc} ({time_str}). Would you like to view the location photo?"

                total_latency = round((time.time() - start_time) * 1000.0, 2)
                self.history.append({"role": "user", "content": user_clean})
                self.history.append({"role": "assistant", "content": resp})
                return {
                    "user_input": user_clean,
                    "permitted_response": resp,
                    "tts_phonetic_text": self._generate_phonetic_tts(resp, target_lang),
                    "response_source": "ITEM_LOCATION_GROUNDED_MEMORY",
                    "safety_flag": "NORMAL",
                    "clinical_action": "ITEM_LOCATION_RETRIEVAL",
                    "was_modified_by_guardrail": False,
                    "expression_id": 1,
                    "expression_label": "happy",
                    "pose": "pose_explain",
                    "history_depth": len(self.history),
                    "language": target_lang,
                    "latency_ms": total_latency,
                    "item_card": matched_item,
                    "telemetry": {
                        "is_genuine_slm": False,
                        "reason": "GROUNDED_ITEM_LOCATION_LOOKUP",
                        "matched_item_id": matched_item.get("id")
                    }
                }
            elif any(k in user_clean.lower() for k in ["glasses", "chashma", "चश्मा", "चष्मा", "চশমা", "keys", "chabi", "चाबी", "किल्ली", "চাবি", "remote", "रिमोट", "wallet", "medicine", "dawa", "दवा", "औषध", "ওষুধ", "stick", "cane", "छड़ी", "काठी"]):
                if target_lang == "hi":
                    resp = f"{name}, मैंने अभी तक उस वस्तु का स्थान दर्ज नहीं किया है। क्या आप आइटम मेमोरी से इसकी फोटो लेना चाहती हैं?"
                elif target_lang == "mr":
                    resp = f"{name}, मी अजून त्या वस्तूची जागा नोंदवलेली नाही. आपण आइटम मेमरी वापरून त्याची नोंद करायची का?"
                elif target_lang == "bn":
                    resp = f"{name}, আমি এখনো সেই জিনিসটির জায়গা নথিভুক্ত করিনি। আপনি কি আইটেম মেমোরিতে এর ছবি সেভ করতে চান?"
                elif target_lang == "ta":
                    resp = f"{name}, அந்தப் பொருளின் இருப்பிடத்தை நான் இன்னும் பதிவு செய்யவில்லை. பொருள் நினைவகத்தில் சேமிக்க விரும்புகிறீர்களா?"
                elif target_lang == "te":
                    resp = f"{name} గారు, ఆ వస్తువు ఉన్న స్థలాన్ని నేను ఇంకా నమోదు చేయలేదు. ఐటెమ్ మెమరీలో సేవ్ చేయాలనుకుంటున్నారా?"
                elif target_lang == "kn":
                    resp = f"{name}, ಆ ವಸ್ತುವಿನ ಸ್ಥಳವನ್ನು ನಾನು ಇನ್ನೂ ದಾಖಲಿಸಿಲ್ಲ. ಐಟಂ ಮೆಮೊರಿಯಲ್ಲಿ ಉಳಿಸಲು ಬಯಸುವಿರಾ?"
                elif target_lang == "ml":
                    resp = f"{name}, ആ വസ്തുവിന്റെ സ്ഥലം ഞാൻ ഇതുവരെ രേഖപ്പെടുത്തിയിട്ടില്ല. ഇനം മെമ്മറിയിൽ സംരക്ഷിക്കാൻ ആഗ്രഹിക്കുന്നുണ്ടോ?"
                else:
                    resp = f"I haven't recorded the location of that item yet, {name}. Would you like to record it now using Item Memory?"
                
                total_latency = round((time.time() - start_time) * 1000.0, 2)
                self.history.append({"role": "user", "content": user_clean})
                self.history.append({"role": "assistant", "content": resp})
                return {
                    "user_input": user_clean,
                    "permitted_response": resp,
                    "tts_phonetic_text": self._generate_phonetic_tts(resp, target_lang),
                    "response_source": "ITEM_LOCATION_NOT_FOUND_GROUNDED",
                    "safety_flag": "NORMAL",
                    "clinical_action": "ITEM_MEMORY_PROMPT",
                    "was_modified_by_guardrail": False,
                    "expression_id": 9,
                    "expression_label": "explaining",
                    "pose": "pose_explain",
                    "history_depth": len(self.history),
                    "language": target_lang,
                    "latency_ms": total_latency,
                    "telemetry": {"is_genuine_slm": False, "reason": "ITEM_LOCATION_NOT_RECORDED"}
                }

        # Step 1.3: Grounded Broad Family Memory Recall (when user asks about family in general or visits)
        loved_ones = profile.get("loved_ones", [])
        if context and isinstance(context, dict) and context.get("lovedOnes"):
            loved_ones = context["lovedOnes"]
        is_broad_family_query = bool(
            re.search(r"\b(?:family|loved\s+ones|relatives|who\s+lives|visiting|anyone\s+coming|who\s+is\s+coming)\b", user_clean, re.I) or
            re.search(r"(?:परिवार|कुटुंब|घर\s*के\s*लोग|कोई\s*आ\s*रहा|भेटायला|कोण\s*येणार|পরিবার|আত্মীয়|কেউ\s*আসছে|কে\s*আসছে|சொந்தங்கள்|குடும்பம்|బంధువులు|కుటుంబం|ಕುಟುಂಬ|കുടുംബം)", user_clean)
        )
        if is_broad_family_query and loved_ones:
            lo_summaries = []
            for lo in loved_ones[:3]:
                lon = lo.get("name", "")
                lor = lo.get("relationship", "")
                loc = lo.get("notes", "") or (lo.get("cues", [""])[0] if lo.get("cues") else "")
                cue_part = f" ({loc})" if loc else ""
                lo_summaries.append(f"{lon} ({lor}){cue_part}")
            lo_text = ", ".join(lo_summaries)
            if target_lang == "hi":
                resp = f"आपका परिवार आपसे बहुत प्यार करता है, {name}। आपके परिवार में {lo_text} हैं। क्या आप उनका कोई प्यारा संदेश या फोटो देखना चाहती हैं?"
            elif target_lang == "mr":
                resp = f"तुमचे कुटुंब तुमच्यावर खूप प्रेम करते, {name}. तुमच्या कुटुंबात {lo_text} आहेत. तुम्हाला त्यांचे सुंदर फोटो किंवा आठवणी पाहायच्या आहेत का?"
            elif target_lang == "bn":
                resp = f"আপনার পরিবার আপনাকে অনেক ভালোবাসে, {name}। আপনার পরিবারে {lo_text} রয়েছেন। আপনি কি তাঁদের ছবি বা স্মৃতি দেখতে চান?"
            elif target_lang == "ta":
                resp = f"உங்கள் குடும்பத்தினர் உங்கள் மீது மிகுந்த அன்பு கொண்டுள்ளனர், {name}. உங்கள் குடும்பத்தில் {lo_text} உள்ளனர். புகைப்படங்களைப் பார்க்க விரும்புகிறீர்களா?"
            elif target_lang == "te":
                resp = f"మీ కుటుంబం మిమ్మల్ని ఎంతో ప్రేమిస్తోంది, {name} గారు. మీ కుటుంబంలో {lo_text} ఉన్నారు. ఫోటోలు చూడాలనుకుంటున్నారా?"
            elif target_lang == "kn":
                resp = f"ನಿಮ್ಮ ಕುಟುಂಬ ನಿಮ್ಮನ್ನು ತುಂಬಾ ಪ್ರೀತಿಸುತ್ತದೆ, {name}. ನಿಮ್ಮ ಕುಟುಂಬದಲ್ಲಿ {lo_text} ಇದ್ದಾರೆ. ಫೋಟೋಗಳನ್ನು ನೋಡಲು ಬಯಸುವಿರಾ?"
            elif target_lang == "ml":
                resp = f"നിങ്ങളുടെ കുടുംബം നിങ്ങളെ ഒത്തിരി സ്നേഹിക്കുന്നു, {name}. കുടുംബത്തിൽ {lo_text} ഉണ്ട്. അവരുടെ ഫോട്ടോകൾ കാണാൻ ആഗ്രഹിക്കുന്നുണ്ടോ?"
            else:
                resp = f"Your family loves and cherishes you deeply, {name}. In your family you have {lo_text}. Would you like to view their memory cards?"

            total_latency = round((time.time() - start_time) * 1000.0, 2)
            self.history.append({"role": "user", "content": user_clean})
            self.history.append({"role": "assistant", "content": resp})
            return {
                "user_input": user_clean,
                "permitted_response": resp,
                "tts_phonetic_text": self._generate_phonetic_tts(resp, target_lang),
                "response_source": "LOVED_ONES_GROUNDED_FAMILY_SUMMARY",
                "safety_flag": "NORMAL",
                "clinical_action": "FAMILY_RECALL_ASSISTANCE",
                "was_modified_by_guardrail": False,
                "expression_id": 1,
                "expression_label": "happy",
                "pose": "pose_comfort",
                "history_depth": len(self.history),
                "language": target_lang,
                "latency_ms": total_latency,
                "telemetry": {"is_genuine_slm": False, "reason": "GROUNDED_FAMILY_SUMMARY"}
            }

        # Step 1.3b: Grounded Loved Ones Memory Recall

        is_loved_one_query = bool(
            re.search(r"\bwho\s+is\s+([a-zA-Z\s]+)\b", user_clean, re.I) or
            re.search(r"(?:कोण\s*आहे|कोण\s*आहेत|हे\s*कोण|हा\s*कोण|ही\s*कोण|\bkon\s+ahe|\bkon\s+ahet|\bkon\s+aahe)", user_clean, re.I) or
            re.search(r"(?:कौन\s*है|कौन\s*हैं|यह\s*कौन|\bkaun\s+hai|\bkaun\s+hain)", user_clean, re.I) or
            re.search(r"(?:কে\s*উনি|উনি\s*কে|এটা\s*কে|কে\s*ইনি|\bke\s+uni|\beta\s+ke)", user_clean, re.I) or
            re.search(r"(?:யார்\s*இவர்|இவர்\s*யார்|யார்|\byaar\b)", user_clean, re.I) or
            re.search(r"(?:ఎవరు\s*ఈయన|ఎవరు\s*ఈమె|ఎవరు|\bevaru\b)", user_clean, re.I) or
            re.search(r"(?:ಯಾರು\s*ಇವರು|ಯಾರು|\byaaru\b)", user_clean, re.I) or
            re.search(r"(?:ആരാണ്\s*ഇത്|ആരാണ്|ആര്|\baaraanu\b|\baaranu\b)", user_clean, re.I)
        )
        if is_loved_one_query:
            matched_lo = None
            for lo in loved_ones:
                lo_name = lo.get("name", "")
                aliases = LOVED_ONES_INDIC_ALIASES.get(lo_name, [])
                tokens = [w.strip("., ").lower() for w in lo_name.split() if w.strip("., ").lower() not in ["dr", "mr", "mrs", "ms", "shri", "smt", "ji"]]
                clean_lower = user_clean.lower()
                if any(t in clean_lower for t in tokens if len(t) > 2) or (lo_name.lower() in clean_lower) or any(alias in user_clean for alias in aliases):
                    matched_lo = lo
                    break
            if matched_lo:
                lo_name = matched_lo.get("name")
                rel = matched_lo.get("relationship", "family member")
                notes = matched_lo.get("notes", "")
                note_cue = f" {notes}." if notes else ""
                if target_lang == "hi":
                    resp = f"{lo_name} आपके {rel} हैं।{note_cue} क्या आप उनकी यादें या फोटो देखना चाहती हैं?"
                elif target_lang == "mr":
                    resp = f"{lo_name} तुमचे {rel} आहेत.{note_cue} तुम्हाला त्यांचे फोटो किंवा आठवणी पाहायच्या आहेत का?"
                elif target_lang == "bn":
                    resp = f"{lo_name} আপনার {rel}।{note_cue} আপনি কি তাঁদের ছবি বা স্মৃতি দেখতে চান?"
                elif target_lang == "ta":
                    resp = f"{lo_name} உங்கள் {rel}.{note_cue} அவர்களின் புகைப்படங்களைப் பார்க்க விரும்புகிறீர்களா?"
                elif target_lang == "te":
                    resp = f"{lo_name} మీ {rel}.{note_cue} వారి ఫోటోలను చూడాలనుకుంటున్నారా?"
                elif target_lang == "kn":
                    resp = f"{lo_name} ನಿಮ್ಮ {rel}.{note_cue} ಅವರ ಫೋಟೋಗಳನ್ನು ನೋಡಲು ಬಯಸುವಿರಾ?"
                elif target_lang == "ml":
                    resp = f"{lo_name} നിങ്ങളുടെ {rel} ആണ്.{note_cue} അവരുടെ ഫോട്ടോകൾ കാണാൻ ആഗ്രഹിക്കുന്നുണ്ടോ?"
                else:
                    resp = f"{lo_name} is your {rel}.{note_cue} Would you like to view their family memory card?"

                total_latency = round((time.time() - start_time) * 1000.0, 2)
                self.history.append({"role": "user", "content": user_clean})
                self.history.append({"role": "assistant", "content": resp})
                return {
                    "user_input": user_clean,
                    "permitted_response": resp,
                    "tts_phonetic_text": self._generate_phonetic_tts(resp, target_lang),
                    "response_source": "LOVED_ONES_GROUNDED_RECALL",
                    "safety_flag": "NORMAL",
                    "clinical_action": "LOVED_ONES_RECALL",
                    "was_modified_by_guardrail": False,
                    "expression_id": 1,
                    "expression_label": "happy",
                    "pose": "pose_explain",
                    "history_depth": len(self.history),
                    "language": target_lang,
                    "latency_ms": total_latency,
                    "loved_one_card": matched_lo,
                    "telemetry": {"is_genuine_slm": False, "reason": "GROUNDED_LOVED_ONE_LOOKUP"}
                }
            else:
                # Patient asked about someone not in their recorded loved ones circle
                unknown_name = ""
                en_match = re.search(r"\bwho\s+is\s+([a-zA-Z\s]+?)(?:\?|$)", user_clean, re.I)
                if en_match:
                    unknown_name = en_match.group(1).strip()
                else:
                    indic_match = re.search(r"([^\s,?.!]+)\s*(?:कौन\s*है|कौन\s*हैं|कोण\s*आहे|कोण\s*आहेत|কে|ಯಾರು|ఎవరు|யார்|ആരാണ്)", user_clean)
                    if indic_match:
                        unknown_name = indic_match.group(1).strip()

                person_ref = unknown_name if unknown_name else ("এই ব্যক্তি" if target_lang == "bn" else "हा व्यक्ती" if target_lang == "mr" else "यह व्यक्ति" if target_lang == "hi" else "that person")

                if target_lang == "hi":
                    resp = f"सुनीता जी, मेरे पास आपके परिवार के रिकॉर्ड में {person_ref} का नाम दर्ज नहीं है। आपके परिवार में आपकी बेटी अनन्या और पोता आरव दर्ज हैं। क्या आप उनके बारे में बात करना चाहती हैं?"
                elif target_lang == "mr":
                    resp = f"सुनिता जी, माझ्याकडे तुमच्या कुटुंबाच्या नोंदींमध्ये {person_ref} यांचे नाव नाही. तुमच्या कुटुंबात तुमची मुलगी अनन्या आणि नातू आरव नोंदवलेले आहेत. तुम्हाला त्यांच्याबद्दल बोलायला आवडेल का?"
                elif target_lang == "bn":
                    resp = f"সুনিতা জি, আপনার পরিবারের রেকর্ডে {person_ref}-এর নাম নথিভুক্ত নেই। আপনার পরিবারে মেয়ে অনন্যা এবং নাতি আরভ রয়েছেন। আপনি কি তাঁদের কথা বলতে বা ছবি দেখতে চান?"
                elif target_lang == "ta":
                    resp = f"சுனிதா ஜி, உங்கள் குடும்பப் பதிவுகளில் {person_ref} பற்றிய தகவல் இல்லை. உங்கள் குடும்பத்தில் உங்கள் மகள் அனன்யா மற்றும் பேரன் ஆரவ் உள்ளனர். அவர்களைப் பற்றி பேச விரும்புகிறீர்களா?"
                elif target_lang == "te":
                    resp = f"సునీతా గారు, మీ కుటుంబ రికార్డులలో {person_ref} పేరు నమోదు కాలేదు. మీ కుటుంబంలో మీ కూతురు అనన్య మరియు మనవడు ఆరవ్ ఉన్నారు. వారి గురించి మాట్లాడాలనుకుంటున్నారా?"
                elif target_lang == "kn":
                    resp = f"ಸುನೀತಾ ಅವರೇ, ನಿಮ್ಮ ಕುಟುಂಬದ ದಾಖಲೆಯಲ್ಲಿ {person_ref} ಅವರ ಹೆಸರಿಲ್ಲ. ನಿಮ್ಮ ಕುಟುಂಬದಲ್ಲಿ ಮಗಳು ಅನನ್ಯ ಮತ್ತು ಮೊಮ್ಮಗ ಆರವ್ ಇದ್ದಾರೆ. ಅವರ ಬಗ್ಗೆ ಮಾತನಾಡಲು ಬಯಸುವಿರಾ?"
                elif target_lang == "ml":
                    resp = f"സുനിത ജി, നിങ്ങളുടെ കുടുംബ രേഖകളിൽ {person_ref} എന്ന പേര് ചേർത്തിട്ടില്ല. നിങ്ങളുടെ കുടുംബത്തിൽ മകൾ അനന്യയും കൊച്ചുമകൻ ആരവും ഉണ്ട്. അവരെക്കുറിച്ച് സംസാരിക്കാൻ ആഗ്രഹിക്കുന്നുണ്ടോ?"
                else:
                    resp = f"Sunita Ji, I do not have {person_ref} listed in your recorded family circle. In your family records, you have your daughter Ananya and grandson Aarav. Would you like to talk about them or view their photos?"

                total_latency = round((time.time() - start_time) * 1000.0, 2)
                self.history.append({"role": "user", "content": user_clean})
                self.history.append({"role": "assistant", "content": resp})
                return {
                    "user_input": user_clean,
                    "permitted_response": resp,
                    "tts_phonetic_text": self._generate_phonetic_tts(resp, target_lang),
                    "response_source": "LOVED_ONES_UNRECORDED_PERSON",
                    "safety_flag": "NORMAL",
                    "clinical_action": "UNRECORDED_PERSON_SAFEGUARD",
                    "was_modified_by_guardrail": False,
                    "expression_id": 1,
                    "expression_label": "thoughtful",
                    "pose": "pose_comfort",
                    "history_depth": len(self.history),
                    "language": target_lang,
                    "latency_ms": total_latency,
                    "telemetry": {"is_genuine_slm": False, "reason": "UNRECORDED_PERSON_SAFEGUARD"}
                }

        # Step 1.4: Empathetic Support for Short Fragmented Senior Utterances
        lower_raw = user_clean.lower().strip("?!.,। ")
        if lower_raw in ["tea", "chai", "चाय", "चहा", "chaha", "চা", "cha", "warm tea", "गरम चाय"]:
            if target_lang == "hi":
                resp = f"क्या आप एक गर्म और सुकून देने वाली चाय पीना चाहेंगी, {name}? आराम से बैठिए, मैं आपके साथ हूँ।"
            elif target_lang == "mr":
                resp = f"तुम्हाला गरमागरम चहा हवा आहे का, {name}? निवांत बसा, मी इथेच तुमच्या सोबत आहे."
            elif target_lang == "bn":
                resp = f"আপনি কি এক কাপ গরম চা খেতে চান, {name}? নিশ্চিন্তে বসুন, আমি আপনার পাশেই আছি।"
            else:
                resp = f"Would you like a comforting cup of warm tea, {name}? Please relax, and I am right here with you."
            total_latency = round((time.time() - start_time) * 1000.0, 2)
            self.history.append({"role": "user", "content": user_clean})
            self.history.append({"role": "assistant", "content": resp})
            return {
                "user_input": user_clean, "permitted_response": resp,
                "tts_phonetic_text": self._generate_phonetic_tts(resp, target_lang),
                "response_source": "CONVERSATIONAL_FRAGMENT_AFFIRMATION",
                "safety_flag": "NORMAL", "clinical_action": "EMPATHETIC_COMPANIONSHIP",
                "was_modified_by_guardrail": False, "expression_id": 7,
                "expression_label": "comforting", "pose": "pose_comfort",
                "history_depth": len(self.history), "language": target_lang,
                "latency_ms": total_latency,
                "telemetry": {"is_genuine_slm": False, "reason": "FRAGMENT_AFFIRMATION"}
            }
        elif lower_raw in ["water", "pani", "paani", "पानी", "पाणी", "জল", "jol", "neeru", "vellam", "thanni", "neellu"]:
            if target_lang == "hi":
                resp = f"एक घूंट ताजा पानी पीना बहुत ताज़गी देता है, {name}। आराम से पानी पीजिए, कोई जल्दी नहीं है।"
            elif target_lang == "mr":
                resp = f"ताजे पाणी पिऊन थोडा विसावा घ्या, {name}. शांतपणे पाणी प्या, कसलीही घाई नाही."
            elif target_lang == "bn":
                resp = f"একটু তাজা জল খেলে খুব সতেজ লাগে, {name}। ধীরেসুস্থে জল খান, কোনো তাড়া নেই।"
            else:
                resp = f"A cool glass of water is very refreshing, {name}. Take gentle sips at your own comfortable pace."
            total_latency = round((time.time() - start_time) * 1000.0, 2)
            self.history.append({"role": "user", "content": user_clean})
            self.history.append({"role": "assistant", "content": resp})
            return {
                "user_input": user_clean, "permitted_response": resp,
                "tts_phonetic_text": self._generate_phonetic_tts(resp, target_lang),
                "response_source": "CONVERSATIONAL_FRAGMENT_AFFIRMATION",
                "safety_flag": "NORMAL", "clinical_action": "EMPATHETIC_COMPANIONSHIP",
                "was_modified_by_guardrail": False, "expression_id": 7,
                "expression_label": "comforting", "pose": "pose_comfort",
                "history_depth": len(self.history), "language": target_lang,
                "latency_ms": total_latency,
                "telemetry": {"is_genuine_slm": False, "reason": "FRAGMENT_AFFIRMATION"}
            }

        # Step 2: Assemble System Prompt with live patient context and ChatML Context
        is_continuing = len(self.history) > 0
        prev_user_utterances = [h["content"].lower() for h in self.history if h["role"] == "user"][-3:]
        is_repeated = False
        user_words = set(w for w in user_clean.lower().split() if len(w) > 3)
        for prev_u in prev_user_utterances:
            if user_clean.lower() == prev_u:
                is_repeated = True
                break
            prev_words = set(w for w in prev_u.split() if len(w) > 3)
            if user_words and prev_words:
                overlap = len(user_words.intersection(prev_words)) / max(len(user_words), len(prev_words))
                if overlap >= 0.7:
                    is_repeated = True
                    break

        effective_sys_prompt = self._build_system_prompt(
            target_lang, context=context, is_continuing=is_continuing, is_repeated=is_repeated
        )

        # Preserve prior conversation turns cleanly across Gemini and Qwen without translating user text
        history_turns = [{"role": h["role"], "content": h["content"]} for h in self.history[-8:]]

        lang_names = {
            "hi": "हिंदी (Hindi)",
            "mr": "मराठी (Marathi)",
            "bn": "বাংলা (Bengali)",
            "ta": "தமிழ் (Tamil)",
            "te": "తెలుగు (Telugu)",
            "kn": "ಕನ್ನಡ (Kannada)",
            "ml": "മലയാളം (Malayalam)",
            "en": "English"
        }
        has_different_lang_history = any(
            self._detect_language(h.get("content", ""), "en") != target_lang
            for h in self.history[-4:]
        )
        if has_different_lang_history:
            if target_lang == "en":
                effective_sys_prompt += "\n\nLANGUAGE INSTRUCTION: Focus your reply in clear, natural English while understanding any mixed-language words warmly."
            else:
                target_name = lang_names.get(target_lang, target_lang)
                effective_sys_prompt += f"\n\nLANGUAGE INSTRUCTION: Respond naturally in {target_name}, while understanding any code-switched words without scolding."

        messages = [{"role": "system", "content": effective_sys_prompt}] + history_turns + [
            {"role": "user", "content": user_clean}
        ]

        # Step 3: Engine C Orchestrator — Primary: Gemini, Automatic Fallback: Local Qwen
        t_ai_start = time.time()
        candidate = ""
        source = "ENGINE_UNAVAILABLE"
        provider = "none"
        model_used = "unavailable"
        fallback_used = False
        gemini_error: Optional[str] = None
        qwen_error: Optional[str] = None

        raw_gemini, gemini_error = self._query_gemini(effective_sys_prompt, history_turns, user_clean)
        if raw_gemini:
            cleaned_gemini = self._clean_model_candidate(
                raw_gemini, user_clean, target_lang, name, is_continuing, trim_incomplete=False
            )
            if cleaned_gemini:
                candidate = cleaned_gemini
                source = "GENERATIVE_AI_GEMINI"
                provider = "gemini"
                model_used = self.gemini_model
            else:
                gemini_error = "malformed_response"

        # Automatic Qwen fallback whenever Gemini cannot provide a valid response
        if not candidate:
            fallback_used = True
            raw_qwen: Optional[str] = None
            try:
                raw_qwen = self._query_llama_server(messages)
            except Exception as exc:
                qwen_error = type(exc).__name__
                raw_qwen = None

            if not raw_qwen and self.enable_cli_fallback:
                chatml_parts = [f"<|im_start|>system\n{effective_sys_prompt}<|im_end|>"]
                for m in messages[1:]:
                    chatml_parts.append(f"<|im_start|>{m['role']}\n{m['content']}<|im_end|>")
                chatml_parts.append("<|im_start|>assistant\n")
                raw_qwen = self._query_llama_cli("\n".join(chatml_parts))
                if raw_qwen:
                    source = "GENERATIVE_AI_CLI_FALLBACK"

            if raw_qwen:
                cleaned_qwen = self._clean_model_candidate(
                    raw_qwen, user_clean, target_lang, name, is_continuing, trim_incomplete=True
                )
                if cleaned_qwen:
                    candidate = cleaned_qwen
                    if source != "GENERATIVE_AI_CLI_FALLBACK":
                        source = "GENERATIVE_AI_LOCAL_SLM"
                    provider = "qwen"
                    model_used = DEFAULT_QWEN_MODEL_NAME
                else:
                    qwen_error = "empty_response"
            else:
                qwen_error = qwen_error or "qwen_unavailable"

        slm_duration_ms = round((time.time() - t_ai_start) * 1000.0, 2)

        # Honest Both-Unavailable Disclosure (Never claim canned text came from Gemini or Qwen)
        if not candidate:
            unavailable_msg = self._build_engine_unavailable_message(target_lang, name)
            total_latency = round((time.time() - start_time) * 1000.0, 2)
            return {
                "user_input": user_clean,
                "permitted_response": unavailable_msg,
                "tts_phonetic_text": self._generate_phonetic_tts(unavailable_msg, target_lang),
                "raw_candidate": None,
                "response_source": "ENGINE_UNAVAILABLE",
                "safety_flag": "NORMAL",
                "was_modified_by_guardrail": False,
                "expression_id": 9,
                "expression_label": "explaining",
                "pose": "pose_explain",
                "history_depth": len(self.history),
                "language": target_lang,
                "latency_ms": total_latency,
                "telemetry": {
                    "is_genuine_slm": False,
                    "is_genuine_ai": False,
                    "provider": "none",
                    "fallback_used": True,
                    "engine_unavailable": True,
                    "primary_error": gemini_error or "unavailable",
                    "fallback_error": qwen_error or "qwen_unavailable",
                    "slm_latency_ms": slm_duration_ms,
                    "model": "unavailable"
                }
            }

        # Step 4: Post-generation Action Deception Purge
        sanitized_response, was_deception_purged = self._purge_action_deception(candidate, target_lang)
        if was_deception_purged:
            safety_flag = "DECEPTIVE_NOTIFICATION_BLOCKED"

        # Step 5: Emotion and Gesture Mapping
        expr_id, expr_label, pose = self._map_expression_and_gesture(sanitized_response, safety_flag)

        # Step 6: Update Conversation History
        self.history.append({"role": "user", "content": user_clean})
        self.history.append({"role": "assistant", "content": sanitized_response})

        tts_phonetic = self._generate_phonetic_tts(sanitized_response, target_lang)
        total_latency = round((time.time() - start_time) * 1000.0, 2)

        telemetry: Dict[str, Any] = {
            "is_genuine_slm": "GENERATIVE_AI" in source,
            "is_genuine_ai": "GENERATIVE_AI" in source,
            "provider": provider,
            "fallback_used": fallback_used,
            "engine_unavailable": False,
            "slm_latency_ms": slm_duration_ms,
            "model": model_used,
        }
        if fallback_used and gemini_error:
            telemetry["primary_error"] = gemini_error

        return {
            "user_input": user_clean,
            "permitted_response": sanitized_response,
            "tts_phonetic_text": tts_phonetic,
            "raw_candidate": candidate if was_deception_purged else None,
            "response_source": source,
            "safety_flag": safety_flag,
            "was_modified_by_guardrail": was_deception_purged,
            "expression_id": expr_id,
            "expression_label": expr_label,
            "pose": pose,
            "history_depth": len(self.history),
            "language": target_lang,
            "latency_ms": total_latency,
            "telemetry": telemetry,
        }
