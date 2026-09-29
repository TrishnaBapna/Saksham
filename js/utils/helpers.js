/* ======================================================================= */
/* SAKSHAM UTILITIES & REWARD/PROGRESSION HELPERS                          */
/* ======================================================================= */

    function showSakshamToast(msg, type = 'success') {
      let c = document.getElementById('sakshamToastContainer');
      if (!c) {
        c = document.createElement('div');
        c.id = 'sakshamToastContainer';
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
      const icon = document.getElementById('modalBadgeIcon');
      const title = document.getElementById('modalBadgeTitle');
      const desc = document.getElementById('modalBadgeDesc');
      const date = document.getElementById('modalBadgeDate');
      const status = document.getElementById('modalBadgeStatus');
      const modal = document.getElementById('modalBadgeDetail');
      if (icon) icon.innerText = badge.icon;
      if (title) title.innerText = badge.title;
      if (desc) desc.innerText = badge.desc;
      if (date) date.innerText = badge.date;
      if (status) status.innerText = badge.unlocked ? "Unlocked Badge ⭐" : "Challenge In Progress";
      if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
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
      const weightEl = document.getElementById('calcWeight');
      const w = parseFloat(weightEl?.value || '') || 65;
      const liters = (w * 0.033).toFixed(1);
      const glasses = Math.round(liters / 0.25);
      state.waterTargetGlasses = glasses;
      const targetText = document.getElementById('calcWaterTargetText');
      const glassesLabel = document.getElementById('hydrationGlassesLabel');
      if (targetText) targetText.innerText = `${liters} Liters (~${glasses} Glasses)`;
      if (glassesLabel) glassesLabel.innerText = `${state.waterLogged} / ${state.waterTargetGlasses} Glasses`;
    }

    function logWaterGlass() {
      state.waterLogged++;
      const glassesLabel = document.getElementById('hydrationGlassesLabel');
      if (glassesLabel) glassesLabel.innerText = `${state.waterLogged} / ${state.waterTargetGlasses} Glasses`;
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


