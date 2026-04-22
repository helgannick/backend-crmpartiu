import express from 'express';
import { authMiddleware } from '../auth/authMiddleware.js';
import { evolutionService } from '../services/evolutionService.js';

const router = express.Router();

// GET /api/whatsapp/status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const status = await evolutionService.checkConnection();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whatsapp/send-test
router.post('/send-test', authMiddleware, async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'phone e message são obrigatórios' });
    }

    const result = await evolutionService.sendText(phone, message);
    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whatsapp/check-number
router.post('/check-number', authMiddleware, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'phone é obrigatório' });
    }

    const exists = await evolutionService.checkWhatsAppNumber(phone);
    res.json({ exists });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
