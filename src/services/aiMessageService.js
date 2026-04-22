import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BRAND_CONTEXT = `
Você é um atendente da Partiu Pra Boa, empresa de eventos e entretenimento no Rio de Janeiro.
Escreva em português brasileiro informal, como um amigo próximo — natural, caloroso, sem formalidade.
Use emojis com moderação. Varie sempre as palavras para não soar repetitivo.
`.trim();

export const aiMessageService = {

  // Retorna { opener, body } — enviados separadamente: opener primeiro, body após resposta
  async generatePreBirthdayMessage(client) {
    const { name, city, bought_with_partiu } = client;
    const loyalty = bought_with_partiu ? 'já é cliente' : 'ainda não veio pessoalmente';

    const openerPrompt = `
Gere APENAS uma linha de saudação de WhatsApp para ${name}.
Varie entre estilos como: "E aí, [nome], tudo bem?", "Oi [nome]! Como você tá?", "Fala, [nome]! Tudo certo?", etc.
Regras: só essa linha, sem emoji, informal, termine com "?".
`.trim();

    const bodyPrompt = `
Crie o corpo de uma mensagem de WhatsApp de pré-aniversário para ${name} (mora em ${city || 'Rio de Janeiro'}, ${loyalty} da Partiu Pra Boa).
O aniversário é daqui 7 dias. Esta parte vem APÓS uma saudação já enviada — não repita o nome nem cumprimente de novo.

Estrutura OBRIGATÓRIA (use exatamente esse espaçamento):

🎉 [ANIMAÇÃO: uma frase empolgada sobre o aniversário chegando — varie as palavras a cada geração]

✨ [OPORTUNIDADE + VANTAGENS: oferta exclusiva de pré-aniversário, mencione opções de comemoração e vantagens para aniversariantes da Partiu Pra Boa, sem citar valores. Termine convidando a responder para receber as opções]

Exemplo de referência do tom e formato (NÃO copie, apenas inspire-se):
"
🎉 Seu aniversário tá chegando e nós da Partiu queremos te propor uma comemoração especial.

✨ Posso te enviar as opções de festas e assim que você escolher, eu te passo as vantagens que consigo em cada uma delas..."

Regras: máximo 2 blocos com linha em branco entre eles, informal, varie as palavras.
`.trim();

    const [opener, body] = await Promise.all([
      callOpenAI(openerPrompt, 0.9),
      callOpenAI(bodyPrompt, 0.85)
    ]);

    return { opener: opener.trim(), body: body.trim() };
  },

  async generateBirthdayMessage(client) {
    const { name, city, bought_with_partiu } = client;
    const loyalty = bought_with_partiu ? 'já é cliente' : 'ainda não veio pessoalmente';

    const openerPrompt = `
Gere APENAS uma linha de saudação de aniversário para ${name}.
Varie entre estilos como: "E aí, [nome]! Hoje é seu dia! 🎉", "Oi [nome], feliz aniversário! 🎂", "Fala, [nome]! Parabéns! 🥳", etc.
Regras: só essa linha, 1 emoji, informal.
`.trim();

    const bodyPrompt = `
Crie o corpo de uma mensagem de WhatsApp de aniversário com upsell para ${name} (mora em ${city || 'Rio de Janeiro'}, ${loyalty} da Partiu Pra Boa).
HOJE é o aniversário. Esta parte vem APÓS uma saudação já enviada — não repita o nome nem cumprimente de novo.

Estrutura OBRIGATÓRIA (use exatamente esse espaçamento):

🎉 [ANIMAÇÃO: frase calorosa celebrando o dia — varie as palavras]

✨ [OPORTUNIDADE: oferta exclusiva só hoje, vantagens únicas para aniversariantes da Partiu Pra Boa, urgência real mas sem pressão. Termine convidando a responder para resgatar]

Regras: máximo 2 blocos com linha em branco entre eles, informal, varie as palavras.
`.trim();

    const [opener, body] = await Promise.all([
      callOpenAI(openerPrompt, 0.9),
      callOpenAI(bodyPrompt, 0.85)
    ]);

    return { opener: opener.trim(), body: body.trim() };
  },

  async generateSimpleBirthdayMessage(client) {
    const { name } = client;

    const openerPrompt = `
Gere APENAS uma linha de saudação de aniversário para ${name} (já é cliente fechado — só celebrar).
Informal, caloroso, 1 emoji. Varie as palavras.
`.trim();

    const bodyPrompt = `
Crie o corpo de uma mensagem curta de feliz aniversário para ${name}, que já fechou com a Partiu Pra Boa.
Esta parte vem APÓS uma saudação — não repita o nome.

Estrutura:

🎉 [desejo de aniversário genuíno e caloroso, sem ofertas, sem CTA — apenas celebrar]

Regras: 1 bloco, máximo 2 linhas, informal, varie as palavras.
`.trim();

    const [opener, body] = await Promise.all([
      callOpenAI(openerPrompt, 0.9),
      callOpenAI(bodyPrompt, 0.85)
    ]);

    return { opener: opener.trim(), body: body.trim() };
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
