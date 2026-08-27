import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Carregando, Erro } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Icone } from '../../componentes/Icone'
import { SeletorDeIdioma } from '../../componentes/SeletorDeIdioma'
import { avaliacaoDoLink, avaliar as enviarAvaliacao } from '../../dados'
import { dataNoIdioma, idiomaInicial, textos, type Idioma } from '../../idiomas'
import { hora } from '../../lib/formato'
import type { AvaliacaoDoLink } from '../../tipos'

function Estrelas({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string
  valor: number
  aoMudar: (n: number) => void
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-fraca uppercase">{rotulo}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => aoMudar(n)}
            aria-label={`${n}`}
            aria-pressed={valor >= n}
            className={`flex h-11 flex-1 items-center justify-center rounded-xl border transition-colors ${
              valor >= n ? 'border-atencao/50 bg-atencao/10 text-atencao' : 'border-borda text-tenue hover:text-fraca'
            }`}
          >
            <svg viewBox="0 0 24 24" fill={valor >= n ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
              <path d="m12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8L12 3.5Z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Página que o passageiro abre para avaliar a viagem. Sem login, uma vez só. */
export function Avaliar() {
  const { token = '' } = useParams()
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial)
  const t = textos(idioma)

  const [dados, setDados] = useState<AvaliacaoDoLink | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [nota, setNota] = useState(0)
  const [pontualidade, setPontualidade] = useState(0)
  const [conforto, setConforto] = useState(0)
  const [comentario, setComentario] = useState('')
  const [pronto, setPronto] = useState(false)
  const [indo, setIndo] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    void avaliacaoDoLink(token)
      .then(setDados)
      .catch(() => setDados(null))
      .finally(() => setCarregando(false))
  }, [token])

  async function enviar() {
    setErro('')
    setIndo(true)
    try {
      await enviarAvaliacao({
        token,
        nota,
        pontualidade: pontualidade || undefined,
        veiculo: conforto || undefined,
        comentario: comentario.trim() || undefined,
      })
      setPronto(true)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo(false)
    }
  }

  if (carregando) return <Carregando linhas={2} />

  if (!dados) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-fundo px-6 text-center">
        <Icone nome="aviso" className="h-8 w-8 text-tenue" />
        <p className="font-display mt-4 text-lg font-bold text-tinta">{t.linkExpirado}</p>
      </div>
    )
  }

  const agradecer = pronto || dados.ja_respondeu

  return (
    <div className="mx-auto min-h-screen max-w-md bg-fundo px-5 pt-6 pb-14">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">{dados.empresa}</p>
        <SeletorDeIdioma atual={idioma} aoTrocar={setIdioma} />
      </div>

      {agradecer ? (
        <div className="mt-16 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-ok/40 text-ok">
            <Icone nome="check" className="h-8 w-8" traco={2.4} />
          </span>
          <h1 className="font-display mt-6 text-2xl font-bold text-tinta">{t.obrigado}</h1>
          <p className="mt-2 text-sm text-fraca">{pronto ? t.obrigadoTexto : t.jaRespondeu}</p>
        </div>
      ) : (
        <>
          <h1 className="font-display mt-3 text-2xl font-bold text-balance text-tinta">{t.comoFoi}</h1>
          <p className="mt-2 text-sm leading-relaxed text-fraca">{t.avalieTexto}</p>

          <div className="painel mt-5 rounded-2xl p-4">
            <p className="text-sm font-semibold text-tinta first-letter:uppercase">
              {dataNoIdioma(dados.data, idioma)} · {hora(dados.hora)}
            </p>
            <p className="mt-1 text-sm text-fraca">
              {dados.origem} <span className="text-tenue">→</span> {dados.destino}
            </p>
            {dados.motorista && (
              <p className="mt-2 border-t border-borda pt-2 text-sm text-fraca">
                {t.motorista}: <span className="font-semibold text-tinta">{dados.motorista}</span>
                {dados.veiculo && <span className="text-tenue"> · {dados.veiculo}</span>}
              </p>
            )}
          </div>

          <div className="mt-6 space-y-5">
            <Estrelas rotulo={t.notaGeral} valor={nota} aoMudar={setNota} />
            <Estrelas rotulo={t.pontualidade} valor={pontualidade} aoMudar={setPontualidade} />
            <Estrelas rotulo={t.conforto} valor={conforto} aoMudar={setConforto} />

            <label className="block">
              <span className="mb-2 block text-xs font-semibold tracking-wide text-fraca uppercase">
                {t.comentario}
              </span>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-borda bg-fundo2 px-3.5 py-3 text-tinta outline-none focus:border-destaque"
              />
            </label>

            <Erro>{erro}</Erro>

            <Botao largo tamanho="grande" disabled={indo || nota === 0} onClick={() => void enviar()}>
              {indo ? t.enviando : t.enviar}
            </Botao>
          </div>
        </>
      )}
    </div>
  )
}
