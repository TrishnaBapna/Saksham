/**
 * Phase 2.5.4 Seven-Language Code-Switching & ASHA Understanding Client
 */

let allScenarios = [];
let currentScenario = null;
let isRecording = false;
let audioContext = null;
let mediaStream = null;
let audioBuffers = [];
let recordingStartTime = 0;
let timerInterval = null;
let currentWavBlob = null;
let currentWavFilename = null;

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadScenarios();
  await loadStatus();
  await refreshDashboard();
});

async function loadStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    document.getElementById("modelBadge").innerText = `Model: ${data.whisper_model}`;
    document.getElementById("accelBadge").innerText = `Acceleration: ${data.acceleration}`;
  } catch (err) {
    console.warn("Status fetch failed:", err);
  }
}

async function loadScenarios() {
  try {
    const res = await fetch("/api/scenarios");
    const data = await res.json();
    allScenarios = [];
    const select = document.getElementById("scenarioSelect");
    select.innerHTML = '<option value="custom">-- Custom Freeform Speech (No Scenario) --</option>';

    data.test_suites.forEach(suite => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = suite.suite_name;
      suite.scenarios.forEach(sc => {
        allScenarios.push(sc);
        const opt = document.createElement("option");
        opt.value = sc.id;
        opt.innerText = `[${sc.id}] ${sc.title}`;
        optgroup.appendChild(opt);
      });
      select.appendChild(optgroup);
    });

    select.addEventListener("change", (e) => {
      onScenarioSelected(e.target.value);
    });

    // Default select first scenario
    if (allScenarios.length > 0) {
      select.value = allScenarios[0].id;
      onScenarioSelected(allScenarios[0].id);
    }
  } catch (err) {
    console.error("Failed to load scenarios:", err);
  }
}

function onScenarioSelected(scenarioId) {
  if (scenarioId === "custom") {
    currentScenario = {
      id: "CUSTOM",
      category: "CUSTOM",
      languages: ["en"],
      title: "Custom Freeform Speech",
      prompt_text: "",
      phonetic_guide: "",
      english_translation: "",
      expected_intent: "UNKNOWN_INTENT",
      expected_concept: "UNKNOWN",
      expected_polarity: "POSITIVE"
    };
    document.getElementById("promptCard").style.display = "none";
    document.getElementById("refTranscriptInput").value = "";
    return;
  }

  currentScenario = allScenarios.find(s => s.id === scenarioId);
  if (!currentScenario) return;

  document.getElementById("promptCard").style.display = "block";
  document.getElementById("promptTitle").innerText = currentScenario.title;
  document.getElementById("promptText").innerText = currentScenario.prompt_text;
  document.getElementById("promptPhonetic").innerText = currentScenario.phonetic_guide ? `Pronunciation: ${currentScenario.phonetic_guide}` : "";
  document.getElementById("promptEnglish").innerText = currentScenario.english_translation ? `Meaning: ${currentScenario.english_translation}` : "";
  document.getElementById("promptExpectation").innerText = `Expected Intent: ${currentScenario.expected_intent} (${currentScenario.expected_concept} / ${currentScenario.expected_polarity})`;

  // Pre-fill reference transcript box
  document.getElementById("refTranscriptInput").value = currentScenario.prompt_text;
}

// -------------------------------------------------------------
// Real Microphone Recording (16kHz 16-bit Mono WAV via AudioContext)
// -------------------------------------------------------------
async function toggleRecording() {
  if (!isRecording) {
    await startRecording();
  } else {
    await stopRecording();
  }
}

async function startRecording() {
  audioBuffers = [];
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(mediaStream);
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    scriptProcessor.onaudioprocess = (e) => {
      if (!isRecording) return;
      const channelData = e.inputBuffer.getChannelData(0);
      audioBuffers.push(new Float32Array(channelData));
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    isRecording = true;
    document.getElementById("recBtn").classList.add("recording");
    document.getElementById("recBtn").innerText = "⏹";
    document.getElementById("recStatus").innerText = "Recording Live... Speak into MacBook Microphone";
    document.getElementById("recTimer").style.display = "block";
    recordingStartTime = Date.now();

    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      document.getElementById("recTimer").innerText = `${m}:${s}`;
    }, 500);

  } catch (err) {
    alert("Microphone Access Error: " + err.message + "\nPlease allow microphone permissions in your browser.");
  }
}

async function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  clearInterval(timerInterval);

  document.getElementById("recBtn").classList.remove("recording");
  document.getElementById("recBtn").innerText = "🎤";
  document.getElementById("recStatus").innerText = "Encoding 16kHz PCM audio...";

  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
  }
  if (audioContext && audioContext.state !== "closed") {
    audioContext.close();
  }

  let totalLength = 0;
  for (let b of audioBuffers) totalLength += b.length;
  if (totalLength < 4000) {
    document.getElementById("recStatus").innerText = "Audio too short. Please speak again.";
    return;
  }

  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (let b of audioBuffers) {
    merged.set(b, offset);
    offset += b.length;
  }

  currentWavBlob = encodeWAV(merged, 16000);
  const audioUrl = URL.createObjectURL(currentWavBlob);
  const player = document.getElementById("audioPlayback");
  player.src = audioUrl;
  player.style.display = "block";

  document.getElementById("recStatus").innerText = "Recording ready! Processing with local Whisper.cpp...";
  await uploadAndTranscribe(currentWavBlob);
}

function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // 16-bit PCM samples
  let index = 44;
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    index += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function uploadAndTranscribe(blob) {
  const langMode = document.getElementById("langModeSelect").value;
  const scenarioId = currentScenario ? currentScenario.id : "custom";

  try {
    const res = await fetch(`/api/transcribe_audio?lang_mode=${langMode}&scenario_id=${scenarioId}`, {
      method: "POST",
      headers: { "Content-Type": "audio/wav" },
      body: blob
    });
    const data = await res.json();
    if (data.status === "SUCCESS") {
      currentWavFilename = data.wav_filename;
      displayWhisperResults(data.whisper);
      document.getElementById("recStatus").innerText = "Transcription complete. Verify reference transcript below.";
      document.getElementById("evalSection").style.display = "block";
    } else {
      alert("Whisper error: " + data.error);
    }
  } catch (err) {
    console.error("Transcribe failed:", err);
    alert("Transcription failed: " + err.message);
  }
}

function displayWhisperResults(whisper) {
  document.getElementById("whisperTranscriptBox").innerText = whisper.transcript || "[NO SPEECH DETECTED]";
  document.getElementById("detectedLangBadge").innerText = `Detected Lang: ${whisper.detected_lang.toUpperCase()}`;
  document.getElementById("latencyBadge").innerText = `Latency: ${whisper.wall_time_ms} ms (RTF: ${whisper.real_time_factor}x)`;
  document.getElementById("deviceBadge").innerText = `Engine: ${whisper.execution_device}`;
}

async function submitDualEvaluation() {
  if (!currentWavFilename) {
    alert("Please record or select an audio file first.");
    return;
  }

  const refText = document.getElementById("refTranscriptInput").value.trim();
  if (!refText) {
    alert("Please enter what was actually spoken in the Human Reference Transcript box.");
    return;
  }

  const nativeVerified = document.getElementById("nativeSpeakerCheck").checked;
  const langMode = document.getElementById("langModeSelect").value;

  const payload = {
    wav_filename: currentWavFilename,
    reference_text: refText,
    scenario_meta: currentScenario || {},
    language_mode: langMode,
    native_speaker_verified: nativeVerified,
    source: "real_microphone"
  };

  try {
    const res = await fetch("/api/evaluate_turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonStringify(payload)
    });
    const data = await res.json();
    if (data.status === "SUCCESS") {
      displayEvaluationCards(data.result);
      await refreshDashboard();
    }
  } catch (err) {
    console.error("Evaluation submit failed:", err);
  }
}

function jsonStringify(obj) {
  return JSON.stringify(obj);
}

function displayEvaluationCards(res) {
  document.getElementById("evaluationResultsCard").style.display = "block";

  const asrEval = res.asr_evaluation;
  const semRef = res.semantic_evaluation_reference;
  const semAsr = res.semantic_evaluation_whisper;

  // ASR card
  document.getElementById("asrStatusBadge").innerHTML = asrEval.asr_passed 
    ? '<span class="status-tag status-pass">ASR PASSED</span>'
    : '<span class="status-tag status-fail">ASR FAILED</span>';
  document.getElementById("asrSimScore").innerText = `Token Similarity: ${(asrEval.token_similarity * 100).toFixed(1)}%`;
  document.getElementById("asrScriptScore").innerText = `Script Preservation: ${(asrEval.script_preservation_score * 100).toFixed(0)}% (${asrEval.scripts_in_hypothesis.join(", ")})`;
  document.getElementById("asrSwitchScore").innerText = `Switch Preserved: ${asrEval.language_switch_preserved ? "YES" : "NO"}`;

  // Semantic card
  document.getElementById("semStatusBadge").innerHTML = semAsr.semantic_passed
    ? '<span class="status-tag status-pass">SEMANTIC PASSED</span>'
    : '<span class="status-tag status-fail">SEMANTIC FAILED</span>';
  document.getElementById("semIntentGot").innerText = `Detected Intent: ${semAsr.got_intent} (Expected: ${semAsr.expected_intent})`;
  document.getElementById("semPolarityGot").innerText = `Polarity: ${semAsr.got_polarity} | Concept: ${semAsr.got_concept}`;
  document.getElementById("semActionGot").innerText = `Clinical Guardrail: ${semAsr.clinical_action} (100% BLOCKED)`;
  document.getElementById("ashaResponseText").innerText = `ASHA: "${semAsr.asha_response}"`;

  // Causal attribution
  document.getElementById("causalFailureText").innerText = `Failure Attribution: ${res.failure_cause}`;
}

async function runModeComparison() {
  if (!currentWavFilename) {
    alert("Please record audio first.");
    return;
  }
  const forcedLang = prompt("Enter forced language code to compare (e.g. en, hi, mr, ta, te, kn, ml):", "en");
  if (!forcedLang) return;

  try {
    const res = await fetch("/api/compare_modes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wav_filename: currentWavFilename, forced_lang: forcedLang.trim() })
    });
    const data = await res.json();
    if (data.status === "SUCCESS") {
      document.getElementById("comparisonCard").style.display = "block";
      document.getElementById("compAutoText").innerText = `[Auto-Detect: ${data.auto_mode.detected_lang}] "${data.auto_mode.transcript}"`;
      document.getElementById("compForcedText").innerText = `[Forced: ${forcedLang}] "${data.forced_mode.transcript}"`;
    }
  } catch (err) {
    console.error("Mode comparison failed:", err);
  }
}

async function refreshDashboard() {
  try {
    const res = await fetch("/api/dashboard");
    const m = await res.json();

    document.getElementById("dashTotalRec").innerText = m.total_recordings;
    document.getElementById("dashRealMic").innerText = m.total_real_microphone_recordings;
    document.getElementById("dashLangsTested").innerText = `${m.languages_tested_count} / 7`;
    document.getElementById("dashTwoLang").innerText = m.two_language_combinations_count;
    document.getElementById("dashThreeLang").innerText = m.three_language_combinations_count;
    document.getElementById("dashSevenLang").innerText = m.all_seven_language_recordings_count;
    document.getElementById("dashAsrAcc").innerText = `${m.asr_accuracy_pct}%`;
    document.getElementById("dashScriptPres").innerText = `${m.native_script_preservation_pct}%`;
    document.getElementById("dashSwitchPres").innerText = `${m.language_switch_preservation_pct}%`;
    document.getElementById("dashSemRefAcc").innerText = `${m.semantic_accuracy_reference_pct}%`;
    document.getElementById("dashSemAsrAcc").innerText = `${m.semantic_accuracy_whisper_pct}%`;
    document.getElementById("dashNegAcc").innerText = `${m.negation_accuracy_pct}%`;
    document.getElementById("dashClarAcc").innerText = `${m.clarification_accuracy_pct}%`;
    document.getElementById("dashHallucinations").innerText = m.hallucination_count;

    renderRecordsTable(m.records || []);
  } catch (err) {
    console.error("Dashboard refresh failed:", err);
  }
}

function renderRecordsTable(records) {
  const tbody = document.getElementById("recordsTableBody");
  tbody.innerHTML = "";
  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 20px;">No recordings evaluated yet. Record audio using your microphone to begin.</td></tr>';
    return;
  }

  records.slice().reverse().forEach((r, idx) => {
    const tr = document.createElement("tr");
    const asrPass = r.asr_evaluation && r.asr_evaluation.asr_passed;
    const semPass = r.semantic_evaluation_whisper && r.semantic_evaluation_whisper.semantic_passed;

    tr.innerHTML = `
      <td>${records.length - idx}</td>
      <td><strong>${r.scenario_id}</strong><br><small style="color:#64748b">${r.combination || ""}</small></td>
      <td><span class="stat-pill">${r.whisper.detected_lang || "?"}</span></td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.whisper.transcript || ""}</td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.asr_evaluation.reference_text || ""}</td>
      <td>${asrPass ? '<span class="status-tag status-pass">PASS</span>' : '<span class="status-tag status-fail">FAIL</span>'}</td>
      <td>${semPass ? '<span class="status-tag status-pass">PASS</span>' : '<span class="status-tag status-fail">FAIL</span>'}</td>
      <td><small style="color: #475569;">${r.failure_cause || "NONE"}</small></td>
    `;
    tbody.appendChild(tr);
  });
}
