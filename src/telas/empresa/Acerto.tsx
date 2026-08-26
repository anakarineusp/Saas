import { useCallback, useEffect, useState } from 'react'
import { Carregando, Erro, Vazio } from '../../componentes/Aviso'
import { motoristas as buscarMotoristas, indicadores as buscarIndicadores, servicos as buscarServicos } from '../../dados'
import {
  dataCurta, mesAtual, mesPorExtenso, mesVizinho, moeda, primeiroDiaDoMes, rotuloTipo, ultimoDiaDoMes,
} from '../../lib/formato'
import type { Indicador, Motorista, Servico } from '../../tipos'

export function Acerto() {
  const [mes, setMes] = useState(mesAtual())
  const [servicos, setServicos] = useState<Servico[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [indicadores, setIndicadores] = useState<Indicador[]>([])
  const [aberto, setAberto] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [s, m, i] = await Promise.all([
        buscarServicos(primeiroDiaDoMes(mes), ultimoDiaDoMes(mes)),
        buscarMotoristas(),
        buscarIndicadores(),
      ])
      setServicos(s)
      setMotoristas(m)
      setIndicadores(i)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [mes])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const faturado = servicos.reduce((soma, s) => soma + (s.valor_centavos ?? 0), 0)

  const porMotorista = motoristas
    .map((motorista) => {
      const meus = servicos.filter((s) => s.motorista_id === motorista.id)
      return {
        motorista,
        servicos: meus,
        total: meus.reduce((soma, s) => soma + s.valor_motorista_centavos, 0),
      }
    })
    .filter((linha) => linha.servicos.length > 0)
    .sort((a, b) => b.total - a.total)

  const aPagar = porMotorista.reduce((soma, linha) => soma + linha.total, 0)

  const porIndicador = indicadores
    .map((indicador) => {
      const deles = servicos.filter((s) => s.indicador_id === indicador.id)
      return {
        indicador,
        quantidade: deles.length,
        total: deles.reduce((soma, s) => soma + (s.comissao_indicador_centavos ?? 0), 0),
      }
    })
    .filter((linha) => linha.quantidade > 0)
    .sort((a, b) => b.total - a.total)

  if (carregando) return <Carregando />

  return (
    <div className="px-4 pt-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => setMes(mesVizinho(mes, -1))}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 active:bg-slate-100"
        >
          ‹
        </button>
        <h1 className="text-lg font-bold text-slate-900 first-letter:uppercase">{mesPorExtenso(mes)}</h1>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => setMes(mesVizinho(mes, 1))}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 active:bg-slate-100"
        >
          ›
        </button>
      </div>

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Faturado</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{moeda(faturado)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">A pagar</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-white">{moeda(aPagar)}</p>
        </div>
      </div>

      <p className="mt-6 mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Motoristas</p>
      <div className="space-y-2">
        {porMotorista.map(({ motorista, servicos: meus, total }) => (
          <div key={motorista.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setAberto(aberto === motorista.id ? null : motorista.id)}
              className="flex w-full items-center justify-between gap-3 p-3.5 text-left active:bg-slate-50"
            >
              <span>
                <span className="block font-medium text-slate-900">{motorista.nome}</span>
                <span className="block text-xs text-slate-500">
                  {meus.length} {meus.length === 1 ? 'serviço' : 'serviços'} · {motorista.percentual}%
                </span>
              </span>
              <span className="font-semibold tabular-nums text-slate-900">{moeda(total)}</span>
            </button>

            {aberto === motorista.id && (
              <div className="border-t border-slate-100 bg-slate-50 px-3.5 py-2">
                {meus.map((s) => (
                  <div key={s.id} className="flex justify-between gap-3 py-1.5 text-sm">
                    <span className="text-slate-600">
                      <span className="tabular-nums">{dataCurta(s.data)}</span> · {rotuloTipo(s.tipo)} · {s.passageiro}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-900">{moeda(s.valor_motorista_centavos)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {porMotorista.length === 0 && <Vazio>Nenhum serviço com motorista neste mês.</Vazio>}
      </div>

      {porIndicador.length > 0 && (
        <>
          <p className="mt-6 mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Indicadores</p>
          <div className="space-y-2">
            {porIndicador.map(({ indicador, quantidade, total }) => (
              <div
                key={indicador.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5"
              >
                <span>
                  <span className="block font-medium text-slate-900">{indicador.nome}</span>
                  <span className="block text-xs text-slate-500">
                    {quantidade} {quantidade === 1 ? 'indicação' : 'indicações'} · {indicador.comissao}%
                  </span>
                </span>
                <span className="font-semibold tabular-nums text-slate-900">{moeda(total)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
