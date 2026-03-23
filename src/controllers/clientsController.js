import { supabase } from "../supabase/supabaseClient.js";

const isUUID = (val) => /^[0-9a-fA-F-]{36}$/.test(val);

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
    favorite_event,
    music_genres,
    other_genre,
    music_genre_other,
    last_event,
    birth_date,
    contacted,
  } = payload;

  // Normaliza campos que o frontend pode enviar com nomes diferentes
  const resolvedFavoriteEvent = favorite_event_id || favorite_event || null;
  const resolvedOtherGenre = other_genre || music_genre_other || null;

  if (!name || !email || !phone) {
    throw new Error("name, email and phone are required");
  }

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) throw new Error("Email already registered");

  /* =====================
     RESOLVE favorite_event_id
     Aceita UUID ou nome (string)
  ===================== */
  let resolvedFavoriteEventId = null;

  if (resolvedFavoriteEvent) {
    if (isUUID(resolvedFavoriteEvent)) {
      resolvedFavoriteEventId = resolvedFavoriteEvent;
    } else {
      const { data: existingEvent } = await supabase
        .from("events")
        .select("id")
        .ilike("name", resolvedFavoriteEvent)
        .maybeSingle();

      if (existingEvent) {
        resolvedFavoriteEventId = existingEvent.id;
      } else {
        const { data: newEvent, error: eventCreateError } = await supabase
          .from("events")
          .insert([{ name: resolvedFavoriteEvent }])
          .select()
          .single();

        if (eventCreateError) throw eventCreateError;
        resolvedFavoriteEventId = newEvent.id;
      }
    }
  }

  const { data: client, error } = await supabase
    .from("clients")
    .insert([
      {
        name,
        email,
        phone,
        city: city || null,
        gender: gender || null,
        lead_source: lead_source || null,
        bought_with_partiu: bought_with_partiu ?? false,
        favorite_event_id: resolvedFavoriteEventId,
        birth_date: birth_date || null,
      },
    ])
    .select("*")
    .single();

  if (error) throw error;

  const clientId = client.id;

  /* =====================
     GENEROS MUSICAIS
     Aceita UUIDs ou nomes (strings)
  ===================== */

  let genres = music_genres || [];

  if (resolvedOtherGenre) {
    genres.push(resolvedOtherGenre);
  }

  if (genres.length) {
    const resolvedGenreIds = await Promise.all(
      genres.map(async (genre) => {
        if (isUUID(genre)) return genre;

        const { data: existingGenre } = await supabase
          .from("music_genres")
          .select("id")
          .ilike("name", genre)
          .maybeSingle();

        if (existingGenre) return existingGenre.id;

        const { data: newGenre, error: genreError } = await supabase
          .from("music_genres")
          .insert([{ name: genre }])
          .select()
          .single();

        if (genreError) throw genreError;
        return newGenre.id;
      })
    );

    const rows = resolvedGenreIds.map((genreId) => ({
      client_id: clientId,
      genre_id: genreId,
    }));

    const { error: genreInsertError } = await supabase
      .from("client_music_genres")
      .insert(rows);

    if (genreInsertError) throw genreInsertError;
  }

  /* =====================
     ULTIMO EVENTO
     Aceita UUID ou nome (string)
  ===================== */

  if (last_event) {
    let eventId = last_event;

    if (!isUUID(last_event)) {
      const { data: existingEvent } = await supabase
        .from("events")
        .select("id")
        .ilike("name", last_event)
        .maybeSingle();

      if (existingEvent) {
        eventId = existingEvent.id;
      } else {
        const { data: newEvent, error: eventCreateError } = await supabase
          .from("events")
          .insert([{ name: last_event }])
          .select()
          .single();

        if (eventCreateError) throw eventCreateError;
        eventId = newEvent.id;
      }
    }

    const { error: eventError } = await supabase
      .from("client_events")
      .insert([
        {
          client_id: clientId,
          event_id: eventId,
          attended_at: new Date(),
        },
      ]);

    if (eventError) throw eventError;
  }

  return client; // ← retorna client para a rota conseguir acessar .id
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
    favorite_event,
    birth_date,
    contacted,
  } = payload;

  const resolvedFavoriteEvent = favorite_event_id || favorite_event;

  let resolvedFavoriteEventId = resolvedFavoriteEvent;

  if (resolvedFavoriteEvent !== undefined && !isUUID(resolvedFavoriteEvent)) {
    const { data: existingEvent } = await supabase
      .from("events")
      .select("id")
      .ilike("name", resolvedFavoriteEvent)
      .maybeSingle();

    if (existingEvent) {
      resolvedFavoriteEventId = existingEvent.id;
    } else {
      const { data: newEvent, error: eventCreateError } = await supabase
        .from("events")
        .insert([{ name: resolvedFavoriteEvent }])
        .select()
        .single();

      if (eventCreateError) throw eventCreateError;
      resolvedFavoriteEventId = newEvent.id;
    }
  }

  const allowedFields = {
    name,
    email,
    phone,
    city,
    gender,
    lead_source,
    bought_with_partiu,
    favorite_event_id: resolvedFavoriteEventId,
    birth_date,
    contacted,
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
      const resolvedGenreIds = await Promise.all(
        music_genres.map(async (genre) => {
          if (isUUID(genre)) return genre;

          const { data: existingGenre } = await supabase
            .from("music_genres")
            .select("id")
            .ilike("name", genre)
            .maybeSingle();

          if (existingGenre) return existingGenre.id;

          const { data: newGenre, error: genreError } = await supabase
            .from("music_genres")
            .insert([{ name: genre }])
            .select()
            .single();

          if (genreError) throw genreError;
          return newGenre.id;
        })
      );

      const rows = resolvedGenreIds.map((genreId) => ({
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