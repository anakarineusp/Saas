import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Carregando, Erro } from '../../componentes/Aviso'
import { BotaoPrincipal, Campo, Entrada } from '../../componentes/Campos'
import { criarEmpresa } from '../../dados'
import { useSessao } from '../../sessao'

/** Segundo passo do cadastro: os dados da empresa. */
export function SuaEmpresa() {
  const { carregando, entrou, perfil, recarregar } = useSessao()
  const [empresa, setEmpresa] = useState('')
  const [seuNome, setSeuNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')
  const [documento, setDocumento] = useState('')
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)
  const navegar = useNavigate()

  async function enviar() {
    setErro('')
    setIndo(true)
    try {
      await criarEmpresa({ empresa, seuNome, telefone, cidade, documento })
      await recarregar()
      navegar('/app')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo(false)
    }
  }

  if (carregando) return <Carregando />
  if (!entrou) return <Navigate to="/entrar" replace />

  // Quem já tem cadastro não precisa desta tela.
  if (perfil) {
    const destino = perfil.papel === 'admin' ? '/admin' : perfil.papel === 'motorista' ? '/motorista' : '/app'
    return <Navigate to={destino} replace />
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Sua empresa</h1>
      <p className="mt-1 text-sm text-slate-500">Falta só isso para começar o teste de 7 dias.</p>

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void enviar()
        }}
      >
        <Campo rotulo="Nome da empresa">
          <Entrada value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Serra Transfer" />
        </Campo>
        <Campo rotulo="Seu nome">
          <Entrada value={seuNome} onChange={(e) => setSeuNome(e.target.value)} />
        </Campo>
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
        <Campo rotulo="CNPJ ou CPF (para a nota da assinatura)">
          <Entrada inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value)} />
        </Campo>
        <Erro>{erro}</Erro>
        <BotaoPrincipal type="submit" disabled={indo || !empresa.trim() || !seuNome.trim()}>
          {indo ? 'Criando…' : 'Começar os 7 dias'}
        </BotaoPrincipal>
      </form>
    </div>
  )
}
