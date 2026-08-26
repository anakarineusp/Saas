import { useCallback, useEffect, useState } from 'react'
import { Carregando, Erro, Vazio } from '../../componentes/Aviso'
import { Folha } from '../../componentes/Folha'
import { indicadores as buscarIndicadores, motoristas as buscarMotoristas, servicos as buscarServicos } from '../../dados'
import { dataCurta, dataPorExtenso, hora, hojeISO, moeda, rotuloTipo } from '../../lib/formato'
import type { Indicador, Motorista, Servico } from '../../tipos'
import { Atribuir } from './Atribuir'

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-emerald-600">
      <path d="m5 13 4 4L19 7" />
    </svg>
  )
}

function Cartao({ servico, aoTocar }: { servico: Servico; aoTocar: () => void }) {
  const semMotorista = !servico.motorista_id

  return (
    <button
      type="button"
      onClick={aoTocar}
      className={`w-full rounded-2xl bg-white p-3.5 text-left shadow-sm active:bg-slate-50 ${
        semMotorista ? 'border-2 border-red-400' : 'border border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold tabular-nums text-slate-900">{hora(servico.hora)}</span>
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
        {servico.motorista ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            {servico.motorista}
            <span className="font-normal text-slate-400">· {servico.veiculo}</span>
            {servico.status === 'confirmado' && <Check />}
          </span>
        ) : (
          <span className="text-sm font-semibold text-red-600">Sem motorista</span>
        )}
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
          {moeda(servico.valor_centavos)}
        </span>
      </div>
    </button>
  )
}

export function Hoje() {
  const [dia, setDia] = useState(hojeISO())
  const [servicos, setServicos] = useState<Servico[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [indicadores, setIndicadores] = useState<Indicador[]>([])
  const [aberto, setAberto] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [s, m, i] = await Promise.all([buscarServicos(dia, dia), buscarMotoristas(), buscarIndicadores()])
      setServicos(s)
      setMotoristas(m)
      setIndicadores(i)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [dia])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const semMotorista = servicos.filter((s) => !s.motorista_id).length
  const motoristasDoDia = new Set(servicos.map((s) => s.motorista_id).filter(Boolean)).size
  const servico = servicos.find((s) => s.id === aberto) ?? null

  if (carregando) return <Carregando />

  return (
    <div className="px-4 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {dia === hojeISO() ? 'Hoje' : 'Agenda'}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900 first-letter:uppercase">{dataPorExtenso(dia)}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {servicos.length} {servicos.length === 1 ? 'serviço' : 'serviços'} · {motoristasDoDia}{' '}
            {motoristasDoDia === 1 ? 'motorista' : 'motoristas'}
          </p>
        </div>
        <input
          type="date"
          value={dia}
          onChange={(e) => setDia(e.target.value || hojeISO())}
          aria-label="Escolher o dia"
          className="mt-1 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
        />
      </div>

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      {semMotorista > 0 && (
        <div className="mt-4 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">
          {semMotorista} {semMotorista === 1 ? 'serviço sem motorista' : 'serviços sem motorista'}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {servicos.map((s) => (
          <Cartao key={s.id} servico={s} aoTocar={() => setAberto(s.id)} />
        ))}
        {servicos.length === 0 && <Vazio>Nenhum serviço neste dia.</Vazio>}
      </div>

      <Folha
        aberta={servico !== null}
        aoFechar={() => setAberto(null)}
        titulo={servico ? `${dataCurta(servico.data)} às ${hora(servico.hora)}` : ''}
      >
        {servico && (
          <Atribuir
            servico={servico}
            servicos={servicos}
            motoristas={motoristas}
            indicadores={indicadores}
            aoMudar={carregar}
          />
        )}
      </Folha>
    </div>
  )
}
