#!/usr/bin/env python3
"""
Saksham Neuro-Care — Phase 2.5.6
ASHA Working Prototype Local Server (Port 8096)
Serves:
- 2D Interactive Web Interface (`public/index.html`)
- Static avatar assets mounted from `frontend/public/asha-companion/`
- REST APIs: `/api/chat`, `/api/reset`, `/api/status`, `/api/patient`, `/api/patients`, `/api/patient/switch`
Zero external dependencies; 100% Python standard library.
"""

import os
import sys
import json
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(CURRENT_DIR, "public")
ASSETS_DIR = "/Users/trishnabapna/Desktop/Saksham/frontend/public/asha-companion"

sys.path.append(CURRENT_DIR)
from env_loader import load_gateway_env, has_gemini_api_key

load_gateway_env(CURRENT_DIR)

from asha_engine import AshaEngine, DEFAULT_LLAMA_SERVER, DEFAULT_QWEN_MODEL_NAME

engine = AshaEngine()

class AshaRequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, data: dict, status: int = 200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Health Check
        if path in ["/health", "/api/health"]:
            gemini_ready = has_gemini_api_key()
            self._send_json({
                "status": "UP",
                "engine": "AshaEngineC",
                "orchestrator": "Gemini Primary + Local Qwen Fallback",
                "gemini_configured": gemini_ready,
                "cloud_primary_active": gemini_ready,
                "primary_model": engine.gemini_model,
                "fallback_model": DEFAULT_QWEN_MODEL_NAME,
                "inference_server": DEFAULT_LLAMA_SERVER,
                "local_only": not gemini_ready,
            })
            return

        # API: Status
        if path == "/api/status":
            gemini_ready = has_gemini_api_key()
            self._send_json({
                "service": "Saksham Asha Conversational AI Engine C",
                "status": "ONLINE",
                "port": 8096,
                "orchestrator": "Engine C (Gemini Primary + Local Qwen Fallback)",
                "gemini_configured": gemini_ready,
                "cloud_primary_active": gemini_ready,
                "primary_model": engine.gemini_model,
                "fallback_model": DEFAULT_QWEN_MODEL_NAME,
                "model": (
                    f"{engine.gemini_model} (Cloud Primary) + {DEFAULT_QWEN_MODEL_NAME} (Local Fallback)"
                    if gemini_ready
                    else DEFAULT_QWEN_MODEL_NAME
                ),
                "acceleration": (
                    "Cloud Gemini API + Apple Silicon Metal"
                    if gemini_ready
                    else "Apple Silicon Metal GPU"
                ),
                "active_patient_id": engine.active_patient_id,
                "history_depth": len(engine.history),
                "local_only": not gemini_ready,
            })
            return

        # API: Patient Profile
        if path == "/api/patient":
            self._send_json({
                "active_patient_id": engine.active_patient_id,
                "profile": engine.get_patient_profile()
            })
            return

        # API: List Patients
        if path == "/api/patients":
            self._send_json({
                "active_patient_id": engine.active_patient_id,
                "patients": engine.memory_store.get("patients", {})
            })
            return

        # API: List Item Locations
        if path == "/api/items":
            patient_id = urllib.parse.parse_qs(parsed.query).get("patient_id", [engine.active_patient_id])[0]
            self._send_json({
                "active_patient_id": patient_id,
                "items": engine.get_item_locations(patient_id)
            })
            return

        # Static Assets: Mount /assets/asha-companion/
        if path.startswith("/assets/asha-companion/"):
            rel_path = path[len("/assets/asha-companion/"):]
            file_path = os.path.normpath(os.path.join(ASSETS_DIR, rel_path))
            if os.path.exists(file_path) and os.path.isfile(file_path) and file_path.startswith(ASSETS_DIR):
                self._serve_file(file_path)
                return
            else:
                self.send_error(404, f"Asset not found: {rel_path}")
                return

        # Static Files: Serve from public/
        if path == "/" or path == "":
            path = "/index.html"
        
        file_path = os.path.normpath(os.path.join(PUBLIC_DIR, path.lstrip("/")))
        if os.path.exists(file_path) and os.path.isfile(file_path) and file_path.startswith(PUBLIC_DIR):
            self._serve_file(file_path)
            return

        self.send_error(404, f"File not found: {path}")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(length) if length > 0 else b"{}"

        try:
            body_json = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception:
            body_json = {}

        # API: Chat Turn
        if path == "/api/chat":
            user_msg = body_json.get("message", "").strip()
            lang = body_json.get("language", "en")
            patient_id = body_json.get("patient_id")
            if patient_id and patient_id != engine.active_patient_id and patient_id in engine.memory_store.get("patients", {}):
                engine.switch_patient(patient_id)
            if not user_msg:
                self._send_json({"error": "Empty message"}, status=400)
                return

            context = body_json.get("context")
            turn_result = engine.process_turn(user_msg, language=lang, context=context)
            self._send_json(turn_result)
            return

        # API: Reset
        if path == "/api/reset":
            engine.reset_conversation()
            self._send_json({
                "status": "RESET_SUCCESSFUL",
                "message": "Conversational memory reset successfully",
                "history_depth": 0
            })
            return

        # API: Switch Active Patient
        if path == "/api/patient/switch":
            target_id = body_json.get("patient_id", "")
            if engine.switch_patient(target_id):
                self._send_json({
                    "status": "SWITCHED",
                    "active_patient_id": engine.active_patient_id,
                    "profile": engine.get_patient_profile()
                })
            else:
                self._send_json({"error": f"Patient ID {target_id} not found"}, status=404)
            return

        # API: Update Patient Profile
        if path == "/api/patient":
            if isinstance(body_json, dict):
                for k, v in body_json.items():
                    engine.update_patient_memory(k, v)
                self._send_json({
                    "status": "UPDATED",
                    "active_patient_id": engine.active_patient_id,
                    "profile": engine.get_patient_profile()
                })
                return
            self._send_json({"error": "Invalid profile payload"}, status=400)
            return

        # API: Save/Update Item Location
        if path == "/api/items":
            if isinstance(body_json, dict):
                pid = body_json.get("patient_id", engine.active_patient_id)
                success = engine.save_item_location(body_json, pid)
                self._send_json({
                    "status": "SAVED" if success else "FAILED",
                    "active_patient_id": pid,
                    "items": engine.get_item_locations(pid)
                })
                return
            self._send_json({"error": "Invalid item payload"}, status=400)
            return

        # API: Scoped Multimodal Screenshot Diagnostic (Authorized Local Developer Tooling)
        if path == "/api/diagnostic/screenshot":
            if not isinstance(body_json, dict):
                self._send_json({"ok": False, "error": "Invalid diagnostic payload"}, status=400)
                return
            res = engine.analyze_screenshot_diagnostic(
                image_base64=str(body_json.get("image_base64", "")),
                mime_type=str(body_json.get("mime_type", "image/png")),
                issue_description=str(body_json.get("issue_description", "")),
                route_hint=str(body_json.get("route_hint", "")),
            )
            self._send_json(res, status=200 if res.get("ok") else 400)
            return

        self.send_error(404, f"Unknown API endpoint: {path}")

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(length) if length > 0 else b"{}"

        try:
            body_json = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception:
            body_json = {}

        if path == "/api/items":
            item_id = body_json.get("id") or body_json.get("item_id", "")
            pid = body_json.get("patient_id", engine.active_patient_id)
            if not item_id:
                self._send_json({"error": "Missing item_id parameter"}, status=400)
                return
            success = engine.delete_item_location(item_id, pid)
            self._send_json({
                "status": "DELETED" if success else "NOT_FOUND",
                "active_patient_id": pid,
                "items": engine.get_item_locations(pid)
            })
            return

        if path == "/api/patient/memory":
            field = body_json.get("field", "")
            idx = body_json.get("index", None)
            if not field:
                self._send_json({"error": "Missing field parameter"}, status=400)
                return
            success = engine.delete_patient_memory(field, idx)
            self._send_json({
                "status": "DELETED" if success else "FIELD_NOT_FOUND",
                "field": field,
                "profile": engine.get_patient_profile()
            })
            return

        self.send_error(404, f"Unknown API endpoint: {path}")

    def _serve_file(self, file_path: str):
        mime, _ = mimetypes.guess_type(file_path)
        if not mime:
            if file_path.endswith(".js"): mime = "application/javascript"
            elif file_path.endswith(".css"): mime = "text/css"
            elif file_path.endswith(".png"): mime = "image/png"
            elif file_path.endswith(".html"): mime = "text/html"
            else: mime = "application/octet-stream"

        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", f"{mime}; charset=utf-8" if "text" in mime or "javascript" in mime else mime)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Error reading file: {e}")

def run_server(port=8096):
    # Strict security: Bind exclusively to 127.0.0.1 loopback to prevent external network exposure
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, AshaRequestHandler)
    print(f"================================================================================")
    print(f"  SAKSHAM NEURO-CARE — ASHA ENGINE C LOCAL GATEWAY                              ")
    print(f"  URL: http://127.0.0.1:{port}                                                  ")
    print(f"  Static Web UI: {PUBLIC_DIR}                                                   ")
    print(f"  Avatar Rig Assets: {ASSETS_DIR}                                               ")
    print(f"  Primary Model: Gemini ({engine.gemini_model}, server-side key={'set' if has_gemini_api_key() else 'unset'})")
    print(f"  Fallback Endpoint: {DEFAULT_LLAMA_SERVER} (Qwen 2.5 1.5B on Apple Metal GPU) ")
    print(f"  Target Languages: en, hi, mr, ta, te, kn, bn (+ ml compatibility)              ")
    print(f"================================================================================")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()
