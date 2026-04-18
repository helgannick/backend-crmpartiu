import { supabaseAdmin as supabase } from '../supabase/supabaseClient.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
  path: '/auth/refresh',
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
  res.cookie('refresh_token', data.session.refresh_token, REFRESH_COOKIE_OPTIONS);

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
  res.clearCookie('refresh_token', REFRESH_COOKIE_OPTIONS);
  return res.json({ success: true });
}

export async function refresh(req, res) {
  const refreshTokenValue = req.cookies?.refresh_token;

  if (!refreshTokenValue) {
    return res.status(401).json({ message: 'Refresh token ausente' });
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshTokenValue });

  if (error || !data?.session) {
    res.clearCookie('auth_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', REFRESH_COOKIE_OPTIONS);
    return res.status(401).json({ message: 'Sessão expirada, faça login novamente' });
  }

  res.cookie('auth_token', data.session.access_token, COOKIE_OPTIONS);
  res.cookie('refresh_token', data.session.refresh_token, REFRESH_COOKIE_OPTIONS);

  return res.json({ success: true });
}

export async function me(req, res) {
  return res.json({ user: req.user });
}

export async function session(req, res) {
  const { data, error } = await supabase.auth.getUser(req.user.accessToken);

  if (error || !data?.user) {
    return res.status(401).json({ message: 'Sessão inválida' });
  }

  return res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || 'staff',
      lastSignIn: data.user.last_sign_in_at,
    },
    expiresAt: data.user.session?.expires_at ?? null,
  });
}
