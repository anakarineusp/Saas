import { useId, useState } from 'react'
import { moeda } from '../lib/formato'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function rotuloDoMes(mes: string) {
  const [, m] = mes.split('-').map(Number)
  return MESES[m - 1] ?? mes
}

/**
 * Faturamento mês a mês. Uma série só, então não precisa de legenda: o título
 * já diz o que é. A grade fica bem apagada para não competir com os dados, e
 * quem quiser o número exato passa o dedo em cima ou abre a tabela.
 */
export function GraficoDeMeses({
  dados,
  titulo,
}: {
  dados: { mes: string; recebido_centavos: number }[]
  titulo: string
}) {
  const [emCima, setEmCima] = useState<number | null>(null)
  const [tabela, setTabela] = useState(false)
  const id = useId()

  if (dados.length === 0) {
    return (
      <div className="painel rounded-2xl p-6 text-center text-sm text-tenue">
        Ainda não há faturamento para mostrar.
      </div>
    )
  }

  const L = 640
  const A = 200
  const margem = { cima: 16, baixo: 26, esquerda: 8, direita: 8 }
  const maior = Math.max(...dados.map((d) => d.recebido_centavos), 1)

  const x = (i: number) =>
    margem.esquerda +
    (i * (L - margem.esquerda - margem.direita)) / Math.max(dados.length - 1, 1)
  const y = (v: number) =>
    margem.cima + (1 - v / maior) * (A - margem.cima - margem.baixo)

  const linha = dados.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.recebido_centavos)}`).join(' ')
  const area = `${linha} L ${x(dados.length - 1)} ${A - margem.baixo} L ${x(0)} ${A - margem.baixo} Z`
  const ultimo = dados[dados.length - 1]

  return (
    <div className="painel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-tinta">{titulo}</h3>
          <p className="mt-0.5 text-xs text-tenue">
            Último mês: <span className="text-fraca tabular-nums">{moeda(ultimo.recebido_centavos)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTabela((t) => !t)}
          className="shrink-0 text-xs font-semibold text-fraca underline underline-offset-2 hover:text-tinta"
        >
          {tabela ? 'ver gráfico' : 'ver números'}
        </button>
      </div>

      {tabela ? (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-tenue">
              <th className="pb-2 font-medium">Mês</th>
              <th className="pb-2 text-right font-medium">Recebido</th>
            </tr>
          </thead>
          <tbody>
            {[...dados].reverse().map((d) => (
              <tr key={d.mes} className="border-t border-borda">
                <td className="py-1.5 text-fraca">{d.mes}</td>
                <td className="py-1.5 text-right text-tinta tabular-nums">{moeda(d.recebido_centavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative mt-4">
          <svg
            viewBox={`0 0 ${L} ${A}`}
            className="w-full"
            role="img"
            aria-label={`${titulo}. Último mês ${moeda(ultimo.recebido_centavos)}.`}
            onMouseLeave={() => setEmCima(null)}
          >
            <defs>
              <linearGradient id={`fundo-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--c-destaque)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--c-destaque)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* grade discreta: só as horizontais, para o olho ter referência */}
            {[0, 0.5, 1].map((f) => (
              <line
                key={f}
                x1={margem.esquerda}
                x2={L - margem.direita}
                y1={y(maior * f)}
                y2={y(maior * f)}
                stroke="var(--c-borda)"
                strokeWidth="1"
              />
            ))}

            <path d={area} fill={`url(#fundo-${id})`} />
            <path d={linha} fill="none" stroke="var(--c-destaque)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {emCima !== null && (
              <line
                x1={x(emCima)}
                x2={x(emCima)}
                y1={margem.cima}
                y2={A - margem.baixo}
                stroke="var(--c-bordaforte)"
                strokeWidth="1"
              />
            )}

            <circle
              cx={x(dados.length - 1)}
              cy={y(ultimo.recebido_centavos)}
              r="4"
              fill="var(--c-destaque)"
              stroke="var(--c-superficie)"
              strokeWidth="2"
            />

            {emCima !== null && (
              <circle
                cx={x(emCima)}
                cy={y(dados[emCima].recebido_centavos)}
                r="5"
                fill="var(--c-destaque)"
                stroke="var(--c-superficie)"
                strokeWidth="2"
              />
            )}

            {/* alvos generosos para o dedo, invisíveis */}
            {dados.map((d, i) => (
              <rect
                key={d.mes}
                x={x(i) - (L / dados.length) / 2}
                y={0}
                width={L / dados.length}
                height={A}
                fill="transparent"
                onMouseEnter={() => setEmCima(i)}
                onFocus={() => setEmCima(i)}
                tabIndex={0}
                role="button"
                aria-label={`${d.mes}: ${moeda(d.recebido_centavos)}`}
              />
            ))}

            {dados.map((d, i) =>
              i % Math.ceil(dados.length / 6) === 0 || i === dados.length - 1 ? (
                <text
                  key={`r-${d.mes}`}
                  x={x(i)}
                  y={A - 6}
                  textAnchor="middle"
                  className="fill-[var(--c-tenue)] text-[11px]"
                >
                  {rotuloDoMes(d.mes)}
                </text>
              ) : null,
            )}
          </svg>

          {emCima !== null && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-borda bg-fundo2 px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
              style={{ left: `${(x(emCima) / L) * 100}%`, top: 0 }}
            >
              <span className="block text-tenue">{dados[emCima].mes}</span>
              <span className="block font-semibold text-tinta tabular-nums">
                {moeda(dados[emCima].recebido_centavos)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
