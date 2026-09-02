import { useEffect } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { BotaoTema } from '../../componentes/BotaoTema'
import { Icone, type NomeDeIcone } from '../../componentes/Icone'
import { Suporte } from '../../componentes/Suporte'
import { euSouOMotorista, sair } from '../../dados'
import { useSessao } from '../../sessao'

const ABAS: { para: string; fim: boolean; rotulo: string; icone: NomeDeIcone }[] = [
  { para: '/app', fim: true, rotulo: 'Hoje', icone: 'calendario' },
  { para: '/app/acerto', fim: false, rotulo: 'Acerto', icone: 'grafico' },
  { para: '/app/cadastros', fim: false, rotulo: 'Cadastros', icone: 'lista' },
]

/** Moldura da área da empresa: aviso da assinatura, abas e sair. */
export function Area() {
  const { assinatura, perfil, recarregar } = useSessao()

  // No plano Solo o dono é o motorista. O cadastro dele é criado sozinho, para
  // os serviços terem dono e a conta fechar sem ele precisar entender isso.
  useEffect(() => {
    if (assinatura?.modo === 'solo' && assinatura.motoristas_cadastrados === 0) {
      void euSouOMotorista('Meu carro', 4).then(() => recarregar())
    }
  }, [assinatura?.modo, assinatura?.motoristas_cadastrados, recarregar])

  const aviso =
    assinatura && !assinatura.pode_usar
      ? { cor: 'border-borda bg-alerta/10 text-tinta', texto: 'Seu teste terminou. Escolha um plano para voltar a lançar serviços.' }
      : assinatura?.status === 'atrasada'
        ? { cor: 'border-borda bg-atencao/10 text-tinta', texto: 'Há um pagamento em atraso na sua assinatura.' }
        : assinatura?.status === 'teste'
          ? {
              cor:
                assinatura.dias_de_teste <= 2
                  ? 'border-borda bg-atencao/10 text-tinta'
                  : 'border-borda bg-superficie text-fraca',
              texto: `Teste grátis: ${assinatura.dias_de_teste} ${assinatura.dias_de_teste === 1 ? 'dia restante' : 'dias restantes'}.`,
            }
          : null

  return (
    <div className="mx-auto min-h-screen max-w-md pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-borda bg-fundo/85 px-4 py-3 backdrop-blur-lg">
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

      {/* Faixa fina, colada no cabeçalho: avisa sem virar mais uma caixa. */}
      {aviso && (
        <Link
          to="/app/assinatura"
          className={`flex items-center justify-between gap-3 border-b px-5 py-2 text-xs font-semibold ${aviso.cor}`}
        >
          <span>{aviso.texto}</span>
          <Icone nome="seta" className="h-3.5 w-3.5 shrink-0 opacity-70" />
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
                    <span className="absolute top-0 h-0.5 w-10 rounded-full bg-destaque" />
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
