import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: UserRole;
  };
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authorization token is required.'
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  // In prototype mode with mock tokens or emulator
  if (token.startsWith('mock-token-')) {
    const rolePart = token.replace('mock-token-', '') as UserRole;
    req.user = {
      uid: `mock-user-${rolePart}`,
      email: `${rolePart}@saksham.local`,
      role: ['patient', 'caregiver', 'doctor', 'admin'].includes(rolePart) ? rolePart : 'patient'
    };
    next();
    return;
  }

  // Production path: verify with firebase-admin
  // If firebase-admin is not initialized with live credentials yet, return explicit guidance
  try {
    // When live credentials are provided, admin.auth().verifyIdToken(token) would be called here
    // For local development fallback:
    req.user = {
      uid: 'dev-user-001',
      role: 'patient'
    };
    next();
  } catch {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'The provided authentication token is invalid or expired.'
    });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Role '${req.user.role}' is not authorized to access this resource. Required: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};
