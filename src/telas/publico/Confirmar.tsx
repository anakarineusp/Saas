import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Carregando, Erro } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { BotaoTema } from '../../componentes/BotaoTema'
import { Icone } from '../../componentes/Icone'
import { SeletorDeIdioma } from '../../componentes/SeletorDeIdioma'
import { confirmarPeloLink, recusarPeloLink, servicoDoLink } from '../../dados'
import { dataNoIdioma, idiomaInicial, textos, type Idioma } from '../../idiomas'
import { hora, moeda, rotuloTipo } from '../../lib/formato'
import type { ServicoDoLink } from '../../tipos'

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex gap-3 border-t border-borda py-3 first:border-t-0 first:pt-0">
      <span className="w-20 shrink-0 text-sm text-tenue">{rotulo}</span>
      <span className="text-sm font-medium text-tinta">{valor}</span>
    </div>
  )
}

/**
 * Tela que o motorista abre pelo link do WhatsApp, sem login nenhum.
 * Mostra os dados e o valor dele — nunca o valor cobrado do cliente.
 */
export function Confirmar() {
  const { token = '' } = useParams()
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial)
  const t = textos(idioma)
  const [servico, setServico] = useState<ServicoDoLink | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)

  useEffect(() => {
    void servicoDoLink(token)
      .then(setServico)
      .catch(() => setServico(null))
      .finally(() => setCarregando(false))
  }, [token])

  async function responder(aceitar: boolean) {
    setErro('')
    setIndo(true)
    try {
      if (aceitar) {
        await confirmarPeloLink(token)
        setServico((s) => (s ? { ...s, confirmado: true, recusado: false } : s))
      } else {
        const motivo = window.prompt(t.motivo) ?? ''
        await recusarPeloLink(token, motivo)
        setServico((s) => (s ? { ...s, confirmado: false, recusado: true } : s))
      }
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo(false)
    }
  }

  if (carregando) return <Carregando linhas={2} />

  if (!servico) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-fundo px-6 text-center">
        <Icone nome="aviso" className="h-8 w-8 text-tenue" />
        <p className="font-display mt-4 text-lg font-bold text-tinta">{t.linkExpirado}</p>
        <p className="mt-2 text-sm text-fraca">{t.peçaOutro}</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-fundo">
      <div className="aurora absolute inset-0" />

      <div className="relative mx-auto max-w-md px-5 pt-6 pb-12">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">
              {t.ola}, {servico.motorista}
            </p>
            <h1 className="font-display mt-1 text-2xl font-bold text-tinta first-letter:uppercase">
              {dataNoIdioma(servico.data, idioma)}
            </h1>
            <p className="mt-1 text-sm text-fraca">
              {hora(servico.hora)} · {rotuloTipo(servico.tipo)} · {servico.empresa}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <SeletorDeIdioma atual={idioma} aoTrocar={setIdioma} />
            <BotaoTema />
          </div>
        </div>

        <div className="painel mt-5 rounded-2xl p-4">
          <Item rotulo={t.passageiro} valor={`${servico.passageiro} (${servico.pax})`} />
          {servico.voo && <Item rotulo={t.voo} valor={servico.voo} />}
          <Item rotulo={t.buscar} valor={servico.origem} />
          <Item rotulo={t.levar} valor={servico.destino} />
        </div>

        <div className="painel mt-4 rounded-2xl p-5 text-center">
          <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">{t.seuValor}</p>
          <p className="font-display mt-1 text-4xl font-extrabold text-tinta tabular-nums">
            {moeda(servico.valor_motorista_centavos)}
          </p>
        </div>

        <div className="mt-6">
          <Erro>{erro}</Erro>
        </div>

        {servico.confirmado ? (
          <div className="painel mt-2 flex items-center justify-center gap-2 rounded-2xl border-l-2 border-l-ok py-4 font-display font-bold text-ok">
            <Icone nome="check" className="h-5 w-5" traco={3} />
            {t.confirmado}
          </div>
        ) : servico.recusado ? (
          <div className="mt-2 rounded-2xl border border-borda bg-superficie py-4 text-center">
            <p className="font-display font-bold text-fraca">{t.recusouTitulo}</p>
            <p className="mt-1 text-xs text-tenue">{t.recusouTexto}</p>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <Botao tom="ok" largo tamanho="grande" disabled={indo} onClick={() => void responder(true)}>
              <Icone nome="check" className="h-5 w-5" traco={2.6} />
              {indo ? t.enviando : t.aceito}
            </Botao>
            <Botao tom="fantasma" largo disabled={indo} onClick={() => void responder(false)}>
              {t.naoVou}
            </Botao>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-tenue">
          {t.rodapeMotorista}
        </p>
      </div>
    </div>
  )
}
