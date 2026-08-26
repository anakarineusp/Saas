import { Link, Outlet } from 'react-router-dom'
import { BarraAbas } from '../../componentes/BarraAbas'
import { sair } from '../../dados'
import { useSessao } from '../../sessao'

/** Moldura da área da empresa: aviso do teste, abas e sair. */
export function Area() {
  const { assinatura, perfil } = useSessao()

  const aviso =
    assinatura && !assinatura.pode_usar
      ? { tom: 'red' as const, texto: 'Seu teste terminou. Escolha um plano para voltar a lançar serviços.' }
      : assinatura?.status === 'atrasada'
        ? { tom: 'amber' as const, texto: 'Há um pagamento em atraso na sua assinatura.' }
        : assinatura?.status === 'teste'
          ? {
              tom: 'slate' as const,
              texto: `Teste grátis: ${assinatura.dias_de_teste} ${assinatura.dias_de_teste === 1 ? 'dia restante' : 'dias restantes'}.`,
            }
          : null

  const cores = {
    red: 'bg-red-600 text-white',
    amber: 'bg-amber-500 text-white',
    slate: 'bg-slate-900 text-white',
  }

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="truncate text-sm font-semibold text-slate-900">{assinatura?.empresa ?? perfil?.nome}</span>
        <button type="button" onClick={() => void sair()} className="text-sm text-slate-500 underline">
          Sair
        </button>
      </div>

      {aviso && (
        <Link
          to="/app/assinatura"
          className={`mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold ${cores[aviso.tom]}`}
        >
          <span>{aviso.texto}</span>
          <span className="shrink-0 text-xs underline">ver planos</span>
        </Link>
      )}

      <Outlet />

      <div className="px-4 pt-8 pb-2 text-center">
        <Link to="/app/assinatura" className="text-xs text-slate-400 underline">
          minha assinatura
        </Link>
      </div>

      <BarraAbas />
    </div>
  )
}
