import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Carregando, Erro } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { BotaoTema } from '../../componentes/BotaoTema'
import { Icone } from '../../componentes/Icone'
import { confirmarPeloLink, recusarPeloLink, servicoDoLink } from '../../dados'
import { dataPorExtenso, hora, moeda, rotuloTipo } from '../../lib/formato'
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
        const motivo = window.prompt('Pode dizer o motivo? (opcional)') ?? ''
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
        <p className="font-display mt-4 text-lg font-bold text-tinta">Link expirado</p>
        <p className="mt-2 text-sm text-fraca">Peça um novo link para a central.</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-fundo">
      <div className="aurora absolute inset-0" />

      <div className="relative mx-auto max-w-md px-5 pt-6 pb-12">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">Olá, {servico.motorista}</p>
            <h1 className="font-display mt-1 text-2xl font-bold text-tinta first-letter:uppercase">
              {dataPorExtenso(servico.data)}
            </h1>
            <p className="mt-1 text-sm text-fraca">
              {hora(servico.hora)} · {rotuloTipo(servico.tipo)} · {servico.empresa}
            </p>
          </div>
          <BotaoTema />
        </div>

        <div className="painel mt-5 rounded-2xl p-4">
          <Item rotulo="Passageiro" valor={`${servico.passageiro} (${servico.pax} pax)`} />
          {servico.voo && <Item rotulo="Voo" valor={servico.voo} />}
          <Item rotulo="Buscar" valor={servico.origem} />
          <Item rotulo="Levar" valor={servico.destino} />
        </div>

        <div className="mt-4 rounded-2xl border border-destaque/30 bg-destaque/10 p-5 text-center">
          <p className="text-xs font-bold tracking-[0.15em] text-destaque uppercase">Seu valor</p>
          <p className="font-display mt-1 text-4xl font-extrabold text-tinta tabular-nums">
            {moeda(servico.valor_motorista_centavos)}
          </p>
        </div>

        <div className="mt-6">
          <Erro>{erro}</Erro>
        </div>

        {servico.confirmado ? (
          <div className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-ok/40 bg-ok/12 py-4 font-display font-bold text-ok">
            <Icone nome="check" className="h-5 w-5" traco={3} />
            Serviço confirmado
          </div>
        ) : servico.recusado ? (
          <div className="mt-2 rounded-2xl border border-borda bg-superficie py-4 text-center">
            <p className="font-display font-bold text-fraca">Você recusou este serviço</p>
            <p className="mt-1 text-xs text-tenue">A central já foi avisada e vai chamar outro motorista.</p>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <Botao tom="ok" largo tamanho="grande" disabled={indo} onClick={() => void responder(true)}>
              <Icone nome="check" className="h-5 w-5" traco={2.6} />
              {indo ? 'Enviando…' : 'Aceito o serviço'}
            </Botao>
            <Botao tom="fantasma" largo disabled={indo} onClick={() => void responder(false)}>
              Não vou conseguir
            </Botao>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-tenue">
          Qualquer imprevisto depois de aceitar, avise a central pelo WhatsApp.
        </p>
      </div>
    </div>
  )
}
