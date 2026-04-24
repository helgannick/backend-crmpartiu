import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BRAND_CONTEXT = `
Você é um atendente da Partiu Pra Boa, empresa de eventos e entretenimento no Rio de Janeiro.
Escreva em português brasileiro informal, como um amigo próximo — natural, caloroso, sem formalidade.
Use emojis com moderação. Varie sempre as palavras para não soar repetitivo.

REGRA ABSOLUTA: nunca mencione descontos, percentuais, valores ou ofertas concretas.
Seu único objetivo é despertar curiosidade e fazer o cliente responder — quem vai negociar é o time humano.
`.trim();

const BIRTHDAY_D0_FALLBACKS = [
  {
    opener: (name) => `${name}! Hoje é o seu dia e a Partiu não podia deixar passar! 🎉`,
    body: `🎉 Que seu aniversário seja incrível!\n\n✨ Temos algo especial reservado pra você hoje. Me responde aqui que eu te conto tudo!`,
  },
  {
    opener: (name) => `Oi ${name}, esse dia chegou! Parabéns! 🥳`,
    body: `🎉 Desejamos um aniversário repleto de alegria e muita comemoração!\n\n✨ A Partiu tem uma surpresa especial pra você hoje. É só me falar que eu te conto!`,
  },
  {
    opener: (name) => `${name}! Muitos anos de vida e muita festa pela frente! 🎊`,
    body: `🎉 Hoje é o seu dia e a Partiu quer fazer parte dessa celebração!\n\n✨ Tenho algo especial preparado pra você. Me responde aqui que eu te mando as opções!`,
  },
];

const BIRTHDAY_D0_SIMPLE_FALLBACKS = [
  {
    opener: (name) => `${name}! Hoje é o seu dia! Parabéns! 🎉`,
    body: `🎉 Que seu aniversário seja repleto de alegria, saúde e muita festa!\n\nA Partiu deseja tudo de melhor pra você nessa data especial! 🥳`,
  },
  {
    opener: (name) => `Oi ${name}, esse dia chegou! Feliz aniversário! 🥳`,
    body: `🎉 Desejamos um aniversário incrível, cheio de celebração e momentos especiais!\n\nConte sempre com a Partiu! 🎊`,
  },
  {
    opener: (name) => `${name}! Muitos anos de vida! 🎊`,
    body: `🎉 Que esse aniversário seja apenas o começo de um ano incrível!\n\nA Partiu está aqui torcendo por você! 🎂`,
  },
];

const PRE_BIRTHDAY_VARIATIONS = [
  {
    opener: (name) => `E aí, ${name}, tudo bem?`,
    body: `🎉 Seu aniversário tá chegando e nós da Partiu queremos te propor uma comemoração especial.\n\n✨ Posso te enviar as opções de festas e assim que você escolher, eu te passo as vantagens que consigo em cada uma delas...`,
  },
  {
    opener: (name) => `Oi ${name}! Como você tá?`,
    body: `🎉 Seu aniversário tá chegando aí e a gente da Partiu quer muito fazer parte dessa data!\n\n✨ Tenho algumas opções de comemoração que acho que você vai adorar. Me responde aqui que eu te mando tudo!`,
  },
  {
    opener: (name) => `Fala, ${name}! Tudo certo?`,
    body: `🎉 Sei que o seu aniversário tá pertinho e a gente da Partiu tem uma ideia especial pra te apresentar!\n\n✨ Posso te mostrar as opções que temos pra comemorar essa data? É só me falar que te passo todas as vantagens!`,
  },
  {
    opener: (name) => `Oi ${name}! Tudo bem por aí?`,
    body: `🎉 Olha que data especial vem aí! Seu aniversário tá chegando e a Partiu quer fazer parte dessa celebração!\n\n✨ Tenho opções incríveis de festa pra te mostrar. Me responde aqui que a gente bate um papo!`,
  },
  {
    opener: (name) => `E aí, ${name}! Como tá a vida?`,
    body: `🎉 Seu aniversário tá chegando e a Partiu tem uma proposta especial preparada pra você!\n\n✨ Assim que você responder, te mando as opções de comemoração e as vantagens que consigo em cada uma!`,
  },
  {
    opener: (name) => `Oi ${name}, tudo bem?`,
    body: `🎉 Seu aniversário vem chegando e nós da Partiu adoraríamos fazer parte dessa comemoração!\n\n✨ Posso te mostrar o que temos disponível? Me fala aqui e te passo as opções e o que consigo de especial pra você!`,
  },
  {
    opener: (name) => `Fala, ${name}, tudo certo por aí?`,
    body: `🎉 Seu dia especial tá se aproximando e a Partiu quer te propor algo incrível pra comemorar essa data!\n\n✨ É só me responder que eu te envio as opções de festa e as vantagens que tenho pra você!`,
  },
  {
    opener: (name) => `E aí, ${name}! Beleza?`,
    body: `🎉 Sabia que seu aniversário tá chegando? A Partiu tem uma proposta especial que acho que você vai curtir muito!\n\n✨ Me responde aqui que eu te mando as opções de comemoração com tudo que consigo de vantagem pra você!`,
  },
];

export const aiMessageService = {

  // D-7: variações fixas, sem IA — garante padrão aprovado e sem risco de erro
  async generatePreBirthdayMessage(client) {
    const { name } = client;
    const variation = PRE_BIRTHDAY_VARIATIONS[Math.floor(Math.random() * PRE_BIRTHDAY_VARIATIONS.length)];
    return {
      opener: variation.opener(name),
      body: variation.body,
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

    try {
      const [opener, body] = await Promise.all([
        callOpenAI(openerPrompt, 0.9),
        callOpenAI(bodyPrompt, 0.85)
      ]);
      return {
        opener: opener.trim().replace(/\[nome\]/gi, name),
        body: body.trim().replace(/\[nome\]/gi, name),
      };
    } catch (error) {
      console.error('⚠️ OpenAI falhou para D-0, usando fallback estático:', error.message);
      const fallback = BIRTHDAY_D0_FALLBACKS[Math.floor(Math.random() * BIRTHDAY_D0_FALLBACKS.length)];
      return { opener: fallback.opener(name), body: fallback.body };
    }
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

    try {
      const [opener, body] = await Promise.all([
        callOpenAI(openerPrompt, 0.9),
        callOpenAI(bodyPrompt, 0.85)
      ]);
      return {
        opener: opener.trim().replace(/\[nome\]/gi, name),
        body: body.trim().replace(/\[nome\]/gi, name),
      };
    } catch (error) {
      console.error('⚠️ OpenAI falhou para D-0 simples, usando fallback estático:', error.message);
      const fallback = BIRTHDAY_D0_SIMPLE_FALLBACKS[Math.floor(Math.random() * BIRTHDAY_D0_SIMPLE_FALLBACKS.length)];
      return { opener: fallback.opener(name), body: fallback.body };
    }
  }
};

async function callOpenAI(userPrompt, temperature = 0.85) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: BRAND_CONTEXT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 300,
      temperature
    }, { signal: controller.signal });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erro OpenAI:', error.message);
    throw new Error('Falha ao gerar mensagem com IA: ' + error.message);
  } finally {
    clearTimeout(timeout);
  }
}
