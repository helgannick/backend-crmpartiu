import { supabase } from "../supabase/supabaseClient.js";

function normalizeInstagram(inst) {
  if (!inst) return [];
  if (Array.isArray(inst))
    return inst.map((p) => String(p).trim()).filter(Boolean);
  return [String(inst).trim()];
}

/**
 * Aceita:
 * - array: ["pagode","funk"]
 * - string csv: "pagode, funk"
 * - string única: "pagode"
 * - undefined/null -> []
 */
function normalizeTextArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  // se vier como string "a,b,c"
  const str = String(value).trim();
  if (!str) return [];

  if (str.includes(",")) {
    return str
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [str];
}

/**
 * Aceita:
 * - boolean true/false
 * - "SIM"/"NÃO"/"NAO"
 * - "true"/"false"
 * - 1/0
 */
function normalizeBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const str = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "s", "yes", "y"].includes(str)) return true;
  if (["false", "0", "nao", "não", "n", "no"].includes(str)) return false;

  return defaultValue;
}

/**
 * Aceita apenas "Masculino" ou "Feminino" (ou vazio/null)
 * Qualquer outra coisa vira null (pra não sujar o banco)
 */
function normalizeGender(value) {
  if (value === undefined || value === null) return null;

  const str = String(value).trim();
  if (!str) return null;

  const lower = str.toLowerCase();

  if (lower === "masculino" || lower === "m") return "Masculino";
  if (lower === "feminino" || lower === "f") return "Feminino";

  return null;
}

export async function createClient(payload) {
  const {
    name,
    email,
    phone,
    city,
    gender,
    lead_source,
    bought_with_partiu,
    favorite_event_id,
    music_genres // array de UUIDs
  } = payload;

  if (!name || !email || !phone) {
    throw new Error("name, email and phone are required");
  }

  // verifica duplicidade
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) throw new Error("Email already registered");

  // 1️⃣ cria cliente
  const { data: client, error } = await supabase
    .from("clients")
    .insert([{
      name,
      email,
      phone,
      city,
      gender,
      lead_source,
      bought_with_partiu,
      favorite_event_id
    }])
    .select("*")
    .single();

  if (error) throw error;

  const clientId = client.id;

  // 2️⃣ salva gêneros
  if (music_genres?.length) {
    const rows = music_genres.map((genreId) => ({
      client_id: clientId,
      genre_id: genreId,
    }));

    const { error: genreError } = await supabase
      .from("client_music_genres")
      .insert(rows);

    if (genreError) throw genreError;
  }

  return client;
}

export async function listClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getClientById(id) {
  const { data, error } = await supabase
    .from("clients")
    .select(`
      *,
      favorite_event:events (*),
      client_music_genres (
        music_genres (*)
      ),
      client_events (
        events (*)
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function listClientsFiltered(query) {
  const { search, month, page = 1, limit = 20 } = query;

  const offset = (page - 1) * limit;

  let supa = supabase.from("clients").select("*", { count: "exact" });

  if (search) {
    // mantém do jeito que já estava (sem quebrar)
    supa = supa.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%`
    );
  }

  if (month) {
    supa = supa.eq("birthday_month", Number(month));
  }

  supa = supa.range(offset, offset + limit - 1);

  const { data, count, error } = await supa;

  if (error) throw error;

  return {
    page: Number(page),
    limit: Number(limit),
    total: count,
    data,
  };
}

export async function getClientEligibility(clientId) {
  const { count, error: interactionsError } = await supabase
    .from("interactions")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  if (interactionsError) throw interactionsError;

  const totalInteractions = count || 0;
  const eligible = totalInteractions >= 10;

  return {
    client_id: clientId,
    total_interactions: totalInteractions,
    eligible,
    rule: ">= 10 interações",
  };
}

export async function updateClient(id, payload) {
  const {
    music_genres,
    ...basicFields
  } = payload;

  // 1️⃣ atualiza campos básicos
  if (Object.keys(basicFields).length > 0) {
    const { error } = await supabase
      .from("clients")
      .update(basicFields)
      .eq("id", id);

    if (error) throw error;
  }

  // 2️⃣ atualiza gêneros
  if (music_genres !== undefined) {
    await supabase
      .from("client_music_genres")
      .delete()
      .eq("client_id", id);

    if (music_genres.length > 0) {
      const rows = music_genres.map((genreId) => ({
        client_id: id,
        genre_id: genreId,
      }));

      const { error } = await supabase
        .from("client_music_genres")
        .insert(rows);

      if (error) throw error;
    }
  }

  return await getClientById(id);
}

export async function deleteClient(id) {
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) throw error;
  return true;
}
