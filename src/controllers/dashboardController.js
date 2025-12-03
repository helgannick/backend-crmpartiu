import { supabase } from "../supabase/supabaseClient.js";

// Total de clientes
export async function getTotalClients() {
  const { count, error } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count || 0;
}

// Clientes da semana
export async function getNewClientsWeek() {
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .gte("created_at", lastWeek);

  if (error) throw error;
  return count || 0;
}

// Clientes do mês
export async function getNewClientsMonth() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count, error } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .gte("created_at", firstDay);

  if (error) throw error;
  return count || 0;
}

// Aniversariantes do mês
export async function getBirthdaysThisMonth() {
  const now = new Date();
  const month = now.getMonth() + 1;

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("birthday_month", month)
    .order("birthday_day", { ascending: true });

  if (error) throw error;
  return data || [];
}

// Últimos 5 cadastrados
export async function getRecentClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, email, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data || [];
}

// Contagem de ativos e inativos
export async function getStatusCount() {
  const activeQuery = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const inactiveQuery = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("status", "inactive");

  if (activeQuery.error) throw activeQuery.error;
  if (inactiveQuery.error) throw inactiveQuery.error;

  return {
    active: activeQuery.count || 0,
    inactive: inactiveQuery.count || 0,
  };
}
