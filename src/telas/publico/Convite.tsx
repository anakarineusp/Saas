import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Erro } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo, Entrada } from '../../componentes/Campos'
import { MolduraPublica } from '../../componentes/MolduraPublica'
import { Icone } from '../../componentes/Icone'
import { aceitarConvite, criarConta, entrar, sair } from '../../dados'
import { useSessao } from '../../sessao'
import { supabase } from '../../supabase'

/** O motorista cria a conta dele por um link de convite da empresa. */
export function Convite() {
  const { token = '' } = useParams()
  const { entrou, perfil, recarregar } = useSessao()
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

  // Quem já está dentro como dona da empresa ou como administração não pode
  // virar motorista sem querer — e é quase sempre a empresa testando o link.
  if (perfil && perfil.papel !== 'motorista') {
    const quem = perfil.papel === 'dono' ? 'dona da empresa' : 'administração do sistema'
    return (
      <MolduraPublica
        titulo="Este link é do motorista"
        subtitulo={`Você está conectada como ${perfil.nome} (${quem}). Este convite serve para o motorista criar a conta dele.`}
      >
        <div className="space-y-4">
          <div className="painel flex items-start gap-3 rounded-2xl p-4">
            <Icone nome="aviso" className="mt-0.5 h-4 w-4 shrink-0 text-atencao" />
            <p className="text-sm leading-relaxed text-fraca">
              O jeito certo é mandar este endereço para o motorista pelo WhatsApp: ele abre no celular dele e cria a
              conta com o e-mail dele.
            </p>
          </div>

          <Botao
            tom="contorno"
            largo
            onClick={() => {
              void navigator.clipboard
                .writeText(window.location.href)
                .then(() => window.alert('Link copiado. Mande para o motorista.'))
                .catch(() => window.alert(window.location.href))
            }}
          >
            <Icone nome="copiar" className="h-4 w-4" />
            Copiar o link para mandar ao motorista
          </Botao>

          <Botao
            tom="fantasma"
            largo
            onClick={() => {
              void sair().then(() => window.location.reload())
            }}
          >
            Sair da minha conta e usar este convite aqui
          </Botao>
        </div>
      </MolduraPublica>
    )
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
