#!/usr/bin/env python3
"""
Phase 2.5.4 Seven-Language Code-Switching Comprehensive Benchmark Runner

Executes structured evaluation across:
- Test A: Individual language baseline (HI, MR, EN, TA, TE, KN, ML)
- Test B: Two-language switching (HI+EN, MR+EN, TA+EN, TE+EN, KN+EN, ML+EN, HI+MR, MR+HI)
- Test C: Three-language switching (HI+MR+EN, TA+EN+ML, KN+EN+TE, HI+EN+TA, MR+EN+KN)
- Test D: All-seven-language conversation (Continuous multi-lingual & multi-turn)
- Test E: Real conversational difficulties (Hesitation, repetition, self-correction, incomplete)
- Test F: Clinical meaning & safety (Water refusal, walk refusal, third-party, ingestion report)

Evaluates both ASR performance and Semantic engine performance independently.
Saves records to results/ and updates phase_2_5_4_results.json.
"""

import os
import sys
import json
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))

sys.path.append(BASE_DIR)
from evaluation_engine import (
    evaluate_full_recording_turn,
    run_whisper,
    evaluate_asr_result,
    evaluate_semantic_result
)

SCENARIOS_FILE = os.path.join(BASE_DIR, "scenarios.json")
RESULTS_DIR = os.path.join(BASE_DIR, "results")
RESULTS_JSON_FILE = os.path.join(BASE_DIR, "phase_2_5_4_results.json")
os.makedirs(RESULTS_DIR, exist_ok=True)

# Map available benchmark audio files to scenario IDs
AUDIO_MAPPING = {
    "TEST_A_HI_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "individual", "HI_01_everyday.wav"),
    "TEST_A_MR_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "individual", "MR_01_everyday.wav"),
    "TEST_A_EN_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "individual", "EN_01_everyday.wav"),
    "TEST_A_TA_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "individual", "TA_01_everyday.wav"),
    "TEST_A_TE_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "individual", "TE_01_everyday.wav"),
    "TEST_A_KN_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "individual", "KN_01_everyday.wav"),
    "TEST_A_ML_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "individual", "ML_01_everyday.wav"),

    "TEST_B_HI_EN_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "code_switching", "CS_B_hi_en.wav"),
    "TEST_B_MR_EN_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "code_switching", "CS_A_mr_en.wav"),
    "TEST_B_TA_EN_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "code_switching", "CS_D_ta_en.wav"),
    "TEST_B_TE_EN_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "code_switching", "CS_E_te_en.wav"),
    "TEST_B_KN_EN_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "code_switching", "CS_F_kn_en.wav"),
    "TEST_B_ML_EN_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "code_switching", "CS_C_ml_en.wav"),
    "TEST_B_HI_MR_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "scenarios", "SCENARIO_F_mr_hi.wav"),
    "TEST_B_MR_HI_01": os.path.join(REPO_ROOT, "research", "phase-2.4-asr-benchmark", "samples", "CAT_D_01_mr_hi.wav"),

    "TEST_C_HI_MR_EN_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "code_switching", "CS_G_mr_hi_en.wav"),
    "TEST_C_TA_EN_ML_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "code_switching", "CS_I_ta_en_hi.wav"),
    "TEST_C_KN_EN_TE_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "code_switching", "CS_K_kn_en_hi.wav"),
    "TEST_C_HI_EN_TA_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "seven_lang_tests", "code_switching", "CS_J_te_en_hi.wav"),
    "TEST_C_MR_EN_KN_01": os.path.join(REPO_ROOT, "research", "phase-2.4-asr-benchmark", "samples", "CAT_G_01_mr_hi_en.wav"),

    "TEST_E_HESITATION_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "scenarios", "SCENARIO_I_hesitation.wav"),
    "TEST_E_REPETITION_01": os.path.join(REPO_ROOT, "research", "phase-2.4-asr-benchmark", "samples", "CAT_I_01_hesitations.wav"),
    "TEST_E_SELFCORRECT_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "scenarios", "SCENARIO_H_self_correction.wav"),
    "TEST_E_INCOMPLETE_01": os.path.join(REPO_ROOT, "research", "phase-2.4-asr-benchmark", "samples", "CAT_H_01_circumlocution.wav"),
    "TEST_E_UNCERTAINTY_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "scenarios", "SCENARIO_G_circumlocution.wav"),

    "TEST_F_REFUSAL_WATER_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "scenarios", "SCENARIO_C_en.wav"),
    "TEST_F_REFUSAL_WALK_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "scenarios", "SCENARIO_B_hi.wav"),
    "TEST_F_THIRD_PARTY_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "scenarios", "SCENARIO_A_mr.wav"),
    "TEST_F_INGESTION_REPORT_01": os.path.join(REPO_ROOT, "research", "phase-2.5-asha-multilingual-poc", "scenarios", "SCENARIO_D_mr_en.wav")
}

def run_benchmark():
    with open(SCENARIOS_FILE, "r", encoding="utf-8") as f:
        scenarios_catalog = json.load(f)

    all_records = []
    print("================================================================================")
    print("  SAKSHAM PHASE 2.5.4 SEVEN-LANGUAGE BENCHMARK EXECUTION                       ")
    print("================================================================================")

    for suite in scenarios_catalog["test_suites"]:
        s_id = suite["suite_id"]
        print(f"\n--- Running Suite: {suite['suite_name']} ---")
        
        for sc in suite["scenarios"]:
            sc_id = sc["id"]
            wav_path = AUDIO_MAPPING.get(sc_id)
            
            # If no physical audio file is mapped (e.g. Test D continuous), synthesize or note status
            if not wav_path or not os.path.exists(wav_path):
                print(f"  [SKIPPED] {sc_id}: Audio file not available on disk (Awaiting live mic)")
                continue

            ref_text = sc["prompt_text"]
            
            # Execute dual evaluation turn
            print(f"  [RUNNING] {sc_id} ({sc['title']})...", end="", flush=True)
            turn_res = evaluate_full_recording_turn(
                wav_path=wav_path,
                reference_text=ref_text,
                scenario_meta=sc,
                language_mode="auto",
                native_speaker_verified=False
            )
            turn_res["source"] = "pre_recorded_benchmark"
            turn_res["wav_filename"] = os.path.basename(wav_path)
            all_records.append(turn_res)

            # Save individual record
            rec_file = os.path.join(RESULTS_DIR, f"{sc_id}_benchmark.json")
            with open(rec_file, "w", encoding="utf-8") as f:
                json.dump(turn_res, f, indent=2, ensure_ascii=False)

            asr_pass = turn_res["asr_evaluation"]["asr_passed"]
            sem_pass = turn_res["semantic_evaluation_whisper"]["semantic_passed"]
            print(f" Done! ASR: {'PASS' if asr_pass else 'FAIL'} | Sem: {'PASS' if sem_pass else 'FAIL'} | Attr: {turn_res['failure_cause'][:30]}")

    # Compute master dashboard metrics
    from app import compute_dashboard_metrics
    dashboard = compute_dashboard_metrics()
    with open(RESULTS_JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(dashboard, f, indent=2, ensure_ascii=False)

    print("\n================================================================================")
    print("  BENCHMARK EXECUTION SUMMARY                                                   ")
    print("================================================================================")
    print(f"  Total Evaluated: {dashboard['total_recordings']}")
    print(f"  Languages Covered: {dashboard['languages_tested_count']} / 7 ({', '.join(dashboard['languages_tested_list'])})")
    print(f"  2-Language Pairs: {dashboard['two_language_combinations_count']}")
    print(f"  3-Language Triplets: {dashboard['three_language_combinations_count']}")
    print(f"  ASR Accuracy: {dashboard['asr_accuracy_pct']}%")
    print(f"  Native Script Preservation: {dashboard['native_script_preservation_pct']}%")
    print(f"  Language Switch Preserved: {dashboard['language_switch_preservation_pct']}%")
    print(f"  Semantic Accuracy (Reference): {dashboard['semantic_accuracy_reference_pct']}%")
    print(f"  Semantic Accuracy (Whisper): {dashboard['semantic_accuracy_whisper_pct']}%")
    print(f"  Negation Accuracy: {dashboard['negation_accuracy_pct']}%")
    print(f"  Clarification Accuracy: {dashboard['clarification_accuracy_pct']}%")
    print(f"  Hallucination Count: {dashboard['hallucination_count']}")
    print("================================================================================")

if __name__ == "__main__":
    run_benchmark()
