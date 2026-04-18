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
SUPABASE_ANON_KEY=<anon_key>          # Project Settings > API > anon public
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
| GET | `/auth/me` | Sim | Retorna usuário autenticado |
| GET | `/auth/session` | Sim | Retorna sessão completa do Supabase |

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

## Rate Limiting

| Limiter | Rota | Limite | Janela |
|---------|------|--------|--------|
| `general` | todas as rotas | 100 req | 15 min |
| `login` | `POST /auth/login` | 10 req | 15 min |
| `publicRegister` | `POST /public/register` | 5 req | 1 hora |
| `dashboard` | `GET /dashboard/*` | 60 req | 1 min |

Resposta ao exceder o limite — status `429`:
```json
{ "message": "Muitas requisições. Tente novamente em X minutos." }
```

Headers retornados: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

---

## Row Level Security (RLS)

### Como aplicar as migrations

Execute os arquivos SQL no **Supabase SQL Editor** (`Project > SQL Editor > New query`) na ordem:

1. `migrations/001_enable_rls.sql` — habilita RLS em todas as tabelas
2. `migrations/002_rls_policies.sql` — cria as políticas por role

### Tabelas e políticas

| Tabela | anon | authenticated | service_role |
|--------|------|---------------|--------------|
| `clients` | ❌ | SELECT INSERT UPDATE DELETE | ✅ bypass |
| `interactions` | ❌ | SELECT INSERT UPDATE DELETE | ✅ bypass |
| `events` | SELECT | SELECT | ✅ bypass (INSERT/UPDATE/DELETE) |
| `music_genres` | SELECT | SELECT | ✅ bypass (INSERT/UPDATE/DELETE) |
| `client_music_genres` | ❌ | SELECT INSERT DELETE | ✅ bypass |
| `client_events` | ❌ | SELECT INSERT DELETE | ✅ bypass |

### Clientes Supabase no backend

| Export | Chave | Uso |
|--------|-------|-----|
| `supabaseAdmin` | `SERVICE_ROLE_KEY` | Controllers, lookup tables, operações que exigem bypass |
| `supabase` | `ANON_KEY` | Leituras públicas (music_genres) |
| `getSupabaseForUser(token)` | `ANON_KEY` + JWT | Operações futuras com RLS por usuário |

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

### 2026-04-18 — Row Level Security (RLS)

**Problema:** `SUPABASE_SERVICE_ROLE_KEY` bypassa RLS; acesso direto ao banco não tem proteção.

**Solução:**
- Criados `migrations/001_enable_rls.sql` e `migrations/002_rls_policies.sql`
- `supabaseClient.js` exporta `supabaseAdmin` (service_role), `supabase` (anon) e `getSupabaseForUser(token)`
- Controllers migraram para `supabaseAdmin` (operações que tocam lookup tables)
- `musicGenresController` usa `supabase` (anon) — leitura pública
- `authMiddleware` expõe `req.user.accessToken` para uso futuro com `getSupabaseForUser`
- Adicionados `GET /auth/me` e `GET /auth/session`

### 2026-04-18 — Rate Limiting

**Problema:** Endpoints públicos e de login vulneráveis a brute force e spam.

**Solução:**
- Criado `src/middleware/rateLimiter.js` com 4 limiters (`general`, `login`, `publicRegister`, `dashboard`)
- `general` aplicado globalmente em `server.js`
- `login` aplicado em `POST /auth/login`
- `publicRegister` aplicado em `POST /public/register`
- `dashboard` aplicado em todos os endpoints `GET /dashboard/*`

**Arquivos alterados:**
- `src/middleware/rateLimiter.js` — novo
- `src/server.js` — limiter global
- `src/routes/auth.js` — limiter de login
- `src/routes/public.js` — limiter de registro
- `src/routes/dashboard.js` — limiter de dashboard

---

### 2026-04-18 — Row Level Security

**Arquivos alterados:**
- `migrations/001_enable_rls.sql` — novo
- `migrations/002_rls_policies.sql` — novo
- `src/supabase/supabaseClient.js` — dois clientes + helper
- `src/auth/authMiddleware.js` — expõe accessToken no req.user
- `src/controllers/authController.js` — session endpoint
- `src/routes/auth.js` — rota /session
- `src/controllers/clientsController.js` — importa supabaseAdmin
- `src/controllers/interactionsController.js` — importa supabaseAdmin
- `src/controllers/dashboardController.js` — importa supabaseAdmin
- `src/routes/clients.js` — usa supabaseAdmin inline
