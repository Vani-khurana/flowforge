import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  static getStats = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const data = DashboardService.getStats(currentUser);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  static getCharts = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const data = DashboardService.getCharts(currentUser);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
