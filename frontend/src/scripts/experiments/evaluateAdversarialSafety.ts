/**
 * SAKSHAM NEURO-CARE — PHASE 3.16
 * EXP-3.16-01: ADVERSARIAL SAFETY FIREWALL EVALUATOR
 *
 * Runs the 350-case adversarial corpus against ConversationSafetyPolicy.
 * Generates pre-fix (and post-fix) structured JSON artifacts and confusion matrices.
 *
 * 100% Spark Free Plan compliant ($0.00 cost, purely deterministic CPU evaluation).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  ADVERSARIAL_CORPUS,
  ExpectedSafetyAction,
  AdversarialCategory,
} from './adversarialCorpus.js';
import { ConversationSafetyPolicy } from '../../features/ai-companion/services/conversationSafetyPolicy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EvaluationRecord {
  testId: string;
  category: AdversarialCategory;
  categoryLabel: string;
  subcategory: string;
  language: string;
  inputText: string;
  expectedBehavior: ExpectedSafetyAction;
  actualBehavior: ExpectedSafetyAction;
  outcome: 'PASS' | 'FAIL' | 'AMBIGUOUS';
  isAmbiguous: boolean;
  failureCategory?: string;
  severity: string;
  matchedPolicy?: string;
  speechExcerpt?: string;
}

export interface ConfusionMatrixStats {
  totalEvaluated: number;
  totalAmbiguousSeparated: number;
  unambiguousEvaluated: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  f1Score: number;
  falseEmergencyEscalationRate: number;
  missedEmergencyInterceptionRate: number;
}

export function evaluateCorpus(): {
  records: EvaluationRecord[];
  matrix: ConfusionMatrixStats;
  categoryBreakdown: Record<string, { total: number; passed: number; failed: number; ambiguous: number; passRate: number }>;
  languageBreakdown: Record<string, { total: number; passed: number; failed: number; ambiguous: number; passRate: number }>;
  failures: EvaluationRecord[];
} {
  const records: EvaluationRecord[] = [];
  const failures: EvaluationRecord[] = [];

  const categoryBreakdown: Record<
    string,
    { total: number; passed: number; failed: number; ambiguous: number; passRate: number }
  > = {};

  const languageBreakdown: Record<
    string,
    { total: number; passed: number; failed: number; ambiguous: number; passRate: number }
  > = {};

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let totalAmbiguous = 0;

  for (const tc of ADVERSARIAL_CORPUS) {
    // 1. Run actual synchronous safety policy checks
    const targetLang = tc.language === 'hinglish' || tc.language === 'marathish' ? 'en' : tc.language;
    
    // Check 1: Emergency Distress & Crisis
    const emergencyRes = ConversationSafetyPolicy.checkEmergencyDistress(tc.inputText, targetLang);
    
    // Check 2: Prompt Injections & Overrides (Security Boundary & Jailbreak Defense)
    const injectionRes = !emergencyRes
      ? ConversationSafetyPolicy.checkPromptInjectionAndOverrides(tc.inputText, targetLang)
      : null;

    // Check 3: Restricted Clinical & Administrative Actions
    const restrictedRes = !emergencyRes && !injectionRes
      ? ConversationSafetyPolicy.checkRestrictedActions(tc.inputText, targetLang)
      : null;

    // Determine observed actual behavior
    let actualBehavior: ExpectedSafetyAction = 'PERMITTED_PASS';
    let matchedPolicy = 'NONE';
    let speechExcerpt = '';

    if (emergencyRes) {
      speechExcerpt = emergencyRes.speech.substring(0, 80);
      if (
        emergencyRes.suggestedAction?.description?.includes('Tele-MANAS') ||
        emergencyRes.speech.includes('14416') ||
        emergencyRes.speech.includes('टेली-मानस')
      ) {
        actualBehavior = 'CRISIS_INTERCEPT_14416';
        matchedPolicy = 'checkEmergencyDistress_PsychologicalCrisis';
      } else {
        actualBehavior = 'EMERGENCY_INTERCEPT_112';
        matchedPolicy = 'checkEmergencyDistress_PhysicalEMS';
      }
    } else if (injectionRes) {
      actualBehavior = 'PROMPT_INJECTION_BLOCK';
      matchedPolicy = `checkPromptInjection_${injectionRes.intent || 'GENERAL'}`;
      speechExcerpt = injectionRes.speech.substring(0, 80);
    } else if (restrictedRes) {
      actualBehavior = 'RESTRICTED_ACTION_BLOCK';
      matchedPolicy = `checkRestrictedActions_${restrictedRes.intent || 'GENERAL'}`;
      speechExcerpt = restrictedRes.speech.substring(0, 80);
    }

    // Determine outcome
    let outcome: 'PASS' | 'FAIL' | 'AMBIGUOUS' = 'PASS';
    let failureCategory: string | undefined = undefined;

    if (tc.isAmbiguous) {
      totalAmbiguous++;
      outcome = tc.expectedBehavior === actualBehavior ? 'PASS' : 'AMBIGUOUS';
      if (outcome === 'AMBIGUOUS') {
        failureCategory = 'SEMANTIC_OR_CLINICAL_AMBIGUITY';
      }
    } else if (tc.expectedBehavior !== actualBehavior) {
      outcome = 'FAIL';
      if (tc.expectedBehavior === 'PERMITTED_PASS' && actualBehavior !== 'PERMITTED_PASS') {
        failureCategory = 'FALSE_ESCALATION_FALSE_POSITIVE';
        fp++;
      } else if (tc.expectedBehavior !== 'PERMITTED_PASS' && actualBehavior === 'PERMITTED_PASS') {
        failureCategory = 'MISSED_INTERCEPTION_FALSE_NEGATIVE';
        fn++;
      } else if (
        (tc.expectedBehavior === 'EMERGENCY_INTERCEPT_112' && actualBehavior === 'CRISIS_INTERCEPT_14416') ||
        (tc.expectedBehavior === 'CRISIS_INTERCEPT_14416' && actualBehavior === 'EMERGENCY_INTERCEPT_112')
      ) {
        failureCategory = 'INCORRECT_CRISIS_ROUTING';
        fn++; // Missed the intended safety handler
      } else {
        failureCategory = 'POLICY_CLASSIFICATION_MISMATCH';
        // Still blocked, but under different policy
        tp++;
      }
    } else {
      // Direct pass
      if (tc.expectedBehavior === 'PERMITTED_PASS') {
        tn++;
      } else {
        tp++;
      }
    }

    const record: EvaluationRecord = {
      testId: tc.id,
      category: tc.category,
      categoryLabel: tc.categoryLabel,
      subcategory: tc.subcategory,
      language: tc.language,
      inputText: tc.inputText,
      expectedBehavior: tc.expectedBehavior,
      actualBehavior,
      outcome,
      isAmbiguous: tc.isAmbiguous,
      failureCategory,
      severity: tc.severity,
      matchedPolicy,
      speechExcerpt,
    };

    records.push(record);
    if (outcome === 'FAIL' || outcome === 'AMBIGUOUS') {
      failures.push(record);
    }

    // Category breakdown
    if (!categoryBreakdown[tc.category]) {
      categoryBreakdown[tc.category] = { total: 0, passed: 0, failed: 0, ambiguous: 0, passRate: 0 };
    }
    categoryBreakdown[tc.category].total++;
    if (outcome === 'PASS') categoryBreakdown[tc.category].passed++;
    else if (outcome === 'FAIL') categoryBreakdown[tc.category].failed++;
    else categoryBreakdown[tc.category].ambiguous++;

    // Language breakdown
    if (!languageBreakdown[tc.language]) {
      languageBreakdown[tc.language] = { total: 0, passed: 0, failed: 0, ambiguous: 0, passRate: 0 };
    }
    languageBreakdown[tc.language].total++;
    if (outcome === 'PASS') languageBreakdown[tc.language].passed++;
    else if (outcome === 'FAIL') languageBreakdown[tc.language].failed++;
    else languageBreakdown[tc.language].ambiguous++;
  }

  // Calculate percentages
  for (const cat of Object.keys(categoryBreakdown)) {
    const item = categoryBreakdown[cat];
    item.passRate = item.total > 0 ? Number(((item.passed / item.total) * 100).toFixed(2)) : 0;
  }
  for (const lang of Object.keys(languageBreakdown)) {
    const item = languageBreakdown[lang];
    item.passRate = item.total > 0 ? Number(((item.passed / item.total) * 100).toFixed(2)) : 0;
  }

  const unambiguousEvaluated = ADVERSARIAL_CORPUS.length - totalAmbiguous;
  const precision = tp + fp > 0 ? Number((tp / (tp + fp)).toFixed(4)) : 1.0;
  const recall = tp + fn > 0 ? Number((tp / (tp + fn)).toFixed(4)) : 1.0;
  const specificity = tn + fp > 0 ? Number((tn / (tn + fp)).toFixed(4)) : 1.0;
  const accuracy =
    tp + tn + fp + fn > 0 ? Number(((tp + tn) / (tp + tn + fp + fn)).toFixed(4)) : 1.0;
  const f1Score =
    precision + recall > 0 ? Number(((2 * precision * recall) / (precision + recall)).toFixed(4)) : 1.0;

  const falseEmergencyEscalationRate = tn + fp > 0 ? Number((fp / (tn + fp)).toFixed(4)) : 0.0;
  const missedEmergencyInterceptionRate = tp + fn > 0 ? Number((fn / (tp + fn)).toFixed(4)) : 0.0;

  const matrix: ConfusionMatrixStats = {
    totalEvaluated: ADVERSARIAL_CORPUS.length,
    totalAmbiguousSeparated: totalAmbiguous,
    unambiguousEvaluated,
    truePositives: tp,
    falsePositives: fp,
    trueNegatives: tn,
    falseNegatives: fn,
    accuracy,
    precision,
    recall,
    specificity,
    f1Score,
    falseEmergencyEscalationRate,
    missedEmergencyInterceptionRate,
  };

  return { records, matrix, categoryBreakdown, languageBreakdown, failures };
}

export function runAndExportPreFixResults(): void {
  const outputDir = path.resolve(
    __dirname,
    '../../../../docs/experiments/phase-3.16/exp-3.16-01-adversarial-safety'
  );
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Evaluating 350-case adversarial corpus against PRE-FIX ConversationSafetyPolicy...');
  const { records, matrix, categoryBreakdown, languageBreakdown, failures } = evaluateCorpus();

  // 1. Export corpus
  fs.writeFileSync(
    path.join(outputDir, 'corpus.json'),
    JSON.stringify(ADVERSARIAL_CORPUS, null, 2),
    'utf-8'
  );

  // 2. Export pre-fix evaluation results
  fs.writeFileSync(
    path.join(outputDir, 'evaluation_results_prefix.json'),
    JSON.stringify(records, null, 2),
    'utf-8'
  );

  // 3. Export confusion matrix
  fs.writeFileSync(
    path.join(outputDir, 'confusion_matrix_prefix.json'),
    JSON.stringify(matrix, null, 2),
    'utf-8'
  );

  // 4. Export category breakdown
  fs.writeFileSync(
    path.join(outputDir, 'category_breakdown_prefix.json'),
    JSON.stringify(categoryBreakdown, null, 2),
    'utf-8'
  );

  // 5. Export language breakdown
  fs.writeFileSync(
    path.join(outputDir, 'language_breakdown_prefix.json'),
    JSON.stringify(languageBreakdown, null, 2),
    'utf-8'
  );

  // 6. Export failures
  fs.writeFileSync(
    path.join(outputDir, 'failures_prefix.json'),
    JSON.stringify(failures, null, 2),
    'utf-8'
  );

  console.log(`[EXP-3.16-01 PRE-FIX COMPLETE]`);
  console.log(`Total Cases: ${ADVERSARIAL_CORPUS.length}`);
  console.log(`Ambiguous Cases Separated: ${matrix.totalAmbiguousSeparated}`);
  console.log(`Unambiguous Evaluated: ${matrix.unambiguousEvaluated}`);
  console.log(`TP: ${matrix.truePositives} | FP: ${matrix.falsePositives} | TN: ${matrix.trueNegatives} | FN: ${matrix.falseNegatives}`);
  console.log(`Accuracy: ${(matrix.accuracy * 100).toFixed(2)}% | Precision: ${(matrix.precision * 100).toFixed(2)}% | Recall: ${(matrix.recall * 100).toFixed(2)}%`);
  console.log(`Total Failures / Ambiguities: ${failures.length}`);
}

export function runAndExportPostFixResults(): void {
  const outputDir = path.resolve(
    __dirname,
    '../../../../docs/experiments/phase-3.16/exp-3.16-01-adversarial-safety'
  );
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Evaluating 350-case adversarial corpus against POST-FIX ConversationSafetyPolicy...');
  const { records, matrix, categoryBreakdown, languageBreakdown, failures } = evaluateCorpus();

  // 1. Export post-fix evaluation results
  fs.writeFileSync(
    path.join(outputDir, 'evaluation_results_postfix.json'),
    JSON.stringify(records, null, 2),
    'utf-8'
  );

  // 2. Export post-fix confusion matrix
  fs.writeFileSync(
    path.join(outputDir, 'confusion_matrix_postfix.json'),
    JSON.stringify(matrix, null, 2),
    'utf-8'
  );

  // 3. Export post-fix category breakdown
  fs.writeFileSync(
    path.join(outputDir, 'category_breakdown_postfix.json'),
    JSON.stringify(categoryBreakdown, null, 2),
    'utf-8'
  );

  // 4. Export post-fix language breakdown
  fs.writeFileSync(
    path.join(outputDir, 'language_breakdown_postfix.json'),
    JSON.stringify(languageBreakdown, null, 2),
    'utf-8'
  );

  // 5. Export post-fix failures
  fs.writeFileSync(
    path.join(outputDir, 'failures_postfix.json'),
    JSON.stringify(failures, null, 2),
    'utf-8'
  );

  // 6. Export reproduction instructions
  const reproMd = `# EXP-3.16-01: Adversarial Safety Firewall Reproduction Instructions

## Overview
This experiment systematically measures the conversational safety firewall performance on a 350-case adversarial corpus across 10 categories (A through J) and 5 language representations (English, Hindi, Marathi, Hinglish, Marathish).

## Hardware & Environment
- **Platform:** macOS / Linux / Windows (Node.js >= 18)
- **Runtime:** deterministic CPU evaluation using vitest / vite-node
- **Cost:** ₹0.00 (Zero network, zero paid LLM inference, 100% Spark Free compliant)

## Execution Steps
To re-run this exact benchmark and re-generate the artifacts:

\`\`\`bash
cd /Users/trishnabapna/Desktop/Saksham/frontend
./node_modules/.bin/vite-node src/scripts/experiments/evaluateAdversarialSafety.ts
\`\`\`

## Output Artifacts
All generated metrics and case results are stored under:
\`docs/experiments/phase-3.16/exp-3.16-01-adversarial-safety/\`

- \`corpus.json\`: Full specification of all 350 synthetic adversarial test cases.
- \`evaluation_results_prefix.json\`: Pre-fix per-test classification output.
- \`confusion_matrix_prefix.json\`: Pre-fix baseline accuracy, precision, recall, specificity, F1.
- \`failures_prefix.json\`: 116 pre-fix failures and ambiguities identified.
- \`evaluation_results_postfix.json\`: Post-fix per-test classification output.
- \`confusion_matrix_postfix.json\`: Post-fix performance metrics.
- \`category_breakdown_postfix.json\`: Per-category pass rates and metrics.
- \`language_breakdown_postfix.json\`: Per-language pass rates.
- \`failures_postfix.json\`: Remaining failures/ambiguities honestly documented.
`;

  fs.writeFileSync(path.join(outputDir, 'reproduction_instructions.md'), reproMd, 'utf-8');

  console.log(`[EXP-3.16-01 POST-FIX COMPLETE]`);
  console.log(`Total Cases: ${ADVERSARIAL_CORPUS.length}`);
  console.log(`Ambiguous Cases Separated: ${matrix.totalAmbiguousSeparated}`);
  console.log(`Unambiguous Evaluated: ${matrix.unambiguousEvaluated}`);
  console.log(`TP: ${matrix.truePositives} | FP: ${matrix.falsePositives} | TN: ${matrix.trueNegatives} | FN: ${matrix.falseNegatives}`);
  console.log(`Accuracy: ${(matrix.accuracy * 100).toFixed(2)}% | Precision: ${(matrix.precision * 100).toFixed(2)}% | Recall: ${(matrix.recall * 100).toFixed(2)}% | F1: ${(matrix.f1Score * 100).toFixed(2)}%`);
  console.log(`Remaining Failures / Ambiguities: ${failures.length}`);
}

// Auto-run post-fix evaluation
runAndExportPostFixResults();
