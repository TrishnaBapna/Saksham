import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { CharacterId, CharacterState } from '../types/index.js';
import {
  AshaExpression,
  CharacterMode,
  ExpressionMetadata,
  ExpressionPriority,
} from '../features/ai-companion/types/character.types.js';
import {
  ASHA_EXPRESSIONS_REGISTRY,
  EXPRESSION_TO_LEGACY_STATE,
  resolveAshaExpression,
} from '../features/ai-companion/config/characterExpressions.js';
import { characterStateEngine } from '../features/ai-companion/services/characterStateService.js';

export interface CharacterContextType {
  activeCharacter: CharacterId;
  setActiveCharacter: (character: CharacterId) => void;
  // Legacy 8-state support
  characterState: CharacterState;
  setCharacterState: (state: CharacterState) => void;
  // 30-Expression high-fidelity system
  expression: AshaExpression;
  setExpression: (expr: AshaExpression, priority?: ExpressionPriority, durationMs?: number) => void;
  mode: CharacterMode;
  setMode: (mode: CharacterMode) => void;
  triggerEmotion: (
    state: CharacterState | AshaExpression,
    durationMs?: number,
    priority?: ExpressionPriority,
    force?: boolean
  ) => boolean;
  resetToNeutral: () => void;
  currentMetadata: ExpressionMetadata;
  autoSpeak: boolean;
  setAutoSpeak: (enabled: boolean) => void;
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCharacter, setActiveCharacter] = useState<CharacterId>('asha');
  const [expression, setLocalExpression] = useState<AshaExpression>(() => characterStateEngine.getExpression());
  const [mode, setLocalMode] = useState<CharacterMode>(() => characterStateEngine.getMode());
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);

  // Sync with state engine
  useEffect(() => {
    const unsubscribe = characterStateEngine.subscribe((newExpr, _meta, newMode) => {
      setLocalExpression(newExpr);
      setLocalMode(newMode);
    });
    return unsubscribe;
  }, []);

  // Backwards compatible characterState: maps 30-expression to 8 legacy states
  const characterState = useMemo<CharacterState>(() => {
    return EXPRESSION_TO_LEGACY_STATE[expression] || 'idle';
  }, [expression]);

  // Current metadata
  const currentMetadata = useMemo<ExpressionMetadata>(() => {
    return ASHA_EXPRESSIONS_REGISTRY[expression] || ASHA_EXPRESSIONS_REGISTRY.neutral;
  }, [expression]);

  const setCharacterState = useCallback((state: CharacterState) => {
    const resolved = resolveAshaExpression(state);
    characterStateEngine.triggerExpression(resolved, undefined, undefined, true);
  }, []);

  const setExpression = useCallback(
    (expr: AshaExpression, priority?: ExpressionPriority, durationMs?: number) => {
      characterStateEngine.triggerExpression(expr, durationMs, priority, true);
    },
    []
  );

  const setMode = useCallback((newMode: CharacterMode) => {
    characterStateEngine.setMode(newMode);
  }, []);

  const triggerEmotion = useCallback(
    (
      state: CharacterState | AshaExpression,
      durationMs?: number,
      priority?: ExpressionPriority,
      force = false
    ): boolean => {
      const resolved = resolveAshaExpression(state);
      return characterStateEngine.triggerExpression(resolved, durationMs, priority, force);
    },
    []
  );

  const resetToNeutral = useCallback(() => {
    characterStateEngine.resetToNeutral();
  }, []);

  return (
    <CharacterContext.Provider
      value={{
        activeCharacter,
        setActiveCharacter,
        characterState,
        setCharacterState,
        expression,
        setExpression,
        mode,
        setMode,
        triggerEmotion,
        resetToNeutral,
        currentMetadata,
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
