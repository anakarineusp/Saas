import { useCallback, useEffect, useState } from 'react'
import { Carregando, Erro, Vazio } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { useAvisar } from '../../componentes/Avisos'
import { BotaoTema } from '../../componentes/BotaoTema'
import { Busca, Campo, Entrada } from '../../componentes/Campos'
import { Etiqueta } from '../../componentes/Etiqueta'
import { Folha } from '../../componentes/Folha'
import { Icone } from '../../componentes/Icone'
import { Suporte } from '../../componentes/Suporte'
import {
  ajustes as buscarAjustes, painelClientes, painelResumo, pagamentos as buscarPagamentos,
  planos as buscarPlanos, sair, salvarAjuste, salvarPlano,
} from '../../dados'
import { dataCompleta, emReais, moeda, paraCentavos } from '../../lib/formato'
import type { Ajustes, Cliente, Plano, Resumo } from '../../tipos'

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

type Aba = 'clientes' | 'pagamentos' | 'planos' | 'ajustes'

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'clientes', rotulo: 'Clientes' },
  { id: 'pagamentos', rotulo: 'Pagamentos' },
  { id: 'planos', rotulo: 'Planos' },
  { id: 'ajustes', rotulo: 'Ajustes' },
]

const CORES: Record<string, 'ok' | 'atencao' | 'alerta' | 'destaque' | 'neutro'> = {
  ativa: 'ok',
  teste: 'destaque',
  atrasada: 'atencao',
  cancelada: 'neutro',
  pago: 'ok',
  pendente: 'atencao',
  falhou: 'alerta',
  estornado: 'neutro',
}

function Numero({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${destaque ? 'border border-destaque/40 bg-destaque/10' : 'painel'}`}>
      <p className="text-xs text-tenue">{rotulo}</p>
      <p className={`font-display mt-1 text-xl font-bold tabular-nums ${destaque ? 'text-destaque' : 'text-tinta'}`}>
        {valor}
      </p>
    </div>
  )
}

/** Formulário de preço e limites de um plano. */
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
        <Entrada
          inputMode="numeric"
          value={limite}
          onChange={(e) => setLimite(e.target.value)}
          placeholder="sem limite"
        />
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
        O preço novo vale na hora para quem ainda vai assinar. Quem já é cliente continua pagando o valor combinado
        até você mexer na cobrança dele no Asaas.
      </p>
    </div>
  )
}

/** Painel de quem vende o sistema. */
export function Painel() {
  const avisar = useAvisar()
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [ajustes, setAjustes] = useState<Ajustes | null>(null)
  const [aba, setAba] = useState<Aba>('clientes')
  const [procura, setProcura] = useState('')
  const [editando, setEditando] = useState<Plano | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [r, c, p, pl, aj] = await Promise.all([
        painelResumo(), painelClientes(), buscarPagamentos(), buscarPlanos(), buscarAjustes(),
      ])
      setResumo(r)
      setClientes(c)
      setPagamentos(p as Pagamento[])
      setPlanos(pl)
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

  async function mudarAjuste(chave: string, valor: unknown, recado: string) {
    setErro('')
    try {
      await salvarAjuste(chave, valor)
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

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pt-6 pb-24">
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

      {resumo && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Numero rotulo="Recebido no mês" valor={moeda(resumo.recebido_mes_centavos)} destaque />
          <Numero rotulo="Mensal recorrente" valor={moeda(resumo.recorrente_centavos)} />
          <Numero rotulo="Assinantes" valor={String(resumo.assinantes)} />
          <Numero rotulo="Em teste" valor={String(resumo.em_teste)} />
        </div>
      )}

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-borda bg-superficie p-1">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAba(item.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              aba === item.id ? 'bg-destaque text-[#04121f]' : 'text-fraca hover:text-tinta'
            }`}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------- clientes */}
      {aba === 'clientes' && (
        <>
          <div className="mt-4">
            <Busca valor={procura} aoMudar={setProcura} placeholder="Procurar cliente" />
          </div>
          <div className="mt-4 space-y-2">
            {clientesFiltrados.map((c) => (
              <div key={c.id} className="painel rounded-2xl p-4">
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
                  <p className="text-tenue">
                    Plano <span className="font-semibold text-tinta">{c.plano ?? '—'}</span>
                  </p>
                  <p className="text-tenue">
                    Motoristas <span className="font-semibold text-tinta tabular-nums">{c.motoristas}</span>
                  </p>
                  <p className="text-tenue">
                    Serviços <span className="font-semibold text-tinta tabular-nums">{c.servicos}</span>
                  </p>
                  <p className="text-tenue">
                    Já pagou <span className="font-semibold text-tinta tabular-nums">{moeda(c.pago_centavos)}</span>
                  </p>
                </div>
                <p className="mt-2 text-xs text-tenue">
                  Entrou em {dataCompleta(c.criada_em)}
                  {c.proxima_cobranca && ` · renova em ${dataCompleta(c.proxima_cobranca)}`}
                </p>
              </div>
            ))}
            {clientesFiltrados.length === 0 && (
              <Vazio titulo={busca ? 'Nenhum cliente com esse nome' : 'Nenhuma empresa cadastrada ainda'} />
            )}
          </div>
        </>
      )}

      {/* ----------------------------------------------------------- pagamentos */}
      {aba === 'pagamentos' && (
        <div className="mt-4 space-y-2">
          {pagamentos.map((p) => (
            <div key={p.id} className="painel flex items-center justify-between gap-3 rounded-2xl p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-tinta">{nomeDaEmpresa(p.empresa_id)}</p>
                <p className="text-xs text-tenue">
                  {[
                    p.metodo,
                    p.pago_em
                      ? `pago em ${dataCompleta(p.pago_em)}`
                      : p.vencimento
                        ? `vence em ${dataCompleta(p.vencimento)}`
                        : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
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
        <div className="mt-4 space-y-2">
          <p className="text-sm text-fraca">
            Toque num plano para mudar o preço, o nome ou o limite de motoristas. Vale na hora, sem publicar nada.
          </p>
          {planos.map((plano) => (
            <button
              key={plano.id}
              type="button"
              onClick={() => setEditando(plano)}
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
                  {moeda(plano.preco_centavos)}
                  <span className="text-xs font-normal text-tenue"> /mês</span>
                </span>
                <span className="block text-xs text-tenue tabular-nums">
                  {moeda(plano.preco_anual_centavos ?? plano.preco_centavos * 10)} /ano
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* -------------------------------------------------------------- ajustes */}
      {aba === 'ajustes' && ajustes && (
        <div className="mt-4 space-y-3">
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
                  void mudarAjuste(
                    'exigir_cartao_no_teste',
                    !ajustes.exigir_cartao_no_teste,
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
              <p className="mt-3 rounded-xl bg-atencao/10 px-3 py-2 text-xs text-atencao">
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
                  onClick={() =>
                    void mudarAjuste('meses_de_premio_por_indicacao', meses, `Prêmio de ${meses} mês(es)`)
                  }
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-colors ${
                    ajustes.meses_de_premio_por_indicacao === meses
                      ? 'border-destaque bg-destaque/10 text-destaque'
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

      <Folha aberta={editando !== null} aoFechar={() => setEditando(null)} titulo="Plano">
        {editando && (
          <FormPlano
            inicial={editando}
            aoSalvar={(p) => {
              void (async () => {
                setErro('')
                try {
                  await salvarPlano(p)
                  await carregar()
                  setEditando(null)
                  avisar('Plano atualizado')
                } catch (e) {
                  setErro((e as Error).message)
                }
              })()
            }}
          />
        )}
      </Folha>

      <Suporte />
    </div>
  )
}
