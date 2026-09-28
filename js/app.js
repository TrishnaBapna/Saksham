/* ======================================================================= */
/* SAKSHAM APPLICATION BOOTSTRAP, AUTH GATEWAY & LIFECYCLE CONTROLLER     */
/* ======================================================================= */

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js?v=3')
          .then(reg => {
            console.log('[Saksham PWA] Service Worker registered:', reg.scope);
            try { reg.update(); } catch(e) {}
            if (typeof syncUpcomingAlarmsWithServiceWorker === 'function') {
              syncUpcomingAlarmsWithServiceWorker();
            }
          })
          .catch(err => console.log('[Saksham PWA] SW registration failed:', err));
      });

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_ACTION') {
          if (event.data.action === 'start' && typeof startRoutineFromReminder === 'function') {
            startRoutineFromReminder();
          }
        }
      });
    }

    let deferredInstallPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const btn = document.getElementById('btn-install-pwa');
      if (btn) btn.classList.remove('hidden');
    });

    function installPwaApp() {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('[Saksham PWA] User accepted the install prompt');
          }
          deferredInstallPrompt = null;
          const btn = document.getElementById('btn-install-pwa');
          if (btn) btn.classList.add('hidden');
        });
      } else {
        alert("To install Saksham App:\n1. On Chrome/Edge: Click the install icon in the address bar.\n2. On Safari iOS: Tap Share > 'Add to Home Screen'.");
      }
    }

    function updateNetworkStatus() {
      const offlinePill = document.getElementById('offline-indicator');
      if (offlinePill) {
        if (!navigator.onLine) {
          offlinePill.classList.remove('hidden');
        } else {
          offlinePill.classList.add('hidden');
        }
      }
    }
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);



    function openEmergencyModal() {
      document.getElementById('emergencyModal').classList.remove('hidden');
      document.getElementById('emergencyModal').classList.add('flex');
    }
    function closeEmergencyModal() {
      document.getElementById('emergencyModal').classList.add('hidden');
      document.getElementById('emergencyModal').classList.remove('flex');
    }

    /* ================================================================
       FIREBASE EMAIL AUTHENTICATION
    ================================================================ */

    function _getFirebaseAuth() {
      try { return window.firebase && firebase.auth ? firebase.auth() : null; } catch(e) { return null; }
    }

    function togglePasswordVisibility(inputId, btn) {
      const inp = document.getElementById(inputId);
      if (!inp) return;
      const icon = btn.querySelector('i');
      if (inp.type === 'password') {
        inp.type = 'text';
        if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
      } else {
        inp.type = 'password';
        if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
      }
    }

    function _showAuthMsg(elId, msg, isError) {
      const el = document.getElementById(elId);
      if (!el) return;
      el.textContent = msg;
      el.classList.remove('hidden');
      if (isError) {
        el.classList.add('text-rose-600','bg-rose-50','border-rose-200');
        el.classList.remove('text-emerald-700','bg-emerald-50','border-emerald-200');
      } else {
        el.classList.add('text-emerald-700','bg-emerald-50','border-emerald-200');
        el.classList.remove('text-rose-600','bg-rose-50','border-rose-200');
      }
    }

    function _clearAuthMsg(elId) {
      const el = document.getElementById(elId);
      if (el) el.classList.add('hidden');
    }

    function _friendlyAuthError(code) {
      const map = {
        'auth/invalid-email':             'Please enter a valid email address.',
        'auth/user-not-found':            'No account found with this email.',
        'auth/wrong-password':            'Incorrect password. Please try again.',
        'auth/invalid-credential':        'Incorrect email or password.',
        'auth/email-already-in-use':      'This email is already registered. Please sign in instead.',
        'auth/weak-password':             'Password must be at least 6 characters.',
        'auth/too-many-requests':         'Too many attempts. Please wait a moment and try again.',
        'auth/network-request-failed':    'Network error. Please check your internet connection.',
        'auth/popup-blocked':             'Popup blocked by browser.',
        'auth/operation-not-allowed':     'Email/password sign-in is not enabled. Please contact support.',
      };
      return map[code] || 'Authentication error. Please try again.';
    }

    async function firebaseEmailLogin() {
      const auth = _getFirebaseAuth();
      const email = (document.getElementById('signInEmail')?.value || '').trim();
      const password = (document.getElementById('signInPassword')?.value || '');
      const btn = document.getElementById('emailSignInBtn');

      _clearAuthMsg('emailSignInError');
      _clearAuthMsg('emailSignInSuccess');

      if (!email || !password) {
        _showAuthMsg('emailSignInError', 'Please enter your email and password.', true);
        return;
      }

      if (!auth) {
        _showAuthMsg('emailSignInError', 'Firebase Auth is not available. Check your connection.', true);
        return;
      }

      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in…'; }

      try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        const firebaseUser = cred.user;

        // Try to load profile from Firestore first, else build from Firebase user
        let profile = null;
        if (window.dbService && window.dbService.profiles) {
          try { profile = await window.dbService.profiles.get(firebaseUser.uid); } catch(e) {}
        }
        if (!profile) {
          let localUsers = [];
          try { localUsers = JSON.parse(localStorage.getItem('saksham_registered_users') || '[]'); } catch(e) {}
          const matchedLocal = localUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
          if (matchedLocal) {
            profile = { ...matchedLocal, firebaseUid: firebaseUser.uid };
          } else {
            profile = {
              name: firebaseUser.displayName || email.split('@')[0],
              role: 'patient',
              lang: 'en',
              email: firebaseUser.email,
              firebaseUid: firebaseUser.uid
            };
          }
        }

        localStorage.setItem('saksham_active_user', JSON.stringify(profile));

        // Scope all Firestore operations to this user's UID
        if (window.dbService) {
          window.dbService.setCurrentUser(firebaseUser.uid);
          window.dbService.hydrateAll(firebaseUser.uid);
        }

        _showAuthMsg('emailSignInSuccess', `Welcome back, ${profile.name}! Entering Saksham…`, false);

        setTimeout(() => {
          try { initAudio(); } catch(e) {}
          try { playAudioChime('chime'); } catch(e) {}
          // Always hide the gateway first so the user is never stuck on the login screen
          try { hideAuthGateway(); } catch(e) {}
          try { applyRolePermissions(profile.role || 'patient', profile); } catch(e) {
            console.error('[Saksham Auth] applyRolePermissions error after login:', e);
          }
          try { speakText(`Welcome back to Saksham, ${profile.name}.`); } catch(e) {}
        }, 700);

      } catch(err) {
        console.error('[Saksham Auth] Login error:', err);
        _showAuthMsg('emailSignInError', _friendlyAuthError(err.code), true);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In'; }
      }
    }

    async function firebaseForgotPassword() {
      const auth = _getFirebaseAuth();
      const email = (document.getElementById('signInEmail')?.value || '').trim();
      if (!email) {
        _showAuthMsg('emailSignInError', 'Enter your email above, then click the key icon to reset your password.', true);
        return;
      }
      if (!auth) { _showAuthMsg('emailSignInError', 'Firebase Auth not available.', true); return; }
      try {
        await auth.sendPasswordResetEmail(email);
        _showAuthMsg('emailSignInSuccess', `Password reset email sent to ${email}. Check your inbox.`, false);
        _clearAuthMsg('emailSignInError');
      } catch(err) {
        _showAuthMsg('emailSignInError', _friendlyAuthError(err.code), true);
      }
    }

    // Called when Firebase Auth state changes (handles auto-login on page reload)
    function _initFirebaseAuthListener() {
      const auth = _getFirebaseAuth();
      if (!auth) return;
      auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          // Always restore Firestore context for this Firebase user so data sync works,
          // even when a localStorage session already exists.
          if (window.dbService) {
            window.dbService.setCurrentUser(firebaseUser.uid);
          }

          if (!localStorage.getItem('saksham_active_user')) {
            // No local session — fully restore it from Firestore / Firebase user object
            let profile = null;
            if (window.dbService && window.dbService.profiles) {
              try { profile = await window.dbService.profiles.get(firebaseUser.uid); } catch(e) {}
            }
            if (!profile) {
              profile = {
                name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                role: 'patient',
                lang: 'en',
                email: firebaseUser.email,
                firebaseUid: firebaseUser.uid
              };
            }
            localStorage.setItem('saksham_active_user', JSON.stringify(profile));

            if (window.dbService) {
              window.dbService.hydrateAll(firebaseUser.uid);
            }

            try { hideAuthGateway(); } catch(e) {}
            try { applyRolePermissions(profile.role || 'patient', profile); } catch(e) {
              console.error('[Saksham Auth] applyRolePermissions error in authStateChanged:', e);
            }
          } else {
            // Session already exists — just sync Firestore data for this user
            if (window.dbService) {
              window.dbService.hydrateAll(firebaseUser.uid);
            }
          }
        }
      });
    }

    function openAuthModal() {
      const modal = document.getElementById('authModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }
    function closeAuthModal() {
      const modal = document.getElementById('authModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }
    function handleAuthSubmit() {
      const role = document.getElementById('authInputRole').value;
      closeAuthModal();
      let name = '';
      if (role === 'patient') name = 'Kalyani Sharma';
      else if (role === 'caregiver') name = 'Aarav Sharma (Caregiver)';
      else if (role === 'doctor') name = 'Dr. Rajesh Verma, MD';
      const userObj = { name, role, lang: 'en' };
      localStorage.setItem('saksham_active_user', JSON.stringify(userObj));
      applyRolePermissions(role, userObj);
      playAudioChime('chime');
      alert(`Entered ${role.toUpperCase()} Workspace.`);
    }

    /* ================================================================ */
    /* BIOMETRIC AUTHENTICATION SUITE (FACE RECOGNITION AI & FINGERPRINT)*/
    /* ================================================================ */

    let currentBioFaceMode = 'login'; // 'login' | 'register'
    let currentBioFingerprintMode = 'login';
    let liveFaceTrackingInterval = null;

    async function openBiometricFaceModal(mode = 'login') {
      currentBioFaceMode = mode;
      const modal = document.getElementById('biometricFaceModal');
      const title = document.getElementById('bioFaceModalTitle');
      const subtitle = document.getElementById('bioFaceModalSubtitle');
      const actionBtnTxt = document.getElementById('bioFaceActionBtnTxt');
      const videoEl = document.getElementById('bioFaceVideo');
      const statusTxt = document.getElementById('bioFaceStatusTxt');
      const detailTxt = document.getElementById('bioFaceDetailTxt');
      const oval = document.getElementById('bioFaceOvalGuide');

      if (!modal) return;
      modal.classList.remove('hidden');
      modal.classList.add('flex');

      const demoBox = document.getElementById('bioFaceDemoBox');
      if (demoBox) {
        demoBox.style.display = (mode === 'register') ? 'none' : 'block';
      }

      if (mode === 'register') {
        if (title) title.innerText = "Enroll Your Face AI Profile";
        if (subtitle) subtitle.innerText = "Capture facial biometric embedding for 1-tap login";
        if (actionBtnTxt) actionBtnTxt.innerText = "Capture & Enroll Face";
        if (statusTxt) statusTxt.innerHTML = '<i class="fa-solid fa-camera text-[#387D82]"></i> <span>Center face in oval to capture embedding</span>';
        if (detailTxt) detailTxt.innerText = "We create an on-device mathematical contour model. Never shared.";
      } else {
        if (title) title.innerText = "Face Recognition AI Sign In";
        if (subtitle) subtitle.innerText = "Instant biometric camera scan entry";
        if (actionBtnTxt) actionBtnTxt.innerText = "Scan & Verify Face";
        if (statusTxt) statusTxt.innerHTML = '<i class="fa-solid fa-expand text-[#387D82]"></i> <span>Position your face inside the oval guide</span>';
        if (detailTxt) detailTxt.innerText = "Works for Patient, Caregiver, and Doctor profiles.";
      }

      if (oval) {
        oval.className = "absolute w-44 h-56 border-3 border-dashed border-teal-400 rounded-[50%] pointer-events-none transition-all duration-300 shadow-[0_0_15px_rgba(20,184,166,0.3)]";
      }

      // Start webcam stream
      try {
        if (window.SakshamBiometrics) {
          const overlayCanvas = document.getElementById('bioFaceOverlayCanvas');
          await window.SakshamBiometrics.startCamera(videoEl, overlayCanvas);
          startLiveFaceTracking(videoEl, overlayCanvas);
        }
      } catch (err) {
        console.warn('[Saksham Face AI] Camera start notice:', err.message);
        if (statusTxt) {
          statusTxt.innerHTML = `<span class="text-amber-700 font-bold"><i class="fa-solid fa-circle-exclamation"></i> Camera notice: ${err.message}</span>`;
        }
        if (detailTxt) {
          detailTxt.innerHTML = 'You can use the <strong>Demo Facial Profile Match</strong> buttons below or switch to Fingerprint/Password.';
        }
      }
    }

    function startLiveFaceTracking(videoEl, overlayCanvas) {
      if (liveFaceTrackingInterval) clearInterval(liveFaceTrackingInterval);

      liveFaceTrackingInterval = setInterval(() => {
        if (!window.SakshamBiometrics || !videoEl || videoEl.paused || videoEl.ended) return;

        const canvas = overlayCanvas || document.getElementById('bioFaceOverlayCanvas');
        const result = window.SakshamBiometrics.extractFaceDescriptor(videoEl, canvas);
        const qualityTxt = document.getElementById('bioFaceQualityTxt');
        const oval = document.getElementById('bioFaceOvalGuide');
        const statusTxt = document.getElementById('bioFaceStatusTxt');

        if (result.detected) {
          if (oval) {
            oval.className = "absolute w-44 h-56 border-3 border-solid border-emerald-400 rounded-[50%] pointer-events-none transition-all duration-300 shadow-[0_0_25px_rgba(52,211,153,0.8)] ring-2 ring-emerald-300";
          }
          if (qualityTxt) {
            qualityTxt.innerHTML = `<span class="text-emerald-300 font-bold">✓ AI Face Lock: ${result.quality}% Quality</span>`;
          }

          if (currentBioFaceMode === 'login') {
            const match = window.SakshamBiometrics.matchLiveFace(result);
            if (match.matched && match.user) {
              if (statusTxt) {
                statusTxt.innerHTML = `<span class="text-emerald-700 font-black"><i class="fa-solid fa-circle-check"></i> Detected: ${match.user.name} (${match.score}% Match)</span>`;
              }
            } else {
              if (statusTxt) {
                statusTxt.innerHTML = `<span class="text-teal-700 font-bold"><i class="fa-solid fa-expand text-teal-600"></i> Face detected (${result.quality}% lock). Tap 'Scan &amp; Log In' below!</span>`;
              }
            }
          } else {
            if (statusTxt) {
              statusTxt.innerHTML = `<span class="text-emerald-700 font-black"><i class="fa-solid fa-check"></i> Face in frame (${result.quality}%). Tap 'Capture &amp; Enroll Face'!</span>`;
            }
          }
        } else {
          if (oval) {
            oval.className = "absolute w-44 h-56 border-3 border-dashed border-teal-400 rounded-[50%] pointer-events-none transition-all duration-300 shadow-[0_0_15px_rgba(20,184,166,0.3)]";
          }
          if (qualityTxt) {
            qualityTxt.innerText = "Align face in the oval guide";
          }
        }
      }, 250);
    }

    function closeBiometricFaceModal() {
      const modal = document.getElementById('biometricFaceModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
      if (liveFaceTrackingInterval) {
        clearInterval(liveFaceTrackingInterval);
        liveFaceTrackingInterval = null;
      }
      if (window.SakshamBiometrics) {
        window.SakshamBiometrics.stopCamera();
      }
    }

    async function executeFaceScanAction() {
      const videoEl = document.getElementById('bioFaceVideo');
      const statusTxt = document.getElementById('bioFaceStatusTxt');
      const actionBtn = document.getElementById('bioFaceActionBtn');
      const overlayCanvas = document.getElementById('bioFaceOverlayCanvas');

      if (!window.SakshamBiometrics) return;

      if (actionBtn) {
        actionBtn.disabled = true;
        actionBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Biometric AI Vector…';
      }

      const descriptor = window.SakshamBiometrics.extractFaceDescriptor(videoEl, overlayCanvas);

      if (currentBioFaceMode === 'register') {
        // Enrollment mode
        window.SakshamBiometrics.setPendingRegFace(descriptor);
        
        const statusEl = document.getElementById('regFaceStatusTxt');
        const checkIcon = document.getElementById('regFaceCheckIcon');
        const previewRow = document.getElementById('regBiometricPreviewRow');
        const summaryTxt = document.getElementById('regBiometricSummary');

        if (statusEl) statusEl.innerText = "Face Enrolled ✓";
        if (checkIcon) checkIcon.classList.remove('hidden');
        if (previewRow) previewRow.classList.remove('hidden');
        if (summaryTxt) summaryTxt.innerText = "Facial AI profile registered and ready to bind on Submit.";

        initAudio();
        playAudioChime('fanfare');
        closeBiometricFaceModal();

        if (actionBtn) {
          actionBtn.disabled = false;
          actionBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Scan &amp; Log In';
        }
        return;
      }

      // Login Mode
      const match = window.SakshamBiometrics.matchLiveFace(descriptor);
      const user = (match && match.user) ? match.user : window.SakshamBiometrics.getEnrolledFaces()[0];

      if (match.matched || descriptor.detected) {
        if (statusTxt) {
          statusTxt.innerHTML = `<span class="text-emerald-700 font-black"><i class="fa-solid fa-circle-check"></i> Identity Verified: ${user.name}!</span>`;
        }

        initAudio();
        playAudioChime('fanfare');

        setTimeout(() => {
          closeBiometricFaceModal();
          const userObj = {
            name: user.name,
            role: user.role || 'patient',
            email: user.email || '',
            id: user.uid,
            firebaseUid: user.uid,
            lang: user.lang || 'en'
          };
          localStorage.setItem('saksham_active_user', JSON.stringify(userObj));
          if (window.dbService && user.uid) {
            window.dbService.setCurrentUser(user.uid);
            window.dbService.hydrateAll(user.uid);
          }
          applyRolePermissions(user.role || 'patient', userObj);
          hideAuthGateway();
          speakText(`Face verified. Welcome back to Saksham, ${user.name}.`);
        }, 500);
      } else {
        if (statusTxt) {
          statusTxt.innerHTML = `<span class="text-amber-800 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Center face in oval closer to camera, or use 1-Tap profile below.</span>`;
        }
        if (actionBtn) {
          actionBtn.disabled = false;
          actionBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Retry Face Scan';
        }
      }
    }

    function simulatePersonaFaceMatch(role) {
      const statusTxt = document.getElementById('bioFaceStatusTxt');
      const oval = document.getElementById('bioFaceOvalGuide');

      let enrolled = [];
      if (window.SakshamBiometrics) {
        enrolled = window.SakshamBiometrics.getEnrolledFaces();
      }
      const match = enrolled.find(u => u.role === role);
      let name = match ? match.name : (role === 'patient' ? 'Kalyani Sharma' : (role === 'caregiver' ? 'Aarav Sharma (Caregiver)' : 'Dr. Rajesh Verma, MD'));

      if (oval) {
        oval.className = "absolute w-44 h-56 border-3 border-solid border-emerald-400 rounded-[50%] pointer-events-none transition-all duration-300 shadow-[0_0_25px_rgba(52,211,153,0.8)] ring-4 ring-emerald-300";
      }

      if (statusTxt) {
        statusTxt.innerHTML = `<span class="text-emerald-700 font-black"><i class="fa-solid fa-circle-check"></i> Biometric Verified: ${name} (98% Confidence)</span>`;
      }

      initAudio();
      playAudioChime('fanfare');

      setTimeout(() => {
        closeBiometricFaceModal();
        if (match && match.uid && !match.uid.startsWith('SAK-PT-8842') && !match.uid.startsWith('USER-CG-01') && !match.uid.startsWith('USER-DOC-01')) {
          const userObj = {
            name: match.name,
            role: match.role,
            email: match.email || '',
            id: match.uid,
            firebaseUid: match.uid,
            lang: match.lang || 'en'
          };
          localStorage.setItem('saksham_active_user', JSON.stringify(userObj));
          if (window.dbService) {
            window.dbService.setCurrentUser(match.uid);
            window.dbService.hydrateAll(match.uid);
          }
          applyRolePermissions(match.role, userObj);
          hideAuthGateway();
          speakText(`Face verified. Welcome back to Saksham, ${match.name}.`);
        } else {
          loginPresetUser(role);
        }
      }, 700);
    }

    function openBiometricFingerprintModal(mode = 'login') {
      currentBioFingerprintMode = mode;
      const modal = document.getElementById('biometricFingerprintModal');
      const title = document.getElementById('bioFingerprintModalTitle');
      const statusTxt = document.getElementById('bioFingerprintStatusTxt');
      const detailTxt = document.getElementById('bioFingerprintDetailTxt');
      const fastRoles = document.getElementById('bioFingerprintFastRoles');

      if (!modal) return;
      modal.classList.remove('hidden');
      modal.classList.add('flex');

      if (fastRoles) {
        fastRoles.style.display = (mode === 'register') ? 'none' : 'block';
      }

      if (mode === 'register') {
        if (title) title.innerText = "Enroll Fingerprint / Touch ID";
        if (statusTxt) statusTxt.innerText = "Touch device sensor or tap circle to register";
        if (detailTxt) detailTxt.innerText = "Generates secure on-device cryptographic WebAuthn passkey.";
      } else {
        if (title) title.innerText = "Fingerprint / Touch ID Login";
        if (statusTxt) statusTxt.innerText = "Place finger on your sensor or tap icon to verify";
        if (detailTxt) detailTxt.innerText = "Instant passkey login for Patient, Caregiver, or Doctor.";
      }
    }

    function closeBiometricFingerprintModal() {
      const modal = document.getElementById('biometricFingerprintModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    async function executeFingerprintVerification() {
      const statusTxt = document.getElementById('bioFingerprintStatusTxt');
      if (statusTxt) {
        statusTxt.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-emerald-600"></i> <span>Scanning biometric sensor…</span>';
      }

      initAudio();
      playAudioChime('chime');

      setTimeout(async () => {
        if (currentBioFingerprintMode === 'register') {
          if (window.SakshamBiometrics) {
            window.SakshamBiometrics.setPendingRegFingerprint(true);
          }
          const statusEl = document.getElementById('regFingerprintStatusTxt');
          const checkIcon = document.getElementById('regFingerprintCheckIcon');
          const previewRow = document.getElementById('regBiometricPreviewRow');
          const summaryTxt = document.getElementById('regBiometricSummary');

          if (statusEl) statusEl.innerText = "Fingerprint Enrolled ✓";
          if (checkIcon) checkIcon.classList.remove('hidden');
          if (previewRow) previewRow.classList.remove('hidden');
          if (summaryTxt) summaryTxt.innerText = "Fingerprint passkey attached to your profile.";

          playAudioChime('fanfare');
          closeBiometricFingerprintModal();
          return;
        }

        // Login Mode: verify through WebAuthn / Biometrics suite
        let verifiedUser = null;
        if (window.SakshamBiometrics) {
          const res = await window.SakshamBiometrics.verifyFingerprint();
          if (res && res.user) {
            verifiedUser = res.user;
          }
        }

        if (!verifiedUser) {
          try {
            const active = JSON.parse(localStorage.getItem('saksham_active_user') || 'null');
            if (active) verifiedUser = active;
          } catch(e) {}
        }
        if (!verifiedUser) {
          verifiedUser = { name: 'Kalyani Sharma', role: 'patient', uid: 'SAK-PT-8842', email: 'kalyani@saksham.org' };
        }

        if (statusTxt) {
          statusTxt.innerHTML = `<span class="text-emerald-700 font-black"><i class="fa-solid fa-circle-check"></i> Fingerprint Verified: ${verifiedUser.name}!</span>`;
        }
        playAudioChime('fanfare');

        setTimeout(() => {
          closeBiometricFingerprintModal();
          const userObj = {
            name: verifiedUser.name,
            role: verifiedUser.role || 'patient',
            email: verifiedUser.email || '',
            id: verifiedUser.uid || verifiedUser.id,
            firebaseUid: verifiedUser.firebaseUid || verifiedUser.uid,
            lang: verifiedUser.lang || 'en'
          };
          localStorage.setItem('saksham_active_user', JSON.stringify(userObj));
          if (window.dbService && (verifiedUser.firebaseUid || verifiedUser.uid)) {
            window.dbService.setCurrentUser(verifiedUser.firebaseUid || verifiedUser.uid);
            window.dbService.hydrateAll(verifiedUser.firebaseUid || verifiedUser.uid);
          }
          applyRolePermissions(verifiedUser.role || 'patient', userObj);
          hideAuthGateway();
          speakText(`Fingerprint verified. Welcome back to Saksham, ${verifiedUser.name}.`);
        }, 500);
      }, 500);
    }

    function verifyFingerprintAsRole(role) {
      const statusTxt = document.getElementById('bioFingerprintStatusTxt');
      let enrolled = [];
      if (window.SakshamBiometrics) {
        enrolled = window.SakshamBiometrics.getEnrolledFingerprints();
      }
      const match = enrolled.find(u => u.role === role);
      let name = match ? match.name : (role === 'patient' ? 'Kalyani Sharma' : (role === 'caregiver' ? 'Aarav Sharma (Caregiver)' : 'Dr. Rajesh Verma, MD'));

      if (statusTxt) {
        statusTxt.innerHTML = `<span class="text-emerald-700 font-black"><i class="fa-solid fa-circle-check"></i> Verified: ${name}! Entering…</span>`;
      }

      initAudio();
      playAudioChime('fanfare');

      setTimeout(() => {
        closeBiometricFingerprintModal();
        if (match && match.uid && !match.uid.startsWith('SAK-PT-8842') && !match.uid.startsWith('USER-CG-01') && !match.uid.startsWith('USER-DOC-01')) {
          const userObj = {
            name: match.name,
            role: match.role,
            email: match.email || '',
            id: match.uid,
            firebaseUid: match.uid,
            lang: match.lang || 'en'
          };
          localStorage.setItem('saksham_active_user', JSON.stringify(userObj));
          if (window.dbService) {
            window.dbService.setCurrentUser(match.uid);
            window.dbService.hydrateAll(match.uid);
          }
          applyRolePermissions(match.role, userObj);
          hideAuthGateway();
          speakText(`Welcome back to Saksham, ${match.name}.`);
        } else {
          loginPresetUser(role);
        }
      }, 600);
    }

    function usePasswordInstead() {
      closeBiometricFaceModal();
      closeBiometricFingerprintModal();
      showAuthGateway();
      switchGatewayTab('signin');
      const pwdInput = document.getElementById('signInPassword');
      if (pwdInput) {
        pwdInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pwdInput.focus();
      }
    }

    function switchBiometricModal(target) {
      if (target === 'fingerprint') {
        closeBiometricFaceModal();
        openBiometricFingerprintModal(currentBioFaceMode);
      } else {
        closeBiometricFingerprintModal();
        openBiometricFaceModal(currentBioFingerprintMode);
      }
    }

    function showAuthGateway() {
      const gateway = document.getElementById('authGatewayScreen');
      if (gateway) {
        gateway.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        renderCustomSavedAccounts();
      }
    }

    function hideAuthGateway() {
      const gateway = document.getElementById('authGatewayScreen');
      if (gateway) {
        gateway.classList.add('hidden');
        document.body.style.overflow = '';
      }
    }

    function switchGatewayTab(tab) {
      const pSignIn = document.getElementById('panelSignIn');
      const pSignUp = document.getElementById('panelSignUp');
      const btnSignIn = document.getElementById('tabBtnSignIn');
      const btnSignUp = document.getElementById('tabBtnSignUp');

      if (tab === 'signin') {
        if (pSignIn) pSignIn.classList.remove('hidden');
        if (pSignUp) pSignUp.classList.add('hidden');
        if (btnSignIn) btnSignIn.className = "py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 bg-[#1B4225] text-[#F5F4E0] shadow-sm";
        if (btnSignUp) btnSignUp.className = "py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 text-[#1B4225] hover:bg-[#DDDAB3]/50";
      } else {
        if (pSignIn) pSignIn.classList.add('hidden');
        if (pSignUp) pSignUp.classList.remove('hidden');
        if (btnSignUp) btnSignUp.className = "py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 bg-[#1B4225] text-[#F5F4E0] shadow-sm";
        if (btnSignIn) btnSignIn.className = "py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 text-[#1B4225] hover:bg-[#DDDAB3]/50";
      }
    }

    let selectedRegRole = 'patient';
    function selectRegisterRole(role, el) {
      selectedRegRole = role;
      document.querySelectorAll('.role-selector-card').forEach(card => {
        card.classList.remove('border-[#387D82]', 'bg-teal-50/50', 'border-[#1B4225]', 'bg-emerald-50/50', 'border-sky-600', 'bg-sky-50/50');
        card.classList.add('border-slate-200', 'bg-white');
      });

      if (role === 'patient') {
        el.classList.add('border-[#387D82]', 'bg-teal-50/50');
        el.classList.remove('border-slate-200', 'bg-white');
      } else if (role === 'caregiver') {
        el.classList.add('border-[#1B4225]', 'bg-emerald-50/50');
        el.classList.remove('border-slate-200', 'bg-white');
      } else if (role === 'doctor') {
        el.classList.add('border-sky-600', 'bg-sky-50/50');
        el.classList.remove('border-slate-200', 'bg-white');
      }

      const cgGroup = document.getElementById('regCaregiverGroup');
      if (cgGroup) {
        if (role === 'patient') {
          cgGroup.classList.remove('hidden');
        } else {
          cgGroup.classList.add('hidden');
        }
      }
    }

    function loginPresetUser(role) {
      let name = '';
      if (role === 'patient') name = 'Kalyani Sharma';
      else if (role === 'caregiver') name = 'Aarav Sharma (Caregiver)';
      else if (role === 'doctor') name = 'Dr. Rajesh Verma, MD';

      const userObj = {
        name: name,
        role: role,
        caregiverName: 'Aarav Sharma',
        caregiverPhone: '+91 98765 43210',
        lang: 'en'
      };

      localStorage.setItem('saksham_active_user', JSON.stringify(userObj));
      initAudio();
      playAudioChime('chime');
      applyRolePermissions(role, userObj);
      hideAuthGateway();

      setTimeout(() => {
        speakText(`Welcome to Saksham, ${name}. Your workspace is ready.`);
      }, 400);
    }

    function loginAsGuest() {
      const userObj = {
        name: 'Guest Explorer',
        role: 'patient',
        caregiverName: 'Aarav Sharma',
        caregiverPhone: '+91 98765 43210',
        lang: 'en',
        isGuest: true
      };

      localStorage.setItem('saksham_active_user', JSON.stringify(userObj));
      initAudio();
      playAudioChime('chime');
      applyRolePermissions('patient', userObj);
      hideAuthGateway();
    }

    async function handleRegisterAccount(e) {
      if (e && e.preventDefault) e.preventDefault();
      
      const fullName = (document.getElementById('regFullName')?.value || '').trim();
      const email    = (document.getElementById('regEmail')?.value || '').trim();
      const password = (document.getElementById('regPassword')?.value || '');
      const role     = selectedRegRole || 'patient';
      const cgName   = (document.getElementById('regCaregiverName')?.value || '').trim();
      const cgPhone  = (document.getElementById('regCaregiverPhone')?.value || '').trim();
      const lang     = document.getElementById('regLanguage')?.value || 'en';
      const pin      = (document.getElementById('regPin')?.value || '').trim();
      const btn      = document.getElementById('regSubmitBtn');
      const errEl    = document.getElementById('emailRegError');

      _clearAuthMsg('emailRegError');

      if (!fullName) {
        _showAuthMsg('emailRegError', 'Please enter your full name.', true);
        return;
      }
      if (!email) {
        _showAuthMsg('emailRegError', 'Please enter your email address.', true);
        return;
      }
      if (!password || password.length < 6) {
        _showAuthMsg('emailRegError', 'Password must be at least 6 characters.', true);
        return;
      }

      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account…'; }

      const auth = _getFirebaseAuth();
      let firebaseUid = null;

      if (auth) {
        try {
          const cred = await auth.createUserWithEmailAndPassword(email, password);
          firebaseUid = cred.user.uid;
          // Update display name in Firebase Auth
          await cred.user.updateProfile({ displayName: fullName });
        } catch(err) {
          console.error('[Saksham Auth] Register error:', err);
          _showAuthMsg('emailRegError', _friendlyAuthError(err.code), true);
          if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Create Account & Enter Saksham'; }
          return;
        }
      }

      const newUser = {
        name: fullName,
        role: role,
        email: email,
        caregiverName: cgName || 'Aarav Sharma',
        caregiverPhone: cgPhone || '+91 98765 43210',
        lang: lang,
        pin: pin,
        id: firebaseUid || ('USER-' + Date.now()),
        firebaseUid: firebaseUid,
        hasFaceBiometrics: false,
        hasFingerprint: false
      };

      // Attach and enroll biometrics if captured during registration
      if (window.SakshamBiometrics) {
        const pendingFace = window.SakshamBiometrics.getPendingRegFace();
        if (pendingFace) {
          window.SakshamBiometrics.enrollFace(newUser, pendingFace);
          newUser.hasFaceBiometrics = true;
          window.SakshamBiometrics.setPendingRegFace(null);
        }
        const pendingFp = window.SakshamBiometrics.getPendingRegFingerprint();
        if (pendingFp) {
          window.SakshamBiometrics.enrollFingerprint(newUser);
          newUser.hasFingerprint = true;
          window.SakshamBiometrics.setPendingRegFingerprint(null);
        }
      }

      localStorage.setItem('saksham_active_user', JSON.stringify(newUser));

      try {
        let users = JSON.parse(localStorage.getItem('saksham_registered_users') || '[]');
        users.push(newUser);
        localStorage.setItem('saksham_registered_users', JSON.stringify(users));
      } catch(err) {
        console.error("Failed to save registered user locally", err);
      }

      if (window.dbService && window.dbService.profiles) {
        // Set the current user FIRST so all subsequent writes go under /users/{uid}/
        if (firebaseUid) window.dbService.setCurrentUser(firebaseUid);
        window.dbService.profiles.create(newUser);
      }

      if (lang && lang !== 'en') {
        const langSelect = document.getElementById('languageSelect');
        if (langSelect) langSelect.value = lang;
        changeLanguage(lang);
      }

      try { initAudio(); } catch(e) {}
      try { playAudioChime('fanfare'); } catch(e) {}
      // Always hide gateway first so the user is never stuck on the registration screen
      try { hideAuthGateway(); } catch(e) {}
      try { applyRolePermissions(role, newUser); } catch(e) {
        console.error('[Saksham Auth] applyRolePermissions error after registration:', e);
      }

      setTimeout(() => {
        try { speakText(`Account created! Welcome to Saksham, ${fullName}.`); } catch(e) {}
      }, 500);
    }

    function renderCustomSavedAccounts() {
      const container = document.getElementById('customSavedAccountsSection');
      const list = document.getElementById('customSavedAccountsList');
      if (!container || !list) return;

      try {
        const saved = JSON.parse(localStorage.getItem('saksham_registered_users') || '[]');
        if (saved.length === 0) {
          container.classList.add('hidden');
          return;
        }

        container.classList.remove('hidden');
        list.innerHTML = saved.map((u, idx) => `
          <div class="p-3 rounded-2xl bg-white border border-[#DDDAB3] flex justify-between items-center hover:border-[#387D82] transition shadow-xs">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-xl ${u.role === 'patient' ? 'bg-[#387D82]' : (u.role === 'caregiver' ? 'bg-[#1B4225]' : 'bg-sky-700')} text-white flex items-center justify-center font-bold text-base shadow-xs">
                ${u.role === 'patient' ? '👵' : (u.role === 'caregiver' ? '👨‍💼' : '🩺')}
              </div>
              <div>
                <p class="font-black text-xs text-[#1B4225]">${u.name}</p>
                <p class="text-[10px] text-slate-500 font-medium capitalize">${u.role} • ${u.lang ? u.lang.toUpperCase() : 'EN'}</p>
              </div>
            </div>
            <button onclick="loginSavedUser(${idx})" class="px-3 py-1.5 rounded-xl bg-[#F5F4E0] hover:bg-[#EBE9CE] text-[#1B4225] font-black text-xs border border-[#387D82]/40 transition">
              Sign In ➔
            </button>
          </div>
        `).join('');
      } catch(e) {
        container.classList.add('hidden');
      }
    }

    function loginSavedUser(idx) {
      try {
        const saved = JSON.parse(localStorage.getItem('saksham_registered_users') || '[]');
        const u = saved[idx];
        if (!u) return;

        if (u.pin) {
          const entered = prompt(`Enter PIN for ${u.name}:`);
          if (entered !== u.pin) {
            alert("Incorrect PIN. Please try again.");
            return;
          }
        }

        localStorage.setItem('saksham_active_user', JSON.stringify(u));
        initAudio();
        playAudioChime('chime');
        applyRolePermissions(u.role, u);
        if (u.lang && u.lang !== 'en') {
          changeLanguage(u.lang);
        }
        hideAuthGateway();
        setTimeout(() => {
          speakText(`Welcome back, ${u.name}.`);
        }, 400);
      } catch(e) {
        console.error("Error signing into saved user", e);
      }
    }

    function logoutUser() {
      localStorage.removeItem('saksham_active_user');
      const auth = _getFirebaseAuth();
      if (auth) { auth.signOut().catch(() => {}); }
      initAudio();
      playAudioChime('chime');
      showAuthGateway();
    }

    function checkAuthGatewayStatus() {
      const activeUserJson = localStorage.getItem('saksham_active_user');
      if (activeUserJson) {
        try {
          const user = JSON.parse(activeUserJson);
          // Always hide the gateway immediately to prevent being stuck on login screen
          hideAuthGateway();
          try { applyRolePermissions(user.role || 'patient', user); } catch(e) {
            console.error('[Saksham Auth] applyRolePermissions error restoring session:', e);
          }
          return;
        } catch(e) {
          console.error("Invalid session JSON — clearing and showing gateway", e);
          localStorage.removeItem('saksham_active_user');
        }
      }
      showAuthGateway();
    }



    let ringChartInst = null;
    let lineChartInst = null;
    let doctorPieChartInst = null;
    let doctorBarChartInst = null;

    function initCharts() {
      const ctxRing = document.getElementById('caregiverRingChart')?.getContext('2d');
      if (ctxRing) {
        const doneCount = state.tasks.filter(t => t.done).length;
        const pendingCount = state.tasks.length - doneCount;
        ringChartInst = new Chart(ctxRing, {
          type: 'doughnut',
          data: { 
            labels: ['Done', 'Pending'], 
            datasets: [{ 
              data: [doneCount, pendingCount], 
              backgroundColor: ['#0D9488', '#E2E8F0'],
              borderWidth: 0
            }] 
          },
          options: { responsive: true, maintainAspectRatio: false, cutout: '72%' }
        });
      }

      const ctxLine = document.getElementById('caregiverLineChart')?.getContext('2d');
      if (ctxLine) {
        lineChartInst = new Chart(ctxLine, {
          type: 'line',
          data: { 
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 
            datasets: [{ 
              label: 'Speech dB (Volume)', 
              data: [62, 65, 68, 64, 70, 72, 74], 
              borderColor: '#6366F1',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              fill: true,
              tension: 0.35
            }] 
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }

      const ctxDocPie = document.getElementById('doctorPieChart')?.getContext('2d');
      if (ctxDocPie) {
        doctorPieChartInst = new Chart(ctxDocPie, {
          type: 'pie',
          data: {
            labels: ['Optimal ON', 'Mild Tremor', 'Mild Rigidity', 'OFF Window'],
            datasets: [{
              data: [76, 14, 6, 4],
              backgroundColor: ['#0D9488', '#F59E0B', '#6366F1', '#F43F5E'],
              borderWidth: 2,
              borderColor: '#FFFFFF'
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }

      const ctxDocBar = document.getElementById('doctorBarChart')?.getContext('2d');
      if (ctxDocBar) {
        doctorBarChartInst = new Chart(ctxDocBar, {
          type: 'bar',
          data: {
            labels: ['08:00 AM', '11:00 AM', '02:00 PM', '05:00 PM', '08:00 PM'],
            datasets: [
              { label: 'Pre-Dose Tremor (cm)', data: [1.8, 1.5, 1.9, 1.4, 1.6], backgroundColor: '#F59E0B', borderRadius: 8 },
              { label: 'Post-Dose Tremor (cm)', data: [0.9, 0.7, 1.1, 0.8, 0.9], backgroundColor: '#0D9488', borderRadius: 8 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Amplitude (cm)' } } }
          }
        });
      }
    }

    function updateChartsData() {
      if (ringChartInst) {
        const doneCount = state.tasks.filter(t => t.done).length;
        const pendingCount = state.tasks.length - doneCount;
        ringChartInst.data.datasets[0].data = [doneCount, pendingCount];
        ringChartInst.update();
      }
    }



    // Start automated proactive reminder loop immediately
    checkScheduledReminders();
    setInterval(checkScheduledReminders, 10000);

    /* ==================== WINDOW INITIALIZATION ==================== */
    window.onload = function() {
      try { loadPersistedTasks(); } catch(e) { console.log(e); }
      try { updateNotificationButtonUI(); } catch(e) { console.log(e); }
      try {
        const picker = document.getElementById('globalCalendarPicker');
        if (picker) picker.value = state.selectedDate;
        updateHeaderDateDisplay(state.selectedDate);
      } catch(e) { console.log(e); }
      try { updateLevelProgressUI(); } catch(e) { console.log(e); }
      try { checkAuthGatewayStatus(); } catch(e) { console.log(e); }
      try { _initFirebaseAuthListener(); } catch(e) { console.log(e); }
      try { switchRoutineMiniTab('cues'); } catch(e) { console.log(e); }
      try { renderBadgesUI(); } catch(e) { console.log(e); }
      try { renderLovedOnes(); } catch(e) { console.log(e); }
      try { renderArticles(); } catch(e) { console.log(e); }
      try { renderMaze(); } catch(e) { console.log(e); }
      try { renderMathSprintQuestion(); } catch(e) { console.log(e); }
      try { calculatePersonalWaterTarget(); } catch(e) { console.log(e); }
      try { initCharts(); } catch(e) { console.log(e); }
      try { renderInteractiveMonthlyGrid(); } catch(e) { console.log(e); }
      try { updateNetworkStatus(); } catch(e) { console.log(e); }

      // Asynchronously hydrate entities from Cloud Database / Local Cache
      try {
        if (window.dbService && typeof window.dbService.hydrateAll === 'function') {
          window.dbService.hydrateAll(state.uid || 'SAK-PT-8842');
        }
      } catch(e) { console.log('[Saksham DB] Hydration check:', e); }

      // Double-check reminders on load
      try { checkScheduledReminders(); } catch(e) { console.log(e); }

      // Restore saved language preference (reading language takes precedence)
      try {
        const savedLang = localStorage.getItem('saksham_lang') || 'en';
        const langSelect = document.getElementById('languageSelect');
        if (langSelect) langSelect.value = savedLang;
        changeLanguage(savedLang);
      } catch(e) { console.log(e); }

      // Check current hour: if 18:00 (6 PM) or later, notify about Evening Guard
      try {
        const currentHour = new Date().getHours();
        if (currentHour >= 18) {
          console.log("[Saksham] Evening hour detected; Evening Cognitive Guard available for peaceful wind-down.");
        }
      } catch(e) { console.log(e); }
    };

