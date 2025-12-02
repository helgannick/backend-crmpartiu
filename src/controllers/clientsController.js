import { supabase } from '../supabase/supabaseClient.js';

function normalizeInstagram(inst) {
  if (!inst) return [];
  if (Array.isArray(inst)) return inst.map(p => String(p).trim()).filter(Boolean);
  return [String(pref).trim()];
}

export async function createPublicClient(payload) {
  const { name, email, city, phone, birthday_day, birthday_month, Instagram} = payload;

  if (!name || !email || !phone) throw new Error('name and email and phone are required');

  const day = birthday_day ? parseInt(birthday_day, 10) : null;
  const month = birthday_month ? parseInt(birthday_month, 10) : null;

  if (day !== null && (day < 1 || day > 31)) throw new Error('birthday_day must be between 1 and 31');
  if (month !== null && (month < 1 || month > 12)) throw new Error('birthday_month must be between 1 and 12');

  const inst = normalizeInstagram(Instagram);

  const { data: existing, error: selErr } = await supabase
    .from('clients')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) {
    // return existing record id (or choose to throw). Here we throw to avoid duplicates
    throw new Error('Email already registered');
  }

  console.log("PAYLOAD RECEBIDO:", payload);

  const { data, error } = await supabase
    .from('clients')
    .insert([{
      name,
      email,
      city,
      phone,
      birthday_day: day,
      birthday_month: month,
      Instagram: inst,
    }])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getClientById(id) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function listClientsFiltered(query) {
  const {
    search,
    month,
    page = 1,
    limit = 20
  } = query;

  const offset = (page - 1) * limit;

  let supa = supabase
    .from("clients")
    .select("*", { count: "exact" });

  if (search) {
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
    data
  };
}

export async function getClientEligibility(clientId) {
  const { count, error: interactionsError } = await supabase
  .from('interactions')
  .select('id', { count: 'exact', head: true })
  .eq('client_id', clientId);

if (interactionsError) throw interactionsError;

const totalInteractions = count || 0;
  
  const eligible = totalInteractions >= 10;

  return {
    client_id: clientId,
    total_interactions: totalInteractions,
    eligible,
    rule: ">= 10 interações"
  };
}


export async function updateClient(id, payload) {
  const { name, email, city, phone, birthday_day, birthday_month, Instagram} = payload;
  const inst = normalizeInstagram(Instagram);

  const updateObj = {};
  if (name !== undefined) updateObj.name = name;
  if (email !== undefined) updateObj.email = email;
  if (city !== undefined) updateObj.city = city;
  if (phone !== undefined) updateObj.phone = phone;
  if (birthday_day !== undefined) updateObj.birthday_day = birthday_day;
  if (birthday_month !== undefined) updateObj.birthday_month = birthday_month;
  if (Instagram !== undefined) updateObj.Instagram = inst;

  const { data, error } = await supabase
    .from('clients')
    .update(updateObj)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClient(id) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
