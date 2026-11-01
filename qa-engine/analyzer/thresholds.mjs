/**
 * Saksham 3.0 — Configurable Telemetry Thresholds & Heuristics
 * Defines persona-adaptive baseline norms and friction sensitivity parameters.
 */

export const DEFAULT_THRESHOLDS = {
  taskDuration: {
    // Expected normal ranges by persona tier (in seconds)
    senior: {
      expectedMin: 60,
      expectedMax: 300, // Up to 5 minutes is normal for elder/Parkinson's pacing
      outlierMultiplier: 1.5, // > 450s triggers friction flag
      fineMotorAllowance: 120 // Extra 2 mins for dressing/fine-motor activities
    },
    adult: {
      expectedMin: 15,
      expectedMax: 90,
      outlierMultiplier: 2.0 // > 180s triggers friction flag
    }
  },

  difficulty: {
    // Percentage of completions flagged as 'hard'
    warningPercent: 25,
    criticalPercent: 50,
    minSampleSize: 3
  },

  motorFriction: {
    // Normal tremor debounce interventions per session
    normalSeniorDebouncesPerSession: 5,
    excessiveDebouncesPerSession: 15,
    rageClicksPerSession: 3
  },

  accessibility: {
    minTouchTargetDimensionPx: 44, // WCAG 2.5.5 / 2.5.8
    normalTextContrastRatio: 4.5,  // WCAG AA
    largeTextContrastRatio: 3.0
  },

  securityGate: {
    // Maximum allowable re-prompt within same active session
    maxRePromptsWithin10Min: 1,
    sessionValidityMinutes: 15
  },

  navigation: {
    // Rapid switches indicative of disorientation
    maxTabSwitchesIn10Seconds: 3,
    allowSilentGatedRedirects: false // Gated tabs must provide explanatory toast/modal
  }
};
