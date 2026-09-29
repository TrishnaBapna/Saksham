/* ======================================================================= */
/* SAKSHAM UTILITIES & REWARD/PROGRESSION HELPERS                          */
/* ======================================================================= */

    function calculateLevelState(xp) {
      let currentTier = LEVEL_TIERS[0];
      for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_TIERS[i].minXp) {
          currentTier = LEVEL_TIERS[i];
          break;
        }
      }
      return currentTier;
    }

    function awardXp(amount, label = "Reward") {
      const prevTier = calculateLevelState(state.xp);
      state.xp += amount;
      const newTier = calculateLevelState(state.xp);

      // Play rich audio chime
      playAudioChime('chime');

      // Floating XP Toast Animation
      showFloatingXpToast(`+${amount} XP (${label}) ⭐`);

      // Update XP & Level UI
      updateLevelProgressUI();

      // Check Level-Up
      if (newTier.level > prevTier.level) {
        triggerLevelUpCelebration(newTier);
      }

      if (window.dbService && window.dbService.progression) {
        window.dbService.progression.update(state.uid || 'SAK-PT-8842');
      }
    }

    function updateLevelProgressUI() {
      const tier = calculateLevelState(state.xp);
      state.level = tier.level;

      const lblLevelTitle = document.getElementById('lblLevelTitle');
      if (lblLevelTitle) lblLevelTitle.innerText = `Level ${tier.level}`;
      
      const levelIconBox = document.getElementById('levelIconBox');
      if (levelIconBox) levelIconBox.innerText = tier.icon;
      
      const txtCurrentLevelBadge = document.getElementById('txtCurrentLevelBadge');
      if (txtCurrentLevelBadge) txtCurrentLevelBadge.innerText = `Level ${tier.level}`;
      
      const txtTotalXP = document.getElementById('txtTotalXP');
      if (txtTotalXP) txtTotalXP.innerText = `${state.xp} XP`;
      
      const lblCurrentTotalXp = document.getElementById('lblCurrentTotalXp');
      if (lblCurrentTotalXp) lblCurrentTotalXp.innerText = `Total: ${state.xp} XP`;

      const nextXp = tier.maxXp;
      const curTierBase = tier.minXp;
      const progressPercent = Math.min(100, Math.max(0, ((state.xp - curTierBase) / (nextXp - curTierBase)) * 100));

      const levelProgressBar = document.getElementById('levelProgressBar');
      if (levelProgressBar) levelProgressBar.style.width = `${progressPercent}%`;
      
      const lblXpProgress = document.getElementById('lblXpProgress');
      if (lblXpProgress) lblXpProgress.innerText = `${state.xp} / ${nextXp} XP`;
    }

    function resetToLevelZero() {
      state.xp = 0;
      state.level = 0;
      updateLevelProgressUI();
      playAudioChime('bell');
      alert("Reset to Level 0: Cognitive Sprout (0 XP). Begin your journey!");
    }

    function showFloatingXpToast(msg) {
      const c = document.getElementById('xpToastContainer');
      const toast = document.createElement('div');
      toast.className = "xp-float-badge px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs rounded-2xl shadow-xl flex items-center space-x-2 border border-white/40";
      toast.innerHTML = `<i class="fa-solid fa-star text-yellow-200"></i><span>${msg}</span>`;
      c.appendChild(toast);
      setTimeout(() => toast.remove(), 1600);
    }

    function showSakshamToast(msg, type = 'success') {
      let c = document.getElementById('xpToastContainer');
      if (!c) {
        c = document.createElement('div');
        c.id = 'xpToastContainer';
        c.className = 'fixed top-20 right-4 z-50 flex flex-col space-y-2 pointer-events-none';
        document.body.appendChild(c);
      }
      const toast = document.createElement('div');
      const bgClass = type === 'success' 
        ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white' 
        : (type === 'delete' ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white' : 'bg-slate-900 text-white');
      toast.className = `px-4 py-2.5 ${bgClass} font-black text-xs rounded-2xl shadow-2xl flex items-center space-x-2 border border-white/20 animate-slide-up pointer-events-auto`;
      toast.innerHTML = `<span>${msg}</span>`;
      c.appendChild(toast);
      setTimeout(() => {
        toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 400);
      }, 2600);
    }
    window.showSakshamToast = showSakshamToast;

    function triggerLevelUpCelebration(tier) {
      playAudioChime('fanfare');
      if (typeof window !== 'undefined' && window.confetti) {
        window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      }
      alert(`🎉 LEVEL UP! You reached ${tier.title} ${tier.icon}!\nYour brain pathways are staying agile and connected.`);
    }



    function renderBadgesUI() {
      const mini = document.getElementById('miniBadgesContainer');
      const full = document.getElementById('fullBadgesGrid');
      const countLabel = document.getElementById('badgeUnlockCountLabel');

      const unlockedCount = state.badges.filter(b => b.unlocked).length;
      if (countLabel) countLabel.innerText = `${unlockedCount} of ${state.badges.length} Unlocked`;

      if (mini) {
        mini.innerHTML = state.badges.map(b => `
          <div onclick="openBadgeDetail('${b.id}')" class="p-3 rounded-2xl border-2 ${b.unlocked ? 'bg-gradient-to-br from-amber-50 to-orange-50/40 border-amber-300' : 'bg-slate-50 border-slate-200 opacity-60'} flex items-center space-x-2.5 cursor-pointer hover:scale-102 transition shadow-2xs">
            <span class="text-2xl">${b.icon}</span>
            <div class="overflow-hidden">
              <p class="font-black text-xs text-slate-900 truncate font-heading">${b.title}</p>
              <span class="text-[10px] font-extrabold ${b.unlocked ? 'text-amber-700' : 'text-slate-400'}">${b.unlocked ? 'Unlocked' : 'In Progress'}</span>
            </div>
          </div>
        `).join('');
      }

      if (full) {
        full.innerHTML = state.badges.map(b => `
          <div onclick="openBadgeDetail('${b.id}')" class="p-5 rounded-3xl border-2 ${b.unlocked ? 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 border-amber-300 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-70'} space-y-3 cursor-pointer hover:shadow-md transition">
            <div class="flex justify-between items-center">
              <div class="w-12 h-12 rounded-2xl ${b.unlocked ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-400'} flex items-center justify-center text-2xl shadow-inner">
                ${b.icon}
              </div>
              <span class="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${b.unlocked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}">
                ${b.unlocked ? 'Unlocked ⭐' : 'Locked'}
              </span>
            </div>
            <div>
              <h4 class="font-black text-sm text-slate-900 font-heading">${b.title}</h4>
              <p class="text-xs text-slate-600 mt-1 leading-snug">${b.desc}</p>
            </div>
            <p class="text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-2">${b.date}</p>
          </div>
        `).join('');
      }
    }

    function openBadgeDetail(badgeId) {
      const badge = state.badges.find(b => b.id === badgeId);
      if (!badge) return;
      document.getElementById('modalBadgeIcon').innerText = badge.icon;
      document.getElementById('modalBadgeTitle').innerText = badge.title;
      document.getElementById('modalBadgeDesc').innerText = badge.desc;
      document.getElementById('modalBadgeDate').innerText = badge.date;
      document.getElementById('modalBadgeStatus').innerText = badge.unlocked ? "Unlocked Badge ⭐" : "Challenge In Progress";
      document.getElementById('modalBadgeDetail').classList.remove('hidden');
      document.getElementById('modalBadgeDetail').classList.add('flex');
      playAudioChime('chime');
    }

    function closeBadgeDetailModal() {
      const modal = document.getElementById('modalBadgeDetail');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }



    function calculatePersonalWaterTarget() {
      const w = parseFloat(document.getElementById('calcWeight').value) || 65;
      const liters = (w * 0.033).toFixed(1);
      const glasses = Math.round(liters / 0.25);
      state.waterTargetGlasses = glasses;
      document.getElementById('calcWaterTargetText').innerText = `${liters} Liters (~${glasses} Glasses)`;
      document.getElementById('hydrationGlassesLabel').innerText = `${state.waterLogged} / ${state.waterTargetGlasses} Glasses`;
    }

    function logWaterGlass() {
      state.waterLogged++;
      document.getElementById('hydrationGlassesLabel').innerText = `${state.waterLogged} / ${state.waterTargetGlasses} Glasses`;
      awardXp(10, "Hydration");
      if (window.dbService && window.dbService.progression) {
        window.dbService.progression.update(state.uid || 'SAK-PT-8842');
      }
    }

    const articlesData = [
      { title: "Protein Timing & Levodopa Absorption", tag: "Nutrition", snippet: "Spacing protein intake 45-60 minutes around medication maximizes brain dopamine uptake." },
      { title: "Hydration & Fiber for Autonomic Wellness", tag: "Dietary", snippet: "Warm water and gentle soluble fiber stimulate colon motility and prevent dizziness." },
      { title: "Polyphenols & Cellular Vitality", tag: "Brain Health", snippet: "Wild berries and walnuts shield neuronal membranes from oxidative fatigue." }
    ];

    function renderArticles() {
      const container = document.getElementById('articlesContainer');
      if (container) {
        container.innerHTML = articlesData.map(a => `
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 shadow-xs">
            <span class="text-[10px] font-black uppercase text-teal-700 bg-teal-100 px-2 py-0.5 rounded">${a.tag}</span>
            <h4 class="font-bold text-sm text-slate-900">${a.title}</h4>
            <p class="text-xs text-slate-600">${a.snippet}</p>
          </div>
        `).join('');
      }
    }


