import type { StatusServico } from '../tipos'

const ESTILOS: Record<StatusServico, { texto: string; cor: string }> = {
  sem_motorista: { texto: 'Sem motorista', cor: 'bg-alerta/15 text-alerta border-alerta/30' },
  atribuido: { texto: 'Aguardando resposta', cor: 'bg-atencao/15 text-atencao border-atencao/30' },
  confirmado: { texto: 'Confirmado', cor: 'bg-ok/15 text-ok border-ok/30' },
  recusado: { texto: 'Recusado', cor: 'bg-alerta/15 text-alerta border-alerta/30' },
  concluido: { texto: 'Concluído', cor: 'bg-superficie2 text-fraca border-borda' },
  cancelado: { texto: 'Cancelado', cor: 'bg-superficie2 text-tenue border-borda line-through' },
}

export function EtiquetaDeStatus({ status }: { status: StatusServico }) {
  const estilo = ESTILOS[status]
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${estilo.cor}`}>{estilo.texto}</span>
  )
}

export function Etiqueta({ children, cor = 'neutro' }: { children: string; cor?: 'neutro' | 'ok' | 'atencao' | 'alerta' | 'destaque' }) {
  const cores = {
    neutro: 'bg-superficie2 text-fraca border-borda',
    ok: 'bg-ok/15 text-ok border-ok/30',
    atencao: 'bg-atencao/15 text-atencao border-atencao/30',
    alerta: 'bg-alerta/15 text-alerta border-alerta/30',
    destaque: 'bg-destaque/15 text-destaque border-destaque/30',
  }
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${cores[cor]}`}>{children}</span>
}
