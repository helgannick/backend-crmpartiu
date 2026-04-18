import { Router } from 'express';
import { login, logout, me, session } from '../controllers/authController.js';
import { authMiddleware } from '../auth/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);
router.get('/session', authMiddleware, session);

export default router;
