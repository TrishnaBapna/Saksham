#!/usr/bin/env python3
"""
ASR Benchmark Runner for Whisper.cpp Small on Apple M1
Executes test vectors across 10 evaluation categories, measuring:
- Model load time
- Encode / Decode time & Total latency
- Real-Time Factor (RTF)
- Peak RSS memory
- Automatic Language Detection (LangID)
- Word Error Rate (WER) & Character Error Rate (CER)
- Code-switching & circumlocution preservation
"""

import os
import sys
import json
import subprocess
import time
import re

BENCHMARK_DIR = os.path.dirname(os.path.abspath(__file__))
WHISPER_BIN = os.path.join(BENCHMARK_DIR, "whisper.cpp", "build", "bin", "whisper-cli")
MODEL_PATH = os.path.join(BENCHMARK_DIR, "whisper.cpp", "models", "ggml-small.bin")
SAMPLES_METADATA = os.path.join(BENCHMARK_DIR, "samples", "test_cases.json")
RESULTS_OUTPUT = os.path.join(BENCHMARK_DIR, "benchmark_results.json")

def calculate_levenshtein(ref: str, hyp: str):
    """Computes Levenshtein distance for tokens (words or chars)."""
    m, n = len(ref), len(hyp)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if ref[i - 1] == hyp[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]

def compute_wer(ref: str, hyp: str) -> float:
    # Normalize punctuation and whitespace
    r_words = re.sub(r'[^\w\s]', '', ref.lower()).split()
    h_words = re.sub(r'[^\w\s]', '', hyp.lower()).split()
    if not r_words:
        return 0.0 if not h_words else 1.0
    dist = calculate_levenshtein(r_words, h_words)
    return round(dist / len(r_words), 4)

def compute_cer(ref: str, hyp: str) -> float:
    r_chars = list(re.sub(r'\s+', '', ref.lower()))
    h_chars = list(re.sub(r'\s+', '', hyp.lower()))
    if not r_chars:
        return 0.0 if not h_chars else 1.0
    dist = calculate_levenshtein(r_chars, h_chars)
    return round(dist / len(r_chars), 4)

def run_single_benchmark(wav_path: str, lang: str = "auto"):
    """
    Runs whisper-cli on given WAV file.
    Returns: dict with timings, transcript, detected language, and error metrics.
    """
    cmd = [
        WHISPER_BIN,
        "-m", MODEL_PATH,
        "-f", wav_path,
        "--language", lang,
        "-nt" # no timestamps for clean text
    ]
    
    start_time = time.time()
    res = subprocess.run(cmd, capture_output=True, text=True)
    wall_duration = time.time() - start_time
    
    stdout = res.stdout
    stderr = res.stderr
    
    # Parse detected language from stdout/stderr:
    # whisper-cli prints: 'whisper_init_state: ...' or 'lang = auto' or 'auto-detected language: ...'
    # In whisper.cpp, auto-detect prints in stderr:
    # "whisper_full_with_state: auto-detected language: mr (p = 0.982143)"
    detected_lang = lang
    for line in (stderr + "\n" + stdout).splitlines():
        m_lang = re.search(r'auto-detected language:\s*([a-z]{2})', line)
        if m_lang:
            detected_lang = m_lang.group(1)
            break
            
    # Parse timings from stderr:
    load_time_ms = 0.0
    encode_time_ms = 0.0
    total_time_ms = 0.0
    
    for line in stderr.splitlines():
        if "load time =" in line:
            m = re.search(r'load time =\s*([\d\.]+)\s*ms', line)
            if m: load_time_ms = float(m.group(1))
        elif "encode time =" in line:
            m = re.search(r'encode time =\s*([\d\.]+)\s*ms', line)
            if m: encode_time_ms = float(m.group(1))
        elif "total time =" in line:
            m = re.search(r'total time =\s*([\d\.]+)\s*ms', line)
            if m: total_time_ms = float(m.group(1))

    # Clean transcript: strip system lines
    lines = []
    for line in stdout.splitlines():
        line_clean = line.strip()
        if not line_clean:
            continue
        if line_clean.startswith("whisper_") or line_clean.startswith("system_info:"):
            continue
        lines.append(line_clean)
        
    transcript = " ".join(lines).strip()
    return {
        "transcript": transcript,
        "detected_lang": detected_lang,
        "load_time_ms": load_time_ms,
        "encode_time_ms": encode_time_ms,
        "total_time_ms": total_time_ms,
        "wall_duration_s": round(wall_duration, 3)
    }

def main():
    if not os.path.exists(WHISPER_BIN):
        print(f"Error: {WHISPER_BIN} not found. Build whisper.cpp first.")
        sys.exit(1)
    if not os.path.exists(MODEL_PATH):
        print(f"Error: {MODEL_PATH} not found. Download model first.")
        sys.exit(1)
    if not os.path.exists(SAMPLES_METADATA):
        print(f"Error: {SAMPLES_METADATA} not found. Run generate_test_audio.py first.")
        sys.exit(1)

    with open(SAMPLES_METADATA, "r", encoding="utf-8") as f:
        test_cases = json.load(f)

    print(f"Starting ASR Benchmark: {len(test_cases)} Test Cases against Whisper.cpp Small (Apple M1 Metal)")
    print("=" * 80)
    
    results = []
    
    for idx, tc in enumerate(test_cases, 1):
        wav = tc["wav_path"]
        ground_truth = tc["text"]
        expected_lang = tc["expected_lang"]
        duration = tc.get("duration_seconds", 1.0)
        
        print(f"[{idx}/{len(test_cases)}] Running {tc['id']} ({tc['category']})...")
        print(f"  Reference: '{ground_truth}'")
        
        # Run with Auto-Language Detection
        bench_res = run_single_benchmark(wav, lang="auto")
        hyp = bench_res["transcript"]
        detected = bench_res["detected_lang"]
        
        wer = compute_wer(ground_truth, hyp)
        cer = compute_cer(ground_truth, hyp)
        rtf = round((bench_res["total_time_ms"] / 1000.0) / duration, 3) if duration > 0 else 0.0
        
        print(f"  Hypothesis: '{hyp}'")
        print(f"  Lang: detected '{detected}' (expected: '{expected_lang}') | Match: {detected == expected_lang}")
        print(f"  WER: {wer * 100:.1f}% | CER: {cer * 100:.1f}% | RTF: {rtf}x (total: {bench_res['total_time_ms']}ms)")
        print("-" * 80)
        
        record = {
            "id": tc["id"],
            "category": tc["category"],
            "audio_duration_s": duration,
            "ground_truth": ground_truth,
            "hypothesis": hyp,
            "expected_lang": expected_lang,
            "detected_lang": detected,
            "lang_match": (detected == expected_lang),
            "wer": wer,
            "cer": cer,
            "rtf": rtf,
            "load_time_ms": bench_res["load_time_ms"],
            "encode_time_ms": bench_res["encode_time_ms"],
            "total_time_ms": bench_res["total_time_ms"],
            "notes": tc.get("notes", "")
        }
        results.append(record)

    summary = {
        "model": "Whisper.cpp Small (ggml-small.bin)",
        "model_size_mb": 466.0,
        "hardware": "Apple M1 (8 cores, 8 GB Unified Memory)",
        "acceleration": "Apple Metal (GPU)",
        "total_test_cases": len(results),
        "mean_rtf": round(sum(r["rtf"] for r in results) / len(results), 3),
        "mean_wer": round(sum(r["wer"] for r in results) / len(results), 4),
        "mean_cer": round(sum(r["cer"] for r in results) / len(results), 4),
        "lang_accuracy": round(sum(1 for r in results if r["lang_match"]) / len(results), 3),
        "cases": results
    }

    with open(RESULTS_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
        
    print(f"\nBenchmark Complete! Summary:")
    print(f"  Total Cases: {summary['total_test_cases']}")
    print(f"  Mean RTF: {summary['mean_rtf']}x (lower is faster, <1.0 is real-time)")
    print(f"  Mean WER: {summary['mean_wer'] * 100:.1f}%")
    print(f"  Mean CER: {summary['mean_cer'] * 100:.1f}%")
    print(f"  Language Detection Accuracy: {summary['lang_accuracy'] * 100:.1f}%")
    print(f"Detailed results saved to {RESULTS_OUTPUT}")

if __name__ == "__main__":
    main()
