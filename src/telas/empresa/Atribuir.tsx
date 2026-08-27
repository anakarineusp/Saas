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
      <div className="painel rounded-2xl p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display font-bold text-tinta">
              {dataCurta(servico.data)} às {hora(servico.hora)}
            </span>
            <span className="rounded-md bg-superficie2 px-1.5 py-0.5 text-xs font-medium text-fraca">
              {rotuloTipo(servico.tipo)}
            </span>
          </div>
          <EtiquetaDeStatus status={servico.status} />
        </div>
        <p className="mt-2 font-semibold text-tinta">
          {servico.passageiro} <span className="font-normal text-tenue">· {servico.pax} pax</span>
        </p>
        {servico.voo && <p className="text-sm text-fraca">Voo {servico.voo}</p>}
        <p className="mt-1 text-sm text-fraca">
          {servico.origem} <span className="text-tenue">→</span> {servico.destino}
        </p>
        <div className="mt-3 flex justify-between border-t border-borda pt-3 text-sm">
          <span className="text-tenue">{indicador ? indicador.nome : 'Sem indicação'}</span>
          <span className="font-display font-bold text-tinta tabular-nums">{moeda(servico.valor_centavos)}</span>
        </div>
        {servico.motivo && (
          <p className="mt-3 text-xs text-alerta">Motivo: {servico.motivo}</p>
        )}
      </div>

      <Erro>{erro}</Erro>

      {motorista && !encerrado && (
        <div className="painel space-y-3 rounded-2xl p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display font-bold text-tinta">
              {solo ? 'Você' : motorista.nome}{' '}
              <span className="font-normal text-fraca">· {motorista.veiculo}</span>
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

          <Botao
            tom="contorno"
            largo
            disabled={!indicador}
            onClick={() =>
              indicador && abrirWhatsApp(indicador.telefone ?? '', mensagemParaIndicador(servico, indicador))
            }
          >
            Avisar {indicador ? indicador.nome : 'indicador'}
          </Botao>


          {(servico.status === 'confirmado' || servico.status === 'atribuido') && (
            <Botao
              tom="fantasma"
              largo
              disabled={indo}
              onClick={() => void tentar(() => concluirServico(servico.id), 'Serviço concluído')}
            >
              <Icone nome="check" className="h-4 w-4" />
              Marcar como concluído
            </Botao>
          )}
        </div>
      )}

      {servico.status !== 'cancelado' && (
        <Botao tom="contorno" largo onClick={() => void mandarAcompanhamento()}>
          <Icone nome="seta" className="h-4 w-4" />
          Link de acompanhamento do passageiro
        </Botao>
      )}

      {servico.status === 'concluido' && (
        <Botao tom="ok" largo onClick={() => void pedirAvaliacao()}>
          <Icone nome="whatsapp" className="h-4 w-4" />
          Pedir avaliação ao passageiro
        </Botao>
      )}

      {encerrado && (
        <Botao
          tom="contorno"
          largo
          disabled={indo}
          onClick={() => void tentar(() => reabrirServico(servico.id), 'Serviço reaberto')}
        >
          <Icone nome="volta" className="h-4 w-4" />
          Reabrir o serviço
        </Botao>
      )}

      {!encerrado && !solo && (
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.15em] text-tenue uppercase">
            {motorista ? 'Trocar motorista' : 'Escolher motorista'}
          </p>
          <div className="space-y-2">
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
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-colors disabled:opacity-40 ${
                    m.id === servico.motorista_id
                      ? 'border-destaque bg-superficie2'
                      : 'border-borda bg-superficie hover:border-bordaforte'
                  }`}
                >
                  <span>
                    <span className="block font-semibold text-tinta">{m.nome}</span>
                    <span className="block text-xs text-tenue">
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
              <p className="text-sm text-tenue">Cadastre um motorista na aba Cadastros.</p>
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
