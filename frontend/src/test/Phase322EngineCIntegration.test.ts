import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AshaRemoteAdapter } from '../features/ai-companion/services/ashaRemoteAdapter.js';
import { ConversationalAIService } from '../features/ai-companion/services/conversationalAIService.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { ConversationActionRegistry } from '../features/ai-companion/services/conversationActionRegistry.js';
import { NotesService } from '../features/notes/services/notesService.js';
import { RoutineService } from '../features/routines/services/routineService.js';

describe('Phase 3.22: Engine C (Gemini Primary + Qwen Fallback + Secret Hygiene)', () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    ConversationalAIService.clearApiKey();
    AshaRemoteAdapter.resetHealthCacheForTesting();
    ConversationEngine.clearTurnContext();
    ConversationActionRegistry.clearAll();
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    AshaRemoteAdapter.resetHealthCacheForTesting();
    ConversationActionRegistry.clearAll();
  });

  it('1. routes server-side Gemini Primary responses cleanly with REAL_GEMINI_API provenance', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user_input: 'Why is the sky blue?',
        permitted_response: 'Sunlight scatters in the air and blue light spreads farthest, Sunita Ji.',
        response_source: 'GENERATIVE_AI_GEMINI',
        safety_flag: 'NORMAL',
        was_modified_by_guardrail: false,
        expression_id: 9,
        expression_label: 'explaining',
        pose: 'pose_explain',
        history_depth: 2,
        language: 'en',
        latency_ms: 420,
        telemetry: {
          is_genuine_slm: true,
          is_genuine_ai: true,
          provider: 'gemini',
          fallback_used: false,
          engine_unavailable: false,
          slm_latency_ms: 410,
          model: 'gemini-3.5-flash-lite',
        },
      }),
    } as any);

    const res = await ConversationEngine.process('Why is the sky blue?', undefined, 'en', 'sunita_01');
    expect(res.isRealAI).toBe(true);
    expect(res.executionMode).toBe('REAL_GEMINI_API');
    expect(res.responseSource).toBe('GEMINI_PRIMARY');
    expect(res.modelUsed).toBe('gemini-3.5-flash-lite');
    expect(res.speech).toContain('Sunlight scatters');
  });

  it('2. preserves Qwen Fallback provenance when gateway falls back from Gemini', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user_input: 'आशा आज मन उदास है',
        permitted_response: 'चिंता न करें सुनीता जी, मैं आपके साथ हूँ।',
        response_source: 'GENERATIVE_AI_LOCAL_SLM',
        safety_flag: 'NORMAL',
        was_modified_by_guardrail: false,
        expression_id: 7,
        expression_label: 'comforting',
        pose: 'pose_comfort',
        history_depth: 4,
        language: 'hi',
        latency_ms: 850,
        telemetry: {
          is_genuine_slm: true,
          is_genuine_ai: true,
          provider: 'qwen',
          fallback_used: true,
          primary_error: 'timeout',
          engine_unavailable: false,
          slm_latency_ms: 840,
          model: 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU)',
        },
      }),
    } as any);

    const res = await ConversationEngine.process('आशा आज मन उदास है', undefined, 'hi', 'sunita_01');
    expect(res.isRealAI).toBe(true);
    expect(res.executionMode).toBe('LOCAL_RESIDENT_SLM');
    expect(res.responseSource).toBe('LOCAL_MODEL');
    expect(res.modelUsed).toContain('Qwen2.5-1.5B');
  });

  it('3. surfaces honest unavailable state when both Gemini and Qwen fail without pretending AI generated it', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user_input: 'Tell me about stars and planets.',
        permitted_response:
          'I am sorry, Sunita Ji — my conversation service is currently unavailable because neither Gemini nor the local Qwen engine could be reached right now.',
        response_source: 'ENGINE_UNAVAILABLE',
        safety_flag: 'NORMAL',
        was_modified_by_guardrail: false,
        expression_id: 9,
        expression_label: 'explaining',
        pose: 'pose_explain',
        history_depth: 0,
        language: 'en',
        latency_ms: 10020,
        telemetry: {
          is_genuine_slm: false,
          is_genuine_ai: false,
          provider: 'none',
          fallback_used: true,
          engine_unavailable: true,
          primary_error: 'quota_exhausted',
          fallback_error: 'qwen_unavailable',
          slm_latency_ms: 10015,
          model: 'unavailable',
        },
      }),
    } as any);

    const res = await ConversationEngine.process('Tell me about stars and planets.', undefined, 'en', 'sunita_01');
    expect(res.isRealAI).toBe(false);
    expect(res.runtimeState).toBe('LOCAL_SLM_UNAVAILABLE');
    expect(res.responseSource).toBe('FALLBACK');
    expect(res.modelUsed).toBe('unavailable');
    expect(res.speech.toLowerCase()).toContain('unavailable');
    expect(AshaRemoteAdapter.getRuntimeState()).toBe('LOCAL_SLM_UNAVAILABLE');
  });

  it('4. blocks emergency/restricted queries synchronously before contacting remote adapter', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as any;

    const emg = await ConversationEngine.process('I have chest pain and cannot breathe', undefined, 'en', 'sunita_01');
    expect(emg.intent).toBe('EMERGENCY_DISTRESS');
    expect(emg.responseSource).toBe('STATIC_GUIDANCE');

    const lock = await ConversationEngine.process('Disable my gas stove safety lock', undefined, 'en', 'sunita_01');
    expect(lock.intent).toBe('SAFETY_LOCK_OVERRIDE_REFUSAL');
    expect(lock.responseSource).toBe('STATIC_GUIDANCE');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('5. forwards original code-switched and Bengali messages untouched without translating to English', async () => {
    let sentBody: any = null;
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, opts: any) => {
      sentBody = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({
          user_input: sentBody.message,
          permitted_response: 'নিশ্চয়ই সুনিতা জি, আমি আপনার সাথেই আছি।',
          response_source: 'GENERATIVE_AI_GEMINI',
          safety_flag: 'NORMAL',
          was_modified_by_guardrail: false,
          expression_id: 7,
          expression_label: 'comforting',
          pose: 'pose_comfort',
          history_depth: 2,
          language: 'bn',
          latency_ms: 300,
          telemetry: {
            is_genuine_slm: true,
            is_genuine_ai: true,
            provider: 'gemini',
            model: 'gemini-3.5-flash-lite',
            slm_latency_ms: 295,
          },
        }),
      };
    }) as any;

    const mixedInput = 'নমস্কার আশা, today আমার একটু tired লাগছে';
    const res = await ConversationEngine.process(mixedInput, undefined, 'bn', 'sunita_01');
    expect(sentBody).not.toBeNull();
    expect(sentBody.message).toBe(mixedInput);
    expect(sentBody.language).toBe('bn');
    expect(res.speech).toContain('সুনিতা জি');
  });

  it('6. verifies no server secret or GEMINI_API_KEY string appears in frontend source or dist bundles', () => {
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const gatewayEnvPath = path.join(repoRoot, 'research', 'phase-2.5.6-working-asha-companion', '.env');
    const frontendDistAssets = path.join(repoRoot, 'frontend', 'dist', 'assets');

    // Read only gitignored env file inside test assertion without logging/printing on pass
    let configuredKey = '';
    if (fs.existsSync(gatewayEnvPath)) {
      const envRaw = fs.readFileSync(gatewayEnvPath, 'utf-8');
      const match = envRaw.match(/GEMINI_API_KEY\s*=\s*["']?([^\s"'#]+)/);
      if (match) configuredKey = match[1];
    }

    const frontendSrcRoot = path.join(repoRoot, 'frontend', 'src');
    const adapterSrc = fs.readFileSync(
      path.join(frontendSrcRoot, 'features', 'ai-companion', 'services', 'ashaRemoteAdapter.ts'),
      'utf-8'
    );
    expect(adapterSrc).not.toContain('GEMINI_API_KEY');
    expect(adapterSrc).not.toContain('VITE_GEMINI_API_KEY');
    const hasSecretInAdapter = Boolean(configuredKey && configuredKey.length > 10 && adapterSrc.includes(configuredKey));
    expect(hasSecretInAdapter).toBe(false);

    if (fs.existsSync(frontendDistAssets)) {
      const jsFiles = fs.readdirSync(frontendDistAssets).filter((f) => f.endsWith('.js'));
      for (const file of jsFiles) {
        const bundleContent = fs.readFileSync(path.join(frontendDistAssets, file), 'utf-8');
        expect(bundleContent).not.toContain('GEMINI_API_KEY');
        expect(bundleContent).not.toContain('VITE_GEMINI_API_KEY');
        const hasSecretInBundle = Boolean(
          configuredKey && configuredKey.length > 10 && bundleContent.includes(configuredKey)
        );
        expect(hasSecretInBundle).toBe(false);
      }
    }
  });

  it('7. blocks multi-word medication dosage alterations while preserving harmless queries', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user_input: 'x',
        permitted_response: 'Harmless chat response',
        response_source: 'GENERATIVE_AI_GEMINI',
        safety_flag: 'NORMAL',
        telemetry: { is_genuine_slm: true, is_genuine_ai: true, provider: 'gemini', model: 'gemini-3.5-flash-lite', slm_latency_ms: 10 },
      }),
    });
    globalThis.fetch = fetchSpy as any;

    const medicationQueries = [
      'Can I double my blood pressure medication dose tonight?',
      'Should I double my morning blood pressure medication dose tonight?',
      'Can I take twice my blood pressure medication dose?',
      'Can I take an extra blood pressure pill tonight?',
      "Should I increase tonight's sleeping pill dosage?",
    ];

    for (const q of medicationQueries) {
      const medRes = await ConversationEngine.process(q, undefined, 'en', 'sunita_01');
      expect(medRes.intent, `Failed medication block for: ${q}`).toBe('RESTRICTED_ACTION');
      expect(medRes.responseSource).toBe('STATIC_GUIDANCE');
      expect(medRes.actionClass).toBe('class4_restricted');
    }
    expect(fetchSpy).not.toHaveBeenCalled();

    // Harmless conversation must NOT trigger emergency or medication refusal
    const benign = await ConversationEngine.process(
      'I love taking a peaceful morning walk among yellow marigolds.',
      undefined,
      'en',
      'sunita_01'
    );
    expect(benign.intent).not.toBe('EMERGENCY_DISTRESS');
    expect(benign.intent).not.toBe('RESTRICTED_ACTION');
    expect(benign.isEmergency).not.toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('8. enforces Class 3 confirmation and cancellation for all protected note and reminder phrases without Gemini override', async () => {
    const patientId = 'patient_class3_reg';
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user_input: 'x',
        permitted_response: 'Gemini should NEVER overwrite Class 3 protected actions or fabricate saves.',
        response_source: 'GENERATIVE_AI_GEMINI',
        safety_flag: 'NORMAL',
        telemetry: { is_genuine_slm: true, is_genuine_ai: true, provider: 'gemini', model: 'gemini-3.5-flash-lite', slm_latency_ms: 10 },
      }),
    });
    globalThis.fetch = fetchSpy as any;

    // 8a. Phrase 1: "Add a note saying I watered the yellow marigolds today" -> confirm saves note
    expect(NotesService.getNotes(patientId)).toHaveLength(0);
    const note1 = await ConversationEngine.process(
      'Add a note saying I watered the yellow marigolds today',
      undefined,
      'en',
      patientId
    );
    expect(note1.intent).toBe('NOTES_CREATE');
    expect(note1.actionClass).toBe('class3_consequential');
    expect(note1.pendingConfirmation).toBeDefined();
    expect(note1.pendingConfirmation?.actionType).toBe('CREATE_NOTE');
    expect(note1.speech).not.toContain('Gemini should NEVER');
    expect(NotesService.getNotes(patientId)).toHaveLength(0); // Not saved before confirmation

    const confirmNote1 = await ConversationEngine.process('Yes, save it', undefined, 'en', patientId);
    expect(confirmNote1.intent).toBe('CONFIRMATION_YES');
    const savedNotes = NotesService.getNotes(patientId);
    expect(savedNotes.some((n) => n.content.includes('I watered the yellow marigolds today'))).toBe(true);

    // 8b. Phrase 2: "Create a note: watered marigolds" -> cancel leaves NotesService unchanged
    const countBeforeCancel = NotesService.getNotes(patientId).length;
    const note2 = await ConversationEngine.process(
      'Create a note: watered marigolds',
      undefined,
      'en',
      patientId
    );
    expect(note2.intent).toBe('NOTES_CREATE');
    expect(note2.actionClass).toBe('class3_consequential');
    expect(note2.pendingConfirmation).toBeDefined();
    expect(note2.pendingConfirmation?.details?.content).toBe('watered marigolds');
    expect(NotesService.getNotes(patientId)).toHaveLength(countBeforeCancel);

    const cancelNote2 = await ConversationEngine.process('No, cancel that', undefined, 'en', patientId);
    expect(cancelNote2.intent).toBe('CONFIRMATION_NO');
    expect(NotesService.getNotes(patientId)).toHaveLength(countBeforeCancel);

    // 8c. Phrase 3: "Set a reminder to water the yellow marigolds at 5 PM" -> confirm & cancel paths
    const remProposal = await ConversationEngine.process(
      'Set a reminder to water the yellow marigolds at 5 PM',
      undefined,
      'en',
      patientId
    );
    expect(remProposal.intent).toBe('REMINDER_ADD');
    expect(remProposal.actionClass).toBe('class3_consequential');
    expect(remProposal.pendingConfirmation).toBeDefined();
    expect(remProposal.pendingConfirmation?.title).toBe('Water the yellow marigolds');
    expect(remProposal.pendingConfirmation?.details?.time).toBe('05:00 PM');
    expect(RoutineService.getRoutines(patientId).find((r) => r.title === 'Water the yellow marigolds')).toBeUndefined();

    const confirmRem = await ConversationEngine.process('Yes, save it', undefined, 'en', patientId);
    expect(confirmRem.intent).toBe('CONFIRMATION_YES');
    const savedRoutine = RoutineService.getRoutines(patientId).find(
      (r) => r.title === 'Water the yellow marigolds' && r.scheduledTime === '05:00 PM'
    );
    expect(savedRoutine).toBeDefined();

    // Cancel path for reminder
    await ConversationEngine.process('Set a reminder to call Ananya at 7 PM', undefined, 'en', patientId);
    const cancelRem = await ConversationEngine.process('No, cancel that', undefined, 'en', patientId);
    expect(cancelRem.intent).toBe('CONFIRMATION_NO');
    expect(RoutineService.getRoutines(patientId).find((r) => r.scheduledTime === '07:00 PM')).toBeUndefined();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('9. derives gateway status truthfully for Engine C Gemini vs local Qwen', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        service: 'Saksham Asha Conversational AI Engine C',
        status: 'ONLINE',
        port: 8096,
        gemini_configured: true,
        primary_model: 'gemini-3.5-flash-lite',
        fallback_model: 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU)',
        model: 'gemini-3.5-flash-lite (Cloud Primary) + Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU) (Local Fallback)',
        acceleration: 'Cloud Gemini API + Apple Silicon Metal',
        active_patient_id: 'sunita_01',
        history_depth: 0,
        local_only: false,
      }),
    }) as any;

    const health = await AshaRemoteAdapter.checkHealth(true);
    expect(health.isOnline).toBe(true);
    expect(health.geminiConfigured).toBe(true);
    expect(health.primaryModel).toBe('gemini-3.5-flash-lite');

    const status = ConversationalAIService.getStatus();
    expect(status.isConfigured).toBe(true);
    expect(status.mode).toBe('REAL_GEMINI_API');
    expect(status.executionState).toBe('LIVE_AI');
    expect(status.modelIdentifier).toBe('gemini-3.5-flash-lite');
  });
});
