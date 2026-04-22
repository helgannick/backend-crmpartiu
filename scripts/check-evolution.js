import axios from 'axios';

const api = axios.create({
  baseURL: 'https://evolution-api-production-6f86.up.railway.app',
  headers: {
    'apikey': 'dVkzWzQODYhOn2PcLQaUsX2utz7SAAzN'
  }
});

async function checkInstances() {
  try {
    console.log('🔍 Buscando instâncias...\n');

    const response = await api.get('/instance/fetchInstances');
    const instances = response.data;

    if (instances && instances.length > 0) {
      console.log(`✅ Encontradas ${instances.length} instância(s):\n`);

      instances.forEach((inst, index) => {
        console.log(`${index + 1}. Nome: ${inst.name}`);
        console.log(`   Status: ${inst.connectionStatus}`);
        console.log(`   Número: ${inst.ownerJid || 'N/A'}`);
        console.log(`   Perfil: ${inst.profileName || 'N/A'}`);
        console.log('');
      });

      const mainInstance = instances[0].name;
      console.log(`📝 Use este nome no .env: EVOLUTION_INSTANCE_NAME=${mainInstance}\n`);

      return mainInstance;
    } else {
      console.log('❌ Nenhuma instância encontrada');
    }
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

checkInstances();
