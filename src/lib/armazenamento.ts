// Único lugar do app que conversa com o localStorage do navegador.
import { dadosDeDemonstracao } from '../seed'
import type { Dados } from '../types'

const CHAVE = 'transfer-gramado:dados:v1'
const CHAVE_ACEITES = 'transfer-gramado:aceites:v1'

function pareceValido(valor: unknown): valor is Dados {
  const d = valor as Dados | null
  return (
    !!d &&
    Array.isArray(d.motoristas) &&
    Array.isArray(d.indicadores) &&
    Array.isArray(d.servicos)
  )
}

export function carregar(): Dados {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) {
      const salvo: unknown = JSON.parse(bruto)
      if (pareceValido(salvo)) return salvo
    }
  } catch {
    // localStorage bloqueado ou conteúdo corrompido: começa da demonstração
  }
  const inicial = dadosDeDemonstracao()
  salvar(inicial)
  return inicial
}

export function salvar(dados: Dados): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados))
  } catch {
    // sem espaço ou navegação privada: o app continua funcionando na memória
  }
}

export function restaurarDemonstracao(): Dados {
  const novos = dadosDeDemonstracao()
  salvar(novos)
  try {
    localStorage.removeItem(CHAVE_ACEITES)
  } catch {
    // ignora
  }
  return novos
}

/** Aceites feitos no celular do motorista, onde os serviços da empresa não existem. */
export function jaAceitou(servicoId: string): boolean {
  try {
    const bruto = localStorage.getItem(CHAVE_ACEITES)
    return bruto ? (JSON.parse(bruto) as string[]).includes(servicoId) : false
  } catch {
    return false
  }
}

export function marcarAceite(servicoId: string): void {
  try {
    const bruto = localStorage.getItem(CHAVE_ACEITES)
    const lista = bruto ? (JSON.parse(bruto) as string[]) : []
    if (!lista.includes(servicoId)) {
      lista.push(servicoId)
      localStorage.setItem(CHAVE_ACEITES, JSON.stringify(lista))
    }
  } catch {
    // ignora
  }
}
