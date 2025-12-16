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

// Clientes cadastrados por mês (ano atual)
export async function getClientsByMonth() {
  const now = new Date();
  const year = now.getFullYear();

  const start = new Date(year, 0, 1).toISOString();
  const end = new Date(year, 11, 31, 23, 59, 59).toISOString();

  const { data, error } = await supabase
    .from("clients")
    .select("created_at")
    .gte("created_at", start)
    .lte("created_at", end);

  if (error) throw error;

  const months = Array(12).fill(0);

  data.forEach((item) => {
    const month = new Date(item.created_at).getMonth(); // 0–11
    months[month]++;
  });

  return [
    { month: "Jan", total: months[0] },
    { month: "Fev", total: months[1] },
    { month: "Mar", total: months[2] },
    { month: "Abr", total: months[3] },
    { month: "Mai", total: months[4] },
    { month: "Jun", total: months[5] },
    { month: "Jul", total: months[6] },
    { month: "Ago", total: months[7] },
    { month: "Set", total: months[8] },
    { month: "Out", total: months[9] },
    { month: "Nov", total: months[10] },
    { month: "Dez", total: months[11] }
  ];
}

// Clientes por cidade
export async function getClientsByCity() {
  const { data, error } = await supabase
    .from("clients")
    .select("city");

  if (error) throw error;

  const map = {};

  data.forEach((item) => {
    if (!item.city) return;

    const city = item.city.trim();

    map[city] = (map[city] || 0) + 1;
  });

  // transforma em array
  const result = Object.entries(map).map(([city, total]) => ({
    city,
    total
  }));

  // ordena do maior pro menor
  result.sort((a, b) => b.total - a.total);

  return result;
}
