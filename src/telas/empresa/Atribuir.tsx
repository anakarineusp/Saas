import { useState } from 'react'
import { Erro } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { useAvisar } from '../../componentes/Avisos'
import { EtiquetaDeStatus } from '../../componentes/Etiqueta'
import { Icone } from '../../componentes/Icone'
import {
  atribuirMotorista, cancelarServico, concluirServico, linkDeAcompanhamento, linkDeAvaliacao,
  linkDoServico, reabrirServico,
} from '../../dados'
import { disponibilidadeDe } from '../../lib/disponibilidade'
import { dataCurta, hora, moeda, rotuloTipo } from '../../lib/formato'
import {
  abrirWhatsApp, linkDeAcompanhamento as enderecoDeAcompanhamento, linkDeAvaliacao as enderecoDeAvaliacao,
  linkDeConfirmacao, mensagemDeAcompanhamento, mensagemDeAvaliacao, mensagemParaIndicador, mensagemParaMotorista,
} from '../../lib/whatsapp'
import { useSessao } from '../../sessao'
import type { Indicador, Motorista, Servico } from '../../tipos'

// Um ponto colorido basta: o texto continua legível e a tela não vira semáforo.
const PONTO = {
  livre: 'bg-ok',
  ocupado: 'bg-atencao',
  nao_cabe: 'bg-alerta',
}

/** Uma linha de ficha: o que é à esquerda, o que vale à direita. */
function Dado({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-sm text-tenue">{rotulo}</span>
      <span
        className={`text-right text-sm ${
          forte ? 'font-display font-bold text-tinta tabular-nums' : 'font-medium text-tinta'
        }`}
      >
        {valor}
      </span>
    </div>
  )
}

/** Ação secundária: uma linha da lista, não um botão gordo. */
function LinhaDeAcao({
  rotulo, aoTocar, desativada,
}: {
  rotulo: string
  aoTocar: () => void
  desativada?: boolean
}) {
  return (
    <button
      type="button"
      disabled={desativada}
      onClick={aoTocar}
      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-tinta transition-colors enabled:hover:bg-superficie2 disabled:opacity-40"
    >
      {rotulo}
      <Icone nome="seta" className="h-4 w-4 shrink-0 text-tenue" />
    </button>
  )
}

export function Atribuir({
  servico,
  servicos,
  motoristas,
  indicadores,
  aoMudar,
  aoFechar,
}: {
  servico: Servico
  servicos: Servico[]
  motoristas: Motorista[]
  indicadores: Indicador[]
  aoMudar: () => Promise<void>
  aoFechar: () => void
}) {
  const avisar = useAvisar()
  const { assinatura } = useSessao()
  const solo = assinatura?.modo === 'solo'
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)

  const motorista = motoristas.find((m) => m.id === servico.motorista_id) ?? null
  const indicador = indicadores.find((i) => i.id === servico.indicador_id) ?? null
  const encerrado = servico.status === 'cancelado' || servico.status === 'concluido'
  const temAcoes = servico.status !== 'cancelado' || encerrado

  async function tentar(acao: () => Promise<unknown>, recado?: string) {
    setErro('')
    setIndo(true)
    try {
      await acao()
      await aoMudar()
      if (recado) avisar(recado)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo(false)
    }
  }

  async function escolher(alvo: Motorista) {
    const disp = disponibilidadeDe(alvo, servico, servicos)
    if (disp.estado === 'ocupado') {
      if (!window.confirm(`${alvo.nome} já tem serviço às ${disp.hora}. Escalar mesmo assim?`)) return
    }
    await tentar(() => atribuirMotorista(servico.id, alvo.id), `${alvo.nome} escalado`)
  }

  async function avisarMotorista() {
    if (!motorista) return
    setErro('')
    try {
      const token = await linkDoServico(servico.id)
      abrirWhatsApp(motorista.telefone, mensagemParaMotorista(servico, token))
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function copiarLink() {
    setErro('')
    try {
      const token = await linkDoServico(servico.id)
      await navigator.clipboard.writeText(linkDeConfirmacao(token))
      avisar('Link copiado')
    } catch {
      setErro('Não consegui copiar. Use o botão de avisar pelo WhatsApp.')
    }
  }

  /** Link que o hotel manda para o hóspede: mostra o motorista e o horário. */
  async function mandarAcompanhamento() {
    setErro('')
    try {
      const token = await linkDeAcompanhamento(servico.id)
      const destino = indicador?.telefone
      if (destino) {
        abrirWhatsApp(destino, mensagemDeAcompanhamento(servico, token))
      } else {
        await navigator.clipboard.writeText(enderecoDeAcompanhamento(token))
        avisar('Link de acompanhamento copiado')
      }
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  /** Pedido de avaliação, depois da viagem. */
  async function pedirAvaliacao() {
    setErro('')
    try {
      const token = await linkDeAvaliacao(servico.id)
      await navigator.clipboard.writeText(enderecoDeAvaliacao(token))
      avisar('Link de avaliação copiado')
      window.open(
        `https://wa.me/?text=${encodeURIComponent(mensagemDeAvaliacao(servico, token))}`,
        '_blank',
        'noopener',
      )
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      {/* O serviço em forma de ficha: rótulo à esquerda, valor à direita.
          É o mesmo formato que o motorista e o hotel veem no link. */}
      <div className="flex items-center justify-between gap-3">
        <p className="font-display font-bold text-tinta">
          {dataCurta(servico.data)} às {hora(servico.hora)}
        </p>
        <EtiquetaDeStatus status={servico.status} />
      </div>

      <div className="painel divide-y divide-borda overflow-hidden rounded-2xl">
        <Dado rotulo="Serviço" valor={`${rotuloTipo(servico.tipo)} · ${servico.pax} pax`} />
        {servico.voo && <Dado rotulo="Voo" valor={servico.voo} />}
        <Dado rotulo="Buscar" valor={servico.origem} />
        <Dado rotulo="Levar" valor={servico.destino} />
        <Dado rotulo="Indicação" valor={indicador ? `${indicador.nome} · ${indicador.comissao}%` : 'Sem indicação'} />
        <Dado rotulo="Valor" valor={moeda(servico.valor_centavos)} forte />
        {servico.motivo && <Dado rotulo="Motivo" valor={servico.motivo} />}
      </div>

      <Erro>{erro}</Erro>

      {motorista && !encerrado && (
        <div className="space-y-3">
          <div className="painel flex items-baseline justify-between gap-2 rounded-2xl p-4">
            <span className="font-display font-bold text-tinta">
              {solo ? 'Você' : motorista.nome} <span className="font-normal text-fraca">· {motorista.veiculo}</span>
            </span>
            {!solo && (
              <span className="font-display text-sm font-bold text-tinta tabular-nums">
                {moeda(servico.valor_motorista_centavos)}
              </span>
            )}
          </div>

          {!solo && (
            <div className="grid grid-cols-2 gap-2">
              <Botao tom="ok" onClick={() => void avisarMotorista()}>
                <Icone nome="whatsapp" className="h-4 w-4" />
                Avisar
              </Botao>
              <Botao tom="contorno" onClick={() => void copiarLink()}>
                <Icone nome="copiar" className="h-4 w-4" />
                Copiar link
              </Botao>
            </div>
          )}
        </div>
      )}

      {/* O resto das ações vira lista: um botão gordo para cada coisa vira ruído. */}
      <div
        className={
          temAcoes ? 'painel divide-y divide-borda overflow-hidden rounded-2xl' : 'hidden'
        }
      >
        {motorista && !encerrado && indicador && (
          <LinhaDeAcao
            rotulo={`Avisar ${indicador.nome}`}
            aoTocar={() => abrirWhatsApp(indicador.telefone ?? '', mensagemParaIndicador(servico, indicador))}
          />
        )}
        {servico.status !== 'cancelado' && (
          <LinhaDeAcao rotulo="Link de acompanhamento do passageiro" aoTocar={() => void mandarAcompanhamento()} />
        )}
        {motorista && (servico.status === 'confirmado' || servico.status === 'atribuido') && (
          <LinhaDeAcao
            rotulo="Marcar como concluído"
            desativada={indo}
            aoTocar={() => void tentar(() => concluirServico(servico.id), 'Serviço concluído')}
          />
        )}
        {servico.status === 'concluido' && (
          <LinhaDeAcao rotulo="Pedir avaliação ao passageiro" aoTocar={() => void pedirAvaliacao()} />
        )}
        {encerrado && (
          <LinhaDeAcao
            rotulo="Reabrir o serviço"
            desativada={indo}
            aoTocar={() => void tentar(() => reabrirServico(servico.id), 'Serviço reaberto')}
          />
        )}
      </div>

      {!encerrado && !solo && (
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.15em] text-tenue uppercase">
            {motorista ? 'Trocar motorista' : 'Escolher motorista'}
          </p>
          <div className="painel divide-y divide-borda overflow-hidden rounded-2xl">
            {motoristas.map((m) => {
              const disp = disponibilidadeDe(m, servico, servicos)
              const rotulo =
                disp.estado === 'livre'
                  ? 'Livre'
                  : disp.estado === 'ocupado'
                    ? `Ocupado às ${disp.hora}`
                    : 'Não cabe'
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={disp.estado === 'nao_cabe' || indo}
                  onClick={() => void escolher(m)}
                  className={`flex w-full items-center justify-between gap-3 p-4 text-left transition-colors disabled:opacity-40 ${
                    m.id === servico.motorista_id ? 'bg-superficie2' : 'hover:bg-superficie2'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-tinta">
                      {m.nome}
                      {m.id === servico.motorista_id && (
                        <span className="ml-2 text-xs font-semibold text-destaque">escalado</span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-tenue">
                      {m.veiculo} · {m.lugares} lugares · {m.percentual}%
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-fraca">
                    <span className={`h-1.5 w-1.5 rounded-full ${PONTO[disp.estado]}`} />
                    {rotulo}
                  </span>
                </button>
              )
            })}
            {motoristas.length === 0 && (
              <p className="p-4 text-sm text-tenue">Cadastre um motorista na aba Cadastros.</p>
            )}
          </div>
        </div>
      )}

      {servico.status !== 'cancelado' && (
        <button
          type="button"
          disabled={indo}
          onClick={() => {
            const motivo = window.prompt('Cancelar este serviço. Qual o motivo? (opcional)')
            if (motivo === null) return
            void tentar(async () => {
              await cancelarServico(servico.id, motivo)
              aoFechar()
            }, 'Serviço cancelado')
          }}
          className="w-full pt-2 pb-1 text-center text-xs font-semibold text-alerta underline underline-offset-2"
        >
          cancelar este serviço
        </button>
      )}
    </div>
  )
}
