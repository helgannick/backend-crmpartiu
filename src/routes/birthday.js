import express from 'express';
import { authMiddleware } from '../auth/authMiddleware.js';
import { birthdayService } from '../services/birthdayService.js';
import { supabaseAdmin } from '../supabase/supabaseClient.js';
import { sendCronAlert } from '../services/alertService.js';

const router = express.Router();

// Dispara job em background e responde imediatamente (evita timeout HTTP)
function runInBackground(jobFn, label) {
  const startedAt = new Date().toISOString();
  jobFn()
    .then(() => {
      supabaseAdmin.from('audit_logs').insert({
        table_name: 'cron',
        record_id: null,
        action: `cron_${label}_success`,
        new_values: { label, ran_at: startedAt, finished_at: new Date().toISOString() },
        user_id: null,
        user_email: 'cron@sistema',
      }).then(({ error }) => {
        if (error) console.error('[cron] falha ao logar sucesso:', error.message);
      });
    })
    .catch(err => {
      console.error(`❌ Erro background ${label}:`, err.message);
      sendCronAlert(label, err.message).catch(e =>
        console.error('[alerta] falha ao enviar email:', e.message)
      );
      supabaseAdmin.from('audit_logs').insert({
        table_name: 'cron',
        record_id: null,
        action: `cron_${label}_error`,
        new_values: { label, error: err.message, ran_at: startedAt, finished_at: new Date().toISOString() },
        user_id: null,
        user_email: 'cron@sistema',
      }).then(({ error: auditErr }) => {
        if (auditErr) console.error('[cron] falha ao logar erro:', auditErr.message);
      });
    });
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

// GET /api/birthday/panel — painel completo com status de envio por cliente
router.get('/panel', authMiddleware, async (req, res) => {
  try {
    const data = await birthdayService.getPanelData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

// GET /api/birthday/cron-status — últimas execuções do cron (sucesso/falha)
router.get('/cron-status', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('action, new_values, created_at')
      .eq('table_name', 'cron')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw new Error(error.message);
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
