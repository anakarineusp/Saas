// O link de confirmação leva, dentro do próprio endereço, só o que o motorista pode ver.
// Assim ele abre em qualquer celular, mesmo sem os dados da empresa naquele aparelho.
import type { Servico, TipoServico } from '../types'

export type ResumoDoMotorista = {
  id: string
  data: string
  hora: string
  tipo: TipoServico
  passageiro: string
  pax: number
  origem: string
  destino: string
  voo?: string
  valorMotorista: number
  motorista: string
}

// chaves curtas para o endereço não ficar gigante
type Compacto = {
  i: string
  d: string
  h: string
  t: TipoServico
  p: string
  x: number
  o: string
  e: string
  v?: string
  m: string
  r: number
}

function paraBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto)
  let binario = ''
  bytes.forEach((b) => {
    binario += String.fromCharCode(b)
  })
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deBase64(texto: string): string {
  const preenchido = texto.replace(/-/g, '+').replace(/_/g, '/')
  const binario = atob(preenchido + '='.repeat((4 - (preenchido.length % 4)) % 4))
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function codificarResumo(resumo: ResumoDoMotorista): string {
  const compacto: Compacto = {
    i: resumo.id,
    d: resumo.data,
    h: resumo.hora,
    t: resumo.tipo,
    p: resumo.passageiro,
    x: resumo.pax,
    o: resumo.origem,
    e: resumo.destino,
    v: resumo.voo,
    m: resumo.motorista,
    r: resumo.valorMotorista,
  }
  return paraBase64(JSON.stringify(compacto))
}

export function decodificarResumo(texto: string): ResumoDoMotorista | null {
  try {
    const c = JSON.parse(deBase64(texto)) as Compacto
    if (!c || !c.i || !c.d || !c.h) return null
    return {
      id: c.i,
      data: c.d,
      hora: c.h,
      tipo: c.t,
      passageiro: c.p,
      pax: c.x,
      origem: c.o,
      destino: c.e,
      voo: c.v,
      motorista: c.m,
      valorMotorista: c.r,
    }
  } catch {
    return null
  }
}

export function resumoDoServico(
  servico: Servico,
  nomeDoMotorista: string,
  valorMotorista: number,
): ResumoDoMotorista {
  return {
    id: servico.id,
    data: servico.data,
    hora: servico.hora,
    tipo: servico.tipo,
    passageiro: servico.passageiro,
    pax: servico.pax,
    origem: servico.origem,
    destino: servico.destino,
    voo: servico.voo,
    motorista: nomeDoMotorista,
    valorMotorista,
  }
}

export function enderecoDoApp(): string {
  return `${window.location.origin}${window.location.pathname}`
}

export function linkDeConfirmacao(resumo: ResumoDoMotorista): string {
  return `${enderecoDoApp()}?confirmar=${encodeURIComponent(resumo.id)}&d=${codificarResumo(resumo)}`
}
