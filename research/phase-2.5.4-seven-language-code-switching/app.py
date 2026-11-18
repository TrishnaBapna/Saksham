#!/usr/bin/env python3
"""
Phase 2.5.4 Real-Time Seven-Language Code-Switching & ASHA Understanding Server
Port: 8092 (Local Apple M1 HTTP Service)

Endpoints:
  GET  /                        -> Serves public/index.html
  GET  /api/status              -> System, Apple Silicon, and Whisper engine status
  GET  /api/scenarios           -> Catalog of structured test scenarios (A through F)
  GET  /api/dashboard           -> Live aggregated research metrics across all recordings
  GET  /recordings/<filename>   -> Serves recorded WAV files for playback
  POST /api/transcribe_audio    -> Accepts live microphone WAV upload, executes Whisper & ASHA
  POST /api/evaluate_turn       -> Accepts human-corrected reference transcript, dual-evaluates & saves
  POST /api/compare_modes       -> Evaluates same audio across auto-detect and forced language modes
"""

import os
import sys
import json
import time
import re
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import wave

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
RECORDINGS_DIR = os.path.join(BASE_DIR, "recordings")
RESULTS_DIR = os.path.join(BASE_DIR, "results")
SCENARIOS_FILE = os.path.join(BASE_DIR, "scenarios.json")
RESULTS_JSON_FILE = os.path.join(BASE_DIR, "phase_2_5_4_results.json")

os.makedirs(RECORDINGS_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

sys.path.append(BASE_DIR)
from evaluation_engine import (
    run_whisper,
    evaluate_asr_result,
    evaluate_semantic_result,
    evaluate_full_recording_turn,
    detect_scripts_in_text,
    detect_hallucination_or_loops
)

def load_all_results() -> List[Dict[str, Any]]:
    """Loads all saved test records from results directory."""
    records = []
    if os.path.exists(RESULTS_JSON_FILE):
        try:
            with open(RESULTS_JSON_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("records", [])
        except Exception:
            pass
    for fn in sorted(os.listdir(RESULTS_DIR)):
        if fn.endswith(".json"):
            try:
                with open(os.path.join(RESULTS_DIR, fn), "r", encoding="utf-8") as f:
                    records.append(json.load(f))
            except Exception:
                pass
    return records

def compute_dashboard_metrics() -> Dict[str, Any]:
    """Calculates all 14 required dashboard metrics from stored test records."""
    records = load_all_results()
    total_records = len(records)
    
    real_mic_count = sum(1 for r in records if r.get("source") == "real_microphone")
    languages_tested = set()
    two_lang_combos = set()
    three_lang_combos = set()
    seven_lang_count = 0
    
    asr_passed_count = 0
    script_preservation_sum = 0.0
    switch_preserved_count = 0
    multilang_records_count = 0
    
    sem_ref_passed_count = 0
    sem_asr_passed_count = 0
    
    negation_total = 0
    negation_passed = 0
    
    clarification_total = 0
    clarification_passed = 0
    
    hallucination_count = 0
    unrecognised_lang_count = 0
    
    for r in records:
        langs = r.get("languages", [])
        for l in langs: languages_tested.add(l)
        
        if len(langs) == 2:
            two_lang_combos.add("+".join(sorted(langs)))
        elif len(langs) == 3:
            three_lang_combos.add("+".join(sorted(langs)))
        elif len(langs) >= 7:
            seven_lang_count += 1
            
        asr_eval = r.get("asr_evaluation", {})
        if asr_eval.get("asr_passed"): asr_passed_count += 1
        script_preservation_sum += asr_eval.get("script_preservation_score", 0.0)
        
        if len(langs) > 1:
            multilang_records_count += 1
            if asr_eval.get("language_switch_preserved"):
                switch_preserved_count += 1
                
        if asr_eval.get("hallucination", {}).get("has_loop"):
            hallucination_count += 1
            
        whisper_data = r.get("whisper", {})
        if whisper_data.get("detected_lang") == "unknown":
            unrecognised_lang_count += 1
            
        sem_ref = r.get("semantic_evaluation_reference", {})
        if sem_ref.get("semantic_passed"): sem_ref_passed_count += 1
        
        sem_asr = r.get("semantic_evaluation_whisper", {})
        if sem_asr.get("semantic_passed"): sem_asr_passed_count += 1
        
        # Negation accuracy
        if sem_ref.get("expected_polarity") == "NEGATIVE":
            negation_total += 1
            if sem_asr.get("polarity_match"):
                negation_passed += 1
                
        # Clarification accuracy
        if sem_ref.get("expected_intent") == "CLARIFICATION_NEEDED":
            clarification_total += 1
            if sem_asr.get("is_clarification"):
                clarification_passed += 1

    return {
        "total_recordings": total_records,
        "total_real_microphone_recordings": real_mic_count,
        "languages_tested_count": len(languages_tested),
        "languages_tested_list": sorted(list(languages_tested)),
        "two_language_combinations_count": len(two_lang_combos),
        "two_language_combinations_list": sorted(list(two_lang_combos)),
        "three_language_combinations_count": len(three_lang_combos),
        "three_language_combinations_list": sorted(list(three_lang_combos)),
        "all_seven_language_recordings_count": seven_lang_count,
        "asr_accuracy_pct": round((asr_passed_count / total_records * 100.0), 2) if total_records > 0 else 0.0,
        "native_script_preservation_pct": round((script_preservation_sum / total_records * 100.0), 2) if total_records > 0 else 0.0,
        "language_switch_preservation_pct": round((switch_preserved_count / multilang_records_count * 100.0), 2) if multilang_records_count > 0 else 0.0,
        "semantic_accuracy_reference_pct": round((sem_ref_passed_count / total_records * 100.0), 2) if total_records > 0 else 0.0,
        "semantic_accuracy_whisper_pct": round((sem_asr_passed_count / total_records * 100.0), 2) if total_records > 0 else 0.0,
        "negation_accuracy_pct": round((negation_passed / negation_total * 100.0), 2) if negation_total > 0 else 0.0,
        "clarification_accuracy_pct": round((clarification_passed / clarification_total * 100.0), 2) if clarification_total > 0 else 0.0,
        "hallucination_count": hallucination_count,
        "unrecognised_language_count": unrecognised_lang_count,
        "records": records
    }

class Phase254Handler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/" or path == "/index.html":
            file_path = os.path.join(PUBLIC_DIR, "index.html")
            if os.path.exists(file_path):
                with open(file_path, "rb") as f: content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, "UI not found")
        elif path.startswith("/public/"):
            rel = path.replace("/public/", "", 1)
            file_path = os.path.join(PUBLIC_DIR, rel)
            if os.path.exists(file_path):
                ext = os.path.splitext(file_path)[1]
                mime = "text/css" if ext == ".css" else "application/javascript" if ext == ".js" else "text/plain"
                with open(file_path, "rb") as f: content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", f"{mime}; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, "File not found")
        elif path == "/api/scenarios":
            if os.path.exists(SCENARIOS_FILE):
                with open(SCENARIOS_FILE, "rb") as f: content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, "Scenarios file missing")
        elif path == "/api/status":
            status_data = {
                "server": "Saksham Phase 2.5.4 Research Server",
                "port": 8092,
                "hardware": "Apple M1 MacBook Air (8 GB Unified RAM)",
                "whisper_model": "ggml-small.bin (466 MiB)",
                "acceleration": "Metal GPU + Accelerate / NEON CPU Fallback",
                "languages_supported": ["hi", "mr", "en", "ml", "kn", "te", "ta"],
                "total_records": len(load_all_results())
            }
            content = json.dumps(status_data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        elif path == "/api/dashboard":
            metrics = compute_dashboard_metrics()
            content = json.dumps(metrics, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        elif path.startswith("/recordings/"):
            fname = os.path.basename(path)
            fpath = os.path.join(RECORDINGS_DIR, fname)
            if os.path.exists(fpath):
                with open(fpath, "rb") as f: content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, "Recording not found")
        else:
            self.send_error(404, "Endpoint not found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/transcribe_audio":
            # Direct audio stream upload from browser MediaRecorder
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error(400, "Empty audio body")
                return

            audio_data = self.rfile.read(content_length)
            qs = urllib.parse.parse_qs(parsed.query)
            lang_mode = qs.get("lang_mode", ["auto"])[0]
            scenario_id = qs.get("scenario_id", ["custom"])[0]

            timestamp_str = time.strftime("%Y%m%d_%H%M%S")
            wav_filename = f"rec_{scenario_id}_{timestamp_str}.wav"
            wav_path = os.path.join(RECORDINGS_DIR, wav_filename)

            with open(wav_path, "wb") as f:
                f.write(audio_data)

            # Run Whisper
            whisper_res = run_whisper(wav_path, language_mode=lang_mode)
            
            # Initial semantic evaluation on Whisper output
            from evaluation_engine import evaluate_semantic_result
            sem_res = evaluate_semantic_result(whisper_res.get("transcript", ""), "UNKNOWN", "UNKNOWN", "UNKNOWN")

            payload = {
                "status": "SUCCESS",
                "wav_filename": wav_filename,
                "audio_url": f"/recordings/{wav_filename}",
                "whisper": whisper_res,
                "initial_semantic": sem_res
            }
            content = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        elif path == "/api/evaluate_turn":
            # Save evaluation turn with human-corrected reference text
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(body)

            wav_filename = data.get("wav_filename", "")
            reference_text = data.get("reference_text", "")
            scenario_meta = data.get("scenario_meta", {})
            language_mode = data.get("language_mode", "auto")
            native_speaker_verified = data.get("native_speaker_verified", False)
            source = data.get("source", "real_microphone")

            wav_path = os.path.join(RECORDINGS_DIR, wav_filename)
            if not os.path.exists(wav_path):
                self.send_error(404, f"Audio file {wav_filename} not found")
                return

            turn_result = evaluate_full_recording_turn(
                wav_path=wav_path,
                reference_text=reference_text,
                scenario_meta=scenario_meta,
                language_mode=language_mode,
                native_speaker_verified=native_speaker_verified
            )
            turn_result["wav_filename"] = wav_filename
            turn_result["audio_url"] = f"/recordings/{wav_filename}"
            turn_result["source"] = source

            # Save individual result record
            rec_id = f"eval_{scenario_meta.get('id', 'custom')}_{int(time.time())}"
            rec_path = os.path.join(RESULTS_DIR, f"{rec_id}.json")
            with open(rec_path, "w", encoding="utf-8") as f:
                json.dump(turn_result, f, indent=2, ensure_ascii=False)

            # Update master phase_2_5_4_results.json
            dashboard = compute_dashboard_metrics()
            with open(RESULTS_JSON_FILE, "w", encoding="utf-8") as f:
                json.dump(dashboard, f, indent=2, ensure_ascii=False)

            content = json.dumps({"status": "SUCCESS", "result": turn_result, "dashboard": dashboard}, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        elif path == "/api/compare_modes":
            # Compare auto vs forced language mode on same WAV
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(body)
            wav_filename = data.get("wav_filename", "")
            forced_lang = data.get("forced_lang", "en")
            
            wav_path = os.path.join(RECORDINGS_DIR, wav_filename)
            if not os.path.exists(wav_path):
                self.send_error(404, "WAV file not found")
                return

            res_auto = run_whisper(wav_path, language_mode="auto")
            res_forced = run_whisper(wav_path, language_mode=forced_lang)

            payload = {
                "status": "SUCCESS",
                "wav_filename": wav_filename,
                "auto_mode": res_auto,
                "forced_mode": res_forced
            }
            content = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_error(404, "Endpoint not found")

def start_server(port=8092):
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, Phase254Handler)
    print("================================================================================")
    print("  SAKSHAM NEURO-CARE — PHASE 2.5.4 SEVEN-LANGUAGE CODE-SWITCHING SERVER         ")
    print(f"  URL: http://127.0.0.1:{port}                                                  ")
    print("  Hardware: Apple M1 MacBook Air (8 GB Unified RAM)                             ")
    print("  Model: Whisper.cpp Small (466 MiB) | ASHA Semantic Engine v2                  ")
    print("  Status: 100% OFFLINE, Zero Cloud Subscriptions, ₹0 Budget Compliant           ")
    print("================================================================================")
    httpd.serve_forever()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8092
    start_server(port)
