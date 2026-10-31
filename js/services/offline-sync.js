/* ======================================================================= */
/* SAKSHAM 2.0 — OFFLINE-FIRST SYNCHRONIZATION QUEUE                       */
/* Implements Module 5: Offline-First Operation                            */
/* ======================================================================= */

(function(window) {
  'use strict';

  const QUEUE_KEY = 'saksham_offline_sync_queue';
  const MAX_RETRIES = 5;

  let queue = [];
  let isProcessing = false;
  let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const listeners = [];

  function loadQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (raw) queue = JSON.parse(raw);
    } catch (e) {
      queue = [];
    }
  }

  function saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {}
  }

  function notify() {
    const stats = getStats();
    listeners.forEach(function(l) { l(stats); });
    updateOfflineBannerUI(stats);
  }

  function getStats() {
    const pending = queue.filter(function(op) { return op.status === 'pending' || op.status === 'syncing'; }).length;
    const failed = queue.filter(function(op) { return op.status === 'failed'; }).length;
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : isOnline,
      pendingCount: pending,
      failedCount: failed
    };
  }

  function subscribe(fn) {
    listeners.push(fn);
    fn(getStats());
    return function() {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function enqueueOperation(userId, recordType, operationType, data, customId) {
    loadQueue();
    const operationId = customId || ('sync_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));

    const existingIdx = queue.findIndex(function(op) {
      return op.operationId === operationId && op.userId === userId;
    });

    const op = {
      operationId: operationId,
      userId: userId || 'default',
      recordType: recordType,
      operationType: operationType,
      data: data,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
      maxRetries: MAX_RETRIES
    };

    if (existingIdx >= 0) {
      queue[existingIdx] = op;
    } else {
      queue.push(op);
    }

    saveQueue();
    notify();

    if (navigator.onLine) {
      processQueue();
    }
    return op;
  }

  async function processQueue() {
    if (isProcessing || !navigator.onLine) return;
    isProcessing = true;
    loadQueue();

    try {
      const pending = queue.filter(function(op) { return op.status === 'pending'; });

      for (let i = 0; i < pending.length; i++) {
        const op = pending[i];
        op.status = 'syncing';
        saveQueue();
        notify();

        try {
          // If Firestore is connected, forward to dbService
          if (window.dbService && typeof window.dbService.syncQueuedRecord === 'function') {
            await window.dbService.syncQueuedRecord(op);
          } else {
            // Local fallback delay simulation
            await new Promise(function(resolve) { setTimeout(resolve, 80); });
          }
          op.status = 'synced';

          // Mark synced flag in trial state
          if (op.recordType === 'difficulty' && op.userId && op.data) {
            try {
              const recId = (op.data && op.data.id) || op.operationId;
              const primaryKey = (window.SakshamPersonalization && typeof window.SakshamPersonalization.getStorageKey === 'function')
                ? window.SakshamPersonalization.getStorageKey(op.userId)
                : ('saksham_trial_' + (op.userId || 'default'));
              const targetKeys = [primaryKey, 'saksham_trial_' + op.userId, 'saksham_personalisation_trial_' + op.userId];
              
              for (let k = 0; k < targetKeys.length; k++) {
                const kName = targetKeys[k];
                const raw = localStorage.getItem(kName);
                if (raw) {
                  const parsed = JSON.parse(raw);
                  if (Array.isArray(parsed.difficultiesRecorded)) {
                    let updated = false;
                    parsed.difficultiesRecorded = parsed.difficultiesRecorded.map(function(d) {
                      if (d.id === recId) {
                        updated = true;
                        return Object.assign({}, d, { synced: true });
                      }
                      return d;
                    });
                    if (updated) {
                      localStorage.setItem(kName, JSON.stringify(parsed));
                      // If found in legacy key, ensure migrated to primaryKey
                      if (kName !== primaryKey) {
                        localStorage.setItem(primaryKey, JSON.stringify(parsed));
                      }
                    }
                  }
                }
              }
            } catch (e) {
              console.warn('[Saksham Sync] Note updating local trial record:', e);
            }
          }
        } catch (err) {
          op.retryCount = (op.retryCount || 0) + 1;
          op.lastError = err && err.message ? err.message : String(err);
          if (op.retryCount >= op.maxRetries) {
            op.status = 'failed';
          } else {
            op.status = 'pending';
          }
        }
        saveQueue();
        notify();
      }

      // Cleanup synced items after 1 hour
      const oneHourAgo = Date.now() - 3600000;
      queue = queue.filter(function(op) {
        return op.status !== 'synced' || new Date(op.timestamp).getTime() > oneHourAgo;
      });
      saveQueue();
      notify();
    } finally {
      isProcessing = false;
    }
  }

  function retryAll(userId) {
    loadQueue();
    queue = queue.map(function(op) {
      if ((!userId || op.userId === userId) && op.status === 'failed') {
        op.status = 'pending';
        op.retryCount = 0;
      }
      return op;
    });
    saveQueue();
    notify();
    processQueue();
  }

  function updateOfflineBannerUI(stats) {
    const indicator = document.getElementById('offline-indicator');
    const syncPill = document.getElementById('syncQueueStatusPill');

    if (indicator) {
      if (!stats.isOnline) {
        indicator.classList.remove('hidden');
        indicator.innerHTML = '<i class="fa-solid fa-cloud-slash"></i> Offline (Local Mode)';
        indicator.className = 'text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-400/40 flex items-center gap-1.5';
      } else {
        indicator.classList.add('hidden');
      }
    }

    if (syncPill) {
      if (stats.pendingCount > 0) {
        syncPill.classList.remove('hidden');
        syncPill.innerText = 'Syncing ' + stats.pendingCount + '…';
        syncPill.className = 'text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold border border-teal-400/40 animate-pulse';
      } else if (stats.failedCount > 0) {
        syncPill.classList.remove('hidden');
        syncPill.innerText = stats.failedCount + ' sync failed (tap to retry)';
        syncPill.className = 'text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-400/40 cursor-pointer';
        syncPill.onclick = function() { retryAll(); };
      } else {
        syncPill.classList.add('hidden');
      }
    }
  }

  function getOfflineAIAssistanceResponse(query, taskTitle) {
    const q = (query || '').toLowerCase();
    if (q.indexOf('tea') !== -1 || q.indexOf('drink') !== -1 || q.indexOf('water') !== -1) {
      return "Offline Guidance: Sip warm herbal tea or water slowly. Taking warm fluids relaxes stomach muscles and supports smooth medication absorption.";
    }
    if (q.indexOf('dress') !== -1 || q.indexOf('button') !== -1 || q.indexOf('shirt') !== -1) {
      return "Offline Guidance: Lay your shirt flat across your lap first. Align collar smoothly, then pinch the top button calmly before working down.";
    }
    if (q.indexOf('walk') !== -1 || q.indexOf('freeze') !== -1 || q.indexOf('stuck') !== -1) {
      return "Offline Guidance: Stand tall and look forward. Take a deep breath, rock gently side to side, then step over an imaginary line on the floor.";
    }
    if (taskTitle) {
      return "Offline Guidance for \"" + taskTitle + "\": Focus on one calm step at a time. Mark each step as you complete it and take your time.";
    }
    return "Offline Guidance: You are in offline mode. Your daily routine, task instructions, and memory flashcards are saved locally on this device.";
  }

  // Auto-init
  loadQueue();
  if (typeof window !== 'undefined') {
    window.addEventListener('online', function() {
      isOnline = true;
      notify();
      processQueue();
    });
    window.addEventListener('offline', function() {
      isOnline = false;
      notify();
    });
  }

  window.offlineSyncService = {
    getStats: getStats,
    subscribe: subscribe,
    enqueueOperation: enqueueOperation,
    processQueue: processQueue,
    retryAll: retryAll,
    getQueue: function(uid) {
      loadQueue();
      return uid ? queue.filter(function(op) { return op.userId === uid; }) : queue.slice();
    },
    getOfflineAIAssistanceResponse: getOfflineAIAssistanceResponse
  };
  window.offlineSync = window.offlineSyncService;

})(typeof window !== 'undefined' ? window : this);
