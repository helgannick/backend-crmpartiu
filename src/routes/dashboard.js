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
} from "../controllers/dashboardController.js";

const router = express.Router();

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

export default router;
