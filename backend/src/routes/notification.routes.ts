import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, NotificationController.getMyNotifications);
router.patch('/:id/read', authenticate, NotificationController.markAsRead);
router.post('/read-all', authenticate, NotificationController.markAllAsRead);

export default router;
