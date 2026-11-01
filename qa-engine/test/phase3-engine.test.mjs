/**
 * Saksham 3.0 — Phase 3 Engine Test Suite
 * Tests telemetry generation, statistical aggregation, friction detection,
 * cognitive analysis, recommendation synthesis, and privacy invariants.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTelemetryEvent, TELEMETRY_EVENT_TYPES, PERSONA_TIERS } from '../telemetry/schema.mjs';
import { SyntheticTelemetryGenerator } from '../telemetry/generator.mjs';
import { TelemetryAggregator } from '../telemetry/aggregator.mjs';
import { FrictionDetector } from '../analyzer/friction-detector.mjs';
import { HybridAnalyzer } from '../analyzer/hybrid-analyzer.mjs';
import { RecommendationEngine, RECOMMENDATION_TYPES, RECOMMENDATION_STATUSES } from '../analyzer/recommendation-engine.mjs';

test('Telemetry Schema: validates synthetic event structure correctly', () => {
  const validEvt = {
    id: 'SYN-EVT-999',
    type: TELEMETRY_EVENT_TYPES.TASK_COMPLETED,
    timestamp: new Date().toISOString(),
    personaId: 'synthetic_senior_kalyani_001',
    personaTier: PERSONA_TIERS.SENIOR,
    durationMs: 45000
  };

  const res = validateTelemetryEvent(validEvt);
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);

  const invalidEvt = {
    id: 'bad',
    type: 'NON_EXISTENT_TYPE',
    timestamp: 'now',
    personaId: 'user1',
    personaTier: 'unknown_tier'
  };
  const badRes = validateTelemetryEvent(invalidEvt);
  assert.equal(badRes.valid, false);
  assert.ok(badRes.errors.length >= 2);
});

test('Telemetry Generator: generates multi-persona synthetic datasets with zero PII', () => {
  const generator = new SyntheticTelemetryGenerator({ daysCount: 7 });
  const dataset = generator.generateDataset();

  assert.ok(dataset.length > 50, 'Dataset should contain comprehensive event series');

  // Verify all events conform to schema
  for (const evt of dataset) {
    const check = validateTelemetryEvent(evt);
    assert.equal(check.valid, true, `Event ${evt.id} failed validation: ${check.errors.join(', ')}`);

    // Strictly check for zero real patient data
    assert.match(evt.personaId, /^synthetic_/, 'Persona ID must start with synthetic_ prefix');
  }

  // Verify personas represented
  const personas = new Set(dataset.map(e => e.personaId));
  assert.ok(personas.has('synthetic_senior_kalyani_001'), 'Senior persona included');
  assert.ok(personas.has('synthetic_adult_aarav_002'), 'Adult persona included');
  assert.ok(personas.has('synthetic_caregiver_sunita_003'), 'Caregiver persona included');
  assert.ok(personas.has('synthetic_doctor_verma_004'), 'Doctor persona included');
});

test('Telemetry Aggregator: computes accurate percentiles, motor friction and difficulty metrics', () => {
  const generator = new SyntheticTelemetryGenerator({ daysCount: 7 });
  const rawEvents = generator.generateDataset();
  const aggregator = new TelemetryAggregator(rawEvents);
  const agg = aggregator.aggregate();

  assert.ok(agg.taskCompletionStats, 'Must compute task completion stats');
  assert.ok(agg.difficultyStats, 'Must compute difficulty stats');
  assert.ok(agg.motorAndFrictionStats.totalTremorDebounces > 0, 'Must track tremor debounces');
  assert.ok(agg.navigationStats.totalGatedRedirects > 0, 'Must track gated redirects');
  assert.ok(agg.accessibilityStats.undersizedTargetsCount > 0, 'Must record undersized targets');
  assert.ok(agg.securityGateStats.repeatedPromptsWithinSession > 0, 'Must record repeated PIN entries');
});

test('Friction Detector: correctly flags duration outliers and accessibility deficits', () => {
  const generator = new SyntheticTelemetryGenerator({ daysCount: 7 });
  const rawEvents = generator.generateDataset();
  const aggregator = new TelemetryAggregator(rawEvents);
  const agg = aggregator.aggregate();

  const detector = new FrictionDetector();
  const friction = detector.detectFriction(agg);

  assert.ok(friction.length >= 4, `Expected at least 4 friction points, got ${friction.length}`);

  const codes = friction.map(f => f.code);
  assert.ok(codes.includes('TOUCH_TARGET_DEFICIT'), 'Detects 32px touch target deficit');
  assert.ok(codes.includes('SILENT_GATED_NAVIGATION'), 'Detects silent condition tab redirects');
  assert.ok(codes.includes('SECURITY_GATE_REPROMPT_FRICTION'), 'Detects caregiver PIN re-prompts');
  assert.ok(codes.includes('SUBTAB_STATE_LOSS'), 'Detects subtab state loss');
});

test('Hybrid Analyzer: enriches findings with cognitive context, clinical notes, and deterministic priorities', async () => {
  const generator = new SyntheticTelemetryGenerator({ daysCount: 7 });
  const rawEvents = generator.generateDataset();
  const aggregator = new TelemetryAggregator(rawEvents);
  const agg = aggregator.aggregate();

  const detector = new FrictionDetector();
  const friction = detector.detectFriction(agg);

  const analyzer = new HybridAnalyzer();
  const findings = await analyzer.analyze(friction, agg);

  for (const f of findings) {
    assert.ok(f.scoring, 'Finding has deterministic scoring');
    assert.ok(['P0', 'P1', 'P2', 'P3'].includes(f.scoring.priority), 'Valid priority assigned');
    assert.ok(f.cognitiveImpact, 'Has cognitive impact synthesis');
    assert.ok(f.clinicalConsiderations, 'Has clinical considerations');
    assert.ok(f.accessibilityImplications, 'Has accessibility notes');
    assert.equal(f.traceability.syntheticSource, true, 'Traceable to synthetic origin');
  }
});

test('Recommendation Engine: generates structured actionable items with all required schema fields', async () => {
  const generator = new SyntheticTelemetryGenerator({ daysCount: 7 });
  const rawEvents = generator.generateDataset();
  const aggregator = new TelemetryAggregator(rawEvents);
  const agg = aggregator.aggregate();

  const detector = new FrictionDetector();
  const friction = detector.detectFriction(agg);

  const analyzer = new HybridAnalyzer();
  const findings = await analyzer.analyze(friction, agg);

  const recEngine = new RecommendationEngine();
  const recs = recEngine.generateRecommendations(findings);

  assert.ok(recs.length >= 4, `Expected at least 4 recommendations, got ${recs.length}`);

  for (const r of recs) {
    assert.ok(r.id.startsWith('REC-3.0-'), 'Valid recommendation ID');
    assert.ok(Object.values(RECOMMENDATION_TYPES).includes(r.type), `Valid action type: ${r.type}`);
    assert.ok(r.title && r.title.length > 10, 'Descriptive title');
    assert.ok(r.problemIdentified, 'Problem identified field present');
    assert.ok(r.evidence, 'Evidence object present');
    assert.ok(r.affectedPersonaAndJourney, 'Affected persona present');
    assert.ok(r.suggestedImprovement, 'Suggested improvement present');
    assert.ok(r.expectedUserBenefit, 'Expected user benefit present');
    assert.ok(r.possibleRisksOrSideEffects, 'Side effects considered');
    assert.ok(r.confidenceLevel.score >= 0.85, 'High confidence score');
    assert.ok(r.verificationStrategy, 'Verification strategy documented');
    assert.equal(r.status, RECOMMENDATION_STATUSES.NEW, 'Initial status is strictly New');
  }

  // Ensure FIX, IMPROVE, SIMPLIFY classifications are present
  const types = recs.map(r => r.type);
  assert.ok(types.includes(RECOMMENDATION_TYPES.FIX), 'Includes FIX recommendation');
  assert.ok(types.includes(RECOMMENDATION_TYPES.IMPROVE), 'Includes IMPROVE recommendation');
  assert.ok(types.includes(RECOMMENDATION_TYPES.SIMPLIFY), 'Includes SIMPLIFY recommendation');
});
