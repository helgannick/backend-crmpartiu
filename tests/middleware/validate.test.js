import { describe, it, expect } from '@jest/globals';
import { validate } from '../../src/middleware/validate.js';
import { clientCreateSchema } from '../../src/schemas/clientSchema.js';

function mockRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

describe('validate middleware', () => {
  it('calls next() with valid payload', async () => {
    const req = { body: { name: 'João Silva', email: 'joao@email.com' } };
    const res = mockRes();
    let called = false;
    await validate(clientCreateSchema)(req, res, () => { called = true; });
    expect(called).toBe(true);
  });

  it('returns 400 for missing required fields', async () => {
    const req = { body: {} };
    const res = mockRes();
    await validate(clientCreateSchema)(req, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Dados inválidos');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('returns 400 for invalid email', async () => {
    const req = { body: { name: 'João', email: 'nao-e-email' } };
    const res = mockRes();
    await validate(clientCreateSchema)(req, res, () => {});
    expect(res.statusCode).toBe(400);
    const emailError = res.body.details.find((d) => d.field === 'email');
    expect(emailError).toBeDefined();
  });

  it('returns 400 for name too short', async () => {
    const req = { body: { name: 'A', email: 'valid@email.com' } };
    const res = mockRes();
    await validate(clientCreateSchema)(req, res, () => {});
    expect(res.statusCode).toBe(400);
    const nameError = res.body.details.find((d) => d.field === 'name');
    expect(nameError).toBeDefined();
  });

  it('returns 400 for invalid phone format', async () => {
    const req = { body: { name: 'João Silva', email: 'joao@email.com', phone: '123' } };
    const res = mockRes();
    await validate(clientCreateSchema)(req, res, () => {});
    expect(res.statusCode).toBe(400);
    const phoneError = res.body.details.find((d) => d.field === 'phone');
    expect(phoneError).toBeDefined();
  });

  it('coerces and passes through valid optional fields', async () => {
    const req = {
      body: { name: 'Maria Silva', email: 'maria@email.com', gender: 'Feminino', bought_with_partiu: false },
    };
    const res = mockRes();
    let called = false;
    await validate(clientCreateSchema)(req, res, () => { called = true; });
    expect(called).toBe(true);
  });
});
