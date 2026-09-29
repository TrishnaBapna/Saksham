/* ======================================================================= */
/* SAKSHAM SAFEPATH: REAL-TIME PATIENT GPS & GEOFENCE SAFETY SYSTEM        */
/* Location-aware SOS, privacy-first throttling & Leaflet OpenStreetMap    */
/* ======================================================================= */

window.SakshamSafePath = (function() {
  const STORAGE_KEY_PATIENT_LOC = 'saksham_patient_gps_location';
  const STORAGE_KEY_HOME_BASE = 'saksham_home_base_location';
  const STORAGE_KEY_GEOFENCE_RADIUS = 'saksham_geofence_radius';
  const STORAGE_KEY_BREADCRUMBS = 'saksham_gps_breadcrumbs';
  const STORAGE_KEY_LOCATION_SHARING = 'saksham_location_sharing_active';

  // Default Safe Zone: Home Base (Mumbai Bandra West, or calibrated dynamically)
  let homeBase = {
    lat: 19.0596,
    lng: 72.8295,
    name: "Kalyani's Residence (Home Base)"
  };

  let geofenceRadius = 500; // in meters (default 500m)
  let currentPatientLoc = {
    lat: 19.0596,
    lng: 72.8295,
    accuracy: 12,
    speed: 0,
    heading: 0,
    timestamp: Date.now(),
    isRealGps: false,
    address: "Bandra West, Mumbai, Maharashtra",
    distanceMeters: 0,
    isInsideGeofence: true
  };

  let breadcrumbs = [];
  let watchId = null;
  let isSharingActive = false;
  let isSosMode = false;
  let activeSosEvent = null;
  let sosListenerUnsubscribe = null;

  // Privacy & battery update throttling
  let lastFirestoreSyncTime = 0;
  let lastSyncCoords = { lat: null, lng: null };
  const NORMAL_SYNC_INTERVAL_MS = 20000; // 20 seconds in normal mode
  const MIN_SIGNIFICANT_MOVEMENT_METERS = 15; // 15 meters

  // Simulation state
  let isSimulating = false;
  let simulationInterval = null;
  let simulationStep = 0;

  // Leaflet Map objects
  let leafletMap = null;
  let patientMarker = null;
  let accuracyCircle = null;
  let homeMarker = null;
  let geofenceCircle = null;
  let breadcrumbsPolyline = null;
  let isMapInitialized = false;

  /* ======================================================================= */
  /* 1. INITIALIZATION & SESSION RESTORATION                                 */
  /* ======================================================================= */

  function init() {
    loadStoredData();
    setupStorageEventListener();
    setupSosCloudListener();

    // Check if user has active consent for location sharing
    const active = getActiveUser();
    if (active && active.locationSharing) {
      isSharingActive = true;
      startPatientBroadcaster();
    } else {
      isSharingActive = false;
    }

    updatePatientSafePathWidget();
    updateCaregiverGpsUI();
  }

  function getActiveUser() {
    try {
      const activeStr = localStorage.getItem('saksham_active_user');
      return activeStr ? JSON.parse(activeStr) : null;
    } catch (e) {
      return null;
    }
  }

  function loadStoredData() {
    try {
      const storedHome = localStorage.getItem(STORAGE_KEY_HOME_BASE);
      if (storedHome) homeBase = JSON.parse(storedHome);

      const storedRadius = localStorage.getItem(STORAGE_KEY_GEOFENCE_RADIUS);
      if (storedRadius) geofenceRadius = parseInt(storedRadius, 10) || 500;

      const storedLoc = localStorage.getItem(STORAGE_KEY_PATIENT_LOC);
      if (storedLoc) {
        currentPatientLoc = JSON.parse(storedLoc);
      } else {
        currentPatientLoc.lat = homeBase.lat;
        currentPatientLoc.lng = homeBase.lng;
      }

      const storedCrumbs = localStorage.getItem(STORAGE_KEY_BREADCRUMBS);
      if (storedCrumbs) breadcrumbs = JSON.parse(storedCrumbs);

      const storedSharing = localStorage.getItem(STORAGE_KEY_LOCATION_SHARING);
      if (storedSharing !== null) isSharingActive = storedSharing === 'true';
    } catch (e) {
      console.warn('[Saksham SafePath] Storage load notice:', e);
    }
  }

  function saveStoredData() {
    try {
      localStorage.setItem(STORAGE_KEY_HOME_BASE, JSON.stringify(homeBase));
      localStorage.setItem(STORAGE_KEY_GEOFENCE_RADIUS, String(geofenceRadius));
      localStorage.setItem(STORAGE_KEY_PATIENT_LOC, JSON.stringify(currentPatientLoc));
      localStorage.setItem(STORAGE_KEY_BREADCRUMBS, JSON.stringify(breadcrumbs.slice(-100)));
      localStorage.setItem(STORAGE_KEY_LOCATION_SHARING, String(isSharingActive));
    } catch (e) {}
  }

  function setupStorageEventListener() {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY_PATIENT_LOC && event.newValue) {
          try {
            const newLoc = JSON.parse(event.newValue);
            applyNewLocation(newLoc, false);
          } catch (e) {}
        }
      });

      window.addEventListener('saksham:gps-update', (event) => {
        if (event.detail && !event.detail._self) {
          applyNewLocation(event.detail, false);
        }
      });
    }
  }

  /* ======================================================================= */
  /* 2. CONSENT-GATED GEOLOCATION & PRIVACY THROTTLING                       */
  /* ======================================================================= */

  function startSharing() {
    if (!('geolocation' in navigator)) {
      alert("Geolocation is not supported by your current browser.");
      return;
    }

    isSharingActive = true;
    saveStoredData();

    // Update active user profile
    const active = getActiveUser();
    if (active) {
      active.locationSharing = true;
      localStorage.setItem('saksham_active_user', JSON.stringify(active));
      if (window.firebase && firebase.firestore && (active.firebaseUid || active.id)) {
        try {
          firebase.firestore().collection('users').doc(active.firebaseUid || active.id).set({
            locationSharing: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (e) {}
      }
    }

    startPatientBroadcaster();
    updatePatientSafePathWidget();
    try { if (window.playAudioChime) playAudioChime('chime'); } catch (e) {}
  }

  function stopSharing() {
    isSharingActive = false;
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    saveStoredData();

    // Update active user profile
    const active = getActiveUser();
    if (active) {
      active.locationSharing = false;
      localStorage.setItem('saksham_active_user', JSON.stringify(active));
      if (window.firebase && firebase.firestore && (active.firebaseUid || active.id)) {
        try {
          firebase.firestore().collection('users').doc(active.firebaseUid || active.id).set({
            locationSharing: false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (e) {}
      }
    }

    updatePatientSafePathWidget();
    updateCaregiverGpsUI();
    try { if (window.playAudioChime) playAudioChime('chime'); } catch (e) {}
  }

  function startPatientBroadcaster() {
    if (!('geolocation' in navigator)) return;

    // Only actual patient accounts should broadcast geolocation coordinates
    const active = getActiveUser();
    if (active && active.role && active.role !== 'patient') {
      return;
    }

    // Single high-accuracy calibration
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleRawPosition(pos, true);
      },
      (err) => {
        console.log('[Saksham SafePath] Position notice:', err.message);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );

    // Continuous watchPosition for live movement
    try {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          handleRawPosition(pos, false);
        },
        (err) => {
          console.warn('[Saksham SafePath] watchPosition notice:', err.message);
          updateGpsStatusBadge('error', 'GPS Searching');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 15000
        }
      );
    } catch (err) {
      console.warn('[Saksham SafePath] watchPosition error:', err);
    }
  }

  function handleRawPosition(pos, isInitial = false) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = Math.round(pos.coords.accuracy || 10);
    const speed = pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6 * 10) / 10 : 0;
    const heading = Math.round(pos.coords.heading || 0);

    // Initial home base calibration if none exists
    if (isInitial && !localStorage.getItem(STORAGE_KEY_HOME_BASE)) {
      homeBase.lat = lat;
      homeBase.lng = lng;
      saveStoredData();
    }

    const locData = {
      lat,
      lng,
      accuracy,
      speed,
      heading,
      timestamp: Date.now(),
      isRealGps: true,
      address: currentPatientLoc.address || 'Locating street...'
    };

    applyNewLocation(locData, true);
    reverseGeocode(lat, lng);
  }

  /* ======================================================================= */
  /* 3. LOCATION PROCESSING, GEOFENCING & SYNC THROTTLING                    */
  /* ======================================================================= */

  function applyNewLocation(locData, broadcast = true) {
    currentPatientLoc = { ...currentPatientLoc, ...locData };

    // Distance to Home Base
    const distanceMeters = calculateHaversineDistance(
      locData.lat, locData.lng,
      homeBase.lat, homeBase.lng
    );
    currentPatientLoc.distanceMeters = Math.round(distanceMeters);
    currentPatientLoc.isInsideGeofence = distanceMeters <= geofenceRadius;

    // Add to breadcrumb trail if moved significantly (> 5m)
    const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
    if (!lastCrumb || calculateHaversineDistance(lastCrumb.lat, lastCrumb.lng, locData.lat, locData.lng) >= 5) {
      breadcrumbs.push({
        lat: locData.lat,
        lng: locData.lng,
        timestamp: locData.timestamp
      });
      if (breadcrumbs.length > 100) breadcrumbs.shift();
    }

    saveStoredData();

    if (broadcast) {
      window.dispatchEvent(new CustomEvent('saksham:gps-update', { detail: { ...currentPatientLoc, _self: true } }));
      checkThrottledFirestoreSync(currentPatientLoc);
    }

    updatePatientSafePathWidget();
    updateCaregiverGpsUI();
    updateLeafletMarkers();

    // Check geofence breach alert
    if (!currentPatientLoc.isInsideGeofence) {
      triggerGeofenceBreachAlert(currentPatientLoc.distanceMeters);
    } else {
      dismissGeofenceAlert();
    }
  }

  function checkThrottledFirestoreSync(loc) {
    const now = Date.now();
    const elapsed = now - lastFirestoreSyncTime;

    // Determine movement distance since last cloud sync
    let movedMeters = 0;
    if (lastSyncCoords.lat !== null && lastSyncCoords.lng !== null) {
      movedMeters = calculateHaversineDistance(lastSyncCoords.lat, lastSyncCoords.lng, loc.lat, loc.lng);
    } else {
      movedMeters = 999;
    }

    // Sync condition: SOS mode OR >= 20 seconds elapsed OR moved >= 15 meters
    if (isSosMode || elapsed >= NORMAL_SYNC_INTERVAL_MS || movedMeters >= MIN_SIGNIFICANT_MOVEMENT_METERS) {
      lastFirestoreSyncTime = now;
      lastSyncCoords = { lat: loc.lat, lng: loc.lng };
      syncLocationToFirestore(loc);
    }
  }

  async function syncLocationToFirestore(loc) {
    try {
      if (window.firebase && firebase.firestore) {
        const active = getActiveUser();
        const uid = active ? (active.firebaseUid || active.id) : null;
        if (!uid) return;

        const db = firebase.firestore();

        // 1. Write current live position under /users/{uid}/location/current
        await db.collection('users').doc(uid).collection('location').doc('current').set({
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
          speed: loc.speed,
          heading: loc.heading,
          distanceMeters: loc.distanceMeters,
          isInsideGeofence: loc.isInsideGeofence,
          isRealGps: loc.isRealGps,
          address: loc.address,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // 2. Append history point under /users/{uid}/locations/{locationId}
        const locId = 'loc_' + Date.now();
        await db.collection('users').doc(uid).collection('locations').doc(locId).set({
          latitude: loc.lat,
          longitude: loc.lng,
          accuracy: loc.accuracy,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (err) {
      // Non-critical background sync error
    }
  }

  function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  let lastGeocodeTime = 0;
  let lastGeocodeCoords = { lat: null, lng: null };
  const geocodeCache = new Map();

  async function reverseGeocode(lat, lng) {
    if (!lat || !lng) return;
    const now = Date.now();

    // Cache key grouped by ~100m grid
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (geocodeCache.has(cacheKey)) {
      currentPatientLoc.address = geocodeCache.get(cacheKey);
      return;
    }

    // Throttle: avoid requesting Nominatim more than once every 60 seconds unless moved > 50 meters
    if (lastGeocodeCoords.lat !== null && lastGeocodeCoords.lng !== null) {
      const movedMeters = calculateHaversineDistance(lastGeocodeCoords.lat, lastGeocodeCoords.lng, lat, lng);
      if (movedMeters < 50 && (now - lastGeocodeTime < 60000)) {
        return;
      }
    }

    try {
      lastGeocodeTime = now;
      lastGeocodeCoords = { lat, lng };

      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        const shortAddr = parts.slice(0, 3).join(',').trim();
        const finalAddr = shortAddr || data.display_name;
        geocodeCache.set(cacheKey, finalAddr);
        currentPatientLoc.address = finalAddr;
        saveStoredData();
        updatePatientSafePathWidget();
        updateCaregiverGpsUI();
      }
    } catch (err) {}
  }

  /* ======================================================================= */
  /* 4. ENHANCED LOCATION-AWARE SOS SYSTEM                                   */
  /* ======================================================================= */

  async function triggerSafePathSos(reason = 'Emergency SOS Activated') {
    isSosMode = true;
    const active = getActiveUser();
    const uid = active ? (active.firebaseUid || active.id) : ('PT-' + Date.now());
    const patientName = active ? active.name : 'Kalyani Sharma';
    const condition = active ? (active.condition || "Parkinson's") : "Parkinson's";
    const cgPhone = active ? (active.caregiverPhone || '+91 98765 43210') : '+91 98765 43210';

    // 1. Attempt to get instantaneous high-accuracy position
    let freshLoc = { ...currentPatientLoc };
    if ('geolocation' in navigator) {
      try {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              freshLoc = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: Math.round(pos.coords.accuracy || 10),
                speed: 0,
                heading: 0,
                timestamp: Date.now(),
                isRealGps: true,
                address: currentPatientLoc.address
              };
              applyNewLocation(freshLoc, true);
              resolve();
            },
            () => resolve(), // Fallback to last known position
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        });
      } catch (e) {}
    }

    // 2. Build SOS Event Record
    const sosId = 'sos_' + Date.now();
    const sosData = {
      sosId: sosId,
      patientId: uid,
      patientName: patientName,
      condition: condition,
      caregiverPhone: cgPhone,
      latitude: freshLoc.lat || null,
      longitude: freshLoc.lng || null,
      accuracy: freshLoc.accuracy || null,
      address: freshLoc.address || 'Address locating...',
      reason: reason,
      status: 'active',
      timestamp: new Date().toISOString()
    };

    activeSosEvent = sosData;

    // 3. Save to Firestore sosEvents/{sosId}
    if (window.firebase && firebase.firestore) {
      try {
        const db = firebase.firestore();
        await db.collection('sosEvents').doc(sosId).set({
          ...sosData,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Also log under patient's emergency history
        await db.collection('users').doc(uid).collection('sosAlerts').doc(sosId).set({
          ...sosData,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        console.warn('[Saksham SafePath] Firestore SOS notice:', err.message);
      }
    }

    // 4. Audio & Vocal emergency siren
    try {
      if (window.playAudioChime) playAudioChime('alarm');
      if (window.speakText) {
        window.speakText(`Emergency SOS transmitted. SafePath coordinates dispatched to caregiver ${active?.caregiverName || 'Aarav'}.`);
      }
    } catch (e) {}

    // 5. Update local UI
    updatePatientSafePathWidget();
    showCaregiverSosAlertBanner(sosData);

    // 6. Open WhatsApp or direct emergency dialog
    if (typeof openEmergencyModal === 'function') {
      openEmergencyModal();
    }
  }

  function resolveSos(sosId) {
    isSosMode = false;
    activeSosEvent = null;

    if (window.firebase && firebase.firestore && sosId) {
      try {
        firebase.firestore().collection('sosEvents').doc(sosId).set({
          status: 'resolved',
          resolvedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (e) {}
    }

    hideCaregiverSosAlertBanner();
    updatePatientSafePathWidget();
    try { if (window.playAudioChime) playAudioChime('chime'); } catch (e) {}
    alert("Emergency SOS event marked as RESOLVED. Patient is safe.");
  }

  function setupSosCloudListener() {
    if (!window.firebase || !firebase.firestore) return;
    try {
      if (sosListenerUnsubscribe) sosListenerUnsubscribe();
      const db = firebase.firestore();
      // Listen for active emergency events
      sosListenerUnsubscribe = db.collection('sosEvents')
        .where('status', '==', 'active')
        .limit(1)
        .onSnapshot((snap) => {
          if (!snap.empty) {
            const doc = snap.docs[0];
            const data = doc.data();
            activeSosEvent = { id: doc.id, ...data };
            showCaregiverSosAlertBanner(activeSosEvent);
          } else {
            activeSosEvent = null;
            hideCaregiverSosAlertBanner();
          }
        }, (err) => {
          // Rule/offline fallback
        });
    } catch (err) {}
  }

  function showCaregiverSosAlertBanner(sos) {
    const banner = document.getElementById('cgActiveSosBanner');
    if (!banner) return;

    banner.classList.remove('hidden');
    banner.classList.add('flex');

    const nameEl = document.getElementById('cgSosPatientName');
    const timeEl = document.getElementById('cgSosTime');
    const locEl = document.getElementById('cgSosLocation');
    const resolveBtn = document.getElementById('cgSosBtnResolve');

    if (nameEl) nameEl.innerText = sos.patientName || 'Patient';
    if (timeEl) timeEl.innerText = new Date(sos.timestamp || Date.now()).toLocaleTimeString();
    if (locEl) {
      locEl.innerText = sos.latitude
        ? `GPS: ${Number(sos.latitude).toFixed(4)}, ${Number(sos.longitude).toFixed(4)} (±${sos.accuracy || 10}m) • ${sos.address || ''}`
        : 'GPS Unavailable';
    }

    if (resolveBtn) {
      resolveBtn.onclick = () => resolveSos(sos.sosId || sos.id);
    }

    // Play subtle alert tone if caregiver is active
    try {
      const active = getActiveUser();
      if (active && active.role === 'caregiver' && window.playAudioChime) {
        playAudioChime('alarm');
      }
    } catch (e) {}
  }

  function hideCaregiverSosAlertBanner() {
    const banner = document.getElementById('cgActiveSosBanner');
    if (banner) {
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    }
  }

  /* ======================================================================= */
  /* 5. LEAFLET + OPENSTREETMAP RENDERING                                    */
  /* ======================================================================= */

  function initMap() {
    const mapContainer = document.getElementById('caregiverLeafletMap');
    if (!mapContainer) return;

    if (typeof L === 'undefined') {
      console.warn('[Saksham SafePath] Leaflet library not loaded.');
      return;
    }

    if (!isMapInitialized || !leafletMap) {
      mapContainer.innerHTML = '';

      leafletMap = L.map('caregiverLeafletMap', {
        center: [currentPatientLoc.lat, currentPatientLoc.lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: true
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(leafletMap);

      // 1. Home Base Marker
      const homeIcon = L.divIcon({
        className: 'custom-home-pin',
        html: `<div class="w-10 h-10 rounded-2xl bg-[#1B4225] border-2 border-white shadow-xl flex items-center justify-center text-white text-lg">
                <i class="fa-solid fa-house-chimney"></i>
               </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      homeMarker = L.marker([homeBase.lat, homeBase.lng], { icon: homeIcon })
        .addTo(leafletMap)
        .bindPopup(`<strong>🏡 Home Base</strong><br>${homeBase.name}<br>Safe Zone Perimeter Center`);

      // 2. Safe Zone Circle
      geofenceCircle = L.circle([homeBase.lat, homeBase.lng], {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '6, 6',
        radius: geofenceRadius
      }).addTo(leafletMap);

      // 3. Accuracy Circle
      accuracyCircle = L.circle([currentPatientLoc.lat, currentPatientLoc.lng], {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 1,
        radius: currentPatientLoc.accuracy || 20
      }).addTo(leafletMap);

      // 4. Patient Avatar Pin
      const patientIcon = L.divIcon({
        className: 'custom-patient-pin',
        html: `<div class="relative">
                <div class="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 border-3 border-white shadow-2xl flex items-center justify-center text-xl text-white">
                  👵
                </div>
                <span class="absolute -top-1 -right-1 flex h-4 w-4">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                </span>
               </div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      patientMarker = L.marker([currentPatientLoc.lat, currentPatientLoc.lng], { icon: patientIcon })
        .addTo(leafletMap)
        .bindPopup(`<strong>👵 Patient Location</strong><br>Status: <span id="mapPopupStatus">Inside Safe Zone</span>`);

      // 5. Breadcrumb trail
      const latlngs = breadcrumbs.map(b => [b.lat, b.lng]);
      breadcrumbsPolyline = L.polyline(latlngs, {
        color: '#0D9488',
        weight: 4,
        opacity: 0.7,
        lineJoin: 'round'
      }).addTo(leafletMap);

      isMapInitialized = true;
    }

    setTimeout(() => {
      if (leafletMap) {
        leafletMap.invalidateSize();
        fitMapBounds();
      }
    }, 200);

    updateCaregiverGpsUI();
  }

  function updateLeafletMarkers() {
    if (!leafletMap || !isMapInitialized) return;

    // Skip Leaflet marker and polyline repaint if the GPS map view is currently hidden
    const gpsSubView = document.getElementById('cg-subview-gps');
    if (gpsSubView && gpsSubView.classList.contains('hidden')) return;

    const patientLatLng = [currentPatientLoc.lat, currentPatientLoc.lng];
    const homeLatLng = [homeBase.lat, homeBase.lng];

    if (patientMarker) patientMarker.setLatLng(patientLatLng);
    if (accuracyCircle) {
      accuracyCircle.setLatLng(patientLatLng);
      accuracyCircle.setRadius(currentPatientLoc.accuracy || 20);
    }
    if (homeMarker) homeMarker.setLatLng(homeLatLng);
    if (geofenceCircle) {
      geofenceCircle.setLatLng(homeLatLng);
      geofenceCircle.setRadius(geofenceRadius);
      if (!currentPatientLoc.isInsideGeofence) {
        geofenceCircle.setStyle({ color: '#ef4444', fillColor: '#ef4444' });
      } else {
        geofenceCircle.setStyle({ color: '#10b981', fillColor: '#10b981' });
      }
    }

    if (breadcrumbsPolyline) {
      const latlngs = breadcrumbs.map(b => [b.lat, b.lng]);
      breadcrumbsPolyline.setLatLngs(latlngs);
    }
  }

  function fitMapBounds() {
    if (!leafletMap) return;
    try {
      const bounds = L.latLngBounds([
        [homeBase.lat, homeBase.lng],
        [currentPatientLoc.lat, currentPatientLoc.lng]
      ]);
      leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    } catch (e) {}
  }

  function centerOnPatient() {
    if (!leafletMap) return;
    leafletMap.setView([currentPatientLoc.lat, currentPatientLoc.lng], 17, { animate: true });
    if (patientMarker) patientMarker.openPopup();
  }

  function centerOnHome() {
    if (!leafletMap) return;
    leafletMap.setView([homeBase.lat, homeBase.lng], 16, { animate: true });
    if (homeMarker) homeMarker.openPopup();
  }

  /* ======================================================================= */
  /* 6. GEOFENCE CONFIGURATION & ACTIONS                                     */
  /* ======================================================================= */

  function setHomeBaseToCurrentLocation() {
    if (!confirm("Set current position as the new Safe Zone Home Base?")) return;
    homeBase.lat = currentPatientLoc.lat;
    homeBase.lng = currentPatientLoc.lng;
    homeBase.name = currentPatientLoc.address || "Patient's Home";
    saveStoredData();
    updateLeafletMarkers();
    fitMapBounds();
    alert("Home Base updated to current coordinates!");
  }

  function setGeofenceRadius(radiusMeters) {
    geofenceRadius = parseInt(radiusMeters, 10) || 500;
    saveStoredData();
    updateLeafletMarkers();
    fitMapBounds();
  }

  function triggerGeofenceBreachAlert(distMeters) {
    const alertBanner = document.getElementById('cgGpsAlertBanner');
    const alertDistTxt = document.getElementById('cgGpsAlertDistTxt');
    if (alertBanner) {
      alertBanner.classList.remove('hidden');
      if (alertDistTxt) alertDistTxt.innerText = `${distMeters}m away from home base (${geofenceRadius}m safe perimeter)`;
    }
  }

  function dismissGeofenceAlert() {
    const alertBanner = document.getElementById('cgGpsAlertBanner');
    if (alertBanner) alertBanner.classList.add('hidden');
  }

  function openGoogleMapsDirections() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${currentPatientLoc.lat},${currentPatientLoc.lng}`;
    window.open(url, '_blank');
  }

  function contactPatientPhone() {
    const active = getActiveUser();
    const phone = active?.phone || '919876543210';
    window.open(`tel:${phone}`, '_self');
  }

  function ringAudioBeacon() {
    alert("Audio locator beacon triggered! Loud alarm chime sounding on patient's device.");
    try {
      if (window.playAudioChime) playAudioChime('alarm');
      if (window.speakText) {
        window.speakText("Assistance is on the way. Please stay where you are.");
      }
    } catch (e) {}
  }

  /* ======================================================================= */
  /* 7. REALISTIC OUTDOOR WALKING SIMULATION (FOR DEMO / TESTS)              */
  /* ======================================================================= */

  function toggleWalkSimulation() {
    if (isSimulating) stopWalkSimulation(); else startWalkSimulation();
  }

  function startWalkSimulation() {
    isSimulating = true;
    simulationStep = 0;
    const btn = document.getElementById('btnToggleGpsSimulation');
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-stop text-rose-300"></i> Stop Walk Simulation';
      btn.className = 'px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer';
    }

    const startLat = homeBase.lat;
    const startLng = homeBase.lng;

    const pathOffsets = [
      { dLat: 0.0000, dLng: 0.0000, desc: "Near residence courtyard" },
      { dLat: 0.0008, dLng: 0.0006, desc: "Walking down 14th Road" },
      { dLat: 0.0018, dLng: 0.0015, desc: "Approaching Corner Garden (320m away)" },
      { dLat: 0.0029, dLng: 0.0028, desc: "Crossing Main Avenue (490m - Near Perimeter)" },
      { dLat: 0.0042, dLng: 0.0041, desc: "⚠️ Outside Safe Zone: Near Metro Station (720m away)" },
      { dLat: 0.0051, dLng: 0.0048, desc: "⚠️ Outside Safe Zone: Shopping Lane (860m away)" },
      { dLat: 0.0035, dLng: 0.0035, desc: "Heading back towards Colony Gate (580m away)" },
      { dLat: 0.0015, dLng: 0.0012, desc: "Back inside safe perimeter (260m away)" },
      { dLat: 0.0000, dLng: 0.0000, desc: "Safely arrived back at residence" }
    ];

    simulationInterval = setInterval(() => {
      simulationStep = (simulationStep + 1) % pathOffsets.length;
      const step = pathOffsets[simulationStep];

      const simLoc = {
        lat: startLat + step.dLat,
        lng: startLng + step.dLng,
        accuracy: 8,
        speed: 3.2,
        heading: 45,
        timestamp: Date.now(),
        isRealGps: false,
        address: step.desc
      };

      applyNewLocation(simLoc, true);
    }, 4000);

    alert("Walking simulation started! Demonstrates live tracking, breadcrumb trail, and safe zone warnings.");
  }

  function stopWalkSimulation() {
    isSimulating = false;
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    const btn = document.getElementById('btnToggleGpsSimulation');
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-person-walking text-amber-200"></i> Simulate Outdoor Walk';
      btn.className = 'px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer';
    }
  }

  /* ======================================================================= */
  /* 8. UI PRESENTATION & WIDGET CONTROLLERS                                 */
  /* ======================================================================= */

  function updatePatientSafePathWidget() {
    const card = document.getElementById('patientSafePathWidget');
    if (!card) return;

    const secsAgo = Math.max(1, Math.round((Date.now() - currentPatientLoc.timestamp) / 1000));
    const timeText = secsAgo < 60 ? `${secsAgo} seconds ago` : `${Math.round(secsAgo / 60)} minutes ago`;

    if (isSharingActive) {
      card.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg shadow-inner">
              <i class="fa-solid fa-location-dot animate-bounce"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Location Active
                </span>
                <span class="text-xs font-bold text-slate-700">SAKSHAM SAFEPATH</span>
              </div>
              <p class="text-xs font-black text-slate-900 mt-0.5">${currentPatientLoc.address || 'Locating address…'}</p>
              <p class="text-[11px] text-slate-500">Accuracy: ±${currentPatientLoc.accuracy || 12} meters • Last Updated: ${timeText}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.SakshamSafePath.stopSharing()" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-pause"></i> Stop Sharing
            </button>
            <button onclick="window.SakshamSafePath.triggerSafePathSos('SafePath One-Tap SOS')" class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer animate-pulse">
              <i class="fa-solid fa-triangle-exclamation"></i> SOS
            </button>
          </div>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center text-lg">
              <i class="fa-solid fa-location-cross"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                  <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                  Location Inactive
                </span>
                <span class="text-xs font-bold text-slate-700">SAKSHAM SAFEPATH</span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">Enable location sharing to give your trusted caregiver emergency access.</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.SakshamSafePath.startSharing()" class="px-3.5 py-1.5 rounded-xl bg-[#1B4225] hover:bg-[#2A5D34] text-white font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-location-dot"></i> Enable Location
            </button>
            <button onclick="window.SakshamSafePath.triggerSafePathSos('Emergency SOS Button')" class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-triangle-exclamation"></i> SOS
            </button>
          </div>
        </div>
      `;
    }
  }

  function updateCaregiverGpsUI() {
    const latEl = document.getElementById('cgGpsLat');
    const lngEl = document.getElementById('cgGpsLng');
    const accEl = document.getElementById('cgGpsAccuracy');
    const speedEl = document.getElementById('cgGpsSpeed');
    const distEl = document.getElementById('cgGpsDistance');
    const addrEl = document.getElementById('cgGpsAddress');
    const timeEl = document.getElementById('cgGpsLastUpdated');
    const statusPill = document.getElementById('cgGpsStatusPill');
    const quickOverviewCard = document.getElementById('cgOverviewGpsCard');
    const quickStatusTxt = document.getElementById('cgOverviewGpsStatusTxt');
    const quickDistTxt = document.getElementById('cgOverviewGpsDistTxt');

    const latStr = currentPatientLoc.lat.toFixed(5);
    const lngStr = currentPatientLoc.lng.toFixed(5);
    const distMeters = currentPatientLoc.distanceMeters || 0;
    const isSafe = currentPatientLoc.isInsideGeofence;

    if (latEl) latEl.innerText = latStr;
    if (lngEl) lngEl.innerText = lngStr;
    if (accEl) accEl.innerText = `± ${currentPatientLoc.accuracy || 10}m`;
    if (speedEl) speedEl.innerText = `${currentPatientLoc.speed || 0} km/h`;
    if (distEl) distEl.innerText = `${distMeters} m from Home`;
    if (addrEl) addrEl.innerText = currentPatientLoc.address || 'Street address locating...';

    if (timeEl) {
      const secsAgo = Math.max(1, Math.round((Date.now() - currentPatientLoc.timestamp) / 1000));
      timeEl.innerText = secsAgo < 60 ? `${secsAgo}s ago` : `${Math.round(secsAgo / 60)}m ago`;
    }

    if (statusPill) {
      if (!isSharingActive) {
        statusPill.className = "px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5";
        statusPill.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Patient location sharing paused';
      } else if (isSafe) {
        statusPill.className = "px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs";
        statusPill.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> 🟢 Patient location available (Safe Zone)';
      } else {
        statusPill.className = "px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-2xs animate-pulse";
        statusPill.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-rose-600"></span> ⚠️ Outside Safe Zone (Wandering Alert)';
      }
    }

    if (quickOverviewCard) {
      if (quickStatusTxt) {
        quickStatusTxt.innerHTML = isSafe
          ? '<span class="text-emerald-700 font-black"><i class="fa-solid fa-circle-check"></i> 🟢 Patient location available</span>'
          : '<span class="text-rose-700 font-black"><i class="fa-solid fa-circle-exclamation"></i> Outside Safe Zone!</span>';
      }
      if (quickDistTxt) {
        quickDistTxt.innerText = `${distMeters}m from residence • ${currentPatientLoc.address || 'Locating...'}`;
      }
    }
  }

  function updateGpsStatusBadge(type, message) {
    const badge = document.getElementById('cgGpsStatusPill');
    if (!badge) return;
    if (type === 'error') {
      badge.className = "px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5";
      badge.innerHTML = `<i class="fa-solid fa-satellite-dish text-amber-600 animate-spin"></i> ${message}`;
    }
  }

  // Initialize SafePath
  init();

  return {
    init,
    initMap,
    startSharing,
    stopSharing,
    startBroadcasterWithConsent: startSharing,
    centerOnPatient,
    centerOnHome,
    fitMapBounds,
    setHomeBaseToCurrentLocation,
    setGeofenceRadius,
    openGoogleMapsDirections,
    contactPatientPhone,
    ringAudioBeacon,
    triggerSafePathSos,
    resolveSos,
    toggleWalkSimulation,
    dismissGeofenceAlert,
    updatePatientSafePathWidget,
    getLocation: () => currentPatientLoc,
    getHomeBase: () => homeBase,
    getGeofenceRadius: () => geofenceRadius,
    isSharing: () => isSharingActive
  };
})();

// Alias for backwards compatibility with existing UI calls
window.SakshamGpsTracker = window.SakshamSafePath;
