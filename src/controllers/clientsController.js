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

export async function createClient(payload, source = "public") {
  const {
    name,
    email,
    city,
    phone,
    birthday_day,
    birthday_month,
    birthday_year,
    Instagram,

    // ✅ novos campos
    lead_source,
    favorite_event,
    last_event,
    bought_with_partiu,
    music_genres,
    music_genre_other,
    gender,
  } = payload;

  if (!name || !email || !phone) {
    throw new Error("name, email and phone are required");
  }

  const day = birthday_day ? parseInt(birthday_day, 10) : null;
  const month = birthday_month ? parseInt(birthday_month, 10) : null;
  const year = birthday_year ? parseInt(birthday_year, 10) : null;

  if (day && (day < 1 || day > 31)) {
    throw new Error("birthday_day must be between 1 and 31");
  }

  if (month && (month < 1 || month > 12)) {
    throw new Error("birthday_month must be between 1 and 12");
  }

  if (year && (year < 1900 || year > new Date().getFullYear())) {
    throw new Error("birthday_year invalid");
  }

  const inst = normalizeInstagram(Instagram);

  // ✅ normalizações dos novos campos
  const genres = normalizeTextArray(music_genres);
  const bought = normalizeBoolean(bought_with_partiu, false);
  const genderNormalized = normalizeGender(gender);

  // evita emails duplicados
  const { data: existing, error: selErr } = await supabase
    .from("clients")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) throw new Error("Email already registered");

  const { data, error } = await supabase
    .from("clients")
    .insert([
      {
        name,
        email,
        city,
        phone,
        birthday_day: day,
        birthday_month: month,
        birthday_year: year,
        Instagram: inst,

        // ✅ novos campos
        lead_source: lead_source ?? null,
        favorite_event: favorite_event ?? null,
        last_event: last_event ?? null,
        bought_with_partiu: bought,
        music_genres: genres,
        music_genre_other: music_genre_other ?? null,
        gender: genderNormalized, // ✅ agora salva
      },
    ])
    .select("*")
    .single();

  if (error) throw error;
  return data;
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
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
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
    name,
    email,
    city,
    phone,
    birthday_day,
    birthday_month,
    birthday_year,
    Instagram,

    // ✅ novos campos
    lead_source,
    favorite_event,
    last_event,
    bought_with_partiu,
    music_genres,
    music_genre_other,
    gender, // ✅ agora pega do payload
  } = payload;

  const inst = normalizeInstagram(Instagram);

  const updateObj = {};
  if (name !== undefined) updateObj.name = name;
  if (email !== undefined) updateObj.email = email;
  if (city !== undefined) updateObj.city = city;
  if (phone !== undefined) updateObj.phone = phone;
  if (birthday_day !== undefined) updateObj.birthday_day = birthday_day;
  if (birthday_month !== undefined) updateObj.birthday_month = birthday_month;
  if (birthday_year !== undefined) updateObj.birthday_year = birthday_year;
  if (Instagram !== undefined) updateObj.Instagram = inst;

  // ✅ updates dos novos campos
  if (lead_source !== undefined) updateObj.lead_source = lead_source;
  if (favorite_event !== undefined) updateObj.favorite_event = favorite_event;
  if (last_event !== undefined) updateObj.last_event = last_event;

  if (bought_with_partiu !== undefined) {
    updateObj.bought_with_partiu = normalizeBoolean(bought_with_partiu, false);
  }

  if (music_genres !== undefined) {
    updateObj.music_genres = normalizeTextArray(music_genres);
  }

  if (music_genre_other !== undefined) {
    updateObj.music_genre_other = music_genre_other;
  }

  if (gender !== undefined) {
    updateObj.gender = normalizeGender(gender); // ✅ agora atualiza também
  }

  const { data, error } = await supabase
    .from("clients")
    .update(updateObj)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClient(id) {
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) throw error;
  return true;
}
