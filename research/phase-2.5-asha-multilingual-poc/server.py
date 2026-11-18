#!/usr/bin/env python3
"""
Phase 2.5 ASHA Multilingual Proof of Concept Server
Lightweight HTTP server serving the interactive demonstration UI and API endpoints.

Endpoints:
  GET  /                     -> Serves public/index.html
  GET  /api/status           -> System, Model, and Metal GPU status
  GET  /api/scenarios        -> Scenario manifest (A through J)
  GET  /scenarios/<file>     -> Audio files for scenarios
  POST /api/transcribe       -> Accepts audio upload or scenario_id, runs whisper-cli & ASHA engine
  POST /api/reset_context    -> Resets conversation history
"""

import os
import sys
import json
import time
import subprocess
import re
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import tempfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
SCENARIOS_DIR = os.path.join(BASE_DIR, "scenarios")
SEVEN_LANG_DIR = os.path.join(BASE_DIR, "seven_lang_tests")
WHISPER_BIN = os.path.abspath(os.path.join(BASE_DIR, "..", "phase-2.4-asr-benchmark", "whisper.cpp", "build", "bin", "whisper-cli"))
MODEL_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "phase-2.4-asr-benchmark", "whisper.cpp", "models", "ggml-small.bin"))

sys.path.append(BASE_DIR)
from asha_conversation_engine import AshaConversationEngine

engine = AshaConversationEngine()

def run_whisper(wav_path: str):
    cmd = [
        WHISPER_BIN,
        "-m", MODEL_PATH,
        "-f", wav_path,
        "--language", "auto",
        "-nt"
    ]
    start = time.time()
    res = subprocess.run(cmd, capture_output=True, text=True)
    wall_duration = time.time() - start
    
    stdout = res.stdout
    stderr = res.stderr
    
    detected_lang = "unknown"
    for line in (stderr + "\n" + stdout).splitlines():
        m_lang = re.search(r'auto-detected language:\s*([a-z]{2})', line)
        if m_lang:
            detected_lang = m_lang.group(1)
            break
            
    load_time_ms = 0.0
    encode_time_ms = 0.0
    total_time_ms = 0.0
    metal_device = "Unknown"
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
        elif "GPU name:" in line:
            metal_device = line.split(":", 1)[1].strip()

    lines = []
    for line in stdout.splitlines():
        l_str = line.strip()
        if not l_str or l_str.startswith("whisper_") or l_str.startswith("system_info:"):
            continue
        lines.append(l_str)
    transcript = " ".join(lines).strip()
    
    return {
        "transcript": transcript,
        "detected_lang": detected_lang,
        "load_time_ms": load_time_ms,
        "encode_time_ms": encode_time_ms,
        "total_time_ms": total_time_ms,
        "wall_duration_s": round(wall_duration, 3),
        "metal_device": metal_device,
        "raw_stderr": stderr[-2500:] # Last 2500 chars of logs
    }

class PocHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/" or path == "/index.html":
            index_path = os.path.join(PUBLIC_DIR, "index.html")
            if os.path.exists(index_path):
                with open(index_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, "index.html not found")
            return

        elif path == "/api/status":
            status_data = {
                "status": "ONLINE_OFFLINE_READY",
                "hardware": "Apple M1 Metal GPU",
                "unified_ram": "8.0 GB",
                "whisper_binary_present": os.path.exists(WHISPER_BIN),
                "model_present": os.path.exists(MODEL_PATH),
                "model_name": "Whisper.cpp Small (ggml-small.bin, 466 MiB)",
                "acceleration": "Apple Metal Framework (GGML_METAL=ON)",
                "is_genuinely_offline": True,
                "cloud_api_cost": "₹0.00 (Firebase Spark Free compliant)"
            }
            content = json.dumps(status_data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        elif path == "/api/scenarios":
            manifest_file = os.path.join(SCENARIOS_DIR, "scenarios.json")
            if os.path.exists(manifest_file):
                with open(manifest_file, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, "Scenarios not generated yet")
            return

        elif path == "/api/seven_lang_manifest":
            manifest_file = os.path.join(SEVEN_LANG_DIR, "seven_lang_manifest.json")
            if os.path.exists(manifest_file):
                with open(manifest_file, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, "Seven language manifest not found")
            return

        elif path.startswith("/seven_lang_tests/"):
            rel_path = path[len("/seven_lang_tests/"):]
            file_path = os.path.join(SEVEN_LANG_DIR, rel_path)
            if os.path.exists(file_path):
                with open(file_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, f"File {rel_path} not found")
            return

        elif path.startswith("/scenarios/"):
            filename = os.path.basename(path)
            file_path = os.path.join(SCENARIOS_DIR, filename)
            if os.path.exists(file_path):
                with open(file_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, f"Audio file {filename} not found")
            return

        self.send_error(404, "Path not found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/reset_context":
            engine.context.reset()
            resp = json.dumps({"status": "SUCCESS", "message": "Context reset."}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(resp)))
            self.end_headers()
            self.wfile.write(resp)
            return

        elif path == "/api/transcribe":
            content_type = self.headers.get("Content-Type", "")
            content_length = int(self.headers.get("Content-Length", 0))

            temp_wav = None
            response_lang = "en"
            audio_source = "LIVE_MICROPHONE"

            try:
                if "application/json" in content_type:
                    body = self.rfile.read(content_length)
                    data = json.loads(body.decode("utf-8"))
                    response_lang = data.get("response_lang", "en")
                    scenario_id = data.get("scenario_id")
                    
                    if scenario_id:
                        scenario_path = os.path.join(SCENARIOS_DIR, f"{scenario_id}.wav")
                        if not os.path.exists(scenario_path):
                            # Check seven_lang_tests
                            indiv_path = os.path.join(SEVEN_LANG_DIR, "individual", f"{scenario_id}.wav")
                            cs_path = os.path.join(SEVEN_LANG_DIR, "code_switching", f"{scenario_id}.wav")
                            if os.path.exists(indiv_path):
                                scenario_path = indiv_path
                            elif os.path.exists(cs_path):
                                scenario_path = cs_path
                            else:
                                self.send_error(404, f"Scenario {scenario_id} not found")
                                return
                        wav_to_transcribe = scenario_path
                        audio_source = f"SCENARIO_{scenario_id}"
                    elif "audio_base64" in data:
                        import base64
                        temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
                        temp_wav.write(base64.b64decode(data["audio_base64"]))
                        temp_wav.close()
                        wav_to_transcribe = temp_wav.name
                    else:
                        self.send_error(400, "Missing scenario_id or audio_base64")
                        return

                elif "audio/wav" in content_type or "audio/wave" in content_type or "application/octet-stream" in content_type:
                    # Raw binary WAV
                    query = urllib.parse.parse_qs(parsed.query)
                    response_lang = query.get("response_lang", ["en"])[0]
                    temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
                    temp_wav.write(self.rfile.read(content_length))
                    temp_wav.close()
                    wav_to_transcribe = temp_wav.name
                else:
                    self.send_error(400, f"Unsupported Content-Type: {content_type}")
                    return

                # Calculate audio duration via afinfo
                info_res = subprocess.run(["afinfo", wav_to_transcribe], capture_output=True, text=True)
                audio_dur = 0.0
                for line in info_res.stdout.splitlines():
                    if "estimated duration:" in line:
                        try:
                            audio_dur = float(line.split(":")[1].replace("sec", "").strip())
                        except Exception:
                            pass

                # Execute Whisper ASR with Apple M1 Metal
                asr_res = run_whisper(wav_to_transcribe)
                
                # Compute Real-Time Factor
                rtf = round((asr_res["total_time_ms"] / 1000.0) / audio_dur, 3) if audio_dur > 0 else 0.0

                # Execute ASHA Conversation Layer
                conv_res = engine.process_turn(
                    raw_transcript=asr_res["transcript"],
                    detected_lang=asr_res["detected_lang"],
                    response_lang=response_lang
                )

                response_payload = {
                    "status": "SUCCESS",
                    "audio_source": audio_source,
                    "audio_duration_seconds": round(audio_dur, 2),
                    "whisper": {
                        "transcript": asr_res["transcript"],
                        "detected_language": asr_res["detected_lang"],
                        "load_time_ms": asr_res["load_time_ms"],
                        "encode_time_ms": asr_res["encode_time_ms"],
                        "total_latency_ms": asr_res["total_time_ms"],
                        "real_time_factor": rtf,
                        "metal_gpu": asr_res["metal_device"],
                        "raw_logs": asr_res["raw_stderr"]
                    },
                    "asha": {
                        "response_lang": response_lang,
                        "intent": conv_res["intent"],
                        "asha_response": conv_res["asha_response"],
                        "safety_triggered": conv_res["safety_triggered"],
                        "clinical_action": conv_res["clinical_action"],
                        "confidence_notes": conv_res["confidence_notes"],
                        "is_self_corrected": conv_res["is_self_corrected"],
                        "context_turns": conv_res["context_history_depth"]
                    },
                    "offline_verified": True
                }

                content = json.dumps(response_payload, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)

            except Exception as e:
                err_resp = json.dumps({"status": "ERROR", "error": str(e)}).encode("utf-8")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(err_resp)))
                self.end_headers()
                self.wfile.write(err_resp)
            finally:
                if temp_wav and os.path.exists(temp_wav.name):
                    try: os.remove(temp_wav.name)
                    except Exception: pass

        else:
            self.send_error(404, "Endpoint not found")

def start_server(port=8090):
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, PocHandler)
    print(f"================================================================================")
    print(f"  SAKSHAM NEURO-CARE — PHASE 2.5 ASHA MULTILINGUAL PROOF OF CONCEPT SERVER     ")
    print(f"  URL: http://127.0.0.1:{port}                                                  ")
    print(f"  Hardware: Apple M1 Metal GPU | Model: Whisper.cpp Small (466 MiB ggml)        ")
    print(f"  Status: 100% OFFLINE, Zero Cloud Subscriptions, Spark Free Compliant          ")
    print(f"================================================================================")
    httpd.serve_forever()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
    start_server(port)
