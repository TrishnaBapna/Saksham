/**
 * Saksham 3.0 Autonomous Quality Assurance Engine
 * Master Test Orchestrator & Multi-Persona Simulation Runner
 */

import path from 'path';
import fs from 'fs';
import { BrowserRunner } from './core/browser-runner.mjs';
import { TestServer } from './core/test-server.mjs';
import { ApplicationScanner } from './core/scanner.mjs';
import { simulatePatientJourney } from './simulations/patient-journey.mjs';
import { simulateCaregiverJourney } from './simulations/caregiver-journey.mjs';
import { simulateClinicianJourney } from './simulations/clinician-journey.mjs';
import { runAccessibilityAudit } from './simulations/accessibility-audit.mjs';

const ARTIFACTS_DIR = '/Users/trishnabapna/.gemini/antigravity/brain/896ac3ab-5b28-4b6f-8124-bb51e3f053a0';

async function main() {
  const args = process.argv.slice(2);
  const targetMode = args.find(a => a.startsWith('--target='))?.split('=')[1] || 'local';
  const customUrl = args.find(a => a.startsWith('--url='))?.split('=')[1];

  console.log('========================================================================');
  console.log('  SAKSHAM 3.0 — AUTONOMOUS TESTING & USER SIMULATION ENGINE');
  console.log('  Target Mode:', targetMode);
  console.log('  Timestamp:  ', new Date().toISOString());
  console.log('========================================================================\n');

  let testServer = null;
  let targetUrl = '';

  if (customUrl) {
    targetUrl = customUrl;
  } else if (targetMode === 'live') {
    targetUrl = 'https://saksham-rho-six.vercel.app/';
  } else {
    console.log('[Runner] Starting local static test server...');
    testServer = new TestServer();
    targetUrl = await testServer.start();
    console.log(`[Runner] Local test server running at: ${targetUrl}`);
  }

  const runner = new BrowserRunner();
  const report = {
    title: 'Saksham 3.0 Autonomous Test & Simulation Suite',
    timestamp: new Date().toISOString(),
    targetUrl,
    targetMode,
    summary: { totalSuites: 5, passedSuites: 0, failedSuites: 0, totalChecks: 0, passedChecks: 0 },
    suites: {}
  };

  try {
    console.log('[Runner] Launching Headless Chrome via CDP...');
    await runner.launch();
    console.log('[Runner] Browser ready. Setting initial desktop viewport (1280x800)...');
    await runner.setDesktopViewport();

    console.log(`[Runner] Navigating to ${targetUrl}...`);
    await runner.navigate(targetUrl, { timeoutMs: 30000, stabilizationMs: 1500 });
    console.log('[Runner] Navigation complete. Stabilized.');

    // Screenshot 1: Initial Desktop Baseline
    const initialScreenshot = path.join(ARTIFACTS_DIR, 'screenshot_qa_baseline_desktop.png');
    await runner.captureScreenshot(initialScreenshot);
    console.log('[Runner] Baseline screenshot captured:', initialScreenshot);

    // -------------------------------------------------------------------------
    // Suite 1: Application Scanner & Graph Builder
    // -------------------------------------------------------------------------
    console.log('\n--> Executing Suite 1: Application Scanner & DOM Graph Builder...');
    const scanner = new ApplicationScanner(runner);
    const scanResults = await scanner.scan();
    const suite1Passed = scanResults.tabs.length >= 5 && scanResults.healthChecks.pixelCharacterAvailable;

    report.suites.applicationScanner = {
      name: 'Application Scanner & Component Graph',
      passed: suite1Passed,
      data: scanResults
    };
    if (suite1Passed) report.summary.passedSuites++; else report.summary.failedSuites++;
    console.log(`[Suite 1 Result] ${suite1Passed ? 'PASSED' : 'FAILED'} — Discovered ${scanResults.tabs.length} tabs, ${scanResults.modals.length} modals.`);

    // -------------------------------------------------------------------------
    // Suite 2: Patient Journey Simulation (Kalyani ji)
    // -------------------------------------------------------------------------
    console.log('\n--> Executing Suite 2: Patient Journey Simulation (Persona: Kalyani ji, Senior)...');
    const patientResult = await simulatePatientJourney(runner);
    const suite2Passed = patientResult.status === 'PASSED';
    report.suites.patientJourney = patientResult;
    if (suite2Passed) report.summary.passedSuites++; else report.summary.failedSuites++;
    console.log(`[Suite 2 Result] ${suite2Passed ? 'PASSED' : 'FAILED'} — Completed ${patientResult.stepsCount || 0} user steps.`);

    // Screenshot 2: Patient Journey Complete
    const patientScreenshot = path.join(ARTIFACTS_DIR, 'screenshot_qa_patient_journey.png');
    await runner.captureScreenshot(patientScreenshot);

    // -------------------------------------------------------------------------
    // Suite 3: Caregiver Journey Simulation (Sunita)
    // -------------------------------------------------------------------------
    console.log('\n--> Executing Suite 3: Caregiver Journey Simulation (Persona: Sunita)...');
    const caregiverResult = await simulateCaregiverJourney(runner);
    const suite3Passed = caregiverResult.status === 'PASSED';
    report.suites.caregiverJourney = caregiverResult;
    if (suite3Passed) report.summary.passedSuites++; else report.summary.failedSuites++;
    console.log(`[Suite 3 Result] ${suite3Passed ? 'PASSED' : 'FAILED'} — Completed ${caregiverResult.stepsCount || 0} user steps.`);

    // Screenshot 3: Caregiver Portal
    const caregiverScreenshot = path.join(ARTIFACTS_DIR, 'screenshot_qa_caregiver_journey.png');
    await runner.captureScreenshot(caregiverScreenshot);

    // -------------------------------------------------------------------------
    // Suite 4: Clinician Journey Simulation (Dr. Gupta)
    // -------------------------------------------------------------------------
    console.log('\n--> Executing Suite 4: Clinician Journey Simulation (Persona: Dr. Gupta)...');
    const clinicianResult = await simulateClinicianJourney(runner);
    const suite4Passed = clinicianResult.status === 'PASSED';
    report.suites.clinicianJourney = clinicianResult;
    if (suite4Passed) report.summary.passedSuites++; else report.summary.failedSuites++;
    console.log(`[Suite 4 Result] ${suite4Passed ? 'PASSED' : 'FAILED'} — Completed ${clinicianResult.stepsCount || 0} user steps.`);

    // -------------------------------------------------------------------------
    // Suite 5: Accessibility, Contrast & Responsive Viewports
    // -------------------------------------------------------------------------
    console.log('\n--> Executing Suite 5: Accessibility, Touch Targets & Viewports...');
    const a11yResult = await runAccessibilityAudit(runner);
    const suite5Passed = a11yResult.colorContrast.passed && a11yResult.responsiveViewports.passed;
    report.suites.accessibilityAudit = a11yResult;
    if (suite5Passed) report.summary.passedSuites++; else report.summary.failedSuites++;
    console.log(`[Suite 5 Result] ${suite5Passed ? 'PASSED' : 'FAILED'} — Contrast: ${a11yResult.colorContrast.passed ? 'PASSED' : 'FAILED'}, Viewports: ${a11yResult.responsiveViewports.passed ? 'PASSED' : 'FAILED'}.`);

    // Screenshot 4: Mobile Viewport Final Check
    await runner.setMobileViewport();
    const mobileScreenshot = path.join(ARTIFACTS_DIR, 'screenshot_qa_mobile_viewport.png');
    await runner.captureScreenshot(mobileScreenshot);
    await runner.setDesktopViewport();

    // Console logs & errors summary
    report.runtimeErrors = runner.pageErrors;
    report.consoleLogsCount = runner.consoleLogs.length;

    console.log('\n========================================================================');
    console.log(`  EXECUTION SUMMARY: ${report.summary.passedSuites}/${report.summary.totalSuites} SUITES PASSED`);
    console.log(`  Page Errors: ${report.runtimeErrors.length}`);
    console.log('========================================================================\n');

    // Write JSON report
    const jsonPath = path.join(process.cwd(), 'qa-engine/reports/latest-run.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`[Runner] JSON report written to: ${jsonPath}`);

    return report;
  } catch (err) {
    console.error('[Runner] Fatal test error:', err);
    throw err;
  } finally {
    console.log('[Runner] Tearing down browser and test server...');
    await runner.close();
    if (testServer) {
      await testServer.stop();
    }
    console.log('[Runner] Teardown complete.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
