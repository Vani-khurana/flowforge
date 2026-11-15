import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.post('/switch-role', AuthController.switchRole);
router.get('/me', authenticate, AuthController.me);
router.get('/hierarchy', authenticate, AuthController.getHierarchy);

export default router;
