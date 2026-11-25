process.env.METADATA_SERVER_DETECTION = 'none';

import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: UserRole;
  };
}

export const EXPECTED_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'saksham-d3b71';

// Pluggable token verifier for testing / dependency injection without network calls
export type TokenVerifier = (token: string, checkRevoked?: boolean) => Promise<admin.auth.DecodedIdToken>;

let customTokenVerifier: TokenVerifier | null = null;

export const setCustomTokenVerifier = (verifier: TokenVerifier | null): void => {
  customTokenVerifier = verifier;
};

// Initialize Firebase Admin if needed
export const getFirebaseAuth = (): admin.auth.Auth => {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      projectId: EXPECTED_PROJECT_ID
    });
  }
  return admin.auth();
};

export const verifyFirebaseToken: TokenVerifier = async (token: string, checkRevoked = false) => {
  if (customTokenVerifier) {
    return await customTokenVerifier(token, checkRevoked);
  }
  const auth = getFirebaseAuth();
  return await auth.verifyIdToken(token, checkRevoked);
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // 1. Missing Authorization header
  if (!authHeader) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authorization header is required.'
    });
    return;
  }

  // 2. Malformed Authorization header format (must start with "Bearer ")
  if (!authHeader.startsWith('Bearer ') && authHeader !== 'Bearer') {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Malformed Authorization header. Format must be "Bearer <token>".'
    });
    return;
  }

  const token = authHeader.slice(6).trim();

  // 3. Empty Bearer token
  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Bearer token cannot be empty.'
    });
    return;
  }

  // 4. Reject mock tokens strictly — no mock token authentication bypass in production
  if (token.startsWith('mock-token-') || token === 'mock-token-admin') {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Mock tokens are not accepted for authentication.'
    });
    return;
  }

  // 5. Genuine Firebase ID token verification
  try {
    const decodedToken = await verifyFirebaseToken(token);

    // Verify project ID / audience if present
    if (decodedToken.aud && decodedToken.aud !== EXPECTED_PROJECT_ID) {
      res.status(401).json({
        error: 'INVALID_PROJECT_TOKEN',
        message: 'The authentication token was issued for an incorrect project.'
      });
      return;
    }

    // Strict server-side role resolution from verified token custom claims
    // Client-supplied roles (in body, query, or headers) are strictly disregarded
    const rawRole = decodedToken.role as string | undefined;
    const safeRole: UserRole =
      rawRole && ['patient', 'caregiver', 'doctor', 'admin'].includes(rawRole)
        ? (rawRole as UserRole)
        : 'patient'; // Least-privilege fallback for standard authenticated users without elevated custom claims

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: safeRole
    };

    next();
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };

    if (errorObj?.code === 'auth/id-token-expired') {
      res.status(401).json({
        error: 'EXPIRED_TOKEN',
        message: 'The provided authentication token has expired.'
      });
      return;
    }

    if (errorObj?.code === 'auth/id-token-revoked') {
      res.status(401).json({
        error: 'REVOKED_TOKEN',
        message: 'The provided authentication token has been revoked.'
      });
      return;
    }

    // Fail closed on any other verification failure without leaking internal stack traces
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'The provided authentication token is invalid or expired.'
    });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.uid) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User is not authenticated.'
      });
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
