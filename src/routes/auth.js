import { Router } from 'express';
import { login, logout, me } from '../controllers/authController.js';
import { authMiddleware } from '../auth/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);

export default router;
