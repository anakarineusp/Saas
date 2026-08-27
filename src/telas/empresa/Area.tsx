import { Link, NavLink, Outlet } from 'react-router-dom'
import { BotaoTema } from '../../componentes/BotaoTema'
import { Icone, type NomeDeIcone } from '../../componentes/Icone'
import { Suporte } from '../../componentes/Suporte'
import { sair } from '../../dados'
import { useSessao } from '../../sessao'

const ABAS: { para: string; fim: boolean; rotulo: string; icone: NomeDeIcone }[] = [
  { para: '/app', fim: true, rotulo: 'Hoje', icone: 'calendario' },
  { para: '/app/acerto', fim: false, rotulo: 'Acerto', icone: 'grafico' },
  { para: '/app/cadastros', fim: false, rotulo: 'Cadastros', icone: 'lista' },
]

/** Moldura da área da empresa: aviso da assinatura, abas e sair. */
export function Area() {
  const { assinatura, perfil } = useSessao()

  const aviso =
    assinatura && !assinatura.pode_usar
      ? { cor: 'painel border-l-2 border-l-alerta text-tinta', texto: 'Seu teste terminou. Escolha um plano para voltar a lançar serviços.' }
      : assinatura?.status === 'atrasada'
        ? { cor: 'painel border-l-2 border-l-atencao text-tinta', texto: 'Há um pagamento em atraso na sua assinatura.' }
        : assinatura?.status === 'teste'
          ? {
              cor:
                assinatura.dias_de_teste <= 2
                  ? 'painel border-l-2 border-l-atencao text-tinta'
                  : 'painel text-fraca',
              texto: `Teste grátis: ${assinatura.dias_de_teste} ${assinatura.dias_de_teste === 1 ? 'dia restante' : 'dias restantes'}.`,
            }
          : null

  return (
    <div className="mx-auto min-h-screen max-w-md pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-borda/60 bg-fundo/85 px-4 py-3 backdrop-blur-lg">
        <span className="min-w-0 truncate font-display text-sm font-bold text-tinta">
          {assinatura?.empresa ?? perfil?.nome}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <BotaoTema />
          <button
            type="button"
            onClick={() => void sair()}
            aria-label="Sair"
            className="rounded-full p-2 text-fraca transition-colors hover:bg-superficie2 hover:text-tinta"
          >
            <Icone nome="sair" className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {aviso && (
        <Link
          to="/app/assinatura"
          className={`mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold ${aviso.cor}`}
        >
          <span>{aviso.texto}</span>
          <Icone nome="seta" className="h-4 w-4 shrink-0 opacity-70" />
        </Link>
      )}

      <Outlet />

      <div className="px-4 pt-10 pb-2 text-center">
        <Link to="/app/assinatura" className="text-xs text-tenue underline underline-offset-2 hover:text-fraca">
          minha assinatura e indicações
        </Link>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-fundo/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-md">
          {ABAS.map((aba) => (
            <NavLink
              key={aba.para}
              to={aba.para}
              end={aba.fim}
              className={({ isActive }) =>
                `relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-colors ${
                  isActive ? 'text-destaque' : 'text-tenue hover:text-fraca'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 h-0.5 w-10 rounded-full bg-destaque shadow-[0_0_12px_var(--c-destaque)]" />
                  )}
                  <Icone nome={aba.icone} className="h-5.5 w-5.5" traco={isActive ? 2.2 : 1.7} />
                  {aba.rotulo}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <Suporte acima />
    </div>
  )
}
