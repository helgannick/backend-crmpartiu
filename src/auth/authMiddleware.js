import { supabase } from '../supabase/supabaseClient.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ message: 'Token não fornecido' });

  const token = authHeader.replace('Bearer ', '');

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ message: 'Token inválido' });
  }

  // usuário autenticado
  req.user = {
    id: data.user.id,
    email: data.user.email,
    role: data.user.user_metadata?.role || 'staff'
  };

  next();
}
