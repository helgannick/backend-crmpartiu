# CRM Partiu Pra Boa — Backend

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
  → GPT-4o-mini gera { opener, body }
  → envia opener via Evolution API
  → salva body como pending_reply no Supabase
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
birthdayService.sendPendingBody(phone)
  → busca pending_reply do cliente
  → atualiza status para 'sending' (evita duplicata)
  → envia body
  → atualiza status para 'sent'
```

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

## Regras da IA de mensagens (`aiMessageService.js`)

- A IA faz **apenas o primeiro contato** — desperta curiosidade e convida a responder
- **Nunca** mencionar desconto, percentual, valor ou oferta concreta
- Após o cliente responder, um humano assume a conversa e negocia
- Openers devem ser calorosos e variados, indo além do básico "feliz aniversário"
- Fallback de segurança: `.replace(/\[nome\]/gi, name)` em todos os retornos

## Próximos passos pendentes
1. **Templates editáveis** — tabela `message_templates` no Supabase, prompts via interface
2. **Relatório mensal** — métricas de envio, resposta e conversão
