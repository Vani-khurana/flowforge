import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AuthService } from '../services/auth.service';
import { HierarchyService } from '../services/hierarchy.service';
import { Role } from '../types';

export class AuthController {
  static login = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  static register = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, departmentId } = req.body;
      // Public registration is restricted to EMPLOYEE only.
      // Manager/Admin assignment must be performed by authorized administrators.
      const result = await AuthService.register({
        name,
        email,
        password,
        role: 'EMPLOYEE',
        departmentId,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  static refresh = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const result = AuthService.refreshTokens(refreshToken);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  static logout = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.body.token;
      if (token) {
        AuthService.logout(token);
      }
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  };

  static me = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }
      const user = AuthService.getCurrentUser(req.user.id);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  };

  static switchRole = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { role, email } = req.body as { role: Role; email?: string };
      const result = AuthService.switchUserByRole(role, email);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  static getHierarchy = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }
      const reportingChain = HierarchyService.getReportingChain(req.user.id);
      const subordinates = HierarchyService.getSubordinates(req.user.id);
      res.json({
        success: true,
        data: {
          user: req.user,
          reportingChain,
          subordinates,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}
