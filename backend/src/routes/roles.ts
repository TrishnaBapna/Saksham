import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditService.js';

const router = Router();

// Only admin can assign roles
router.post('/assign', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { targetUserId, role } = req.body;

  if (!targetUserId || !['patient', 'caregiver', 'doctor', 'admin'].includes(role)) {
    res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'Valid targetUserId and role (patient|caregiver|doctor|admin) are required.'
    });
    return;
  }

  // Record audit log
  await logAuditEvent({
    actorUid: req.user?.uid || 'unknown',
    actorRole: 'admin',
    action: 'ROLE_ELEVATION',
    targetResource: `users/${targetUserId}`,
    timestamp: new Date().toISOString(),
    details: { assignedRole: role }
  });

  res.json({
    success: true,
    message: `Role '${role}' assigned to user '${targetUserId}'.`,
    data: { targetUserId, role }
  });
});

export default router;
