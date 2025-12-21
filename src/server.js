import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import clientsRoutes from './routes/clients.js';
import interactionsRoutes from './routes/interactions.js';
import { authMiddleware } from './auth/authMiddleware.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/public', publicRoutes);
app.use('/auth', authRoutes);

app.use('/clients', authMiddleware, clientsRoutes);
app.use('/clients', authMiddleware, interactionsRoutes);
app.use("/dashboard", authMiddleware, dashboardRoutes);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
