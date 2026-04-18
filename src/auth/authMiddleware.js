import { supabase } from '../supabase/supabaseClient.js';

export async function authMiddleware(req, res, next) {
  const cookieToken = req.cookies?.auth_token;
  const authHeader = req.headers.authorization;

  const token = cookieToken || authHeader?.replace('Bearer ', '');

  if (!token)
    return res.status(401).json({ message: 'Token não fornecido' });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ message: 'Token inválido' });
  }

  // usuário autenticado
  req.user = {
    id: data.user.id,
    email: data.user.email,
    role: data.user.user_metadata?.role || 'staff',
    accessToken: token,
  };

  next();
}
