/* ======================================================================= */
/* SAKSHAM LOVED ONES PHOTO VAULT & FACE RECALL FEATURE                    */
/* ======================================================================= */

    let faceQuizIdx = 0;
    function loadFaceQuizCard(idx = 0) {
      faceQuizIdx = idx % state.familiarPeople.length;
      const person = state.familiarPeople[faceQuizIdx];
      document.getElementById('faceQuizPhoto').src = person.img;
      document.getElementById('faceQuizClue').innerText = `"${person.clue}"`;
      document.getElementById('faceRevealBox').classList.add('hidden');
      document.getElementById('faceQuizFeedback').innerText = '';

      const grid = document.getElementById('faceOptionsGrid');
      grid.innerHTML = (person.options || [person.name, 'Doctor', 'Neighbor', 'Caregiver']).map(opt => `
        <button onclick="checkFaceQuizOption('${opt}', '${person.name}', '${person.role}')" class="p-3 bg-white hover:bg-rose-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 transition shadow-xs">${opt}</button>
      `).join('');
    }
    function nextFaceQuizCard() { loadFaceQuizCard(faceQuizIdx + 1); }
    function speakFaceClue() { speakText(state.familiarPeople[faceQuizIdx].clue); }
    function revealFaceRelation() {
      const p = state.familiarPeople[faceQuizIdx];
      const box = document.getElementById('faceRevealBox');
      box.innerText = `This is your ${p.role}, ${p.name}!`;
      box.classList.toggle('hidden');
    }
    function checkFaceQuizOption(selected, correctName, role) {
      const fb = document.getElementById('faceQuizFeedback');
      if (selected.toLowerCase().includes(correctName.toLowerCase())) {
        awardXp(50, "Face Recall");
        fb.className = "text-center font-black text-xs text-teal-700";
        fb.innerText = `⭐ Yes! That is ${correctName} (${role})! +50 XP`;
      } else {
        fb.className = "text-center font-bold text-xs text-rose-600";
        fb.innerText = `Try listening to the voice clue above!`;
      }
    }

    function renderLovedOnes() {
      document.getElementById('lovedOnesContainer').innerHTML = state.familiarPeople.map(l => `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <img src="${l.img}" class="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs">
          <div class="flex-1">
            <h4 class="font-bold text-sm text-slate-900">${l.name}</h4>
            <p class="text-xs text-slate-500 font-bold">${l.role}</p>
            <div class="flex gap-2.5 mt-1.5">
              <a href="tel:${l.phone}" class="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1">
                <i class="fa-solid fa-phone"></i> Call
              </a>
              <a href="https://wa.me/${l.whatsapp || '15552348901'}?text=${encodeURIComponent('Hello ' + l.name + ', sending warm love from Saksham!')}" target="_blank" class="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                <i class="fa-brands fa-whatsapp"></i> WhatsApp
              </a>
            </div>
          </div>
        </div>
      `).join('');
    }

    function addLovedOnePrompt() {
      const n = prompt("Enter relative's name:");
      const r = prompt("Relationship (e.g. Granddaughter, Son):");
      const phone = prompt("Phone number (e.g. +1 555-000-0000):");
      if (n && r) {
        state.familiarPeople.push({
          name: n, role: r, phone: phone || "+1 (555) 000-0000",
          whatsapp: (phone || '15550000000').replace(/[^0-9]/g, ''),
          clue: `Your ${r} ${n}.`,
          img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
          options: [n, "Doctor", "Neighbor", "Nurse"]
        });
        renderLovedOnes();
        alert(`Saved ${n} to Loved Ones Cards!`);
      }
    }


