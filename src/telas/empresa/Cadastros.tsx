import { useCallback, useEffect, useState } from 'react'
import { Carregando, Erro } from '../../componentes/Aviso'
import { BotaoPrincipal, Campo, Entrada, Selecao } from '../../componentes/Campos'
import { Folha } from '../../componentes/Folha'
import {
  criarConvite, excluirIndicador, excluirMotorista, excluirServico, gravarServico,
  indicadores as buscarIndicadores, motoristas as buscarMotoristas, salvarIndicador, salvarMotorista,
  servicos as buscarServicos,
} from '../../dados'
import { dataCurta, emReais, hojeISO, hora, moeda, paraCentavos, rotuloTipo } from '../../lib/formato'
import { enderecoDoApp } from '../../lib/whatsapp'
import { useSessao } from '../../sessao'
import type { Indicador, Motorista, Servico, TipoServico } from '../../tipos'

type Secao = 'motoristas' | 'indicadores' | 'servicos'

const SECOES: { id: Secao; rotulo: string }[] = [
  { id: 'motoristas', rotulo: 'Motoristas' },
  { id: 'indicadores', rotulo: 'Indicadores' },
  { id: 'servicos', rotulo: 'Serviços' },
]

const TITULOS: Record<Secao, string> = {
  motoristas: 'Motorista',
  indicadores: 'Indicador',
  servicos: 'Serviço',
}

function Linha({
  titulo, detalhe, direita, aoEditar, aoExcluir, extra,
}: {
  titulo: string
  detalhe: string
  direita?: string
  aoEditar: () => void
  aoExcluir: () => void
  extra?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 p-3.5">
        <button type="button" onClick={aoEditar} className="min-w-0 flex-1 text-left">
          <span className="block truncate font-medium text-slate-900">{titulo}</span>
          <span className="block truncate text-xs text-slate-500">{detalhe}</span>
        </button>
        {direita && <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{direita}</span>}
        <button
          type="button"
          onClick={aoExcluir}
          aria-label="Excluir"
          className="shrink-0 rounded-full p-2 text-slate-400 active:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5">
            <path d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13" />
          </svg>
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
      <BotaoPrincipal disabled={!m.nome?.trim() || !m.telefone?.trim()} onClick={() => aoSalvar(m)}>
        Salvar motorista
      </BotaoPrincipal>
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
      <BotaoPrincipal disabled={!i.nome?.trim()} onClick={() => aoSalvar(i)}>
        Salvar indicador
      </BotaoPrincipal>
    </div>
  )
}

function FormServico({
  inicial, indicadores, aoSalvar,
}: {
  inicial: Servico | null
  indicadores: Indicador[]
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

  return (
    <div className="space-y-3">
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
      <BotaoPrincipal
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
      </BotaoPrincipal>
    </div>
  )
}

export function Cadastros() {
  const { perfil } = useSessao()
  const empresaId = perfil?.empresa_id ?? ''
  const [secao, setSecao] = useState<Secao>('motoristas')
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [indicadores, setIndicadores] = useState<Indicador[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [editando, setEditando] = useState<{ tipo: Secao; item?: unknown } | null>(null)
  const [convites, setConvites] = useState<Record<string, string>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const hoje = hojeISO()
      const de = `${hoje.slice(0, 4)}-01-01`
      const ate = `${Number(hoje.slice(0, 4)) + 1}-12-31`
      const [m, i, s] = await Promise.all([buscarMotoristas(), buscarIndicadores(), buscarServicos(de, ate)])
      setMotoristas(m)
      setIndicadores(i)
      setServicos([...s].reverse())
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function comErro(acao: () => Promise<unknown>) {
    setErro('')
    try {
      await acao()
      await carregar()
      setEditando(null)
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

  if (carregando) return <Carregando />

  return (
    <div className="px-4 pt-5">
      <h1 className="text-2xl font-bold text-slate-900">Cadastros</h1>

      <div className="mt-4 flex gap-1 rounded-xl bg-slate-200 p-1">
        {SECOES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSecao(s.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              secao === s.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>

      <button
        type="button"
        onClick={() => setEditando({ tipo: secao })}
        className="mt-4 w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 active:bg-slate-200"
      >
        + Adicionar {TITULOS[secao].toLowerCase()}
      </button>

      <div className="mt-3 space-y-2">
        {secao === 'motoristas' &&
          motoristas.map((m) => (
            <Linha
              key={m.id}
              titulo={m.nome}
              detalhe={`${m.veiculo} · ${m.lugares} lugares · ${m.percentual}%${m.perfil_id ? ' · tem conta' : ''}`}
              aoEditar={() => setEditando({ tipo: 'motoristas', item: m })}
              aoExcluir={() => {
                if (window.confirm(`Excluir ${m.nome}? Os serviços dele ficam sem motorista.`))
                  void comErro(() => excluirMotorista(m.id))
              }}
              extra={
                !m.perfil_id && (
                  <div className="border-t border-slate-100 px-3.5 py-2">
                    {convites[m.id] ? (
                      <p className="text-xs break-all text-slate-500">
                        Mande este link para {m.nome}: <span className="text-slate-900">{convites[m.id]}</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void convidar(m)}
                        className="text-xs font-semibold text-slate-600 underline"
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
          indicadores.map((i) => (
            <Linha
              key={i.id}
              titulo={i.nome}
              detalhe={`Comissão de ${i.comissao}%`}
              aoEditar={() => setEditando({ tipo: 'indicadores', item: i })}
              aoExcluir={() => {
                if (window.confirm(`Excluir ${i.nome}?`)) void comErro(() => excluirIndicador(i.id))
              }}
            />
          ))}

        {secao === 'servicos' &&
          servicos.map((s) => (
            <Linha
              key={s.id}
              titulo={`${dataCurta(s.data)} ${hora(s.hora)} · ${s.passageiro}`}
              detalhe={`${rotuloTipo(s.tipo)} · ${s.origem} → ${s.destino}`}
              direita={moeda(s.valor_centavos)}
              aoEditar={() => setEditando({ tipo: 'servicos', item: s })}
              aoExcluir={() => {
                if (window.confirm(`Excluir o serviço de ${s.passageiro}?`)) void comErro(() => excluirServico(s.id))
              }}
            />
          ))}
      </div>

      <Folha
        aberta={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando ? TITULOS[editando.tipo] : ''}
      >
        {editando?.tipo === 'motoristas' && (
          <FormMotorista
            inicial={(editando.item as Motorista) ?? null}
            aoSalvar={(m) => void comErro(() => salvarMotorista({ ...m, empresa_id: empresaId }))}
          />
        )}
        {editando?.tipo === 'indicadores' && (
          <FormIndicador
            inicial={(editando.item as Indicador) ?? null}
            aoSalvar={(i) => void comErro(() => salvarIndicador({ ...i, empresa_id: empresaId }))}
          />
        )}
        {editando?.tipo === 'servicos' && (
          <FormServico
            inicial={(editando.item as Servico) ?? null}
            indicadores={indicadores}
            aoSalvar={(s) => void comErro(() => gravarServico(s))}
          />
        )}
      </Folha>
    </div>
  )
}
