import express from "express";
import { dashboard as dashboardLimiter } from "../middleware/rateLimiter.js";
import {
  getTotalClients,
  getNewClientsWeek,
  getNewClientsMonth,
  getBirthdaysThisMonth,
  getRecentClients,
  getStatusCount,
  getClientsByMonth,
  getClientsByCity,
  getConversionFunnel,
  getEngagementTrends,
  getTopSources,
  getInactiveClients,
  getRetentionCohorts,
  getHotLeads,
} from "../controllers/dashboardController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Métricas e análises do CRM
 *
 * /dashboard/total:
 *   get:
 *     summary: Total de clientes ativos
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer, example: 342 }
 *
 * /dashboard/week:
 *   get:
 *     summary: Novos clientes nos últimos 7 dias
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 new_clients_week: { type: integer, example: 12 }
 *
 * /dashboard/month:
 *   get:
 *     summary: Novos clientes no mês corrente
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 new_clients_month: { type: integer, example: 45 }
 *
 * /dashboard/conversion-funnel:
 *   get:
 *     summary: Funil de conversão por status
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 novo:        { type: integer }
 *                 engajando:   { type: integer }
 *                 recorrente:  { type: integer }
 *                 vip:         { type: integer }
 *                 total:       { type: integer }
 *                 conversion_rate:
 *                   type: object
 *                   properties:
 *                     novo_to_engajando:        { type: number }
 *                     engajando_to_recorrente:  { type: number }
 *                     recorrente_to_vip:        { type: number }
 *
 * /dashboard/engagement-trends:
 *   get:
 *     summary: Tendência de engajamento por mês
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 6, maximum: 12 }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   month:             { type: string, example: "2025-10" }
 *                   active_clients:    { type: integer }
 *                   avg_interactions:  { type: number }
 *
 * /dashboard/top-sources:
 *   get:
 *     summary: Top 5 origens de leads
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   source:     { type: string }
 *                   count:      { type: integer }
 *                   percentage: { type: number }
 *
 * /dashboard/inactive-clients:
 *   get:
 *     summary: Clientes sem interação há N dias
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30, maximum: 365 }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:      { type: integer }
 *                 percentage: { type: number }
 *                 clients:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:               { type: string, format: uuid }
 *                       name:             { type: string }
 *                       last_interaction: { type: string, format: date-time, nullable: true }
 *                       days_inactive:    { type: integer }
 *
 * /dashboard/retention-cohorts:
 *   get:
 *     summary: Análise de retenção por coorte mensal
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 6, maximum: 12 }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   cohort:       { type: string, example: "2025-10" }
 *                   total:        { type: integer }
 *                   retained_30d: { type: integer }
 *                   retained_60d: { type: integer }
 *                   retained_90d: { type: integer }
 */

router.use(dashboardLimiter);

router.get("/total", async (req, res) => {
  try {
    const total = await getTotalClients();
    res.json({ total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/week", async (req, res) => {
  try {
    const total = await getNewClientsWeek();
    res.json({ new_clients_week: total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/month", async (req, res) => {
  try {
    const total = await getNewClientsMonth();
    res.json({ new_clients_month: total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/birthdays", async (req, res) => {
  try {
    const list = await getBirthdaysThisMonth();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/recent", async (req, res) => {
  try {
    const list = await getRecentClients();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/status", async (req, res) => {
  try {
    const result = await getStatusCount();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/clients-by-month", async (req, res) => {
  try {
    const data = await getClientsByMonth();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/clients-by-city", async (req, res) => {
  try {
    const data = await getClientsByCity();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/conversion-funnel", async (req, res) => {
  try { res.json(await getConversionFunnel()); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/engagement-trends", async (req, res) => {
  try {
    const months = Math.min(Number(req.query.months) || 6, 12);
    res.json(await getEngagementTrends(months));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/top-sources", async (req, res) => {
  try { res.json(await getTopSources()); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/inactive-clients", async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    res.json(await getInactiveClients(days));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/retention-cohorts", async (req, res) => {
  try {
    const months = Math.min(Number(req.query.months) || 6, 12);
    res.json(await getRetentionCohorts(months));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/hot-leads", async (req, res) => {
  try { res.json(await getHotLeads()); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
