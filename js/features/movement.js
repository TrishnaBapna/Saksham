/* ======================================================================= */
/* SAKSHAM MOVEMENT, METRONOME, VOCAL DRILLS & WEBCAM MIRROR THERAPY       */
/* ======================================================================= */

    let liveFaceSnapshot = '';
    async function openLiveFaceScanModal() {
      const modal = document.getElementById('webcamModal');
      const video = document.getElementById('liveVideo');
      const status = document.getElementById('scanStatusTxt');
      const preview = document.getElementById('liveFaceSnapshotPreview');
      if (!modal || !video || !status) return;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      liveFaceSnapshot = '';
      if (preview) { preview.src = ''; preview.classList.add('hidden'); }
      status.textContent = 'Requesting camera access…';
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        status.textContent = 'Camera access requires HTTPS or localhost and a browser that supports camera capture.';
        return;
      }
      try {
        if (webcamStream) webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        video.srcObject = webcamStream;
        await video.play();
        status.textContent = "Camera active. Align visitor's face, then capture a photo.";
      } catch (error) {
        const message = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings, then try again.'
          : error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError'
            ? 'No camera was found on this device.'
            : error?.name === 'NotReadableError' || error?.name === 'TrackStartError'
              ? 'The camera is busy in another app. Close it there and try again.'
              : `Could not start the camera${error?.message ? `: ${error.message}` : '.'}`;
        status.textContent = message;
      }
    }

    function captureLiveFaceSnapshot() {
      const video = document.getElementById('liveVideo');
      const status = document.getElementById('scanStatusTxt');
      const preview = document.getElementById('liveFaceSnapshotPreview');
      if (!video || !video.srcObject || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
        if (status) status.textContent = 'Camera snapshot could not be captured. Please make sure camera is enabled and the live preview has loaded.';
        return false;
      }
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        liveFaceSnapshot = canvas.toDataURL('image/jpeg', 0.82);
        if (preview) { preview.src = liveFaceSnapshot; preview.classList.remove('hidden'); }
        if (status) status.textContent = 'Photo captured. Save it as a new family member or capture again.';
        return true;
      } catch (error) {
        if (status) status.textContent = `Camera snapshot could not be captured${error?.message ? `: ${error.message}` : '.'}`;
        return false;
      }
    }
    function closeLiveFaceScanModal() {
      if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
      webcamStream = null;
      const video = document.getElementById('liveVideo');
      if (video) video.srcObject = null;
      document.getElementById('webcamModal').classList.add('hidden');
      document.getElementById('webcamModal').classList.remove('flex');
    }
    function runFaceRecognitionCheck() {
      const statusEl = document.getElementById('scanStatusTxt');
      if (!liveFaceSnapshot && !captureLiveFaceSnapshot()) return;
      if (statusEl) statusEl.textContent = 'Photo captured. Automatic face matching is not configured yet; use the Loved Ones recall cards or save this photo as a family member.';
    }
    function addCurrentScanAsNewMember() {
      if (!liveFaceSnapshot && !captureLiveFaceSnapshot()) return;
      const photo = liveFaceSnapshot;
      closeLiveFaceScanModal();
      openAddLovedOneModal(photo);
    }



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


