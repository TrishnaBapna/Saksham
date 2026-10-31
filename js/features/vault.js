/* ======================================================================= */
/* SAKSHAM LOVED ONES PHOTO VAULT & FACE RECALL FEATURE                    */
/* ======================================================================= */

    function getVaultState() {
      if (typeof state !== 'undefined' && state) return state;
      if (typeof window !== 'undefined' && window.state) return window.state;
      return (typeof window !== 'undefined' ? (window.state = { familiarPeople: [] }) : { familiarPeople: [] });
    }

    function ensureDemoLovedPeople() {
      const st = getVaultState();
      if (Array.isArray(st.familiarPeople) && st.familiarPeople.length > 0) return;
      // If user has already visited and may have deleted contacts, do not resurrect deleted members
      const alreadySeeded = localStorage.getItem('saksham_loved_ones_seeded');
      const deletedAll = localStorage.getItem('saksham_loved_ones_deleted_all');
      if (alreadySeeded || deletedAll) return;

      if (!Array.isArray(st.familiarPeople)) {
        st.familiarPeople = [];
      }
      // First boot: seed default family card so the vault has a ready starting demo
      if (st.familiarPeople.length === 0) {
        st.familiarPeople = [{
          id: 'demo-loved-one-1',
          name: 'Trishna Sharma',
          role: 'Daughter',
          phone: '+1 (555) 102-2044',
          whatsapp: '15551022044',
          clue: 'She brought fresh apples and visited last Sunday.',
          img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
          options: ['Trishna Sharma', 'Doctor', 'Neighbor', 'Nurse']
        }];
      }
      try { localStorage.setItem('saksham_loved_ones_seeded', 'true'); } catch(e) {}
      persistLovedOnesLocal();
    }

    function getSafePersonPhoto(person) {
      const fallback = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
      const raw = person && person.img ? String(person.img).trim() : '';
      return raw || fallback;
    }

    function persistLovedOnesLocal() {
      const st = getVaultState();
      if (!Array.isArray(st.familiarPeople)) return;
      try {
        localStorage.setItem('saksham_familiar_people', JSON.stringify(st.familiarPeople));
      } catch (e) {
        console.warn('[Saksham Vault] Could not persist loved ones locally:', e);
      }
    }

    function sanitizeLovedOne(person) {
      if (!person || typeof person !== 'object') return null;
      return {
        id: person.id || `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      const st = getVaultState();
      const photo = document.getElementById('faceQuizPhoto');
      const clue = document.getElementById('faceQuizClue');
      const reveal = document.getElementById('faceRevealBox');
      const fb = document.getElementById('faceQuizFeedback');
      const grid = document.getElementById('faceOptionsGrid');

      if (!st.familiarPeople || st.familiarPeople.length === 0) {
        if (photo) photo.src = 'https://placehold.co/144x144/f1f5f9/64748b?text=👤+No+Contact';
        if (clue) clue.innerText = 'No loved ones added yet. Tap "+ Add Family Member" below to add someone!';
        if (reveal) reveal.classList.add('hidden');
        if (fb) fb.innerText = '';
        if (grid) grid.innerHTML = '<p class="col-span-2 text-xs text-slate-400 text-center py-2 italic">Add contacts below to practice recognition.</p>';
        return;
      }
      faceQuizIdx = idx % st.familiarPeople.length;
      if (faceQuizIdx < 0) faceQuizIdx = 0;
      const person = sanitizeLovedOne(st.familiarPeople[faceQuizIdx]);
      if (photo) photo.src = person.img || getSafePersonPhoto({ img: '' });
      if (clue) clue.innerText = `"${person.clue || ''}"`;
      if (reveal) reveal.classList.add('hidden');
      if (fb) fb.innerText = '';

      if (!grid) return;
      const options = person.options || [person.name, 'Doctor', 'Neighbor', 'Caregiver'];
      grid.innerHTML = options.map(opt => `
        <button data-opt="${safeEscapeHtml(opt)}" data-correct="${person.name}" data-role="${person.role}"
          onclick="checkFaceQuizOption(this.dataset.opt, this.dataset.correct, this.dataset.role)"
          class="p-3 bg-white hover:bg-rose-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 transition shadow-xs active:scale-95 cursor-pointer">${opt}</button>
      `).join('');
    }

    function nextFaceQuizCard() {
      const st = getVaultState();
      if (!st.familiarPeople || st.familiarPeople.length === 0) return;
      loadFaceQuizCard(faceQuizIdx + 1);
    }

    function speakFaceClue() {
      const st = getVaultState();
      if (!st.familiarPeople || st.familiarPeople.length === 0) return;
      speakText(st.familiarPeople[faceQuizIdx].clue || '');
    }

    function revealFaceRelation() {
      const st = getVaultState();
      if (!st.familiarPeople || st.familiarPeople.length === 0) return;
      const p = sanitizeLovedOne(st.familiarPeople[faceQuizIdx]);
      const box = document.getElementById('faceRevealBox');
      if (!box) return;
      box.innerText = `This is your ${p.role}, ${p.name}!`;
      box.classList.toggle('hidden');
    }

    function safeEscapeHtml(str) {
      if (typeof str !== 'string') return String(str || '');
      return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    }

    function checkFaceQuizOption(selected, correctName, role) {
      const fb = document.getElementById('faceQuizFeedback');
      if (!fb) return;
      if (selected.toLowerCase().includes(correctName.toLowerCase())) {
        fb.className = "text-center font-black text-xs text-teal-700";
        fb.innerText = `⭐ Yes! That is ${correctName} (${role})!`;
      } else {
        fb.className = "text-center font-bold text-xs text-rose-600";
        fb.innerText = `Try listening to the voice clue above!`;
      }
    }

    /**
     * Resizes and compresses any image file or blob from camera, file upload, or clipboard
     */
    function readLovedOnePhoto(fileOrBlob) {
      if (!fileOrBlob) {
        return Promise.reject(new Error('No image was provided.'));
      }
      if (fileOrBlob.type && !fileOrBlob.type.startsWith('image/')) {
        return Promise.reject(new Error('Please select or paste an image file.'));
      }
      if (fileOrBlob.size && fileOrBlob.size > 20 * 1024 * 1024) {
        return Promise.reject(new Error('Image is too large. Please choose an image smaller than 20 MB.'));
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read image file.'));
        reader.onload = () => {
          const image = new Image();
          image.onerror = () => reject(new Error('Could not process image format.'));
          image.onload = () => {
            const maxDim = 540;
            const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext('2d');
            if (!context) {
              reject(new Error('Could not render image context.'));
              return;
            }
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          image.src = reader.result;
        };
        reader.readAsDataURL(fileOrBlob);
      });
    }

    /**
     * Applies a photo to a loved one at given index and persists
     */
    function applyLovedOnePhoto(index, dataUrl) {
      const st = getVaultState();
      if (!Array.isArray(st.familiarPeople)) st.familiarPeople = [];

      if (!st.familiarPeople[index]) {
        // Contact record doesn't exist yet (e.g. empty vault) — create first card with this photo!
        const defaultMember = sanitizeLovedOne({
          name: 'Family Member',
          role: 'Loved One',
          phone: '+1 (555) 000-0000',
          whatsapp: '15550000000',
          clue: 'Your cherished family member.',
          img: dataUrl,
          options: ['Family Member', 'Doctor', 'Neighbor', 'Nurse']
        });
        st.familiarPeople.push(defaultMember);
        index = st.familiarPeople.length - 1;
        if (window.dbService && window.dbService.lovedOnes) {
          try { window.dbService.lovedOnes.create(defaultMember); } catch(e) {}
        }
      } else {
        st.familiarPeople[index].img = dataUrl;
        if (window.dbService && window.dbService.lovedOnes && st.familiarPeople[index].id != null) {
          try { window.dbService.lovedOnes.updatePhoto(st.familiarPeople[index].id, dataUrl); } catch(e) {}
        }
      }

      persistLovedOnesLocal();
      renderLovedOnes();
      loadFaceQuizCard(index);
      if (typeof showToast === 'function') {
        showToast('Photo updated successfully! 📸', 'success');
      }
    }

    /**
     * Handles camera snap or file selection on a card
     */
    async function handleLovedOnePhotoFile(index, input) {
      const file = input && input.files && input.files[0];
      if (!file) return;
      try {
        const dataUrl = await readLovedOnePhoto(file);
        applyLovedOnePhoto(index, dataUrl);
      } catch (err) {
        alert(err.message || 'Could not load photo');
      } finally {
        if (input) input.value = '';
      }
    }

    /**
     * Pastes photo from clipboard to a specific card
     */
    var pendingPasteIndex = null;
    if (typeof window !== 'undefined') window.pendingPasteIndex = pendingPasteIndex;
    async function pasteLovedOnePhoto(index) {
      try {
        if (navigator.clipboard && navigator.clipboard.read) {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            for (const type of item.types) {
              if (type.startsWith('image/')) {
                const blob = await item.getType(type);
                const dataUrl = await readLovedOnePhoto(blob);
                applyLovedOnePhoto(index, dataUrl);
                return;
              }
            }
          }
        }
        // Fallback: set pending index and prompt user
        window.pendingPasteIndex = index;
        if (typeof showToast === 'function') {
          showToast('Card ready! Press Ctrl+V (or Cmd+V) to paste your photo', 'info');
        } else {
          alert('Press Ctrl+V (or Cmd+V on Mac) to paste your copied photo onto this card.');
        }
      } catch (err) {
        console.warn('[Saksham Paste] Clipboard read error:', err);
        window.pendingPasteIndex = index;
        if (typeof showToast === 'function') {
          showToast('Press Ctrl+V (or Cmd+V) to paste the copied image', 'info');
        } else {
          alert('Press Ctrl+V (or Cmd+V on Mac) to paste the copied image onto this card.');
        }
      }
    }

    /**
     * Direct Camera / File update for the top Face Quiz Card (original card)
     */
    async function updateFaceQuizPhoto(input) {
      if (typeof input === 'string') {
        applyLovedOnePhoto(faceQuizIdx, input);
        return;
      }
      const file = input && input.files && input.files[0];
      if (!file) return;
      try {
        const dataUrl = await readLovedOnePhoto(file);
        applyLovedOnePhoto(faceQuizIdx, dataUrl);
      } catch (err) {
        alert(err.message || 'Could not update flashcard photo');
      } finally {
        if (input) input.value = '';
      }
    }

    function deleteCurrentQuizCard() {
      const st = getVaultState();
      if (!st.familiarPeople || st.familiarPeople.length === 0) return;
      deleteLovedOneCard(faceQuizIdx);
    }

    async function pasteFaceQuizPhoto() {
      await pasteLovedOnePhoto(faceQuizIdx);
    }

    /**
     * Removes a loved one card directly and reliably across state, local storage, and Firestore
     */
    function deleteLovedOneCard(indexOrId) {
      const st = getVaultState();
      if (!st.familiarPeople || !Array.isArray(st.familiarPeople)) return;

      let targetIdx = -1;
      if (typeof indexOrId === 'number') {
        targetIdx = indexOrId;
      } else if (typeof indexOrId === 'string' && !isNaN(Number(indexOrId))) {
        targetIdx = Number(indexOrId);
      } else {
        targetIdx = st.familiarPeople.findIndex(p => p.id === indexOrId);
      }

      if (targetIdx < 0 || !st.familiarPeople[targetIdx]) return;
      const person = st.familiarPeople[targetIdx];
      const personId = person.id;

      // Firestore deletion (both by person.id and by sequential doc index)
      if (window.dbService && window.dbService.lovedOnes && typeof window.dbService.lovedOnes.delete === 'function') {
        try {
          if (personId != null) window.dbService.lovedOnes.delete(personId).catch(() => {});
          window.dbService.lovedOnes.delete(targetIdx + 1).catch(() => {});
        } catch (e) {}
      }

      // Offline sync queue
      if (window.offlineSyncService && typeof window.offlineSyncService.enqueueOperation === 'function') {
        try {
          const userStr = localStorage.getItem('saksham_active_user');
          const uid = userStr ? JSON.parse(userStr).firebaseUid || 'anon' : 'anon';
          window.offlineSyncService.enqueueOperation(uid, 'loved_one', 'delete', { id: personId, index: targetIdx });
        } catch(e) {}
      }

      st.familiarPeople.splice(targetIdx, 1);
      if (typeof window !== 'undefined' && window.state) window.state.familiarPeople = st.familiarPeople;
      if (typeof state !== 'undefined') state.familiarPeople = st.familiarPeople;

      try { localStorage.setItem('saksham_loved_ones_seeded', 'true'); } catch(e) {}
      if (st.familiarPeople.length === 0) {
        try { localStorage.setItem('saksham_loved_ones_deleted_all', 'true'); } catch(e) {}
      }
      persistLovedOnesLocal();
      renderLovedOnes();
      loadFaceQuizCard(0);
      if (typeof showSakshamToast === 'function') {
        showSakshamToast('Family contact removed', 'info');
      }
    }

    /* ==================== REAL CAMERA SNAP ENGINE FOR CARDS & MEMBERS ==================== */
    let currentCameraTarget = null; // 'new' | 'quiz' | number (card index)

    function openLiveCameraForLovedOne(target = 'new') {
      currentCameraTarget = target;
      window.currentCameraTarget = target;

      // Reset trouble notice
      const notice = document.getElementById('cameraTroubleNotice');
      if (notice) notice.classList.add('hidden');

      // Temporarily hide add modal if open so camera modal is visible
      const addModal = document.getElementById('addLovedOneModal');
      if (addModal && !addModal.classList.contains('hidden')) {
        addModal.classList.add('hidden');
        addModal.classList.remove('flex');
        window._wasAddModalOpen = true;
      } else {
        window._wasAddModalOpen = false;
      }

      if (typeof openLiveFaceScanModal === 'function') {
        openLiveFaceScanModal();
      } else {
        const modal = document.getElementById('webcamModal');
        if (modal) {
          modal.classList.remove('hidden');
          modal.classList.add('flex');
        }
      }
    }

    async function handleWebcamFallbackUpload(input) {
      const file = input && input.files && input.files[0];
      if (!file) return;
      try {
        const dataUrl = await readLovedOnePhoto(file);
        if (typeof closeLiveFaceScanModal === 'function') {
          closeLiveFaceScanModal();
        } else {
          const modal = document.getElementById('webcamModal');
          if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
          }
        }

        if (typeof window._webcamPhotoCallback === 'function') {
          const cb = window._webcamPhotoCallback;
          window._webcamPhotoCallback = null;
          cb(dataUrl);
          return;
        }

        const target = currentCameraTarget !== null ? currentCameraTarget : window.currentCameraTarget;
        if (target === 'new') {
          newLovedOnePhoto = dataUrl;
          const preview = document.getElementById('newLovedOnePhotoPreview');
          const placeholder = document.getElementById('newLovedOnePhotoPlaceholder');
          if (preview) {
            preview.src = dataUrl;
            preview.classList.remove('hidden');
          }
          if (placeholder) placeholder.classList.add('hidden');
          const addModal = document.getElementById('addLovedOneModal');
          if (addModal) {
            addModal.classList.remove('hidden');
            addModal.classList.add('flex');
          }
          if (typeof showSakshamToast === 'function') {
            showSakshamToast('Photo attached successfully! 📸', 'success');
          }
        } else if (target === 'inline') {
          window.inlineNewPhotoData = dataUrl;
          const preview = document.getElementById('inlineLovedOnePhotoPreview');
          const placeholder = document.getElementById('inlineLovedOnePlaceholder');
          if (preview) {
            preview.src = dataUrl;
            preview.classList.remove('hidden');
          }
          if (placeholder) placeholder.classList.add('hidden');
          if (typeof showSakshamToast === 'function') {
            showSakshamToast('Photo attached for new card! 📸', 'success');
          }
        } else if (typeof target === 'number') {
          applyLovedOnePhoto(target, dataUrl);
        } else {
          updateFaceQuizPhoto(dataUrl);
        }
      } catch (err) {
        alert(err.message || 'Could not load photo');
      } finally {
        if (input) input.value = '';
      }
    }

    function snapWebcamPhotoForLovedOne() {
      let snapshot = null;
      if (typeof captureLiveWebcamSnapshot === 'function') {
        snapshot = captureLiveWebcamSnapshot();
      }
      if (!snapshot) {
        // Do NOT automatically launch file picker (folder selection dialog)
        const notice = document.getElementById('cameraTroubleNotice');
        if (notice) notice.classList.remove('hidden');
        const status = document.getElementById('scanStatusTxt');
        if (status) {
          status.innerHTML = `<span class="text-rose-600 font-bold">⚠️ Camera stream not ready yet. If you have Focusmate, Zoom, or another video app open, please pause their video, or tap "📸 Take Photo with Device Camera" below.</span>`;
        }
        if (typeof showSakshamToast === 'function') {
          showSakshamToast('Camera preview is still connecting or blocked. Wait a second or tap Take Photo below.', 'warning');
        }
        return;
      }

      if (typeof closeLiveFaceScanModal === 'function') {
        closeLiveFaceScanModal();
      } else {
        const modal = document.getElementById('webcamModal');
        if (modal) {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        }
      }

      if (typeof window._webcamPhotoCallback === 'function') {
        const cb = window._webcamPhotoCallback;
        window._webcamPhotoCallback = null;
        cb(snapshot);
        return;
      }

      const target = currentCameraTarget !== null ? currentCameraTarget : window.currentCameraTarget;

      if (target === 'new') {
        newLovedOnePhoto = snapshot;
        const preview = document.getElementById('newLovedOnePhotoPreview');
        const placeholder = document.getElementById('newLovedOnePhotoPlaceholder');
        if (preview) {
          preview.src = snapshot;
          preview.classList.remove('hidden');
        }
        if (placeholder) placeholder.classList.add('hidden');

        // Re-open Add Loved One modal with the snapped photo
        const addModal = document.getElementById('addLovedOneModal');
        if (addModal) {
          addModal.classList.remove('hidden');
          addModal.classList.add('flex');
        }
        if (typeof showSakshamToast === 'function') {
          showSakshamToast('Photo snapped successfully! 📸', 'success');
        }
      } else if (target === 'inline') {
        window.inlineNewPhotoData = snapshot;
        const preview = document.getElementById('inlineLovedOnePhotoPreview');
        const placeholder = document.getElementById('inlineLovedOnePlaceholder');
        if (preview) {
          preview.src = snapshot;
          preview.classList.remove('hidden');
        }
        if (placeholder) placeholder.classList.add('hidden');
        if (typeof showSakshamToast === 'function') {
          showSakshamToast('Photo snapped for new card! 📸', 'success');
        }
      } else if (typeof target === 'number') {
        applyLovedOnePhoto(target, snapshot);
        if (typeof showSakshamToast === 'function') {
          showSakshamToast('Contact card photo updated! 📸', 'success');
        }
      } else {
        // Default: update face quiz card and sync
        updateFaceQuizPhoto(snapshot);
        if (typeof showSakshamToast === 'function') {
          showSakshamToast('Flashcard photo updated! 📸', 'success');
        }
      }
    }

    /* ==================== INLINE ADD CARD IN LOWER CONTAINER ==================== */
    var inlineNewPhotoData = '';
    if (typeof window !== 'undefined') window.inlineNewPhotoData = inlineNewPhotoData;

    async function previewInlineLovedOnePhoto(input) {
      const file = input && input.files && input.files[0];
      const preview = document.getElementById('inlineLovedOnePhotoPreview');
      const placeholder = document.getElementById('inlineLovedOnePlaceholder');
      if (!file || !preview) return;
      try {
        window.inlineNewPhotoData = await readLovedOnePhoto(file);
        preview.src = window.inlineNewPhotoData;
        preview.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
      } catch (err) {
        alert(err.message);
        window.inlineNewPhotoData = '';
        if (input) input.value = '';
      }
    }

    async function pasteInlineLovedOnePhoto() {
      try {
        if (navigator.clipboard && navigator.clipboard.read) {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            for (const type of item.types) {
              if (type.startsWith('image/')) {
                const blob = await item.getType(type);
                window.inlineNewPhotoData = await readLovedOnePhoto(blob);
                const preview = document.getElementById('inlineLovedOnePhotoPreview');
                const placeholder = document.getElementById('inlineLovedOnePlaceholder');
                if (preview) {
                  preview.src = window.inlineNewPhotoData;
                  preview.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
                if (typeof showToast === 'function') showToast('Photo pasted! 📋', 'success');
                return;
              }
            }
          }
        }
        window.pendingPasteIndex = 'inline';
        if (typeof showToast === 'function') {
          showToast('Press Ctrl+V (or Cmd+V) to paste photo to new card', 'info');
        } else {
          alert('Press Ctrl+V (or Cmd+V on Mac) to paste photo to new card');
        }
      } catch (err) {
        window.pendingPasteIndex = 'inline';
        alert('Press Ctrl+V (or Cmd+V on Mac) to paste the copied image');
      }
    }

    async function saveInlineLovedOne() {
      const nameInput = document.getElementById('inlineLovedOneName');
      const roleInput = document.getElementById('inlineLovedOneRole');
      const name = nameInput ? nameInput.value.trim() : '';
      const role = roleInput ? roleInput.value.trim() : '';
      const photo = window.inlineNewPhotoData;

      if (!name) {
        alert('Please enter a name (e.g. Meera, Grandson Rahul).');
        if (nameInput) nameInput.focus();
        return;
      }
      if (!role) {
        alert('Please enter relationship (e.g. Daughter, Son, Friend).');
        if (roleInput) roleInput.focus();
        return;
      }
      if (!photo) {
        alert('Please click Camera to take photo, pick a File, or Paste a photo.');
        return;
      }

      const newPerson = sanitizeLovedOne({
        name,
        role,
        phone: '+1 (555) 000-0000',
        whatsapp: '15550000000',
        clue: `Your ${role} ${name}.`,
        img: photo,
        options: [name, 'Doctor', 'Neighbor', 'Nurse']
      });

      const st = getVaultState();
      if (!Array.isArray(st.familiarPeople)) st.familiarPeople = [];
      if (window.dbService && window.dbService.lovedOnes) {
        await window.dbService.lovedOnes.create(newPerson);
      } else {
        st.familiarPeople.push(newPerson);
      }
      persistLovedOnesLocal();
      inlineNewPhotoData = '';
      if (typeof window !== 'undefined') window.inlineNewPhotoData = '';
      renderLovedOnes();
      loadFaceQuizCard(st.familiarPeople.length - 1);
      if (typeof showToast === 'function') {
        showToast(`Family card for ${name} added! ⭐`, 'success');
      }
    }

    /**
     * Renders the Lower End Cards container with full photo support (Camera • File • Paste)
     */
    function renderLovedOnes() {
      ensureDemoLovedPeople();
      const container = document.getElementById('lovedOnesContainer');
      if (!container) return;
      const st = getVaultState();

      const cardsHtml = (st.familiarPeople || []).map((l, index) => {
        const person = sanitizeLovedOne(l);
        return `
        <div class="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative group overflow-hidden" data-person-index="${index}">
          
          <!-- Top Header: Role Badge & Delete -->
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              ${person.role}
            </span>
            <button type="button" onclick="event.stopPropagation(); deleteLovedOneCard(${index})" class="text-slate-400 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-rose-50 text-xs cursor-pointer" title="Remove Card">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>

          <!-- Person Photo & Name Section (Like Original Card) -->
          <div class="flex items-center gap-3">
            <div class="relative shrink-0">
              <img src="${person.img}" class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-teal-600/30 shadow-md ring-2 ring-emerald-50 shrink-0" alt="${person.name}" onerror="this.onerror=null;this.src='https://placehold.co/96x96/EEF2FF/4F46E5?text=👤';">
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-black text-sm sm:text-base text-slate-900 truncate font-heading">${person.name}</h4>
              <p class="text-xs text-slate-500 font-semibold line-clamp-2 mt-0.5">${person.clue || person.role}</p>
              <div class="flex flex-wrap gap-1.5 mt-2">
                ${person.phone ? `
                  <a href="tel:${person.phone}" class="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-[11px] font-black rounded-lg border border-teal-200 transition flex items-center gap-1">
                    <i class="fa-solid fa-phone text-[10px]"></i> Call
                  </a>
                ` : ''}
                ${person.whatsapp ? `
                  <a href="https://wa.me/${person.whatsapp}?text=${encodeURIComponent('Hello ' + person.name + ', sending warm love from Saksham!')}" target="_blank" class="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-black rounded-lg border border-emerald-200 transition flex items-center gap-1">
                    <i class="fa-brands fa-whatsapp text-[10px]"></i> WhatsApp
                  </a>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Direct Photo Actions Dock: Camera • File • Paste (Wrap Safe, No Overflow) -->
          <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 bg-slate-50/80 p-2 rounded-xl">
            <span class="text-[10px] font-extrabold text-slate-500 flex items-center gap-1 shrink-0">
              <i class="fa-solid fa-camera-retro text-teal-600"></i> Photo:
            </span>
            <div class="flex flex-wrap items-center gap-1">
              <!-- 1. Click Photo on Camera -->
              <button type="button" onclick="openLiveCameraForLovedOne(${index})" class="cursor-pointer px-2 py-1 bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-[10px] font-black transition flex items-center gap-1 shadow-2xs shrink-0" title="Snap real photo with webcam/camera">
                <i class="fa-solid fa-camera text-teal-600"></i>
                <span>Camera</span>
              </button>
              <!-- 2. Choose Photo from File/Gallery -->
              <label class="cursor-pointer px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-[10px] font-black transition flex items-center gap-1 shadow-2xs shrink-0" title="Select photo from files">
                <i class="fa-solid fa-folder-open text-indigo-600"></i>
                <span>File</span>
                <input type="file" accept="image/*" class="hidden" onchange="handleLovedOnePhotoFile(${index}, this)">
              </label>
              <!-- 3. Paste Photo from Clipboard -->
              <button type="button" onclick="pasteLovedOnePhoto(${index})" class="px-2 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-black transition flex items-center gap-1 shadow-2xs cursor-pointer shrink-0" title="Paste copied photo">
                <i class="fa-solid fa-paste text-amber-600"></i>
                <span>Paste</span>
              </button>
            </div>
          </div>

        </div>
        `;
      }).join('');

      const emptyStateHtml = (!st.familiarPeople || st.familiarPeople.length === 0) ? `
        <div class="col-span-full p-6 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
          <div class="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl shadow-xs">
            <i class="fa-solid fa-user-plus"></i>
          </div>
          <h4 class="font-black text-slate-800 text-sm">No Family Contacts Saved Yet</h4>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">Tap "+ Add Family Member" below to register your loved ones with live camera photos.</p>
        </div>
      ` : '';

      // Clean, spacious "+ Add Family Member" card
      const addCardHtml = `
        <div onclick="openAddLovedOneModal()" class="bg-gradient-to-br from-teal-50/40 via-white to-emerald-50/30 p-6 rounded-3xl border-2 border-dashed border-teal-300 hover:border-teal-500 shadow-xs hover:shadow-md transition-all flex flex-col items-center justify-center text-center space-y-3 cursor-pointer group min-h-[170px]">
          <div class="w-12 h-12 rounded-2xl bg-teal-100 group-hover:bg-teal-200 text-teal-800 flex items-center justify-center text-xl transition shadow-xs">
            <i class="fa-solid fa-user-plus"></i>
          </div>
          <div>
            <h4 class="font-black text-sm sm:text-base text-slate-800 font-heading">+ Add Family Member</h4>
            <p class="text-xs text-slate-500 mt-0.5">Live Camera Snap • File • Paste</p>
          </div>
        </div>
      `;

      container.innerHTML = emptyStateHtml + cardsHtml + addCardHtml;

      if (document.getElementById('faceQuizPhoto')) {
        loadFaceQuizCard(faceQuizIdx);
      }
    }

    /* ==================== GLOBAL CLIPBOARD PASTE LISTENER ==================== */
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('paste', async (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (!file) continue;
          try {
            const dataUrl = await readLovedOnePhoto(file);
            const st = getVaultState();
            
            // 1. If Add Loved One modal is open:
            const modal = document.getElementById('addLovedOneModal');
            if (modal && !modal.classList.contains('hidden')) {
              const preview = document.getElementById('newLovedOnePhotoPreview');
              const placeholder = document.getElementById('newLovedOnePhotoPlaceholder');
              if (preview) {
                preview.src = dataUrl;
                preview.classList.remove('hidden');
              }
              if (placeholder) placeholder.classList.add('hidden');
              newLovedOnePhoto = dataUrl;
              if (typeof showToast === 'function') showToast('Photo pasted to modal! 📋', 'success');
              return;
            }

            // 2. If a specific card was flagged for paste:
            if (typeof pendingPasteIndex === 'number' && st.familiarPeople && st.familiarPeople[pendingPasteIndex]) {
              applyLovedOnePhoto(pendingPasteIndex, dataUrl);
              pendingPasteIndex = null;
              return;
            }

            // 3. If inline add card container is targeted:
            if (pendingPasteIndex === 'inline') {
              inlineNewPhotoData = dataUrl;
              const preview = document.getElementById('inlineLovedOnePhotoPreview');
              const placeholder = document.getElementById('inlineLovedOnePlaceholder');
              if (preview) {
                preview.src = dataUrl;
                preview.classList.remove('hidden');
              }
              if (placeholder) placeholder.classList.add('hidden');
              pendingPasteIndex = null;
              if (typeof showToast === 'function') showToast('Photo pasted to new card! 📋', 'success');
              return;
            }

            // 4. Default: Update active face quiz card
            if (st.familiarPeople && st.familiarPeople.length > 0) {
              applyLovedOnePhoto(faceQuizIdx || 0, dataUrl);
            }
          } catch (err) {
            console.warn('[Saksham Paste] Image read error:', err);
          }
        }
      }
    });
  }

    /* ==================== MODAL ADD LOVED ONE ==================== */
    let newLovedOnePhoto = '';

    function openAddLovedOneModal(prefilledPhoto = '') {
      const form = document.querySelector('#addLovedOneModal form');
      const preview = document.getElementById('newLovedOnePhotoPreview');
      const placeholder = document.getElementById('newLovedOnePhotoPlaceholder');
      if (form) form.reset();
      newLovedOnePhoto = prefilledPhoto || '';
      if (prefilledPhoto) {
        if (preview) {
          preview.src = prefilledPhoto;
          preview.classList.remove('hidden');
        }
        if (placeholder) placeholder.classList.add('hidden');
      } else {
        if (preview) {
          preview.src = '';
          preview.classList.add('hidden');
        }
        if (placeholder) placeholder.classList.remove('hidden');
      }
      const modal = document.getElementById('addLovedOneModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';
      }
      if (typeof window.lockScroll === 'function') window.lockScroll();
    }

    function closeAddLovedOneModal() {
      const modal = document.getElementById('addLovedOneModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
      }
      const webcamModal = document.getElementById('webcamModal');
      if (webcamModal) {
        webcamModal.classList.add('hidden');
        webcamModal.classList.remove('flex');
        webcamModal.style.display = 'none';
      }
      window._wasAddModalOpen = false;
      if (typeof window.forceUnlockScroll === 'function') {
        window.forceUnlockScroll();
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
        if (input) input.value = '';
        alert(error.message);
      }
    }

    async function pasteModalLovedOnePhoto() {
      try {
        if (navigator.clipboard && navigator.clipboard.read) {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            for (const type of item.types) {
              if (type.startsWith('image/')) {
                const blob = await item.getType(type);
                newLovedOnePhoto = await readLovedOnePhoto(blob);
                const preview = document.getElementById('newLovedOnePhotoPreview');
                const placeholder = document.getElementById('newLovedOnePhotoPlaceholder');
                if (preview) {
                  preview.src = newLovedOnePhoto;
                  preview.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
                if (typeof showToast === 'function') showToast('Photo pasted! 📋', 'success');
                return;
              }
            }
          }
        }
        alert('Please press Ctrl+V (or Cmd+V on Mac) to paste your photo.');
      } catch (err) {
        alert('Please press Ctrl+V (or Cmd+V on Mac) to paste your photo.');
      }
    }

    async function saveLovedOneCard(event) {
      if (event && event.preventDefault) event.preventDefault();
      const name = document.getElementById('lovedOneName').value.trim();
      const role = document.getElementById('lovedOneRole').value.trim();
      const phone = document.getElementById('lovedOnePhone').value.trim();
      if (!name || !role || !newLovedOnePhoto) {
        alert('Enter a name and relationship, then click camera, choose file, or paste photo.');
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
      const st = getVaultState();
      if (!Array.isArray(st.familiarPeople)) st.familiarPeople = [];

      if (window.dbService && window.dbService.lovedOnes) {
        await window.dbService.lovedOnes.create(normalized);
      } else {
        st.familiarPeople.push(normalized);
      }
      persistLovedOnesLocal();
      closeAddLovedOneModal();
      renderLovedOnes();
      loadFaceQuizCard(st.familiarPeople.length - 1);
      if (typeof showToast === 'function') {
        showToast(`Family card for ${name} saved! ⭐`, 'success');
      }
    }

    // Expose functions globally to window
    if (typeof window !== 'undefined') {
      window.ensureDemoLovedPeople = ensureDemoLovedPeople;
      window.loadFaceQuizCard = loadFaceQuizCard;
      window.nextFaceQuizCard = nextFaceQuizCard;
      window.speakFaceClue = speakFaceClue;
      window.revealFaceRelation = revealFaceRelation;
      window.checkFaceQuizOption = checkFaceQuizOption;
      window.renderLovedOnes = renderLovedOnes;
      window.readLovedOnePhoto = readLovedOnePhoto;
      window.applyLovedOnePhoto = applyLovedOnePhoto;
      window.handleLovedOnePhotoFile = handleLovedOnePhotoFile;
      window.pasteLovedOnePhoto = pasteLovedOnePhoto;
      window.updateFaceQuizPhoto = updateFaceQuizPhoto;
      window.pasteFaceQuizPhoto = pasteFaceQuizPhoto;
      window.deleteLovedOneCard = deleteLovedOneCard;
      window.deleteCurrentQuizCard = deleteCurrentQuizCard;
      window.openAddLovedOneModal = openAddLovedOneModal;
      window.closeAddLovedOneModal = closeAddLovedOneModal;
      window.previewNewLovedOnePhoto = previewNewLovedOnePhoto;
      window.pasteModalLovedOnePhoto = pasteModalLovedOnePhoto;
      window.handleWebcamFallbackUpload = handleWebcamFallbackUpload;
      window.saveLovedOneCard = saveLovedOneCard;
      window.previewInlineLovedOnePhoto = previewInlineLovedOnePhoto;
      window.pasteInlineLovedOnePhoto = pasteInlineLovedOnePhoto;
      window.saveInlineLovedOne = saveInlineLovedOne;
      window.openLiveCameraForLovedOne = openLiveCameraForLovedOne;
      window.snapWebcamPhotoForLovedOne = snapWebcamPhotoForLovedOne;
    }
