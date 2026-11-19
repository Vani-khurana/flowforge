import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApprovalService } from '../services/approval.service';
import { ApprovalAction } from '../types';

export class ApprovalController {
  static getPending = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const data = await ApprovalService.getPendingApprovals(currentUser);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  static decide = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { action, comment } = req.body as { action: ApprovalAction; comment?: string };
      const currentUser = req.user!;
      const data = await ApprovalService.processAction(id, action, comment, currentUser);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
