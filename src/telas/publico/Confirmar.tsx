import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Carregando, Erro } from '../../componentes/Aviso'
import { confirmarPeloLink, servicoDoLink } from '../../dados'
import { dataPorExtenso, hora, moeda, rotuloTipo } from '../../lib/formato'
import type { ServicoDoLink } from '../../tipos'

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex gap-3 border-t border-slate-100 py-2.5 first:border-t-0 first:pt-0">
      <span className="w-20 shrink-0 text-sm text-slate-500">{rotulo}</span>
      <span className="text-sm font-medium text-slate-900">{valor}</span>
    </div>
  )
}

/**
 * Tela que o motorista abre pelo link do WhatsApp, sem login nenhum.
 * Mostra os dados do serviço e o valor dele — nunca o valor cobrado do cliente.
 */
export function Confirmar() {
  const { token = '' } = useParams()
  const [servico, setServico] = useState<ServicoDoLink | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)

  useEffect(() => {
    void servicoDoLink(token)
      .then(setServico)
      .catch(() => setServico(null))
      .finally(() => setCarregando(false))
  }, [token])

  async function aceitar() {
    setErro('')
    setIndo(true)
    try {
      await confirmarPeloLink(token)
      setServico((s) => (s ? { ...s, confirmado: true } : s))
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo(false)
    }
  }

  if (carregando) return <Carregando />

  if (!servico) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-semibold text-slate-900">Link expirado</p>
        <p className="mt-2 text-sm text-slate-500">Peça um novo link para a central.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pt-8 pb-10">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Olá, {servico.motorista}</p>
      <h1 className="mt-0.5 text-2xl font-bold text-slate-900 first-letter:uppercase">
        {dataPorExtenso(servico.data)}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {hora(servico.hora)} · {rotuloTipo(servico.tipo)} · {servico.empresa}
      </p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <Item rotulo="Passageiro" valor={`${servico.passageiro} (${servico.pax} pax)`} />
        {servico.voo && <Item rotulo="Voo" valor={servico.voo} />}
        <Item rotulo="Buscar" valor={servico.origem} />
        <Item rotulo="Levar" valor={servico.destino} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-900 p-5 text-center">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Seu valor</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-white">
          {moeda(servico.valor_motorista_centavos)}
        </p>
      </div>

      <div className="mt-6">
        <Erro>{erro}</Erro>
      </div>

      {servico.confirmado ? (
        <div className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-4 font-semibold text-emerald-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="m5 13 4 4L19 7" />
          </svg>
          Serviço confirmado
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void aceitar()}
          disabled={indo}
          className="mt-2 w-full rounded-2xl bg-emerald-600 px-4 py-4 text-lg font-semibold text-white active:bg-emerald-700 disabled:opacity-50"
        >
          {indo ? 'Confirmando…' : 'Aceito'}
        </button>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Qualquer imprevisto, avise a central pelo WhatsApp.
      </p>
    </div>
  )
}
