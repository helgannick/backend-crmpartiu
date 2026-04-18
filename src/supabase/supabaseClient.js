import 'dotenv/config';

import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  throw new Error("Missing env SUPABASE_URL");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY");
}
if (!process.env.SUPABASE_ANON_KEY) {
  console.warn("Warning: SUPABASE_ANON_KEY not set — supabase (anon) client unavailable");
}

// Bypassa RLS — usar apenas para operações admin e lookup tables (events, music_genres)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Respeita RLS — usar para operações normais autenticadas (requer SUPABASE_ANON_KEY)
export const supabase = process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : supabaseAdmin; // fallback temporário até a variável ser configurada

// Cria cliente com JWT do usuário para operações onde RLS deve validar por usuário
export function getSupabaseForUser(accessToken) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    }
  );
}
