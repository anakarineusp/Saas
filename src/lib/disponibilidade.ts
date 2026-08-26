import { emMinutos } from './formato'
import type { Motorista, Servico } from '../tipos'

export type Disponibilidade =
  | { estado: 'livre' }
  | { estado: 'ocupado'; hora: string }
  | { estado: 'nao_cabe' }

/** Considera-se ocupado quem já tem serviço no mesmo dia a menos de 2 horas de distância. */
const JANELA_EM_MINUTOS = 120

export function disponibilidadeDe(
  motorista: Motorista,
  servico: Servico,
  servicos: Servico[],
): Disponibilidade {
  if (motorista.lugares < servico.pax) return { estado: 'nao_cabe' }

  const conflito = servicos
    .filter(
      (s) =>
        s.id !== servico.id &&
        s.motorista_id === motorista.id &&
        s.data.slice(0, 10) === servico.data.slice(0, 10) &&
        Math.abs(emMinutos(s.hora) - emMinutos(servico.hora)) < JANELA_EM_MINUTOS,
    )
    .sort((a, b) => emMinutos(a.hora) - emMinutos(b.hora))[0]

  return conflito ? { estado: 'ocupado', hora: conflito.hora.slice(0, 5) } : { estado: 'livre' }
}
