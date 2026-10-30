import { Router } from 'express';
import { getAdminFirestore } from '../config/firebaseAdmin.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const doctorRouter = Router();

// Assign doctor to a patient (authorized by hospital_admin or senior_clinician)
doctorRouter.post(
  '/assign',
  requireAuth,
  requireRole(['hospital_admin', 'senior_clinician', 'system_admin']),
  async (req: AuthenticatedRequest, res) => {
    const { doctorUid, patientUid, doctorName } = req.body;

    if (!doctorUid || !patientUid) {
      res.status(400).json({ success: false, error: 'doctorUid and patientUid are required.' });
      return;
    }

    try {
      const db = getAdminFirestore();
      const assignmentId = `${doctorUid}_${patientUid}`;

      await db.collection('doctor_assignments').doc(assignmentId).set({
        doctorUid,
        patientUid,
        doctorName: doctorName || 'Physician',
        assignedAt: new Date().toISOString(),
        assignedBy: req.user?.uid,
        status: 'active',
      });

      await db.collection('audit_logs').add({
        actorUid: req.user?.uid,
        actorRole: req.user?.role,
        action: 'doctor_assigned',
        targetUid: patientUid,
        metadata: { doctorUid },
        createdAt: new Date().toISOString(),
      });

      res.json({ success: true, message: 'Doctor successfully assigned to patient chart.' });
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to assign doctor';
      res.status(500).json({ success: false, error: msg });
    }
  }
);
