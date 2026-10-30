import { describe, it, expect, vi } from 'vitest';
import { requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import type { Response } from 'express';

describe('Backend Auth & Role Middleware', () => {
  it('blocks request when user is not attached', () => {
    const req = {} as AuthenticatedRequest;
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const next = vi.fn();

    const middleware = requireRole(['hospital_admin', 'doctor']);
    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks request when user does not have required role', () => {
    const req = {
      user: { uid: 'pt-1', role: 'patient' },
    } as AuthenticatedRequest;
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const next = vi.fn();

    const middleware = requireRole(['doctor', 'hospital_admin']);
    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows request when user possesses an authorized role', () => {
    const req = {
      user: { uid: 'dr-1', role: 'doctor' },
    } as AuthenticatedRequest;
    const res = {} as Response;
    const next = vi.fn();

    const middleware = requireRole(['doctor', 'hospital_admin']);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
