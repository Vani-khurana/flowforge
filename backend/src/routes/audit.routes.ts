import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', AuditController.list);

export default router;
