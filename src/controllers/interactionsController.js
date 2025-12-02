import { supabase } from '../supabase/supabaseClient.js';
import { calculateStatus } from '../services/statusService.js';

export async function createInteraction(clientId, payload) {
  const { type, note } = payload;

  const { data: interaction, error } = await supabase
    .from("interactions")
    .insert([{ client_id: clientId, type, note }])
    .select("*")
    .single();

  if (error) throw error;

  const { count, error: countErr } = await supabase
    .from("interactions")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  if (countErr) throw countErr;

  const newStatus = calculateStatus(count);

  const { error: updateErr } = await supabase
    .from("clients")
    .update({ status: newStatus })
    .eq("id", clientId);

  if (updateErr) throw updateErr;

  return { interaction, newStatus };
}


export async function listInteractions(clientId) {
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
