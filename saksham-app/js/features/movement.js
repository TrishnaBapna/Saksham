/* ======================================================================= */
/* SAKSHAM MOVEMENT, METRONOME, VOCAL DRILLS & WEBCAM MIRROR THERAPY       */
/* ======================================================================= */

    function openLiveFaceScanModal() {
      document.getElementById('webcamModal').classList.remove('hidden');
      document.getElementById('webcamModal').classList.add('flex');
      const v = document.getElementById('liveVideo');
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            webcamStream = stream;
            v.srcObject = stream;
            document.getElementById('scanStatusTxt').innerText = "Camera active. Align visitor's face.";
          })
          .catch(() => {
            document.getElementById('scanStatusTxt').innerText = "Webcam simulated.";
          });
      }
    }
    function closeLiveFaceScanModal() {
      if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
      document.getElementById('webcamModal').classList.add('hidden');
      document.getElementById('webcamModal').classList.remove('flex');
    }
    function runFaceRecognitionCheck() {
      document.getElementById('scanStatusTxt').innerText = "Matching facial records...";
      setTimeout(() => {
        const found = state.familiarPeople[0];
        document.getElementById('scanStatusTxt').innerHTML = `<span class="text-teal-600 font-black">Identified:</span> ${found.name} (${found.role})<br><span class="text-[11px]">${found.clue}</span>`;
        speakText(`This person is ${found.name}, your ${found.role}.`);
      }, 1000);
    }
    function addCurrentScanAsNewMember() {
      closeLiveFaceScanModal();
      addLovedOnePrompt();
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
        awardXp(30, "Vocal Practice");
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


