import rateLimit from 'express-rate-limit';

const message = (windowMinutes) => ({
  message: `Muitas requisições. Tente novamente em ${windowMinutes} minuto${windowMinutes > 1 ? 's' : ''}.`,
});

// 100 req / 15 min — proteção geral da API
export const general = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: message(15),
});

// 5 req / hora — registro público (evita spam de cadastro)
export const publicRegister = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: message(60),
});

// 10 req / 15 min — login (freia brute force)
export const login = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: message(15),
});

// 60 req / min — dashboard (autenticado, uso intenso de refresh)
export const dashboard = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: message(1),
});
