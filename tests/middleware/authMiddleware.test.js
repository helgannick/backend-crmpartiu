import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock do supabaseClient ANTES de importar o middleware
const mockGetUser = jest.fn();

jest.unstable_mockModule('../../src/supabase/supabaseClient.js', () => ({
  supabase: { auth: { getUser: mockGetUser } },
  supabaseAdmin: { auth: { getUser: mockGetUser } },
}));

const { authMiddleware } = await import('../../src/auth/authMiddleware.js');

function mockRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

describe('authMiddleware', () => {
  beforeEach(() => mockGetUser.mockReset());

  it('returns 401 when no token provided', async () => {
    const req = { cookies: {}, headers: {} };
    const res = mockRes();
    await authMiddleware(req, res, () => {});
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Token não fornecido');
  });

  it('returns 401 for invalid token', async () => {
    mockGetUser.mockResolvedValue({ data: null, error: new Error('invalid') });
    const req = { cookies: {}, headers: { authorization: 'Bearer bad-token' } };
    const res = mockRes();
    await authMiddleware(req, res, () => {});
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Token inválido');
  });

  it('calls next() and sets req.user for valid token', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'uuid-123', email: 'user@test.com', user_metadata: { role: 'admin' } } },
      error: null,
    });
    const req = { cookies: {}, headers: { authorization: 'Bearer valid-token' } };
    const res = mockRes();
    let called = false;
    await authMiddleware(req, res, () => { called = true; });
    expect(called).toBe(true);
    expect(req.user.id).toBe('uuid-123');
    expect(req.user.email).toBe('user@test.com');
    expect(req.user.role).toBe('admin');
  });

  it('reads token from cookie over header', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'cookie-user', email: 'c@test.com', user_metadata: {} } },
      error: null,
    });
    const req = { cookies: { auth_token: 'cookie-token' }, headers: { authorization: 'Bearer header-token' } };
    const res = mockRes();
    await authMiddleware(req, res, () => {});
    expect(mockGetUser).toHaveBeenCalledWith('cookie-token');
  });
});
