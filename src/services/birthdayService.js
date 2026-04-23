import { supabaseAdmin as supabase } from '../supabase/supabaseClient.js';
import { evolutionService } from './evolutionService.js';
import { aiMessageService } from './aiMessageService.js';

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
      .is('deleted_at', null);

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

    console.log(`💬 Follow-up enviado para ${phoneWithDDI}: ${result.success ? '✅' : '❌'}`);
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

