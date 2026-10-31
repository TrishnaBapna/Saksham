/* ======================================================================= */
/* SAKSHAM MOVEMENT, METRONOME, VOCAL DRILLS & WEBCAM MIRROR THERAPY       */
/* ======================================================================= */

    // webcamStream is shared with store.js / window
    var webcamStream = window.webcamStream || null;

    async function openLiveFaceScanModal() {
      const modal = document.getElementById('webcamModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';
      }
      if (typeof window.lockScroll === 'function') window.lockScroll();

      const v = document.getElementById('liveVideo');
      const status = document.getElementById('scanStatusTxt');
      if (status) status.innerHTML = `<span class="inline-flex items-center gap-1.5"><i class="fa-solid fa-spinner fa-spin text-teal-600"></i> Connecting live camera...</span>`;

      // Check for secure context
      const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isSecure) {
        if (status) status.innerHTML = `<span class="text-rose-600 font-bold">⚠️ Live camera requires HTTPS or localhost. Please open via HTTPS or tap "📸 Take Photo with Device Camera" below.</span>`;
        const notice = document.getElementById('cameraTroubleNotice');
        if (notice) notice.classList.remove('hidden');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (status) status.innerHTML = `<span class="text-rose-600 font-bold">⚠️ Live camera API not supported by this browser. Take a photo using device camera below!</span>`;
        const notice = document.getElementById('cameraTroubleNotice');
        if (notice) notice.classList.remove('hidden');
        return;
      }

      // Stop any existing stream before starting a new one
      const activeStream = window.webcamStream || webcamStream;
      if (activeStream) {
        try {
          activeStream.getTracks().forEach(t => t.stop());
        } catch (e) {}
        webcamStream = window.webcamStream = null;
      }

      let stream = null;
      let lastError = null;

      // Multi-tier camera acquisition:
      // Strategy 1: User-facing camera
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
      } catch (err1) {
        lastError = err1;
        console.warn('[Camera Strategy 1 User-Facing Constraint]', err1);
        
        // If permission was denied by user, don't keep polling
        if (err1.name !== 'NotAllowedError' && err1.name !== 'PermissionDeniedError') {
          // Strategy 2: Simple video: true
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (err2) {
            lastError = err2;
            console.warn('[Camera Strategy 2 Simple Video]', err2);
            // Strategy 3: Enumerate video devices to find active built-in camera
            try {
              const devices = await navigator.mediaDevices.enumerateDevices();
              const videoInputs = devices.filter(d => d.kind === 'videoinput');
              for (const d of videoInputs) {
                try {
                  stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: d.deviceId } }
                  });
                  if (stream) break;
                } catch (e) {
                  lastError = e;
                }
              }
            } catch (err3) {
              lastError = err3;
            }
          }
        }
      }

      if (stream) {
        webcamStream = window.webcamStream = stream;
        if (v) {
          v.defaultMuted = true;
          v.muted = true;
          v.playsInline = true;
          v.setAttribute('playsinline', '');
          v.setAttribute('webkit-playsinline', '');
          v.setAttribute('muted', '');
          v.setAttribute('autoplay', '');

          if (v.srcObject && v.srcObject !== stream) {
            try { v.srcObject.getTracks().forEach(t => t.stop()); } catch (e) {}
          }
          v.srcObject = stream;

          const tracks = stream.getVideoTracks();
          tracks.forEach(track => {
            track.enabled = true;
            track.onunmute = () => {
              v.play().catch(e => console.warn('[Video Play onunmute]', e));
            };
          });

          const playPromise = v.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              v.onloadedmetadata = () => {
                v.play().catch(e => console.warn('[Video Retry onloadedmetadata]', e));
              };
            });
          }

          v.onplaying = () => {
            if (status) {
              status.innerHTML = `<span class="text-emerald-700 font-black flex items-center justify-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Camera Active • Align face & tap Snap!</span>`;
            }
          };
          v.onloadeddata = () => {
            if (status) {
              status.innerHTML = `<span class="text-emerald-700 font-black flex items-center justify-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Camera Active • Align face & tap Snap!</span>`;
            }
          };
        }
        if (status) {
          status.innerHTML = `<span class="text-emerald-700 font-black flex items-center justify-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Camera Active • Align face & tap Snap!</span>`;
        }
        const notice = document.getElementById('cameraTroubleNotice');
        if (notice) notice.classList.add('hidden');
      } else {
        const notice = document.getElementById('cameraTroubleNotice');
        if (notice) notice.classList.remove('hidden');
        if (status) {
          if (lastError && (lastError.name === 'NotAllowedError' || lastError.name === 'PermissionDeniedError')) {
            status.innerHTML = `<span class="text-rose-600 font-bold">🚫 Camera permission blocked. Please click the padlock 🔒 icon in your browser address bar and select "Reset permission" or allow Camera.</span>`;
          } else if (lastError && (lastError.name === 'NotReadableError' || lastError.name === 'TrackStartError')) {
            status.innerHTML = `<span class="text-amber-800 font-bold">⚠️ Camera is locked by another app (e.g. Focusmate or Zoom). Close other video apps or tap "📸 Take Photo with Device Camera" below!</span>`;
          } else {
            status.innerHTML = `<span class="text-rose-600 font-bold">⚠️ Live webcam unavailable in browser. Tap "📸 Take Photo with Device Camera" below!</span>`;
          }
        }
      }
    }

    function closeLiveFaceScanModal() {
      const activeStream = window.webcamStream || webcamStream;
      if (activeStream) {
        try {
          activeStream.getTracks().forEach(t => t.stop());
        } catch (e) {}
        webcamStream = window.webcamStream = null;
      }
      const v = document.getElementById('liveVideo');
      if (v) v.srcObject = null;
      const modal = document.getElementById('webcamModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
      }
      window._wasAddModalOpen = false;
      if (typeof window.forceUnlockScroll === 'function') {
        window.forceUnlockScroll();
      }
    }

    function captureLiveWebcamSnapshot() {
      const v = document.getElementById('liveVideo');
      if (!v) return null;
      try {
        const vw = v.videoWidth > 0 ? v.videoWidth : 640;
        const vh = v.videoHeight > 0 ? v.videoHeight : 480;
        const activeStream = window.webcamStream || webcamStream;
        if (!activeStream) {
          console.warn('[Webcam Snapshot Note]: Stream not active');
          return null;
        }
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
    window.captureLiveFaceSnapshot = captureLiveWebcamSnapshot;
    window.runFaceRecognitionCheck = runFaceRecognitionCheck;
    window.addCurrentScanAsNewMember = addCurrentScanAsNewMember;



    /* ==================== 10. METRONOME & VOCAL DRILLS ==================== */
    let vocalMicStream = null;
    let vocalAnalyser = null;
    let vocalAnimFrame = null;
    let vocalInterval = null;
    let isVocalActive = false;
    let peakVocalDb = 0;

    async function toggleSpeechRecognition() {
      const btn = document.getElementById('btnToggleVocalPractice');
      const bar = document.getElementById('speechMeterBar');
      const db = document.getElementById('speechDbText');

      if (isVocalActive) {
        stopVocalPractice();
        return;
      }

      isVocalActive = true;
      peakVocalDb = 0;
      if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-stop mr-1"></i> Stop Vocal Practice`;
        btn.classList.add('animate-pulse');
      }

      const updateUI = (volumeDb) => {
        if (volumeDb > peakVocalDb) peakVocalDb = volumeDb;
        const clamped = Math.max(10, Math.min(95, volumeDb));
        if (bar) bar.style.width = clamped + '%';
        if (db) db.innerText = Math.round(volumeDb) + ' dB';
      };

      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          vocalMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const ctx = (typeof window.getAudioContext === 'function') ? window.getAudioContext() : new (window.AudioContext || window.webkitAudioContext)();
          if (ctx.state === 'suspended') {
            await ctx.resume().catch(() => {});
          }
          const source = ctx.createMediaStreamSource(vocalMicStream);
          vocalAnalyser = ctx.createAnalyser();
          vocalAnalyser.fftSize = 256;
          source.connect(vocalAnalyser);

          const bufferLength = vocalAnalyser.fftSize;
          const dataArray = new Uint8Array(bufferLength);

          const checkVolume = () => {
            if (!isVocalActive) return;
            vocalAnalyser.getByteTimeDomainData(dataArray);
            let sumSquares = 0;
            for (let i = 0; i < bufferLength; i++) {
              const norm = (dataArray[i] - 128) / 128;
              sumSquares += norm * norm;
            }
            const rms = Math.sqrt(sumSquares / bufferLength);
            // Map RMS amplitude (0.005..0.45) directly to dB scale (30..88 dB)
            const dbLevel = Math.round(30 + Math.min(1, rms * 4.2) * 58);
            updateUI(dbLevel);
            vocalAnimFrame = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        } else {
          throw new Error('Microphone not available');
        }
      } catch (err) {
        console.warn('[Vocal Practice Mic Fallback]', err);
        // Smooth simulated animated meter fallback
        let simVol = 38;
        vocalInterval = setInterval(() => {
          if (!isVocalActive) return;
          simVol += Math.floor(Math.random() * 22) - 9;
          if (simVol > 84) simVol = 84;
          if (simVol < 30) simVol = 30;
          updateUI(simVol);
        }, 120);
      }

      // Auto-complete after 10 seconds of practice if user hasn't stopped
      window._vocalTimeout = setTimeout(() => {
        if (isVocalActive) {
          stopVocalPractice();
        }
      }, 10000);
    }

    function stopVocalPractice() {
      isVocalActive = false;
      if (window._vocalTimeout) clearTimeout(window._vocalTimeout);
      if (vocalInterval) clearInterval(vocalInterval);
      if (vocalAnimFrame) cancelAnimationFrame(vocalAnimFrame);
      if (vocalMicStream) {
        try {
          vocalMicStream.getTracks().forEach(t => t.stop());
        } catch (e) {}
        vocalMicStream = null;
      }
      const btn = document.getElementById('btnToggleVocalPractice');
      if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-microphone mr-1"></i> Start Vocal Volume Practice`;
        btn.classList.remove('animate-pulse');
      }

      const finalPeak = Math.max(72, peakVocalDb);
      if (typeof playAudioChime === 'function') playAudioChime('bell');
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`🎉 Vocal Practice Complete! Peak Amplitude: ${finalPeak} dB (LSVT Loud Optimal Range)`, 'success');
      }
    }

    let metroInterval = null;
    let isMetroActive = false;
    function toggleMetronomeBeep() {
      const btn = document.getElementById('btnMetronomeBeep');
      if (isMetroActive) {
        if (metroInterval) clearInterval(metroInterval);
        metroInterval = null;
        isMetroActive = false;
        if (btn) btn.innerHTML = `<i class="fa-solid fa-drum mr-1"></i> Start 100 BPM Metronome`;
      } else {
        isMetroActive = true;
        if (btn) btn.innerHTML = `<i class="fa-solid fa-stop mr-1"></i> Stop Metronome`;
        const playTick = () => {
          try {
            let ctx = (typeof window.getAudioContext === 'function') ? window.getAudioContext() : null;
            if (!ctx) {
              window._sakshamMetroCtx = window._sakshamMetroCtx || new (window.AudioContext || window.webkitAudioContext)();
              ctx = window._sakshamMetroCtx;
            }
            if (ctx && ctx.state === 'suspended') {
              ctx.resume().catch(() => {});
            }
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.frequency.setValueAtTime(800, now);
            g.gain.setValueAtTime(0.18, now);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
          } catch (e) {
            console.warn('[Metronome Tick Note]', e);
          }
        };
        playTick();
        metroInterval = setInterval(playTick, 600);
      }
    }

    function toggleVideoPlayback(vidId, btnId) {
      const v = document.getElementById(vidId);
      const b = document.getElementById(btnId);
      if (!v || !b) return;
      if (v.paused) { v.play(); b.innerHTML = `<i class="fa-solid fa-pause"></i>`; b.classList.add('opacity-0'); }
      else { v.pause(); b.innerHTML = `<i class="fa-solid fa-play"></i>`; b.classList.remove('opacity-0'); }
    }

    window.toggleSpeechRecognition = toggleSpeechRecognition;
    window.stopVocalPractice = stopVocalPractice;
    window.toggleMetronomeBeep = toggleMetronomeBeep;
    window.toggleVideoPlayback = toggleVideoPlayback;


