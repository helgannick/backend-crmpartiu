import { supabaseAdmin } from "../supabase/supabaseClient.js";
import { withoutDeleted } from "../utils/softDelete.js";
const supabase = supabaseAdmin;

function normalizeCity(city) {
  if (!city) return null;

  const normalized = city
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");


  if (normalized === "rj" || normalized === "rio") {
    return "Rio de Janeiro";
  }

  if (normalized.includes("rio de janeiro")) {
    return "Rio de Janeiro";
  }


  return city.trim();
}


export async function getTotalClients() {
  const { count, error } = await withoutDeleted(
    supabase.from("clients").select("*", { count: "exact", head: true })
  );

  if (error) throw error;
  return count || 0;
}

export async function getNewClientsWeek() {
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await withoutDeleted(
    supabase.from("clients").select("*", { count: "exact", head: true })
  ).gte("created_at", lastWeek);

  if (error) throw error;
  return count || 0;
}

export async function getNewClientsMonth() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count, error } = await withoutDeleted(
    supabase.from("clients").select("*", { count: "exact", head: true })
  ).gte("created_at", firstDay);

  if (error) throw error;
  return count || 0;
}

export async function getBirthdaysThisMonth() {
  const now = new Date();
  const month = now.getMonth() + 1;

  const { data, error } = await withoutDeleted(
    supabase.from("clients").select("*")
  ).not("birth_date", "is", null);

  if (error) throw error;

  // filtra pelo mês via JS (simples e eficiente)
  const filtered = data
    .filter((client) => {
      const date = new Date(client.birth_date);
      return date.getMonth() + 1 === month;
    })
    .sort((a, b) => {
      const dayA = new Date(a.birth_date).getDate();
      const dayB = new Date(b.birth_date).getDate();
      return dayA - dayB;
    });

  return filtered;
}


export async function getRecentClients() {
  const { data, error } = await withoutDeleted(
    supabase.from("clients").select("id, name, email, created_at")
  ).order("created_at", { ascending: false }).limit(5);

  if (error) throw error;
  return data || [];
}

export async function getStatusCount() {
  const activeQuery = await withoutDeleted(
    supabase.from("clients").select("*", { count: "exact", head: true })
  ).eq("status", "active");

  const inactiveQuery = await withoutDeleted(
    supabase.from("clients").select("*", { count: "exact", head: true })
  ).eq("status", "inactive");

  if (activeQuery.error) throw activeQuery.error;
  if (inactiveQuery.error) throw inactiveQuery.error;

  return {
    active: activeQuery.count || 0,
    inactive: inactiveQuery.count || 0,
  };
}

export async function getClientsByMonth() {
  const now = new Date();
  const year = now.getFullYear();

  const start = new Date(year, 0, 1).toISOString();
  const end = new Date(year, 11, 31, 23, 59, 59).toISOString();

  const { data, error } = await withoutDeleted(
    supabase.from("clients").select("created_at")
  ).gte("created_at", start).lte("created_at", end);

  if (error) throw error;

  const months = Array(12).fill(0);

  data.forEach((item) => {
    const month = new Date(item.created_at).getMonth();
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
    { month: "Dez", total: months[11] },
  ];
}


/* ============================= */
/* CONVERSION FUNNEL             */
/* ============================= */

export async function getConversionFunnel() {
  const { data, error } = await withoutDeleted(
    supabase.from('clients').select(`
      id,
      bought_with_partiu,
      client_events!client_events_client_id_fkey (event_id)
    `)
  );
  if (error) throw error;

  const counts = { novo: 0, engajando: 0, recorrente: 0, vip: 0 };

  (data || []).forEach((c) => {
    const eventCount = c.client_events?.length ?? 0;
    if (c.bought_with_partiu) {
      counts.vip++;
    } else if (eventCount >= 3) {
      counts.recorrente++;
    } else if (eventCount >= 1) {
      counts.engajando++;
    } else {
      counts.novo++;
    }
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const pct = (a, b) => (b > 0 ? +((a / b) * 100).toFixed(1) : 0);

  return {
    ...counts,
    total,
    conversion_rate: {
      novo_to_engajando: pct(counts.engajando, counts.novo),
      engajando_to_recorrente: pct(counts.recorrente, counts.engajando),
      recorrente_to_vip: pct(counts.vip, counts.recorrente),
    },
  };
}

/* ============================= */
/* ENGAGEMENT TRENDS             */
/* ============================= */

export async function getEngagementTrends(months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data, error } = await supabase
    .from('interactions')
    .select('client_id, created_at')
    .gte('created_at', since.toISOString());

  if (error) throw error;

  const byMonth = {};
  (data || []).forEach(({ client_id, created_at }) => {
    const key = created_at.slice(0, 7); // YYYY-MM
    if (!byMonth[key]) byMonth[key] = { clients: new Set(), count: 0 };
    byMonth[key].clients.add(client_id);
    byMonth[key].count++;
  });

  const result = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { clients, count }]) => ({
      month,
      active_clients: clients.size,
      avg_interactions: clients.size > 0 ? +(count / clients.size).toFixed(1) : 0,
    }));

  return result;
}

/* ============================= */
/* TOP SOURCES                   */
/* ============================= */

export async function getTopSources() {
  const { data, error } = await withoutDeleted(
    supabase.from('clients').select('lead_source')
  );
  if (error) throw error;

  const map = {};
  let total = 0;
  (data || []).forEach(({ lead_source }) => {
    const key = lead_source || 'Não informado';
    map[key] = (map[key] || 0) + 1;
    total++;
  });

  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([source, count]) => ({
      source,
      count,
      percentage: total > 0 ? +((count / total) * 100).toFixed(1) : 0,
    }));
}

/* ============================= */
/* INACTIVE CLIENTS              */
/* ============================= */

export async function getInactiveClients(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: clients, error: cErr }, { data: recentInteractions, error: iErr }] =
    await Promise.all([
      withoutDeleted(supabase.from('clients').select('id, name, created_at')),
      supabase.from('interactions').select('client_id').gte('created_at', since),
    ]);

  if (cErr) throw cErr;
  if (iErr) throw iErr;

  const activeIds = new Set((recentInteractions || []).map((i) => i.client_id));
  const inactive = (clients || []).filter((c) => !activeIds.has(c.id));

  // Get last interaction date for inactive clients
  const { data: lastInteractions } = await supabase
    .from('interactions')
    .select('client_id, created_at')
    .in('client_id', inactive.map((c) => c.id))
    .order('created_at', { ascending: false });

  const lastByClient = {};
  (lastInteractions || []).forEach(({ client_id, created_at }) => {
    if (!lastByClient[client_id]) lastByClient[client_id] = created_at;
  });

  const now = Date.now();
  const enriched = inactive
    .map((c) => {
      const last = lastByClient[c.id] || null;
      const daysInactive = last
        ? Math.floor((now - new Date(last).getTime()) / 86400000)
        : Math.floor((now - new Date(c.created_at).getTime()) / 86400000);
      return { id: c.id, name: c.name, last_interaction: last, days_inactive: daysInactive };
    })
    .sort((a, b) => b.days_inactive - a.days_inactive)
    .slice(0, 20);

  const total = (clients || []).length;

  return {
    count: inactive.length,
    percentage: total > 0 ? +((inactive.length / total) * 100).toFixed(1) : 0,
    clients: enriched,
  };
}

/* ============================= */
/* RETENTION COHORTS             */
/* ============================= */

export async function getRetentionCohorts(months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const [{ data: clients, error: cErr }, { data: interactions, error: iErr }] =
    await Promise.all([
      withoutDeleted(supabase.from('clients').select('id, created_at'))
        .gte('created_at', since.toISOString()),
      supabase.from('interactions').select('client_id, created_at'),
    ]);

  if (cErr) throw cErr;
  if (iErr) throw iErr;

  // Index interactions by client_id
  const interactionsByClient = {};
  (interactions || []).forEach(({ client_id, created_at }) => {
    if (!interactionsByClient[client_id]) interactionsByClient[client_id] = [];
    interactionsByClient[client_id].push(new Date(created_at).getTime());
  });

  const cohorts = {};
  (clients || []).forEach(({ id, created_at }) => {
    const key = created_at.slice(0, 7);
    if (!cohorts[key]) cohorts[key] = [];
    cohorts[key].push({ id, signupTs: new Date(created_at).getTime() });
  });

  const result = Object.entries(cohorts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohort, members]) => {
      const retained = (window_days) =>
        members.filter(({ id, signupTs }) => {
          const ts = interactionsByClient[id];
          return ts?.some((t) => t >= signupTs && t <= signupTs + window_days * 86400000);
        }).length;

      return {
        cohort,
        total: members.length,
        retained_30d: retained(30),
        retained_60d: retained(60),
        retained_90d: retained(90),
      };
    });

  return result;
}

/* ============================= */
/* getClientsByCity              */
/* ============================= */

export async function getClientsByCity() {
  const { data, error } = await withoutDeleted(
    supabase.from("clients").select("city")
  );

  if (error) throw error;

  const map = new Map();

  data.forEach(({ city }) => {
    const normalized = normalizeCity(city);
    if (!normalized) return;

    map.set(normalized, (map.get(normalized) || 0) + 1);
  });

  const result = Array.from(map.entries()).map(
    ([city, total]) => ({ city, total })
  );

  result.sort((a, b) => b.total - a.total);

  return result;
}
