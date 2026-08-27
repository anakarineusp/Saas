import type { StatusServico } from '../tipos'

/**
 * O status aparece como um pontinho e um texto discreto. Só o que exige ação
 * agora ganha cor de verdade — se tudo é colorido, nada chama atenção.
 */
const ESTILOS: Record<StatusServico, { texto: string; ponto: string; forte: boolean }> = {
  sem_motorista: { texto: 'Sem motorista', ponto: 'bg-alerta', forte: true },
  atribuido: { texto: 'Aguardando resposta', ponto: 'bg-atencao', forte: false },
  confirmado: { texto: 'Confirmado', ponto: 'bg-ok', forte: false },
  recusado: { texto: 'Recusado', ponto: 'bg-alerta', forte: true },
  concluido: { texto: 'Concluído', ponto: 'bg-tenue', forte: false },
  cancelado: { texto: 'Cancelado', ponto: 'bg-tenue', forte: false },
}

export function EtiquetaDeStatus({ status }: { status: StatusServico }) {
  const estilo = ESTILOS[status]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold ${
        estilo.forte ? 'text-alerta' : 'text-tenue'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${estilo.ponto}`} />
      {estilo.texto}
    </span>
  )
}

export function Etiqueta({
  children,
  cor = 'neutro',
}: {
  children: string
  cor?: 'neutro' | 'ok' | 'atencao' | 'alerta' | 'destaque'
}) {
  const cores = {
    neutro: 'text-tenue',
    ok: 'text-ok',
    atencao: 'text-atencao',
    alerta: 'text-alerta',
    destaque: 'text-destaque',
  }
  const pontos = {
    neutro: 'bg-tenue',
    ok: 'bg-ok',
    atencao: 'bg-atencao',
    alerta: 'bg-alerta',
    destaque: 'bg-destaque',
  }
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold ${cores[cor]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${pontos[cor]}`} />
      {children}
    </span>
  )
}
