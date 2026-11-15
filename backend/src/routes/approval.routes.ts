import { Router } from 'express';
import { ApprovalController } from '../controllers/approval.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/pending', ApprovalController.getPending);
router.post('/:id/action', ApprovalController.decide);

export default router;
