// src/routes/public.js
import express from 'express';
import { createPublicClient } from '../controllers/clientsController.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const client = await createPublicClient(req.body);
    // devolve apenas confirmação mínima
    return res.status(201).json({ id: client.id, name: client.name, phone: client.phone, email: client.email });
  } catch (err) {
    console.error('public.register error', err);
    return res.status(400).json({ message: err.message || 'Erro ao registrar' });
  }
});

export default router;
