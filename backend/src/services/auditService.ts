import { AuditLogEntry } from '../types/index.js';

export const logAuditEvent = async (entry: AuditLogEntry): Promise<void> => {
  // In production with Firebase Admin SDK initialized:
  // await admin.firestore().collection('auditLogs').add({ ...entry, timestamp: admin.firestore.FieldValue.serverTimestamp() });
  console.log(`[AUDIT LOG] [${entry.timestamp}] Actor: ${entry.actorUid} (${entry.actorRole}) -> ${entry.action} on ${entry.targetResource}`);
};
