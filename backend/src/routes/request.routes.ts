import { Router } from 'express';
import { RequestController } from '../controllers/request.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', RequestController.list);
router.get('/:id', RequestController.getById);
router.post('/', RequestController.create);
router.patch('/:id/resubmit', RequestController.resubmit);
router.patch('/:id/cancel', RequestController.cancel);
router.post('/:id/assign-approver', RequestController.assignApprover);

export default router;
