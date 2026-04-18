import { Router } from 'express';
import { login, logout, me, session, refresh } from '../controllers/authController.js';
import { authMiddleware } from '../auth/authMiddleware.js';
import { login as loginLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticação via httpOnly cookies
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autenticar usuário
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email, example: admin@partiu.com }
 *               password: { type: string, example: senha123 }
 *     responses:
 *       200:
 *         description: Login bem-sucedido — seta cookies auth_token e refresh_token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:    { type: string, format: uuid }
 *                     email: { type: string }
 *                     role:  { type: string, example: admin }
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/login', loginLimiter, login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Encerrar sessão (limpa cookies)
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Logout realizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 */
router.post('/logout', logout);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar access token via refresh token
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Token renovado — seta novo auth_token
 *       401:
 *         description: Refresh token ausente ou expirado
 */
router.post('/refresh', refresh);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Retornar usuário autenticado
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Dados do usuário atual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:          { type: string, format: uuid }
 *                     email:       { type: string }
 *                     role:        { type: string }
 *                     accessToken: { type: string }
 *       401:
 *         description: Não autenticado
 */
router.get('/me', authMiddleware, me);

/**
 * @swagger
 * /auth/session:
 *   get:
 *     summary: Retornar sessão completa do Supabase
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Dados completos da sessão
 *       401:
 *         description: Sessão inválida
 */
router.get('/session', authMiddleware, session);

export default router;
