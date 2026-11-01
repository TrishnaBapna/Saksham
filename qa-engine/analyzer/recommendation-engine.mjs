/**
 * Saksham 3.0 — Intelligent Recommendation Engine
 * Transforms analyzed findings into prioritized, actionable, structured improvements.
 * Strictly avoids feature bloat; focuses on user agency, calm pacing, and motor safety.
 */

export const RECOMMENDATION_TYPES = {
  FIX: 'FIX',           // Something is broken or violates accessibility standards
  IMPROVE: 'IMPROVE',   // An existing feature works but needs refinement
  SIMPLIFY: 'SIMPLIFY', // A workflow is unnecessarily complicated or introduces cognitive load
  ADD: 'ADD',           // A genuinely missing capability is identified
  REVIEW: 'REVIEW'      // A feature may be redundant or require clinical/caregiver review
};

export const RECOMMENDATION_STATUSES = {
  NEW: 'New',
  REVIEWED: 'Reviewed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DEFERRED: 'Deferred'
};

export class RecommendationEngine {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Generates structured recommendations from analyzed findings
   * @param {Array<object>} analyzedFindings 
   * @returns {Array<object>} List of structured recommendations
   */
  generateRecommendations(analyzedFindings) {
    const recommendations = [];
    let recCounter = 202600;

    for (const finding of analyzedFindings) {
      const rec = this._mapFindingToRecommendation(finding, ++recCounter);
      if (rec) recommendations.push(rec);
    }

    return recommendations;
  }

  _mapFindingToRecommendation(finding, recNumber) {
    const id = `REC-3.0-${recNumber}`;

    switch (finding.code) {
      case 'TOUCH_TARGET_DEFICIT':
        return {
          id,
          type: RECOMMENDATION_TYPES.FIX,
          title: 'Enlarge Floating Companion Emotion Buttons to 44px Minimum Touch Target',
          problemIdentified: 'Floating companion emotion buttons (.companion-emotion-btn) measure only 32px x 32px, causing frequent missed taps and accidental clicks for Parkinson\'s and senior tremor personas.',
          evidence: finding.metricEvidence,
          affectedPersonaAndJourney: `${finding.affectedPersona} — Floating Companion & Dashboard`,
          severity: finding.severity,
          priority: finding.scoring?.priority || 'P1',
          suggestedImprovement: 'Increase CSS dimensions of `.companion-emotion-btn` to 44px x 44px with a 48px hit-slop touch target area and 8px inter-button spacing. Add subtle hover/active scale damping.',
          expectedUserBenefit: 'Eliminates motor frustration, enables seniors with tremors to easily express mood without misclicking neighboring controls.',
          possibleRisksOrSideEffects: 'Expands the width of the floating emotion bar by ~36px; must ensure it does not overlap the PiP trigger button on narrow mobile viewports (<360px).',
          confidenceLevel: { score: 0.96, label: 'High' },
          verificationStrategy: 'Automated Playwright test measuring boundingBox dimensions of all emotion buttons and verifying 0 debounce collisions during simulated tremor clicks.',
          status: RECOMMENDATION_STATUSES.NEW
        };

      case 'SILENT_GATED_NAVIGATION':
        return {
          id,
          type: RECOMMENDATION_TYPES.IMPROVE,
          title: 'Display Informative Clinical Guidance Toast When Condition Gates Restrict Tab Access',
          problemIdentified: 'When users with the Parkinson\'s condition profile click "3. Loved Ones & Peace", the navigation router silently redirects them to "#routine" without explanation, creating disorientation.',
          evidence: finding.metricEvidence,
          affectedPersonaAndJourney: `${finding.affectedPersona} — Navigation & Clinical Profiles`,
          severity: finding.severity,
          priority: finding.scoring?.priority || 'P2',
          suggestedImprovement: 'When router redirects an unpermitted condition tab, trigger a calm toast: "🌸 Loved Ones Vault is active for Memory Care profiles. Your profile is currently focused on Daily Movement & Routine Pacing." with an option to consult caregiver.',
          expectedUserBenefit: 'Prevents confusion and repetitive tap attempts; provides transparent, reassuring clinical context.',
          possibleRisksOrSideEffects: 'Must avoid pathologizing language or causing anxiety; toast tone must remain warm, dignified, and calm.',
          confidenceLevel: { score: 0.94, label: 'High' },
          verificationStrategy: 'Playwright test asserting that clicking #view-vault with Parkinson\'s profile renders the explanatory toast element with role="status".',
          status: RECOMMENDATION_STATUSES.NEW
        };

      case 'TASK_DURATION_OUTLIER':
      case 'HIGH_DIFFICULTY_ROUTINE':
        return {
          id,
          type: RECOMMENDATION_TYPES.SIMPLIFY,
          title: 'Decompose Dressing Task into 3 Micro-Steps with Adaptive Fastener Guidance',
          problemIdentified: 'The "Buttoning Shirt & Morning Dressing" routine consistently records high completion durations (avg ~340s) and 60%+ "Hard" difficulty ratings due to fine-motor buttoning challenges.',
          evidence: finding.metricEvidence,
          affectedPersonaAndJourney: `${finding.affectedPersona} — Morning Routine Flow`,
          severity: finding.severity,
          priority: finding.scoring?.priority || 'P1',
          suggestedImprovement: 'Break the monolithic dressing task into 3 guided micro-steps: (1) Prepare loose garments, (2) Fasten bottom-up or use adaptive aids, (3) Final comfort check. Include optional "Request Caregiver Co-Assistance" button.',
          expectedUserBenefit: 'Reduces cognitive and motor overwhelm, promotes gradual autonomy, and lowers morning anxiety.',
          possibleRisksOrSideEffects: 'Adds an extra step transition in the guided task runner; must allow 1-tap skipping for days when user feels agile.',
          confidenceLevel: { score: 0.92, label: 'High' },
          verificationStrategy: 'Simulate step-by-step runner in Playwright, ensuring micro-steps advance seamlessly and record completion under 200s.',
          status: RECOMMENDATION_STATUSES.NEW
        };

      case 'SECURITY_GATE_REPROMPT_FRICTION':
        return {
          id,
          type: RECOMMENDATION_TYPES.SIMPLIFY,
          title: 'Implement 15-Minute Authenticated Session Grace Period for Caregiver PIN',
          problemIdentified: 'Caregivers and clinicians checking patient routines must re-enter the 4-digit security PIN every time they switch between tabs within the same session.',
          evidence: finding.metricEvidence,
          affectedPersonaAndJourney: `${finding.affectedPersona} — Caregiver & Clinician Oversight`,
          severity: finding.severity,
          priority: finding.scoring?.priority || 'P2',
          suggestedImprovement: 'Persist a secure session timestamp in sessionStorage (`saksham_sec_gate_auth_ts`). If the elapsed time since last successful PIN validation is < 15 minutes and user remains active, bypass PIN prompt.',
          expectedUserBenefit: 'Saves caregiver time during busy morning rounds while preserving tablet privacy when the browser session ends.',
          possibleRisksOrSideEffects: 'Session persists until tab is closed or 15 minutes elapses; must provide immediate "Lock Now" button on caregiver header.',
          confidenceLevel: { score: 0.95, label: 'High' },
          verificationStrategy: 'Playwright test verifying that navigating to #caregiver twice within 60s requires PIN entry only on the first visit.',
          status: RECOMMENDATION_STATUSES.NEW
        };

      case 'SUBTAB_STATE_LOSS':
        return {
          id,
          type: RECOMMENDATION_TYPES.IMPROVE,
          title: 'Persist Active Routine Subtab Preference (Memory Cues vs Direct Checklist)',
          problemIdentified: 'Users who prefer the "2. Direct Schedule Checklist" view are forced to manually click the subtab on every session because preference resets to Memory Cues on page refresh.',
          evidence: finding.metricEvidence,
          affectedPersonaAndJourney: `${finding.affectedPersona} — Routine Dashboard View`,
          severity: finding.severity,
          priority: 'P3',
          suggestedImprovement: 'Store active subtab in localStorage (`saksham_active_routine_subtab: "cues" | "checklist"`). Hydrate on tab mount.',
          expectedUserBenefit: 'Honors user preference, saves daily repetitive interaction, accelerates routine review for adult users.',
          possibleRisksOrSideEffects: 'Must default to "cues" for senior personas with dementia or cognitive impairment who benefit from assisted recall prompts.',
          confidenceLevel: { score: 0.98, label: 'High' },
          verificationStrategy: 'Playwright test toggling to checklist, reloading page, and asserting that the checklist view remains active.',
          status: RECOMMENDATION_STATUSES.NEW
        };

      default:
        return null;
    }
  }
}
