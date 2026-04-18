import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import clientsRoutes from './routes/clients.js';
import interactionsRoutes from './routes/interactions.js';
import { authMiddleware } from './auth/authMiddleware.js';
import dashboardRoutes from './routes/dashboard.js';
import musicGenresRoutes from "./routes/musicGenres.js";

const app = express();

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.use('/public', publicRoutes);
app.use('/auth', authRoutes);

app.use("/music-genres", musicGenresRoutes);


app.use('/clients', authMiddleware, clientsRoutes);
app.use('/clients', authMiddleware, interactionsRoutes);
app.use("/dashboard", authMiddleware, dashboardRoutes);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
