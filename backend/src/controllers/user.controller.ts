import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserService } from '../services/user.service';

export class UserController {
  static listUsers = (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = UserService.listUsers();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  static createUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = UserService.createUser(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  static listDepartments = (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = UserService.listDepartments();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  static createDepartment = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = UserService.createDepartment(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
