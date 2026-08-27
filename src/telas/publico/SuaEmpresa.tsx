import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Carregando, Erro } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo, Entrada } from '../../componentes/Campos'
import { MolduraPublica } from '../../componentes/MolduraPublica'
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

  if (carregando) return <Carregando linhas={2} />
  if (!entrou) return <Navigate to="/entrar" replace />

  // Quem já tem cadastro não precisa desta tela.
  if (perfil) {
    const destino = perfil.papel === 'admin' ? '/admin' : perfil.papel === 'motorista' ? '/motorista' : '/app'
    return <Navigate to={destino} replace />
  }

  return (
    <MolduraPublica titulo="Sua empresa" subtitulo="Falta só isso para começar os 7 dias.">
      <form
        className="space-y-4"
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
        <Erro>{erro}</Erro>
        <Botao type="submit" largo tamanho="grande" disabled={indo || !empresa.trim() || !seuNome.trim()}>
          {indo ? 'Criando…' : 'Começar os 7 dias'}
        </Botao>
      </form>
    </MolduraPublica>
  )
}
