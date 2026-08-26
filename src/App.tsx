import { useState } from 'react'
import { BarraAbas, type Aba } from './componentes/BarraAbas'
import { Folha } from './componentes/Folha'
import { carregar, jaAceitou, marcarAceite, restaurarDemonstracao, salvar } from './lib/armazenamento'
import { dataCurta, mesAtual, valorDoMotorista } from './lib/formato'
import { decodificarResumo, resumoDoServico } from './lib/link'
import { Acerto } from './telas/Acerto'
import { Atribuir } from './telas/Atribuir'
import { Cadastros } from './telas/Cadastros'
import { Confirmar } from './telas/Confirmar'
import { Hoje } from './telas/Hoje'
import type { Dados } from './types'

function parametrosDaUrl() {
  const p = new URLSearchParams(window.location.search)
  return { confirmar: p.get('confirmar'), resumo: p.get('d') }
}

export default function App() {
  const [url] = useState(parametrosDaUrl)
  const [dados, setDados] = useState<Dados>(carregar)
  const [aba, setAba] = useState<Aba>('hoje')
  const [servicoAberto, setServicoAberto] = useState<string | null>(null)
  const [mes, setMes] = useState(mesAtual)
  const [aceiteAvulso, setAceiteAvulso] = useState(() =>
    url.confirmar ? jaAceitou(url.confirmar) : false,
  )

  function atualizar(novos: Dados) {
    setDados(novos)
    salvar(novos)
  }

  // ---------- tela do motorista, aberta pelo link ----------
  if (url.confirmar) {
    const servico = dados.servicos.find((s) => s.id === url.confirmar)
    const motorista = servico && dados.motoristas.find((m) => m.id === servico.motoristaId)

    const resumo =
      servico && motorista
        ? resumoDoServico(servico, motorista.nome, valorDoMotorista(servico, motorista))
        : decodificarResumo(url.resumo ?? '')

    const confirmado = servico?.status === 'confirmado' || aceiteAvulso

    return (
      <Confirmar
        resumo={resumo}
        confirmado={confirmado}
        aoAceitar={() => {
          if (servico) {
            atualizar({
              ...dados,
              servicos: dados.servicos.map((s) =>
                s.id === servico.id ? { ...s, status: 'confirmado' } : s,
              ),
            })
          }
          marcarAceite(url.confirmar!)
          setAceiteAvulso(true)
        }}
      />
    )
  }

  // ---------- app da empresa ----------
  const servico = dados.servicos.find((s) => s.id === servicoAberto) ?? null

  function atribuir(motoristaId: string) {
    if (!servico) return
    atualizar({
      ...dados,
      servicos: dados.servicos.map((s) =>
        s.id === servico.id ? { ...s, motoristaId, status: 'atribuido' } : s,
      ),
    })
  }

  function restaurar() {
    if (!window.confirm('Voltar aos dados de demonstração? As alterações desta reunião serão perdidas.')) return
    setDados(restaurarDemonstracao())
    setServicoAberto(null)
    setMes(mesAtual())
    setAba('hoje')
  }

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      {aba === 'hoje' && <Hoje dados={dados} aoAbrirServico={setServicoAberto} />}
      {aba === 'acerto' && <Acerto dados={dados} mes={mes} aoTrocarMes={setMes} />}
      {aba === 'cadastros' && <Cadastros dados={dados} aoMudar={atualizar} />}

      <div className="px-4 pt-8 pb-2 text-center">
        <button type="button" onClick={restaurar} className="text-xs text-slate-400 underline">
          restaurar dados de demonstração
        </button>
      </div>

      <Folha
        aberta={servico !== null}
        aoFechar={() => setServicoAberto(null)}
        titulo={servico ? `${dataCurta(servico.data)} às ${servico.hora}` : ''}
      >
        {servico && <Atribuir servico={servico} dados={dados} aoAtribuir={atribuir} />}
      </Folha>

      <BarraAbas atual={aba} aoTrocar={setAba} />
    </div>
  )
}
