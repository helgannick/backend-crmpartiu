import { supabaseAdmin as supabase } from '../supabase/supabaseClient.js';
import { evolutionService } from './evolutionService.js';
import { aiMessageService } from './aiMessageService.js';
import { conversationFlowService } from './conversationFlowService.js';

async function resolveClientName(client) {
  const whatsappName = await evolutionService.getWhatsAppName(client.phone);
  const firstName = whatsappName
    ? whatsappName.split(' ')[0]
    : client.name.split(' ')[0];
  return { ...client, name: firstName };
}

// Delay aleatório entre MIN e MAX minutos — imita comportamento humano
function randomDelay(minMinutes = 3, maxMinutes = 8) {
  const ms = (Math.random() * (maxMinutes - minMinutes) + minMinutes) * 60 * 1000;
  const mins = (ms / 60000).toFixed(1);
  console.log(`⏳ Aguardando ${mins} min antes do próximo envio...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Embaralha array sem modificar o original
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CAMPAIGN_YEAR = () => new Date().getFullYear();
const MAX_PER_JOB = 50;

export const birthdayService = {

  async getClientsByBirthdayOffset(daysOffset) {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const targetMonth = target.getMonth() + 1;
    const targetDay = target.getDate();

    const { data, error } = await supabase
      .from('clients')
      .select('id, name, phone, city, gender, bought_with_partiu, birth_date')
      .not('phone', 'is', null)
      .not('birth_date', 'is', null)
      .is('deleted_at', null)
      .ilike('city', '%rio de janeiro%');

    if (error) throw new Error('Erro ao buscar aniversariantes: ' + error.message);

    return (data || []).filter(client => {
      const d = new Date(client.birth_date);
      return (d.getUTCMonth() + 1) === targetMonth && d.getUTCDate() === targetDay;
    });
  },

  async alreadySentCampaign(clientId, campaignType) {
    const types = campaignType === 'birthday_d0'
      ? ['birthday_d0', 'birthday_d0_simple']
      : [campaignType];

    for (const type of types) {
      // Checa tanto 'sent' quanto 'pending_reply' para evitar opener duplicado
      const { data } = await supabase
        .from('message_logs')
        .select('id')
        .eq('client_id', clientId)
        .in('status', ['sent', 'pending_reply'])
        .contains('metadata', { campaign: type, campaign_year: CAMPAIGN_YEAR() })
        .limit(1);

      if (data && data.length > 0) return true;
    }
    return false;
  },

  async hasConverted(clientId) {
    const { data } = await supabase
      .from('message_logs')
      .select('id')
      .eq('client_id', clientId)
      .contains('metadata', { campaign: 'birthday_converted', campaign_year: CAMPAIGN_YEAR() })
      .limit(1);

    return data && data.length > 0;
  },

  async markConverted(clientId) {
    const { error: updateError } = await supabase
      .from('clients')
      .update({ bought_with_partiu: true, birthday_converted_year: new Date().getFullYear() })
      .eq('id', clientId);

    if (updateError) throw new Error('Erro ao atualizar cliente: ' + updateError.message);

    const { data, error } = await supabase
      .from('message_logs')
      .insert({
        client_id: clientId,
        channel: 'whatsapp',
        status: 'sent',
        message_body: '[CONVERSÃO REGISTRADA]',
        sent_at: new Date().toISOString(),
        metadata: { campaign: 'birthday_converted', campaign_year: CAMPAIGN_YEAR() }
      })
      .select()
      .single();

    if (error) throw new Error('Erro ao registrar conversão: ' + error.message);
    return data;
  },

  async getPanelData() {
    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01`;

    const [d7Clients, d0Clients, logsResult] = await Promise.all([
      this.getClientsByBirthdayOffset(7),
      this.getClientsByBirthdayOffset(0),
      supabase
        .from('message_logs')
        .select('client_id, status, metadata, sent_at')
        .gte('sent_at', yearStart)
    ]);

    const logs = (logsResult.data || []).filter(l => l.metadata?.campaign?.startsWith('birthday_'));

    // Prioridade de status por cliente: converted > sent > pending_reply > failed > expired
    const priority = { birthday_converted: 5, sent: 4, pending_reply: 3, sending: 2, failed: 1, expired: 0 };
    const statusByClient = {};
    for (const log of logs) {
      const score = log.metadata?.campaign === 'birthday_converted' ? 5 : (priority[log.status] ?? 0);
      const existing = statusByClient[log.client_id];
      const existingScore = existing
        ? (existing.campaign === 'birthday_converted' ? 5 : (priority[existing.status] ?? 0))
        : -1;
      if (score > existingScore) {
        statusByClient[log.client_id] = { status: log.status, campaign: log.metadata?.campaign };
      }
    }

    const enrich = (clients) => clients.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      birth_date: c.birth_date,
      bought_with_partiu: c.bought_with_partiu,
      birthday_converted_year: c.birthday_converted_year,
      messageStatus: statusByClient[c.id] || null,
    }));

    // Totais do ano para stats
    const convertedThisYear = logs.filter(l => l.metadata?.campaign === 'birthday_converted').length;
    const sentThisYear = new Set(logs.filter(l => l.status === 'sent' || l.status === 'pending_reply').map(l => l.client_id)).size;

    return {
      d7: { count: d7Clients.length, clients: enrich(d7Clients) },
      d0: { count: d0Clients.length, clients: enrich(d0Clients) },
      stats: { sentThisYear, convertedThisYear, year },
    };
  },

  // Envia opener, salva o body como pending_reply para disparar após resposta
  async sendOpenerAndSavePending(client, { opener, body }, campaignType) {
    const result = await evolutionService.sendText(client.phone, opener);

    const cleanPhone = client.phone.replace(/\D/g, '');
    const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(client.id);

    const { error } = await supabase.from('message_logs').insert({
      client_id: isValidUUID ? client.id : null,
      channel: 'whatsapp',
      status: result.success ? 'pending_reply' : 'failed',
      message_body: opener,
      error_message: result.success ? null : result.error,
      sent_at: result.success ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      metadata: {
        campaign: campaignType,
        campaign_year: CAMPAIGN_YEAR(),
        messageId: result.messageId || null,
        phone: phoneWithDDI,
        pending_body: body
      }
    });

    if (error) console.error('Erro ao salvar pending_reply:', error.message);

    return result;
  },

  // Chamado pelo webhook quando o cliente responde — envia o body e marca como sent
  async sendPendingBody(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    // Marca como 'sending' atomicamente para evitar disparo duplicado em respostas rápidas
    const { data: logs } = await supabase
      .from('message_logs')
      .select('id, metadata')
      .eq('status', 'pending_reply')
      .contains('metadata', { phone: phoneWithDDI })
      .order('created_at', { ascending: false })
      .limit(1);

    if (!logs || logs.length === 0) return null;

    const log = logs[0];
    const body = log.metadata?.pending_body;
    if (!body) return null;

    // Atualiza para 'sending' antes de enviar — evita que segundo webhook dispare de novo
    const { data: updated } = await supabase
      .from('message_logs')
      .update({ status: 'sending' })
      .eq('id', log.id)
      .eq('status', 'pending_reply') // só atualiza se ainda estiver pending
      .select('id');

    if (!updated || updated.length === 0) {
      console.log(`⚠️ Follow-up para ${phoneWithDDI} já está sendo processado`);
      return null;
    }

    const result = await evolutionService.sendText(phone, body);

    await supabase
      .from('message_logs')
      .update({
        status: result.success ? 'sent' : 'failed',
        delivered_at: result.success ? new Date().toISOString() : null,
        metadata: { ...log.metadata, pending_body: null, followUpSent: result.success }
      })
      .eq('id', log.id);

    // D-7: salva etapa 2 — aguarda resposta para apresentar eventos
    if (result.success && log.metadata?.campaign === 'birthday_d7') {
      await supabase.from('message_logs').insert({
        client_id: log.client_id,
        channel: 'whatsapp',
        status: 'pending_reply',
        message_body: '[aguardando resposta — etapa 2 eventos]',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        metadata: {
          campaign: 'birthday_d7_step2',
          campaign_year: CAMPAIGN_YEAR(),
          phone: phoneWithDDI,
        }
      });
      console.log(`🔜 D-7 step2 salvo para ${phoneWithDDI}`);
    }

    console.log(`💬 Follow-up enviado para ${phoneWithDDI}: ${result.success ? '✅' : '❌'}`);
    return result;
  },

  // Dispatcher unificado — chamado pelo webhook com o texto da mensagem do cliente
  async handleIncomingMessage(phone, messageText = '') {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    const { data: logs } = await supabase
      .from('message_logs')
      .select('id, client_id, metadata')
      .eq('status', 'pending_reply')
      .contains('metadata', { phone: phoneWithDDI })
      .order('created_at', { ascending: false })
      .limit(1);

    if (!logs || logs.length === 0) return null;

    const log = logs[0];
    const campaign = log.metadata?.campaign;

    if (campaign === 'birthday_d7_step2') {
      return await this._handleD7Step2(log, phone, phoneWithDDI, messageText);
    }
    if (campaign === 'birthday_d7_step3') {
      return await this._handleD7Step3(log, phone, phoneWithDDI, messageText);
    }
    // D-7 step1, D-0 e outros: fluxo original
    return await this.sendPendingBody(phone);
  },

  async _handleD7Step2(log, phone, phoneWithDDI, messageText) {
    // Guard atômico — evita disparo duplo
    const { data: updated } = await supabase
      .from('message_logs')
      .update({ status: 'sending' })
      .eq('id', log.id)
      .eq('status', 'pending_reply')
      .select('id');

    if (!updated || updated.length === 0) {
      console.log(`⚠️ D-7 step2 ${phoneWithDDI} já em processamento`);
      return null;
    }

    const eventList = conversationFlowService.getRandomEventList();
    const result = await evolutionService.sendText(phone, eventList);

    await supabase.from('message_logs').update({
      status: result.success ? 'sent' : 'failed',
      delivered_at: result.success ? new Date().toISOString() : null,
      metadata: { ...log.metadata, sentEventList: result.success }
    }).eq('id', log.id);

    if (result.success) {
      await supabase.from('message_logs').insert({
        client_id: log.client_id,
        channel: 'whatsapp',
        status: 'pending_reply',
        message_body: '[aguardando escolha de evento — etapa 3]',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        metadata: {
          campaign: 'birthday_d7_step3',
          campaign_year: CAMPAIGN_YEAR(),
          phone: phoneWithDDI,
        }
      });
      console.log(`🎯 D-7 step2 lista de eventos enviada para ${phoneWithDDI}`);
    }

    return result;
  },

  async _handleD7Step3(log, phone, phoneWithDDI, messageText) {
    const { data: updated } = await supabase
      .from('message_logs')
      .update({ status: 'sending' })
      .eq('id', log.id)
      .eq('status', 'pending_reply')
      .select('id');

    if (!updated || updated.length === 0) {
      console.log(`⚠️ D-7 step3 ${phoneWithDDI} já em processamento`);
      return null;
    }

    const venue = conversationFlowService.detectVenue(messageText);

    if (!venue) {
      await supabase.from('message_logs').update({ status: 'expired' }).eq('id', log.id);
      console.log(`💬 D-7 step3 ${phoneWithDDI} — venue não detectado, humano assume`);
      return { success: false, reason: 'venue_not_detected' };
    }

    const advantages = conversationFlowService.getVenueAdvantages(venue);
    const result = await evolutionService.sendText(phone, advantages);

    await supabase.from('message_logs').update({
      status: result.success ? 'sent' : 'failed',
      delivered_at: result.success ? new Date().toISOString() : null,
      metadata: { ...log.metadata, venueSelected: venue, sentAdvantages: result.success }
    }).eq('id', log.id);

    // Mantém conversa ativa — cliente pode perguntar sobre outro evento
    if (result.success) {
      await supabase.from('message_logs').insert({
        client_id: log.client_id,
        channel: 'whatsapp',
        status: 'pending_reply',
        message_body: '[aguardando próxima escolha de evento]',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        metadata: {
          campaign: 'birthday_d7_step3',
          campaign_year: CAMPAIGN_YEAR(),
          phone: phoneWithDDI,
        }
      });
    }

    console.log(`🏠 D-7 step3 vantagens [${venue}] para ${phoneWithDDI}: ${result.success ? '✅' : '❌'}`);
    return result;
  },

  // Expira pending_reply com mais de X dias sem resposta
  async expireStaleReplies(daysOld = 10) {
    console.log(`🧹 Expirando pending_reply com mais de ${daysOld} dias...`);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const { data, error } = await supabase
      .from('message_logs')
      .update({ status: 'expired' })
      .eq('status', 'pending_reply')
      .lt('sent_at', cutoff.toISOString())
      .select('id, client_id, metadata');

    if (error) {
      console.error('Erro ao expirar pendências:', error.message);
      return { expired: 0, error: error.message };
    }

    console.log(`🧹 ${data?.length || 0} pendência(s) expirada(s)`);
    return { expired: data?.length || 0 };
  },

  async runPreBirthdayJob() {
    console.log('🎂 [D-7] Iniciando job de pré-aniversário...');
    const allClients = await this.getClientsByBirthdayOffset(7);
    const clients = shuffle(allClients).slice(0, MAX_PER_JOB);
    console.log(`📋 ${allClients.length} aniversariante(s) em 7 dias — processando ${clients.length} (máx ${MAX_PER_JOB})`);

    const results = { sent: 0, skipped: 0, failed: 0, total: allClients.length };

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      try {
        const alreadySent = await this.alreadySentCampaign(client.id, 'birthday_d7');
        if (alreadySent) {
          console.log(`⏭️  ${client.name} — D-7 já enviado este ano`);
          results.skipped++;
          continue;
        }

        const resolved = await resolveClientName(client);
        const { opener, body } = await aiMessageService.generatePreBirthdayMessage(resolved);
        const result = await this.sendOpenerAndSavePending(resolved, { opener, body }, 'birthday_d7');

        if (result.success) {
          console.log(`✅ [${i + 1}/${clients.length}] D-7 enviado: ${resolved.name} (${client.phone})`);
          results.sent++;
        } else {
          console.log(`❌ Falha D-7: ${client.name} — ${result.error}`);
          results.failed++;
        }

        // Delay aleatório entre envios — exceto no último
        if (i < clients.length - 1) await randomDelay(3, 8);

      } catch (err) {
        console.error(`❌ Erro D-7 para ${client.name}:`, err.message);
        results.failed++;
      }
    }

    console.log(`🎂 [D-7] Concluído:`, results);
    return results;
  },

  async runBirthdayJob() {
    console.log('🎉 [D-0] Iniciando job de aniversário...');
    const allClients = await this.getClientsByBirthdayOffset(0);
    const clients = shuffle(allClients).slice(0, MAX_PER_JOB);
    console.log(`📋 ${allClients.length} aniversariante(s) hoje — processando ${clients.length} (máx ${MAX_PER_JOB})`);

    const results = { sent: 0, skipped: 0, failed: 0, converted: 0, total: allClients.length };

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      try {
        const alreadySent = await this.alreadySentCampaign(client.id, 'birthday_d0');
        if (alreadySent) {
          console.log(`⏭️  ${client.name} — D-0 já enviado hoje`);
          results.skipped++;
          continue;
        }

        const converted = await this.hasConverted(client.id);
        const resolved = await resolveClientName(client);

        let msgData, campaignType;
        if (converted) {
          console.log(`🏆 ${resolved.name} — já converteu, enviando parabéns simples`);
          msgData = await aiMessageService.generateSimpleBirthdayMessage(resolved);
          campaignType = 'birthday_d0_simple';
          results.converted++;
        } else {
          msgData = await aiMessageService.generateBirthdayMessage(resolved);
          campaignType = 'birthday_d0';
        }

        const result = await this.sendOpenerAndSavePending(resolved, msgData, campaignType);

        if (result.success) {
          console.log(`✅ [${i + 1}/${clients.length}] D-0 enviado: ${resolved.name} (${client.phone})`);
          results.sent++;
        } else {
          console.log(`❌ Falha D-0: ${client.name} — ${result.error}`);
          results.failed++;
        }

        if (i < clients.length - 1) await randomDelay(3, 8);

      } catch (err) {
        console.error(`❌ Erro D-0 para ${client.name}:`, err.message);
        results.failed++;
      }
    }

    console.log(`🎉 [D-0] Concluído:`, results);
    return results;
  }
};

