import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Erro } from '../../componentes/Aviso'
import { BotaoPrincipal, Campo, Entrada } from '../../componentes/Campos'
import { entrar } from '../../dados'

export function Entrar() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)
  const navegar = useNavigate()

  async function enviar() {
    setErro('')
    setIndo(true)
    try {
      await entrar(email.trim(), senha)
      navegar('/app')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Entrar</h1>
      <p className="mt-1 text-sm text-slate-500">Use o e-mail e a senha da sua conta.</p>

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void enviar()
        }}
      >
        <Campo rotulo="E-mail">
          <Entrada type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        <Campo rotulo="Senha">
          <Entrada
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </Campo>
        <Erro>{erro}</Erro>
        <BotaoPrincipal type="submit" disabled={indo || !email || !senha}>
          {indo ? 'Entrando…' : 'Entrar'}
        </BotaoPrincipal>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Ainda não tem conta?{' '}
        <Link to="/criar-conta" className="font-semibold text-slate-900 underline">
          Comece o teste de 7 dias
        </Link>
      </p>
    </div>
  )
}
