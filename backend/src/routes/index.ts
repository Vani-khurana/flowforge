import { Router } from 'express';
import authRoutes from './auth.routes';
import workflowRoutes from './workflow.routes';
import requestRoutes from './request.routes';
import approvalRoutes from './approval.routes';
import dashboardRoutes from './dashboard.routes';
import auditRoutes from './audit.routes';
import userRoutes from './user.routes';
import documentRoutes from './document.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workflows', workflowRoutes);
router.use('/requests', requestRoutes);
router.use('/approvals', approvalRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit', auditRoutes);
router.use('/users', userRoutes);
router.use('/documents', documentRoutes);
router.use('/notifications', notificationRoutes);

export default router;
