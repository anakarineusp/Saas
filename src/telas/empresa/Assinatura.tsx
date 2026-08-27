import { useEffect, useState } from 'react'
import { Carregando, Erro } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { useAvisar } from '../../componentes/Avisos'
import { Etiqueta } from '../../componentes/Etiqueta'
import { Icone } from '../../componentes/Icone'
import { abrirCheckout, escolherPlano, planos as buscarPlanos } from '../../dados'
import { dataCompleta, moeda } from '../../lib/formato'
import { enderecoDoApp } from '../../lib/whatsapp'
import { useSessao } from '../../sessao'
import type { Ciclo, Plano } from '../../tipos'

const EXPLICACAO: Record<string, string> = {
  teste: 'Você está no teste grátis.',
  ativa: 'Assinatura em dia.',
  atrasada: 'Encontramos um pagamento em atraso.',
  cancelada: 'Sua assinatura está cancelada.',
}

const COR: Record<string, 'ok' | 'atencao' | 'alerta' | 'destaque'> = {
  ativa: 'ok',
  teste: 'destaque',
  atrasada: 'atencao',
  cancelada: 'alerta',
}

export function Assinatura() {
  const { assinatura, recarregar } = useSessao()
  const avisar = useAvisar()
  const [planos, setPlanos] = useState<Plano[]>([])
  const [ciclo, setCiclo] = useState<Ciclo>(assinatura?.ciclo ?? 'mensal')
  const [carregando, setCarregando] = useState(true)
  const [indo, setIndo] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    void buscarPlanos()
      .then(setPlanos)
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregando(false))
  }, [])

  const precoDe = (p: Plano) =>
    ciclo === 'anual' ? (p.preco_anual_centavos ?? p.preco_centavos * 10) : p.preco_centavos

  async function assinar(plano: Plano) {
    setErro('')
    setIndo(plano.id)
    try {
      await escolherPlano(plano.id)
      await recarregar()
      const checkout = await abrirCheckout(plano.id, ciclo)
      window.location.href = checkout
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo('')
    }
  }

  async function copiarConvite() {
    if (!assinatura?.codigo_indicacao) return
    try {
      await navigator.clipboard.writeText(
        `Uso o ${'Transfer'} para organizar minha operação de transfer. Se você entrar pelo meu código ${assinatura.codigo_indicacao}, nós dois ganhamos um mês grátis: ${enderecoDoApp()}/criar-conta`,
      )
      avisar('Convite copiado')
    } catch {
      setErro('Não consegui copiar. Anote o código e mande manualmente.')
    }
  }

  if (carregando) return <Carregando linhas={2} />

  return (
    <div className="px-4 pt-5">
      <h1 className="font-display text-2xl font-bold text-tinta">Assinatura</h1>

      {assinatura && (
        <div
          className={`mt-4 rounded-2xl p-4 ${
            assinatura.pode_usar ? 'painel' : 'border border-alerta/40 bg-alerta/10'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-display font-bold text-tinta">
              {EXPLICACAO[assinatura.status] ?? assinatura.status}
            </p>
            <Etiqueta cor={COR[assinatura.status] ?? 'neutro'}>{assinatura.status}</Etiqueta>
          </div>

          {assinatura.status === 'teste' && (
            <p className="mt-1.5 text-sm text-fraca">
              {assinatura.dias_de_teste > 0
                ? `Faltam ${assinatura.dias_de_teste} ${assinatura.dias_de_teste === 1 ? 'dia' : 'dias'} — até ${dataCompleta(assinatura.teste_termina_em)}.`
                : 'O teste terminou. Escolha um plano para continuar usando.'}
            </p>
          )}
          {assinatura.status === 'ativa' && assinatura.plano && (
            <p className="mt-1.5 text-sm text-fraca">
              Plano {assinatura.plano} · {moeda(assinatura.preco_centavos)}{' '}
              {assinatura.ciclo === 'anual' ? 'por ano' : 'por mês'}
              {assinatura.proxima_cobranca && ` · renova em ${dataCompleta(assinatura.proxima_cobranca)}`}
            </p>
          )}

          {assinatura.meses_de_credito > 0 && (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-ok/12 px-3 py-2 text-sm font-semibold text-ok">
              <Icone nome="check" className="h-4 w-4" traco={2.6} />
              {assinatura.meses_de_credito}{' '}
              {assinatura.meses_de_credito === 1 ? 'mês grátis guardado' : 'meses grátis guardados'} por indicação
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      {/* ------------------------------------------------------------ indicação */}
      {assinatura?.codigo_indicacao && (
        <div className="painel mt-4 rounded-2xl p-4">
          <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">Indique e ganhe</p>
          <p className="mt-2 text-sm leading-relaxed text-fraca">
            Quem entrar com o seu código ganha um mês grátis — e você também, assim que essa pessoa virar cliente.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="font-display flex-1 rounded-xl border border-dashed border-bordaforte bg-fundo2 px-4 py-3 text-center text-lg font-extrabold tracking-[0.2em] text-destaque">
              {assinatura.codigo_indicacao}
            </span>
            <Botao tom="contorno" onClick={() => void copiarConvite()}>
              <Icone nome="copiar" className="h-4 w-4" />
              Copiar
            </Botao>
          </div>
          <p className="mt-2 text-xs text-tenue">
            {assinatura.indicacoes_confirmadas} de {assinatura.indicacoes_feitas}{' '}
            {assinatura.indicacoes_feitas === 1 ? 'indicação virou cliente' : 'indicações viraram clientes'}.
          </p>
        </div>
      )}

      {/* --------------------------------------------------------------- planos */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">Planos</p>
        <div className="flex items-center gap-1 rounded-xl border border-borda bg-superficie p-1">
          {(['mensal', 'anual'] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setCiclo(opcao)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                ciclo === opcao ? 'bg-destaque text-[#04121f]' : 'text-fraca'
              }`}
            >
              {opcao}
            </button>
          ))}
        </div>
      </div>

      {ciclo === 'anual' && (
        <p className="mt-2 text-xs font-semibold text-ok">No anual você paga 10 meses e usa 12.</p>
      )}

      <div className="mt-3 space-y-3">
        {planos.map((plano) => {
          const atual = assinatura?.plano_id === plano.id && assinatura.status === 'ativa' && assinatura.ciclo === ciclo
          return (
            <div key={plano.id} className={`rounded-2xl p-4 ${atual ? 'border border-ok/40 bg-ok/8' : 'painel'}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display font-bold text-tinta">{plano.nome}</span>
                <span className="font-display font-bold text-tinta tabular-nums">
                  {moeda(precoDe(plano))}
                  <span className="text-xs font-normal text-tenue">{ciclo === 'anual' ? ' /ano' : ' /mês'}</span>
                </span>
              </div>
              <p className="mt-1 text-sm text-fraca">{plano.descricao}</p>
              <p className="mt-1 text-xs text-tenue">
                {plano.limite_motoristas ? `Até ${plano.limite_motoristas} motoristas` : 'Motoristas à vontade'}
              </p>
              <div className="mt-3">
                <Botao
                  largo
                  tom={atual ? 'contorno' : 'principal'}
                  disabled={atual || indo !== ''}
                  onClick={() => void assinar(plano)}
                >
                  {atual ? 'Seu plano atual' : indo === plano.id ? 'Abrindo o pagamento…' : 'Assinar'}
                </Botao>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-tenue">
        PIX, boleto ou cartão, com renovação automática. Cancele quando quiser.
      </p>
    </div>
  )
}
