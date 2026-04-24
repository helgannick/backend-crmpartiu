import { supabaseAdmin } from "../supabase/supabaseClient.js";
import { withoutDeleted, onlyDeleted, softDelete, restore } from "../utils/softDelete.js";
import { logAction } from "../services/auditService.js";

// clientsController usa supabaseAdmin: operações tocam lookup tables (events, music_genres)
// que exigem bypass de RLS para criar registros dinamicamente via importação/registro público
const supabase = supabaseAdmin;

const isUUID = (val) => /^[0-9a-fA-F-]{36}$/.test(val);

/* ============================= */
/* CREATE CLIENT */
/* ============================= */

export async function createClient(payload, user = null) {
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

  if (resolvedFavoriteEvent && !isUUID(resolvedFavoriteEvent)) {
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

        if (eventCreateError) {
          console.error("createClient: could not create favorite_event (skipping FK):", eventCreateError.message);
        } else {
          resolvedFavoriteEventId = newEvent.id;
        }
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

        if (genreError) {
          console.error("createClient: could not create music_genre (skipping):", genreError.message);
          return null;
        }
        return newGenre.id;
      })
    );

    const rows = resolvedGenreIds
      .filter(Boolean)
      .map((genreId) => ({ client_id: clientId, genre_id: genreId }));

    if (rows.length) {
      const { error: genreInsertError } = await supabase
        .from("client_music_genres")
        .insert(rows);

      if (genreInsertError) console.error("createClient: could not link music_genres:", genreInsertError.message);
    }
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

        if (eventCreateError) {
          console.error("createClient: could not create last_event (skipping):", eventCreateError.message);
          eventId = null;
        } else {
          eventId = newEvent.id;
        }
      }
    }

    if (eventId) {
      const { error: eventError } = await supabase
        .from("client_events")
        .insert([{ client_id: clientId, event_id: eventId, attended_at: new Date() }]);

      if (eventError) console.error("createClient: could not link last_event:", eventError.message);
    }
  }

  logAction({ tableName: 'clients', recordId: client.id, action: 'INSERT', newValues: client, user });

  return client; // ← retorna client para a rota conseguir acessar .id
}

/* ============================= */
/* LIST CLIENTS */
/* ============================= */

export async function listClients() {
  const { data, error } = await withoutDeleted(
    supabase.from("clients").select("*")
  ).order("created_at", { ascending: false });

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
      favorite_event:events!clients_favorite_event_id_fkey (*),
      client_music_genres!client_music_genres_client_id_fkey (
        music_genres!client_music_genres_genre_id_fkey (*)
      ),
      client_events!client_events_client_id_fkey (
        events!client_events_event_id_fkey (*)
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
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
  const { search, month } = query;

  const offset = (page - 1) * limit;

  let supa = withoutDeleted(supabase.from("clients").select("*", { count: "exact" }));

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

export async function updateClient(id, payload, user = null) {
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

  // captura estado anterior para audit log
  const { data: oldClient } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();

  const resolvedFavoriteEvent = favorite_event_id || favorite_event;

  let resolvedFavoriteEventId = resolvedFavoriteEvent;

  if (resolvedFavoriteEvent !== undefined && resolvedFavoriteEvent !== null && !isUUID(resolvedFavoriteEvent)) {

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

  const updated = await getClientById(id);
  logAction({ tableName: 'clients', recordId: id, action: 'UPDATE', oldValues: oldClient, newValues: updated, user });
  return updated;
}

/* ============================= */
/* DELETE CLIENT */
/* ============================= */

export async function deleteClient(id, user = null) {
  const { data: oldClient } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  const { error } = await softDelete(supabase, 'clients', id);
  if (error) throw error;
  logAction({ tableName: 'clients', recordId: id, action: 'DELETE', oldValues: oldClient, user });
  return true;
}

export async function restoreClient(id, user = null) {
  const { error } = await restore(supabase, 'clients', id);
  if (error) throw error;
  logAction({ tableName: 'clients', recordId: id, action: 'INSERT', newValues: { restored: true }, user });
  return true;
}

export async function listDeletedClients() {
  const { data, error } = await onlyDeleted(
    supabase.from("clients").select("*")
  ).order("deleted_at", { ascending: false });

  if (error) throw error;
  return data || [];
}