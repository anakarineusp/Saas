import { dataCurta, hora, moeda, pessoas, rotuloTipo, soNumeros } from './formato'
import type { Indicador, Servico } from '../tipos'

export function enderecoDoApp(): string {
  return `${window.location.origin}`
}

export function linkDeConfirmacao(token: string): string {
  return `${enderecoDoApp()}/confirmar/${token}`
}

/** Mensagem para o motorista. Leva o valor dele, nunca o valor cobrado do cliente. */
export function mensagemParaMotorista(servico: Servico, token: string): string {
  const linhas = [
    'Serviço confirmado',
    '',
    `${dataCurta(servico.data)} às ${hora(servico.hora)} — ${rotuloTipo(servico.tipo)}`,
    `Passageiro: ${servico.passageiro} (${pessoas(servico.pax)})`,
  ]
  if (servico.voo) linhas.push(`Voo: ${servico.voo}`)
  linhas.push(
    `Buscar: ${servico.origem}`,
    `Levar: ${servico.destino}`,
    '',
    `Seu valor: ${moeda(servico.valor_motorista_centavos)}`,
    '',
    `Confirmar: ${linkDeConfirmacao(token)}`,
  )
  return linhas.join('\n')
}

/** Mensagem para quem indicou. Sem nenhum valor. */
export function mensagemParaIndicador(servico: Servico, indicador: Indicador): string {
  const linhas = [
    `Olá, ${indicador.nome}!`,
    '',
    `O carro está confirmado para ${dataCurta(servico.data)} às ${hora(servico.hora)}.`,
    `Passageiro: ${servico.passageiro} (${pessoas(servico.pax)})`,
  ]
  if (servico.voo) linhas.push(`Voo: ${servico.voo}`)
  linhas.push(
    `Buscar: ${servico.origem}`,
    `Levar: ${servico.destino}`,
    `Motorista: ${servico.motorista} — ${servico.veiculo}`,
    '',
    'Qualquer coisa, é só chamar.',
  )
  return linhas.join('\n')
}

export function abrirWhatsApp(telefone: string, mensagem: string): void {
  window.open(`https://wa.me/${soNumeros(telefone)}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener')
}

export function linkDeAvaliacao(token: string): string {
  return `${enderecoDoApp()}/avaliar/${token}`
}

export function linkDeAcompanhamento(token: string): string {
  return `${enderecoDoApp()}/acompanhar/${token}`
}

/** Recado curto para o hotel mandar ao hóspede, com o link de acompanhamento. */
export function mensagemDeAcompanhamento(servico: Servico, token: string): string {
  return [
    `Olá! Aqui está o acompanhamento do transfer de ${servico.passageiro}.`,
    '',
    `${dataCurta(servico.data)} às ${hora(servico.hora)}`,
    `${servico.origem} → ${servico.destino}`,
    '',
    linkDeAcompanhamento(token),
  ].join('\n')
}

/** Pedido de avaliação, mandado depois da viagem. */
export function mensagemDeAvaliacao(servico: Servico, token: string): string {
  return [
    `Olá, ${servico.passageiro}! Esperamos que a viagem tenha sido tranquila.`,
    '',
    'Pode nos contar como foi? Leva menos de um minuto:',
    linkDeAvaliacao(token),
    '',
    'Obrigado!',
  ].join('\n')
}
