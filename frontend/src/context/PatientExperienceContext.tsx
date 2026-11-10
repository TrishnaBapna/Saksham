/**
 * SAKSHAM — MILESTONE 7.4.1
 * Configurable Patient Experience: Asha-Only (Conversation-First) vs Asha + Navigation (Hybrid)
 *
 * Mode A: Asha-only (Conversation-first)
 * - Asha is the primary patient interface.
 * - Bottom navigation tabs are hidden.
 * - Tactile quick actions, text input, and Settings access remain permanently reachable.
 *
 * Mode B: Asha + Navigation (Hybrid)
 * - Asha is the central patient companion on Home.
 * - Standard 4-tab bottom navigation (Home, Family, Games, Profile) is visible.
 *
 * Strict Invariants:
 * 1. Default for all existing and new patients is strictly 'hybrid'.
 * 2. Preferences are isolated per patient UID (no cross-account leakage).
 * 3. Switching modes modifies visual layout only; zero patient data is mutated or reset.
 * 4. Caregiver, doctor, and admin portals are unaffected.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.js';
import { getEffectivePatientId, isGuestPatient, notifyDataChange } from '../features/auth/services/identityService.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../services/firebase.js';

export type PatientExperienceMode = 'asha-only' | 'hybrid';

export interface PatientExperienceContextType {
  mode: PatientExperienceMode;
  setMode: (mode: PatientExperienceMode) => Promise<void>;
  isAshaOnly: boolean;
  isHybrid: boolean;
  isLoading: boolean;
}

export const getPatientExperienceStorageKey = (patientId: string): string => {
  return `saksham_patient_experience_mode_${patientId}`;
};

export const getStoredPatientExperienceMode = (patientId: string): PatientExperienceMode => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(getPatientExperienceStorageKey(patientId));
      if (stored === 'asha-only' || stored === 'hybrid') {
        return stored;
      }
    }
  } catch {
    // Storage access error or headless environment
  }
  return 'hybrid'; // Non-negotiable safe default
};

const PatientExperienceContext = createContext<PatientExperienceContextType | undefined>(undefined);

export const PatientExperienceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, role } = useAuth();
  const effectivePatientId = getEffectivePatientId(currentUser);

  // Initialize synchronously from scoped local storage to prevent layout flash (CLS = 0)
  const [mode, setModeState] = useState<PatientExperienceMode>(() => {
    return getStoredPatientExperienceMode(effectivePatientId);
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // When effective patient changes (login, logout, switch account), re-sync to the new patient's preference
  useEffect(() => {
    const currentStored = getStoredPatientExperienceMode(effectivePatientId);
    setModeState(currentStored);

    // If authenticated patient, attempt background sync with Firestore profile
    let isCancelled = false;
    const fetchRemotePreference = async () => {
      if (!isFirebaseConfigured || isGuestPatient(effectivePatientId) || role !== 'patient') {
        return;
      }

      try {
        const userDocRef = doc(db, 'users', effectivePatientId);
        const snapshot = await getDoc(userDocRef);
        if (!isCancelled && snapshot && typeof snapshot.exists === 'function' && snapshot.exists()) {
          const data = snapshot.data();
          if (data && (data.patientExperienceMode === 'asha-only' || data.patientExperienceMode === 'hybrid')) {
            const remoteMode = data.patientExperienceMode as PatientExperienceMode;
            // Preserve local-first preference if already explicitly set by user in localStorage
            const localCached = getStoredPatientExperienceMode(effectivePatientId);
            const rawStored = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(getPatientExperienceStorageKey(effectivePatientId)) : null;

            if (!rawStored) {
              setModeState(remoteMode);
              try {
                if (typeof window !== 'undefined' && window.localStorage) {
                  window.localStorage.setItem(getPatientExperienceStorageKey(effectivePatientId), remoteMode);
                }
              } catch {
                // Ignore local storage error
              }
            } else {
              setModeState(localCached);
            }
          }
        }
      } catch (err) {
        // Silently fall back to local-first cache (Spark-compliant offline-first)
        console.warn('[PatientExperienceContext] Remote preference fetch notice:', err);
      }
    };

    fetchRemotePreference();

    return () => {
      isCancelled = true;
    };
  }, [effectivePatientId, role]);

  const setMode = useCallback(
    async (newMode: PatientExperienceMode): Promise<void> => {
      if (newMode !== 'asha-only' && newMode !== 'hybrid') {
        return;
      }

      // 1. Optimistic state update
      setModeState(newMode);
      setIsLoading(true);

      // 2. Persist locally under user-scoped key
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(getPatientExperienceStorageKey(effectivePatientId), newMode);
        }
      } catch {
        console.warn('[PatientExperienceContext] Local storage write failed');
      }

      // 3. Notify data subscribers of preference change
      notifyDataChange('patient_experience', effectivePatientId);

      // 4. Remote Firestore synchronization (for authenticated non-guest users)
      if (isFirebaseConfigured && !isGuestPatient(effectivePatientId) && role === 'patient') {
        try {
          const userDocRef = doc(db, 'users', effectivePatientId);
          await updateDoc(userDocRef, {
            patientExperienceMode: newMode,
            updatedAt: new Date().toISOString(),
          });
        } catch (err) {
          // Local-first: Firestore sync failure will be retried on next session; local preference remains intact
          console.warn('[PatientExperienceContext] Firestore profile update warning:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    },
    [effectivePatientId, role]
  );

  const value: PatientExperienceContextType = {
    mode,
    setMode,
    isAshaOnly: mode === 'asha-only',
    isHybrid: mode === 'hybrid',
    isLoading,
  };

  return (
    <PatientExperienceContext.Provider value={value}>
      {children}
    </PatientExperienceContext.Provider>
  );
};

export const usePatientExperience = (): PatientExperienceContextType => {
  const context = useContext(PatientExperienceContext);
  if (!context) {
    throw new Error('usePatientExperience must be used within a PatientExperienceProvider');
  }
  return context;
};

export const usePatientExperienceSafe = (): PatientExperienceContextType => {
  const context = useContext(PatientExperienceContext);
  if (!context) {
    return {
      mode: 'hybrid',
      setMode: async () => {},
      isAshaOnly: false,
      isHybrid: true,
      isLoading: false,
    };
  }
  return context;
};
