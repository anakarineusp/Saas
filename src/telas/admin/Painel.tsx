import { useEffect, useState } from 'react'
import { Carregando, Erro, Vazio } from '../../componentes/Aviso'
import { painelClientes, painelResumo, pagamentos as buscarPagamentos, sair } from '../../dados'
import { dataCompleta, moeda } from '../../lib/formato'
import type { Cliente, Resumo } from '../../tipos'

type Pagamento = {
  id: string
  empresa_id: string
  valor_centavos: number
  status: string
  metodo: string | null
  vencimento: string | null
  pago_em: string | null
  criado_em: string
}

const CORES: Record<string, string> = {
  ativa: 'bg-emerald-100 text-emerald-700',
  teste: 'bg-sky-100 text-sky-700',
  atrasada: 'bg-amber-100 text-amber-700',
  cancelada: 'bg-slate-200 text-slate-600',
  pago: 'bg-emerald-100 text-emerald-700',
  pendente: 'bg-amber-100 text-amber-700',
  falhou: 'bg-red-100 text-red-700',
  estornado: 'bg-slate-200 text-slate-600',
}

function Etiqueta({ children }: { children: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CORES[children] ?? 'bg-slate-100 text-slate-600'}`}>
      {children}
    </span>
  )
}

function Numero({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${destaque ? 'border-slate-900 bg-slate-900' : 'border-slate-200 bg-white'}`}>
      <p className={`text-xs ${destaque ? 'text-slate-400' : 'text-slate-500'}`}>{rotulo}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${destaque ? 'text-white' : 'text-slate-900'}`}>{valor}</p>
    </div>
  )
}

/** Painel de quem vende o sistema: todos os clientes, assinaturas e pagamentos. */
export function Painel() {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [aba, setAba] = useState<'clientes' | 'pagamentos'>('clientes')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    void Promise.all([painelResumo(), painelClientes(), buscarPagamentos()])
      .then(([r, c, p]) => {
        setResumo(r)
        setClientes(c)
        setPagamentos(p as Pagamento[])
      })
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregando(false))
  }, [])

  if (carregando) return <Carregando />

  const nomeDaEmpresa = (id: string) => clientes.find((c) => c.id === id)?.nome ?? 'empresa removida'

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pt-6 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Administração</p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900">Clientes e pagamentos</h1>
        </div>
        <button type="button" onClick={() => void sair()} className="text-sm text-slate-500 underline">
          Sair
        </button>
      </div>

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      {resumo && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Numero rotulo="Recebido no mês" valor={moeda(resumo.recebido_mes_centavos)} destaque />
          <Numero rotulo="Mensal recorrente" valor={moeda(resumo.recorrente_centavos)} />
          <Numero rotulo="Assinantes" valor={String(resumo.assinantes)} />
          <Numero rotulo="Em teste" valor={String(resumo.em_teste)} />
        </div>
      )}

      <div className="mt-6 flex gap-1 rounded-xl bg-slate-200 p-1">
        {(['clientes', 'pagamentos'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize ${
              aba === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {aba === 'clientes' && (
        <div className="mt-4 space-y-2">
          {clientes.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{c.nome}</p>
                  <p className="text-xs text-slate-500">
                    {[c.cidade, c.telefone, c.documento].filter(Boolean).join(' · ') || 'sem dados de contato'}
                  </p>
                </div>
                <Etiqueta>{c.status ?? 'sem assinatura'}</Etiqueta>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-sm sm:grid-cols-4">
                <p className="text-slate-500">
                  Plano <span className="font-medium text-slate-900">{c.plano ?? '—'}</span>
                </p>
                <p className="text-slate-500">
                  Motoristas <span className="font-medium text-slate-900 tabular-nums">{c.motoristas}</span>
                </p>
                <p className="text-slate-500">
                  Serviços <span className="font-medium text-slate-900 tabular-nums">{c.servicos}</span>
                </p>
                <p className="text-slate-500">
                  Já pagou <span className="font-medium text-slate-900 tabular-nums">{moeda(c.pago_centavos)}</span>
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Entrou em {dataCompleta(c.criada_em)}
                {c.proxima_cobranca && ` · próxima cobrança em ${dataCompleta(c.proxima_cobranca)}`}
              </p>
            </div>
          ))}
          {clientes.length === 0 && <Vazio>Nenhuma empresa cadastrada ainda.</Vazio>}
        </div>
      )}

      {aba === 'pagamentos' && (
        <div className="mt-4 space-y-2">
          {pagamentos.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{nomeDaEmpresa(p.empresa_id)}</p>
                <p className="text-xs text-slate-500">
                  {[p.metodo, p.pago_em ? `pago em ${dataCompleta(p.pago_em)}` : p.vencimento ? `vence em ${dataCompleta(p.vencimento)}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Etiqueta>{p.status}</Etiqueta>
                <span className="font-semibold tabular-nums text-slate-900">{moeda(p.valor_centavos)}</span>
              </div>
            </div>
          ))}
          {pagamentos.length === 0 && <Vazio>Nenhum pagamento registrado ainda.</Vazio>}
        </div>
      )}
    </div>
  )
}
