import { Router } from 'express';
import { getAdminFirestore } from '../config/firebaseAdmin.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/authMiddleware.js';

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
