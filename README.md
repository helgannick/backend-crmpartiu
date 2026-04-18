# Backend CRM Partiu

API REST em Express para o CRM Partiu, com autenticação via Supabase Auth.

## Stack

- Node.js + Express 5
- Supabase (Auth + Database)
- Cookie-parser (httpOnly cookies)

## Variáveis de ambiente

Crie um `.env` na raiz:

```env
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
FRONTEND_URL=http://localhost:3000   # produção: URL do frontend
NODE_ENV=development                 # produção: production
PORT=3001
```

## Instalação e execução local

```bash
npm install
npm run dev
```

## Regras de desenvolvimento

- **Testar o build local antes de qualquer commit ou push**
- CORS configurado com `credentials: true` e `origin` específico via `FRONTEND_URL`
- Todas as rotas protegidas exigem autenticação (cookie ou Bearer token)

---

## Rotas

### Autenticação

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/auth/login` | Não | Login — seta cookie httpOnly |
| POST | `/auth/logout` | Não | Logout — limpa cookie |

### Clientes

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/clients` | Sim | Listar clientes |
| POST | `/clients` | Sim | Criar cliente |
| POST | `/clients/bulk` | Sim | Criar/atualizar em massa |
| GET | `/clients/:id` | Sim | Buscar cliente |
| GET | `/clients/:id/status` | Sim | Status do cliente |
| PUT | `/clients/:id` | Sim | Atualizar cliente |
| PATCH | `/clients/:id` | Sim | Atualização parcial |
| DELETE | `/clients/:id` | Sim | Excluir cliente |

### Interações

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/clients/:id/interactions` | Sim | Listar interações |
| POST | `/clients/:id/interactions` | Sim | Criar interação |

### Dashboard

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/dashboard/total` | Sim | Total de clientes |
| GET | `/dashboard/week` | Sim | Novos na semana |
| GET | `/dashboard/month` | Sim | Novos no mês |
| GET | `/dashboard/birthdays` | Sim | Aniversariantes do mês |
| GET | `/dashboard/recent` | Sim | Últimos 5 clientes |
| GET | `/dashboard/status` | Sim | Contagem ativo/inativo |
| GET | `/dashboard/clients-by-month` | Sim | Clientes por mês |
| GET | `/dashboard/clients-by-city` | Sim | Clientes por cidade |

### Públicas

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/public/register` | Não | Cadastro de cliente |
| GET | `/music-genres` | Não | Lista de gêneros musicais |

---

## Autenticação

### Como funciona

1. O frontend chama `POST /auth/login` com `{ email, password }`
2. O backend autentica via Supabase e seta o cookie `auth_token` (httpOnly)
3. Todas as requisições seguintes enviam o cookie automaticamente (`credentials: 'include'`)
4. O `authMiddleware` lê o cookie (fallback para `Authorization: Bearer <token>`)

### Cookie `auth_token`

| Atributo | Valor |
|----------|-------|
| `httpOnly` | true |
| `secure` | true (apenas em produção) |
| `sameSite` | strict |
| `maxAge` | 7 dias |

### Exemplo de uso no frontend

```js
// Login
await fetch('https://backend-crmpartiu.onrender.com/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

// Rotas protegidas
await fetch('https://backend-crmpartiu.onrender.com/clients', {
  credentials: 'include',
});

// Logout
await fetch('https://backend-crmpartiu.onrender.com/auth/logout', {
  method: 'POST',
  credentials: 'include',
});
```

---

## Histórico de mudanças

### 2026-04-18 — Migração para httpOnly cookies

**Problema:** Token JWT armazenado em `localStorage` é vulnerável a ataques XSS.

**Solução:**
- Criado `POST /auth/login` que autentica via Supabase e retorna token em cookie httpOnly
- Criado `POST /auth/logout` que limpa o cookie
- `authMiddleware` atualizado para ler token do cookie (mantendo fallback para Bearer token)
- CORS atualizado: `credentials: true` + `origin` restrito via `FRONTEND_URL`
- Adicionado `cookie-parser` como middleware

**Arquivos alterados:**
- `src/server.js` — CORS, cookie-parser, nova rota `/auth`
- `src/auth/authMiddleware.js` — leitura do cookie
- `src/controllers/authController.js` — novo
- `src/routes/auth.js` — novo
