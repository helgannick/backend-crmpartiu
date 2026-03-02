import { supabase } from "../supabase/supabaseClient.js";

export const getMusicGenres = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("music_genres")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Erro ao buscar gêneros:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error("Erro inesperado:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
};