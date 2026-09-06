# CRM Partiu Pra Boa — Backend

## Regras de desenvolvimento

> **TESTAR ANTES DE COMMITAR — OBRIGATÓRIO**
> Antes de qualquer `git commit` ou `git push`:
> 1. Subir o servidor: `node src/server.js`
> 2. Testar os endpoints modificados com curl ou chamada real
> 3. Corrigir qualquer erro antes de commitar
> Nunca subir código sem validação local.

## Stack
- **Runtime:** Node.js (ESModules)
- **Framework:** Express 5
- **Banco:** Supabase (PostgreSQL)
- **Hosting:** Render (free tier)
- **WhatsApp:** Evolution API (Railway) — instância `crmpartiu`
- **IA:** OpenAI GPT-4o-mini

## Infraestrutura
- **Backend:** https://backend-crmpartiu.onrender.com
- **Keep-alive:** UptimeRobot → `GET /health` a cada 5 min
- **Cron diário:** cron-job.org → `POST /api/birthday/cron?key=CRON_SECRET` às 09:00

## Variáveis de ambiente (.env)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
JWT_SECRET
PORT
FRONTEND_URL
EVOLUTION_API_URL
EVOLUTION_API_KEY
EVOLUTION_INSTANCE_NAME
EVOLUTION_WEBHOOK_URL
OPENAI_API_KEY
CRON_SECRET
```

## Estrutura de arquivos relevantes
```
src/
  app.js                          # Express app, rotas registradas
  server.js                       # Entry point
  auth/
    authMiddleware.js             # Valida JWT Supabase via cookie ou Bearer
  services/
    evolutionService.js           # Integração Evolution API (sendText, checkConnection, getWhatsAppName)
    aiMessageService.js           # GPT-4o-mini — gera { opener, body } para cada tipo de mensagem
    birthdayService.js            # Jobs D-7 e D-0, controle de envio, conversão, limpeza
    messageService.js             # sendWhatsApp genérico com log no Supabase
    auditService.js
    statusService.js
  routes/
    whatsapp.js                   # /api/whatsapp/status, send-test, check-number
    webhooks.js                   # /api/webhooks/whatsapp — recebe eventos Evolution
    birthday.js                   # /api/birthday/cron, run, preview, convert, cleanup
    auth.js                       # /auth/login, logout, me, refresh
    clients.js
    interactions.js
    dashboard.js
    musicGenres.js
    audit.js
  supabase/
    supabaseClient.js             # supabase (anon+RLS), supabaseAdmin (service role)
scripts/
  check-evolution.js              # Lista instâncias da Evolution API
```

## Tabelas Supabase relevantes
| Tabela | Uso |
|--------|-----|
| `clients` | Clientes com `birth_date`, `phone`, `name`, `city`, `gender`, `bought_with_partiu` |
| `message_logs` | Log de todos os envios — status: `pending_reply`, `sending`, `sent`, `failed`, `expired` |

### Valores aceitos em `clients.gender`

`Masculino` | `Feminino` | `Outro` | `Não Quero Identificar`

Definidos em **três lugares que precisam andar juntos** — alterar um só quebra o cadastro:
1. `supabase/migrations/007_gender_nao_quero_identificar.sql` — CHECK constraint no DB
2. `src/schemas/clientSchema.js` — `z.enum` em `clientCreateSchema` **e** `clientBulkSchema`
3. `src/docs/swagger.js` — dois `enum` de `gender`

`Outro` é legado (nenhuma tela do frontend oferece esse valor); mantido para não invalidar
registros antigos. O cadastro público grava `Não Quero Identificar` com o texto literal.

**Atenção:** a migration 007 dropa o CHECK de gender buscando o nome real em `pg_constraint`,
porque o CHECK original de `001_create_tables.sql` é inline e recebe nome automático.

### Campos importantes em `message_logs.metadata`
```json
{
  "campaign": "birthday_d7 | birthday_d0 | birthday_d0_simple | birthday_converted",
  "campaign_year": 2026,
  "phone": "5521999999999",
  "messageId": "...",
  "pending_body": "texto do body aguardando resposta"
}
```

## Rate limiting e `trust proxy`

`src/middleware/rateLimiter.js` — limitadores em memória, chaveados por `req.ip`:

| Limitador | Janela | Máx | Onde |
|-----------|--------|-----|------|
| `general` | 15 min | 100 | global, `app.use(general)` |
| `publicRegister` | 1 h | 30 | `POST /public/register` |
| `login` | 15 min | 10 | `POST /auth/login` |
| `dashboard` | 1 min | 60 | rotas de dashboard |

**`app.set('trust proxy', true)` em `src/app.js` — não trocar por um número.**

Em produção a cadeia é Cloudflare → Render, ou seja mais de um hop. Com `trust proxy = 1`
o Express parava num IP interno da infra (`10.x.x.x`), **igual para todos os visitantes**:
todos os limitadores viravam globais em vez de por pessoa. Na prática o site inteiro tinha
5 cadastros públicos por hora — uma leva de ~50 pessoas de um grupo de WhatsApp esgotava o
balde e o resto recebia `429 "Muitas requisições"`. Bug encontrado em 2026-09-06, quando
apenas 1 cliente foi criado em 7 dias.

Como verificar se voltou a quebrar: mandar dois requests com `X-Forwarded-For` diferentes e
conferir se cada um abre seu próprio contador.

```bash
curl -si localhost:3001/health -H "X-Forwarded-For: 200.1.1.1, 172.71.10.5" | grep -i ratelimit-remaining
curl -si localhost:3001/health -H "X-Forwarded-For: 200.2.2.2, 172.71.10.5" | grep -i ratelimit-remaining
# correto: os dois devolvem remaining=99. Compartilhando balde: 99 e 98.
```

**Não baixar `publicRegister` de volta para 5.** Operadoras móveis brasileiras usam CGNAT,
então dezenas de pessoas do mesmo grupo chegam pelo mesmo IP público. `trust proxy = true`
aceita o `X-Forwarded-For` do cliente (forjável) — trade-off consciente: para um formulário
público de leads, perder cadastro é pior que alguém burlar o limite.

## Endpoints principais

### WhatsApp
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | Pública | Keep-alive para UptimeRobot |
| GET | `/api/whatsapp/status` | Cookie/Bearer | Status da conexão Evolution |
| POST | `/api/whatsapp/send-test` | Cookie/Bearer | Envio manual de teste |
| POST | `/api/webhooks/whatsapp` | Pública | Recebe eventos da Evolution |

### Aniversários
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/birthday/cron` | `?key=CRON_SECRET` | Disparo diário (cron-job.org) |
| POST | `/api/birthday/run` | Cookie/Bearer | Disparo manual completo |
| POST | `/api/birthday/run/d7` | Cookie/Bearer | Só job D-7 |
| POST | `/api/birthday/run/d0` | Cookie/Bearer | Só job D-0 |
| POST | `/api/birthday/test/d7` | `?key=CRON_SECRET` | Teste D-7 fluxo real: envia opener + salva pending_reply. Body `{ phone, name }` |
| GET | `/api/birthday/preview` | Cookie/Bearer | Lista aniversariantes sem enviar |
| POST | `/api/birthday/:clientId/convert` | Cookie/Bearer | Marca cliente como convertido |
| POST | `/api/birthday/cleanup` | Cookie/Bearer | Expira pending_reply antigos |

## Fluxo de automação de aniversários

```
09:00 (cron-job.org)
  ↓
🧹 Expira pending_reply > 10 dias
  ↓
🎂 D-7: busca aniversariantes em 7 dias
  → shuffle + limite 50
  → busca nome real do WhatsApp (fallback: nome do CRM)
  → variação fixa de PRE_BIRTHDAY_VARIATIONS
  → envia opener via Evolution API
  → salva body como pending_reply (campaign: birthday_d7)
  → delay aleatório 3-8 min entre clientes
  ↓
🎉 D-0: busca aniversariantes hoje
  → se já converteu → mensagem simples de parabéns
  → se não converteu → mensagem com upsell
  → mesmo fluxo de 2 etapas

Cliente responde no WhatsApp
  ↓
Evolution API → POST /api/webhooks/whatsapp
  ↓
birthdayService.handleIncomingMessage(phone, messageText)
  → busca pending_reply mais recente do cliente
  → roteia pelo campo campaign:

  [birthday_d7 / birthday_d0 / birthday_d0_simple]
    → sendPendingBody: envia body, marca como sent
    → D-7: salva novo pending_reply (campaign: birthday_d7_step2)

  [birthday_d7_step2]
    → detecta intenção (isAffirmative)
    → sim → envia lista de 5 eventos (1 de 10 variações), salva step3
    → não → expira, humano assume

  [birthday_d7_step3]
    → detecta venue no texto (aldeia / caza / villa / parque / dedge)
    → detectado → envia vantagens do venue, marca como sent
    → não detectado → expira, humano assume
```

### Eventos disponíveis (conversationFlowService.js)
- **Aldeia Lagoa** — sexta e sábado, VIP + benefícios por vendas
- **Caza Lagoa** — sexta e sábado, VIP + benefícios por vendas
- **Villa Gávea** — quinta e sexta, VIP + benefícios por vendas
- **Parque** — sábado e domingo, VIP + benefícios por pagantes
- **D-Edge** — placeholder (aguarda conteúdo das vantagens)

## Proteções anti-spam WhatsApp
- Delay aleatório 3-8 min entre envios
- Ordem embaralhada (shuffle) a cada job
- Máximo 50 envios por job
- Verifica `pending_reply` antes de re-enviar (evita opener duplicado)
- Guard atômico no webhook (evita body duplicado em respostas rápidas)
- Filtra mensagens de grupos (`@g.us`)

## Conversão de aniversário

`POST /api/birthday/:clientId/convert` chama `birthdayService.markConverted(clientId)` que:
1. Atualiza `clients`: `bought_with_partiu = true` + `birthday_converted_year = ano atual`
2. Insere log em `message_logs` com `campaign: 'birthday_converted'`

Campo `birthday_converted_year` (int4, nullable) criado manualmente no Supabase.
Usado no frontend para distinguir conversão deste ano vs. cliente histórico.

## Endpoint GET /api/birthday/panel

Retorna D-7/D-0 enriquecido com status de mensagem por cliente + stats do ano:
```json
{
  "d7": { "count": 3, "clients": [...] },
  "d0": { "count": 1, "clients": [...] },
  "stats": { "sentThisYear": 12, "convertedThisYear": 3, "year": 2026 }
}
```
Cada cliente tem `messageStatus: { status, campaign } | null`.
Status possíveis: `pending_reply`, `sent`, `failed`, `expired`, `birthday_converted`.

## Endpoint GET /clients/:id/messages

Retorna até 50 registros de `message_logs` do cliente, ordenados por `sent_at DESC`.
Campos: `id, status, message_body, sent_at, metadata`.

## Endpoint GET /clients — ordenação

`listClientsFiltered` ordena por `created_at DESC, id DESC` **antes** do `.range()`.

Os dois critérios são obrigatórios e não devem ser removidos:

- Sem `ORDER BY`, o Postgres devolve as linhas em ordem arbitrária e o `.range()` pagina
  em cima disso — cadastros novos não caem na página 1 e registros repetem ou somem ao
  navegar entre páginas.
- O desempate por `id` é necessário porque a importação em massa grava milhares de linhas
  com `created_at` idêntico (a carga de 2026-08-24 tem ~15 mil linhas no mesmo timestamp).
  Só `created_at` não define uma ordem total, então a paginação volta a ser instável.

## Regras da IA de mensagens (`aiMessageService.js`)

- A IA faz **apenas o primeiro contato** — desperta curiosidade e convida a responder
- **Nunca** mencionar desconto, percentual, valor ou oferta concreta
- Após o cliente responder, um humano assume a conversa e negocia
- Fallback de segurança: `.replace(/\[nome\]/gi, name)` em todos os retornos

### D-7 (`PRE_BIRTHDAY_VARIATIONS`)
- 10 variações fixas, sem IA, sem nome do cliente
- Tom casual, pergunta aberta sobre planos de aniversário
- Padrão aprovado: opener curto (saudação) + body com pergunta sobre onde vai comemorar

## Próximos passos pendentes
1. **Templates editáveis** — tabela `message_templates` no Supabase, prompts via interface
2. **Relatório mensal** — métricas de envio, resposta e conversão
