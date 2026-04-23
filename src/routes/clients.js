import { supabaseAdmin } from "../supabase/supabaseClient.js";
import express from "express";
import { validate } from "../middleware/validate.js";
import { clientCreateSchema, clientUpdateSchema, clientBulkSchema } from "../schemas/clientSchema.js";

import {
  listClients,
  getClientById,
  updateClient,
  deleteClient,
  restoreClient,
  listDeletedClients,
  listClientsFiltered,
  createClient
} from "../controllers/clientsController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Gestão de clientes
 */

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Listar clientes com filtros e paginação
 *     tags: [Clients]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Busca por nome, email, telefone ou cidade
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *         description: Filtrar por mês de aniversário
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista paginada de clientes
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedClients' }
 *       401:
 *         description: Não autenticado
 */
router.get("/", async (req, res) => {
  try {
    const result = await listClientsFiltered(req.query);
    return res.json(result);
  } catch (err) {
    console.error("clients.list error", err);
    return res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Criar novo cliente
 *     tags: [Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ClientCreate' }
 *     responses:
 *       201:
 *         description: Cliente criado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Client' }
 *       400:
 *         description: Dados inválidos ou e-mail já cadastrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.post("/", validate(clientCreateSchema), async (req, res) => {
  try {
    const client = await createClient(req.body, req.user);
    res.status(201).json(client);
  } catch (err) {
    console.error("POST /clients error", err);
    res.status(400).json({ message: err.message });
  }
});

/**
 * @swagger
 * /clients/bulk:
 *   post:
 *     summary: Importar clientes em massa (upsert por e-mail)
 *     tags: [Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clients]
 *             properties:
 *               clients:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/ClientCreate' }
 *     responses:
 *       200:
 *         description: Resultado da importação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 created: { type: integer, example: 45 }
 *                 skipped: { type: integer, example: 5 }
 */

/**
 * @swagger
 * /clients/deleted:
 *   get:
 *     summary: Listar clientes excluídos (soft delete)
 *     tags: [Clients]
 *     responses:
 *       200:
 *         description: Clientes com deleted_at preenchido
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Client' }
 */
router.get("/deleted", async (req, res) => {
  try {
    const data = await listDeletedClients();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Buscar cliente por ID (com gêneros, eventos e interações)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Client' }
 *       404:
 *         description: Não encontrado
 *   put:
 *     summary: Atualizar cliente (todos os campos)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ClientCreate' }
 *     responses:
 *       200:
 *         description: Cliente atualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Client' }
 *   patch:
 *     summary: Atualizar cliente parcialmente
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ClientCreate' }
 *     responses:
 *       200:
 *         description: Cliente atualizado
 *   delete:
 *     summary: Excluir cliente (soft delete)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Excluído com sucesso
 *
 * /clients/{id}/restore:
 *   post:
 *     summary: Restaurar cliente excluído
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Cliente restaurado
 *
 * /clients/{id}/status:
 *   get:
 *     summary: Consultar status atual do cliente
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Status do cliente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, enum: [novo, engajando, recorrente, vip] }
 */
router.post("/bulk", validate(clientBulkSchema), async (req, res) => {
  const { clients } = req.body;

  const rows = clients.map((c) => ({
    name:               c.name,
    email:              c.email,
    phone:              c.phone,
    city:               c.city,
    gender:             c.gender,
    instagram:          c.instagram,
    birth_date:         c.birth_date,
    lead_source:        c.lead_source,
    bought_with_partiu: c.bought_with_partiu,
  }));

  const { data, error } = await supabaseAdmin
    .from("clients")
    .upsert(rows, { onConflict: "email", ignoreDuplicates: true })
    .select("id");

  if (error) {
    console.error("POST /clients/bulk error", error);
    return res.status(500).json({ message: error.message });
  }

  return res.status(200).json({
    created: data.length,
    skipped: clients.length - data.length,
  });
});

router.get("/:id", async (req, res) => {
  try {
    const data = await getClientById(req.params.id);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (err) {
    console.error("GET /clients/:id error", err);
    res.status(500).json({ message: err.message });
  }
});



router.get("/:id/status", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("status")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Not found" });

    res.json({ status: data.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", validate(clientUpdateSchema), async (req, res) => {
  try {
    const updated = await updateClient(req.params.id, req.body, req.user);
    res.json(updated);
  } catch (err) {
    console.error("PUT /clients/:id error", err);
    res.status(400).json({ message: err.message });
  }
});

router.patch("/:id", validate(clientUpdateSchema), async (req, res) => {
  try {
    const updated = await updateClient(req.params.id, req.body, req.user);
    res.json(updated);
  } catch (err) {
    console.error("PATCH /clients/:id error", err);
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await deleteClient(req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /clients/:id error", err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/restore", async (req, res) => {
  try {
    await restoreClient(req.params.id, req.user);
    res.json({ success: true });
  } catch (err) {
    console.error("POST /clients/:id/restore error", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /clients/:id/messages — histórico de mensagens WhatsApp do cliente
router.get("/:id/messages", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("message_logs")
      .select("id, status, message_body, sent_at, metadata")
      .eq("client_id", req.params.id)
      .order("sent_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    res.json(data ?? []);
  } catch (err) {
    console.error("GET /clients/:id/messages error", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
