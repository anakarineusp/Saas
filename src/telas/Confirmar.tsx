import { dataPorExtenso, moeda, rotuloTipo } from '../lib/formato'
import type { ResumoDoMotorista } from '../lib/link'

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex gap-3 border-t border-slate-100 py-2.5 first:border-t-0 first:pt-0">
      <span className="w-20 shrink-0 text-sm text-slate-500">{rotulo}</span>
      <span className="text-sm font-medium text-slate-900">{valor}</span>
    </div>
  )
}

/**
 * Tela aberta pelo motorista, pelo link do WhatsApp.
 * Mostra só os dados do serviço e o valor dele — nunca o valor cobrado do cliente.
 */
export function Confirmar({
  resumo,
  confirmado,
  aoAceitar,
}: {
  resumo: ResumoDoMotorista | null
  confirmado: boolean
  aoAceitar: () => void
}) {
  if (!resumo) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-semibold text-slate-900">Link expirado</p>
        <p className="mt-2 text-sm text-slate-500">Peça um novo link para a central.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pt-8 pb-10">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {resumo.motorista ? `Olá, ${resumo.motorista}` : 'Serviço'}
      </p>
      <h1 className="mt-0.5 text-2xl font-bold text-slate-900 first-letter:uppercase">
        {dataPorExtenso(resumo.data)}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {resumo.hora} · {rotuloTipo(resumo.tipo)}
      </p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <Item rotulo="Passageiro" valor={`${resumo.passageiro} (${resumo.pax} pax)`} />
        {resumo.voo && <Item rotulo="Voo" valor={resumo.voo} />}
        <Item rotulo="Buscar" valor={resumo.origem} />
        <Item rotulo="Levar" valor={resumo.destino} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-900 p-5 text-center">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Seu valor</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-white">
          {moeda(resumo.valorMotorista)}
        </p>
      </div>

      {confirmado ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-4 font-semibold text-emerald-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="m5 13 4 4L19 7" />
          </svg>
          Serviço confirmado
        </div>
      ) : (
        <button
          type="button"
          onClick={aoAceitar}
          className="mt-6 w-full rounded-2xl bg-emerald-600 px-4 py-4 text-lg font-semibold text-white active:bg-emerald-700"
        >
          Aceito
        </button>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Qualquer imprevisto, avise a central pelo WhatsApp.
      </p>
    </div>
  )
}
