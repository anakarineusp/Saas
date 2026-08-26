import { dataPorExtenso, emMinutos, hojeISO, moeda, rotuloTipo } from '../lib/formato'
import type { Dados, Servico } from '../types'

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-emerald-600">
      <path d="m5 13 4 4L19 7" />
    </svg>
  )
}

function Cartao({ servico, dados, aoTocar }: { servico: Servico; dados: Dados; aoTocar: () => void }) {
  const motorista = dados.motoristas.find((m) => m.id === servico.motoristaId)
  const semMotorista = !motorista

  return (
    <button
      type="button"
      onClick={aoTocar}
      className={`w-full rounded-2xl bg-white p-3.5 text-left shadow-sm active:bg-slate-50 ${
        semMotorista ? 'border-2 border-red-400' : 'border border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold tabular-nums text-slate-900">{servico.hora}</span>
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
          {rotuloTipo(servico.tipo)}
        </span>
        <span className="text-xs text-slate-500">{servico.pax} pax</span>
      </div>

      <p className="mt-1.5 font-medium text-slate-900">
        {servico.passageiro}
        {servico.voo && <span className="ml-2 text-xs font-normal text-slate-500">Voo {servico.voo}</span>}
      </p>

      <p className="mt-0.5 text-sm text-slate-500">
        {servico.origem} <span className="text-slate-400">→</span> {servico.destino}
      </p>

      <div className="mt-2.5 flex items-end justify-between gap-3 border-t border-slate-100 pt-2.5">
        {motorista ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            {motorista.nome}
            <span className="font-normal text-slate-400">· {motorista.veiculo}</span>
            {servico.status === 'confirmado' && <Check />}
          </span>
        ) : (
          <span className="text-sm font-semibold text-red-600">Sem motorista</span>
        )}
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
          {moeda(servico.valor)}
        </span>
      </div>
    </button>
  )
}

export function Hoje({ dados, aoAbrirServico }: { dados: Dados; aoAbrirServico: (id: string) => void }) {
  const hoje = hojeISO()
  const servicos = dados.servicos
    .filter((s) => s.data === hoje)
    .sort((a, b) => emMinutos(a.hora) - emMinutos(b.hora))

  const semMotorista = servicos.filter((s) => !s.motoristaId).length
  const motoristasDoDia = new Set(servicos.map((s) => s.motoristaId).filter(Boolean)).size

  return (
    <div className="px-4 pt-5">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Hoje</p>
      <h1 className="mt-0.5 text-2xl font-bold text-slate-900 first-letter:uppercase">
        {dataPorExtenso(hoje)}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {servicos.length} {servicos.length === 1 ? 'serviço' : 'serviços'} · {motoristasDoDia}{' '}
        {motoristasDoDia === 1 ? 'motorista' : 'motoristas'}
      </p>

      {semMotorista > 0 && (
        <div className="mt-4 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">
          {semMotorista} {semMotorista === 1 ? 'serviço sem motorista' : 'serviços sem motorista'}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {servicos.map((servico) => (
          <Cartao
            key={servico.id}
            servico={servico}
            dados={dados}
            aoTocar={() => aoAbrirServico(servico.id)}
          />
        ))}
        {servicos.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Nenhum serviço para hoje.
          </p>
        )}
      </div>
    </div>
  )
}
