import express from 'express';
import { authMiddleware } from '../auth/authMiddleware.js';
import { birthdayService } from '../services/birthdayService.js';

const router = express.Router();

// Dispara job em background e responde imediatamente (evita timeout HTTP)
function runInBackground(jobFn, label) {
  jobFn().catch(err => console.error(`❌ Erro background ${label}:`, err.message));
}

// Middleware de chave secreta para cron externo (sem cookie de sessão)
function cronKeyMiddleware(req, res, next) {
  const key = req.query.key || req.headers['x-cron-key'];
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Chave inválida' });
  }
  next();
}

// POST /api/birthday/run/d7
router.post('/run/d7', authMiddleware, async (req, res) => {
  res.json({ success: true, message: 'Job D-7 iniciado em background' });
  runInBackground(() => birthdayService.runPreBirthdayJob(), 'D-7');
});

// POST /api/birthday/run/d0
router.post('/run/d0', authMiddleware, async (req, res) => {
  res.json({ success: true, message: 'Job D-0 iniciado em background' });
  runInBackground(() => birthdayService.runBirthdayJob(), 'D-0');
});

// POST /api/birthday/run — roda limpeza + D-7 + D-0 sequencialmente
router.post('/run', authMiddleware, async (req, res) => {
  res.json({ success: true, message: 'Jobs iniciados em background' });
  runInBackground(async () => {
    await birthdayService.expireStaleReplies(10);
    await birthdayService.runPreBirthdayJob();
    await birthdayService.runBirthdayJob();
  }, 'cleanup+D-7+D-0');
});

// POST /api/birthday/cron — rota exclusiva para cron-job.org (chave fixa, sem expiração)
router.post('/cron', cronKeyMiddleware, (req, res) => {
  res.json({ success: true, message: 'Jobs iniciados em background' });
  runInBackground(async () => {
    await birthdayService.expireStaleReplies(10);
    await birthdayService.runPreBirthdayJob();
    await birthdayService.runBirthdayJob();
  }, 'cron');
});

// GET /api/birthday/preview — lista aniversariantes sem enviar
router.get('/preview', authMiddleware, async (req, res) => {
  try {
    const [d7, d0] = await Promise.all([
      birthdayService.getClientsByBirthdayOffset(7),
      birthdayService.getClientsByBirthdayOffset(0)
    ]);
    res.json({
      d7: { count: d7.length, clients: d7.map(c => ({ id: c.id, name: c.name, phone: c.phone, birth_date: c.birth_date })) },
      d0: { count: d0.length, clients: d0.map(c => ({ id: c.id, name: c.name, phone: c.phone, birth_date: c.birth_date })) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/birthday/cleanup — expira pending_reply sem resposta (roda semanalmente)
router.post('/cleanup', authMiddleware, async (req, res) => {
  try {
    const daysOld = Number(req.query.days) || 10;
    const result = await birthdayService.expireStaleReplies(daysOld);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/birthday/:clientId/convert — marca cliente como convertido
router.post('/:clientId/convert', authMiddleware, async (req, res) => {
  try {
    const { clientId } = req.params;
    const log = await birthdayService.markConverted(clientId);
    res.json({ success: true, logId: log.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
