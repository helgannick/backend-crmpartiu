import jwt from 'jsonwebtoken';

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });

    if (
      email !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );

    return res.json({
      token,
      expires_in: process.env.JWT_EXPIRES || '7d'
    });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ message: 'Erro interno' });
  }
}
