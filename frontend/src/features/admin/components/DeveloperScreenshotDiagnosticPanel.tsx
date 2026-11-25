import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import {
  ScreenshotDiagnosticService,
  EphemeralScreenshotPayload,
  ScreenshotDiagnosticReport,
} from '../services/screenshotDiagnosticService.js';
import {
  Camera,
  Upload,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Trash2,
  Loader2,
  Bug,
} from 'lucide-react';

export const DeveloperScreenshotDiagnosticPanel: React.FC = () => {
  const { currentUser, role } = useAuth();
  const { t } = useLanguage();

  const [screenshot, setScreenshot] = useState<EphemeralScreenshotPayload | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [routeHint, setRouteHint] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<ScreenshotDiagnosticReport | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const effectiveRole = currentUser?.role ?? role;
  const isAuthorized = ScreenshotDiagnosticService.isAuthorizedRole(effectiveRole);

  // Purge ephemeral Object URLs on unmount so uploaded images are never retained
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleClearScreenshot = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setScreenshot(null);
    setReport(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setReport(null);
    try {
      const payload = await ScreenshotDiagnosticService.prepareEphemeralScreenshot(file);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const nextPreview = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
      setPreviewUrl(nextPreview);
      setScreenshot(payload);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not process screenshot file.');
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshot) {
      setErrorMsg(t('admin_diag.error_no_file'));
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setCopiedPrompt(false);

    try {
      const res = await ScreenshotDiagnosticService.analyzeScreenshot({
        callerRole: effectiveRole,
        screenshot,
        issueDescription,
        routeHint,
      });

      if (res.ok && res.report) {
        setReport(res.report);
      } else {
        setErrorMsg(res.errorMessage || t('admin_diag.error_generic'));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!report?.antigravityPrompt) return;
    try {
      await navigator.clipboard?.writeText(report.antigravityPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      setErrorMsg(t('admin_diag.copy_failed'));
    }
  };

  if (!isAuthorized) {
    return (
      <div
        data-testid="developer-diagnostic-unauthorized"
        className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-2"
      >
        <AlertTriangle className="w-7 h-7 text-rose-600 mx-auto" />
        <h3 className="text-sm font-bold text-rose-900">{t('admin_diag.unauthorized_title')}</h3>
        <p className="text-xs text-rose-800">{t('admin_diag.unauthorized_desc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="developer-screenshot-diagnostic-panel">
      {/* Scope & Privacy Boundary Banner */}
      <div className="p-4 bg-slate-900 text-slate-100 rounded-3xl border border-slate-700 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-sm text-white flex items-center gap-2">
            <Bug className="w-4 h-4 text-rose-300" />
            <span>{t('admin_diag.title')}</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{t('admin_diag.scope_notice')}</p>
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleAnalyze}
        className="bg-white rounded-3xl p-6 border border-gray-200 shadow-soft-purple space-y-4"
      >
        {/* Screenshot Upload */}
        <div className="space-y-2">
          <label
            htmlFor="screenshot-diagnostic-file"
            className="block text-xs font-bold uppercase tracking-wider text-gray-700"
          >
            {t('admin_diag.upload_label')}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="screenshot-diagnostic-file"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl text-xs font-bold cursor-pointer transition min-h-[44px]"
            >
              <Upload className="w-4 h-4" />
              <span>{screenshot ? screenshot.fileName : t('admin_diag.choose_file')}</span>
            </label>
            <input
              ref={fileInputRef}
              id="screenshot-diagnostic-file"
              data-testid="screenshot-upload-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="sr-only"
            />
            {screenshot && (
              <button
                type="button"
                onClick={handleClearScreenshot}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('admin_diag.clear_btn')}</span>
              </button>
            )}
          </div>

          {previewUrl && (
            <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-2xl max-w-md">
              <img
                src={previewUrl}
                alt="Uploaded UI defect preview"
                className="max-h-56 w-auto rounded-xl object-contain mx-auto"
              />
            </div>
          )}
        </div>

        {/* Route / Screen Hint */}
        <div>
          <label
            htmlFor="diagnostic-route-hint"
            className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1"
          >
            {t('admin_diag.route_hint_label')}
          </label>
          <input
            id="diagnostic-route-hint"
            type="text"
            value={routeHint}
            onChange={(e) => setRouteHint(e.target.value)}
            placeholder={t('admin_diag.route_hint_placeholder')}
            className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-xs font-medium"
          />
        </div>

        {/* Issue Description */}
        <div>
          <label
            htmlFor="diagnostic-issue-desc"
            className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1"
          >
            {t('admin_diag.desc_label')}
          </label>
          <textarea
            id="diagnostic-issue-desc"
            data-testid="diagnostic-issue-textarea"
            rows={3}
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder={t('admin_diag.desc_placeholder')}
            className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-xs font-medium resize-y"
          />
        </div>

        {errorMsg && (
          <div
            data-testid="diagnostic-error-banner"
            role="alert"
            className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 font-semibold flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          data-testid="analyze-screenshot-btn"
          disabled={isAnalyzing}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-black disabled:opacity-60 text-white text-xs font-extrabold transition shadow-md cursor-pointer min-h-[44px]"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('admin_diag.analyzing')}</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-rose-300" />
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{t('admin_diag.analyze_btn')}</span>
            </>
          )}
        </button>
      </form>

      {/* Structured 7-Section Diagnostic Report */}
      {report && (
        <div
          data-testid="diagnostic-report-card"
          className="bg-white rounded-3xl p-6 border-2 border-purple-200 shadow-soft-purple space-y-4 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-purple-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{t('admin_diag.report_heading')}</h3>
              <p className="text-[11px] text-slate-500">
                {report.modelUsed} • {report.latencyMs}ms
              </p>
            </div>
            <button
              type="button"
              data-testid="copy-antigravity-prompt-btn"
              onClick={handleCopyPrompt}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer min-h-[40px]"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>{t('admin_diag.copied_prompt')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{t('admin_diag.copy_prompt')}</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">
                {t('admin_diag.sec_observed')}
              </span>
              <p className="text-slate-800 leading-relaxed">{report.observedIssue}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                {t('admin_diag.sec_affected')}
              </span>
              <p className="text-slate-800 font-mono leading-relaxed">{report.affectedComponent}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                {t('admin_diag.sec_expected')}
              </span>
              <p className="text-slate-800 leading-relaxed">{report.expectedBehavior}</p>
            </div>

            <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                {t('admin_diag.sec_hypothesis')}
              </span>
              <p className="text-amber-950 leading-relaxed">{report.likelyCauseHypothesis}</p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
              {t('admin_diag.sec_repro')}
            </span>
            <ol className="list-decimal list-inside space-y-1 text-slate-800">
              {report.reproductionSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-800">
                {t('admin_diag.sec_remediation')}
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-800">
                {report.suggestedRemediation.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                {t('admin_diag.sec_tests')}
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-800">
                {report.suggestedVerificationTests.map((tItem, i) => (
                  <li key={i}>{tItem}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Copyable Antigravity Prompt Preview */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              {t('admin_diag.prompt_preview')}
            </span>
            <pre
              data-testid="antigravity-prompt-preview"
              className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl text-[11px] font-mono whitespace-pre-wrap max-h-60 overflow-y-auto"
            >
              {report.antigravityPrompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
