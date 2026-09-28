/* ======================================================================= */
/* SAKSHAM DATABASE CONFIGURATION & RUNTIME CONNECTION MANAGER             */
/* ======================================================================= */

window.SakshamDbConfig = (function() {
  const LOCAL_STORAGE_KEY_URL = 'saksham_supabase_url';
  const LOCAL_STORAGE_KEY_KEY = 'saksham_supabase_anon_key';

  // Read environment or runtime injected config if present
  const defaultUrl = (window.SAKSHAM_DB_CONFIG && window.SAKSHAM_DB_CONFIG.url) || '';
  const defaultKey = (window.SAKSHAM_DB_CONFIG && window.SAKSHAM_DB_CONFIG.anonKey) || '';

  function getUrl() {
    return localStorage.getItem(LOCAL_STORAGE_KEY_URL) || defaultUrl;
  }

  function getAnonKey() {
    return localStorage.getItem(LOCAL_STORAGE_KEY_KEY) || defaultKey;
  }

  function setCredentials(url, key) {
    if (url) localStorage.setItem(LOCAL_STORAGE_KEY_URL, url.trim());
    else localStorage.removeItem(LOCAL_STORAGE_KEY_URL);

    if (key) localStorage.setItem(LOCAL_STORAGE_KEY_KEY, key.trim());
    else localStorage.removeItem(LOCAL_STORAGE_KEY_KEY);

    if (window.dbService && typeof window.dbService.init === 'function') {
      window.dbService.init();
    }
  }

  function clearCredentials() {
    localStorage.removeItem(LOCAL_STORAGE_KEY_URL);
    localStorage.removeItem(LOCAL_STORAGE_KEY_KEY);
    if (window.dbService && typeof window.dbService.init === 'function') {
      window.dbService.init();
    }
  }

  function isConfigured() {
    const url = getUrl();
    const key = getAnonKey();
    return Boolean(url && key && url.startsWith('http'));
  }

  return {
    getUrl,
    getAnonKey,
    setCredentials,
    clearCredentials,
    isConfigured
  };
})();
