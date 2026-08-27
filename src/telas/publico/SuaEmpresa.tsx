import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Carregando, Erro } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo, Entrada } from '../../componentes/Campos'
import { MolduraPublica } from '../../componentes/MolduraPublica'
import { Icone } from '../../componentes/Icone'
import {
  ajustes as buscarAjustes, aplicarCupom, criarEmpresa, iniciarTesteComCartao, planos as buscarPlanos,
} from '../../dados'
import { moeda } from '../../lib/formato'
import type { Plano } from '../../tipos'
import { useSessao } from '../../sessao'

/** Segundo passo do cadastro: os dados da empresa. */
export function SuaEmpresa() {
  const { carregando, entrou, perfil, recarregar } = useSessao()
  const [empresa, setEmpresa] = useState('')
  const [seuNome, setSeuNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')
  const [documento, setDocumento] = useState('')
  const [indicacao, setIndicacao] = useState('')
  const [cupom, setCupom] = useState('')
  const [parametros] = useSearchParams()
  const [planoEscolhido, setPlanoEscolhido] = useState(parametros.get('plano') ?? 'equipe')
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)

  // Quando a administração liga o cartão no teste, aparece um segundo passo.
  const [pedeCartao, setPedeCartao] = useState(false)
  const [planos, setPlanos] = useState<Plano[]>([])
  const [passo, setPasso] = useState<'empresa' | 'cartao'>('empresa')
  const [plano, setPlano] = useState('')
  const [cartao, setCartao] = useState({ nome: '', numero: '', mes: '', ano: '', codigo: '' })
  const [titular, setTitular] = useState({ nome: '', documento: '', cep: '', numero: '' })
  const navegar = useNavigate()

  useEffect(() => {
    void buscarAjustes()
      .then((a) => setPedeCartao(a.exigir_cartao_no_teste))
      .catch(() => setPedeCartao(false))
    void buscarPlanos()
      .then((lista) => {
        setPlanos(lista)
        setPlano((atual) => atual || lista[1]?.id || lista[0]?.id || '')
      })
      .catch(() => setPlanos([]))
  }, [])

  async function enviar() {
    setErro('')
    setIndo(true)
    try {
      await criarEmpresa({ empresa, seuNome, telefone, cidade, documento, indicacao, plano: planoEscolhido })
      // O cupom é opcional: se ele não valer, o cadastro não pode ser perdido por isso.
      if (cupom.trim()) {
        try {
          await aplicarCupom(cupom.trim())
        } catch (e) {
          setErro(`A empresa foi criada, mas o cupom não valeu: ${(e as Error).message}`)
        }
      }
      await recarregar()
      if (pedeCartao) {
        setTitular((t) => ({ ...t, nome: t.nome || seuNome, documento: t.documento || documento }))
        setPasso('cartao')
      } else {
        navegar('/app')
      }
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo(false)
    }
  }

  async function enviarCartao() {
    setErro('')
    setIndo(true)
    try {
      await iniciarTesteComCartao({ plano, cartao, titular })
      await recarregar()
      navegar('/app')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo(false)
    }
  }

  const cartaoCompleto =
    cartao.nome.trim().length > 2 &&
    cartao.numero.replace(/\D/g, '').length >= 13 &&
    cartao.mes.length >= 1 &&
    cartao.ano.length >= 2 &&
    cartao.codigo.length >= 3 &&
    titular.documento.trim().length >= 11

  if (carregando) return <Carregando linhas={2} />
  if (!entrou) return <Navigate to="/entrar" replace />

  // Quem já tem cadastro não precisa desta tela.
  if (perfil) {
    const destino = perfil.papel === 'admin' ? '/admin' : perfil.papel === 'motorista' ? '/motorista' : '/app'
    return <Navigate to={destino} replace />
  }

  if (passo === 'cartao') {
    const escolhido = planos.find((p) => p.id === plano)
    return (
      <MolduraPublica
        titulo="Seu cartão"
        subtitulo="Os 7 dias são de graça. A primeira cobrança só acontece no oitavo dia, e você pode cancelar antes."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void enviarCartao()
          }}
        >
          <Campo rotulo="Plano">
            <select
              value={plano}
              onChange={(e) => setPlano(e.target.value)}
              className="w-full appearance-none rounded-xl border border-borda bg-fundo2 px-3.5 py-3 text-tinta outline-none focus:border-destaque"
            >
              {planos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — {moeda(p.preco_centavos)} por mês
                </option>
              ))}
            </select>
          </Campo>

          <Campo rotulo="Nome impresso no cartão">
            <Entrada value={cartao.nome} onChange={(e) => setCartao({ ...cartao, nome: e.target.value })} />
          </Campo>
          <Campo rotulo="Número do cartão">
            <Entrada
              inputMode="numeric"
              autoComplete="cc-number"
              value={cartao.numero}
              onChange={(e) => setCartao({ ...cartao, numero: e.target.value })}
            />
          </Campo>
          <div className="grid grid-cols-3 gap-3">
            <Campo rotulo="Mês">
              <Entrada inputMode="numeric" placeholder="09" value={cartao.mes}
                onChange={(e) => setCartao({ ...cartao, mes: e.target.value })} />
            </Campo>
            <Campo rotulo="Ano">
              <Entrada inputMode="numeric" placeholder="2030" value={cartao.ano}
                onChange={(e) => setCartao({ ...cartao, ano: e.target.value })} />
            </Campo>
            <Campo rotulo="Código">
              <Entrada inputMode="numeric" placeholder="123" value={cartao.codigo}
                onChange={(e) => setCartao({ ...cartao, codigo: e.target.value })} />
            </Campo>
          </div>

          <Campo rotulo="CPF ou CNPJ do titular">
            <Entrada inputMode="numeric" value={titular.documento}
              onChange={(e) => setTitular({ ...titular, documento: e.target.value })} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="CEP">
              <Entrada inputMode="numeric" value={titular.cep}
                onChange={(e) => setTitular({ ...titular, cep: e.target.value })} />
            </Campo>
            <Campo rotulo="Número">
              <Entrada value={titular.numero}
                onChange={(e) => setTitular({ ...titular, numero: e.target.value })} />
            </Campo>
          </div>

          <Erro>{erro}</Erro>

          <div className="painel flex items-start gap-3 rounded-xl p-3.5">
            <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-ok" traco={2.6} />
            <p className="text-xs leading-relaxed text-fraca">
              Hoje não sai nada do seu cartão. A primeira cobrança de{' '}
              <strong className="text-tinta">{moeda(escolhido?.preco_centavos)}</strong> acontece daqui a 7 dias, e
              você cancela quando quiser.
            </p>
          </div>

          <Botao type="submit" largo tamanho="grande" disabled={indo || !cartaoCompleto}>
            {indo ? 'Validando…' : 'Começar os 7 dias'}
          </Botao>
        </form>
      </MolduraPublica>
    )
  }

  return (
    <MolduraPublica
      titulo="Sua empresa"
      subtitulo={pedeCartao ? 'Primeiro os dados da empresa. Depois, o cartão.' : 'Falta só isso para começar os 7 dias.'}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void enviar()
        }}
      >
        <div>
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-fraca uppercase">
            Como é a sua operação
          </span>
          <div className="grid gap-2">
            {planos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanoEscolhido(p.id)}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  planoEscolhido === p.id ? 'border-destaque bg-superficie2' : 'border-borda hover:border-bordaforte'
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-tinta">{p.nome}</span>
                  <span className="text-xs text-tenue tabular-nums">{moeda(p.preco_centavos)}/mês</span>
                </span>
                <span className="mt-0.5 block text-xs text-fraca">{p.descricao}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-tenue">
            Dá para trocar depois. Os 7 dias são grátis em qualquer um.
          </p>
        </div>

        <Campo rotulo={planoEscolhido === 'solo' ? 'Nome do seu serviço' : 'Nome da empresa'}>
          <Entrada
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            placeholder={planoEscolhido === 'solo' ? 'Jocemar Transfer' : 'Serra Transfer'}
          />
        </Campo>
        <Campo rotulo="Seu nome">
          <Entrada value={seuNome} onChange={(e) => setSeuNome(e.target.value)} />
        </Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo rotulo="WhatsApp">
            <Entrada
              inputMode="numeric"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="5554999000000"
            />
          </Campo>
          <Campo rotulo="Cidade">
            <Entrada value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Gramado" />
          </Campo>
        </div>
        <Campo rotulo="CNPJ ou CPF" dica="Usado só na nota da assinatura.">
          <Entrada inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value)} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Código de indicação" dica="Vocês dois ganham um mês.">
            <Entrada
              value={indicacao}
              onChange={(e) => setIndicacao(e.target.value.toUpperCase())}
              placeholder="opcional"
              maxLength={8}
            />
          </Campo>
          <Campo rotulo="Cupom" dica="Se você recebeu um.">
            <Entrada
              value={cupom}
              onChange={(e) => setCupom(e.target.value.toUpperCase())}
              placeholder="opcional"
              maxLength={20}
            />
          </Campo>
        </div>
        <Erro>{erro}</Erro>
        <Botao type="submit" largo tamanho="grande" disabled={indo || !empresa.trim() || !seuNome.trim()}>
          {indo ? 'Criando…' : pedeCartao ? 'Continuar' : 'Começar os 7 dias'}
        </Botao>
      </form>
    </MolduraPublica>
  )
}
