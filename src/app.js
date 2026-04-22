import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { specs } from './docs/swagger.js';
import { general } from './middleware/rateLimiter.js';

import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import clientsRoutes from './routes/clients.js';
import interactionsRoutes from './routes/interactions.js';
import { authMiddleware } from './auth/authMiddleware.js';
import dashboardRoutes from './routes/dashboard.js';
import musicGenresRoutes from './routes/musicGenres.js';
import auditRoutes from './routes/audit.js';
import webhooksRoutes from './routes/webhooks.js';
import whatsappRoutes from './routes/whatsapp.js';
import birthdayRoutes from './routes/birthday.js';

const app = express();

// Necessário para Render/proxies reversos — libera X-Forwarded-For para rate limiter
app.set('trust proxy', 1);

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(general);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { customSiteTitle: 'CRM Partiu API' }));

// Keep-alive para UptimeRobot (sem auth)
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use('/public', publicRoutes);
app.use('/auth', authRoutes);
app.use('/music-genres', musicGenresRoutes);

app.use('/clients', authMiddleware, clientsRoutes);
app.use('/clients', authMiddleware, interactionsRoutes);
app.use('/dashboard', authMiddleware, dashboardRoutes);
app.use('/audit', authMiddleware, auditRoutes);

// Evolution API integration
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/birthday', birthdayRoutes);

export default app;
