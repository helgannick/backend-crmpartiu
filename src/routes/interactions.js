// src/routes/interactions.js
import express from "express";
import { validate } from "../middleware/validate.js";
import { interactionCreateSchema } from "../schemas/interactionSchema.js";
import {
  createInteraction,
  listInteractions,
  deleteInteraction
} from "../controllers/interactionsController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Interactions
 *   description: Histórico de interações com clientes
 *
 * /clients/{id}/interactions:
 *   get:
 *     summary: Listar interações de um cliente
 *     tags: [Interactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de interações
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Interaction' }
 *   post:
 *     summary: Registrar nova interação
 *     tags: [Interactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type: { type: string, example: whatsapp }
 *               note: { type: string, example: Cliente confirmou presença }
 *     responses:
 *       201:
 *         description: Interação criada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Interaction' }
 *
 * /clients/{id}/interactions/{interactionId}:
 *   delete:
 *     summary: Remover interação
 *     tags: [Interactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: interactionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Removida com sucesso
 */

// GET /clients/:id/interactions
router.get("/:id/interactions", async (req, res) => {
  try {
    const interactions = await listInteractions(req.params.id);
    return res.json(interactions);
  } catch (err) {
    console.error("listInteractions error", err);
    return res.status(500).json({ message: err.message });
  }
});

// POST /clients/:id/interactions
router.post("/:id/interactions", validate(interactionCreateSchema), async (req, res) => {
  try {
    const created = await createInteraction(req.params.id, req.body);
    return res.status(201).json(created);
  } catch (err) {
    console.error("createInteraction error", err);
    return res.status(400).json({ message: err.message });
  }
});

// DELETE /clients/:id/interactions/:interactionId
router.delete("/:id/interactions/:interactionId", async (req, res) => {
  try {
    await deleteInteraction(req.params.interactionId);
    return res.status(204).send();
  } catch (err) {
    console.error("deleteInteraction error", err);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
