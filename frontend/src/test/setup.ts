import '@testing-library/jest-dom';
import { vi } from 'vitest';

// In-memory Firestore test store for fast, deterministic unit test verification
export const mockFirestoreStore: Record<string, Record<string, any>> = {};

// In-memory localStorage polyfill for headless Node.js test environment
const inMemoryLocalStorage: Record<string, string> = {};
const mockStorage = {
  getItem: (key: string) => (key in inMemoryLocalStorage ? inMemoryLocalStorage[key] : null),
  setItem: (key: string, val: string) => {
    inMemoryLocalStorage[key] = String(val);
  },
  removeItem: (key: string) => {
    delete inMemoryLocalStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(inMemoryLocalStorage)) {
      delete inMemoryLocalStorage[k];
    }
  },
  get length() {
    return Object.keys(inMemoryLocalStorage).length;
  },
  key: (index: number) => Object.keys(inMemoryLocalStorage)[index] || null,
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    configurable: true,
    enumerable: true,
    writable: true,
  });
}
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  configurable: true,
  enumerable: true,
  writable: true,
});

export function resetMockFirestoreStore() {
  for (const k of Object.keys(mockFirestoreStore)) {
    delete mockFirestoreStore[k];
  }
}

vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn((_db, path: string) => ({ type: 'collection', path })),
    doc: vi.fn((_db, path: string, ...segments: string[]) => {
      const fullPath = segments.length > 0 ? `${path}/${segments.join('/')}` : path;
      const parts = fullPath.split('/');
      const coll = parts.length > 1 ? parts[0] : 'root';
      const docId = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
      return { type: 'doc', path: fullPath, coll, docId };
    }),
    query: vi.fn((collRef: any, ...constraints: any[]) => ({ type: 'query', collRef, constraints })),
    where: vi.fn((field: string, op: string, value: any) => ({ type: 'where', field, op, value })),
    orderBy: vi.fn((field: string, direction?: string) => ({ type: 'orderBy', field, direction })),
    getDoc: vi.fn(async (docRef: any) => {
      const data = mockFirestoreStore[docRef.coll]?.[docRef.docId];
      return {
        exists: () => Boolean(data),
        data: () => (data ? { ...data } : undefined),
        id: docRef.docId,
      };
    }),
    getDocs: vi.fn(async (qRef: any) => {
      const coll = qRef.collRef?.path || qRef.path;
      const allDocs = Object.entries(mockFirestoreStore[coll] || {}).map(([id, data]) => ({
        id,
        data: () => ({ ...data }),
      }));
      let filtered = allDocs;
      if (qRef.constraints) {
        for (const c of qRef.constraints) {
          if (c && c.type === 'where') {
            filtered = filtered.filter((d) => {
              const val = d.data()[c.field];
              if (c.op === '==') return val === c.value;
              return true;
            });
          }
        }
      }
      return {
        empty: filtered.length === 0,
        docs: filtered,
        size: filtered.length,
      };
    }),
    setDoc: vi.fn(async (docRef: any, data: any, options?: { merge?: boolean }) => {
      if (!mockFirestoreStore[docRef.coll]) {
        mockFirestoreStore[docRef.coll] = {};
      }
      if (options?.merge && mockFirestoreStore[docRef.coll][docRef.docId]) {
        mockFirestoreStore[docRef.coll][docRef.docId] = {
          ...mockFirestoreStore[docRef.coll][docRef.docId],
          ...data,
        };
      } else {
        mockFirestoreStore[docRef.coll][docRef.docId] = { ...data };
      }
    }),
    updateDoc: vi.fn(async (docRef: any, data: any) => {
      if (!mockFirestoreStore[docRef.coll]) {
        mockFirestoreStore[docRef.coll] = {};
      }
      mockFirestoreStore[docRef.coll][docRef.docId] = {
        ...mockFirestoreStore[docRef.coll][docRef.docId],
        ...data,
      };
    }),
    deleteDoc: vi.fn(async (docRef: any) => {
      if (mockFirestoreStore[docRef.coll]) {
        delete mockFirestoreStore[docRef.coll][docRef.docId];
      }
    }),
    addDoc: vi.fn(async (collRef: any, data: any) => {
      const coll = collRef.path;
      const docId = `auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      if (!mockFirestoreStore[coll]) {
        mockFirestoreStore[coll] = {};
      }
      mockFirestoreStore[coll][docId] = { ...data, id: docId };
      return { id: docId };
    }),
    onSnapshot: vi.fn((_queryRef: any, _callback: any) => {
      return () => {};
    }),
  };
});

// Mock Web Speech API SpeechSynthesis and SpeechSynthesisUtterance
if (typeof window !== 'undefined') {
  window.speechSynthesis = {
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    getVoices: () => [],
    onvoiceschanged: null,
    pending: false,
    speaking: false,
    paused: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as any;

  (window as any).SpeechSynthesisUtterance = function (text: string) {
    return {
      text,
      lang: 'en-IN',
      pitch: 1,
      rate: 1,
      volume: 1,
      onstart: null,
      onend: null,
      onerror: null,
    };
  };
}
