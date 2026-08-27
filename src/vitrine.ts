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
    etiqueta: 'Feito para transfer turístico na serra',
    titulo_1: 'Sua operação inteira',
    titulo_2: 'cabe numa tela.',
    subtitulo:
      'Larga o caderno e a planilha. Lance o serviço, escale quem está livre e avise pelo WhatsApp — o motorista confirma sem instalar nada, e nunca vê o valor cobrado do cliente.',
    botao: 'Testar 7 dias grátis',
    botao_secundario: 'Ver os planos',
    selos: ['Cancela quando quiser', 'Sem fidelidade', 'Suporte no WhatsApp'],
    imagem: '',
  },
  dores: {
    etiqueta: 'O jeito antigo',
    titulo: 'Você não perde dinheiro por falta de cliente. Perde por falta de controle.',
    itens: [
      {
        titulo: 'A ligação das onze da noite',
        texto: 'Conferindo no caderno quem leva o voo das seis, e ligando para três motoristas até alguém atender.',
      },
      {
        titulo: 'O transfer que furou',
        texto: 'Dois serviços marcados no mesmo horário para o mesmo carro — e o hotel ligando atrás do passageiro.',
      },
      {
        titulo: 'O acerto que não fecha',
        texto: 'Fim do mês somando percentual de motorista na calculadora, e sempre falta um serviço em algum lugar.',
      },
      {
        titulo: 'O valor que vazou',
        texto: 'O motorista viu por acaso quanto o cliente pagou — e a conversa do mês seguinte começou torta.',
      },
    ],
    fecho: 'Nada disso é falta de capricho. É o caderno chegando no limite dele.',
  },
  passos: {
    etiqueta: 'O jeito novo',
    titulo: 'Quatro passos, todo dia',
    subtitulo: 'É o mesmo caminho que você já faz — sem esquecer ninguém e com a conta pronta no fim do mês.',
    itens: [
      {
        titulo: 'Lance o serviço',
        texto: 'Data, hora, passageiro, rota e valor. Vinte segundos — e o transfer de volta sai de um toque.',
      },
      {
        titulo: 'Escale quem está livre',
        texto: 'A tela mostra quem já tem serviço naquele horário e em qual carro o grupo cabe. Sem conflito.',
      },
      {
        titulo: 'Avise pelo WhatsApp',
        texto: 'A mensagem sai pronta. O motorista abre o link e confirma — sem instalar nada, sem criar conta.',
      },
      {
        titulo: 'Feche o mês sozinho',
        texto: 'Quanto cada motorista recebe, quanto cada hotel indicou, quanto sobrou para você. Pronto.',
      },
    ],
  },
  diferencas: {
    titulo: 'Três coisas que nenhuma planilha faz',
    itens: [
      {
        titulo: 'O motorista nunca vê o valor do cliente',
        texto:
          'Ele enxerga o serviço e o valor dele, mais nada. Não é uma tela escondida: no banco de dados o motorista não tem permissão de chegar nesse número.',
      },
      {
        titulo: 'Ninguém instala nada',
        texto:
          'O motorista recebe um link no WhatsApp e confirma ali mesmo. Sem aplicativo, sem senha, sem treinar equipe.',
      },
      {
        titulo: 'Conflito de horário some',
        texto:
          'Na hora de escalar, o sistema avisa se o motorista tem outro serviço a menos de duas horas e se o grupo não cabe no carro.',
      },
    ],
  },
  planos: {
    titulo: 'Planos',
    subtitulo: 'Comece com 7 dias grátis. Depois, o plano do tamanho da sua operação.',
  },
  indicacao: {
    titulo: 'Indicou, os dois ganham um mês',
    texto:
      'Toda empresa recebe um código. Quando alguém entra pelo seu código e vira cliente, você ganha um mês grátis — e essa pessoa também. Sem limite de indicações.',
    botao: 'Quero meu código',
  },
  perguntas: [
    {
      p: 'Preciso instalar alguma coisa?',
      r: 'Não. Funciona pelo navegador, no celular e no computador. Dá para colocar o atalho na tela de início e abre como aplicativo.',
    },
    {
      p: 'E os meus motoristas, vão conseguir usar?',
      r: 'Eles não precisam aprender nada. Recebem um link pelo WhatsApp e tocam em "Aceito". Quem quiser pode criar conta para ver todos os serviços num lugar só, mas é opcional.',
    },
    {
      p: 'Eu dirijo sozinho, serve para mim?',
      r: 'Serve, e tem um plano só para isso. No plano Solo o sistema já entende que o motorista é você: some a parte de escalar gente e o valor do serviço é todo seu.',
    },
    {
      p: 'Como funciona o teste de 7 dias?',
      r: 'Você se cadastra e usa tudo por 7 dias. Se não quiser continuar, é só não assinar.',
    },
    {
      p: 'Posso cancelar quando quiser?',
      r: 'Pode, sem multa e sem fidelidade. No plano anual, o valor já sai com dois meses de desconto justamente porque é um compromisso maior.',
    },
    {
      p: 'Meus dados ficam misturados com os de outra empresa?',
      r: 'Não. Cada empresa enxerga apenas o que é dela, e essa separação é garantida pelo banco de dados, não só pela tela.',
    },
  ],
  chamada: {
    titulo: 'Amanhã de manhã, sem caderno.',
    texto: 'Leva menos de dois minutos para cadastrar a empresa e lançar o primeiro serviço.',
    botao: 'Testar 7 dias grátis',
    rodape: 'Cancela quando quiser. Sem fidelidade.',
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
