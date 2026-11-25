import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.js';
import { getEffectivePatientId } from '../features/auth/services/identityService.js';
import {
  AshaPersonalizationService,
} from '../features/ai-companion/services/ashaPersonalizationService.js';
import { AshaPersonalizationPreferences } from '../features/ai-companion/types/ashaContext.types.js';

export type FontSize = 'normal' | 'large' | 'extra-large';

export interface AccessibilityContextType {
  // Backward-compatible properties
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  simpleMode: boolean;
  setSimpleMode: (enabled: boolean) => void;

  // Phase 3.10 Unified Accessibility & Personalization
  preferences: AshaPersonalizationPreferences;
  updatePreferences: (updates: Partial<AshaPersonalizationPreferences>) => void;
  restoreDefaults: () => void;

  // Quick ergonomic helpers
  textSize: 'standard' | 'large' | 'extra-large';
  setTextSize: (size: 'standard' | 'large' | 'extra-large') => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  lineSpacing: 'standard' | 'comfortable';
  setLineSpacing: (spacing: 'standard' | 'comfortable') => void;
  largeTouchTargets: boolean;
  setLargeTouchTargets: (enabled: boolean) => void;
  requireActionConfirmations: boolean;
  setRequireActionConfirmations: (enabled: boolean) => void;
  reducedVisualClutter: boolean;
  setReducedVisualClutter: (enabled: boolean) => void;
  showIconLabels: boolean;
  setShowIconLabels: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  let authContext: any = null;
  try {
    authContext = useAuth();
  } catch {
    authContext = null;
  }
  const currentUser = authContext?.currentUser ?? null;
  const patientId = getEffectivePatientId(currentUser);

  const [preferences, setPreferencesState] = useState<AshaPersonalizationPreferences>(() => {
    return AshaPersonalizationService.getPreferences(patientId);
  });

  // Re-sync when patient account changes (e.g. login, logout, account switch)
  useEffect(() => {
    const loaded = AshaPersonalizationService.getPreferences(patientId);
    setPreferencesState(loaded);
  }, [patientId]);

  // Synchronize DOM classes and data attributes on document root
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // 1. Font scaling
    root.classList.remove('font-scale-normal', 'font-scale-large', 'font-scale-xl');
    if (preferences.textSize === 'large') {
      root.classList.add('font-scale-large');
    } else if (preferences.textSize === 'extra-large') {
      root.classList.add('font-scale-xl');
    } else {
      root.classList.add('font-scale-normal');
    }

    // 2. High Contrast
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // 3. Reduced Motion
    if (preferences.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // 4. Comfortable Line Spacing
    if (preferences.lineSpacing === 'comfortable') {
      root.classList.add('comfortable-spacing');
    } else {
      root.classList.remove('comfortable-spacing');
    }

    // 5. Large Touch Targets
    if (preferences.largeTouchTargets) {
      root.classList.add('large-touch-targets');
    } else {
      root.classList.remove('large-touch-targets');
    }

    // 6. Reduced Visual Clutter
    if (preferences.reducedVisualClutter) {
      root.classList.add('reduced-clutter');
    } else {
      root.classList.remove('reduced-clutter');
    }

    // Semantic Data Attributes for CSS & Testing
    root.setAttribute('data-text-size', preferences.textSize);
    root.setAttribute('data-high-contrast', String(preferences.highContrast));
    root.setAttribute('data-reduced-motion', String(preferences.reducedMotion));
    root.setAttribute('data-line-spacing', preferences.lineSpacing);
    root.setAttribute('data-touch-targets', preferences.largeTouchTargets ? 'large' : 'standard');
    root.setAttribute('data-reduced-clutter', String(preferences.reducedVisualClutter));
  }, [preferences]);

  const updatePreferences = (updates: Partial<AshaPersonalizationPreferences>) => {
    const updated = AshaPersonalizationService.updatePreferences(patientId, updates);
    setPreferencesState(updated);
  };

  const restoreDefaults = () => {
    const defaults = AshaPersonalizationService.restoreDefaults(patientId);
    setPreferencesState(defaults);
  };

  // Backward-compatible mappings
  const fontSize: FontSize =
    preferences.textSize === 'extra-large' ? 'extra-large' : preferences.textSize === 'large' ? 'large' : 'normal';

  const setFontSize = (size: FontSize) => {
    const mappedTextSize = size === 'extra-large' ? 'extra-large' : size === 'large' ? 'large' : 'standard';
    updatePreferences({ textSize: mappedTextSize });
  };

  const highContrast = preferences.highContrast;
  const setHighContrast = (enabled: boolean) => {
    updatePreferences({ highContrast: enabled });
  };

  const simpleMode = preferences.simplifiedNavigation && preferences.reducedVisualClutter;
  const setSimpleMode = (enabled: boolean) => {
    updatePreferences({
      simplifiedNavigation: enabled,
      reducedVisualClutter: enabled,
    });
  };

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        setFontSize,
        highContrast,
        setHighContrast,
        simpleMode,
        setSimpleMode,

        preferences,
        updatePreferences,
        restoreDefaults,

        textSize: preferences.textSize,
        setTextSize: (size) => updatePreferences({ textSize: size }),
        reducedMotion: preferences.reducedMotion,
        setReducedMotion: (enabled) => updatePreferences({ reducedMotion: enabled }),
        lineSpacing: preferences.lineSpacing,
        setLineSpacing: (spacing) => updatePreferences({ lineSpacing: spacing }),
        largeTouchTargets: preferences.largeTouchTargets,
        setLargeTouchTargets: (enabled) => updatePreferences({ largeTouchTargets: enabled }),
        requireActionConfirmations: preferences.requireActionConfirmations,
        setRequireActionConfirmations: (enabled) => updatePreferences({ requireActionConfirmations: enabled }),
        reducedVisualClutter: preferences.reducedVisualClutter,
        setReducedVisualClutter: (enabled) => updatePreferences({ reducedVisualClutter: enabled }),
        showIconLabels: preferences.showIconLabels,
        setShowIconLabels: (enabled) => updatePreferences({ showIconLabels: enabled }),
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
