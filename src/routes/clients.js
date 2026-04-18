import { supabaseAdmin } from "../supabase/supabaseClient.js";
import express from "express";
import { validate } from "../middleware/validate.js";
import { clientCreateSchema, clientUpdateSchema, clientBulkSchema } from "../schemas/clientSchema.js";

import {
  listClients,
  getClientById,
  updateClient,
  deleteClient,
  listClientsFiltered,
  createClient
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

router.post("/", validate(clientCreateSchema), async (req, res) => {
  try {
    const client = await createClient(req.body, 'admin');
    res.status(201).json(client);
  } catch (err) {
    console.error("POST /clients error", err);
    res.status(400).json({ message: err.message });
  }
});


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
    const updated = await updateClient(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error("PUT /clients/:id error", err);
    res.status(400).json({ message: err.message });
  }
});

router.patch("/:id", validate(clientUpdateSchema), async (req, res) => {
  try {
    const updated = await updateClient(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error("PATCH /clients/:id error", err);
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
