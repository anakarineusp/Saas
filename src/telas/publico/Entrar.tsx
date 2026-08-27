import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Erro } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo, Entrada } from '../../componentes/Campos'
import { MolduraPublica } from '../../componentes/MolduraPublica'
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
    <MolduraPublica
      titulo="Entrar"
      subtitulo="Use o e-mail e a senha da sua conta."
      rodape={
        <>
          Ainda não tem conta?{' '}
          <Link to="/criar-conta" className="font-semibold text-destaque hover:underline">
            Comece o teste de 7 dias
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
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
        <Botao type="submit" largo tamanho="grande" disabled={indo || !email || !senha}>
          {indo ? 'Entrando…' : 'Entrar'}
        </Botao>
      </form>
    </MolduraPublica>
  )
}
