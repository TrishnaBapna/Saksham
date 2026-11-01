/* ======================================================================= */
/* SAKSHAM MIND CLINIC MINI-GAMES & 3D MOTOR CHALLENGE                     */
/* ======================================================================= */

    // ==================== GAMIFICATION REWARD SYSTEM ====================
    let gamificationScore = parseInt(localStorage.getItem('saksham_game_score') || '350', 10);
    let gamificationStreak = parseInt(localStorage.getItem('saksham_game_streak') || '4', 10);
    let gamificationDrills = parseInt(localStorage.getItem('saksham_game_drills') || '2', 10);

    function updateGamificationHud() {
      const scoreEl = document.getElementById('txtGamifiedScore');
      const streakEl = document.getElementById('txtGamifiedStreak');
      const drillsEl = document.getElementById('txtGamifiedDrills');
      if (scoreEl) scoreEl.innerText = gamificationScore;
      if (streakEl) streakEl.innerText = gamificationStreak;
      if (drillsEl) drillsEl.innerText = `${gamificationDrills} / 3`;
    }

    function awardGameScore(points, gameName) {
      gamificationScore += points;
      gamificationDrills = Math.min(3, gamificationDrills + 1);
      try {
        localStorage.setItem('saksham_game_score', gamificationScore.toString());
        localStorage.setItem('saksham_game_streak', gamificationStreak.toString());
        localStorage.setItem('saksham_game_drills', gamificationDrills.toString());
      } catch (e) {}

      updateGamificationHud();

      if (window.confetti) {
        window.confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      }
      playAudioChime('bell');

      if (typeof speakText === 'function') {
        speakText(`Awesome work! You earned ${points} XP points in ${gameName}!`);
      }

      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`+${points} XP: ${gameName} completed!`, 'success');
      }
    }

    window.awardGameScore = awardGameScore;
    window.updateGamificationHud = updateGamificationHud;

    /* ==================== 3. 3D CUBE MOTOR CHALLENGE ==================== */
    let currentCubeRotations = { x: 0, y: 0 };
    function roll3DCubeAndHobby() {
      const cube = document.getElementById('cube3D');
      if (!cube) return;
      currentCubeRotations.x += 360 * 2 + Math.floor(Math.random() * 4) * 90;
      currentCubeRotations.y += 360 * 2 + Math.floor(Math.random() * 4) * 90;
      cube.style.transform = `rotateX(${currentCubeRotations.x}deg) rotateY(${currentCubeRotations.y}deg)`;
      playAudioChime('chime');

      setTimeout(() => {
        currentHobbyIdx = (currentHobbyIdx + 1) % DAILY_HOBBIES.length;
        const h = DAILY_HOBBIES[currentHobbyIdx];
        const titleEl = document.getElementById('hobbyTitle');
        const descEl = document.getElementById('hobbyDesc');
        if (titleEl) titleEl.innerText = h.title;
        if (descEl) descEl.innerText = h.desc;
        playAudioChime('bell');
        speakText(`Cube rolled! Sensory challenge: ${h.title}.`);
      }, 1100);
    }

    function completeHobbyChallenge() {
      awardGameScore(45, "Sensory Motor Challenge");
    }

    /* ==================== 4. MIND CLINIC GAMES ==================== */
    function getActiveUserIdForPacing() {
      try {
        const u = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
        return u.id || u.uid || u.username || (typeof state !== 'undefined' && state && state.uid) || 'default';
      } catch (e) {
        return 'default';
      }
    }

    function getGamePacing() {
      const uid = getActiveUserIdForPacing();
      const saved = localStorage.getItem('saksham_game_pacing_' + uid) || localStorage.getItem('saksham_game_pacing_default') || 'balanced';
      return ['calm', 'balanced', 'agile'].includes(saved) ? saved : 'balanced';
    }

    function setGamePacing(pacing) {
      if (!['calm', 'balanced', 'agile'].includes(pacing)) pacing = 'balanced';
      const uid = getActiveUserIdForPacing();
      try {
        localStorage.setItem('saksham_game_pacing_' + uid, pacing);
        localStorage.setItem('saksham_game_pacing_default', pacing);
      } catch (e) {}

      updateGamePacingUI(pacing);

      const g3El = document.getElementById('game3Count');
      if (g3El) {
        const goal = pacing === 'calm' ? 5 : (pacing === 'agile' ? 15 : 10);
        g3El.innerText = `Taps: ${g3Count} / ${goal}`;
      }

      const labels = {
        calm: '🌿 Calm Pacing enabled (relaxed speed & sequence length)',
        balanced: '⚖️ Balanced Pacing enabled (standard therapeutic rhythm)',
        agile: '⚡ Agile Pacing enabled (brisk challenge speed)'
      };
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(labels[pacing] || 'Game pacing updated!', 'info');
      }
      if (typeof playAudioChime === 'function') playAudioChime('chime');
    }

    function updateGamePacingUI(activePacing) {
      const pacing = activePacing || getGamePacing();
      const btnCalm = document.getElementById('btnGamePacingCalm');
      const btnBal = document.getElementById('btnGamePacingBalanced');
      const btnAgile = document.getElementById('btnGamePacingAgile');
      const desc = document.getElementById('gamePacingDescription');

      const activeClass = 'flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 bg-indigo-600 text-white shadow-xs';
      const inactiveClass = 'flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 text-slate-700 hover:bg-slate-100';

      if (btnCalm) {
        btnCalm.className = pacing === 'calm' ? activeClass : inactiveClass;
        btnCalm.setAttribute('aria-pressed', pacing === 'calm' ? 'true' : 'false');
      }
      if (btnBal) {
        btnBal.className = pacing === 'balanced' ? activeClass : inactiveClass;
        btnBal.setAttribute('aria-pressed', pacing === 'balanced' ? 'true' : 'false');
      }
      if (btnAgile) {
        btnAgile.className = pacing === 'agile' ? activeClass : inactiveClass;
        btnAgile.setAttribute('aria-pressed', pacing === 'agile' ? 'true' : 'false');
      }

      if (desc) {
        if (pacing === 'calm') {
          desc.textContent = '🌿 Calm: Relaxed intervals, shorter sequences, and generous response times.';
        } else if (pacing === 'agile') {
          desc.textContent = '⚡ Agile: Brisk intervals, faster responses, and extended challenge sequences.';
        } else {
          desc.textContent = '⚖️ Balanced: Standard therapeutic rhythm and sequence lengths.';
        }
      }
    }

    function switchMiniGame(id) {
      if (typeof state !== 'undefined') {
        state.selectedMiniGame = id;
      }
      document.querySelectorAll('.mg-view').forEach(view => {
        view.classList.add('hidden');
        try { view.style.display = 'none'; } catch (e) {}
      });
      document.querySelectorAll('.minigame-tab').forEach(tab => {
        tab.className = "minigame-tab px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap";
      });

      const targetView = document.getElementById(`mg-view-${id}`);
      const targetTab = document.getElementById(`minigame-tab-${id}`);
      if (targetView) {
        targetView.classList.remove('hidden');
        try { targetView.style.display = 'block'; } catch (e) {}
      }
      if (targetTab) {
        targetTab.className = "minigame-tab px-4 py-2.5 rounded-xl text-xs font-black bg-indigo-600 text-white shadow-md whitespace-nowrap";
      }

      updateGamePacingUI();

      if (id === 3) {
        const pacing = getGamePacing();
        const goal = pacing === 'calm' ? 5 : (pacing === 'agile' ? 15 : 10);
        const countEl = document.getElementById('game3Count');
        if (countEl) countEl.innerText = `Taps: ${g3Count} / ${goal}`;
      }
      if (id === 5) renderMaze();
      if (id === 8) renderMathSprintQuestion();
    }

    function pickRandomMiniGame() {
      const randomId = Math.floor(Math.random() * 8) + 1;
      switchMiniGame(randomId);
      playAudioChime('chime');
    }

    /* Game 1 */
    let g1Sequence = [];
    let g1UserStep = 0;
    function startColorSequenceGame() {
      const pacing = getGamePacing();
      const seqLen = pacing === 'calm' ? 2 : (pacing === 'agile' ? 4 : 3);
      const intervalMs = pacing === 'calm' ? 1000 : (pacing === 'agile' ? 550 : 700);
      g1Sequence = [];
      for (let s = 0; s < seqLen; s++) {
        g1Sequence.push(Math.floor(Math.random() * 4));
      }
      g1UserStep = 0;
      document.getElementById('game1Display').innerText = `Watch ${seqLen} Pulses...`;
      let i = 0;
      const interval = setInterval(() => {
        if (i < g1Sequence.length) {
          const colors = ['Rose Red', 'Sky Blue', 'Emerald Green', 'Amber Yellow'];
          document.getElementById('game1Display').innerText = `Pulse ${i+1}: ${colors[g1Sequence[i]]}`;
          playAudioChime('chime');
          i++;
        } else {
          clearInterval(interval);
          document.getElementById('game1Display').innerText = `Your Turn! Tap pads in order.`;
        }
      }, intervalMs);
    }
    function pressColorSequence(idx) {
      if (g1Sequence.length === 0) return;
      if (g1Sequence[g1UserStep] === idx) {
        g1UserStep++;
        playAudioChime('bell');
        if (g1UserStep === g1Sequence.length) {
          document.getElementById('game1Display').innerText = `🎉 Perfect Match! +50 XP!`;
          g1Sequence = [];
          awardGameScore(50, 'Color Sequence Recall');
        }
      } else {
        document.getElementById('game1Display').innerText = `❌ Try Again`;
        g1Sequence = [];
      }
    }

    /* Game 2 */
    const g2Shapes = ['⭐ Star', '🔷 Diamond', '🔴 Circle', '🟩 Square'];
    let g2CurrentShape = '';
    let g2PrevShape = '';
    function nextGame2Shape() {
      g2PrevShape = g2CurrentShape;
      g2CurrentShape = g2Shapes[Math.floor(Math.random() * g2Shapes.length)];
      document.getElementById('game2Box').innerText = g2CurrentShape;
    }
    function checkGame2Match(isMatch) {
      if ((g2CurrentShape === g2PrevShape) === isMatch) {
        alert('Correct focus match!');
      } else {
        alert('Not a match this time!');
      }
      nextGame2Shape();
    }

    /* Game 3 */
    let g3Count = 0;
    let g3Next = 'A';
    function tapGame3(btn) {
      if (btn === g3Next) {
        g3Count++;
        const pacing = getGamePacing();
        const goal = pacing === 'calm' ? 5 : (pacing === 'agile' ? 15 : 10);
        document.getElementById('game3Count').innerText = `Taps: ${g3Count} / ${goal}`;
        playAudioChime('chime');
        if (g3Count >= goal) {
          alert('Great smooth rhythm completed!');
          g3Count = 0;
          document.getElementById('game3Count').innerText = `Taps: 0 / ${goal}`;
          awardGameScore(35, 'Bimanual Tap Rhythm');
        }
        if (btn === 'A') {
          g3Next = 'B';
          document.getElementById('g3BtnA').disabled = true;
          document.getElementById('g3BtnA').className = "py-4 bg-slate-100 text-slate-400 font-black rounded-2xl text-sm transition";
          document.getElementById('g3BtnB').disabled = false;
          document.getElementById('g3BtnB').className = "py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl text-sm shadow-md transition";
        } else {
          g3Next = 'A';
          document.getElementById('g3BtnB').disabled = true;
          document.getElementById('g3BtnB').className = "py-4 bg-slate-100 text-slate-400 font-black rounded-2xl text-sm transition";
          document.getElementById('g3BtnA').disabled = false;
          document.getElementById('g3BtnA').className = "py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl text-sm shadow-md transition";
        }
      }
    }

    /* Game 4 */
    let targetCatches = 0;
    function startFiveTargetRound() {
      targetCatches = 0;
      const pacing = getGamePacing();
      const goal = pacing === 'calm' ? 3 : (pacing === 'agile' ? 7 : 5);
      document.getElementById('game4Status').innerText = `Catch Target 1 of ${goal}...`;
      spawnNextTarget();
    }
    function spawnNextTarget() {
      document.getElementById('game4Target').classList.add('hidden');
      const pacing = getGamePacing();
      const spawnDelay = pacing === 'calm' ? 1000 : (pacing === 'agile' ? 450 : 650);
      setTimeout(() => {
        const btn = document.getElementById('game4Target');
        btn.style.top = Math.floor(Math.random() * 55) + 'px';
        btn.style.left = Math.floor(Math.random() * 180) + 'px';
        btn.classList.remove('hidden');
      }, spawnDelay);
    }
    function hitTargetCatch() {
      targetCatches++;
      playAudioChime('bell');
      const pacing = getGamePacing();
      const goal = pacing === 'calm' ? 3 : (pacing === 'agile' ? 7 : 5);
      if (targetCatches < goal) {
        document.getElementById('game4Status').innerText = `Caught ${targetCatches} of ${goal}! Next...`;
        spawnNextTarget();
      } else {
        document.getElementById('game4Target').classList.add('hidden');
        document.getElementById('game4Status').innerText = `🎉 ${goal} Targets Caught!`;
        awardGameScore(40, 'Target Catch Reflex');
      }
    }

    /* Game 5 */
    let mazePos = { x: 0, y: 0 };
    function renderMaze() {
      const grid = document.getElementById('mazeGrid');
      if (!grid) return;
      const cells = [];
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const isPlayer = (x === mazePos.x && y === mazePos.y);
          const isHome = (x === 2 && y === 2);
          cells.push(`
            <div class="h-12 rounded-xl ${isPlayer ? 'bg-rose-500 text-white' : isHome ? 'bg-teal-600 text-white' : 'bg-white'} flex items-center justify-center font-black text-sm shadow-2xs border border-slate-200">
              ${isPlayer ? '🏃' : isHome ? '🏡' : ''}
            </div>
          `);
        }
      }
      grid.innerHTML = cells.join('');
    }
    function moveMaze(dir) {
      if (dir === 'up' && mazePos.y > 0) mazePos.y--;
      if (dir === 'down' && mazePos.y < 2) mazePos.y++;
      if (dir === 'left' && mazePos.x > 0) mazePos.x--;
      if (dir === 'right' && mazePos.x < 2) mazePos.x++;
      renderMaze();
      if (mazePos.x === 2 && mazePos.y === 2) {
        alert('🏡 Reached home safely!');
        mazePos = { x: 0, y: 0 };
        renderMaze();
      }
    }

    /* Game 6 */
    function checkGame6Word() {
      const val = document.getElementById('g6Input').value.trim().toUpperCase();
      if (val === 'SMILE' || val === 'HEALTH' || val === 'HARMONY') {
        alert('✨ Word correct!');
        document.getElementById('g6Scrambled').innerText = 'H E A L T H';
        document.getElementById('g6Input').value = '';
      } else {
        alert('Try unscrambling SMILE or HEALTH!');
      }
    }

    /* Game 7 */
    let targetMelody = [];
    let userMelodyStep = 0;
    const NOTE_PITCHES = { 'C': 261.63, 'E': 329.63, 'G': 392.00, 'C2': 523.25 };
    function playSingleSynthNote(freq) {
      initAudio();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    }
    function playAudibleMelodySequence() {
      initAudio();
      const noteNames = ['C', 'E', 'G', 'C2'];
      const pacing = getGamePacing();
      const melodyLen = pacing === 'calm' ? 2 : (pacing === 'agile' ? 4 : 3);
      const intervalMs = pacing === 'calm' ? 800 : (pacing === 'agile' ? 450 : 600);
      targetMelody = [];
      for (let m = 0; m < melodyLen; m++) {
        targetMelody.push(noteNames[Math.floor(Math.random() * 4)]);
      }
      userMelodyStep = 0;
      document.getElementById('melodyStatusBox').innerText = `Listening to ${melodyLen} notes...`;

      targetMelody.forEach((name, i) => {
        setTimeout(() => {
          playSingleSynthNote(NOTE_PITCHES[name]);
          if (i === targetMelody.length - 1) {
            document.getElementById('melodyStatusBox').innerText = "Your turn! Tap the pads in order.";
          }
        }, i * intervalMs);
      });
    }
    function userTapMelodyNote(freq, noteName) {
      playSingleSynthNote(freq);
      if (targetMelody.length === 0) return;
      if (noteName === targetMelody[userMelodyStep]) {
        userMelodyStep++;
        if (userMelodyStep === targetMelody.length) {
          document.getElementById('melodyStatusBox').innerText = "⭐ Melody matched! +40 XP!";
          targetMelody = [];
          awardGameScore(40, 'Melody Recall');
        }
      } else {
        document.getElementById('melodyStatusBox').innerText = "Try listening again!";
        targetMelody = [];
      }
    }

    /* Game 8 */
    let mathScore = 0;
    let mathRound = 1;
    let currentMathAns = 27;
    function renderMathSprintQuestion() {
      const pacing = getGamePacing();
      let a, b;
      if (pacing === 'calm') {
        a = Math.floor(Math.random() * 8) + 1;
        b = Math.floor(Math.random() * 8) + 1;
      } else if (pacing === 'agile') {
        a = Math.floor(Math.random() * 25) + 10;
        b = Math.floor(Math.random() * 25) + 10;
      } else {
        a = Math.floor(Math.random() * 15) + 5;
        b = Math.floor(Math.random() * 15) + 5;
      }
      currentMathAns = a + b;
      document.getElementById('g8Eq').innerText = `${a} + ${b} = ?`;
      document.getElementById('mathScoreTxt').innerText = mathScore;
      document.getElementById('mathRoundTxt').innerText = `Round ${mathRound}`;

      const wrong1 = currentMathAns + (Math.random() > 0.5 ? 2 : -2);
      const wrong2 = currentMathAns + (Math.random() > 0.5 ? 3 : -3);
      const options = [currentMathAns, wrong1, wrong2].sort(() => Math.random() - 0.5);

      document.getElementById('g8Options').innerHTML = options.map(ans => `
        <button onclick="checkMathAnswer(${ans})" class="py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-xs transition">${ans}</button>
      `).join('');
    }
    function checkMathAnswer(ans) {
      if (ans === currentMathAns) {
        mathScore += 10;
        mathRound++;
        if (mathRound % 3 === 0) {
          awardGameScore(30, 'Speed Math Sprint');
        } else {
          playAudioChime('bell');
        }
        renderMathSprintQuestion();
      } else {
        if (typeof showSakshamToast === 'function') {
          showSakshamToast(`The correct answer was ${currentMathAns}. Keep practicing!`, 'info');
        }
        renderMathSprintQuestion();
      }
    }

    // Explicit Global Exports
    window.switchMiniGame = switchMiniGame;
    window.pickRandomMiniGame = pickRandomMiniGame;
    window.startColorSequenceGame = startColorSequenceGame;
    window.pressColorSequence = pressColorSequence;
    window.awardGameScore = awardGameScore;
    window.updateGamificationHud = updateGamificationHud;
    window.getGamePacing = getGamePacing;
    window.setGamePacing = setGamePacing;
    window.updateGamePacingUI = updateGamePacingUI;

    // Auto-hydrate game pacing on load
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => updateGamePacingUI());
      } else {
        updateGamePacingUI();
      }
    } catch (e) {}



