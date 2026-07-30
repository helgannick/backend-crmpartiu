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

## Migrations do banco

### Estrutura

```
supabase/migrations/
├── 001_create_tables.sql       — Todas as tabelas base
├── 002_create_relationships.sql — FKs explícitas (idempotente)
├── 003_create_indexes.sql      — Índices para queries frequentes
├── 004_insert_seed_data.sql    — Gêneros musicais padrão
├── 005_add_soft_delete.sql     — deleted_at em clients e interactions
├── 006_create_audit_log.sql    — Tabela de auditoria
└── 007_gender_nao_quero_identificar.sql — CHECK de gender aceita 'Não Quero Identificar'
migrations/
├── 001_enable_rls.sql          — Habilita RLS nas tabelas
└── 002_rls_policies.sql        — Políticas por role
```

### Como aplicar em novo ambiente

**Via Supabase SQL Editor** (recomendado):
Execute os arquivos em ordem numérica dentro de cada pasta.

**Via script** (requer `psql` e `DATABASE_URL`):
```bash
DATABASE_URL=postgresql://... ./supabase/apply-migrations.sh
```

`DATABASE_URL` disponível em: Supabase > Project Settings > Database > Connection string > URI.

### Como criar uma nova migration

1. Crie o arquivo com o próximo número: `supabase/migrations/005_nome_descritivo.sql`
2. Use `IF NOT EXISTS` e `DO $$ ... $$` para garantir idempotência
3. Adicione comentário de data e propósito no topo
4. Aplique no Supabase antes do deploy

### Reset do banco (dev only)

```sql
DROP TABLE IF EXISTS client_events, client_music_genres, interactions, clients, events, music_genres CASCADE;
```

Execute no SQL Editor e reaplique as migrations do zero.

---

## Regras de desenvolvimento

- **Testar o build local antes de qualquer commit ou push**
- CORS configurado com `credentials: true` e `origin` específico via `FRONTEND_URL`
- Todas as rotas protegidas exigem autenticação (cookie ou Bearer token)

---

## Rotas

### Autenticação

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/auth/login` | Não | Login — seta cookies httpOnly (`auth_token` + `refresh_token`) |
| POST | `/auth/logout` | Não | Logout — limpa ambos os cookies |
| POST | `/auth/refresh` | Não | Renova `auth_token` via `refresh_token` |
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

### Cookies de autenticação

| Cookie | `maxAge` | `path` | Descrição |
|--------|----------|--------|-----------|
| `auth_token` | 7 dias | `/` | JWT de acesso — enviado em todas as requisições |
| `refresh_token` | 30 dias | `/auth/refresh` | Token de renovação — escopo mínimo |

Ambos com `httpOnly: true`, `secure: true` (produção), `sameSite: strict`.

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

### 2026-04-18 — Migrations versionadas

**Problema:** Sem migrations = impossível replicar o banco em novo ambiente.

**Solução:**
- `supabase/migrations/001_create_tables.sql` — schema completo com constraints e CHECKs
- `supabase/migrations/002_create_relationships.sql` — FKs explícitas e nomeadas (idempotente)
- `supabase/migrations/003_create_indexes.sql` — 9 índices para queries do dashboard e buscas
- `supabase/migrations/004_insert_seed_data.sql` — 20 gêneros musicais padrão
- `supabase/apply-migrations.sh` — script para aplicar via psql

**Arquivos criados:**
- `supabase/migrations/001_create_tables.sql`
- `supabase/migrations/002_create_relationships.sql`
- `supabase/migrations/003_create_indexes.sql`
- `supabase/migrations/004_insert_seed_data.sql`
- `supabase/apply-migrations.sh`

---

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

---

### 2026-04-18 — Validação de inputs com Zod

**Problema:** Entradas do usuário chegavam ao banco sem validação, risco de dados inválidos e crashes.

**Solução:**
- Criado `src/middleware/validate.js` — middleware genérico que chama `schema.parseAsync(req.body)` e retorna 400 com detalhes de campo em caso de erro (Zod v4: usa `.issues`, não `.errors`)
- Criados schemas `clientCreateSchema`, `clientUpdateSchema`, `clientBulkSchema` em `src/schemas/clientSchema.js`
- Validação aplicada em `POST /clients`, `PUT /clients/:id`, `PATCH /clients/:id`, `POST /clients/bulk`

**Arquivos criados/alterados:**
- `src/middleware/validate.js` — novo
- `src/schemas/clientSchema.js` — novo
- `src/routes/clients.js` — validate() nos endpoints de escrita

---

### 2026-04-18 — Soft delete e restore de clientes

**Problema:** DELETE permanente impede recuperação de registros excluídos por engano.

**Solução:**
- `supabase/migrations/005_add_soft_delete.sql` — adiciona coluna `deleted_at` (nullable) nas tabelas `clients` e `interactions` com índice
- Criado `src/utils/softDelete.js` com helpers `withoutDeleted`, `onlyDeleted`, `softDelete`, `restore`
- `DELETE /clients/:id` agora faz soft delete (seta `deleted_at`)
- `POST /clients/:id/restore` restaura o cliente
- `GET /clients/deleted` lista clientes excluídos
- `GET /clients` e `GET /clients/:id` filtram `deleted_at IS NULL`

**Arquivos criados/alterados:**
- `supabase/migrations/005_add_soft_delete.sql` — novo
- `src/utils/softDelete.js` — novo
- `src/controllers/clientsController.js` — soft delete em delete/restore/list
- `src/routes/clients.js` — rota /deleted e /restore

---

### 2026-04-18 — Audit log de operações

**Problema:** Sem rastreabilidade de quem criou, alterou ou excluiu registros.

**Solução:**
- `supabase/migrations/006_create_audit_log.sql` — tabela `audit_logs` com `table_name`, `record_id`, `action`, `old_values`, `new_values`, `user_id`, `user_email`, `created_at`; 4 índices
- Criado `src/services/auditService.js` — `logAction()` fire-and-forget (falha nunca quebra a operação principal)
- `logAction` chamado em create, update, delete e restore de clientes
- Criado `src/routes/audit.js` com:
  - `GET /audit/clients/:id/history` — histórico de um cliente
  - `GET /audit/logs` — logs gerais com filtros por `table`, `user_id`, `action` e paginação

**Arquivos criados/alterados:**
- `supabase/migrations/006_create_audit_log.sql` — novo
- `src/services/auditService.js` — novo
- `src/routes/audit.js` — novo
- `src/server.js` — rota `/audit` registrada
- `src/controllers/clientsController.js` — logAction nos CRUD

---

### 2026-04-18 — Refresh automático de token JWT

**Problema:** `access_token` expira após ~1h; sem renovação o usuário era deslogado.

**Solução:**
- Login agora seta dois cookies: `auth_token` (7 dias) e `refresh_token` (30 dias, path `/auth/refresh`)
- Logout limpa ambos os cookies
- `POST /auth/refresh` lê `refresh_token`, chama `supabase.auth.refreshSession()` e seta novos cookies

**Arquivos alterados:**
- `src/controllers/authController.js` — cookie refresh_token no login/logout + função `refresh`
- `src/routes/auth.js` — rota `POST /auth/refresh`

---

### 2026-04-18 — Dashboard de métricas avançadas

**Problema:** Dashboard limitado a totais simples; sem visão de conversão, engajamento ou retenção.

**Solução — 5 novos endpoints:**

| Endpoint | Descrição |
|----------|-----------|
| `GET /dashboard/conversion-funnel` | Distribuição por status + taxas de conversão entre estágios |
| `GET /dashboard/engagement-trends?months=6` | Clientes ativos e média de interações por mês |
| `GET /dashboard/top-sources` | Top 5 origens de leads com contagem e percentual |
| `GET /dashboard/inactive-clients?days=30` | Clientes sem interação há N dias + last interaction |
| `GET /dashboard/retention-cohorts?months=6` | Retenção 30/60/90 dias por coorte de cadastro |

**Arquivos alterados:**
- `src/controllers/dashboardController.js` — 5 novas funções
- `src/routes/dashboard.js` — 5 novas rotas

---

### 2026-04-18 — Testes unitários e de integração com Jest

**Problema:** Sem testes = mudanças quebram código sem aviso.

**Solução:** 30 testes em 5 suites usando Jest + Supertest + `jest.unstable_mockModule` para ESM.

| Suite | Tipo | Testes |
|-------|------|--------|
| `statusService` | Unitário | 7 — cobre todos os estágios de status |
| `validate middleware` | Unitário | 6 — Zod validation, campos inválidos, opcionais |
| `authMiddleware` | Unitário | 4 — token ausente, inválido, cookie vs. header |
| `auth routes` | Integração | 7 — login, logout, /me com supertest |
| `clients routes` | Integração | 6 — list, search, create, delete com mock do Supabase |

**Como rodar:**
```bash
npm test                # todos os testes
npm run test:watch      # modo watch
npm run test:coverage   # cobertura de código
```

**Arquivos criados/alterados:**
- `src/app.js` — novo (app Express sem listen, importado nos testes)
- `src/server.js` — simplificado (só chama listen)
- `jest.config.js` — novo
- `tests/services/statusService.test.js` — novo
- `tests/middleware/validate.test.js` — novo
- `tests/middleware/authMiddleware.test.js` — novo
- `tests/routes/auth.test.js` — novo
- `tests/routes/clients.test.js` — novo

---

### 2026-04-18 — Documentação Swagger / OpenAPI

**Solução:** UI interativa disponível em `/api-docs` com 22 endpoints documentados.

**Acesso:**
- Desenvolvimento: http://localhost:3001/api-docs
- Produção: https://backend-crmpartiu.onrender.com/api-docs

**Cobertura:**

| Tag | Endpoints |
|-----|-----------|
| Auth | POST /login, POST /logout, POST /refresh, GET /me, GET /session |
| Clients | GET/POST /, GET/PUT/PATCH/DELETE /:id, POST /bulk, GET /deleted, POST /:id/restore, GET /:id/status |
| Interactions | GET/POST /:id/interactions, DELETE /:id/interactions/:iid |
| Dashboard | total, week, month, birthdays, recent, status, by-month, by-city, conversion-funnel, engagement-trends, top-sources, inactive-clients, retention-cohorts |
| Public | POST /public/register |

**Arquivos criados/alterados:**
- `src/docs/swagger.js` — spec OpenAPI 3.0 com schemas e servers
- `src/app.js` — rota `/api-docs` com swagger-ui-express
- `src/routes/*.js` — JSDoc `@swagger` em todos os endpoints
