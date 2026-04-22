import express from 'express';
import { supabaseAdmin as supabase } from '../supabase/supabaseClient.js';
import { birthdayService } from '../services/birthdayService.js';

const router = express.Router();

// POST /api/webhooks/whatsapp
router.post('/whatsapp', async (req, res) => {
  try {
    const { event, data } = req.body;

    console.log(`📨 Webhook Evolution: ${event}`);

    // Mensagem recebida de um cliente — verificar se há body pendente
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      const msg = Array.isArray(data?.messages) ? data.messages[0] : data;
      const fromMe = msg?.key?.fromMe;

      // Só processa mensagens recebidas de pessoas (ignora grupos e broadcasts)
      if (!fromMe && msg?.key?.remoteJid && !msg.key.remoteJid.includes('@g.us')) {
        const jid = msg.key.remoteJid;
        const phone = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');

        console.log(`💬 Mensagem recebida de: ${phone}`);

        // Dispara o body pendente se houver
        await birthdayService.sendPendingBody(phone);
      }
    }

    // Atualização de status de entrega/leitura
    if (event === 'messages.update' || event === 'MESSAGES_UPDATE') {
      const updates = Array.isArray(data) ? data : [data];

      for (const update of updates) {
        const messageId = update?.key?.id;
        const status = update?.update?.status;

        if (!messageId) continue;

        let statusText = 'sent';
        if (status === 3) statusText = 'delivered';
        if (status === 4) statusText = 'read';

        await supabase
          .from('message_logs')
          .update({
            status: statusText,
            delivered_at: status >= 3 ? new Date().toISOString() : null
          })
          .eq('metadata->>messageId', messageId)
          .neq('status', 'pending_reply'); // não sobrescreve pending_reply

        console.log(`✅ Status: ${messageId} → ${statusText}`);
      }
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Erro no webhook:', error.message);
    res.status(200).json({ received: true, error: error.message });
  }
});

export default router;
