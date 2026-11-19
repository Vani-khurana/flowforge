import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { RequestService } from '../services/request.service';

export class RequestController {
  static list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit, search, status, type, scope } = req.query;
      const currentUser = req.user!;
      const data = await RequestService.listRequests(
        {
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
          search: search as string,
          status: status as string,
          type: type as string,
          scope: scope as 'my' | 'all',
        },
        currentUser
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  static getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const data = await RequestService.getRequestById(req.params.id, currentUser);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  static create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const data = await RequestService.createRequest(req.body, currentUser);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  static resubmit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const data = await RequestService.resubmitRequest(req.params.id, req.body, currentUser);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  static cancel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const data = await RequestService.cancelRequest(req.params.id, currentUser);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  static assignApprover = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const { approverId } = req.body;
      const data = RequestService.assignApprover(req.params.id, approverId, currentUser);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
