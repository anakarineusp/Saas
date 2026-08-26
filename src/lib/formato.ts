import type { Motorista, Indicador, Servico, TipoServico } from '../types'

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** Monta a data ao meio-dia para o fuso horário nunca empurrar para o dia anterior. */
export function comoData(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia, 12, 0, 0)
}

export function paraISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function hojeISO(): string {
  return paraISO(new Date())
}

/** "quinta-feira, 27 de agosto" */
export function dataPorExtenso(iso: string): string {
  const d = comoData(iso)
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
}

/** "27/08" */
export function dataCurta(iso: string): string {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

/** "agosto de 2026" */
export function mesPorExtenso(mesISO: string): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  return `${MESES[mes - 1]} de ${ano}`
}

/** "2026-08-27" -> "2026-08" */
export function mesDe(iso: string): string {
  return iso.slice(0, 7)
}

export function mesAtual(): string {
  return mesDe(hojeISO())
}

export function mesVizinho(mesISO: string, passos: number): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  const d = new Date(ano, mes - 1 + passos, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function rotuloTipo(tipo: TipoServico): string {
  if (tipo === 'transfer_in') return 'Transfer IN'
  if (tipo === 'transfer_out') return 'Transfer OUT'
  return 'Passeio'
}

export function emMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

function duasCasas(valor: number): number {
  return Math.round(valor * 100) / 100
}

export function valorDoMotorista(servico: Servico, motorista: Motorista): number {
  return duasCasas((servico.valor * motorista.percentual) / 100)
}

export function comissaoDoIndicador(servico: Servico, indicador: Indicador): number {
  return duasCasas((servico.valor * indicador.comissao) / 100)
}

export function novoId(): string {
  return Math.random().toString(36).slice(2, 10)
}
