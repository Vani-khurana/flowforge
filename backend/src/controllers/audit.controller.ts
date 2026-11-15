import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';

export class AuditController {
  static list = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { action, search, limit } = req.query;
      const data = AuditService.listAuditLogs({
        action: action as string,
        search: search as string,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
