import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', WorkflowController.list);
router.get('/:id', WorkflowController.getById);
router.post('/', requireRole(['ADMIN']), WorkflowController.create);

export default router;
