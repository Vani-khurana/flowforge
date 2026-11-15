import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', DashboardController.getStats);
router.get('/charts', DashboardController.getCharts);

export default router;
