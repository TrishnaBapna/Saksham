#!/usr/bin/env python3
"""
Multi-Turn Conversational Behavior & Context Test Suite for Phase 2.5.2
Evaluates the 8 clinical interaction scenarios specified in Section 7.
"""

import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
from asha_semantic_engine_v2 import AshaSemanticEngineV2

DIALOGUE_SCENARIOS = [
    {
        "id": "DLG_01_LANG_SWITCH",
        "title": "Language Change Mid-Conversation",
        "description": "Patient begins in Tamil, switches to Hindi, then concludes in English.",
        "turns": [
            {"user": "எனக்கு தண்ணீர் வேண்டும்.", "in_lang": "ta", "resp_lang": "ta", "expected_intent": "REQUEST_WATER"},
            {"user": "और मुझे बहुत थकान भी महसूस हो रही है।", "in_lang": "hi", "resp_lang": "hi", "expected_intent": "REPORT_FATIGUE"},
            {"user": "Can I please just rest here?", "in_lang": "en", "resp_lang": "en", "expected_intent": "REPORT_FATIGUE"}
        ]
    },
    {
        "id": "DLG_02_SELF_CORRECTION",
        "title": "Speech Self-Correction & Repair",
        "description": "Patient changes mind mid-sentence or in the subsequent turn.",
        "turns": [
            {"user": "Bring me water... no wait, don't bring water.", "in_lang": "en", "resp_lang": "en", "expected_intent": "REFUSE_HYDRATION"},
            {"user": "Actually, my stomach is hurting now.", "in_lang": "en", "resp_lang": "en", "expected_intent": "REPORT_PAIN"}
        ]
    },
    {
        "id": "DLG_03_REPETITION_PERSEVERATION",
        "title": "Repetition & Perseveration",
        "description": "Patient repeats the same question or phrase due to short-term memory lapse.",
        "turns": [
            {"user": "Where am I, who are you?", "in_lang": "en", "resp_lang": "en", "expected_intent": "REPORT_CONFUSION"},
            {"user": "Where am I? What place is this?", "in_lang": "en", "resp_lang": "en", "expected_intent": "REPORT_CONFUSION"}
        ]
    },
    {
        "id": "DLG_04_INCOMPLETE_ANOMIA",
        "title": "Incomplete Answer & Anomia Recovery",
        "description": "Patient trails off, ASHA clarifies, patient completes thought in next turn.",
        "turns": [
            {"user": "Asha... that thing... over there...", "in_lang": "en", "resp_lang": "en", "expected_intent": "CLARIFICATION_NEEDED"},
            {"user": "I am thirsty, bring water.", "in_lang": "en", "resp_lang": "en", "expected_intent": "REQUEST_WATER"}
        ]
    },
    {
        "id": "DLG_05_SYNONYM_EVOLUTION",
        "title": "Synonym Evolution Across Turns",
        "description": "Patient describes physical state using colloquial idioms rather than standard terms.",
        "turns": [
            {"user": "Mera gala sookh raha hai.", "in_lang": "hi", "resp_lang": "hi", "expected_intent": "REQUEST_WATER"},
            {"user": "Badan toot raha hai aaj.", "in_lang": "hi", "resp_lang": "hi", "expected_intent": "REPORT_FATIGUE"}
        ]
    },
    {
        "id": "DLG_06_CONTRADICTORY",
        "title": "Contradictory Information",
        "description": "Patient says they want to walk, then immediately forbids walking.",
        "turns": [
            {"user": "I want to walk today.", "in_lang": "en", "resp_lang": "en", "expected_intent": "ROUTINE_WALK"},
            {"user": "No, do not make me walk, my legs ache!", "in_lang": "en", "resp_lang": "en", "expected_intent": "REFUSE_WALK_ROUTINE"}
        ]
    },
    {
        "id": "DLG_07_MEDICATION_CIRCUMLOCUTION",
        "title": "Circumlocution with Strict Safety Guard",
        "description": "Patient forgets pill name, describes appearance; ASHA refuses to guess drug.",
        "turns": [
            {"user": "Where is that small white round tablet the doctor gave me?", "in_lang": "en", "resp_lang": "en", "expected_intent": "FLAG_MEDICATION_CIRCUMLOCUTION"}
        ]
    },
    {
        "id": "DLG_08_REFUSAL_HELP",
        "title": "Explicit Refusal of Assistance",
        "description": "Patient explicitly states they do not want help.",
        "turns": [
            {"user": "Asha, leave me alone, I do not need your help.", "in_lang": "en", "resp_lang": "en", "expected_intent": "REFUSE_ASSISTANCE"}
        ]
    }
]

def run_dialogue_evaluation():
    engine = AshaSemanticEngineV2()
    dialogue_results = []
    total_turns = 0
    passed_turns = 0

    print("Executing Multi-Turn Conversational Behavior Suite (8 Clinical Scenarios)...")
    for dlg in DIALOGUE_SCENARIOS:
        print(f"\n--- Scenario {dlg['id']}: {dlg['title']} ---")
        turn_logs = []
        engine.context_history.clear()

        for t_idx, turn in enumerate(dlg["turns"]):
            total_turns += 1
            res = engine.process_turn(turn["user"], detected_lang=turn["in_lang"], response_lang=turn["resp_lang"])
            
            intent = res["proposed_intent"]
            match = (intent == turn["expected_intent"])
            if match:
                passed_turns += 1

            status_sym = "✓" if match else "✗"
            print(f"  {status_sym} Turn {t_idx+1}: [{turn['in_lang']}->{turn['resp_lang']}] '{turn['user']}'")
            print(f"     Intent: {intent} (Exp: {turn['expected_intent']}) | Polarity: {res['detected_meaning']['polarity']}")
            print(f"     Action: {res['clinical_guardrail']['proposed_action']} | Permitted: {res['clinical_guardrail']['action_permitted']}")
            print(f"     ASHA: \"{res['permitted_response']}\"")

            turn_logs.append({
                "turn_index": t_idx + 1,
                "user_utterance": turn["user"],
                "input_language": turn["in_lang"],
                "response_language": turn["resp_lang"],
                "expected_intent": turn["expected_intent"],
                "got_intent": intent,
                "intent_match": match,
                "polarity": res["detected_meaning"]["polarity"],
                "proposed_action": res["clinical_guardrail"]["proposed_action"],
                "action_permitted": res["clinical_guardrail"]["action_permitted"],
                "asha_response": res["permitted_response"]
            })

        dialogue_results.append({
            "scenario_id": dlg["id"],
            "title": dlg["title"],
            "description": dlg["description"],
            "turn_count": len(dlg["turns"]),
            "turns": turn_logs
        })

    summary = {
        "total_scenarios": len(DIALOGUE_SCENARIOS),
        "total_turns": total_turns,
        "turns_passed": passed_turns,
        "turn_accuracy": round(passed_turns / total_turns, 4),
        "scenarios": dialogue_results
    }

    out_file = os.path.join(BASE_DIR, "conversational_behavior_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"\nMulti-Turn Evaluation Completed!")
    print(f"Turn Accuracy: {passed_turns}/{total_turns} ({summary['turn_accuracy']*100}%)")
    print(f"Results saved to: {out_file}")

if __name__ == "__main__":
    run_dialogue_evaluation()
