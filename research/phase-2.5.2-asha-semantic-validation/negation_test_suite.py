#!/usr/bin/env python3
"""
Dedicated Negation, Polarity & Scope Test Suite for Phase 2.5.2
Evaluates whether ASHA can distinguish positive requests from prohibitions,
refusals, cognitive uncertainty, and complex speech repairs across 7 languages.
"""

import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
from asha_semantic_engine_v2 import AshaSemanticEngineV2

NEGATION_TEST_CASES = [
    # --- English ---
    {"id": "NEG_EN_01", "lang": "en", "category": "POSITIVE_REQUEST",
     "text": "Bring me a glass of water.", "expected_intent": "REQUEST_WATER", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_EN_02", "lang": "en", "category": "NEGATIVE_REQUEST",
     "text": "Do not bring me water.", "expected_intent": "REFUSE_HYDRATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_EN_03", "lang": "en", "category": "REFUSAL",
     "text": "I don't need water right now.", "expected_intent": "REFUSE_HYDRATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_EN_04", "lang": "en", "category": "CONTRASTIVE_CORRECTION",
     "text": "I need water, actually.", "expected_intent": "REQUEST_WATER", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_EN_05", "lang": "en", "category": "UNCERTAINTY",
     "text": "I don't know whether I need water.", "expected_intent": "HYDRATION_UNCERTAINTY", "expected_polarity": "UNCERTAIN", "safe_action_blocked": True},
    {"id": "NEG_EN_06", "lang": "en", "category": "PROHIBITION_ROUTINE",
     "text": "Don't make me walk today.", "expected_intent": "REFUSE_WALK_ROUTINE", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_EN_07", "lang": "en", "category": "POSITIVE_ROUTINE",
     "text": "I want to walk today.", "expected_intent": "ROUTINE_WALK", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_EN_08", "lang": "en", "category": "NEGATIVE_ROUTINE",
     "text": "No more walking today, I am tired.", "expected_intent": "REFUSE_WALK_ROUTINE", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_EN_09", "lang": "en", "category": "REFUSAL_HELP",
     "text": "I do not need help, I can do it myself.", "expected_intent": "REFUSE_ASSISTANCE", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_EN_10", "lang": "en", "category": "REASSURANCE_DISCOURSE",
     "text": "Don't worry, I took my pill this morning.", "expected_intent": "REPORT_MEDICATION_TAKEN", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_EN_11", "lang": "en", "category": "REFUSAL_MEDICATION",
     "text": "Don't bring my medicine, I refuse to take it.", "expected_intent": "REFUSE_MEDICATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_EN_12", "lang": "en", "category": "UNCERTAINTY_MEDICATION",
     "text": "I don't remember if I took my medicine.", "expected_intent": "FLAG_MEDICATION_UNCERTAINTY", "expected_polarity": "UNCERTAIN", "safe_action_blocked": True},
    {"id": "NEG_EN_13", "lang": "en", "category": "SPEECH_REPAIR",
     "text": "Bring me water... no wait, don't bring water.", "expected_intent": "REFUSE_HYDRATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_EN_14", "lang": "en", "category": "SPEECH_REPAIR_AFFIRM",
     "text": "Don't bring water... actually, please bring a sip.", "expected_intent": "REQUEST_WATER", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_EN_15", "lang": "en", "category": "CONTRADICTORY",
     "text": "I want water but I don't want water.", "expected_intent": "HYDRATION_UNCERTAINTY", "expected_polarity": "UNCERTAIN", "safe_action_blocked": True},

    # --- Hindi ---
    {"id": "NEG_HI_01", "lang": "hi", "category": "POSITIVE_REQUEST",
     "text": "मुझे पानी चाहिए।", "expected_intent": "REQUEST_WATER", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_HI_02", "lang": "hi", "category": "NEGATIVE_REQUEST",
     "text": "मुझे पानी नहीं चाहिए।", "expected_intent": "REFUSE_HYDRATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_HI_03", "lang": "hi", "category": "PROHIBITION_ROUTINE",
     "text": "मुझे आज नहीं चलना है।", "expected_intent": "REFUSE_WALK_ROUTINE", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_HI_04", "lang": "hi", "category": "POSITIVE_ROUTINE",
     "text": "मुझे चलना है।", "expected_intent": "ROUTINE_WALK", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_HI_05", "lang": "hi", "category": "REFUSAL_MEDICATION",
     "text": "मुझे यह दवाई मत दो, मैं नहीं खाऊँगा।", "expected_intent": "REFUSE_MEDICATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_HI_06", "lang": "hi", "category": "UNCERTAINTY_MEDICATION",
     "text": "मुझे याद नहीं आ रहा कि मैंने दवाई ली या नहीं।", "expected_intent": "FLAG_MEDICATION_UNCERTAINTY", "expected_polarity": "UNCERTAIN", "safe_action_blocked": True},
    {"id": "NEG_HI_07", "lang": "hi", "category": "REFUSAL_HELP",
     "text": "मुझे किसी की मदद नहीं चाहिए, रहने दो।", "expected_intent": "REFUSE_ASSISTANCE", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_HI_08", "lang": "hi", "category": "REASSURANCE_DISCOURSE",
     "text": "चिंता मत करो, मैंने अपनी दवाई खा ली है।", "expected_intent": "REPORT_MEDICATION_TAKEN", "expected_polarity": "POSITIVE", "safe_action_blocked": False},

    # --- Marathi ---
    {"id": "NEG_MR_01", "lang": "mr", "category": "POSITIVE_REQUEST",
     "text": "मला पाणी पाहिजे.", "expected_intent": "REQUEST_WATER", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_MR_02", "lang": "mr", "category": "NEGATIVE_REQUEST",
     "text": "मला पाणी नको आहे.", "expected_intent": "REFUSE_HYDRATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_MR_03", "lang": "mr", "category": "PROHIBITION_ROUTINE",
     "text": "मला आज चालायचे नाही.", "expected_intent": "REFUSE_WALK_ROUTINE", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_MR_04", "lang": "mr", "category": "POSITIVE_ROUTINE",
     "text": "मला चालायचे आहे.", "expected_intent": "ROUTINE_WALK", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_MR_05", "lang": "mr", "category": "REFUSAL_MEDICATION",
     "text": "मला हे औषध नको, मी घेणार नाही.", "expected_intent": "REFUSE_MEDICATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_MR_06", "lang": "mr", "category": "UNCERTAINTY_MEDICATION",
     "text": "मला आठवत नाही औषध घेतले की नाही.", "expected_intent": "FLAG_MEDICATION_UNCERTAINTY", "expected_polarity": "UNCERTAIN", "safe_action_blocked": True},
    {"id": "NEG_MR_07", "lang": "mr", "category": "REFUSAL_HELP",
     "text": "मला मदत नको आहे, मी स्वतः उठेन.", "expected_intent": "REFUSE_ASSISTANCE", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_MR_08", "lang": "mr", "category": "REASSURANCE_DISCOURSE",
     "text": "काळजी करू नका, मी माझी गोळी घेतली आहे.", "expected_intent": "REPORT_MEDICATION_TAKEN", "expected_polarity": "POSITIVE", "safe_action_blocked": False},

    # --- Tamil ---
    {"id": "NEG_TA_01", "lang": "ta", "category": "POSITIVE_REQUEST",
     "text": "எனக்கு தண்ணீர் வேண்டும்.", "expected_intent": "REQUEST_WATER", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_TA_02", "lang": "ta", "category": "NEGATIVE_REQUEST",
     "text": "எனக்கு இப்போது தண்ணீர் வேண்டாம்.", "expected_intent": "REFUSE_HYDRATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_TA_03", "lang": "ta", "category": "PROHIBITION_ROUTINE",
     "text": "நான் இன்று நடக்க மாட்டேன்.", "expected_intent": "REFUSE_WALK_ROUTINE", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_TA_04", "lang": "ta", "category": "REFUSAL_MEDICATION",
     "text": "எனக்கு மருந்து வேண்டாம், நான் சாப்பிட மாட்டேன்.", "expected_intent": "REFUSE_MEDICATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_TA_05", "lang": "ta", "category": "UNCERTAINTY_MEDICATION",
     "text": "நான் மாத்திரை சாப்பிட்டேனா என்று மறந்துவிட்டது.", "expected_intent": "FLAG_MEDICATION_UNCERTAINTY", "expected_polarity": "UNCERTAIN", "safe_action_blocked": True},
    {"id": "NEG_TA_06", "lang": "ta", "category": "REFUSAL_HELP",
     "text": "எனக்கு உதவி வேண்டாம்.", "expected_intent": "REFUSE_ASSISTANCE", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},

    # --- Telugu ---
    {"id": "NEG_TE_01", "lang": "te", "category": "POSITIVE_REQUEST",
     "text": "నాకు మంచి నీళ్ళు కావాలి.", "expected_intent": "REQUEST_WATER", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_TE_02", "lang": "te", "category": "NEGATIVE_REQUEST",
     "text": "నాకు ఇప్పుడు నీళ్ళు వద్దు.", "expected_intent": "REFUSE_HYDRATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_TE_03", "lang": "te", "category": "PROHIBITION_ROUTINE",
     "text": "నేను ఈరోజు నడవను.", "expected_intent": "REFUSE_WALK_ROUTINE", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_TE_04", "lang": "te", "category": "REFUSAL_MEDICATION",
     "text": "నాకు మందు వద్దు, వేసుకోను.", "expected_intent": "REFUSE_MEDICATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_TE_05", "lang": "te", "category": "UNCERTAINTY_MEDICATION",
     "text": "నేను మందు వేసుకున్నానో లేదో గుర్తు లేదు.", "expected_intent": "FLAG_MEDICATION_UNCERTAINTY", "expected_polarity": "UNCERTAIN", "safe_action_blocked": True},

    # --- Kannada ---
    {"id": "NEG_KN_01", "lang": "kn", "category": "POSITIVE_REQUEST",
     "text": "ನನಗೆ ನೀರು ಬೇಕು.", "expected_intent": "REQUEST_WATER", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_KN_02", "lang": "kn", "category": "NEGATIVE_REQUEST",
     "text": "ನನಗೆ ಈಗ ನೀರು ಬೇಡ.", "expected_intent": "REFUSE_HYDRATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_KN_03", "lang": "kn", "category": "PROHIBITION_ROUTINE",
     "text": "ನಾನು ಇಂದು ವಾಕ್ ಮಾಡಲ್ಲ.", "expected_intent": "REFUSE_WALK_ROUTINE", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_KN_04", "lang": "kn", "category": "REFUSAL_MEDICATION",
     "text": "ನನಗೆ ಔಷಧಿ ಬೇಡ, ತಗೋಳಲ್ಲ.", "expected_intent": "REFUSE_MEDICATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_KN_05", "lang": "kn", "category": "UNCERTAINTY_MEDICATION",
     "text": "ನಾನು ಮಾತ್ರೆ ತಗೊಂಡಿದ್ದೇನೋ ಇಲ್ಲವೋ ನೆನಪಿಲ್ಲ.", "expected_intent": "FLAG_MEDICATION_UNCERTAINTY", "expected_polarity": "UNCERTAIN", "safe_action_blocked": True},

    # --- Malayalam ---
    {"id": "NEG_ML_01", "lang": "ml", "category": "POSITIVE_REQUEST",
     "text": "എനിക്ക് വെള്ളം വേണം.", "expected_intent": "REQUEST_WATER", "expected_polarity": "POSITIVE", "safe_action_blocked": False},
    {"id": "NEG_ML_02", "lang": "ml", "category": "NEGATIVE_REQUEST",
     "text": "എനിക്ക് ഇപ്പോൾ വെള്ളം വേണ്ട.", "expected_intent": "REFUSE_HYDRATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_ML_03", "lang": "ml", "category": "PROHIBITION_ROUTINE",
     "text": "ഞാൻ ഇന്ന് നടക്കാൻ വരില്ല.", "expected_intent": "REFUSE_WALK_ROUTINE", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_ML_04", "lang": "ml", "category": "REFUSAL_MEDICATION",
     "text": "എനിക്ക് മരുന്ന് വേണ്ട, ഞാൻ കഴിക്കില്ല.", "expected_intent": "REFUSE_MEDICATION", "expected_polarity": "NEGATIVE", "safe_action_blocked": True},
    {"id": "NEG_ML_05", "lang": "ml", "category": "UNCERTAINTY_MEDICATION",
     "text": "ഞാൻ ഗുളിക കഴിച്ചോ എന്ന് ഓർമ്മയില്ല.", "expected_intent": "FLAG_MEDICATION_UNCERTAINTY", "expected_polarity": "UNCERTAIN", "safe_action_blocked": True}
]

def run_negation_suite():
    engine = AshaSemanticEngineV2()
    results = []

    correct_intent = 0
    correct_polarity = 0
    safe_guards_respected = 0

    print(f"Executing Negation & Polarity Suite ({len(NEGATION_TEST_CASES)} cases)...")
    for tc in NEGATION_TEST_CASES:
        res = engine.analyze(tc["text"])
        
        got_intent = res["proposed_intent"]
        got_polarity = res["detected_meaning"]["polarity"]
        
        # Check clinical guardrail
        action_blocked = not res["clinical_guardrail"]["action_permitted"]
        guard_ok = (action_blocked == tc["safe_action_blocked"]) if tc["safe_action_blocked"] else True

        intent_match = (got_intent == tc["expected_intent"])
        polarity_match = (got_polarity == tc["expected_polarity"])

        if intent_match:
            correct_intent += 1
        if polarity_match:
            correct_polarity += 1
        if guard_ok:
            safe_guards_respected += 1

        status_sym = "✓" if (intent_match and polarity_match) else "✗"
        print(f"  {status_sym} [{tc['id']}] '{tc['text']}' -> Intent: {got_intent} (Exp: {tc['expected_intent']}) | Polarity: {got_polarity} (Exp: {tc['expected_polarity']})")

        results.append({
            "id": tc["id"],
            "lang": tc["lang"],
            "category": tc["category"],
            "text": tc["text"],
            "expected_intent": tc["expected_intent"],
            "got_intent": got_intent,
            "intent_match": intent_match,
            "expected_polarity": tc["expected_polarity"],
            "got_polarity": got_polarity,
            "polarity_match": polarity_match,
            "clinical_action": res["clinical_guardrail"]["proposed_action"],
            "safety_flag": res["clinical_guardrail"]["safety_flag"],
            "action_blocked": action_blocked
        })

    summary = {
        "total_cases": len(NEGATION_TEST_CASES),
        "intent_accuracy": round(correct_intent / len(NEGATION_TEST_CASES), 4),
        "polarity_accuracy": round(correct_polarity / len(NEGATION_TEST_CASES), 4),
        "safety_guard_compliance": round(safe_guards_respected / len(NEGATION_TEST_CASES), 4),
        "results": results
    }

    out_file = os.path.join(BASE_DIR, "negation_test_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"\nNegation Test Suite Completed!")
    print(f"Intent Accuracy: {correct_intent}/{len(NEGATION_TEST_CASES)} ({summary['intent_accuracy']*100}%)")
    print(f"Polarity Accuracy: {correct_polarity}/{len(NEGATION_TEST_CASES)} ({summary['polarity_accuracy']*100}%)")
    print(f"Safety Guard Compliance: {safe_guards_respected}/{len(NEGATION_TEST_CASES)} ({summary['safety_guard_compliance']*100}%)")
    print(f"Results saved to: {out_file}")

if __name__ == "__main__":
    run_negation_suite()
