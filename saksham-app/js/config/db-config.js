/* ======================================================================= */
/* SAKSHAM FIREBASE DATABASE CONFIGURATION & RUNTIME MANAGER               */
/* ======================================================================= */

window.SakshamDbConfig = (function() {
  const LOCAL_STORAGE_KEY_FIREBASE = 'saksham_firebase_config';

  // User's configured Firebase project for Saksham
  const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyACmlxg7M-00Q7FQl_6ss6Vdal-XUtsT9c",
    authDomain: "saksham-2b5f0.firebaseapp.com",
    projectId: "saksham-2b5f0",
    storageBucket: "saksham-2b5f0.firebasestorage.app",
    messagingSenderId: "863700387333",
    appId: "1:863700387333:web:670b0f6a02719d51d73e6c"
  };

  function getConfig() {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_FIREBASE);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch(e) {}
    return DEFAULT_FIREBASE_CONFIG;
  }

  function setConfig(newConfig) {
    if (newConfig && typeof newConfig === 'object') {
      localStorage.setItem(LOCAL_STORAGE_KEY_FIREBASE, JSON.stringify(newConfig));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_FIREBASE);
    }
    if (window.dbService && typeof window.dbService.init === 'function') {
      window.dbService.init();
    }
  }

  function resetToDefault() {
    localStorage.removeItem(LOCAL_STORAGE_KEY_FIREBASE);
    if (window.dbService && typeof window.dbService.init === 'function') {
      window.dbService.init();
    }
  }

  function isConfigured() {
    const cfg = getConfig();
    return Boolean(cfg && cfg.projectId && cfg.apiKey);
  }

  return {
    getConfig,
    setConfig,
    resetToDefault,
    isConfigured,
    DEFAULT_CONFIG: DEFAULT_FIREBASE_CONFIG
  };
})();
