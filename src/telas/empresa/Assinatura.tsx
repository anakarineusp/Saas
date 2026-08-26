import { useEffect, useState } from 'react'
import { Carregando, Erro } from '../../componentes/Aviso'
import { abrirCheckout, escolherPlano, planos as buscarPlanos } from '../../dados'
import { dataCompleta, moeda } from '../../lib/formato'
import { useSessao } from '../../sessao'
import type { Plano } from '../../tipos'

const EXPLICACAO: Record<string, string> = {
  teste: 'Você está no teste grátis.',
  ativa: 'Assinatura em dia.',
  atrasada: 'Encontramos um pagamento em atraso.',
  cancelada: 'Sua assinatura está cancelada.',
}

export function Assinatura() {
  const { assinatura, recarregar } = useSessao()
  const [planos, setPlanos] = useState<Plano[]>([])
  const [carregando, setCarregando] = useState(true)
  const [indo, setIndo] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    void buscarPlanos()
      .then(setPlanos)
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregando(false))
  }, [])

  async function assinar(plano: Plano) {
    setErro('')
    setIndo(plano.id)
    try {
      await escolherPlano(plano.id)
      await recarregar()
      const checkout = await abrirCheckout(plano.id)
      window.location.href = checkout
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo('')
    }
  }

  if (carregando) return <Carregando />

  return (
    <div className="px-4 pt-5">
      <h1 className="text-2xl font-bold text-slate-900">Assinatura</h1>

      {assinatura && (
        <div
          className={`mt-4 rounded-2xl border p-4 ${
            assinatura.pode_usar ? 'border-slate-200 bg-white' : 'border-red-300 bg-red-50'
          }`}
        >
          <p className="font-semibold text-slate-900">{EXPLICACAO[assinatura.status] ?? assinatura.status}</p>
          {assinatura.status === 'teste' && (
            <p className="mt-1 text-sm text-slate-600">
              {assinatura.dias_de_teste > 0
                ? `Faltam ${assinatura.dias_de_teste} ${assinatura.dias_de_teste === 1 ? 'dia' : 'dias'} — até ${dataCompleta(assinatura.teste_termina_em)}.`
                : 'O teste terminou. Escolha um plano para continuar usando.'}
            </p>
          )}
          {assinatura.status === 'ativa' && assinatura.plano && (
            <p className="mt-1 text-sm text-slate-600">
              Plano {assinatura.plano} · {moeda(assinatura.preco_centavos)} por mês
              {assinatura.proxima_cobranca && ` · próxima cobrança em ${dataCompleta(assinatura.proxima_cobranca)}`}
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      <p className="mt-6 mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Planos</p>
      <div className="space-y-3">
        {planos.map((plano) => {
          const atual = assinatura?.plano_id === plano.id && assinatura.status === 'ativa'
          return (
            <div key={plano.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-slate-900">{plano.nome}</span>
                <span className="font-bold tabular-nums text-slate-900">
                  {moeda(plano.preco_centavos)}
                  <span className="text-xs font-normal text-slate-500"> /mês</span>
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{plano.descricao}</p>
              <p className="mt-1 text-xs text-slate-500">
                {plano.limite_motoristas ? `Até ${plano.limite_motoristas} motoristas` : 'Motoristas à vontade'}
              </p>
              <button
                type="button"
                disabled={atual || indo !== ''}
                onClick={() => void assinar(plano)}
                className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white active:bg-slate-700 disabled:opacity-40"
              >
                {atual ? 'Seu plano atual' : indo === plano.id ? 'Abrindo o pagamento…' : 'Assinar'}
              </button>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        O pagamento é feito por PIX, boleto ou cartão, com renovação mensal. Cancele quando quiser.
      </p>
    </div>
  )
}
