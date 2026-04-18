import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';

// Mock supabase ANTES de importar app
const mockSignIn = jest.fn();
const mockGetUser = jest.fn();

jest.unstable_mockModule('../../src/supabase/supabaseClient.js', () => ({
  supabase: {
    auth: { signInWithPassword: mockSignIn, getUser: mockGetUser },
  },
  supabaseAdmin: {
    auth: { signInWithPassword: mockSignIn, getUser: mockGetUser },
  },
}));

const { default: app } = await import('../../src/app.js');

describe('POST /auth/login', () => {
  beforeEach(() => { mockSignIn.mockReset(); mockGetUser.mockReset(); });

  it('returns 400 when email or password missing', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong credentials', async () => {
    mockSignIn.mockResolvedValue({ data: null, error: new Error('invalid') });
    const res = await request(app).post('/auth/login').send({ email: 'a@b.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciais inválidas');
  });

  it('returns 200 and sets cookie for valid credentials', async () => {
    mockSignIn.mockResolvedValue({
      data: {
        session: { access_token: 'tok', refresh_token: 'ref' },
        user: { id: '1', email: 'a@b.com', user_metadata: {} },
      },
      error: null,
    });
    const res = await request(app).post('/auth/login').send({ email: 'a@b.com', password: 'correct' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('a@b.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });
});

describe('GET /auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user with valid token', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: '1', email: 'a@b.com', user_metadata: { role: 'admin' } } },
      error: null,
    });
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('a@b.com');
  });
});

describe('POST /auth/logout', () => {
  it('returns 200 and clears cookies', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
