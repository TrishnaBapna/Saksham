/**
 * SAKSHAM — MILESTONE 7.1: CHARACTER STATE & PRIORITY TRANSITION ENGINE
 * Enforces expression priority hierarchies, duration timeouts, and idle neutral resets.
 */

import {
  AshaExpression,
  CharacterMode,
  ExpressionMetadata,
  ExpressionPriority,
} from '../types/character.types.js';
import {
  ASHA_EXPRESSIONS_REGISTRY,
  resolveAshaExpression,
} from '../config/characterExpressions.js';

export type CharacterStateListener = (
  expression: AshaExpression,
  metadata: ExpressionMetadata,
  mode: CharacterMode
) => void;

export class CharacterStateEngine {
  private currentExpression: AshaExpression = 'neutral';
  private currentPriority: ExpressionPriority = 1;
  private currentMode: CharacterMode = 'primary';
  private timeoutId: NodeJS.Timeout | null = null;
  private listeners: Set<CharacterStateListener> = new Set();

  constructor(initialExpression: AshaExpression = 'neutral', initialMode: CharacterMode = 'primary') {
    this.currentExpression = initialExpression;
    this.currentPriority = ASHA_EXPRESSIONS_REGISTRY[initialExpression]?.priority || 1;
    this.currentMode = initialMode;
  }

  /**
   * Current active expression
   */
  getExpression(): AshaExpression {
    return this.currentExpression;
  }

  /**
   * Metadata of the currently active expression
   */
  getMetadata(): ExpressionMetadata {
    return ASHA_EXPRESSIONS_REGISTRY[this.currentExpression] || ASHA_EXPRESSIONS_REGISTRY.neutral;
  }

  /**
   * Current presentation mode
   */
  getMode(): CharacterMode {
    return this.currentMode;
  }

  /**
   * Set presentation mode ('primary' | 'compact')
   */
  setMode(mode: CharacterMode): void {
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      this.notify();
    }
  }

  /**
   * Subscribe to expression and mode changes
   */
  subscribe(listener: CharacterStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentExpression, this.getMetadata(), this.currentMode);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Trigger an expression with priority check & auto-reset timeout.
   * Returns true if transition was accepted, false if blocked by active higher-priority expression.
   */
  triggerExpression(
    target: string,
    customDurationMs?: number,
    customPriority?: ExpressionPriority,
    force = false
  ): boolean {
    const expr = resolveAshaExpression(target);
    const meta = ASHA_EXPRESSIONS_REGISTRY[expr];
    const incomingPriority = customPriority ?? meta.priority;

    // Priority Check: lower-priority expression cannot overwrite higher-priority active state unless forced
    if (!force && this.timeoutId && incomingPriority < this.currentPriority) {
      return false;
    }

    // Clear existing duration timer
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.currentExpression = expr;
    this.currentPriority = incomingPriority;
    this.notify();

    // Determine duration: customDuration, default from metadata, or 0 for persistent
    const durationMs = customDurationMs !== undefined ? customDurationMs : meta.defaultDurationMs;

    if (durationMs > 0 && meta.returnState !== expr) {
      this.timeoutId = setTimeout(() => {
        this.timeoutId = null;
        this.currentExpression = meta.returnState;
        this.currentPriority = ASHA_EXPRESSIONS_REGISTRY[meta.returnState]?.priority || 1;
        this.notify();
      }, durationMs);
    }

    return true;
  }

  /**
   * Reset to ambient neutral state immediately
   */
  resetToNeutral(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.currentExpression = 'neutral';
    this.currentPriority = 1;
    this.notify();
  }

  /**
   * Clean up engine timers and listeners
   */
  destroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.listeners.clear();
  }

  private notify(): void {
    const meta = this.getMetadata();
    for (const listener of this.listeners) {
      try {
        listener(this.currentExpression, meta, this.currentMode);
      } catch (err) {
        console.error('Error notifying CharacterStateEngine listener:', err);
      }
    }
  }
}

// Global default singleton instance
export const characterStateEngine = new CharacterStateEngine('neutral', 'primary');
