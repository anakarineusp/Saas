import type { TipoServico } from '../tipos'

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** Monta a data ao meio-dia para o fuso horário nunca empurrar para o dia anterior. */
export function comoData(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number)
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
  const [, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}`
}

/** "27/08/2026" */
export function dataCompleta(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

/** "agosto de 2026" */
export function mesPorExtenso(mesISO: string): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  return `${MESES[mes - 1]} de ${ano}`
}

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

export function primeiroDiaDoMes(mesISO: string): string {
  return `${mesISO}-01`
}

export function ultimoDiaDoMes(mesISO: string): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  return paraISO(new Date(ano, mes, 0))
}

/** O banco devolve "14:20:00"; a tela mostra "14:20". */
export function hora(valor: string): string {
  return valor.slice(0, 5)
}

/** Recebe centavos e devolve "R$ 192,00". */
export function moeda(centavos: number | null | undefined): string {
  return ((centavos ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Recebe centavos e devolve "192,00", para digitar num campo. */
export function emReais(centavos: number | null | undefined): string {
  return ((centavos ?? 0) / 100).toFixed(2).replace('.', ',')
}

/** Recebe o que a pessoa digitou ("480", "480,50") e devolve centavos. */
export function paraCentavos(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  return Math.round((Number(limpo) || 0) * 100)
}

export function rotuloTipo(tipo: TipoServico): string {
  if (tipo === 'transfer_in') return 'Transfer IN'
  if (tipo === 'transfer_out') return 'Transfer OUT'
  return 'Passeio'
}

export function emMinutos(valor: string): number {
  const [h, m] = valor.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

export function pessoas(pax: number): string {
  return pax === 1 ? '1 pessoa' : `${pax} pessoas`
}

export function soNumeros(texto: string): string {
  return texto.replace(/\D/g, '')
}
