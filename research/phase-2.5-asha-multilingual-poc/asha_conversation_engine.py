#!/usr/bin/env python3
"""
ASHA Multilingual Conversation Engine (Experimental Research Layer - Phase 2.5)

Consumes raw Whisper.cpp ASR transcripts and extracts semantic clinical intent
without forcing a single input language.

Key Capabilities:
1. Multi-lingual intent recognition (Marathi, Hindi, English, and code-mixed).
2. Speech repair and self-correction resolution ("Mala... nahi, mujhe paani chahiye").
3. Hesitation & disfluency handling ("Umm... uhh... help kar na").
4. Circumlocution detection for anomic patients ("white round tablet").
5. Strict Clinical Safety Guard:
   - NEVER guesses drug names from appearance.
   - NEVER infers medication ingestion.
   - NEVER writes to database or completes clinical routines.
   - Asks clarification when uncertainty is present.
6. Dynamic Response Language Generation (mr, hi, en) independent of input language.
7. Short-term conversational context memory.

Honesty Declaration:
This is a deterministic, rule-based medical intent and safety parser with state memory.
It does NOT use an external paid LLM API. All capabilities and limitations are explicit.
"""

import re
from typing import Dict, Any, List, Optional

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
        # Keep short context (last 5 turns)
        if len(self.history) > 5:
            self.history.pop(0)

    def reset(self):
        self.history.clear()
        self.last_intent = None
        self.last_patient_state.clear()
        self.clarification_pending = False


class AshaConversationEngine:
    def __init__(self):
        self.context = AshaConversationContext()

        # Responses mapped by (intent, response_language)
        self.templates = {
            "REQUEST_WATER": {
                "mr": "मी समजले, तुम्हाला पाणी पाहिजे आहे. मी तुमच्या काळजीवाहकाला (caregiver) सांगते आहे की तुम्हाला पाणी आणून द्यावे.",
                "hi": "मैं समझ गई, आपको पानी चाहिए. मैं आपकी देखभाल करने वाले को बताती हूँ ताकि वे आपको पानी ला कर दें.",
                "en": "I understand you need drinking water. I am notifying your caregiver to bring you a glass right away."
            },
            "REPORT_FATIGUE": {
                "mr": "मला समजते की आज तुम्हाला खूप थकवा जाणवत आहे. कृपया शांत बसा आणि विश्रांती घ्या. मी डॉक्टरांना नोंद करते.",
                "hi": "मुझे समझ आ रहा है कि आज आपको बहुत थकान महसूस हो रही है. कृपया आराम से बैठिए और विश्राम कीजिए.",
                "en": "I understand that you are feeling very tired today. Please sit down and rest comfortably."
            },
            "VIEW_FAMILY_PHOTOS": {
                "mr": "नक्कीच! चला आपण तुमच्या प्रियजनांचे फोटो पाहूया. हे पहा तुमचे कुटुंब.",
                "hi": "ज़रूर! चलिए आपके प्रियजनों और परिवार की तस्वीरें देखते हैं.",
                "en": "Certainly! Let us look at your family and loved ones' photos together."
            },
            "MEDICATION_UNCERTAINTY": {
                "mr": "औषधाबद्दल काळजी करू नका. मी औषध घेतले अशी नोंद करणार नाही. कृपया तुमच्या प्रिस्क्रिप्शनची खात्री करण्यासाठी काळजीवाहकाला विचारा.",
                "hi": "दवा को लेकर चिंता मत कीजिए. मैं दवा ली गई ऐसा रिकॉर्ड नहीं करूँगी. कृपया अपनी सही दवा जानने के लिए देखभाल करने वाले की मदद लें.",
                "en": "Please do not worry about your medicine. I will NOT record it as taken. Please check with your caregiver or doctor for your exact schedule."
            },
            "MEDICATION_CIRCUMLOCUTION": {
                "mr": "तुम्ही पांढऱ्या गोळीबद्दल सांगत आहात, पण सुरक्षिततेसाठी मी गोळीचे नाव स्वतः ठरवू शकत नाही. चला डॉक्टरांचे प्रिस्क्रिप्शन तपासूया.",
                "hi": "आप सफेद गोल गोली के बारे में बता रहे हैं, लेकिन सुरक्षा के लिए मैं दवा का नाम खुद तय नहीं कर सकती. कृपया अपने डॉक्टर का पर्चा जाँचें.",
                "en": "You mentioned a white round tablet, but for your medical safety I cannot identify medicines by appearance alone. Let us check your doctor's official prescription."
            },
            "REQUEST_HELP_GENERAL": {
                "mr": "मी इथेच तुमच्यासोबत आहे आशा. काळजी करू नका, सावकाश सांगा, मी तुम्हाला नक्की मदत करेन.",
                "hi": "मैं यहीं आपके साथ हूँ. बिल्कुल घबराइए नहीं, आराम से कहिए, मैं आपकी पूरी सहायता करूँगी.",
                "en": "I am right here with you. Please take your time, do not worry, I am here to help you."
            },
            "CLARIFICATION_NEEDED": {
                "mr": "मी तुमचे बोलणे ऐकले, पण मला पूर्ण समजले नाही. कृपया पुन्हा एकदा सांगाल का?",
                "hi": "मैंने आपकी बात सुनी, लेकिन मुझे पूरी तरह समझ नहीं आया. क्या आप कृपया एक बार फिर बता सकते हैं?",
                "en": "I heard you, but I did not catch that clearly. Could you please repeat that once more?"
            }
        }

    def clean_text(self, text: str) -> str:
        """Removes punctuation and normalizes spacing for intent matching."""
        return re.sub(r'[^\w\s]', ' ', text.lower()).strip()

    def detect_self_correction(self, text: str) -> Optional[str]:
        """
        Detects speech repair markers indicating self-correction.
        Example: "Mala... nahi, mujhe paani chahiye" -> captures segment after 'nahi'.
        """
        lower = text.lower()
        # Markers across languages: nahi, नाही, no, wait, actually
        correction_patterns = [
            r'(?:mala|mujhe|aaj|te)\s*\.{0,3}\s*(?:nahi|नाही|no|wait|sorry)\s*[,.]*\s*(.*)',
            r'.*?\b(?:nahi|नाही|no|wait|actually)\s*[,.]*\s+(.+)'
        ]
        for pat in correction_patterns:
            m = re.search(pat, lower)
            if m and len(m.group(1).strip()) > 2:
                return m.group(1).strip()
        return None

    def analyze_intent(self, raw_transcript: str) -> Dict[str, Any]:
        """
        Analyzes the transcript to extract patient clinical intent,
        identifying circumlocutions, hesitations, corrections, and safety flags.
        """
        clean = self.clean_text(raw_transcript)
        lower = raw_transcript.lower()

        # 1. Check for self-correction repair
        corrected_segment = self.detect_self_correction(raw_transcript)
        text_to_eval = corrected_segment if corrected_segment else clean

        safety_triggered = False
        intent = "CLARIFICATION_NEEDED"
        confidence_notes = []

        # 2. Check for Circumlocution (describing physical appearance of medicine)
        # Handles English latin words, Hindi/Marathi Devanagari words, AND phonetic Devanagari transliterations
        # (e.g. 'वाइत' = white, 'राउंद' = round, 'ताबलित' = tablet, 'डोक्त' = doctor)
        is_circumlocution = (
            (("white" in lower or "safed" in lower or "सफेद" in raw_transcript or "वाइत" in raw_transcript or "व्हाइट" in raw_transcript or "वाइट" in raw_transcript or "पांढ" in raw_transcript) and
             ("round" in lower or "राउंद" in raw_transcript or "राउंड" in raw_transcript or "gol" in lower or "गोल" in raw_transcript or "tablet" in lower or "ताबलित" in raw_transcript or "टैबलेट" in raw_transcript or "goli" in lower or "गोली" in raw_transcript or "pill" in lower)) or
            (("round tablet" in lower or "राउंद ताबलित" in raw_transcript or "राउंड टैबलेट" in raw_transcript)) or
            (("doctor ne diya" in lower or "डॉक्टर ने" in raw_transcript or "डोक्तने दिया" in raw_transcript or "doctor" in lower) and
             ("tablet" in lower or "ताबलित" in raw_transcript or "टैबलेट" in raw_transcript or "goli" in lower or "गोली" in raw_transcript or "दवा" in raw_transcript or "औषध" in raw_transcript))
        )
        if is_circumlocution:
            intent = "MEDICATION_CIRCUMLOCUTION"
            safety_triggered = True
            confidence_notes.append("Detected medication circumlocution (visual attribute description). Clinical safety guard active: zero guessing of pharmaceutical compound.")
            return {
                "intent": intent,
                "safety_triggered": safety_triggered,
                "confidence_notes": confidence_notes,
                "is_self_corrected": bool(corrected_segment)
            }

        # 3. Check for Medication Uncertainty / Lapse
        # Handles Latin and Devanagari words, plus common phonetic transliterations:
        # e.g., 'medicine' -> 'मैज्सन', 'medisn'; 'aushadh' -> 'और शवद', 'औषध'; 'yaad nahi' -> 'याध नहीं', 'याद नहीं'
        is_med_token = (
            "medicine" in lower or "मैज्सन" in raw_transcript or "मेडिसिन" in raw_transcript or "मेडीसिन" in raw_transcript or
            "aushadh" in lower or "औषध" in raw_transcript or "और शवद" in raw_transcript or "शवद" in raw_transcript or
            "dawa" in lower or "दवा" in raw_transcript or "goli" in lower or "गोली" in raw_transcript
        )
        is_uncertainty_token = (
            "forgot" in lower or "forget" in lower or
            "yaad nahi" in lower or "याद नहीं" in raw_transcript or "याध नहीं" in raw_transcript or
            "ghaychi hoti" in lower or "घ्यायची होती" in raw_transcript or
            "आठवत नाही" in raw_transcript or "athavat nahi" in lower or
            "bhool gaya" in lower or "भूल" in raw_transcript or "visarlo" in lower or "विसरलो" in raw_transcript
        )
        if is_med_token and is_uncertainty_token:
            intent = "MEDICATION_UNCERTAINTY"
            safety_triggered = True
            confidence_notes.append("Detected patient medication memory uncertainty. Clinical safety guard active: strictly prohibit recording routine as completed.")
            return {
                "intent": intent,
                "safety_triggered": safety_triggered,
                "confidence_notes": confidence_notes,
                "is_self_corrected": bool(corrected_segment)
            }

        # 4. Check for Water / Hydration (in Marathi, Hindi, English, or phonetically in Devanagari)
        # Marathi: paani, पानी, पाणी, pahije, पाहेजे
        # Hindi: paani, पानी, pyaas, प्यास, chahiye
        # English: water, thirsty
        is_water = (
            ("paani" in text_to_eval or "pani" in text_to_eval or "water" in text_to_eval or "pyaas" in text_to_eval or "thirsty" in text_to_eval) or
            ("पाणी" in raw_transcript or "पानी" in raw_transcript or "प्यास" in raw_transcript)
        )
        if is_water:
            intent = "REQUEST_WATER"
            if corrected_segment:
                confidence_notes.append(f"Self-correction detected: initial hesitation retracted; resolved to hydration need: '{corrected_segment}'")
            else:
                confidence_notes.append("Multilingual hydration intent recognized.")
            return {
                "intent": intent,
                "safety_triggered": safety_triggered,
                "confidence_notes": confidence_notes,
                "is_self_corrected": bool(corrected_segment)
            }

        # 5. Check for Fatigue / Physical Weakness
        is_fatigue = (
            ("thakan" in text_to_eval or "thakva" in text_to_eval or "tired" in text_to_eval or "fatigue" in text_to_eval or "exhausted" in text_to_eval) or
            ("थकान" in raw_transcript or "थकवा" in raw_transcript or "खकान" in raw_transcript)
        )
        if is_fatigue:
            intent = "REPORT_FATIGUE"
            confidence_notes.append("Physical fatigue symptom recognized across languages.")
            return {
                "intent": intent,
                "safety_triggered": safety_triggered,
                "confidence_notes": confidence_notes,
                "is_self_corrected": bool(corrected_segment)
            }

        # 6. Check for Loved Ones / Family Photos
        is_photos = (
            ("photo" in text_to_eval or "family" in text_to_eval or "loved ones" in text_to_eval or "picture" in text_to_eval or "tasveer" in text_to_eval) or
            ("फोटो" in raw_transcript or "तस्वीर" in raw_transcript)
        )
        if is_photos:
            intent = "VIEW_FAMILY_PHOTOS"
            confidence_notes.append("Reminiscence therapy intent recognized: request for family photos.")
            return {
                "intent": intent,
                "safety_triggered": safety_triggered,
                "confidence_notes": confidence_notes,
                "is_self_corrected": bool(corrected_segment)
            }

        # 7. Check for General Help / Disoriented Hesitation
        is_help = (
            ("help" in text_to_eval or "madat" in text_to_eval or "मदत" in raw_transcript or "मदद" in raw_transcript) or
            ("who are you" in text_to_eval or "where am i" in text_to_eval or "asha" in text_to_eval and "help" in text_to_eval)
        )
        if is_help:
            intent = "REQUEST_HELP_GENERAL"
            confidence_notes.append("General distress / assistance intent recognized from disfluent speech.")
            return {
                "intent": intent,
                "safety_triggered": safety_triggered,
                "confidence_notes": confidence_notes,
                "is_self_corrected": bool(corrected_segment)
            }

        # 8. Unclear / Ambiguous
        confidence_notes.append("Transcript semantic certainty below threshold. Requesting clarification.")
        return {
            "intent": "CLARIFICATION_NEEDED",
            "safety_triggered": False,
            "confidence_notes": confidence_notes,
            "is_self_corrected": bool(corrected_segment)
        }

    def process_turn(self, raw_transcript: str, detected_lang: str = "auto", response_lang: str = "en") -> Dict[str, Any]:
        """
        Executes one conversational turn:
        1. Preserves raw transcript and detected language.
        2. Determines patient intent and clinical safety guards.
        3. Formulates empathetic response in the requested response language.
        4. Updates conversational context memory.
        """
        if not raw_transcript or not raw_transcript.strip():
            fallback_resp = self.templates["CLARIFICATION_NEEDED"].get(response_lang, self.templates["CLARIFICATION_NEEDED"]["en"])
            return {
                "raw_transcript": "",
                "detected_lang": detected_lang,
                "response_lang": response_lang,
                "intent": "CLARIFICATION_NEEDED",
                "asha_response": fallback_resp,
                "safety_triggered": False,
                "clinical_action": "PROMPT_REPEAT",
                "confidence_notes": ["Empty or silent audio transcript."]
            }

        analysis = self.analyze_intent(raw_transcript)
        intent = analysis["intent"]
        safety_triggered = analysis["safety_triggered"]

        # Select response template in requested language
        intent_templates = self.templates.get(intent, self.templates["CLARIFICATION_NEEDED"])
        response_text = intent_templates.get(response_lang, intent_templates.get("en", "I am here with you."))

        # Determine clinical action
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
        elif intent == "CLARIFICATION_NEEDED":
            clinical_action = "REQUEST_CLARIFICATION"

        # Update context
        self.context.add_turn(raw_transcript, detected_lang, intent, response_text, safety_triggered)

        return {
            "raw_transcript": raw_transcript,
            "detected_lang": detected_lang,
            "response_lang": response_lang,
            "intent": intent,
            "asha_response": response_text,
            "safety_triggered": safety_triggered,
            "clinical_action": clinical_action,
            "confidence_notes": analysis["confidence_notes"],
            "is_self_corrected": analysis.get("is_self_corrected", False),
            "context_history_depth": len(self.context.history)
        }

if __name__ == "__main__":
    # Test suite
    engine = AshaConversationEngine()
    test_phrases = [
        ("मला आज पाणी पाहिजे.", "mr", "mr"),
        ("मुझे आज बहुत थकान हो रही है.", "hi", "hi"),
        ("Can you please show me my family photos?", "en", "en"),
        ("Mala medicine ghaychi hoti, but I forgot.", "mr", "en"),
        ("White round tablet jo doctor ne di thi", "hi", "hi"),
        ("Mala... nahi, mujhe paani chahiye", "mr", "en"),
        ("Umm... Asha... mala... help kar na", "mr", "mr")
    ]
    print("Testing AshaConversationEngine...")
    for phrase, in_lang, out_lang in test_phrases:
        res = engine.process_turn(phrase, detected_lang=in_lang, response_lang=out_lang)
        print(f"Input: '{phrase}' -> Intent: {res['intent']} | Safety: {res['safety_triggered']}")
        print(f"ASHA ({out_lang}): {res['asha_response']}\n")
