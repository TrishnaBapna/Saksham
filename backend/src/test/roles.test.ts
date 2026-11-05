import { describe, it, expect } from 'vitest';
import { requireRole, AuthenticatedRequest } from '../middleware/auth.js';

describe('Backend RBAC Middleware', () => {
  it('denies patient access to admin endpoints', () => {
    const req = {
      user: {
        uid: 'user-patient-1',
        role: 'patient'
      }
    } as AuthenticatedRequest;

    let statusCode = 0;
    let jsonBody: Record<string, unknown> = {};

    const res = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (body: Record<string, unknown>) => {
            jsonBody = body;
          }
        };
      }
    } as unknown as import('express').Response;

    let nextCalled = false;
    const next = () => { nextCalled = true; };

    const middleware = requireRole(['admin']);
    middleware(req, res, next);

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
    expect(jsonBody.error).toBe('FORBIDDEN');
  });

  it('allows admin access to admin endpoints', () => {
    const req = {
      user: {
        uid: 'user-admin-1',
        role: 'admin'
      }
    } as AuthenticatedRequest;

    const res = {} as import('express').Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    const middleware = requireRole(['admin']);
    middleware(req, res, next);

    expect(nextCalled).toBe(true);
  });
});
