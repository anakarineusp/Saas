import { useCallback, useEffect, useState } from 'react'
import { Carregando, Erro, Vazio } from '../../componentes/Aviso'
import { Icone } from '../../componentes/Icone'
import {
  indicadores as buscarIndicadores, motoristas as buscarMotoristas, servicos as buscarServicos,
} from '../../dados'
import {
  dataCurta, mesAtual, mesPorExtenso, mesVizinho, moeda, primeiroDiaDoMes, rotuloTipo, ultimoDiaDoMes,
} from '../../lib/formato'
import type { Indicador, Motorista, Servico } from '../../tipos'

function Numero({
  rotulo,
  valor,
  tom = 'normal',
  dica,
}: {
  rotulo: string
  valor: string
  tom?: 'normal' | 'destaque' | 'saida'
  dica?: string
}) {
  const estilos = {
    normal: 'painel',
    destaque: 'border border-destaque/40 bg-destaque/10',
    saida: 'painel',
  }
  const cor = tom === 'destaque' ? 'text-destaque' : tom === 'saida' ? 'text-fraca' : 'text-tinta'
  return (
    <div className={`rounded-2xl p-4 ${estilos[tom]}`}>
      <p className="text-xs text-tenue">{rotulo}</p>
      <p className={`font-display mt-1 text-xl font-bold tabular-nums ${cor}`}>{valor}</p>
      {dica && <p className="mt-0.5 text-[11px] text-tenue">{dica}</p>}
    </div>
  )
}

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
  const sobra = faturado - aPagar - comissoes
  const margem = faturado > 0 ? Math.round((sobra / faturado) * 100) : 0

  if (carregando) return <Carregando />

  return (
    <div className="px-4 pt-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => setMes(mesVizinho(mes, -1))}
          className="rounded-xl border border-borda bg-superficie px-3 py-2 text-fraca hover:text-tinta"
        >
          ‹
        </button>
        <h1 className="font-display text-lg font-bold text-tinta first-letter:uppercase">{mesPorExtenso(mes)}</h1>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => setMes(mesVizinho(mes, 1))}
          className="rounded-xl border border-borda bg-superficie px-3 py-2 text-fraca hover:text-tinta"
        >
          ›
        </button>
      </div>

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Numero
          rotulo="Faturado"
          valor={moeda(faturado)}
          dica={`${moeda(jaRodou)} já concluído`}
        />
        <Numero rotulo="A pagar aos motoristas" valor={moeda(aPagar)} tom="saida" />
        <Numero rotulo="Comissões de indicação" valor={moeda(comissoes)} tom="saida" />
        <Numero
          rotulo="Sobra para a empresa"
          valor={moeda(sobra)}
          tom="destaque"
          dica={faturado > 0 ? `${margem}% do faturado` : undefined}
        />
      </div>

      <p className="mt-6 mb-2 text-xs font-bold tracking-[0.15em] text-tenue uppercase">Motoristas</p>
      <div className="space-y-2">
        {porMotorista.map(({ motorista, servicos: meus, total }) => (
          <div key={motorista.id} className="painel overflow-hidden rounded-2xl">
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
        {porMotorista.length === 0 && <Vazio titulo="Nenhum serviço com motorista neste mês" />}
      </div>

      {porIndicador.length > 0 && (
        <>
          <p className="mt-6 mb-2 text-xs font-bold tracking-[0.15em] text-tenue uppercase">Indicadores</p>
          <div className="space-y-2">
            {porIndicador.map(({ indicador, quantidade, total }) => (
              <div key={indicador.id} className="painel flex items-center justify-between gap-3 rounded-2xl p-4">
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
