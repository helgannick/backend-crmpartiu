export const withoutDeleted = (query) => query.is('deleted_at', null);
export const onlyDeleted   = (query) => query.not('deleted_at', 'is', null);

export const softDelete = (supabase, table, id) =>
  supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);

export const restore = (supabase, table, id) =>
  supabase.from(table).update({ deleted_at: null }).eq('id', id);
