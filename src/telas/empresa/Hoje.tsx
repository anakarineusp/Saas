import { useCallback, useEffect, useState } from 'react'

import { Carregando, Erro, Vazio } from '../../componentes/Aviso'
import { Botao, BotaoLink } from '../../componentes/Botao'
import { EtiquetaDeStatus } from '../../componentes/Etiqueta'
import { Folha } from '../../componentes/Folha'
import { Icone } from '../../componentes/Icone'
import {
  indicadores as buscarIndicadores,
  motoristas as buscarMotoristas,
  servicos as buscarServicos,
  linkDoServico,
} from '../../dados'
import { dataCurta, dataPorExtenso, hora, hojeISO, moeda, paraISO, rotuloTipo } from '../../lib/formato'
import { abrirWhatsApp, mensagemParaMotorista } from '../../lib/whatsapp'
import { useAvisar } from '../../componentes/Avisos'
import type { Indicador, Motorista, Servico } from '../../tipos'
import { Atribuir } from './Atribuir'

function Cartao({ servico, aoTocar }: { servico: Servico; aoTocar: () => void }) {
  const semMotorista = !servico.motorista_id && servico.status !== 'cancelado'
  const cancelado = servico.status === 'cancelado'

  return (
    <button
      type="button"
      onClick={aoTocar}
      className={`w-full rounded-2xl p-4 text-left transition-all duration-150 active:scale-[0.99] ${
        cancelado
          ? 'painel opacity-50'
          : semMotorista
            ? 'painel border-l-2 border-l-alerta'
            : 'painel'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-display font-bold text-tinta tabular-nums">{hora(servico.hora)}</span>
          <span className="rounded-md bg-superficie2 px-1.5 py-0.5 text-xs font-medium text-fraca">
            {rotuloTipo(servico.tipo)}
          </span>
          <span className="text-xs text-tenue">{servico.pax} pax</span>
        </div>
        <EtiquetaDeStatus status={servico.status} />
      </div>

      <p className="mt-2 font-semibold text-tinta">
        {servico.passageiro}
        {servico.voo && <span className="ml-2 text-xs font-normal text-tenue">Voo {servico.voo}</span>}
      </p>

      <p className="mt-0.5 text-sm text-fraca">
        {servico.origem} <span className="text-tenue">→</span> {servico.destino}
      </p>

      {servico.motivo && (
        <p className="mt-2 text-xs text-alerta">Motivo: {servico.motivo}</p>
      )}

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-borda pt-3">
        {servico.motorista ? (
          <span className="text-sm font-medium text-fraca">
            {servico.motorista} <span className="text-tenue">· {servico.veiculo}</span>
          </span>
        ) : (
          <span className="text-sm font-medium text-alerta">Escalar motorista</span>
        )}
        <span className="shrink-0 font-display text-sm font-bold text-tinta tabular-nums">
          {moeda(servico.valor_centavos)}
        </span>
      </div>
    </button>
  )
}

export function Hoje() {
  const avisar = useAvisar()
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

  const ativos = servicos.filter((s) => s.status !== 'cancelado')
  const semMotorista = ativos.filter((s) => !s.motorista_id).length
  const aguardando = ativos.filter((s) => s.status === 'atribuido')
  const recusados = ativos.filter((s) => s.status === 'recusado').length
  const motoristasDoDia = new Set(ativos.map((s) => s.motorista_id).filter(Boolean)).size
  const servico = servicos.find((s) => s.id === aberto) ?? null

  const outroDia = (passos: number) => {
    const d = new Date(`${dia}T12:00:00`)
    d.setDate(d.getDate() + passos)
    setDia(paraISO(d))
  }

  /** Cobra de novo quem ainda não respondeu, sem precisar abrir cada serviço. */
  async function recobrar() {
    setErro('')
    try {
      for (const s of aguardando) {
        const motorista = motoristas.find((m) => m.id === s.motorista_id)
        if (!motorista) continue
        const token = await linkDoServico(s.id)
        abrirWhatsApp(motorista.telefone, mensagemParaMotorista(s, token))
      }
      avisar(`Mensagem aberta para ${aguardando.length} motorista${aguardando.length > 1 ? 's' : ''}`)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  if (carregando) return <Carregando />

  const primeiraVez = motoristas.length === 0 && servicos.length === 0

  return (
    <div className="px-5 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">
            {dia === hojeISO() ? 'Hoje' : 'Agenda'}
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold text-tinta first-letter:uppercase">
            {dataPorExtenso(dia)}
          </h1>
          <p className="mt-1 text-sm text-fraca">
            {ativos.length} {ativos.length === 1 ? 'serviço' : 'serviços'} · {motoristasDoDia}{' '}
            {motoristasDoDia === 1 ? 'motorista' : 'motoristas'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-borda bg-superficie p-1">
          <button
            type="button"
            aria-label="Dia anterior"
            onClick={() => outroDia(-1)}
            className="rounded-lg px-2 py-1.5 text-fraca hover:bg-superficie2 hover:text-tinta"
          >
            ‹
          </button>
          <input
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value || hojeISO())}
            aria-label="Escolher o dia"
            className="w-[7.5rem] bg-transparent text-center text-sm text-tinta outline-none"
          />
          <button
            type="button"
            aria-label="Próximo dia"
            onClick={() => outroDia(1)}
            className="rounded-lg px-2 py-1.5 text-fraca hover:bg-superficie2 hover:text-tinta"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      {(semMotorista > 0 || aguardando.length > 0 || recusados > 0) && (
        <div className="mt-4 space-y-2">
          <div className="painel divide-y divide-borda rounded-2xl">
            {semMotorista > 0 && (
              <p className="flex items-center gap-2.5 px-4 py-3 text-sm">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-alerta" />
                <span className="font-semibold text-tinta">
                  {semMotorista} {semMotorista === 1 ? 'serviço' : 'serviços'} sem motorista
                </span>
              </p>
            )}
            {recusados > 0 && (
              <p className="flex items-center gap-2.5 px-4 py-3 text-sm">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-alerta" />
                <span className="font-semibold text-tinta">
                  {recusados} {recusados === 1 ? 'recusado' : 'recusados'}
                </span>
                <span className="text-tenue">precisa de outro motorista</span>
              </p>
            )}
            {aguardando.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <p className="flex items-center gap-2.5 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-atencao" />
                  <span className="font-semibold text-tinta">{aguardando.length} sem resposta</span>
                </p>
                <Botao tom="fantasma" tamanho="pequeno" onClick={() => void recobrar()}>
                  Cobrar de novo
                </Botao>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {servicos.map((s, i) => (
          <div key={s.id} className="entra" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
            <Cartao servico={s} aoTocar={() => setAberto(s.id)} />
          </div>
        ))}

        {servicos.length === 0 &&
          (primeiraVez ? (
            <div className="painel rounded-2xl p-6">
              <h2 className="font-display text-lg font-bold text-tinta">Bem-vinda! Vamos em três passos</h2>
              <ol className="mt-4 space-y-3">
                {[
                  { n: 1, t: 'Cadastre um motorista', d: 'Nome, WhatsApp, carro e o percentual dele.' },
                  { n: 2, t: 'Cadastre quem indica', d: 'Hotéis e pousadas que mandam passageiro. Opcional.' },
                  { n: 3, t: 'Lance o primeiro serviço', d: 'E escale o motorista tocando no cartão aqui na Hoje.' },
                ].map((passo) => (
                  <li key={passo.n} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destaque/15 text-xs font-bold text-destaque">
                      {passo.n}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-tinta">{passo.t}</span>
                      <span className="block text-xs text-fraca">{passo.d}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-5">
                <BotaoLink para="/app/cadastros" largo>
                  Começar pelos cadastros
                  <Icone nome="seta" className="h-4 w-4" />
                </BotaoLink>
              </div>
            </div>
          ) : (
            <Vazio
              titulo="Nenhum serviço neste dia"
              acao={
                <BotaoLink para="/app/cadastros" tom="contorno" tamanho="pequeno">
                  Lançar um serviço
                </BotaoLink>
              }
            >
              Use as setas acima para ver outro dia.
            </Vazio>
          ))}
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
            aoFechar={() => setAberto(null)}
          />
        )}
      </Folha>
    </div>
  )
}
