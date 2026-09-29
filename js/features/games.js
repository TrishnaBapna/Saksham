/* ======================================================================= */
/* SAKSHAM MIND CLINIC MINI-GAMES & 3D MOTOR CHALLENGE                     */
/* ======================================================================= */

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
      awardXp(60, "Motor Challenge");
      if (window.confetti) confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } });
      alert("🎉 Wonderful work! You completed today's sensory motor challenge (+60 XP Special Reward awarded)!");
    }

    /* ==================== 4. MIND CLINIC GAMES ==================== */
    function switchMiniGame(id) {
      document.querySelectorAll('.mg-view').forEach(view => view.classList.add('hidden'));
      document.querySelectorAll('.minigame-tab').forEach(tab => {
        tab.className = "minigame-tab px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap";
      });

      const targetView = document.getElementById(`mg-view-${id}`);
      const targetTab = document.getElementById(`minigame-tab-${id}`);
      if (targetView) targetView.classList.remove('hidden');
      if (targetTab) {
        targetTab.className = "minigame-tab px-4 py-2.5 rounded-xl text-xs font-black bg-indigo-600 text-white shadow-md whitespace-nowrap";
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
      g1Sequence = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)];
      g1UserStep = 0;
      document.getElementById('game1Display').innerText = `Watch 3 Pulses...`;
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
      }, 700);
    }
    function pressColorSequence(idx) {
      if (g1Sequence.length === 0) return;
      if (g1Sequence[g1UserStep] === idx) {
        g1UserStep++;
        playAudioChime('bell');
        if (g1UserStep === g1Sequence.length) {
          document.getElementById('game1Display').innerText = `🎉 Perfect Match! +50 XP`;
          g1Sequence = [];
          awardXp(50, "Color Sequence");
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
        awardXp(50, "Shape Match");
        alert('Correct Focus Match! +50 Points');
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
        document.getElementById('game3Count').innerText = `Taps: ${g3Count} / 10`;
        playAudioChime('chime');
        if (g3Count >= 10) {
          awardXp(50, "Finger Rhythm");
          alert('Great Smooth Rhythm Completed! +50 XP');
          g3Count = 0;
          document.getElementById('game3Count').innerText = `Taps: 0 / 10`;
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
      document.getElementById('game4Status').innerText = "Catch Target 1 of 5...";
      spawnNextTarget();
    }
    function spawnNextTarget() {
      document.getElementById('game4Target').classList.add('hidden');
      setTimeout(() => {
        const btn = document.getElementById('game4Target');
        btn.style.top = Math.floor(Math.random() * 55) + 'px';
        btn.style.left = Math.floor(Math.random() * 180) + 'px';
        btn.classList.remove('hidden');
      }, 650);
    }
    function hitTargetCatch() {
      targetCatches++;
      playAudioChime('bell');
      if (targetCatches < 5) {
        document.getElementById('game4Status').innerText = `Caught ${targetCatches} of 5! Next...`;
        spawnNextTarget();
      } else {
        document.getElementById('game4Target').classList.add('hidden');
        document.getElementById('game4Status').innerText = "🎉 5 Targets Caught! +50 XP";
        awardXp(50, "Target Catch");
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
        awardXp(50, "Maze Navigator");
        alert('🏡 Reached Home Safe! +50 XP');
        mazePos = { x: 0, y: 0 };
        renderMaze();
      }
    }

    /* Game 6 */
    function checkGame6Word() {
      const val = document.getElementById('g6Input').value.trim().toUpperCase();
      if (val === 'SMILE' || val === 'HEALTH' || val === 'HARMONY') {
        awardXp(50, "Word Solved");
        alert('✨ Word Correct! +50 XP');
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
      targetMelody = [noteNames[Math.floor(Math.random() * 4)], noteNames[Math.floor(Math.random() * 4)], noteNames[Math.floor(Math.random() * 4)]];
      userMelodyStep = 0;
      document.getElementById('melodyStatusBox').innerText = "Listening to 3 notes...";

      targetMelody.forEach((name, i) => {
        setTimeout(() => {
          playSingleSynthNote(NOTE_PITCHES[name]);
          if (i === targetMelody.length - 1) {
            document.getElementById('melodyStatusBox').innerText = "Your turn! Tap the pads in order.";
          }
        }, i * 600);
      });
    }
    function userTapMelodyNote(freq, noteName) {
      playSingleSynthNote(freq);
      if (targetMelody.length === 0) return;
      if (noteName === targetMelody[userMelodyStep]) {
        userMelodyStep++;
        if (userMelodyStep === targetMelody.length) {
          document.getElementById('melodyStatusBox').innerText = "⭐ Matched melody! +50 XP";
          awardXp(50, "Melody Recall");
          targetMelody = [];
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
      const a = Math.floor(Math.random() * 15) + 5;
      const b = Math.floor(Math.random() * 15) + 5;
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
        awardXp(10, "Math Sprint");
        renderMathSprintQuestion();
      } else {
        alert(`Almost! The answer was ${currentMathAns}.`);
        renderMathSprintQuestion();
      }
    }


