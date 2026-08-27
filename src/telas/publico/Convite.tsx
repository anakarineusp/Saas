import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Erro } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo, Entrada } from '../../componentes/Campos'
import { MolduraPublica } from '../../componentes/MolduraPublica'
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
    <MolduraPublica
      titulo="Sua conta de motorista"
      subtitulo="Assim você vê todos os seus serviços num lugar só. Continua valendo confirmar pelo link do WhatsApp, sem conta nenhuma."
    >
      <form
        className="space-y-4"
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
            <Campo rotulo="Senha" dica="Pelo menos 6 letras ou números.">
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
        <Botao type="submit" largo tamanho="grande" disabled={indo || !nome.trim() || (!entrou && senha.length < 6)}>
          {indo ? 'Criando…' : 'Criar minha conta'}
        </Botao>
      </form>
    </MolduraPublica>
  )
}
