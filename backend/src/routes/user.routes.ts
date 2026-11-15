import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Users
router.get('/', UserController.listUsers);
router.post('/', requireRole(['ADMIN']), UserController.createUser);

// Departments
router.get('/departments', UserController.listDepartments);
router.post('/departments', requireRole(['ADMIN']), UserController.createDepartment);

export default router;
