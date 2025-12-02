import { supabase } from "../supabase/supabaseClient.js";
import express from "express";
import {
  listClients,
  getClientById,
  updateClient,
  deleteClient,
  listClientsFiltered,
  getClientEligibility,
} from "../controllers/clientsController.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await listClientsFiltered(req.query);
    return res.json(result);
  } catch (err) {
    console.error("clients.list error", err);
    return res.status(500).json({ message: err.message });
  }
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

router.get("/:id/eligibility", async (req, res) => {
  try {
    const result = await getClientEligibility(req.params.id);
    res.json(result);
  } catch (err) {
    console.error("eligibility error", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id/status", async (req, res) => {
  try {
    const { data, error } = await supabase
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

router.put("/:id", async (req, res) => {
  try {
    const updated = await updateClient(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error("PUT /clients/:id error", err);
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await deleteClient(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /clients/:id error", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
