import { Router } from 'express';
import { supabaseAdmin } from '../supabase/supabaseClient.js';

const router = Router();

// GET /audit/clients/:id/history — histórico de um cliente específico
router.get('/clients/:id/history', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('table_name', 'clients')
      .eq('record_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /audit/logs?table=clients&limit=50 — logs gerais (admin)
router.get('/logs', async (req, res) => {
  try {
    const { table, user_id, action, limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (table)   query = query.eq('table_name', table);
    if (user_id) query = query.eq('user_id', user_id);
    if (action)  query = query.eq('action', action);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ total: count, page: Number(page), limit: Number(limit), data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
