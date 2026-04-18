import { supabaseAdmin } from '../supabase/supabaseClient.js';

export function logAction({ tableName, recordId, action, oldValues = null, newValues = null, user = {} }) {
  // Fire-and-forget: falha no audit log nunca quebra a operação principal
  supabaseAdmin.from('audit_logs').insert({
    table_name:  tableName,
    record_id:   recordId,
    action,
    old_values:  oldValues,
    new_values:  newValues,
    user_id:     user?.id    ?? null,
    user_email:  user?.email ?? null,
  }).then(({ error }) => {
    if (error) console.error('[audit] failed to log:', error.message);
  });
}
