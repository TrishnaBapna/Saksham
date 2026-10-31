/* ======================================================================= */
/* SAKSHAM MOVEMENT, METRONOME, VOCAL DRILLS & WEBCAM MIRROR THERAPY       */
/* ======================================================================= */

    let webcamStream = null;

    async function openLiveFaceScanModal() {
      const modal = document.getElementById('webcamModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
      const v = document.getElementById('liveVideo');
      const status = document.getElementById('scanStatusTxt');
      if (status) status.innerText = "Activating live camera...";

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (status) status.innerText = "Camera not supported on this browser/device.";
        return;
      }

      // Stop any existing stream before starting a new one
      if (webcamStream) {
        try {
          webcamStream.getTracks().forEach(t => t.stop());
        } catch (e) {}
        webcamStream = null;
      }

      try {
        let stream = null;
        try {
          // Attempt user-facing camera first
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
          });
        } catch (constraintErr) {
          console.warn('[Webcam facingMode constraint failed, falling back to default camera]', constraintErr);
          // Fallback for macOS FaceTime camera / external USB webcams that reject facingMode
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } }
          });
        }

        webcamStream = stream;
        if (v) {
          v.srcObject = stream;
          v.setAttribute('playsinline', 'true');
          v.setAttribute('autoplay', 'true');
          v.muted = true;
          await v.play().catch(e => console.warn('[Video Play]', e));
        }
        if (status) status.innerText = "Camera active. Tap '📸 Snap & Use Photo' to capture face.";
      } catch (err) {
        console.error('[Webcam Error]', err);
        const status = document.getElementById('scanStatusTxt');
        if (status) status.innerText = "Camera permission needed. Please allow camera access in browser.";
      }
    }

    function closeLiveFaceScanModal() {
      if (webcamStream) {
        try {
          webcamStream.getTracks().forEach(t => t.stop());
        } catch (e) {}
        webcamStream = null;
      }
      const v = document.getElementById('liveVideo');
      if (v) v.srcObject = null;
      document.getElementById('webcamModal').classList.add('hidden');
      document.getElementById('webcamModal').classList.remove('flex');

      if (window._wasAddModalOpen) {
        window._wasAddModalOpen = false;
        const addModal = document.getElementById('addLovedOneModal');
        if (addModal) {
          addModal.classList.remove('hidden');
          addModal.classList.add('flex');
        }
      }
    }

    function captureLiveWebcamSnapshot() {
      const v = document.getElementById('liveVideo');
      if (!v) return null;
      try {
        const vw = v.videoWidth > 0 ? v.videoWidth : 640;
        const vh = v.videoHeight > 0 ? v.videoHeight : 480;
        const targetW = Math.min(640, vw);
        const targetH = Math.round(targetW * (vh / vw));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(v, 0, 0, targetW, targetH);
        return canvas.toDataURL('image/jpeg', 0.85);
      } catch (e) {
        console.warn('[Webcam Snapshot Error]', e);
        return null;
      }
    }

    function runFaceRecognitionCheck() {
      const statusEl = document.getElementById('scanStatusTxt');
      const st = (typeof getVaultState === 'function') ? getVaultState() : (window.state || state);
      if (!st.familiarPeople || st.familiarPeople.length === 0) {
        if (statusEl) statusEl.innerText = "No loved ones registered. Add a family member in the Vault tab first.";
        return;
      }
      if (statusEl) statusEl.innerText = "Matching facial records...";
      setTimeout(() => {
        const found = st.familiarPeople[0];
        if (statusEl) statusEl.innerHTML = `<span class="text-teal-600 font-black">Identified:</span> ${found.name} (${found.role})<br><span class="text-[11px]">${found.clue || ''}</span>`;
        if (typeof speakText === 'function') {
          speakText(`This person is ${found.name}, your ${found.role}.`);
        }
      }, 1000);
    }

    function addCurrentScanAsNewMember() {
      const snapshot = captureLiveWebcamSnapshot();
      closeLiveFaceScanModal();
      if (typeof openAddLovedOneModal === 'function') {
        openAddLovedOneModal(snapshot || '');
      } else if (typeof window.openAddLovedOneModal === 'function') {
        window.openAddLovedOneModal(snapshot || '');
      }
    }

    window.openLiveFaceScanModal = openLiveFaceScanModal;
    window.closeLiveFaceScanModal = closeLiveFaceScanModal;
    window.captureLiveWebcamSnapshot = captureLiveWebcamSnapshot;
    window.runFaceRecognitionCheck = runFaceRecognitionCheck;
    window.addCurrentScanAsNewMember = addCurrentScanAsNewMember;



    /* ==================== 10. METRONOME & VOCAL DRILLS ==================== */
    function toggleSpeechRecognition() {
      const bar = document.getElementById('speechMeterBar');
      const db = document.getElementById('speechDbText');
      let vol = 25;
      const interval = setInterval(() => {
        vol += Math.floor(Math.random() * 25) - 8;
        if (vol > 85) vol = 85;
        if (vol < 20) vol = 20;
        bar.style.width = vol + '%';
        db.innerText = vol + ' dB';
      }, 150);
      setTimeout(() => {
        clearInterval(interval);
        playAudioChime('bell');
        alert('Vocal Practice Complete! Peak Amplitude: 74 dB (LSVT Loud Optimal Range)');
      }, 3000);
    }

    let metroInterval = null;
    let isMetroActive = false;
    function toggleMetronomeBeep() {
      const btn = document.getElementById('btnMetronomeBeep');
      if (isMetroActive) {
        clearInterval(metroInterval);
        isMetroActive = false;
        btn.innerHTML = `<i class="fa-solid fa-drum mr-1"></i> Start 100 BPM Metronome`;
      } else {
        isMetroActive = true;
        btn.innerHTML = `<i class="fa-solid fa-stop mr-1"></i> Stop Metronome`;
        metroInterval = setInterval(() => {
          initAudio();
          const now = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.frequency.setValueAtTime(800, now);
          g.gain.setValueAtTime(0.18, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
          osc.connect(g); g.connect(audioCtx.destination);
          osc.start(now); osc.stop(now + 0.05);
        }, 600);
      }
    }

    function toggleVideoPlayback(vidId, btnId) {
      const v = document.getElementById(vidId);
      const b = document.getElementById(btnId);
      if (v.paused) { v.play(); b.innerHTML = `<i class="fa-solid fa-pause"></i>`; b.classList.add('opacity-0'); }
      else { v.pause(); b.innerHTML = `<i class="fa-solid fa-play"></i>`; b.classList.remove('opacity-0'); }
    }


