import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';

// Mock supabase ANTES de importar app
const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.unstable_mockModule('../../src/supabase/supabaseClient.js', () => ({
  supabase: { auth: { getUser: mockGetUser } },
  supabaseAdmin: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  },
}));

const { default: app } = await import('../../src/app.js');

function authUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'uid-1', email: 'admin@test.com', user_metadata: { role: 'admin' } } },
    error: null,
  });
}

function chainMock(overrides = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return chain;
}

describe('GET /clients', () => {
  beforeEach(() => { mockGetUser.mockReset(); mockFrom.mockReset(); });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/clients');
    expect(res.status).toBe(401);
  });

  it('returns paginated client list', async () => {
    authUser();
    const chain = chainMock();
    chain.range.mockResolvedValue({ data: [{ id: '1', name: 'Test', email: 'test@t.com' }], count: 1, error: null });
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .get('/clients')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 200 for search query', async () => {
    authUser();
    const chain = chainMock();
    chain.range.mockResolvedValue({ data: [], count: 0, error: null });
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .get('/clients?search=João')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
  });
});

describe('POST /clients', () => {
  beforeEach(() => { mockGetUser.mockReset(); mockFrom.mockReset(); });

  it('returns 400 for invalid payload', async () => {
    authUser();
    const res = await request(app)
      .post('/clients')
      .set('Authorization', 'Bearer valid')
      .send({ name: 'X', email: 'not-email' });
    expect(res.status).toBe(400);
  });

  it('returns 400 if email already registered', async () => {
    authUser();
    const chain = chainMock();
    chain.maybeSingle.mockResolvedValue({ data: { id: 'existing-id' }, error: null });
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .post('/clients')
      .set('Authorization', 'Bearer valid')
      .send({ name: 'Maria Silva', email: 'existing@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already registered/i);
  });
});

describe('DELETE /clients/:id', () => {
  beforeEach(() => { mockGetUser.mockReset(); mockFrom.mockReset(); });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/clients/some-uuid');
    expect(res.status).toBe(401);
  });

  it('returns 204 on successful soft delete', async () => {
    authUser();

    // 1st from() call: select for audit log (maybeSingle)
    const selectChain = chainMock();
    selectChain.maybeSingle.mockResolvedValue({ data: { id: 'uid', name: 'Test' }, error: null });

    // 2nd from() call: update (softDelete) — eq() returns the resolved value
    const updateChain = chainMock();
    updateChain.eq.mockResolvedValue({ error: null });

    // 3rd from() call: audit log insert — fire-and-forget, use default chain
    const auditChain = chainMock();
    auditChain.insert = jest.fn().mockReturnValue({ then: jest.fn() });

    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValue(auditChain);

    const res = await request(app)
      .delete('/clients/some-uuid')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(204);
  });
});
