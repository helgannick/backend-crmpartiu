const EVENT_LIST_VARIATIONS = [
  'Excelente. Aqui estão os eventos com as melhores vantagens pra você e seus convidados. Qual deles você prefere?',
  'Top! Separei as opções que conseguimos condições especiais pra aniversário. Qual desses combina mais com o que você quer?',
  'Perfeito. Esses são os eventos que hoje têm os melhores benefícios pra comemoração. Qual deles te chama mais atenção?',
  'Show! Vou te deixar aqui as opções que conseguimos liberar vantagens exclusivas. Qual desses faz mais sentido pra você?',
  'Ótimo! Listei abaixo os eventos com benefícios melhores pra quem tá comemorando aniversário. Qual deles você quer ver primeiro?',
  'Maravilha. Aqui estão os eventos que estão rendendo ótimas condições pra convidados. Qual deles encaixa melhor no seu plano?',
  'Legal! Separei os eventos que têm vantagens especiais ativas hoje. Me diz qual deles você quer avaliar?',
  'Perfeito. Aqui vão as melhores opções pra celebrar seu aniversário com benefícios extras. Qual deles faz mais sentido pra você?',
  'Show de bola. Deixo aqui os eventos com condições diferenciadas pra você aproveitar. Qual desses você quer seguir?',
  'Tudo certo! Aqui estão os eventos com os melhores incentivos pra comemoração. Qual deles prefere considerar primeiro?',
];

const EVENT_NAMES = '• Aldeia Lagoa\n• Caza Lagoa\n• Parque Bar\n• Villa Gávea';

const VENUE_ADVANTAGES = {
  aldeia: `*ALDEIA LAGOA — Aniversários e Despedidas* 🎉
📅 Sexta e Sábado

*Via Código* (a partir de 5 vendas): VIP próprio sem horário + 1 acompanhante VIP sem horário

*Via Lista:* VIP próprio sem horário + 10 acompanhantes VIP até 23h
Demais convidados até 23h: 🚺 R$40 / 🚹 R$60 — após 23h: valor da porta

*Benefícios por vendas (código + lista):*
5 → R$100 de consumo
10 → R$150 de consumo
15 → R$250 de consumo
25 → R$630 de consumo
35 → R$780 de consumo
40 → R$1.260 de consumo`,

  caza: `*CAZA LAGOA — Aniversários e Despedidas* 🎉

*SEXTA:*
3 vendas: VIP próprio + 1 acompanhante VIP

5 → R$100 | 10 → R$200 | 15 → R$250 | 25 → R$630 | 35 → R$780 | 40 → R$1.260
⚠️ Apenas 1 comemoração por mês no Caza.

*SÁBADO:*
3 vendas: aniversariante + 1 acompanhante VIP sem horário
Lista até 23h: aniversariante + 10 convidados VIP
Demais: 🚺 R$40 / 🚹 R$60 — após 23h: valor da porta

5 → 2 drinks ou R$100 | 10 → 3 drinks ou R$150 | 15 → 5 drinks ou R$250 | 25 → Combo ou R$630 | 35 → Combo + 2 drinks ou R$780 | 40 → 2 Combos ou R$1.260`,

  villa: `*VILLA GÁVEA — Aniversários e Despedidas* 🎉

*SEXTA:*
Código (a partir de 5 vendas): VIP próprio até 23h + 1 acompanhante VIP
Lista: VIP próprio + acompanhante até 23h
Demais: FEM VIP / MASC R$80 — após 23h: valor da porta

10 → R$100 | 15 → R$250 | 25 → 1 Combo | 40 → 2 Combos

*QUINTA:*
Código (a partir de 5 vendas): VIP próprio até 23h + 1 acompanhante VIP
Lista: VIP próprio + acompanhante até 23h
Demais: FEM VIP / MASC R$70 — após 23h: valor da porta

10 → R$100 | 15 → R$200 | 25 → 1 Combo | 40 → 2 Combos`,

  parque: `*PARQUE BAR — Aniversários* 🎉
📅 Sexta, Sábado e Domingo

Aniversariante + 3 convidados VIP até 23h
(Domingo: 1 convidado VIP até 22h)

Seus convidados ganham link com desconto pra evitar fila + lista amiga.

*Benefícios por pagantes no link + lista:*
5 → 5 Heineken ou 2 drinks + nachos n fries
10 → 10 Heineken ou 4 drinks + nachos n fries
20 → 15 Heineken ou 6 drinks + nachos n fries
30 → 1 Combo + 5 Heineken ou 2 drinks + 2 nachos n fries
40 → 1 Combo + 1 Don Luiz + 2 nachos n fries`,

  dedge: `*D-EDGE — Aniversários* 🎉

Já anoto seu interesse e aciono a equipe pra te passar as condições especiais assim que confirmar. 😊`,
};

const NEGATIVE_KEYWORDS = [
  'nope', 'negativo', 'sem interesse', 'nao tenho interesse',
  'não tenho interesse', 'nao quero', 'não quero', 'nao preciso', 'não preciso',
  'nao obrigado', 'não obrigado', 'obrigado nao', 'obrigado não',
  'pode nao', 'pode não', 'dispenso', 'deixa pra la', 'deixa pra lá',
  'nao vai rolar', 'não vai rolar', 'nao vou', 'não vou',
];

const AFFIRMATIVE_KEYWORDS = [
  'sim', 'quero', 'pode', 'claro', 'vamos', 'bora', 'manda', 'conta',
  'ok', 'top', 'show', 'isso', 'vai', 'legal', 'boa', 'perfeito',
  'ótimo', 'otimo', 'maravilha', 'beleza', 'com certeza', 'certeza',
  'adorei', 'quero sim', 'pode ser', 'ta bom', 'tá bom',
];

function normalize(text) {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export const conversationFlowService = {

  isNegative(text) {
    if (!text) return false;
    const n = normalize(text);
    return NEGATIVE_KEYWORDS.some(k => n.includes(normalize(k)));
  },

  isAffirmative(text) {
    if (!text) return false;
    const n = normalize(text);
    return AFFIRMATIVE_KEYWORDS.some(k => n.includes(normalize(k)));
  },

  detectVenue(text) {
    if (!text) return null;
    const n = normalize(text);
    if (n.includes('aldeia')) return 'aldeia';
    if (n.includes('caza')) return 'caza';
    if (n.includes('villa') || n.includes('gavea') || n.includes('gávea')) return 'villa';
    if (n.includes('parque')) return 'parque';
    if (n.includes('dedge') || n.includes('d edge') || n.includes('d-edge') || n.includes('dge')) return 'dedge';
    return null;
  },

  getRandomEventList() {
    const variation = EVENT_LIST_VARIATIONS[Math.floor(Math.random() * EVENT_LIST_VARIATIONS.length)];
    return `${variation}\n\n${EVENT_NAMES}`;
  },

  getVenueAdvantages(venue) {
    return VENUE_ADVANTAGES[venue] || null;
  },
};
