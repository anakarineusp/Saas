import { useCallback, useEffect, useState } from 'react'
import { Carregando, Erro, Vazio } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { useAvisar } from '../../componentes/Avisos'
import { Busca, Campo, Entrada, Selecao } from '../../componentes/Campos'
import { Icone } from '../../componentes/Icone'
import { Folha } from '../../componentes/Folha'
import {
  criarConvite, excluirIndicador, excluirMotorista, excluirRota, excluirServico, gravarServico,
  indicadores as buscarIndicadores, motoristas as buscarMotoristas, reputacao as buscarReputacao,
  rotas as buscarRotas, salvarIndicador, salvarMotorista, salvarRota, servicos as buscarServicos,
} from '../../dados'
import { dataCurta, emReais, hojeISO, hora, moeda, paraCentavos, rotuloTipo } from '../../lib/formato'
import { enderecoDoApp } from '../../lib/whatsapp'
import { useSessao } from '../../sessao'
import type { Indicador, Motorista, Reputacao, Rota, Servico, TipoServico } from '../../tipos'

type Secao = 'motoristas' | 'indicadores' | 'servicos' | 'rotas'

const SECOES: { id: Secao; rotulo: string }[] = [
  { id: 'servicos', rotulo: 'Serviços' },
  { id: 'motoristas', rotulo: 'Motoristas' },
  { id: 'indicadores', rotulo: 'Indicadores' },
  { id: 'rotas', rotulo: 'Preços' },
]

/** No plano Solo não existe escalar motorista: o motorista é o dono. */
const SECOES_SOLO: { id: Secao; rotulo: string }[] = [
  { id: 'servicos', rotulo: 'Serviços' },
  { id: 'motoristas', rotulo: 'Meu carro' },
  { id: 'indicadores', rotulo: 'Indicadores' },
  { id: 'rotas', rotulo: 'Preços' },
]

const TITULOS: Record<Secao, string> = {
  motoristas: 'Motorista',
  indicadores: 'Indicador',
  servicos: 'Serviço',
  rotas: 'Preço de rota',
}

function Linha({
  titulo, detalhe, direita, aoEditar, aoExcluir, extra, acoes,
}: {
  titulo: string
  detalhe: string
  direita?: string
  aoEditar: () => void
  aoExcluir: () => void
  extra?: React.ReactNode
  acoes?: React.ReactNode
}) {
  return (
    <div className="painel rounded-2xl">
      <div className="flex items-center gap-2 p-4">
        <button type="button" onClick={aoEditar} className="min-w-0 flex-1 text-left">
          <span className="block truncate font-semibold text-tinta">{titulo}</span>
          <span className="block truncate text-xs text-tenue">{detalhe}</span>
        </button>
        {direita && (
          <span className="shrink-0 font-display text-sm font-bold text-tinta tabular-nums">{direita}</span>
        )}
        {acoes}
        <button
          type="button"
          onClick={aoExcluir}
          aria-label="Excluir"
          className="shrink-0 rounded-full p-2 text-tenue transition-colors hover:bg-alerta/10 hover:text-alerta"
        >
          <Icone nome="lixeira" className="h-4.5 w-4.5" />
        </button>
      </div>
      {extra}
    </div>
  )
}

function FormMotorista({ inicial, aoSalvar }: { inicial: Motorista | null; aoSalvar: (m: Partial<Motorista>) => void }) {
  const [m, setM] = useState<Partial<Motorista>>(
    inicial ?? { nome: '', telefone: '', veiculo: '', lugares: 4, percentual: 40 },
  )
  return (
    <div className="space-y-3">
      <Campo rotulo="Nome">
        <Entrada value={m.nome ?? ''} onChange={(e) => setM({ ...m, nome: e.target.value })} />
      </Campo>
      <Campo rotulo="WhatsApp (com 55 e DDD)">
        <Entrada
          inputMode="numeric"
          placeholder="5554999120031"
          value={m.telefone ?? ''}
          onChange={(e) => setM({ ...m, telefone: e.target.value })}
        />
      </Campo>
      <Campo rotulo="Veículo">
        <Entrada placeholder="Spin" value={m.veiculo ?? ''} onChange={(e) => setM({ ...m, veiculo: e.target.value })} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Lugares">
          <Entrada type="number" inputMode="numeric" value={m.lugares ?? 4}
            onChange={(e) => setM({ ...m, lugares: Number(e.target.value) })} />
        </Campo>
        <Campo rotulo="Percentual (%)">
          <Entrada type="number" inputMode="numeric" value={m.percentual ?? 40}
            onChange={(e) => setM({ ...m, percentual: Number(e.target.value) })} />
        </Campo>
      </div>
      <Botao largo tamanho="grande" disabled={!m.nome?.trim() || !m.telefone?.trim()} onClick={() => aoSalvar(m)}>
        Salvar motorista
      </Botao>
    </div>
  )
}

function FormIndicador({ inicial, aoSalvar }: { inicial: Indicador | null; aoSalvar: (i: Partial<Indicador>) => void }) {
  const [i, setI] = useState<Partial<Indicador>>(inicial ?? { nome: '', comissao: 10, telefone: '' })
  return (
    <div className="space-y-3">
      <Campo rotulo="Nome">
        <Entrada placeholder="Hotel Bertoluci" value={i.nome ?? ''} onChange={(e) => setI({ ...i, nome: e.target.value })} />
      </Campo>
      <Campo rotulo="WhatsApp (com 55 e DDD)">
        <Entrada inputMode="numeric" placeholder="555432861400" value={i.telefone ?? ''}
          onChange={(e) => setI({ ...i, telefone: e.target.value })} />
      </Campo>
      <Campo rotulo="Comissão (%)">
        <Entrada type="number" inputMode="numeric" value={i.comissao ?? 10}
          onChange={(e) => setI({ ...i, comissao: Number(e.target.value) })} />
      </Campo>
      <Botao largo tamanho="grande" disabled={!i.nome?.trim()} onClick={() => aoSalvar(i)}>
        Salvar indicador
      </Botao>
    </div>
  )
}

function FormRota({ inicial, aoSalvar }: { inicial: Rota | null; aoSalvar: (r: Partial<Rota>) => void }) {
  const [r, setR] = useState({
    id: inicial?.id,
    nome: inicial?.nome ?? '',
    origem: inicial?.origem ?? 'Aeroporto Salgado Filho, Porto Alegre',
    destino: inicial?.destino ?? '',
    tipo: (inicial?.tipo ?? 'transfer_in') as TipoServico,
    valor: inicial ? emReais(inicial.valor_centavos) : '480,00',
    pax_ate: inicial?.pax_ate?.toString() ?? '',
  })

  return (
    <div className="space-y-4">
      <Campo rotulo="Nome da rota" dica="Como você chama essa viagem no dia a dia.">
        <Entrada placeholder="POA → Gramado" value={r.nome} onChange={(e) => setR({ ...r, nome: e.target.value })} />
      </Campo>
      <Campo rotulo="Tipo">
        <Selecao value={r.tipo} onChange={(e) => setR({ ...r, tipo: e.target.value as TipoServico })}>
          <option value="transfer_in">Transfer IN</option>
          <option value="transfer_out">Transfer OUT</option>
          <option value="passeio">Passeio</option>
        </Selecao>
      </Campo>
      <Campo rotulo="Origem">
        <Entrada value={r.origem} onChange={(e) => setR({ ...r, origem: e.target.value })} />
      </Campo>
      <Campo rotulo="Destino">
        <Entrada value={r.destino} onChange={(e) => setR({ ...r, destino: e.target.value })} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Preço (R$)">
          <Entrada inputMode="decimal" value={r.valor} onChange={(e) => setR({ ...r, valor: e.target.value })} />
        </Campo>
        <Campo rotulo="Até quantas pessoas" dica="Opcional.">
          <Entrada
            inputMode="numeric"
            value={r.pax_ate}
            onChange={(e) => setR({ ...r, pax_ate: e.target.value })}
            placeholder="6"
          />
        </Campo>
      </div>
      <Botao
        largo
        tamanho="grande"
        disabled={!r.nome.trim() || !r.destino.trim()}
        onClick={() =>
          aoSalvar({
            id: r.id,
            nome: r.nome.trim(),
            origem: r.origem.trim(),
            destino: r.destino.trim(),
            tipo: r.tipo,
            valor_centavos: paraCentavos(r.valor),
            pax_ate: r.pax_ate.trim() ? Number(r.pax_ate) : null,
          })
        }
      >
        Salvar preço
      </Botao>
    </div>
  )
}

function FormServico({
  inicial, indicadores, rotas, aoSalvar,
}: {
  inicial: Servico | null
  indicadores: Indicador[]
  rotas: Rota[]
  aoSalvar: (s: Parameters<typeof gravarServico>[0]) => void
}) {
  const [s, setS] = useState({
    id: inicial?.id,
    data: inicial?.data?.slice(0, 10) ?? hojeISO(),
    hora: inicial ? hora(inicial.hora) : '09:00',
    tipo: (inicial?.tipo ?? 'transfer_in') as TipoServico,
    passageiro: inicial?.passageiro ?? '',
    pax: inicial?.pax ?? 2,
    origem: inicial?.origem ?? 'Aeroporto Salgado Filho, Porto Alegre',
    destino: inicial?.destino ?? '',
    voo: inicial?.voo ?? '',
    valor: inicial ? emReais(inicial.valor_centavos) : '480,00',
    indicador_id: inicial?.indicador_id ?? '',
  })

  /** Escolher uma rota da tabela preenche origem, destino, tipo e valor. */
  function usarRota(id: string) {
    const rota = rotas.find((r) => r.id === id)
    if (!rota) return
    setS((atual) => ({
      ...atual,
      origem: rota.origem,
      destino: rota.destino,
      tipo: rota.tipo ?? atual.tipo,
      valor: emReais(rota.valor_centavos),
    }))
  }

  return (
    <div className="space-y-3">
      {rotas.length > 0 && (
        <Campo rotulo="Usar preço de tabela" dica="Preenche rota e valor de uma vez.">
          <Selecao defaultValue="" onChange={(e) => usarRota(e.target.value)}>
            <option value="">Escolher uma rota…</option>
            {rotas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome} — {moeda(r.valor_centavos)}
              </option>
            ))}
          </Selecao>
        </Campo>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Data">
          <Entrada type="date" value={s.data} onChange={(e) => setS({ ...s, data: e.target.value })} />
        </Campo>
        <Campo rotulo="Hora">
          <Entrada type="time" value={s.hora} onChange={(e) => setS({ ...s, hora: e.target.value })} />
        </Campo>
      </div>
      <Campo rotulo="Tipo">
        <Selecao value={s.tipo} onChange={(e) => setS({ ...s, tipo: e.target.value as TipoServico })}>
          <option value="transfer_in">Transfer IN</option>
          <option value="transfer_out">Transfer OUT</option>
          <option value="passeio">Passeio</option>
        </Selecao>
      </Campo>
      <Campo rotulo="Passageiro">
        <Entrada value={s.passageiro} onChange={(e) => setS({ ...s, passageiro: e.target.value })} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Pax">
          <Entrada type="number" inputMode="numeric" value={s.pax} onChange={(e) => setS({ ...s, pax: Number(e.target.value) })} />
        </Campo>
        <Campo rotulo="Valor cobrado (R$)">
          <Entrada inputMode="decimal" value={s.valor} onChange={(e) => setS({ ...s, valor: e.target.value })} />
        </Campo>
      </div>
      <Campo rotulo="Origem">
        <Entrada value={s.origem} onChange={(e) => setS({ ...s, origem: e.target.value })} />
      </Campo>
      <Campo rotulo="Destino">
        <Entrada value={s.destino} onChange={(e) => setS({ ...s, destino: e.target.value })} />
      </Campo>
      <Campo rotulo="Voo (opcional)">
        <Entrada placeholder="G3 1408" value={s.voo} onChange={(e) => setS({ ...s, voo: e.target.value })} />
      </Campo>
      <Campo rotulo="Indicação">
        <Selecao value={s.indicador_id} onChange={(e) => setS({ ...s, indicador_id: e.target.value })}>
          <option value="">Sem indicação</option>
          {indicadores.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </Selecao>
      </Campo>
      <p className="text-xs text-slate-500">O motorista é escolhido na tela Hoje, tocando no serviço.</p>
      <Botao
        largo
        tamanho="grande"
        disabled={!s.passageiro.trim() || !s.destino.trim()}
        onClick={() =>
          aoSalvar({
            id: s.id,
            data: s.data,
            hora: s.hora,
            tipo: s.tipo,
            passageiro: s.passageiro.trim(),
            pax: s.pax,
            origem: s.origem.trim(),
            destino: s.destino.trim(),
            voo: s.voo.trim() || null,
            valor_centavos: paraCentavos(s.valor),
            indicador_id: s.indicador_id || null,
          })
        }
      >
        Salvar serviço
      </Botao>
    </div>
  )
}

export function Cadastros() {
  const { perfil, assinatura } = useSessao()
  const solo = assinatura?.modo === 'solo'
  const avisar = useAvisar()
  const empresaId = perfil?.empresa_id ?? ''
  const [secao, setSecao] = useState<Secao>('servicos')
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [indicadores, setIndicadores] = useState<Indicador[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [rotas, setRotas] = useState<Rota[]>([])
  const [reputacoes, setReputacoes] = useState<Reputacao[]>([])
  const [editando, setEditando] = useState<{ tipo: Secao; item?: unknown } | null>(null)
  const [convites, setConvites] = useState<Record<string, string>>({})
  const [procura, setProcura] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const hoje = hojeISO()
      const de = `${Number(hoje.slice(0, 4)) - 1}-01-01`
      const ate = `${Number(hoje.slice(0, 4)) + 1}-12-31`
      const [m, i, s, r, rep] = await Promise.all([
        buscarMotoristas(),
        buscarIndicadores(),
        buscarServicos(de, ate),
        buscarRotas().catch(() => []),
        buscarReputacao().catch(() => []),
      ])
      setMotoristas(m)
      setIndicadores(i)
      setServicos([...s].reverse())
      setRotas(r)
      setReputacoes(rep)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function comErro(acao: () => Promise<unknown>, recado?: string) {
    setErro('')
    try {
      await acao()
      await carregar()
      setEditando(null)
      if (recado) avisar(recado)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function convidar(motorista: Motorista) {
    setErro('')
    try {
      const token = await criarConvite(empresaId, motorista.id)
      setConvites((c) => ({ ...c, [motorista.id]: `${enderecoDoApp()}/convite/${token}` }))
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  /** O transfer de volta: mesma gente, rota invertida, no dia seguinte. */
  function duplicarInvertido(s: Servico) {
    const volta = new Date(`${s.data.slice(0, 10)}T12:00:00`)
    volta.setDate(volta.getDate() + 1)
    setEditando({
      tipo: 'servicos',
      item: {
        ...s,
        id: undefined,
        data: volta.toISOString().slice(0, 10),
        tipo: s.tipo === 'transfer_in' ? 'transfer_out' : s.tipo === 'transfer_out' ? 'transfer_in' : s.tipo,
        origem: s.destino,
        destino: s.origem,
        voo: null,
        status: 'sem_motorista',
        motorista_id: null,
      },
    })
  }

  const filtrar = <T,>(lista: T[], texto: (item: T) => string) => {
    const busca = procura.trim().toLowerCase()
    if (!busca) return lista
    return lista.filter((item) => texto(item).toLowerCase().includes(busca))
  }

  const motoristasFiltrados = filtrar(motoristas, (m) => `${m.nome} ${m.veiculo} ${m.telefone}`)
  const indicadoresFiltrados = filtrar(indicadores, (i) => `${i.nome} ${i.telefone ?? ''}`)
  const servicosFiltrados = filtrar(servicos, (s) => `${s.passageiro} ${s.origem} ${s.destino} ${s.voo ?? ''}`)
  const rotasFiltradas = filtrar(rotas, (r) => `${r.nome} ${r.origem} ${r.destino}`)

  if (carregando) return <Carregando />

  return (
    <div className="px-5 pt-6">
      <h1 className="font-display text-2xl font-bold text-tinta">Cadastros</h1>

      {solo && (
        <p className="mt-3 text-sm text-fraca">
          No plano Solo o motorista é você. Ajuste o seu carro em <strong className="text-tinta">Meu carro</strong>.
        </p>
      )}

      <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl border border-borda bg-superficie p-1">
        {(solo ? SECOES_SOLO : SECOES).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSecao(s.id)
              setProcura('')
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              secao === s.id ? 'bg-destaque text-[#04121f]' : 'text-fraca hover:text-tinta'
            }`}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="flex-1">
          <Busca valor={procura} aoMudar={setProcura} placeholder={`Procurar ${TITULOS[secao].toLowerCase()}`} />
        </div>
        {!(solo && secao === 'motoristas' && motoristas.length > 0) && (
          <Botao onClick={() => setEditando({ tipo: secao })}>
            <Icone nome="mais" className="h-4 w-4" />
            Novo
          </Botao>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {secao === 'motoristas' &&
          motoristasFiltrados.map((m) => (
            <Linha
              key={m.id}
              titulo={m.nome}
              detalhe={(() => {
                const rep = reputacoes.find((r) => r.motorista_id === m.id)
                const nota = rep?.media ? ` · ★ ${Number(rep.media).toFixed(1)} (${rep.avaliacoes})` : ''
                return `${m.veiculo} · ${m.lugares} lugares · ${m.percentual}%${nota}${m.perfil_id ? ' · tem conta' : ''}`
              })()}
              aoEditar={() => setEditando({ tipo: 'motoristas', item: m })}
              aoExcluir={() => {
                if (solo) {
                  window.alert('No plano Solo o motorista é você — este cadastro não pode ser excluído.')
                  return
                }
                if (window.confirm(`Excluir ${m.nome}? Os serviços dele ficam sem motorista.`))
                  void comErro(() => excluirMotorista(m.id), 'Motorista excluído')
              }}
              extra={
                !solo && !m.perfil_id && (
                  <div className="border-t border-borda px-4 py-2.5">
                    {convites[m.id] ? (
                      <p className="text-xs break-all text-tenue">
                        Mande este link para {m.nome}:{' '}
                        <span className="text-destaque">{convites[m.id]}</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void convidar(m)}
                        className="text-xs font-semibold text-fraca underline underline-offset-2 hover:text-tinta"
                      >
                        criar link de acesso para o motorista
                      </button>
                    )}
                  </div>
                )
              }
            />
          ))}

        {secao === 'indicadores' &&
          indicadoresFiltrados.map((i) => (
            <Linha
              key={i.id}
              titulo={i.nome}
              detalhe={`Comissão de ${i.comissao}%`}
              aoEditar={() => setEditando({ tipo: 'indicadores', item: i })}
              aoExcluir={() => {
                if (window.confirm(`Excluir ${i.nome}?`)) void comErro(() => excluirIndicador(i.id), 'Indicador excluído')
              }}
            />
          ))}

        {secao === 'servicos' &&
          servicosFiltrados.map((s) => (
            <Linha
              key={s.id}
              titulo={`${dataCurta(s.data)} ${hora(s.hora)} · ${s.passageiro}`}
              detalhe={`${rotuloTipo(s.tipo)} · ${s.origem} → ${s.destino}`}
              direita={moeda(s.valor_centavos)}
              aoEditar={() => setEditando({ tipo: 'servicos', item: s })}
              aoExcluir={() => {
                if (window.confirm(`Excluir o serviço de ${s.passageiro}?`))
                  void comErro(() => excluirServico(s.id), 'Serviço excluído')
              }}
              acoes={
                <button
                  type="button"
                  onClick={() => duplicarInvertido(s)}
                  aria-label="Criar o transfer de volta"
                  title="Criar o transfer de volta"
                  className="shrink-0 rounded-full p-2 text-tenue transition-colors hover:bg-destaque/10 hover:text-destaque"
                >
                  <Icone nome="volta" className="h-4.5 w-4.5" />
                </button>
              }
            />
          ))}

        {secao === 'rotas' &&
          rotasFiltradas.map((r) => (
            <Linha
              key={r.id}
              titulo={r.nome}
              detalhe={`${r.origem} → ${r.destino}${r.pax_ate ? ` · até ${r.pax_ate} pessoas` : ''}`}
              direita={moeda(r.valor_centavos)}
              aoEditar={() => setEditando({ tipo: 'rotas', item: r })}
              aoExcluir={() => {
                if (window.confirm(`Excluir a rota ${r.nome}?`)) void comErro(() => excluirRota(r.id), 'Rota excluída')
              }}
            />
          ))}

        {((secao === 'motoristas' && motoristasFiltrados.length === 0) ||
          (secao === 'indicadores' && indicadoresFiltrados.length === 0) ||
          (secao === 'servicos' && servicosFiltrados.length === 0) ||
          (secao === 'rotas' && rotasFiltradas.length === 0)) && (
          <Vazio titulo={procura ? 'Nada encontrado' : `Nenhum ${TITULOS[secao].toLowerCase()} cadastrado`}>
            {procura ? 'Tente escrever outra parte do nome.' : 'Use o botão Novo para cadastrar o primeiro.'}
          </Vazio>
        )}
      </div>

      <Folha
        aberta={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando ? TITULOS[editando.tipo] : ''}
      >
        {editando?.tipo === 'motoristas' && (
          <FormMotorista
            inicial={(editando.item as Motorista) ?? null}
            aoSalvar={(m) => void comErro(() => salvarMotorista({ ...m, empresa_id: empresaId }), 'Motorista salvo')}
          />
        )}
        {editando?.tipo === 'indicadores' && (
          <FormIndicador
            inicial={(editando.item as Indicador) ?? null}
            aoSalvar={(i) => void comErro(() => salvarIndicador({ ...i, empresa_id: empresaId }), 'Indicador salvo')}
          />
        )}
        {editando?.tipo === 'servicos' && (
          <FormServico
            inicial={(editando.item as Servico) ?? null}
            indicadores={indicadores}
            rotas={rotas}
            aoSalvar={(s) => void comErro(() => gravarServico(s), 'Serviço salvo')}
          />
        )}
        {editando?.tipo === 'rotas' && (
          <FormRota
            inicial={(editando.item as Rota) ?? null}
            aoSalvar={(r) => void comErro(() => salvarRota({ ...r, empresa_id: empresaId }), 'Preço salvo')}
          />
        )}
      </Folha>
    </div>
  )
}
