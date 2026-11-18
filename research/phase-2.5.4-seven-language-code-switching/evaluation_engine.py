#!/usr/bin/env python3
"""
Phase 2.5.4 Seven-Language Code-Switching & ASHA Understanding Evaluation Engine

Evaluates:
1. Whisper.cpp Speech-to-Text performance (ASR):
   - Word Error Rate & Token similarity
   - Native script preservation across 7 languages
   - Language-switch preservation in mixed utterances
   - Automatic language ID vs forced language decoding
   - Acoustic hallucination and runaway repetition detection
2. ASHA Semantic Understanding Engine (Phase 2.5.2 v2):
   - Intent recognition from human-verified transcript
   - Intent recognition from actual Whisper transcript
   - Negation scope and polarity detection
   - Clarification behaviour on ambiguous / hesitant input
   - Deterministic clinical safety guard compliance (100% block)
"""

import os
import sys
import json
import time
import subprocess
import re
import unicodedata
from typing import Dict, Any, List, Optional, Tuple

# Path configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
WHISPER_BIN = os.path.join(REPO_ROOT, "research", "phase-2.4-asr-benchmark", "whisper.cpp", "build", "bin", "whisper-cli")
MODEL_PATH = os.path.join(REPO_ROOT, "research", "phase-2.4-asr-benchmark", "whisper.cpp", "models", "ggml-small.bin")

# Import AshaSemanticEngineV2
sys.path.append(os.path.join(REPO_ROOT, "research", "phase-2.5.2-asha-semantic-validation"))
try:
    from asha_semantic_engine_v2 import AshaSemanticEngineV2
except ImportError:
    raise ImportError("Could not import AshaSemanticEngineV2 from research/phase-2.5.2-asha-semantic-validation")

semantic_engine = AshaSemanticEngineV2()

# Unicode Script Ranges
UNICODE_SCRIPTS = {
    "LATIN": (0x0041, 0x007A),
    "DEVANAGARI": (0x0900, 0x097F),
    "TAMIL": (0x0B80, 0x0BFF),
    "TELUGU": (0x0C00, 0x0C7F),
    "KANNADA": (0x0C80, 0x0CFF),
    "MALAYALAM": (0x0D00, 0x0D7F)
}

LANG_TO_SCRIPT = {
    "en": "LATIN",
    "hi": "DEVANAGARI",
    "mr": "DEVANAGARI",
    "ta": "TAMIL",
    "te": "TELUGU",
    "kn": "KANNADA",
    "ml": "MALAYALAM"
}

def detect_scripts_in_text(text: str) -> List[str]:
    """Detects which writing scripts are present in the text."""
    scripts_found = set()
    for char in text:
        cp = ord(char)
        for s_name, (s_start, s_end) in UNICODE_SCRIPTS.items():
            if s_start <= cp <= s_end:
                scripts_found.add(s_name)
                break
    return sorted(list(scripts_found))

def detect_hallucination_or_loops(text: str) -> Dict[str, Any]:
    """Checks for runaway token repetition loops or character loops."""
    words = text.strip().split()
    if len(words) >= 4:
        # Check repeated consecutive identical words
        for i in range(len(words) - 3):
            if words[i].lower() == words[i+1].lower() == words[i+2].lower() == words[i+3].lower():
                return {"has_loop": True, "type": "WORD_REPETITION_LOOP", "pattern": words[i]}
    
    # Check runaway non-ASCII glyph repetition (e.g. ឍឍឍ)
    m = re.search(r'([^\w\s])\1{4,}', text)
    if m:
        return {"has_loop": True, "type": "GLYPH_RUNAWAY", "pattern": m.group(0)}
    
    return {"has_loop": False, "type": None, "pattern": None}

def run_whisper(wav_path: str, language_mode: str = "auto", force_cpu: bool = False) -> Dict[str, Any]:
    """
    Executes local Whisper.cpp Small model.
    Attempts Metal GPU execution; if memory allocation fails, automatically falls back to CPU.
    """
    if not os.path.exists(wav_path):
        raise FileNotFoundError(f"Audio file not found: {wav_path}")
    if not os.path.exists(WHISPER_BIN):
        raise FileNotFoundError(f"Whisper binary not found: {WHISPER_BIN}")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model weights not found: {MODEL_PATH}")

    # Inspect audio duration via afinfo or wave
    audio_dur = 0.0
    try:
        import wave
        with wave.open(wav_path, 'rb') as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            audio_dur = round(frames / float(rate), 2)
    except Exception:
        pass

    def execute_command(use_gpu: bool):
        cmd = [
            WHISPER_BIN,
            "-m", MODEL_PATH,
            "-f", wav_path,
            "--language", language_mode,
            "-nt",
            "-t", "4"
        ]
        if not use_gpu:
            cmd.append("-ng")
        
        start_time = time.time()
        res = subprocess.run(cmd, capture_output=True, text=True)
        wall_time_ms = round((time.time() - start_time) * 1000.0, 2)
        return res, wall_time_ms

    used_device = "Apple Silicon Metal (GPU)"
    res, wall_ms = execute_command(use_gpu=not force_cpu)
    
    # Check if GPU allocation failed (e.g. out of memory buffer assert)
    if res.returncode != 0 and ("failed to allocate Metal buffer" in res.stderr or "GGML_ASSERT" in res.stderr or force_cpu):
        used_device = "Apple Silicon Accelerate / NEON (CPU Fallback)"
        res, wall_ms = execute_command(use_gpu=False)

    stdout = res.stdout.strip()
    stderr = res.stderr

    # Parse detected language from stderr
    detected_lang = "unknown"
    for line in stderr.splitlines():
        m_lang = re.search(r'auto-detected language:\s*([a-z]{2})', line)
        if m_lang:
            detected_lang = m_lang.group(1)
            break

    # Parse whisper internal timings
    load_time_ms = 0.0
    encode_time_ms = 0.0
    decode_time_ms = 0.0
    for line in stderr.splitlines():
        if "load time =" in line:
            m = re.search(r'load time =\s*([\d\.]+)\s*ms', line)
            if m: load_time_ms = float(m.group(1))
        elif "encode time =" in line:
            m = re.search(r'encode time =\s*([\d\.]+)\s*ms', line)
            if m: encode_time_ms = float(m.group(1))
        elif "decode time =" in line:
            m = re.search(r'decode time =\s*([\d\.]+)\s*ms', line)
            if m: decode_time_ms = float(m.group(1))

    rtf = round((wall_ms / 1000.0) / audio_dur, 3) if audio_dur > 0 else 0.0

    return {
        "status": "SUCCESS" if res.returncode == 0 else "ERROR",
        "return_code": res.returncode,
        "transcript": stdout,
        "language_mode": language_mode,
        "detected_lang": detected_lang,
        "execution_device": used_device,
        "audio_duration_seconds": audio_dur,
        "wall_time_ms": wall_ms,
        "load_time_ms": load_time_ms,
        "encode_time_ms": encode_time_ms,
        "decode_time_ms": decode_time_ms,
        "real_time_factor": rtf,
        "raw_stderr": stderr
    }

def calculate_token_similarity(hyp: str, ref: str) -> float:
    """Calculates word-level Jaccard token overlap similarity (0.0 to 1.0)."""
    norm_hyp = set(re.findall(r'\w+', hyp.lower()))
    norm_ref = set(re.findall(r'\w+', ref.lower()))
    if not norm_ref:
        return 1.0 if not norm_hyp else 0.0
    intersection = norm_hyp.intersection(norm_ref)
    union = norm_hyp.union(norm_ref)
    return round(len(intersection) / float(len(union)), 4)

def evaluate_asr_result(whisper_output: Dict[str, Any], reference_text: str, expected_languages: List[str]) -> Dict[str, Any]:
    """Evaluates Speech-to-Text performance against reference text."""
    hyp_text = whisper_output.get("transcript", "").strip()
    detected_lang = whisper_output.get("detected_lang", "unknown")
    
    similarity = calculate_token_similarity(hyp_text, reference_text)
    scripts_in_hyp = detect_scripts_in_text(hyp_text)
    scripts_in_ref = detect_scripts_in_text(reference_text)
    
    # Check script preservation: did hyp preserve expected native scripts?
    expected_scripts = set(LANG_TO_SCRIPT.get(l, "UNKNOWN") for l in expected_languages)
    hyp_scripts_set = set(scripts_in_hyp)
    preserved_scripts = expected_scripts.intersection(hyp_scripts_set)
    script_preservation_score = len(preserved_scripts) / float(len(expected_scripts)) if expected_scripts else 1.0
    
    # Check language switch preservation
    # For multi-lingual sentences, did at least one token from each language survive?
    has_switch = len(expected_languages) > 1
    switch_preserved = False
    if has_switch:
        # Check if words from multiple languages or multiple scripts exist
        if len(hyp_scripts_set) > 1 or similarity >= 0.5:
            switch_preserved = True
    else:
        switch_preserved = True

    # Hallucination check
    hallucination_info = detect_hallucination_or_loops(hyp_text)
    
    # Word count omission check
    ref_word_count = len(reference_text.split())
    hyp_word_count = len(hyp_text.split())
    is_truncated = hyp_word_count < max(1, ref_word_count // 3)

    asr_passed = (similarity >= 0.40 and not hallucination_info["has_loop"] and not is_truncated)

    return {
        "hypothesis_text": hyp_text,
        "reference_text": reference_text,
        "token_similarity": similarity,
        "asr_passed": asr_passed,
        "detected_language": detected_lang,
        "expected_languages": expected_languages,
        "scripts_in_hypothesis": scripts_in_hyp,
        "scripts_in_reference": scripts_in_ref,
        "script_preservation_score": round(script_preservation_score, 2),
        "language_switch_preserved": switch_preserved,
        "hallucination": hallucination_info,
        "is_truncated": is_truncated
    }

def evaluate_semantic_result(transcript: str, expected_intent: str, expected_polarity: str, expected_concept: str) -> Dict[str, Any]:
    """Evaluates semantic interpretation of a given transcript."""
    sem_turn = semantic_engine.process_turn(raw_transcript=transcript)
    
    got_intent = sem_turn["proposed_intent"]
    got_concept = sem_turn["detected_meaning"]["primary_concept"]
    got_polarity = sem_turn["detected_meaning"]["polarity"]
    action = sem_turn["clinical_guardrail"]["proposed_action"]
    action_permitted = sem_turn["clinical_guardrail"]["action_permitted"]
    
    intent_match = (got_intent == expected_intent)
    polarity_match = (got_polarity == expected_polarity)
    concept_match = (got_concept == expected_concept)
    
    # Clinical guardrail violation check
    guardrail_violated = (action_permitted is True or sem_turn["clinical_guardrail"]["firestore_write_permitted"] is True)
    
    # Clarification triggered when expected or needed
    is_clarification = (got_intent == "CLARIFICATION_NEEDED" or sem_turn["uncertainty_level"] == "HIGH")

    semantic_passed = (intent_match and polarity_match and not guardrail_violated)

    return {
        "transcript_evaluated": transcript,
        "got_intent": got_intent,
        "expected_intent": expected_intent,
        "intent_match": intent_match,
        "got_concept": got_concept,
        "expected_concept": expected_concept,
        "concept_match": concept_match,
        "got_polarity": got_polarity,
        "expected_polarity": expected_polarity,
        "polarity_match": polarity_match,
        "clinical_action": action,
        "clinical_guardrail_intact": not guardrail_violated,
        "is_clarification": is_clarification,
        "semantic_passed": semantic_passed,
        "asha_response": sem_turn["permitted_response"]
    }

def evaluate_full_recording_turn(
    wav_path: str,
    reference_text: str,
    scenario_meta: Dict[str, Any],
    language_mode: str = "auto",
    native_speaker_verified: bool = False
) -> Dict[str, Any]:
    """
    Executes complete dual evaluation:
    1. Whisper ASR on WAV
    2. ASR metric calculation vs Reference
    3. Semantic evaluation on Reference text (Human Truth)
    4. Semantic evaluation on Whisper Transcript (End-to-End ASHA)
    """
    # 1. Run Whisper
    whisper_res = run_whisper(wav_path, language_mode=language_mode)
    whisper_transcript = whisper_res.get("transcript", "")
    
    expected_langs = scenario_meta.get("languages", ["en"])
    expected_intent = scenario_meta.get("expected_intent", "UNKNOWN_INTENT")
    expected_polarity = scenario_meta.get("expected_polarity", "POSITIVE")
    expected_concept = scenario_meta.get("expected_concept", "UNKNOWN")

    # 2. Evaluate ASR
    asr_eval = evaluate_asr_result(whisper_res, reference_text, expected_langs)

    # 3. Evaluate Semantic on Human Reference (Isolated Semantic Engine Capability)
    sem_eval_ref = evaluate_semantic_result(reference_text, expected_intent, expected_polarity, expected_concept)

    # 4. Evaluate Semantic on Whisper Transcript (End-to-End System Capability)
    sem_eval_asr = evaluate_semantic_result(whisper_transcript, expected_intent, expected_polarity, expected_concept)

    # Causal Failure Analysis
    failure_cause = "NONE"
    if not asr_eval["asr_passed"] and not sem_eval_asr["semantic_passed"]:
        if sem_eval_ref["semantic_passed"]:
            failure_cause = "ASR_FAILURE (Whisper transcribed incorrectly, but semantic engine understood reference)"
        else:
            failure_cause = "COMPOUND_FAILURE (Both ASR and Semantic Engine failed)"
    elif asr_eval["asr_passed"] and not sem_eval_asr["semantic_passed"]:
        failure_cause = "SEMANTIC_FAILURE (Whisper transcribed well, but semantic engine misinterpreted intent)"

    return {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "scenario_id": scenario_meta.get("id", "CUSTOM"),
        "category": scenario_meta.get("category", "CUSTOM"),
        "title": scenario_meta.get("title", "Custom Utterance"),
        "languages": expected_langs,
        "combination": scenario_meta.get("combination", "+".join(expected_langs)),
        "native_speaker_verified": native_speaker_verified,
        "whisper": whisper_res,
        "asr_evaluation": asr_eval,
        "semantic_evaluation_reference": sem_eval_ref,
        "semantic_evaluation_whisper": sem_eval_asr,
        "failure_cause": failure_cause
    }
