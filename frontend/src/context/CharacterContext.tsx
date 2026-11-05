import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CharacterId, CharacterState } from '../types/index.js';

interface CharacterContextType {
  activeCharacter: CharacterId;
  setActiveCharacter: (character: CharacterId) => void;
  characterState: CharacterState;
  setCharacterState: (state: CharacterState) => void;
  triggerEmotion: (state: CharacterState, durationMs?: number) => void;
  autoSpeak: boolean;
  setAutoSpeak: (enabled: boolean) => void;
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCharacter, setActiveCharacter] = useState<CharacterId>('asha');
  const [characterState, setCharacterState] = useState<CharacterState>('greeting');
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerEmotion = useCallback((state: CharacterState, durationMs = 3500) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setCharacterState(state);

    if (state !== 'idle' && durationMs > 0) {
      timeoutRef.current = setTimeout(() => {
        setCharacterState('idle');
      }, durationMs);
    }
  }, []);

  return (
    <CharacterContext.Provider
      value={{
        activeCharacter,
        setActiveCharacter,
        characterState,
        setCharacterState,
        triggerEmotion,
        autoSpeak,
        setAutoSpeak,
      }}
    >
      {children}
    </CharacterContext.Provider>
  );
};

export const useCharacter = (): CharacterContextType => {
  const context = useContext(CharacterContext);
  if (!context) {
    throw new Error('useCharacter must be used within a CharacterProvider');
  }
  return context;
};
