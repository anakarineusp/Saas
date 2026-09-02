import { useCallback, useEffect, useState } from 'react'

import { Carregando, Erro, Vazio } from '../../componentes/Aviso'
import { Botao, BotaoLink } from '../../componentes/Botao'
import { EtiquetaDeStatus } from '../../componentes/Etiqueta'
import { Folha } from '../../componentes/Folha'
import { Icone } from '../../componentes/Icone'
import {
  indicadores as buscarIndicadores,
  motoristas as buscarMotoristas,
  pendenciasDeAmanha,
  servicos as buscarServicos,
  linkDoServico,
} from '../../dados'
import { comoData, diaDaSemana, diaEMes, hora, hojeISO, moeda, paraISO, rotuloTipo } from '../../lib/formato'

const SIGLAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
import { abrirWhatsApp, mensagemParaMotorista } from '../../lib/whatsapp'
import { useAvisar } from '../../componentes/Avisos'
import { useSessao } from '../../sessao'
import { atribuirMotorista } from '../../dados'
import type { Indicador, Motorista, Pendencia, Servico } from '../../tipos'
import { Atribuir } from './Atribuir'

/**
 * Os dias em volta do escolhido, para andar na agenda sem abrir calendário.
 * Sete dias começando três antes: o dia de hoje ganha um ponto embaixo.
 */
function FaixaDeDias({ dia, aoEscolher }: { dia: string; aoEscolher: (iso: string) => void }) {
  const hoje = hojeISO()
  const base = comoData(dia)
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() + i - 3)
    return d
  })

  return (
    <div className="mt-4 flex gap-1">
      {dias.map((d) => {
        const iso = paraISO(d)
        const escolhido = iso === dia
        return (
          <button
            key={iso}
            type="button"
            onClick={() => aoEscolher(iso)}
            aria-current={escolhido ? 'date' : undefined}
            className={`flex flex-1 flex-col items-center rounded-xl border py-2 transition-colors ${
              escolhido
                ? 'border-destaque bg-destaque text-[#08121c]'
                : 'border-borda text-fraca hover:border-bordaforte hover:text-tinta'
            }`}
          >
            <span className="text-[10px] tracking-wide uppercase">{SIGLAS[d.getDay()]}</span>
            <span className="font-display text-base font-bold tabular-nums">{d.getDate()}</span>
            <span
              className={`mt-0.5 h-1 w-1 rounded-full ${
                iso === hoje ? (escolhido ? 'bg-[#08121c]' : 'bg-destaque') : 'bg-transparent'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}

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
  const { assinatura } = useSessao()
  const solo = assinatura?.modo === 'solo'
  const [dia, setDia] = useState(hojeISO())
  const [servicos, setServicos] = useState<Servico[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [indicadores, setIndicadores] = useState<Indicador[]>([])
  const [aberto, setAberto] = useState<string | null>(null)
  const [amanha, setAmanha] = useState<Pendencia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [s, m, i, p] = await Promise.all([
        buscarServicos(dia, dia),
        buscarMotoristas(),
        buscarIndicadores(),
        pendenciasDeAmanha().catch(() => []),
      ])
      // No Solo não existe escalar: o serviço já sai com o dono como motorista.
      if (solo && m.length === 1) {
        const semDono = s.filter((x) => !x.motorista_id && x.status !== 'cancelado')
        if (semDono.length > 0) {
          await Promise.all(semDono.map((x) => atribuirMotorista(x.id, m[0].id)))
          setServicos(await buscarServicos(dia, dia))
        } else {
          setServicos(s)
        }
      } else {
        setServicos(s)
      }
      setMotoristas(m)
      setIndicadores(i)
      setAmanha(p)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [dia, solo])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const ativos = servicos.filter((s) => s.status !== 'cancelado')
  const semMotorista = ativos.filter((s) => !s.motorista_id).length
  const aguardando = ativos.filter((s) => s.status === 'atribuido')
  const recusados = ativos.filter((s) => s.status === 'recusado').length
  const motoristasDoDia = new Set(ativos.map((s) => s.motorista_id).filter(Boolean)).size
  const servico = servicos.find((s) => s.id === aberto) ?? null

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
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">
            {dia === hojeISO() ? 'Hoje' : 'Agenda'} · {diaDaSemana(dia)}
          </p>
          <h1 className="font-display mt-0.5 text-2xl font-extrabold text-tinta">{diaEMes(dia)}</h1>
        </div>

        <label className="shrink-0 cursor-pointer rounded-lg border border-borda p-2 text-fraca hover:text-tinta">
          <Icone nome="calendario" className="h-4.5 w-4.5" />
          <span className="sr-only">Escolher outro dia</span>
          <input
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value || hojeISO())}
            className="sr-only"
          />
        </label>
      </div>

      {/* A semana à vista: o dia de hoje marcado, e os vizinhos a um toque. */}
      <FaixaDeDias dia={dia} aoEscolher={setDia} />

      <p className="mt-3 text-sm text-fraca">
        {ativos.length} {ativos.length === 1 ? 'serviço' : 'serviços'} · {motoristasDoDia}{' '}
        {motoristasDoDia === 1 ? 'motorista' : 'motoristas'}
      </p>

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

      {/* O lembrete da véspera: o que amanhã ainda pode furar. */}
      {amanha.length > 0 && dia === hojeISO() && (
        <div className="painel mt-4 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">Amanhã</p>
            <span className="text-xs font-semibold text-atencao">
              {amanha.length} {amanha.length === 1 ? 'pendência' : 'pendências'}
            </span>
          </div>
          <p className="mt-2 text-sm text-fraca">
            Estes serviços de amanhã ainda não estão fechados. Resolver hoje evita telefonema de madrugada.
          </p>
          <ul className="mt-3 space-y-1.5">
            {amanha.slice(0, 4).map((p) => (
              <li key={p.servico_id} className="flex items-center gap-2 text-sm">
                <span className="font-display font-semibold text-tinta tabular-nums">{hora(p.hora)}</span>
                <span className="min-w-0 flex-1 truncate text-fraca">{p.passageiro}</span>
                <span className="shrink-0 text-xs text-tenue">
                  {p.status === 'sem_motorista' ? 'sem motorista' : p.status === 'recusado' ? 'recusado' : 'sem resposta'}
                </span>
              </li>
            ))}
            {amanha.length > 4 && (
              <li className="text-xs text-tenue">e mais {amanha.length - 4}…</li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => {
              const d = new Date()
              d.setDate(d.getDate() + 1)
              setDia(paraISO(d))
            }}
            className="mt-3 text-xs font-semibold text-destaque underline underline-offset-2"
          >
            abrir a agenda de amanhã
          </button>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {servicos.map((s, i) => (
          <div key={s.id} className="entra" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
            <Cartao servico={s} aoTocar={() => setAberto(s.id)} />
          </div>
        ))}

        {servicos.length === 0 &&
          (primeiraVez && !solo ? (
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
        titulo={servico ? servico.passageiro : ''}
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
