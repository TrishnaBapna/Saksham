/* ======================================================================= */
/* SAKSHAM WEB AUDIO API & INSTRUMENT SYNTHESIZER SERVICE                  */
/* ======================================================================= */

    let audioCtx = null;
    function initAudio() {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      } catch (err) {
        console.log('[Audio Init Note]:', err);
      }
    }

    // Proactively unlock AudioContext and Speech on the first user click/touch anywhere (runs once)
    ['click', 'touchstart', 'touchend', 'keydown'].forEach(evt => {
      window.addEventListener(evt, () => {
        initAudio();
        if ('speechSynthesis' in window && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, { passive: true, once: true });
    });

    function playAudioChime(type) {
      try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        if (type === 'chime') {
          // Loud, clear resonant chime chord (C5, E5, G5, C6)
          [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            gain.gain.setValueAtTime(0.35, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 1.2);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now + i * 0.05); osc.stop(now + i * 0.05 + 1.2);
          });
        } else if (type === 'bell') {
          // Resonant singing bell with harmonic overtone
          [587.33, 1174.66].forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(idx === 0 ? 0.4 : 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now); osc.stop(now + 1.6);
          });
        } else if (type === 'fanfare') {
          // Level up fanfare
          [440, 554.37, 659.25, 880].forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.3, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.7);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now + idx * 0.08); osc.stop(now + idx * 0.08 + 0.7);
          });
        } else {
          // Gentle warm pulse
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(392.00, now);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
          osc.connect(gain); gain.connect(audioCtx.destination);
          osc.start(now); osc.stop(now + 0.5);
        }
      } catch (e) {
        console.log("[Saksham Audio Note]: Audio context waiting for gesture");
      }
    }

    /* ==================== INSTRUMENT AUDIO CUE BAR SYNTHESIZER ==================== */
    function playInstrumentCue(type) {
      try {
        initAudio();
        const now = audioCtx.currentTime;

        if (type === 'bell') {
          // Bell 🔔 → Medication: dual metallic resonant frequencies with exponential decay
          [880, 1760].forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(idx === 0 ? 0.45 : 0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now); osc.stop(now + 1.8);
          });
        } else if (type === 'sax') {
          // Saxophone 🎷 → Meals: warm reedy tone with low-pass resonance & slight vibrato
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const filter = audioCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, now);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(261.63, now); // C4 fundamental
          osc.frequency.linearRampToValueAtTime(277.18, now + 0.25);
          osc.frequency.linearRampToValueAtTime(261.63, now + 0.6);
          gain.gain.setValueAtTime(0.02, now);
          gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
          osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
          osc.start(now); osc.stop(now + 1.4);
        } else if (type === 'marimba') {
          // Marimba 🎵 → PT/Yoga: resonant woody percussive high-mid decay
          [440, 880].forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = idx === 0 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(idx === 0 ? 0.3 : 0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now); osc.stop(now + 0.45);
          });
        }
      } catch (e) {
        console.log("Instrument cue audio pending interaction");
      }
    }

    function playAmbientSleepTone() {
      try {
        initAudio();
        const now = audioCtx.currentTime;
        [216, 432, 648].forEach(freq => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
          osc.connect(gain); gain.connect(audioCtx.destination);
          osc.start(now); osc.stop(now + 4.5);
        });
        speakText("Calming 432Hz ambient sleep frequencies playing.");
      } catch (e) {
        console.log("Sleep audio waiting");
      }
    }


