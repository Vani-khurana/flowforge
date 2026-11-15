import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { WorkflowService } from '../services/workflow.service';

export class WorkflowController {
  static list = (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = WorkflowService.listWorkflows();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  static getById = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = WorkflowService.getWorkflowById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  static create = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || 'user-admin';
      const data = WorkflowService.createWorkflow(req.body, userId);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
