import { supabase } from '../supabase/supabaseClient.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
};

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data?.session) {
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }

  res.cookie('auth_token', data.session.access_token, COOKIE_OPTIONS);

  return res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || 'staff',
    },
  });
}

export async function logout(req, res) {
  res.clearCookie('auth_token', COOKIE_OPTIONS);
  return res.json({ message: 'Logout realizado com sucesso' });
}
