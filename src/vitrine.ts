// O conteúdo da página de vendas.
//
// Os valores abaixo são o padrão. Quando a administração edita algum campo, o
// que ficou guardado no banco entra por cima — campo a campo, então mexer numa
// frase não apaga o resto.

export type ConteudoDaVitrine = {
  marca: {
    nome: string
    cor_destaque: string
    tema: 'escuro' | 'claro'
  }
  topo: {
    etiqueta: string
    titulo_1: string
    titulo_2: string
    subtitulo: string
    botao: string
    botao_secundario: string
    selos: string[]
    imagem: string
  }
  dores: {
    etiqueta: string
    titulo: string
    itens: { titulo: string; texto: string }[]
    fecho: string
  }
  passos: {
    etiqueta: string
    titulo: string
    subtitulo: string
    itens: { titulo: string; texto: string }[]
  }
  diferencas: {
    titulo: string
    itens: { titulo: string; texto: string }[]
  }
  planos: {
    titulo: string
    subtitulo: string
  }
  indicacao: {
    titulo: string
    texto: string
    botao: string
  }
  perguntas: { p: string; r: string }[]
  chamada: {
    titulo: string
    texto: string
    botao: string
    rodape: string
  }
  rodape: string
}

export const VITRINE_PADRAO: ConteudoDaVitrine = {
  marca: {
    nome: 'Transfer',
    cor_destaque: '#6fa3d2',
    tema: 'escuro',
  },
  topo: {
    etiqueta: 'Transfer turístico · Serra Gaúcha',
    titulo_1: 'Você lança,',
    titulo_2: 'ele confirma.',
    subtitulo:
      'Agenda, escala e acerto para quem leva turista de van e carro executivo. O motorista recebe o serviço no WhatsApp e confirma num toque, sem instalar nada e sem enxergar quanto o cliente pagou.',
    botao: 'Testar 7 dias grátis',
    botao_secundario: 'Ver preços',
    selos: ['7 dias grátis', 'Sem fidelidade', 'Suporte no WhatsApp'],
    imagem: '',
  },
  dores: {
    etiqueta: 'Como é hoje',
    titulo: 'O caderno dá conta, até o dia em que não dá.',
    itens: [
      {
        titulo: 'A ligação das onze da noite',
        texto: 'Procurando no caderno quem leva o voo das seis, e ligando para três motoristas até alguém atender.',
      },
      {
        titulo: 'O transfer que furou',
        texto: 'Dois serviços no mesmo horário para o mesmo carro, e o hotel ligando atrás do passageiro.',
      },
      {
        titulo: 'O acerto que não fecha',
        texto: 'Fim do mês na calculadora somando percentual de motorista, e sempre falta um serviço em algum lugar.',
      },
      {
        titulo: 'O valor que vazou',
        texto: 'O motorista viu por acaso quanto o cliente pagou, e a conversa do mês seguinte começou torta.',
      },
    ],
    fecho: 'Nada disso é falta de capricho. É o caderno chegando no limite dele.',
  },
  passos: {
    etiqueta: 'Como fica',
    titulo: 'Quatro passos, todo dia.',
    subtitulo: 'O mesmo caminho que você já faz. A diferença é que fica anotado sozinho.',
    itens: [
      {
        titulo: 'Lance o serviço',
        texto: 'Data, hora, passageiro, rota e valor. Vinte segundos. O transfer de volta sai de um toque.',
      },
      {
        titulo: 'Escale quem está livre',
        texto: 'A tela mostra quem já tem serviço naquele horário e em qual carro o grupo cabe.',
      },
      {
        titulo: 'Avise pelo WhatsApp',
        texto: 'A mensagem sai pronta. O motorista abre o link e aceita ou recusa ali mesmo.',
      },
      {
        titulo: 'Feche o mês',
        texto: 'Quanto cada motorista recebe, quanto cada hotel indicou, quanto sobrou para você.',
      },
    ],
  },
  diferencas: {
    titulo: 'O que a planilha não faz',
    itens: [
      {
        titulo: 'O motorista nunca vê o valor do cliente',
        texto:
          'Ele enxerga o serviço e o valor dele, mais nada. Não é uma tela escondida: no banco de dados o motorista não tem permissão de chegar nesse número.',
      },
      {
        titulo: 'Ninguém precisa instalar aplicativo',
        texto:
          'O motorista recebe um link no WhatsApp e responde ali mesmo. Sem baixar nada, sem senha, sem treinar equipe.',
      },
      {
        titulo: 'O hotel acompanha sem ligar para você',
        texto:
          'Cada serviço tem um link de acompanhamento para mandar ao hotel e ao passageiro. Eles veem horário e motorista, nunca o valor.',
      },
    ],
  },
  planos: {
    titulo: 'Do tamanho da sua operação.',
    subtitulo: 'Sete dias grátis em qualquer plano. Depois você escolhe, e troca quando o time mudar.',
  },
  indicacao: {
    titulo: 'Indicou, os dois ganham um mês',
    texto:
      'Toda empresa recebe um código. Quando alguém entra pelo seu código e vira cliente, vocês dois ganham um mês grátis. Sem limite de indicações.',
    botao: 'Quero meu código',
  },
  perguntas: [
    {
      p: 'Preciso instalar alguma coisa?',
      r: 'Não. Funciona pelo navegador, no celular e no computador. Dá para colocar o atalho na tela de início e abre igual a um aplicativo.',
    },
    {
      p: 'E os meus motoristas, vão conseguir usar?',
      r: 'Eles não aprendem nada novo. Recebem um link pelo WhatsApp e tocam em "Aceito". Quem quiser pode criar conta para ver todos os serviços num lugar só, mas é opcional.',
    },
    {
      p: 'Eu dirijo sozinho, serve para mim?',
      r: 'Serve, e tem um plano só para isso. No plano Solo o sistema já entende que o motorista é você: some a parte de escalar gente e o valor do serviço é todo seu.',
    },
    {
      p: 'Como funciona o teste de 7 dias?',
      r: 'Você escolhe o plano que quer experimentar, cadastra a empresa e usa tudo por 7 dias. Se não quiser continuar, é só não assinar.',
    },
    {
      p: 'Posso cancelar quando quiser?',
      r: 'Pode, sem multa e sem fidelidade. No plano anual o valor já sai com dois meses de desconto, justamente porque é um compromisso maior.',
    },
    {
      p: 'Meus dados ficam misturados com os de outra empresa?',
      r: 'Não. Cada empresa enxerga apenas o que é dela, e essa separação é feita pelo banco de dados, não só pela tela.',
    },
  ],
  chamada: {
    titulo: 'Amanhã de manhã, sem caderno.',
    texto: 'Dois minutos para cadastrar a empresa e lançar o primeiro serviço.',
    botao: 'Testar 7 dias grátis',
    rodape: 'Cancela quando quiser.',
  },
  rodape: 'sistema para empresas de transfer turístico',
}

/** Junta o que está guardado com o padrão, campo a campo. */
export function juntarComPadrao(guardado: unknown): ConteudoDaVitrine {
  const g = (guardado ?? {}) as Partial<ConteudoDaVitrine>
  const juntar = <T extends object>(padrao: T, salvo: unknown): T => ({
    ...padrao,
    ...((salvo ?? {}) as object),
  })

  return {
    marca: juntar(VITRINE_PADRAO.marca, g.marca),
    topo: juntar(VITRINE_PADRAO.topo, g.topo),
    dores: juntar(VITRINE_PADRAO.dores, g.dores),
    passos: juntar(VITRINE_PADRAO.passos, g.passos),
    diferencas: juntar(VITRINE_PADRAO.diferencas, g.diferencas),
    planos: juntar(VITRINE_PADRAO.planos, g.planos),
    indicacao: juntar(VITRINE_PADRAO.indicacao, g.indicacao),
    perguntas: g.perguntas?.length ? g.perguntas : VITRINE_PADRAO.perguntas,
    chamada: juntar(VITRINE_PADRAO.chamada, g.chamada),
    rodape: g.rodape ?? VITRINE_PADRAO.rodape,
  }
}
