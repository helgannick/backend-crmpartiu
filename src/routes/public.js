// src/routes/public.js
import express from 'express';
import { createClient } from '../controllers/clientsController.js';
import { publicRegister } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { clientCreateSchema } from '../schemas/clientSchema.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Public
 *   description: Endpoints públicos (sem autenticação)
 *
 * /public/register:
 *   post:
 *     summary: Cadastro público de cliente (formulário de evento)
 *     tags: [Public]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ClientCreate' }
 *           example:
 *             name: Maria Santos
 *             email: maria@email.com
 *             phone: "11999999999"
 *             birth_date: "1998-03-20"
 *             gender: Feminino
 *             city: São Paulo
 *             lead_source: Instagram
 *             bought_with_partiu: false
 *     responses:
 *       201:
 *         description: Cliente cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:    { type: string, format: uuid }
 *                 name:  { type: string }
 *                 email: { type: string }
 *                 phone: { type: string }
 *       400:
 *         description: Dados inválidos ou e-mail já cadastrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/register', publicRegister, validate(clientCreateSchema), async (req, res) => {
  try {
    const client = await createClient(req.body, 'public');
    return res.status(201).json({
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email
    });
  } catch (err) {
    console.error('public.register error', err);
    return res.status(400).json({ message: err.message || 'Erro ao registrar' });
  }
});


export default router;
