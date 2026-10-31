import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Provide standard Storage polyfill if not present in test runner environment
const memoryStore: Record<string, string> = {};
const storageMock = {
  getItem: (key: string) => (key in memoryStore ? memoryStore[key] : null),
  setItem: (key: string, value: string) => { memoryStore[key] = String(value); },
  removeItem: (key: string) => { delete memoryStore[key]; },
  clear: () => { Object.keys(memoryStore).forEach((k) => delete memoryStore[k]); },
  key: (i: number) => Object.keys(memoryStore)[i] ?? null,
  get length() { return Object.keys(memoryStore).length; },
};

if (typeof window !== 'undefined') {
  try {
    Object.defineProperty(window, 'localStorage', { value: storageMock, writable: true, configurable: true });
  } catch (e) {}
}
if (typeof globalThis !== 'undefined') {
  try {
    Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true, configurable: true });
  } catch (e) {}
}

/**
 * Automatically unmount and clean up the rendered DOM after each test.
 * This prevents state leaking between test cases.
 */
afterEach(() => {
  cleanup();
});
