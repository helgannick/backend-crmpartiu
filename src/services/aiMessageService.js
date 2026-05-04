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
    opener: `E aí, tudo certo por aí?`,
    body: `Vi aqui que seu aniversário tá chegando e pensei: será que você já tem algum rolê em mente pra comemorar ou tá deixando pra decidir depois?\n\n👀 Se quiser, posso te ajudar a descobrir algumas opções.`,
  },
  {
    opener: `Opa, tudo certo?`,
    body: `Vi aqui que seu aniversário tá chegando… você já sabe onde vai comemorar ou ainda tá no "vou ver depois"?\n\n😄 Se quiser, posso te dar umas ideias.`,
  },
  {
    opener: `E aí, tudo bem?`,
    body: `Percebi que seu niver tá chegando e me bateu uma dúvida aqui:\nVocê já tem algum plano ou tá esperando aparecer algo legal?\n\nSe quiser, te ajudo com isso.`,
  },
  {
    opener: `Opa, tudo certo por aí?`,
    body: `Vi aqui que seu aniversário tá chegando… me conta: já tem alguma ideia de onde vai comemorar ou ainda tá na dúvida? 😄`,
  },
  {
    opener: `E aí, como você tá?`,
    body: `Notei que seu niver tá chegando e fiquei curioso: você já planejou algo ou tá esperando aparecer aquela opção boa? 👀`,
  },
  {
    opener: `Oi! Tudo bem por aí?`,
    body: `Vi que sua semana de aniversário tá chegando… já sabe como pretende celebrar ou ainda tá olhando possibilidades?`,
  },
  {
    opener: `Fala! Tudo tranquilo?`,
    body: `Seu aniversário tá quase aí… você já tem algo em mente pra fazer ou tá deixando o clima te levar? 😄`,
  },
  {
    opener: `E aí, tudo beleza?`,
    body: `Percebi que seu niver tá chegando… já escolheu o rolê ou tá esperando alguma dica cair do céu? 👀`,
  },
  {
    opener: `Oi! Como anda a correria por aí?`,
    body: `Seu aniversário tá chegando, né? Já tem algum plano ou ainda não parou pra pensar nisso?`,
  },
  {
    opener: `Opa! Tudo na paz?`,
    body: `Vi que seu niver é essa semana… você já vai comemorar em algum lugar ou tá querendo sugestões?`,
  },
];

export const aiMessageService = {

  // D-7: variações fixas, sem IA — garante padrão aprovado e sem risco de erro
  async generatePreBirthdayMessage(_client) {
    const variation = PRE_BIRTHDAY_VARIATIONS[Math.floor(Math.random() * PRE_BIRTHDAY_VARIATIONS.length)];
    return {
      opener: variation.opener,
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
  },

  async classifyInterest(text) {
    if (!text || text.trim().length === 0) return 'interested';

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você classifica respostas de clientes. Responda APENAS com SIM ou NAO, sem pontuação.'
          },
          {
            role: 'user',
            content: `Um bot de eventos perguntou se o cliente quer sugestões de onde comemorar o aniversário. O cliente respondeu: "${text}"\n\nO cliente tem interesse em receber sugestões? Responda apenas SIM ou NAO.`
          }
        ],
        max_tokens: 3,
        temperature: 0
      });

      const result = response.choices[0].message.content.trim().toUpperCase();
      console.log(`🤖 classifyInterest: "${text}" → ${result}`);
      return result.startsWith('NAO') || result.startsWith('NÃO') || result.startsWith('NO') ? 'not_interested' : 'interested';
    } catch (error) {
      console.error('⚠️ classifyInterest falhou, assumindo interested:', error.message);
      return 'interested';
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
