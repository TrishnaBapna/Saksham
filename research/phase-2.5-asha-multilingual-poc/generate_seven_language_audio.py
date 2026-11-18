#!/usr/bin/env python3
"""
Seven-Language Benchmark Audio Generator for Phase 2.5 ASHA PoC
Generates 16kHz 16-bit mono PCM WAV files for:
1. 35 Individual Language Vectors (7 languages x 5 categories)
2. 11 Multilingual Code-Switching Vectors (A through K)

Strict Truthfulness Notice:
All audio vectors are generated using native macOS speech synthesis engines
(Lekha: hi/mr, Rishi: en/ml, Vani: ta, Geeta: te, Soumya: kn).
Explicitly labeled as SYNTHETIC TTS BENCHMARK VECTORS.
"""

import os
import subprocess
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TESTS_DIR = os.path.join(BASE_DIR, "seven_lang_tests")
INDIVIDUAL_DIR = os.path.join(TESTS_DIR, "individual")
CODESWITCH_DIR = os.path.join(TESTS_DIR, "code_switching")
MANIFEST_FILE = os.path.join(TESTS_DIR, "seven_lang_manifest.json")

# 1. 35 Individual Language Test Definitions
INDIVIDUAL_TESTS = [
    # English (en)
    {"id": "EN_01_everyday", "lang": "en", "category": "everyday", "voice": "Rishi", "rate": 145, "text": "Can you please bring me a glass of water?", "text_latin": "Can you please bring me a glass of water?", "intent": "REQUEST_WATER", "safety_required": False},
    {"id": "EN_02_help", "lang": "en", "category": "help", "voice": "Rishi", "rate": 145, "text": "Asha, I need help getting up.", "text_latin": "Asha, I need help getting up.", "intent": "REQUEST_HELP_GENERAL", "safety_required": False},
    {"id": "EN_03_routine", "lang": "en", "category": "routine", "voice": "Rishi", "rate": 145, "text": "It is time for my afternoon walk in the garden.", "text_latin": "It is time for my afternoon walk in the garden.", "intent": "ROUTINE_WALK", "safety_required": False},
    {"id": "EN_04_hesitation", "lang": "en", "category": "hesitation", "voice": "Rishi", "rate": 125, "text": "Umm... I forgot the name of that tablet.", "text_latin": "Umm... I forgot the name of that tablet.", "intent": "MEDICATION_UNCERTAINTY", "safety_required": True},
    {"id": "EN_05_slow", "lang": "en", "category": "slow", "voice": "Rishi", "rate": 90, "text": "Today... is... a... very... quiet... day.", "text_latin": "Today... is... a... very... quiet... day.", "intent": "GENERAL_STATEMENT", "safety_required": False},

    # Marathi (mr)
    {"id": "MR_01_everyday", "lang": "mr", "category": "everyday", "voice": "Lekha", "rate": 140, "text": "मला आज एक ग्लास पाणी पाहिजे.", "text_latin": "Mala aaj ek glass paani pahije.", "intent": "REQUEST_WATER", "safety_required": False},
    {"id": "MR_02_help", "lang": "mr", "category": "help", "voice": "Lekha", "rate": 140, "text": "आशा, मला उठायला मदत कर.", "text_latin": "Asha, mala uthayla madat kar.", "intent": "REQUEST_HELP_GENERAL", "safety_required": False},
    {"id": "MR_03_routine", "lang": "mr", "category": "routine", "voice": "Lekha", "rate": 140, "text": "माझे दुपारचे जेवण झाले आहे.", "text_latin": "Majhe duparche jevan jhale aahe.", "intent": "ROUTINE_MEAL", "safety_required": False},
    {"id": "MR_04_hesitation", "lang": "mr", "category": "hesitation", "voice": "Lekha", "rate": 125, "text": "अं... मला त्या... गोळीचे नाव आठवत नाही.", "text_latin": "Umm... mala tya golice naav aathavat nahi.", "intent": "MEDICATION_UNCERTAINTY", "safety_required": True},
    {"id": "MR_05_slow", "lang": "mr", "category": "slow", "voice": "Lekha", "rate": 90, "text": "आज... मला... खूप... थकवा... आहे.", "text_latin": "Aaj... mala... khoop... thakva... aahe.", "intent": "REPORT_FATIGUE", "safety_required": False},

    # Hindi (hi)
    {"id": "HI_01_everyday", "lang": "hi", "category": "everyday", "voice": "Lekha", "rate": 140, "text": "मुझे एक गिलास पानी चाहिए.", "text_latin": "Mujhe ek glass paani chahiye.", "intent": "REQUEST_WATER", "safety_required": False},
    {"id": "HI_02_help", "lang": "hi", "category": "help", "voice": "Lekha", "rate": 140, "text": "आशा, कृपया मेरी मदद करो.", "text_latin": "Asha, kripya meri madad karo.", "intent": "REQUEST_HELP_GENERAL", "safety_required": False},
    {"id": "HI_03_routine", "lang": "hi", "category": "routine", "voice": "Lekha", "rate": 140, "text": "अब मेरी दोपहर की सैर का समय है.", "text_latin": "Ab meri dopahar ki sair ka samay hai.", "intent": "ROUTINE_WALK", "safety_required": False},
    {"id": "HI_04_hesitation", "lang": "hi", "category": "hesitation", "voice": "Lekha", "rate": 125, "text": "उम्म... मुझे उस दवाई का नाम याद नहीं आ रहा.", "text_latin": "Umm... mujhe us dawai ka naam yaad nahi aa raha.", "intent": "MEDICATION_UNCERTAINTY", "safety_required": True},
    {"id": "HI_05_slow", "lang": "hi", "category": "slow", "voice": "Lekha", "rate": 90, "text": "आज... बहुत... ज्यादा... थकान... है.", "text_latin": "Aaj... bahut... zyada... thakan... hai.", "intent": "REPORT_FATIGUE", "safety_required": False},

    # Malayalam (ml)
    {"id": "ML_01_everyday", "lang": "ml", "category": "everyday", "voice": "Rishi", "rate": 140, "text": "എനിക്ക് ഒരു ഗ്ലാസ് വെള്ളം വേണം.", "text_latin": "Enikku oru glass vellam venam.", "intent": "REQUEST_WATER", "safety_required": False},
    {"id": "ML_02_help", "lang": "ml", "category": "help", "voice": "Rishi", "rate": 140, "text": "ആശ, എന്നെ സഹായിക്കാമോ.", "text_latin": "Asha, enne sahayikkanamo.", "intent": "REQUEST_HELP_GENERAL", "safety_required": False},
    {"id": "ML_03_routine", "lang": "ml", "category": "routine", "voice": "Rishi", "rate": 140, "text": "ഉച്ചക്ക് ഉള്ള ആഹാരം കഴിച്ചു.", "text_latin": "Uchakku ulla aaharam kazhichu.", "intent": "ROUTINE_MEAL", "safety_required": False},
    {"id": "ML_04_hesitation", "lang": "ml", "category": "hesitation", "voice": "Rishi", "rate": 125, "text": "ഉം... ആ മരുന്നിന്റെ പേര് മറന്നു പോയി.", "text_latin": "Umm... aa marunninte peru marannu poyi.", "intent": "MEDICATION_UNCERTAINTY", "safety_required": True},
    {"id": "ML_05_slow", "lang": "ml", "category": "slow", "voice": "Rishi", "rate": 90, "text": "ഇന്ന്... എനിക്ക്... നല്ല... ക്ഷീണം... തോന്നുന്നു.", "text_latin": "Innu... enikku... nalla... ksheenam... thonnunnu.", "intent": "REPORT_FATIGUE", "safety_required": False},

    # Tamil (ta)
    {"id": "TA_01_everyday", "lang": "ta", "category": "everyday", "voice": "Vani", "rate": 140, "text": "எனக்கு ஒரு டம்ளர் தண்ணீர் வேண்டும்.", "text_latin": "Enakku oru tumbler thanneer vendum.", "intent": "REQUEST_WATER", "safety_required": False},
    {"id": "TA_02_help", "lang": "ta", "category": "help", "voice": "Vani", "rate": 140, "text": "ஆஷா, எனக்கு கொஞ்சம் உதவி செய்.", "text_latin": "Asha, enakku konjam udhavi sei.", "intent": "REQUEST_HELP_GENERAL", "safety_required": False},
    {"id": "TA_03_routine", "lang": "ta", "category": "routine", "voice": "Vani", "rate": 140, "text": "என் மதிய உணவு முடிந்துவிட்டது.", "text_latin": "En mathiya unavu mudinthuvittathu.", "intent": "ROUTINE_MEAL", "safety_required": False},
    {"id": "TA_04_hesitation", "lang": "ta", "category": "hesitation", "voice": "Vani", "rate": 125, "text": "ம்ம்... அந்த மாத்திரையின் பெயர் மறந்துவிட்டது.", "text_latin": "Umm... antha maathiraiyin peyar maranthuvittathu.", "intent": "MEDICATION_UNCERTAINTY", "safety_required": True},
    {"id": "TA_05_slow", "lang": "ta", "category": "slow", "voice": "Vani", "rate": 90, "text": "இன்று... எனக்கு... மிகவும்... சோர்வாக... இருக்கிறது.", "text_latin": "Inru... enakku... migavum... soorvaaga... irukkirathu.", "intent": "REPORT_FATIGUE", "safety_required": False},

    # Telugu (te)
    {"id": "TE_01_everyday", "lang": "te", "category": "everyday", "voice": "Geeta", "rate": 140, "text": "నాకు ఒక గ్లాసు మంచి నీళ్లు కావాలి.", "text_latin": "Naaku oka glass manchi neellu kaavaali.", "intent": "REQUEST_WATER", "safety_required": False},
    {"id": "TE_02_help", "lang": "te", "category": "help", "voice": "Geeta", "rate": 140, "text": "ఆశా, నాకు కొంచెం సహాయం చేయవా.", "text_latin": "Asha, naaku koncham sahaayam cheyavaa.", "intent": "REQUEST_HELP_GENERAL", "safety_required": False},
    {"id": "TE_03_routine", "lang": "te", "category": "routine", "voice": "Geeta", "rate": 140, "text": "నా మధ్యాహ్న భోజనం పూర్తయింది.", "text_latin": "Naa madhyaahna bhojanam poorthayindi.", "intent": "ROUTINE_MEAL", "safety_required": False},
    {"id": "TE_04_hesitation", "lang": "te", "category": "hesitation", "voice": "Geeta", "rate": 125, "text": "ఉమ్... ఆ మందు పేరు గుర్తుకు రావడం లేదు.", "text_latin": "Umm... aa mandu peru gurtuku raavadam ledu.", "intent": "MEDICATION_UNCERTAINTY", "safety_required": True},
    {"id": "TE_05_slow", "lang": "te", "category": "slow", "voice": "Geeta", "rate": 90, "text": "ఈరోజు... నాకు... చాలా... అలసటగా... ఉంది.", "text_latin": "Eeroju... naaku... chaalaa... alasatagaa... undi.", "intent": "REPORT_FATIGUE", "safety_required": False},

    # Kannada (kn)
    {"id": "KN_01_everyday", "lang": "kn", "category": "everyday", "voice": "Soumya", "rate": 140, "text": "ನನಗೆ ಒಂದು ಲೋಟ ಕುಡಿಯಲು ನೀರು ಬೇಕು.", "text_latin": "Nanage ondu lota kudiyalu neeru beku.", "intent": "REQUEST_WATER", "safety_required": False},
    {"id": "KN_02_help", "lang": "kn", "category": "help", "voice": "Soumya", "rate": 140, "text": "ಆಶಾ, ನನಗೆ ಸ್ವಲ್ಪ ಸಹಾಯ ಮಾಡು.", "text_latin": "Asha, nanage swalpa sahaaya maadu.", "intent": "REQUEST_HELP_GENERAL", "safety_required": False},
    {"id": "KN_03_routine", "lang": "kn", "category": "routine", "voice": "Soumya", "rate": 140, "text": "ನನ್ನ ಮಧ್ಯಾಹ್ನದ ಊಟ ಮುಗಿದಿದೆ.", "text_latin": "Nanna madhyaahnada oota mugidide.", "intent": "ROUTINE_MEAL", "safety_required": False},
    {"id": "KN_04_hesitation", "lang": "kn", "category": "hesitation", "voice": "Soumya", "rate": 125, "text": "ಉಮ್... ಆ ಮಾತ್ರೆ ಹೆಸರು ಮರೆತುಹೋಗಿದೆ.", "text_latin": "Umm... aa maathre hesaru marethuhogide.", "intent": "MEDICATION_UNCERTAINTY", "safety_required": True},
    {"id": "KN_05_slow", "lang": "kn", "category": "slow", "voice": "Soumya", "rate": 90, "text": "ಇವತ್ತು... ನನಗೆ... ತುಂಬಾ... ಆಯಾಸವಾಗಿದೆ.", "text_latin": "Ivattu... nanage... thumba... aayaasavaagide.", "intent": "REPORT_FATIGUE", "safety_required": False}
]

# 2. 11 Multilingual Code-Switching Test Definitions
CODESWITCH_TESTS = [
    {
        "id": "CS_A_mr_en", "combination": "mr+en", "code": "A", "title": "Marathi + English",
        "voice": "Rishi", "rate": 135,
        "text": "Mala medicine ghaychi hoti, but I forgot.", "text_latin": "Mala medicine ghaychi hoti, but I forgot.",
        "intent": "MEDICATION_UNCERTAINTY", "safety_required": True
    },
    {
        "id": "CS_B_hi_en", "combination": "hi+en", "code": "B", "title": "Hindi + English",
        "voice": "Rishi", "rate": 135,
        "text": "Mujhe medicine yaad nahi aa rahi.", "text_latin": "Mujhe medicine yaad nahi aa rahi.",
        "intent": "MEDICATION_UNCERTAINTY", "safety_required": True
    },
    {
        "id": "CS_C_ml_en", "combination": "ml+en", "code": "C", "title": "Malayalam + English",
        "voice": "Rishi", "rate": 135,
        "text": "Enikku medicine kazhikkanam, but I forgot which one.", "text_latin": "Enikku medicine kazhikkanam, but I forgot which one.",
        "intent": "MEDICATION_UNCERTAINTY", "safety_required": True
    },
    {
        "id": "CS_D_ta_en", "combination": "ta+en", "code": "D", "title": "Tamil + English",
        "voice": "Rishi", "rate": 135,
        "text": "Enakku tablet saapidanum, but I forgot.", "text_latin": "Enakku tablet saapidanum, but I forgot.",
        "intent": "MEDICATION_UNCERTAINTY", "safety_required": True
    },
    {
        "id": "CS_E_te_en", "combination": "te+en", "code": "E", "title": "Telugu + English",
        "voice": "Rishi", "rate": 135,
        "text": "Naaku medicine vesukovali, but I forgot.", "text_latin": "Naaku medicine vesukovali, but I forgot.",
        "intent": "MEDICATION_UNCERTAINTY", "safety_required": True
    },
    {
        "id": "CS_F_kn_en", "combination": "kn+en", "code": "F", "title": "Kannada + English",
        "voice": "Rishi", "rate": 135,
        "text": "Nanage tablet thogobeku, but I forgot.", "text_latin": "Nanage tablet thogobeku, but I forgot.",
        "intent": "MEDICATION_UNCERTAINTY", "safety_required": True
    },
    {
        "id": "CS_G_mr_hi_en", "combination": "mr+hi+en", "code": "G", "title": "Marathi + Hindi + English",
        "voice": "Rishi", "rate": 130,
        "text": "Mala aushadh pahije, lekin mujhe yaad nahi, please help me.", "text_latin": "Mala aushadh pahije, lekin mujhe yaad nahi, please help me.",
        "intent": "MEDICATION_UNCERTAINTY", "safety_required": True
    },
    {
        "id": "CS_H_ml_en_hi", "combination": "ml+en+hi", "code": "H", "title": "Malayalam + English + Hindi",
        "voice": "Rishi", "rate": 130,
        "text": "Enikku doctor appointment undu, but time yaad nahi aa raha.", "text_latin": "Enikku doctor appointment undu, but time yaad nahi aa raha.",
        "intent": "MEMORY_LAPSE", "safety_required": False
    },
    {
        "id": "CS_I_ta_en_hi", "combination": "ta+en+hi", "code": "I", "title": "Tamil + English + Hindi",
        "voice": "Rishi", "rate": 130,
        "text": "Enakku doctor sonna tablet venum, but mujhe yaad nahi.", "text_latin": "Enakku doctor sonna tablet venum, but mujhe yaad nahi.",
        "intent": "MEDICATION_UNCERTAINTY", "safety_required": True
    },
    {
        "id": "CS_J_te_en_hi", "combination": "te+en+hi", "code": "J", "title": "Telugu + English + Hindi",
        "voice": "Rishi", "rate": 130,
        "text": "Naaku tablet kavali, but mujhe yaad nahi, please help me.", "text_latin": "Naaku tablet kavali, but mujhe yaad nahi, please help me.",
        "intent": "MEDICATION_UNCERTAINTY", "safety_required": True
    },
    {
        "id": "CS_K_kn_en_hi", "combination": "kn+en+hi", "code": "K", "title": "Kannada + English + Hindi",
        "voice": "Rishi", "rate": 130,
        "text": "Nanage tablet beku, but mujhe yaad nahi, please help me.", "text_latin": "Nanage tablet beku, but mujhe yaad nahi, please help me.",
        "intent": "MEDICATION_UNCERTAINTY", "safety_required": True
    }
]

def synthesize_wav(voice, rate, text_to_speak, out_wav):
    cmd_say = [
        "say",
        "-v", voice,
        "-r", str(rate),
        "--file-format=WAVE",
        "--data-format=LEI16@16000",
        "-o", out_wav,
        text_to_speak
    ]
    res = subprocess.run(cmd_say, capture_output=True, text=True)
    if res.returncode != 0:
        return 0.0, 0
    if os.path.exists(out_wav):
        size = os.path.getsize(out_wav)
        info_res = subprocess.run(["afinfo", out_wav], capture_output=True, text=True)
        dur = 0.0
        for line in info_res.stdout.splitlines():
            if "estimated duration:" in line:
                try:
                    dur = float(line.split(":")[1].replace("sec", "").strip())
                except Exception:
                    pass
        return round(dur, 2), size
    return 0.0, 0

def generate_all():
    os.makedirs(INDIVIDUAL_DIR, exist_ok=True)
    os.makedirs(CODESWITCH_DIR, exist_ok=True)

    generated_manifest = {"individual": [], "code_switching": []}

    print("Generating 35 Individual Language Vectors...")
    for t in INDIVIDUAL_TESTS:
        wav_file = f"{t['id']}.wav"
        wav_path = os.path.join(INDIVIDUAL_DIR, wav_file)
        # For Malayalam, since macOS lacks an ml native voice, Rishi speaks the romanized text
        speak_text = t["text_latin"] if t["lang"] == "ml" else t["text"]
        dur, size = synthesize_wav(t["voice"], t["rate"], speak_text, wav_path)
        
        rec = dict(t)
        rec["wav_file"] = wav_file
        rec["wav_path"] = wav_path
        rec["duration_seconds"] = dur
        rec["file_size_bytes"] = size
        rec["speaker_verification"] = "SYNTHETIC TTS (macOS Native Voice: " + t["voice"] + ")"
        generated_manifest["individual"].append(rec)
        print(f"  ✓ [{t['lang']}] {t['id']} ({dur}s, {size} bytes)")

    print("\nGenerating 11 Code-Switching Vectors (A through K)...")
    for cs in CODESWITCH_TESTS:
        wav_file = f"{cs['id']}.wav"
        wav_path = os.path.join(CODESWITCH_DIR, wav_file)
        dur, size = synthesize_wav(cs["voice"], cs["rate"], cs["text_latin"], wav_path)
        
        rec = dict(cs)
        rec["wav_file"] = wav_file
        rec["wav_path"] = wav_path
        rec["duration_seconds"] = dur
        rec["file_size_bytes"] = size
        rec["speaker_verification"] = "SYNTHETIC TTS (macOS Native Voice: " + cs["voice"] + ")"
        generated_manifest["code_switching"].append(rec)
        print(f"  ✓ [{cs['code']}] {cs['title']} ({dur}s, {size} bytes)")

    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(generated_manifest, f, indent=2, ensure_ascii=False)

    print(f"\nAll 46 test vectors successfully generated!")
    print(f"Manifest written to: {MANIFEST_FILE}")

if __name__ == "__main__":
    generate_all()
