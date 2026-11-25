/**
 * SAKSHAM NEURO-CARE — PHASE 3.8
 * CENTRALIZED APPLICATION SECURITY & DATA SANITIZATION UTILITIES
 *
 * Implements:
 * 1. XSS & HTML injection sanitization (preserves Indian languages, emojis, and punctuation).
 * 2. Strict length bounds and control character stripping.
 * 3. Alphanumeric identifier validation (prevents directory traversal and NoSQL injection).
 * 4. Fault-tolerant JSON parsing for localStorage/sessionStorage.
 * 5. Safe URL and navigation validation.
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, client-side deterministic guards).
 */

export class SecurityUtils {
  /**
   * Maximum permitted lengths for user-controllable text fields
   */
  public static readonly LIMITS = {
    TITLE: 120,
    INSTRUCTION: 500,
    CONCERN_DESCRIPTION: 1000,
    CONTEXT_NOTES: 1000,
    CHAT_MESSAGE: 500,
    AMENDMENT_REASON: 500,
    NAME_OR_LABEL: 100,
    ID: 80,
  };

  /**
   * Sanitizes plain text input by:
   * - Removing null bytes, ANSI escapes, and dangerous non-printable control characters
   * - Stripping HTML tags, scripts, iframes, and event handlers
   * - Preserving legitimate multi-script Indian language unicode (Devanagari, Tamil, Telugu, Kannada, Bengali, etc.), emojis, and standard punctuation
   * - Trimming and clamping to specified maxLength
   */
  public static sanitizePlainText(input: unknown, maxLength: number = 1000): string {
    if (input === null || input === undefined) return '';
    let text = typeof input === 'string' ? input : String(input);

    // 1. Remove null bytes and dangerous control characters (except newline, tab, carriage return)
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // 2. Strip executable/embedded blocks and their inner contents
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    text = text.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

    // 3. Strip remaining HTML tags
    text = text.replace(/<[^>]*>/g, '');

    // 4. Remove inline javascript: / vbscript: / data: URI schemes
    text = text.replace(/\b(?:javascript|vbscript|data):[^\s]*/gi, '');

    // 5. Remove inline event handler attributes like onerror=, onload=, onclick=
    text = text.replace(/\b(?:on\w+)\s*=\s*["'][^"']*["']/gi, '');
    text = text.replace(/\b(?:on\w+)\s*=\s*[^>\s]+/gi, '');

    // 5. Trim and clamp length
    text = text.trim();
    if (maxLength > 0 && text.length > maxLength) {
      text = text.slice(0, maxLength);
    }

    return text;
  }

  /**
   * Sanitizes HTML strings for safe rendering, escaping dangerous characters.
   */
  public static escapeHtml(input: string): string {
    if (!input) return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Validates document and patient identifiers.
   * Allows alphanumeric characters, underscores, and hyphens (max 80 chars).
   * Strictly disallows directory traversal (../, ..\\), slashes, dots, or whitespace.
   */
  public static isValidIdentifier(id: unknown): boolean {
    if (typeof id !== 'string') return false;
    const clean = id.trim();
    if (clean.length === 0 || clean.length > this.LIMITS.ID) return false;

    // Reject path traversal attempts
    if (clean.includes('..') || clean.includes('/') || clean.includes('\\')) {
      return false;
    }

    // Must be valid alphanumeric, hyphen, underscore
    return /^[a-zA-Z0-9_-]+$/.test(clean);
  }

  /**
   * Fault-tolerant JSON parser that prevents application crashes from corrupted
   * or maliciously manipulated localStorage / sessionStorage records.
   */
  public static safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw || typeof raw !== 'string') return fallback;
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || parsed === undefined) return fallback;
      return parsed as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Validates safe internal application routes and local URLs, preventing open redirects.
   */
  public static isSafeNavigationUrl(url: unknown): boolean {
    if (typeof url !== 'string') return false;
    const clean = url.trim();
    if (!clean) return false;

    // Disallow javascript: or data: URIs
    if (/^(?:javascript|data|vbscript):/i.test(clean)) {
      return false;
    }

    // Relative application routes are safe
    if (clean.startsWith('/') && !clean.startsWith('//')) {
      return true;
    }

    // Localhost demo ports are safe
    if (/^http:\/\/127\.0\.0\.1:(?:5173|8085|8096)\//i.test(clean)) {
      return true;
    }

    return false;
  }
}
