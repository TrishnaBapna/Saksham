import { describe, it, expect, beforeEach } from 'vitest';
import type { Response } from 'express';
import type admin from 'firebase-admin';
import {
  requireAuth,
  requireRole,
  setCustomTokenVerifier,
  AuthenticatedRequest,
  EXPECTED_PROJECT_ID
} from '../middleware/auth.js';
import {
  corsOptions,
  getAllowedOrigins,
  ALLOWED_ORIGINS
} from '../index.js';

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  jsonBody: Record<string, unknown>;
  ended: boolean;
  res: Response;
}

const createMockResponse = (): MockResponse => {
  const mock: MockResponse = {
    statusCode: 200,
    headers: {},
    jsonBody: {},
    ended: false,
    res: {} as Response
  };

  mock.res = {
    status(code: number) {
      mock.statusCode = code;
      return mock.res;
    },
    setHeader(name: string, value: string) {
      mock.headers[name.toLowerCase()] = value;
      return mock.res;
    },
    getHeader(name: string) {
      return mock.headers[name.toLowerCase()];
    },
    json(body: Record<string, unknown>) {
      mock.jsonBody = body;
      mock.ended = true;
      return mock.res;
    },
    end() {
      mock.ended = true;
      return mock.res;
    }
  } as unknown as Response;

  return mock;
};

const createMockRequest = (
  headers: Record<string, string> = {},
  body: Record<string, unknown> = {}
): AuthenticatedRequest => {
  return {
    headers: { ...headers },
    body: { ...body }
  } as unknown as AuthenticatedRequest;
};

describe('SEC-04: Standalone Backend Authentication & CORS Hardening', () => {
  beforeEach(() => {
    // Reset any custom token verifiers between tests to guarantee isolation
    setCustomTokenVerifier(null);
  });

  // =========================================================================
  // AUTHENTICATION SCENARIOS (A - L)
  // =========================================================================

  describe('Authentication Scenarios (A - L)', () => {
    it('Scenario A: rejects request when Authorization header is missing', async () => {
      const req = createMockRequest({});
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(401);
      expect(mock.jsonBody.error).toBe('UNAUTHORIZED');
      expect(mock.jsonBody.message).toContain('Authorization header is required');
      expect(req.user).toBeUndefined();
    });

    it('Scenario B1: rejects malformed Authorization header not starting with Bearer', async () => {
      const req = createMockRequest({ authorization: 'Basic some-base64-credentials' });
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(401);
      expect(mock.jsonBody.error).toBe('UNAUTHORIZED');
      expect(mock.jsonBody.message).toContain('Malformed Authorization header');
    });

    it('Scenario B2: rejects malformed Authorization header with Bearer missing space or extra segments', async () => {
      const req = createMockRequest({ authorization: 'BearerTokenWithoutSpace' });
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(401);
      expect(mock.jsonBody.error).toBe('UNAUTHORIZED');
    });

    it('Scenario C: rejects Authorization header with empty bearer token', async () => {
      const req = createMockRequest({ authorization: 'Bearer   ' });
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(401);
      expect(mock.jsonBody.error).toBe('UNAUTHORIZED');
      expect(mock.jsonBody.message).toContain('Bearer token cannot be empty');
      expect(req.user).toBeUndefined();
    });

    it('Scenario D: strictly rejects Bearer mock-token-admin without verification', async () => {
      const req = createMockRequest({ authorization: 'Bearer mock-token-admin' });
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(401);
      expect(mock.jsonBody.error).toBe('INVALID_TOKEN');
      expect(mock.jsonBody.message).toContain('Mock tokens are not accepted');
      expect(req.user).toBeUndefined();
    });

    it('Scenario E: strictly rejects arbitrary mock tokens (e.g. mock-token-caregiver)', async () => {
      const req = createMockRequest({ authorization: 'Bearer mock-token-caregiver' });
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(401);
      expect(mock.jsonBody.error).toBe('INVALID_TOKEN');
      expect(req.user).toBeUndefined();
    });

    it('Scenario F: strictly rejects arbitrary bearer token that fails Firebase verification', async () => {
      // Disclose mock: using test verifier to simulate Firebase Admin token rejection without network
      setCustomTokenVerifier(async () => {
        throw new Error('Decoding Firebase ID token failed. Make sure you passed the entire string.');
      });

      const req = createMockRequest({ authorization: 'Bearer arbitrary-unverified-jwt-signature' });
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(401);
      expect(mock.jsonBody.error).toBe('INVALID_TOKEN');
      expect(mock.jsonBody.message).toContain('invalid or expired');
      expect(req.user).toBeUndefined();
    });

    it('Scenario G: strictly rejects expired Firebase ID token with EXPIRED_TOKEN error code', async () => {
      // Disclose mock: simulate Firebase Admin auth/id-token-expired error
      setCustomTokenVerifier(async () => {
        const error = new Error('Firebase ID token has expired.') as Error & { code: string };
        error.code = 'auth/id-token-expired';
        throw error;
      });

      const req = createMockRequest({ authorization: 'Bearer expired-firebase-token-xyz' });
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(401);
      expect(mock.jsonBody.error).toBe('EXPIRED_TOKEN');
      expect(mock.jsonBody.message).toContain('has expired');
      expect(req.user).toBeUndefined();
    });

    it('Scenario H: accepts genuinely verified Firebase ID token and calls next()', async () => {
      // Disclose mock: simulate verified Firebase token
      const mockDecodedToken: admin.auth.DecodedIdToken = {
        uid: 'firebase-user-sunita-001',
        email: 'sunita@saksham.local',
        aud: EXPECTED_PROJECT_ID,
        iss: `https://securetoken.google.com/${EXPECTED_PROJECT_ID}`,
        sub: 'firebase-user-sunita-001',
        auth_time: 1732430000,
        iat: 1732430000,
        exp: 1732433600,
        firebase: {
          identities: {},
          sign_in_provider: 'password'
        },
        role: 'patient'
      };

      setCustomTokenVerifier(async () => mockDecodedToken);

      const req = createMockRequest({ authorization: 'Bearer valid-firebase-id-token-123' });
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(req.user).toBeDefined();
    });

    it('Scenario I: propagates verified UID, email, and server-side role to downstream request', async () => {
      const mockDecodedToken: admin.auth.DecodedIdToken = {
        uid: 'verified-doctor-dr-verma',
        email: 'dr.verma@aiims.edu',
        aud: EXPECTED_PROJECT_ID,
        iss: `https://securetoken.google.com/${EXPECTED_PROJECT_ID}`,
        sub: 'verified-doctor-dr-verma',
        auth_time: 1732430000,
        iat: 1732430000,
        exp: 1732433600,
        firebase: {
          identities: {},
          sign_in_provider: 'custom'
        },
        role: 'doctor'
      };

      setCustomTokenVerifier(async () => mockDecodedToken);

      const req = createMockRequest({ authorization: 'Bearer valid-doctor-token' });
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(req.user).toEqual({
        uid: 'verified-doctor-dr-verma',
        email: 'dr.verma@aiims.edu',
        role: 'doctor'
      });
    });

    it('Scenario J: rejects token issued for an incorrect Firebase project', async () => {
      const mockForeignProjectToken: admin.auth.DecodedIdToken = {
        uid: 'foreign-project-attacker',
        email: 'attacker@foreign-app.com',
        aud: 'malicious-or-wrong-project-999',
        iss: 'https://securetoken.google.com/malicious-or-wrong-project-999',
        sub: 'foreign-project-attacker',
        auth_time: 1732430000,
        iat: 1732430000,
        exp: 1732433600,
        firebase: {
          identities: {},
          sign_in_provider: 'password'
        },
        role: 'admin'
      };

      setCustomTokenVerifier(async () => mockForeignProjectToken);

      const req = createMockRequest({ authorization: 'Bearer foreign-project-token' });
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(401);
      expect(mock.jsonBody.error).toBe('INVALID_PROJECT_TOKEN');
      expect(req.user).toBeUndefined();
    });

    it('Scenario K: fails closed on internal verification unexpected exceptions without leaking stacks', async () => {
      setCustomTokenVerifier(async () => {
        throw new Error('Database connection pool exhaustion at internal /srv/db.c:992');
      });

      const req = createMockRequest({ authorization: 'Bearer some-bearer-token' });
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(401);
      expect(mock.jsonBody.error).toBe('INVALID_TOKEN');
      // Must not leak internal stack traces or internal paths
      expect(JSON.stringify(mock.jsonBody)).not.toContain('Database connection pool');
      expect(JSON.stringify(mock.jsonBody)).not.toContain('/srv/db.c');
      expect(req.user).toBeUndefined();
    });

    it('Scenario L: prevents any accidental fallback to mock or dev identities', async () => {
      setCustomTokenVerifier(async () => {
        throw new Error('Token verification failed');
      });

      const req = createMockRequest({ authorization: 'Bearer unverified-token' });
      const mock = createMockResponse();
      let nextCalled = false;

      await requireAuth(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      // req.user must NOT fallback to dev-user-001 or Sunita Sharma or mock-user-admin
      expect(req.user).toBeUndefined();
    });
  });

  // =========================================================================
  // AUTHORIZATION SCENARIOS (M - P)
  // =========================================================================

  describe('Authorization Scenarios (M - P)', () => {
    it('Scenario M: verified patient identity cannot access doctor-only endpoints', () => {
      const req = createMockRequest();
      req.user = {
        uid: 'patient-sunita-001',
        email: 'sunita@saksham.local',
        role: 'patient'
      };

      const mock = createMockResponse();
      let nextCalled = false;

      const doctorOnlyMiddleware = requireRole(['doctor']);
      doctorOnlyMiddleware(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(403);
      expect(mock.jsonBody.error).toBe('FORBIDDEN');
      expect(mock.jsonBody.message).toContain("Role 'patient' is not authorized");
    });

    it('Scenario N: verified caregiver cannot access admin-only endpoints', () => {
      const req = createMockRequest();
      req.user = {
        uid: 'caregiver-ananya-001',
        email: 'ananya@saksham.local',
        role: 'caregiver'
      };

      const mock = createMockResponse();
      let nextCalled = false;

      const adminOnlyMiddleware = requireRole(['admin']);
      adminOnlyMiddleware(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(403);
      expect(mock.jsonBody.error).toBe('FORBIDDEN');
      expect(mock.jsonBody.message).toContain("Role 'caregiver' is not authorized");
    });

    it('Scenario O: client-supplied role in request body or headers cannot override verified token identity', async () => {
      // Disclose mock: verified token belongs to patient
      const mockPatientToken: admin.auth.DecodedIdToken = {
        uid: 'patient-hacker-001',
        email: 'hacker@saksham.local',
        aud: EXPECTED_PROJECT_ID,
        iss: `https://securetoken.google.com/${EXPECTED_PROJECT_ID}`,
        sub: 'patient-hacker-001',
        auth_time: 1732430000,
        iat: 1732430000,
        exp: 1732433600,
        firebase: {
          identities: {},
          sign_in_provider: 'password'
        },
        role: 'patient'
      };

      setCustomTokenVerifier(async () => mockPatientToken);

      // Attack vector: client injects role: 'admin' into body and headers
      const req = createMockRequest(
        {
          authorization: 'Bearer patient-token-with-attack-payload',
          'x-user-role': 'admin'
        },
        {
          role: 'admin',
          targetUserId: 'victim-001'
        }
      );

      const mockAuth = createMockResponse();
      let authNextCalled = false;

      await requireAuth(req, mockAuth.res, () => {
        authNextCalled = true;
      });

      expect(authNextCalled).toBe(true);
      // The verified identity must remain patient, ignoring client injection
      expect(req.user?.role).toBe('patient');

      // Now verify that downstream requireRole(['admin']) blocks the user
      const mockAdmin = createMockResponse();
      let adminNextCalled = false;

      requireRole(['admin'])(req, mockAdmin.res, () => {
        adminNextCalled = true;
      });

      expect(adminNextCalled).toBe(false);
      expect(mockAdmin.statusCode).toBe(403);
      expect(mockAdmin.jsonBody.error).toBe('FORBIDDEN');
    });

    it('Scenario P: existing legitimate role enforcement allows authorized admin', () => {
      const req = createMockRequest();
      req.user = {
        uid: 'super-admin-001',
        email: 'admin@saksham.org',
        role: 'admin'
      };

      const mock = createMockResponse();
      let nextCalled = false;

      const adminMiddleware = requireRole(['admin']);
      adminMiddleware(req, mock.res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });
  });

  // =========================================================================
  // CORS SCENARIOS (Q - U)
  // =========================================================================

  describe('CORS Scenarios (Q - U)', () => {
    it('Scenario Q1: explicitly permitted localhost development origin is allowed', () => {
      let allowed: boolean | undefined;
      let errorOccurred: Error | null = null;

      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('http://localhost:5173', (err, allow) => {
          errorOccurred = err;
          allowed = allow as boolean;
        });
      }

      expect(errorOccurred).toBeNull();
      expect(allowed).toBe(true);
    });

    it('Scenario Q2: explicitly permitted Firebase Hosting production domain is allowed', () => {
      let allowed: boolean | undefined;
      let errorOccurred: Error | null = null;

      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('https://saksham-d3b71.web.app', (err, allow) => {
          errorOccurred = err;
          allowed = allow as boolean;
        });
      }

      expect(errorOccurred).toBeNull();
      expect(allowed).toBe(true);
    });

    it('Scenario Q3: explicitly permitted Firebase Hosting secondary domain is allowed', () => {
      let allowed: boolean | undefined;
      let errorOccurred: Error | null = null;

      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('https://saksham-d3b71.firebaseapp.com', (err, allow) => {
          errorOccurred = err;
          allowed = allow as boolean;
        });
      }

      expect(errorOccurred).toBeNull();
      expect(allowed).toBe(true);
    });

    it('Scenario R: unauthorized origin is denied and not granted permissive access', () => {
      let allowed: boolean | undefined;
      let errorOccurred: Error | null = null;

      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('https://malicious-phishing-attacker.com', (err, allow) => {
          errorOccurred = err;
          allowed = allow as boolean;
        });
      }

      expect(errorOccurred).toBeNull();
      expect(allowed).toBe(false);
    });

    it('Scenario S: preflight options configuration has optionsSuccessStatus 204', () => {
      expect(corsOptions.optionsSuccessStatus).toBe(204);
      expect(corsOptions.methods).toContain('OPTIONS');
      expect(corsOptions.methods).toContain('GET');
      expect(corsOptions.methods).toContain('POST');
      expect(corsOptions.methods).toContain('PUT');
      expect(corsOptions.methods).toContain('DELETE');
    });

    it('Scenario T: Authorization header is explicitly included in allowed headers', () => {
      const allowedHeaders = corsOptions.allowedHeaders as string[];
      expect(allowedHeaders).toBeDefined();
      expect(allowedHeaders).toContain('Authorization');
      expect(allowedHeaders).toContain('Content-Type');
    });

    it('Scenario U: no wildcard or unrestricted origin fallback exists in allowed origins', () => {
      const allAllowed = getAllowedOrigins();

      // Must never contain wildcard '*'
      expect(allAllowed).not.toContain('*');

      // Must be an exact, defensible list
      for (const origin of allAllowed) {
        expect(
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1') ||
          origin.endsWith('.web.app') ||
          origin.endsWith('.firebaseapp.com')
        ).toBe(true);
      }

      // Default list must match hardcoded defensible allowlist
      expect(ALLOWED_ORIGINS).toEqual([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
        'https://saksham-d3b71.web.app',
        'https://saksham-d3b71.firebaseapp.com'
      ]);
    });
  });
});
