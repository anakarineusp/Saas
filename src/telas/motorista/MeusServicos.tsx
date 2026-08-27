import { useCallback, useEffect, useState } from 'react'
import { Carregando, Erro, Vazio } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { useAvisar } from '../../componentes/Avisos'
import { BotaoTema } from '../../componentes/BotaoTema'
import { EtiquetaDeStatus } from '../../componentes/Etiqueta'
import { Icone } from '../../componentes/Icone'
import { Suporte } from '../../componentes/Suporte'
import { confirmarServico, meusServicos, recusarServico, sair } from '../../dados'
import { dataPorExtenso, hora, moeda, rotuloTipo } from '../../lib/formato'
import { useSessao } from '../../sessao'
import type { Servico } from '../../tipos'

/** Área do motorista que criou conta. Nunca mostra o valor cobrado do cliente. */
export function MeusServicos() {
  const { perfil } = useSessao()
  const avisar = useAvisar()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      setServicos(await meusServicos())
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function responder(id: string, aceitar: boolean) {
    setErro('')
    try {
      if (aceitar) {
        await confirmarServico(id)
        avisar('Serviço confirmado')
      } else {
        const motivo = window.prompt('Pode dizer o motivo? (opcional)') ?? ''
        await recusarServico(id, motivo)
        avisar('A central foi avisada', 'neutro')
      }
      await carregar()
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  if (carregando) return <Carregando />

  const combinados = servicos.filter((s) => s.status === 'confirmado' || s.status === 'atribuido')
  const total = combinados.reduce((soma, s) => soma + s.valor_motorista_centavos, 0)
  const aguardando = servicos.filter((s) => s.status === 'atribuido').length

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pt-6 pb-24">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">Meus serviços</p>
          <h1 className="font-display mt-1 text-2xl font-bold text-tinta">{perfil?.nome}</h1>
        </div>
        <div className="flex items-center gap-0.5">
          <BotaoTema />
          <button
            type="button"
            onClick={() => void sair()}
            aria-label="Sair"
            className="rounded-full p-2 text-fraca hover:bg-superficie2 hover:text-tinta"
          >
            <Icone nome="sair" className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-destaque/30 bg-destaque/10 p-4">
        <p className="text-xs text-destaque">A receber pelos próximos serviços</p>
        <p className="font-display mt-1 text-3xl font-extrabold text-tinta tabular-nums">{moeda(total)}</p>
      </div>

      {aguardando > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-atencao/40 bg-atencao/10 px-4 py-2.5 text-sm font-bold text-atencao">
          <Icone nome="relogio" className="h-4 w-4" />
          {aguardando} {aguardando === 1 ? 'serviço esperando' : 'serviços esperando'} sua resposta
        </p>
      )}

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      <div className="mt-4 space-y-3">
        {servicos.map((s, i) => (
          <div key={s.id} className="painel entra rounded-2xl p-4" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-tenue first-letter:uppercase">{dataPorExtenso(s.data)}</p>
              <EtiquetaDeStatus status={s.status} />
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-sm">
              <span className="font-display font-bold text-tinta tabular-nums">{hora(s.hora)}</span>
              <span className="rounded-md bg-superficie2 px-1.5 py-0.5 text-xs font-medium text-fraca">
                {rotuloTipo(s.tipo)}
              </span>
              <span className="text-xs text-tenue">{s.pax} pax</span>
            </div>
            <p className="mt-2 font-semibold text-tinta">
              {s.passageiro}
              {s.voo && <span className="ml-2 text-xs font-normal text-tenue">Voo {s.voo}</span>}
            </p>
            <p className="mt-0.5 text-sm text-fraca">
              {s.origem} <span className="text-tenue">→</span> {s.destino}
            </p>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-borda pt-3">
              <span className="font-display font-bold text-tinta tabular-nums">
                {moeda(s.valor_motorista_centavos)}
              </span>
              {s.status === 'atribuido' && (
                <span className="flex gap-2">
                  <Botao tom="fantasma" tamanho="pequeno" onClick={() => void responder(s.id, false)}>
                    Não vou
                  </Botao>
                  <Botao tom="ok" tamanho="pequeno" onClick={() => void responder(s.id, true)}>
                    Aceito
                  </Botao>
                </span>
              )}
            </div>
          </div>
        ))}
        {servicos.length === 0 && (
          <Vazio titulo="Nenhum serviço marcado para você">Quando a central escalar, aparece aqui.</Vazio>
        )}
      </div>

      <Suporte />
    </div>
  )
}
