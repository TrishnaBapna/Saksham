/* ======================================================================= */
/* SAKSHAM 2.0 — ADAPTIVE ASSISTANCE ENGINE                                */
/* Implements Module 3: Adaptive Assistance Engine                         */
/* ======================================================================= */

(function(window) {
  'use strict';

  const CATALOG = {
    step_by_step: {
      category: 'step_by_step',
      label: '1-Step-At-A-Time Guidance',
      description: 'Break task down into single calm checkboxes with chime confirmation.',
      actionType: 'open_guided_runner'
    },
    larger_controls: {
      category: 'larger_controls',
      label: 'Larger Touch Targets',
      description: 'Enlarge buttons and spacing to make tapping comfortable during motor tremor.',
      actionType: 'enable_large_targets'
    },
    voice_guidance: {
      category: 'voice_guidance',
      label: 'Spoken Audio Guidance',
      description: 'Have the step read aloud softly using device speech synthesis.',
      actionType: 'read_aloud'
    },
    text_simplification: {
      category: 'text_simplification',
      label: 'Simplified Plain Instructions',
      description: 'Display concise 1-sentence prompt with zero clutter.',
      actionType: 'simplify_text'
    },
    visual_cues: {
      category: 'visual_cues',
      label: 'Visual & Picture Cue',
      description: 'Show visual iconography and contextual reminder card.',
      actionType: 'show_visual_card'
    },
    repeated_instructions: {
      category: 'repeated_instructions',
      label: 'Repeat Instruction',
      description: 'Play auditory chime and re-read the cue from the beginning.',
      actionType: 'repeat_cue'
    },
    alternative_communication: {
      category: 'alternative_communication',
      label: 'Quick Yes / No / Need Clue Tap',
      description: 'High-contrast large prompt for non-verbal response.',
      actionType: 'open_quick_tap'
    },
    caregiver_assistance: {
      category: 'caregiver_assistance',
      label: 'Request Caregiver Support',
      description: 'Send gentle WhatsApp or notification request to your trusted caregiver.',
      actionType: 'notify_caregiver'
    }
  };

  function getRecommendations(input) {
    input = input || {};
    const profile = input.userProfile || (window.state && window.state.userProfile) || {};
    const feedback = input.recordedFeedback || (window.SakshamPersonalization && window.SakshamPersonalization.getTrialState().difficultiesRecorded) || [];
    const adaptiveEnabled = profile.adaptiveAssistanceEnabled !== false;

    if (!adaptiveEnabled) {
      return {
        recommendedOptions: [],
        explanation: 'Adaptive assistance is disabled in your settings.',
        basedOnPriorHelpfulCount: 0,
        adaptiveEnabled: false
      };
    }

    const helpfulCounts = {};
    const unhelpfulCounts = {};

    feedback.forEach(function(entry) {
      if (!entry.assistanceSelected) return;
      if (entry.helpfulRating === 'helpful') {
        helpfulCounts[entry.assistanceSelected] = (helpfulCounts[entry.assistanceSelected] || 0) + 1;
      } else if (entry.helpfulRating === 'unhelpful') {
        unhelpfulCounts[entry.assistanceSelected] = (unhelpfulCounts[entry.assistanceSelected] || 0) + 1;
      }
    });

    const candidates = [];
    const categories = Object.keys(CATALOG);

    categories.forEach(function(cat) {
      const helpful = helpfulCounts[cat] || 0;
      const unhelpful = unhelpfulCounts[cat] || 0;

      // Suppress options the user explicitly found unhelpful unless there are more helpful ratings
      if (unhelpful > 0 && helpful <= unhelpful) {
        return;
      }

      let confidence = 0.5;
      let explanation = 'Offered as standard calm assistance.';

      if (helpful > 0) {
        confidence = Math.min(0.95, 0.6 + helpful * 0.15);
        explanation = 'Offered because you rated this helpful on ' + helpful + ' past ' + (helpful === 1 ? 'activity' : 'activities') + '.';
      } else if (profile.guidanceStyle === 'step_by_step' && cat === 'step_by_step') {
        confidence = 0.8;
        explanation = 'Matches your chosen step-by-step guidance preference.';
      } else if (profile.textSizePreference === 'large' && cat === 'larger_controls') {
        confidence = 0.8;
        explanation = 'Matches your chosen large text & touch targets preference.';
      } else if (profile.voiceAssistanceEnabled && cat === 'voice_guidance') {
        confidence = 0.75;
        explanation = 'Matches your preferred voice assistance setting.';
      }

      const opt = Object.assign({}, CATALOG[cat], {
        confidence: confidence,
        explanation: explanation
      });
      candidates.push(opt);
    });

    candidates.sort(function(a, b) {
      return b.confidence - a.confidence;
    });

    const top = candidates.slice(0, 3);
    const primary = top[0];
    let totalHelpful = 0;
    Object.keys(helpfulCounts).forEach(function(k) {
      totalHelpful += helpfulCounts[k];
    });

    let overallExplanation = '';
    if (primary && totalHelpful > 0) {
      overallExplanation = 'Suggested based on ' + totalHelpful + ' user-confirmed helpful feedback entries.';
    } else if (primary) {
      overallExplanation = 'Suggested from your support profile settings.';
    } else {
      overallExplanation = 'Standard calm assistance options available.';
    }

    return {
      recommendedOptions: top,
      primaryRecommendation: primary,
      explanation: overallExplanation,
      basedOnPriorHelpfulCount: totalHelpful,
      adaptiveEnabled: true
    };
  }

  window.SakshamAdaptiveEngine = {
    getRecommendations: getRecommendations,
    CATALOG: CATALOG
  };

})(typeof window !== 'undefined' ? window : this);
