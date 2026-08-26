import { useCallback, useEffect, useState } from 'react'
import { Carregando, Erro, Vazio } from '../../componentes/Aviso'
import { confirmarServico, meusServicos, sair } from '../../dados'
import { dataPorExtenso, hora, moeda, rotuloTipo } from '../../lib/formato'
import { useSessao } from '../../sessao'
import type { Servico } from '../../tipos'

/** Área do motorista que criou conta. Nunca mostra o valor cobrado do cliente. */
export function MeusServicos() {
  const { perfil } = useSessao()
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

  async function confirmar(id: string) {
    setErro('')
    try {
      await confirmarServico(id)
      await carregar()
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  if (carregando) return <Carregando />

  const total = servicos.reduce((soma, s) => soma + s.valor_motorista_centavos, 0)

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pt-6 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Meus serviços</p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900">{perfil?.nome}</h1>
        </div>
        <button type="button" onClick={() => void sair()} className="text-sm text-slate-500 underline">
          Sair
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-900 p-4">
        <p className="text-xs text-slate-400">A receber pelos próximos serviços</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-white">{moeda(total)}</p>
      </div>

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      <div className="mt-4 space-y-3">
        {servicos.map((s) => (
          <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <p className="text-xs font-medium text-slate-500 first-letter:uppercase">{dataPorExtenso(s.data)}</p>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="font-semibold tabular-nums text-slate-900">{hora(s.hora)}</span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                {rotuloTipo(s.tipo)}
              </span>
              <span className="text-xs text-slate-500">{s.pax} pax</span>
            </div>
            <p className="mt-1.5 font-medium text-slate-900">
              {s.passageiro}
              {s.voo && <span className="ml-2 text-xs font-normal text-slate-500">Voo {s.voo}</span>}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {s.origem} <span className="text-slate-400">→</span> {s.destino}
            </p>
            <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5">
              <span className="font-semibold tabular-nums text-slate-900">{moeda(s.valor_motorista_centavos)}</span>
              {s.status === 'confirmado' || s.status === 'concluido' ? (
                <span className="text-sm font-semibold text-emerald-700">Confirmado</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void confirmar(s.id)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white active:bg-emerald-700"
                >
                  Aceito
                </button>
              )}
            </div>
          </div>
        ))}
        {servicos.length === 0 && <Vazio>Nenhum serviço marcado para você.</Vazio>}
      </div>
    </div>
  )
}
