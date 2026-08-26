import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Erro } from '../../componentes/Aviso'
import { BotaoPrincipal, Campo, Entrada } from '../../componentes/Campos'
import { aceitarConvite, criarConta, entrar } from '../../dados'
import { useSessao } from '../../sessao'
import { supabase } from '../../supabase'

/** O motorista cria a conta dele por um link de convite da empresa. */
export function Convite() {
  const { token = '' } = useParams()
  const { entrou, recarregar } = useSessao()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)
  const navegar = useNavigate()

  async function enviar() {
    setErro('')
    setIndo(true)
    try {
      if (!entrou) {
        await criarConta(email.trim(), senha)
        const { data } = await supabase.auth.getSession()
        if (!data.session) await entrar(email.trim(), senha)
      }
      await aceitarConvite(token, nome.trim())
      await recarregar()
      navegar('/motorista')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setIndo(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Sua conta de motorista</h1>
      <p className="mt-1 text-sm text-slate-500">
        Assim você vê todos os seus serviços num lugar só. Continua valendo confirmar pelo link do WhatsApp,
        sem conta nenhuma.
      </p>

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void enviar()
        }}
      >
        <Campo rotulo="Seu nome">
          <Entrada value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        {!entrou && (
          <>
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
          </>
        )}
        <Erro>{erro}</Erro>
        <BotaoPrincipal type="submit" disabled={indo || !nome.trim() || (!entrou && senha.length < 6)}>
          {indo ? 'Criando…' : 'Criar minha conta'}
        </BotaoPrincipal>
      </form>
    </div>
  )
}
