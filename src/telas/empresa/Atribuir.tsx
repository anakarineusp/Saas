import { useState } from 'react'
import { Erro } from '../../componentes/Aviso'
import { atribuirMotorista, linkDoServico } from '../../dados'
import { disponibilidadeDe } from '../../lib/disponibilidade'
import { dataCurta, hora, moeda, rotuloTipo } from '../../lib/formato'
import { abrirWhatsApp, mensagemParaIndicador, mensagemParaMotorista } from '../../lib/whatsapp'
import type { Indicador, Motorista, Servico } from '../../tipos'

const ETIQUETA = {
  livre: 'bg-emerald-100 text-emerald-700',
  ocupado: 'bg-amber-100 text-amber-700',
  nao_cabe: 'bg-red-100 text-red-700',
}

export function Atribuir({
  servico,
  servicos,
  motoristas,
  indicadores,
  aoMudar,
}: {
  servico: Servico
  servicos: Servico[]
  motoristas: Motorista[]
  indicadores: Indicador[]
  aoMudar: () => Promise<void>
}) {
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)

  const motorista = motoristas.find((m) => m.id === servico.motorista_id) ?? null
  const indicador = indicadores.find((i) => i.id === servico.indicador_id) ?? null

  async function escolher(alvo: Motorista) {
    const disp = disponibilidadeDe(alvo, servico, servicos)
    if (disp.estado === 'ocupado') {
      if (!window.confirm(`${alvo.nome} já tem serviço às ${disp.hora}. Atribuir mesmo assim?`)) return
    }
    setErro('')
    setIndo(true)
    try {
      await atribuirMotorista(servico.id, alvo.id)
      await aoMudar()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo(false)
    }
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-slate-900">
            {dataCurta(servico.data)} às {hora(servico.hora)}
          </span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
            {rotuloTipo(servico.tipo)}
          </span>
        </div>
        <p className="mt-1.5 font-medium text-slate-900">
          {servico.passageiro} <span className="font-normal text-slate-500">· {servico.pax} pax</span>
        </p>
        {servico.voo && <p className="text-sm text-slate-500">Voo {servico.voo}</p>}
        <p className="mt-1 text-sm text-slate-500">
          {servico.origem} <span className="text-slate-400">→</span> {servico.destino}
        </p>
        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm">
          <span className="text-slate-500">{indicador ? indicador.nome : 'Sem indicação'}</span>
          <span className="font-semibold tabular-nums text-slate-900">{moeda(servico.valor_centavos)}</span>
        </div>
      </div>

      <Erro>{erro}</Erro>

      {motorista && (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-emerald-900">
              {motorista.nome} · {motorista.veiculo}
            </span>
            <span className="text-sm font-semibold tabular-nums text-emerald-900">
              {moeda(servico.valor_motorista_centavos)}
            </span>
          </div>
          <p className="text-xs text-emerald-800">
            {servico.status === 'confirmado' ? 'Motorista já confirmou.' : 'Aguardando confirmação.'}
          </p>
          <button
            type="button"
            onClick={() => void avisarMotorista()}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white active:bg-emerald-700"
          >
            Avisar motorista
          </button>
          <button
            type="button"
            disabled={!indicador}
            onClick={() =>
              indicador && abrirWhatsApp(indicador.telefone ?? '', mensagemParaIndicador(servico, indicador))
            }
            className="w-full rounded-xl border border-emerald-600 px-4 py-3 font-semibold text-emerald-700 active:bg-emerald-100 disabled:opacity-40"
          >
            Avisar indicador
          </button>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
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
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-white p-3.5 text-left active:bg-slate-50 disabled:opacity-50 ${
                  m.id === servico.motorista_id ? 'border-2 border-slate-900' : 'border-slate-200'
                }`}
              >
                <span>
                  <span className="block font-medium text-slate-900">{m.nome}</span>
                  <span className="block text-xs text-slate-500">
                    {m.veiculo} · {m.lugares} lugares
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${ETIQUETA[disp.estado]}`}>
                  {rotulo}
                </span>
              </button>
            )
          })}
          {motoristas.length === 0 && (
            <p className="text-sm text-slate-500">Cadastre um motorista na aba Cadastros.</p>
          )}
        </div>
      </div>
    </div>
  )
}
