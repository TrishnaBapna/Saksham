"""
Server-side environment loader for the Saksham Python Asha Gateway.

Loads environment variables (such as GEMINI_API_KEY for future Engine C
integration) exclusively from a local, gitignored `.env` file using only the
Python standard library. Never prints, logs, or exposes secret values, and
never reads Vite client (`VITE_*`) variables.
"""

import os
from pathlib import Path
from typing import Dict, Optional

SERVER_ENV_FILENAME = ".env"
SERVER_LOCAL_ENV_FILENAME = ".env.local"
_PLACEHOLDER_VALUES = {
    "",
    "your_gemini_api_key_here",
    "replace_with_your_gemini_api_key",
}


def _strip_quotes_and_inline_comment(raw_val: str) -> str:
    val = raw_val.strip()
    if len(val) >= 2 and ((val[0] == '"' and val[-1] == '"') or (val[0] == "'" and val[-1] == "'")):
        return val[1:-1].strip()
    if " #" in val:
        val = val.split(" #", 1)[0].strip()
    return val


def parse_env_file(env_path: Path) -> Dict[str, str]:
    """Parses a local dotenv file without external dependencies or secret logging."""
    parsed: Dict[str, str] = {}
    if not env_path.is_file():
        return parsed

    with env_path.open("r", encoding="utf-8-sig") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[len("export "):].strip()
            if "=" not in line:
                continue

            key, raw_val = line.split("=", 1)
            key = key.strip()
            # Keep frontend Vite build variables strictly excluded from server secrets
            if not key or " " in key or key.startswith("VITE_"):
                continue

            value = _strip_quotes_and_inline_comment(raw_val)
            if value:
                parsed[key] = value
    return parsed


def load_gateway_env(base_dir: Optional[str] = None, override: bool = False) -> bool:
    """
    Loads local `.env` (and optional `.env.local`) from the Asha Gateway directory
    into `os.environ` without mutating or printing secret contents.

    Returns True if at least one env file existed on disk.
    """
    root = Path(base_dir) if base_dir else Path(__file__).resolve().parent
    found_any = False

    for filename in (SERVER_ENV_FILENAME, SERVER_LOCAL_ENV_FILENAME):
        env_path = root / filename
        if not env_path.is_file():
            continue
        found_any = True
        entries = parse_env_file(env_path)
        for key, value in entries.items():
            if override or not os.environ.get(key):
                os.environ[key] = value

    return found_any


def get_gemini_api_key() -> Optional[str]:
    """Returns configured server-side GEMINI_API_KEY if non-empty, else None."""
    raw = os.environ.get("GEMINI_API_KEY", "").strip()
    if raw.lower() in _PLACEHOLDER_VALUES:
        return None
    return raw


def has_gemini_api_key() -> bool:
    """Boolean availability check without exposing credential contents."""
    return get_gemini_api_key() is not None


def get_gemini_model(default: str = "gemini-3.5-flash-lite") -> str:
    """Returns configured Gemini model name, stripping any optional 'models/' prefix."""
    raw = os.environ.get("GEMINI_MODEL", "").strip()
    if raw.startswith("models/"):
        raw = raw[len("models/"):]
    return raw or default
