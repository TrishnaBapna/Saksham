import { Router } from 'express';
import { getAdminFirestore } from '../config/firebaseAdmin.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const auditRouter = Router();

// Log audit events (accessible to all authenticated roles for tracking data reads/actions)
auditRouter.post('/log', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { action, targetUid, metadata } = req.body;

  if (!action) {
    res.status(400).json({ success: false, error: 'action is required.' });
    return;
  }

  try {
    const db = getAdminFirestore();
    await db.collection('audit_logs').add({
      actorUid: req.user?.uid,
      actorRole: req.user?.role,
      action,
      targetUid: targetUid || null,
      metadata: metadata || {},
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || 'unknown',
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err: unknown) {
    const msg = (err as Error).message || 'Failed to record audit log';
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /audit/logs — strictly restricted to administrators for governance & compliance
auditRouter.get(
  '/logs',
  requireAuth,
  requireRole(['administrator', 'hospital_admin', 'system_admin']),
  async (_req: AuthenticatedRequest, res) => {
    try {
      const db = getAdminFirestore();
      const snapshot = await db
        .collection('audit_logs')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json({ success: true, data: logs });
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to fetch audit logs';
      res.status(500).json({ success: false, error: msg });
    }
  }
);
