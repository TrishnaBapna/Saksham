/* ======================================================================= */
/* SAKSHAM APPLICATION BOOTSTRAP, AUTH GATEWAY & LIFECYCLE CONTROLLER     */
/* ======================================================================= */

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js?v=60')
          .then(reg => {
            console.log('[Saksham PWA] Service Worker registered:', reg.scope);
            try { reg.update(); } catch(e) {}
            const syncFn = window.syncUpcomingAlarmsWithServiceWorker || (typeof syncUpcomingAlarmsWithServiceWorker === 'function' ? syncUpcomingAlarmsWithServiceWorker : null);
            if (typeof syncFn === 'function') {
              try { syncFn(); } catch (e) { console.warn('[Saksham SW Sync Note]', e); }
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
      const modal = document.getElementById('emergencyModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';
      }
      if (typeof window.lockScroll === 'function') window.lockScroll();
    }
    function activateEmergencySos() {
      openEmergencyModal();
      if (window.SakshamSafePath && typeof window.SakshamSafePath.triggerSafePathSos === 'function') {
        window.SakshamSafePath.triggerSafePathSos("Emergency Header Modal");
      }
    }
    function closeEmergencyModal() {
      const modal = document.getElementById('emergencyModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
      }
      if (typeof window.forceUnlockScroll === 'function') window.forceUnlockScroll();
    }
    window.openEmergencyModal = openEmergencyModal;
    window.closeEmergencyModal = closeEmergencyModal;

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

        // Scope all Firestore operations to this user's UID
        if (window.dbService) {
          window.dbService.setCurrentUser(firebaseUser.uid);
          await window.dbService.resolveWorkspace(profile);
          profile.patientWorkspaceUid = window.dbService.getStatus().workspaceUid;
          window.dbService.hydrateAll();
        }
        localStorage.setItem('saksham_active_user', JSON.stringify(profile));

        _showAuthMsg('emailSignInSuccess', `Welcome back, ${profile.name}! Entering Saksham…`, false);

        setTimeout(() => {
          try { initAudio(); } catch(e) {}
          try { playAudioChime('chime'); } catch(e) {}
          // Always hide the gateway first so the user is never stuck on the login screen
          try { hideAuthGateway(); } catch(e) {}
          try { applyRolePermissions(profile.role || 'patient', profile); } catch(e) {
            console.error('[Saksham Auth] applyRolePermissions error after login:', e);
          }
          // The onboarding should happen only for a new/incomplete patient account, not every time the patient logs in
          if (profile.role === 'patient' && profile.onboardingCompleted === false) {
            setTimeout(() => { if (window.openPatientOnboarding) window.openPatientOnboarding(false); }, 300);
          } else if (profile.condition && window.SakshamOnboarding) {
            window.SakshamOnboarding.applyDiseaseModules(profile.condition);
          }
          try { speakText(`Welcome back to Saksham, ${profile.name}.`); } catch(e) {}
        }, 700);

      } catch(err) {
        console.error('[Saksham Auth] Login error:', err);
        _showAuthMsg('emailSignInError', _friendlyAuthError(err.code), true);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In'; }
      }
    }

    async function firebaseGoogleLogin() {
      const auth = _getFirebaseAuth();
      const btn = document.getElementById('googleSignInBtn');
      _clearAuthMsg('emailSignInError');
      _clearAuthMsg('emailSignInSuccess');

      if (!auth || !firebase.auth.GoogleAuthProvider) {
        _showAuthMsg('emailSignInError', 'Google sign-in is unavailable. Check Firebase Auth setup.', true);
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting to Google…';
      }
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const credential = await auth.signInWithPopup(provider);
        const firebaseUser = credential.user;
        const email = firebaseUser.email || '';
        let storedProfile = null;
        if (window.dbService && window.dbService.profiles) {
          try { storedProfile = await window.dbService.profiles.get(firebaseUser.uid); } catch(e) {}
        }
        let localUsers = [];
        try { localUsers = JSON.parse(localStorage.getItem('saksham_registered_users') || '[]'); } catch(e) {}
        const matchedLocal = localUsers.find(user => user.email && user.email.toLowerCase() === email.toLowerCase());
        let profile = { ...(matchedLocal || {}), ...(storedProfile || {}) };
        const isNewProfile = !profile.name && !profile.role;
        profile = {
          ...profile,
          name: profile.name || firebaseUser.displayName || email.split('@')[0] || 'Saksham User',
          role: profile.role || 'patient',
          lang: profile.lang || 'en',
          email: profile.email || email,
          firebaseUid: firebaseUser.uid,
          onboardingCompleted: profile.onboardingCompleted ?? !isNewProfile
        };

        if (window.dbService) {
          window.dbService.setCurrentUser(firebaseUser.uid);
          await window.dbService.resolveWorkspace(profile);
          profile.patientWorkspaceUid = window.dbService.getStatus().workspaceUid;
          if (window.dbService.profiles && window.dbService.profiles.update) {
            await window.dbService.profiles.update(firebaseUser.uid, profile);
          }
          window.dbService.hydrateAll();
        }
        localStorage.setItem('saksham_active_user', JSON.stringify(profile));

        _showAuthMsg('emailSignInSuccess', `Welcome back, ${profile.name}! Entering Saksham…`, false);
        setTimeout(() => {
          try { initAudio(); } catch(e) {}
          try { playAudioChime('chime'); } catch(e) {}
          try { hideAuthGateway(); } catch(e) {}
          try { applyRolePermissions(profile.role || 'patient', profile); } catch(e) {
            console.error('[Saksham Auth] applyRolePermissions error after Google login:', e);
          }
          if (profile.role === 'patient' && profile.onboardingCompleted === false) {
            setTimeout(() => { if (window.openPatientOnboarding) window.openPatientOnboarding(false); }, 300);
          } else if (profile.condition && window.SakshamOnboarding) {
            window.SakshamOnboarding.applyDiseaseModules(profile.condition);
          }
          try { speakText(`Welcome back to Saksham, ${profile.name}.`); } catch(e) {}
        }, 700);
      } catch(error) {
        const message = error.code === 'auth/operation-not-allowed'
          ? 'Google sign-in is not enabled for this Firebase project.'
          : error.code === 'auth/unauthorized-domain'
            ? 'This domain is not authorized for Google sign-in in Firebase.'
            : error.code === 'auth/popup-closed-by-user'
              ? 'Google sign-in was canceled.'
              : _friendlyAuthError(error.code);
        _showAuthMsg('emailSignInError', message, true);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-brands fa-google text-sm text-[#4285F4]"></i> Continue with Google';
        }
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
        if (isRegisteringAccount) {
          // Account registration in progress; handleRegisterAccount will manage session and onboarding
          return;
        }
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
            if (window.dbService && window.dbService.resolveWorkspace) {
              await window.dbService.resolveWorkspace(profile);
              profile.patientWorkspaceUid = window.dbService.getStatus().workspaceUid;
            }
            localStorage.setItem('saksham_active_user', JSON.stringify(profile));

            if (window.dbService) {
              window.dbService.hydrateAll();
            }

            try { hideAuthGateway(); } catch(e) {}
            try { applyRolePermissions(profile.role || 'patient', profile); } catch(e) {
              console.error('[Saksham Auth] applyRolePermissions error in authStateChanged:', e);
            }
          } else {
            // Resolve shared patient data before hydrating the existing role session.
            let profile = null;
            try { profile = JSON.parse(localStorage.getItem('saksham_active_user') || 'null'); } catch(e) {}
            if (window.dbService) {
              if (profile && window.dbService.resolveWorkspace) {
                await window.dbService.resolveWorkspace(profile);
                profile.patientWorkspaceUid = window.dbService.getStatus().workspaceUid;
                localStorage.setItem('saksham_active_user', JSON.stringify(profile));
              }
              window.dbService.hydrateAll();
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
        demoBox.style.display = 'none';
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

      // Reset and display liveness challenge
      if (window.SakshamBiometrics) {
        window.SakshamBiometrics.resetLiveness();
      }
      const livenessCard = document.getElementById('bioFaceLivenessCard');
      const livenessTxt = document.getElementById('bioFaceLivenessTxt');
      if (livenessCard) {
        livenessCard.className = "p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-center space-y-1.5";
        livenessCard.classList.remove('hidden');
      }
      if (livenessTxt) {
        livenessTxt.innerText = "Liveness check: Look directly at the camera";
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
        const livenessTxt = document.getElementById('bioFaceLivenessTxt');
        const livenessCard = document.getElementById('bioFaceLivenessCard');

        if (result.detected) {
          if (oval) {
            oval.className = "absolute w-44 h-56 border-3 border-solid border-emerald-400 rounded-[50%] pointer-events-none transition-all duration-300 shadow-[0_0_25px_rgba(52,211,153,0.8)] ring-2 ring-emerald-300";
          }
          if (qualityTxt) {
            const tremorBadge = result.tremorDetected ? ' <span class="bg-emerald-700/80 text-[9px] px-1.5 py-0.5 rounded-full text-emerald-200">🌿 Tremor Compensated</span>' : '';
            qualityTxt.innerHTML = `<span class="text-emerald-300 font-bold">✓ AI Face Lock: ${result.quality}%</span>${tremorBadge}`;
          }

          if (result.liveness) {
            if (livenessTxt) livenessTxt.innerText = result.liveness.prompt;
            if (result.liveness.completed && livenessCard) {
              livenessCard.className = "p-2.5 rounded-2xl bg-emerald-50/90 border border-emerald-300 text-center space-y-1";
            }
          }

          if (currentBioFaceMode === 'login') {
            const match = window.SakshamBiometrics.matchLiveFace(result);
            if (match.matched && match.user) {
              if (statusTxt) {
                statusTxt.innerHTML = `<span class="text-emerald-700 font-black"><i class="fa-solid fa-circle-check"></i> Detected: ${match.user.name} (${match.score}% Match)</span>`;
              }
            } else {
              if (statusTxt) {
                statusTxt.innerHTML = `<span class="text-teal-700 font-bold"><i class="fa-solid fa-expand text-teal-600"></i> Face locked (${result.quality}%). Tap 'Scan &amp; Log In' below!</span>`;
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

    function skipFaceLivenessChallenge() {
      if (window.SakshamBiometrics) {
        window.SakshamBiometrics.skipLiveness();
      }
      const livenessCard = document.getElementById('bioFaceLivenessCard');
      const livenessTxt = document.getElementById('bioFaceLivenessTxt');
      if (livenessTxt) {
        livenessTxt.innerHTML = '<span class="text-emerald-800 font-bold">✓ Liveness skipped for accessibility</span>';
      }
      if (livenessCard) {
        livenessCard.className = "p-2.5 rounded-2xl bg-emerald-50/90 border border-emerald-300 text-center space-y-1";
      }
      const statusTxt = document.getElementById('bioFaceStatusTxt');
      if (statusTxt) {
        statusTxt.innerHTML = '<span class="text-emerald-700 font-black"><i class="fa-solid fa-circle-check"></i> Ready to verify face</span>';
      }
    }
    window.skipFaceLivenessChallenge = skipFaceLivenessChallenge;

    async function handleDeleteMyFaceData() {
      const active = JSON.parse(localStorage.getItem('saksham_active_user') || 'null');
      const uid = active ? (active.firebaseUid || active.id) : null;
      if (!confirm("Are you sure you want to permanently delete your facial biometric data from this device and cloud? You can re-enroll at any time.")) {
        return;
      }

      if (window.SakshamBiometrics) {
        await window.SakshamBiometrics.deleteMyFaceData(uid);
      }

      const faceStatusTxt = document.getElementById('regFaceStatusTxt');
      const faceCheck = document.getElementById('regFaceCheckIcon');
      if (faceStatusTxt) faceStatusTxt.innerText = "👤 Register My Face";
      if (faceCheck) faceCheck.classList.add('hidden');

      try { initAudio(); playAudioChime('chime'); } catch(e) {}
      alert("Your facial biometric profile has been completely erased.");
      speakText("Your face biometric data has been permanently deleted.");
    }
    window.handleDeleteMyFaceData = handleDeleteMyFaceData;

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
      const user = match && match.user;

      if (match.matched && user) {
        if (statusTxt) {
          const tremorNote = descriptor.tremorDetected ? ' (Tremor Stabilized)' : '';
          statusTxt.innerHTML = `<span class="text-emerald-700 font-black"><i class="fa-solid fa-circle-check"></i> Identity Verified: ${user.name}${tremorNote}!</span>`;
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
          statusTxt.innerHTML = `<span class="text-amber-800 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Face not recognized. Enroll this face first or use email and password.</span>`;
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
        fastRoles.style.display = 'none';
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

    // Helper: complete login after server-side passkey verification
    function _completePasskeyLogin(user, firebaseUser) {
      const uid = (user && (user.uid || user.firebaseUid)) || (firebaseUser && firebaseUser.uid) || '';
      const userObj = {
        name: user.name || 'Saksham User',
        role: user.role || 'patient',
        email: user.email || '',
        firebaseUid: uid,
        id: uid,
        lang: user.lang || 'en'
      };
      localStorage.setItem('saksham_active_user', JSON.stringify(userObj));
      if (window.dbService && uid) {
        window.dbService.setCurrentUser(uid);
        window.dbService.hydrateAll(uid);
      }
      applyRolePermissions(userObj.role, userObj);
      hideAuthGateway();
      speakText(`Passkey verified. Welcome back to Saksham, ${userObj.name}.`);
    }

    async function executeFingerprintVerification() {
      const statusTxt = document.getElementById('bioFingerprintStatusTxt');
      const detailTxt = document.getElementById('bioFingerprintDetailTxt');
      const actionIcon = document.querySelector('#biometricFingerprintModal .fa-fingerprint');

      // Parkinson's Tremor Tactile Haptic Feedback
      if (navigator.vibrate) {
        try { navigator.vibrate([40, 60, 40]); } catch (e) {}
      }

      function setStatus(html, detail = '') {
        if (statusTxt) statusTxt.innerHTML = html;
        if (detailTxt && detail) detailTxt.innerText = detail;
      }

      // ── REGISTER MODE ─────────────────────────────────────────────────
      if (currentBioFingerprintMode === 'register') {
        setStatus(
          '<i class="fa-solid fa-spinner fa-spin text-emerald-600"></i> <span>Preparing passkey registration…</span>'
        );

        if (window.SakshamBiometrics) {
          window.SakshamBiometrics.setPendingRegFingerprint(true);
        }

        const statusEl = document.getElementById('regFingerprintStatusTxt');
        const checkIcon = document.getElementById('regFingerprintCheckIcon');
        const previewRow = document.getElementById('regBiometricPreviewRow');
        const summaryTxt = document.getElementById('regBiometricSummary');
        if (statusEl) statusEl.innerText = '🔐 Passkey ready to enroll ✓';
        if (checkIcon) checkIcon.classList.remove('hidden');
        if (previewRow) previewRow.classList.remove('hidden');
        if (summaryTxt) summaryTxt.innerText = 'Passkey & Fingerprint biometric will be bound to your account on submit.';

        initAudio();
        playAudioChime('fanfare');
        setTimeout(() => closeBiometricFingerprintModal(), 1000);
        return;
      }

      // ── LOGIN MODE ────────────────────────────────────────────────────
      setStatus(
        '<i class="fa-solid fa-spinner fa-spin text-emerald-600"></i> <span>Requesting passkey authentication…</span>',
        '🌿 Tremor-tolerant sensor active. Touch device sensor or tap the icon.'
      );

      initAudio();

      const enrolledFingerprints = window.SakshamBiometrics?.getEnrolledFingerprints?.() || [];
      const enrolledFaces = window.SakshamBiometrics?.getEnrolledFaces?.() || [];
      if (enrolledFingerprints.length === 0 && enrolledFaces.length === 0) {
        setStatus(
          '<span class="text-amber-800 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> No enrolled biometric profile found.</span>',
          'Enroll a passkey while creating an account, or sign in with email and password.'
        );
        return;
      }

      const emailHint = document.getElementById('signInEmail')?.value?.trim() || null;
      let passkeySuccess = false;
      let matchedUser = null;
      let fbUser = null;

      // 1. Try server-backed SakshamPasskey if available
      if (window.SakshamPasskey && window.SakshamPasskey.isSupported()) {
        try {
          const res = await window.SakshamPasskey.loginWithPasskey(emailHint);
          if (res && res.user) {
            passkeySuccess = true;
            matchedUser = res.user;
            fbUser = res.firebaseUser;
          }
        } catch (serverErr) {
          console.warn('[Passkey] Server-backed passkey attempt notice:', serverErr.message);
        }
      }

      // 2. Client-side / on-device WebAuthn fallback via SakshamBiometrics
      if (!passkeySuccess && window.SakshamBiometrics) {
        try {
          const bioRes = await window.SakshamBiometrics.verifyFingerprint('patient');
          if (bioRes && bioRes.success && bioRes.user) {
            passkeySuccess = true;
            matchedUser = bioRes.user;
          }
        } catch (bioErr) {
          console.warn('[Passkey] On-device biometrics notice:', bioErr.message);
        }
      }

      if (passkeySuccess && matchedUser) {
        setStatus(
          `<span class="text-emerald-700 font-black"><i class="fa-solid fa-circle-check"></i> Biometric Verified: ${matchedUser.name}!</span>`,
          '🌿 Tremor-tolerant passkey authenticated. Entering Saksham…'
        );
        playAudioChime('fanfare');

        setTimeout(() => {
          closeBiometricFingerprintModal();
          _completePasskeyLogin(matchedUser, fbUser);
        }, 600);
      } else {
        setStatus(
          '<span class="text-amber-800 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> No enrolled biometric profile found.</span>',
          'Enroll a passkey while creating an account, or sign in with email and password.'
        );
      }
    }

    // Demo-only: quick persona switch for the 3 preset accounts (no real auth bypass
    // for real Firebase accounts — those must use the passkey or email/password flow).
    function verifyFingerprintAsRole(role) {
      const statusTxt = document.getElementById('bioFingerprintStatusTxt');
      const name = role === 'patient' ? 'Kalyani Sharma'
        : role === 'caregiver' ? 'Aarav Sharma (Caregiver)'
        : 'Dr. Rajesh Verma, MD';

      if (statusTxt) {
        statusTxt.innerHTML = `<span class="text-emerald-700 font-black"><i class="fa-solid fa-circle-check"></i> Demo: entering as ${name}…</span>`;
      }

      initAudio();
      playAudioChime('fanfare');

      setTimeout(() => {
        closeBiometricFingerprintModal();
        loginPresetUser(role);
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
        gateway.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        renderCustomSavedAccounts();
      }
    }

    function hideAuthGateway() {
      const gateway = document.getElementById('authGatewayScreen');
      if (gateway) {
        gateway.classList.add('hidden');
        gateway.style.display = 'none';
      }
      // Always restore scroll — even if gateway element is missing
      document.body.style.overflow = '';
      document.body.style.overflowY = '';
      document.documentElement.style.overflow = '';
      // Reset scroll lock manager counter if it's loaded
      if (typeof window.forceUnlockScroll === 'function') window.forceUnlockScroll();
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
    let isRegisteringAccount = false;
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

    let pendingSecurityRole = null;

    function requestRoleLogin(role) {
      loginPresetUser(role);
    }

    function verifyRoleSecurityPin() {
      const pinInput = document.getElementById('secGatePinInput');
      const err = document.getElementById('secGateError');
      const enteredPin = (pinInput?.value || '').trim();

      const expectedPin = (pendingSecurityRole === 'doctor') ? '9999' : '1234';

      if (enteredPin === expectedPin) {
        const roleToLogin = pendingSecurityRole;
        closeRoleSecurityGate();
        loginPresetUser(roleToLogin);
      } else {
        if (err) {
          err.innerText = `Incorrect passcode. If you are Kalyani (patient), click "I am Kalyani" below to return safely.`;
          err.classList.remove('hidden');
        }
        if (pinInput) {
          pinInput.value = '';
          pinInput.focus();
        }
      }
    }

    function safeReturnToPatient() {
      closeRoleSecurityGate();
      loginPresetUser('patient');
    }

    function closeRoleSecurityGate() {
      const modal = document.getElementById('modalRoleSecurityGate');
      if (modal) modal.classList.add('hidden');
      pendingSecurityRole = null;
    }

    window.requestRoleLogin = requestRoleLogin;
    window.verifyRoleSecurityPin = verifyRoleSecurityPin;
    window.safeReturnToPatient = safeReturnToPatient;
    window.closeRoleSecurityGate = closeRoleSecurityGate;

    const DEMO_WORKSPACE_UID = 'demo-patient-kalyani';
    const DEMO_STORAGE_KEYS = ['saksham_tasks', 'saksham_familiar_people', 'saksham_doctor_directives', 'saksham_caregiver_notes', 'saksham_demo_alerts'];

    function copyPatientWorkspaceCode() {
      const activeUser = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
      const code = activeUser.patientWorkspaceUid || activeUser.id || DEMO_WORKSPACE_UID;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          if (typeof showSakshamToast === 'function') {
            showSakshamToast(`Patient ID copied: ${code}`, 'success');
          } else {
            alert(`Patient ID copied: ${code}`);
          }
        }).catch(() => {
          alert(`Patient ID: ${code}`);
        });
      } else {
        alert(`Patient ID: ${code}`);
      }
    }

    function requestPatientWorkspace(role) {
      const inputId = role === 'doctor' ? 'doctorPatientCode' : 'caregiverPatientCode';
      const statusId = role === 'doctor' ? 'doctorLinkStatus' : 'caregiverLinkStatus';
      const input = document.getElementById(inputId);
      const status = document.getElementById(statusId);
      const code = (input ? input.value : '').trim();
      if (!code) {
        if (status) {
          status.innerText = "Please enter a valid Patient ID.";
          status.className = "text-xs text-amber-600 font-bold";
        }
        return;
      }

      // Record access request in persistent storage
      const reqId = 'req_' + Date.now();
      const requesterName = role === 'doctor' ? 'Dr. Arvind Mehra (Neurologist)' : 'Pooja Sharma (Caregiver)';
      const requesterPhone = role === 'doctor' ? '+91 98201 55432' : '+91 98190 22345';
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let requests = [];
      try {
        requests = JSON.parse(localStorage.getItem('saksham_care_team_requests') || '[]');
      } catch (e) {
        requests = [];
      }

      const newReq = {
        id: reqId,
        patientCode: code,
        role: role,
        requesterName: requesterName,
        requesterPhone: requesterPhone,
        requestedAt: timeStr,
        status: 'pending'
      };
      requests.unshift(newReq);
      try {
        localStorage.setItem('saksham_care_team_requests', JSON.stringify(requests));
      } catch (e) {}

      if (window.dbService && window.dbService.workspaceRequests) {
        window.dbService.workspaceRequests.add(newReq).catch(e => console.warn(e));
      }

      if (status) {
        status.innerText = `Access requested for workspace "${code}". Waiting for patient approval.`;
        status.className = "text-xs text-emerald-700 font-bold";
      }
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`Access requested for ${code}. Patient can now approve!`, 'success');
      }

      // Immediately refresh the patient view so the incoming request appears
      renderCareTeamWorkspace();
    }

    function approveCareTeamRequest(reqId) {
      let requests = [];
      try {
        requests = JSON.parse(localStorage.getItem('saksham_care_team_requests') || '[]');
      } catch (e) { requests = []; }

      const req = requests.find(r => r.id === reqId);
      if (req) {
        req.status = 'approved';
        try { localStorage.setItem('saksham_care_team_requests', JSON.stringify(requests)); } catch(e) {}

        // Add to active members
        let members = getCareTeamMembers();
        const exists = members.some(m => m.name === req.requesterName || m.phone === req.requesterPhone);
        if (!exists) {
          members.push({
            id: 'mem_' + Date.now(),
            name: req.requesterName.replace(/\s*\(.*\)/, '').trim(),
            role: req.role,
            title: req.requesterName,
            phone: req.requesterPhone,
            joinedAt: 'Just now',
            status: 'active'
          });
          saveCareTeamMembers(members);
        }

        if (typeof showSakshamToast === 'function') {
          showSakshamToast(`Care team access approved for ${req.requesterName}!`, 'success');
        }
        renderCareTeamWorkspace();
      }
    }

    function rejectCareTeamRequest(reqId) {
      let requests = [];
      try {
        requests = JSON.parse(localStorage.getItem('saksham_care_team_requests') || '[]');
      } catch (e) { requests = []; }

      requests = requests.filter(r => r.id !== reqId);
      try { localStorage.setItem('saksham_care_team_requests', JSON.stringify(requests)); } catch(e) {}

      if (typeof showSakshamToast === 'function') {
        showSakshamToast('Request declined', 'info');
      }
      renderCareTeamWorkspace();
    }

    function removeCareTeamMember(memberId) {
      if (typeof confirm === 'function' && !confirm('Remove this care team member?')) return;
      let members = getCareTeamMembers();
      members = members.filter(m => m.id !== memberId);
      saveCareTeamMembers(members);
      if (typeof showSakshamToast === 'function') {
        showSakshamToast('Care team member removed', 'info');
      }
      renderCareTeamWorkspace();
    }

    function getCareTeamMembers() {
      try {
        const stored = localStorage.getItem('saksham_care_team_members');
        if (stored) return JSON.parse(stored);
      } catch(e) {}
      // Default initial care team members
      const defaultMembers = [
        {
          id: 'mem_doc_1',
          name: 'Dr. Arvind Mehra',
          role: 'doctor',
          title: 'Movement Disorder Specialist',
          phone: '+91 98201 55432',
          joinedAt: 'Connected',
          status: 'active'
        },
        {
          id: 'mem_cg_1',
          name: 'Pooja Sharma',
          role: 'caregiver',
          title: 'Primary Caregiver & Daughter',
          phone: '+91 98190 22345',
          joinedAt: 'Connected',
          status: 'active'
        }
      ];
      try { localStorage.setItem('saksham_care_team_members', JSON.stringify(defaultMembers)); } catch(e) {}
      return defaultMembers;
    }

    function saveCareTeamMembers(members) {
      try {
        localStorage.setItem('saksham_care_team_members', JSON.stringify(members));
      } catch(e) {}
    }

    function renderCareTeamWorkspace() {
      const activeUser = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
      const patientCode = activeUser.patientWorkspaceUid || activeUser.id || DEMO_WORKSPACE_UID;

      const codeEl = document.getElementById('patientWorkspaceCode');
      if (codeEl) codeEl.innerText = patientCode;
      const cgLinked = document.getElementById('caregiverLinkedPatient');
      if (cgLinked) cgLinked.innerText = `Linked to: Kalyani Sharma (${patientCode})`;
      const docLinked = document.getElementById('doctorLinkedPatient');
      if (docLinked) docLinked.innerText = `Linked to: Kalyani Sharma (${patientCode})`;

      // Render Pending Requests
      const reqContainer = document.getElementById('patientCareTeamRequests');
      if (reqContainer) {
        let requests = [];
        try {
          requests = JSON.parse(localStorage.getItem('saksham_care_team_requests') || '[]');
        } catch(e) { requests = []; }
        const pending = requests.filter(r => r.status === 'pending');

        if (pending.length === 0) {
          reqContainer.innerHTML = '';
        } else {
          reqContainer.innerHTML = `
            <div class="space-y-2 pt-1 border-t border-slate-100">
              <span class="text-[11px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1">
                <i class="fa-solid fa-bell text-amber-600"></i> Pending Access Requests (${pending.length}):
              </span>
              ${pending.map(r => `
                <div class="p-3 bg-amber-50/80 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-black text-slate-900">${r.requesterName}</span>
                      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 uppercase">${r.role}</span>
                    </div>
                    <p class="text-[11px] text-slate-600 mt-0.5">Requested access to your wellness profile at ${r.requestedAt}.</p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button onclick="approveCareTeamRequest('${r.id}')" class="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black shadow-xs transition flex items-center gap-1 cursor-pointer">
                      <i class="fa-solid fa-check"></i> Approve
                    </button>
                    <button onclick="rejectCareTeamRequest('${r.id}')" class="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer">
                      Decline
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      }

      // Render Active Care Team Members
      const memContainer = document.getElementById('patientCareTeamMembers');
      if (memContainer) {
        const members = getCareTeamMembers();
        if (members.length === 0) {
          memContainer.innerHTML = '<p class="text-xs text-slate-400 italic py-1">No care team members connected yet.</p>';
        } else {
          memContainer.innerHTML = `
            <div class="space-y-1.5 pt-1">
              <span class="text-[11px] font-black uppercase text-teal-800 tracking-wider flex items-center gap-1">
                <i class="fa-solid fa-user-shield text-teal-600"></i> Active Care Team (${members.length}):
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${members.map(m => `
                  <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-8 h-8 rounded-full ${m.role === 'doctor' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'} flex items-center justify-center font-bold text-xs shrink-0">
                        <i class="fa-solid ${m.role === 'doctor' ? 'fa-user-doctor' : 'fa-hand-holding-heart'}"></i>
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs font-black text-slate-900 truncate">${m.name}</p>
                        <p class="text-[10px] text-slate-500 truncate">${m.title || (m.role === 'doctor' ? 'Doctor' : 'Caregiver')}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      ${m.phone ? `
                        <a href="tel:${m.phone}" class="px-2 py-1 bg-white hover:bg-teal-50 border border-slate-200 text-teal-700 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-2xs">
                          <i class="fa-solid fa-phone"></i> Call
                        </a>
                      ` : ''}
                      <button onclick="removeCareTeamMember('${m.id}')" class="text-slate-400 hover:text-rose-600 transition p-1 text-xs cursor-pointer" title="Remove Member">
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      }
    }

    window.copyPatientWorkspaceCode = copyPatientWorkspaceCode;
    window.requestPatientWorkspace = requestPatientWorkspace;
    window.approveCareTeamRequest = approveCareTeamRequest;
    window.rejectCareTeamRequest = rejectCareTeamRequest;
    window.removeCareTeamMember = removeCareTeamMember;
    window.renderCareTeamWorkspace = renderCareTeamWorkspace;
    window.getCareTeamMembers = getCareTeamMembers;

    function loadDemoWorkspaceData() {
      loadPersistedTasks();
      loadPersistedCareNotes();
      try { state.familiarPeople = JSON.parse(localStorage.getItem('saksham_familiar_people') || '[]'); } catch(e) { state.familiarPeople = []; }
      try { state.caregiverAlerts = JSON.parse(localStorage.getItem('saksham_demo_alerts') || '[]'); } catch(e) { state.caregiverAlerts = []; }
    }

    function seedDemoWorkspaceData() {
      const existingSeed = localStorage.getItem('saksham_demo_seeded');
      if (existingSeed === 'v1') {
        loadDemoWorkspaceData();
        return;
      }

      const backup = {};
      DEMO_STORAGE_KEYS.forEach(key => { backup[key] = localStorage.getItem(key); });
      localStorage.setItem('saksham_pre_demo_data', JSON.stringify(backup));

      state.tasks = JSON.parse(JSON.stringify(DEFAULT_TASKS));
      state.tasks[2].caregiverNote = 'Aarav can help lay out the shirt before breakfast.';
      state.familiarPeople = [{
        id: 'demo-loved-one-1',
        name: 'Trishna Sharma',
        role: 'Daughter',
        phone: '+1 (555) 102-2044',
        whatsapp: '15551022044',
        clue: 'She brought fresh apples and visited last Sunday.',
        img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        options: ['Trishna Sharma', 'Doctor', 'Neighbor', 'Nurse']
      }];
      state.caregiverDoctorNotes = [{
        id: 'demo-note-1', title: 'Morning mobility update',
        body: 'Kalyani completed her morning walk with steady pacing. Continue the visual step cue near doorways.',
        authorRole: 'caregiver', authorName: 'Aarav Sharma', date: 'Today'
      }];
      state.doctorDirectives = [{
        id: 'demo-directive-1', title: 'Medication and meals',
        body: 'Follow the prescribed medication schedule. Contact the clinic before making any dose changes.',
        doctorName: 'Dr. Rajesh Verma, MD', date: 'Today'
      }];
      state.caregiverAlerts = [{
        id: 'demo-alert-1', time: '09:15 AM', text: 'Morning routine completed with caregiver support.', severity: 'info'
      }];
      state.streak = 5;
      state.waterLogged = 4;
      state.waterTargetGlasses = 8;
      persistTasks();
      persistCareNotes();
      persistLovedOnesLocal();
      localStorage.setItem('saksham_demo_alerts', JSON.stringify(state.caregiverAlerts));
      localStorage.setItem('saksham_demo_seeded', 'v1');
    }

    function restorePreDemoData() {
      try {
        const backup = JSON.parse(localStorage.getItem('saksham_pre_demo_data') || 'null');
        if (!backup) return;
        DEMO_STORAGE_KEYS.forEach(key => {
          if (backup[key] === null) localStorage.removeItem(key);
          else if (typeof backup[key] === 'string') localStorage.setItem(key, backup[key]);
        });
        localStorage.removeItem('saksham_pre_demo_data');
        localStorage.removeItem('saksham_demo_seeded');
      } catch(e) {
        console.warn('[Saksham Demo] Previous local data could not be restored:', e.message);
      }
    }

    function loginPresetUser(role) {
      const validRole = ['patient', 'caregiver', 'doctor', 'administrator'].includes(role) ? role : 'patient';
      const names = {
        patient: 'Kalyani Sharma',
        caregiver: 'Aarav Sharma',
        doctor: 'Dr. Rajesh Verma, MD',
        administrator: 'System Administrator'
      };
      const savedTier = localStorage.getItem('saksham_age_tier') || (localStorage.getItem('saksham_age_mode') === 'senior' ? 'senior' : 'youth');
      const userObj = {
        name: names[validRole],
        role: validRole,
        condition: validRole === 'patient' ? 'parkinsons' : undefined,
        ageTier: savedTier,
        interfaceProfile: savedTier,
        id: null,
        firebaseUid: null,
        patientWorkspaceUid: DEMO_WORKSPACE_UID,
        patientName: 'Kalyani Sharma',
        caregiverName: 'Aarav Sharma',
        caregiverPhone: '+91 98765 43210',
        doctorName: 'Dr. Rajesh Verma, MD',
        doctorPhone: '+91 98765 43211',
        lang: 'en',
        isDemo: true
      };

      const auth = _getFirebaseAuth();
      if (auth && auth.currentUser) auth.signOut().catch(() => {});
      if (window.dbService) {
        window.dbService.setCurrentUser(null);
        window.dbService.setWorkspaceUid(DEMO_WORKSPACE_UID);
      }
      seedDemoWorkspaceData();
      state.uid = DEMO_WORKSPACE_UID;
      localStorage.setItem('saksham_active_user', JSON.stringify(userObj));
      initAudio();
      playAudioChime('chime');

      // Instantly hide gateway and apply role permissions synchronously
      hideAuthGateway();
      try {
        applyRolePermissions(role, userObj);
      } catch(e) {
        console.error('[Saksham Auth] applyRolePermissions error in loginPresetUser:', e);
      }

      if (role === 'administrator') {
        if (typeof window.switchAdminSubTab === 'function') {
          window.switchAdminSubTab('adm-users');
        }
        if (typeof window.renderAdminPortal === 'function') {
          window.renderAdminPortal();
        }
      }

      setTimeout(() => {
        renderCareTeamWorkspace();
        try { speakText(`Welcome to the shared demo workspace, ${userObj.name}.`); } catch(e) {}
      }, 150);
    }

    function loginAsGuest() {
      loginPresetUser('patient');
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

      isRegisteringAccount = true;
      try {
        const auth = _getFirebaseAuth();
        let firebaseUid = null;

        if (auth) {
          try {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            firebaseUid = cred.user.uid;
            // Update display name in Firebase Auth
            await cred.user.updateProfile({ displayName: fullName });
          } catch(err) {
            console.error('[Saksham Auth] Register notice:', err);
            if (err.code === 'auth/network-request-failed' || err.code === 'auth/operation-not-allowed') {
              console.warn('[Saksham Auth] Continuing with local account creation fallback.');
              firebaseUid = 'USER-' + Date.now();
            } else {
              _showAuthMsg('emailRegError', _friendlyAuthError(err.code), true);
              if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Create Account & Enter Saksham'; }
              return;
            }
          }
        }

        const newUser = {
          name: fullName,
          role: role,
          email: email,
          caregiverName: cgName || '',
          caregiverPhone: cgPhone || '',
          lang: lang,
          id: firebaseUid || ('USER-' + Date.now()),
          firebaseUid: firebaseUid,
          patientWorkspaceUid: firebaseUid || undefined,
          hasFaceBiometrics: false,
          hasFingerprint: false,
          condition: 'parkinsons',
          onboardingCompleted: role === 'patient' ? false : true,
          locationSharing: false
        };

        localStorage.setItem('saksham_active_user', JSON.stringify(newUser));

        try {
          let users = JSON.parse(localStorage.getItem('saksham_registered_users') || '[]');
          const idx = users.findIndex(u => (firebaseUid && u.firebaseUid === firebaseUid) || (u.email && u.email.toLowerCase() === email.toLowerCase()));
          if (idx >= 0) users[idx] = newUser; else users.push(newUser);
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

        // If new patient, launch personalized disease-based onboarding immediately!
        if (role === 'patient') {
          if (window.openPatientOnboarding) {
            window.openPatientOnboarding(false);
          }
        }

        setTimeout(() => {
          try { speakText(`Account created! Welcome to Saksham, ${fullName}.`); } catch(e) {}
        }, 500);
      } finally {
        isRegisteringAccount = false;
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Create Account & Enter Saksham'; }
      }
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

        localStorage.setItem('saksham_active_user', JSON.stringify(u));
        initAudio();
        playAudioChime('chime');
        applyRolePermissions(u.role, u);
        if (u.lang && u.lang !== 'en') {
          changeLanguage(u.lang);
        }

        // PRIORITY 4: Hydrate isolated personalisation preferences for newly signed in user
        if (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.handleUserChange === 'function') {
          window.SakshamPersonalisation.handleUserChange(u.firebaseUid || u.id, u.ageTier);
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
      let activeUser = null;
      try { activeUser = JSON.parse(localStorage.getItem('saksham_active_user') || 'null'); } catch(e) {}
      if (activeUser && activeUser.isDemo) {
        restorePreDemoData();
        loadPersistedTasks();
        loadPersistedCareNotes();
        try { state.familiarPeople = JSON.parse(localStorage.getItem('saksham_familiar_people') || '[]'); } catch(e) { state.familiarPeople = []; }
        state.caregiverAlerts = [];
        if (window.dbService) {
          window.dbService.setCurrentUser(null);
          window.dbService.setWorkspaceUid(null);
        }
      }
      localStorage.removeItem('saksham_active_user');

      // PRIORITY 4: Clear active user's in-memory personalisation state and isolate from next user
      if (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.handleLogout === 'function') {
        window.SakshamPersonalisation.handleLogout();
      }

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
          try {
            const savedTier = localStorage.getItem('saksham_age_tier') || user.ageTier || 'youth';
            user.ageTier = savedTier;
            user.interfaceProfile = savedTier;

            // PRIORITY 4: Ensure user-isolated personalisation settings are applied
            if (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.handleUserChange === 'function') {
              window.SakshamPersonalisation.handleUserChange(user.firebaseUid || user.id, savedTier);
            }

            applyRolePermissions(user.role || 'patient', user);
            if (user.role === 'patient') {
              if (user.onboardingCompleted === false) {
                setTimeout(() => { if (window.openPatientOnboarding) window.openPatientOnboarding(false); }, 400);
              } else if (user.condition && window.SakshamOnboarding) {
                window.SakshamOnboarding.applyDiseaseModules(user.condition);
              }
            }
          } catch(e) {
            console.error('[Saksham Auth] applyRolePermissions error restoring session:', e);
          }
          return;
        } catch(e) {
          console.error("Invalid session JSON — restoring demo patient session", e);
          localStorage.removeItem('saksham_active_user');
        }
      }
      // If no active session, seamlessly initialize demo patient session so portal and tabs are NEVER blank!
      hideAuthGateway();
      loginPresetUser('patient');
    }



    let caregiverPieChartInst = null;
    let caregiverBarChartInst = null;
    let doctorTaskPieChartInst = null;
    let doctorTaskBarChartInst = null;
    let doctorPieChartInst = null;
    let doctorBarChartInst = null;

    function getTaskStats() {
      if (typeof window.computeTaskChartStats === 'function') {
        return window.computeTaskChartStats();
      }
      const tasks = (typeof state !== 'undefined' && Array.isArray(state.tasks)) ? state.tasks : [];
      let doneCount = 0, slowCount = 0, snoozedCount = 0, pendingCount = 0;
      tasks.forEach(t => {
        if (t.snoozed || (t.snoozeCount && t.snoozeCount > 0)) snoozedCount++;
        else if (t.latencyMinutes && t.latencyMinutes >= 15) slowCount++;
        else if (t.done) doneCount++;
        else pendingCount++;
      });
      const barLabels = [], baselineData = [], actualData = [], barColors = [];
      tasks.slice(0, 8).forEach(t => {
        barLabels.push(t.title.length > 18 ? t.title.substring(0, 16) + '…' : t.title);
        baselineData.push(5);
        const act = Number(t.latencyMinutes) || (t.done ? 6 : 5);
        actualData.push(act);
        barColors.push(act >= 15 ? '#EF4444' : '#10B981');
      });
      return { total: tasks.length, doneCount, slowCount, snoozedCount, pendingCount, barLabels, baselineData, actualData, barColors };
    }

    function createPieConfig(stats) {
      return {
        type: 'doughnut',
        data: {
          labels: ['Done', 'Needed More Time (≥15m)', 'Snoozed', 'Pending'],
          datasets: [{
            data: [stats.doneCount, stats.slowCount, stats.snoozedCount, stats.pendingCount],
            backgroundColor: ['#10B981', '#F59E0B', '#6366F1', '#94A3B8'],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { display: false }
          }
        }
      };
    }

    function createBarConfig(stats) {
      return {
        type: 'bar',
        data: {
          labels: stats.barLabels,
          datasets: [
            {
              label: 'Baseline Target (5m)',
              data: stats.baselineData,
              backgroundColor: '#CBD5E1',
              borderRadius: 6
            },
            {
              label: 'Recorded Time (mins)',
              data: stats.actualData,
              backgroundColor: stats.barColors,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Minutes' }
            },
            x: {
              ticks: { maxRotation: 45, minRotation: 0 }
            }
          },
          plugins: {
            legend: { position: 'top' }
          }
        }
      };
    }

    function initCharts() {
      if (typeof Chart === 'undefined') return;
      const stats = getTaskStats();

      // 1. Caregiver Charts
      const ctxCgPie = document.getElementById('caregiverPieChart')?.getContext('2d');
      if (ctxCgPie) {
        if (caregiverPieChartInst) caregiverPieChartInst.destroy();
        caregiverPieChartInst = new Chart(ctxCgPie, createPieConfig(stats));
      }

      const ctxCgBar = document.getElementById('caregiverBarChart')?.getContext('2d');
      if (ctxCgBar) {
        if (caregiverBarChartInst) caregiverBarChartInst.destroy();
        caregiverBarChartInst = new Chart(ctxCgBar, createBarConfig(stats));
      }

      // 2. Doctor Task Adherence Charts
      const ctxDocTaskPie = document.getElementById('doctorTaskPieChart')?.getContext('2d');
      if (ctxDocTaskPie) {
        if (doctorTaskPieChartInst) doctorTaskPieChartInst.destroy();
        doctorTaskPieChartInst = new Chart(ctxDocTaskPie, createPieConfig(stats));
      }

      const ctxDocTaskBar = document.getElementById('doctorTaskBarChart')?.getContext('2d');
      if (ctxDocTaskBar) {
        if (doctorTaskBarChartInst) doctorTaskBarChartInst.destroy();
        doctorTaskBarChartInst = new Chart(ctxDocTaskBar, createBarConfig(stats));
      }

      // 3. Doctor Clinical Motor Charts
      const ctxDocPie = document.getElementById('doctorPieChart')?.getContext('2d');
      if (ctxDocPie) {
        if (doctorPieChartInst) doctorPieChartInst.destroy();
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
        if (doctorBarChartInst) doctorBarChartInst.destroy();
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

    let chartsUpdateScheduled = false;

    function updateChartsData() {
      if (typeof Chart === 'undefined') return;
      // High Performance: Patient dashboard does not display charts, bypass entirely
      if (typeof state !== 'undefined' && state.role === 'patient') return;

      if (chartsUpdateScheduled) return;
      chartsUpdateScheduled = true;

      requestAnimationFrame(() => {
        chartsUpdateScheduled = false;
        try {
          const stats = getTaskStats();

          const updatePie = (chart) => {
            if (!chart) return;
            chart.data.datasets[0].data = [stats.doneCount, stats.slowCount, stats.snoozedCount, stats.pendingCount];
            chart.update('none'); // 'none' skips CPU-heavy animation cycles to eliminate browser lag
          };

          const updateBar = (chart) => {
            if (!chart) return;
            chart.data.labels = stats.barLabels;
            chart.data.datasets[0].data = stats.baselineData;
            chart.data.datasets[1].data = stats.actualData;
            chart.data.datasets[1].backgroundColor = stats.barColors;
            chart.update('none');
          };

          updatePie(caregiverPieChartInst);
          updateBar(caregiverBarChartInst);
          updatePie(doctorTaskPieChartInst);
          updateBar(doctorTaskBarChartInst);
        } catch (err) {
          console.warn('[updateChartsData]', err);
        }
      });
    }

    window.initCharts = initCharts;
    window.updateChartsData = updateChartsData;



    // Start automated proactive reminder loop immediately
    if (typeof checkScheduledReminders === 'function') {
      checkScheduledReminders();
      setInterval(checkScheduledReminders, 10000);
    }

    // ==================== ADMINISTRATOR PORTAL LOGIC ====================
    let adminAuditLogs = [
      { id: 'aud-1', timestamp: new Date(Date.now() - 1000 * 60 * 5).toLocaleTimeString(), actorUid: 'usr-admin-system', actorRole: 'administrator', action: 'ROLE_PROVISIONED', resource: 'user:dr-verma (doctor)', status: 'ALLOWED', details: 'Medical License #MC-2024-884 verified' },
      { id: 'aud-2', timestamp: new Date(Date.now() - 1000 * 60 * 18).toLocaleTimeString(), actorUid: 'usr-cg-aarav', actorRole: 'caregiver', action: 'PATIENT_TELEMETRY_READ', resource: 'patient:kalyani-sharma', status: 'ALLOWED', details: 'Authorized relationship verified via link' },
      { id: 'aud-3', timestamp: new Date(Date.now() - 1000 * 60 * 45).toLocaleTimeString(), actorUid: 'usr-pt-kalyani', actorRole: 'patient', action: 'AUTH_LOGIN', resource: 'auth:session', status: 'ALLOWED', details: 'Successful passkey / PIN authentication' },
      { id: 'aud-4', timestamp: new Date(Date.now() - 1000 * 60 * 70).toLocaleTimeString(), actorUid: 'anon-unauth-probe', actorRole: 'unauthenticated', action: 'UNAUTHORIZED_ACCESS_ATTEMPT', resource: 'api/clinical/directives', status: 'DENIED', details: 'Blocked by RLS policy - missing auth token' },
      { id: 'aud-5', timestamp: new Date(Date.now() - 1000 * 60 * 120).toLocaleTimeString(), actorUid: 'usr-doctor-rajesh', actorRole: 'doctor', action: 'DIRECTIVE_RECORDED', resource: 'directive:protein-spacing', status: 'ALLOWED', details: 'Signed with clinician session token' }
    ];

    let adminUsers = [
      { uid: 'usr-pt-kalyani', name: 'Kalyani Sharma', email: 'kalyani@saksham.health', role: 'patient', mfa: 'Passkey Active', consent: 'Consented to Caregiver Link' },
      { uid: 'usr-cg-aarav', name: 'Aarav Sharma', email: 'aarav@saksham.health', role: 'caregiver', mfa: 'Passcode Verified', consent: 'Authorized Caregiver' },
      { uid: 'usr-doctor-rajesh', name: 'Dr. Rajesh Verma, MD', email: 'dr.verma@saksham.health', role: 'doctor', mfa: 'TOTP MFA Enforced', consent: 'Licensed Neurologist' },
      { uid: 'usr-admin-system', name: 'System Administrator', email: 'admin@saksham.health', role: 'administrator', mfa: 'Hardware FIDO2 Active', consent: 'System Oversight' }
    ];

    function switchAdminSubTab(subTabKey) {
      const key = (subTabKey || 'users').toString().replace(/^adm-(subview-)?/, '').replace(/^tab-adm-/, '');
      const viewId = `adm-subview-${key}`;

      // 1. Hide all admin subviews cleanly
      document.querySelectorAll('#portal-admin-container [id^="adm-subview-"]').forEach(el => {
        el.classList.add('hidden');
        el.style.display = 'none';
      });

      // 2. Reset desktop top subnav buttons
      document.querySelectorAll('.adm-subnav-btn').forEach(btn => {
        btn.className = "adm-subnav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center gap-2 whitespace-nowrap";
      });

      // 3. Reset in-page pill buttons
      document.querySelectorAll('.adm-pill-btn').forEach(btn => {
        btn.className = "adm-pill-btn flex-1 min-w-[180px] py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-2 transition cursor-pointer";
      });

      // 4. Show target subview
      const targetView = document.getElementById(viewId);
      if (targetView) {
        targetView.classList.remove('hidden');
        targetView.style.display = '';
      }

      // 5. Activate matching desktop header button
      const targetHeaderBtn = document.getElementById(`tab-adm-${key}`);
      if (targetHeaderBtn) {
        targetHeaderBtn.className = "adm-subnav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md flex items-center gap-2 whitespace-nowrap";
      }

      // 6. Activate matching in-page pill button
      const targetPillBtn = document.getElementById(`adm-pill-${key}`);
      if (targetPillBtn) {
        targetPillBtn.className = "adm-pill-btn flex-1 min-w-[180px] py-2.5 px-3 rounded-xl font-black text-xs bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer";
      }

      playAudioChime('chime');
    }

    function renderAdminPortal() {
      // 1. Render Users Table
      const userTbody = document.getElementById('admUsersTableBody');
      if (userTbody) {
        userTbody.innerHTML = adminUsers.map(u => `
          <tr class="hover:bg-slate-50 transition">
            <td class="p-3.5">
              <p class="font-bold text-slate-900">${u.name}</p>
              <p class="text-[10px] text-slate-500 font-mono">${u.email} (${u.uid})</p>
            </td>
            <td class="p-3.5">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                u.role === 'administrator' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                u.role === 'doctor' ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                u.role === 'caregiver' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                'bg-teal-100 text-teal-800 border border-teal-200'
              }">${u.role}</span>
            </td>
            <td class="p-3.5">
              <span class="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px]">
                <i class="fa-solid fa-lock"></i> ${u.mfa}
              </span>
            </td>
            <td class="p-3.5 text-slate-600 text-[11px] font-medium">${u.consent}</td>
            <td class="p-3.5 text-right">
              <button onclick="handleAdminRevokeUser('${u.uid}')" class="px-2.5 py-1 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold rounded-lg transition text-[10px] border border-slate-200 cursor-pointer">
                Revoke Role
              </button>
            </td>
          </tr>
        `).join('');
      }

      // 2. Render Audit Logs Table
      const auditTbody = document.getElementById('admAuditTableBody');
      if (auditTbody) {
        auditTbody.innerHTML = adminAuditLogs.map(a => `
          <tr class="hover:bg-slate-50 transition">
            <td class="p-3 text-[11px] text-slate-500">${a.timestamp}</td>
            <td class="p-3">
              <span class="font-bold text-slate-800">${a.actorRole}</span>
              <span class="text-[10px] text-slate-500 block font-mono">${a.actorUid}</span>
            </td>
            <td class="p-3 font-bold text-purple-900">${a.action}</td>
            <td class="p-3 font-mono text-[11px] text-slate-600">${a.resource}</td>
            <td class="p-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-black ${
                a.status === 'ALLOWED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }">${a.status}</span>
            </td>
            <td class="p-3 text-[11px] text-slate-600">${a.details}</td>
          </tr>
        `).join('');
      }

      // 3. Render Clinician Queue
      const clinQueue = document.getElementById('admClinicianQueueList');
      if (clinQueue) {
        clinQueue.innerHTML = `
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-sky-700 text-white flex items-center justify-center text-sm font-bold">🩺</span>
                <div>
                  <h4 class="font-bold text-sm text-slate-900">Dr. Rajesh Verma, MD</h4>
                  <p class="text-[11px] text-slate-500 font-mono">Medical License: #MC-2024-884 (State Neurological Council) • MFA: Enforced</p>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200">
                <i class="fa-solid fa-check"></i> Verified Clinician
              </span>
            </div>
          </div>
        `;
      }
    }

    function handleAdminProvisionRole() {
      const uidInput = document.getElementById('admAssignUid');
      const roleSelect = document.getElementById('admAssignRole');
      const uid = (uidInput?.value || '').trim();
      const role = roleSelect?.value || 'patient';
      if (!uid) {
        alert('Please enter a user UID or email address.');
        return;
      }
      adminUsers.push({
        uid: uid,
        name: uid.split('@')[0],
        email: uid.includes('@') ? uid : `${uid}@saksham.health`,
        role: role,
        mfa: 'Standard Auth',
        consent: 'Provisioned by Admin'
      });
      adminAuditLogs.unshift({
        id: 'aud-' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        actorUid: 'usr-admin-system',
        actorRole: 'administrator',
        action: 'ROLE_PROVISIONED',
        resource: `user:${uid} (${role})`,
        status: 'ALLOWED',
        details: `Privileged role '${role}' granted by administrator.`
      });
      if (uidInput) uidInput.value = '';
      renderAdminPortal();
      playAudioChime('bell');
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`Role '${role}' provisioned successfully for ${uid}`, 'success');
      }
    }

    function handleAdminRevokeUser(uid) {
      adminUsers = adminUsers.filter(u => u.uid !== uid);
      adminAuditLogs.unshift({
        id: 'aud-' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        actorUid: 'usr-admin-system',
        actorRole: 'administrator',
        action: 'ROLE_REVOKED',
        resource: `user:${uid}`,
        status: 'ALLOWED',
        details: 'Role privileges revoked by administrator.'
      });
      renderAdminPortal();
      playAudioChime('chime');
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`Privileges revoked for user ${uid}`, 'info');
      }
    }

    function handleEmergencySessionRevoke() {
      const input = document.getElementById('admRevokeUidInput');
      const uid = (input?.value || '').trim();
      if (!uid) { alert('Please enter target UID to revoke sessions.'); return; }
      adminAuditLogs.unshift({
        id: 'aud-' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        actorUid: 'usr-admin-system',
        actorRole: 'administrator',
        action: 'EMERGENCY_SESSION_REVOKED',
        resource: `sessions:${uid}`,
        status: 'ALLOWED',
        details: 'All active tokens and refresh tokens invalidated.'
      });
      if (input) input.value = '';
      renderAdminPortal();
      playAudioChime('bell');
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`All active sessions revoked for ${uid}`, 'success');
      }
    }

    function refreshAdminAuditLogs() {
      adminAuditLogs.unshift({
        id: 'aud-' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        actorUid: 'usr-admin-system',
        actorRole: 'administrator',
        action: 'AUDIT_LOG_REFRESH',
        resource: 'audit_logs',
        status: 'ALLOWED',
        details: 'Administrator inspected cryptographic access trail.'
      });
      renderAdminPortal();
      playAudioChime('chime');
    }

    function exportAuditTrailCsv() {
      const rows = [
        ['Timestamp', 'Actor UID', 'Actor Role', 'Action', 'Resource', 'Status', 'Details'],
        ...adminAuditLogs.map(a => [a.timestamp, a.actorUid, a.actorRole, a.action, a.resource, a.status, a.details])
      ];
      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saksham_security_audit_${Date.now()}.csv`;
      a.click();
    }

    let voiceoverEnabled = true;
    function toggleVoiceover() {
      voiceoverEnabled = !voiceoverEnabled;
      const icon = document.getElementById('iconVoiceover');
      const txt = document.getElementById('txtVoiceover');
      if (voiceoverEnabled) {
        if (icon) icon.className = "fa-solid fa-volume-high text-[#9FC57C]";
        if (txt) txt.innerText = "Voice: On";
        if (typeof speakText === 'function') speakText("Spoken voiceover enabled.");
      } else {
        if (icon) icon.className = "fa-solid fa-volume-xmark text-slate-400";
        if (txt) txt.innerText = "Voice: Off";
        if (typeof stopSpeaking === 'function') stopSpeaking();
      }
    }

    // ==================== AGE-ADAPTIVE 3-TIER FRAMEWORK (ANBESHAN 2026 / PRIORITY 4) ====================
    // Central Age-Group Identities:
    // • YOUTH: Age 13–24 (inclusive) — Gamified, Dopamine Feed, XP, Streaks
    // • ADULT: Age 25–59 (inclusive) — Balanced, Clean, Low Cognitive Overload, Mind Refresh
    // • ELDERLY: Age 60+ (inclusive) — Large readable text, 56px+ touch targets, single-task hero, gentle guidance
    // Users under 13 are outside the supported range. Age identity is derived from user DOB and remains FIXED.
    
    function resolveInitialAgeTier() {
      try {
        var userDob = (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.getCurrentUserDob === 'function')
          ? window.SakshamPersonalisation.getCurrentUserDob()
          : (localStorage.getItem('saksham_user_dob') || '1958-05-15');
        if (window.resolveAgeTier) {
          var res = window.resolveAgeTier(userDob);
          if (res.supported && res.tier) return res.tier;
        }
      } catch (e) {}
      return localStorage.getItem('saksham_age_tier') || 'senior';
    }

    window.currentAgeTier = resolveInitialAgeTier();
    window.currentAgeMode = window.currentAgeTier === 'senior' ? 'senior' : 'dynamic';

    function setAgeTier(tier, announce = false, source = 'system') {
      const validTier = ['youth', 'adult', 'senior'].includes(tier) ? tier : 'senior';
      
      // If invoked manually from an arbitrary toggle without changing DOB:
      if (source !== 'dob' && source !== 'system') {
        const userDob = localStorage.getItem('saksham_user_dob') || (window.SakshamPersonalisation ? window.SakshamPersonalisation.getCurrentUserDob() : null);
        if (userDob && window.resolveAgeTier) {
          const res = window.resolveAgeTier(userDob);
          if (res.supported && res.tier !== validTier) {
            if (typeof showSakshamToast === 'function') {
              showSakshamToast('Age identity is locked to your Date of Birth (' + res.label + '). Click Edit DOB to change it.', 'warning');
            }
            if (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.openDobModal === 'function') {
              window.SakshamPersonalisation.openDobModal();
            }
            return;
          }
        }
      }

      window.currentAgeTier = validTier;
      window.currentAgeMode = validTier === 'senior' ? 'senior' : 'dynamic';
      if (typeof state !== 'undefined') {
        state.ageTier = validTier;
      }
      try {
        localStorage.setItem('saksham_age_tier', validTier);
        localStorage.setItem('saksham_age_mode', window.currentAgeMode);
        const activeStr = localStorage.getItem('saksham_active_user');
        if (activeStr) {
          const u = JSON.parse(activeStr);
          u.ageTier = validTier;
          u.interfaceProfile = validTier;
          localStorage.setItem('saksham_active_user', JSON.stringify(u));
        }
      } catch(e) {}

      // 1. Update Body CSS classes
      document.body.classList.remove('tier-youth', 'tier-adult', 'tier-senior', 'mode-senior-gentle', 'mode-dynamic-gamified');
      document.body.classList.add(`tier-${validTier}`);
      if (validTier === 'senior') {
        document.body.classList.add('mode-senior-gentle');
      } else {
        document.body.classList.add('mode-dynamic-gamified');
      }

      // 2. Render Life-Stage Demographic Experience Banner at the top of Patient Portal
      renderDemographicExperienceBanner(validTier);

      // 3. Highlight cards in onboarding modal if open
      if (window.SakshamOnboarding && typeof window.SakshamOnboarding.highlightSelectedAgeTierCard === 'function') {
        try { window.SakshamOnboarding.highlightSelectedAgeTierCard(validTier); } catch(e) {}
      }

      // 4. Update Mind Clinic HUD for Active Demographic Tier
      updateMindClinicHud(validTier);

      // 5. Update Daily Routine Greeting & Tasks List
      const greeting = document.getElementById('lblGreeting');
      if (greeting) {
        if (validTier === 'youth') {
          greeting.innerHTML = "What's up, Kalyani! ⚡ Level 2 Mind Champ ready to crush drills?";
        } else if (validTier === 'adult') {
          greeting.innerHTML = "Good Morning, Kalyani. 🌿 Mindful pacing for a calm, balanced day.";
        } else {
          greeting.innerHTML = "Good Morning, Dear Kalyani ji! 🌸 You are safe and doing wonderfully.";
        }
      }

      // 6. Trigger Deep Age-Adaptive Structural Layout Transformation
      if (typeof renderDynamicRoutineView === 'function') {
        try { renderDynamicRoutineView(validTier); } catch(e) { console.error(e); }
      }

      if (typeof renderActiveCueCard === 'function') {
        try { renderActiveCueCard(); } catch(e) {}
      }

      if (typeof renderDirectTasksList === 'function') {
        try { renderDirectTasksList(); } catch(e) {}
      }

      // 7. Adjust Audio Feedback Speed
      if (window.SakshamAudio) {
        window.SakshamAudio.speechRate = (validTier === 'youth') ? 1.08 : ((validTier === 'adult') ? 1.0 : 0.82);
      }

      // 8. Visual Toast Feedback (Saved immediately without reload)
      if (typeof showSakshamToast === 'function') {
        const tierToasts = {
          youth: '⚡ Youth Interface active (13–24: XP & Streaks enabled)',
          adult: '🌿 Adult Interface active (25–59: Calm mindful pacing)',
          senior: '🌸 Elderly Interface active (60+: Gentle guidance & larger touch)'
        };
        showSakshamToast(tierToasts[validTier] || 'Interface updated', 'success');
      }

      // 9. Spoken Confirmation
      if (announce && typeof speakText === 'function') {
        if (validTier === 'youth') {
          speakText("Youth mode active! Dopamine streaks and XP challenges enabled.");
        } else if (validTier === 'adult') {
          speakText("Adult mode active. Clean, calm efficiency with low cognitive overload.");
        } else {
          speakText("Elderly gentle mode active. Warm, comforting guidance with large touch buttons.");
        }
      }
    }

    function renderDemographicExperienceBanner(tier) {
      const oldBanner = document.getElementById('demographicExperienceBanner');
      if (oldBanner && typeof oldBanner.remove === 'function') {
        oldBanner.remove();
      } else if (oldBanner && oldBanner.parentNode) {
        oldBanner.parentNode.removeChild(oldBanner);
      }

      const tierLabels = {
        youth: '⚡ Youth (13–24)',
        adult: '💼 Adult (25–59)',
        senior: '🌸 Elderly (60+)'
      };

      const menuTierLabel = document.getElementById('menuActiveTierLabel');
      if (menuTierLabel) {
        menuTierLabel.innerText = tierLabels[tier] || tier;
      }

      // Update menu banner display
      const menuLockedIdentityBadge = document.getElementById('menuLockedIdentityBadge');
      if (menuLockedIdentityBadge) {
        menuLockedIdentityBadge.innerText = tierLabels[tier] || tier;
      }

      const pill = document.getElementById('routineTierPill');
      const extra = document.getElementById('routineTierExtra');
      const btn = document.getElementById('btnTierQuickAction');
      if (!pill) return;

      if (tier === 'youth') {
        pill.className = "px-2.5 py-1 rounded-xl text-xs font-black bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm";
        pill.innerHTML = `⚡ Youth (13–24)`;
        if (extra) {
          extra.innerHTML = `4-Day Streak 🔥 (<span id="youthScoreVal">350</span> XP)`;
          extra.className = "text-xs font-bold text-emerald-200 px-1 hidden sm:inline";
        }
        if (btn) {
          btn.className = "px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1";
          btn.innerHTML = `<i class="fa-solid fa-bolt"></i> +50 XP`;
          btn.onclick = () => {
            if (typeof awardGameScore === 'function') awardGameScore(50, 'Quick Brain Sprint Bonus');
            if (typeof confetti === 'function') confetti({ particleCount: 50, spread: 60 });
            if (typeof playAudioChime === 'function') playAudioChime('fanfare');
          };
        }
      } else if (tier === 'adult') {
        pill.className = "px-2.5 py-1 rounded-xl text-xs font-black bg-teal-200 text-teal-950 flex items-center gap-1 shadow-sm";
        pill.innerHTML = `💼 Adult (25–59)`;
        if (extra) {
          extra.innerHTML = `Mindful Pacing &amp; Low Noise`;
          extra.className = "text-xs font-bold text-teal-100 px-1 hidden sm:inline";
        }
        if (btn) {
          btn.className = "px-3 py-1 bg-teal-700 hover:bg-teal-600 text-white border border-teal-400/40 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1";
          btn.innerHTML = `<i class="fa-solid fa-lungs"></i> 2-Min Reset`;
          btn.onclick = () => {
            if (typeof triggerOverwhelmReset === 'function') triggerOverwhelmReset();
          };
        }
      } else {
        pill.className = "px-2.5 py-1 rounded-xl text-xs font-black bg-amber-200 text-amber-950 flex items-center gap-1 shadow-sm";
        pill.innerHTML = `🌸 Elderly (60+)`;
        if (extra) {
          extra.innerHTML = `Step-by-Step Care • Guided`;
          extra.className = "text-xs font-bold text-amber-100 px-1 hidden sm:inline";
        }
        if (btn) {
          btn.className = "px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-400/30 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1";
          btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Read Routine`;
          btn.onclick = () => {
            if (typeof readActiveTaskAloud === 'function') readActiveTaskAloud();
          };
        }
      }
    }

    function updateMindClinicHud(tier) {
      const hud = document.getElementById('mindClinicGamifiedHud');
      if (!hud) return;

      if (tier === 'youth') {
        hud.className = "bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 p-5 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 border border-indigo-500/40";
        hud.innerHTML = `
          <div class="flex items-center space-x-4">
            <div class="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-2xl font-black shadow-lg shadow-amber-500/30">
              <i class="fa-solid fa-trophy"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/40 text-amber-300 border border-indigo-400/30">
                  MIND CHAMP LEVEL 2
                </span>
                <span class="text-xs text-purple-200 font-medium">• Active Brain Training</span>
              </div>
              <h3 class="text-2xl font-black tracking-tight mt-0.5">
                <span id="txtGamifiedScore">350</span> <span class="text-sm font-bold text-amber-300">XP Points</span>
              </h3>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2.5 sm:gap-4">
            <div class="text-center px-3 py-1.5 bg-white/10 rounded-2xl border border-white/10">
              <span class="text-[10px] font-bold text-purple-200 block uppercase">Daily Streak</span>
              <span class="text-base font-black text-amber-300 flex items-center justify-center gap-1">
                🔥 <span id="txtGamifiedStreak">4 Days</span>
              </span>
            </div>
            <div class="text-center px-3 py-1.5 bg-white/10 rounded-2xl border border-white/10">
              <span class="text-[10px] font-bold text-purple-200 block uppercase">Drills Completed</span>
              <span class="text-base font-black text-emerald-300 flex items-center justify-center gap-1">
                ⭐ <span id="txtGamifiedDrills">2 / 3</span>
              </span>
            </div>
            <button onclick="awardGameScore(25, 'Daily Brain Bonus')" class="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer">
              + Claim Daily Bonus
            </button>
          </div>
        `;
      } else if (tier === 'adult') {
        hud.className = "bg-slate-900 p-5 rounded-3xl text-white shadow-md flex flex-col md:flex-row justify-between items-center gap-4 border border-sky-500/30";
        hud.innerHTML = `
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center text-xl font-black shadow-md">
              <i class="fa-solid fa-brain"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  Cognitive Balance Routine
                </span>
                <span class="text-xs text-slate-300 font-medium">• ~10 mins daily duration</span>
              </div>
              <h3 class="text-lg font-black tracking-tight mt-0.5 text-white">
                Quiet Focus Routine: <span class="text-sky-300 font-extrabold">3 of 5 Drills Complete (60%)</span>
              </h3>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-center px-3.5 py-1.5 bg-slate-800 rounded-xl border border-slate-700">
              <span class="text-[10px] font-bold text-slate-400 block uppercase">Consistency</span>
              <span class="text-sm font-black text-slate-200">4-Day Routine</span>
            </div>
            <div class="w-32 bg-slate-800 rounded-full h-2.5 border border-slate-700 overflow-hidden">
              <div class="bg-sky-400 h-2.5 rounded-full" style="width: 60%"></div>
            </div>
          </div>
        `;
      } else {
        // Senior Tier: Ultra-accessible, child-friendly visual cues, zero-friction assist
        hud.className = "bg-emerald-950 p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 border-2 border-emerald-400/40";
        hud.innerHTML = `
          <div class="flex items-center space-x-4">
            <div class="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center text-2xl font-black shadow-md">
              <i class="fa-solid fa-leaf"></i>
            </div>
            <div>
              <span class="guidance-badge mb-1">
                <i class="fa-solid fa-circle-check"></i> Guided Senior Care
              </span>
              <h3 class="text-xl sm:text-2xl font-black tracking-tight mt-1 text-emerald-100">
                Gentle Brain Practice
              </h3>
              <p class="text-sm text-emerald-200 font-medium mt-0.5">
                Take all the time you need. No countdowns, timers, or scores.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="switchMiniGame(1); if(typeof speakText === 'function') speakText('Starting color sequence memory exercise. Look at the colors.');" class="guidance-halo px-5 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-2">
              <i class="fa-solid fa-circle-play text-base"></i>
              👉 Start First Exercise
            </button>
          </div>
        `;
      }
    }

    // ==================== "HI SAKSHAM" VOICE ASSISTANT WRAPPER ====================
    function openHiGeminiAssistant() {
      if (typeof window.openHiSakshamAssistant === 'function') {
        window.openHiSakshamAssistant(true);
      }
    }

    function closeHiGeminiAssistant() {
      if (typeof window.closeHiSakshamAssistant === 'function') {
        window.closeHiSakshamAssistant();
      }
    }

    function toggleHiGeminiListening() {
      if (typeof window.toggleHiSakshamListening === 'function') {
        window.toggleHiSakshamListening();
      }
    }

    function hiGeminiAction(actionType) {
      if (typeof window.hiSakshamAction === 'function') {
        window.hiSakshamAction(actionType);
      }
    }

    function cycleAgeTier() {
      if (typeof showSakshamToast === 'function') {
        showSakshamToast('Age identity is determined by your Date of Birth. Update your Date of Birth in Profile to change it.', 'warning');
      }
      if (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.openDobModal === 'function') {
        window.SakshamPersonalisation.openDobModal();
      }
      return window.currentAgeTier;
    }

    function setAgeMode(mode) {
      if (typeof showSakshamToast === 'function') {
        showSakshamToast('Age identity is determined by your Date of Birth. Update your Date of Birth in Profile to change it.', 'warning');
      }
      if (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.openDobModal === 'function') {
        window.SakshamPersonalisation.openDobModal();
      }
    }

    function toggleAgeMode() {
      if (typeof showSakshamToast === 'function') {
        showSakshamToast('Age identity is determined by your Date of Birth. Update your Date of Birth in Profile to change it.', 'warning');
      }
      if (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.openDobModal === 'function') {
        window.SakshamPersonalisation.openDobModal();
      }
    }

    // Safety fallback for confetti
    if (typeof window.confetti !== 'function') {
      window.confetti = function() { console.log('[Confetti celebration]'); };
    }

    window.setAgeTier = setAgeTier;
    window.cycleAgeTier = cycleAgeTier;
    window.setAgeMode = setAgeMode;
    window.toggleAgeMode = toggleAgeMode;
    window.openHiGeminiAssistant = openHiGeminiAssistant;
    window.closeHiGeminiAssistant = closeHiGeminiAssistant;
    window.toggleHiGeminiListening = toggleHiGeminiListening;
    window.hiGeminiAction = hiGeminiAction;

    window.switchAdminSubTab = switchAdminSubTab;
    window.renderAdminPortal = renderAdminPortal;
    window.handleAdminProvisionRole = handleAdminProvisionRole;
    window.handleAdminRevokeUser = handleAdminRevokeUser;
    window.handleEmergencySessionRevoke = handleEmergencySessionRevoke;
    window.refreshAdminAuditLogs = refreshAdminAuditLogs;
    window.exportAuditTrailCsv = exportAuditTrailCsv;
    window.toggleVoiceover = toggleVoiceover;

    /* ==================== WINDOW INITIALIZATION ==================== */
    window.onload = function() {
      try { setAgeTier(window.currentAgeTier, false); } catch(e) { console.log(e); }
      try { loadPersistedTasks(); } catch(e) { console.log(e); }
      try { if (typeof loadPersistedCareNotes === 'function') loadPersistedCareNotes(); } catch(e) { console.log(e); }
      try { updateNotificationButtonUI(); } catch(e) { console.log(e); }
      try {
        const picker = document.getElementById('globalCalendarPicker');
        if (picker) picker.value = state.selectedDate;
        updateHeaderDateDisplay(state.selectedDate);
      } catch(e) { console.log(e); }
      try { checkAuthGatewayStatus(); } catch(e) { console.log(e); }
      try { _initFirebaseAuthListener(); } catch(e) { console.log(e); }
      // Guarantee patient portal container and tabs are rendered and unhidden
      try {
        const portalPatient = document.getElementById('portal-patient-container');
        if (portalPatient) {
          portalPatient.classList.remove('hidden');
          portalPatient.style.display = '';
        }
        const navPatient = document.getElementById('nav-patient');
        if (navPatient && (!state.role || state.role === 'patient')) {
          navPatient.classList.remove('hidden');
          navPatient.classList.add('md:block');
          navPatient.style.display = '';
        }
        if (typeof switchTab === 'function') {
          const hashTab = (window.location.hash || '').replace('#', '').trim();
          const savedTab = localStorage.getItem('saksham_active_tab') || localStorage.getItem('saksham_patient_active_tab');
          const initialTab = hashTab || savedTab || 'routine';
          switchTab(initialTab);
        }
      } catch(e) { console.log(e); }
      try {
        if (typeof initCueIndexToNextPending === 'function') {
          initCueIndexToNextPending();
        }
      } catch(e) { console.log(e); }
      try { switchRoutineMiniTab('cues'); } catch(e) { console.log(e); }
      try {
        if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
        if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
      } catch(e) { console.log(e); }
      try { renderBadgesUI(); } catch(e) { console.log(e); }
      try { renderLovedOnes(); } catch(e) { console.log(e); }
      try { renderArticles(); } catch(e) { console.log(e); }
      try { renderMaze(); } catch(e) { console.log(e); }
      try { renderMathSprintQuestion(); } catch(e) { console.log(e); }
      try { calculatePersonalWaterTarget(); } catch(e) { console.log(e); }
      try { initCharts(); } catch(e) { console.log(e); }
      try { renderCaregiverOverviewTelemetry(); } catch(e) { console.log(e); }
      try { if (typeof renderCareTeamWorkspace === 'function') renderCareTeamWorkspace(); } catch(e) { console.log(e); }
      try { if (typeof renderPatientCareTeamMessages === 'function') renderPatientCareTeamMessages(); } catch(e) { console.log(e); }
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

