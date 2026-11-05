import React, { createContext, useContext, useState, useEffect } from 'react';

type FontSize = 'normal' | 'large' | 'extra-large';

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  simpleMode: boolean;
  setSimpleMode: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSize, setFontSize] = useState<FontSize>('normal');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [simpleMode, setSimpleMode] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;

    // Apply font scale
    root.classList.remove('font-scale-normal', 'font-scale-large', 'font-scale-xl');
    if (fontSize === 'large') {
      root.classList.add('font-scale-large');
    } else if (fontSize === 'extra-large') {
      root.classList.add('font-scale-xl');
    } else {
      root.classList.add('font-scale-normal');
    }

    // Apply high contrast
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [fontSize, highContrast]);

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        setFontSize,
        highContrast,
        setHighContrast,
        simpleMode,
        setSimpleMode,
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
