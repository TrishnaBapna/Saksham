/**
 * Saksham 3.0 — Master Phase 3 Telemetry Analysis & Recommendation Pipeline
 * Coordinates Telemetry Generation, Aggregation, Friction Detection,
 * Hybrid Cognitive Analysis, Recommendation Synthesis, and Dashboard Data Export.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SyntheticTelemetryGenerator } from './telemetry/generator.mjs';
import { TelemetryAggregator } from './telemetry/aggregator.mjs';
import { FrictionDetector } from './analyzer/friction-detector.mjs';
import { HybridAnalyzer } from './analyzer/hybrid-analyzer.mjs';
import { RecommendationEngine } from './analyzer/recommendation-engine.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runPhase3Pipeline(options = {}) {
  const daysCount = options.daysCount || 14;
  console.log('========================================================================');
  console.log('  SAKSHAM 3.0 — PHASE 3: TELEMETRY ANALYSIS & INTELLIGENT IMPROVEMENT');
  console.log('  Simulated Days:   ', daysCount);
  console.log('  Generated At:     ', new Date().toISOString());
  console.log('========================================================================\n');

  // 1. Generate Synthetic Telemetry
  console.log('[Phase 3] Generating multi-persona synthetic telemetry events...');
  const generator = new SyntheticTelemetryGenerator({ daysCount });
  const rawEvents = generator.generateDataset();
  console.log(`[Phase 3] Generated ${rawEvents.length} synthetic telemetry events.`);

  // 2. Aggregate Telemetry
  console.log('[Phase 3] Aggregating telemetry across tasks, motor friction, navigation, and a11y...');
  const aggregator = new TelemetryAggregator(rawEvents);
  const aggregateData = aggregator.aggregate();
  console.log(`[Phase 3] Aggregation complete: ${Object.keys(aggregateData.taskCompletionStats).length} task groups analyzed.`);

  // 3. Detect Friction Points
  console.log('[Phase 3] Running intelligent friction detector with persona-adaptive thresholds...');
  const detector = new FrictionDetector();
  const frictionItems = detector.detectFriction(aggregateData);
  console.log(`[Phase 3] Detected ${frictionItems.length} active friction points.`);

  // 4. Hybrid Cognitive & Rule-Based Analysis
  console.log('[Phase 3] Running hybrid cognitive and rule-based analyzer...');
  const analyzer = new HybridAnalyzer();
  const analyzedFindings = await analyzer.analyze(frictionItems, aggregateData);
  console.log(`[Phase 3] Completed analysis on ${analyzedFindings.length} findings.`);

  // 5. Synthesize Recommendations
  console.log('[Phase 3] Generating structured recommendations (FIX, IMPROVE, SIMPLIFY, ADD, REVIEW)...');
  const recEngine = new RecommendationEngine();
  const recommendations = recEngine.generateRecommendations(analyzedFindings);
  console.log(`[Phase 3] Generated ${recommendations.length} actionable recommendations.`);

  // 6. Quality Metrics & Overall System Health
  const totalFindings = analyzedFindings.length;
  const criticalCount = analyzedFindings.filter(f => f.severity === 'critical' || f.scoring?.priority === 'P0').length;
  const highCount = analyzedFindings.filter(f => f.severity === 'high' || f.scoring?.priority === 'P1').length;
  const mediumCount = analyzedFindings.filter(f => f.severity === 'medium').length;

  const qualityScore = Math.max(70, Math.min(100, 100 - (criticalCount * 15 + highCount * 5 + mediumCount * 2)));
  const a11yComplianceScore = aggregateData.accessibilityStats.undersizedTargetsCount > 0 ? 92 : 98;

  const fullReport = {
    metadata: {
      engineVersion: 'Saksham 3.0 Phase 3 Quality Engine',
      generatedAt: new Date().toISOString(),
      simulatedDays: daysCount,
      totalEventsAnalyzed: rawEvents.length,
      qualityScore,
      a11yComplianceScore
    },
    summary: {
      totalFrictionPoints: frictionItems.length,
      severityBreakdown: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: analyzedFindings.filter(f => f.severity === 'low').length
      },
      recommendationsByType: {
        FIX: recommendations.filter(r => r.type === 'FIX').length,
        IMPROVE: recommendations.filter(r => r.type === 'IMPROVE').length,
        SIMPLIFY: recommendations.filter(r => r.type === 'SIMPLIFY').length,
        ADD: recommendations.filter(r => r.type === 'ADD').length,
        REVIEW: recommendations.filter(r => r.type === 'REVIEW').length
      }
    },
    recommendations,
    frictionPoints: analyzedFindings,
    aggregateData,
    sampleEvents: rawEvents.slice(0, 50)
  };

  // 7. Export outputs
  const dataDir = path.join(__dirname, 'data');
  const dashboardDir = path.join(__dirname, 'dashboard');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dashboardDir)) fs.mkdirSync(dashboardDir, { recursive: true });

  const exportPath = path.join(dataDir, 'latest-analysis.json');
  fs.writeFileSync(exportPath, JSON.stringify(fullReport, null, 2));
  console.log(`[Phase 3] Analysis report saved to: ${exportPath}`);

  const dashboardDataPath = path.join(dashboardDir, 'data.json');
  fs.writeFileSync(dashboardDataPath, JSON.stringify(fullReport, null, 2));
  console.log(`[Phase 3] Dashboard dataset exported to: ${dashboardDataPath}`);

  // Print Summary
  console.log('\n========================================================================');
  console.log(`  QUALITY SCORE:              ${qualityScore} / 100`);
  console.log(`  ACCESSIBILITY COMPLIANCE:   ${a11yComplianceScore}%`);
  console.log(`  ACTIVE FRICTION POINTS:     ${frictionItems.length}`);
  console.log(`  GENERATED RECOMMENDATIONS:  ${recommendations.length}`);
  console.log('========================================================================');
  for (const rec of recommendations) {
    console.log(`  [${rec.type}] (${rec.priority}) ${rec.title}`);
  }
  console.log('========================================================================\n');

  return fullReport;
}

// Allow direct CLI invocation
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPhase3Pipeline().catch(err => {
    console.error('[Phase 3] Pipeline error:', err);
    process.exit(1);
  });
}
