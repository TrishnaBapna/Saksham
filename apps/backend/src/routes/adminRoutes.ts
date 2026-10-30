import { Router } from 'express';
import { getAdminAuth, getAdminFirestore } from '../config/firebaseAdmin.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const adminRouter = Router();

// Only hospital_admin and system_admin can grant custom claims
adminRouter.post(
  '/roles/grant',
  requireAuth,
  requireRole(['hospital_admin', 'system_admin']),
  async (req: AuthenticatedRequest, res) => {
    const { targetUid, role } = req.body;

    const validRoles = ['patient', 'caregiver', 'doctor', 'senior_clinician', 'hospital_admin'];
    if (!targetUid || !role || !validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        error: `Invalid request. role must be one of: ${validRoles.join(', ')}`,
      });
      return;
    }

    try {
      const auth = getAdminAuth();
      const db = getAdminFirestore();

      // 1. Set custom claim on Firebase Auth account
      await auth.setCustomUserClaims(targetUid, { role });

      // 2. Sync role to Firestore user profile document
      await db.collection('users').doc(targetUid).set(
        {
          role,
          roleGrantedBy: req.user?.uid,
          roleGrantedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 3. Record audit log entry
      await db.collection('audit_logs').add({
        actorUid: req.user?.uid,
        actorRole: req.user?.role,
        action: 'role_granted',
        targetUid,
        metadata: { role },
        createdAt: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: `Role '${role}' successfully granted to UID: ${targetUid}`,
      });
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to grant role';
      res.status(500).json({ success: false, error: msg });
    }
  }
);

// Get pending doctors awaiting hospital approval
adminRouter.get(
  '/doctors/pending',
  requireAuth,
  requireRole(['hospital_admin', 'system_admin']),
  async (_req, res) => {
    try {
      const db = getAdminFirestore();
      const snapshot = await db
        .collection('users')
        .where('role', '==', 'doctor')
        .where('approved', '==', false)
        .limit(50)
        .get();

      const doctors = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
      res.json({ success: true, data: doctors });
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to fetch pending doctors';
      res.status(500).json({ success: false, error: msg });
    }
  }
);
