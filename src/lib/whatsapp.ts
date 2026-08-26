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
