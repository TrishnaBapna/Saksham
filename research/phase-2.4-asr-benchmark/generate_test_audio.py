#!/usr/bin/env python3
"""
Test Audio Generator for Phase 2.4 Multilingual ASR Benchmark
Generates synthetic 16kHz 16-bit mono WAV files covering 10 test categories
using macOS speech synthesizer (`say`).

All generated audio samples are clearly labeled as SYNTHETIC TTS BENCHMARK VECTORS.
"""

import os
import subprocess
import json

SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "samples")
METADATA_FILE = os.path.join(SAMPLES_DIR, "test_cases.json")

TEST_CASES = [
    {
        "id": "CAT_A_01_mr",
        "category": "Cat A: Pure Marathi",
        "text": "मला आज खूप थकवा जाणवत आहे, औषध कधी घ्यायचे?",
        "expected_lang": "mr",
        "voice": "Lekha", # Lekha speaks Devanagari phonemes accurately
        "rate": 140,
        "notes": "Elderly Marathi prompt regarding fatigue and medication schedule"
    },
    {
        "id": "CAT_B_01_hi",
        "category": "Cat B: Pure Hindi",
        "text": "मुझे आज बहुत थकान महसूस हो रही है, दवा कब लेनी है?",
        "expected_lang": "hi",
        "voice": "Lekha",
        "rate": 140,
        "notes": "Elderly Hindi prompt regarding fatigue and medication schedule"
    },
    {
        "id": "CAT_C_01_en",
        "category": "Cat C: Pure Indian English",
        "text": "Can you please show me my family photos?",
        "expected_lang": "en",
        "voice": "Rishi",
        "rate": 150,
        "notes": "Patient requesting family photos with Indian English accent"
    },
    {
        "id": "CAT_D_01_mr_hi",
        "category": "Cat D: Marathi + Hindi Code-Switching",
        "text": "मला पाणी पाहिजे, दवा कब लेनी है?",
        "expected_lang": "mr", # Code-switched MR/HI
        "voice": "Lekha",
        "rate": 140,
        "notes": "Marathi clause ('मला पाणी पाहिजे') followed by Hindi clause ('दवा कब लेनी है')"
    },
    {
        "id": "CAT_E_01_mr_en",
        "category": "Cat E: Marathi + English Code-Switching",
        "text": "Mala water pahije please.",
        "expected_lang": "mr", # Marathi base with English nouns
        "voice": "Rishi",
        "rate": 135,
        "notes": "Colloquial Marathi with English loanwords (water, please)"
    },
    {
        "id": "CAT_E_02_mr_en",
        "category": "Cat E: Marathi + English Code-Switching",
        "text": "मला औषध पाहिजे but I forgot where I kept it.",
        "expected_lang": "mr",
        "voice": "Rishi",
        "rate": 135,
        "notes": "Marathi clause followed by English clause"
    },
    {
        "id": "CAT_F_01_hi_en",
        "category": "Cat F: Hindi + English (Hinglish)",
        "text": "मुझे medicine याद नहीं आ रही.",
        "expected_lang": "hi",
        "voice": "Lekha",
        "rate": 140,
        "notes": "Hindi sentence with English word 'medicine'"
    },
    {
        "id": "CAT_F_02_hi_en",
        "category": "Cat F: Hindi + English (Hinglish)",
        "text": "Asha mujhe Marathi samajh nahi aa raha, Hindi mein bolo.",
        "expected_lang": "hi",
        "voice": "Rishi",
        "rate": 140,
        "notes": "Patient asking ASHA in Hinglish to speak Hindi"
    },
    {
        "id": "CAT_G_01_mr_hi_en",
        "category": "Cat G: Three-Language Mixed (MR + HI + EN)",
        "text": "Mala aushadh pahije, par mujhe yaad nahi, can you help me?",
        "expected_lang": "mr", # Multi-language code-mix
        "voice": "Rishi",
        "rate": 130,
        "notes": "Marathi ('mala aushadh pahije') + Hindi ('par mujhe yaad nahi') + English ('can you help me?')"
    },
    {
        "id": "CAT_H_01_circumlocution",
        "category": "Cat H: Forgotten Words & Circumlocution",
        "text": "White round tablet li thi shayad",
        "expected_lang": "hi",
        "voice": "Rishi",
        "rate": 125,
        "notes": "Describing medication by appearance instead of name"
    },
    {
        "id": "CAT_I_01_hesitations",
        "category": "Cat I: Repeated Questions & Hesitations",
        "text": "Umm... uhh... where am I? Who are you?",
        "expected_lang": "en",
        "voice": "Rishi",
        "rate": 115,
        "notes": "Disoriented patient asking identity and location with filled pauses"
    },
    {
        "id": "CAT_J_01_slow_speech",
        "category": "Cat J: Slow Speech & Long Pauses",
        "text": "दवा... कब... लेनी... है...",
        "expected_lang": "hi",
        "voice": "Lekha",
        "rate": 85, # Very slow rate (85 wpm) typical of advanced dementia/motor impairment
        "notes": "Extremely slow speech rate (85 WPM) with punctuated pauses"
    }
]

def generate_samples():
    os.makedirs(SAMPLES_DIR, exist_ok=True)
    generated = []

    for tc in TEST_CASES:
        wav_path = os.path.join(SAMPLES_DIR, f"{tc['id']}.wav")
        print(f"Generating [{tc['id']}] ({tc['category']})...")
        
        # Direct say invocation to 16kHz mono WAVE
        cmd_say = [
            "say",
            "-v", tc["voice"],
            "-r", str(tc["rate"]),
            "--file-format=WAVE",
            "--data-format=LEI16@16000",
            "-o", wav_path,
            tc["text"]
        ]
        res = subprocess.run(cmd_say, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"Error running say for {tc['id']}: {res.stderr}")
            continue

        if os.path.exists(wav_path):
            size = os.path.getsize(wav_path)
            # Verify audio duration using afinfo
            info_res = subprocess.run(["afinfo", wav_path], capture_output=True, text=True)
            duration = 0.0
            for line in info_res.stdout.splitlines():
                if "estimated duration:" in line:
                    try:
                        duration = float(line.split(":")[1].replace("sec", "").strip())
                    except Exception:
                        pass
            
            tc_meta = dict(tc)
            tc_meta["wav_path"] = wav_path
            tc_meta["file_size_bytes"] = size
            tc_meta["duration_seconds"] = round(duration, 3)
            generated.append(tc_meta)
            print(f"  ✓ Created {wav_path} ({size} bytes, {duration:.2f}s)")
        else:
            print(f"Error: {wav_path} not created.")

    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(generated, f, indent=2, ensure_ascii=False)
    print(f"\nAll {len(generated)} test vectors successfully generated in {SAMPLES_DIR}")
    print(f"Metadata saved to {METADATA_FILE}")

if __name__ == "__main__":
    generate_samples()
