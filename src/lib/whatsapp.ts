import { dataCurta, moeda, rotuloTipo, valorDoMotorista } from './formato'
import { linkDeConfirmacao, resumoDoServico } from './link'
import type { Indicador, Motorista, Servico } from '../types'

function pessoas(pax: number): string {
  return pax === 1 ? '1 pessoa' : `${pax} pessoas`
}

/** Mensagem para o motorista. Leva o valor dele, nunca o valor cobrado do cliente. */
export function mensagemParaMotorista(servico: Servico, motorista: Motorista): string {
  const resumo = resumoDoServico(servico, motorista.nome, valorDoMotorista(servico, motorista))
  const linhas = [
    'Serviço confirmado',
    '',
    `${dataCurta(servico.data)} às ${servico.hora} — ${rotuloTipo(servico.tipo)}`,
    `Passageiro: ${servico.passageiro} (${pessoas(servico.pax)})`,
  ]
  if (servico.voo) linhas.push(`Voo: ${servico.voo}`)
  linhas.push(
    `Buscar: ${servico.origem}`,
    `Levar: ${servico.destino}`,
    '',
    `Seu valor: ${moeda(resumo.valorMotorista)}`,
    '',
    `Confirmar: ${linkDeConfirmacao(resumo)}`,
  )
  return linhas.join('\n')
}

/** Mensagem para quem indicou. Sem nenhum valor. */
export function mensagemParaIndicador(
  servico: Servico,
  motorista: Motorista,
  indicador: Indicador,
): string {
  const linhas = [
    `Olá, ${indicador.nome}!`,
    '',
    `O carro está confirmado para ${dataCurta(servico.data)} às ${servico.hora}.`,
    `Passageiro: ${servico.passageiro} (${pessoas(servico.pax)})`,
  ]
  if (servico.voo) linhas.push(`Voo: ${servico.voo}`)
  linhas.push(
    `Buscar: ${servico.origem}`,
    `Levar: ${servico.destino}`,
    `Motorista: ${motorista.nome} — ${motorista.veiculo}`,
    '',
    'Qualquer coisa, é só chamar.',
  )
  return linhas.join('\n')
}

export function abrirWhatsApp(telefone: string, mensagem: string): void {
  const numero = telefone.replace(/\D/g, '')
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener')
}
