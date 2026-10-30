import type { Request, Response, NextFunction } from 'express';
import { getAdminAuth } from '../config/firebaseAdmin.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid Bearer token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1]!.trim();
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: (decoded.role as string) || (decoded['role'] as string) || 'patient',
    };
    next();
  } catch (err: unknown) {
    const msg = (err as Error).message || 'Invalid token';
    res.status(401).json({ success: false, error: `Authentication failed: ${msg}` });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Requires one of [${allowedRoles.join(', ')}]. Current role: ${req.user.role || 'none'}`,
      });
      return;
    }

    next();
  };
}
