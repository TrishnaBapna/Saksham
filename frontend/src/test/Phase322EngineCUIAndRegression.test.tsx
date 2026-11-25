import React, { useEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConversationalSanctuaryStage } from '../features/ai-companion/components/ConversationalSanctuaryStage.js';
import { AshaRemoteAdapter } from '../features/ai-companion/services/ashaRemoteAdapter.js';
import { ConversationalAIService } from '../features/ai-companion/services/conversationalAIService.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { ConversationActionRegistry } from '../features/ai-companion/services/conversationActionRegistry.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { LanguageProvider, useLanguage } from '../context/LanguageContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { AuthProvider } from '../context/AuthContext.js';
import { SupportedLanguage } from '../i18n/types.js';

const LanguageInitializer: React.FC<{ lang: SupportedLanguage }> = ({ lang }) => {
  const { setLanguage } = useLanguage();
  const appliedRef = React.useRef<SupportedLanguage | null>(null);
  useEffect(() => {
    if (appliedRef.current !== lang) {
      appliedRef.current = lang;
      setLanguage(lang);
    }
  }, [lang, setLanguage]);
  return null;
};

const renderWithLang = (ui: React.ReactElement, lang: SupportedLanguage = 'en') => {
  localStorage.setItem('saksham_lang_guest', lang);
  localStorage.setItem('saksham_lang_user_demo-patient-001', lang);
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LanguageProvider>
          <LanguageInitializer lang={lang} />
          <AccessibilityProvider>
            <CharacterProvider>{ui}</CharacterProvider>
          </AccessibilityProvider>
        </LanguageProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Phase 3.22 UI: Provider Badges, Runtime Transparency & hi/mr/bn Localization', () => {
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
    localStorage.clear();
  });

  it('1. distinguishes Cloud Gemini from Local Qwen in status pill, response badge, and transparency modal', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            service: 'Saksham Engine C',
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
        };
      }
      return {
        ok: true,
        json: async () => ({
          user_input: 'Good morning Asha',
          permitted_response: 'Good morning! Wishing you a peaceful sunny morning.',
          response_source: 'GENERATIVE_AI_GEMINI',
          safety_flag: 'NORMAL',
          was_modified_by_guardrail: false,
          expression_id: 2,
          expression_label: 'happy',
          pose: 'pose_happy',
          history_depth: 2,
          language: 'en',
          latency_ms: 210,
          telemetry: {
            is_genuine_slm: true,
            is_genuine_ai: true,
            provider: 'gemini',
            fallback_used: false,
            model: 'gemini-3.5-flash-lite',
            slm_latency_ms: 205,
          },
        }),
      };
    }) as any;

    renderWithLang(<ConversationalSanctuaryStage patientName="Sunita" />, 'en');

    await waitFor(() => {
      expect(screen.getByTestId('ai-status-pill').textContent).toContain('Gemini Primary + Qwen Fallback');
    });

    // Open technical transparency drawer
    fireEvent.click(screen.getByTestId('asha-runtime-details-toggle'));
    const drawer = screen.getByTestId('asha-runtime-details-panel');
    expect(drawer.textContent).toContain('Cloud Gemini API (Server Gateway) + Local Qwen');
    expect(drawer.textContent).not.toContain('₹0.00 (Zero Cloud APIs)');

    // Open AI Engine modal and verify it does NOT claim local SLM or zero cloud APIs when Gemini is primary
    fireEvent.click(screen.getByTestId('ai-status-pill'));
    const modal = screen.getByTestId('ai-transparency-modal');
    expect(modal.textContent).toContain('Cloud Google Gemini Primary');
    expect(modal.textContent).not.toContain('zero cloud API calls');
    fireEvent.click(screen.getByText('Done'));

    // Send message and verify Gemini badge never labels Gemini as Resident Qwen 1.5B
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Good morning Asha' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Wishing you a peaceful sunny morning/i)).toBeInTheDocument();
    });

    const badges = screen.getAllByTestId('ai-execution-badge');
    const latestBadgeText = badges[badges.length - 1].textContent || '';
    expect(latestBadgeText).toContain('Gemini (gemini-3.5-flash-lite)');
    expect(latestBadgeText).toContain('Gemini Primary (Gateway)');
    expect(latestBadgeText).not.toContain('Resident Qwen 1.5B');
  });

  it('2. renders Resident Qwen 1.5B badge accurately when controlled Gemini failure falls back to Qwen', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            status: 'ONLINE',
            gemini_configured: true,
            primary_model: 'gemini-3.5-flash-lite',
            fallback_model: 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU)',
            model: 'gemini-3.5-flash-lite',
            active_patient_id: 'sunita_01',
            history_depth: 0,
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          user_input: 'Tell me a peaceful thought',
          permitted_response: 'May your morning be calm and bright.',
          response_source: 'GENERATIVE_AI_LOCAL_SLM',
          safety_flag: 'NORMAL',
          was_modified_by_guardrail: false,
          expression_id: 7,
          expression_label: 'comforting',
          pose: 'pose_comfort',
          history_depth: 2,
          language: 'en',
          latency_ms: 480,
          telemetry: {
            is_genuine_slm: true,
            is_genuine_ai: true,
            provider: 'qwen',
            fallback_used: true,
            primary_error: 'http_error_404',
            model: 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU)',
            slm_latency_ms: 470,
          },
        }),
      };
    }) as any;

    renderWithLang(<ConversationalSanctuaryStage patientName="Sunita" />, 'en');

    await waitFor(() => {
      expect(screen.getByTestId('ai-status-pill').textContent).toContain('Gemini Primary + Qwen Fallback');
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Tell me a peaceful thought' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/May your morning be calm and bright/i)).toBeInTheDocument();
    });

    const badges = screen.getAllByTestId('ai-execution-badge');
    const latestBadgeText = badges[badges.length - 1].textContent || '';
    expect(latestBadgeText).toContain('Resident Qwen 1.5B (Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU))');
    expect(latestBadgeText).not.toContain('Gemini (');
  });

  it('3. translates status pills, runtime panel labels, and accessibility labels across Hindi, Marathi, and Bengali while keeping model IDs literal', async () => {
    const cases: Array<{ lang: SupportedLanguage; pill: string; badgePill: string; panelTitle: string }> = [
      {
        lang: 'hi',
        pill: 'जेमिनी प्राइमरी + क्वेन बैकअप',
        badgePill: 'आशा की एआई सेवा उपलब्ध है',
        panelTitle: 'रनटाइम आर्किटेक्चर पारदर्शिता',
      },
      {
        lang: 'mr',
        pill: 'जेमिनी प्रायमरी + क्वेन बॅकअप',
        badgePill: 'आशाची एआय सेवा उपलब्ध आहे',
        panelTitle: 'रनटाइम रचना पारदर्शकता',
      },
      {
        lang: 'bn',
        pill: 'জেমিনি প্রাইমারি + কুয়েন ব্যাকআপ',
        badgePill: 'আশার এআই সেবা উপলব্ধ আছে',
        panelTitle: 'রানটাইম স্থাপত্য স্বচ্ছতা',
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ONLINE',
        gemini_configured: true,
        primary_model: 'gemini-3.5-flash-lite',
        fallback_model: 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU)',
        model: 'gemini-3.5-flash-lite',
        active_patient_id: 'sunita_01',
        history_depth: 0,
      }),
    }) as any;

    for (const c of cases) {
      AshaRemoteAdapter.resetHealthCacheForTesting();
      const { unmount } = renderWithLang(<ConversationalSanctuaryStage patientName="Sunita" />, c.lang);

      await waitFor(() => {
        expect(screen.getByTestId('ai-status-pill').textContent).toContain(c.pill);
        expect(screen.getByTestId('asha-runtime-status-pill').textContent).toContain(c.badgePill);
      });

      fireEvent.click(screen.getByTestId('asha-runtime-details-toggle'));
      const panel = screen.getByTestId('asha-runtime-details-panel');
      expect(panel.textContent).toContain(c.panelTitle);
      // Technical identifiers stay literal
      expect(panel.textContent).toContain('gemini-3.5-flash-lite');
      expect(panel.textContent).toContain('LOCAL_SLM_READY');
      expect(panel.textContent).toContain('http://127.0.0.1:8096');

      unmount();
    }
  });
});
