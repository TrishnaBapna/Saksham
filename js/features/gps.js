/* ======================================================================= */
/* SAKSHAM REAL-TIME PATIENT GPS TRACKER & GEOFENCE SAFETY SYSTEM          */
/* Powered by Browser Geolocation API + OpenStreetMap & Leaflet.js         */
/* ======================================================================= */

window.SakshamGpsTracker = (function() {
  const STORAGE_KEY_PATIENT_LOC = 'saksham_patient_gps_location';
  const STORAGE_KEY_HOME_BASE = 'saksham_home_base_location';
  const STORAGE_KEY_GEOFENCE_RADIUS = 'saksham_geofence_radius';
  const STORAGE_KEY_BREADCRUMBS = 'saksham_gps_breadcrumbs';

  // Default Home Base: Mumbai Bandra West (or dynamically set to user's real location)
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
    address: "Bandra West, Mumbai, Maharashtra"
  };

  let breadcrumbs = [];
  let watchId = null;
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
  /* 1. INITIALIZATION & LOCAL STORAGE                                       */
  /* ======================================================================= */

  function init() {
    loadStoredData();
    startPatientBroadcaster();
    setupStorageEventListener();
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
        // Place initial patient location at home base
        currentPatientLoc.lat = homeBase.lat;
        currentPatientLoc.lng = homeBase.lng;
      }

      const storedCrumbs = localStorage.getItem(STORAGE_KEY_BREADCRUMBS);
      if (storedCrumbs) breadcrumbs = JSON.parse(storedCrumbs);
    } catch (e) {
      console.warn('[Saksham GPS] Storage load notice:', e);
    }
  }

  function saveStoredData() {
    try {
      localStorage.setItem(STORAGE_KEY_HOME_BASE, JSON.stringify(homeBase));
      localStorage.setItem(STORAGE_KEY_GEOFENCE_RADIUS, String(geofenceRadius));
      localStorage.setItem(STORAGE_KEY_PATIENT_LOC, JSON.stringify(currentPatientLoc));
      localStorage.setItem(STORAGE_KEY_BREADCRUMBS, JSON.stringify(breadcrumbs.slice(-100))); // keep last 100
    } catch (e) {}
  }

  function setupStorageEventListener() {
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY_PATIENT_LOC && event.newValue) {
        try {
          const newLoc = JSON.parse(event.newValue);
          applyNewLocation(newLoc, false);
        } catch (e) {}
      }
    });

    window.addEventListener('saksham:gps-update', (event) => {
      if (event.detail) {
        applyNewLocation(event.detail, false);
      }
    });
  }

  /* ======================================================================= */
  /* 2. REAL BROWSER GEOLOCATION (watchPosition & getCurrentPosition)        */
  /* ======================================================================= */

  function startPatientBroadcaster() {
    if (!('geolocation' in navigator)) {
      console.log('[Saksham GPS] Geolocation API not supported in this browser.');
      return;
    }

    // First attempt to get one fresh position to calibrate home base if needed
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleRawPosition(pos, true);
      },
      (err) => {
        console.log('[Saksham GPS] Initial position notice:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );

    // Continuous watchPosition for live movement tracking
    try {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          handleRawPosition(pos, false);
        },
        (err) => {
          console.warn('[Saksham GPS] watchPosition notice:', err.message);
          updateGpsStatusBadge('error', 'GPS Signal Searching');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 3000
        }
      );
    } catch (err) {
      console.warn('[Saksham GPS] watchPosition error:', err);
    }
  }

  function handleRawPosition(pos, isInitial = false) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = Math.round(pos.coords.accuracy || 10);
    const speed = pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6 * 10) / 10 : 0; // km/h
    const heading = Math.round(pos.coords.heading || 0);

    // If this is the initial position and home base has not been set by user, set home base here!
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

    // Reverse geocode asynchronously
    reverseGeocode(lat, lng);
  }

  /* ======================================================================= */
  /* 3. LOCATION PROCESSING, GEOFENCING & DISTANCE CALCULATION               */
  /* ======================================================================= */

  function applyNewLocation(locData, broadcast = true) {
    currentPatientLoc = locData;

    // Calculate distance to Home Base
    const distanceMeters = calculateHaversineDistance(
      locData.lat, locData.lng,
      homeBase.lat, homeBase.lng
    );
    currentPatientLoc.distanceMeters = Math.round(distanceMeters);
    currentPatientLoc.isInsideGeofence = distanceMeters <= geofenceRadius;

    // Add to breadcrumb path if moved significantly (> 5 meters)
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
      window.dispatchEvent(new CustomEvent('saksham:gps-update', { detail: currentPatientLoc }));
      syncLocationToFirestore(currentPatientLoc);
    }

    // Update UI & Map
    updateCaregiverGpsUI();
    updateLeafletMarkers();

    // Check geofence alert trigger
    if (!currentPatientLoc.isInsideGeofence) {
      triggerGeofenceBreachAlert(currentPatientLoc.distanceMeters);
    }
  }

  function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async function syncLocationToFirestore(loc) {
    try {
      if (window.firebase && firebase.firestore) {
        const active = JSON.parse(localStorage.getItem('saksham_active_user') || 'null');
        const uid = active ? (active.firebaseUid || active.id) : 'SAK-PT-8842';
        if (!uid) return;

        const db = firebase.firestore();
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
      }
    } catch (err) {
      // Non-critical background sync
    }
  }

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        const shortAddr = parts.slice(0, 3).join(',').trim();
        currentPatientLoc.address = shortAddr || data.display_name;
        saveStoredData();
        updateCaregiverGpsUI();
      }
    } catch (err) {
      // Network/rate limit fallback
    }
  }

  /* ======================================================================= */
  /* 4. LEAFLET + OPENSTREETMAP RENDERING                                    */
  /* ======================================================================= */

  function initMap() {
    const mapContainer = document.getElementById('caregiverLeafletMap');
    if (!mapContainer) return;

    if (typeof L === 'undefined') {
      console.warn('[Saksham GPS] Leaflet library not loaded.');
      return;
    }

    if (!isMapInitialized || !leafletMap) {
      // Clear container if previously filled
      mapContainer.innerHTML = '';

      leafletMap = L.map('caregiverLeafletMap', {
        center: [currentPatientLoc.lat, currentPatientLoc.lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: true
      });

      // OpenStreetMap Standard Tiles
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
        .bindPopup(`<strong>🏡 Home Base</strong><br>${homeBase.name}<br>Safe Zone Center`);

      // 2. Safe Zone Geofence Circle
      geofenceCircle = L.circle([homeBase.lat, homeBase.lng], {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '6, 6',
        radius: geofenceRadius
      }).addTo(leafletMap);

      // 3. Patient GPS Accuracy Circle
      accuracyCircle = L.circle([currentPatientLoc.lat, currentPatientLoc.lng], {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 1,
        radius: currentPatientLoc.accuracy || 20
      }).addTo(leafletMap);

      // 4. Patient Live Avatar Marker
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
        .bindPopup(`<strong>👵 Kalyani Sharma</strong><br>Status: <span id="mapPopupStatus">Inside Safe Zone</span>`);

      // 5. Breadcrumb trail polyline
      const latlngs = breadcrumbs.map(b => [b.lat, b.lng]);
      breadcrumbsPolyline = L.polyline(latlngs, {
        color: '#0D9488',
        weight: 4,
        opacity: 0.7,
        lineJoin: 'round'
      }).addTo(leafletMap);

      isMapInitialized = true;
    }

    // Trigger Leaflet viewport recalculation after DOM rendered
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

      // Color code geofence boundary based on breach
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
  /* 5. GEOFENCE CONFIGURATION & ACTIONS                                     */
  /* ======================================================================= */

  function setHomeBaseToCurrentLocation() {
    if (!confirm("Set patient's current position as the new Home Base & Safe Zone center?")) return;
    homeBase.lat = currentPatientLoc.lat;
    homeBase.lng = currentPatientLoc.lng;
    homeBase.name = currentPatientLoc.address || "Kalyani's Home";
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

    // Play caution sound if available
    try {
      if (window.playAudioChime) playAudioChime('chime');
    } catch (e) {}
  }

  function dismissGeofenceAlert() {
    const alertBanner = document.getElementById('cgGpsAlertBanner');
    if (alertBanner) alertBanner.classList.add('hidden');
  }

  function openGoogleMapsDirections() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${currentPatientLoc.lat},${currentPatientLoc.lng}`;
    window.open(url, '_blank');
  }

  function ringAudioBeacon() {
    alert("Audio locator beacon triggered! Loud alarm chime sounding on Kalyani's device to assist identification.");
    try {
      if (window.playAudioChime) playAudioChime('alarm');
      if (window.speakText) {
        window.speakText("Assistance is on the way. Kalyani ji, please stay where you are. Aarav is coming.");
      }
    } catch (e) {}
  }

  /* ======================================================================= */
  /* 6. REALISTIC OUTDOOR WALKING SIMULATION (FOR TESTING / DEMO)            */
  /* ======================================================================= */

  function toggleWalkSimulation() {
    if (isSimulating) {
      stopWalkSimulation();
    } else {
      startWalkSimulation();
    }
  }

  function startWalkSimulation() {
    isSimulating = true;
    simulationStep = 0;
    const btn = document.getElementById('btnToggleGpsSimulation');
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-stop text-rose-300"></i> Stop Walk Simulation';
      btn.className = 'px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer';
    }

    // Base coordinate: home base
    const startLat = homeBase.lat;
    const startLng = homeBase.lng;

    // A realistic wandering path extending past 500m geofence and circling back
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
        speed: 3.2, // normal walking speed km/h
        heading: 45,
        timestamp: Date.now(),
        isRealGps: false,
        address: step.desc
      };

      applyNewLocation(simLoc, true);
    }, 4000);

    alert("Walking simulation started! Patient location will update every 4 seconds to demonstrate live tracking, breadcrumb trail, and geofence alerts.");
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
  /* 7. UI PRESENTATION & HUD UPDATES                                        */
  /* ======================================================================= */

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
      if (isSafe) {
        statusPill.className = "px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs";
        statusPill.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Inside Safe Zone (Home)';
      } else {
        statusPill.className = "px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-2xs animate-pulse";
        statusPill.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-rose-600"></span> ⚠️ Outside Safe Zone (Wandering Alert)';
      }
    }

    // Update Overview mini-card if present
    if (quickOverviewCard) {
      if (quickStatusTxt) {
        quickStatusTxt.innerHTML = isSafe
          ? '<span class="text-emerald-700 font-black"><i class="fa-solid fa-circle-check"></i> Safe Zone Active</span>'
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

  // Initialize immediately
  init();

  return {
    init,
    initMap,
    centerOnPatient,
    centerOnHome,
    fitMapBounds,
    setHomeBaseToCurrentLocation,
    setGeofenceRadius,
    openGoogleMapsDirections,
    ringAudioBeacon,
    toggleWalkSimulation,
    dismissGeofenceAlert,
    getLocation: () => currentPatientLoc,
    getHomeBase: () => homeBase,
    getGeofenceRadius: () => geofenceRadius
  };
})();
