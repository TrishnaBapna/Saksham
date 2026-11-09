/**
 * SAKSHAM — MILESTONE 7.1: ASHA CHARACTER ENGINE & 30-EXPRESSION MATRIX TEST SUITE
 * Comprehensive verification of types, registry, presentation modes, state priorities,
 * accessibility (reduced motion, high contrast), pan-India localization, and backward compatibility.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import type {
  AshaExpressionCategory,
} from '../features/ai-companion/types/character.types.js';
import {
  ASHA_EXPRESSIONS_REGISTRY,
  ALL_ASHA_EXPRESSIONS,
  ASHA_CATEGORIES,
  getExpressionsByCategory,
  resolveAshaExpression,
  EXPRESSION_TO_LEGACY_STATE,
} from '../features/ai-companion/config/characterExpressions.js';
import { CharacterStateEngine } from '../features/ai-companion/services/characterStateService.js';
import { CharacterVisualizer } from '../features/ai-companion/CharacterVisualizer.js';
import { CharacterProvider, useCharacter } from '../context/CharacterContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { TRANSLATION_CATALOGUE } from '../i18n/interpolate.js';
import { SupportedLanguage } from '../i18n/types.js';

describe('Milestone 7.1: High-Fidelity Asha Character Engine & 30-Expression Matrix', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Part A: 30-Expression Matrix & Registry Architecture
  // --------------------------------------------------------------------------
  describe('Part A: 30-Expression Matrix & Registry Architecture', () => {
    it('contains exactly 30 distinct expressions in the registry', () => {
      expect(ALL_ASHA_EXPRESSIONS).toHaveLength(30);
      expect(Object.keys(ASHA_EXPRESSIONS_REGISTRY)).toHaveLength(30);
    });

    it('defines exactly 5 canonical categories', () => {
      expect(ASHA_CATEGORIES).toHaveLength(5);
      const categoryIds = ASHA_CATEGORIES.map((c) => c.id);
      expect(categoryIds).toEqual([
        'conversation',
        'emotional_support',
        'reminders',
        'memory_recall',
        'wellbeing',
      ]);
    });

    it('populates exactly 6 expressions in each of the 5 categories', () => {
      const categories: AshaExpressionCategory[] = [
        'conversation',
        'emotional_support',
        'reminders',
        'memory_recall',
        'wellbeing',
      ];

      categories.forEach((cat) => {
        const exprs = getExpressionsByCategory(cat);
        expect(exprs).toHaveLength(6);
      });
    });

    it('verifies exact expressions per category matching the reference visual sheet', () => {
      const conversation = getExpressionsByCategory('conversation').map((e) => e.id);
      expect(conversation).toEqual([
        'neutral',
        'listening',
        'thinking',
        'explaining',
        'acknowledging',
        'surprised',
      ]);

      const emotionalSupport = getExpressionsByCategory('emotional_support').map((e) => e.id);
      expect(emotionalSupport).toEqual([
        'happy',
        'encouraging',
        'reassuring',
        'comforting',
        'concerned',
        'empathetic',
      ]);

      const reminders = getExpressionsByCategory('reminders').map((e) => e.id);
      expect(reminders).toEqual([
        'reminder',
        'alert_important',
        'guiding',
        'confirming',
        'noting_saving',
        'done_completed',
      ]);

      const memoryRecall = getExpressionsByCategory('memory_recall').map((e) => e.id);
      expect(memoryRecall).toEqual([
        'helping_recall',
        'referring_past',
        'recognizing',
        'clarifying',
        'checking_understanding',
        'remembered',
      ]);

      const wellbeing = getExpressionsByCategory('wellbeing').map((e) => e.id);
      expect(wellbeing).toEqual([
        'calm',
        'relaxed',
        'motivated',
        'proud',
        'a_little_tired',
        'rest_suggestion',
      ]);
    });

    it('ensures every expression has complete, valid metadata and asset paths', () => {
      ALL_ASHA_EXPRESSIONS.forEach((id) => {
        const meta = ASHA_EXPRESSIONS_REGISTRY[id];
        expect(meta.id).toBe(id);
        expect(meta.labelKey).toContain('character.expr_');
        expect(meta.assetPath).toBe(`/assets/character/asha/${id}.png`);
        expect(meta.badgeIcon).toBeTruthy();
        expect(meta.priority).toBeGreaterThanOrEqual(1);
        expect(meta.priority).toBeLessThanOrEqual(5);
        expect(meta.returnState).toBe('neutral');
        expect(meta.englishLabel).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Part B: Backward Compatibility with Legacy 8-State System
  // --------------------------------------------------------------------------
  describe('Part B: Backward Compatibility with Legacy 8-State System', () => {
    it('resolves all 8 legacy states to equivalent 30-expression engine keys', () => {
      expect(resolveAshaExpression('idle')).toBe('neutral');
      expect(resolveAshaExpression('greeting')).toBe('happy');
      expect(resolveAshaExpression('listening')).toBe('listening');
      expect(resolveAshaExpression('speaking')).toBe('explaining');
      expect(resolveAshaExpression('thinking')).toBe('thinking');
      expect(resolveAshaExpression('happy')).toBe('happy');
      expect(resolveAshaExpression('reminder')).toBe('reminder');
      expect(resolveAshaExpression('encouraging')).toBe('encouraging');
    });

    it('resolves unknown or null input safely to neutral', () => {
      expect(resolveAshaExpression(null)).toBe('neutral');
      expect(resolveAshaExpression(undefined)).toBe('neutral');
      expect(resolveAshaExpression('unknown_state')).toBe('neutral');
    });

    it('maps all 30 expressions back to valid legacy states for backward-compatible consumers', () => {
      ALL_ASHA_EXPRESSIONS.forEach((expr) => {
        const legacy = EXPRESSION_TO_LEGACY_STATE[expr];
        expect([
          'idle',
          'greeting',
          'listening',
          'speaking',
          'thinking',
          'happy',
          'reminder',
          'encouraging',
        ]).toContain(legacy);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Part C: Presentation Modes (Primary vs Compact)
  // --------------------------------------------------------------------------
  describe('Part C: Presentation Modes (Primary vs Compact)', () => {
    it('renders in primary mode with default hero size and accessible role', () => {
      render(
        <LanguageProvider>
          <CharacterVisualizer characterId="asha" expression="neutral" mode="primary" />
        </LanguageProvider>
      );

      const avatar = screen.getByRole('img');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Asha character is currently neutral')
      );

      // Verify asset image is rendered
      const img = screen.getByRole('img').querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/assets/character/asha/neutral.png');
    });

    it('renders in compact companion mode with smaller non-obtrusive dimensions', () => {
      render(
        <LanguageProvider>
          <CharacterVisualizer characterId="asha" expression="happy" mode="compact" />
        </LanguageProvider>
      );

      const avatar = screen.getByRole('img');
      expect(avatar).toBeInTheDocument();
      // In compact mode, dimensions default to 64px
      const frame = avatar.querySelector('.relative.inline-flex.items-center');
      expect(frame).toHaveStyle({ width: '64px', height: '64px' });
    });

    it('renders localized label pill when showLabel is enabled in primary mode', () => {
      render(
        <LanguageProvider>
          <CharacterVisualizer
            characterId="asha"
            expression="explaining"
            mode="primary"
            showLabel={true}
          />
        </LanguageProvider>
      );

      expect(screen.getByText('Explaining')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Part D: State Priority Transitions & Timer Enforcing
  // --------------------------------------------------------------------------
  describe('Part D: State Priority Transitions & Timer Enforcing', () => {
    it('blocks lower-priority expressions while a higher-priority active timer is running', () => {
      const engine = new CharacterStateEngine('neutral', 'primary');

      // Trigger critical alert (Priority 5, duration 8000ms)
      const alertAccepted = engine.triggerExpression('alert_important', 8000);
      expect(alertAccepted).toBe(true);
      expect(engine.getExpression()).toBe('alert_important');

      // Attempt to trigger lower-priority conversational expression (Priority 2)
      const listeningAccepted = engine.triggerExpression('listening', 5000);
      expect(listeningAccepted).toBe(false);
      // Expression must stay as alert_important
      expect(engine.getExpression()).toBe('alert_important');

      // Attempt to trigger ambient expression (Priority 1)
      const neutralAccepted = engine.triggerExpression('neutral');
      expect(neutralAccepted).toBe(false);
      expect(engine.getExpression()).toBe('alert_important');

      engine.destroy();
    });

    it('allows higher or equal priority expressions to overwrite an active timer', () => {
      const engine = new CharacterStateEngine('neutral', 'primary');

      // Trigger conversational expression (Priority 2)
      engine.triggerExpression('listening', 5000);
      expect(engine.getExpression()).toBe('listening');

      // Trigger task reminder (Priority 4) -> must overwrite
      const reminderAccepted = engine.triggerExpression('reminder', 6000);
      expect(reminderAccepted).toBe(true);
      expect(engine.getExpression()).toBe('reminder');

      // Trigger critical alert (Priority 5) -> must overwrite
      const alertAccepted = engine.triggerExpression('alert_important', 8000);
      expect(alertAccepted).toBe(true);
      expect(engine.getExpression()).toBe('alert_important');

      engine.destroy();
    });

    it('automatically resets to neutral returnState when duration timer expires', () => {
      const engine = new CharacterStateEngine('neutral', 'primary');

      engine.triggerExpression('happy', 3000);
      expect(engine.getExpression()).toBe('happy');

      // Advance timer by 2999ms -> still happy
      act(() => {
        vi.advanceTimersByTime(2999);
      });
      expect(engine.getExpression()).toBe('happy');

      // Advance timer by 2ms -> resets to neutral
      act(() => {
        vi.advanceTimersByTime(2);
      });
      expect(engine.getExpression()).toBe('neutral');

      engine.destroy();
    });

    it('resets immediately to neutral when resetToNeutral() is called', () => {
      const engine = new CharacterStateEngine('neutral', 'primary');

      engine.triggerExpression('alert_important', 8000);
      expect(engine.getExpression()).toBe('alert_important');

      engine.resetToNeutral();
      expect(engine.getExpression()).toBe('neutral');

      engine.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // Part E: Accessibility (Reduced Motion & High Contrast)
  // --------------------------------------------------------------------------
  describe('Part E: Accessibility (Reduced Motion & High Contrast)', () => {
    it('suppresses animation classes when reducedMotion is enabled', () => {
      const { container } = render(
        <LanguageProvider>
          <CharacterVisualizer
            characterId="asha"
            expression="explaining"
            reducedMotion={true}
          />
        </LanguageProvider>
      );

      const circle = container.querySelector('.relative.z-10');
      expect(circle?.className).not.toContain('animate-pulse');
      expect(circle?.className).not.toContain('animate-bounce');
    });

    it('applies high-contrast amber border and styling when highContrast is enabled', () => {
      const { container } = render(
        <LanguageProvider>
          <CharacterVisualizer
            characterId="asha"
            expression="neutral"
            highContrast={true}
          />
        </LanguageProvider>
      );

      const circle = container.querySelector('.relative.z-10');
      expect(circle?.className).toContain('border-amber-400');
      expect(circle?.className).toContain('bg-neutral-950');

      // Aura is suppressed in high contrast mode
      const aura = container.querySelector('.blur-xl');
      expect(aura).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Part F: Pan-India Multilingual Coverage (23 Languages)
  // --------------------------------------------------------------------------
  describe('Part F: Pan-India Multilingual Coverage (23 Languages)', () => {
    it('verifies all 23 language dictionaries contain all 30 expression keys and 5 category keys', () => {
      const allLanguageCodes: SupportedLanguage[] = [
        'en', 'hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu',
        'kn', 'ml', 'or', 'pa', 'as', 'mai', 'sat', 'ks',
        'ne', 'sd', 'kok', 'doi', 'mni', 'brx', 'sa',
      ];

      const requiredKeys = [
        'character.category_conversation',
        'character.category_emotional_support',
        'character.category_reminders',
        'character.category_memory_recall',
        'character.category_wellbeing',
        ...ALL_ASHA_EXPRESSIONS.map((id) => `character.expr_${id}`),
      ];

      expect(requiredKeys).toHaveLength(35);

      allLanguageCodes.forEach((lang) => {
        const dict = TRANSLATION_CATALOGUE[lang];
        expect(dict).toBeDefined();

        requiredKeys.forEach((key) => {
          expect(
            dict[key],
            `Missing key "${key}" in language "${lang}"`
          ).toBeTruthy();
        });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Part G: Character Context Integration
  // --------------------------------------------------------------------------
  describe('Part G: Character Context Integration', () => {
    const TestConsumer: React.FC = () => {
      const {
        expression,
        characterState,
        mode,
        setMode,
        triggerEmotion,
        resetToNeutral,
        currentMetadata,
      } = useCharacter();

      return (
        <div>
          <span data-testid="expression">{expression}</span>
          <span data-testid="legacy-state">{characterState}</span>
          <span data-testid="mode">{mode}</span>
          <span data-testid="category">{currentMetadata.category}</span>
          <button onClick={() => triggerEmotion('reassuring', 4000)}>
            Trigger Reassuring
          </button>
          <button onClick={() => setMode('compact')}>Set Compact</button>
          <button onClick={resetToNeutral}>Reset</button>
        </div>
      );
    };

    it('provides reactive character state, metadata, and mode switching', () => {
      render(
        <CharacterProvider>
          <TestConsumer />
        </CharacterProvider>
      );

      expect(screen.getByTestId('expression').textContent).toBe('neutral');
      expect(screen.getByTestId('legacy-state').textContent).toBe('idle');
      expect(screen.getByTestId('mode').textContent).toBe('primary');
      expect(screen.getByTestId('category').textContent).toBe('conversation');

      // Trigger expression
      act(() => {
        screen.getByText('Trigger Reassuring').click();
      });

      expect(screen.getByTestId('expression').textContent).toBe('reassuring');
      expect(screen.getByTestId('legacy-state').textContent).toBe('happy');
      expect(screen.getByTestId('category').textContent).toBe('emotional_support');

      // Change mode
      act(() => {
        screen.getByText('Set Compact').click();
      });
      expect(screen.getByTestId('mode').textContent).toBe('compact');

      // Reset
      act(() => {
        screen.getByText('Reset').click();
      });
      expect(screen.getByTestId('expression').textContent).toBe('neutral');
    });
  });
});
