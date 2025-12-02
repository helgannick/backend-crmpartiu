// src/routes/interactions.js
import express from "express";
import {
  createInteraction,
  listInteractions
} from "../controllers/interactionsController.js";

const router = express.Router();

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
router.post("/:id/interactions", async (req, res) => {
  try {
    const created = await createInteraction(req.params.id, req.body);
    return res.status(201).json(created);
  } catch (err) {
    console.error("createInteraction error", err);
    return res.status(400).json({ message: err.message });
  }
});

export default router;
