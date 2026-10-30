import { Router } from 'express';
import { getAdminFirestore } from '../config/firebaseAdmin.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const caregiverRouter = Router();

// Authorize caregiver for a patient (can be triggered by the patient or hospital admin)
caregiverRouter.post('/authorize', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { caregiverUid, patientUid, caregiverEmail, caregiverName } = req.body;

  if (!caregiverUid || !patientUid) {
    res.status(400).json({ success: false, error: 'caregiverUid and patientUid are required.' });
    return;
  }

  // Patients can only authorize caregivers for themselves; admins can authorize for any patient
  if (req.user?.role === 'patient' && req.user.uid !== patientUid) {
    res.status(403).json({ success: false, error: 'Forbidden: You can only authorize caregivers for your own account.' });
    return;
  }

  try {
    const db = getAdminFirestore();
    const authId = `${caregiverUid}_${patientUid}`;

    await db.collection('caregiver_authorizations').doc(authId).set({
      caregiverUid,
      patientUid,
      caregiverEmail: caregiverEmail || '',
      caregiverName: caregiverName || 'Caregiver',
      grantedAt: new Date().toISOString(),
      grantedBy: req.user?.uid,
      status: 'active',
    });

    // Record audit log
    await db.collection('audit_logs').add({
      actorUid: req.user?.uid,
      actorRole: req.user?.role,
      action: 'caregiver_assigned',
      targetUid: patientUid,
      metadata: { caregiverUid },
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Caregiver authorization granted successfully.' });
  } catch (err: unknown) {
    const msg = (err as Error).message || 'Failed to authorize caregiver';
    res.status(500).json({ success: false, error: msg });
  }
});
