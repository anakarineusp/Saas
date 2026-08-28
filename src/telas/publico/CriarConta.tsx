import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Erro } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo, Entrada } from '../../componentes/Campos'
import { Icone } from '../../componentes/Icone'
import { MolduraPublica } from '../../componentes/MolduraPublica'
import { criarConta, entrar } from '../../dados'
import { supabase } from '../../supabase'

export function CriarConta() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)
  const [confirmeOEmail, setConfirmeOEmail] = useState(false)
  const [parametros] = useSearchParams()
  // O plano escolhido na página inicial viaja junto até o cadastro da empresa.
  const plano = parametros.get('plano') ?? ''
  const navegar = useNavigate()

  async function enviar() {
    setErro('')
    setIndo(true)
    try {
      await criarConta(email.trim(), senha)
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        try {
          await entrar(email.trim(), senha)
        } catch {
          setConfirmeOEmail(true)
          return
        }
      }
      navegar(plano ? `/sua-empresa?plano=${encodeURIComponent(plano)}` : '/sua-empresa')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo(false)
    }
  }

  if (confirmeOEmail) {
    return (
      <MolduraPublica
        titulo="Confirme o e-mail"
        subtitulo={`Mandamos uma mensagem para ${email}. Abra o link de lá e depois volte para entrar.`}
        rodape={
          <Link to="/entrar" className="font-semibold text-destaque hover:underline">
            Já confirmei, quero entrar
          </Link>
        }
      >
        <div className="painel flex items-center gap-3 rounded-2xl p-4">
          <Icone nome="check" className="h-5 w-5 shrink-0 text-ok" traco={2.6} />
          <p className="text-sm text-fraca">Conta criada. Falta só confirmar o e-mail.</p>
        </div>
      </MolduraPublica>
    )
  }

  return (
    <MolduraPublica
      titulo="Teste 7 dias grátis"
      subtitulo="Sem cartão. Só um e-mail e uma senha — o plano do teste e os dados você escolhe no passo seguinte."
      rodape={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" className="font-semibold text-destaque hover:underline">
            Entrar
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
        <Campo rotulo="Senha" dica="Pelo menos 6 letras ou números.">
          <Entrada
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </Campo>
        <Erro>{erro}</Erro>
        <Botao type="submit" largo tamanho="grande" disabled={indo || !email || senha.length < 6}>
          {indo ? 'Criando…' : 'Criar minha conta'}
        </Botao>
      </form>
    </MolduraPublica>
  )
}
