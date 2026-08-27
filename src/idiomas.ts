// Português, espanhol e inglês nas telas que o passageiro e o motorista abrem.
// Gramado recebe muito argentino e uruguaio: mandar o link já no idioma certo
// muda a impressão que o hóspede tem da empresa.

export type Idioma = 'pt' | 'es' | 'en'

export const IDIOMAS: { id: Idioma; rotulo: string }[] = [
  { id: 'pt', rotulo: 'PT' },
  { id: 'es', rotulo: 'ES' },
  { id: 'en', rotulo: 'EN' },
]

const TEXTOS = {
  pt: {
    ola: 'Olá',
    seuValor: 'Seu valor',
    passageiro: 'Passageiro',
    voo: 'Voo',
    buscar: 'Buscar',
    levar: 'Levar',
    aceito: 'Aceito o serviço',
    naoVou: 'Não vou conseguir',
    enviando: 'Enviando…',
    confirmado: 'Serviço confirmado',
    recusouTitulo: 'Você recusou este serviço',
    recusouTexto: 'A central já foi avisada e vai chamar outro motorista.',
    rodapeMotorista: 'Qualquer imprevisto depois de aceitar, avise a central pelo WhatsApp.',
    motivo: 'Pode dizer o motivo? (opcional)',
    linkExpirado: 'Link expirado',
    peçaOutro: 'Peça um novo link para a central.',

    // acompanhamento
    seuTransfer: 'Seu transfer',
    motorista: 'Motorista',
    veiculo: 'Veículo',
    horario: 'Horário',
    aindaDefinindo: 'Ainda estamos definindo o motorista',
    faleConosco: 'Falar com a central',
    situacao: 'Situação',
    situacoes: {
      sem_motorista: 'Organizando o motorista',
      atribuido: 'Motorista escalado',
      confirmado: 'Motorista confirmado',
      recusado: 'Trocando o motorista',
      concluido: 'Viagem concluída',
      cancelado: 'Cancelado',
    },

    // avaliação
    comoFoi: 'Como foi a sua viagem?',
    avalieTexto: 'Sua resposta ajuda a manter o padrão do atendimento.',
    notaGeral: 'Nota geral',
    pontualidade: 'Pontualidade',
    conforto: 'Conforto do veículo',
    comentario: 'Quer contar mais alguma coisa? (opcional)',
    enviar: 'Enviar avaliação',
    obrigado: 'Obrigado!',
    obrigadoTexto: 'Sua avaliação foi registrada.',
    jaRespondeu: 'Esta viagem já foi avaliada. Obrigado!',
  },

  es: {
    ola: 'Hola',
    seuValor: 'Su pago',
    passageiro: 'Pasajero',
    voo: 'Vuelo',
    buscar: 'Recoger en',
    levar: 'Llevar a',
    aceito: 'Acepto el servicio',
    naoVou: 'No voy a poder',
    enviando: 'Enviando…',
    confirmado: 'Servicio confirmado',
    recusouTitulo: 'Usted rechazó este servicio',
    recusouTexto: 'La central ya fue avisada y llamará a otro conductor.',
    rodapeMotorista: 'Ante cualquier imprevisto, avise a la central por WhatsApp.',
    motivo: '¿Puede decir el motivo? (opcional)',
    linkExpirado: 'Enlace vencido',
    peçaOutro: 'Pida un nuevo enlace a la central.',

    seuTransfer: 'Su traslado',
    motorista: 'Conductor',
    veiculo: 'Vehículo',
    horario: 'Horario',
    aindaDefinindo: 'Todavía estamos asignando el conductor',
    faleConosco: 'Hablar con la central',
    situacao: 'Estado',
    situacoes: {
      sem_motorista: 'Asignando conductor',
      atribuido: 'Conductor asignado',
      confirmado: 'Conductor confirmado',
      recusado: 'Cambiando de conductor',
      concluido: 'Viaje finalizado',
      cancelado: 'Cancelado',
    },

    comoFoi: '¿Cómo estuvo su viaje?',
    avalieTexto: 'Su respuesta nos ayuda a mantener la calidad del servicio.',
    notaGeral: 'Nota general',
    pontualidade: 'Puntualidad',
    conforto: 'Comodidad del vehículo',
    comentario: '¿Quiere contarnos algo más? (opcional)',
    enviar: 'Enviar valoración',
    obrigado: '¡Gracias!',
    obrigadoTexto: 'Su valoración fue registrada.',
    jaRespondeu: 'Este viaje ya fue valorado. ¡Gracias!',
  },

  en: {
    ola: 'Hello',
    seuValor: 'Your payment',
    passageiro: 'Passenger',
    voo: 'Flight',
    buscar: 'Pick up at',
    levar: 'Drop off at',
    aceito: 'Accept this trip',
    naoVou: "I can't make it",
    enviando: 'Sending…',
    confirmado: 'Trip confirmed',
    recusouTitulo: 'You declined this trip',
    recusouTexto: 'The office has been notified and will assign another driver.',
    rodapeMotorista: 'If anything comes up after accepting, message the office on WhatsApp.',
    motivo: 'Care to tell us why? (optional)',
    linkExpirado: 'Link expired',
    peçaOutro: 'Ask the office for a new link.',

    seuTransfer: 'Your transfer',
    motorista: 'Driver',
    veiculo: 'Vehicle',
    horario: 'Time',
    aindaDefinindo: 'We are still assigning your driver',
    faleConosco: 'Message the office',
    situacao: 'Status',
    situacoes: {
      sem_motorista: 'Assigning a driver',
      atribuido: 'Driver assigned',
      confirmado: 'Driver confirmed',
      recusado: 'Changing driver',
      concluido: 'Trip completed',
      cancelado: 'Cancelled',
    },

    comoFoi: 'How was your ride?',
    avalieTexto: 'Your answer helps us keep the service standard high.',
    notaGeral: 'Overall',
    pontualidade: 'Punctuality',
    conforto: 'Vehicle comfort',
    comentario: 'Anything else you would like to tell us? (optional)',
    enviar: 'Send review',
    obrigado: 'Thank you!',
    obrigadoTexto: 'Your review has been recorded.',
    jaRespondeu: 'This ride has already been reviewed. Thank you!',
  },
} as const

export type Textos = (typeof TEXTOS)['pt']

/** Descobre o idioma pelo endereço (?idioma=es) ou pelo navegador de quem abriu. */
export function idiomaInicial(): Idioma {
  const daUrl = new URLSearchParams(window.location.search).get('idioma')
  if (daUrl === 'es' || daUrl === 'en' || daUrl === 'pt') return daUrl

  const doNavegador = (navigator.language || 'pt').slice(0, 2).toLowerCase()
  if (doNavegador === 'es') return 'es'
  if (doNavegador === 'en') return 'en'
  return 'pt'
}

export function textos(idioma: Idioma): Textos {
  return TEXTOS[idioma] as Textos
}

const DATAS: Record<Idioma, string> = { pt: 'pt-BR', es: 'es-AR', en: 'en-US' }

export function dataNoIdioma(iso: string, idioma: Idioma): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  return new Date(ano, mes - 1, dia, 12).toLocaleDateString(DATAS[idioma], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
