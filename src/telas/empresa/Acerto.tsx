import { useCallback, useEffect, useState } from 'react'
import { Carregando, Erro, Vazio } from '../../componentes/Aviso'
import { Icone } from '../../componentes/Icone'
import {
  indicadores as buscarIndicadores, motoristas as buscarMotoristas, servicos as buscarServicos,
} from '../../dados'
import {
  dataCurta, mesAtual, mesPorExtenso, mesVizinho, moeda, primeiroDiaDoMes, rotuloTipo, ultimoDiaDoMes,
} from '../../lib/formato'
import { useSessao } from '../../sessao'
import type { Indicador, Motorista, Servico } from '../../tipos'

/** Uma linha do extrato do mês. */
function LinhaDaConta({ rotulo, valor, sinal }: { rotulo: string; valor: string; sinal?: '-' }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="text-sm text-fraca">{rotulo}</span>
      <span className="font-display text-sm font-semibold text-tinta tabular-nums">
        {sinal === '-' ? '− ' : ''}
        {valor}
      </span>
    </div>
  )
}

export function Acerto() {
  const { assinatura } = useSessao()
  const solo = assinatura?.modo === 'solo'
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

  // Serviço cancelado não entra na conta.
  const valem = servicos.filter((s) => s.status !== 'cancelado' && s.status !== 'recusado')
  const concluidos = valem.filter((s) => s.status === 'concluido')

  const faturado = valem.reduce((soma, s) => soma + (s.valor_centavos ?? 0), 0)
  const jaRodou = concluidos.reduce((soma, s) => soma + (s.valor_centavos ?? 0), 0)

  const porMotorista = motoristas
    .map((motorista) => {
      const meus = valem.filter((s) => s.motorista_id === motorista.id)
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
      const deles = valem.filter((s) => s.indicador_id === indicador.id)
      return {
        indicador,
        quantidade: deles.length,
        total: deles.reduce((soma, s) => soma + (s.comissao_indicador_centavos ?? 0), 0),
      }
    })
    .filter((linha) => linha.quantidade > 0)
    .sort((a, b) => b.total - a.total)

  const comissoes = porIndicador.reduce((soma, linha) => soma + linha.total, 0)
  // No Solo o valor do serviço já é do dono: só saem as comissões de indicação.
  const sobra = solo ? faturado - comissoes : faturado - aPagar - comissoes
  const margem = faturado > 0 ? Math.round((sobra / faturado) * 100) : 0

  if (carregando) return <Carregando />

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-tinta first-letter:uppercase">
          {mesPorExtenso(mes)}
        </h1>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => setMes(mesVizinho(mes, -1))}
            className="rounded-lg border border-borda px-3 py-1.5 text-fraca hover:border-bordaforte hover:text-tinta"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => setMes(mesVizinho(mes, 1))}
            className="rounded-lg border border-borda px-3 py-1.5 text-fraca hover:border-bordaforte hover:text-tinta"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      {/* O número que interessa primeiro, e embaixo dele a conta que o formou. */}
      <p className="mt-6 text-xs font-bold tracking-[0.15em] text-tenue uppercase">
        {solo ? 'Fica com você' : 'Sobra para a empresa'}
      </p>
      <p className="font-display mt-1 text-[2.75rem] leading-none font-extrabold text-tinta tabular-nums">
        {moeda(sobra)}
      </p>
      <p className="mt-2 text-sm text-tenue">
        {faturado > 0 ? `${margem}% do faturado` : 'Nenhum serviço neste mês'}
        {jaRodou > 0 && ` · ${moeda(jaRodou)} já concluído`}
      </p>

      <div className="painel mt-5 rounded-2xl px-4 py-1">
        <LinhaDaConta rotulo="Faturado" valor={moeda(faturado)} />
        {!solo && <LinhaDaConta rotulo="A pagar aos motoristas" valor={moeda(aPagar)} sinal="-" />}
        <LinhaDaConta rotulo="Comissões de indicação" valor={moeda(comissoes)} sinal="-" />
      </div>

      {!solo && <p className="mt-6 mb-2 text-xs font-bold tracking-[0.15em] text-tenue uppercase">Motoristas</p>}
      <div
        className={
          solo || porMotorista.length === 0
            ? 'hidden'
            : 'painel divide-y divide-borda overflow-hidden rounded-2xl'
        }
      >
        {porMotorista.map(({ motorista, servicos: meus, total }) => (
          <div key={motorista.id}>
            <button
              type="button"
              onClick={() => setAberto(aberto === motorista.id ? null : motorista.id)}
              aria-expanded={aberto === motorista.id}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <span>
                <span className="block font-semibold text-tinta">{motorista.nome}</span>
                <span className="block text-xs text-tenue">
                  {meus.length} {meus.length === 1 ? 'serviço' : 'serviços'} · {motorista.percentual}%
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-display font-bold text-tinta tabular-nums">{moeda(total)}</span>
                <Icone
                  nome="seta"
                  className={`h-4 w-4 text-tenue transition-transform ${aberto === motorista.id ? 'rotate-90' : ''}`}
                />
              </span>
            </button>

            {aberto === motorista.id && (
              <div className="border-t border-borda bg-fundo2/60 px-4 py-2">
                {meus.map((s) => (
                  <div key={s.id} className="flex justify-between gap-3 py-1.5 text-sm">
                    <span className="text-fraca">
                      <span className="tabular-nums">{dataCurta(s.data)}</span> · {rotuloTipo(s.tipo)} · {s.passageiro}
                    </span>
                    <span className="shrink-0 text-tinta tabular-nums">{moeda(s.valor_motorista_centavos)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {!solo && porMotorista.length === 0 && (
        <Vazio titulo="Nenhum serviço com motorista neste mês" />
      )}

      {porIndicador.length > 0 && (
        <>
          <p className="mt-6 mb-2 text-xs font-bold tracking-[0.15em] text-tenue uppercase">Indicadores</p>
          <div className="painel divide-y divide-borda overflow-hidden rounded-2xl">
            {porIndicador.map(({ indicador, quantidade, total }) => (
              <div key={indicador.id} className="flex items-center justify-between gap-3 p-4">
                <span>
                  <span className="block font-semibold text-tinta">{indicador.nome}</span>
                  <span className="block text-xs text-tenue">
                    {quantidade} {quantidade === 1 ? 'indicação' : 'indicações'} · {indicador.comissao}%
                  </span>
                </span>
                <span className="font-display font-bold text-tinta tabular-nums">{moeda(total)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
