/* ======================================================================= */
/* SAKSHAM LOVED ONES PHOTO VAULT & FACE RECALL FEATURE                    */
/* ======================================================================= */

    function ensureDemoLovedPeople() {
      if (Array.isArray(state.familiarPeople) && state.familiarPeople.length > 0) return;
      const demoPeople = [{
        name: 'Trishna',
        role: 'Daughter',
        phone: '+1 (555) 102-2044',
        whatsapp: '15551022044',
        clue: 'She brought you fresh homemade apples and visited last Sunday.',
        img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        options: ['Trishna', 'Doctor', 'Neighbor', 'Nurse']
      }];
      state.familiarPeople = demoPeople.map(sanitizeLovedOne);
      persistLovedOnesLocal();
    }

    function getSafePersonPhoto(person) {
      const fallback = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
      const raw = person && person.img ? String(person.img).trim() : '';
      return raw || fallback;
    }

    function persistLovedOnesLocal() {
      if (!Array.isArray(state.familiarPeople)) return;
      try {
        localStorage.setItem('saksham_familiar_people', JSON.stringify(state.familiarPeople));
      } catch (e) {
        console.warn('[Saksham Vault] Could not persist loved ones locally:', e);
      }
    }

    function sanitizeLovedOne(person) {
      if (!person || typeof person !== 'object') return null;
      return {
        name: person.name || 'Family Member',
        role: person.role || 'Loved One',
        phone: person.phone || '+1 (555) 000-0000',
        whatsapp: (person.whatsapp || person.phone || '15550000000').replace(/[^0-9]/g, ''),
        clue: person.clue || `Your ${person.role || 'loved one'} ${person.name || 'Family Member'}.`,
        img: getSafePersonPhoto(person),
        options: Array.isArray(person.options) && person.options.length ? person.options : [person.name || 'Family Member', 'Doctor', 'Neighbor', 'Nurse']
      };
    }

    let faceQuizIdx = 0;
    function loadFaceQuizCard(idx = 0) {
      ensureDemoLovedPeople();
      if (!state.familiarPeople || state.familiarPeople.length === 0) {
        const fb = document.getElementById('faceQuizFeedback');
        if (fb) fb.innerText = 'No loved ones added yet. Add a family member below!';
        return;
      }
      faceQuizIdx = idx % state.familiarPeople.length;
      const person = sanitizeLovedOne(state.familiarPeople[faceQuizIdx]);
      const photo = document.getElementById('faceQuizPhoto');
      const clue = document.getElementById('faceQuizClue');
      const reveal = document.getElementById('faceRevealBox');
      const fb = document.getElementById('faceQuizFeedback');
      if (photo) photo.src = person.img || getSafePersonPhoto({ img: '' });
      if (clue) clue.innerText = `"${person.clue || ''}"`;
      if (reveal) reveal.classList.add('hidden');
      if (fb) fb.innerText = '';

      const grid = document.getElementById('faceOptionsGrid');
      if (!grid) return;
      const options = person.options || [person.name, 'Doctor', 'Neighbor', 'Caregiver'];
      grid.innerHTML = options.map(opt => `
        <button data-opt="${escapeHtmlCaregiver ? escapeHtmlCaregiver(opt) : opt}" data-correct="${person.name}" data-role="${person.role}"
          onclick="checkFaceQuizOption(this.dataset.opt, this.dataset.correct, this.dataset.role)"
          class="p-3 bg-white hover:bg-rose-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 transition shadow-xs">${opt}</button>
      `).join('');
    }
    function nextFaceQuizCard() {
      if (!state.familiarPeople || state.familiarPeople.length === 0) return;
      loadFaceQuizCard(faceQuizIdx + 1);
    }
    function speakFaceClue() {
      if (!state.familiarPeople || state.familiarPeople.length === 0) return;
      speakText(state.familiarPeople[faceQuizIdx].clue || '');
    }
    function revealFaceRelation() {
      if (!state.familiarPeople || state.familiarPeople.length === 0) return;
      const p = sanitizeLovedOne(state.familiarPeople[faceQuizIdx]);
      const box = document.getElementById('faceRevealBox');
      if (!box) return;
      box.innerText = `This is your ${p.role}, ${p.name}!`;
      box.classList.toggle('hidden');
    }
    function checkFaceQuizOption(selected, correctName, role) {
      const fb = document.getElementById('faceQuizFeedback');
      if (!fb) return;
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
      ensureDemoLovedPeople();
      const container = document.getElementById('lovedOnesContainer');
      if (!container) return;
      if (!state.familiarPeople || state.familiarPeople.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">No loved ones added yet. Click "+ Add Loved One" to get started.</p>`;
        return;
      }
      container.innerHTML = state.familiarPeople.map(l => {
        const person = sanitizeLovedOne(l);
        return `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <img src="${person.img}" class="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs" onerror="this.onerror=null;this.src='https://placehold.co/56x56/EEF2FF/4F46E5?text=👤';">
          <div class="flex-1">
            <h4 class="font-bold text-sm text-slate-900">${person.name}</h4>
            <p class="text-xs text-slate-500 font-bold">${person.role}</p>
            <label class="inline-flex items-center gap-1 mt-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer">
              <i class="fa-solid fa-camera"></i> Change photo
              <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" onchange="updateLovedOnePhoto(${state.familiarPeople.indexOf(l)}, this)">
            </label>
            <div class="flex gap-2.5 mt-1.5">
              <a href="tel:${person.phone || ''}" class="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1">
                <i class="fa-solid fa-phone"></i> Call
              </a>
              <a href="https://wa.me/${person.whatsapp || ''}?text=${encodeURIComponent('Hello ' + person.name + ', sending warm love from Saksham!')}" target="_blank" class="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                <i class="fa-brands fa-whatsapp"></i> WhatsApp
              </a>
            </div>
          </div>
        </div>
      `;
      }).join('');

      if (document.getElementById('faceQuizPhoto')) {
        loadFaceQuizCard(0);
      }
    }

    function readLovedOnePhoto(file) {
      if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        return Promise.reject(new Error('Choose a JPEG, PNG, or WebP image.'));
      }
      if (file.size > 12 * 1024 * 1024) {
        return Promise.reject(new Error('Choose an image smaller than 12 MB.'));
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read that image. Please try another file.'));
        reader.onload = () => {
          const image = new Image();
          image.onerror = () => reject(new Error('Could not open that image. Please try another file.'));
          image.onload = () => {
            const scale = Math.min(1, 480 / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext('2d');
            if (!context) {
              reject(new Error('Could not process that image. Please try another file.'));
              return;
            }
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.72));
          };
          image.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    async function updateLovedOnePhoto(index, input) {
      const file = input && input.files && input.files[0];
      const person = state.familiarPeople && state.familiarPeople[index];
      if (!file || !person) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Choose a JPEG, PNG, or WebP image.');
        input.value = '';
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        alert('Choose an image smaller than 12 MB.');
        input.value = '';
        return;
      }

      try {
        person.img = await readLovedOnePhoto(file);
        persistLovedOnesLocal();
        if (window.dbService && window.dbService.lovedOnes && person.id != null) {
          window.dbService.lovedOnes.updatePhoto(person.id, person.img);
        }
        renderLovedOnes();
        loadFaceQuizCard(faceQuizIdx);
      } catch (error) {
        alert(error.message);
        input.value = '';
      }
    }

    let newLovedOnePhoto = '';

    function openAddLovedOneModal() {
      const form = document.querySelector('#addLovedOneModal form');
      const preview = document.getElementById('newLovedOnePhotoPreview');
      const placeholder = document.getElementById('newLovedOnePhotoPlaceholder');
      if (form) form.reset();
      newLovedOnePhoto = '';
      if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
      }
      if (placeholder) placeholder.classList.remove('hidden');
      const modal = document.getElementById('addLovedOneModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }

    function closeAddLovedOneModal() {
      const modal = document.getElementById('addLovedOneModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    async function previewNewLovedOnePhoto(input) {
      const file = input && input.files && input.files[0];
      const preview = document.getElementById('newLovedOnePhotoPreview');
      const placeholder = document.getElementById('newLovedOnePhotoPlaceholder');
      if (!file || !preview) return;
      try {
        newLovedOnePhoto = await readLovedOnePhoto(file);
        preview.src = newLovedOnePhoto;
        preview.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
      } catch (error) {
        newLovedOnePhoto = '';
        input.value = '';
        alert(error.message);
      }
    }

    async function saveLovedOneCard(event) {
      event.preventDefault();
      const name = document.getElementById('lovedOneName').value.trim();
      const role = document.getElementById('lovedOneRole').value.trim();
      const phone = document.getElementById('lovedOnePhone').value.trim();
      if (!name || !role || !newLovedOnePhoto) {
        alert('Enter a name and relationship, then take or choose a photo.');
        return;
      }

      const normalized = sanitizeLovedOne({
        name,
        role,
        phone: phone || '+1 (555) 000-0000',
        whatsapp: phone || '15550000000',
        clue: `Your ${role} ${name}.`,
        img: newLovedOnePhoto,
        options: [name, 'Doctor', 'Neighbor', 'Nurse']
      });
      if (!Array.isArray(state.familiarPeople)) state.familiarPeople = [];

      if (window.dbService && window.dbService.lovedOnes) {
        await window.dbService.lovedOnes.create(normalized);
      } else {
        state.familiarPeople.push(normalized);
      }
      persistLovedOnesLocal();
      closeAddLovedOneModal();
      renderLovedOnes();
      loadFaceQuizCard(state.familiarPeople.length - 1);
    }


