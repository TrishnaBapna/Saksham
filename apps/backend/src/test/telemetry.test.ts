import { describe, it, expect, vi } from 'vitest';
import { telemetryRouter } from '../routes/telemetryRoutes.js';
import type { Request, Response, NextFunction } from 'express';

describe('ANBESHAN 2026 Telemetry & Biometrics API', () => {
  it('rejects POST /api/telemetry/log without patientUid', async () => {
    const req = {
      body: {},
    } as unknown as Request;

    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    const next: NextFunction = vi.fn();

    const layer = (telemetryRouter.stack as any[]).find(
      (l) => l.route && l.route.path === '/log'
    );
    expect(layer).toBeDefined();

    const handler = layer.route.stack[0].handle;
    await handler(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'patientUid is required.' })
    );
  });

  it('accepts and logs valid biometric telemetry record', async () => {
    const req = {
      body: {
        patientUid: 'anbeshan-patient-001',
        ageTier: 'youth',
        tremorStabilityIndex: 85,
        speechVocalDb: 72,
        gaitCadenceBpm: 100,
        cognitiveAccuracyPercent: 92,
        sessionDurationSeconds: 180,
        condition: 'parkinsons',
        notes: 'Strong rhythmic entrainment with 100 BPM metronome',
      },
    } as unknown as Request;

    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    const next: NextFunction = vi.fn();

    const layer = (telemetryRouter.stack as any[]).find(
      (l) => l.route && l.route.path === '/log'
    );
    const handler = layer.route.stack[0].handle;
    await handler(req, res, next);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          patientUid: 'anbeshan-patient-001',
          ageTier: 'youth',
          tremorStabilityIndex: 85,
        }),
      })
    );
  });

  it('computes aggregated telemetry stats for patient on GET /stats/:patientUid', async () => {
    const req = {
      params: { patientUid: 'anbeshan-patient-001' },
    } as unknown as Request;

    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    const next: NextFunction = vi.fn();

    const layer = (telemetryRouter.stack as any[]).find(
      (l) => l.route && l.route.path === '/stats/:patientUid'
    );
    const handler = layer.route.stack[0].handle;
    await handler(req, res, next);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          patientUid: 'anbeshan-patient-001',
          avgTremorStability: expect.any(Number),
          avgCognitiveScore: expect.any(Number),
        }),
      })
    );
  });
});
