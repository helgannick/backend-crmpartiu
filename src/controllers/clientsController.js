import { supabase } from "../supabase/supabaseClient.js";

/* ============================= */
/* CREATE CLIENT */
/* ============================= */

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
    music_genres,
    birth_date,
  } = payload;

  if (!name || !email || !phone) {
    throw new Error("name, email and phone are required");
  }

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) throw new Error("Email already registered");

  const { data: client, error } = await supabase
    .from("clients")
    .insert([{
      name,
      email,
      phone,
      city: city || null,
      gender: gender || null,
      lead_source: lead_source || null,
      bought_with_partiu: bought_with_partiu ?? false,
      favorite_event_id: favorite_event_id || null,
      birth_date: birth_date || null,
    }])
    .select("*")
    .single();

  if (error) throw error;

  const clientId = client.id;

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

/* ============================= */
/* LIST CLIENTS */
/* ============================= */

export async function listClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/* ============================= */
/* GET CLIENT BY ID */
/* ============================= */

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

/* ============================= */
/* LIST WITH FILTER */
/* ============================= */

export async function listClientsFiltered(query) {
  const { search, month, page = 1, limit = 20 } = query;

  const offset = (page - 1) * limit;

  let supa = supabase.from("clients").select("*", { count: "exact" });

  if (search) {
    supa = supa.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%`
    );
  }

  // 🔥 filtro por mês usando birth_date
  if (month) {
    const monthStr = String(month).padStart(2, "0");

    supa = supa
      .gte("birth_date", `1900-${monthStr}-01`)
      .lte("birth_date", `2100-${monthStr}-31`);
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

/* ============================= */
/* UPDATE CLIENT (BLINDADO) */
/* ============================= */

export async function updateClient(id, payload) {
  const {
    music_genres,
    name,
    email,
    phone,
    city,
    gender,
    lead_source,
    bought_with_partiu,
    favorite_event_id,
    birth_date,
  } = payload;

  const allowedFields = {
    name,
    email,
    phone,
    city,
    gender,
    lead_source,
    bought_with_partiu,
    favorite_event_id,
    birth_date,
  };

  const cleanFields = Object.fromEntries(
    Object.entries(allowedFields).filter(([_, v]) => v !== undefined)
  );

  if (Object.keys(cleanFields).length > 0) {
    const { error } = await supabase
      .from("clients")
      .update(cleanFields)
      .eq("id", id);

    if (error) throw error;
  }

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

/* ============================= */
/* DELETE CLIENT */
/* ============================= */

export async function deleteClient(id) {
  await supabase.from("client_music_genres").delete().eq("client_id", id);
  await supabase.from("client_events").delete().eq("client_id", id);

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
}