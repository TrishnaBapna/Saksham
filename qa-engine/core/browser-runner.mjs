/**
 * Saksham 3.0 Autonomous Quality Assurance Engine
 * Core Headless Chrome & CDP Runner
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class BrowserRunner {
  constructor(options = {}) {
    this.port = options.port || (9222 + Math.floor(Math.random() * 500));
    this.chromePath = options.chromePath || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    this.userDataDir = path.join(os.tmpdir(), `saksham-qa-chrome-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    this.chromeProcess = null;
    this.ws = null;
    this.msgId = 1;
    this.pendingRequests = new Map();
    this.eventListeners = new Map();
    this.consoleLogs = [];
    this.pageErrors = [];
    this.currentViewport = { width: 1280, height: 800, isMobile: false };
  }

  async launch() {
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }

    const chromeArgs = [
      `--remote-debugging-port=${this.port}`,
      '--remote-allow-origins=*',
      '--allow-insecure-localhost',
      '--disable-web-security',
      '--disable-extensions',
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      `--user-data-dir=${this.userDataDir}`,
      'about:blank'
    ];

    this.chromeProcess = spawn(this.chromePath, chromeArgs, {
      stdio: ['ignore', 'ignore', 'pipe']
    });

    this.chromeProcess.stderr.on('data', () => {});

    this.chromeProcess.on('exit', () => {
      this.chromeProcess = null;
    });

    // Wait for Chrome debugging endpoint
    const wsUrl = await this._waitForWebSocketUrl();
    await this._connectWebSocket(wsUrl);

    // Enable core CDP domains
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('DOM.enable');
    await this.send('CSS.enable');

    this._setupEventHandlers();
  }

  async _waitForWebSocketUrl(maxRetries = 40, delayMs = 150) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json`);
        const targets = await res.json();
        const pageTarget = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
        if (pageTarget) {
          return pageTarget.webSocketDebuggerUrl;
        }
      } catch (err) {
        // Wait and retry
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
    throw new Error(`Failed to connect to Chrome CDP on port ${this.port} after ${maxRetries * delayMs}ms`);
  }

  async _connectWebSocket(url) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.pendingRequests.has(msg.id)) {
            const { resolve, reject } = this.pendingRequests.get(msg.id);
            this.pendingRequests.delete(msg.id);
            if (msg.error) {
              reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              resolve(msg.result);
            }
          } else if (msg.method) {
            this._handleEvent(msg.method, msg.params);
          }
        } catch (e) {
          console.error('[BrowserRunner] Message parsing error:', e);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket not connected'));
      }
      const id = this.msgId++;
      this.pendingRequests.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  _handleEvent(method, params) {
    if (method === 'Runtime.consoleAPICalled') {
      const text = (params.args || []).map(a => a.value !== undefined ? a.value : (a.description || '')).join(' ');
      this.consoleLogs.push({ type: params.type, text, timestamp: Date.now() });
    } else if (method === 'Runtime.exceptionThrown') {
      const desc = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || 'Unknown Error';
      this.pageErrors.push({ error: desc, timestamp: Date.now() });
    }

    const listeners = this.eventListeners.get(method) || [];
    for (const listener of listeners) {
      try { listener(params); } catch (e) {}
    }
  }

  on(method, handler) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, []);
    }
    this.eventListeners.get(method).push(handler);
  }

  _setupEventHandlers() {
    this.on('Page.javascriptDialogOpening', async (params) => {
      // Auto-accept alerts and confirms in automated test mode
      await this.send('Page.handleJavaScriptDialog', { accept: true });
    });
  }

  async setViewport({ width, height, deviceScaleFactor = 1, isMobile = false }) {
    this.currentViewport = { width, height, isMobile };
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile: isMobile
    });
    await this.send('Emulation.setTouchEmulationEnabled', {
      enabled: isMobile
    });
  }

  async setMobileViewport() {
    // iPhone 14 / modern standard mobile viewport
    await this.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true });
  }

  async setTabletViewport() {
    // iPad 10th Gen viewport
    await this.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true });
  }

  async setDesktopViewport() {
    // High-density desktop viewport
    await this.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2, isMobile: false });
  }

  async navigate(url, options = {}) {
    const timeoutMs = options.timeoutMs || 30000;
    const waitUntil = options.waitUntil || 'load';

    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Navigation to ${url} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const onLoaded = async () => {
        clearTimeout(timer);
        // Small stabilization delay for reactive state bootstrap
        await new Promise(r => setTimeout(r, options.stabilizationMs || 800));
        resolve();
      };

      if (waitUntil === 'load') {
        const handler = () => {
          this.eventListeners.get('Page.loadEventFired')?.splice(
            this.eventListeners.get('Page.loadEventFired').indexOf(handler), 1
          );
          onLoaded();
        };
        this.on('Page.loadEventFired', handler);
      } else {
        setTimeout(onLoaded, 1000);
      }

      try {
        await this.send('Page.navigate', { url });
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  async evaluate(fnOrExpr, ...args) {
    let expression;
    if (typeof fnOrExpr === 'function') {
      const argsJson = JSON.stringify(args);
      expression = `(${fnOrExpr.toString()})(...${argsJson})`;
    } else {
      expression = fnOrExpr;
    }

    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });

    if (res.exceptionDetails) {
      const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
      throw new Error(`Evaluation failed: ${desc}`);
    }

    return res.result?.value;
  }

  async waitForSelector(selector, timeoutMs = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const exists = await this.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && (rect.width > 0 || rect.height > 0 || el.offsetParent !== null);
      }, selector);

      if (exists) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for selector "${selector}" after ${timeoutMs}ms`);
  }

  async click(selector) {
    await this.waitForSelector(selector);
    const clicked = await this.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      el.click();
      return true;
    }, selector);
    if (!clicked) throw new Error(`Could not click element "${selector}"`);
    await new Promise(r => setTimeout(r, 200));
  }

  async type(selector, text) {
    await this.waitForSelector(selector);
    await this.evaluate((sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.focus();
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, text);
    await new Promise(r => setTimeout(r, 100));
  }

  async captureScreenshot(filepath) {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const result = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    fs.writeFileSync(filepath, buffer);
    return filepath;
  }

  async close() {
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
    } catch (e) {}

    if (this.chromeProcess) {
      this.chromeProcess.kill('SIGKILL');
      this.chromeProcess = null;
    }

    try {
      if (fs.existsSync(this.userDataDir)) {
        fs.rmSync(this.userDataDir, { recursive: true, force: true });
      }
    } catch (e) {}
  }
}
