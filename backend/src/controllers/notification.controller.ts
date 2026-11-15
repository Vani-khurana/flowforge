import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  static getMyNotifications = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const notifications = NotificationService.getUserNotifications(req.user.id);
      const unreadCount = NotificationService.getUnreadCount(req.user.id);
      res.json({ success: true, data: { notifications, unreadCount } });
    } catch (err) {
      next(err);
    }
  };

  static markAsRead = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const { id } = req.params;
      const success = NotificationService.markAsRead(id, req.user.id);
      res.json({ success, message: success ? 'Notification marked as read' : 'Notification not found' });
    } catch (err) {
      next(err);
    }
  };

  static markAllAsRead = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const count = NotificationService.markAllAsRead(req.user.id);
      res.json({ success: true, count, message: `${count} notifications marked as read` });
    } catch (err) {
      next(err);
    }
  };
}
