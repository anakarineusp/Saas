import { useCallback, useEffect, useState } from 'react'
import { Carregando, Erro, Vazio } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { useAvisar } from '../../componentes/Avisos'
import { BotaoTema } from '../../componentes/BotaoTema'
import { Busca, Campo, Entrada, Selecao } from '../../componentes/Campos'
import { Etiqueta } from '../../componentes/Etiqueta'
import { Folha } from '../../componentes/Folha'
import { GraficoDeMeses } from '../../componentes/GraficoDeMeses'
import { Icone } from '../../componentes/Icone'
import { Suporte } from '../../componentes/Suporte'
import { EditorDaVitrine } from './EditorDaVitrine'
import {
  ajustes as buscarAjustes, cupons as buscarCupons, esticarTeste, excluirCupom, excluirEmpresa,
  mudarAssinatura, painelClientes, painelIndicadores, pagamentos as buscarPagamentos,
  planos as buscarPlanos, receitaPorMes, sair, salvarAjuste, salvarCupom, salvarEmpresa, salvarPlano,
} from '../../dados'
import { dataCompleta, emReais, moeda, paraCentavos } from '../../lib/formato'
import type { Ajustes, Cliente, Cupom, Indicadores, MesDeReceita, Plano, StatusAssinatura } from '../../tipos'

type Pagamento = {
  id: string
  empresa_id: string
  valor_centavos: number
  status: string
  metodo: string | null
  vencimento: string | null
  pago_em: string | null
  criado_em: string
}

type Aba = 'numeros' | 'clientes' | 'pagamentos' | 'planos' | 'cupons' | 'vitrine' | 'ajustes'

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'numeros', rotulo: 'Números' },
  { id: 'clientes', rotulo: 'Clientes' },
  { id: 'pagamentos', rotulo: 'Pagamentos' },
  { id: 'planos', rotulo: 'Planos' },
  { id: 'cupons', rotulo: 'Cupons' },
  { id: 'vitrine', rotulo: 'Página inicial' },
  { id: 'ajustes', rotulo: 'Ajustes' },
]

const CORES: Record<string, 'ok' | 'atencao' | 'alerta' | 'destaque' | 'neutro'> = {
  ativa: 'ok', teste: 'destaque', atrasada: 'atencao', cancelada: 'neutro',
  pago: 'ok', pendente: 'atencao', falhou: 'alerta', estornado: 'neutro',
}

/** Um número que importa, com a comparação quando ela existe. */
function Indicador({
  rotulo, valor, dica, variacao, destaque,
}: {
  rotulo: string
  valor: string
  dica?: string
  variacao?: number | null
  destaque?: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 ${destaque ? 'painel border-l-2 border-l-destaque' : 'painel'}`}>
      <p className="text-xs text-tenue">{rotulo}</p>
      <p className="font-display mt-1 text-xl font-bold text-tinta tabular-nums">{valor}</p>
      {variacao !== undefined && variacao !== null && (
        <p className={`mt-0.5 text-[11px] font-semibold ${variacao >= 0 ? 'text-ok' : 'text-alerta'}`}>
          {variacao >= 0 ? '+' : ''}
          {variacao}% vs mês passado
        </p>
      )}
      {dica && <p className="mt-0.5 text-[11px] text-tenue">{dica}</p>}
    </div>
  )
}

function FormPlano({ inicial, aoSalvar }: { inicial: Plano; aoSalvar: (p: Partial<Plano> & { id: string }) => void }) {
  const [nome, setNome] = useState(inicial.nome)
  const [descricao, setDescricao] = useState(inicial.descricao ?? '')
  const [mensal, setMensal] = useState(emReais(inicial.preco_centavos))
  const [anual, setAnual] = useState(emReais(inicial.preco_anual_centavos ?? inicial.preco_centavos * 10))
  const [limite, setLimite] = useState(inicial.limite_motoristas?.toString() ?? '')

  return (
    <div className="space-y-4">
      <Campo rotulo="Nome do plano">
        <Entrada value={nome} onChange={(e) => setNome(e.target.value)} />
      </Campo>
      <Campo rotulo="Descrição">
        <Entrada value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Preço mensal (R$)">
          <Entrada inputMode="decimal" value={mensal} onChange={(e) => setMensal(e.target.value)} />
        </Campo>
        <Campo rotulo="Preço anual (R$)">
          <Entrada inputMode="decimal" value={anual} onChange={(e) => setAnual(e.target.value)} />
        </Campo>
      </div>
      <Campo rotulo="Limite de motoristas" dica="Deixe vazio para não ter limite.">
        <Entrada inputMode="numeric" value={limite} onChange={(e) => setLimite(e.target.value)} placeholder="sem limite" />
      </Campo>
      <Botao
        largo
        tamanho="grande"
        onClick={() =>
          aoSalvar({
            id: inicial.id,
            nome: nome.trim(),
            descricao: descricao.trim() || null,
            preco_centavos: paraCentavos(mensal),
            preco_anual_centavos: paraCentavos(anual),
            limite_motoristas: limite.trim() ? Number(limite) : null,
          })
        }
      >
        Salvar plano
      </Botao>
      <p className="text-center text-xs leading-relaxed text-tenue">
        O preço novo vale para quem ainda vai assinar. Quem já é cliente continua no valor combinado até você mexer
        na cobrança dele no Asaas.
      </p>
    </div>
  )
}

function FormCupom({ inicial, aoSalvar }: { inicial: Cupom | null; aoSalvar: (c: Partial<Cupom> & { codigo: string }, novo: boolean) => void }) {
  const novo = inicial === null
  const [c, setC] = useState({
    codigo: inicial?.codigo ?? '',
    descricao: inicial?.descricao ?? '',
    tipo: inicial?.tipo ?? ('meses_gratis' as Cupom['tipo']),
    valor: inicial?.valor?.toString() ?? '1',
    usos_maximos: inicial?.usos_maximos?.toString() ?? '',
    validade: inicial?.validade ?? '',
    ativo: inicial?.ativo ?? true,
  })

  return (
    <div className="space-y-4">
      <Campo rotulo="Código" dica="É o que o cliente digita no cadastro.">
        <Entrada
          value={c.codigo}
          disabled={!novo}
          onChange={(e) => setC({ ...c, codigo: e.target.value.toUpperCase().replace(/\s/g, '') })}
          placeholder="PIONEIRO"
        />
      </Campo>
      <Campo rotulo="Do que se trata">
        <Entrada
          value={c.descricao}
          onChange={(e) => setC({ ...c, descricao: e.target.value })}
          placeholder="Dois meses grátis para os primeiros clientes"
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="O que dá">
          <Selecao value={c.tipo} onChange={(e) => setC({ ...c, tipo: e.target.value as Cupom['tipo'] })}>
            <option value="meses_gratis">Meses grátis</option>
            <option value="percentual">Desconto em %</option>
            <option value="valor">Desconto em R$</option>
          </Selecao>
        </Campo>
        <Campo rotulo={c.tipo === 'meses_gratis' ? 'Quantos meses' : c.tipo === 'percentual' ? 'Quantos %' : 'Quantos reais'}>
          <Entrada inputMode="numeric" value={c.valor} onChange={(e) => setC({ ...c, valor: e.target.value })} />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Limite de usos" dica="Vazio = sem limite.">
          <Entrada inputMode="numeric" value={c.usos_maximos} onChange={(e) => setC({ ...c, usos_maximos: e.target.value })} />
        </Campo>
        <Campo rotulo="Vale até" dica="Vazio = sem prazo.">
          <Entrada type="date" value={c.validade} onChange={(e) => setC({ ...c, validade: e.target.value })} />
        </Campo>
      </div>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={c.ativo}
          onChange={(e) => setC({ ...c, ativo: e.target.checked })}
          className="h-4 w-4 accent-[var(--c-destaque)]"
        />
        <span className="text-sm text-fraca">Cupom ativo</span>
      </label>
      <Botao
        largo
        tamanho="grande"
        disabled={!c.codigo.trim() || !Number(c.valor)}
        onClick={() =>
          aoSalvar(
            {
              codigo: c.codigo.trim(),
              descricao: c.descricao.trim() || null,
              tipo: c.tipo,
              valor: Number(c.valor),
              usos_maximos: c.usos_maximos.trim() ? Number(c.usos_maximos) : null,
              validade: c.validade || null,
              ativo: c.ativo,
            },
            novo,
          )
        }
      >
        Salvar cupom
      </Botao>
    </div>
  )
}

function FormCliente({
  cliente, planos, aoSalvar, aoEsticar, aoExcluir,
}: {
  cliente: Cliente
  planos: Plano[]
  aoSalvar: (dados: Record<string, unknown>, assinatura: Record<string, unknown>) => void
  aoEsticar: (dias: number) => void
  aoExcluir: () => void
}) {
  const [nome, setNome] = useState(cliente.nome)
  const [telefone, setTelefone] = useState(cliente.telefone ?? '')
  const [cidade, setCidade] = useState(cliente.cidade ?? '')
  const [documento, setDocumento] = useState(cliente.documento ?? '')
  const [status, setStatus] = useState<StatusAssinatura>(cliente.status ?? 'teste')
  const [plano, setPlano] = useState(cliente.plano_id ?? '')

  return (
    <div className="space-y-4">
      <Campo rotulo="Nome da empresa">
        <Entrada value={nome} onChange={(e) => setNome(e.target.value)} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="WhatsApp">
          <Entrada value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </Campo>
        <Campo rotulo="Cidade">
          <Entrada value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </Campo>
      </div>
      <Campo rotulo="CNPJ ou CPF">
        <Entrada value={documento} onChange={(e) => setDocumento(e.target.value)} />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Situação">
          <Selecao value={status} onChange={(e) => setStatus(e.target.value as StatusAssinatura)}>
            <option value="teste">Em teste</option>
            <option value="ativa">Ativa</option>
            <option value="atrasada">Atrasada</option>
            <option value="cancelada">Cancelada</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Plano">
          <Selecao value={plano} onChange={(e) => setPlano(e.target.value)}>
            <option value="">Sem plano</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </Selecao>
        </Campo>
      </div>

      <Botao
        largo
        tamanho="grande"
        onClick={() =>
          aoSalvar(
            { nome: nome.trim(), telefone: telefone.trim() || null, cidade: cidade.trim() || null, documento: documento.trim() || null },
            { status, plano_id: plano || null },
          )
        }
      >
        Salvar cliente
      </Botao>

      <div className="painel rounded-xl p-4">
        <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">Esticar o teste</p>
        <p className="mt-1.5 text-sm text-fraca">
          Termina em {dataCompleta(cliente.teste_termina_em)}. Serve para dar mais um prazo numa negociação.
        </p>
        <div className="mt-3 flex gap-2">
          {[7, 15, 30].map((dias) => (
            <Botao key={dias} tom="contorno" tamanho="pequeno" onClick={() => aoEsticar(dias)}>
              + {dias} dias
            </Botao>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={aoExcluir}
        className="w-full pt-2 text-center text-xs font-semibold text-alerta underline underline-offset-2"
      >
        excluir esta empresa e tudo o que é dela
      </button>
    </div>
  )
}

/** Painel de quem vende o sistema. */
export function Painel() {
  const avisar = useAvisar()
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null)
  const [receita, setReceita] = useState<MesDeReceita[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [cupons, setCupons] = useState<Cupom[]>([])
  const [ajustes, setAjustes] = useState<Ajustes | null>(null)
  const [aba, setAba] = useState<Aba>('numeros')
  const [procura, setProcura] = useState('')
  const [editandoPlano, setEditandoPlano] = useState<Plano | null>(null)
  const [editandoCupom, setEditandoCupom] = useState<Cupom | null | undefined>(undefined)
  const [editandoCliente, setEditandoCliente] = useState<Cliente | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [ind, rec, c, p, pl, cup, aj] = await Promise.all([
        painelIndicadores(), receitaPorMes(12), painelClientes(), buscarPagamentos(),
        buscarPlanos(), buscarCupons().catch(() => []), buscarAjustes(),
      ])
      setIndicadores(ind)
      setReceita(rec)
      setClientes(c)
      setPagamentos(p as Pagamento[])
      setPlanos(pl)
      setCupons(cup)
      setAjustes(aj)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function tentar(acao: () => Promise<unknown>, recado: string) {
    setErro('')
    try {
      await acao()
      await carregar()
      avisar(recado)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  if (carregando) return <Carregando />

  const nomeDaEmpresa = (id: string) => clientes.find((c) => c.id === id)?.nome ?? 'empresa removida'
  const busca = procura.trim().toLowerCase()
  const clientesFiltrados = busca
    ? clientes.filter((c) => `${c.nome} ${c.cidade ?? ''} ${c.documento ?? ''}`.toLowerCase().includes(busca))
    : clientes

  const variacao = (agora: number, antes: number) =>
    antes > 0 ? Math.round(((agora - antes) / antes) * 100) : null

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-5 pt-6 pb-24">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] text-tenue uppercase">Administração</p>
          <h1 className="font-display mt-1 text-2xl font-bold text-tinta">O seu negócio</h1>
        </div>
        <div className="flex items-center gap-0.5">
          <BotaoTema />
          <button
            type="button"
            onClick={() => void sair()}
            aria-label="Sair"
            className="rounded-full p-2 text-fraca hover:bg-superficie2 hover:text-tinta"
          >
            <Icone nome="sair" className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      <div className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-borda bg-superficie p-1">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAba(item.id)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              aba === item.id ? 'bg-superficie2 text-tinta' : 'text-tenue hover:text-fraca'
            }`}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {/* --------------------------------------------------------------- números */}
      {aba === 'numeros' && indicadores && (
        <div className="mt-5 space-y-5">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.15em] text-tenue uppercase">Dinheiro</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Indicador
                rotulo="Receita recorrente"
                valor={moeda(indicadores.recorrente_centavos)}
                dica="por mês, dos planos ativos"
                destaque
              />
              <Indicador rotulo="Projeção do ano" valor={moeda(indicadores.anual_projetado_centavos)} />
              <Indicador
                rotulo="Recebido no mês"
                valor={moeda(indicadores.recebido_mes_centavos)}
                variacao={variacao(indicadores.recebido_mes_centavos, indicadores.recebido_mes_passado_centavos)}
              />
              <Indicador rotulo="A receber" valor={moeda(indicadores.a_receber_centavos)} dica="cobranças em aberto" />
            </div>
          </div>

          <GraficoDeMeses dados={receita} titulo="Faturamento mês a mês" />

          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.15em] text-tenue uppercase">Clientes</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Indicador rotulo="Assinantes" valor={String(indicadores.assinantes)} />
              <Indicador rotulo="Em teste" valor={String(indicadores.em_teste)} dica={`${indicadores.testes_vencidos} venceram`} />
              <Indicador
                rotulo="Novos no mês"
                valor={String(indicadores.novos_no_mes)}
                variacao={variacao(indicadores.novos_no_mes, indicadores.novos_mes_passado)}
              />
              <Indicador rotulo="Ticket médio" valor={moeda(indicadores.ticket_medio_centavos)} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.15em] text-tenue uppercase">Saúde do negócio</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Indicador
                rotulo="Vira cliente"
                valor={`${indicadores.conversao_porcento}%`}
                dica="dos que testaram"
              />
              <Indicador
                rotulo="Cancelamento"
                valor={`${indicadores.cancelamento_porcento}%`}
                dica={`${indicadores.cancelados} cancelaram`}
              />
              <Indicador rotulo="Em atraso" valor={String(indicadores.atrasados)} dica="precisam de cobrança" />
              <Indicador rotulo="Indicações que pagaram" valor={String(indicadores.indicacoes_confirmadas)} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.15em] text-tenue uppercase">Uso do sistema</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Indicador rotulo="Empresas cadastradas" valor={String(indicadores.empresas)} />
              <Indicador rotulo="Motoristas" valor={String(indicadores.motoristas_no_sistema)} />
              <Indicador rotulo="Serviços lançados" valor={String(indicadores.servicos_no_sistema)} />
              <Indicador rotulo="Recebido desde o começo" valor={moeda(indicadores.recebido_total_centavos)} />
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- clientes */}
      {aba === 'clientes' && (
        <>
          <div className="mt-5">
            <Busca valor={procura} aoMudar={setProcura} placeholder="Procurar cliente" />
          </div>
          <div className="mt-4 space-y-2">
            {clientesFiltrados.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setEditandoCliente(c)}
                className="painel w-full rounded-2xl p-4 text-left transition-colors hover:border-bordaforte"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display font-bold text-tinta">{c.nome}</p>
                    <p className="text-xs text-tenue">
                      {[c.cidade, c.telefone, c.documento].filter(Boolean).join(' · ') || 'sem dados de contato'}
                    </p>
                  </div>
                  <Etiqueta cor={CORES[c.status ?? ''] ?? 'neutro'}>{c.status ?? 'sem assinatura'}</Etiqueta>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-borda pt-3 text-sm sm:grid-cols-4">
                  <p className="text-tenue">Plano <span className="font-semibold text-tinta">{c.plano ?? '—'}</span></p>
                  <p className="text-tenue">Motoristas <span className="font-semibold text-tinta tabular-nums">{c.motoristas}</span></p>
                  <p className="text-tenue">Serviços <span className="font-semibold text-tinta tabular-nums">{c.servicos}</span></p>
                  <p className="text-tenue">Já pagou <span className="font-semibold text-tinta tabular-nums">{moeda(c.pago_centavos)}</span></p>
                </div>
              </button>
            ))}
            {clientesFiltrados.length === 0 && (
              <Vazio titulo={busca ? 'Nenhum cliente com esse nome' : 'Nenhuma empresa cadastrada ainda'} />
            )}
          </div>
        </>
      )}

      {/* ----------------------------------------------------------- pagamentos */}
      {aba === 'pagamentos' && (
        <div className="mt-5 space-y-2">
          {pagamentos.map((p) => (
            <div key={p.id} className="painel flex items-center justify-between gap-3 rounded-2xl p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-tinta">{nomeDaEmpresa(p.empresa_id)}</p>
                <p className="text-xs text-tenue">
                  {[p.metodo, p.pago_em ? `pago em ${dataCompleta(p.pago_em)}` : p.vencimento ? `vence em ${dataCompleta(p.vencimento)}` : null]
                    .filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Etiqueta cor={CORES[p.status] ?? 'neutro'}>{p.status}</Etiqueta>
                <span className="font-display font-bold text-tinta tabular-nums">{moeda(p.valor_centavos)}</span>
              </div>
            </div>
          ))}
          {pagamentos.length === 0 && <Vazio titulo="Nenhum pagamento registrado ainda" />}
        </div>
      )}

      {/* --------------------------------------------------------------- planos */}
      {aba === 'planos' && (
        <div className="mt-5 space-y-2">
          <p className="text-sm text-fraca">
            Toque num plano para mudar preço, nome ou limite. Vale na hora, sem publicar nada.
          </p>
          {planos.map((plano) => (
            <button
              key={plano.id}
              type="button"
              onClick={() => setEditandoPlano(plano)}
              className="painel flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left transition-colors hover:border-bordaforte"
            >
              <span className="min-w-0">
                <span className="block font-display font-bold text-tinta">{plano.nome}</span>
                <span className="block truncate text-xs text-tenue">
                  {plano.limite_motoristas ? `até ${plano.limite_motoristas} motoristas` : 'motoristas à vontade'}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-display font-bold text-tinta tabular-nums">
                  {moeda(plano.preco_centavos)}<span className="text-xs font-normal text-tenue"> /mês</span>
                </span>
                <span className="block text-xs text-tenue tabular-nums">
                  {moeda(plano.preco_anual_centavos ?? plano.preco_centavos * 10)} /ano
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* --------------------------------------------------------------- cupons */}
      {aba === 'cupons' && (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-fraca">Cupons para os primeiros clientes e para negociação.</p>
            <Botao tamanho="pequeno" onClick={() => setEditandoCupom(null)}>
              <Icone nome="mais" className="h-4 w-4" />
              Novo
            </Botao>
          </div>
          {cupons.map((c) => (
            <div key={c.codigo} className="painel flex items-center gap-3 rounded-2xl p-4">
              <button type="button" onClick={() => setEditandoCupom(c)} className="min-w-0 flex-1 text-left">
                <span className="font-display block font-bold tracking-wider text-tinta">{c.codigo}</span>
                <span className="block truncate text-xs text-tenue">
                  {c.tipo === 'meses_gratis'
                    ? `${c.valor} ${c.valor === 1 ? 'mês grátis' : 'meses grátis'}`
                    : c.tipo === 'percentual'
                      ? `${c.valor}% de desconto`
                      : `${moeda(c.valor * 100)} de desconto`}
                  {' · '}
                  {c.usos} {c.usos_maximos ? `de ${c.usos_maximos}` : ''} usados
                  {c.validade ? ` · até ${dataCompleta(c.validade)}` : ''}
                </span>
              </button>
              <Etiqueta cor={c.ativo ? 'ok' : 'neutro'}>{c.ativo ? 'ativo' : 'desligado'}</Etiqueta>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Excluir o cupom ${c.codigo}?`))
                    void tentar(() => excluirCupom(c.codigo), 'Cupom excluído')
                }}
                aria-label="Excluir"
                className="shrink-0 rounded-full p-2 text-tenue hover:bg-alerta/10 hover:text-alerta"
              >
                <Icone nome="lixeira" className="h-4.5 w-4.5" />
              </button>
            </div>
          ))}
          {cupons.length === 0 && <Vazio titulo="Nenhum cupom criado">Crie um para os primeiros clientes.</Vazio>}
        </div>
      )}

      {aba === 'vitrine' && <EditorDaVitrine />}

      {/* -------------------------------------------------------------- ajustes */}
      {aba === 'ajustes' && ajustes && (
        <div className="mt-5 space-y-3">
          <div className="painel rounded-2xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display font-bold text-tinta">Pedir cartão no teste grátis</p>
                <p className="mt-1 text-sm leading-relaxed text-fraca">
                  Ligado, o cadastro só termina com um cartão informado, e a cobrança começa sozinha no oitavo dia.
                  Costuma trazer menos cadastros, porém mais gente com intenção real de assinar.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={ajustes.exigir_cartao_no_teste}
                onClick={() =>
                  void tentar(
                    () => salvarAjuste('exigir_cartao_no_teste', !ajustes.exigir_cartao_no_teste),
                    ajustes.exigir_cartao_no_teste ? 'Teste sem cartão' : 'Teste com cartão',
                  )
                }
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  ajustes.exigir_cartao_no_teste ? 'bg-destaque' : 'bg-bordaforte'
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                    ajustes.exigir_cartao_no_teste ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {ajustes.exigir_cartao_no_teste && (
              <p className="mt-3 text-xs text-atencao">
                Só funciona depois que a conta da empresa de pagamentos estiver ligada.
              </p>
            )}
          </div>

          <div className="painel rounded-2xl p-4">
            <p className="font-display font-bold text-tinta">Prêmio por indicação</p>
            <p className="mt-1 text-sm text-fraca">
              Quantos meses grátis cada lado ganha quando uma indicação vira cliente pagante.
            </p>
            <div className="mt-3 flex items-center gap-2">
              {[1, 2, 3].map((meses) => (
                <button
                  key={meses}
                  type="button"
                  onClick={() => void tentar(() => salvarAjuste('meses_de_premio_por_indicacao', meses), `Prêmio de ${meses} mês(es)`)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-colors ${
                    ajustes.meses_de_premio_por_indicacao === meses
                      ? 'border-destaque text-destaque'
                      : 'border-borda text-fraca hover:text-tinta'
                  }`}
                >
                  {meses} {meses === 1 ? 'mês' : 'meses'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Folha aberta={editandoPlano !== null} aoFechar={() => setEditandoPlano(null)} titulo="Plano">
        {editandoPlano && (
          <FormPlano
            inicial={editandoPlano}
            aoSalvar={(p) => {
              setEditandoPlano(null)
              void tentar(() => salvarPlano(p), 'Plano atualizado')
            }}
          />
        )}
      </Folha>

      <Folha
        aberta={editandoCupom !== undefined}
        aoFechar={() => setEditandoCupom(undefined)}
        titulo={editandoCupom ? 'Cupom' : 'Novo cupom'}
      >
        {editandoCupom !== undefined && (
          <FormCupom
            inicial={editandoCupom}
            aoSalvar={(c, novo) => {
              setEditandoCupom(undefined)
              void tentar(() => salvarCupom(c, novo), 'Cupom salvo')
            }}
          />
        )}
      </Folha>

      <Folha aberta={editandoCliente !== null} aoFechar={() => setEditandoCliente(null)} titulo="Cliente">
        {editandoCliente && (
          <FormCliente
            cliente={editandoCliente}
            planos={planos}
            aoSalvar={(dados, assinatura) => {
              const id = editandoCliente.id
              setEditandoCliente(null)
              void tentar(async () => {
                await salvarEmpresa(id, dados)
                await mudarAssinatura(id, assinatura)
              }, 'Cliente atualizado')
            }}
            aoEsticar={(dias) => {
              const id = editandoCliente.id
              setEditandoCliente(null)
              void tentar(() => esticarTeste(id, dias), `Teste esticado em ${dias} dias`)
            }}
            aoExcluir={() => {
              const { id, nome } = editandoCliente
              if (!window.confirm(`Excluir ${nome} e todos os dados dela? Isso não tem volta.`)) return
              setEditandoCliente(null)
              void tentar(() => excluirEmpresa(id), 'Empresa excluída')
            }}
          />
        )}
      </Folha>

      <Suporte />
    </div>
  )
}
