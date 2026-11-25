/**
 * SAKSHAM — SCOPED SCREENSHOT-TO-GEMINI DIAGNOSTIC SERVICE (AUTHORIZED DEVELOPER USE ONLY)
 *
 * Security & Privacy Invariants:
 * 1. Strictly limited to authorized 'admin' / developer role. Ordinary patients, caregivers,
 *    and doctors are rejected cleanly and never see or invoke developer diagnostic tooling.
 * 2. Ephemeral memory only: uploaded screenshots are NEVER persisted to localStorage,
 *    sessionStorage, IndexedDB, Firestore, or Firebase Storage.
 * 3. Scoped Gemini prompt explicitly prohibits repository, terminal, deployment, filesystem,
 *    or Firebase admin access and requires clearly marked hypothesis framing.
 * 4. Remote production hosts dispatch ONLY through App Check-protected Firebase AI Logic
 *    (GoogleAIBackend) — never localhost gateways. Local dev may optionally call local Engine C
 *    multimodal endpoint when running on localhost/127.0.0.1.
 */

import { UserRole } from '../../../types/index.js';
import {
  FirebaseAILogicService,
  MultimodalScreenshotAnalysis,
  CloudGeminiBlockedReason,
} from '../../ai-companion/services/firebaseAILogicService.js';
import { AshaRemoteAdapter } from '../../ai-companion/services/ashaRemoteAdapter.js';

export type SupportedScreenshotMime = 'image/png' | 'image/jpeg' | 'image/webp';

export interface EphemeralScreenshotPayload {
  fileName: string;
  mimeType: SupportedScreenshotMime;
  sizeBytes: number;
  base64Data: string;
}

export interface ScreenshotDiagnosticReport extends MultimodalScreenshotAnalysis {
  antigravityPrompt: string;
  providerUsed: 'firebase_ai_logic' | 'local_gateway_gemini';
  modelUsed: string;
  latencyMs: number;
  analyzedAtIso: string;
}

export interface ScreenshotDiagnosticResponse {
  ok: boolean;
  report?: ScreenshotDiagnosticReport;
  blockedReason?: CloudGeminiBlockedReason | 'UNAUTHORIZED_ROLE' | 'INVALID_INPUT' | 'LOCAL_GATEWAY_UNAVAILABLE';
  errorMessage?: string;
}

const ALLOWED_MIMES: SupportedScreenshotMime[] = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB ephemeral client guard
const LOCAL_DIAGNOSTIC_ENDPOINT = 'http://127.0.0.1:8096/api/diagnostic/screenshot';

export class ScreenshotDiagnosticService {
  /**
   * Only admin/developer sessions may invoke screenshot diagnostics.
   */
  public static isAuthorizedRole(role: UserRole | null | undefined): boolean {
    return role === 'admin';
  }

  /**
   * Validates and converts a browser File into an in-memory base64 payload without storing it anywhere.
   */
  public static async prepareEphemeralScreenshot(file: File): Promise<EphemeralScreenshotPayload> {
    if (!file) {
      throw new Error('Please choose a screenshot file first.');
    }

    if (!ALLOWED_MIMES.includes(file.type as SupportedScreenshotMime)) {
      throw new Error('Unsupported image format. Upload a PNG, JPEG, or WebP screenshot.');
    }

    if (file.size <= 0 || file.size > MAX_SCREENSHOT_BYTES) {
      throw new Error('Screenshot must be non-empty and under 5 MB.');
    }

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = typeof reader.result === 'string' ? reader.result : '';
        const commaIdx = res.indexOf(',');
        if (commaIdx === -1) {
          reject(new Error('Could not decode uploaded screenshot image.'));
          return;
        }
        resolve(res.slice(commaIdx + 1));
      };
      reader.onerror = () => reject(new Error('Failed to read uploaded screenshot file.'));
      reader.readAsDataURL(file);
    });

    return {
      fileName: file.name,
      mimeType: file.type as SupportedScreenshotMime,
      sizeBytes: file.size,
      base64Data,
    };
  }

  /**
   * Builds a scoped, ready-to-copy remediation prompt for Antigravity from the structured report.
   */
  public static buildAntigravityRemediationPrompt(
    analysis: MultimodalScreenshotAnalysis,
    developerIssueDescription: string,
    routeHint?: string
  ): string {
    const reproList = analysis.reproductionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');
    const fixList = analysis.suggestedRemediation.map((s) => `- ${s}`).join('\n');
    const testList = analysis.suggestedVerificationTests.map((s) => `- ${s}`).join('\n');

    return [
      '# SAKSHAM UI DIAGNOSTIC REMEDIATION TASK',
      '',
      `## Context`,
      `- Developer Report: ${developerIssueDescription.trim()}`,
      `- Affected Screen / Component: ${analysis.affectedComponent}${routeHint ? ` (Hint: ${routeHint.trim()})` : ''}`,
      '',
      `## Observed Issue`,
      analysis.observedIssue,
      '',
      `## Expected Behavior`,
      analysis.expectedBehavior,
      '',
      `## Reproduction Steps`,
      reproList,
      '',
      `## Likely Cause (Hypothesis — verify in source before editing)`,
      analysis.likelyCauseHypothesis,
      '',
      `## Suggested Remediation`,
      fixList,
      '',
      `## Suggested Verification Tests`,
      testList,
      '',
      'Please inspect the relevant components directly, preserve existing safety/privacy invariants, apply a minimal targeted fix, and run the verification tests.',
    ].join('\n');
  }

  private static normalizeStructuredReport(
    raw: Partial<MultimodalScreenshotAnalysis>,
    issueDescription: string,
    routeHint?: string
  ): MultimodalScreenshotAnalysis {
    const toList = (val: unknown, fallback: string[]): string[] =>
      Array.isArray(val) && val.length > 0 ? val.map((x) => String(x)).filter(Boolean) : fallback;

    const rawHyp = String(raw.likelyCauseHypothesis || '').trim();
    const hypothesis = /^hypothesis\b/i.test(rawHyp)
      ? rawHyp
      : `Hypothesis: ${rawHyp || 'Inspect state/translation bindings for the visible screen region.'}`;

    return {
      observedIssue: String(raw.observedIssue || issueDescription).trim(),
      affectedComponent: String(raw.affectedComponent || routeHint || 'Not clearly identifiable from screenshot').trim(),
      expectedBehavior: String(raw.expectedBehavior || 'UI renders cleanly in the active language with no overlapping text or visible error banners.').trim(),
      reproductionSteps: toList(raw.reproductionSteps, [
        'Navigate to the visible route.',
        'Re-trigger the state shown in the screenshot.',
      ]),
      likelyCauseHypothesis: hypothesis,
      suggestedRemediation: toList(raw.suggestedRemediation, [
        'Verify locale keys across all 7 languages and responsive component layout.',
      ]),
      suggestedVerificationTests: toList(raw.suggestedVerificationTests, [
        'Run focused Vitest UI + 7-language transition tests and inspect in browser.',
      ]),
    };
  }

  /**
   * Analyzes an uploaded UI screenshot + developer description through Gemini multimodal.
   */
  public static async analyzeScreenshot(params: {
    callerRole: UserRole | null | undefined;
    screenshot: EphemeralScreenshotPayload;
    issueDescription: string;
    routeHint?: string;
  }): Promise<ScreenshotDiagnosticResponse> {
    const { callerRole, screenshot, issueDescription, routeHint } = params;

    if (!this.isAuthorizedRole(callerRole)) {
      return {
        ok: false,
        blockedReason: 'UNAUTHORIZED_ROLE',
        errorMessage: 'Developer Visual Diagnostics requires an authorized admin/developer session.',
      };
    }

    if (!issueDescription || issueDescription.trim().length < 5) {
      return {
        ok: false,
        blockedReason: 'INVALID_INPUT',
        errorMessage: 'Please enter a brief description of the visual or functional issue (at least 5 characters).',
      };
    }

    if (!screenshot?.base64Data || !ALLOWED_MIMES.includes(screenshot.mimeType)) {
      return {
        ok: false,
        blockedReason: 'INVALID_INPUT',
        errorMessage: 'Valid ephemeral PNG, JPEG, or WebP screenshot data is required.',
      };
    }

    // 1. Primary Cloud Path: Firebase AI Logic (GoogleAIBackend + App Check)
    const cloudStatus = FirebaseAILogicService.getStatus();
    if (cloudStatus.canDispatchCloudGemini) {
      const cloudRes = await FirebaseAILogicService.analyzeScreenshotMultimodal(
        screenshot.base64Data,
        screenshot.mimeType,
        issueDescription,
        routeHint
      );

      if (cloudRes.ok && cloudRes.analysis) {
        const antigravityPrompt = this.buildAntigravityRemediationPrompt(
          cloudRes.analysis,
          issueDescription,
          routeHint
        );
        return {
          ok: true,
          report: {
            ...cloudRes.analysis,
            antigravityPrompt,
            providerUsed: 'firebase_ai_logic',
            modelUsed: cloudRes.modelUsed,
            latencyMs: cloudRes.latencyMs,
            analyzedAtIso: new Date().toISOString(),
          },
        };
      }

      // On remote production hosts, fail closed honestly — never probe localhost
      if (!AshaRemoteAdapter.shouldUseLocalGateway()) {
        return {
          ok: false,
          blockedReason: cloudRes.blockedReason || 'SERVICE_DISABLED',
          errorMessage: cloudRes.errorMessage || 'Firebase AI Logic multimodal analysis failed.',
        };
      }
    }

    // 2. Local Development Gateway Fallback (ONLY on localhost / 127.0.0.1)
    if (AshaRemoteAdapter.shouldUseLocalGateway()) {
      const startedAt = Date.now();
      try {
        const res = await fetch(LOCAL_DIAGNOSTIC_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mime_type: screenshot.mimeType,
            image_base64: screenshot.base64Data,
            issue_description: issueDescription.trim(),
            route_hint: routeHint?.trim() || '',
          }),
        });
        const data = await res.json();
        if (res.ok && data?.ok && data?.analysis) {
          const normalized = this.normalizeStructuredReport(
            data.analysis,
            issueDescription,
            routeHint
          );
          return {
            ok: true,
            report: {
              ...normalized,
              antigravityPrompt: this.buildAntigravityRemediationPrompt(
                normalized,
                issueDescription,
                routeHint
              ),
              providerUsed: 'local_gateway_gemini',
              modelUsed: String(data.model_used || 'gemini-3.5-flash-lite (Local Gateway)'),
              latencyMs: Date.now() - startedAt,
              analyzedAtIso: new Date().toISOString(),
            },
          };
        }
        return {
          ok: false,
          blockedReason: 'LOCAL_GATEWAY_UNAVAILABLE',
          errorMessage:
            data?.error ||
            cloudStatus.statusMessage ||
            'Gemini screenshot diagnostic endpoint returned an error.',
        };
      } catch {
        return {
          ok: false,
          blockedReason: cloudStatus.blockedReason || 'LOCAL_GATEWAY_UNAVAILABLE',
          errorMessage:
            cloudStatus.blockedReason === 'APP_CHECK_NOT_CONFIGURED'
              ? cloudStatus.statusMessage
              : 'Neither Firebase AI Logic nor local Engine C diagnostic gateway (127.0.0.1:8096) is available right now.',
        };
      }
    }

    // 3. Remote fail-closed when Firebase AI Logic / App Check not provisioned
    return {
      ok: false,
      blockedReason: cloudStatus.blockedReason || 'APP_CHECK_NOT_CONFIGURED',
      errorMessage: cloudStatus.statusMessage,
    };
  }
}
