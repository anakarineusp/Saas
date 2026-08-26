import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Erro } from '../../componentes/Aviso'
import { BotaoPrincipal, Campo, Entrada } from '../../componentes/Campos'
import { criarConta, entrar } from '../../dados'
import { supabase } from '../../supabase'

export function CriarConta() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)
  const [confirmeOEmail, setConfirmeOEmail] = useState(false)
  const navegar = useNavigate()

  async function enviar() {
    setErro('')
    setIndo(true)
    try {
      await criarConta(email.trim(), senha)
      // Se o projeto exigir confirmação por e-mail, ainda não há sessão aberta.
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        try {
          await entrar(email.trim(), senha)
        } catch {
          setConfirmeOEmail(true)
          return
        }
      }
      navegar('/sua-empresa')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo(false)
    }
  }

  if (confirmeOEmail) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Confirme o e-mail</h1>
        <p className="mt-2 text-slate-600">
          Mandamos uma mensagem para <strong>{email}</strong>. Abra o link de lá e depois volte para entrar.
        </p>
        <Link to="/entrar" className="mt-6 font-semibold text-slate-900 underline">
          Já confirmei, quero entrar
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Teste 7 dias grátis</h1>
      <p className="mt-1 text-sm text-slate-500">Sem cartão. Só um e-mail e uma senha.</p>

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
        <Campo rotulo="Senha (mínimo 6 letras ou números)">
          <Entrada
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </Campo>
        <Erro>{erro}</Erro>
        <BotaoPrincipal type="submit" disabled={indo || !email || senha.length < 6}>
          {indo ? 'Criando…' : 'Criar minha conta'}
        </BotaoPrincipal>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <Link to="/entrar" className="font-semibold text-slate-900 underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
