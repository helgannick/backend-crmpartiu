import axios from 'axios';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME;

const api = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    'apikey': EVOLUTION_API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

export const evolutionService = {

  async checkConnection() {
    try {
      const response = await api.get(`/instance/connectionState/${INSTANCE_NAME}`);
      const state = response.data.instance?.state || response.data.state;
      return {
        connected: state === 'open',
        state,
        instance: INSTANCE_NAME
      };
    } catch (error) {
      console.error('Erro ao verificar conexão Evolution:', error.message);
      return { connected: false, error: error.message };
    }
  },

  async sendText(phone, message) {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      const number = `${phoneWithDDI}@s.whatsapp.net`;

      console.log(`📱 Enviando WhatsApp para: ${phoneWithDDI}`);

      const response = await api.post(`/message/sendText/${INSTANCE_NAME}`, {
        number,
        text: message,
        delay: 1200
      });

      if (response.data?.key) {
        return {
          success: true,
          messageId: response.data.key.id,
          timestamp: response.data.messageTimestamp
        };
      }

      return { success: false, error: 'Resposta inválida da Evolution API' };

    } catch (error) {
      console.error('❌ Erro ao enviar WhatsApp:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  },

  async getWhatsAppName(phone) {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      const response = await api.post(`/chat/fetchProfile/${INSTANCE_NAME}`, {
        number: phoneWithDDI
      });

      return response.data?.name || null;
    } catch (error) {
      console.error('Erro ao buscar nome do WhatsApp:', error.message);
      return null;
    }
  },

  async checkWhatsAppNumber(phone) {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      const response = await api.post(`/chat/whatsappNumbers/${INSTANCE_NAME}`, {
        numbers: [phoneWithDDI]
      });

      return response.data[0]?.exists || false;

    } catch (error) {
      console.error('Erro ao verificar número WhatsApp:', error.message);
      return false;
    }
  }
};
