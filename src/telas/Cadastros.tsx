import { useState } from 'react'
import { BotaoPrincipal, Campo, Entrada, Selecao } from '../componentes/Campos'
import { Folha } from '../componentes/Folha'
import { dataCurta, hojeISO, moeda, novoId, rotuloTipo } from '../lib/formato'
import type { Dados, Indicador, Motorista, Servico, TipoServico } from '../types'

type Secao = 'motoristas' | 'indicadores' | 'servicos'

const SECOES: { id: Secao; rotulo: string }[] = [
  { id: 'motoristas', rotulo: 'Motoristas' },
  { id: 'indicadores', rotulo: 'Indicadores' },
  { id: 'servicos', rotulo: 'Serviços' },
]

function Linha({
  titulo,
  detalhe,
  direita,
  aoEditar,
  aoExcluir,
}: {
  titulo: string
  detalhe: string
  direita?: string
  aoEditar: () => void
  aoExcluir: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3.5">
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
  )
}

function FormMotorista({ inicial, aoSalvar }: { inicial: Motorista | null; aoSalvar: (m: Motorista) => void }) {
  const [m, setM] = useState<Motorista>(
    inicial ?? { id: novoId(), nome: '', telefone: '', veiculo: '', lugares: 4, percentual: 40 },
  )
  return (
    <div className="space-y-3">
      <Campo rotulo="Nome">
        <Entrada value={m.nome} onChange={(e) => setM({ ...m, nome: e.target.value })} />
      </Campo>
      <Campo rotulo="WhatsApp (com 55 e DDD)">
        <Entrada
          inputMode="numeric"
          placeholder="5554999120031"
          value={m.telefone}
          onChange={(e) => setM({ ...m, telefone: e.target.value })}
        />
      </Campo>
      <Campo rotulo="Veículo">
        <Entrada placeholder="Spin" value={m.veiculo} onChange={(e) => setM({ ...m, veiculo: e.target.value })} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Lugares">
          <Entrada
            type="number"
            inputMode="numeric"
            value={m.lugares}
            onChange={(e) => setM({ ...m, lugares: Number(e.target.value) })}
          />
        </Campo>
        <Campo rotulo="Percentual (%)">
          <Entrada
            type="number"
            inputMode="numeric"
            value={m.percentual}
            onChange={(e) => setM({ ...m, percentual: Number(e.target.value) })}
          />
        </Campo>
      </div>
      <BotaoPrincipal disabled={!m.nome.trim()} onClick={() => aoSalvar(m)}>
        Salvar motorista
      </BotaoPrincipal>
    </div>
  )
}

function FormIndicador({ inicial, aoSalvar }: { inicial: Indicador | null; aoSalvar: (i: Indicador) => void }) {
  const [i, setI] = useState<Indicador>(inicial ?? { id: novoId(), nome: '', comissao: 10, telefone: '' })
  return (
    <div className="space-y-3">
      <Campo rotulo="Nome">
        <Entrada placeholder="Hotel Bertoluci" value={i.nome} onChange={(e) => setI({ ...i, nome: e.target.value })} />
      </Campo>
      <Campo rotulo="WhatsApp (com 55 e DDD)">
        <Entrada
          inputMode="numeric"
          placeholder="555432861400"
          value={i.telefone}
          onChange={(e) => setI({ ...i, telefone: e.target.value })}
        />
      </Campo>
      <Campo rotulo="Comissão (%)">
        <Entrada
          type="number"
          inputMode="numeric"
          value={i.comissao}
          onChange={(e) => setI({ ...i, comissao: Number(e.target.value) })}
        />
      </Campo>
      <BotaoPrincipal disabled={!i.nome.trim()} onClick={() => aoSalvar(i)}>
        Salvar indicador
      </BotaoPrincipal>
    </div>
  )
}

function FormServico({
  inicial,
  indicadores,
  aoSalvar,
}: {
  inicial: Servico | null
  indicadores: Indicador[]
  aoSalvar: (s: Servico) => void
}) {
  const [s, setS] = useState<Servico>(
    inicial ?? {
      id: novoId(),
      data: hojeISO(),
      hora: '09:00',
      tipo: 'transfer_in',
      passageiro: '',
      pax: 2,
      origem: 'Aeroporto Salgado Filho, Porto Alegre',
      destino: '',
      valor: 480,
      status: 'sem_motorista',
    },
  )
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
          <Entrada
            type="number"
            inputMode="numeric"
            value={s.pax}
            onChange={(e) => setS({ ...s, pax: Number(e.target.value) })}
          />
        </Campo>
        <Campo rotulo="Valor (R$)">
          <Entrada
            type="number"
            inputMode="decimal"
            value={s.valor}
            onChange={(e) => setS({ ...s, valor: Number(e.target.value) })}
          />
        </Campo>
      </div>
      <Campo rotulo="Origem">
        <Entrada value={s.origem} onChange={(e) => setS({ ...s, origem: e.target.value })} />
      </Campo>
      <Campo rotulo="Destino">
        <Entrada value={s.destino} onChange={(e) => setS({ ...s, destino: e.target.value })} />
      </Campo>
      <Campo rotulo="Voo (opcional)">
        <Entrada placeholder="G3 1408" value={s.voo ?? ''} onChange={(e) => setS({ ...s, voo: e.target.value })} />
      </Campo>
      <Campo rotulo="Indicação">
        <Selecao
          value={s.indicadorId ?? ''}
          onChange={(e) => setS({ ...s, indicadorId: e.target.value || undefined })}
        >
          <option value="">Sem indicação</option>
          {indicadores.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </Selecao>
      </Campo>
      <p className="text-xs text-slate-500">O motorista é escolhido na tela Hoje, tocando no serviço.</p>
      <BotaoPrincipal
        disabled={!s.passageiro.trim() || !s.destino.trim()}
        onClick={() => aoSalvar({ ...s, voo: s.voo?.trim() ? s.voo.trim() : undefined })}
      >
        Salvar serviço
      </BotaoPrincipal>
    </div>
  )
}

export function Cadastros({ dados, aoMudar }: { dados: Dados; aoMudar: (d: Dados) => void }) {
  const [secao, setSecao] = useState<Secao>('motoristas')
  const [editando, setEditando] = useState<
    { tipo: Secao; motorista?: Motorista; indicador?: Indicador; servico?: Servico } | null
  >(null)

  function trocar<T extends { id: string }>(lista: T[], item: T): T[] {
    return lista.some((x) => x.id === item.id)
      ? lista.map((x) => (x.id === item.id ? item : x))
      : [...lista, item]
  }

  function excluirMotorista(m: Motorista) {
    if (!window.confirm(`Excluir ${m.nome}? Os serviços dele ficam sem motorista.`)) return
    aoMudar({
      ...dados,
      motoristas: dados.motoristas.filter((x) => x.id !== m.id),
      servicos: dados.servicos.map((s) =>
        s.motoristaId === m.id ? { ...s, motoristaId: undefined, status: 'sem_motorista' } : s,
      ),
    })
  }

  function excluirIndicador(i: Indicador) {
    if (!window.confirm(`Excluir ${i.nome}?`)) return
    aoMudar({
      ...dados,
      indicadores: dados.indicadores.filter((x) => x.id !== i.id),
      servicos: dados.servicos.map((s) => (s.indicadorId === i.id ? { ...s, indicadorId: undefined } : s)),
    })
  }

  function excluirServico(s: Servico) {
    if (!window.confirm(`Excluir o serviço de ${s.passageiro}?`)) return
    aoMudar({ ...dados, servicos: dados.servicos.filter((x) => x.id !== s.id) })
  }

  const servicosOrdenados = [...dados.servicos].sort((a, b) =>
    (b.data + b.hora).localeCompare(a.data + a.hora),
  )

  const titulos: Record<Secao, string> = {
    motoristas: 'Motorista',
    indicadores: 'Indicador',
    servicos: 'Serviço',
  }

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

      <button
        type="button"
        onClick={() => setEditando({ tipo: secao })}
        className="mt-4 w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 active:bg-slate-200"
      >
        + Adicionar {titulos[secao].toLowerCase()}
      </button>

      <div className="mt-3 space-y-2">
        {secao === 'motoristas' &&
          dados.motoristas.map((m) => (
            <Linha
              key={m.id}
              titulo={m.nome}
              detalhe={`${m.veiculo} · ${m.lugares} lugares · ${m.percentual}%`}
              aoEditar={() => setEditando({ tipo: 'motoristas', motorista: m })}
              aoExcluir={() => excluirMotorista(m)}
            />
          ))}

        {secao === 'indicadores' &&
          dados.indicadores.map((i) => (
            <Linha
              key={i.id}
              titulo={i.nome}
              detalhe={`Comissão de ${i.comissao}%`}
              aoEditar={() => setEditando({ tipo: 'indicadores', indicador: i })}
              aoExcluir={() => excluirIndicador(i)}
            />
          ))}

        {secao === 'servicos' &&
          servicosOrdenados.map((s) => (
            <Linha
              key={s.id}
              titulo={`${dataCurta(s.data)} ${s.hora} · ${s.passageiro}`}
              detalhe={`${rotuloTipo(s.tipo)} · ${s.origem} → ${s.destino}`}
              direita={moeda(s.valor)}
              aoEditar={() => setEditando({ tipo: 'servicos', servico: s })}
              aoExcluir={() => excluirServico(s)}
            />
          ))}
      </div>

      <Folha
        aberta={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando ? titulos[editando.tipo] : ''}
      >
        {editando?.tipo === 'motoristas' && (
          <FormMotorista
            inicial={editando.motorista ?? null}
            aoSalvar={(m) => {
              aoMudar({ ...dados, motoristas: trocar(dados.motoristas, m) })
              setEditando(null)
            }}
          />
        )}
        {editando?.tipo === 'indicadores' && (
          <FormIndicador
            inicial={editando.indicador ?? null}
            aoSalvar={(i) => {
              aoMudar({ ...dados, indicadores: trocar(dados.indicadores, i) })
              setEditando(null)
            }}
          />
        )}
        {editando?.tipo === 'servicos' && (
          <FormServico
            inicial={editando.servico ?? null}
            indicadores={dados.indicadores}
            aoSalvar={(s) => {
              aoMudar({ ...dados, servicos: trocar(dados.servicos, s) })
              setEditando(null)
            }}
          />
        )}
      </Folha>
    </div>
  )
}
