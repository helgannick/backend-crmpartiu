import { evolutionService } from './evolutionService.js';
import { supabaseAdmin as supabase } from '../supabase/supabaseClient.js';

export const sendWhatsApp = async ({ phone, message, templateId, clientId }) => {
  try {
    console.log(`📤 Enviando WhatsApp para cliente ${clientId}`);

    const hasWhatsApp = await evolutionService.checkWhatsAppNumber(phone);
    if (!hasWhatsApp) {
      throw new Error('Número não possui WhatsApp ativo');
    }

    const result = await evolutionService.sendText(phone, message);

    if (!result.success) {
      throw new Error(result.error);
    }

    const { data: log } = await supabase
      .from('message_logs')
      .insert({
        client_id: clientId,
        template_id: templateId,
        channel: 'whatsapp',
        status: 'sent',
        message_body: message,
        sent_at: new Date().toISOString(),
        metadata: {
          messageId: result.messageId,
          timestamp: result.timestamp,
          phone
        }
      })
      .select()
      .single();

    console.log(`✅ WhatsApp enviado! Log ID: ${log.id}`);

    return {
      success: true,
      logId: log.id,
      messageId: result.messageId
    };

  } catch (error) {
    console.error('❌ Erro no envio de WhatsApp:', error.message);

    await supabase
      .from('message_logs')
      .insert({
        client_id: clientId,
        template_id: templateId,
        channel: 'whatsapp',
        status: 'failed',
        message_body: message,
        error_message: error.message,
        created_at: new Date().toISOString()
      });

    return {
      success: false,
      error: error.message
    };
  }
};

export const renderTemplate = (templateBody, variables) => {
  let rendered = templateBody;

  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, variables[key] || '');
  });

  return rendered;
};
