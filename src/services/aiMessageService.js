import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BRAND_CONTEXT = `
Você é um atendente da Partiu Pra Boa, empresa de eventos e entretenimento no Rio de Janeiro.
Escreva em português brasileiro informal, como um amigo próximo — natural, caloroso, sem formalidade.
Use emojis com moderação. Varie sempre as palavras para não soar repetitivo.

REGRA ABSOLUTA: nunca mencione descontos, percentuais, valores ou ofertas concretas.
Seu único objetivo é despertar curiosidade e fazer o cliente responder — quem vai negociar é o time humano.
`.trim();

export const aiMessageService = {

  // Retorna { opener, body } — enviados separadamente: opener primeiro, body após resposta
  async generatePreBirthdayMessage(client) {
    const { name, city, bought_with_partiu } = client;
    const loyalty = bought_with_partiu ? 'já é cliente' : 'ainda não veio pessoalmente';

    const openerPrompt = `
Gere APENAS uma linha de saudação de WhatsApp para ${name}.
Varie entre estilos como: "E aí, ${name}, tudo bem?", "Oi ${name}! Como você tá?", "Fala, ${name}! Tudo certo?", etc.
Regras: só essa linha, sem emoji, informal, termine com "?".
`.trim();

    const bodyPrompt = `
Crie o corpo de uma mensagem de WhatsApp de pré-aniversário para ${name} (mora em ${city || 'Rio de Janeiro'}, ${loyalty} da Partiu Pra Boa).
O aniversário é daqui 7 dias. Esta parte vem APÓS uma saudação já enviada — não repita o nome nem cumprimente de novo.

Estrutura OBRIGATÓRIA (use exatamente esse espaçamento):

🎉 [ANIMAÇÃO: uma frase empolgada sobre o aniversário chegando — varie as palavras a cada geração]

✨ [GANCHO: diga que a Partiu tem algo especial preparado para o aniversário dele, desperte curiosidade, convide a responder para saber mais. NÃO cite desconto, valor ou oferta concreta — apenas gere expectativa]

Exemplo de referência do tom e formato (NÃO copie, apenas inspire-se):
"
🎉 Seu aniversário tá chegando e a gente já tem uma surpresa preparada pra você!

✨ Deixa eu te contar o que separamos — é só me responder aqui que eu te passo tudo!"

Regras: máximo 2 blocos com linha em branco entre eles, informal, varie as palavras.
`.trim();

    const [opener, body] = await Promise.all([
      callOpenAI(openerPrompt, 0.9),
      callOpenAI(bodyPrompt, 0.85)
    ]);

    return {
      opener: opener.trim().replace(/\[nome\]/gi, name),
      body: body.trim().replace(/\[nome\]/gi, name),
    };
  },

  async generateBirthdayMessage(client) {
    const { name, city, bought_with_partiu } = client;
    const loyalty = bought_with_partiu ? 'já é cliente' : 'ainda não veio pessoalmente';

    const openerPrompt = `
Gere APENAS uma linha de saudação de aniversário para ${name}.
Deve ser calorosa e animada — vá além do básico "feliz aniversário".
Varie entre estilos como: "Marc! Hoje é o seu dia e a gente não podia deixar passar sem dar um oi! 🎉", "Oi ${name}, esse dia chegou! Parabéns 🥳", "${name}! Muitos anos de vida e muita festa pela frente! 🎊", etc.
Regras: só essa linha, 1 emoji, informal, calorosa.
`.trim();

    const bodyPrompt = `
Crie o corpo de uma mensagem de WhatsApp de aniversário para ${name} (mora em ${city || 'Rio de Janeiro'}, ${loyalty} da Partiu Pra Boa).
HOJE é o aniversário. Esta parte vem APÓS uma saudação já enviada — não repita o nome nem cumprimente de novo.

Estrutura OBRIGATÓRIA (use exatamente esse espaçamento):

🎉 [CELEBRAÇÃO: frase calorosa e genuína celebrando o dia — varie as palavras, seja humano]

✨ [GANCHO: diga que a Partiu tem algo especial reservado para o aniversário dele hoje, gere curiosidade e convide a responder. NÃO cite desconto, valor ou oferta concreta — apenas desperte vontade de saber mais]

Regras: máximo 2 blocos com linha em branco entre eles, informal, varie as palavras.
`.trim();

    const [opener, body] = await Promise.all([
      callOpenAI(openerPrompt, 0.9),
      callOpenAI(bodyPrompt, 0.85)
    ]);

    return {
      opener: opener.trim().replace(/\[nome\]/gi, name),
      body: body.trim().replace(/\[nome\]/gi, name),
    };
  },

  async generateSimpleBirthdayMessage(client) {
    const { name } = client;

    const openerPrompt = `
Gere APENAS uma linha de saudação de aniversário para ${name} (já é cliente — só celebrar, sem ofertas).
Calorosa, animada, vai além do básico. Varie as palavras. 1 emoji.
`.trim();

    const bodyPrompt = `
Crie o corpo de uma mensagem curta de feliz aniversário para ${name}, que já é cliente da Partiu Pra Boa.
Esta parte vem APÓS uma saudação — não repita o nome.

Estrutura:

🎉 [desejo de aniversário genuíno e caloroso — sem ofertas, sem CTA, sem desconto, apenas celebrar com carinho]

Regras: 1 bloco, máximo 2 linhas, informal, varie as palavras.
`.trim();

    const [opener, body] = await Promise.all([
      callOpenAI(openerPrompt, 0.9),
      callOpenAI(bodyPrompt, 0.85)
    ]);

    return {
      opener: opener.trim().replace(/\[nome\]/gi, name),
      body: body.trim().replace(/\[nome\]/gi, name),
    };
  }
};

async function callOpenAI(userPrompt, temperature = 0.85) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: BRAND_CONTEXT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 300,
      temperature
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erro OpenAI:', error.message);
    throw new Error('Falha ao gerar mensagem com IA: ' + error.message);
  }
}
