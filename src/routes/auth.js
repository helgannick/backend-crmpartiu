import { Router } from 'express';
import { login, logout, me, session } from '../controllers/authController.js';
import { authMiddleware } from '../auth/authMiddleware.js';
import { login as loginLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);
router.get('/session', authMiddleware, session);

export default router;
