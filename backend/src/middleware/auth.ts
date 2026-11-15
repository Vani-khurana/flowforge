import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { db } from '../db/store';
import { Role, User } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Enterprise Authentication Middleware:
 * Validates Bearer JWT tokens, extracts user identity, and verifies account active status.
 * Rejects unauthenticated requests with HTTP 401.
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  // Strict Bearer token extraction from Authorization header only.
  // Query parameter tokens (e.g. ?token=...) are explicitly disallowed to prevent token leakage.
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { id: string; role: Role };
      const user = db.users.find((u) => u.id === decoded.id);

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User session invalid. User record no longer exists.',
        });
        return;
      }

      if (user.status === 'SUSPENDED') {
        res.status(403).json({
          success: false,
          message: 'Account is suspended. Access denied.',
        });
        return;
      }

      req.user = user;
      return next();
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired authorization token. Please log in again.',
      });
      return;
    }
  }

  // Support dev header for automated testing ONLY in non-production when demo mode is active
  const devUserId = req.headers['x-dev-user-id'] as string;
  if (devUserId && config.nodeEnv !== 'production' && config.enableDemoRoleSwitch) {
    const user = db.users.find((u) => u.id === devUserId);
    if (user) {
      if (user.status === 'SUSPENDED') {
        res.status(403).json({
          success: false,
          message: 'Account is suspended. Access denied.',
        });
        return;
      }
      req.user = user;
      return next();
    }
  }

  // Reject unauthenticated requests
  res.status(401).json({
    success: false,
    message: 'Authentication required. Authorization header missing or malformed.',
  });
};

/**
 * Role-Based Access Control Middleware.
 * Enforces strict role authority. Note: ADMIN role does NOT automatically bypass
 * business stage constraints unless ADMIN is explicitly listed in allowedRoles.
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    res.status(403).json({
      success: false,
      message: `Access denied. Operation requires one of the following roles: ${allowedRoles.join(', ')}`,
    });
  };
};
