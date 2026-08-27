import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Carregando } from '../../componentes/Aviso'
import { Icone } from '../../componentes/Icone'
import { SeletorDeIdioma } from '../../componentes/SeletorDeIdioma'
import { acompanhar as buscarAcompanhamento } from '../../dados'
import { dataNoIdioma, idiomaInicial, textos, type Idioma } from '../../idiomas'
import { hora, soNumeros } from '../../lib/formato'
import type { Acompanhamento } from '../../tipos'

const PASSOS = ['sem_motorista', 'atribuido', 'confirmado', 'concluido'] as const

/**
 * Página que o hotel manda para o hóspede. Mostra quem vai buscar e a que
 * horas — e nenhum valor, nem o do cliente nem o do motorista.
 */
export function Acompanhar() {
  const { token = '' } = useParams()
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial)
  const t = textos(idioma)

  const [dados, setDados] = useState<Acompanhamento | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    void buscarAcompanhamento(token)
      .then(setDados)
      .catch(() => setDados(null))
      .finally(() => setCarregando(false))
  }, [token])

  if (carregando) return <Carregando linhas={2} />

  if (!dados) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-fundo px-6 text-center">
        <Icone nome="aviso" className="h-8 w-8 text-tenue" />
        <p className="font-display mt-4 text-lg font-bold text-tinta">{t.linkExpirado}</p>
      </div>
    )
  }

  const passoAtual = PASSOS.indexOf(dados.status as (typeof PASSOS)[number])
  const cancelado = dados.status === 'cancelado'

  return (
    <div className="mx-auto min-h-screen max-w-md bg-fundo px-5 pt-6 pb-14">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">{dados.empresa}</p>
        <SeletorDeIdioma atual={idioma} aoTrocar={setIdioma} />
      </div>

      <h1 className="font-display mt-3 text-2xl font-bold text-tinta">{t.seuTransfer}</h1>
      <p className="mt-1 text-sm text-fraca first-letter:uppercase">
        {dataNoIdioma(dados.data, idioma)} · {hora(dados.hora)}
      </p>

      {/* linha do tempo do serviço */}
      {!cancelado && (
        <div className="mt-6 flex items-center gap-1.5">
          {PASSOS.map((passo, i) => (
            <div key={passo} className="flex-1">
              <div className={`h-1 rounded-full ${i <= passoAtual ? 'bg-destaque' : 'bg-borda'}`} />
            </div>
          ))}
        </div>
      )}
      <p className={`mt-2 text-sm font-semibold ${cancelado ? 'text-alerta' : 'text-destaque'}`}>
        {t.situacoes[dados.status as keyof typeof t.situacoes] ?? dados.status}
      </p>

      <div className="painel mt-5 divide-y divide-borda rounded-2xl">
        <div className="flex gap-3 p-4">
          <span className="w-24 shrink-0 text-sm text-tenue">{t.passageiro}</span>
          <span className="text-sm font-medium text-tinta">
            {dados.passageiro} ({dados.pax})
          </span>
        </div>
        {dados.voo && (
          <div className="flex gap-3 p-4">
            <span className="w-24 shrink-0 text-sm text-tenue">{t.voo}</span>
            <span className="text-sm font-medium text-tinta">{dados.voo}</span>
          </div>
        )}
        <div className="flex gap-3 p-4">
          <span className="w-24 shrink-0 text-sm text-tenue">{t.buscar}</span>
          <span className="text-sm font-medium text-tinta">{dados.origem}</span>
        </div>
        <div className="flex gap-3 p-4">
          <span className="w-24 shrink-0 text-sm text-tenue">{t.levar}</span>
          <span className="text-sm font-medium text-tinta">{dados.destino}</span>
        </div>
        <div className="flex gap-3 p-4">
          <span className="w-24 shrink-0 text-sm text-tenue">{t.motorista}</span>
          <span className="text-sm font-medium text-tinta">
            {dados.motorista ? (
              <>
                {dados.motorista}
                {dados.veiculo && <span className="font-normal text-tenue"> · {dados.veiculo}</span>}
              </>
            ) : (
              <span className="text-tenue">{t.aindaDefinindo}</span>
            )}
          </span>
        </div>
      </div>

      {dados.telefone_empresa && (
        <a
          href={`https://wa.me/${soNumeros(dados.telefone_empresa)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-borda py-3.5 text-sm font-semibold text-tinta transition-colors hover:bg-superficie2"
        >
          <Icone nome="whatsapp" className="h-4 w-4" />
          {t.faleConosco}
        </a>
      )}
    </div>
  )
}
