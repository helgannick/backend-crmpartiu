import express from "express";
import {
  getTotalClients,
  getNewClientsWeek,
  getNewClientsMonth,
  getBirthdaysThisMonth,
  getRecentClients,
  getStatusCount,
  getClientsByMonth,
} from "../controllers/dashboardController.js";

const router = express.Router();

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


export default router;
